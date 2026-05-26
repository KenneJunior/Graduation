// ThemeManager.js - Dynamic theme management with event delegation
import logger from "./logger.js";

const themeLogger = logger.withContext({
  module: "ThemeManager",
});

export class ThemeManager {
  constructor(config = {}) {
    // Default configuration
    this.config = {
      defaultTheme: "light",
      storageKey: "myapp-theme",
      selector: "body",
      buttonSelector: "#mode-toggle",
      iconSelector: ".mode-icon",
      textSelector: ".mode-text",
      systemPreference: true,
      enableTransitions: true,
      transitionDuration: 300,
      persistOnLoad: true,
      useEventDelegation: true, // Enable dynamic button detection
      ...config,
    };

    // State management
    this.element = null;
    this.button = null;
    this.icon = null;
    this.text = null;
    this.currentTheme = null;
    this.systemThemeListener = null;
    this.initialized = false;
    this.transitionTimer = null;
    this.boundHandleSystemThemeChange = null;
    this.boundHandleStorageChange = null;
    this.boundHandleDropdownOpen = null;
    this.boundHandleThemeClick = null;
    this.boundToggle = null;

    themeLogger.debug("ThemeManager constructed", { useEventDelegation: this.config.useEventDelegation });
  }

  /**
   * Initialize the theme manager
   */
  init() {
    if (this.initialized) {
      themeLogger.debug("ThemeManager already initialized");
      return this;
    }

    themeLogger.time("ThemeManager initialization");

    try {
      // Cache DOM elements with safety checks
      this.element = document.querySelector(this.config.selector);

      if (!this.element) {
        themeLogger.warn("No element found for selector", this.config.selector);
        return this;
      }

      // Setup transitions
      if (this.config.enableTransitions) {
        this.setupTransitions();
      }

      // Load and apply theme
      this.loadTheme();

      // Setup theme button detection
      if (this.config.useEventDelegation) {
        this.setupDynamicButtonDetection();
      } else {
        this.setupStaticButton();
      }

      // Listen for system theme changes
      if (this.config.systemPreference) {
        this.setupSystemListener();
      }

      // Listen for storage changes (multi-tab sync)
      if (!this.boundHandleStorageChange) {
        this.boundHandleStorageChange = this.handleStorageChange.bind(this);
      }
      window.addEventListener("storage", this.boundHandleStorageChange);

      this.initialized = true;

      themeLogger.info("ThemeManager initialized", {
        theme: this.currentTheme,
        hasButton: !!this.button,
        usingEventDelegation: this.config.useEventDelegation,
        systemPreference: this.config.systemPreference
      });
    } catch (error) {
      themeLogger.error("Failed to initialize ThemeManager", error);
    } finally {
      themeLogger.timeEnd("ThemeManager initialization");
    }

    return this;
  }

  /**
   * Setup static button (traditional approach)
   */
  setupStaticButton() {
    this.button = document.querySelector(this.config.buttonSelector);

    if (this.button) {
      this.icon = this.button.querySelector(this.config.iconSelector);
      this.text = this.button.querySelector(this.config.textSelector);

      if (!this.boundToggle) {
        this.boundToggle = this.toggle.bind(this);
      }
      this.button.addEventListener("click", this.boundToggle);

      this.updateButton(this.currentTheme);
      themeLogger.debug("Static button setup complete", { hasButton: true });
    } else {
      themeLogger.warn("No static button found", { selector: this.config.buttonSelector });
    }
  }

  /**
   * Setup dynamic button detection using event delegation
   */
  setupDynamicButtonDetection() {
    // Method 1: Check if button already exists
    this.tryAttachToButton();

    // Method 2: Listen for dropdown open event (from DropdownManager)
    if (!this.boundHandleDropdownOpen) {
      this.boundHandleDropdownOpen = this.handleDropdownOpen.bind(this);
    }
    document.addEventListener('dropdown:open', this.boundHandleDropdownOpen);

    // Method 3: Listen for DOM changes (fallback)
    this.setupMutationObserver();

    themeLogger.debug("Dynamic button detection setup complete");
  }

  /**
   * Try to attach to theme button if it exists
   */
  tryAttachToButton() {
    const button = document.querySelector(this.config.buttonSelector);
    if (button && button !== this.button) {
      this.attachToButton(button);
      return true;
    }
    return false;
  }

  /**
   * Attach event listeners to theme button
   * @param {HTMLElement} button - The theme toggle button
   */
  attachToButton(button) {
    if (!button) return;

    // Remove old listener if exists
    if (this.button && this.boundToggle) {
      this.button.removeEventListener("click", this.boundToggle);
    }

    this.button = button;
    this.icon = this.button.querySelector(this.config.iconSelector);
    this.text = this.button.querySelector(this.config.textSelector);

    if (!this.boundToggle) {
      this.boundToggle = this.toggle.bind(this);
    }

    this.button.addEventListener("click", this.boundToggle);
    this.updateButton(this.currentTheme);

    themeLogger.debug("Attached to theme button", {
      hasIcon: !!this.icon,
      hasText: !!this.text
    });
  }

  /**
   * Handle dropdown open event (from DropdownManager)
   */
  handleDropdownOpen(event) {
    themeLogger.debug("Dropdown opened, attempting to attach to theme button");

    // Small delay to ensure DOM is fully rendered
    setTimeout(() => {
      const attached = this.tryAttachToButton();
      if (attached) {
        themeLogger.info("Theme button attached after dropdown open");
      }
    }, 100);
  }

  /**
   * Setup MutationObserver to detect when theme button is added to DOM
   */
  setupMutationObserver() {
    if (!window.MutationObserver) return;

    const observer = new MutationObserver((mutations) => {
      // Check if our button was added
      const button = document.querySelector(this.config.buttonSelector);
      if (button && button !== this.button) {
        this.attachToButton(button);
        observer.disconnect(); // Stop observing once found
        themeLogger.debug("Theme button detected via MutationObserver");
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Store observer for cleanup
    this.buttonObserver = observer;
  }

  /**
   * Setup CSS transitions for smooth theme switching
   */
  setupTransitions() {
    // Add transition styles if not already present
    if (!document.getElementById("theme-transition-styles")) {
      const style = document.createElement("style");
      style.id = "theme-transition-styles";
      style.textContent = `
        * {
          transition: background-color ${this.config.transitionDuration}ms ease,
                      color ${this.config.transitionDuration}ms ease,
                      border-color ${this.config.transitionDuration}ms ease,
                      box-shadow ${this.config.transitionDuration}ms ease;
        }
        .no-transition {
          transition: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Get system theme preference
   * @returns {string} 'dark' or 'light'
   */
  getSystemTheme() {
    try {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = prefersDark ? "dark" : "light";
      themeLogger.debug("System theme detected", { theme });
      return theme;
    } catch (error) {
      themeLogger.error("Failed to detect system theme", error);
      return this.config.defaultTheme;
    }
  }

  /**
   * Load theme from localStorage or system preference
   * @returns {string} The loaded theme
   */
  loadTheme() {
    let theme = null;

    // Try to load from localStorage
    if (this.config.persistOnLoad) {
      try {
        const stored = localStorage.getItem(this.config.storageKey);
        if (stored && ["light", "dark"].includes(stored)) {
          theme = stored;
          themeLogger.debug("Theme loaded from storage", { theme });
        }
      } catch (error) {
        themeLogger.error("Failed to read theme from storage", error);
      }
    }

    // Fallback to system preference
    if (!theme && this.config.systemPreference) {
      theme = this.getSystemTheme();
    }

    // Final fallback to default
    if (!theme) {
      theme = this.config.defaultTheme;
    }

    this.applyTheme(theme, false);
    return theme;
  }

  /**
   * Apply theme to DOM and update UI
   * @param {string} theme - 'light' or 'dark'
   * @param {boolean} saveToStorage - Whether to persist to localStorage
   */
  applyTheme(theme, saveToStorage = true) {
    if (!["light", "dark"].includes(theme)) {
      themeLogger.error("Invalid theme", { theme });
      return;
    }

    const oldTheme = this.currentTheme;

    // Add transition pause class to prevent jarring transitions
    if (this.config.enableTransitions && document.body) {
      document.body.classList.add("no-transition");
      setTimeout(() => {
        if (document.body) {
          document.body.classList.remove("no-transition");
        }
      }, 50);
    }

    // Apply theme to element
    if (this.element) {
      this.element.setAttribute("data-theme", theme);
    }

    // Also apply to document root for CSS variables
    if (document.documentElement) {
      document.documentElement.setAttribute("data-theme", theme);
    }

    // Persist to localStorage
    if (saveToStorage) {
      try {
        localStorage.setItem(this.config.storageKey, theme);
        themeLogger.debug("Theme saved to storage", { theme });
      } catch (error) {
        themeLogger.error("Failed to save theme to storage", error);
      }
    }

    // Update state
    this.currentTheme = theme;

    // Update UI elements if button exists
    if (this.button) {
      this.updateButton(theme);
    }

    this.updateMetaThemeColor(theme);

    // Dispatch events
    this.dispatchThemeEvent("theme:changed", { theme, oldTheme });

    themeLogger.info("Theme applied", { theme, oldTheme, wasSaved: saveToStorage });
  }

  /**
   * Toggle between light and dark themes
   */
  toggle() {
    if (!this.currentTheme) {
      themeLogger.warn("Cannot toggle: no current theme");
      return;
    }
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(newTheme);
    themeLogger.debug("Theme toggled", { from: this.currentTheme, to: newTheme });
  }

  /**
   * Update button icon and text based on current theme
   * @param {string} theme - Current theme
   */
  updateButton(theme) {
    if (!this.button) return;
    if (!this.icon && !this.text) return;

    const isDark = theme === "dark";

    if (this.icon) {
      this.icon.textContent = isDark ? "🌙" : "☀️";
      this.icon.setAttribute("aria-label", isDark ? "Dark mode" : "Light mode");
    }

    if (this.text) {
      this.text.textContent = isDark ? "Dark Mode" : "Light Mode";
    }

    // Update button aria-label
    this.button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  }

  /**
 * Manually update button label (useful after dynamic content changes)
 * This method forces a refresh of the button's icon and text based on current theme
 * without toggling the theme itself
 */
manuallyUpdateBtnLabel() {
  themeLogger.debug("Manually updating button label", {
    hasButton: !!this.button,
    currentTheme: this.currentTheme
  });

  if (this.button && this.currentTheme) {
    this.updateButton(this.currentTheme);
    themeLogger.debug("Button label manually updated", { theme: this.currentTheme });
  } else if (!this.button) {
    // Try to find the button again
    const buttonFound = this.tryAttachToButton();
    if (buttonFound && this.currentTheme) {
      this.updateButton(this.currentTheme);
      themeLogger.debug("Button found and label updated", { theme: this.currentTheme });
    } else {
      themeLogger.warn("Cannot manually update button label: button not found");
    }
  }
}

  /**
   * Update meta theme-color for browser UI
   * @param {string} theme - Current theme
   */
  updateMetaThemeColor(theme) {
    try {
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.name = "theme-color";
        document.head.appendChild(metaTheme);
      }

      const colors = {
        light: "#ffffff",
        dark: "#1a1a2e"
      };
      metaTheme.content = colors[theme] || colors.light;
    } catch (error) {
      themeLogger.error("Failed to update meta theme color", error);
    }
  }

  /**
   * Setup listener for system theme changes
   */
  setupSystemListener() {
    try {
      this.systemThemeListener = window.matchMedia("(prefers-color-scheme: dark)");

      // Bind the handler once
      if (!this.boundHandleSystemThemeChange) {
        this.boundHandleSystemThemeChange = (e) => {
          // Only apply if user hasn't manually set a preference
          try {
            if (!localStorage.getItem(this.config.storageKey)) {
              const theme = e.matches ? "dark" : "light";
              this.applyTheme(theme);
              themeLogger.info("System theme changed, applied", { theme });
            }
          } catch (error) {
            themeLogger.error("Failed to handle system theme change", error);
          }
        };
      }

      // Use addEventListener for modern browsers
      if (this.systemThemeListener.addEventListener) {
        this.systemThemeListener.addEventListener("change", this.boundHandleSystemThemeChange);
      } else if (this.systemThemeListener.addListener) {
        // Fallback for older browsers
        this.systemThemeListener.addListener(this.boundHandleSystemThemeChange);
      }
    } catch (error) {
      themeLogger.error("Failed to setup system listener", error);
    }
  }

  /**
   * Handle storage changes (for multi-tab sync)
   * @param {StorageEvent} event
   */
  handleStorageChange(event) {
    if (event.key === this.config.storageKey && event.newValue) {
      const newTheme = event.newValue;
      if (newTheme !== this.currentTheme && ["light", "dark"].includes(newTheme)) {
        this.applyTheme(newTheme, false);
        themeLogger.debug("Theme synced from another tab", { theme: newTheme });
      }
    }
  }

  /**
   * Dispatch theme-related events
   * @param {string} eventName - Event name
   * @param {Object} detail - Event detail
   */
  dispatchThemeEvent(eventName, detail = {}) {
    try {
      const event = new CustomEvent(eventName, {
        detail,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
    } catch (error) {
      themeLogger.error("Failed to dispatch theme event", { eventName, error });
    }
  }

  /**
   * Manually update button label (useful after DOM changes)
   */
  manuallyUpdateBtnLabel() {
    if (this.button) {
      this.updateButton(this.currentTheme);
    } else {
      // Try to find button again
      this.tryAttachToButton();
      if (this.button) {
        this.updateButton(this.currentTheme);
      }
    }
  }

  /**
   * Set theme programmatically
   * @param {string} theme - 'light' or 'dark'
   * @param {boolean} saveToStorage - Whether to persist
   */
  setTheme(theme, saveToStorage = true) {
    if (!["light", "dark"].includes(theme)) {
      themeLogger.error("Invalid theme for setTheme", { theme });
      return;
    }
    this.applyTheme(theme, saveToStorage);
  }

  /**
   * Get current theme
   * @returns {string} 'light' or 'dark'
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark mode is active
   * @returns {boolean}
   */
  isDarkMode() {
    return this.currentTheme === "dark";
  }

  /**
   * Reset to system preference or default
   */
  resetToSystem() {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      themeLogger.error("Failed to remove theme from storage", error);
    }
    const systemTheme = this.getSystemTheme();
    this.applyTheme(systemTheme);
    themeLogger.info("Reset to system theme", { theme: systemTheme });
  }

  /**
   * Add custom theme transition callback
   * @param {Function} callback - Callback function
   */
  onThemeChange(callback) {
    if (typeof callback === "function") {
      document.addEventListener("theme:changed", (e) => callback(e.detail.theme, e.detail.oldTheme));
    }
  }

  /**
   * Destroy theme manager and cleanup
   */
  destroy() {
    themeLogger.time("ThemeManager cleanup");

    try {
      // Remove button listener
      if (this.button && this.boundToggle) {
        this.button.removeEventListener("click", this.boundToggle);
      }

      // Remove dropdown open listener
      if (this.boundHandleDropdownOpen) {
        document.removeEventListener("dropdown:open", this.boundHandleDropdownOpen);
      }

      // Stop mutation observer
      if (this.buttonObserver) {
        this.buttonObserver.disconnect();
      }

      // Remove system listener
      if (this.systemThemeListener && this.boundHandleSystemThemeChange) {
        if (this.systemThemeListener.removeEventListener) {
          this.systemThemeListener.removeEventListener("change", this.boundHandleSystemThemeChange);
        } else if (this.systemThemeListener.removeListener) {
          this.systemThemeListener.removeListener(this.boundHandleSystemThemeChange);
        }
      }

      // Remove storage listener
      if (this.boundHandleStorageChange) {
        window.removeEventListener("storage", this.boundHandleStorageChange);
      }

      // Clear timers
      if (this.transitionTimer) {
        clearTimeout(this.transitionTimer);
      }

      this.initialized = false;
      themeLogger.info("ThemeManager destroyed");
    } catch (error) {
      themeLogger.error("Error during ThemeManager cleanup", error);
    } finally {
      themeLogger.timeEnd("ThemeManager cleanup");
    }
  }
}

// Export singleton instance helper
let themeManagerInstance = null;

export function getThemeManager(config = {}) {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager(config);
  }
  return themeManagerInstance;
}

export default ThemeManager;
