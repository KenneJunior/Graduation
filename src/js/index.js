import logger from "../js/utility/logger.js";
import { loadMediaData } from "./utility/utils.js";
("use strict");

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
 * CONFETTI SYSTEM - Canvas-based particle effects
 * @class ConfettiSystem
 */
class ConfettiSystem {
  constructor(container) {
    confettiLogger.time("ConfettiSystem constructor");
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.particleCount = 0;
    this.animationId = null;
    this.colors = ["#8E2DE2", "#4A00E0", "#FF6B6B", "#FECA57", "#1DD1A1"];
    this.isActive = false;
    this.mainPage = "memories";

    confettiLogger.debug("ConfettiSystem instance created", {
      container: container?.className || "unknown",
    });
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
      this.setupResizeListener();
      this.animate = this.animate.bind(this);
      this.isActive = true;

      // Set up event listeners
      this.setupEventListeners();
      confettiLogger.info("Confetti system initialized successfully");
      confettiLogger.timeEnd("Confetti initialization");
    } catch (error) {
      confettiLogger.error("Failed to initialize confetti system", error);
    }
  }

  /**
   * Create and configure canvas element
   */
  createCanvas() {
    try {
      confettiLogger.time("Canvas creation");
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");

      if (!this.ctx) {
        throw new Error("Canvas context not supported");
      }

      this.setupCanvas();

      if (!this.canvas.parentNode) {
        this.container.appendChild(this.canvas);
      }
      confettiLogger.debug("Canvas created and configured");
      confettiLogger.timeEnd("Canvas creation");
    } catch (error) {
      confettiLogger.error("Failed to create canvas", error);
      throw error;
    }
  }

  /**
   * Setup canvas dimensions and styles
   */
  setupCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    Object.assign(this.canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
      zIndex: "10",
    });

    confettiLogger.debug("Canvas setup completed", {
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    confettiLogger.time("Event listeners setup");

    // Image container click
    /*const imageContainer = document.querySelector(".image-container");
    if (imageContainer) {
      imageContainer.addEventListener("click", () => {
        confettiLogger.debug(
          "Image container clicked, navigating to memories"
        );
        window.location.href = this.mainPage;
      });
    }*/

    // Name highlight click
    const nameHighlight = document.querySelector(".name-highlight");
    if (nameHighlight) {
      nameHighlight.addEventListener("click", () => {
        confettiLogger.debug(
          "Name highlight clicked, navigating to memories.html"
        );
        window.location.href = this.mainPage;
      });
    }

    confettiLogger.timeEnd("Event listeners setup");
  }

  /**
   * Trigger confetti explosion
   * @param {number} count - Number of particles
   */
  triggerConfetti(count = 50) {
    if (!this.isActive) {
      confettiLogger.warn("Confetti system not active, cannot trigger");
      return;
    }

    confettiLogger.debug("Triggering confetti", { particleCount: count });
    const rect = this.container.getBoundingClientRect();

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * rect.width,
        y: -20 - Math.random() * 100,
        size: Math.random() * 12 + 5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speed: Math.random() * 4 + 2,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * 0.2 - 0.1,
        rotationSpeed: Math.random() * 0.02 - 0.01,
        shape: Math.random() > 0.5 ? "circle" : "rect",
        opacity: 1,
        gravity: 0.1,
      });
    }

    this.particleCount += count;
    confettiLogger.debug("Particles added to system", {
      totalParticles: this.particleCount,
    });

    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.animate);
      confettiLogger.debug("Animation frame requested");
    }
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isActive || this.particleCount === 0) {
      confettiLogger.debug("Animation stopped - no particles or inactive");
      this.animationId = null;
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let particlesRemoved = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update physics
      p.y += p.speed;
      p.speed += p.gravity;
      p.angle += p.rotationSpeed;
      p.opacity -= 0.005;

      // Remove dead particles efficiently
      if (p.y > this.canvas.height || p.opacity <= 0) {
        this.particles.splice(i, 1);
        this.particleCount--;
        particlesRemoved++;
        continue;
      }
      // Draw particle
      this.drawParticles(p);
    }

    /*if (particlesRemoved > 0) {
      confettiLogger.debug("Particles cleaned up", {
        removed: particlesRemoved,
      });
    }
*/
    if (this.particleCount > 0) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      confettiLogger.debug("All particles expired, stopping animation");
      this.animationId = null;
    }
  }

  drawParticles(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.angle);
    this.ctx.globalAlpha = Math.max(0, p.opacity);
    this.ctx.fillStyle = p.color;

    if (p.shape === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }

    this.ctx.restore();
  }

  /**
   * Setup resize listener with debounce
   */
  setupResizeListener() {
    confettiLogger.debug("Setting up resize listener");
    const debouncedResize = this.debounce(() => {
      confettiLogger.debug("Window resized, updating canvas");
      this.setupCanvas();
    }, 200);

    window.addEventListener("resize", debouncedResize);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    confettiLogger.time("Confetti system cleanup");
    this.isActive = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      confettiLogger.debug("Animation frames cancelled");
    }

    window.removeEventListener("resize", this.debounce);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      confettiLogger.debug("Canvas removed from DOM");
    }

    confettiLogger.info("Confetti system destroyed");
    confettiLogger.timeEnd("Confetti system cleanup");
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
}

/**
 * IMAGE LOADER - Advanced image loading, caching, rotation and transition system
 * @class ImageLoader
 * @implements {IResponsiveImageLoader}
 */
class ImageLoader {
  /**
   * Create an ImageLoader instance
   * @param {HTMLElement} imageElement - The main image element
   * @param {HTMLElement} placeholderElement - Placeholder element for loading states
   * @param {Object} options - Configuration options
   */
  constructor(imageElement, placeholderElement, options = {}) {
    imageLogger.time("ImageLoader constructor");
    
    // Validate required elements
    if (!imageElement) {
      throw new Error("ImageLoader requires a valid image element");
    }
    
    this.navigationController = null;
    this.image = imageElement;
    this.placeholder = placeholderElement;
    
    // Configuration with defaults
    this.config = {
      rotationDelay: options.rotationDelay || 5000,
      transitionDuration: options.transitionDuration || 600,
      preloadCount: options.preloadCount || 2,
      maxRetries: options.maxRetries || 2,
      retryDelay: options.retryDelay || 1000,
      lazyLoadThreshold: options.lazyLoadThreshold || 300,
      enableWebP: options.enableWebP !== false,
      enableBlurHash: options.enableBlurHash !== false,
      pauseOnHover: options.pauseOnHover !== false,
      ...options
    };
    
    // State management
    this.mediaData = null;
    this.currentIndex = 0;
    this.rotationInterval = null;
    this.isLoaded = false;
    this.isRotating = false;
    this.paused = false;
    this.retryCounts = new Map();
    this.preloadedImages = new Map();
    this.performanceMetrics = {
      loadTimes: [],
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // Bind methods for event listeners
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleNetworkChange = this.handleNetworkChange.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
    
    // Feature detection
    this.supportsIntersectionObserver = 'IntersectionObserver' in window;
    this.supportsWebP = this.detectWebPSupport();
    this.isLowBandwidth = this.detectLowBandwidth();
    
    imageLogger.debug("ImageLoader instance created", {
      config: this.config,
      features: {
        intersectionObserver: this.supportsIntersectionObserver,
        webP: this.supportsWebP,
        lowBandwidth: this.isLowBandwidth
      }
    });
    
    // Initialize
    this.init();
    imageLogger.timeEnd("ImageLoader constructor");
  }

  /**
   * Initialize the image loader
   * @async
   */
  async init() {
    imageLogger.time("ImageLoader initialization");
    
    try {
      // Load media data first
      await this.loadMediaData();
      
      if (!this.mediaData?.media?.length) {
        imageLogger.warn("No media found for slideshow");
        this.showNoMediaMessage();
        return;
      }
      
      // Setup intersection observer for lazy loading
      this.setupIntersectionObserver();

        // After imageLoader is fully initialized
        if (!this.navigationController) {
          this.navigationController = new ImageNavigationController(this);
        }
      
      // Preload initial images
      await this.preloadInitialImages();
      
      // Load and display first image
      await this.loadImageAtIndex(0, true);
      
      // Start rotation if more than one image
      if (this.mediaData.media.length > 1) {
        this.startRotation();
      }
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      this.isLoaded = true;
      imageLogger.info("ImageLoader initialized successfully", {
        totalImages: this.mediaData.media.length,
        preloaded: this.preloadedImages.size
      });
      
    } catch (error) {
      imageLogger.error("Failed to initialize ImageLoader", error);
      this.handleInitializationError(error);
    } finally {
      imageLogger.timeEnd("ImageLoader initialization");
    }
  }

  /**
   * Load media data from source
   * @async
   * @returns {Promise<void>}
   */
  async loadMediaData() {
    imageLogger.time("Load media data");
    
    try {
      this.mediaData = await loadMediaData();
      
      if (!this.mediaData?.media?.length) {
        throw new Error("No media data available");
      }
      
      // Optimize image sources based on browser support
      this.mediaData.media = this.mediaData.media.map(mediaItem => {
        return this.optimizeMediaItem(mediaItem);
      });
      
      imageLogger.debug("Media data loaded and optimized", {
        count: this.mediaData.media.length,
        optimizedForWebP: this.supportsWebP
      });
      
    } catch (error) {
      imageLogger.error("Failed to load media data", error);
      this.mediaData = {
        media: this.getFallbackMedia()
      };
    } finally {
      imageLogger.timeEnd("Load media data");
    }
  }


  setRotationSpeed(speed) {
    this.config.rotationDelay = speed;
    if (this.rotationInterval) {
      this.stopRotation();
      this.startRotation();
    }
 }

  /**
   * Optimize media item based on browser capabilities
   * @param {Object} mediaItem - Original media item
   * @returns {Object} Optimized media item
   */
  optimizeMediaItem(mediaItem) {
    const optimized = { ...mediaItem };
    
    // Use WebP if supported and available
    if (this.config.enableWebP && this.supportsWebP && mediaItem.srcWebP) {
      optimized.src = mediaItem.srcWebP;
      optimized.format = 'webp';
    }
    
    // Add blur hash placeholder if enabled
    if (this.config.enableBlurHash && mediaItem.blurHash) {
      optimized.blurHash = mediaItem.blurHash;
    }
    
    // Generate responsive srcset if sizes are available
    if (mediaItem.sizes) {
      optimized.srcset = this.generateSrcset(mediaItem);
    }
    
    // Add loading strategy
    optimized.loading = this.isLowBandwidth ? 'lazy' : 'eager';
    
    return optimized;
  }

  /**
   * Generate srcset for responsive images
   * @param {Object} mediaItem - Media item with sizes
   * @returns {string} srcset attribute value
   */
  generateSrcset(mediaItem) {
    if (!mediaItem.sizes || !Array.isArray(mediaItem.sizes)) {
      return '';
    }
    
    return mediaItem.sizes
      .map(size => {
        const url = this.supportsWebP && size.webp ? size.webp : size.url;
        return `${url} ${size.width}w`;
      })
      .join(', ');
  }

/**
 * Set up intersection observer with fallback
 */
setupIntersectionObserver() {
  if (!this.supportsIntersectionObserver) {
    imageLogger.warn("IntersectionObserver not supported, using fallback");
    this.initializeWithoutObserver();
    return;
  }
  
  imageLogger.time("Setup IntersectionObserver");
  
  this.intersectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        const { isIntersecting, intersectionRatio, boundingClientRect } = entry;
        
        imageLogger.debug("IntersectionObserver entry", {
          isIntersecting,
          intersectionRatio: intersectionRatio.toFixed(3),
          bounds: {
            top: Math.round(boundingClientRect.top),
            bottom: Math.round(boundingClientRect.bottom)
          }
        });
        
        if (isIntersecting && intersectionRatio > 0.1) {
          this.onImageVisible(entry.target);
          // We could unobserve here, but let's keep observing for performance monitoring
          // this.intersectionObserver.unobserve(entry.target);
        } else if (!isIntersecting && this.config.pauseWhenNotVisible) {
          // Optional: pause rotation when not visible
          this.pauseRotation();
          imageLogger.debug("Image not visible - rotation paused");
        }
      });
    },
    {
      root: null, // viewport
      rootMargin: `${this.config.lazyLoadThreshold}px`,
      threshold: [0, 0.1, 0.5, 1.0] // Multiple thresholds for better monitoring
    }
  );
  
  // Observe the main image element
  if (this.image) {
    this.intersectionObserver.observe(this.image);
    imageLogger.debug("IntersectionObserver attached to image element");
  }
  
  // Optionally observe the container for better user experience
  const container = this.image.parentElement;
  if (container && container !== document.body) {
    this.intersectionObserver.observe(container);
    imageLogger.debug("IntersectionObserver also attached to container");
  }
  
  imageLogger.timeEnd("Setup IntersectionObserver");
}

/**
 * Initialize without IntersectionObserver (fallback)
 */
initializeWithoutObserver() {
  imageLogger.time("Initialize without IntersectionObserver");
  
  // Load immediately without lazy loading
  if (this.mediaData?.media?.length > 0) {
    this.loadImageAtIndex(0, true).catch(error => {
      imageLogger.error("Fallback initialization failed", error);
    });
  }
  
  // Start rotation immediately
  if (this.mediaData?.media?.length > 1) {
    this.startRotation();
  }
  
  imageLogger.timeEnd("Initialize without IntersectionObserver");
}

/**
 * Check if image is currently visible in viewport
 * @returns {boolean}
 */
isImageVisible() {
  if (!this.image) return false;
  
  const rect = this.image.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= viewportHeight &&
    rect.right <= viewportWidth
  );
}

/**
 * Force visibility check and load if needed
 * @async
 */
async ensureImageVisible() {
  if (this.isImageVisible() && !this.isLoaded) {
    imageLogger.debug("Image is visible but not loaded - forcing load");
    await this.loadImageAtIndex(this.currentIndex, true);
  }
}

  /**
   * Preload initial images for smooth rotation
   * @async
   * @returns {Promise<void>}
   */
  async preloadInitialImages() {
    imageLogger.time("Preload initial images");
    
    const preloadPromises = [];
    const preloadCount = Math.min(this.config.preloadCount, this.mediaData.media.length);
    
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = i % this.mediaData.media.length;
      preloadPromises.push(this.preloadImageAtIndex(nextIndex));
    }
    
    try {
      await Promise.all(preloadPromises);
      imageLogger.debug("Initial images preloaded", {
        count: preloadCount,
        successful: this.preloadedImages.size
      });
    } catch (error) {
      imageLogger.warn("Some images failed to preload", error);
    } finally {
      imageLogger.timeEnd("Preload initial images");
    }
  }

  /**
   * Preload image at specific index
   * @param {number} index - Image index to preload
   * @returns {Promise<HTMLImageElement>}
   */
  async preloadImageAtIndex(index) {
    if (this.preloadedImages.has(index)) {
      this.performanceMetrics.cacheHits++;
      return this.preloadedImages.get(index);
    }
    
    const mediaItem = this.mediaData.media[index];
    if (!mediaItem) {
      throw new Error(`No media item at index ${index}`);
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Store loading start time
      const startTime = performance.now();
      
      img.onload = () => {
        const loadTime = performance.now() - startTime;
        this.performanceMetrics.loadTimes.push(loadTime);
        
        // Cache the loaded image
        this.preloadedImages.set(index, img);
        this.performanceMetrics.cacheMisses++;
        
        imageLogger.debug("Image preloaded", {
          index,
          src: mediaItem.src,
          loadTime: `${loadTime.toFixed(2)}ms`
        });
        
        resolve(img);
      };
      
      img.onerror = (error) => {
        imageLogger.error("Failed to preload image", {
          index,
          src: mediaItem.src,
          error
        });
        reject(error);
      };
      
      // Set src to start loading
      img.src = mediaItem.src;
      
      // Preload srcset if available
      if (mediaItem.srcset) {
        img.srcset = mediaItem.srcset;
      }
    });
  }

  /**
   * Load and display image at specific index
   * @async
   * @param {number} index - Image index to load
   * @param {boolean} isInitial - Whether this is the initial load
   * @returns {Promise<void>}
   */
  async loadImageAtIndex(index, isInitial = false) {
    if (index < 0 || index >= this.mediaData.media.length) {
      imageLogger.error("Invalid image index", { index });
      return;
    }
    
    imageLogger.time(`Load image at index ${index}`);
    
    try {
      // Check if image is preloaded
      let loadedImage = this.preloadedImages.get(index);
      
      if (!loadedImage) {
        // Load image with retry logic
        loadedImage = await this.loadImageWithRetry(index);
      }
      
      // Update current index
      this.currentIndex = index;

        if (this.navigationController) {
    this.navigationController.currentIndex = index;
    this.navigationController.updateUI();
  }
      
      // Perform transition
      await this.transitionToImage(loadedImage, isInitial);
      
      // Preload next images
      this.preloadNextImages();
      
      imageLogger.debug("Image loaded successfully", {
        index,
        src: loadedImage.src,
        fromCache: !!this.preloadedImages.has(index)
      });
      
    } catch (error) {
      imageLogger.error("Failed to load image", {
        index,
        error: error.message
      });
      
      // Try to load fallback image
      await this.loadFallbackImage();
    } finally {
      imageLogger.timeEnd(`Load image at index ${index}`);
    }
  }

  /**
   * Load image with retry logic
   * @async
   * @param {number} index - Image index
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImageWithRetry(index) {
    const mediaItem = this.mediaData.media[index];
    const retryKey = `${index}-${mediaItem.src}`;
    let retryCount = this.retryCounts.get(retryKey) || 0;
    
    while (retryCount <= this.config.maxRetries) {
      try {
        const img = await this.loadImage(mediaItem);
        
        // Reset retry count on success
        this.retryCounts.delete(retryKey);
        
        return img;
      } catch (error) {
        retryCount++;
        this.retryCounts.set(retryKey, retryCount);
        
        if (retryCount > this.config.maxRetries) {
          throw error;
        }
        
        imageLogger.warn(`Retrying image load (${retryCount}/${this.config.maxRetries})`, {
          index,
          src: mediaItem.src
        });
        
        // Wait before retry
        await this.delay(this.config.retryDelay * retryCount);
      }
    }
  }

  /**
   * Load single image
   * @async
   * @param {Object} mediaItem - Media item to load
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(mediaItem) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const startTime = performance.now();
      
      // Set timeout for image loading
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout: ${mediaItem.src}`));
      }, 15000); // 15 second timeout
      
      img.onload = () => {
        clearTimeout(timeoutId);
        const loadTime = performance.now() - startTime;
        this.performanceMetrics.loadTimes.push(loadTime);
        
        // Apply blur hash if available
        if (mediaItem.blurHash && this.config.enableBlurHash) {
          this.applyBlurHash(img, mediaItem.blurHash);
        }
        
        resolve(img);
      };
      
      img.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image: ${mediaItem.src}`));
      };
      
      // Set image attributes
      img.src = mediaItem.src;
      if (mediaItem.srcset) {
        img.srcset = mediaItem.srcset;
      }
      if (mediaItem.sizes) {
        img.sizes = mediaItem.sizes;
      }
      img.loading = mediaItem.loading || 'eager';
      img.decoding = 'async';
      
      // Set alt text if available
      if (mediaItem.alt) {
        img.alt = mediaItem.alt;
      }
    });
  }

  /**
   * Transition to new image with smooth animation
   * @async
   * @param {HTMLImageElement} newImage - The new image to display
   * @param {boolean} isInitial - Whether this is the initial transition
   * @returns {Promise<void>}
   */
  async transitionToImage(newImage, isInitial = false) {
    imageLogger.time("Image transition");
    
    return new Promise((resolve) => {
      // Store current image state
      const oldSrc = this.image.src;
      const isSameImage = oldSrc === newImage.src;
      
      if (isSameImage && !isInitial) {
        imageLogger.debug("Skipping transition - same image");
        resolve();
        return;
      }
      
      // Prepare new image
      const tempImage = new Image();
      tempImage.src = newImage.src;
      if (newImage.srcset) tempImage.srcset = newImage.srcset;
      if (newImage.sizes) tempImage.sizes = newImage.sizes;
      
      // Handle initial load (no transition)
      if (isInitial) {
        this.image.src = newImage.src;
        if (newImage.srcset) this.image.srcset = newImage.srcset;
        if (newImage.sizes) this.image.sizes = newImage.sizes;
        this.image.classList.remove('d-none');
        
        if (this.placeholder) {
          this.placeholder.style.display = 'none';
        }
        
        resolve();
        imageLogger.timeEnd("Image transition");
        return;
      }
      
      // Cross-fade transition
      this.image.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
      this.image.style.opacity = '0';
      
      // After fade out completes
      setTimeout(() => {
        // Swap image source
        this.image.src = newImage.src;
        if (newImage.srcset) this.image.srcset = newImage.srcset;
        if (newImage.sizes) this.image.sizes = newImage.sizes;
        
        // Apply alt text
        if (newImage.alt) {
          this.image.alt = newImage.alt;
        }
        
        // Fade in new image
        this.image.style.opacity = '1';
        
        // Resolve after transition completes
        setTimeout(() => {
          this.image.style.transition = '';
          resolve();
          imageLogger.debug("Image transition completed");
          imageLogger.timeEnd("Image transition");
        }, this.config.transitionDuration);
      }, this.config.transitionDuration);
    });
  }

  /**
   * Preload next images in sequence
   */
  preloadNextImages() {
    const nextIndices = [];
    
    for (let i = 1; i <= this.config.preloadCount; i++) {
      const nextIndex = (this.currentIndex + i) % this.mediaData.media.length;
      if (!this.preloadedImages.has(nextIndex)) {
        nextIndices.push(nextIndex);
      }
    }
    
    // Preload in background
    if (nextIndices.length > 0 && !this.paused) {
      nextIndices.forEach(index => {
        this.preloadImageAtIndex(index).catch(error => {
          imageLogger.debug("Background preload failed", {
            index,
            error: error.message
          });
        });
      });
    }
  }

  /**
   * Start image rotation
   */
  startRotation() {
    if (this.isRotating || this.mediaData.media.length <= 1) {
      return;
    }
    
    this.isRotating = true;
    this.paused = false;
    
    this.rotationInterval = setInterval(() => {
      if (!this.paused) {
        this.nextImage();
      }
    }, this.config.rotationDelay);
    
    imageLogger.info("Image rotation started", {
      interval: this.config.rotationDelay,
      totalImages: this.mediaData.media.length
    });
  }

  /**
   * Stop image rotation
   */
  stopRotation() {
    this.isRotating = false;
    
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
      imageLogger.debug("Image rotation stopped");
    }
  }

  /**
   * Pause rotation (without stopping)
   */
  pauseRotation() {
    this.paused = true;
    imageLogger.debug("Image rotation paused");
  }

  /**
   * Resume rotation
   */
  resumeRotation() {
    this.paused = false;
    imageLogger.debug("Image rotation resumed");
  }

  /**
   * Move to next image
   */
  async nextImage() {
    const nextIndex = (this.currentIndex + 1) % this.mediaData.media.length;
    await this.loadImageAtIndex(nextIndex);
  }

  /**
   * Move to previous image
   */
  async previousImage() {
    const prevIndex = (this.currentIndex - 1 + this.mediaData.media.length) % this.mediaData.media.length;
    await this.loadImageAtIndex(prevIndex);
  }

  /**
   * Jump to specific image
   * @param {number} index - Image index to jump to
   */
  async jumpToImage(index) {
    if (index >= 0 && index < this.mediaData.media.length) {
      await this.loadImageAtIndex(index);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Visibility change
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Network status
    window.addEventListener('online', this.handleNetworkChange);
    window.addEventListener('offline', this.handleNetworkChange);
    
    // Image error handling
    this.image.addEventListener('error', this.handleImageError);
    
    // Pause on hover (optional)
    if (this.config.pauseOnHover) {
      this.image.addEventListener('mouseenter', () => this.pauseRotation());
      this.image.addEventListener('mouseleave', () => this.resumeRotation());
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.previousImage();
      } else if (e.key === 'ArrowRight') {
        this.nextImage();
      }
    });
  }

  /**
   * Handle visibility change
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseRotation();
      imageLogger.debug("Page hidden - rotation paused");
    } else {
      this.resumeRotation();
      imageLogger.debug("Page visible - rotation resumed");
    }
  }

  /**
   * Handle network status change
   */
  handleNetworkChange() {
    if (navigator.onLine) {
      // Resume normal operation
      this.resumeRotation();
      imageLogger.debug("Online - resuming normal operation");
    } else {
      // Pause rotation and switch to low-bandwidth mode
      this.pauseRotation();
      this.isLowBandwidth = true;
      imageLogger.debug("Offline - pausing rotation and enabling low-bandwidth mode");
    }
  }

  /**
   * Handle image error
   */
  handleImageError(event) {
    imageLogger.error("Image error occurred", {
      src: event.target.src,
      error: event.error
    });
    
    // Try to load fallback
    this.loadFallbackImage().catch(() => {
      this.showErrorState();
    });
  }

  /**
   * Load fallback image
   * @async
   */
  async loadFallbackImage() {
    const fallbackMedia = this.getFallbackMedia();
    if (fallbackMedia.length > 0) {
      const fallbackItem = this.optimizeMediaItem(fallbackMedia[0]);
      const img = await this.loadImage(fallbackItem);
      this.image.src = img.src;
      imageLogger.debug("Fallback image loaded");
    }
  }

  /**
   * Get fallback media items
   * @returns {Array} Fallback media items
   */
  getFallbackMedia() {
    return [
      {
        src: '/pics/profile_pic.jpg',
        alt: 'Default graduation photo'
      }
    ];
  }

  /**
 * Handle when image becomes visible in viewport (for lazy loading)
 * @param {HTMLElement} target - The observed element
 */
onImageVisible(target) {
  imageLogger.debug("Image element entered viewport", {
    element: target.tagName,
    src: target.src || 'not-yet-loaded',
    currentIndex: this.currentIndex
  });
  
  // If this is the initial load and we haven't loaded the first image yet
  if (!this.isLoaded && this.currentIndex === 0) {
    imageLogger.debug("First time image visible - triggering initial load");
    
    // Load the first image if not already loaded
    if (!this.image.src || this.image.src === '') {
      this.loadImageAtIndex(0, true).catch(error => {
        imageLogger.error("Failed to load initial image on visible", error);
      });
    }
  }
  
  // If we're in low-bandwidth mode and images aren't preloaded, load on demand
  if (this.isLowBandwidth && !this.preloadedImages.has(this.currentIndex)) {
    imageLogger.debug("Low bandwidth mode - loading current image on demand");
    this.preloadImageAtIndex(this.currentIndex).catch(error => {
      imageLogger.warn("Failed to load image on demand in low bandwidth mode", error);
    });
  }
  
  // Start or resume rotation if it was paused due to visibility
  if (!this.isRotating && this.mediaData.media.length > 1) {
    imageLogger.debug("Image visible - starting rotation if not already running");
    this.startRotation();
  }
  
  // Trigger a performance check
  this.checkImagePerformance(target);
}

/**
 * Check and log image loading performance when visible
 * @param {HTMLElement} imgElement - The image element to check
 */
checkImagePerformance(imgElement) {
  // Check if image is already loaded
  if (imgElement.complete) {
    const loadTime = this.performanceMetrics.loadTimes[this.currentIndex];
    if (loadTime) {
      imageLogger.debug("Image already loaded when became visible", {
        index: this.currentIndex,
        loadTime: `${loadTime.toFixed(2)}ms`,
        naturalSize: `${imgElement.naturalWidth}x${imgElement.naturalHeight}`
      });
    }
    
    // Check if image is displayed at appropriate size
    const displayedWidth = imgElement.clientWidth;
    const naturalWidth = imgElement.naturalWidth;
    const scaleFactor = displayedWidth / naturalWidth;
    
    if (scaleFactor > 1.5) {
      imageLogger.warn("Image potentially upscaled too much", {
        displayedWidth,
        naturalWidth,
        scaleFactor: scaleFactor.toFixed(2),
        recommendation: "Consider using a larger source image"
      });
    } else if (scaleFactor < 0.5) {
      imageLogger.warn("Image potentially larger than needed", {
        displayedWidth,
        naturalWidth,
        scaleFactor: scaleFactor.toFixed(2),
        recommendation: "Consider using a smaller source image for better performance"
      });
    }
  } else {
    // Image is still loading
    imageLogger.debug("Image still loading when became visible", {
      index: this.currentIndex,
      src: imgElement.src
    });
    
    // Set up a load listener to track when it finishes
    const loadListener = () => {
      const loadTime = performance.now() - performance.now(); // This would need actual start time tracking
      imageLogger.debug("Image finished loading after becoming visible", {
        index: this.currentIndex,
        loadTime: `${loadTime.toFixed(2)}ms`
      });
      imgElement.removeEventListener('load', loadListener);
    };
    
    imgElement.addEventListener('load', loadListener);
  }
  
  // Check for placeholder visibility
  if (this.placeholder && this.placeholder.style.display !== 'none') {
    imageLogger.debug("Placeholder still visible, image might be slow to load", {
      placeholderVisible: true,
      currentSrc: imgElement.src
    });
  }
}


  /**
   * Show error state
   */
  showErrorState() {
    if (this.placeholder) {
      this.placeholder.innerHTML = `
        <div class="image-error">
          <span class="error-icon">⚠️</span>
          <p>Unable to load image</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;
      
      this.placeholder.style.display = 'flex';
      this.placeholder.querySelector('.retry-btn').addEventListener('click', () => {
        this.loadImageAtIndex(this.currentIndex);
      });
    }
  }

  /**
   * Show no media message
   */
  showNoMediaMessage() {
    if (this.placeholder) {
      this.placeholder.innerHTML = `
        <div class="no-media-message">
          <p>No images available</p>
        </div>
      `;
      this.placeholder.style.display = 'flex';
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Log performance metrics periodically
    setInterval(() => {
      if (this.performanceMetrics.loadTimes.length > 0) {
        const avgLoadTime = this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / 
                           this.performanceMetrics.loadTimes.length;
        
        imageLogger.debug("Performance metrics", {
          avgLoadTime: `${avgLoadTime.toFixed(2)}ms`,
          cacheHitRate: `${((this.performanceMetrics.cacheHits / 
                           (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses || 1)) * 100).toFixed(1)}%`,
          imagesLoaded: this.performanceMetrics.loadTimes.length
        });
      }
    }, 30000); // Log every 30 seconds
  }

  /**
   * Handle initialization error
   */
  handleInitializationError(error) {
    imageLogger.error("Initialization error handled", error);
    
    // Show error to user
    if (this.placeholder) {
      this.placeholder.innerHTML = `
        <div class="init-error">
          <p>Failed to load images. Please refresh.</p>
        </div>
      `;
      this.placeholder.style.display = 'flex';
    }
    
    // Load single fallback image
    this.loadFallbackImage();
  }

  /**
   * Utility: Delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Detect WebP support
   * @returns {boolean}
   */
  detectWebPSupport() {
    const elem = document.createElement('canvas');
    if (!!(elem.getContext && elem.getContext('2d'))) {
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  }

  /**
   * Detect low bandwidth
   * @returns {boolean}
   */
  detectLowBandwidth() {
    if (navigator.connection) {
      const connection = navigator.connection;
      return connection.saveData || 
             connection.effectiveType === 'slow-2g' || 
             connection.effectiveType === '2g';
    }
    return false;
  }

  /**
   * Apply blur hash placeholder (stub - implement if using blurhash library)
   * @param {HTMLImageElement} img - Image element
   * @param {string} blurHash - Blur hash string
   */
  applyBlurHash(img, blurHash) {
    // Implement blur hash decoding if you have a blurhash library
    // Example: const decoded = decodeBlurHash(blurHash);
    // img.style.backgroundImage = `url(${decoded})`;
    // img.style.filter = 'blur(20px)';
  }

  /**
   * Get current state
   * @returns {Object} Current loader state
   */
  getState() {
    return {
      currentIndex: this.currentIndex,
      totalImages: this.mediaData?.media?.length || 0,
      isRotating: this.isRotating,
      isPaused: this.paused,
      isLoaded: this.isLoaded,
      preloadedCount: this.preloadedImages.size,
      cacheHitRate: this.performanceMetrics.cacheHits / 
                   (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses || 1)
    };
  }

  /**
   * Cleanup all resources
   */
  destroy() {
    imageLogger.time("ImageLoader cleanup");
    
    // Stop rotation
    this.stopRotation();
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('online', this.handleNetworkChange);
    window.removeEventListener('offline', this.handleNetworkChange);
    
    if (this.image) {
      this.image.removeEventListener('error', this.handleImageError);
    }
    
    // Disconnect observers
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    // Clear caches
    this.preloadedImages.clear();
    this.retryCounts.clear();
    
    // Clear intervals
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    // Log final metrics
    imageLogger.info("ImageLoader destroyed", {
      totalImagesLoaded: this.performanceMetrics.loadTimes.length,
      finalCacheSize: this.preloadedImages.size
    });
    
    imageLogger.timeEnd("ImageLoader cleanup");
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
    this.rotationSpeed = 5000; // 5 seconds
    this.playbackSpeed = 1; // Normal speed
    this.rotationTimeout = null;
    this.progressInterval = null;
    this.lastUpdateTime = null;
    this.progress = 0;
    this.isInitialized = false;
    this.keyboardShortcutsEnabled = true;
    
    // DOM Elements
    this.elements = {
      navPrev: null,
      navNext: null,
      playbackBtn: null,
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
    this.updateProgressBar = this.updateProgressBar.bind(this);
    this.resetProgressBar = this.resetProgressBar.bind(this);
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the navigation controller
   */
  init() {
    console.time("ImageNavigationController initialization");
    
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
      
      console.info("ImageNavigationController initialized successfully");
      console.timeEnd("ImageNavigationController initialization");
    } catch (error) {
      console.error("Failed to initialize ImageNavigationController", error);
    }
  }
  
  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      navPrev: document.querySelector('.nav-btn.prev'),
      navNext: document.querySelector('.nav-btn.next'),
      playbackBtn: document.querySelector('.playback-btn'),
      progressBar: document.querySelector('.progress-bar'),
      imageCounter: document.querySelector('.image-counter'),
      thumbnailNav: document.querySelector('.thumbnail-nav'),
      keyboardHints: document.querySelector('.keyboard-hints')
    };
    
    // Create elements if they don't exist
    this.ensureElementsExist();
    
    console.debug("Navigation elements cached", {
      elementsFound: Object.keys(this.elements).filter(key => !!this.elements[key]).length,
      totalElements: Object.keys(this.elements).length
    });
  }
  
  /**
   * Ensure required elements exist in the DOM
   */
  ensureElementsExist() {
    const container = this.imageLoader.image?.parentElement;
    if (!container) return;
    
    // Navigation controls
    if (!this.elements.navPrev) {
      this.elements.navPrev = this.createNavButton('prev', 'Previous (←)');
    }
    
    if (!this.elements.navNext) {
      this.elements.navNext = this.createNavButton('next', 'Next (→)');
    }
    
    // Playback controls
    if (!this.elements.playbackBtn) {
      this.elements.playbackBtn = this.createPlaybackButton();
    }
    
    // Progress bar
    if (!this.elements.progressBar) {
      this.elements.progressBar = this.createProgressBar();
    }
    
    // Image counter
    if (!this.elements.imageCounter) {
      this.elements.imageCounter = this.createImageCounter();
    }
    
    // Thumbnail navigation
    if (!this.elements.thumbnailNav) {
      this.elements.thumbnailNav = this.createThumbnailNav();
    }
    
    // Keyboard hints
    if (!this.elements.keyboardHints) {
      this.elements.keyboardHints = this.createKeyboardHints();
    }
  }
  
  /**
   * Create navigation button
   */
  createNavButton(direction, tooltip) {
    const btn = document.createElement('button');
    btn.className = `nav-btn ${direction}`;
    btn.setAttribute('data-tooltip', tooltip);
    btn.setAttribute('aria-label', direction === 'prev' ? 'Previous image' : 'Next image');
    
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.setAttribute('aria-hidden', 'true');
    
    btn.appendChild(icon);
    return btn;
  }
  
  /**
   * Create playback button
   */
  createPlaybackButton() {
    const btn = document.createElement('button');
    btn.className = 'playback-btn pause';
    btn.setAttribute('aria-label', 'Pause image rotation');
    
    const icon = document.createElement('span');
    icon.className = 'playback-icon';
    icon.setAttribute('aria-hidden', 'true');
    
    const speed = document.createElement('span');
    speed.className = 'playback-speed';
    speed.textContent = `${this.rotationSpeed / 1000}s`;
    
    btn.appendChild(icon);
    btn.appendChild(speed);
    return btn;
  }
  
  /**
   * Create progress bar
   */
  createProgressBar() {
    const container = document.createElement('div');
    container.className = 'rotation-progress';
    container.setAttribute('role', 'progressbar');
    container.setAttribute('aria-label', 'Image rotation progress');
    
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    
    container.appendChild(bar);
    return bar;
  }
  
  /**
   * Create image counter
   */
  createImageCounter() {
    const counter = document.createElement('div');
    counter.className = 'image-counter';
    counter.setAttribute('aria-label', 'Image position');
    counter.innerHTML = '<span class="current">1</span> / <span class="total">0</span>';
    return counter;
  }
  
  /**
   * Create thumbnail navigation
   */
  createThumbnailNav() {
    const container = document.createElement('div');
    container.className = 'thumbnail-nav';
    container.setAttribute('role', 'tablist');
    container.setAttribute('aria-label', 'Image thumbnails');
    return container;
  }
  
  /**
   * Create keyboard hints
   */
  createKeyboardHints() {
    const hints = document.createElement('div');
    hints.className = 'keyboard-hints';
    hints.setAttribute('role', 'status');
    hints.setAttribute('aria-live', 'polite');
    
    const shortcuts = [
      { key: '←', label: 'Previous image' },
      { key: '→', label: 'Next image' },
      { key: 'Space', label: 'Pause/Play' }
    ];
    
    shortcuts.forEach(shortcut => {
      const hint = document.createElement('div');
      hint.className = 'keyboard-hint';
      
      const key = document.createElement('kbd');
      key.className = 'keyboard-key';
      key.textContent = shortcut.key;
      
      const label = document.createElement('span');
      label.textContent = shortcut.label;
      
      hint.appendChild(key);
      hint.appendChild(label);
      hints.appendChild(hint);
    });
    
    return hints;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    console.time("Navigation event listeners setup");
    
    // Navigation buttons
    if (this.elements.navPrev) {
      this.elements.navPrev.addEventListener('click', this.handlePrevClick);
    }
    
    if (this.elements.navNext) {
      this.elements.navNext.addEventListener('click', this.handleNextClick);
    }
    
    // Playback button
    if (this.elements.playbackBtn) {
      this.elements.playbackBtn.addEventListener('click', this.handlePlaybackClick);
    }
    
    // Thumbnail navigation
    if (this.elements.thumbnailNav) {
      this.elements.thumbnailNav.addEventListener('click', this.handleThumbnailClick);
    }
    
    // Mouse events for showing/hiding controls
    const container = this.imageLoader.image?.parentElement;
    if (container) {
      container.addEventListener('mouseenter', () => this.showControls());
      container.addEventListener('mouseleave', () => this.hideControls());
    }
    
    // Touch events for mobile
    if (container) {
      container.addEventListener('touchstart', () => this.showControls(), { passive: true });
      container.addEventListener('touchend', () => {
        setTimeout(() => this.hideControls(), 3000);
      }, { passive: true });
    }
    
    console.timeEnd("Navigation event listeners setup");
  }
  
  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    if (this.keyboardShortcutsEnabled) {
      document.addEventListener('keydown', this.handleKeyDown);
      
      // Add keyboard shortcut indicator
      this.showKeyboardShortcutIndicator();
    }
  }
  
  /**
   * Handle previous button click
   */
  async handlePrevClick() {
    console.debug("Previous button clicked");
    this.animateButton(this.elements.navPrev);
    
    // Reset progress bar
    this.resetProgressBar();
    
    // Navigate to previous image
    await this.previousImage();
    
    // Update UI
    this.updateUI();
  }
  
  /**
   * Handle next button click
   */
  async handleNextClick() {
    console.debug("Next button clicked");
    this.animateButton(this.elements.navNext);
    
    // Reset progress bar
    this.resetProgressBar();
    
    // Navigate to next image
    await this.nextImage();
    
    // Update UI
    this.updateUI();
  }
  
  /**
   * Handle playback button click
   */
  handlePlaybackClick() {
    console.debug("Playback button clicked");
    this.animateButton(this.elements.playbackBtn);
    
    if (this.isPlaying) {
      this.pauseRotation();
    } else {
      this.resumeRotation();
    }
    
    this.updateUI();
  }
  
  /**
   * Handle thumbnail click
   */
  async handleThumbnailClick(event) {
    const thumbnail = event.target.closest('.thumbnail-dot');
    if (!thumbnail) return;
    
    const index = Array.from(this.elements.thumbnailNav.children).indexOf(thumbnail);
    if (index >= 0 && index !== this.currentIndex) {
      console.debug("Thumbnail clicked", { index });
      this.animateButton(thumbnail);
      
      // Reset progress bar
      this.resetProgressBar();
      
      // Jump to selected image
      await this.jumpToImage(index);
      
      // Update UI
      this.updateUI();
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
        console.debug("Left arrow key pressed");
        this.handlePrevClick();
        break;
        
      case 'ArrowRight':
      case 'Right':
        event.preventDefault();
        console.debug("Right arrow key pressed");
        this.handleNextClick();
        break;
        
      case ' ':
      case 'Spacebar':
        if (event.target === document.body || event.target === this.imageLoader.image) {
          event.preventDefault();
          console.debug("Space bar pressed");
          this.handlePlaybackClick();
        }
        break;
        
      case 'p':
      case 'P':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          console.debug("Ctrl+P pressed");
          this.handlePlaybackClick();
        }
        break;
        
      case 'Escape':
        this.hideKeyboardHints();
        break;
    }
  }
  
  /**
   * Navigate to previous image
   */
  async previousImage() {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      console.warn("No media available for navigation");
      return;
    }
    
    const media = this.imageLoader.mediaData.media;
    this.currentIndex = (this.currentIndex - 1 + media.length) % media.length;
    
    console.debug("Navigating to previous image", {
      newIndex: this.currentIndex,
      total: media.length
    });
    
    await this.imageLoader.loadImageAtIndex(this.currentIndex);
  }
  
  /**
   * Navigate to next image
   */
  async nextImage() {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      console.warn("No media available for navigation");
      return;
    }
    
    const media = this.imageLoader.mediaData.media;
    this.currentIndex = (this.currentIndex + 1) % media.length;
    
    console.debug("Navigating to next image", {
      newIndex: this.currentIndex,
      total: media.length
    });
    
    await this.imageLoader.loadImageAtIndex(this.currentIndex);
  }
  
  /**
   * Jump to specific image
   */
  async jumpToImage(index) {
    if (!this.imageLoader || !this.imageLoader.mediaData?.media?.length) {
      console.warn("No media available for navigation");
      return;
    }
    
    const media = this.imageLoader.mediaData.media;
    if (index >= 0 && index < media.length) {
      this.currentIndex = index;
      
      console.debug("Jumping to image", {
        index,
        total: media.length
      });
      
      await this.imageLoader.loadImageAtIndex(this.currentIndex);
    }
  }
  
  /**
   * Pause image rotation
   */
  pauseRotation() {
    if (!this.isPlaying) return;
    
    console.debug("Pausing image rotation");
    this.isPlaying = false;
    
    // Stop the image loader's rotation
    if (this.imageLoader.stopRotation) {
      this.imageLoader.stopRotation();
    }
    
    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // Update button state
    this.updatePlaybackButton();
  }
  
  /**
   * Resume image rotation
   */
  resumeRotation() {
    if (this.isPlaying) return;
    
    console.debug("Resuming image rotation");
    this.isPlaying = true;
    
    // Start the image loader's rotation
    if (this.imageLoader.startRotation) {
      this.imageLoader.startRotation();
    }
    
    // Start progress bar
    this.startProgressBar();
    
    // Update button state
    this.updatePlaybackButton();
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
   * Start progress bar animation
   */
  startProgressBar() {
    if (!this.isPlaying || !this.elements.progressBar) return;
    
    console.debug("Starting progress bar");
    
    // Clear existing interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    this.progress = 0;
    this.lastUpdateTime = performance.now();
    
    // Calculate step based on rotation speed
    const step = 100 / (this.rotationSpeed / 100); // 100 steps per second
    
    this.progressInterval = setInterval(() => {
      this.progress += step;
      
      if (this.progress >= 100) {
        this.progress = 0;
        // Trigger next image when progress completes
        this.handleAutoAdvance();
      }
      
      this.updateProgressBar();
    }, 100); // Update every 100ms for smooth animation
  }
  
  /**
   * Update progress bar width
   */
  updateProgressBar() {
    if (!this.elements.progressBar) return;
    
    // Ensure progress is between 0 and 100
    const clampedProgress = Math.min(100, Math.max(0, this.progress));
    
    this.elements.progressBar.style.width = `${clampedProgress}%`;
    
    // Update aria attributes
    this.elements.progressBar.setAttribute('aria-valuenow', clampedProgress.toFixed(0));
    this.elements.progressBar.setAttribute('aria-valuetext', `${clampedProgress.toFixed(0)}% complete`);
  }
  
  /**
   * Reset progress bar
   */
  resetProgressBar() {
    console.debug("Resetting progress bar");
    this.progress = 0;
    this.updateProgressBar();
    
    // Restart progress bar if playing
    if (this.isPlaying) {
      this.startProgressBar();
    }
  }
  
  /**
   * Handle automatic advancement to next image
   */
  async handleAutoAdvance() {
    if (!this.isPlaying) return;
    
    console.debug("Auto-advancing to next image");
    await this.nextImage();
    this.updateUI();
  }
  
  /**
   * Update all UI elements
   */
  updateUI() {
    this.updateTotalImages();
    this.updateImageCounter();
    this.updatePlaybackButton();
    this.updateThumbnailNav();
    this.updateNavigationButtons();
    
    // Start progress bar if playing
    if (this.isPlaying && !this.progressInterval) {
      this.startProgressBar();
    }
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
  }
  
  /**
   * Update playback button state
   */
  updatePlaybackButton() {
    if (!this.elements.playbackBtn) return;
    
    if (this.isPlaying) {
      this.elements.playbackBtn.classList.remove('pause');
      this.elements.playbackBtn.classList.add('play');
      this.elements.playbackBtn.setAttribute('aria-label', 'Pause image rotation');
      
      const icon = this.elements.playbackBtn.querySelector('.playback-icon');
      if (icon) {
        icon.textContent = '⏸';
      }
    } else {
      this.elements.playbackBtn.classList.remove('play');
      this.elements.playbackBtn.classList.add('pause');
      this.elements.playbackBtn.setAttribute('aria-label', 'Play image rotation');
      
      const icon = this.elements.playbackBtn.querySelector('.playback-icon');
      if (icon) {
        icon.textContent = '▶';
      }
    }
    
    // Update speed indicator
    const speedElement = this.elements.playbackBtn.querySelector('.playback-speed');
    if (speedElement) {
      speedElement.textContent = `${(this.rotationSpeed / 1000) * this.playbackSpeed}s`;
    }
  }
  
  /**
   * Update thumbnail navigation
   */
  updateThumbnailNav() {
    if (!this.elements.thumbnailNav) return;
    
    const media = this.imageLoader?.mediaData?.media;
    if (!media || !Array.isArray(media)) return;
    
    // Clear existing thumbnails
    this.elements.thumbnailNav.innerHTML = '';
    
    // Create thumbnails
    media.forEach((_, index) => {
      const thumbnail = document.createElement('button');
      thumbnail.className = `thumbnail-dot ${index === this.currentIndex ? 'active' : ''}`;
      thumbnail.setAttribute('role', 'tab');
      thumbnail.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
      thumbnail.setAttribute('aria-label', `Image ${index + 1}`);
      thumbnail.setAttribute('data-index', index);
      
      this.elements.thumbnailNav.appendChild(thumbnail);
    });
    
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
    // Disable previous button if at first image
    if (this.elements.navPrev) {
      const isFirstImage = this.currentIndex === 0;
      this.elements.navPrev.disabled = isFirstImage && this.totalImages > 1;
      this.elements.navPrev.setAttribute('aria-disabled', isFirstImage.toString());
      
      if (isFirstImage && this.totalImages > 1) {
        this.elements.navPrev.classList.add('disabled');
      } else {
        this.elements.navPrev.classList.remove('disabled');
      }
    }
    
    // Disable next button if at last image
    if (this.elements.navNext) {
      const isLastImage = this.currentIndex === this.totalImages - 1;
      this.elements.navNext.disabled = isLastImage && this.totalImages > 1;
      this.elements.navNext.setAttribute('aria-disabled', isLastImage.toString());
      
      if (isLastImage && this.totalImages > 1) {
        this.elements.navNext.classList.add('disabled');
      } else {
        this.elements.navNext.classList.remove('disabled');
      }
    }
  }
  
  /**
   * Show navigation controls
   */
  showControls() {
    const container = this.imageLoader.image?.parentElement;
    if (container) {
      container.classList.add('show-controls');
    }
  }
  
  /**
   * Hide navigation controls
   */
  hideControls() {
    const container = this.imageLoader.image?.parentElement;
    if (container) {
      container.classList.remove('show-controls');
    }
  }
  
  /**
   * Show keyboard hints
   */
  showKeyboardHints() {
    if (!this.elements.keyboardHints) return;
    
    console.debug("Showing keyboard hints");
    
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
   * Show keyboard shortcut indicator
   */
  showKeyboardShortcutIndicator() {
    // Add a subtle indicator that keyboard shortcuts are available
    const indicator = document.createElement('div');
    indicator.className = 'keyboard-shortcut-indicator';
    indicator.innerHTML = '🎮';
    indicator.title = 'Keyboard shortcuts available (← → Space)';
    indicator.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 20px;
      opacity: 0.7;
      cursor: help;
      z-index: 1000;
      transition: opacity 0.3s;
    `;
    
    indicator.addEventListener('mouseenter', () => {
      indicator.style.opacity = '1';
      this.showKeyboardHints();
    });
    
    indicator.addEventListener('mouseleave', () => {
      indicator.style.opacity = '0.7';
    });
    
    indicator.addEventListener('click', () => {
      this.showKeyboardHints();
    });
    
    document.body.appendChild(indicator);
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
   * Change rotation speed
   */
  setRotationSpeed(speed) {
    if (speed < 1000 || speed > 30000) {
      console.warn("Rotation speed must be between 1000 and 30000 ms");
      return;
    }
    
    console.debug("Setting rotation speed", { newSpeed: speed });
    this.rotationSpeed = speed;
    
    // Update image loader if it has speed control
    if (this.imageLoader.setRotationSpeed) {
      this.imageLoader.setRotationSpeed(speed);
    }
    
    // Restart progress bar if playing
    if (this.isPlaying) {
      this.startProgressBar();
    }
    
    this.updateUI();
  }
  
  /**
   * Set playback speed multiplier
   */
  setPlaybackSpeed(multiplier) {
    if (multiplier < 0.25 || multiplier > 4) {
      console.warn("Playback speed must be between 0.25 and 4");
      return;
    }
    
    console.debug("Setting playback speed multiplier", { multiplier });
    this.playbackSpeed = multiplier;
    
    // Calculate effective rotation speed
    const effectiveSpeed = this.rotationSpeed / multiplier;
    
    // Update image loader if it has speed control
    if (this.imageLoader.setRotationSpeed) {
      this.imageLoader.setRotationSpeed(effectiveSpeed);
    }
    
    this.updateUI();
  }
  
  /**
   * Get current navigation state
   */
  getState() {
    return {
      currentIndex: this.currentIndex,
      totalImages: this.totalImages,
      isPlaying: this.isPlaying,
      rotationSpeed: this.rotationSpeed,
      playbackSpeed: this.playbackSpeed,
      progress: this.progress
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    console.time("ImageNavigationController cleanup");
    
    // Remove event listeners
    if (this.elements.navPrev) {
      this.elements.navPrev.removeEventListener('click', this.handlePrevClick);
    }
    
    if (this.elements.navNext) {
      this.elements.navNext.removeEventListener('click', this.handleNextClick);
    }
    
    if (this.elements.playbackBtn) {
      this.elements.playbackBtn.removeEventListener('click', this.handlePlaybackClick);
    }
    
    if (this.elements.thumbnailNav) {
      this.elements.thumbnailNav.removeEventListener('click', this.handleThumbnailClick);
    }
    
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Clear intervals
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    // Pause rotation
    this.pauseRotation();
    
    // Remove keyboard shortcut indicator
    const indicator = document.querySelector('.keyboard-shortcut-indicator');
    if (indicator) {
      indicator.remove();
    }
    
    this.isInitialized = false;
    console.info("ImageNavigationController destroyed");
    console.timeEnd("ImageNavigationController cleanup");
  }
}

/**
 * SCROLL ANIMATOR - Handles scroll-triggered animations
 * @class ScrollAnimator
 */
class ScrollAnimator {
  constructor() {
    scrollLogger.time("ScrollAnimator constructor");
    this.animatedElements = [];
    this.threshold = 0.1;
    this.observer = null;
    this.isInitialized = false;

    scrollLogger.debug("ScrollAnimator instance created");
    scrollLogger.timeEnd("ScrollAnimator constructor");
  }

  /**
   * Initialize scroll animations
   */
  init() {
    if (this.isInitialized) {
      scrollLogger.debug("ScrollAnimator already initialized");
      return;
    }

    try {
      scrollLogger.time("ScrollAnimator initialization");
      this.cacheElements();
      this.setupObserver();
      this.isInitialized = true;
      scrollLogger.info("ScrollAnimator initialized successfully");
      scrollLogger.timeEnd("ScrollAnimator initialization");
    } catch (error) {
      scrollLogger.error("Failed to initialize scroll animator", error);
    }
  }

  /**
   * Cache DOM elements for animation
   */
  cacheElements() {
    scrollLogger.time("Element caching");
    this.animatedElements = [
      ...document.querySelectorAll("[data-animate]"),
      ...document.querySelectorAll(".message-item"),
      document.querySelector(".Graduation-title"),
      document.querySelector(".Graduation-wishes"),
    ].filter(Boolean);

    scrollLogger.debug("Elements cached for animation", {
      count: this.animatedElements.length,
      elements: this.animatedElements.map((el) => el.className || el.tagName),
    });
    scrollLogger.timeEnd("Element caching");
  }

  /**
   * Setup Intersection Observer
   */
  setupObserver() {
    scrollLogger.time("Observer setup");
    if (!("IntersectionObserver" in window)) {
      scrollLogger.warn("IntersectionObserver not supported, using fallback");
      this.animateAllElements();
      scrollLogger.timeEnd("Observer setup");
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        scrollLogger.debug("Intersection observed", {
          entriesCount: entries.length,
        });
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scrollLogger.debug("Element entering viewport", {
              element: entry.target.className || entry.target.tagName,
              intersectionRatio: entry.intersectionRatio,
            });
            this.animateElement(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.threshold,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    this.animatedElements.forEach((el) => this.observer.observe(el));
    scrollLogger.debug("Observer setup completed", {
      observedElements: this.animatedElements.length,
      threshold: this.threshold,
    });
    scrollLogger.timeEnd("Observer setup");
  }

  /**
   * Animate element when it comes into view
   */
  animateElement(element) {
    const animationClass = element.dataset.animate || "fadeInUp";
    scrollLogger.debug("Animating element", {
      element: element.className || element.tagName,
      animationClass,
    });

    element.style.visibility = "visible";
    element.classList.add("animate__animated", `animate__${animationClass}`);

    // Clean up after animation
    element.addEventListener(
      "animationend",
      () => {
        scrollLogger.debug("Element animation completed", {
          element: element.className || element.tagName,
        });
        element.style.visibility = "";
      },
      { once: true }
    );
  }

  /**
   * Fallback: animate all elements if IntersectionObserver is not supported
   */
  animateAllElements() {
    scrollLogger.warn("Using fallback animation (no IntersectionObserver)");
    this.animatedElements.forEach((element, index) => {
      setTimeout(() => {
        scrollLogger.debug("Fallback animation triggered", {
          element: element.className || element.tagName,
          index,
        });
        this.animateElement(element);
      }, index * 150);
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    scrollLogger.time("ScrollAnimator cleanup");
    if (this.observer) {
      this.observer.disconnect();
      scrollLogger.debug("IntersectionObserver disconnected");
    }
    this.isInitialized = false;
    scrollLogger.info("ScrollAnimator destroyed");
    scrollLogger.timeEnd("ScrollAnimator cleanup");
  }
}

/**
 * SHARE MANAGER - Handles social sharing functionality
 * @class ShareManager
 */
class ShareManager {
  constructor() {
    shareLogger.time("ShareManager constructor");
    this.buttons = [];
    this.isInitialized = false;

    shareLogger.debug("ShareManager instance created");
    shareLogger.timeEnd("ShareManager constructor");
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
      this.cacheButtons();
      this.setupListeners();
      this.isInitialized = true;
      shareLogger.info("ShareManager initialized successfully");
      shareLogger.timeEnd("ShareManager initialization");
    } catch (error) {
      shareLogger.error("Failed to initialize share manager", error);
    }
  }

  /**
   * Cache share buttons
   */
  cacheButtons() {
    shareLogger.time("Button caching");
    this.buttons = Array.from(document.querySelectorAll(".share-btn")).filter(
      Boolean
    );

    shareLogger.debug("Share buttons cached", {
      buttonCount: this.buttons.length,
      platforms: this.buttons.map(
        (btn) =>
          Array.from(btn.classList).find((cls) =>
            [
              "whatsapp",
              "instagram",
              "facebook",
              "twitter",
              "telegram",
            ].includes(cls)
          ) || "unknown"
      ),
    });
    shareLogger.timeEnd("Button caching");
  }

  /**
   * Setup event listeners
   */
  setupListeners() {
    shareLogger.time("Listener setup");
    this.buttons.forEach((btn, index) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        shareLogger.debug("Share button clicked", {
          index,
          button: btn.className,
        });
        this.handleShare(btn);
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          shareLogger.debug("Share button keyboard activated", {
            index,
            key: e.key,
            button: btn.className,
          });
          this.handleShare(btn);
        }
      });
    });
    shareLogger.debug("Event listeners attached to share buttons");
    shareLogger.timeEnd("Listener setup");
  }

  /**
   * Handle share action
   */
  handleShare(button) {
    shareLogger.time("Share action");
    this.animateButton(button);

    const platform = Array.from(button.classList).find((cls) =>
      ["whatsapp", "instagram", "facebook", "twitter", "telegram"].includes(cls)
    );

    shareLogger.debug("Share platform identified", { platform });

    if (platform) {
      this.shareToPlatform(platform);
    } else {
      shareLogger.warn("Unknown share platform", {
        buttonClasses: button.className,
      });
    }
    shareLogger.timeEnd("Share action");
  }

  /**
   * Share to specific platform
   */
  shareToPlatform(platform) {
    shareLogger.time(`Share to ${platform}`);
    const pageUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(
      "Beautiful Graduation wishes! that was send to me you can also send to your loved ones using this website"
    );

    const shareConfig = {
      whatsapp: `https://wa.me/?text=${shareText}%20${pageUrl}`,
      instagram: "https://instagram.com/",
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}`,
      telegram: `https://t.me/share/url?url=${pageUrl}&text=${shareText}`,
    };

    shareLogger.debug("Share configuration prepared", {
      platform,
      pageUrl: window.location.href,
      shareConfig: shareConfig[platform] ? "available" : "missing",
    });

    if (shareConfig[platform]) {
      shareLogger.info("Opening share dialog", { platform });
      window.open(
        shareConfig[platform],
        "_blank",
        "width=600,height=400,noopener,noreferrer"
      );
    } else {
      shareLogger.error("No share configuration found for platform", {
        platform,
      });
    }
    shareLogger.timeEnd(`Share to ${platform}`);
  }

  /**
   * Animate button on click
   */
  animateButton(button) {
    shareLogger.debug("Animating share button");
    button.style.transform = "scale(0.9)";

    setTimeout(() => {
      button.style.transform = "scale(1.1)";

      setTimeout(() => {
        button.style.transform = "";
        shareLogger.debug("Share button animation completed");
      }, 150);
    }, 150);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    shareLogger.time("ShareManager cleanup");
    this.buttons.forEach((btn, index) => {
      btn.removeEventListener("click", this.handleShare);
      btn.removeEventListener("keydown", this.handleShare);
      shareLogger.debug("Event listeners removed", { index });
    });

    this.isInitialized = false;
    shareLogger.info("ShareManager destroyed");
    shareLogger.timeEnd("ShareManager cleanup");
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
      await this.initializeModules();
      this.setupEventListeners();
      this.startApp();
      this.animateMessagesOneByOne();
      this.changeTitleName();
      this.isInitialized = true;
      appLogger.info("GraduationApp initialized successfully");
    } catch (error) {
      appLogger.error("Failed to initialize GraduationApp", error);
      this.handleInitializationError(error);
    } finally {
      this.performanceMonitor.stop();
      appLogger.timeEnd("GraduationApp initialization");
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
        shareManager: this.createModuleWithFallback(ShareManager),
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
        this.modules.confetti.triggerConfetti(20);
      },
      imageTouchStart: () => {
        appLogger.debug("Image container touch start - triggering confetti");
        this.modules.confetti.triggerConfetti(20);
      },
      resize: this.debounce(() => this.handleResize(), 200),
    };

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
    window.addEventListener("resize", this.eventHandlers.resize);
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

  /**
  * Change the name of the title 
  */
  changeTitleName() {
    appLogger.time("Change title name");
    const titleElement = document.querySelector(".Graduation-title");
    const authString = localStorage.getItem("GraduationAppPassword");
    const auth = authString ? JSON.parse(authString) : null;
    const newName = auth && auth.name ? auth.name : "Friend";
    if (titleElement) {
      titleElement.innerHTML = `Congratulations, ${newName}!                   <span class="name-highlight glow" tabindex="0" role="button"
                    >Combine Maths&Cscs 2025! 💘💗💓</span
                  >`;
      appLogger.debug("Title name changed", { newName });
    } else {
      appLogger.warn("Title element not found for name change");
    }
    appLogger.timeEnd("Change title name");
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
  }
}

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  appLogger.time("DOMContentLoaded initialization");
  appLogger.debug("DOM content loaded, starting application initialization");
    new GraduationApp().init();
  appLogger.timeEnd("DOMContentLoaded initialization");
});

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
