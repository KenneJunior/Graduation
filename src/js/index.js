import logger from "../js/utility/logger.js";
import DropdownManager from "./utility/DropdownManager.js";
import { ThemeManager } from "./utility/Mode.js";
import {
    filterMediaByUser,
    getCurrentUserInfo,
    hideMediaLoading,
    loadMediaData,
    showMediaLoading
} from "./utility/utils.js";
import {getDeviceType} from "./utility/logger_info.js";


const appLogger = logger.withContext({
  module: "GraduationApp",
  file: "Graduation-app( index ).js",
  component: "ApplicationCore",
});

// Create contextual loggers for each module
const confettiLogger = appLogger.withContext({
  module: "ConfettiSystem",
  file: "Graduation-app( index ).js",
  component: "CanvasAnimation",
});

const imageLogger = appLogger.withContext({
  module: "ImageLoader",
  file: "Graduation-app( index ).js",
  component: "AssetLoading",
});

const scrollLogger = appLogger.withContext({
  module: "ScrollAnimator",
  file: "Graduation-app( index ).js",
  component: "UIAnimation",
});

const shareLogger = appLogger.withContext({
  module: "ShareManager",
  file: "Graduation-app( index ).js",
  component: "SocialIntegration",
});

const perfLogger = appLogger.withContext({
  module: "PerformanceMonitor",
  file: "Graduation-app( index ).js",
  component: "MetricsCollection",
});

// Log application startup with comprehensive context
appLogger.info("Graduation application initializing", {
  startupTime: performance.now(),
  domReady: document.readyState,
  visibility: document.visibilityState,
});
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    appLogger.pushContext({
      device: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    });
  }, 250);
});

// Update context when going online/offline
window.addEventListener("online", () => {
  appLogger.pushContext({
    pwa: { isOnline: true },
    network: navigator.connection,
  });
  appLogger.info("Application came online");
});

window.addEventListener("offline", () => {
  appLogger.pushContext({
    pwa: { isOnline: false },
  });
  appLogger.warn("Application went offline");
});

// Update context when page becomes visible/hidden
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    logger.debug("Page became visible");
  } else {
    appLogger.debug("Page became hidden");
  }
});

/**
 * CONFETTI SYSTEM - Enhanced canvas-based particle effects with multiple types and better physics
 * @class ConfettiSystem
 */
class ConfettiSystem {
  constructor(container, options = {}) {
      //dont initialise if its a mobile devices
     const device = getDeviceType()
      if (device === 'mobile') {
          return;
      }
    confettiLogger.time("ConfettiSystem constructor");
    
    this.container = container;
    
    // Default configuration
    this.config = {
      // Particle settings
      maxParticles: 1000,
      particleLifetime: 3000, // ms
      gravity: 0.1,
      wind: 0,
      drag: 0.01,
      
      // Explosion settings
      explosionSpeed: { min: 2, max: 6 },
      rotationSpeed: { min: -0.02, max: 0.02 },
      opacityDecay: 0.005,
      
      // Visual settings
      colors: ["#8E2DE2", "#4A00E0", "#FF6B6B", "#FECA57", "#1DD1A1", "#00B4D8", "#FF9E00"],
      shapes: ["circle", "rect", "triangle", "star", "heart"],
      shapeDistribution: { circle: 0.3, rect: 0.3, triangle: 0.2, star: 0.1, heart: 0.1 },
      
      // Performance settings
      fpsLimit: 60,
      batchSize: 50,
      useRequestAnimationFrame: true,
      
      // Interaction settings
      interactive: true,
      followMouse: false,
      mouseForce: 0.5,
      autoTrigger: false,
      autoTriggerInterval: 5000,
      
      // Debug settings
      showStats: false,
      showParticleCount: false
    };
    
    // Merge user options
    Object.assign(this.config, options);
    
    // Core properties
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.particleCount = 0;
    this.animationId = null;
    this.isActive = false;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.config.fpsLimit;
    
    // Performance tracking
    this.performanceStats = {
      fps: 0,
      frameCount: 0,
      lastFpsUpdate: 0,
      maxParticlesReached: 0,
      totalParticlesCreated: 0
    };
    
    // Interaction state
    this.mouse = { x: 0, y: 0, isDown: false };
    this.touch = { x: 0, y: 0, isActive: false };
    
    // Auto trigger
    this.autoTriggerTimer = null;
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    
    // Validate container
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error("ConfettiSystem requires a valid container element");
    }
    
    confettiLogger.debug("ConfettiSystem instance created", {
      container: container.className || container.tagName,
      config: this.config
    });


    // Initialize
    this.init();
    confettiLogger.timeEnd("ConfettiSystem constructor");
  }

  /**
   * Initialize the confetti system
   */
  init() {
    try {
      confettiLogger.time("Confetti initialization");
      
      this.createCanvas();
      this.setupCanvas();
      this.setupEventListeners();
      this.setupResizeObserver();
      
      this.isActive = true;
      
      // Start auto trigger if enabled
      if (this.config.autoTrigger) {
        this.startAutoTrigger();
      }
      
      // Start animation loop
      this.startAnimation();
      
      confettiLogger.info("Confetti system initialized successfully", {
        maxParticles: this.config.maxParticles,
        interactive: this.config.interactive,
        autoTrigger: this.config.autoTrigger
      });
      
      confettiLogger.timeEnd("Confetti initialization");
    } catch (error) {
      confettiLogger.error("Failed to initialize confetti system", error);
      throw error;
    }
  }

  /**
   * Create and configure canvas element
   */
  createCanvas() {
    try {
      confettiLogger.time("Canvas creation");
      
      this.canvas = document.createElement("canvas");
      this.canvas.className = "confetti-canvas";
      this.ctx = this.canvas.getContext("2d", { alpha: true });

      if (!this.ctx) {
        throw new Error("Canvas context not supported");
      }

      // Setup canvas dimensions and styles
      this.updateCanvasSize();
      
      Object.assign(this.canvas.style, {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        // Make the canvas visually present but not intercept pointer events.
        // Input handling is moved to the container so interactive elements
        // (links, buttons, inputs) underneath stay usable.
        pointerEvents: "none",
        zIndex: "1000",
        userSelect: "none",
        touchAction: "none"
      });

      // Append to container
      this.container.appendChild(this.canvas);
      
      confettiLogger.debug("Canvas created and configured", {
        width: this.canvas.width,
        height: this.canvas.height,
        dpr: window.devicePixelRatio
      });
      
      confettiLogger.timeEnd("Canvas creation");
    } catch (error) {
      confettiLogger.error("Failed to create canvas", error);
      throw error;
    }
  }


  /**
   * Setup canvas dimensions and get container background
   */

 setupCanvas() {
    confettiLogger.time("Canvas setup");
    
    // Update canvas size based on container and DPR
    this.updateCanvasSize();
    
    // Get container background color for fade effect
    const containerStyle = window.getComputedStyle(this.container);
    this.containerBackground = containerStyle.backgroundColor || "rgba(255, 255, 255, 1)";
    
    confettiLogger.debug("Canvas setup completed", {
      width: this.canvas.width,
      height: this.canvas.height,
      containerBackground: this.containerBackground
    });
    
    confettiLogger.timeEnd("Canvas setup");
  }

  /**
   * Update canvas size based on container and device pixel ratio
   */
  updateCanvasSize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Store the original canvas dimensions (without DPR scaling)
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    // Set canvas dimensions with DPR scaling
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;

    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;

    // Reset transform and scale for high DPI displays
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.scale(dpr, dpr);

    confettiLogger.debug("Canvas size updated", {
      width: rect.width,
      height: rect.height,
      dpr: dpr,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    confettiLogger.time("Event listeners setup");
    
    if (this.config.interactive) {
      // Bind interactions on the container instead of the canvas so the canvas
      // doesn't block clicks on interactive elements that live above it.
      // Mouse events
      this.container.addEventListener("mousemove", this.handleMouseMove);
      this.container.addEventListener("mousedown", this.handleMouseDown);
      this.container.addEventListener("mouseup", this.handleMouseUp);
      this.container.addEventListener("mouseleave", this.handleMouseUp);

      // Touch events
      // touchstart is non-passive so we can prevent default only when interacting
      // with non-interactive areas (confetti), while still allowing scrolling
      // when the user touches interactive UI.
      this.container.addEventListener("touchstart", this.handleTouchStart, { passive: false });
      this.container.addEventListener("touchmove", this.handleTouchMove, { passive: true });
      this.container.addEventListener("touchend", this.handleTouchEnd, { passive: true });
      this.container.addEventListener("touchcancel", this.handleTouchEnd, { passive: true });
      
      // Click events for name highlight
      const nameHighlight = document.querySelector(".name-highlight");
      if (nameHighlight) {
        nameHighlight.addEventListener("click", (e) => {
          // If the nameHighlight contains a link or button, let the normal
          // interaction occur; otherwise trigger confetti.
          const target = e.target;
          if (target.closest("a, button")) {
            confettiLogger.debug("Click event on link or button inside name highlight, skipping confetti");
            return;
          }
          // Allow the click to proceed normally (no preventDefault) and trigger confetti
          confettiLogger.debug("Name highlight clicked");
          this.triggerConfetti(100, { x: e.clientX, y: e.clientY });
        });
      }
    }
    
    confettiLogger.debug("Event listeners setup completed", {
      interactive: this.config.interactive,
      followMouse: this.config.followMouse
    });
    
    confettiLogger.timeEnd("Event listeners setup");
  }

  /**
   * Setup Resize Observer for better performance
   */
  setupResizeObserver() {
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
      confettiLogger.debug("ResizeObserver setup");
    } else {
      // Fallback to resize event with debounce
      window.addEventListener("resize", this.debounce(this.handleResize, 200));
      confettiLogger.debug("Using resize event fallback");
    }
  }

  /**
   * Handle resize events
   */
  handleResize() {
    confettiLogger.debug("Container resized, updating canvas");
    this.updateCanvasSize();
  }

  /**
   * Handle mouse movement
   */
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    
    // Create particles on mouse move if following
    if (this.config.followMouse && this.mouse.isDown) {
      this.triggerConfetti(5, { x: this.mouse.x, y: this.mouse.y });
    }
  }

  /**
   * Heuristic to determine whether an element is interactive/clickable.
   */
  isInteractiveElement(el) {
    if (!el || el === document.body || el === document.documentElement || el === this.container) return false;
    try {
      if (el.closest && el.closest("a, button, input, textarea, select, label, [role=button], [role=link], [data-action], .btn, .clickable")) return true;
      if (el.hasAttribute && (el.hasAttribute("onclick") || el.hasAttribute("href") || el.hasAttribute("role"))) return true;
      // Elements with a tabbable index are often interactive
      if (typeof el.tabIndex === "number" && el.tabIndex >= 0) return true;
    } catch (err) {
      // Defensive: if any error occurs, assume not interactive
    }
    return false;
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    // Determine what element was clicked and skip confetti if it's interactive
    const underlying = document.elementFromPoint(e.clientX, e.clientY);
    const isInteractive = this.isInteractiveElement(underlying) || this.isInteractiveElement(e.target);
    confettiLogger.debug("Mouse down detected", { x: e.clientX, y: e.clientY, target: underlying && underlying.tagName, targetElement: e.target && e.target.tagName, isInteractive });
    if (isInteractive) {
      confettiLogger.debug("Mouse down on interactive element, skipping confetti");
      // Record last interaction for debugging
      this.lastInteraction = { type: "mouse", target: (underlying && underlying.tagName) || (e.target && e.target.tagName), interactive: true };
      return;
    }

    this.mouse.isDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;

    // Record last interaction and trigger confetti on click
    this.lastInteraction = { type: "mouse", target: underlying && underlying.tagName, interactive: false, x: this.mouse.x, y: this.mouse.y };
    this.triggerConfetti(30, { x: this.mouse.x, y: this.mouse.y });
  }

  /**
   * Handle mouse up
   */
  handleMouseUp() {
    this.mouse.isDown = false;
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    // For touch we only prevent default if the touch starts on the canvas area
    // and not on an interactive element behind it (links/buttons/etc.)
    const touch = e.touches[0];
    const underlying = document.elementFromPoint(touch.clientX, touch.clientY);
    const isInteractive = this.isInteractiveElement(underlying) || this.isInteractiveElement(e.target);
    confettiLogger.debug("Touch start detected", { x: touch.clientX, y: touch.clientY, target: underlying && underlying.tagName, targetElement: e.target && e.target.tagName, isInteractive });
    if (isInteractive) {
      confettiLogger.debug("Touch start on interactive element, skipping confetti");
      this.lastInteraction = { type: "touch", target: (underlying && underlying.tagName) || (e.target && e.target.tagName), interactive: true };
      return;
    }

    // Prevent the default scroll/gesture behavior when interacting with confetti
    if (e.cancelable) e.preventDefault();

    this.touch.isActive = true;
    const rect = this.canvas.getBoundingClientRect();
    this.touch.x = touch.clientX - rect.left;
    this.touch.y = touch.clientY - rect.top;

    // Record last interaction and trigger confetti on touch
    this.lastInteraction = { type: "touch", target: underlying && underlying.tagName, interactive: false, x: this.touch.x, y: this.touch.y };
    this.triggerConfetti(30, { x: this.touch.x, y: this.touch.y });
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (!this.touch.isActive) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.touch.x = touch.clientX - rect.left;
    this.touch.y = touch.clientY - rect.top;
    
    // Create particles on touch move if following
    if (this.config.followMouse) {
      this.triggerConfetti(5, { x: this.touch.x, y: this.touch.y });
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd() {
    this.touch.isActive = false;
  }

  /**
   * Start auto trigger
   */
  startAutoTrigger() {
    if (this.autoTriggerTimer) {
      clearInterval(this.autoTriggerTimer);
    }
    
    this.autoTriggerTimer = setInterval(() => {
      if (this.particleCount < this.config.maxParticles * 0.7) {
        this.triggerRandomExplosion();
      }
    }, this.config.autoTriggerInterval);
    
    confettiLogger.debug("Auto trigger started", {
      interval: this.config.autoTriggerInterval
    });
  }

  /**
   * Stop auto trigger
   */
  stopAutoTrigger() {
    if (this.autoTriggerTimer) {
      clearInterval(this.autoTriggerTimer);
      this.autoTriggerTimer = null;
      confettiLogger.debug("Auto trigger stopped");
    }
  }

  /**
   * Start animation loop
   */
  startAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.lastFrameTime = performance.now();
    this.animationId = requestAnimationFrame(this.animate);
    confettiLogger.debug("Animation started");
  }

  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      confettiLogger.debug("Animation stopped");
    }
  }

  /**
   * Create a new particle with enhanced properties
   */
  createParticle(x, y, options = {}) {
    if (this.particleCount >= this.config.maxParticles) {
      confettiLogger.debug("Max particles reached, skipping creation");
      return null;
    }
    
    // Determine shape based on distribution
    let shape = options.shape;
    if (!shape) {
      const rand = Math.random();
      let cumulative = 0;
      for (const [shapeType, probability] of Object.entries(this.config.shapeDistribution)) {
        cumulative += probability;
        if (rand <= cumulative) {
          shape = shapeType;
          break;
        }
      }
    }
    
    const particle = {
      id: this.performanceStats.totalParticlesCreated,
      x: x || Math.random() * this.canvas.width,
      y: y || -20 - Math.random() * 100,
      size: options.size || Math.random() * 12 + 5,
      color: options.color || this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
      speedX: options.speedX || (Math.random() - 0.5) * (this.config.explosionSpeed.max - this.config.explosionSpeed.min) + this.config.explosionSpeed.min,
      speedY: options.speedY || Math.random() * (this.config.explosionSpeed.max - this.config.explosionSpeed.min) + this.config.explosionSpeed.min,
      angle: options.angle || Math.random() * Math.PI * 2,
      rotationSpeed: options.rotationSpeed || (Math.random() * (this.config.rotationSpeed.max - this.config.rotationSpeed.min) + this.config.rotationSpeed.min),
      shape: shape,
      opacity: options.opacity || 1,
      gravity: options.gravity || this.config.gravity,
      wind: options.wind || this.config.wind,
      drag: options.drag || this.config.drag,
      createdAt: performance.now(),
      lifetime: options.lifetime || this.config.particleLifetime,
      trail: options.trail || [],
      maxTrailLength: 5,
      isSpecial: options.isSpecial || false
    };
    
    this.particles.push(particle);
    this.particleCount++;
    this.performanceStats.totalParticlesCreated++;
    this.performanceStats.maxParticlesReached = Math.max(this.performanceStats.maxParticlesReached, this.particleCount);
    
    return particle;
  }

  /**
   * Trigger confetti explosion
   * @param {number} count - Number of particles
   * @param {Object} origin - Explosion origin point
   * @param {Object} options - Additional particle options
   */
  triggerConfetti(count = 50, origin = null, options = {}) {
    if (!this.isActive) {
      confettiLogger.warn("Confetti system not active, cannot trigger");
      return;
    }

    // Debugging: log when confetti is triggered and recent interaction context
    const stack = new Error().stack ? new Error().stack.split("\n").slice(1, 6) : [];
    confettiLogger.debug("triggerConfetti invoked", {
      count,
      origin,
      lastInteraction: this.lastInteraction,
      stack
    });
    
    if (this.particleCount + count > this.config.maxParticles) {
      count = Math.max(0, this.config.maxParticles - this.particleCount);
      confettiLogger.debug("Reducing particle count due to limit", { newCount: count });
    }
    
    confettiLogger.debug("Triggering confetti", { 
      particleCount: count,
      origin: origin,
      currentParticles: this.particleCount
    });
    
    const rect = this.container.getBoundingClientRect();
    const baseX = origin ? origin.x : Math.random() * rect.width;
    const baseY = origin ? origin.y : -20;
    
    // Create particles in batches for performance
    const batchSize = Math.min(count, this.config.batchSize);
    const batches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchCount = Math.min(batchSize, count - (batch * batchSize));
      
      // Use setTimeout to spread creation over multiple frames
      setTimeout(() => {
        for (let i = 0; i < batchCount; i++) {
          const angle = (i / batchCount) * Math.PI * 2;
          const distance = Math.random() * 50;
          
          this.createParticle(
            baseX + Math.cos(angle) * distance,
            baseY + Math.sin(angle) * distance,
            {
              ...options,
              speedX: Math.cos(angle) * (Math.random() * 4 + 2),
              speedY: Math.sin(angle) * (Math.random() * 4 + 2),
              angle: Math.random() * Math.PI * 2
            }
          );
        }
      }, batch * 16); // ~60fps spacing
    }
    
    // Ensure animation is running
    if (!this.animationId) {
      this.startAnimation();
    }
  }

  /**
   * Trigger random explosion at random position
   */
  triggerRandomExplosion() {
    const rect = this.container.getBoundingClientRect();
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height * 0.3; // Top 30% of container
    
    this.triggerConfetti(
      Math.floor(Math.random() * 30) + 20,
      { x, y },
      { gravity: Math.random() * 0.2 + 0.05 }
    );
  }

  /**
   * Create special effect (hearts, stars, etc.)
   */
  triggerSpecialEffect(effectType, count = 20, origin = null) {
    const effects = {
      hearts: {
        shape: "heart",
        colors: ["#FF6B6B", "#FF9E9E", "#FF5252"],
        gravity: 0.05,
        lifetime: 4000
      },
      stars: {
        shape: "star",
        colors: ["#FECA57", "#FFD700", "#FFEAA7"],
        rotationSpeed: { min: -0.05, max: 0.05 },
        lifetime: 3500
      },
      fireworks: {
        colors: ["#FF6B6B", "#FF9E00", "#FECA57", "#1DD1A1"],
        explosionSpeed: { min: 3, max: 8 },
        gravity: 0.08,
        lifetime: 2000
      }
    };
    
    const effect = effects[effectType];
    if (!effect) {
      confettiLogger.warn("Unknown effect type", { effectType });
      return;
    }
    
    this.triggerConfetti(count, origin, {
      ...effect,
      isSpecial: true
    });
  }

  /**
   * Animation loop
   */
  animate(currentTime) {
    if (!this.isActive) {
      this.animationId = null;
      return;
    }
    
    // Calculate delta time
    const deltaTime = currentTime - this.lastFrameTime;
    
    // Skip frame if too soon (for FPS limiting)
    if (deltaTime < this.frameInterval) {
      this.animationId = requestAnimationFrame(this.animate);
      return;
    }
    
    this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
    
    // Update performance stats
    this.updatePerformanceStats(currentTime);

     // a line that executed onece per frame to create fading trail effect
      if (this.particleCount > 0) {
          // Create fading trail effect when particles exist
          this.ctx.globalCompositeOperation = "source-over";
          this.ctx.fillStyle = this.containerBackground.replace(/[\d.]+\)$/, "0.0005)");
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }

    
    // Update and draw particles
    this.updateParticles(deltaTime);
    
    // Draw performance stats if enabled
    if (this.config.showStats) {
      this.drawPerformanceStats();
    }
    
    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Update particles physics
   */
  updateParticles(deltaTime) {
    const delta = deltaTime / 16; // Normalize to ~60fps
    
    let particlesRemoved = 0;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Calculate age
      const age = performance.now() - p.createdAt;
      
      // Remove old particles
      if (age > p.lifetime || p.opacity <= 0) {
        this.particles.splice(i, 1);
        this.particleCount--;
        particlesRemoved++;
        continue;
      }
      
      // Update trail (for special effects)
      if (p.isSpecial && p.trail) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > p.maxTrailLength) {
          p.trail.shift();
        }
      }
      
      // Update physics
      p.speedY += p.gravity * delta;
      p.speedX += (p.wind - p.speedX * p.drag) * delta;
      p.speedY -= p.speedY * p.drag * delta;
      
      p.x += p.speedX * delta;
      p.y += p.speedY * delta;
      p.angle += p.rotationSpeed * delta;
      
      // Apply mouse force if following
      if (this.config.followMouse && (this.mouse.isDown || this.touch.isActive)) {
        const target = this.mouse.isDown ? this.mouse : this.touch;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = this.config.mouseForce * (1 - distance / 100);
          p.speedX += (dx / distance) * force * delta;
          p.speedY += (dy / distance) * force * delta;
        }
      }
      
      // Opacity decay based on lifetime
      p.opacity = Math.max(0, 1 - (age / p.lifetime));
      
      // Boundary checking with bounce
      if (p.x < 0 || p.x > this.canvas.width) {
        p.speedX *= -0.8; // Bounce with energy loss
        p.x = Math.max(0, Math.min(this.canvas.width, p.x));
      }
      
      if (p.y > this.canvas.height) {
        p.speedY *= -0.6; // Bounce with more energy loss
        p.y = this.canvas.height;
      }
      
      // Draw particle
      this.drawParticle(p);
    }
    
    // Clean up if no particles
    if (this.particleCount === 0) {
      this.stopAnimation();
      confettiLogger.debug("All particles expired, animation stopped");
    }
  }

  /**
   * Draw particle with enhanced visuals
   */
  drawParticle(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.angle);
    this.ctx.globalAlpha = p.opacity;
    
    // Draw trail for special particles
    if (p.isSpecial && p.trail.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      
      for (let j = p.trail.length - 1; j >= 0; j--) {
        const point = p.trail[j];
        const trailX = point.x - p.x;
        const trailY = point.y - p.y;
        
        // Rotate trail point to match particle rotation
        const rotatedX = trailX * Math.cos(-p.angle) - trailY * Math.sin(-p.angle);
        const rotatedY = trailX * Math.sin(-p.angle) + trailY * Math.cos(-p.angle);
        
        this.ctx.lineTo(rotatedX, rotatedY);
      }
      
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = p.size / 4;
      this.ctx.lineCap = "round";
      this.ctx.stroke();
    }
    
    // Draw particle shape
    this.ctx.fillStyle = p.color;
    
    switch (p.shape) {
      case "circle":
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case "rect":
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        break;
        
      case "triangle":
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size / 2);
        this.ctx.lineTo(p.size / 2, p.size / 2);
        this.ctx.lineTo(-p.size / 2, p.size / 2);
        this.ctx.closePath();
        this.ctx.fill();
        break;
        
      case "star":
        this.drawStar(0, 0, 5, p.size / 2, p.size / 4);
        break;
        
      case "heart":
        this.drawHeart(0, 0, p.size);
        break;
    }
    
    // Add highlight for 3D effect
    if (p.shape === "circle" || p.shape === "rect") {
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      this.ctx.beginPath();
      
      if (p.shape === "circle") {
        this.ctx.arc(-p.size / 4, -p.size / 4, p.size / 4, 0, Math.PI * 2);
      } else {
        this.ctx.fillRect(-p.size / 2 + 2, -p.size / 2 + 2, p.size / 2, p.size / 2);
      }
      
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * Draw star shape
   */
  drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      this.ctx.lineTo(x, y);
      rot += step;
    }
    
    this.ctx.lineTo(cx, cy - outerRadius);
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Draw heart shape
   */
  drawHeart(x, y, size) {
    const height = size * 0.8;
    const width = size * 0.9;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height / 4);
    
    // Top left curve
    this.ctx.bezierCurveTo(
      x, y,
      x - width / 2, y,
      x - width / 2, y + height / 4
    );
    
    // Bottom left curve
    this.ctx.bezierCurveTo(
      x - width / 2, y + height / 2,
      x, y + height * 0.75,
      x, y + height
    );
    
    // Bottom right curve
    this.ctx.bezierCurveTo(
      x, y + height * 0.75,
      x + width / 2, y + height / 2,
      x + width / 2, y + height / 4
    );
    
    // Top right curve
    this.ctx.bezierCurveTo(
      x + width / 2, y,
      x, y,
      x, y + height / 4
    );
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  /**
   * Update performance statistics
   */
  updatePerformanceStats(currentTime) {
    this.performanceStats.frameCount++;
    
    // Update FPS every second
    if (currentTime - this.performanceStats.lastFpsUpdate >= 1000) {
      this.performanceStats.fps = Math.round(
        (this.performanceStats.frameCount * 1000) / (currentTime - this.performanceStats.lastFpsUpdate)
      );
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFpsUpdate = currentTime;
    }
  }

  /**
   * Draw performance statistics
   */
  drawPerformanceStats() {
    this.ctx.save();
    this.ctx.font = "12px monospace";
    this.ctx.fillStyle = "white";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`FPS: ${this.performanceStats.fps}`, 10, 10);
    this.ctx.fillText(`Particles: ${this.particleCount}`, 10, 30);
    this.ctx.fillText(`Max: ${this.performanceStats.maxParticlesReached}`, 10, 50);
    this.ctx.restore();
  }

  /**
   * Clear all particles
   */
  clearParticles() {
    this.particles = [];
    this.particleCount = 0;
    confettiLogger.debug("All particles cleared");
  }

  /**
   * Reset the system
   */
  reset() {
    this.clearParticles();
    this.stopAutoTrigger();
    this.stopAnimation();
    this.performanceStats = {
      fps: 0,
      frameCount: 0,
      lastFpsUpdate: 0,
      maxParticlesReached: 0,
      totalParticlesCreated: 0
    };
    
    confettiLogger.debug("System reset");
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    
    // Restart auto trigger if changed
    if (newConfig.autoTrigger !== undefined) {
      if (newConfig.autoTrigger) {
        this.startAutoTrigger();
      } else {
        this.stopAutoTrigger();
      }
    }
    
    confettiLogger.debug("Configuration updated", { newConfig });
  }

  /**
   * Get current system state
   */
  getState() {
    return {
      isActive: this.isActive,
      particleCount: this.particleCount,
      maxParticles: this.config.maxParticles,
      performance: { ...this.performanceStats },
      config: { ...this.config }
    };
  }

  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Cleanup resources
   */
  destroy() {
    confettiLogger.time("Confetti system cleanup");
    
    this.isActive = false;
    this.stopAutoTrigger();
    this.stopAnimation();
    
    // Remove event listeners
    if (this.canvas) {
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
      this.canvas.removeEventListener("mousedown", this.handleMouseDown);
      this.canvas.removeEventListener("mouseup", this.handleMouseUp);
      this.canvas.removeEventListener("mouseleave", this.handleMouseUp);
      this.canvas.removeEventListener("touchstart", this.handleTouchStart);
      this.canvas.removeEventListener("touchmove", this.handleTouchMove);
      this.canvas.removeEventListener("touchend", this.handleTouchEnd);
      this.canvas.removeEventListener("touchcancel", this.handleTouchEnd);
    }
    
    // Remove resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    } else {
      window.removeEventListener("resize", this.debounce(this.handleResize, 200));
    }
    
    // Remove canvas from DOM
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    // Clear arrays
    this.particles = [];
    this.particleCount = 0;
    
    confettiLogger.info("Confetti system destroyed", {
      totalParticlesCreated: this.performanceStats.totalParticlesCreated,
      maxParticlesReached: this.performanceStats.maxParticlesReached
    });
    
    confettiLogger.timeEnd("Confetti system cleanup");
  }
}

/**
 * @class ImageLoader Class for Slideshow with Swiper.js
 */

class ImageLoader {
    /**
     *
     * @param {HTMLImageElement}imageElement
     * @param {HTMLElement}placeholderElement
     * @param {Object}options
     */
    constructor(imageElement, placeholderElement, options = {}) {
        imageLogger.time("ImageLoader constructor");

        if (!imageElement) {
            throw new Error("ImageLoader requires a valid image element");
        }

        this.navigationController = null;
        this.image = imageElement;
        this.placeholder = placeholderElement;

        // Store HTML elements
        this.htmlElements = {
            prevBtn: document.getElementById('prevImageBtn'),
            nextBtn: document.getElementById('nextImageBtn'),
            pauseBtn: document.getElementById('pauseRotationBtn'),
            resumeBtn: document.getElementById('resumeRotationBtn'),
            progressBar: document.querySelector('.rotation-progress .progress-bar'),
            imageCounter: document.querySelector('.image-counter'),
            thumbnailNav: document.querySelector('.thumbnail-nav')
        };

        // Configuration
        this.config = {
            rotationDelay: 5000,
            automaticRotate: true,
            transitionDuration: 600,
            preloadCount: 3, // Increased for better performance
            pauseOnHover: true,
            pauseWhenNotVisible: true,
            lazyLoadEnabled: true,
            ...options
        };

        // State
        this.mediaData={
            media: []
        }
        this.currentIndex = 0;
        this.isLoaded = false;
        this.swiper = null;
        this.loadedImages = new Set(); // Track loaded images

        // Bind methods
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.setupPlaybackControls = this.setupPlaybackControls.bind(this);
        this.onSlideChange = this.onSlideChange.bind(this);
        this.onAutoplayStart = this.onAutoplayStart.bind(this);
        this.onAutoplayStop = this.onAutoplayStop.bind(this);
        this.handleImageLoad = this.handleImageLoad.bind(this);
        this.handleImageError = this.handleImageError.bind(this);
        this.preloadAdjacentImages = this.preloadAdjacentImages.bind(this);

        imageLogger.debug("ImageLoader instance created", {
            elementId: imageElement.id
        });

        this.init(options);
        imageLogger.timeEnd("ImageLoader constructor");
    }

    /**
     *
     * @param {object} options
     * @return {Promise<void>}
     */
    async init(options) {
        imageLogger.time("ImageLoader initialization");
        this.config = { ...this.config, ...options };

        try {
            // Load media data
            await this.loadMediaData();

            if (!this.mediaData?.media?.length) {
                imageLogger.warn("No media found for slideshow");
                this.showNoMediaMessage();
                return;
            }

            // Filter out undefined sources (videos)
            this. filterUndefinedMedia();

            // Initialize Swiper
            await this.initializeSwiper();

            // Setup event listeners
            this.setupEventListeners();

            // Setup playback controls
            this.setupPlaybackControls();

            this.isLoaded = true;
            imageLogger.info("ImageLoader initialized successfully", {
                totalImages: this.mediaData.media.length
            });

        } catch (error) {
            imageLogger.error("Failed to initialize ImageLoader", error);
            this.handleInitializationError(error);
        } finally {
            imageLogger.timeEnd("ImageLoader initialization");
        }
    }
    /**
     * Handle initialization errors
     * @param {Error} error
     */
    handleInitializationError(error) {
        appLogger.error("Handling initialization error", error);

        // Show user-friendly error message
        const errorDiv = document.createElement("div");
        errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef476f;
    color: white;
    padding: 1rem;
    border-radius: 8px;
    z-index: 10000;
    max-width: 300px;
  `;
        errorDiv.textContent = "Failed to initialize page. Please refresh.";
        document.body.appendChild(errorDiv);

        appLogger.debug("Error message displayed to user");

        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
                appLogger.debug("Error message removed");
                this.hideMediaLoading()

            }
        }, 5000);
    }
  /**
     * Filter out media with undefined sources (videos)
   * @return {boolean}
     */
    filterUndefinedMedia() {
        if (!this.mediaData?.media) return;
        
        const originalCount = this.mediaData.media.length;
        this.mediaData.media = this.mediaData.media.filter(item => {
            // Keep only images with valid src
            const hasValidSrc = item.src && item.src !== 'undefined' && !item.src.includes('undefined');
            const isImage = !item.type || item.type === 'image' || item.type.includes('image');
            
            if (!hasValidSrc) {
                imageLogger.debug("Filtered out invalid media", {
                    src: item.src,
                    type: item.type
                });
            }
            
            return hasValidSrc && isImage;
        });
        
        imageLogger.debug("Media filtered", {
            originalCount,
            filteredCount: this.mediaData.media.length,
            removed: originalCount - this.mediaData.media.length
        });
    }

    /**
     * Initialize Swiper.js with your HTML structure
     */
async initializeSwiper() {
    imageLogger.time("Initialize Swiper");
    
    try {
        if (typeof Swiper === 'undefined') {
            throw new Error('Swiper.js library not loaded');
        }

        // Hide placeholder
        this.hidePlaceholder();

        // Prepare slides
        await this.prepareSlides();

        // Get pagination container
        const paginationContainer = this.image.querySelector('.swiper-pagination');
        
        // Create event handlers first
        const eventHandlers = {
            init: (swiperInstance) => {
                // Store the swiper instance
                this.swiper = swiperInstance;
                this.currentIndex = swiperInstance.realIndex;
                
                imageLogger.debug("Swiper initialized via init event", {
                    realIndex: swiperInstance.realIndex,
                    activeIndex: swiperInstance.activeIndex,
                    slides: swiperInstance.slides.length
                });
                
                this.showSwiperContainer();
                this.updateImageCounter();
                this.updateThumbnailNav();
                
                // Manually load first few images
                this.preloadAdjacentImages();
            },
            
            slideChange: (swiperInstance) => {
                const oldIndex = this.currentIndex;
                this.currentIndex = swiperInstance.realIndex;
                
                imageLogger.debug("Slide changed via slideChange event", {
                    fromIndex: oldIndex,
                    toIndex: this.currentIndex,
                    realIndex: swiperInstance.realIndex
                });
                
                this.updateImageCounter();
                this.updateThumbnailNav();
                
                if (this.navigationController) {
                    this.navigationController.currentIndex = this.currentIndex;
                    this.navigationController.updateUI();
                }
            },
            
            slideChangeTransitionStart: () => {
                imageLogger.debug("Slide transition started");
            },
            
            slideChangeTransitionEnd: () => {
                imageLogger.debug("Slide transition ended");
                // Preload next images after transition
                this.preloadAdjacentImages();
            },
            
            autoplayStart: () => {
                imageLogger.debug("Autoplay started");
                this.updatePlaybackButtons();
            },
            
            autoplayStop: () => {
                imageLogger.debug("Autoplay stopped");
                this.updatePlaybackButtons();
            },
            
            imagesReady: () => {
                imageLogger.debug("All images ready");
                this.hideMediaLoading();
            },
            
            lazyImageReady: (swiper, slideEl, imageEl) => {
                const index = Array.from(swiper.slides).indexOf(slideEl);
                imageLogger.debug("Lazy image ready", { index });
                this.handleImageLoad(imageEl, index);
            }
        };

        // Configure Swiper
        const swiperConfig = {
            // Core settings
            direction: 'horizontal',
            slidesPerView: 1,
            spaceBetween: 0,
            loop: true,
            centeredSlides: false,
            grabCursor: true,
            
            // Autoplay
            autoplay: this.config.automaticRotate ? {
                delay: this.config.rotationDelay,
                disableOnInteraction: false,
                pauseOnMouseEnter: this.config.pauseOnHover,
                stopOnLastSlide: false,
                waitForTransition: true
            } : false,
            
            // Speed and effects
            speed: this.config.transitionDuration,
            effect: 'fade',
            fadeEffect: { 
                crossFade: true 
            },
            
            // Navigation
            navigation: this.htmlElements.prevBtn && this.htmlElements.nextBtn ? {
                nextEl: this.htmlElements.nextBtn,
                prevEl: this.htmlElements.prevBtn,
                disabledClass: 'disabled'
            } : false,
            
            // Pagination
            pagination: paginationContainer ? {
                el: paginationContainer,
                clickable: true,
                dynamicBullets: false,
                renderBullet: (index, className) => {
                    return `<span class="${className}" aria-label="Go to slide ${index + 1}"></span>`;
                }
            } : false,
            
            // Lazy loading - DISABLED for now to fix opacity issue
            lazy: false,
            
            // Preload images
            preloadImages: true,
            updateOnImagesReady: true,
            
            // Watch slides visibility
            watchSlidesProgress: true,
            watchSlidesVisibility: true,
            
            // Accessibility
            a11y: {
                enabled: true,
                prevSlideMessage: 'Previous slide',
                nextSlideMessage: 'Next slide',
                firstSlideMessage: 'This is the first slide',
                lastSlideMessage: 'This is the last slide',
                paginationBulletMessage: 'Go to slide {{index}}'
            },
            
            // Keyboard
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            
            // Mousewheel
            mousewheel: {
                forceToAxis: true,
                sensitivity: 0.5
            },
            
            // Breakpoints
            breakpoints: {
                320: {
                    slidesPerView: 1
                },
                768: {
                    slidesPerView: 1
                },
                1024: {
                    slidesPerView: 1
                }
            },
            
            // Event handlers - use the pre-defined handlers
            on: eventHandlers
        };
        
        // Initialize Swiper
        this.swiper = new Swiper(this.image, swiperConfig);
        
        // Show pagination
        if (paginationContainer) {
            paginationContainer.classList.remove('d-none');
        }
        
        // Show the swiper container
        this.image.classList.remove('d-none');
        
        // If swiper wasn't set via init event (shouldn't happen), set it now
        if (!this.swiper) {
            this.swiper = this.image.swiper;
        }
        
        imageLogger.info("Swiper initialized", {
            totalSlides: this.mediaData.media.length,
            hasNavigation: !!this.htmlElements.prevBtn && !!this.htmlElements.nextBtn,
            hasPagination: !!paginationContainer,
            swiperInstance: !!this.swiper
        });
        
    } catch (error) {
        imageLogger.error("Failed to initialize Swiper", error);
        throw error;
    } finally {
        imageLogger.timeEnd("Initialize Swiper");
    }
}
/**
     * Prepare slides with proper image loading
     */
    async prepareSlides() {
        imageLogger.time("Prepare slides");
        
        try {
            const wrapper = this.image.querySelector('.swiper-wrapper');
            if (!wrapper) {
                throw new Error('Swiper wrapper not found');
            }
            
            // Clear existing slides
            wrapper.innerHTML = '';
            
            // Create slides
            this.mediaData.media.forEach((mediaItem, index) => {
                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.setAttribute('role', 'group');
                slide.setAttribute('aria-label', `${index + 1} / ${this.mediaData.media.length}`);
                slide.setAttribute('data-swiper-slide-index', index);
                
                // Create image - load immediately instead of lazy loading
                const img = document.createElement('img');
                img.alt = mediaItem.alt || `Graduation image ${index + 1}`;
                img.loading = 'eager'; // Change to eager loading
                img.decoding = 'async';
                
                // Set styles
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                // Store the src for later
                img.dataset.srcToLoad = mediaItem.src;
                
                // Add load event
                img.addEventListener('load', () => this.handleImageLoad(img, index));
                img.addEventListener('error', () => this.handleImageError(img, mediaItem, index));
                
                slide.appendChild(img);
                wrapper.appendChild(slide);
                
                imageLogger.debug("Slide created", { index, src: mediaItem.src });
            });
            
            // Load first few images immediately
            setTimeout(() => {
                this.loadInitialImages();
            }, 100);
            
        } catch (error) {
            imageLogger.error("Failed to prepare slides", error);
            throw error;
        } finally {
            imageLogger.timeEnd("Prepare slides");
        }
    }

    /**
     * Load initial images (first 3)
     */
    loadInitialImages() {
        if (!this.swiper) return;
        
        const slides = this.swiper.slides;
        const loadCount = Math.min(3, slides.length);
        
        for (let i = 0; i < loadCount; i++) {
            const slide = slides[i];
            const img = slide.querySelector('img');
            if (img && img.dataset.srcToLoad && !this.loadedImages.has(img.dataset.srcToLoad)) {
                img.src = img.dataset.srcToLoad;
                this.loadedImages.add(img.dataset.srcToLoad);
                imageLogger.debug("Loading initial image", { index: i });
            }
        }
    }

    /**
     * Preload images adjacent to current slide
     */
    preloadAdjacentImages() {
        if (!this.swiper) return;
        
        const currentIndex = this.swiper.realIndex;
        const slides = this.swiper.slides;
        const preloadCount = this.config.preloadCount;
        
        // Preload next few slides
        for (let i = 1; i <= preloadCount; i++) {
            const nextIndex = (currentIndex + i) % slides.length;
            const prevIndex = (currentIndex - i + slides.length) % slides.length;
            
            // Preload next slide
            const nextSlide = slides[nextIndex];
            if (nextSlide) {
                const nextImg = nextSlide.querySelector('img');
                if (nextImg && nextImg.dataset.srcToLoad && !this.loadedImages.has(nextImg.dataset.srcToLoad)) {
                    nextImg.src = nextImg.dataset.srcToLoad;
                    this.loadedImages.add(nextImg.dataset.srcToLoad);
                }
            }
            
            // Preload previous slide
            const prevSlide = slides[prevIndex];
            if (prevSlide) {
                const prevImg = prevSlide.querySelector('img');
                if (prevImg && prevImg.dataset.srcToLoad && !this.loadedImages.has(prevImg.dataset.srcToLoad)) {
                    prevImg.src = prevImg.dataset.srcToLoad;
                    this.loadedImages.add(prevImg.dataset.srcToLoad);
                }
            }
        }
    }

    /**
     * Handle image load
     */
    handleImageLoad(img, index) {
        imageLogger.debug("Image loaded successfully", { 
            index, 
            src: img.src,
            naturalSize: `${img.naturalWidth}x${img.naturalHeight}`
        });
        
        // Fade in the image
        img.style.opacity = '1';
        
        // Check if all initial images are loaded
        if (this.loadedImages.size >= Math.min(3, this.mediaData.media.length)) {
            this.hideMediaLoading();
        }
    }

    /**
     * Handle image error
     */
    handleImageError(img, mediaItem, index) {
        imageLogger.error("Failed to load image", { index, src: mediaItem.src });
        
        // Try fallback
        const fallbackMedia = this.getFallbackMedia();
        if (fallbackMedia.length > 0) {
            img.src = fallbackMedia[0].src;
            img.alt = fallbackMedia[0].alt || 'Fallback image';
            imageLogger.debug("Loaded fallback image", { index });
        } else {
            // Show error placeholder
            img.style.opacity = '1';
            img.style.backgroundColor = '#f0f0f0';
            img.style.display = 'flex';
            img.style.alignItems = 'center';
            img.style.justifyContent = 'center';
            img.style.color = '#666';
            img.style.fontSize = '14px';
            img.innerHTML = 'Image failed to load';
        }
    }

/**
     * Hide placeholder
     */
    hidePlaceholder() {
        if (this.placeholder) {
            this.placeholder.style.display = 'none';
            imageLogger.debug("Placeholder hidden");
        }
    }

    /**
     * Show/hide media loading
     */
    showMediaLoading() {
        const loadingContainer = document.getElementById('Modal-loading__container');
        showMediaLoading(loadingContainer);
    }

    hideMediaLoading() {
        const loadingContainer = document.getElementById('Modal-loading__container');
        hideMediaLoading(loadingContainer);
    }

    /**
     * Show Swiper container with animation
     */
    showSwiperContainer() {
        if (!this.image) return;
        
        this.image.style.opacity = '0';
        this.image.style.transition = 'opacity 0.5s ease-in-out';
        
        this.image.offsetHeight; // Trigger reflow
        
        this.image.style.opacity = '1';
        
        setTimeout(() => {
            this.image.style.transition = '';
        }, 500);
      }

    /**
     * Setup playback controls
     */
    setupPlaybackControls() {
        const { pauseBtn, resumeBtn } = this.htmlElements;
        
        if (pauseBtn && resumeBtn) {
            pauseBtn.addEventListener('click', () => {
                this.pauseRotation();
                this.updatePlaybackButtons();
            });
            
            resumeBtn.addEventListener('click', () => {
                this.resumeRotation();
                this.updatePlaybackButtons();
            });
            
            this.updatePlaybackButtons();
        }
    }

    /**
     * Update playback buttons
     */
    updatePlaybackButtons() {
        const { pauseBtn, resumeBtn } = this.htmlElements;
        const isPlaying = this.swiper?.autoplay?.running || false;
        
        if (pauseBtn && resumeBtn) {
            if (isPlaying) {
                pauseBtn.classList.remove('d-none');
                resumeBtn.classList.add('d-none');
            } else {
                pauseBtn.classList.add('d-none');
                resumeBtn.classList.remove('d-none');
            }
        }
    }

    /**
     * Update image counter
     */
    updateImageCounter() {
        const { imageCounter } = this.htmlElements;
        if (!imageCounter) return;
        
        const currentSpan = imageCounter.querySelector('.current');
        const totalSpan = imageCounter.querySelector('.total');
        
        if (currentSpan) {
            currentSpan.textContent = (this.currentIndex + 1).toString();
        }
        
        if (totalSpan) {
            totalSpan.textContent = this.mediaData?.media?.length?.toString() || '0';
        }
    }

    /**
     * Update thumbnail navigation
     */
    updateThumbnailNav() {
        const { thumbnailNav } = this.htmlElements;
        if (!thumbnailNav || !this.mediaData?.media) return;
        
        thumbnailNav.classList.remove('d-none');
        thumbnailNav.innerHTML = '';
        
        this.mediaData.media.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `thumbnail-dot ${index === this.currentIndex ? 'active' : ''}`;
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
            dot.setAttribute('aria-label', `Go to image ${index + 1}`);
            dot.setAttribute('data-index', index);
            
            dot.addEventListener('click', () => {
                this.jumpToImage(index);
            });
            
            thumbnailNav.appendChild(dot);
        });
    }

    /**
     * Event handlers
     */
    onSlideChange() {
        if (!this.swiper) return;
        
        const oldIndex = this.currentIndex;
        this.currentIndex = this.swiper.realIndex;
        
        imageLogger.debug("Slide changed", {
            fromIndex: oldIndex,
            toIndex: this.currentIndex
        });
        
        this.updateImageCounter();
        this.updateThumbnailNav();
        
        if (this.navigationController) {
            this.navigationController.currentIndex = this.currentIndex;
            this.navigationController.updateUI();
        }
    }

    onAutoplayStart() {
        imageLogger.debug("Autoplay started");
        this.updatePlaybackButtons();
    }

    onAutoplayStop() {
        imageLogger.debug("Autoplay stopped");
        this.updatePlaybackButtons();
    }

    /**
     * Public methods that maintain compatibility
     **/
    startRotation() {
        if (this.swiper?.autoplay) {
            this.swiper.autoplay.start();
            imageLogger.debug("Rotation started");
        }
    }

    stopRotation() {
        if (this.swiper?.autoplay) {
            this.swiper.autoplay.stop();
            imageLogger.debug("Rotation stopped");
        }
    }

    pauseRotation() {
        if (this.swiper?.autoplay?.running) {
            this.swiper.autoplay.stop();
            imageLogger.debug("Rotation paused");
        }
    }

    resumeRotation() {
        if (this.swiper?.autoplay && !this.swiper.autoplay.running) {
            this.swiper.autoplay.start();
            imageLogger.debug("Rotation resumed");
        }
    }

    nextImage() {
        if (this.swiper) {
            this.swiper.slideNext();
            imageLogger.debug("Next image triggered");
        }
    }

    previousImage() {
        if (this.swiper) {
            this.swiper.slidePrev();
            imageLogger.debug("Previous image triggered");
        }
    }

    jumpToImage(index) {
        if (this.swiper && index >= 0 && index < this.mediaData.media.length) {
            this.swiper.slideToLoop(index);
            imageLogger.debug("Jumped to image", { index });
        }
    }

    setRotationSpeed(speed) {
        if (speed < 1000 || speed > 30000) {
            imageLogger.warn("Invalid rotation speed", { speed });
            return;
        }

        this.config.rotationDelay = speed;
        
        if (this.swiper?.autoplay) {
            const wasRunning = this.swiper.autoplay.running;
            
            if (wasRunning) {
                this.swiper.autoplay.stop();
            }
            
            this.swiper.params.autoplay.delay = speed;
            
            if (wasRunning) {
                this.swiper.autoplay.start();
            }
        }

        imageLogger.info("Rotation speed updated", { newSpeed: speed });
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.automaticRotate !== undefined && this.swiper) {
            if (newConfig.automaticRotate) {
                this.startRotation();
            } else {
                this.stopRotation();
            }
        }
        
        if (newConfig.rotationDelay && this.swiper) {
            this.setRotationSpeed(newConfig.rotationDelay);
        }
    }

    getRotationState() {
        return {
            rotationEnabled: this.swiper?.autoplay?.running || false,
            automaticRotate: this.config.automaticRotate,
            rotationDelay: this.config.rotationDelay,
            currentIndex: this.currentIndex,
            totalImages: this.mediaData?.media?.length || 0,
            isPlaying: this.swiper?.autoplay?.running || false
        };
    }

    async loadMediaData() {
        imageLogger.time("Load media data");
        try {
            this.mediaData = await loadMediaData();
            if (!this.mediaData?.media?.length) {
                throw new Error("No media data available");
            }
            const auth = getCurrentUserInfo()
            if (auth.isGraduand) {
                this.mediaData.media = filterMediaByUser(this.mediaData.media, auth);
            }
            imageLogger.debug("Media data loaded", {
                count: this.mediaData.media.length
            });
        } catch (error) {
            imageLogger.error("Failed to load media data", error);
            this.mediaData = { media: this.getFallbackMedia() };
        } finally {
            imageLogger.timeEnd("Load media data");
        }
    }
    setupEventListeners() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('online', this.handleNetworkChange);
        window.addEventListener('offline', this.handleNetworkChange);
    }

    handleVisibilityChange() {
        if (document.hidden && this.swiper?.autoplay?.running) {
            this.wasPlayingBeforeHidden = true;
            this.swiper.autoplay.stop();
        } else if (!document.hidden && this.wasPlayingBeforeHidden && this.swiper?.autoplay) {
            this.swiper.autoplay.start();
            this.wasPlayingBeforeHidden = false;
        }
    }

    handleNetworkChange() {
        // Handle network changes
    }

    destroy() {
        imageLogger.time("ImageLoader cleanup");
        
        if (this.swiper?.destroy) {
            this.swiper.destroy(true, true);
        }
        
        // Remove event listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('online', this.handleNetworkChange);
        window.removeEventListener('offline', this.handleNetworkChange);
        
        imageLogger.info("ImageLoader destroyed");
        imageLogger.timeEnd("ImageLoader cleanup");
    }

    getFallbackMedia() {
        return [
            {
                src: '/pics/profile_pic.jpg',
                alt: 'Default graduation photo'
            }
        ];
    }
}
/**
 * IMAGE NAVIGATION CONTROLLER - Handles image navigation, playback, and UI controls
 * @class ImageNavigationController
 */
class ImageNavigationController {
  constructor(imageLoader) {
    this.imageLoader = imageLoader;
    this.currentIndex = 0;
    this.totalImages = 0;
    this.isPlaying = true;
    this.playbackSpeed = 1; // Normal speed
    this.isInitialized = false;
    this.keyboardShortcutsEnabled = true;
    this.hideTimeout = null;
    this.hideDelay = 3000; // 3 seconds
    this.container = imageLoader.image.parentElement;
    
    // DOM Elements - Use existing HTML elements
      this.elements = {
          controls: null,
          navPrev: null,
          navNext: null,
          playButton: null,
          progressBar: null,
          imageCounter: null,
          thumbnailNav: null,
          keyboardHints: null
      };
    
    // Bind methods
      this.handlePrevClick = this.handlePrevClick.bind(this);
      this.handleNextClick = this.handleNextClick.bind(this);
      this.handlePlaybackClick = this.handlePlaybackClick.bind(this);
      this.handleThumbnailClick = this.handleThumbnailClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseEnter = this.handleMouseEnter.bind(this);
      this.handleMouseLeave = this.handleMouseLeave.bind(this);
      this.handleControlsMouseEnter = this.handleControlsMouseEnter.bind(this);
      this.handleControlsMouseLeave = this.handleControlsMouseLeave.bind(this);
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the navigation controller for Swiper
   */
  init() {
    imageLogger.time("ImageNavigationController initialization (Swiper)");
    
    try {
      this.cacheElements();
      this.setupEventListeners();
      this.setupKeyboardShortcuts();
      this.isInitialized = true;
      
      // Initial update
      this.updateTotalImages();
      this.updateUI();
      
      // Show keyboard hints briefly
      this.showKeyboardHints();
      
      // Listen to Swiper events
      this.setupSwiperEventListeners();
        // Show controls initially for a moment
        this.showControls();
        this.startHideTimer();
      
      imageLogger.info("ImageNavigationController initialized successfully for Swiper");
      imageLogger.timeEnd("ImageNavigationController initialization (Swiper)");
    } catch (error) {
      imageLogger.error("Failed to initialize ImageNavigationController", error);
    }
    finally {
        imageLogger.timeEnd("ImageNavigationController initialization (Swiper)");

    }
  }
  
  /**
   * Cache DOM elements that already exist in HTML
   */
  cacheElements() {
    this.elements = {
      controls: this.container.querySelector('.nav-controls'),
      navPrev: this.container.querySelector('.nav-btn.prev'),
      navNext: this.container.querySelector('.nav-btn.next'),
      playButton: this.container.querySelector('.playback-btn'),
      progressBar: this.container.querySelector('.rotation-progress .progress-bar'),
      imageCounter: this.container.querySelector('.image-counter'),
      thumbnailNav: this.container.querySelector('.thumbnail-nav'),
      keyboardHints: document.querySelector('.keyboard-hints'),
    };
    
    imageLogger.debug("Navigation elements cached for Swiper", {
      elementsFound: Object.keys(this.elements).filter(key => !!this.elements[key]).length,
      totalElements: Object.keys(this.elements).length
    });
  }
  
  /**
   * Setup event listeners for Swiper navigation
   */
  setupEventListeners() {
    imageLogger.time("Navigation event listeners setup (Swiper)");
    
    // Navigation buttons - use Swiper's built-in navigation
    if (this.elements.navPrev) {
      this.elements.navPrev.addEventListener('click', this.handlePrevClick);
    }
    
    if (this.elements.navNext) {
      this.elements.navNext.addEventListener('click', this.handleNextClick);
    }
    
      // Playback button
      if (this.elements.playButton) {
          this.elements.playButton.addEventListener('click', this.handlePlaybackClick);
      }
    
    // Thumbnail navigation
    if (this.elements.thumbnailNav) {
      this.elements.thumbnailNav.addEventListener('click', this.handleThumbnailClick);
    }
    
    // Mouse events for showing/hiding controls
    if (this.container || this.elements.controls) {
// Show controls on mouse enter/touch
        this.container.addEventListener('mousemove', this.handleMouseMove);
        this.container.addEventListener('mouseenter', this.handleMouseEnter);
        this.container.addEventListener('mouseleave', this.handleMouseLeave);

        // Touch events for mobile
        this.container.addEventListener('touchstart', () => {
            this.showControls();
            this.startHideTimer();
        }, { passive: true });

        this.container.addEventListener('touchmove', () => {
            this.resetHideTimer();
        }, { passive: true });
    }

      // Controls mouse events
      if (this.elements.controls) {
          this.elements.controls.addEventListener('mouseenter', this.handleControlsMouseEnter);
          this.elements.controls.addEventListener('mouseleave', this.handleControlsMouseLeave);
      }
    
    imageLogger.timeEnd("Navigation event listeners setup (Swiper)");
  }
  
  /**
   * Setup Swiper event listeners
   */
  setupSwiperEventListeners() {
    if (!this.imageLoader || !this.imageLoader.image) return;
    
    // Listen to Swiper custom events
    this.imageLoader.image.addEventListener('swiper:slideChange', (e) => {
      this.currentIndex = e.detail.index;
      this.updateUI();
    });
    
    this.imageLoader.image.addEventListener('swiper:autoplayStart', () => {
      this.isPlaying = true;
      this.updatePlaybackButtons();
    });
    
    this.imageLoader.image.addEventListener('swiper:autoplayStop', () => {
      this.isPlaying = false;
      this.updatePlaybackButtons();
    });
    
    // Also listen to document events
    document.addEventListener('swiper:slideChange', (e) => {
      if (e.detail.swiper === this.imageLoader.swiper) {
        this.currentIndex = e.detail.index;
        this.updateUI();
      }
    });
    
    imageLogger.debug("Swiper event listeners setup");
  }
  
  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    if (this.keyboardShortcutsEnabled) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }
    handleMouseMove() {
        this.showControls();
        this.resetHideTimer();
    }

    handleMouseEnter() {
        this.showControls();
        this.resetHideTimer();
    }

    handleMouseLeave() {
        // Only hide if mouse is not over controls
        if (!this.isMouseOverControls) {
            this.startHideTimer();
        }
    }

    handleControlsMouseEnter() {
        this.isMouseOverControls = true;
        this.showControls();
        this.cancelHideTimer();
    }

    handleControlsMouseLeave() {
        this.isMouseOverControls = false;
        this.startHideTimer();
    }
  
  /**
   * Handle previous button click
   */
  async handlePrevClick() {
    imageLogger.debug("Previous button clicked");
    this.animateButton(this.elements.navPrev);
    
    // Navigate to previous image using Swiper
    await this.previousImage();
    
    // Update UI
    this.updateUI();
      this.showControls();
      this.resetHideTimer();
  }
  
  /**
   * Handle next button click
   */
  async handleNextClick() {
    imageLogger.debug("Next button clicked");
    this.animateButton(this.elements.navNext);
    
    // Navigate to next image using Swiper
    await this.nextImage();
    
    // Update UI
    this.updateUI();

    this.showControls();
      this.resetHideTimer();
  }
  
  /**
   * Handle playback button click
   */
  handlePlaybackClick() {
    imageLogger.debug("Playback button clicked");
    
    // Toggle play/pause using Swiper
    if (this.isPlaying) {
      this.pauseRotation();
    } else {
      this.resumeRotation();
    }
    
    // Update UI
    this.updateUI();
      this.showControls();
      this.resetHideTimer();
  }
  
  /**
   * Handle thumbnail click
   */
  async handleThumbnailClick(event) {
    const thumbnail = event.target.closest('.thumbnail-dot');
    if (!thumbnail) return;
    
    const index = Array.from(this.elements.thumbnailNav.children).indexOf(thumbnail);
    if (index >= 0 && index !== this.currentIndex) {
      imageLogger.debug("Thumbnail clicked", { index });
      this.animateButton(thumbnail);
      
      // Jump to selected image using Swiper
      await this.jumpToImage(index);
      
      // Update UI
      this.updateUI();
        this.showControls();
        this.resetHideTimer();
    }
  }
  
  /**
   * Handle keyboard navigation
   */
  handleKeyDown(event) {
    if (!this.keyboardShortcutsEnabled) return;
    
    // Don't trigger if user is typing in an input
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      return;
    }
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'Left':
        event.preventDefault();
        imageLogger.debug("Left arrow key pressed");
        this.handlePrevClick();
        break;
        
      case 'ArrowRight':
      case 'Right':
        event.preventDefault();
        imageLogger.debug("Right arrow key pressed");
        this.handleNextClick();
        break;
        
      case ' ':
      case 'Spacebar':
        if (event.target === document.body || event.target === this.imageLoader.image) {
          event.preventDefault();
          imageLogger.debug("Space bar pressed");
          this.handlePlaybackClick();
        }
        break;
        
      case 'Escape':
        this.hideKeyboardHints();
        break;
    }
  }
  
  /**
   * Navigate to previous image using Swiper
   */
  async previousImage() {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      imageLogger.warn("No media available for navigation");
      return;
    }
    
    // Use Swiper's slidePrev method
    if (this.imageLoader.swiper) {
      this.imageLoader.swiper.slidePrev();
    } else {
      // Fallback to ImageLoader method
      await this.imageLoader.previousImage();
    }
  }
  
  /**
   * Navigate to next image using Swiper
   */
  async nextImage() {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      imageLogger.warn("No media available for navigation");
      return;
    }
    
    // Use Swiper's slideNext method
    if (this.imageLoader.swiper) {
      this.imageLoader.swiper.slideNext();
    } else {
      // Fallback to ImageLoader method
      await this.imageLoader.nextImage();
    }
  }
  
  /**
   * Jump to specific image using Swiper
   */
  async jumpToImage(index) {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      imageLogger.warn("No media available for navigation");
      return;
    }
    
    if (index >= 0 && index < this.imageLoader.mediaData.media.length) {
      // Use Swiper's slideToLoop method
      if (this.imageLoader.swiper) {
        this.imageLoader.swiper.slideToLoop(index);
      } else {
        // Fallback to ImageLoader method
        await this.imageLoader.jumpToImage(index);
      }
    }
  }
  
  /**
   * Pause image rotation using Swiper
   */
  pauseRotation() {
    if (!this.isPlaying) return;
    
    imageLogger.debug("Pausing image rotation via Swiper");
    this.isPlaying = false;
    
    // Use ImageLoader's pauseRotation method
    if (this.imageLoader.pauseRotation) {
      this.imageLoader.pauseRotation();
    }
    
    // Update button state
    this.updatePlaybackButtons();
  }
  
  /**
   * Resume image rotation using Swiper
   */
  resumeRotation() {
    if (this.isPlaying) return;
    
    imageLogger.debug("Resuming image rotation via Swiper");
    this.isPlaying = true;
    
    // Use ImageLoader's resumeRotation method
    if (this.imageLoader.resumeRotation) {
      this.imageLoader.resumeRotation();
    }
    
    // Update button state
    this.updatePlaybackButtons();
  }
  
  /**
   * Toggle play/pause state
   */
  togglePlayback() {
    if (this.isPlaying) {
      this.pauseRotation();
    } else {
      this.resumeRotation();
    }
    this.updateUI();
  }
  
  /**
   * Update all UI elements
   */
  updateUI() {
    this.updateTotalImages();
    this.updateImageCounter();
    this.updatePlaybackButtons();
    this.updateThumbnailNav();
    this.updateNavigationButtons();
  }
  
  /**
   * Update total images count
   */
  updateTotalImages() {
    if (this.imageLoader?.mediaData?.media) {
      this.totalImages = this.imageLoader.mediaData.media.length;
    }
  }
  
  /**
   * Update image counter
   */
  updateImageCounter() {
    if (!this.elements.imageCounter) return;
    
    const currentSpan = this.elements.imageCounter.querySelector('.current');
    const totalSpan = this.elements.imageCounter.querySelector('.total');
    
    if (currentSpan) {
      currentSpan.textContent = (this.currentIndex + 1).toString();
    }
    
    if (totalSpan) {
      totalSpan.textContent = this.totalImages.toString();
    }
    
    // Update aria label
    this.elements.imageCounter.setAttribute(
      'aria-label',
      `Image ${this.currentIndex + 1} of ${this.totalImages}`
    );
    
    imageLogger.debug("Image counter updated", {
      current: this.currentIndex + 1,
      total: this.totalImages
    });
  }
  
  /**
   * Update playback button state for Swiper
   */
  updatePlaybackButtons() {
      if (this.elements.playButton) {
          const icon = this.elements.playButton.querySelector('i');
          if (icon) {
              icon.className = this.isPlaying ? 'fa fa-pause' : 'fa fa-play';
          }
          this.elements.playButton.setAttribute('data-tooltip', this.isPlaying ? 'Pause (Space)' : 'Play (Space)');
          this.elements.playButton.setAttribute('aria-label', this.isPlaying ? 'Pause slideshow' : 'Play slideshow');
          this.elements.playButton.classList.toggle('playing', this.isPlaying);
          this.elements.playButton.classList.toggle('paused', !this.isPlaying);
      }
  }
  
  /**
   * Update thumbnail navigation for Swiper
   */
  updateThumbnailNav() {
    if (!this.elements.thumbnailNav) return;
    
    const media = this.imageLoader?.mediaData?.media;
    if (!media || !Array.isArray(media)) return;
    
    // Check if thumbnails already exist (created by ImageLoader)
    const existingThumbnails = this.elements.thumbnailNav.querySelectorAll('.thumbnail-dot');
    
    if (existingThumbnails.length === 0) {
      // Create thumbnails if they don't exist
      media.forEach((_, index) => {
        const thumbnail = document.createElement('button');
        thumbnail.className = `thumbnail-dot ${index === this.currentIndex ? 'active' : ''}`;
        thumbnail.setAttribute('role', 'tab');
        thumbnail.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
        thumbnail.setAttribute('aria-label', `Image ${index + 1}`);
        thumbnail.setAttribute('data-index', index);
        thumbnail.setAttribute('tabindex', index === this.currentIndex ? '0' : '-1');
        
        // Add click handler
        thumbnail.addEventListener('click', (e) => {
          e.preventDefault();
          this.jumpToImage(index);
        });
        
        this.elements.thumbnailNav.appendChild(thumbnail);
      });
      
      imageLogger.debug("Thumbnail navigation created", {
        thumbnails: media.length
      });
    } else {
      // Update existing thumbnails
      existingThumbnails.forEach((dot, index) => {
        const isActive = index === this.currentIndex;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', isActive.toString());
        dot.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    }
    
    // Update ARIA attributes
    this.elements.thumbnailNav.setAttribute(
      'aria-label',
      `Image thumbnails, ${this.currentIndex + 1} of ${media.length} selected`
    );
  }
  
  /**
   * Update navigation buttons state
   */
  updateNavigationButtons() {
    const swiper = this.imageLoader.swiper;
    
    // Update previous button
    if (this.elements.navPrev) {
      const isBeginning = swiper ? swiper.isBeginning && !swiper.params.loop : this.currentIndex === 0;
      this.elements.navPrev.disabled = isBeginning && this.totalImages > 1;
      this.elements.navPrev.setAttribute('aria-disabled', isBeginning.toString());
      
      if (isBeginning && this.totalImages > 1) {
        this.elements.navPrev.classList.add('disabled');
      } else {
        this.elements.navPrev.classList.remove('disabled');
      }
    }
    
    // Update next button
    if (this.elements.navNext) {
      const isEnd = swiper ? swiper.isEnd && !swiper.params.loop : this.currentIndex === this.totalImages - 1;
      this.elements.navNext.disabled = isEnd && this.totalImages > 1;
      this.elements.navNext.setAttribute('aria-disabled', isEnd.toString());
        this.elements.navNext.classList.toggle('disabled', isEnd && this.totalImages > 1);

    }
  }
  
  /**
   * Show navigation controls
   */
  showControls() {
      if (this.elements.controls) {
          this.elements.controls.classList.add('show-controls');
      }
  }
  
  /**
   * Hide navigation controls
   */
  hideControls() {
      if (this.elements.controls) {
          this.elements.controls.classList.remove('show-controls');
      }
  }

    resetHideTimer() {
        this.cancelHideTimer();
        this.startHideTimer();
    }

    startHideTimer() {
        this.cancelHideTimer();

        // Don't start timer if mouse is over controls
        if (this.isMouseOverControls) {
            return;
        }

        this.hideTimeout = setTimeout(() => {
            this.hideControls();
        }, this.hideDelay);
    }

    cancelHideTimer() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
  
  /**
   * Show keyboard hints
   */
  showKeyboardHints() {
    if (!this.elements.keyboardHints) return;
    
    imageLogger.debug("Showing keyboard hints");
    
    this.elements.keyboardHints.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideKeyboardHints();
    }, 5000);
  }
  
  /**
   * Hide keyboard hints
   */
  hideKeyboardHints() {
    if (!this.elements.keyboardHints) return;
    
    this.elements.keyboardHints.classList.remove('show');
  }
  
  /**
   * Animate button on click
   */
  animateButton(button) {
    if (!button) return;
    
    button.style.transform = 'scale(0.9)';
    
    setTimeout(() => {
      button.style.transform = 'scale(1.1)';
      
      setTimeout(() => {
        button.style.transform = '';
      }, 150);
    }, 150);
  }
  
  /**
   * Set rotation speed - delegate to ImageLoader
   */
  setRotationSpeed(speed) {
    if (this.imageLoader.setRotationSpeed) {
      this.imageLoader.setRotationSpeed(speed);
    }
  }
  
  /**
   * Set playback speed multiplier - adjust Swiper autoplay delay
   */
  setPlaybackSpeed(multiplier) {
    if (multiplier < 0.25 || multiplier > 4) {
      imageLogger.warn("Playback speed must be between 0.25 and 4", { multiplier });
      return;
    }
    
    imageLogger.debug("Setting playback speed multiplier", { multiplier });
    this.playbackSpeed = multiplier;
    
    // Calculate effective rotation speed
    const currentDelay = this.imageLoader.config?.rotationDelay || 5000;
    const effectiveSpeed = currentDelay / multiplier;
    
    // Update image loader speed
    if (this.imageLoader.setRotationSpeed) {
      this.imageLoader.setRotationSpeed(effectiveSpeed);
    }
    
    this.updateUI();
  }
  
  /**
   * Get current navigation state
   */
  getState() {
    const swiperState = this.imageLoader.getRotationState?.() || {};
    
    return {
      currentIndex: this.currentIndex,
      totalImages: this.totalImages,
      isPlaying: this.isPlaying,
      playbackSpeed: this.playbackSpeed,
      ...swiperState
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    imageLogger.time("ImageNavigationController cleanup (Swiper)");
    
    // Remove event listeners
    if (this.elements.navPrev) {
      this.elements.navPrev.removeEventListener('click', this.handlePrevClick);
    }
    
    if (this.elements.navNext) {
      this.elements.navNext.removeEventListener('click', this.handleNextClick);
    }
    
    if (this.elements.playButton) {
      this.elements.playButton.removeEventListener('click', this.handlePlaybackClick);
    }
    
    if (this.elements.pauseButton) {
      this.elements.pauseButton.removeEventListener('click', this.handlePlaybackClick);
    }
    
    if (this.elements.thumbnailNav) {
      this.elements.thumbnailNav.removeEventListener('click', this.handleThumbnailClick);
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Remove Swiper event listeners
    if (this.imageLoader && this.imageLoader.image) {
      const imageElement = this.imageLoader.image;
      const listeners = imageElement.__swiperEventListeners || [];
      listeners.forEach(({ event, handler }) => {
        imageElement.removeEventListener(event, handler);
      });
      delete imageElement.__swiperEventListeners;
    }
    
    this.isInitialized = false;
    imageLogger.info("ImageNavigationController destroyed for Swiper");
    imageLogger.timeEnd("ImageNavigationController cleanup (Swiper)");
  }
}

/**
 * SCROLL ANIMATOR - Lightweight, performant scroll-triggered animations
 * Focuses on smooth performance, minimal overhead, and perfect integration with existing CSS
 * @class ScrollAnimator
 */
class ScrollAnimator {
    constructor(options = {}) {
        scrollLogger.time("ScrollAnimator constructor");

        // Lightweight configuration
        this.config = {
            // Core settings
            threshold: 0.1,               // When to trigger (0-1)
            rootMargin: '0px 0px -50px 0px', // Offset from viewport
            triggerOnce: true,            // Animate only once
            staggerDelay: 100,            // Delay between elements

            // Performance
            useIntersectionObserver: true, // Use IO if available
            debounceScroll: true,          // Debounce scroll events
            debounceDelay: 100,            // Debounce delay in ms

            // Animation control
            enableProgressBar: true,       // Show scroll progress
            enableStagger: true,           // Enable staggered animations

            // Default animation mappings
            animationMap: {
                'fade': 'fadeIn',
                'fade-up': 'fadeInUp',
                'fade-down': 'fadeInDown',
                'fade-left': 'fadeInLeft',
                'fade-right': 'fadeInRight',
                'slide-up': 'slideInBottom',
                'slide-left': 'slideInLeft',
                'slide-right': 'slideInRight',
                'scale': 'fadeInScale',
                'zoom': 'zoomIn',
                'bounce': 'bounceIn',
                'flip-x': 'flipInX',
                'flip-y': 'flipInY',
                'rotate': 'rotateIn',
                'blur': 'fadeInBlur'
            },

            // Merge user options
            ...options
        };

        // Core state
        this.elements = [];
        this.observer = null;
        this.isInitialized = false;
        this.lastScrollY = 0;
        this.scrollDirection = 'down';
        this.animatedCount = 0;

        // Performance tracking
        this.performance = {
            totalElements: 0,
            animatedElements: 0,
            startTime: 0
        };

        // Bind methods (only essential ones)
        this.handleIntersection = this.handleIntersection.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.debouncedScroll = this.debounce(this.handleScroll, this.config.debounceDelay);

        scrollLogger.debug("ScrollAnimator created", {
            useIO: this.config.useIntersectionObserver,
            threshold: this.config.threshold
        });

        scrollLogger.timeEnd("ScrollAnimator constructor");
    }

    /**
     * Initialize with minimal overhead
     */
    init() {
        if (this.isInitialized) {
            scrollLogger.debug("Already initialized");
            return;
        }

        scrollLogger.time("ScrollAnimator init");

        try {
            this.performance.startTime = performance.now();

            // Setup essentials
            this.setupElements();
            this.setupObserver();
            this.setupProgressBar();

            // Initial visibility check
            this.checkInitialViewport();

            this.isInitialized = true;

            scrollLogger.info("ScrollAnimator ready", {
                elements: this.elements.length,
                observerActive: !!this.observer
            });

        } catch (error) {
            scrollLogger.error("Init failed", error);
            this.fallbackSetup();
        } finally {
            scrollLogger.timeEnd("ScrollAnimator init");
        }
    }

    /**
     * Setup elements with minimal processing
     */
    setupElements() {
        scrollLogger.time("Setup elements");

        // Select elements with data attributes
        const selectors = [
            '[data-scroll-animate]',
            '.scroll-animate',
            '[data-animate]'
        ];

        // Combine selectors
        const selectorString = selectors.join(', ');
        const foundElements = document.querySelectorAll(selectorString);

        // Process elements
        this.elements = Array.from(foundElements)
            .filter(el => {
                // Skip hidden elements
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((el, index) => {
                // Get animation type
                let animationType = el.dataset.scrollAnimate ||
                    el.dataset.animate ||
                    'fade-up';

                // Map to actual animation class
                animationType = this.config.animationMap[animationType] || 'fadeInUp';

                // Add base animation class
                el.classList.add('scroll-animate');

                return {
                    element: el,
                    index: index,
                    animation: animationType,
                    delay: parseInt(el.dataset.animationDelay) ||
                        (this.config.enableStagger ? index * this.config.staggerDelay : 0),
                    threshold: parseFloat(el.dataset.threshold) || this.config.threshold,
                    animated: false,
                    priority: el.dataset.priority || 'normal'
                };
            });

        // Sort by priority if needed
        if (this.elements.some(el => el.priority !== 'normal')) {
            this.elements.sort((a, b) => {
                const order = { high: 0, normal: 1, low: 2 };
                return order[a.priority] - order[b.priority];
            });
        }

        this.performance.totalElements = this.elements.length;

        scrollLogger.debug("Elements prepared", {
            count: this.elements.length,
            hasStagger: this.config.enableStagger
        });

        scrollLogger.timeEnd("Setup elements");
    }

    /**
     * Setup Intersection Observer (if available and enabled)
     */
    setupObserver() {
        if (!this.config.useIntersectionObserver || !('IntersectionObserver' in window)) {
            scrollLogger.debug("Using scroll fallback");
            this.setupScrollFallback();
            return;
        }

        try {
            this.observer = new IntersectionObserver(
                this.handleIntersection,
                {
                    threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                    rootMargin: this.config.rootMargin
                }
            );

            // Observe each element
            this.elements.forEach(el => {
                this.observer.observe(el.element);
            });

            scrollLogger.debug("Observer active", {
                elements: this.elements.length,
                threshold: this.config.threshold
            });

        } catch (error) {
            scrollLogger.error("Observer failed", error);
            this.setupScrollFallback();
        }
    }

    /**
     * Setup scroll fallback for older browsers
     */
    setupScrollFallback() {
        if (this.config.debounceScroll) {
            window.addEventListener('scroll', this.debouncedScroll, { passive: true });
        } else {
            window.addEventListener('scroll', this.handleScroll, { passive: true });
        }

        scrollLogger.debug("Scroll fallback active");
    }

    /**
     * Setup progress bar if enabled
     */
    setupProgressBar() {
        if (!this.config.enableProgressBar) return;

        // Check if already exists
        if (document.querySelector('.scroll-progress-bar')) return;

        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress-bar';
        progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary, #667eea), var(--secondary, #764ba2));
            z-index: 9999;
            transition: width 0.1s ease;
        `;

        document.body.appendChild(progressBar);

        // Update on scroll
        const updateProgress = () => {
            const scrollTop = window.pageYOffset;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollTop / scrollHeight) * 100;

            progressBar.style.width = `${progress}%`;
        };

        window.addEventListener('scroll', this.debounce(updateProgress, 16), { passive: true });

        scrollLogger.debug("Progress bar added");
    }

    /**
     * Handle intersection events
     */
    handleIntersection(entries) {
        entries.forEach(entry => {
            const element = entry.target;
            const elementData = this.elements.find(el => el.element === element);

            if (!elementData || elementData.animated) return;

            if (entry.isIntersecting && entry.intersectionRatio >= elementData.threshold) {
                this.triggerAnimation(elementData);

                // Unobserve if triggerOnce is true
                if (this.config.triggerOnce) {
                    this.observer.unobserve(element);
                }
            }
        });
    }

    /**
     * Handle scroll events (fallback)
     */
    handleScroll() {
        const currentScrollY = window.pageYOffset;
        this.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
        this.lastScrollY = currentScrollY;

        const viewportHeight = window.innerHeight;
        const scrollPosition = currentScrollY;

        this.elements.forEach(elementData => {
            if (elementData.animated) return;

            const rect = elementData.element.getBoundingClientRect();
            const elementTop = rect.top + scrollPosition;
            const elementBottom = rect.bottom + scrollPosition;

            // Check if element is in viewport
            if (elementBottom > scrollPosition && elementTop < scrollPosition + viewportHeight) {
                const visibleHeight = Math.min(elementBottom, scrollPosition + viewportHeight) -
                    Math.max(elementTop, scrollPosition);
                const visibilityRatio = visibleHeight / rect.height;

                if (visibilityRatio >= elementData.threshold) {
                    this.triggerAnimation(elementData);
                }
            }
        });
    }

    /**
     * Trigger animation with delay
     */
    triggerAnimation(elementData) {
        if (elementData.animated) return;

        elementData.animated = true;
        this.performance.animatedElements++;

        // Apply animation with delay
        setTimeout(() => {
            this.applyAnimation(elementData);
        }, elementData.delay);
    }

    /**
     * Apply animation to element (minimal DOM manipulation)
     */
    applyAnimation(elementData) {
        const { element, animation } = elementData;

        // Add animation classes
        element.classList.add('animated', 'in-viewport');

        // Add specific animation class if not using CSS transitions
        if (animation && !element.dataset.useCssTransition) {
            element.classList.add(animation);
        }

        // Dispatch event
        this.dispatchAnimationEvent(element, 'animation:start');

        // Track completion
        const handleEnd = () => {
            element.classList.add('animation-completed');
            this.dispatchAnimationEvent(element, 'animation:end');

            element.removeEventListener('animationend', handleEnd);
            element.removeEventListener('transitionend', handleEnd);
        };

        element.addEventListener('animationend', handleEnd, { once: true });
        element.addEventListener('transitionend', handleEnd, { once: true });

        scrollLogger.debug("Animation applied", {
            element: element.tagName,
            animation: animation,
            delay: elementData.delay
        });
    }

    /**
     * Check initial viewport (for elements already visible)
     */
    checkInitialViewport() {
        const viewportHeight = window.innerHeight;
        const scrollPosition = window.pageYOffset;

        this.elements.forEach(elementData => {
            if (elementData.animated) return;

            const rect = elementData.element.getBoundingClientRect();
            const elementTop = rect.top + scrollPosition;
            const elementBottom = rect.bottom + scrollPosition;

            // Check if element is already in viewport
            if (elementBottom > 0 && elementTop < viewportHeight) {
                const visibleHeight = Math.min(elementBottom, viewportHeight) - Math.max(elementTop, 0);
                const visibilityRatio = visibleHeight / rect.height;

                if (visibilityRatio >= elementData.threshold) {
                    this.triggerAnimation(elementData);
                }
            }
        });
    }

    /**
     * Dispatch animation event
     */
    dispatchAnimationEvent(element, eventName) {
        const event = new CustomEvent(eventName, {
            detail: {
                element: element,
                timestamp: Date.now()
            },
            bubbles: true
        });

        element.dispatchEvent(event);
    }

    /**
     * Fallback setup for when everything fails
     */
    fallbackSetup() {
        scrollLogger.warn("Using fallback setup");

        // Simple fade in for all elements
        this.elements.forEach((elementData, index) => {
            setTimeout(() => {
                elementData.element.style.opacity = '1';
                elementData.element.style.transform = 'none';
                elementData.element.style.transition = 'opacity 0.5s ease';
            }, index * 100);
        });

        this.isInitialized = true;
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Add custom animation mapping
     */
    addAnimation(name, animationClass) {
        this.config.animationMap[name] = animationClass;
        scrollLogger.debug("Animation added", { name, animationClass });
    }

    /**
     * Manually trigger animation for specific element
     */
    triggerElement(selectorOrElement, animationType = null) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (!element) {
            scrollLogger.warn("Element not found", { selector: selectorOrElement });
            return;
        }

        const elementData = this.elements.find(el => el.element === element) || {
            element: element,
            animation: animationType || 'fadeInUp',
            delay: 0,
            animated: false
        };

        if (!elementData.animated) {
            this.applyAnimation(elementData);
        }
    }

    /**
     * Reset element animation
     */
    resetElement(selectorOrElement) {
        const element = typeof selectorOrElement === 'string'
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;

        if (!element) return;

        // Reset classes
        element.classList.remove('animated', 'in-viewport', 'animation-completed');

        // Reset animation classes
        Object.values(this.config.animationMap).forEach(animationClass => {
            element.classList.remove(animationClass);
        });

        // Find and reset in elements array
        const elementData = this.elements.find(el => el.element === element);
        if (elementData) {
            elementData.animated = false;
            this.performance.animatedElements = Math.max(0, this.performance.animatedElements - 1);
        }

        // Re-observe if using observer
        if (this.observer && this.config.triggerOnce) {
            this.observer.observe(element);
        }

        scrollLogger.debug("Element reset", { element: element.tagName });
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            totalElements: this.performance.totalElements,
            animatedElements: this.performance.animatedElements,
            pendingAnimations: this.performance.totalElements - this.performance.animatedElements,
            uptime: performance.now() - this.performance.startTime
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        scrollLogger.debug("Config updated", newConfig);
    }

    /**
     * Clean shutdown
     */
    destroy() {
        scrollLogger.time("ScrollAnimator destroy");

        // Disconnect observer
        if (this.observer) {
            this.observer.disconnect();
        }

        // Remove scroll listeners
        if (this.config.debounceScroll) {
            window.removeEventListener('scroll', this.debouncedScroll);
        } else {
            window.removeEventListener('scroll', this.handleScroll);
        }

        // Remove progress bar
        const progressBar = document.querySelector('.scroll-progress-bar');
        if (progressBar) {
            progressBar.remove();
        }

        // Reset elements
        this.elements.forEach(elementData => {
            elementData.element.classList.remove('scroll-animate');
        });

        // Clear state
        this.elements = [];
        this.observer = null;
        this.isInitialized = false;

        scrollLogger.info("ScrollAnimator destroyed", {
            totalAnimations: this.performance.animatedElements
        });

        scrollLogger.timeEnd("ScrollAnimator destroy");
    }
}

/**
 * SHARE MANAGER - Enhanced social sharing functionality with analytics, fallbacks, and better UX
 * @class ShareManager
 */
class ShareManager {
  constructor(options = {}) {
    shareLogger.time("ShareManager constructor");
    
    this.options = {
      // Default share text
      shareText: "Beautiful Graduation wishes! Send to your loved ones using this website",
      // Fallback copy to clipboard when native sharing fails
      enableClipboardFallback: true,
      // Enable analytics tracking
      enableAnalytics: true,
      // Platform-specific configurations
      platforms: {
        whatsapp: {
          label: "WhatsApp",
          color: "#25D366",
          icon: "fab fa-whatsapp"
        },
        facebook: {
          label: "Facebook",
          color: "#1877F2",
          icon: "fab fa-facebook-f"
        },
        twitter: {
          label: "Twitter",
          color: "#1DA1F2",
          icon: "fab fa-twitter"
        },
        instagram: {
          label: "Instagram",
          color: "#E4405F",
          icon: "fab fa-instagram"
        },
        telegram: {
          label: "Telegram",
          color: "#0088CC",
          icon: "fab fa-telegram"
        },
        clipboard: {
          label: "Copy Link",
          color: "#6C757D",
          icon: "fas fa-link"
        }
      },
      // Animation settings
      animation: {
        duration: 300,
        scale: 0.95
      },
      // Success/error messages
      messages: {
        copied: "Link copied to clipboard!",
        copiedFailed: "Failed to copy link",
        sharingFailed: "Sharing failed. Please try again.",
        notSupported: "Sharing not supported on this device"
      }
    };
    
    // Merge user options
    Object.assign(this.options, options);
    
    // State management
    this.buttons = [];
    this.isInitialized = false;
    this.clipboardSupported = 'clipboard' in navigator;
    this.nativeShareSupported = 'share' in navigator;
    this.shareData = this.prepareShareData();
    
    // Bind methods
    this.handleShare = this.handleShare.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    shareLogger.debug("ShareManager instance created", {
      clipboardSupported: this.clipboardSupported,
      nativeShareSupported: this.nativeShareSupported,
      options: this.options
    });
    
    shareLogger.timeEnd("ShareManager constructor");
    this.init();
  }

  /**
   * Initialize share functionality
   */
  init() {
    if (this.isInitialized) {
      shareLogger.debug("ShareManager already initialized");
      return;
    }

    try {
      shareLogger.time("ShareManager initialization");
      
      // Update share data with current page info
      this.shareData = this.prepareShareData();
      
      this.cacheButtons();
      this.setupListeners();
      this.setupAccessibility();
      
      // Add sharing hints if native sharing is supported
      if (this.nativeShareSupported) {
        this.addNativeShareHint();
      }
      
      this.isInitialized = true;
      shareLogger.info("ShareManager initialized successfully", {
        totalButtons: this.buttons.length,
        nativeShare: this.nativeShareSupported,
        clipboard: this.clipboardSupported
      });
      
      shareLogger.timeEnd("ShareManager initialization");
    } catch (error) {
      shareLogger.error("Failed to initialize share manager", error);
      this.showErrorMessage("Failed to initialize sharing. Please refresh.");
    }
  }

  /**
   * Prepare share data
   */
  prepareShareData() {
    const pageUrl = window.location.href;
    const pageTitle = document.title || "Graduation Wishes";
    
    return {
      title: pageTitle,
      text: this.options.shareText,
      url: pageUrl,
      hashtags: ["Graduation", "Congratulations", "Wishes"],
      via: "GraduationApp"
    };
  }

  /**
   * Cache share buttons with platform detection
   */
  cacheButtons() {
    shareLogger.time("Button caching");
    
    // Find all share buttons
    const buttonElements = document.querySelectorAll(".share-btn, [data-share], [data-platform]");
    
    this.buttons = Array.from(buttonElements)
      .filter(btn => {
        // Ensure button is visible and not disabled
        const style = window.getComputedStyle(btn);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               !btn.disabled;
      })
      .map(btn => {
        // Determine platform from various sources
        const platform = this.detectPlatform(btn);
        
        // Add data attributes for tracking
        btn.dataset.sharePlatform = platform;
        btn.dataset.shareInitialized = "true";
        
        // Add ARIA label if not present
        if (!btn.hasAttribute('aria-label')) {
          const platformConfig = this.options.platforms[platform];
          if (platformConfig) {
            btn.setAttribute('aria-label', `Share on ${platformConfig.label}`);
          }
        }
        
        return {
          element: btn,
          platform: platform,
          originalHTML: btn.innerHTML,
          originalClasses: btn.className
        };
      });
    
    shareLogger.debug("Share buttons cached", {
      buttonCount: this.buttons.length,
      platforms: this.buttons.map(b => b.platform),
      nativeSupport: this.nativeShareSupported
    });
    
    shareLogger.timeEnd("Button caching");
  }

  /**
   * Detect platform from button
   */
  detectPlatform(button) {
    // Check data attributes first
    if (button.dataset.platform) return button.dataset.platform;
    if (button.dataset.share) return button.dataset.share;
    
    // Check class names
    const platformClasses = Object.keys(this.options.platforms);
    const foundClass = platformClasses.find(cls => 
      button.classList.contains(cls) || 
      button.classList.contains(`share-${cls}`)
    );
    
    if (foundClass) return foundClass;
    
    // Default to clipboard
    return 'clipboard';
  }

  /**
   * Setup event listeners with better error handling
   */
  setupListeners() {
    shareLogger.time("Listener setup");
    
    this.buttons.forEach((btnData, index) => {
      const { element, platform } = btnData;
      
      // Remove existing listeners to avoid duplicates
      element.removeEventListener('click', this.handleShare);
      element.removeEventListener('keydown', this.handleKeyDown);
      
      // Add click listener
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        shareLogger.debug("Share button clicked", {
          index,
          platform,
          element: element.tagName,
          classes: element.className
        });
        
        this.handleShare(platform, element);
      });
      
      // Add keyboard listener
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          e.stopPropagation();
          
          shareLogger.debug("Share button keyboard activated", {
            index,
            platform,
            key: e.key
          });
          
          this.handleShare(platform, element);
        }
      });
      
      // Add touch feedback for mobile
      element.addEventListener('touchstart', () => {
        element.classList.add('share-touch-active');
      }, { passive: true });
      
      element.addEventListener('touchend', () => {
        element.classList.remove('share-touch-active');
      }, { passive: true });
    });
    
    // Listen for page visibility changes to update share data
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.shareData = this.prepareShareData();
        shareLogger.debug("Share data refreshed on page visibility change");
      }
    });
    
    shareLogger.debug("Event listeners attached", {
      totalButtons: this.buttons.length
    });
    
    shareLogger.timeEnd("Listener setup");
  }

  /**
   * Setup accessibility features
   */
  setupAccessibility() {
    shareLogger.time("Accessibility setup");
    
    this.buttons.forEach(btnData => {
      const { element, platform } = btnData;
      
      // Ensure proper role
      if (element.getAttribute('role') !== 'button') {
        element.setAttribute('role', 'button');
      }
      
      // Ensure tabindex
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
      
      // Add platform-specific instructions
      const platformConfig = this.options.platforms[platform];
      if (platformConfig) {
        const title = element.getAttribute('title') || 
                     element.getAttribute('aria-label') || 
                     `Share on ${platformConfig.label}`;
        
        element.setAttribute('title', title);
        element.setAttribute('aria-label', title);
      }
    });
    
    shareLogger.debug("Accessibility setup completed");
    shareLogger.timeEnd("Accessibility setup");
  }

  /**
   * Handle share action with improved logic
   */
  async handleShare(platform, buttonElement) {
    shareLogger.time(`Share to ${platform}`);
    
    try {
      // Animate button
      this.animateButton(buttonElement);
      
      // Track analytics if enabled
      if (this.options.enableAnalytics) {
        this.trackShareEvent(platform);
      }
      
      // Try native sharing first (if supported and not a specific platform)
      if (this.nativeShareSupported && platform === 'native') {
        await this.shareNative();
        return;
      }
      
      // Use platform-specific sharing
      const success = await this.shareToPlatform(platform, buttonElement);
      
      if (success) {
        this.showSuccessFeedback(buttonElement, platform);
      } else {
        this.showErrorFeedback(buttonElement, platform);
      }
      
    } catch (error) {
      shareLogger.error("Share action failed", {
        platform,
        error: error.message,
        element: buttonElement?.tagName
      });
      
      this.showErrorFeedback(buttonElement, platform);
      
      // Fallback to clipboard if enabled
      if (this.options.enableClipboardFallback && this.clipboardSupported) {
        setTimeout(() => {
          this.shareToClipboard(buttonElement);
        }, 500);
      }
      
    } finally {
      shareLogger.timeEnd(`Share to ${platform}`);
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyDown(e) {
    // Allow space/enter to trigger share
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
      e.preventDefault();
      const button = e.target;
      const platform = button.dataset.sharePlatform || 'clipboard';
       this.handleShare(platform, button);
    }
  }

  /**
   * Share to specific platform with improved URL generation
   */
  async shareToPlatform(platform, buttonElement) {
    shareLogger.time(`Platform share: ${platform}`);
    
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${this.shareData.text} ${this.shareData.url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareData.url)}&quote=${encodeURIComponent(this.shareData.text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(this.shareData.text)}&url=${encodeURIComponent(this.shareData.url)}&hashtags=${this.shareData.hashtags.join(',')}&via=${this.shareData.via}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(this.shareData.url)}&text=${encodeURIComponent(this.shareData.text)}`,
      instagram: `https://www.instagram.com/`, // Instagram doesn't have direct share URLs
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.shareData.url)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(this.shareData.url)}&description=${encodeURIComponent(this.shareData.text)}`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(this.shareData.url)}&title=${encodeURIComponent(this.shareData.text)}`
    };
    
    const url = shareUrls[platform];
    
    if (!url) {
      shareLogger.warn("No share URL for platform", { platform });
      
      // Fallback to clipboard
      if (this.clipboardSupported) {
        return await this.shareToClipboard(buttonElement);
      }
      
      return false;
    }
    
    // Special handling for Instagram (no direct sharing)
    if (platform === 'instagram') {
      this.showMessage("Open Instagram app to share", buttonElement);
      return false;
    }
    
    // Open share window
    const shareWindow = window.open(
      url,
      'share-dialog',
      `width=600,height=400,left=${window.screenX + 100},top=${window.screenY + 100},noopener,noreferrer`
    );
    
    // Focus the window
    if (shareWindow) {
      shareWindow.focus();
      
      // Check if window was blocked
      setTimeout(() => {
        if (shareWindow.closed || !shareWindow.location.href) {
          shareLogger.warn("Share window was blocked", { platform });
          this.showMessage("Pop-up blocked. Please allow pop-ups to share.", buttonElement);
        }
      }, 1000);
      
      shareLogger.info("Share window opened", { platform, url });
      return true;
    }
    
    shareLogger.warn("Failed to open share window", { platform });
    return false;
  }

  /**
   * Native Web Share API
   */
  async shareNative() {
    try {
      if (!this.nativeShareSupported) {
        throw new Error("Native sharing not supported");
      }
      
      await navigator.share({
        title: this.shareData.title,
        text: this.shareData.text,
        url: this.shareData.url
      });
      
      shareLogger.info("Native share successful");
      return true;
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        shareLogger.error("Native share failed", error);
      }
      return false;
    }
  }

  /**
   * Copy to clipboard with fallback
   */
  async shareToClipboard(buttonElement) {
    try {
      // Try modern clipboard API first
      if (this.clipboardSupported) {
        await navigator.clipboard.writeText(this.shareData.url);
        shareLogger.info("Clipboard write successful");
        
        this.showMessage(this.options.messages.copied, buttonElement, 'success');
        return true;
      }
      
      // Fallback to legacy method
      const textArea = document.createElement('textarea');
      textArea.value = this.shareData.url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        shareLogger.info("Legacy clipboard write successful");
        this.showMessage(this.options.messages.copied, buttonElement, 'success');
        return true;
      }
      
      throw new Error("Clipboard write failed");
      
    } catch (error) {
      shareLogger.error("Clipboard write failed", error);
      this.showMessage(this.options.messages.copiedFailed, buttonElement, 'error');
      return false;
    }
  }

  /**
   * Animate button with improved feedback
   */
  animateButton(button) {
    if (!button) return;
    
    shareLogger.debug("Animating button");
    
    // Store original transform
    const originalTransform = button.style.transform;
    const originalTransition = button.style.transition;
    
    // Apply animation
    button.style.transition = `transform ${this.options.animation.duration}ms ease`;
    button.style.transform = `scale(${this.options.animation.scale})`;
    
    // Reset after animation
    setTimeout(() => {
      button.style.transform = originalTransform;
      
      // Remove transition after reset
      setTimeout(() => {
        button.style.transition = originalTransition;
      }, this.options.animation.duration);
    }, this.options.animation.duration);
    
    // Add visual feedback class
    button.classList.add('share-active');
    setTimeout(() => {
      button.classList.remove('share-active');
    }, this.options.animation.duration * 2);
  }

  /**
   * Show success feedback
   */
  showSuccessFeedback(button, platform) {
    const platformConfig = this.options.platforms[platform];
    if (!platformConfig) return;
    
    // Add success class
    button.classList.add('share-success');
    
    // Temporarily change button content
    const originalHTML = button.innerHTML;
    button.innerHTML = `<i class="fas fa-check"></i> Shared!`;
    
    // Reset after delay
    setTimeout(() => {
      button.classList.remove('share-success');
      button.innerHTML = originalHTML;
    }, 2000);
    
    shareLogger.debug("Success feedback shown", { platform });
  }

  /**
   * Show error feedback
   */
  showErrorFeedback(button, platform) {
    button.classList.add('share-error');
    
    setTimeout(() => {
      button.classList.remove('share-error');
    }, 1000);
    
    shareLogger.debug("Error feedback shown", { platform });
  }

  /**
   * Show temporary message
   */
  showMessage(message, element, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `share-message share-message-${type}`;
    messageEl.textContent = message;
    messageEl.setAttribute('role', 'alert');
    messageEl.setAttribute('aria-live', 'polite');
    
    // Position near the button
    const rect = element.getBoundingClientRect();
    messageEl.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 10}px;
      left: ${rect.left}px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInUp 0.3s ease;
    `;
    
    document.body.appendChild(messageEl);
    
    // Remove after delay
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          if (messageEl.parentNode) {
            messageEl.parentNode.removeChild(messageEl);
          }
        }, 300);
      }
    }, 3000);
  }

  /**
   * Add native share hint
   */
  addNativeShareHint() {
    // Check if we should show native share button
    if (!this.nativeShareSupported || 
        document.querySelector('.share-native') ||
        !this.buttons.length) {
      return;
    }
    
    // Create native share button
    const nativeButton = document.createElement('button');
    nativeButton.className = 'share-btn share-native';
    nativeButton.innerHTML = '<i class="fas fa-share-alt"></i> Share';
    nativeButton.setAttribute('aria-label', 'Share using device options');
    nativeButton.setAttribute('title', 'Share using device options');
    
    // Insert near other share buttons
    const firstButton = this.buttons[0]?.element;
    if (firstButton && firstButton.parentNode) {
      firstButton.parentNode.insertBefore(nativeButton, firstButton.nextSibling);
      
      // Add to buttons array
      this.buttons.push({
        element: nativeButton,
        platform: 'native',
        originalHTML: nativeButton.innerHTML,
        originalClasses: nativeButton.className
      });
      
      // Add event listener
      nativeButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleShare('native', nativeButton);
      });
      
      shareLogger.debug("Native share button added");
    }
  }

  /**
   * Track share events for analytics
   */
  trackShareEvent(platform) {
    if (!this.options.enableAnalytics) return;
    
    const eventData = {
      event: 'share',
      platform: platform,
      url: this.shareData.url,
      timestamp: new Date().toISOString()
    };
    
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'share', {
        method: platform,
        content_type: 'page',
        item_id: this.shareData.url
      });
    }
    
    // Custom event dispatch
    const shareEvent = new CustomEvent('share', {
      detail: eventData,
      bubbles: true
    });
    
    document.dispatchEvent(shareEvent);
    
    shareLogger.debug("Share event tracked", eventData);
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    console.error('ShareManager Error:', message);
    // Could implement a toast notification system here
  }

  /**
   * Update share data dynamically
   */
  updateShareData(newData) {
    this.shareData = { ...this.shareData, ...newData };
    shareLogger.debug("Share data updated", this.shareData);
  }

  /**
   * Get current share data
   */
  getShareData() {
    return { ...this.shareData };
  }

  /**
   * Get platform configuration
   */
  getPlatformConfig(platform) {
    return this.options.platforms[platform] || null;
  }

  /**
   * Cleanup resources with improved handling
   */
  destroy() {
    shareLogger.time("ShareManager cleanup");
    
    try {
      // Remove all event listeners
      this.buttons.forEach((btnData, index) => {
        const { element } = btnData;
        
        // Remove listeners
        element.removeEventListener('click', this.handleShare);
        element.removeEventListener('keydown', this.handleKeyDown);
        element.removeEventListener('touchstart', () => {});
        element.removeEventListener('touchend', () => {});
        
        // Remove data attributes
        delete element.dataset.sharePlatform;
        delete element.dataset.shareInitialized;
        
        // Restore original state if modified
        if (btnData.originalHTML) {
          element.innerHTML = btnData.originalHTML;
        }
        if (btnData.originalClasses) {
          element.className = btnData.originalClasses;
        }
        
        shareLogger.debug("Button cleaned up", { index });
      });
      
      // Remove native share button if added
      const nativeButton = document.querySelector('.share-native');
      if (nativeButton && nativeButton.parentNode) {
        nativeButton.parentNode.removeChild(nativeButton);
      }
      
      // Clear arrays
      this.buttons = [];
      
      this.isInitialized = false;
      
      shareLogger.info("ShareManager destroyed successfully");
      
    } catch (error) {
      shareLogger.error("Error during ShareManager cleanup", error);
    } finally {
      shareLogger.timeEnd("ShareManager cleanup");
    }
  }
}


/**
 * PERFORMANCE MONITOR - Monitors and logs performance metrics
 * @class PerformanceMonitor
 */
class PerformanceMonitor {
  constructor() {
    perfLogger.time("PerformanceMonitor constructor");
    this.metrics = {};
    this.observer = null;

    perfLogger.debug("PerformanceMonitor instance created");
    perfLogger.timeEnd("PerformanceMonitor constructor");
  }
    return;

  /**
   * Start performance monitoring
   */
  start() {
    perfLogger.time("Performance monitoring start");
    this.observeLongTasks();
    this.metrics.startTime = performance.now();
    perfLogger.info("Performance monitoring started", {
      startTime: this.metrics.startTime,
    });
    perfLogger.timeEnd("Performance monitoring start");
  }

  /**
   * Observe long tasks for performance monitoring
   */
  observeLongTasks() {
    if ("PerformanceObserver" in window) {
      perfLogger.debug("Setting up PerformanceObserver for long tasks");
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          perfLogger.warn("Long task detected", {
            duration: `${entry.duration.toFixed(2)}ms`,
            name: entry.name,
            startTime: entry.startTime,
          });
        });
      });

      try {
        this.observer.observe({ entryTypes: ["longtask"] });
        perfLogger.debug("Long task observation enabled");
      } catch (error) {
        perfLogger.warn("Long task observation not supported", error);
      }
    } else {
      perfLogger.warn("PerformanceObserver not available in this environment");
    }
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    perfLogger.time("Performance monitoring stop");
    if (this.observer) {
      this.observer.disconnect();
      perfLogger.debug("PerformanceObserver disconnected");
    }

    this.metrics.totalTime = performance.now() - this.metrics.startTime;
    perfLogger.info("Performance monitoring stopped", {
      totalTime: `${this.metrics.totalTime.toFixed(2)}ms`,
      metricsCollected: Object.keys(this.metrics).length,
    });
    perfLogger.timeEnd("Performance monitoring stop");
  }
}

/**
 * MAIN Graduation APP - Coordinates all components
 * @class GraduationApp
 */
class GraduationApp {
  constructor() {
    appLogger.time("GraduationApp constructor");
    this.modules = {};
    this.performanceMonitor = new PerformanceMonitor();
    this.isInitialized = false;
    this.eventHandlers = {};
    // Dropdown and Theme Managers
    this.dropdownManager = null;
    this.themeManager = null;
    
    // App state
    this.state = {
      userAuthenticated: false,
      currentPage: 'home',
      preferences: this.loadPreferences(),
      sessionStartTime: Date.now()
    };
    
    appLogger.debug("GraduationApp instance created");
    appLogger.timeEnd("GraduationApp constructor");
  }

  /**
   * Initialize the application
   */
  async init() {
    appLogger.time("GraduationApp initialization");
    this.trackEvent("app_initialized");

    if (this.isInitialized) {
      appLogger.debug("GraduationApp already initialized");
      appLogger.timeEnd("GraduationApp initialization");
      return;
    }

    this.performanceMonitor.start();

try {

    const hasScrollElements = document.querySelector('[data-scroll-animate], .scroll-animate');

    if (hasScrollElements && !window.scrollAnimator) {
        scrollLogger.debug("Auto-initializing ScrollAnimator");
        window.scrollAnimator = new ScrollAnimator();
        window.scrollAnimator.init();
    }
      // Check authentication
      await this.checkAuthentication();
      
      // Initialize modules
      await this.initializeModules();
      
      // Setup dropdown and theme
      this.initDropdownManager();
      
      // Setup event listeners
      this.setupEventListeners();

      this.setupKeyboardShortcuts();
      
      // Start the app
      this.startApp();

      this.updateMenuItems();
      
      // Start animations
      this.animateMessagesOneByOne();
      this.changeTitleName();
      
      // Mark as initialized
      this.isInitialized = true;
      
      // Track successful initialization
      this.trackEvent("app_startup_complete", {
        loadTime: performance.now(),
        moduleCount: Object.keys(this.modules).length
      });
      
      appLogger.info("GraduationApp initialized successfully", {
        userAuthenticated: this.state.userAuthenticated,
        preferences: this.state.preferences
      });
      
    } catch (error) {
      appLogger.error("Failed to initialize GraduationApp", error);
      this.handleInitializationError(error);
    } finally {
      this.performanceMonitor.stop();
      appLogger.timeEnd("GraduationApp initialization");
    }
  }
   /**
   * Check user authentication
   */
  async checkAuthentication() {
    appLogger.time("Authentication check");
    
    try {
      const authString = localStorage.getItem("GraduationAppPassword");
      if (authString) {
        const auth = JSON.parse(authString);
        this.state.userAuthenticated = !!auth?.name;
        this.state.userName = auth.name || "Friend";
        
        appLogger.debug("User authenticated", {
          name: this.state.userName,
          timestamp: auth.timestamp
        });
      } else {
        this.state.userAuthenticated = false;
        appLogger.debug("No authentication found");
      }
    } catch (error) {
      appLogger.error("Authentication check failed", error);
      this.state.userAuthenticated = false;
    } finally {
      appLogger.timeEnd("Authentication check");
    }
  }

  /**
   * Load user preferences
   */
  loadPreferences() {
    try {
      const preferences = localStorage.getItem("graduation_app_preferences");
      return preferences ? JSON.parse(preferences) : {
        theme: 'auto',
        animations: true,
        sound: false,
        notifications: true,
        autoRotateImages: false
      };
    } catch (error) {
      appLogger.error("Failed to load preferences", error);
      return {
        theme: 'auto',
        animations: true,
        sound: false,
        notifications: true,
        autoRotateImages: false
      };
    }
  }

  /**
   * Save user preferences
   */
  savePreferences() {
    try {
      localStorage.setItem(
        "graduation_app_preferences",
        JSON.stringify(this.state.preferences)
      );
      appLogger.debug("Preferences saved", this.state.preferences);
    } catch (error) {
      appLogger.error("Failed to save preferences", error);
    }
  }

  /**
   * Initialize DropdownManager with ThemeManager
   */
  initDropdownManager() {
    appLogger.time("DropdownManager initialization");
    
    try {
      // Create ThemeManager instance
      this.themeManager = new ThemeManager();
      this.themeManager.init();
      this.state.preferences.theme === 'auto' ? this.state.preferences.theme = this.themeManager.getCurrentTheme() : null;

      this.themeManager.applyTheme(this.state.preferences.theme);
      
      // Custom menu items based on app state
      const menuItems = [
        { 
          label: 'Toggle Theme', 
          icon: 'fas fa-moon', 
          action: 'theme', 
          className: 'theme-toggle',
          dynamicLabel: true 
        },
        { 
          label: 'Image Settings', 
          icon: 'fas fa-images', 
          action: 'image-settings' 
        },
        { 
          label: 'Confetti Settings', 
          icon: 'fas fa-birthday-cake', 
          action: 'confetti-settings' 
        },
        { 
          label: 'Share App', 
          icon: 'fas fa-share-alt', 
          action: 'share' 
        },
        { 
          label: 'About', 
          icon: 'fas fa-info-circle', 
          action: 'about' 
        },
        { type: 'divider' },
        { 
          label: 'Logout', 
          icon: 'fas fa-sign-out-alt', 
          action: 'logout', 
          className: 'logout' 
        }
      ];
       if (this.state.userAuthenticated) {
      menuItems.splice(5, 0, 
        { type: 'divider' },
        { 
          label: 'Export Data', 
          icon: 'fas fa-download', 
          action: 'export' 
        },
        { 
          label: 'Import Data', 
          icon: 'fas fa-upload', 
          action: 'import' 
        }
      );
    }
      
      // Create DropdownManager
      this.dropdownManager = new DropdownManager({
        position: 'top-right',
        showBackdrop: true,
          appLogger,
        autoClose: true,
        animationDuration: 300,
        themeManager: this.themeManager,
        menuItems: menuItems,
        enableKeyboardNav: true,
        enableRippleEffect: this.state.preferences.animations
      });
      
      // Listen to dropdown events
      this.setupDropdownListeners();
      
      // Apply initial theme to components
      this.applyThemeToComponents(this.themeManager.getCurrentTheme());
      
      appLogger.info("DropdownManager initialized successfully");
      
    } catch (error) {
      appLogger.error("Failed to initialize DropdownManager", error);
      this.showErrorMessage("Failed to initialize menu system becuase of "+ error.message);
    } finally {
      appLogger.timeEnd("DropdownManager initialization");
    }
  }

/**
 * Setup dropdown event listeners (updated version)
 */
setupDropdownListeners() {
  // Logout handler
  document.addEventListener('user:logout', () => {
    this.handleLogout();
  });
  
  // Theme change handler
  document.addEventListener('theme:change', (e) => {
    this.handleThemeChange(e.detail?.theme);
  });
  
  // Custom action handlers
  document.addEventListener('dropdown:action', (e) => {
    this.handleDropdownAction(e.detail?.action, e.detail?.data);
  });
  
  // Setup custom actions for built-in functionality
  this.setupBuiltinCustomActions();
}

/**
 * Setup built-in custom actions
 */
setupBuiltinCustomActions() {
  if (!this.dropdownManager) return;
  
  // Image settings
  this.dropdownManager.addCustomAction('image-settings', () => {
    this.openImageSettings();
  });
  
  // Confetti settings
  this.dropdownManager.addCustomAction('confetti-settings', () => {
    this.openConfettiSettings();
  });
  
  // About
  this.dropdownManager.addCustomAction('about', () => {
    this.showAboutDialog();
  });
  
  // Refresh
  this.dropdownManager.addCustomAction('refresh', () => {
    this.refreshApp();
  });
  
  // Export
  this.dropdownManager.addCustomAction('export', () => {
    this.exportData();
  });
  
  // Import
  this.dropdownManager.addCustomAction('import', () => {
    this.importData();
  });
}

/**
 * Handle dropdown action (consolidated handler)
 */
handleDropdownAction(action, data) {
  appLogger.debug("Dropdown action received", { action, data });
  
  // Route to appropriate handler
  const actionHandlers = {
    'image-settings': () => this.openImageSettings(),
    'confetti-settings': () => this.openConfettiSettings(),
    'about': () => this.showAboutDialog(),
    'refresh': () => this.refreshApp(),
    'export': () => this.exportData(),
    'import': () => this.importData(),
    'share': () => this.handleShare(),
    'settings': () => this.handleSettings(),
    'help': () => this.handleHelp()
  };
  
  const handler = actionHandlers[action];
  if (handler) {
    handler();
  } else {
    appLogger.warn("Unknown dropdown action", { action });
    this.showToast(`Action "${action}" not implemented`, 'warning');
  }
}

/**
 * Handle settings action
 */
handleSettings() {
  this.showToast('Settings feature coming soon', 'info');
}

/**
 * Handle help action
 */
handleHelp() {
  this.showToast('Help & Support coming soon', 'info');
}

/**
 * Handle share action
 */
handleShare() {
  this.dispatchAppEvent('share:open');
  
  // Use Web Share API if available
  if (navigator.share) {
    navigator.share({
      title: document.title,
      text: 'Check out this amazing graduation app!',
      url: window.location.href
    }).then(() => {
      this.showToast('Shared successfully!', 'success');
    }).catch((error) => {
      if (error.name !== 'AbortError') {
        this.showToast('Sharing failed', 'error');
      }
    });
  } else {
    // Fallback to clipboard
    this.copyToClipboard(window.location.href);
    this.showToast('Link copied to clipboard!', 'success');
  }
}

/**
 * Copy to clipboard utility
 */
copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      appLogger.debug('Copied to clipboard:', text);
    })
    .catch(err => {
      appLogger.error('Copy failed:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
}

  /**
   * Handle theme changes
   */
  handleThemeChange(theme) {
    appLogger.info("Theme changed", { theme });
    
    // Update preferences
    this.state.preferences.theme = theme === 'light' ? 'light' : 
                                  theme === 'dark' ? 'dark' : 'auto';
    this.savePreferences();
    
    // Apply theme to all components
    this.applyThemeToComponents(theme);
    
    // Update confetti colors if needed
    if (this.modules.confetti) {
      this.updateConfettiForTheme(theme);
    }
    
    // Dispatch app-wide theme change event
    this.dispatchAppEvent('themeChanged', { theme });
  }

  /**
   * Apply theme to all components
   */
  applyThemeToComponents(theme) {
    // Update CSS variables
    this.updateThemeVariables(theme);
    
    // Update image loader if exists
    if (this.modules.imageLoader) {
      this.modules.imageLoader.updateTheme?.(theme);
    }
    
    // Update navigation controller if exists
    if (this.modules.imageLoader?.navigationController) {
      this.modules.imageLoader.navigationController.updateTheme?.(theme);
    }
    
    // Update share buttons
    this.updateShareButtonsTheme(theme);
    
    // Update any other theme-aware components
    document.querySelectorAll('[data-theme-aware]').forEach(element => {
      element.classList.toggle('dark-mode', theme === 'dark');
    });
  }

  /**
   * Update CSS theme variables
   */
  updateThemeVariables(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--primary', '#8E2DE2');
      root.style.setProperty('--secondary', '#4A00E0');
      root.style.setProperty('--primary-rgb', '142, 45, 226');
    } else {
      root.style.setProperty('--primary', '#667eea');
      root.style.setProperty('--secondary', '#764ba2');
      root.style.setProperty('--primary-rgb', '102, 126, 234');
    }
  }

  /**
   * Update confetti for theme
   */
  updateConfettiForTheme(theme) {
    if (this.modules.confetti?.updateConfig) {
      const colors = theme === 'dark' 
        ? ["#8E2DE2", "#4A00E0", "#FF6B6B", "#FECA57", "#1DD1A1", "#00B4D8"]
        : ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"];
      
      this.modules.confetti.updateConfig({ colors });
      
      appLogger.debug("Confetti colors updated for theme", { theme, colors });
    }
  }

  /**
   * Update share buttons theme
   */
  updateShareButtonsTheme(theme) {
    const shareButtons = document.querySelectorAll('.share-btn');
    shareButtons.forEach(btn => {
      if (theme === 'dark') {
        btn.classList.add('dark-mode');
        btn.classList.remove('light-mode');
      } else {
        btn.classList.add('light-mode');
        btn.classList.remove('dark-mode');
      }
    });
  }

  /**
   * Handle logout
   */
  handleLogout() {
    appLogger.info("User initiated logout");
    
    // Show confirmation
    const confirmed = window.confirm(
      'Are you sure you want to logout? You will need to re-enter the password.'
    );
    
    if (!confirmed) {
      appLogger.debug("Logout cancelled by user");
      return;
    }
    
    // Show logout animation
    this.showLogoutAnimation();
    
    // Clear all app data
    this.clearAppData();

    
    // Track logout event
    this.trackEvent("user_logout", {
      sessionDuration: Date.now() - this.state.sessionStartTime
    });
    
    // Redirect to login page
    setTimeout(() => {
      window.location.href = '/logout.html';
    }, 2000);
  }

  /**
   * Clear all app data
   */
  clearAppData() {
    try {
      // Clear authentication
      localStorage.removeItem("GraduationAppPassword"); 
     
      // Clear any other app-specific data
      localStorage.removeItem("pwa-prompt-dismissal");
      localStorage.removeItem("pwa-prompt-display-history");
      localStorage.removeItem("Welcome_Notification");
      localStorage.removeItem("last_visited");
      
      // Clear session cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      appLogger.info("App data cleared successfully");
      
    } catch (error) {
      appLogger.error("Failed to clear app data", error);
    }
  }

/**
 * Show enhanced logout animation
 */
showLogoutAnimation() {
    // Remove any existing logout overlay
    const existingOverlay = document.querySelector('.logout-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Create backdrop overlay
    const overlay = document.createElement('div');
    overlay.className = 'logout-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
            135deg,
            var(--primary, #667eea) 0%,
            var(--secondary, #764ba2) 50%,
            var(--accent-color, #f093fb) 100%
        );
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 0;
        animation: fadeInOverlay 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        overflow: hidden;
    `;
    
    // Create animated background elements
    const particles = document.createElement('div');
    particles.className = 'logout-particles';
    particles.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
    `;
    
    // Create floating particles
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            background: rgba(255, 255, 255, ${0.2 + Math.random() * 0.3});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${3 + Math.random() * 4}s ease-in-out infinite;
            animation-delay: ${Math.random() * 2}s;
            filter: blur(${Math.random() * 2}px);
        `;
        particles.appendChild(particle);
    }
    
    // Create animated wave
    const wave = document.createElement('div');
    wave.className = 'logout-wave';
    wave.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 100px;
        background: linear-gradient(
            to top,
            rgba(255, 255, 255, 0.2) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%
        );
        border-radius: 100% 100% 0 0;
        animation: waveMove 8s ease-in-out infinite;
    `;
    
    overlay.innerHTML = `
        <div class="logout-content" style="
            text-align: center;
            padding: 50px;
            position: relative;
            z-index: 2;
            max-width: 500px;
            width: 90%;
        ">
            <!-- Animated ring spinner -->
            <div class="logout-spinner-container" style="
                position: relative;
                width: 120px;
                height: 120px;
                margin: 0 auto 40px;
            ">
                <!-- Outer ring -->
                <div class="logout-ring-outer" style="
                    position: absolute;
                    inset: 0;
                    border: 3px solid rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                "></div>
                
                <!-- Middle ring -->
                <div class="logout-ring-middle" style="
                    position: absolute;
                    inset: 15px;
                    border: 3px solid rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    animation: spin 2s linear infinite;
                "></div>
                
                <!-- Inner ring -->
                <div class="logout-ring-inner" style="
                    position: absolute;
                    inset: 30px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    animation: spin 1.5s linear infinite reverse;
                "></div>
                
                <!-- Center icon -->
                <div class="logout-icon" style="
                    position: absolute;
                    inset: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    animation: pulse 2s ease-in-out infinite;
                ">
                    👋
                </div>
            </div>
            
            <!-- Main message -->
            <div class="logout-message" style="
                margin-bottom: 30px;
                opacity: 0;
                animation: fadeInUp 0.8s ease 0.3s forwards;
            ">
                <h2 style="
                    margin: 0 0 15px 0;
                    font-size: 36px;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                    background: linear-gradient(45deg, #ffffff, #e0e0ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                ">
                    Until Next Time!
                </h2>
                
                <p style="
                    margin: 0 0 10px 0;
                    font-size: 18px;
                    opacity: 0.9;
                    line-height: 1.5;
                ">
                    Thank you for celebrating with Graduation App
                </p>
                
                <p style="
                    margin: 0;
                    font-size: 16px;
                    opacity: 0.7;
                ">
                    Your moments are saved for next time
                </p>
            </div>
            
            <!-- Progress indicator -->
            <div class="logout-progress" style="
                width: 200px;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                margin: 40px auto 0;
                overflow: hidden;
                opacity: 0;
                animation: fadeIn 0.5s ease 0.6s forwards;
            ">
                <div class="logout-progress-bar" style="
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #ffffff, #e0e0ff);
                    border-radius: 2px;
                    animation: progressFill 2s ease-in-out forwards;
                "></div>
            </div>
            
            <!-- Countdown text -->
            <div class="logout-countdown" style="
                margin-top: 20px;
                font-size: 14px;
                opacity: 0.6;
                letter-spacing: 1px;
                opacity: 0;
                animation: fadeIn 0.5s ease 0.8s forwards;
            ">
                Redirecting in <span class="countdown-number">3</span> seconds
            </div>
            
            <!-- Decorative elements -->
            <div class="logout-decoration" style="
                position: absolute;
                bottom: -40px;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0.2;
                font-size: 64px;
                animation: floatDecoration 4s ease-in-out infinite;
            ">
                🎓
            </div>
        </div>
    `;
    
    // Add elements to overlay
    overlay.appendChild(particles);
    overlay.appendChild(wave);
    document.body.appendChild(overlay);
    
    // Add CSS animations
    if (!document.querySelector('#logout-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-animation-styles';
        style.textContent = `
            @keyframes fadeInOverlay {
                from { 
                    opacity: 0; 
                    backdrop-filter: blur(0px);
                }
                to { 
                    opacity: 1; 
                    backdrop-filter: blur(10px);
                }
            }
            
            @keyframes fadeInUp {
                from { 
                    opacity: 0; 
                    transform: translateY(20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes pulse {
                0%, 100% { 
                    transform: scale(1); 
                    opacity: 1;
                }
                50% { 
                    transform: scale(1.1); 
                    opacity: 0.8;
                }
            }
            
            @keyframes progressFill {
                0% { width: 0%; }
                100% { width: 100%; }
            }
            
            @keyframes floatParticle {
                0%, 100% { 
                    transform: translateY(0) rotate(0deg); 
                }
                50% { 
                    transform: translateY(-30px) rotate(180deg); 
                }
            }
            
            @keyframes waveMove {
                0%, 100% { 
                    transform: translateY(0) scaleX(1);
                }
                50% { 
                    transform: translateY(-20px) scaleX(1.2);
                }
            }
            
            @keyframes floatDecoration {
                0%, 100% { 
                    transform: translateX(-50%) translateY(0) rotate(0deg);
                }
                50% { 
                    transform: translateX(-50%) translateY(-20px) rotate(10deg);
                }
            }
            
            /* Remove overlay animation */
            @keyframes fadeOutOverlay {
                from { 
                    opacity: 1;
                    transform: scale(1);
                }
                to { 
                    opacity: 0;
                    transform: scale(1.1);
                }
            }
            
            .logout-overlay {
                transition: opacity 0.5s ease;
            }
            
            /* Dark theme adjustments */
            @media (prefers-color-scheme: dark) {
                .logout-overlay {
                    background: linear-gradient(
                        135deg,
                        #1a1a2e 0%,
                        #16213e 50%,
                        #0f3460 100%
                    );
                }
                
                .logout-progress-bar {
                    background: linear-gradient(90deg, #4cc9f0, #4361ee);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add countdown functionality
    const countdownNumber = overlay.querySelector('.countdown-number');
    let countdown = 10;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownNumber) {
            countdownNumber.textContent = countdown;
            
            // Add animation to number change
            countdownNumber.style.animation = 'none';
            countdownNumber.offsetHeight; // Trigger reflow
            countdownNumber.style.animation = 'pulse 0.5s ease';
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                
                // Fade out animation before redirect
                overlay.style.animation = 'fadeOutOverlay 0.8s ease forwards';
                
                setTimeout(() => {
                    overlay.remove();
                    // Add your redirect logic here
                    // window.location.href = '/login';
                }, countdown);
            }
        }
    }, 1000);
    
    // Add click to skip functionality
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('logout-content')) {
            clearInterval(countdownInterval);
            overlay.style.animation = 'fadeOutOverlay 0.5s ease forwards';
            
            setTimeout(() => {
                overlay.remove();
                // Add your redirect logic here
                // window.location.href = '/login';
            }, 500);
        }
    });
    
    // Add keyboard support (Escape to skip)
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            clearInterval(countdownInterval);
            overlay.style.animation = 'fadeOutOverlay 0.5s ease forwards';
            
            setTimeout(() => {
                overlay.remove();
                // Add your redirect logic here
                // window.location.href = '/login';
            }, 500);
            
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup event listener on remove
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach((node) => {
                    if (node === overlay) {
                        document.removeEventListener('keydown', handleKeyDown);
                        clearInterval(countdownInterval);
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true });
}

  /**
   * Open image settings dialog
   */
  openImageSettings() {
    if (!this.modules.imageLoader) {
      this.showToast('Image loader not available', 'error');
      return;
    }
    
    // Create settings dialog
    const dialog = document.createElement('div');
    dialog.className = 'settings-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--dropdown-bg, white);
      padding: 30px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 10002;
      min-width: 300px;
      max-width: 90vw;
    `;
    
    const state = this.modules.imageLoader.getRotationState?.() || {};
    dialog.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: var(--dropdown-text, #333);">Image Settings</h3>
      
      <div class="setting-item" style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; color: var(--dropdown-text, #666);">
          Rotation Speed
        </label>
        <input type="range" id="rotation-speed" min="1000" max="10000" step="500" 
               value="${state.rotationDelay || 5000}" 
               style="width: 100%;">
        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
          <span style="font-size: 12px; color: var(--dropdown-text, #999);">Slow</span>
          <span id="speed-value" style="font-size: 14px; color: var(--primary, #667eea);">
            ${(state.rotationDelay || 5000) / 1000}s
          </span>
          <span style="font-size: 12px; color: var(--dropdown-text, #999);">Fast</span>
        </div>
      </div>
      
      <div class="setting-item" style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 10px; color: var(--dropdown-text, #666);">
          <input type="checkbox" id="auto-rotate" ${state.automaticRotate ? 'checked' : ''}>
          Auto Rotate Images
        </label>
      </div>

            <div class="setting-item" style="margin-bottom: 20px;">
        <label style="display: flex; align-items: center; gap: 10px; color: var(--dropdown-text, #666);">
          <input type="checkbox" id="EnableRotation" ${state.rotationEnabled ? 'checked' : ''}>
          Enable Image Rotation
        </label>
      </div>
      
      <div class="setting-item" style="margin-bottom: 30px;">
        <label style="display: flex; align-items: center; gap: 10px; color: var(--dropdown-text, #666);">
          <input type="checkbox" id="pause-on-hover" ${state.pauseOnHover ? 'checked' : ''}>
          Pause on Hover
        </label>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn-secondary" style="
          padding: 10px 20px;
          border: none;
          background: var(--dropdown-hover, #f5f5f5);
          color: var(--dropdown-text, #666);
          border-radius: 8px;
          cursor: pointer;
        ">Cancel</button>
        <button class="btn-primary" style="
          padding: 10px 20px;
          border: none;
          background: var(--primary, #667eea);
          color: white;
          border-radius: 8px;
          cursor: pointer;
        ">Save</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10001;
      backdrop-filter: blur(5px);
    `;
    document.body.appendChild(backdrop);
    
    // Add event listeners
    const speedInput = dialog.querySelector('#rotation-speed');
    const speedValue = dialog.querySelector('#speed-value');
    
    speedInput.addEventListener('input', (e) => {
      speedValue.textContent = `${e.target.value / 1000}s`;
    });
      const autoRotate = dialog.querySelector('#auto-rotate').checked;
      const pauseOnHover = dialog.querySelector('#pause-on-hover').checked;
      const rotationEnabled = dialog.querySelector('#EnableRotation').checked;
    dialog.querySelector('.btn-primary').addEventListener('click', () => {
      const newSpeed = parseInt(speedInput.value);

      if (this.modules.imageLoader.updateConfig) {
        this.modules.imageLoader.updateConfig({
          automaticRotate: autoRotate,
          pauseOnHover: pauseOnHover,
          rotationEnabled: rotationEnabled,
            rotationDelay: newSpeed

        });
      }

      // Save to preferences
      this.state.preferences.automaticRotate = autoRotate;
      this.state.preferences.isHoverPaused = pauseOnHover;
      this.state.preferences.rotationEnabled = rotationEnabled;
      this.state.preferences.rotationDelay = newSpeed;
      this.savePreferences();
      
      // Close dialog
      dialog.remove();
      backdrop.remove();
      
      this.showToast('Image settings saved', 'success');
    });
    
    dialog.querySelector('.btn-secondary').addEventListener('click', () => {
      dialog.remove();
      backdrop.remove();
    });
    
    backdrop.addEventListener('click', () => {
      dialog.remove();
      backdrop.remove();
    });
  }

  /**
   * Open confetti settings dialog
   */
  openConfettiSettings() {
    if (!this.modules.confetti) {
      this.showToast('Confetti system not available', 'error');
      return;
    }
    
    // Similar implementation to image settings
    this.showToast('Confetti settings dialog would open here', 'info');
  }

  /**
   * Show about dialog
   */
showAboutDialog() {
    // Create backdrop with animation
    const backdrop = document.createElement('div');
    backdrop.className = 'about-dialog-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10001;
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;
    
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.className = 'about-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'about-dialog-title');
    dialog.style.cssText = `
      position: relative;
      background: var(--dropdown-bg, #ffffff);
      padding: 0;
      border-radius: 24px;
      box-shadow: 
        0 32px 64px rgba(0, 0, 0, 0.2),
        0 16px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
      z-index: 10002;
      max-width: 440px;
      width: 100%;
      max-height: 90vh;
      overflow: hidden;
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    // Dialog content with improved design
    dialog.innerHTML = `
      <!-- Decorative gradient border -->
      <div class="dialog-gradient-border" style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, 
          #667eea, 
          #764ba2, 
          #f093fb, 
          #f5576c, 
          #ffd166
        );
        opacity: 0.8;
        z-index: 2;
      "></div>
      
      <!-- Close button -->
      <button class="dialog-close-btn" aria-label="Close dialog" style="
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.05);
        border: none;
        color: var(--dropdown-text, #666);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        z-index: 3;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      ">
        <span style="display: block; transform: rotate(45deg);">+</span>
      </button>
      
      <!-- Main content -->
      <div class="dialog-content" style="padding: 40px 35px 35px 35px; overflow-y: auto; max-height: 88vh;">
        <!-- Header -->
        <div class="dialog-header" style="text-align: center; margin-bottom: 35px;">
          <!-- Animated logo -->
          <div class="logo-container" style="
            width: 100px;
            height: 100px;
            margin: 0 auto 25px;
            position: relative;
            cursor: pointer;
          ">
            <div class="logo-outer-ring" style="
              position: absolute;
              inset: -6px;
              border-radius: 50%;
              background: conic-gradient(
                from 0deg,
                #667eea,
                #764ba2,
                #f093fb,
                #f5576c,
                #ffd166,
                #667eea
              );
              animation: rotate 8s linear infinite;
              filter: blur(8px);
              opacity: 0.4;
            "></div>
            
            <div class="logo-main" style="
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, 
                var(--primary, #667eea) 0%, 
                var(--secondary, #764ba2) 100%
              );
              border-radius: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 48px;
              position: relative;
              box-shadow: 
                0 10px 30px rgba(102, 126, 234, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
              transition: all 0.3s ease;
              overflow: hidden;
            ">
              🎓
              <div class="logo-shine" style="
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background: linear-gradient(
                  45deg,
                  transparent 30%,
                  rgba(255, 255, 255, 0.1) 50%,
                  transparent 70%
                );
                transform: rotate(45deg);
                transition: transform 0.6s ease;
              "></div>
            </div>
          </div>
          
          <h2 id="about-dialog-title" style="
            margin: 0 0 8px 0;
            color: var(--dropdown-text, #333);
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, 
              var(--primary, #667eea), 
              var(--secondary, #764ba2)
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.2;
          ">
            Graduation App
          </h2>
          
          <div class="version-badge" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 16px;
            background: linear-gradient(135deg, 
              rgba(102, 126, 234, 0.1), 
              rgba(118, 75, 162, 0.1)
            );
            color: var(--primary, #667eea);
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
            border: 1px solid rgba(102, 126, 234, 0.2);
            margin-bottom: 15px;
          ">
            <span style="font-size: 12px;">⚡</span>
            v2.0.0
          </div>
          
          <p class="tagline" style="
            margin: 0;
            color: var(--dropdown-text, #666);
            font-size: 15px;
            line-height: 1.4;
            max-width: 320px;">
            Celebrate achievements with style
          </p>
        </div>
        
        <!-- Features grid -->
        <div class="features-grid" style="
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 30px;
        ">
          <div class="feature-item" style="
            padding: 16px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 16px;
            text-align: center;
            border: 1px solid rgba(102, 126, 234, 0.1);
            transition: all 0.2s ease;
          ">
            <div style="
              font-size: 24px;
              margin-bottom: 10px;
              color: var(--primary, #667eea);
            ">🎉</div>
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: var(--dropdown-text, #333);
              line-height: 1.3;
            ">Confetti Effects</div>
          </div>
          
          <div class="feature-item" style="
            padding: 16px;
            background: rgba(118, 75, 162, 0.05);
            border-radius: 16px;
            text-align: center;
            border: 1px solid rgba(118, 75, 162, 0.1);
            transition: all 0.2s ease;
          ">
            <div style="
              font-size: 24px;
              margin-bottom: 10px;
              color: var(--secondary, #764ba2);
            ">🖼️</div>
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: var(--dropdown-text, #333);
              line-height: 1.3;
            ">Image Slideshow</div>
          </div>
          
          <div class="feature-item" style="
            padding: 16px;
            background: rgba(240, 147, 251, 0.05);
            border-radius: 16px;
            text-align: center;
            border: 1px solid rgba(240, 147, 251, 0.1);
            transition: all 0.2s ease;
          ">
            <div style="
              font-size: 24px;
              margin-bottom: 10px;
              color: #f093fb;
            ">📤</div>
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: var(--dropdown-text, #333);
              line-height: 1.3;
            ">Sharing Features</div>
          </div>
          
          <div class="feature-item" style="
            padding: 16px;
            background: rgba(255, 209, 102, 0.05);
            border-radius: 16px;
            text-align: center;
            border: 1px solid rgba(255, 209, 102, 0.1);
            transition: all 0.2s ease;
          ">
            <div style="
              font-size: 24px;
              margin-bottom: 10px;
              color: #ffd166;
            ">🎨</div>
            <div style="
              font-size: 12px;
              font-weight: 600;
              color: var(--dropdown-text, #333);
              line-height: 1.3;
            ">Custom Themes</div>
          </div>
        </div>
        
        <!-- Description -->
        <div class="description" style="
          margin-bottom: 30px;
          text-align: center;
        ">
          <p style="
            margin: 0 0 15px 0;
            color: var(--dropdown-text, #666);
            font-size: 15px;
            line-height: 1.6;
          ">
            A beautifully crafted graduation celebration app that helps you 
            create memorable moments with interactive features.
          </p>
          
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, 
              rgba(102, 126, 234, 0.08), 
              rgba(118, 75, 162, 0.08)
            );
            border-radius: 50px;
            margin-top: 10px;
          ">
            <span style="color: #f5576c;">❤️</span>
            <span style="
              color: var(--dropdown-text, #666);
              font-size: 14px;
              font-weight: 500;
            ">
              Made for graduates everywhere
            </span>
          </div>
        </div>
        
        <!-- Action buttons -->
        <div class="action-buttons" style="
          display: flex;
          gap: 12px;
          margin-top: 25px;
          padding-top: 25px;
          border-top: 1px solid var(--dropdown-divider, rgba(0, 0, 0, 0.08));
        ">
          <button class="btn-secondary" style="
            padding: 14px 20px;
            border: 1px solid var(--dropdown-divider, #e0e0e0);
            background: transparent;
            color: var(--dropdown-text, #666);
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            flex: 1;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            <span style="font-size: 16px;">📘</span>
            Learn More
          </button>
          
          <button class="btn-primary btn-close" style="
            padding: 14px 20px;
            border: none;
            background: linear-gradient(135deg, 
              var(--primary, #667eea), 
              var(--secondary, #764ba2)
            );
            color: white;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            flex: 1;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            position: relative;
            overflow: hidden;
          ">
            <span class="btn-glow" style="
              position: absolute;
              inset: 0;
              background: linear-gradient(90deg, 
                transparent, 
                rgba(255, 255, 255, 0.2), 
                transparent
              );
              transform: translateX(-100%);
              transition: transform 0.6s ease;
            "></span>
            <span style="font-size: 16px;">✨</span>
            Continue
          </button>
        </div>
        
        <!-- Footer -->
        <div class="dialog-footer" style="
          margin-top: 25px;
          text-align: center;
        ">
          <p style="
            margin: 0;
            color: var(--dropdown-text-muted, #999);
            font-size: 12px;
            line-height: 1.4;
          ">
            © ${new Date().getFullYear()} Graduation App
            <span style="color: rgba(0, 0, 0, 0.2); margin: 0 8px;">•</span>
            All rights reserved
          </p>
        </div>
      </div>
    `;
    
    // Append to document
    document.body.appendChild(backdrop);
    backdrop.appendChild(dialog);
    
    // Animate in
    setTimeout(() => {
      backdrop.style.opacity = '1';
      dialog.style.opacity = '1';
      dialog.style.transform = 'translateY(0) scale(1)';
    }, 10);
    
    // Add dynamic styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .logo-container:hover .logo-main {
        animation: pulse 0.6s ease;
      }
      
      .logo-container:hover .logo-shine {
        transform: rotate(45deg) translateX(100%);
      }
      
      .feature-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-color: rgba(102, 126, 234, 0.3) !important;
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      }
      
      .btn-primary:hover .btn-glow {
        transform: translateX(100%);
      }
      
      .btn-secondary:hover {
        background: var(--dropdown-divider, #f5f5f5);
        border-color: var(--primary, #667eea);
        color: var(--primary, #667eea);
      }
      
      .dialog-close-btn:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: rotate(90deg);
        color: var(--dropdown-text, #333);
      }
      
      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .about-dialog-backdrop {
          background: rgba(0, 0, 0, 0.85);
        }
        
        .about-dialog {
          background: #1a1a1a;
          border-color: rgba(255, 255, 255, 0.05);
        }
        
        .dialog-close-btn {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.6);
        }
        
        .dialog-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      }
      
      /* Responsive */
      @media (max-width: 480px) {
        .features-grid {
          grid-template-columns: 1fr;
        }
        
        .action-buttons {
          flex-direction: column;
        }
        
        .dialog-content {
          padding: 30px 25px 25px 25px;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Close functionality
    const closeBtn = dialog.querySelector('.dialog-close-btn');
    const closeDialogBtn = dialog.querySelector('.btn-close');
    
    const closeDialog = () => {
      dialog.style.opacity = '0';
      dialog.style.transform = 'translateY(20px) scale(0.95)';
      backdrop.style.opacity = '0';
      
      setTimeout(() => {
        dialog.remove();
        backdrop.remove();
        style.remove();
      }, 300);
    };
    
    closeBtn.addEventListener('click', closeDialog);
    closeDialogBtn.addEventListener('click', closeDialog);
    
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeDialog();
      }
    });
    
    // Keyboard support
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDialog();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Focus trap for accessibility
    const focusableElements = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
    
    // Focus first element
    setTimeout(() => {
      dialog.querySelector('button').focus();
    }, 100);
    
    // Logo click celebration
    const logoContainer = dialog.querySelector('.logo-container');
    logoContainer.addEventListener('click', () => {
      const logoMain = logoContainer.querySelector('.logo-main');
      logoMain.style.animation = 'pulse 0.6s ease';
      
      // Create confetti effect
      for (let i = 0; i < 8; i++) {
        const confetti = document.createElement('div');
        confetti.textContent = ['🎉', '✨', '🎓', '🥳'][Math.floor(Math.random() * 4)];
        confetti.style.cssText = `
          position: absolute;
          font-size: 20px;
          z-index: 1000;
          pointer-events: none;
          animation: confetti-fly 1s ease-out forwards;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
        `;
        
        // Add confetti animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes confetti-fly {
            0% {
              transform: translate(-50%, -50%) scale(1) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: 
                translate(
                  calc(-50% + ${(Math.random() - 0.5) * 200}px), 
                  calc(-50% - ${100 + Math.random() * 100}px)
                ) 
                scale(0) rotate(${360 + Math.random() * 360}deg);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
        
        dialog.appendChild(confetti);
        setTimeout(() => {
          confetti.remove();
          style.remove();
        }, 1000);
      }
      
      setTimeout(() => {
        logoMain.style.animation = '';
      }, 600);
    });
  }

  /**
   * Handle custom dropdown actions
   */
  handleCustomDropdownAction(action, data) {
    appLogger.debug("Custom dropdown action", { action, data });
    
    switch (action) {
      case 'refresh':
        this.refreshApp();
        break;
      case 'export':
        this.exportData();
        break;
      case 'import':
        this.importData();
        break;
      default:
        appLogger.warn("Unknown dropdown action", { action });
    }
  }

  /**
   * Refresh the app
   */
  refreshApp() {
    this.showToast('Refreshing app...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  /**
   * Export app data
   */
  exportData() {
    // Implementation for data export
    this.showToast('Export feature coming soon', 'info');
  }

  /**
   * Import app data
   */
  importData() {
    // Implementation for data import
    this.showToast('Import feature coming soon', 'info');
  }

  /**
   * Show toast message
   */
  showToast(message, type = 'info') {
    if (this.dropdownManager?.showToast) {
      this.dropdownManager.showToast(message, type);
    } else {
      // Fallback toast
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Dispatch app-wide event
   */
  dispatchAppEvent(eventName, detail = {}) {
    const event = new CustomEvent(`graduationapp:${eventName}`, {
      detail,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    appLogger.time("GraduationApp cleanup");
    
    // Destroy modules
    Object.entries(this.modules).forEach(([name, module]) => {
      if (module && typeof module.destroy === "function") {
        appLogger.debug(`Destroying module: ${name}`);
        module.destroy();
      }
    });
    
    // Destroy dropdown manager
    if (this.dropdownManager) {
      this.dropdownManager.destroy();
    }
    
    // Destroy theme manager
    if (this.themeManager) {
      this.themeManager.destroy();
    }
    
    // Remove event listeners
    if (this.eventHandlers.resize) {
      window.removeEventListener("resize", this.eventHandlers.resize);
    }
    
    // Clear state
    this.isInitialized = false;
    this.modules = {};
    this.state = {};
    
    appLogger.info("GraduationApp destroyed successfully");
    appLogger.timeEnd("GraduationApp cleanup");
  }
setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.isContentEditable) {
      return;
    }
    
    // F5 to refresh
    if (e.key === 'F5') {
      e.preventDefault();
      this.refreshApp();
    }
    
    // Ctrl/Cmd + Shift + D to open dropdown
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (this.dropdownManager) {
        this.dropdownManager.openDropdown();
      }
    }
    
    // Escape to close dropdown
    if (e.key === 'Escape' && this.dropdownManager) {
      const state = this.dropdownManager.getState();
      if (state.isOpen) {
        this.dropdownManager.closeDropdown();
      }
    }
  });
}

/**
 * Update menu items based on app state
 */
updateMenuItems() {
  if (!this.dropdownManager) return;
  
  // Update theme button label
  const themeItem = this.dropdownManager.elements?.dropdown?.querySelector('[data-action="theme"]');
  if (themeItem) {
    const label = themeItem.querySelector('.dropdown-item-label');
    const currentTheme = this.themeManager?.getCurrentTheme() || 'light';
    
    this.themeManager.manaullyUpdateBtnLabel();
    if (label) {
      label.textContent = currentTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }
  
  // Show/hide export/import based on authentication
  const exportItem = this.dropdownManager.elements?.dropdown?.querySelector('[data-action="export"]');
  const importItem = this.dropdownManager.elements?.dropdown?.querySelector('[data-action="import"]');
  
  if (exportItem) {
    exportItem.style.display = this.state.userAuthenticated ? 'flex' : 'none';
  }
  if (importItem) {
    importItem.style.display = this.state.userAuthenticated ? 'flex' : 'none';
  }
}

  showMediaLoading(){
      appLogger.time('show media loading animation');
      const loadingContainer = this.elements.loadingContainer;
      if(loadingContainer){
          loadingContainer.classList.add("is-visible", "is-loading");
          loadingContainer.setAttribute("aria-hidden", "false");
          loadingContainer.setAttribute("aria-live", "off");

          this._startProgressAnimation();

          appLogger.debug("Loading container activated", {
              hasVisible: loadingContainer.classList.contains("is-visible"),
              hasLoading: loadingContainer.classList.contains("is-loading"),
              ariaHidden: loadingContainer.getAttribute("aria-hidden"),
              ariaLive: loadingContainer.getAttribute("aria-live"),
          });
          if(this.elements.GraduationImage){
              this.elements.GraduationImage.classList.add('d-none');
              this.elements.classList.add('is-loading');
              appLogger.debug('Graduation image was hidden successfully',{
                  element:this.elements.GraduationImage.tagName
              });
          }
      }
      appLogger.info("Media loading animation displayed successfully");
      appLogger.timeEnd("Show media loading animation");
  }

  hideMediaLoading(){
      appLogger.time("Hide media loading animation");
      const {loadingProgressBar: progressBar} = this.elements;
    if (progressBar){
        progressBar.style.width = '100%';
    }

    setTimeout(()=>{
        const loadingContainer = this.elements.loadingContainer;
        if (loadingContainer) {
            loadingContainer.classList.remove("is-visible", "is-loading");
            loadingContainer.setAttribute("aria-hidden", "true");
            loadingContainer.setAttribute("aria-live", "polite");

            appLogger.debug("Loading container deactivated", {
                ariaHidden: loadingContainer.getAttribute("aria-hidden"),
                ariaLive: loadingContainer.getAttribute("aria-live"),
            });
        }
        const profileImage = this.elements.GraduationImage;
        profileImage.classList.remove("d-none");
        profileImage.classList.remove("is-loading");
        appLogger.debug("Loading class removed from media element", {
            element: profileImage.tagName,
        });
  }, 500);


      appLogger.info("Media loading animation hidden successfully");
      appLogger.timeEnd("Hide media loading animation");
  }

    /**
     * Starts the progress bar animation
     * @private
     */
    _startProgressAnimation() {
        const progressBar = this.elements.loadingProgressBar
        if (!progressBar) return;

        let progress = 0;
        const maxProgress = 85;

        const interval = setInterval(() => {
            const currentWidth = parseFloat(progressBar.style.width) || 0;

            if (currentWidth >= maxProgress) {
                clearInterval(interval);
                return;
            }

            progress += 2 + Math.random() * 3;
            progressBar.style.width = Math.min(progress, maxProgress) + "%";
        }, 300);
    }

    /**
     * @param eventName
     * @param data
     */
  trackEvent(eventName, data = {}) {
    appLogger.debug("Tracking analytics event", { eventName, data });
    if (typeof gtag !== "undefined") {
      gtag("event", eventName, data);
    } else {
      appLogger.debug("Google Analytics not available, event not sent");
    }
  }

  /**
   * Initialize all modules
   */
  async initializeModules() {
    appLogger.time("Module initialization");
    try {
      this.cacheElements();

      // Initialize modules with fallbacks
      this.modules = {
        confetti: this.createModuleWithFallback(
          ConfettiSystem,
          this.elements.card
        ),
        imageLoader: this.createModuleWithFallback(
          ImageLoader,
          this.elements.GraduationImage,
          this.elements.imagePlaceholder
        ),
        scrollAnimator: this.createModuleWithFallback(ScrollAnimator),
        shareManager: this.createModuleWithFallback(ShareManager,{shareText: "Check out these graduation wishes!",
          enableAnalytics: true
        }),
      };
      if (this.modules.imageLoader && !this.modules.imageLoader.navigationController) {
      this.modules.imageLoader.navigationController = new ImageNavigationController(this.modules.imageLoader);
    }

      appLogger.info("All modules initialized successfully", {
        modules: Object.keys(this.modules),
      });
    } catch (error) {
      appLogger.error("Module initialization failed", error);
      this.initializeFallbackMode();
    } finally {
      appLogger.timeEnd("Module initialization");
    }
  }

    /**
     *  Creates a Module with a fullback system
     * @param ModuleClass
     * @param args
     * @returns {{init: function(): *, destroy: function(): *}|*}
     */
  createModuleWithFallback(ModuleClass, ...args) {
    try {
      appLogger.debug(`Initializing ${ModuleClass.name}`);
      const module = new ModuleClass(...args);
      appLogger.debug(`${ModuleClass.name} initialized successfully`);
      return module;
    } catch (error) {
      appLogger.warn(`${ModuleClass.name} failed, using fallback`, error);
      return this.createFallbackModule(ModuleClass);
    }
  }

    /**
     *
     * @param ModuleClass
     * @returns {{init: function(): *, destroy: function(): *}}
     */
  createFallbackModule(ModuleClass) {
    appLogger.warn(`Creating fallback for ${ModuleClass.name}`);
    return {
      init: () => appLogger.debug(`Fallback ${ModuleClass.name}.init called`),
      destroy: () =>
        appLogger.debug(`Fallback ${ModuleClass.name}.destroy called`),
    };
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    appLogger.time("Element caching");
    this.elements = {
      card: document.querySelector(".Graduation-card"),
      imageContainer: document.querySelector(".image-container"),
      imagePlaceholder: document.querySelector(".image-placeholder"),
      GraduationImage: document.getElementById("GraduationImage"),
        loadingContainer : document.getElementById('Modal-loading__container'),
        messageItems: document.querySelectorAll(".message-item"),
        loadingProgressBar: document.querySelector('.loading-progress__bar'),
    };

    appLogger.debug("DOM elements cached", {
      elementsFound: Object.keys(this.elements).filter(
        (key) => !!this.elements[key]
      ).length,
      totalElements: Object.keys(this.elements).length,
    });
    appLogger.timeEnd("Element caching");
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    appLogger.time("Event listener setup");

    // Store references for cleanup
    this.eventHandlers = {
      imageMouseEnter: () => {
        appLogger.debug("Image container mouse enter - triggering confetti");
        //this.modules.confetti.triggerConfetti(20);
      },
      imageTouchStart: () => {
        appLogger.debug("Image container touch start - triggering confetti");
        this.modules.confetti.triggerConfetti(20);
      },
      resize: this.debounce(() => this.handleResize(), 200),
    };
    this.modules.imageLoader.pauseRotation();
    this.modules.imageLoader.updateConfig(this.state.preferences)
    if (this.elements.imageContainer) {
      this.elements.imageContainer.addEventListener(
        "mouseenter",
        this.eventHandlers.imageMouseEnter
      );
      this.elements.imageContainer.addEventListener(
        "touchstart",
        this.eventHandlers.imageTouchStart,
        { passive: true }
      );
      appLogger.debug("Image container event listeners attached");
    } else {
      appLogger.warn("Image container not found for event listeners");
    }
    this.elements.GraduationImage.addEventListener('load',()=>{this.hideMediaLoading()})

    window.addEventListener('dropdown:close', this.handleDropdownEvent);
    window.addEventListener('dropdown:open', this.handleDropdownEvent);
    window.addEventListener("resize", this.eventHandlers.resize);
    window.addEventListener('themechanged', () => {
      this.updateMenuItems();
    });
    appLogger.debug("Window resize listener attached");

    appLogger.timeEnd("Event listener setup");
  }

  /**
   * Start the application
   */
  startApp() {
    appLogger.time("Application startup");

    // Load image
    appLogger.debug("Starting image load");

    // Initial animations
    appLogger.debug("Starting message animations");
    this.animateMessagesSequentially();

    // Initial confetti burst
    setTimeout(() => {
      appLogger.debug("Triggering initial confetti burst");
      this.modules.confetti.triggerConfetti(30);
    }, 1000);

    appLogger.info("Application startup sequence completed");
    appLogger.timeEnd("Application startup");
  }

  /**
   * Handle window resize
   */
  handleResize() {
    appLogger.debug("Window resize handled");
    if (this.modules.confetti) {
      this.modules.confetti.setupCanvas();
    }
  }

  /**
   * Animate messages sequentially
   */
  animateMessagesSequentially() {
    if (!this.elements.messageItems) {
      appLogger.warn("No message items found for animation");
      return;
    }

    appLogger.debug("Starting sequential message animations", {
      messageCount: this.elements.messageItems.length,
    });

    this.elements.messageItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = "1";
        item.style.visibility = "visible";
        appLogger.debug(`Message ${index + 1} animated`);
      }, index * 300);
    });
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    appLogger.error("Handling initialization error", error);

    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef476f;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
    `;
    errorDiv.textContent = "Failed to initialize page. Please refresh.";
    document.body.appendChild(errorDiv);

    appLogger.debug("Error message displayed to user");

    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
        appLogger.debug("Error message removed");
      }
    }, 5000);
  }

  /**
   * Animate messages one by one
   */
  animateMessagesOneByOne() {
    if (!this.elements.messageItems) {
      appLogger.warn("No message items found for animation");
      return;
    }
    
    appLogger.debug("Starting one-by-one message animations", {
      messageCount: this.elements.messageItems.length,
    });
    let index = 0;
    
    const animateNext = () => {
      if (index >= this.elements.messageItems.length) {
        appLogger.debug("All messages animated");
        return;
      }
      
      const item = this.elements.messageItems[index];
      item.style.opacity = "1";
      item.style.visibility = "visible";
      appLogger.debug(`Message ${index + 1} animated`);
      index++;
      
      setTimeout(animateNext, 300);
    };
    
    animateNext();
  }

  handleDropdownEvent = (e) => {
    appLogger.debug("Dropdown event received", e.type);
    if (e.type === "dropdown:close") {
      this.modules.imageLoader.resumeRotation();
      appLogger.debug("Image rotation paused due to dropdown close");
    }
    if (e.type === "dropdown:open") {
      this.modules.imageLoader.pauseRotation();
      appLogger.debug("Image rotation resumed due to dropdown open");
    }
  }

  /**
  * Change the name of the title 
  */
  changeTitleName() {
    appLogger.time("Change title name");
    const titleElement = document.querySelector(".Graduation-title");
    const auth = getCurrentUserInfo();
    const newName = auth && auth.name ? auth.name : "Friend";
    const headerClass = "span class=\"name-highlight glow\" tabindex=\"0\" role=\"button\""
    if (titleElement) {
        if (auth.isGraduand) {
            titleElement.innerHTML = `Congratulations, ${newName}! <${headerClass}> Combine Maths&Cscs 2025! 💘💗💓</span
 `;
            appLogger.debug("Title name changed", {newName});
        }
        else if (auth.code === 'L') {
            titleElement.innerHTML = `Welcome, <br> <${headerClass}> ${newName}💗💓! </span>`
            this.switchYoutubeIframeVideos(true)
        }
        else{
            titleElement.innerHTML = `Welcome, ${newName}! <${headerClass}> Explore Graduation Wishes! 🎓✨</span>`
        }
    } else {
      appLogger.warn("Title element not found for name change");
    }
    appLogger.timeEnd("Change title name");
  }

  switchYoutubeIframeVideos(enable) {
    appLogger.time("Switch YouTube iframe videos");
    const video1 = document.getElementById("youtubeVideo");
    const src = 'https://www.youtube.com/embed/I0XmZX0HEIw?si=43eqxmqcd1mv7ipS'
        enable ? video1.src = src : '' ;
      }


  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Initialize fallback mode when modules fail
   */
  initializeFallbackMode() {
    appLogger.warn("Initializing fallback mode due to module failures");
    // Basic functionality without advanced features
    if (this.elements.GraduationImage) {
      this.elements.GraduationImage.src = "/pics/profile_pic.jpg";
    }
    this.animateMessagesSequentially();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    appLogger.time("GraduationApp cleanup");
      appLogger.info("GraduationApp destroyed successfully");
    // Destroy all modules
    Object.entries(this.modules).forEach(([name, module]) => {
      if (module && typeof module.destroy === "function") {
        appLogger.debug(`Destroying module: ${name}`);
        module.destroy();
      }
    });
      if (this.modules.imageLoader?.navigationController) {
    this.modules.imageLoader.navigationController.destroy();
  }
      // Destroy dropdown manager
      if (this.dropdownManager) {
          this.dropdownManager.destroy();
      }
      // Destroy theme manager
      if (this.themeManager) {
          this.themeManager.destroy();
      }

    // Remove event listeners
    if (this.elements.imageContainer) {
      this.elements.imageContainer.removeEventListener(
        "mouseenter",
        this.eventHandlers.imageMouseEnter
      );
      this.elements.imageContainer.removeEventListener(
        "touchstart",
        this.eventHandlers.imageTouchStart
      );
      appLogger.debug("Image container event listeners removed");
    }

    window.removeEventListener("resize", this.eventHandlers.resize);
    appLogger.debug("Window resize listener removed");

    this.isInitialized = false;
    appLogger.info("GraduationApp destroyed successfully");
    appLogger.timeEnd("GraduationApp cleanup");

    // Clear state
      this.isInitialized = false;
      this.modules = {};
      this.state = {};
  }


}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ConfettiSystem,
    ImageLoader,
    ScrollAnimator,
    ShareManager,
    GraduationApp,
    PerformanceMonitor,
  };
}

export default GraduationApp;
