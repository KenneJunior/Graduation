/**
 * DROPDOWN MANAGER - Enhanced floating dropdown menu with theme integration
 * @class DropdownManager
 */
export default class DropdownManager {
  constructor(options = {}) {
    this.options = {
      position: 'bottom-right',
      showBackdrop: true,
      autoClose: true,
      animationDuration: 300,
      themeManager: null,
      enableKeyboardNav: true,
      enableRippleEffect: true,
      menuItems: [
        { 
          label: 'Toggle Theme', 
          icon: 'fas fa-moon', 
          action: 'theme', 
          className: 'theme-toggle',
          dynamicLabel: true 
        },
        { 
          label: 'Settings', 
          icon: 'fas fa-cog', 
          action: 'settings' 
        },
        { 
          label: 'Help & Support', 
          icon: 'fas fa-question-circle', 
          action: 'help' 
        },
        { 
          label: 'Share App', 
          icon: 'fas fa-share-alt', 
          action: 'share' 
        },
        { type: 'divider' },
        { 
          label: 'Logout', 
          icon: 'fas fa-sign-out-alt', 
          action: 'logout', 
          className: 'logout' 
        }
      ],
      ...options
    };
    
    this.state = {
      isOpen: false,
      isMobile: this.checkIfMobile(),
      currentTheme: null
    };
    
    this.elements = {
      container: null,
      button: null,
      dropdown: null,
      backdrop: null
    };
    
    // Performance tracking
    this.performance = {
      openTime: 0,
      closeTime: 0
    };
    
    // Bind methods
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.closeDropdown = this.closeDropdown.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleResize = this.handleResize.bind(this);
    
    this.init();
  }
  
  /**
   * Initialize the dropdown manager
   */
  init() {
    try {
      this.createElements();
      this.setupEventListeners();
      this.setupThemeIntegration();
      this.setupAccessibility();
      
      // Initialize theme state
      this.updateThemeState();
      
      console.info('DropdownManager initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize DropdownManager:', error);
      throw error;
    }
  }
  
  /**
   * Check if device is mobile
   */
  checkIfMobile() {
    return window.matchMedia('(max-width: 768px)').matches || 
           'ontouchstart' in window || 
           navigator.maxTouchPoints > 0;
  }
  
  /**
   * Create all DOM elements
   */
  createElements() {
    // Create container
    this.elements.container = document.createElement('div');
    this.elements.container.className = 'floating-dropdown';
    this.elements.container.setAttribute('data-dropdown', 'true');
    
    // Create button
    this.createButton();
    
    // Create dropdown menu
    this.createDropdown();
    
    // Create backdrop if enabled
    if (this.options.showBackdrop) {
      this.createBackdrop();
    }
    
    // Set position
    this.setPosition();
    
    // Append to body
    document.body.appendChild(this.elements.container);
  }
  
  /**
   * Create floating button
   */
  createButton() {
    this.elements.button = document.createElement('button');
    this.elements.button.className = 'floating-dropdown-btn';
    this.elements.button.setAttribute('aria-label', 'Open menu');
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.button.setAttribute('aria-haspopup', 'true');
    this.elements.button.setAttribute('aria-controls', 'dropdown-menu');
    
    // Add ripple effect if enabled
    if (this.options.enableRippleEffect) {
      this.elements.button.classList.add('ripple-effect');
    }
    
    this.elements.button.innerHTML = `
      <span class="dropdown-btn-icon">
        <i class="fas fa-ellipsis-v"></i>
      </span>
      <span class="dropdown-btn-label sr-only">Menu</span>
    `;
    
    this.elements.container.appendChild(this.elements.button);
  }
  
  /**
   * Create dropdown menu
   */
/**
 * Create dropdown menu
 */
createDropdown() {
  this.elements.dropdown = document.createElement('div');
  this.elements.dropdown.className = 'dropdown-menu';
  this.elements.dropdown.id = 'dropdown-menu';
  this.elements.dropdown.setAttribute('role', 'menu');
  this.elements.dropdown.setAttribute('aria-hidden', 'true');
  this.elements.dropdown.setAttribute('aria-labelledby', 'dropdown-button');
  
  // Add menu items
  this.options.menuItems.forEach((item, index) => {
    if (item.type === 'divider') {
      this.addDivider();
    } else {
      this.createMenuItem(item, index); // CHANGED: Call createMenuItem instead
    }
  });
  
  this.elements.container.appendChild(this.elements.dropdown);
}

/**
 * Create a menu item DOM element (internal use)
 */
createMenuItem(item, index) {
  const button = document.createElement('button');
  button.className = `dropdown-item ${item.className || ''}`;
  button.setAttribute('role', 'menuitem');
  button.setAttribute('tabindex', '-1');
  button.setAttribute('data-action', item.action);
  button.setAttribute('data-index', index);
  
  // Add data attributes for dynamic content
  if (item.dynamicLabel) {
    button.setAttribute('data-dynamic-label', 'true');
  }
  
  button.innerHTML = `
    <span class="dropdown-item-icon">
      <i class="${item.icon}"></i>
    </span>
    <span class="dropdown-item-label">${item.label}</span>
    ${item.shortcut ? `<span class="dropdown-item-shortcut">${item.shortcut}</span>` : ''}
  `;
  
  // Add click handler
  button.addEventListener('click', (e) => this.handleMenuItemClick(e, item));
  
  this.elements.dropdown.appendChild(button);
}

/**
 * Add custom menu item to dropdown (public API)
 */
addMenuItem(config) {
  // Add to options
  const index = this.options.menuItems.findIndex(item => 
    item.action === 'logout' || item.className?.includes('logout')
  );
  
  if (index > -1) {
    // Insert before logout item
    this.options.menuItems.splice(index, 0, config);
  } else {
    // Add to end if no logout found
    this.options.menuItems.push(config);
  }
  
  // Re-render the menu item
  this.renderMenuItem(config, index > -1 ? index : this.options.menuItems.length - 1);
  
  console.debug(`Menu item added: ${config.label}`);
  return true;
}
/**
 * Render a single menu item to DOM
 */
renderMenuItem(config, positionIndex) {
  // Find where to insert in DOM
  const logoutItem = this.elements.dropdown.querySelector('.logout, [data-action="logout"]');
  const items = Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));
  const dividers = Array.from(this.elements.dropdown.querySelectorAll('.dropdown-divider'));
  
  let insertBeforeElement = null;
  let referenceIndex = positionIndex;
  
  if (logoutItem && config.action !== 'logout') {
    // Insert before logout item
    insertBeforeElement = logoutItem;
  } else if (items.length > 0) {
    // Find the element at the specified position
    const targetItem = items[Math.min(positionIndex, items.length - 1)];
    if (targetItem) {
      insertBeforeElement = targetItem.nextElementSibling || targetItem;
    }
  }
 
  // Create the menu item
  const button = document.createElement('button');
  button.className = `dropdown-item ${config.className || ''}`;
  button.setAttribute('role', 'menuitem');
  button.setAttribute('tabindex', '-1');
  button.setAttribute('data-action', config.action);
  button.setAttribute('data-index', referenceIndex);
  
  if (config.dynamicLabel) {
    button.setAttribute('data-dynamic-label', 'true');
  }
  
  button.innerHTML = `
    <span class="dropdown-item-icon">
      <i class="${config.icon}"></i>
    </span>
    <span class="dropdown-item-label">${config.label}</span>
    ${config.shortcut ? `<span class="dropdown-item-shortcut">${config.shortcut}</span>` : ''}
  `;
  
  button.addEventListener('click', (e) => this.handleMenuItemClick(e, config));
  
  // Insert into DOM
  if (insertBeforeElement) {
    insertBeforeElement.parentNode.insertBefore(button, insertBeforeElement);
  } else {
    this.elements.dropdown.appendChild(button);
  }
  
  // Update indices for all items
  this.updateMenuItemIndices();
}

/**
 * Update all menu item indices
 */
updateMenuItemIndices() {
  const items = Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));
  items.forEach((item, index) => {
    item.setAttribute('data-index', index);
  });
}


  
  /**
   * Add divider to dropdown
   */
  addDivider() {
    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    divider.setAttribute('role', 'separator');
    this.elements.dropdown.appendChild(divider);
  }
  
  /**
   * Create backdrop element
   */
  createBackdrop() {
    this.elements.backdrop = document.createElement('div');
    this.elements.backdrop.className = 'dropdown-backdrop';
    this.elements.backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.elements.backdrop);
  }
  
  /**
   * Set dropdown position
   */
  setPosition() {
    const positionMap = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'center-right': { top: '50%', right: '20px', transform: 'translateY(-50%)' },
      'center-left': { top: '50%', left: '20px', transform: 'translateY(-50%)' }
    };
    
    const position = positionMap[this.options.position] || positionMap['bottom-right'];
    Object.assign(this.elements.container.style, position);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Button click
    this.elements.button.addEventListener('click', this.toggleDropdown);
    
    // Click outside to close
    if (this.options.autoClose) {
      document.addEventListener('click', this.handleClickOutside);
      document.addEventListener('touchstart', this.handleClickOutside);
    }
    
    // Keyboard navigation
    if (this.options.enableKeyboardNav) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
    
    // Window resize
    window.addEventListener('resize', this.handleResize);
    
    // Escape key to close (global)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isOpen) {
        this.closeDropdown();
      }
    });
  }
  
  /**
   * Setup theme integration
   */
  setupThemeIntegration() {
    // Listen for theme changes
    document.addEventListener('theme:change', (e) => {
      this.handleThemeChange(e.detail?.theme);
    });
    
    // Check for existing theme
    this.updateThemeState();
  }
  
  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    // Add focus trap for dropdown
    this.setupFocusTrap();
    
    // Add screen reader announcements
    this.setupScreenReaderAnnouncements();
  }
  
  /**
   * Setup focus trap for keyboard navigation
   */
  setupFocusTrap() {
    this.elements.dropdown.addEventListener('keydown', (e) => {
      if (!this.state.isOpen) return;
      
      const items = this.getMenuItems();
      const currentIndex = items.indexOf(document.activeElement);
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.focusNextItem(currentIndex, items);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.focusPreviousItem(currentIndex, items);
          break;
        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case 'Tab':
          if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
            e.preventDefault();
            items[0]?.focus();
          } else if (e.shiftKey && document.activeElement === items[0]) {
            e.preventDefault();
            items[items.length - 1]?.focus();
          }
          break;
      }
    });
  }
  
  /**
   * Setup screen reader announcements
   */
  setupScreenReaderAnnouncements() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.id = 'dropdown-announcer';
    document.body.appendChild(liveRegion);
  }
  
  /**
   * Announce to screen readers
   */
  announce(message) {
    const announcer = document.getElementById('dropdown-announcer');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }
  
  /**
   * Get all menu items
   */
  getMenuItems() {
    return Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));
  }
  
  /**
   * Toggle dropdown open/close
   */
  toggleDropdown(e) {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (this.state.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  /**
   * Open dropdown with animation
   */
  openDropdown() {
    if (this.state.isOpen) return;
    
    this.performance.openTime = performance.now();
    
    // Update state
    this.state.isOpen = true;
    
    // Update ARIA attributes
    this.elements.button.setAttribute('aria-expanded', 'true');
    this.elements.dropdown.setAttribute('aria-hidden', 'false');
    
    // Update button icon
    this.updateButtonIcon('open');
    
    // Show dropdown
    this.elements.dropdown.classList.add('show');
    
    // Show backdrop
    if (this.elements.backdrop) {
      this.elements.backdrop.classList.add('show');
      this.elements.backdrop.setAttribute('aria-hidden', 'false');
    }
    
    // Focus first menu item
    setTimeout(() => {
      const items = this.getMenuItems();
      if (items.length > 0) {
        items[0].focus();
      }
    }, this.options.animationDuration);
    
    // Announce to screen readers
    this.announce('Menu opened');
    
    // Dispatch custom event
    this.dispatchEvent('dropdown:open');
  }
  
  /**
   * Close dropdown with animation
   */
  closeDropdown() {
    if (!this.state.isOpen) return;
    
    this.performance.closeTime = performance.now();
    
    // Update state
    this.state.isOpen = false;
    
    // Update ARIA attributes
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.dropdown.setAttribute('aria-hidden', 'true');
    
    // Update button icon
    this.updateButtonIcon('closed');
    
    // Hide dropdown
    this.elements.dropdown.classList.remove('show');
    
    // Hide backdrop
    if (this.elements.backdrop) {
      this.elements.backdrop.classList.remove('show');
      this.elements.backdrop.setAttribute('aria-hidden', 'true');
    }
    
    // Return focus to button
    setTimeout(() => {
      this.elements.button.focus();
    }, this.options.animationDuration);
    
    // Announce to screen readers
    this.announce('Menu closed');
    
    // Dispatch custom event
    this.dispatchEvent('dropdown:close');
  }
  
  /**
   * Update button icon based on state
   */
  updateButtonIcon(state) {
    const icon = this.elements.button.querySelector('.dropdown-btn-icon i');
    if (icon) {
      icon.className = state === 'open' ? 'fas fa-times' : 'fas fa-ellipsis-v';
    }
  }

  /**
 * Add custom action handler
 */
addCustomAction(action, handler) {
  if (!this.customActions) {
    this.customActions = new Map();
  }
  
  this.customActions.set(action, handler);
  
  // Update existing menu item if it exists
  const existingItem = this.elements.dropdown.querySelector(`[data-action="${action}"]`);
  if (existingItem) {
    existingItem.addEventListener('click', (e) => {
      e.stopPropagation();
      handler(e);
    });
  }
  
  console.debug(`Custom action added: ${action}`);
}

/**
 * Execute menu item action (updated version)
 */
executeAction(action, element) {
  // Check for custom action first
  if (this.customActions && this.customActions.has(action)) {
    try {
      this.customActions.get(action)(element);
      return;
    } catch (error) {
      console.error(`Custom action failed: ${action}`, error);
    }
  }
  
  // Handle built-in actions
  const actions = {
    theme: () => this.handleThemeAction(element),
    logout: () => this.handleLogoutAction(),
    settings: () => this.handleSettingsAction(),
    help: () => this.handleHelpAction(),
    share: () => this.handleShareAction(),
    'image-settings': () => this.handleImageSettingsAction(),
    'confetti-settings': () => this.handleConfettiSettingsAction(),
    about: () => this.handleAboutAction(),
    refresh: () => this.handleRefreshAction(),
    export: () => this.handleExportAction(),
    import: () => this.handleImportAction()
  };
  
  if (actions[action]) {
    actions[action]();
  } else {
    console.warn(`Unknown action: ${action}`);
  }
}

/**
 * Handle image settings action
 */
handleImageSettingsAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'image-settings',
    data: { timestamp: Date.now() }
  });
}

/**
 * Handle confetti settings action
 */
handleConfettiSettingsAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'confetti-settings',
    data: { timestamp: Date.now() }
  });
}

/**
 * Handle about action
 */
handleAboutAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'about',
    data: { timestamp: Date.now() }
  });
}

/**
 * Handle refresh action
 */
handleRefreshAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'refresh',
    data: { timestamp: Date.now() }
  });
}

/**
 * Handle export action
 */
handleExportAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'export',
    data: { timestamp: Date.now() }
  });
}

/**
 * Handle import action
 */
handleImportAction() {
  this.dispatchEvent('dropdown:action', { 
    action: 'import',
    data: { timestamp: Date.now() }
  });
}
  
  /**
   * Handle menu item click
   */
  handleMenuItemClick(e, item) {
    e.stopPropagation();
    
    // Add click animation
    this.animateClick(e);
    
    // Execute action
    this.executeAction(item.action, e.target);
    
    // Close dropdown (unless action prevents it)
    if (item.closeOnClick !== false) {
      this.closeDropdown();
    }
  }
  
  /**
   * Animate click with ripple effect
   */
  animateClick(e) {
    const element = e.target;
    if (!this.options.enableRippleEffect) return;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
    `;
    
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  /**
   * Execute menu item action
   */
  executeAction(action, element) {
    const actions = {
      theme: () => this.handleThemeAction(element),
      logout: () => this.handleLogoutAction(),
      settings: () => this.handleSettingsAction(),
      help: () => this.handleHelpAction(),
      share: () => this.handleShareAction()
    };
    
    if (actions[action]) {
      actions[action]();
    } else {
      console.warn(`Unknown action: ${action}`);
    }
  }
  
  /**
   * Handle theme toggle action
   */
  handleThemeAction(element) {
    // Check if we have a ThemeManager instance
    if (this.options.themeManager) {
      this.options.themeManager.toggle();
    } else {
      // Fallback: Toggle theme manually
      this.toggleTheme();
    }
    
    // Update theme button label
    this.updateThemeButtonLabel();
  }
  
  /**
   * Toggle theme (fallback)
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Update document
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Dispatch event
    this.dispatchEvent('theme:change', { theme: newTheme });
    
    // Update state
    this.state.currentTheme = newTheme;
  }
  
  /**
   * Update theme button label
   */
  updateThemeButtonLabel() {
    const themeItem = this.elements.dropdown.querySelector('[data-action="theme"]');
    if (!themeItem) return;
    
    const label = themeItem.querySelector('.dropdown-item-label');
    const icon = themeItem.querySelector('.dropdown-item-icon i');
    
    if (label && icon) {
      if (this.state.currentTheme === 'dark') {
        label.textContent = 'Light Mode';
        icon.className = 'fas fa-sun';
      } else {
        label.textContent = 'Dark Mode';
        icon.className = 'fas fa-moon';
      }
    }
  }
  
  /**
   * Handle logout action
   */
  handleLogoutAction() {
    // Show confirmation
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    // Dispatch event for app to handle
    this.dispatchEvent('user:logout');
    
    // Show toast
    this.showToast('Logging out...', 'info');
  }
  
  /**
   * Handle settings action
   */
  handleSettingsAction() {
    this.dispatchEvent('settings:open');
    this.showToast('Opening settings...', 'info');
  }
  
  /**
   * Handle help action
   */
  handleHelpAction() {
    this.dispatchEvent('help:open');
    this.showToast('Opening help...', 'info');
  }
  
  /**
   * Handle share action
   */
  handleShareAction() {
    this.dispatchEvent('share:open');
    
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: 'Check out this amazing graduation app!',
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback to clipboard
      this.copyToClipboard(window.location.href);
      this.showToast('Link copied to clipboard!', 'success');
    }
  }
  
  /**
   * Copy text to clipboard
   */
  copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => console.log('Copied to clipboard:', text))
      .catch(err => console.error('Copy failed:', err));
  }
  
  /**
   * Handle click outside dropdown
   */
  handleClickOutside(e) {
    if (!this.state.isOpen) return;
    
    const isClickInside = this.elements.container.contains(e.target) || 
                         (this.elements.backdrop && this.elements.backdrop.contains(e.target));
    
    if (!isClickInside) {
      this.closeDropdown();
    }
  }
  
  /**
   * Handle keyboard navigation
   */
  handleKeyDown(e) {
    if (!this.state.isOpen) return;
    
    const items = this.getMenuItems();
    const currentIndex = items.indexOf(document.activeElement);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusNextItem(currentIndex, items);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusPreviousItem(currentIndex, items);
        break;
    }
  }
  
  /**
   * Focus next menu item
   */
  focusNextItem(currentIndex, items) {
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    items[nextIndex]?.focus();
  }
  
  /**
   * Focus previous menu item
   */
  focusPreviousItem(currentIndex, items) {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    items[prevIndex]?.focus();
  }
  
  /**
   * Handle resize events
   */
  handleResize() {
    const wasMobile = this.state.isMobile;
    this.state.isMobile = this.checkIfMobile();
    
    // Adjust for mobile if state changed
    if (wasMobile !== this.state.isMobile) {
      this.adjustForMobile();
    }
  }
  
  /**
   * Adjust dropdown for mobile
   */
  adjustForMobile() {
    if (this.state.isMobile) {
      // Make dropdown full-width on mobile
      this.elements.dropdown.style.width = 'calc(100vw - 40px)';
      this.elements.dropdown.style.maxWidth = 'calc(100vw - 40px)';
      this.elements.dropdown.style.left = '20px';
      this.elements.dropdown.style.right = '20px';
    } else {
      // Reset styles for desktop
      this.elements.dropdown.style.width = '';
      this.elements.dropdown.style.maxWidth = '';
      this.elements.dropdown.style.left = '';
      this.elements.dropdown.style.right = '';
    }
  }
  
  /**
   * Handle theme change
   */
  handleThemeChange(theme) {
    this.state.currentTheme = theme;
    this.updateThemeButtonLabel();
    this.dispatchEvent('dropdown:theme-change', { theme });
  }
  
  /**
   * Update theme state
   */
  updateThemeState() {
    const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.state.currentTheme = theme;
    this.updateThemeButtonLabel();
  }
  
/**
 * Show enhanced toast notification with glass-morphism effects
 */
showToast(message, type = 'info', options = {}) {
    // Remove existing toasts if needed
    if (options.singleInstance) {
        const existingToasts = document.querySelectorAll('.dropdown-toast');
        existingToasts.forEach(toast => toast.remove());
    }
    
    // Create toast container
    const toast = document.createElement('div');
    toast.className = `dropdown-toast dropdown-toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');
    
    // Get icon based on type
    const icon = this.getToastIcon(type);
    const color = this.getToastColor(type);
    const duration = options.duration || 5000;
    
    // Create toast with glass-morphism design
    toast.innerHTML = `
        <div class="toast-glass-bg" style="
            position: absolute;
            inset: 0;
            background: ${color};
            border-radius: 16px;
            opacity: 0.9;
        "></div>
        
        <div class="toast-glass-effect" style="
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.15);
        "></div>
        
        <div class="toast-content" style="
            position: relative;
            z-index: 2;
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px 24px;
        ">
            <div class="toast-icon" style="
                flex-shrink: 0;
                width: 44px;
                height: 44px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                animation: iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            ">
                ${icon}
            </div>
            
            <div class="toast-message" style="flex: 1;">
                <div class="toast-title" style="
                    font-weight: 600;
                    font-size: 16px;
                    margin-bottom: 4px;
                    color: white;
                    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                ">
                    ${this.getToastTitle(type)}
                </div>
                <div class="toast-text" style="
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.9);
                    line-height: 1.4;
                ">
                    ${message}
                </div>
            </div>
            
            <button class="toast-close" aria-label="Close notification" style="
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            ">
                <span style="display: block; transform: rotate(45deg); transition: transform 0.3s ease;">+</span>
            </button>
        </div>
        
        <div class="toast-progress" style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 0 0 16px 16px;
            overflow: hidden;
        ">
            <div class="toast-progress-bar" style="
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                width: 100%;
                transform-origin: left;
                animation: toastProgress ${duration}ms linear forwards;
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            "></div>
        </div>
        
        <!-- Decorative glow -->
        <div class="toast-glow" style="
            position: absolute;
            inset: -10px;
            background: ${color};
            border-radius: 26px;
            filter: blur(15px);
            opacity: 0.3;
            z-index: -1;
            animation: glowPulse 2s ease-in-out infinite;
        "></div>
    `;
    
    // Style toast container
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 380px;
        max-width: calc(100vw - 60px);
        z-index: 10001;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        animation: toastEntrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        pointer-events: none;
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Add CSS animations if not already present
    this.addToastStyles();
    
    // Show toast with pointer events
    setTimeout(() => {
        toast.style.pointerEvents = 'auto';
    }, 600);
    
    // Setup close functionality
    const closeBtn = toast.querySelector('.toast-close');
    const progressBar = toast.querySelector('.toast-progress-bar');
    
    const closeToast = () => {
        toast.style.animation = 'toastExit 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        if (progressBar) {
            progressBar.style.animation = 'none';
        }
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    };
    
    closeBtn.addEventListener('click', closeToast);
    
    // Auto-remove after duration
    let timeoutId = setTimeout(closeToast, duration);
    
    // Pause on hover
    toast.addEventListener('mouseenter', () => {
        if (progressBar) {
            progressBar.style.animationPlayState = 'paused';
        }
        clearTimeout(timeoutId);
    });
    
    toast.addEventListener('mouseleave', () => {
        if (progressBar) {
            progressBar.style.animationPlayState = 'running';
        }
        const remainingTime = progressBar ? 
            (progressBar.offsetWidth / progressBar.parentElement.offsetWidth) * duration : 
            duration;
        timeoutId = setTimeout(closeToast, remainingTime);
    });
    
    // Add keyboard support
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeToast();
        }
    };
    
    closeBtn.addEventListener('focus', () => {
        document.addEventListener('keydown', handleKeyDown);
    });
    
    closeBtn.addEventListener('blur', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
    
    // Add click to close (except on close button)
    toast.addEventListener('click', (e) => {
        if (!e.target.closest('.toast-close')) {
            closeToast();
        }
    });
    
    // Chainable API
    return {
        close: closeToast,
        update: (newMessage, newType) => {
            if (newMessage) {
                const textElement = toast.querySelector('.toast-text');
                if (textElement) textElement.textContent = newMessage;
            }
            if (newType) {
                const color = this.getToastColor(newType);
                const icon = this.getToastIcon(newType);
                const title = this.getToastTitle(newType);
                
                const iconElement = toast.querySelector('.toast-icon');
                const titleElement = toast.querySelector('.toast-title');
                const bgElement = toast.querySelector('.toast-glass-bg');
                const glowElement = toast.querySelector('.toast-glow');
                
                if (iconElement) iconElement.innerHTML = icon;
                if (titleElement) titleElement.textContent = title;
                if (bgElement) bgElement.style.background = color;
                if (glowElement) glowElement.style.background = color;
                
                // Animate update
                iconElement.style.animation = 'iconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }
        }
    };
}

/**
 * Get toast color with opacity
 */
getToastColor(type) {
    const colors = {
        success: 'rgba(76, 175, 80, 0.95)',
        error: 'rgba(244, 67, 54, 0.95)',
        warning: 'rgba(255, 152, 0, 0.95)',
        info: 'rgba(33, 150, 243, 0.95)',
        dark: 'rgba(33, 33, 33, 0.95)',
        light: 'rgba(255, 255, 255, 0.95)'
    };
    return colors[type] || colors.info;
}

/**
 * Get toast icon
 */
getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        dark: '🌙',
        light: '☀️'
    };
    return icons[type] || icons.info;
}

/**
 * Get toast title
 */
getToastTitle(type) {
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info',
        dark: 'Dark Mode',
        light: 'Light Mode'
    };
    return titles[type] || 'Notification';
}

/**
 * Add toast CSS styles
 */
addToastStyles() {
    if (document.querySelector('#toast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes toastEntrance {
            0% {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        @keyframes toastExit {
            0% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translateY(-20px) scale(0.95);
            }
        }
        
        @keyframes iconPop {
            0% {
                transform: scale(0) rotate(-180deg);
                opacity: 0;
            }
            70% {
                transform: scale(1.2) rotate(10deg);
                opacity: 1;
            }
            100% {
                transform: scale(1) rotate(0);
            }
        }
        
        @keyframes toastProgress {
            from {
                transform: scaleX(1);
            }
            to {
                transform: scaleX(0);
            }
        }
        
        @keyframes glowPulse {
            0%, 100% {
                opacity: 0.2;
                transform: scale(1);
            }
            50% {
                opacity: 0.4;
                transform: scale(1.02);
            }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
            20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        /* Hover effects */
        .dropdown-toast:hover .toast-icon {
            animation: float 2s ease-in-out infinite;
        }
        
        .toast-close:hover {
            background: rgba(255, 255, 255, 0.2) !important;
            transform: rotate(90deg);
        }
        
        .toast-close:hover span {
            transform: rotate(135deg) !important;
        }
        
        /* Error toast special animation */
        .dropdown-toast-error:hover .toast-icon {
            animation: shake 0.5s ease-in-out;
        }
        
        /* Stacking for multiple toasts */
        .dropdown-toast:nth-child(1) { 
            bottom: 30px !important; 
        }
        .dropdown-toast:nth-child(2) { 
            bottom: calc(30px + 100px) !important; 
        }
        .dropdown-toast:nth-child(3) { 
            bottom: calc(30px + 200px) !important; 
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
            .dropdown-toast {
                right: 15px !important;
                left: 15px !important;
                width: auto !important;
                max-width: none !important;
            }
            
            .toast-content {
                padding: 16px 20px !important;
            }
            
            .toast-icon {
                width: 36px !important;
                height: 36px !important;
                font-size: 18px !important;
            }
        }
        
        /* Dark theme adjustments */
        @media (prefers-color-scheme: dark) {
            .dropdown-toast-light .toast-glass-effect {
                background: rgba(0, 0, 0, 0.2) !important;
                border-color: rgba(0, 0, 0, 0.3) !important;
            }
        }
        
        /* Print styles */
        @media print {
            .dropdown-toast {
                display: none !important;
            }
        }
    `;
    
    document.head.appendChild(style);
}

/**
 * Advanced toast API with queue management
 */
showAdvancedToast(message, type = 'info', options = {}) {
    const defaultOptions = {
        duration: 5000,
        position: 'bottom-right', // 'top-right', 'top-left', 'bottom-left', 'bottom-center', 'top-center'
        icon: null, // Custom icon override
        title: null, // Custom title override
        actions: [], // Array of { label, action, color }
        dismissible: true,
        progress: true,
        sound: false, // Play sound
        vibration: false, // Vibrate on mobile
        queue: true, // Add to queue if many toasts
        maxToasts: 3, // Maximum visible toasts
        ...options
    };
    
    // Manage toast queue
    if (defaultOptions.queue) {
        const existingToasts = document.querySelectorAll('.dropdown-toast').length;
        if (existingToasts >= defaultOptions.maxToasts) {
            // Queue logic - store for later or auto-dismiss oldest
            const oldestToast = document.querySelector('.dropdown-toast');
            if (oldestToast && oldestToast._toastInstance) {
                oldestToast._toastInstance.close();
            }
        }
    }
    
    // Create toast with enhanced options
    const toastInstance = this.showToast(message, type, defaultOptions);
    
    // Add custom icon if provided
    if (defaultOptions.icon) {
        const iconElement = document.querySelector('.dropdown-toast:last-child .toast-icon');
        if (iconElement) iconElement.innerHTML = defaultOptions.icon;
    }
    
    // Add custom title if provided
    if (defaultOptions.title) {
        const titleElement = document.querySelector('.dropdown-toast:last-child .toast-title');
        if (titleElement) titleElement.textContent = defaultOptions.title;
    }
    
    // Add action buttons if provided
    if (defaultOptions.actions.length > 0) {
        const toast = document.querySelector('.dropdown-toast:last-child .toast-content');
        if (toast) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'toast-actions';
            actionsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                margin-top: 12px;
            `;
            
            defaultOptions.actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.label;
                button.style.cssText = `
                    padding: 6px 12px;
                    background: ${action.color || 'rgba(255, 255, 255, 0.2)'};
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(10px);
                `;
                
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    action.action();
                    toastInstance.close();
                });
                
                button.addEventListener('mouseenter', () => {
                    button.style.transform = 'translateY(-1px)';
                    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.transform = '';
                    button.style.boxShadow = '';
                });
                
                actionsContainer.appendChild(button);
            });
            
            toast.appendChild(actionsContainer);
        }
    }
    
    // Play sound if enabled
    if (defaultOptions.sound) {
        this.playToastSound(type);
    }
    
    // Vibrate if enabled and supported
    if (defaultOptions.vibration && 'vibrate' in navigator) {
        const patterns = {
            success: [100, 50, 100],
            error: [200, 100, 200],
            warning: [150, 75, 150],
            info: [100]
        };
        navigator.vibrate(patterns[type] || patterns.info);
    }
    
    // Store instance for reference
    const toastElement = document.querySelector('.dropdown-toast:last-child');
    if (toastElement) {
        toastElement._toastInstance = toastInstance;
    }
    
    return toastInstance;
}

/**
 * Play toast sound based on type
 */
playToastSound(type) {
    const sounds = {
        success: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
        error: 'https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-960.mp3',
        warning: 'https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-960.mp3',
        info: 'https://assets.mixkit.co/sfx/preview/mixkit-magic-sparkles-300.mp3'
    };
    
    if (sounds[type]) {
        const audio = new Audio(sounds[type]);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio playback failed:', e));
    }
}
  
  /**
   * Dispatch custom event
   */
  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { 
      detail,
      bubbles: true,
      cancelable: true 
    });
    
    document.dispatchEvent(event);
  }
  
  /**
   * Get dropdown state
   */
  getState() {
    return {
      isOpen: this.state.isOpen,
      isMobile: this.state.isMobile,
      currentTheme: this.state.currentTheme,
      performance: { ...this.performance }
    };
  }
  
  /**
   * Update dropdown options
   */
  updateOptions(newOptions) {
    Object.assign(this.options, newOptions);
    
    // Recreate if needed
    if (newOptions.menuItems || newOptions.position) {
      this.recreateDropdown();
    }
  }
  
  /**
   * Recreate dropdown
   */
recreateDropdown() {
  if (!this.elements.dropdown) return;
  
  // Store current scroll position if needed
  const wasOpen = this.state.isOpen;
  
  // Close dropdown if open
  if (wasOpen) {
    this.closeDropdown();
  }
  
  // Remove old dropdown
  this.elements.dropdown.remove();
  
  // Create new dropdown
  this.createDropdown();
  
  // Re-open if it was open
  if (wasOpen) {
    setTimeout(() => {
      this.openDropdown();
    }, 10);
  }
}
  
  /**
   * Add custom menu item
   */
  addMenuItem(config) {
    const index = this.options.menuItems.length - 1; // Insert before logout
    this.options.menuItems.splice(index, 0, config);
    //this.recreateDropdown();
  }
  
/**
 * Remove menu item by action
 */
updateMenuItemIndices() {
  const items = Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));
  items.forEach((item, index) => {
    item.setAttribute('data-index', index);
  });
}

/**
 * Remove menu item by action
 */
removeMenuItem(action) {
  // Remove from options
  const itemIndex = this.options.menuItems.findIndex(item => item.action === action);
  if (itemIndex > -1) {
    this.options.menuItems.splice(itemIndex, 1);
  }
  
  // Remove from DOM
  const item = this.elements.dropdown.querySelector(`[data-action="${action}"]`);
  if (item) {
    item.remove();
    this.updateMenuItemIndices();
    console.debug(`Menu item removed: ${action}`);
    return true;
  }
  
  return false;
}

/**
 * Update existing menu item
 */
updateMenuItem(action, updates) {
  // Update in options
  const itemIndex = this.options.menuItems.findIndex(item => item.action === action);
  if (itemIndex > -1) {
    this.options.menuItems[itemIndex] = { ...this.options.menuItems[itemIndex], ...updates };
  }
  
  // Update in DOM
  const item = this.elements.dropdown.querySelector(`[data-action="${action}"]`);
  if (item) {
    if (updates.label) {
      const label = item.querySelector('.dropdown-item-label');
      if (label) {
        label.textContent = updates.label;
      }
    }
    
    if (updates.icon) {
      const icon = item.querySelector('.dropdown-item-icon i');
      if (icon) {
        icon.className = updates.icon;
      }
    }
    
    if (updates.className !== undefined) {
      // Remove existing classes except dropdown-item
      item.className = 'dropdown-item';
      if (updates.className) {
        item.classList.add(updates.className);
      }
    }
    
    console.debug(`Menu item updated: ${action}`);
    return true;
  }
  
  return false;
}

  
  /**
   * Cleanup resources
   */
  destroy() {
    // Remove event listeners
    this.elements.button.removeEventListener('click', this.toggleDropdown);
    document.removeEventListener('click', this.handleClickOutside);
    document.removeEventListener('touchstart', this.handleClickOutside);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    
    // Remove elements from DOM
    if (this.elements.container) {
      this.elements.container.remove();
    }
    
    if (this.elements.backdrop) {
      this.elements.backdrop.remove();
    }
    
    // Clear references
    this.elements = {};
    this.state = {};
    
    console.info('DropdownManager destroyed');
  }
}

// Add CSS animations
const dropdownStyles = document.createElement('style');
dropdownStyles.textContent = `
  /* Dropdown animations */
  @keyframes dropdownFadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes dropdownFadeOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
    }
  }
  
  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes backdropFadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes toastSlideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes toastSlideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  /* Ripple effect */
  .ripple-effect {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.6s linear;
    pointer-events: none;
  }
  
  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
document.head.appendChild(dropdownStyles);