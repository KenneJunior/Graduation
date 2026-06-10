import logger from './js/utility/logger.js';
import { ThemeManager } from './js/utility/Mode.js';
import { PWAManager, LoadingManager, LoginController } from './auth.js';
import { LoginUIManager } from './js/login.js';
import { InteractiveBackground } from './js/logout.js';
import GraduationApp from './js/index.js';
import GraduationAppMemories from './js/HBD.js';

// -----------------------------------------------------------------------------
// Constants & Configuration
// -----------------------------------------------------------------------------

const APP_CONFIG = {
  theme: {
    storageKey: 'myapp-theme',
    systemPreference: true,
  },
  pwa: {
    swPath: '/sw.js',
    scope: '/',
    updateMessage: 'A new version of GRADUATION is available! Reload to update?',
  },
  selectors: {
    pageRoot: '#myPage',
  },
  online: {
    checkUrl: 'https://mock.httpstatus.io/202',
    checkInterval: 30000, // 30 seconds
    checkTimeout: 5000,   // 5 seconds
  },
  loading: {
    defaultText: 'Loading...',
    attribute: 'data-loading-text',
  },
  auth: {
    whitelist: ['login', 'logOut'],
    clearDataPages: ['logOut'],
  },
};

// -----------------------------------------------------------------------------
// Flag for login.js — prevents double initialization
// -----------------------------------------------------------------------------

window.__LOGIN_CONTROLLER_MANAGED__ = true;

// -----------------------------------------------------------------------------
// PWA Service Worker Manager
// -----------------------------------------------------------------------------

/**
 * Initializes PWA using the PWAManager class from auth.js
 * @returns {Promise<void>}
 */
async function initializePWA() {
  const pwaManager = new PWAManager({
    swPath: APP_CONFIG.pwa.swPath,
    scope: APP_CONFIG.pwa.scope,
    updateMessage: APP_CONFIG.pwa.updateMessage,
    logger: logger.withContext({ module: 'PWA' }),
  });

  // PWAManager.init() internally waits for window.load
  await pwaManager.init();
}

// -----------------------------------------------------------------------------
// Theme Initialization
// -----------------------------------------------------------------------------

/**
 * Initializes the application theme manager
 * @returns {ThemeManager}
 */
function initializeTheme() {
  const themeManager = new ThemeManager({
    storageKey: APP_CONFIG.theme.storageKey,
    systemPreference: APP_CONFIG.theme.systemPreference,
  });
  themeManager.init();
  logger.info('🎨 Theme manager initialized');
  return themeManager;
}

// -----------------------------------------------------------------------------
// Loading Text Helpers
// -----------------------------------------------------------------------------

/**
 * Gets the custom loading text from the page's HTML attribute
 * Falls back to the default text if no attribute is set.
 *
 * @returns {string} The loading text to display
 */
function getPageLoadingText() {
  const pageElement = document.querySelector(APP_CONFIG.selectors.pageRoot);
  const customText = pageElement?.getAttribute(APP_CONFIG.loading.attribute);

  if (customText) {
    logger.debug('Custom loading text found', { text: customText });
    return customText;
  }

  return APP_CONFIG.loading.defaultText;
}

/**
 * Safely updates the loading text via the LoginController's LoadingManager
 * @param {LoginController} loginController - The auth controller instance
 * @param {string} text - The text to display
 */
function updateLoadingText(loginController, text) {
  if (loginController?.loadingManager) {
    loginController.loadingManager.updateText(text);
  } else {
    logger.debug('LoadingManager not available — skipping text update', { text });
  }
}

// -----------------------------------------------------------------------------
// Auth Page Helpers
// -----------------------------------------------------------------------------

/**
 * Checks if a page is in the whitelist (doesn't require authentication)
 * @param {string} page - The page identifier
 * @returns {boolean}
 */
function isWhitelistedPage(page) {
  return APP_CONFIG.auth.whitelist.includes(page);
}

/**
 * Checks if a page should clear all stored data on entry
 * @param {string} page - The page identifier
 * @returns {boolean}
 */
function isClearDataPage(page) {
  return APP_CONFIG.auth.clearDataPages.includes(page);
}

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

/**
 * @returns {Promise<Object>} { loginController, isAuthenticated, ... }
 */
async function authenticateUser() {
  const pageElement = document.querySelector(APP_CONFIG.selectors.pageRoot);
  const currentPage = pageElement?.getAttribute('page');
  const isLoginPage = currentPage === 'login';
  const isPublic = isWhitelistedPage(currentPage);
  const shouldClearData = isClearDataPage(currentPage);

  logger.info('🔐 Starting authentication flow', {
    page: currentPage,
    isPublic,
    shouldClearData,
  });

  // --- Handle Clear-Data Pages (logOut) ---
  if (shouldClearData) {
    logger.info('🧹 Clear-data page — wiping all stored data');
    
      const keysToRemove = [
        'GraduationAppPassword',
        'pwa-prompt-dismissal',
        'pwa-prompt-display-history',
        'Welcome_Notification',
        'last_visited',
        'GraduationAppSettings',
        'lastActivityTime',
        'graduationImageIndex',
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();

    // Also clear cookies if needed
    document.cookie.split(';').forEach((cookie) => {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });

    logger.info('✅ All data cleared');
    return {
      loginController: null,
      isAuthenticated: false,
      isPublic: true,
      isClearData: true,
    };
  }

  // --- Handle Public/Whitelisted Pages (login, etc.) ---
  if (isPublic) {
    logger.info(`🔓 Public page "${currentPage}" — bypassing authentication`);

    if (isLoginPage) {
      // Login page still needs LoginController for the auth UI
      return await _handleLoginPage();
    }

    // Other public pages — no auth needed
    return {
      loginController: null,
      isAuthenticated: false,
      isPublic: true,
    };
  }

  // --- Handle Protected Pages (index, Memories, etc.) ---
  return await _handleProtectedPage(currentPage);
}

/**
 * Handles authentication for the login page
 * @returns {Promise<Object>}
 * @private
 */
async function _handleLoginPage() {
  const customLoadingText = getPageLoadingText();

  const loginController = new LoginController({
    logger: logger.withContext({ module: 'LoginController' }),
    isLoginPage: true,
  });

  updateLoadingText(loginController, customLoadingText);
  await loginController.init();

  if (loginController.urlAuthResult?.ok) {
    logger.info('✅ URL authentication successful on login page');
    const returnUrl = sessionStorage.getItem('returnUrl') || '/';
    window.location.href = returnUrl;
    return new Promise(() => {});
  }

  const isAuth0Authenticated = loginController.auth0?.isAuthenticated || false;
  const isPasswordAuthenticated = loginController.password?.hasExistingPassword || false;
  const isAuthenticated = isAuth0Authenticated || isPasswordAuthenticated;

  logger.info('Authentication status', {
    auth0: isAuth0Authenticated,
    password: isPasswordAuthenticated,
  });

  // If already authenticated, redirect to return URL or home
  if (isAuthenticated) {
    const returnUrl = sessionStorage.getItem('returnUrl') || '/';
    logger.info('✅ Already authenticated on login page, redirecting to:', returnUrl);
    window.location.href = returnUrl;
    return new Promise(() => {});
  }

  // Show login UI
  logger.info('🔐 On login page — initializing login UI');
  updateLoadingText(loginController, 'Preparing login form... 🔑');

  const loginUIManager = new LoginUIManager({
    loginController: loginController,
    logger: logger.withContext({ module: 'LoginUIManager' }),
  });

  window.__loginUIManager = loginUIManager;
  await loginUIManager.init(loginController);

  return { loginController, isAuthenticated: false, isPublic: true, isLoginPage: true };
}

/**
 * Handles authentication for protected pages
 * @param {string} currentPage - The page identifier
 * @returns {Promise<Object>}
 * @private
 */
async function _handleProtectedPage(currentPage) {
  const customLoadingText = getPageLoadingText();

  const loginController = new LoginController({
    logger: logger.withContext({ module: 'LoginController' }),
    isLoginPage: false,
  });

  updateLoadingText(loginController, customLoadingText);
  await loginController.init();

  const isAuth0Authenticated = loginController.auth0?.isAuthenticated || false;
  const isPasswordAuthenticated = loginController.password?.hasExistingPassword || false;
  const isAuthenticated = isAuth0Authenticated || isPasswordAuthenticated;

  const authSource = isAuth0Authenticated
      ? 'Auth0'
      : loginController.password?.getStoredUserName()
          ? 'Password/URL'
          : 'None';

  logger.info('Authentication status', {
    auth0: isAuth0Authenticated,
    password: isPasswordAuthenticated,
    source: authSource,
    page: currentPage,
  });

  if (!isAuthenticated) {
    const returnUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem('returnUrl', returnUrl);
    logger.warn('🔒 Not authenticated — redirecting to login', { returnUrl });
    window.location.href = '/login';
    return new Promise(() => {});
  }

  updateLoadingText(loginController, 'Loading your content... ✨');
  logger.info('✅ User authenticated, proceeding to page bootstrap');

  return { loginController, isAuthenticated: true, isPublic: false };
}

// -----------------------------------------------------------------------------
// Online Status & Content Visibility
// -----------------------------------------------------------------------------

/**
 * Checks if the browser has internet connectivity
 * Uses a timeout to avoid long waits on slow networks
 * @returns {Promise<boolean>}
 */
async function checkOnlineStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.online.checkTimeout);
    const response = await fetch(APP_CONFIG.online.checkUrl, {
      signal: controller.signal,
      cache: 'no-cache',
    });
    clearTimeout(timeoutId);
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

/**
 * Manages visibility of online-dependent content.
 * Periodically checks connectivity and toggles elements like YouTube embeds
 * and the PWA install prompt. These elements require internet to function.
 *
 * @param {number} [interval] - Check interval in ms (defaults to config)
 * @returns {Function} Cleanup function to stop the interval
 */
function manageOnlineContent(interval) {
  const checkInterval = interval || APP_CONFIG.online.checkInterval;

  const musicEl = document.getElementById('music');
  const pwaEl = document.querySelector('#pwa-prompt');

  if (!musicEl && !pwaEl) {
    logger.debug('No online-dependent content found on this page');
    return () => {};
  }

  const check = async () => {
    const isOnline = await checkOnlineStatus();

    if (isOnline) {
      if (musicEl) musicEl.classList.remove('d-none');
      if (pwaEl) pwaEl.classList.remove('d-none');
      logger.debug('✅ Online — music and PWA prompt visible');
    } else {
      if (musicEl) musicEl.classList.add('d-none');
      if (pwaEl) pwaEl.classList.add('d-none');
      logger.debug('🔴 Offline — music and PWA prompt hidden');
    }
  };

  // Run immediately on page load
  check();

  // Then periodically check
  const intervalId = setInterval(check, checkInterval);
  logger.debug(`Online content management started (interval: ${checkInterval}ms)`);

  return () => {
    clearInterval(intervalId);
    logger.debug('Online content management stopped');
  };
}

// -----------------------------------------------------------------------------
// Page-Specific Application Bootstrap
// -----------------------------------------------------------------------------

/**
 * Determines which page module to load based on the `page` attribute
 * on the #myPage element.
 *
 * Passes the LoadingManager to each page app (Approach C) so they can
 * update the loading text during their own initialization phases.
 *
 * Supported pages:
 *   - 'login'    : Authentication page (LoginUIManager)
 *   - 'logOut'   : Logout confirmation page (InteractiveBackground)
 *   - 'index'    : Main graduation page (GraduationApp)
 *   - 'Memories' : Memories page (GraduationAppMemories)
 *
 * @param {Object} authResult - Result from authenticateUser()
 * @returns {Promise<void>}
 */
async function bootstrapPageApp(authResult) {
  const { loginController, isPublic, isClearData } = authResult || {};

  const pageElement = document.querySelector(APP_CONFIG.selectors.pageRoot);
  const currentPage = pageElement?.getAttribute('page');

  if (!currentPage) {
    logger.warn('No page attribute found on #myPage – skipping app initialization');
    return;
  }

  logger.info('🚀 Bootstrapping page application', {
    page: currentPage,
    isPublic,
    isClearData,
  });

  // Shared options passed to page apps (Approach C)
  const pageAppOptions = {
    loadingManager: loginController?.loadingManager || null,
    notificationManager: loginController?.notifications || null,
  };

  try {
    switch (currentPage) {
      // -----------------------------------------------------------------------
      // Public Pages
      // -----------------------------------------------------------------------

      case 'login':
        // Auth UI is handled by authenticateUser() via _handleLoginPage()
        logger.info('🔐 Login page — authentication UI active');
        break;

      case 'logOut':
        // Data already cleared by authenticateUser()
        logger.info('🚪 Logout page — initializing background');

        // Initialize interactive background
        const loadingManager = new LoadingManager({
          logger: logger.withContext({ module: 'LogoutPageLoadingManager' }),
        });
        const logoutBg = new InteractiveBackground({
          loadingManager,
        });

        logoutBg.init();

        logger.info('✅ Logout page ready');
        loadingManager.hide()
        break;
      // -----------------------------------------------------------------------
      // Protected Pages
      // -----------------------------------------------------------------------

      case 'index':
        if (typeof GraduationApp === 'function') {
          logger.info('🎓 Starting GraduationApp (index page)');

          const app = new GraduationApp(pageAppOptions);
          await app.init();
          // Online content management
          manageOnlineContent();
          logger.info('📡 Online content management started for index page');
        } else {
          logger.warn('GraduationApp is not available');
        }
        break;

      case 'Memories':
        if (typeof GraduationAppMemories === 'function') {
          logger.info('📸 Starting GraduationAppMemories (Memories page)');

          const app = new GraduationAppMemories(pageAppOptions);
          await app.init();
          logger.info('📡 Online content management started for Memories page');
        } else {
          logger.warn('GraduationAppMemories is not available');
        }
        break;

      default:
        logger.warn(`No matching application for page: "${currentPage}"`);
        break;
    }
  } catch (error) {
    logger.error(`Failed to initialize app for page "${currentPage}":`, error);
  }
}

// -----------------------------------------------------------------------------
// Main Initialization Orchestrator
// -----------------------------------------------------------------------------

/**
 * Initializes all core features in the correct order:
 * 1. Theme       — applied before any visual rendering
 * 2. PWA         — registered in background (non-blocking)
 * 3. Auth        — blocks until user is authenticated (unless whitelisted)
 * 4. Page App    — boots the page-specific application
 * 5. Online Mgmt — manages online-dependent content visibility (per page)
 *
 * Loading text flow:
 * - HTML data-loading-text → LoginController steps → Page app custom text
 *
 * @returns {Promise<void>}
 */
async function initializeApp() {
  logger.time('Application initialization');

  try {
    // 1. Theme (must be ready before any visual rendering)
    initializeTheme();

    // 2. PWA (fire and forget — registers in background)
    initializePWA().catch((err) => {
      logger.error('PWA registration failed:', err);
    });

    // 3. Authentication (blocks until resolved, or bypasses for whitelisted pages)
    const authResult = await authenticateUser();

    // 4. Page-specific application logic
    await bootstrapPageApp(authResult);

    logger.info('✅ Application initialized successfully');
    logger.timeEnd('Application initialization');
  } catch (error) {
    logger.error('Critical error during application initialization:', error);

    // Show fallback error message to the user
    _showFallbackError();

    logger.timeEnd('Application initialization');
  }
}
/**
 * Shows a fallback error message when initialization fails critically
 * @private
 */
function _showFallbackError() {
  // Prevent duplicate fallback messages
  if (document.getElementById('app-fallback-error')) return;

  const fallbackMessage = document.createElement('div');
  fallbackMessage.id = 'app-fallback-error';
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
    font-size: 0.95rem;
  `;
  fallbackMessage.textContent =
    'Application failed to load. Please refresh the page.';
  document.body.appendChild(fallbackMessage);
}

// -----------------------------------------------------------------------------
// Startup
// -----------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initializeApp().catch((err) => {
    console.error('Fatal error on DOMContentLoaded:', err);
    _showFallbackError();
  });
});