
import { createAuth0Client } from "@auth0/auth0-spa-js";
import Hammer from "hammerjs";
import logger from "./js/utility/logger.js";
import {confirm} from "./js/utility/Dialog.js";

// -----------------------------------------------------------------------------
// Contextual Loggers
// -----------------------------------------------------------------------------

const authLogger = logger.withContext({ module: "Authentication" });

const loginLogger = logger.withContext({
  module: "LoginModule",
  File: "auth.js",
  location: window.location.href,
  environment: process.env.NODE_ENV || "development",
  userAgent: navigator.userAgent,
});

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Detects the device type based on user agent
 * @returns {string} 'tablet', 'mobile', or 'desktop'
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)
  ) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Creates a delay promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -----------------------------------------------------------------------------
// AuthConfig Class
// -----------------------------------------------------------------------------

/**
 * Manages authentication configuration, fetching from server and caching locally.
 * Includes retry logic with exponential backoff.
 */
export class AuthConfig {
  constructor(options = {}) {
    this.configUrl = options.configUrl || "/auth_config.json";
    this.logger = options.logger || authLogger;
    this._config = null;
    this.maxRetries = options.maxRetries || 2;

    // Default configuration (overridden by server config)
    this.defaults = {
      auth0: {
        domain: null,
        clientId: null,
        cacheLocation: "localstorage",
      },
      password: {
        storageKey: '',
        auth: {},
        minPasswordLength: 8,
        notificationDuration: 3000,
        throttleDelay: 250,
        secureInputTimeout: 5000,
        redirectDelay: 3000,
      },
    };
  }

  /**
   * Fetches and caches configuration from server with retry logic
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<Object>} Full configuration object
   */
  async fetch(retryCount = 0) {
    this.logger.time("Fetch auth config");

    try {
      this.logger.debug(`Fetching auth configuration from ${this.configUrl}`);

      const response = await fetch(this.configUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawConfig = await response.json();
      this._config = this._parseConfig(rawConfig);

      this.logger.info("Auth configuration fetched successfully", {
        hasAuth0Domain: !!this._config.auth0.domain,
        hasAuth0ClientId: !!this._config.auth0.clientId,
        hasPasswordConfig: !!this._config.password.auth?.general,
      });

      this.logger.timeEnd("Fetch auth config");
      return this._config;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        const backoffDelay = 1000 * (retryCount + 1);
        this.logger.warn(
          `Retrying auth config fetch (${retryCount + 1}/${this.maxRetries}) in ${backoffDelay}ms`
        );
        await delay(backoffDelay);
        return this.fetch(retryCount + 1);
      }

      this.logger.error("Failed to fetch auth configuration", error);
      this.logger.timeEnd("Fetch auth config");
      throw new Error(`Auth config unavailable: ${error.message}`);
    }
  }

  /**
   * Parses raw server config into structured format
   * @param {Object} raw - Raw config from server
   * @returns {Object} Parsed configuration
   * @private
   */
  _parseConfig(raw) {
    return {
      auth0: {
        domain: raw.Auth?.domain || this.defaults.auth0.domain,
        clientId: raw.Auth?.clientId || this.defaults.auth0.clientId,
        cacheLocation:
          raw.Auth?.cacheLocation || this.defaults.auth0.cacheLocation,
      },
      password: {
        storageKey:
          raw.PasswordManager?.STORAGE_KEY ||
          this.defaults.password.storageKey,
        auth: raw.PasswordManager || {},
        minPasswordLength:
          raw.PasswordManager?.MIN_PASSWORD_LENGTH ||
          this.defaults.password.minPasswordLength,
        notificationDuration:
          raw.PasswordManager?.NOTIFICATION_DURATION ||
          this.defaults.password.notificationDuration,
        throttleDelay:
          raw.PasswordManager?.THROTTLE_DELAY ||
          this.defaults.password.throttleDelay,
        secureInputTimeout:
          raw.PasswordManager?.SECURE_INPUT_TIMEOUT ||
          this.defaults.password.secureInputTimeout,
        redirectDelay:
          raw.PasswordManager?.REDIRECT_DELAY ||
          this.defaults.password.redirectDelay,
      },
    };
  }

  /**
   * Returns the cached configuration
   * @returns {Object|null}
   */
  get config() {
    return this._config;
  }

  /**
   * Returns Auth0-specific configuration
   * @returns {Object}
   */
  get auth0() {
    return this._config?.auth0 || this.defaults.auth0;
  }

  /**
   * Returns Password-specific configuration
   * @returns {Object}
   */
  get password() {
    return this._config?.password || this.defaults.password;
  }
}

// -----------------------------------------------------------------------------
// NotificationManager Class
// -----------------------------------------------------------------------------

/**
 * Manages UI notifications with icons, auto-dismiss, and gesture support.
 * Generic and reusable — not tied to any specific page.
 */
export class NotificationManager {
  constructor(options = {}) {
    this.logger = options.logger || loginLogger;
    this.notificationSelector = options.notificationSelector || "#notification";
    this.textSelector = options.textSelector || "#notificationText";
    this.cancelSelector = options.cancelSelector || ".fa-times";
    this.defaultDuration = options.defaultDuration || 3000;

    this._timeout = null;
    this._isMouseOnNotification = false;
    this._isVisible = false;
    this._hammer = null;

    // DOM references (cached on init)
    this._notificationEl = null;
    this._textEl = null;
    this._cancelBtn = null;
  }

  /**
   * Initializes the notification manager and binds events
   */
  init() {
    this._cacheDomElements();

    if (!this._notificationEl || !this._textEl) {
      this.logger.warn("Notification elements not found in DOM");
      return;
    }

    this._bindEvents();
    this.logger.debug("NotificationManager initialized");
  }

  /**
   * Caches DOM element references
   * @private
   */
  _cacheDomElements() {
    this._notificationEl = document.querySelector(this.notificationSelector);
    this._textEl = document.querySelector(this.textSelector);
    this._cancelBtn = this._notificationEl?.querySelector(this.cancelSelector);

    if (this._notificationEl) {
      this._hammer = new Hammer(this._notificationEl);
    }
  }

  /**
   * Binds event listeners for notification interactions
   * @private
   */
  _bindEvents() {
    if (this._notificationEl) {
      this._notificationEl.addEventListener("mouseenter", () => {
        this._isMouseOnNotification = true;
      });
      this._notificationEl.addEventListener("mouseleave", () => {
        this._isMouseOnNotification = false;
      });
    }

    if (this._cancelBtn) {
      this._cancelBtn.addEventListener("click", () => this.hide());
    }

    if (this._hammer) {
      this._hammer.on("swipe", () => this.hide());
    }

    window.addEventListener("beforeunload", () => this.hide());
  }

  /**
   * Shows a notification message
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Notification type: 'info', 'success', 'warning', 'error'
   * @param {number} [duration] - Display duration in ms (overrides default)
   */
  async show(message, type = "info", duration) {
    if (this._isVisible) {
      this.hide();
      await delay(200);
    }

    // Re-cache elements in case DOM changed
    if (!this._notificationEl) {
      this._cacheDomElements();
    }

    if (!this._notificationEl || !this._textEl) {
      this.logger.warn("Notification elements not available");
      return;
    }

    if (this._timeout) {
      clearTimeout(this._timeout);
    }

    const icon = this._getIcon(type);
    this._textEl.innerHTML = `${icon} ${message}`;
    this._notificationEl.className = `notification show ${type}`;
    this._isVisible = true;

    const displayDuration = duration || this.defaultDuration;

    this._timeout = setInterval(() => {
      if (!this._isMouseOnNotification) {
        this.hide();
      }
    }, displayDuration);

    this.logger.debug("Notification shown", { type, message });
  }

  /**
   * Hides the current notification
   */
  hide() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }

    if (this._notificationEl) {
      this._notificationEl.classList.remove("show");
    }

    this._isVisible = false;
    this.logger.debug("Notification hidden");
  }

  /**
   * Returns the appropriate icon for the notification type
   * @param {string} type
   * @returns {string} HTML icon string
   * @private
   */
  _getIcon(type) {
    const icons = {
      info: '<i class="fas fa-info-circle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      success: '<i class="fas fa-check-circle"></i>',
    };
    return icons[type] || '<i class="fas fa-bell"></i>';
  }

  /**
   * Returns whether a notification is currently visible
   * @returns {boolean}
   */
  get isVisible() {
    return this._isVisible;
  }
}

// -----------------------------------------------------------------------------
// SessionManager Class
// -----------------------------------------------------------------------------

/**
 * Manages session timeout and user activity tracking.
 * Automatically logs out after a configurable inactivity period.
 */
export class SessionManager {
  constructor(options = {}) {
    this.logger = options.logger || authLogger;
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 minutes
    this.checkInterval = options.checkInterval || 60000; // 1 minute
    this.activityEvents = options.activityEvents || [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    this._activityListeners = [];
    this._sessionCheckInterval = null;
    this._onTimeout = options.onTimeout || null; // Callback when session expires
  }

  /**
   * Initializes session tracking
   */
  init() {
    this.logger.time("SessionManager initialization");

    this._checkSessionTimeout();
    this._setupActivityTracking();

    this.logger.info("SessionManager initialized", {
      sessionTimeout: this.sessionTimeout,
      checkInterval: this.checkInterval,
    });

    this.logger.timeEnd("SessionManager initialization");
  }

  /**
   * Checks if the session has expired and handles timeout
   * @private
   */
  _checkSessionTimeout() {
    const lastActivity = localStorage.getItem("lastActivityTime");

    if (!lastActivity) {
      this.logger.debug("No last activity time found — starting fresh session");
      this._updateLastActivity();
      return;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActivityTime;

    this.logger.debug("Session timeout check", {
      lastActivity: new Date(lastActivityTime).toISOString(),
      timeDiff,
      timeout: this.sessionTimeout,
    });

    if (timeDiff > this.sessionTimeout) {
      this.logger.warn("Session timed out");

      if (this._onTimeout) {
        this._onTimeout();
      }

      this._clearSession();
    }
  }

  /**
   * Updates the last activity timestamp
   * @private
   */
  _updateLastActivity() {
    const timestamp = Date.now().toString();
    localStorage.setItem("lastActivityTime", timestamp);
    this.logger.debug("Updated last activity time", {
      timestamp: new Date(parseInt(timestamp)).toISOString(),
    });
  }

  /**
   * Sets up event listeners for user activity
   * @private
   */
  _setupActivityTracking() {
    this._cleanupActivityTracking();

    this.activityEvents.forEach((event) => {
      const handler = () => this._updateLastActivity();
      document.addEventListener(event, handler, { passive: true });
      this._activityListeners.push({ event, handler });
    });

    this.logger.debug(
      `Registered ${this._activityListeners.length} activity events`
    );

    // Periodic session check
    this._sessionCheckInterval = setInterval(
      () => this._checkSessionTimeout(),
      this.checkInterval
    );

    this.logger.debug("Started periodic session timeout checks");
  }

  /**
   * Clears all session data
   * @private
   */
  _clearSession() {
    localStorage.removeItem("lastActivityTime");
    sessionStorage.removeItem("returnUrl");

    this.logger.debug("Cleared all session data");
  }

  /**
   * Cleans up event listeners and intervals
   * @private
   */
  _cleanupActivityTracking() {
    this._activityListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });
    this._activityListeners = [];

    if (this._sessionCheckInterval) {
      clearInterval(this._sessionCheckInterval);
      this._sessionCheckInterval = null;
    }
  }

  /**
   * Destroys the session manager and cleans up resources
   */
  destroy() {
    this._cleanupActivityTracking();
    this.logger.debug("SessionManager destroyed");
  }
}

// -----------------------------------------------------------------------------
// LoadingManager Class
// -----------------------------------------------------------------------------

/**
 * Manages loading spinner and content visibility during authentication.
 */
export class LoadingManager {
  constructor(options = {}) {
    this.logger = options.logger || authLogger;
    this.spinnerSelector = options.spinnerSelector || "#loadingSpinner";
    this.progressSelector = options.progressSelector || ".loading-progress__bar";
    this.textSelector = options.textSelector || ".loading-text";
    this.dotsSelector = options.dotsSelector || ".loading-dots";
    this.contentSelectors = options.contentSelectors || [
      "button",
      "input",
      "#protectedContent",
      "a",
      "img",
    ];

    this._spinnerEl = null;
    this._progressEl = null;
    this._textEl = null;
    this._progressInterval = null;
  }

  /**
   * Caches DOM element references
   * @private
   */
  _cacheElements() {
    this._spinnerEl = document.querySelector(this.spinnerSelector);
    this._progressEl = document.querySelector(this.progressSelector);
    this._textEl = document.querySelector(this.textSelector);
  }

  /**
   * Shows the loading spinner and hides content
   */
show() {
  this._cacheElements();

  if (!this._spinnerEl) {
    this.logger.debug("Loading spinner element not found — skipping show");
    return;
  }

  this._toggleContent(true);

  this._spinnerEl.classList.add("is-visible");
  this._spinnerEl.setAttribute("aria-hidden", "false");

  this._startProgressAnimation();

  this.logger.debug("Loading spinner shown");
}

  /**
   * Hides the loading spinner and shows content
   * @param {number} [timeout=800] - Delay before hiding in ms
   */
  hide(timeout = 800) {
    this._cacheElements();

    // Complete the progress bar
    if (this._progressEl) {
      this._progressEl.style.width = "100%";
    }

    setTimeout(() => {
      if (this._progressEl) {
        this._progressEl.style.width = "0%";
      }

      if (this._spinnerEl) {
        this._spinnerEl.classList.remove("is-visible");
        this._spinnerEl.setAttribute("aria-hidden", "true");
      }

      this._toggleContent(false);

      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }

      this.logger.debug("Loading spinner hidden");
    }, timeout);
  }

  /**
   * Updates the loading text while preserving animation dots
   * @param {string} text - New loading text
   */
  updateText(text) {
    this._cacheElements();

    if (this._textEl) {
      const dotsEl = this._textEl.querySelector(this.dotsSelector);
      const dotsHtml = dotsEl?.outerHTML || "";
      this._textEl.innerHTML = text + dotsHtml;

      this.logger.debug("Loading text updated", { text });
    }
  }

  /**
   * Starts the progress bar animation
   * @private
   */

  //todo refactor to use requestAnimationFrame and be more dynamic instead of hardcoded increments
  // and intervals ie each time the update text is called the a value will be passed to 
  // the animation function to determine how fast the progress bar should fill up and the
  //  animation function will use requestAnimationFrame to update the progress bar width 
  // based on the passed value and the time elapsed since the last update and if there is no 
  // value passed it will use a default value to fill up the progress bar at a normal pace
  _startProgressAnimation() {
    this._cacheElements();

    if (!this._progressEl) return;

    let progress = 0;
    const maxProgress = 85;

    if (this._progressInterval) {
      clearInterval(this._progressInterval);
    }

    this._progressInterval = setInterval(() => {
      const currentWidth = parseFloat(this._progressEl.style.width) || 0;

      if (currentWidth >= maxProgress) {
        clearInterval(this._progressInterval);
        return;
      }

      progress += 2 + Math.random() * 3;
      this._progressEl.style.width = Math.min(progress, maxProgress) + "%";
    }, 300);
  }

  /**
   * Toggles visibility of content elements during loading
   * @param {boolean} isLoading - Whether loading is in progress
   * @private
   */
  _toggleContent(isLoading) {
    this.contentSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        try {
          if (isLoading) {
            element.classList.add("d-none");
          } else {
            element.classList.remove("d-none");
          }
        } catch (_) {
          // Silent fail for edge cases
        }
      });
    });
  }
}

// -----------------------------------------------------------------------------
// checkPassword Utility (Standalone)
// -----------------------------------------------------------------------------

/**
 * Checks a user-entered password against config and returns rich auth info.
 * Pure function — no side effects.
 *
 * @param {string} inputPassword - The password entered by the user
 * @param {Object} passwordConfig - PasswordManager section from config JSON
 * @returns {Object} Authentication result
 */
export function checkPassword(inputPassword, passwordConfig) {
  if (!inputPassword || typeof inputPassword !== "string") {
    return {
      ok: false,
      reason: "EMPTY_OR_INVALID",
      message: "Password is required",
    };
  }

  const cleanInput = inputPassword.trim();

  // Check GENERAL password
  if (cleanInput === passwordConfig.general?.password) {
    return {
      ok: true,
      type: "general",
      code: "ALL",
      isGraduand: false,
      name: "Everyone",
      accessLevel: 100,
      message: "General access granted 🎉",
    };
  }

  // Check USER-SPECIFIC passwords
  const users = passwordConfig.users || {};
  for (const [code, user] of Object.entries(users)) {
    if (cleanInput === user.password) {
      const isGraduand = user.isGraduand !== "false";
      return {
        ok: true,
        isGraduand,
        code,
        name: user.name,
        accessLevel: code === "L" ? 100 : 50,
        message: `Welcome back, ${user.name} 😈`,
      };
    }
  }

  // Failed authentication
  return {
    ok: false,
    reason: "INVALID_PASSWORD",
    attemptsRemaining: null,
    message: "Wrong password. Try again 👀",
  };
}

// -----------------------------------------------------------------------------
// Auth0Provider Class
// -----------------------------------------------------------------------------

/**
 * Handles Auth0 authentication flow.
 * Manages the Auth0 SPA client, login, logout, and authentication checks.
 * UI-agnostic — does not touch DOM elements directly.
 */
export class Auth0Provider {
  constructor(options = {}) {
    this.logger = options.logger || authLogger;
    this.notificationManager = options.notificationManager || null;
    this.redirectDelay = options.redirectDelay || 3000;

    this.auth0Client = null;
    this.isAuthenticated = false;
    this.userProfile = null;

    // Auth0 configuration (set during init)
    this.domain = null;
    this.clientId = null;
    this.cacheLocation = "localstorage";
    this.redirectUrl = window.location.origin;
  }

  /**
   * Initializes the Auth0 client and checks authentication state
   * @param {Object} auth0Config - { domain, clientId, cacheLocation }
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<boolean>} Initialization success
   */
  async init(auth0Config, retryCount = 0) {
    this.logger.time("Auth0 initialization");

    this.domain = auth0Config.domain;
    this.clientId = auth0Config.clientId;
    this.cacheLocation = auth0Config.cacheLocation || "localstorage";
    this.redirectUrl = this._getSavedLocation();

    try {
      this.logger.debug("Creating Auth0 client");
      this.auth0Client = await createAuth0Client({
        domain: this.domain,
        client_id: this.clientId,
        cacheLocation: this.cacheLocation,
        useRefreshTokens: true,
      });

      this.isAuthenticated = await this.auth0Client.isAuthenticated();

      this.logger.debug("Auth0 authentication check", {
        isAuthenticated: this.isAuthenticated,
      });

      if (this.isAuthenticated) {
        this.userProfile = await this.auth0Client.getUser();
        this._handleAuthenticated();
      }

      this.logger.info("Auth0 initialized successfully");
      this.logger.timeEnd("Auth0 initialization");
      return true;
    } catch (error) {
      this.logger.error("Auth0 initialization failed", error);

      if (error.message?.includes("Failed to fetch") && retryCount < 2) {
        const backoffDelay = 1000 * (retryCount + 1);
        this.logger.warn(
          `Retrying Auth0 init (${retryCount + 1}/2) in ${backoffDelay}ms`
        );
        await delay(backoffDelay);
        return this.init(auth0Config, retryCount + 1);
      }

      if (error.message?.includes("Failed to fetch")) {
        this._notify("Check your internet connection", "warning");
      } else {
        this._notify("Failed to initialize authentication system", "error");
      }

      this.logger.timeEnd("Auth0 initialization");
      return false;
    }
  }

  /**
   * Initiates Auth0 login redirect
   */
  async login() {
    this.logger.time("Auth0 login");

    try {
      this.logger.info("Initiating Auth0 login redirect");
      await this.auth0Client.loginWithRedirect({
        redirect_uri: this.redirectUrl,
      });
    } catch (error) {
      this.logger.error("Auth0 login failed", error);
      this._notify("Authentication failed. Please try again.", "error");
    }

    this.logger.timeEnd("Auth0 login");
  }

  /**
   * Initiates Auth0 logout
   */
  async logout() {
    this.logger.time("Auth0 logout");

    try {
      this.logger.info("Initiating Auth0 logout");
      this.auth0Client.logout({
        returnTo: window.location.origin + "/logOut",
      });
    } catch (error) {
      this.logger.error("Auth0 logout failed", error);
      this._notify("Logout failed. Please try again.", "error");
    }

    this.logger.timeEnd("Auth0 logout");
  }

  /**
   * Checks authentication state (handles redirect callback)
   * @returns {Promise<boolean>} Whether user is authenticated
   */
  async checkAuth() {
    this.logger.time("Auth check");

    try {
      const query = window.location.search;

      if (query.includes("code=") && query.includes("state=")) {
        this.logger.debug("Handling Auth0 redirect callback");
        await this.auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
      }

      this.isAuthenticated = await this.auth0Client.isAuthenticated();

      if (this.isAuthenticated) {
        this.userProfile = await this.auth0Client.getUser();
        this._handleAuthenticated();
      }

      this.logger.timeEnd("Auth check");
      return this.isAuthenticated;
    } catch (error) {
      this.logger.error("Auth0 check failed", error);
      this._notify("Authentication check failed.", "error");
      this.logger.timeEnd("Auth check");
      return false;
    }
  }

  /**
   * Handles post-authentication actions
   * @private
   */
  _handleAuthenticated() {
    const userName = this.userProfile?.name || this.userProfile?.email;
    this.logger.info("User authenticated successfully", {
      userName,
      redirectUrl: this.redirectUrl,
    });

    this._notify("Welcome back! Redirecting...", "success");
    this._scheduleRedirect();
  }

  /**
   * Schedules a redirect after authentication
   * @private
   */
  _scheduleRedirect() {
    setTimeout(() => {
      this.logger.info("Executing redirect to:", this.redirectUrl);
      window.location.href = this.redirectUrl;
    }, this.redirectDelay);
  }

  /**
   * Retrieves a saved return URL from session storage
   * @returns {string}
   * @private
   */
  _getSavedLocation() {
    const savedUrl =
      sessionStorage.getItem("returnUrl") || window.location.origin;
    return savedUrl.startsWith(window.location.origin)
      ? savedUrl
      : window.location.origin;
  }

  /**
   * Shows a notification through the notification manager
   * @param {string} message
   * @param {string} [type='info']
   * @private
   */
  _notify(message, type = "info") {
    if (this.notificationManager) {
      this.notificationManager.show(message, type);
    } else {
      this.logger.debug("Notification (no manager)", { message, type });
    }
  }

  /**
   * Returns the current user profile
   * @returns {Object|null}
   */
  getUser() {
    return this.userProfile;
  }
}

// -----------------------------------------------------------------------------
// PasswordProvider Class
// -----------------------------------------------------------------------------

/**
 * Handles password-based authentication logic.
 * Pure logic — no DOM manipulation. UI handling lives in login.js.
 */
export class PasswordProvider {
  constructor(options = {}) {
    this.logger = options.logger || authLogger;
    this.notificationManager = options.notificationManager || null;
    this.storageKey = options.storageKey || null;
    this.passwordAuth = options.passwordAuth || {};
    this.redirectDelay = options.redirectDelay || 3000;
    this.redirectUrl = options.redirectUrl || window.location.origin;

    this.hasExistingPassword = false;
  }

  /**
   * Checks if a valid password already exists in localStorage
   * @returns {boolean} Whether a valid password exists
   */
  checkExistingPassword() {
    this.logger.time("Existing password check");

    try {
      if (!this.storageKey) {
        this.logger.warn("No storage key configured");
        this.logger.timeEnd("Existing password check");
        return false;
      }

      const storedAuth = localStorage.getItem(this.storageKey);
      const auth = JSON.parse(storedAuth);
      this.hasExistingPassword = auth?.ok === true;

      this.logger.debug("Password storage check", {
        hasExistingPassword: this.hasExistingPassword,
      });

      this.logger.timeEnd("Existing password check");
      return this.hasExistingPassword;
    } catch (error) {
      this.logger.error("Failed to check existing password", error);
      this.logger.timeEnd("Existing password check");
      return false;
    }
  }

  /**
   * Returns the stored user name if available
   * @returns {string|null}
   */
  getStoredUserName() {
    try {
      const storedAuth = localStorage.getItem(this.storageKey);
      const auth = JSON.parse(storedAuth);
      return auth?.message || null;
    } catch {
      return null;
    }
  }

  /**
   * Verifies password against config and saves if correct
   * @param {string} password - The password to verify
   * @returns {Object} Verification result with ok, message, and metadata
   */
  verifyAndSavePassword(password) {
    this.logger.time("Password verification");

    const passwordMetadata = checkPassword(password, this.passwordAuth);

    if (passwordMetadata.ok) {
      this.logger.info("Password verification successful");
      this._saveAuth(passwordMetadata);
      this.logger.timeEnd("Password verification");

      return {
        success: true,
        message: passwordMetadata.message || "Password verified.",
        metadata: passwordMetadata,
      };
    } else {
      this.logger.warn("Password verification failed");
      this.logger.timeEnd("Password verification");

      return {
        success: false,
        message: "Incorrect password. Please try again.",
        metadata: passwordMetadata,
      };
    }
  }

  /**
   * Attempts to authenticate using URL search parameters.
   * Checks for 'code' or 'name' params and matches against config.
   *
   * Supported URL formats:
   *   ?code=ALL           — General access
   *   ?code=ABC123        — User-specific code
   *   ?name=John%20Doe    — User name match
   *
   * @returns {Object|null} Auth result if URL params match, null otherwise
   */
  authenticateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("code");
    const urlName = params.get("name");

    if (!urlCode && !urlName) {
      this.logger.debug("No auth-related URL params found");
      return null;
    }

    this.logger.info("Attempting URL-based authentication", {
      hasCode: !!urlCode,
      hasName: !!urlName,
    });

    const authConfig = this.passwordAuth;

    // 1. Try URL code match
    if (urlCode) {
      const cleanCode = urlCode.trim();

      // Check GENERAL password
      if (cleanCode === authConfig.general?.code) {
        const result = {
          ok: true,
          type: "general",
          code: "ALL",
          isGraduand: false,
          name: "Everyone",
          accessLevel: 100,
          message: "General access granted via URL 🎉",
          source: "url",
        };
        this._saveAuth(result);
        this.logger.info("URL code matched general password");
        return result;
      }

      // Check USER-SPECIFIC codes
      const users = authConfig.users || {};
      for (const [userCode, user] of Object.entries(users)) {
        if (cleanCode === user.code.toLowerCase()) {
          const isGraduand = user.isGraduand !== "false";
          const result = {
            ok: true,
            isGraduand,
            code: userCode,
            name: user.name,
            accessLevel: userCode === "L" ? 100 : 50,
            message: `Welcome back, ${user.name} 😈`,
            source: "url",
          };
          this._saveAuth(result);
          this.logger.info("URL code matched user", { userCode, name: user.name });
          return result;
        }
      }
    }

    // 2. Try URL name match
    if (urlName) {
      const cleanName = urlName.trim().toLowerCase();

      // Check GENERAL name
      if (cleanName === authConfig.general?.name?.toLowerCase()) {
        const result = {
          ok: true,
          type: "general",
          code: "ALL",
          isGraduand: false,
          name: authConfig.general.name,
          accessLevel: 100,
          message: `Welcome, ${authConfig.general.name}! 🎉`,
          source: "url",
        };
        this._saveAuth(result);
        this.logger.info("URL name matched general user");
        return result;
      }

      // Check USER names
      const users = authConfig.users || {};
      for (const [userCode, user] of Object.entries(users)) {
        if (cleanName === user.name?.toLowerCase()) {
          const isGraduand = user.isGraduand !== "false";
          const result = {
            ok: true,
            isGraduand,
            code: userCode,
            name: user.name,
            accessLevel: userCode === "L" ? 100 : 50,
            message: `Welcome back, ${user.name} 😈`,
            source: "url",
          };
          this._saveAuth(result);
          this.logger.info("URL name matched user", { userCode, name: user.name });
          return result;
        }
      }
    }

    this.logger.warn("URL params did not match any user", {
      urlCode,
      urlName,
    });

    return null;
  }

  /**
   * Saves authentication data to localStorage
   * @param {Object} passwordData - Authentication data to save
   * @private
   */
  _saveAuth(passwordData) {
    this.logger.time("Password save");

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(passwordData));
      this.hasExistingPassword = true;
      this.logger.info("Password saved to local storage successfully");
    } catch (error) {
      this.logger.error("Failed to save password to local storage", error);
      this._notify("Storage error: Could not save password", "error");
    }

    this.logger.timeEnd("Password save");
  }

  /**
   * Schedules a redirect after successful authentication
   */
  scheduleRedirect() {
    this.logger.info("Scheduling redirect", {
      delay: this.redirectDelay,
      url: this.redirectUrl,
    });

    setTimeout(() => {
      this.logger.info("Executing scheduled redirect");
      window.location.href = this.redirectUrl;
    }, this.redirectDelay);
  }

  /**
   * Clears stored password data
   */
  clearAuth() {
    try {
      localStorage.removeItem(this.storageKey);
      this.hasExistingPassword = false;
      this.logger.debug("Cleared stored password data");
    } catch (error) {
      this.logger.error("Failed to clear password data", error);
    }
  }

  /**
   * Shows a notification through the notification manager
   * @param {string} message
   * @param {string} [type='info']
   * @private
   */
  _notify(message, type = "info") {
    if (this.notificationManager) {
      this.notificationManager.show(message, type);
    } else {
      this.logger.debug("Notification (no manager)", { message, type });
    }
  }
}

// -----------------------------------------------------------------------------
// PWAManager Class
// -----------------------------------------------------------------------------

/**
 * Manages Progressive Web App service worker registration and updates.
 */
export class PWAManager {
  constructor(options = {}) {
    this.swPath = options.swPath || "/sw.js";
    this.scope = options.scope || "/";
    this.updateMessage =
      options.updateMessage ||
      "A new version is available! Reload to update?";
    this.logger = options.logger || authLogger;
  }

  /**
   * Initializes PWA by registering the service worker
   * @returns {Promise<ServiceWorkerRegistration | void>}
   */
  async init() {
    this.logger.time("PWA initialization");

    if (!("serviceWorker" in navigator)) {
      this.logger.warn("Service Workers are not supported in this browser");
      this.logger.timeEnd("PWA initialization");
      return;
    }

    return new Promise((resolve) => {
      window.addEventListener("load", async () => {
        try {
          const registration = await this._registerServiceWorker();
          this.logger.timeEnd("PWA initialization");
          resolve(registration);
        } catch (error) {
          this.logger.error("PWA initialization failed", error);
          this.logger.timeEnd("PWA initialization");
          resolve();
        }
      });
    });
  }

  /**
   * Registers the service worker and sets up update handling
   * @returns {Promise<ServiceWorkerRegistration>}
   * @private
   */
  async _registerServiceWorker() {
    this.logger.debug("Registering service worker");

    const registration = await navigator.serviceWorker.register(this.swPath, {
      scope: this.scope,
    });

    this.logger.info("Service Worker registered successfully", {
      scope: registration.scope,
      active: !!registration.active,
    });

    this._handleUpdates(registration);

    if (registration.installing) {
      this.logger.debug("Service Worker installing");
    } else if (registration.waiting) {
      this.logger.debug("Service Worker waiting");
    } else if (registration.active) {
      this.logger.info("Service Worker active and ready");
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      this.logger.info("Service Worker controller changed, reloading page");
      window.location.reload();
    });

    return registration;
  }

  /**
   * Sets up update handling for the service worker
   * @param {ServiceWorkerRegistration} registration
   * @private
   */
  _handleUpdates(registration) {
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      this.logger.info("New Service Worker found", {
        state: newWorker.state,
        scriptURL: newWorker.scriptURL,
      });

      newWorker.addEventListener("statechange", () => {
        this.logger.debug("Service Worker state change", {
          state: newWorker.state,
        });

        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          this.logger.info("New version available, showing update notification");
          this._showUpdateNotification(registration);
        }

        if (newWorker.state === "activated") {
          this.logger.info("New Service Worker activated");
        }
      });
    });
  }

  /**
   * Shows update notification to the user
   * @param {ServiceWorkerRegistration} registration
   * @private
   */
  async _showUpdateNotification(registration) {
    this.logger.debug("Showing update notification to user");

    const shouldUpdate = await confirm({
      title:'Update App',
      message:this.updateMessage,
      detail:'This app has just been updated some bugs and UI components have been fix',
      type:'info',
      confirmText:'Update App',
      cancelText:'Cancel',

    });

    if (shouldUpdate) {
      this.logger.info("User accepted update, activating new Service Worker");
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
      window.location.reload();
    } else {
      this.logger.debug("User declined update");
    }
  }
}

// -----------------------------------------------------------------------------
// LoginController Class
// -----------------------------------------------------------------------------

/**
 * Orchestrates the entire authentication flow.
 * Coordinates AuthConfig, SessionManager, LoadingManager, NotificationManager,
 * Auth0Provider, and PasswordProvider.
 *
 * UI-agnostic — login page DOM handling is delegated to login.js.
 */
export class LoginController {
  constructor(options = {}) {
    this.logger = options.logger || authLogger;
    this.isLoginPage = options.isLoginPage || false;


    // Sub-managers (initialized in init)
    this.authConfig = null;
    this.sessionManager = null;
    this.loadingManager = null;
    this.notificationManager = null;
    this.auth0Provider = null;
    this.passwordProvider = null;
  }

  /**
   * Initializes all authentication subsystems
   * @returns {Promise<void>}
   */
  async init() {
    this.logger.time("Authentication initialization");

    try {
      this.logger.info("Starting authentication system initialization", {
        isLoginPage: this.isLoginPage,
      });

      // 1. Initialize Loading Manager (only if spinner exists in DOM)
      this.loadingManager = new LoadingManager({
        logger: this.logger.withContext({ module: "LoadingManager" }),
      });
      
      // Only show loading spinner on non-login pages
      if (!this.isLoginPage) {
        this.loadingManager.show();
        this.loadingManager.updateText("Initializing security protocols");
      }

      // 2. Initialize Notification Manager
      this.notificationManager = new NotificationManager({
        logger: this.logger.withContext({ module: "NotificationManager" }),
      });
      this.notificationManager.init();

      // 3. Fetch configuration
      if (!this.isLoginPage) {
        this.loadingManager.updateText("Fetching configuration");
      }
      this.authConfig = new AuthConfig({
        logger: this.logger.withContext({ module: "AuthConfig" }),
      });
      await this.authConfig.fetch();

      // 4. Initialize Session Manager
      if (!this.isLoginPage) {
        this.loadingManager.updateText("Setting up session");
      }
      this.sessionManager = new SessionManager({
        logger: this.logger.withContext({ module: "SessionManager" }),
        onTimeout: () => this._handleSessionTimeout(),
      });
      this.sessionManager.init();

      // 5. Initialize Auth0 Provider (with retry)
      if (!this.isLoginPage) {
        this.loadingManager.updateText("Connecting to Auth0");
      }
      this.auth0Provider = new Auth0Provider({
        logger: this.logger.withContext({ module: "Auth0Provider" }),
        notificationManager: this.notificationManager,
        redirectDelay: this.authConfig.password.redirectDelay,
      });

      const auth0Initialized = await this.auth0Provider.init(
        this.authConfig.auth0
      );

      if (auth0Initialized) {
        await this.auth0Provider.checkAuth();
      } else {
        this.logger.warn("Auth0 initialization failed, using password fallback only");
      }

      // 6. Initialize Password Provider
      if (!this.isLoginPage) {
        this.loadingManager.updateText("Preparing fallback authentication");
      }
      this.passwordProvider = new PasswordProvider({
        logger: this.logger.withContext({ module: "PasswordProvider" }),
        notificationManager: this.notificationManager,
        storageKey: this.authConfig.password.storageKey,
        passwordAuth: this.authConfig.password.auth,
        redirectDelay: this.authConfig.password.redirectDelay,
        redirectUrl: window.location.origin,
      });

      this.passwordProvider.checkExistingPassword();

       this._urlAuthResult = this.passwordProvider.authenticateFromUrl();
      if (this._urlAuthResult?.ok) {
        this.logger.info("✅ Authenticated via URL parameters", {
          name: this._urlAuthResult.name,
          code: this._urlAuthResult.code,
        });
        this.passwordProvider.hasExistingPassword = true;

        // Clean URL (remove params) without reload
        if (window.history?.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          this.logger.debug("Cleaned URL params after auth");
        }
      }
      // 7. Bind global functions
      this._bindGlobalFunctions();

      // 8. Hide loading (only if it was shown)
      if (!this.isLoginPage) {
        this.loadingManager.hide();
      }

      this.logger.info("Authentication initialization completed successfully");
      this.logger.timeEnd("Authentication initialization");
    } catch (error) {
      this.logger.error("Authentication initialization failed", error);
      this._showFallbackError();
      this.logger.timeEnd("Authentication initialization");
    }
  }
  /**
   * Returns the result of URL-based authentication if any
   * @returns {Object|null}
   */
  get urlAuthResult() {
    return this._urlAuthResult || null;
  }


  /**
   * Binds global functions for HTML onclick attributes
   * @private
   */
  _bindGlobalFunctions() {
    window.loginWithAuth0 = () => {
      this.logger.info("Global login function called");
      this.auth0Provider?.login();
    };

    window.logoutWithAuth0 = () => {
      this.logger.info("Global logout function called");
      this.auth0Provider?.logout();
    };

    this.logger.debug("Global authentication functions assigned");
  }

  /**
   * Handles session timeout
   * @private
   */
  _handleSessionTimeout() {
    this.logger.warn("Session timeout — redirecting to login");
    this.passwordProvider?.clearAuth();
    this._prepareLoginRedirect();
  }

  /**
   * Prepares and executes login redirect
   * @private
   */
  _prepareLoginRedirect() {
    const returnUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem("returnUrl", returnUrl);
    this.logger.debug("Saved return URL for redirect", { returnUrl });

    window.location.href = "/login";
  }

  /**
   * Shows a fallback error message when initialization fails
   * @private
   */
  _showFallbackError() {
    const fallbackMessage = document.createElement("div");
    fallbackMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ef476f;
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 10000;
      font-family: sans-serif;
    `;
    fallbackMessage.textContent =
      "Application failed to load. Please refresh the page.";
    document.body.appendChild(fallbackMessage);
  }

  /**
   * Returns the Auth0 provider instance
   * @returns {Auth0Provider}
   */
  get auth0() {
    return this.auth0Provider;
  }

  /**
   * Returns the Password provider instance
   * @returns {PasswordProvider}
   */
  get password() {
    return this.passwordProvider;
  }

  /**
   * Returns the Notification manager instance
   * @returns {NotificationManager}
   */
  get notifications() {
    return this.notificationManager;
  }

  /**
   * Returns the Auth config instance
   * @returns {AuthConfig}
   */
  get config() {
    return this.authConfig;
  }

  /**
   * Destroys all sub-managers and cleans up
   */
  destroy() {
    this.sessionManager?.destroy();
    this.logger.debug("LoginController destroyed");
  }
}