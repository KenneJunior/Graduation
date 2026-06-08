import logger from "./logger.js";

/**
 * DROPDOWN MANAGER - Enhanced floating dropdown menu with external theme integration.
 * @class DropdownManager
 */
export default class DropdownManager {
  constructor(options = {}) {
    this.options = {
      position: 'bottom-right',
      showBackdrop: true,
      autoClose: true,
      logger: logger.withContext({ name: "DropdownManager" }),
      animationDuration: 300,
      themeManager: null,  // External ThemeManager instance
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

    // Bound methods
    this.toggleDropdown     = this.toggleDropdown.bind(this);
    this.closeDropdown      = this.closeDropdown.bind(this);
    this.handleClickOutside = this.handleClickOutside.bind(this);
    this.handleKeyDown      = this.handleKeyDown.bind(this);
    this.handleResize       = this.handleResize.bind(this);
    this.handleThemeChange  = this.handleThemeChange.bind(this);

    this.init();
  }

  /**
   * Initialize the dropdown manager.
   */
  init() {
    try {
      this.createElements();
      this.setupEventListeners();
      this.setupThemeIntegration();
      this.setupAccessibility();
      this.updateThemeState();
      this.options.logger.info('DropdownManager initialized successfully');
    } catch (error) {
      this.options.logger.error('Failed to initialize DropdownManager:', error);
      throw error;
    }
  }

  /**
   * Check if device is mobile.
   */
  checkIfMobile() {
    return window.matchMedia('(max-width: 768px)').matches ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
  }

  // ---------------------------------------------------------------------------
  // DOM CREATION
  // ---------------------------------------------------------------------------

  /**
   * Create all DOM elements.
   */
  createElements() {
    this.elements.container = document.createElement('div');
    this.elements.container.className = 'floating-dropdown';
    this.elements.container.setAttribute('data-dropdown', 'true');

    this.createButton();
    this.createDropdown();

    if (this.options.showBackdrop) {
      this.createBackdrop();
    }

    this.setPosition();
    document.body.appendChild(this.elements.container);
  }

  /**
   * Create the floating trigger button.
   */
  createButton() {
    this.elements.button = document.createElement('button');
    this.elements.button.className = 'floating-dropdown-btn';
    this.elements.button.setAttribute('aria-label', 'Open menu');
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.button.setAttribute('aria-haspopup', 'true');
    this.elements.button.setAttribute('aria-controls', 'dropdown-menu');

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
   * Create the dropdown menu panel.
   */
  createDropdown() {
    this.elements.dropdown = document.createElement('div');
    this.elements.dropdown.className = 'dropdown-menu';
    this.elements.dropdown.id = 'dropdown-menu';
    this.elements.dropdown.setAttribute('role', 'menu');
    this.elements.dropdown.setAttribute('aria-hidden', 'true');
    this.elements.dropdown.setAttribute('aria-labelledby', 'dropdown-button');

    this.options.menuItems.forEach((item, index) => {
      if (item.type === 'divider') {
        this.addDivider();
      } else {
        this.createMenuItem(item, index);
      }
    });

    this.elements.container.appendChild(this.elements.dropdown);
  }

  /**
   * Create a single menu item button (internal).
   */
  createMenuItem(item, index) {
    const button = document.createElement('button');
    button.className = `dropdown-item ${item.className || ''}`.trim();
    button.setAttribute('role', 'menuitem');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('data-action', item.action);
    button.setAttribute('data-index', index);

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

    button.addEventListener('click', (e) => this.handleMenuItemClick(e, item));
    this.elements.dropdown.appendChild(button);
  }

  /**
   * Add a visual divider to the dropdown.
   */
  addDivider() {
    const divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    divider.setAttribute('role', 'separator');
    this.elements.dropdown.appendChild(divider);
  }

  /**
   * Create the backdrop overlay element.
   */
  createBackdrop() {
    this.elements.backdrop = document.createElement('div');
    this.elements.backdrop.className = 'dropdown-backdrop';
    this.elements.backdrop.setAttribute('aria-hidden', 'true');
    this.elements.backdrop.addEventListener('click', this.handleClickOutside);
    document.body.appendChild(this.elements.backdrop);
  }

  /**
   * Destroy and optionally recreate the backdrop based on the current
   * showBackdrop option.
   */
  syncBackdrop() {
    if (this.options.showBackdrop) {
      if (!this.elements.backdrop) {
        this.createBackdrop();
      }
    } else {
      if (this.elements.backdrop) {
        this.elements.backdrop.removeEventListener('click', this.handleClickOutside);
        this.elements.backdrop.remove();
        this.elements.backdrop = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC MENU ITEM API
  // ---------------------------------------------------------------------------

  /**
   * Add a custom menu item.
   * @param {Object} config Menu item config object.
   * @returns {boolean}
   */
  addMenuItem(config) {
    const index = this.options.menuItems.findIndex(item =>
      item.action === 'logout' || item.className?.includes('logout')
    );

    if (index > -1) {
      this.options.menuItems.splice(index, 0, config);
    } else {
      this.options.menuItems.push(config);
    }

    this.renderMenuItem(config, index > -1 ? index : this.options.menuItems.length - 1);
    this.options.logger.debug(`Menu item added: ${config.label}`);
    return true;
  }

  /**
   * Render a single menu item into the DOM at the correct position.
   */
  renderMenuItem(config, positionIndex) {
    const logoutItem = this.elements.dropdown.querySelector('.logout, [data-action="logout"]');
    const items      = Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));

    let insertBeforeElement = null;

    if (logoutItem && config.action !== 'logout') {
      insertBeforeElement = logoutItem;
    } else if (items.length > 0) {
      const targetItem = items[Math.min(positionIndex, items.length - 1)];
      if (targetItem) {
        insertBeforeElement = targetItem.nextElementSibling || targetItem;
      }
    }

    const button = document.createElement('button');
    button.className = `dropdown-item ${config.className || ''}`.trim();
    button.setAttribute('role', 'menuitem');
    button.setAttribute('tabindex', '-1');
    button.setAttribute('data-action', config.action);
    button.setAttribute('data-index', positionIndex);

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

    if (insertBeforeElement) {
      insertBeforeElement.parentNode.insertBefore(button, insertBeforeElement);
    } else {
      this.elements.dropdown.appendChild(button);
    }

    this.updateMenuItemIndices();
  }

  /**
   * Remove a menu item by its action key.
   * @param {string} action
   * @returns {boolean}
   */
  removeMenuItem(action) {
    const itemIndex = this.options.menuItems.findIndex(item => item.action === action);
    if (itemIndex > -1) this.options.menuItems.splice(itemIndex, 1);

    const el = this.elements.dropdown.querySelector(`[data-action="${action}"]`);
    if (el) {
      el.remove();
      this.updateMenuItemIndices();
      this.options.logger.debug(`Menu item removed: ${action}`);
      return true;
    }

    return false;
  }

  /**
   * Update an existing menu item in place.
   * @param {string} action
   * @param {Object} updates  Partial config to merge.
   * @returns {boolean}
   */
  updateMenuItem(action, updates) {
    const itemIndex = this.options.menuItems.findIndex(item => item.action === action);
    if (itemIndex > -1) {
      this.options.menuItems[itemIndex] = { ...this.options.menuItems[itemIndex], ...updates };
    }

    const el = this.elements.dropdown.querySelector(`[data-action="${action}"]`);
    if (el) {
      if (updates.label) {
        const label = el.querySelector('.dropdown-item-label');
        if (label) label.textContent = updates.label;
      }
      if (updates.icon) {
        const icon = el.querySelector('.dropdown-item-icon i');
        if (icon) icon.className = updates.icon;
      }
      if (updates.className !== undefined) {
        el.className = 'dropdown-item';
        if (updates.className) el.classList.add(updates.className);
      }

      this.options.logger.debug(`Menu item updated: ${action}`);
      return true;
    }

    return false;
  }

  /**
   * Re-index all menu item data-index attributes after DOM mutations.
   */
  updateMenuItemIndices() {
    this.elements.dropdown
      .querySelectorAll('.dropdown-item')
      .forEach((item, index) => item.setAttribute('data-index', index));
  }

  // ---------------------------------------------------------------------------
  // POSITION
  // ---------------------------------------------------------------------------

  /**
   * Apply the chosen position to the container.
   */
  setPosition() {
    const positionMap = {
      'bottom-right': { bottom: '20px', right: '20px',  top: '',     left: '',     transform: '' },
      'bottom-left':  { bottom: '20px', left: '20px',   top: '',     right: '',    transform: '' },
      'top-right':    { top: '20px',    right: '20px',  bottom: '',  left: '',     transform: '' },
      'top-left':     { top: '20px',    left: '20px',   bottom: '',  right: '',    transform: '' },
      'center-right': { top: '50%',     right: '20px',  bottom: '',  left: '',     transform: 'translateY(-50%)' },
      'center-left':  { top: '50%',     left: '20px',   bottom: '',  right: '',    transform: 'translateY(-50%)' },
    };

    const pos = positionMap[this.options.position] || positionMap['top-right'];
    Object.assign(this.elements.container.style, pos);
    this.elements.container.dataset.position = this.options.position;
  }

  // ---------------------------------------------------------------------------
  // EVENT LISTENERS
  // ---------------------------------------------------------------------------

  setupEventListeners() {
    this.elements.button.addEventListener('click', this.toggleDropdown);

    if (this.options.autoClose) {
      document.addEventListener('click',      this.handleClickOutside);
      document.addEventListener('touchstart', this.handleClickOutside, {
        passive: true,
      });
    }

    if (this.options.enableKeyboardNav) {
      document.addEventListener('keydown', this.handleKeyDown);
    }

    window.addEventListener('resize', this.handleResize);

    // Global Escape handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.isOpen) this.closeDropdown();
    });
  }

  /**
   * Wire or unwire the outside-click / touchstart listeners based on the
   * current value of this.options.autoClose.  Call after changing that option
   * at runtime (e.g. from the Settings modal save handler).
   */
  syncAutoCloseListeners() {
    // Always remove first to avoid duplicate listeners
    document.removeEventListener('click',      this.handleClickOutside);
    document.removeEventListener('touchstart', this.handleClickOutside);

    if (this.options.autoClose) {
      document.addEventListener('click',      this.handleClickOutside);
      document.addEventListener('touchstart', this.handleClickOutside, {
        passive: true,
      });
    }
  }

  /**
   * Wire or unwire the arrow-key navigation listener based on the current
   * value of this.options.enableKeyboardNav.  Call after changing that option
   * at runtime.
   */
  syncKeyboardNavListener() {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.options.enableKeyboardNav) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  // ---------------------------------------------------------------------------
  // THEME INTEGRATION
  // ---------------------------------------------------------------------------

  /**
   * Setup theme integration with external ThemeManager
   */
  setupThemeIntegration() {
    // Listen to theme changes from ThemeManager
    document.addEventListener('theme:changed', this.handleThemeChange);
    document.addEventListener('graduationapp:themeChanged', this.handleThemeChange);

    this.updateThemeState();
  }

  /**
   * Handle theme action - delegate to ThemeManager
   */
  handleThemeAction() {
    if (this.options.themeManager && typeof this.options.themeManager.toggle === 'function') {
      this.options.themeManager.toggle();
    } else {
      // Fallback: try to find or create ThemeManager instance
      this.fallbackThemeToggle();
    }
    this.updateThemeButtonLabel();
  }

  /**
   * Fallback theme toggle if no ThemeManager provided
   */
  fallbackThemeToggle() {
    const current = document.documentElement.getAttribute('data-theme') ||
                    document.body.getAttribute('data-theme') ||
                    'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('myapp-theme', newTheme);

    // Dispatch events for consistency
    const event = new CustomEvent('theme:changed', {
      detail: { theme: newTheme, oldTheme: current },
      bubbles: true
    });
    document.dispatchEvent(event);

    this.state.currentTheme = newTheme;
    this.options.logger.info('Theme toggled via fallback', { theme: newTheme });
  }

  /**
   * Update theme button label based on current theme
   */
  updateThemeButtonLabel() {
    const themeItem = this.elements.dropdown?.querySelector('[data-action="theme"]');
    if (!themeItem) return;

    const label = themeItem.querySelector('.dropdown-item-label');
    const icon = themeItem.querySelector('.dropdown-item-icon i');

    if (label && icon) {
      const isDark = this.state.currentTheme === 'dark';
      label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  /**
   * Handle theme change from external ThemeManager
   * @param {CustomEvent} event - Theme change event
   */
  handleThemeChange(event) {
    const theme = event?.detail?.theme;
    if (!theme) return;

    this.state.currentTheme = theme;
    this.updateThemeButtonLabel();

    // Dispatch dropdown-specific theme event
    this.dispatchEvent('dropdown:theme-change', { theme });
    this.options.logger.debug('Theme changed in DropdownManager', { theme });
  }

  /**
   * Update theme state from ThemeManager or localStorage
   */
  updateThemeState() {
    // Try to get theme from ThemeManager first
    if (this.options.themeManager && typeof this.options.themeManager.getCurrentTheme === 'function') {
      const theme = this.options.themeManager.getCurrentTheme();
      if (theme) {
        this.state.currentTheme = theme;
        this.updateThemeButtonLabel();
        return;
      }
    }

    // Fallback to localStorage or system preference
    this.state.currentTheme = localStorage.getItem('myapp-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.updateThemeButtonLabel();
  }

  // ---------------------------------------------------------------------------
  // ACCESSIBILITY
  // ---------------------------------------------------------------------------

  setupAccessibility() {
    this.setupFocusTrap();
    this.setupScreenReaderAnnouncements();
  }

  setupFocusTrap() {
    this.elements.dropdown.addEventListener('keydown', (e) => {
      if (!this.state.isOpen) return;

      const items        = this.getMenuItems();
      const currentIndex = items.indexOf(document.activeElement);

      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); this.focusNextItem(currentIndex, items);     break;
        case 'ArrowUp':   e.preventDefault(); this.focusPreviousItem(currentIndex, items); break;
        case 'Home':      e.preventDefault(); items[0]?.focus();                           break;
        case 'End':       e.preventDefault(); items[items.length - 1]?.focus();            break;
        case 'Tab':
          if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
            e.preventDefault(); items[0]?.focus();
          } else if (e.shiftKey && document.activeElement === items[0]) {
            e.preventDefault(); items[items.length - 1]?.focus();
          }
          break;
      }
    });
  }

  setupScreenReaderAnnouncements() {
    const liveRegion = document.createElement('div');
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.id = 'dropdown-announcer';
    document.body.appendChild(liveRegion);
  }

  // ---------------------------------------------------------------------------
  // OPEN / CLOSE
  // ---------------------------------------------------------------------------

  toggleDropdown(e) {
    e?.stopPropagation();
    e?.preventDefault();
    this.state.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown() {
    if (this.state.isOpen) return;

    this.performance.openTime = performance.now();
    this.state.isOpen = true;

    this.elements.button.setAttribute('aria-expanded', 'true');
    this.elements.dropdown.setAttribute('aria-hidden', 'false');
    this.updateButtonIcon('open');
    this.elements.dropdown.classList.add('show');

    if (this.elements.backdrop) {
      this.elements.backdrop.classList.add('show');
      this.elements.backdrop.setAttribute('aria-hidden', 'false');
    }

    setTimeout(() => {
      this.getMenuItems()[0]?.focus();
    }, this.options.animationDuration);

    this.announce('Menu opened');
    this.dispatchEvent('dropdown:open');
  }

  closeDropdown() {
    if (!this.state.isOpen) return;

    this.performance.closeTime = performance.now();
    this.state.isOpen = false;

    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.dropdown.setAttribute('aria-hidden', 'true');
    this.updateButtonIcon('closed');
    this.elements.dropdown.classList.remove('show');

    if (this.elements.backdrop) {
      this.elements.backdrop.classList.remove('show');
      this.elements.backdrop.setAttribute('aria-hidden', 'true');
    }

    setTimeout(() => {
      this.elements.button.focus();
    }, this.options.animationDuration);

    this.announce('Menu closed');
    this.dispatchEvent('dropdown:close');
  }

  updateButtonIcon(state) {
    const icon = this.elements.button.querySelector('.dropdown-btn-icon i');
    if (icon) {
      icon.className = state === 'open' ? 'fas fa-times' : 'fas fa-ellipsis-v';
    }
  }

  getMenuItems() {
    return Array.from(this.elements.dropdown.querySelectorAll('.dropdown-item'));
  }

  announce(message) {
    const announcer = document.getElementById('dropdown-announcer');
    if (announcer) {
      announcer.textContent = message;
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }

  // ---------------------------------------------------------------------------
  // CLICK / RIPPLE
  // ---------------------------------------------------------------------------

  handleMenuItemClick(e, item) {
    e.stopPropagation();
    this.animateClick(e);
    this.executeAction(item.action, e.target);

    // Individual items can still opt out via closeOnClick: false.
    const shouldClose = this.options.autoClose && item.closeOnClick !== false;
    if (shouldClose) this.closeDropdown();
  }

  /**
   * Ripple click animation.
   * Only the position/size are dynamic and must stay as inline styles.
   */
  animateClick(e) {
    if (!this.options.enableRippleEffect) return;

    const element = e.currentTarget ?? e.target;
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  addCustomAction(action, handler) {
    if (!this.customActions) this.customActions = new Map();
    this.customActions.set(action, handler);
    this.options.logger.debug(`Custom action added: ${action}`);
  }

  executeAction(action, element) {
    if (this.customActions?.has(action)) {
      try {
        this.customActions.get(action)(element);
        return;
      } catch (error) {
        this.options.logger.error(`Custom action failed: ${action}`, error);
      }
    }

    const actions = {
      theme:               () => this.handleThemeAction(element),
      logout:              () => this.handleLogoutAction(),
      settings:            () => this.handleSettingsAction(),
      help:                () => this.handleHelpAction(),
      share:               () => this.handleShareAction(),
      'image-settings':    () => this.handleImageSettingsAction(),
      'confetti-settings': () => this.handleConfettiSettingsAction(),
      about:               () => this.handleAboutAction(),
      refresh:             () => this.handleRefreshAction(),
      export:              () => this.handleExportAction(),
      import:              () => this.handleImportAction(),
    };

    if (actions[action]) {
      actions[action]();
    } else {
      this.options.logger.warn(`Unknown action: ${action}`);
    }
  }

  handleImageSettingsAction() {
    this.dispatchEvent('dropdown:action', { action: 'image-settings', data: { timestamp: Date.now() } });
  }

  handleConfettiSettingsAction() {
    this.dispatchEvent('dropdown:action', { action: 'confetti-settings', data: { timestamp: Date.now() } });
  }

  handleAboutAction() {
    this.dispatchEvent('dropdown:action', { action: 'about', data: { timestamp: Date.now() } });
  }

  handleRefreshAction() {
    this.dispatchEvent('dropdown:action', { action: 'refresh', data: { timestamp: Date.now() } });
  }

  handleExportAction() {
    this.dispatchEvent('dropdown:action', { action: 'export', data: { timestamp: Date.now() } });
  }

  handleImportAction() {
    this.dispatchEvent('dropdown:action', { action: 'import', data: { timestamp: Date.now() } });
  }

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------

  handleLogoutAction() {
    this.dispatchEvent('user:logout');
  }

  // ---------------------------------------------------------------------------
  // SETTINGS MODAL
  // ---------------------------------------------------------------------------

  handleSettingsAction() {
    this.dispatchEvent('settings', { action: 'open' });

    const existing = document.getElementById('dropdown-settings-modal');
    if (existing) {
      existing.remove();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'dropdown-settings-modal';
    overlay.className = 'dm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Settings');

    const settings = [
      { key: 'autoClose',          label: 'Auto-close on item click', hint: 'Close the menu after selecting an item', type: 'toggle' },
      { key: 'showBackdrop',       label: 'Show backdrop overlay',    hint: 'Dim the page behind the open menu',     type: 'toggle' },
      { key: 'enableKeyboardNav',  label: 'Keyboard navigation',      hint: 'Arrow keys, Tab, Home/End support',     type: 'toggle' },
      { key: 'enableRippleEffect', label: 'Ripple click effect',      hint: 'Ink ripple on button interactions',     type: 'toggle' },
      {
        key: 'animationDuration', label: 'Animation speed',
        hint: 'Duration of open/close transitions',
        type: 'range', min: 0, max: 600, step: 50
      },
      {
        key: 'position', label: 'Menu position',
        hint: 'Corner where the floating button appears',
        type: 'select',
        options: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center-right', 'center-left']
      },
    ];

    let savedSettings = {};
    try {
      const raw = localStorage.getItem('GraduationAppSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        savedSettings = parsed?.DropdownManager?.Settings || parsed?.Settings || parsed || {};
      }
    } catch (err) {
      this.options.logger.error('Failed to parse GraduationAppSettings from localStorage', err);
    }

    const rows = settings.map(s => {
      const hintHTML = s.hint ? `<span class="dm-setting-row__hint">${s.hint}</span>` : '';
      const value = Object.prototype.hasOwnProperty.call(savedSettings, s.key)
        ? savedSettings[s.key]
        : this.options[s.key];

      if (s.type === 'toggle') {
        const checked = value ? 'checked' : '';
        return `
          <label class="dm-setting-row">
            <span class="dm-setting-row__label">
              <span class="dm-setting-row__name">${s.label}</span>
              ${hintHTML}
            </span>
            <span class="dm-setting-row__control">
              <span class="dm-toggle">
                <input class="dm-toggle__input" type="checkbox" data-key="${s.key}" ${checked}>
                <span class="dm-toggle__track"></span>
              </span>
            </span>
          </label>`;
      }

      if (s.type === 'range') {
        const display = typeof value === 'number' ? value : this.options[s.key];
        return `
          <div class="dm-setting-row dm-setting-row--range">
            <div class="dm-setting-row__top">
              <span class="dm-setting-row__label">
                <span class="dm-setting-row__name">${s.label}</span>
                ${hintHTML}
              </span>
              <span class="dm-range-value" id="dm-val-${s.key}">${display}ms</span>
            </div>
            <input class="dm-range" type="range" data-key="${s.key}"
              min="${s.min}" max="${s.max}" step="${s.step}" value="${display}">
          </div>`;
      }

      if (s.type === 'select') {
        const opts = s.options.map(o =>
          `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`
        ).join('');
        return `
          <label class="dm-setting-row">
            <span class="dm-setting-row__label">
              <span class="dm-setting-row__name">${s.label}</span>
              ${hintHTML}
            </span>
            <span class="dm-setting-row__control">
              <select class="dm-select" data-key="${s.key}">${opts}</select>
            </span>
          </label>`;
      }

      return '';
    }).join('');

    overlay.innerHTML = `
      <div class="dm-modal" role="document">
        <div class="dm-modal__header">
          <h2 class="dm-modal__title">
            <span class="dm-modal__title-icon">⚙️</span>
            Settings
          </h2>
          <button id="dm-settings-close" class="dm-modal__close" aria-label="Close settings">×</button>
        </div>

        <div class="dm-modal__body">
          <div class="dm-settings-list" id="dm-settings-rows">
            ${rows}
          </div>
        </div>

        <div class="dm-modal__footer">
          <button id="dm-settings-reset" class="dm-btn dm-btn--ghost">Reset defaults</button>
          <button id="dm-settings-save" class="dm-btn dm-btn--primary">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#dm-settings-close').addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    overlay.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', () => {
        const label = overlay.querySelector(`#dm-val-${input.dataset.key}`);
        if (label) label.textContent = `${input.value}ms`;
      });
    });

    overlay.querySelector('#dm-settings-save').addEventListener('click', () => {
      const pending = {};

      overlay.querySelectorAll('[data-key]').forEach(el => {
        const key = el.dataset.key;
        if (el.type === 'checkbox')   pending[key] = el.checked;
        else if (el.type === 'range') pending[key] = Number(el.value);
        else                          pending[key] = el.value;
      });

      // Track which options are actually changing so we can handle side-effects
      const autoCloseChanged        = 'autoClose'         in pending && pending.autoClose         !== this.options.autoClose;
      const showBackdropChanged     = 'showBackdrop'      in pending && pending.showBackdrop      !== this.options.showBackdrop;
      const enableKeyboardNavChanged= 'enableKeyboardNav' in pending && pending.enableKeyboardNav !== this.options.enableKeyboardNav;
      const enableRippleChanged     = 'enableRippleEffect' in pending && pending.enableRippleEffect !== this.options.enableRippleEffect;

      Object.assign(this.options, pending);

      if ('position' in pending) this.setPosition();
      if (autoCloseChanged) this.syncAutoCloseListeners();
      if (showBackdropChanged) this.syncBackdrop();
      if (enableKeyboardNavChanged) this.syncKeyboardNavListener();
      if (enableRippleChanged) {
        this.elements.button.classList.toggle('ripple-effect', this.options.enableRippleEffect);
      }

      this.dispatchEvent('settings', { action: 'save', settings: pending });
      close();
    });

    overlay.querySelector('#dm-settings-reset').addEventListener('click', () => {
      this.showToast('Settings reset to defaults. Reload to apply.', 'info');
      this.dispatchEvent('settings', { action: 'reset', settings: {} });
      close();
    });

    this.options.logger.info('Settings modal opened');
  }

  // ---------------------------------------------------------------------------
  // HELP MODAL
  // ---------------------------------------------------------------------------

  handleHelpAction() {
    this.dispatchEvent('help:open');

    const existing = document.getElementById('dropdown-help-modal');
    if (existing) {
      existing.remove();
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'dropdown-help-modal';
    overlay.className = 'dm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Help & Support');

    const faqs = [
      {
        q: '🎨 How do I change the theme?',
        a: 'Click the "Toggle Theme" option in the menu to switch instantly between light and dark mode. Your preference is saved automatically.'
      },
      {
        q: '⚙️ Can I customize the menu?',
        a: 'Yes! Use <code>dropdown.addMenuItem(config)</code> or <code>dropdown.addCustomAction(action, handler)</code> in your JavaScript to add custom actions.'
      },
      {
        q: '🔄 How do I reorder menu items?',
        a: 'Export your current configuration, edit the JSON array order, then import it back via the "Import Data" option.'
      },
      {
        q: '💾 How do I backup my settings?',
        a: 'Use the "Export Data" option in the menu to download a complete JSON backup. Re-import anytime to restore.'
      },
      {
        q: '📱 Is the app mobile friendly?',
        a: 'Absolutely. The interface adapts to any screen size, and touch gestures are fully supported.'
      }
    ].map(({ q, a }) => `
      <details class="dm-faq-item">
        <summary>
          <span class="faq-question">${q}</span>
          <span class="dm-faq-item__chevron">›</span>
        </summary>
        <div class="dm-faq-item__answer">${a}</div>
      </details>`
    ).join('');

    const shortcuts = [
      { keys: ['Esc'], desc: 'Close any open modal / dropdown' },
      { keys: ['↑', '↓'], desc: 'Navigate through menu items' },
      { keys: ['Home', 'End'], desc: 'Jump to first / last menu item' },
      { keys: ['Tab'], desc: 'Cycle through focusable elements' },
      { keys: ['Enter', 'Space'], desc: 'Activate focused item' },
      { keys: ['Ctrl/Cmd + ⇧ + D'], desc: 'Open dropdown menu (keyboard shortcut)' },
      { keys: ['F5'], desc: 'Refresh the app' }
    ].map(({ keys, desc }) => `
      <tr>
        <td>${keys.map(k => `<kbd class="dm-kbd">${k}</kbd>`).join(' ')}</td>
        <td>${desc}</td>
      </tr>`
    ).join('');

    const aboutContent = `
      <div class="dm-about__hero">
        <span class="dm-about__icon">🎓</span>
        <h3 class="dm-about__title">Graduation App v2.0</h3>
        <p class="dm-about__badge">2026 Edition</p>
      </div>
      <p class="dm-about__body">
        A beautifully crafted celebration platform for graduates —
        Combine Mathematics & Computer Science Department.
      </p>
      <div class="dm-about__stats">
        <div class="stat">
          <span class="stat-value">✨ 4+</span>
          <span class="stat-label">Animation Effects</span>
        </div>
        <div class="stat">
          <span class="stat-value">🎨 7+</span>
          <span class="stat-label">Color Palettes</span>
        </div>
        <div class="stat">
          <span class="stat-value">⚡ 60fps</span>
          <span class="stat-label">Smooth Performance</span>
        </div>
      </div>
      <div class="dm-about__tech">
        <span>Powered by</span>
        <span class="tech-badge">Swiper.js</span>
        <span class="tech-badge">Canvas API</span>
        <span class="tech-badge">Web Share API</span>
      </div>
      <div class="dm-about__footer">
        <span>❤️ Made for graduates everywhere</span>
        <span>© ${new Date().getFullYear()} Graduation App</span>
      </div>
    `;

    overlay.innerHTML = `
      <div class="dm-modal dm-modal--help" role="document">
        <div class="dm-modal__header">
          <h2 class="dm-modal__title">
            <span class="dm-modal__title-icon">✨</span>
            Help & Support
          </h2>
          <button id="dm-help-close" class="dm-modal__close" aria-label="Close help">×</button>
        </div>

        <div class="dm-tabs" role="tablist">
          <button class="dm-tab is-active" data-tab="0" role="tab" aria-selected="true" aria-controls="dm-panel-0">FAQ</button>
          <button class="dm-tab" data-tab="1" role="tab" aria-selected="false" aria-controls="dm-panel-1">Shortcuts</button>
          <button class="dm-tab" data-tab="2" role="tab" aria-selected="false" aria-controls="dm-panel-2">About</button>
        </div>

        <div class="dm-modal__body">
          <div class="dm-panel is-active" id="dm-panel-0" role="tabpanel">
            <div class="faq-container">${faqs}</div>
          </div>

          <div class="dm-panel" id="dm-panel-1" role="tabpanel">
            <table class="dm-shortcuts-table">
              <thead>
                <tr><th>Shortcut</th><th>Action</th></tr>
              </thead>
              <tbody>${shortcuts}</tbody>
            </table>
          </div>

          <div class="dm-panel" id="dm-panel-2" role="tabpanel">
            ${aboutContent}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.add('is-closing');
      const modal = overlay.querySelector('.dm-modal');
      if (modal) modal.classList.add('is-closing');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector('#dm-help-close').addEventListener('click', close);
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    overlay.querySelectorAll('.dm-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = Number(tab.dataset.tab);
        overlay.querySelectorAll('.dm-tab').forEach((t, i) => {
          const isActive = i === idx;
          t.classList.toggle('is-active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        overlay.querySelectorAll('.dm-panel').forEach((panel, i) => {
          panel.classList.toggle('is-active', i === idx);
        });
      });
    });

    overlay.querySelector('.dm-tab')?.focus();

    this.options.logger.info('Help modal opened (enhanced)');
  }

  // ---------------------------------------------------------------------------
  // SHARE
  // ---------------------------------------------------------------------------

  handleShareAction() {
    this.dispatchEvent('share:open');

    if (navigator.share) {
      navigator.share({
        title: document.title,
        text: 'Check out this amazing app!',
        url: window.location.href
      }).catch(err => this.options.logger.error(err));
    } else {
      this.copyToClipboard(window.location.href);
      this.showToast('Link copied to clipboard!', 'success');
    }
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => this.options.logger.log('Copied to clipboard:', text))
      .catch(err => this.options.logger.error('Copy failed:', err));
  }

  // ---------------------------------------------------------------------------
  // KEYBOARD / RESIZE HANDLERS
  // ---------------------------------------------------------------------------

  handleClickOutside(e) {
    if (!this.state.isOpen) return;
    if (!this.options.autoClose) return;

    const isInside = this.elements.container.contains(e.target) ||
      this.elements.backdrop?.contains(e.target);

    if (!isInside) this.closeDropdown();
  }

  handleKeyDown(e) {
    if (!this.state.isOpen) return;

    const items = this.getMenuItems();
    const currentIndex = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusNextItem(currentIndex, items);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusPreviousItem(currentIndex, items);
    }
  }

  focusNextItem(currentIndex, items) {
    items[currentIndex < items.length - 1 ? currentIndex + 1 : 0]?.focus();
  }

  focusPreviousItem(currentIndex, items) {
    items[currentIndex > 0 ? currentIndex - 1 : items.length - 1]?.focus();
  }

  handleResize() {
    const wasMobile = this.state.isMobile;
    this.state.isMobile = this.checkIfMobile();
    if (wasMobile !== this.state.isMobile) this.adjustForMobile();
  }

  adjustForMobile() {
    this.elements.dropdown.classList.toggle('dropdown-menu--mobile', this.state.isMobile);
  }

  // ---------------------------------------------------------------------------
  // TOAST SYSTEM
  // ---------------------------------------------------------------------------

  showToast(message, type = 'info', options = {}) {
    if (options.singleInstance) {
      document.querySelectorAll('.dropdown-toast').forEach(t => t.remove());
    }

    const duration = options.duration ?? 5000;

    const toast = document.createElement('div');
    toast.className = `dropdown-toast dropdown-toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');

    toast.style.setProperty('--toast-duration', `${duration}ms`);

    toast.innerHTML = `
      <div class="toast-glass-bg"></div>
      <div class="toast-glass-effect"></div>

      <div class="toast-content">
        <div class="toast-icon">${this.getToastIcon(type)}</div>

        <div class="toast-message">
          <div class="toast-title">${this.getToastTitle(type)}</div>
          <div class="toast-text">${message}</div>
        </div>

        <button class="toast-close" aria-label="Close notification">
          <span>+</span>
        </button>
      </div>

      <div class="toast-progress">
        <div class="toast-progress-bar"></div>
      </div>

      <div class="toast-glow"></div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.pointerEvents = 'auto';
    }, 600);

    const progressBar = toast.querySelector('.toast-progress-bar');

    const closeToast = () => {
      toast.style.animation = 'toastExit 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
      if (progressBar) progressBar.style.animation = 'none';
      setTimeout(() => toast.parentNode?.removeChild(toast), 500);
    };

    toast.querySelector('.toast-close').addEventListener('click', closeToast);
    toast.addEventListener('click', e => {
      if (!e.target.closest('.toast-close')) closeToast();
    });

    let timeoutId = setTimeout(closeToast, duration);

    toast.addEventListener('mouseenter', () => {
      if (progressBar) progressBar.style.animationPlayState = 'paused';
      clearTimeout(timeoutId);
    });

    toast.addEventListener('mouseleave', () => {
      if (progressBar) progressBar.style.animationPlayState = 'running';
      const ratio = progressBar
        ? progressBar.offsetWidth / progressBar.parentElement.offsetWidth
        : 1;
      timeoutId = setTimeout(closeToast, ratio * duration);
    });

    const handleEsc = (e) => {
      if (e.key === 'Escape') closeToast();
    };
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('focus', () => document.addEventListener('keydown', handleEsc));
    closeBtn.addEventListener('blur', () => document.removeEventListener('keydown', handleEsc));

    const instance = {
      close: closeToast,
      update: (newMessage, newType) => {
        if (newMessage) {
          const el = toast.querySelector('.toast-text');
          if (el) el.textContent = newMessage;
        }
        if (newType) {
          ['success', 'error', 'warning', 'info', 'dark', 'light'].forEach(t => {
            toast.classList.toggle(`dropdown-toast-${t}`, t === newType);
          });
          const iconEl = toast.querySelector('.toast-icon');
          const titleEl = toast.querySelector('.toast-title');
          if (iconEl) {
            iconEl.innerHTML = this.getToastIcon(newType);
            iconEl.style.animation = 'iconPop 0.6s cubic-bezier(0.34,1.56,0.64,1)';
          }
          if (titleEl) titleEl.textContent = this.getToastTitle(newType);
        }
      },
    };

    toast._toastInstance = instance;
    return instance;
  }

  showAdvancedToast(message, type = 'info', options = {}) {
    const defaultOptions = {
      duration: 5000,
      position: 'bottom-right',
      icon: null,
      title: null,
      actions: [],
      dismissible: true,
      progress: true,
      sound: false,
      vibration: false,
      queue: true,
      maxToasts: 3,
      ...options
    };

    if (defaultOptions.queue) {
      const existing = document.querySelectorAll('.dropdown-toast');
      if (existing.length >= defaultOptions.maxToasts) {
        existing[0]?._toastInstance?.close();
      }
    }

    const toastInstance = this.showToast(message, type, defaultOptions);
    const toastEl = document.querySelector('.dropdown-toast:last-child');
    if (!toastEl) return toastInstance;

    if (defaultOptions.icon) {
      const iconEl = toastEl.querySelector('.toast-icon');
      if (iconEl) iconEl.innerHTML = defaultOptions.icon;
    }
    if (defaultOptions.title) {
      const titleEl = toastEl.querySelector('.toast-title');
      if (titleEl) titleEl.textContent = defaultOptions.title;
    }

    if (defaultOptions.actions.length > 0) {
      const contentEl = toastEl.querySelector('.toast-content');
      if (contentEl) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'toast-actions';

        defaultOptions.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = 'toast-action-btn';
          btn.textContent = action.label;

          if (action.color) btn.style.background = action.color;

          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            action.action();
            toastInstance.close();
          });

          actionsContainer.appendChild(btn);
        });

        contentEl.appendChild(actionsContainer);
      }
    }

    if (defaultOptions.sound) this.playToastSound(type);

    if (defaultOptions.vibration && 'vibrate' in navigator) {
      const patterns = {
        success: [100, 50, 100],
        error: [200, 100, 200],
        warning: [150, 75, 150],
        info: [100]
      };
      navigator.vibrate(patterns[type] ?? patterns.info);
    }

    toastEl._toastInstance = toastInstance;
    return toastInstance;
  }

  getToastIcon(type) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', dark: '🌙', light: '☀️' };
    return icons[type] ?? 'ℹ️';
  }

  getToastTitle(type) {
    const titles = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Info', dark: 'Dark Mode', light: 'Light Mode' };
    return titles[type] ?? 'Notification';
  }

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
      audio.play().catch(e => this.options.logger.log('Audio playback failed:', e));
    }
  }

  // ---------------------------------------------------------------------------
  // UTILITIES
  // ---------------------------------------------------------------------------

  dispatchEvent(eventName, detail = {}) {
    document.dispatchEvent(new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    }));
  }

  getState() {
    return {
      isOpen: this.state.isOpen,
      isMobile: this.state.isMobile,
      currentTheme: this.state.currentTheme,
      performance: { ...this.performance }
    };
  }

  updateOptions(newOptions) {
    const autoCloseChanged        = 'autoClose'        in newOptions && newOptions.autoClose        !== this.options.autoClose;
    const showBackdropChanged     = 'showBackdrop'     in newOptions && newOptions.showBackdrop     !== this.options.showBackdrop;
    const enableKeyboardNavChanged= 'enableKeyboardNav' in newOptions && newOptions.enableKeyboardNav !== this.options.enableKeyboardNav;

    Object.assign(this.options, newOptions);

    if (newOptions.menuItems || newOptions.position) this.recreateDropdown();
    if (autoCloseChanged)         this.syncAutoCloseListeners();
    if (showBackdropChanged)      this.syncBackdrop();
    if (enableKeyboardNavChanged) this.syncKeyboardNavListener();
  }

  recreateDropdown() {
    if (!this.elements.dropdown) return;
    const wasOpen = this.state.isOpen;
    if (wasOpen) this.closeDropdown();
    this.elements.dropdown.remove();
    this.createDropdown();
    if (wasOpen) setTimeout(() => this.openDropdown(), 10);
  }

  destroy() {
    this.elements.button?.removeEventListener('click', this.toggleDropdown);
    document.removeEventListener('click', this.handleClickOutside);
    document.removeEventListener('touchstart', this.handleClickOutside);
    document.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('theme:changed', this.handleThemeChange);
    document.removeEventListener('graduationapp:themeChanged', this.handleThemeChange);

    if (this.elements.backdrop) {
      this.elements.backdrop.removeEventListener('click', this.handleClickOutside);
    }

    this.elements.container?.remove();
    this.elements.backdrop?.remove();

    this.elements = {};
    this.state = {};

    this.options.logger.info('DropdownManager destroyed');
  }
}
