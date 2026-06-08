/**
 * InteractiveBackground - Manages the animated gradient bubble that follows the cursor
 *
 * Creates a smooth, interactive background effect where a gradient bubble
 * follows mouse/touch movement with easing. Handles visibility changes
 * and window resizing gracefully.
 *
 * Usage:
 *   const bg = new InteractiveBackground();
 *   bg.init();
 *   // Later: bg.destroy();
 */

export class InteractiveBackground {
  constructor(options = {}) {
    // Configuration with defaults
    this.config = {
      smoothing: options.smoothing || 0.05,
      movementThreshold: options.movementThreshold || 0.5,
      resizeDebounce: options.resizeDebounce || 250,
      loadedDelay: options.loadedDelay || 1000,
      selectors: {
        bubble: options.selectors?.bubble || ".interactive",
        container: options.selectors?.container || ".gradients-container",
        card: options.selectors?.card || ".card",
        logOutBtn: options.logOutBtn || "#LogoutBtn",
      },
    };

    // Animation state
    this.state = {
      curX: 0,
      curY: 0,
      tgX: 0,
      tgY: 0,
      isMoving: false,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      resizeTimeout: null,
      animationFrameId: null,
    };

    // Cached DOM elements
    this.elements = {
      interBubble: null,
      gradientContainer: null,
      card: null,
      logOutBtn: null,
    };

    // Bound handlers (for proper add/removeEventListener)
    this._handleMouseMove = this._handleMouseMove.bind(this);
    this._handleTouchMove = this._handleTouchMove.bind(this);
    this._handleResize = this._handleResize.bind(this);
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this);
    this._animate = this._animate.bind(this);
    this._handleLogOutBtn = this._handleLogOutBtn.bind(this);

    this.loadingManager = options.loadingManager || null;
    this._initialized = false;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initializes the interactive background
   * @returns {boolean} Whether initialization succeeded
   */
  init() {
    if (this._initialized) {
      console.debug("InteractiveBackground already initialized");
      return true;
    }

    if (this.loadingManager?.updateText) {
      this.loadingManager.updateText("Preparing logout interface...");
    }

    this._cacheElements();

    if (!this.elements.interBubble) {
      console.warn("InteractiveBackground: .interactive element not found — skipping");
      return false;
    }

    this._addEventListeners();
    this._initAnimation();
    this._addLoadedClass();

    if (this.loadingManager?.updateText) {
      this.loadingManager.updateText("Logout page ready");
    }

    this._initialized = true;
    console.debug("InteractiveBackground initialized");
    return true;
  }

  /**
   * Destroys the interactive background and cleans up resources
   */
  destroy() {
    this._removeEventListeners();
    this._cancelAnimation();

    this._initialized = false;
    console.debug("InteractiveBackground destroyed");
  }

  /**
   * Updates configuration at runtime
   * @param {Object} newConfig - Configuration values to update
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.debug("InteractiveBackground config updated", newConfig);
  }

  /**
   * Pauses the animation (useful when tab is hidden)
   */
  pause() {
    this._cancelAnimation();
  }

  /**
   * Resumes the animation
   */
  resume() {
    if (this._initialized && !this.state.animationFrameId) {
      this.state.animationFrameId = requestAnimationFrame(this._animate);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: DOM
  // ---------------------------------------------------------------------------

  /**
   * Caches DOM element references
   * @private
   */
  _cacheElements() {
    this.elements.interBubble = document.querySelector(
      this.config.selectors.bubble
    );
    this.elements.gradientContainer = document.querySelector(
      this.config.selectors.container
    );
    this.elements.card = document.querySelector(
      this.config.selectors.card
    );

    this.elements.logOutBtn = document.querySelector(this.config.selectors.logOutBtn);
  }

  // ---------------------------------------------------------------------------
  // Private: Animation
  // ---------------------------------------------------------------------------

  /**
   * Sets initial animation state and starts the loop
   * @private
   */
  _initAnimation() {
    this.state.tgX = this.state.windowWidth / 2;
    this.state.tgY = this.state.windowHeight / 2;
    this.state.curX = this.state.tgX;
    this.state.curY = this.state.tgY;

    this._updateBubblePosition();
    this.state.animationFrameId = requestAnimationFrame(this._animate);
  }

  /**
   * Main animation loop
   * @private
   */
  _animate() {
    const dx = this.state.tgX - this.state.curX;
    const dy = this.state.tgY - this.state.curY;

    // Check if movement is significant
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.state.isMoving = distance > this.config.movementThreshold;

    // Apply smooth movement
    this.state.curX += dx * this.config.smoothing;
    this.state.curY += dy * this.config.smoothing;

    this._updateBubblePosition();

    // Toggle movement class on body for CSS effects
    document.body.classList.toggle("is-moving", this.state.isMoving);

    this.state.animationFrameId = requestAnimationFrame(this._animate);
  }

  /**
   * Updates the bubble element's position
   * @private
   */
  _updateBubblePosition() {
    if (this.elements.interBubble) {
      this.elements.interBubble.style.transform = `translate(${Math.round(this.state.curX)}px, ${Math.round(this.state.curY)}px)`;
    }
  }

  /**
   * Cancels the current animation frame
   * @private
   */
  _cancelAnimation() {
    if (this.state.animationFrameId) {
      cancelAnimationFrame(this.state.animationFrameId);
      this.state.animationFrameId = null;
    }
  }

  /**
   * Adds 'loaded' class to body after a delay for CSS transitions
   * @private
   */
  _addLoadedClass() {
    setTimeout(() => {
      document.body.classList.add("loaded");
    }, this.config.loadedDelay);
  }

  // ---------------------------------------------------------------------------
  // Private: Event Handlers
  // ---------------------------------------------------------------------------

  /**
   * Handles mouse movement
   * @param {MouseEvent} event
   * @private
   */
  _handleMouseMove(event) {
    this.state.tgX = event.clientX;
    this.state.tgY = event.clientY;
  }

  /**
   * Handles touch movement
   * @param {TouchEvent} event
   * @private
   */
  _handleTouchMove(event) {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.state.tgX = event.touches[0].clientX;
      this.state.tgY = event.touches[0].clientY;
    }
  }

  /**
   * Handles window resize with debouncing
   * @private
   */
  _handleResize() {
    clearTimeout(this.state.resizeTimeout);
    this.state.resizeTimeout = setTimeout(() => {
      this.state.windowWidth = window.innerWidth;
      this.state.windowHeight = window.innerHeight;

      // Clamp position to new window bounds
      if (this.state.tgX > this.state.windowWidth) {
        this.state.tgX = this.state.windowWidth;
      }
      if (this.state.tgY > this.state.windowHeight) {
        this.state.tgY = this.state.windowHeight;
      }
    }, this.config.resizeDebounce);
  }

  /**
   * Handles visibility change (tab switch)
   * @private
   */
  _handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Handle log out button click — show confirmation and perform a professional
   * logout flow: confirm, call logout endpoint (if available), clear local
   * session data, show feedback and redirect.
   * @private
   */
  async _handleLogOutBtn() {
    // If button element isn't present, fallback to immediate redirect
    const btn = this.elements.logOutBtn;
    if (!btn) {
      window.location.href = "/login";
      return;
    }

    try {
      // Perform the logout sequence (API call, cleanup, UI feedback)
      await this._performLogoutSequence();
    } catch (err) {
      this._showToast("Sign out failed. Please try again.");
    }
  }

  /**
   * Small toast notification used for status feedback
   * @private
   */
  _showToast(msg, timeout = 3500) {
    if (!msg) return;
    const existing = document.querySelector(".logout-toast");
    if (existing) existing.remove();

    const t = document.createElement("div");
    t.className = "logout-toast";
    Object.assign(t.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      background: "rgba(0,0,0,0.8)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: "6px",
      zIndex: 9999,
      maxWidth: "80%",
    });
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), timeout);
  }

  /**
   * Perform the actual logout: call optional API, clear storage and redirect.
   * @private
   */
  async _performLogoutSequence() {
    // show spinner/toast
    this._showToast("Signing out...");

    // gentle UI pause to let toast show
    await new Promise((r) => setTimeout(r, 700));

    // optional nice fade-out of page before redirect
    document.body.style.transition = "opacity 350ms ease";
    document.body.style.opacity = "0";
    setTimeout(() => {
      window.location.href = "/login";
    }, 360);
  }

  // ---------------------------------------------------------------------------
  // Private: Event Listeners
  // ---------------------------------------------------------------------------

  /**
   * Adds all event listeners
   * @private
   */
  _addEventListeners() {
    window.addEventListener("mousemove", this._handleMouseMove, { passive: true });
    window.addEventListener("touchmove", this._handleTouchMove, { passive: false });
    window.addEventListener("resize", this._handleResize, { passive: true });
    document.addEventListener("visibilitychange", this._handleVisibilityChange);

    if (this.elements.logOutBtn) {
      this.elements.logOutBtn.addEventListener("click", this._handleLogOutBtn);
    }
      
    // Detect initial mouse movement for CSS
    const initialMoveHandler = () => {
      document.body.classList.add("has-mouse-movement");
      window.removeEventListener("mousemove", initialMoveHandler);
    };
    window.addEventListener("mousemove", initialMoveHandler, { once: true });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => this.destroy(), { once: true });
  }

  /**
   * Removes all event listeners
   * @private
   */
  _removeEventListeners() {
    window.removeEventListener("mousemove", this._handleMouseMove);
    window.removeEventListener("touchmove", this._handleTouchMove);
    window.removeEventListener("resize", this._handleResize);
    document.removeEventListener("visibilitychange", this._handleVisibilityChange);
    if (this.elements.logOutBtn) {
      this.elements.logOutBtn.removeEventListener("click", this._handleLogOutBtn);
    }
  }
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default InteractiveBackground;