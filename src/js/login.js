
import { LoginController } from "../auth.js";
import logger from "./utility/logger.js";

// -----------------------------------------------------------------------------
// Contextual Logger
// -----------------------------------------------------------------------------

const loginUILogger = logger.withContext({ module: "LoginUIManager" });

// -----------------------------------------------------------------------------
// LoginUIManager Class
// -----------------------------------------------------------------------------

/**
 * Manages all login page DOM interactions.
 * Wires up form events, toggles views, and delegates auth to LoginController.
 */
export class LoginUIManager {
  constructor(options = {}) {
    this.logger = options.logger || loginUILogger;

    // Auth controller (set during init)
    this.loginController = options.loginController || null;

    // State
    this.isPasswordVisible = false;
    this._secureInputTimeout = null;
    this.secureInputTimeout = options.secureInputTimeout || 5000;

    // DOM references (cached on init)
    this.dom = {};
  }

  /**
   * Initializes the login UI: caches DOM, binds events, sets up auth connection
   * @param {LoginController} [loginController] - Optional pre-created controller
   * @returns {Promise<void>}
   */
  async init(loginController) {
    this.logger.time("LoginUIManager initialization");

    try {
      // Use provided controller or create one
      if (loginController) {
        this.loginController = loginController;
      } else if (!this.loginController) {
        this.loginController = new LoginController({
          logger: this.logger.withContext({ module: "LoginController" }),
        });
        await this.loginController.init();
      }

      this._cacheDomElements();

      if (this.loginController?.urlAuthResult?.ok) {
        const result = this.loginController.urlAuthResult;
        this.logger.info("URL authentication successful — auto-redirecting", {
          name: result.name,
          code: result.code,
        });

        // Show welcome message briefly then redirect
        this._showNotification(
            `Welcome${result.name ? `, ${result.name}` : ""}! Logging you in... 🎉`,
            "success"
        );

        // Hide the login form, show a brief loading state
        if (this.dom.passwordContainer) {
          this.dom.passwordContainer.classList.add("d-none");
        }
        if (this.dom.auth0Container) {
          this.dom.auth0Container.classList.add("d-none");
        }

        // Redirect after a short delay for the user to see the message
        setTimeout(() => {
          const returnUrl = sessionStorage.getItem("returnUrl") || "/";
          window.location.href = returnUrl;
        }, 1500);

        this.logger.timeEnd("LoginUIManager initialization");
        return;
      }

      // Check if password already exists — if so, redirect
      if (this.loginController.password?.hasExistingPassword) {
        this.logger.info("Existing password found, redirecting user");
        this._showNotification("Password verified. Redirecting...", "success");
        this.loginController.password.scheduleRedirect();
        this.logger.timeEnd("LoginUIManager initialization");
        return;
      }
      this._bindEvents();

      // Hide Auth0 container initially if password is fallback
      //this._showAuthOptions();
      this.showPasswordForm();

      this._handleUrlParamsInForm();
      this.logger.info("LoginUIManager initialized successfully");
      this.logger.timeEnd("LoginUIManager initialization");
    } catch (error) {
      this.logger.error("LoginUIManager initialization failed", error);
      this.logger.timeEnd("LoginUIManager initialization");
    }
  }

  /**
   * Checks for URL params and auto-fills/submits the password form.
   * This handles the case where the user arrives on the login page
   * with params but they weren't auto-authenticated (e.g., invalid code).
   * @private
   */
  _handleUrlParamsInForm() {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    const urlName = params.get("name");

    if (!urlCode && !urlName) return;

    this.logger.debug("URL params found on login page", {
      code: urlCode ? "present" : "none",
      name: urlName ? "present" : "none",
    });

    // If a code is present, pre-fill the password field
    if (urlCode && this.dom.passwordInput) {
      this.dom.passwordInput.value = urlCode;
      this._validatePasswordField();

      this.logger.debug("Password field auto-filled from URL code");

      // Auto-submit after a brief delay
      setTimeout(() => {
        if (this.dom.loginForm) {
          this.logger.info("Auto-submitting login form with URL code");
          this.dom.loginForm.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      }, 500);
    }

    // If only name is present, show it as a hint
    if (urlName && !urlCode && this.dom.nameDisplay) {
      this.dom.nameDisplay.textContent = `Welcome, ${decodeURIComponent(urlName)}! Please enter your password.`;
    }
  }

  // ---------------------------------------------------------------------------
  // DOM Caching
  // ---------------------------------------------------------------------------

  /**
   * Caches all DOM element references used by the login page
   * @private
   */
  _cacheDomElements() {
    this.logger.time("DOM element caching");

    this.dom = {
      auth0Container: document.getElementById("auth0"),
      passwordContainer: document.getElementById("passwordContainer"),
      loginForm: document.getElementById("loginForm"),
      passwordInput: document.getElementById("password"),
      toggleButton: document.getElementById("togglePassword"),
      helperText: document.getElementById("password-requirements"),
      nameDisplay: document.getElementById("name"),
      loginBtn: document.getElementById("loginBtn"),
      logoutBtn: document.getElementById("logoutBtn"),
      customerSupport: document.getElementById("contactSupport"),
    };

    // Log which elements are missing, but don't throw
    const missing = Object.entries(this.dom)
      .filter(([, el]) => !el)
      .map(([key]) => key);

    if (missing.length > 0) {
      this.logger.warn("Some DOM elements not found", { missing });
    }

    // Update name display if user was previously authenticated
    if (this.dom.nameDisplay && this.loginController?.password) {
      const storedName = this.loginController.password.getStoredUserName();
      if (storedName) {
        this.dom.nameDisplay.textContent = `Welcome Back ${storedName}`;
      }
    }

    this.logger.debug("DOM elements cached", {
      found: Object.values(this.dom).filter(Boolean).length,
      missing: missing.length,
    });
    this.logger.timeEnd("DOM element caching");
  }

  // ---------------------------------------------------------------------------
  // Event Binding
  // ---------------------------------------------------------------------------

  /**
   * Binds all event listeners for the login form
   * @private
   */
  _bindEvents() {
    this.logger.time("Event binding");

    // Form submission
    if (this.dom.loginForm) {
      this.dom.loginForm.addEventListener("submit", (e) => this._handleFormSubmit(e));
    }

    // Password input events
    if (this.dom.passwordInput) {
      this.dom.passwordInput.addEventListener(
        "input",
        this._debounce(() => this._validatePasswordField(), 300),
      );
      this.dom.passwordInput.addEventListener("blur", () => this._handleInputBlur());
      this.dom.passwordInput.addEventListener("focus", () => this._handleInputFocus());
    }

    // Toggle password visibility
    if (this.dom.toggleButton) {
      this.dom.toggleButton.addEventListener("click", () => this._togglePasswordVisibility());
      this.dom.toggleButton.addEventListener("keydown", (e) => this._handleToggleKeydown(e));
    }

    // Customer support
    if (this.dom.customerSupport) {
      this.dom.customerSupport.addEventListener("click", () => this._handleSupport());
    }

    this.logger.debug("Event listeners bound successfully");
    this.logger.timeEnd("Event binding");
  }

  // ---------------------------------------------------------------------------
  // Form Handling
  // ---------------------------------------------------------------------------

  /**
   * Handles form submission
   * @param {Event} e - Submit event
   * @private
   */
  _handleFormSubmit(e) {
    this.logger.time("Form submission");
    e.preventDefault();

    const password = this.dom.passwordInput?.value.trim() || "";
    let isValid = this._validatePasswordField();

    if (!isValid) {
      this._showNotification(
        `Password must be at least ${this.loginController?.config?.password?.minPasswordLength || 8} characters`,
        "error",
      );
      this._shakeElement(this.dom.loginForm);
      this.logger.timeEnd("Form submission");
      return;
    }

    // Delegate verification to PasswordProvider
    if (this.loginController?.password) {
      const result = this.loginController.password.verifyAndSavePassword(password);

      if (result.success) {
        this._showNotification(result.message, "success");
        this.loginController.password.scheduleRedirect();
      } else {
        this._showNotification(result.message, "error");
        this._shakeElement(this.dom.loginForm);
      }
    } else {
      this._showNotification("Authentication system not ready", "error");
    }

    this._validateInputField(this.dom.passwordInput, isValid);
    this.logger.timeEnd("Form submission");
  }

  /**
   * Validates password field in real-time
   * @returns {boolean} Whether password meets minimum length
   * @private
   */
  _validatePasswordField() {
    if (!this.dom.passwordInput) return false;

    const password = this.dom.passwordInput.value.trim();
    const minLength = this.loginController?.config?.password?.minPasswordLength || 8;
    const isValid = password.length >= minLength;

    if (this.dom.helperText) {
      this._validateHelperText(this.dom.helperText, isValid);
    }

    return isValid;
  }

  // ---------------------------------------------------------------------------
  // Password Visibility
  // ---------------------------------------------------------------------------

  /**
   * Toggles password visibility
   * @private
   */
  _togglePasswordVisibility() {
    if (!this.dom.passwordInput || !this.dom.toggleButton) return;

    this.isPasswordVisible = !this.isPasswordVisible;
    this.dom.passwordInput.type = this.isPasswordVisible ? "text" : "password";

    const action = this.isPasswordVisible ? "Hide" : "Show";
    this.dom.toggleButton.setAttribute("aria-label", `${action} password`);
    this.dom.toggleButton.setAttribute("aria-pressed", this.isPasswordVisible);
    this.dom.toggleButton.classList.toggle("visible", this.isPasswordVisible);

    this._schedulePasswordHide();
  }

  /**
   * Schedules automatic password hiding for security
   * @private
   */
  _schedulePasswordHide() {
    if (this._secureInputTimeout) {
      clearTimeout(this._secureInputTimeout);
    }

    if (this.isPasswordVisible) {
      this._secureInputTimeout = setTimeout(() => {
        if (this.isPasswordVisible) {
          this._togglePasswordVisibility();
          this._showNotification("Password hidden for security", "info");
        }
      }, this.secureInputTimeout);
    }
  }

  /**
   * Handles keyboard activation of toggle button
   * @param {KeyboardEvent} e
   * @private
   */
  _handleToggleKeydown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this._togglePasswordVisibility();
    }
  }

  // ---------------------------------------------------------------------------
  // Input Focus/Blur
  // ---------------------------------------------------------------------------

  /**
   * Handles input blur event
   * @private
   */
  _handleInputBlur() {
    if (this.dom.passwordInput) {
      this.dom.passwordInput.classList.remove("focused");
    }
    this._validatePasswordField();
  }

  /**
   * Handles input focus event
   * @private
   */
  _handleInputFocus() {
    if (this.dom.passwordInput) {
      this.dom.passwordInput.classList.add("focused");
      this.dom.passwordInput.classList.remove("invalid", "valid");
    }
  }

  // ---------------------------------------------------------------------------
  // UI Navigation
  // ---------------------------------------------------------------------------

  /**
   * Shows the password login form, hides Auth0 options
   */
  showPasswordForm() {
    if (this.dom.auth0Container) {
      this.dom.auth0Container.classList.add("d-none");
    }
    if (this.dom.passwordContainer) {
      this.dom.passwordContainer.classList.remove("d-none");
    }
    this.logger.debug("Switched to password form view");
  }

  /**
   * Shows Auth0 login options, hides password form
   */
  _showAuthOptions() {
    if (this.dom.passwordContainer) {
      this.dom.passwordContainer.classList.add("d-none");
    }
    if (this.dom.auth0Container) {
      this.dom.auth0Container.classList.remove("d-none");
    }
    this.logger.debug("Switched to Auth0 options view");
  }

  // ---------------------------------------------------------------------------
  // Validation Styling
  // ---------------------------------------------------------------------------

  /**
   * Applies validation styling to an input element
   * @param {HTMLElement} input - The input element
   * @param {boolean} isValid - Whether the input is valid
   * @private
   */
  _validateInputField(input, isValid) {
    if (!input) return;
    input.classList.toggle("valid", isValid);
    input.classList.toggle("invalid", !isValid);
    input.classList.remove("focused");
  }

  /**
   * Applies validation styling to helper text element with icon
   * @param {HTMLElement} element - The text element
   * @param {boolean} isValid - Whether the condition is met
   * @private
   */
  _validateHelperText(element, isValid) {
    if (!element) return;

    const text = element.textContent || element.innerText;
    if (!text) return;

    const icon = isValid
      ? '<i class="fas fa-check-circle"></i>'
      : '<i class="fas fa-times-circle"></i>';

    element.innerHTML = `${icon} ${text}`;
    element.classList.toggle("validtext", isValid);
    element.classList.toggle("invalidtext", !isValid);
  }

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------

  /**
   * Applies a shake animation to an element
   * @param {HTMLElement} element - Element to shake
   * @private
   */
  _shakeElement(element) {
    if (!element) return;
    element.classList.add("shake");
    setTimeout(() => {
      element.classList.remove("shake");
    }, 500);
  }

  // ---------------------------------------------------------------------------
  // Support
  // ---------------------------------------------------------------------------

  /**
   * Opens WhatsApp support window
   * @private
   */
  _handleSupport() {
    this.logger.time("Support request");

    const phoneNumber = 237670852835;
    const message = encodeURIComponent("Hello! I have a question about how to use this app.");
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    const newWindow = window.open(
      whatsappUrl,
      "whatsappWindow",
      "width=500,height=600,noopener,noreferrer",
    );

    if (!newWindow) {
      this._showNotification("Popup was blocked!", "error");
    }

    this.logger.timeEnd("Support request");
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  /**
   * Shows a notification via the LoginController's notification manager
   * @param {string} message
   * @param {string} [type='info']
   * @private
   */
  _showNotification(message, type = "info") {
    if (this.loginController?.notifications) {
      this.loginController.notifications.show(message, type);
    } else {
      this.logger.debug("Notification (no manager)", { message, type });
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Creates a debounced version of a function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function}
   * @private
   */
  _debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}


window.showPasswordLogin = function () {
  // If LoginUIManager instance exists, use it; otherwise do basic toggle
  if (window.__loginUIManager) {
    window.__loginUIManager.showPasswordForm();
  } else {
    document.getElementById("auth0")?.classList.add("d-none");
    document.getElementById("passwordContainer")?.classList.remove("d-none");
  }
};

window.showAuthOptions = function () {
  if (window.__loginUIManager) {
    window.__loginUIManager._showAuthOptions();
  } else {
    document.getElementById("passwordContainer")?.classList.add("d-none");
    document.getElementById("auth0")?.classList.remove("d-none");
  }
};

// Placeholder for Auth0 functions — will be overridden by LoginController
if (!window.loginWithAuth0) {
  window.loginWithAuth0 = function () {
    console.warn("Authentication system is still loading. Please wait...");
  };
}
if (!window.logoutWithAuth0) {
  window.logoutWithAuth0 = function () {
    console.warn("Authentication system is still loading. Please wait...");
  };
}

// -----------------------------------------------------------------------------
// Standalone Entry Point
// -----------------------------------------------------------------------------
// Runs when login.js is loaded directly on the login page.
// When loaded via main.js, main.js creates and manages the LoginController
// and passes it to LoginUIManager.

if (!window.__LOGIN_CONTROLLER_MANAGED__) {
  document.addEventListener("DOMContentLoaded", async () => {
    // Only auto-initialize if we're on the login page
    const pageElement = document.querySelector("#myPage");
    const currentPage = pageElement?.getAttribute("page");

    if (currentPage !== "login") {
      loginUILogger.debug(`Not on login page (page="${currentPage}") — skipping auto-init`);
      return;
    }

    try {
      // Create the auth controller
      const loginController = new LoginController({
        logger: logger.withContext({ module: "LoginController" }),
        isLoginPage: true,
      });
      await loginController.init();

      // Create and initialize the UI manager
      const loginUIManager = new LoginUIManager({
        loginController: loginController,
        logger: logger.withContext({ module: "LoginUIManager" }),
      });

      // Store reference for global functions
      window.__loginUIManager = loginUIManager;

      await loginUIManager.init(loginController);

      loginUILogger.info("Login page initialized in standalone mode");
    } catch (error) {
      loginUILogger.error("Failed to initialize login page", error);
    }
  });
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default LoginUIManager;
