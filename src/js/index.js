import logger from "../js/utility/logger.js";
import { loadMediaData } from "./utility/utils.js";


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

class ImageLoader {
    /**
     * Create an ImageLoader instance
     * @param {HTMLElement} imageElement - The main image element
     * @param {HTMLElement} placeholderElement - Placeholder element for loading states
     * @param {Object} options - Configuration options
     */
    constructor(imageElement, placeholderElement, options = {}) {
        imageLogger.time("ImageLoader constructor");

        if (!imageElement) {
            throw new Error("ImageLoader requires a valid image element");
        }

        this.navigationController = null;
        this.image = imageElement;
        this.placeholder = placeholderElement;

        // Configuration with defaults
        this.config = {
            rotationDelay: 5000,           
            automaticRotate: false,          
            transitionDuration: 1000,
            preloadCount: 2,
            maxRetries: 2,
            retryDelay: 1000,
            lazyLoadThreshold: 300,
            enableWebP: false,
            enableBlurHash: false,
            pauseOnHover: false,           // Separate control for hover pausing
            pauseWhenNotVisible: true,     // Pause when tab is not visible
        };

        // State management
        this.mediaData = null;
        this.currentIndex = 0;
        this.rotationTimer = null;        // Single timer reference
        this.isLoaded = false;
        this.rotationEnabled = false;     // Whether rotation system is active
        this.isHoverPaused = false;       // Separate state for hover pausing
        this.isVisibilityPaused = false;  // Separate state for visibility pausing
        this.isManualPaused = true;      // Separate state for manual pausing
        this.retryCounts = new Map();
        this.preloadedImages = new Map();
        this.performanceMetrics = {
            loadTimes: [],
            cacheHits: 0,
            cacheMisses: 0
        };

        // Rotation timing control
        this.rotationStartTime = null;
        this.scheduledRotationTime = null;
        this.remainingRotationTime = null;

        // Feature detection
        this.supportsIntersectionObserver = 'IntersectionObserver' in window;
        this.supportsWebP = this.detectWebPSupport();
        this.isLowBandwidth = this.detectLowBandwidth();

        // Bind methods
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.handleNetworkChange = this.handleNetworkChange.bind(this);
        this.handleImageError = this.handleImageError.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.performScheduledRotation = this.performScheduledRotation.bind(this);

        imageLogger.debug("ImageLoader instance created", {
            config: { ...this.config, rotationDelay: this.config.rotationDelay },
            features: {
                intersectionObserver: this.supportsIntersectionObserver,
                webP: this.supportsWebP,
                lowBandwidth: this.isLowBandwidth
            }
        });

        // Initialize
        this.init(options);
        imageLogger.timeEnd("ImageLoader constructor");
    }

    /**
     * Initialize the image loader
     * @async
     */
    async init(options) {
        imageLogger.time("ImageLoader initialization");
        this.config = { ...this.config, ...options };

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

            // Preload initial images
            await this.preloadInitialImages();

            // Load and display first image
            await this.loadImageAtIndex(0, true);

            // Setup event listeners (including hover)
            this.setupEventListeners();

            // Start rotation if more than one image and automatic rotation is enabled
            if (this.mediaData.media.length > 1 && this.config.automaticRotate) {
                this.startRotation();
            }

            // Setup performance monitoring
            this.setupPerformanceMonitoring();

            this.isLoaded = true;
            imageLogger.info("ImageLoader initialized successfully", {
                totalImages: this.mediaData.media.length,
                preloaded: this.preloadedImages.size,
                automaticRotation: this.config.automaticRotate
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

    /**
     * Set rotation speed
     */
    setRotationSpeed(speed) {
        if (speed < 1000 || speed > 30000) {
            imageLogger.warn("Invalid rotation speed", { speed });
            return;
        }

        const wasRotating = this.rotationEnabled;

        // Stop current rotation
        if (wasRotating) {
            this.stopRotation();
        }

        // Update config
        this.config.rotationDelay = speed;

        // Restart if it was rotating
        if (wasRotating && this.config.automaticRotate) {
            this.startRotation();
        }

        imageLogger.info("Rotation speed updated", {
            newSpeed: speed,
            wasRotating,
            isRotating: this.rotationEnabled
        });
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
                    } else if (!isIntersecting && this.config.pauseWhenNotVisible) {
                        this.handleVisibilityChange();
                    }
                });
            },
            {
                root: null,
                rootMargin: `${this.config.lazyLoadThreshold}px`,
                threshold: [0, 0.1, 0.5, 1.0]
            }
        );

        if (this.image) {
            this.intersectionObserver.observe(this.image);
            imageLogger.debug("IntersectionObserver attached to image element");
        }

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

        if (this.mediaData?.media?.length > 0) {
            this.loadImageAtIndex(0, true).catch(error => {
                imageLogger.error("Fallback initialization failed", error);
            });
        }

        if (this.mediaData?.media?.length > 1 && this.config.automaticRotate) {
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

            const startTime = performance.now();

            img.onload = () => {
                const loadTime = performance.now() - startTime;
                this.performanceMetrics.loadTimes.push(loadTime);

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

            img.src = mediaItem.src;

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
            let loadedImage = this.preloadedImages.get(index);

            if (!loadedImage) {
                loadedImage = await this.loadImageWithRetry(index);
            }

            this.currentIndex = index;

            if (this.navigationController) {
                this.navigationController.currentIndex = index;
                this.navigationController.updateUI();
            }

            await this.transitionToImage(loadedImage, isInitial);

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

            const timeoutId = setTimeout(() => {
                reject(new Error(`Image load timeout: ${mediaItem.src}`));
            }, 15000);

            img.onload = () => {
                clearTimeout(timeoutId);
                const loadTime = performance.now() - startTime;
                this.performanceMetrics.loadTimes.push(loadTime);

                if (mediaItem.blurHash && this.config.enableBlurHash) {
                    this.applyBlurHash(img, mediaItem.blurHash);
                }

                resolve(img);
            };

            img.onerror = (error) => {
                clearTimeout(timeoutId);
                reject(new Error(`Failed to load image: ${mediaItem.src}`));
            };

            img.src = mediaItem.src;
            if (mediaItem.srcset) {
                img.srcset = mediaItem.srcset;
            }
            if (mediaItem.sizes) {
                img.sizes = mediaItem.sizes;
            }
            img.loading = mediaItem.loading || 'eager';
            img.decoding = 'async';

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
            const oldSrc = this.image.src;
            const isSameImage = oldSrc === newImage.src;

            if (isSameImage && !isInitial) {
                imageLogger.debug("Skipping transition - same image");
                resolve();
                return;
            }

            const tempImage = new Image();
            tempImage.src = newImage.src;
            if (newImage.srcset) tempImage.srcset = newImage.srcset;
            if (newImage.sizes) tempImage.sizes = newImage.sizes;

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

            this.image.style.transition = `opacity ${this.config.transitionDuration}ms ease-in-out`;
            this.image.style.opacity = '0';

            setTimeout(() => {
                this.image.src = newImage.src;
                if (newImage.srcset) this.image.srcset = newImage.srcset;
                if (newImage.sizes) this.image.sizes = newImage.sizes;

                if (newImage.alt) {
                    this.image.alt = newImage.alt;
                }

                this.image.style.opacity = '1';

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

        if (nextIndices.length > 0 && !this.isManualPaused && !this.isHoverPaused) {
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
     * Start image rotation with precise timing
     */
    startRotation() {
          imageLogger.info("startRotation called", {
        rotationEnabled: this.rotationEnabled,
        automaticRotate: this.config.automaticRotate,
        mediaLength: this.mediaData?.media?.length || 0
    });

        if (this.rotationEnabled) {
            imageLogger.warn("Rotation already started");
            return;
        }

        if (this.mediaData.media.length <= 1) {
            imageLogger.warn("Not enough images for rotation");
            return;
        }

        if (!this.config.automaticRotate) {
            imageLogger.debug("Automatic rotation disabled in config");
            return;
        }

        this.rotationEnabled = true;
        this.rotationStartTime = performance.now();
        this.scheduledRotationTime = this.rotationStartTime + this.config.rotationDelay;

      /*  if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }

        this.scheduleNextRotation();*/

        imageLogger.info("Image rotation started", {
            rotationDelay: this.config.rotationDelay,
            totalImages: this.mediaData.media.length,
            scheduledAt: new Date(Date.now() + this.config.rotationDelay).toISOString()
        });
    }

    /**
     * Schedule next rotation with precise timing
     */
    scheduleNextRotation() {
        if (!this.rotationEnabled || !this.config.automaticRotate) {
            return;
        }

        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }

        const now = performance.now();
        const timeSinceStart = now - this.rotationStartTime;
        const timeUntilNext = Math.max(0, this.config.rotationDelay - timeSinceStart);

        this.rotationTimer = setTimeout(() => {
            this.performScheduledRotation();
        }, timeUntilNext);

        imageLogger.debug("Next rotation scheduled", {
            delay: timeUntilNext.toFixed(0),
            totalDelay: this.config.rotationDelay,
            timeSinceLast: timeSinceStart.toFixed(0)
        });
    }

    /**
     * Perform scheduled rotation to next image
     */
    async performScheduledRotation() {
        if (!this.rotationEnabled ||
            !this.config.automaticRotate ||
            this.isHoverPaused ||
            this.isVisibilityPaused ||
            this.isManualPaused) {
            imageLogger.debug("Rotation skipped due to pause state", {
                rotationEnabled: this.rotationEnabled,
                automaticRotate: this.config.automaticRotate,
                hoverPaused: this.isHoverPaused,
                visibilityPaused: this.isVisibilityPaused,
                manualPaused: this.isManualPaused
            });

            this.rotationStartTime = performance.now();
            this.scheduleNextRotation();
            return;
        }

        try {
            const nextIndex = (this.currentIndex + 1) % this.mediaData.media.length;
            await this.loadImageAtIndex(nextIndex);

            this.rotationStartTime = performance.now();
            this.scheduledRotationTime = this.rotationStartTime + this.config.rotationDelay;

            this.scheduleNextRotation();

            imageLogger.debug("Scheduled rotation completed", {
                fromIndex: (this.currentIndex - 1 + this.mediaData.media.length) % this.mediaData.media.length,
                toIndex: this.currentIndex,
                nextScheduled: new Date(Date.now() + this.config.rotationDelay).toISOString()
            });

        } catch (error) {
            imageLogger.error("Failed to perform scheduled rotation", error);

            this.rotationStartTime = performance.now();
            this.scheduleNextRotation();
        }
    }

    /**
     * Stop image rotation completely
     */
    stopRotation() {
        if (!this.rotationEnabled) {
            return;
        }

        this.rotationEnabled = false;

        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
            imageLogger.debug("Rotation timer cleared");
        }

        this.rotationStartTime = null;
        this.scheduledRotationTime = null;
        this.remainingRotationTime = null;

        imageLogger.info("Image rotation stopped");
    }

    /**
     * Pause rotation (manual pause - separate from hover/visibility)
     */
    pauseRotation() {
        if (!this.rotationEnabled || this.isManualPaused) {
            return;
        }

        this.isManualPaused = true;

        if (this.rotationStartTime && this.rotationTimer) {
            const now = performance.now();
            this.remainingRotationTime = Math.max(0, this.config.rotationDelay - (now - this.rotationStartTime));

            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }

        imageLogger.debug("Rotation manually paused", {
            remainingTime: this.remainingRotationTime
        });
    }

    /**
     * Resume rotation (from manual pause)
     */
    resumeRotation() {
        if (!this.rotationEnabled || !this.isManualPaused) {
            return;
        }

        this.isManualPaused = false;

        if (this.remainingRotationTime !== null) {
            this.rotationStartTime = performance.now() - (this.config.rotationDelay - this.remainingRotationTime);
            this.scheduleNextRotation();
            this.remainingRotationTime = null;
        }

        imageLogger.debug("Rotation manually resumed");
    }

    /**
     * Move to next image (manual navigation)
     */
    async nextImage() {
        const nextIndex = (this.currentIndex + 1) % this.mediaData.media.length;

        if (this.rotationEnabled) {
            this.rotationStartTime = performance.now();
            this.scheduledRotationTime = this.rotationStartTime + this.config.rotationDelay;

            this.scheduleNextRotation();
        }

        await this.loadImageAtIndex(nextIndex);
    }

    /**
     * Move to previous image (manual navigation)
     */
    async previousImage() {
        const prevIndex = (this.currentIndex - 1 + this.mediaData.media.length) % this.mediaData.media.length;

        if (this.rotationEnabled) {
            this.rotationStartTime = performance.now();
            this.scheduledRotationTime = this.rotationStartTime + this.config.rotationDelay;

            this.scheduleNextRotation();
        }

        await this.loadImageAtIndex(prevIndex);
    }

    /**
     * Handle mouse enter (for hover pausing)
     */
    handleMouseEnter() {
        if (!this.config.pauseOnHover || this.isHoverPaused) {
            return;
        }

        this.isHoverPaused = true;

        if (this.rotationEnabled && this.rotationTimer) {
            const now = performance.now();
            this.remainingRotationTime = Math.max(0, this.config.rotationDelay - (now - this.rotationStartTime));

            clearTimeout(this.rotationTimer);
            this.rotationTimer = null;
        }

        imageLogger.debug("Rotation paused on hover", {
            remainingTime: this.remainingRotationTime
        });
    }

    /**
     * Handle mouse leave (for hover resuming)
     */
    handleMouseLeave() {
        if (!this.config.pauseOnHover || !this.isHoverPaused) {
            return;
        }

        this.isHoverPaused = false;

        if (this.rotationEnabled && !this.isManualPaused && this.remainingRotationTime !== null) {
            this.rotationStartTime = performance.now() - (this.config.rotationDelay - this.remainingRotationTime);
            this.scheduleNextRotation();
            this.remainingRotationTime = null;

            imageLogger.debug("Rotation resumed after hover");
        }
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
        if(!this.image) {
            this.image = document.getElementById("GraduationImage");
        }
        this.image.addEventListener('error', this.handleImageError);

        // Hover events (only if enabled)
        if (this.config.pauseOnHover) {
            this.image.addEventListener('mouseenter', this.handleMouseEnter);
            this.image.addEventListener('mouseleave', this.handleMouseLeave);

            // Touch events for mobile
            this.image.addEventListener('touchstart', this.handleMouseEnter, { passive: true });
            this.image.addEventListener('touchend', this.handleMouseLeave, { passive: true });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.previousImage();
            } else if (e.key === 'ArrowRight') {
                this.nextImage();
            } else if (e.key === ' ' || e.key === 'Spacebar') {
                // Space bar to toggle manual pause
                if (this.rotationEnabled) {
                    this.togglePause();
                }
            }
        });
    }

    togglePause() {
        if (this.isManualPaused) {
            this.resumeRotation();
        } else {
            this.pauseRotation();
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.isVisibilityPaused = true;

            if (this.rotationEnabled && this.rotationTimer) {
                const now = performance.now();
                this.remainingRotationTime = Math.max(0, this.config.rotationDelay - (now - this.rotationStartTime));

                clearTimeout(this.rotationTimer);
                this.rotationTimer = null;
            }

            imageLogger.debug("Rotation paused - page hidden");
        } else {
            this.isVisibilityPaused = false;

            if (this.rotationEnabled &&
                !this.isManualPaused &&
                !this.isHoverPaused &&
                this.remainingRotationTime !== null) {

                this.rotationStartTime = performance.now() - (this.config.rotationDelay - this.remainingRotationTime);
                this.scheduleNextRotation();
                this.remainingRotationTime = null;

                imageLogger.debug("Rotation resumed - page visible");
            }
        }
    }

    /**
     * Handle network status change
     */
    handleNetworkChange() {
        if (navigator.onLine) {
            this.resumeRotation();
            imageLogger.debug("Online - resuming normal operation");
        } else {
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

        if (!this.isLoaded && this.currentIndex === 0) {
            imageLogger.debug("First time image visible - triggering initial load");

            if (!this.image.src || this.image.src === '') {
                this.loadImageAtIndex(0, true).catch(error => {
                    imageLogger.error("Failed to load initial image on visible", error);
                });
            }
        }

        if (this.isLowBandwidth && !this.preloadedImages.has(this.currentIndex)) {
            imageLogger.debug("Low bandwidth mode - loading current image on demand");
            this.preloadImageAtIndex(this.currentIndex).catch(error => {
                imageLogger.warn("Failed to load image on demand in low bandwidth mode", error);
            });
        }

        if (!this.rotationEnabled && this.mediaData.media.length > 1 && this.config.automaticRotate) {
            imageLogger.debug("Image visible - starting rotation");
            this.startRotation();
        }

        this.checkImagePerformance(target);
    }

    /**
     * Check and log image loading performance when visible
     * @param {HTMLElement} imgElement - The image element to check
     */
    checkImagePerformance(imgElement) {
        if (imgElement.complete) {
            const loadTime = this.performanceMetrics.loadTimes[this.currentIndex];
            if (loadTime) {
                imageLogger.debug("Image already loaded when became visible", {
                    index: this.currentIndex,
                    loadTime: `${loadTime.toFixed(2)}ms`,
                    naturalSize: `${imgElement.naturalWidth}x${imgElement.naturalHeight}`
                });
            }

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
            imageLogger.debug("Image still loading when became visible", {
                index: this.currentIndex,
                src: imgElement.src
            });

            const loadListener = () => {
                imageLogger.debug("Image finished loading after becoming visible", {
                    index: this.currentIndex
                });
                imgElement.removeEventListener('load', loadListener);
            };

            imgElement.addEventListener('load', loadListener);
        }

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
        }, 30000);
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        imageLogger.error("Initialization error handled", error);

        if (this.placeholder) {
            this.placeholder.innerHTML = `
        <div class="init-error">
          <p>Failed to load images. Please refresh.</p>
        </div>
      `;
            this.placeholder.style.display = 'flex';
        }

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
    }

    /**
     * Get current rotation state
     */
    getRotationState() {
        return {
            rotationEnabled: this.rotationEnabled,
            automaticRotate: this.config.automaticRotate,
            rotationDelay: this.config.rotationDelay,
            isHoverPaused: this.isHoverPaused,
            isVisibilityPaused: this.isVisibilityPaused,
            isManualPaused: this.isManualPaused,
            currentIndex: this.currentIndex,
            totalImages: this.mediaData?.media?.length || 0,
            remainingTime: this.remainingRotationTime,
            nextRotationIn: this.scheduledRotationTime ?
                Math.max(0, this.scheduledRotationTime - performance.now()) : null
        };
    }

    /**
     * Cleanup all resources
     */
    destroy() {
        imageLogger.time("ImageLoader cleanup");

        this.stopRotation();

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('online', this.handleNetworkChange);
        window.removeEventListener('offline', this.handleNetworkChange);

        if (this.image) {
            this.image.removeEventListener('error', this.handleImageError);

            if (this.config.pauseOnHover) {
                this.image.removeEventListener('mouseenter', this.handleMouseEnter);
                this.image.removeEventListener('mouseleave', this.handleMouseLeave);
                this.image.removeEventListener('touchstart', this.handleMouseEnter);
                this.image.removeEventListener('touchend', this.handleMouseLeave);
            }
        }

        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }

        this.preloadedImages.clear();
        this.retryCounts.clear();

        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }

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
   * Set rotation speed
   */
  setRotationSpeed(speed) {
    if (speed < 1000 || speed > 30000) {
      imageLogger.warn("Invalid rotation speed", { speed });
      return;
    }
    
    const wasRotating = this.rotationEnabled;
    
    // Stop current rotation
    if (wasRotating) {
      this.stopRotation();
    }
    
    // Update config
    this.config.rotationDelay = speed;
    
    // Restart if it was rotating
    if (wasRotating && this.config.automaticRotate) {
      this.startRotation();
    }
    
    imageLogger.info("Rotation speed updated", {
      newSpeed: speed,
      wasRotating,
      isRotating: this.rotationEnabled
    });
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

// Add CSS for share messages animation
const shareStyles = document.createElement('style');
shareStyles.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  
  .share-active {
    position: relative;
    z-index: 1;
  }
  
  .share-success {
    background-color: #4CAF50 !important;
    color: white !important;
  }
  
  .share-error {
    background-color: #F44336 !important;
    color: white !important;
    animation: shake 0.5s ease;
  }
  
  .share-touch-active {
    opacity: 0.8;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;

// Add styles to document
if (document.head) {
  document.head.appendChild(shareStyles);
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
      this.startApp();
      this.setupEventListeners();
      this.       animateMessagesOneByOne();
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
