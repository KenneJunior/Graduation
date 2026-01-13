import logger from "./utility/logger.js";
import {
    loadMediaData,
    generateIntelligentMessage,
    generateStoryCaption,
    createShareMessage,
    generateQuickCaption,
    getCurrentUserInfo, generateSimpleMessage
} from "./utility/utils.js";
import ColorThief from "colorthief";
// Create contextual logger for UltimateModal
const modalLogger = logger.withContext({module: "UltimateModal"});

/*
*todo
* 1. improve Extract color palette from image using ColorThief (done)
* 2. improve Create dynamic gradient based on extracted colors (done)
* 3. cache the extracted palette for reuse (done)
* 4. improve the the tooltip text (done)
* 5. use preloading to load images in the background as the user navigates
* 6. fix the css transition for the image background changing (pending)
* 7. when its a vid it should use the thumb to get the color (done)
* */
/**
 * UltimateModal class for managing media gallery modal functionality
 * Handles image/video display, zoom/pan, fullscreen, and gradient effects
 * @class
 */
class UltimateModal {
    /**
     * Creates an instance of UltimateModal
     * Initializes DOM elements, state management, and color extraction
     * @constructor
     */
    constructor() {
        modalLogger.time("UltimateModal constructor");
        const MediaModal = document.getElementById("mediaModal");
        const cardContent = document.querySelector(".card-content");
        this.elements = {
            modalContainer: MediaModal.querySelector(".modal-container"),
            openModalBtn: cardContent.querySelector("#modal_open"),
            modalImage: MediaModal.querySelector(".modal-image"),
            modalVideo: MediaModal.querySelector(".modal-video"),
            Modal_loading__container: MediaModal.querySelector(".loading-container"),
            galleryContainer: cardContent.querySelector("#photo-gallery"),
            profileImage: cardContent.querySelector("#profile_pic"),
            profileImageContainer: cardContent.querySelector(".image-container"),
            closeButton: MediaModal.querySelector(".modal-close"),
            maximizeModalBtn: MediaModal.querySelector(".modal-maximize"),
            prevButton: MediaModal.querySelector(".modal-prev"),
            nextButton: MediaModal.querySelector(".modal-next"),
            counter: MediaModal.querySelector(".modal-counter"),
            socialLinks: MediaModal.querySelectorAll(".modal-social a"),
            profile_pic: cardContent.querySelector(".image-container"),
            seeMoreBtn: cardContent.querySelector(".see-more-arrow"),
            modalTooltip: MediaModal.querySelector(".modal-tooltip"),
            loadingProgressBar: MediaModal.querySelector('.loading-progress__bar'),
            modal: MediaModal,
            cardContent: cardContent,
            activeThumbnail:null
        };

        modalLogger.debug("DOM elements cached", {
            elementsFound: Object.keys(this.elements).filter(
                (key) => !!this.elements[key]
            ).length,
            totalElements: Object.keys(this.elements).length,
        });
        this.colorThief = new ColorThief();

        this.state = {
            animations: [''],
            backupStyles: {
                modalContainerBackground: '',
                modalContainerBackgroundColor: '',
                modalBackground: '',
                modalBackgroundColor: '',
            }, // To store original styles for restoration
            currentIndex: 0,
            media: [],
            colorPalette: null, // Store full palette for gradients
            fullscreenGradient: '', // Gradient for fullscreen mode
            isBrowserFullscreen: false, // Track F11 fullscreen
            isZoomed: false,
            enableZoom: false,
            isZoomPanSetup: false,
            isMaximized: false,
            isFullscreen: false,
            transitionStyle: "", // Can be 'zoom-in', 'fade-in', or 'slide-up'
            panStart: {x: 0, y: 0},
            panOffset: {x: 0, y: 0},
            messageCache: new Map(),
            gradientCache: new Map(),
            currentUser: getCurrentUserInfo(),
        };

        this.mediaData = {};

        modalLogger.debug("Initial state set", {
            transitionStyle: this.state.transitionStyle,
        });

        this.hammer = null;
        this.initHammerWhenReady();
        modalLogger.timeEnd("UltimateModal constructor");
    }

    /**
     * Initializes the UltimateModal instance
     * Generates gallery, sets up UI controls, and prepares background styles
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        modalLogger.time("UltimateModal initialization");
        modalLogger.debug("Starting gallery generation");
        await this.generateGallery();
        this.setupSeeMoreButton();
        this.setupImageTooltip();

        this.preloadMessages();

        setTimeout(() => {
            this.saveInitialBackgroundStyles();
        }, 300);
        modalLogger.timeEnd("UltimateModal initialization");
    }
    /**
     * Preloads messages for better performance
     */
    preloadMessages() {
        const currentUser = this.state.currentUser || getCurrentUserInfo();
        const preloadCount = Math.min(3, this.mediaData.length);

        for (let i = 0; i < preloadCount; i++) {
            const media = this.mediaData.media[i];
            if (media) {
                // Preload for each platform
                ['twitter', 'facebook', 'pinterest'].forEach(platform => {
                    this.generatePlatformMessage(media, currentUser, platform);
                });
            }
        }

        modalLogger.debug("Preloaded messages", {
            count: preloadCount,
            cacheSize: this.state.messageCache.size
        });
    }
    /**
     * Initializes Hammer.js for touch gestures when the library is available
     * Sets up gesture recognition for swiping, pinching, and panning
     * @returns {void}
     */
    initHammerWhenReady() {
        modalLogger.time("Hammer.js initialization check");

        if (typeof Hammer === "undefined") {
            modalLogger.warn(
                "Hammer.js not available. Touch gestures will be disabled."
            );
            modalLogger.timeEnd("Hammer.js initialization check");
            return;
        }

        modalLogger.debug("Hammer.js available, waiting for modal container");

        // Wait for modal container to be available
        const checkContainer = () => {
            if (this.elements.modalContainer) {
                modalLogger.debug("Modal container found, setting up Hammer.js");
                this.setupHammer();
                modalLogger.timeEnd("Hammer.js initialization check");
            } else {
                modalLogger.debug("Modal container not found, retrying...");
                setTimeout(checkContainer, 100);
            }
        };

        checkContainer();
    }

    /**
     * Sets up Hammer.js gesture recognition on the modal container
     * Configures swipe, pinch, and pan gestures with appropriate handlers
     * @returns {void}
     */
    setupHammer() {
        try {
            modalLogger.time("Hammer.js setup");
            this.hammer = new Hammer(this.elements.modalContainer);

            this.hammer.get("swipe").set({
                direction: Hammer.DIRECTION_ALL,
                threshold: 10,
                velocity: 0.3,
            });

            this.hammer.get("pinch").set({enable: true});
            this.hammer.get("pan").set({direction: Hammer.DIRECTION_ALL});

            modalLogger.debug("Hammer.js gestures configured", {
                swipe: true,
                pinch: true,
                pan: true,
            });

            // Set up event handlers
            this.hammer.on("swipeleft", (event) => {
                event.preventDefault();
                modalLogger.debug("Swipe left detected, navigating next");
                this.navigate(1);
            });

            this.hammer.on("swiperight", (event) => {
                event.preventDefault();
                modalLogger.debug("Swipe right detected, navigating previous");
                this.navigate(-1);
            });

            this.hammer.on("swipeup", (event) => {
                event.preventDefault();
                modalLogger.debug("Swipe up detected, closing modal");
                this.closeModal();
            });

            this.hammer.on("swipedown", (event) => {
                event.preventDefault();
                modalLogger.debug("Swipe down detected, closing modal");
                this.closeModal();
            });

            this.hammer.on("doubletap", (event) => {
                event.preventDefault();
                modalLogger.debug("Double tap detected, toggling fullscreen");
                this.toggleFullscreen();
            });

            this.setupHammerForZoomPan();
            modalLogger.info("Hammer.js touch gestures initialized successfully");
            modalLogger.timeEnd("Hammer.js setup");
        } catch (error) {
            modalLogger.error("Failed to initialize Hammer.js:", error);
        }
    }

    /**
     * Shows the media loading animation and progress indicator
     * @param {HTMLElement} mediaElement - The media element being loaded
     * @returns {void}
     */
    showMediaLoading(mediaElement) {
        modalLogger.time("Show media loading animation");

        // Show loading container with proper classes
        const loadingContainer = this.elements.Modal_loading__container;
        if (loadingContainer) {
            loadingContainer.classList.add("is-visible", "is-loading");
            loadingContainer.setAttribute("aria-hidden", "false");
            loadingContainer.setAttribute("aria-live", "off");

            this._startProgressAnimation();

            modalLogger.debug("Loading container activated", {
                hasVisible: loadingContainer.classList.contains("is-visible"),
                hasLoading: loadingContainer.classList.contains("is-loading"),
                ariaHidden: loadingContainer.getAttribute("aria-hidden"),
                ariaLive: loadingContainer.getAttribute("aria-live"),
            });
        }

        // Hide navigation elements and counter
        this._toggleNavigationElements(true);

        // Optional: Add loading class to media element if provided
        modalLogger.info("Media loading animation displayed successfully");
        modalLogger.timeEnd("Show media loading animation");
    }

    /**
     * Hides the media loading animation and resets progress indicator
     * @param {HTMLElement} mediaElement - The media element that finished loading
     * @returns {void}
     */
    hideMediaLoading(mediaElement) {
        modalLogger.time("Hide media loading animation");
        const progressBar = this.elements.loadingProgressBar;
        if (progressBar) {
            progressBar.style.width = "100%";
        }

        // Hide loading container and reset attributes
        setTimeout(() => {
            const loadingContainer = this.elements.Modal_loading__container;
            if (loadingContainer) {
                loadingContainer.classList.remove("is-visible", "is-loading");
                loadingContainer.setAttribute("aria-hidden", "true");
                loadingContainer.setAttribute("aria-live", "polite");

                modalLogger.debug("Loading container deactivated", {
                    ariaHidden: loadingContainer.getAttribute("aria-hidden"),
                    ariaLive: loadingContainer.getAttribute("aria-live"),
                });
            }

            // Show navigation elements and counter
            this._toggleNavigationElements(false);
        }, 500);

        modalLogger.info("Media loading animation hidden successfully");
        modalLogger.timeEnd("Hide media loading animation");
    }

    /**
     * Toggles visibility of navigation elements during loading
     * @private
     * @param {boolean} hide - Whether to hide or show navigation elements
     * @returns {void}
     */
    _toggleNavigationElements(hide) {
        const elementsToToggle = [
            this.elements.prevButton,
            this.elements.nextButton,
            this.elements.counter,
            this.elements.modalTooltip,
        ];
        elementsToToggle.forEach((element) => {
            if (element) {
                if (hide) {
                    element.style.visibility = "hidden";
                    element.style.opacity = "0";
                    modalLogger.debug("Element hidden", {element: element.className});
                } else {
                    element.style.visibility = "visible";
                    element.style.opacity = "1";
                    modalLogger.debug("Element shown", {element: element.className});
                }
            }
        });
    }

    /**
     * Starts the progress bar animation for media loading
     * @private
     * @returns {void}
     */
    _startProgressAnimation() {
        const progressBar = this.elements.loadingProgressBar;
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
     * Caches images and prepares media data for gallery display
     * Only processes visible thumbnails to optimize performance
     * @returns {void}
     */
    cacheImages() {
        modalLogger.time("Image caching");

        // Get only visible thumbnails (not hidden with d-none)
        this.elements.thumbnails =
            this.elements.cardContent.querySelectorAll(".photo-thumbnail");
        this.elements.allVisibleThumbnails =
            this.elements.cardContent.querySelectorAll(
                ".photo-thumbnail:not(.d-none)"
            );

        modalLogger.debug("Found visible thumbnails", {
            visibleCount: this.elements.allVisibleThumbnails.length,
            totalMedia: this.mediaData.media.length,
        });

        // Create a map of media data by index for quick lookup
        const mediaByIndex = {};
        this.mediaData.media.forEach((media, index) => {
            mediaByIndex[index] = media;
        });

        // Cache only the media that corresponds to visible thumbnails
        this.state.media = [];

        this.elements.allVisibleThumbnails.forEach((thumbnail) => {
            // Get the media-index attribute
            const mediaIndex = parseInt(thumbnail.getAttribute("media-index"));

            if (!isNaN(mediaIndex) && mediaByIndex[mediaIndex]) {
                const mediaItem = mediaByIndex[mediaIndex];
                this.state.media.push({
                    src: mediaItem.src,
                    alt: mediaItem.alt,
                    data_type: mediaItem["data-type"],
                    vidSrc: mediaItem["video-src"],
                    originalIndex: mediaIndex, // Keep track of original index
                });

                modalLogger.debug("Cached thumbnail media", {
                    index: mediaIndex,
                    alt: mediaItem.alt,
                    dataType: mediaItem["data-type"],
                });
            } else {
                modalLogger.warn("Invalid media index or missing media data", {
                    mediaIndex: mediaIndex,
                    thumbnail: thumbnail.querySelector("img")?.alt || "unknown",
                });
            }
        });

        modalLogger.info("Media data cached successfully", {
            thumbnailCount: this.elements.allVisibleThumbnails.length,
            mediaCount: this.state.media.length,
            mediaTypes: this.state.media.map((m) => m.data_type),
            originalIndices: this.state.media.map((m) => m.originalIndex),
        });

        this.preloadMediaImages();

        modalLogger.timeEnd("Image caching");
    }

    /**
     * Sets up event listeners for modal interactions
     * Handles thumbnail clicks, keyboard navigation, and fullscreen events
     * @returns {void}
     */
    setupEventListeners() {
        modalLogger.time("Event listener setup");

        // Open modal
        this.elements.thumbnails.forEach((thumb, index) => {
            thumb.addEventListener("click", () => {
                modalLogger.debug("Thumbnail clicked", {index});
                this.openModal(index);
            });
        });

        const {length: profile_index} = this.elements.thumbnails;
        this.elements.profileImage.addEventListener("click", () => {
            modalLogger.debug("Profile image clicked", {index: profile_index});
            this.openModal(profile_index);
        });

        this.elements.maximizeModalBtn.addEventListener("click", () => {
            modalLogger.debug("Maximize button clicked");
            this.toggleMaximize();
        });

        this.elements.openModalBtn.addEventListener("click", () => {
            modalLogger.debug("Open modal button clicked");
            this.openModal(0);
        });

        // Modal controls
        this.elements.closeButton.addEventListener("click", () => {
            modalLogger.debug("Close button clicked");
            this.closeModal();
        });

        this.elements.prevButton.addEventListener("click", () => {
            modalLogger.debug("Previous button clicked");
            this.navigate(-1);
        });

        this.elements.nextButton.addEventListener("click", () => {
            modalLogger.debug("Next button clicked");
            this.navigate(1);
        });

        // Keyboard navigation
        document.addEventListener("keydown", (e) => {
            if (!this.elements.modal.classList.contains("active")) {
                modalLogger.debug("Key pressed but modal inactive", {key: e.key});
                return;
            }

            modalLogger.debug("Key pressed in active modal", {key: e.key});

            switch (e.key) {
                case "Escape":
                    modalLogger.debug("Escape key - closing modal");
                    this.closeModal();
                    break;
                case "ArrowLeft":
                    modalLogger.debug("ArrowLeft key - navigating previous");
                    this.navigate(-1);
                    break;
                case "ArrowRight":
                    modalLogger.debug("ArrowRight key - navigating next");
                    this.navigate(1);
                    break;
                case "f":
                case "F":
                    modalLogger.debug("F key - toggling fullscreen");
                    this.toggleFullscreen();
                    break;
                default:
                    modalLogger.debug("Unhandled key in modal", {key: e.key});
            }
        });

        this.setupZoomPanFunctionality();

        // Handle fullscreen change events
        document.addEventListener("fullscreenchange", () => {
            modalLogger.debug("Fullscreen change event (standard)");
            this.handleFullscreenChange();
        });

        document.addEventListener("webkitfullscreenchange", () => {
            modalLogger.debug("Fullscreen change event (webkit)");
            this.handleFullscreenChange();
        });

        document.addEventListener("msfullscreenchange", () => {
            modalLogger.debug("Fullscreen change event (ms)");
            this.handleFullscreenChange();
        });


        modalLogger.info("Event listeners setup completed", {
            thumbnails: this.elements.thumbnails.length,
            keyboard: true,
            fullscreen: true,
        });
        modalLogger.timeEnd("Event listener setup");
    }

    /**
     * Saves the initial computed background styles for restoration
     * Stores styles in both memory and localStorage for persistence
     * @returns {void}
     */
    saveInitialBackgroundStyles() {
        modalLogger.time("Save initial background styles");
        if (!this.elements.modalContainer || !this.elements.modal) {
            modalLogger.warn("Elements not available for saving styles");
            return;
        }

        const containerComputed = window.getComputedStyle(this.elements.modalContainer);
        const modalComputed = window.getComputedStyle(this.elements.modal);

        // Save only essential background properties
        this.state.backupStyles = {
            container: {
                background: containerComputed.background,
                backgroundColor: containerComputed.backgroundColor,
                backgroundImage: containerComputed.backgroundImage,
                transition: containerComputed.transition,
            },
            modal: {
                background: modalComputed.background,
                backgroundColor: modalComputed.backgroundColor,
                backgroundImage: modalComputed.backgroundImage,
                transition: modalComputed.transition,
            }
        };

        // Backup to localStorage for persistence
        try {
            localStorage.setItem('modal_backup_styles', JSON.stringify(this.state.backupStyles));
        } catch (e) {
            modalLogger.debug("Could not save to localStorage", e);
        }

        modalLogger.debug("Initial styles cached", {
            containerBg: containerComputed.background.substring(0, 30) + '...',
            modalBg: modalComputed.background.substring(0, 30) + '...',
        });
        modalLogger.timeEnd("Save initial background styles");
    }

    /**
     * Extracts color palette and creates gradient with intelligent caching
     * Uses ColorThief for palette extraction with fallback strategies
     * @async
     * @param {string} imageSrc - The source URL of the image to extract palette from
     * @returns {Promise<string>} The generated gradient CSS string
     */
    async extractPaletteAndCreateGradient(imageSrc) {
        modalLogger.time("Create gradient with caching");

        // Check cache first
        if (this.state.gradientCache.has(imageSrc)) {
            const cachedGradient = this.state.gradientCache.get(imageSrc);
            modalLogger.debug("Using cached gradient", {imageSrc});
            this.state.fullscreenGradient = cachedGradient;
            modalLogger.timeEnd("Create gradient with caching");
            return cachedGradient;
        }

        try {
            // Verify image is fully loaded - check the actual modal image
            if (!this.elements.modalImage.complete ||
                !this.elements.modalImage.naturalWidth ||
                this.elements.modalImage.naturalWidth === 0) {
                modalLogger.warn("Image not ready, scheduling retry");

                // Set up a one-time retry
                return new Promise((resolve) => {
                    const checkImage = () => {
                        if (this.elements.modalImage.complete &&
                            this.elements.modalImage.naturalWidth > 0) {
                            // Now try again
                            this.extractPaletteAndCreateGradient(imageSrc)
                                .then(resolve)
                                .catch(() => resolve(this.getFallbackGradient()));
                        } else {
                            setTimeout(checkImage, 50);
                        }
                    };
                    checkImage();
                });
            }

            // Use requestAnimationFrame for smoother UI updates
            await new Promise(resolve => requestAnimationFrame(resolve));

            // Extract palette with more colors for richer gradients
            let palette;
            try {
                palette = this.colorThief.getPalette(this.elements.modalImage, 8); // Increased to 8 for more variety
                modalLogger.debug("Palette extracted", {
                    colors: palette.length,
                    sample: palette[0]
                });
            } catch (extractError) {
                modalLogger.warn("Failed to extract palette, using fallback", extractError);
                // Fallback: Generate palette from dominant color
                try {
                    const dominant = this.colorThief.getColor(this.elements.modalImage);
                    palette = this.generatePaletteFromDominant(dominant);
                    modalLogger.debug("Using generated palette from dominant", {dominant});
                } catch (dominantError) {
                    // Ultimate fallback - use time-based gradient
                    const fallback = this.getFallbackGradient();
                    this.state.gradientCache.set(imageSrc, fallback);
                    this.state.fullscreenGradient = fallback;
                    modalLogger.timeEnd("Create gradient with caching");
                    return fallback;
                }
            }

            // Create enhanced dynamic gradient
            const gradient = this.createDynamicGradient(palette);

            // Cache the result
            this.state.gradientCache.set(imageSrc, gradient);
            this.state.fullscreenGradient = gradient;
            this.state.colorPalette = palette;

            // Limit cache size to prevent memory leaks
            if (this.state.gradientCache.size > 30) {
                const firstKey = this.state.gradientCache.keys().next().value;
                this.state.gradientCache.delete(firstKey);
            }

            modalLogger.info("Gradient created and cached", {
                gradient: gradient.substring(0, 80) + '...',
                cacheSize: this.state.gradientCache.size,
            });
            modalLogger.timeEnd("Create gradient with caching");
            return gradient;
        } catch (error) {
            modalLogger.error("Gradient creation failed", error);

            // Use elegant fallback gradient
            const fallback = this.getFallbackGradient();
            this.state.gradientCache.set(imageSrc, fallback); // Cache even the fallback
            this.state.fullscreenGradient = fallback;

            modalLogger.timeEnd("Create gradient with caching");
            return fallback;
        }
    }

    /**
     * Generates a harmonious palette from a single dominant color
     * Creates color variations using HSL adjustments for natural harmony
     * @param {number[]} dominant - RGB array [r, g, b] of the dominant color
     * @returns {number[][]} Array of RGB color arrays
     */
    generatePaletteFromDominant(dominant) {
        const [r, g, b] = dominant;
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const palette = [dominant];

        // Create harmonious variations: analogous, complementary, triadic, etc.
        for (let i = 1; i < 6; i++) {
            const hueOffset = (i % 3 === 0) ? 180 : (i % 2 === 0 ? 30 : -30); // Complementary and analogous
            const newH = (h + hueOffset / 360) % 1;
            const newS = Math.min(100, Math.max(0, s + (i % 2 ? 10 : -10)));
            const newL = Math.min(100, Math.max(0, l + (i % 3 ? 15 : -15)));

            const variation = this.hslToRgb(newH * 360, newS, newL);
            palette.push(variation);
        }

        return palette;
    }

    /**
     * Creates a visually stunning dynamic gradient from a color palette
     * Uses radial and linear gradients with opacity variations for depth
     * @param {string[]} palette - Array of color strings to use in gradient
     * @returns {string} Combined CSS gradient string
     */
    createDynamicGradient(palette) {
        if (!palette || palette.length < 3) {
            return this.getFallbackGradient();
        }

        // Sort colors by hue and lightness for better selection
        const sortedByHue = [...palette].sort((a, b) => {
            const hueA = this.rgbToHsl(...a)[0];
            const hueB = this.rgbToHsl(...b)[0];
            return hueA - hueB;
        });
        const sortedByLightness = [...palette].sort((a, b) => {
            const lightnessA = this.rgbToHsl(...a)[2];
            const lightnessB = this.rgbToHsl(...b)[2];
            return lightnessA - lightnessB;
        });

        // Select 5 colors for richer gradient: dark, mid-tones, light
        const selectedColors = [
            sortedByLightness[0], // Darkest
            sortedByHue[Math.floor(sortedByHue.length / 4)], // Low hue
            sortedByHue[Math.floor(sortedByHue.length / 2)], // Mid hue
            sortedByHue[Math.floor(sortedByHue.length * 3 / 4)], // High hue
            sortedByLightness[sortedByLightness.length - 1] // Lightest
        ];

        // Create gradient stops with varying opacity for depth
        const gradientStops = selectedColors.map((color, index) => {
            const [r, g, b] = color;
            const position = (index / (selectedColors.length - 1)) * 100;
            const opacity = 0.4 + (0.5 * (index / selectedColors.length)); // Softer opacity range
            return `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)}) ${position}%`;
        });

        // Use radial gradient for a more immersive, focal effect
        const radialGradient = `radial-gradient(
        circle at 50% 50%,
        ${gradientStops.join(', ')}
    )`;

        // Linear fallback for broader compatibility
        const linearGradient = `linear-gradient(
        135deg,
        ${gradientStops.join(', ')}
    )`;

        // Combine for layered, dynamic look (CSS can animate between layers if desired)
        return `
        ${radialGradient},
        ${linearGradient}
    `.trim();
    }

    /**
     * Converts RGB color values to HSL format
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {number[]} HSL array [h, s, l]
     */
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
    }

    /**
     * Converts HSL color values to RGB format
     * @param {number} h - Hue value (0-360)
     * @param {number} s - Saturation percentage (0-100)
     * @param {number} l - Lightness percentage (0-100)
     * @returns {number[]} RGB array [r, g, b]
     */
    hslToRgb(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    /**
     * Provides an elegant fallback gradient based on time of day
     * Returns different gradients for night, morning, afternoon, and evening
     * @returns {string} CSS gradient string
     */
    getFallbackGradient() {
        const hour = new Date().getHours();

        // Time-based gradients with softer, more modern palettes
        if (hour < 6) return 'radial-gradient(circle, #0a0a2a 0%, #1a1a3a 100%)'; // Deep night
        if (hour < 12) return 'radial-gradient(circle, #1e3a8a 0%, #38bdf8 100%)'; // Fresh morning
        if (hour < 18) return 'radial-gradient(circle, #f97316 0%, #fde047 100%)'; // Warm afternoon
        return 'radial-gradient(circle, #1e293b 0%, #334155 100%)'; // Calm evening
    }

    /**
     * Applies the gradient background with smooth transitions
     * Only applies in browser fullscreen mode using CSS custom properties
     * @returns {void}
     */
    applyFullscreenBackground() {
        if (!this.state.isBrowserFullscreen) {
            this.restoreInitialBackgroundStyles();
            return;
        }

        modalLogger.debug("Applying fullscreen gradient background");

        // Set CSS custom property for gradient
        document.documentElement.style.setProperty(
            '--fullscreen-gradient',
            this.state.fullscreenGradient ||
            'linear-gradient(135deg, #f8c6c6 0%, #6f74cb 50%, #003456 100%)'
        );

        // Add class for CSS-based styling and transitions
        this.elements.modalContainer.classList.add('fullscreen-gradient-active','browser-fullscreen');
        this.elements.modal.classList.add('fullscreen-gradient-active');

        const modalContainer = this.elements.modalContainer;
        modalContainer.style.animation = 'none';
        modalContainer.offsetHeight;  // Trigger reflow
        modalContainer.style.animation = 'gradientFlow 15s ease infinite'

        modalLogger.debug("Fullscreen gradient applied via CSS variables");
    }

    /**
     * Restores initial styles with smooth transitions
     * Removes fullscreen gradient and reverts to original backgrounds
     * @returns {void}
     */
    restoreInitialBackgroundStyles() {
        modalLogger.time("Restore initial styles");

        // Load from localStorage if backup is missing
        if (!this.state.backupStyles) {
            try {
                const saved = localStorage.getItem('modal_backup_styles');
                if (saved) {
                    this.state.backupStyles = JSON.parse(saved);
                }
            } catch (e) {
                modalLogger.debug("Could not load from localStorage", e);
            }
        }

        // Remove fullscreen classes
        this.elements.modalContainer.classList.remove('fullscreen-gradient-active','browser-fullscreen');
        this.elements.modal.classList.remove('fullscreen-gradient-active');


        // Remove custom property
        document.documentElement.style.removeProperty('--fullscreen-gradient');

        // Restore styles only if backups exist and differ from current
        if (this.state.backupStyles) {
            const containerStyle = window.getComputedStyle(this.elements.modalContainer);
            const modalStyle = window.getComputedStyle(this.elements.modal);

            if (containerStyle.background !== this.state.backupStyles.container.background) {
                this.elements.modalContainer.style.background = this.state.backupStyles.container.background;
                this.elements.modalContainer.style.backgroundColor = this.state.backupStyles.container.backgroundColor;
                this.elements.modalContainer.style.transition = 'background 0.6s ease';
            }

            if (modalStyle.background !== this.state.backupStyles.modal.background) {
                this.elements.modal.style.background = this.state.backupStyles.modal.background;
                this.elements.modal.style.backgroundColor = this.state.backupStyles.modal.backgroundColor;
                this.elements.modal.style.transition = 'background 0.6s ease';
            }
        }

        // Clear state
        this.state.fullscreenGradient = '';
        this.state.colorPalette = null;

        modalLogger.debug("Styles restored to initial state");
        modalLogger.timeEnd("Restore initial styles");
    }

    /**
     * Pre-warms the gradient cache for visible thumbnails
     * Preloads gradients for first 5 thumbnails to improve performance
     * @async
     * @returns {Promise<void>}
     */
    async prewarmGradientCache() {
        modalLogger.time("Prewarm gradient cache");

        const thumbnails = Array.from(this.elements.allVisibleThumbnails || []).slice(0, 5); // Limit to 5

        const preloadPromises = thumbnails.map((thumb, index) => {
            const img = thumb.querySelector('img');
            if (img && img.src && !this.state.gradientCache.has(img.src)) {
                return new Promise((resolve) => {
                    const preloadImg = new Image();
                    preloadImg.crossOrigin = "Anonymous";
                    preloadImg.src = img.src;

                    preloadImg.onload = () => {
                        try {
                            const palette = this.colorThief.getPalette(preloadImg, 3);
                            const gradient = this.createDynamicGradient(palette);
                            this.state.gradientCache.set(img.src, gradient);

                            modalLogger.debug("Prewarmed gradient cache", {
                                index,
                                src: img.src.substring(0, 30) + '...',
                                cacheSize: this.state.gradientCache.size
                            });
                        } catch (e) {
                            modalLogger.debug("Failed to prewarm cache for image", e);
                        }
                        resolve();
                    };

                    preloadImg.onerror = () => resolve(); // Continue on error
                });
            }
            return Promise.resolve();
        });

        await Promise.all(preloadPromises);
        modalLogger.timeEnd("Prewarm gradient cache");
    }

    /**
     * Preloads high-resolution images for better gradient extraction
     * Caches gradients for faster modal transitions
     * @returns {void}
     */
    preloadMediaImages() {
        // Preload the first few images
        const preloadCount = Math.min(5, this.state.media.length);

        for (let i = 0; i < preloadCount; i++) {
            const mediaItem = this.state.media[i];
            if (mediaItem.data_type === 'image') {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = mediaItem.src;

                // Store in cache when loaded
                img.onload = () => {
                    try {
                        if (!this.state.gradientCache.has(mediaItem.src)) {
                            const palette = this.colorThief.getPalette(img, 6);
                            const gradient = this.createDynamicGradient(palette);
                            this.state.gradientCache.set(mediaItem.src, gradient);

                            modalLogger.debug("Preloaded and cached gradient", {
                                index: i,
                                cacheSize: this.state.gradientCache.size
                            });
                        }
                    } catch (e) {
                        // Silent fail for preloading
                    }
                };
            }
        }
    }

    /**
     * Sets up social media sharing functionality
     * Configures share links for Facebook, Twitter, Pinterest, and copy link
     * @returns {void}
     */
    setupSocialSharing() {
        modalLogger.time("Social sharing setup");
        this.elements.socialLinks.forEach((link, index) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const platform =
                    Array.from(link.classList).find((cls) => cls.includes("share-")) ||
                    "unknown";
                modalLogger.debug("Social share link clicked", {index, platform});
                this.handleSocialShare(link);
            });
        });
        modalLogger.debug("Social sharing links configured", {
            linkCount: this.elements.socialLinks.length,
        });
        modalLogger.timeEnd("Social sharing setup");
    }

    /**
     * Opens the modal at the specified media index
     * @param {number} index - The index of the media to display
     * @returns {void}
     */
    openModal(index) {
        modalLogger.time("Modal open");
        modalLogger.info("Opening modal", {
            index,
            totalMedia: this.state.media.length,
        });

        this._setCurrentIndex(index);
        document.body.style.overflow = "hidden";
        this.elements.modal.classList.remove("d-none");
        this.elements.modal.classList.add("active");
        this.updateModalContent();

        // Re-initialize Hammer if needed when modal opens
        if (!this.hammer && typeof Hammer !== "undefined") {
            modalLogger.debug("Hammer.js not initialized, setting up now");
            this.setupHammer();
        }

        this.resetZoom();
        this.resetMaximizeButton();

        if (!this.state.isZoomPanSetup) {
            modalLogger.debug("Setting up zoom/pan functionality");
            this.setupZoomPanFunctionality();
        }

        modalLogger.timeEnd("Modal open");
    }

    /**
     * Closes the modal and resets state
     * Handles fullscreen exit and video pausing
     * @returns {void}
     */
    closeModal() {
        modalLogger.time("Modal close");
        modalLogger.info("Closing modal");

        if (this.state.isFullscreen) {
            modalLogger.debug("Exiting fullscreen before closing modal");
            this.exitFullscreen();
        }

        document.body.style.overflow = "";

        if (!this.elements.modalVideo.classList.contains("d-none")) {
            modalLogger.debug("Pausing video in modal");
            this.elements.modalVideo.pause();
        }
        this.hideImageTooltip();

        this.elements.modal.classList.remove("active");
        this.elements.modal.classList.add("d-none");
        this.elements.allVisibleThumbnails[
            this.state.currentIndex
            ].classList.remove("active");

        modalLogger.timeEnd("Modal close");
    }

    /**
     * Gets the current media object based on current index
     * @private
     * @returns {Object} Current media object
     */
    _getCurrentMedia() {
        return this.state.media[this.state.currentIndex];
    }

    /**
     *
     * @return {Object} currentMedia Data
     * @private
     */
    _getCurrentMediaData(){
        return this.mediaData.media[this.state.currentIndex];
    }

    /**
     * Sets the current media index with bounds checking
     * @private
     * @param {number} index - The index to set as current
     * @returns {void}
     */
    _setCurrentIndex(index) {
        this.state.currentIndex = Math.max(
            0,
            Math.min(index, this.state.media.length - 1)
        );
    }

    /**
     * Toggles the maximize state of the modal
     * Switches between normal and maximized view modes
     * @returns {void}
     */
    toggleMaximize() {
        modalLogger.time("Toggle maximize");

        if (this.state.isMaximized) {
            modalLogger.debug("Minimizing modal");
            this.elements.modal.classList.remove("fullscreen");
            this.elements.maximizeModalBtn.innerHTML =
                '<i class="fas fa-expand"></i>';
            this.elements.maximizeModalBtn.setAttribute(
                "aria-label",
                "Maximize modal"
            );
            if (this.state.isFullscreen) {
                modalLogger.debug("Also exiting fullscreen");
                this.exitFullscreen();
            }
        } else {
            modalLogger.debug("Maximizing modal");
            this.elements.modal.classList.add("fullscreen");
            this.elements.maximizeModalBtn.innerHTML =
                '<i class="fas fa-compress"></i>';
            this.elements.maximizeModalBtn.setAttribute(
                "aria-label",
                "Minimize modal"
            );
        }

        this.state.isMaximized = !this.state.isMaximized;
        modalLogger.debug("Maximize state updated", {
            isMaximized: this.state.isMaximized,
        });
        modalLogger.timeEnd("Toggle maximize");
    }

    /**
     * Sets up zoom and pan functionality for images
     * Initializes both mouse and touch interactions
     * @returns {void}
     */
    setupZoomPanFunctionality() {
        if (this.state.isZoomPanSetup) {
            modalLogger.debug("Zoom/pan functionality already setup");
            return;
        }
        if(!this.state.enableZoom){
            return;
        }

        modalLogger.time("Zoom/pan functionality setup");
        this.setupMouseZoomPan();
        this.setupTouchZoomPan();
        this.state.isZoomPanSetup = true;
        modalLogger.info("Zoom/pan functionality initialized");
        modalLogger.timeEnd("Zoom/pan functionality setup");
    }


    /**
     * Resets the maximize button to default state
     * Used when closing modal or resetting UI
     * @returns {void}
     */
    resetMaximizeButton() {
        modalLogger.debug("Resetting maximize button state");
        this.state.isMaximized = false;
        this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
        this.elements.maximizeModalBtn.setAttribute("aria-label", "Maximize modal");
    }

    /**
     * Navigates to the next or previous media item
     * @param {number} direction - Navigation direction (1 for next, -1 for previous)
     * @returns {void}
     */
    navigate(direction) {
        modalLogger.time("Navigation");
        modalLogger.debug("Navigating media", {
            direction,
            currentIndex: this.state.currentIndex,
        });
        const current = this._getCurrentMedia();
        const mediaElement =
            current.data_type === "image"
                ? this.elements.modalImage
                : this.elements.modalVideo;
        this.showMediaLoading(mediaElement);

        if (!this.elements.modalVideo.classList.contains("d-none")) {
            modalLogger.debug("Pausing current video during navigation");
            this.elements.modalVideo.pause();
            this.restoreInitialBackgroundStyles();
        }
        this.hideImageTooltip();

        this.state.currentIndex += direction;
        // Circular navigation
        this.state.currentIndex =
            ((this.state.currentIndex % this.state.media.length) +
                this.state.media.length) %
            this.state.media.length;

        this.updateModalContent();
        this.animateTransition(direction);

        if (this.state.isBrowserFullscreen) {
            const newCurrent = this._getCurrentMedia();
            if (newCurrent.data_type === 'image') {
                // Wait a bit for image to start loading
                this.extractPaletteAndCreateGradient(newCurrent.src).then(() => {
                    this.applyFullscreenBackground();
                });
            }
              else if (newCurrent.data_type === 'video' && this.elements.activeThumbnail) {
                   this.extractPaletteAndCreateGradient(this.elements.activeThumbnail.src).then(() => {
                       this.applyFullscreenBackground();
                   })
               }
             else {
                this.restoreInitialBackgroundStyles();
            }
        }
        modalLogger.debug("Navigation completed", {
            newIndex: this.state.currentIndex,
        });
        modalLogger.timeEnd("Navigation");
    }

    /**
     * Updates modal content to display current media
     * Handles image/video switching and counter updates
     * @returns {void}
     */
    updateModalContent() {
        modalLogger.time("Update modal content");
        const current = this._getCurrentMedia();
        modalLogger.debug("Updating modal content", {
            index: this.state.currentIndex,
            mediaType: current.data_type,
            alt: current.alt,
        });

        // Clear previous media
        this.elements.modalImage.src = "";
        this.elements.modalVideo.src = "";

        this._setMediaContent(current);
        this.elements.counter.textContent = `${this.state.currentIndex + 1}/${
            this.state.media.length
        }`;

        modalLogger.debug("Counter updated", {
            display: `${this.state.currentIndex + 1}/${this.state.media.length}`,
        });

        this.activeThumbnail();
        this.updateSocialLinks(this._getCurrentMediaData());
        modalLogger.timeEnd("Update modal content");
    }

    /**
     * Sets up image tooltip functionality
     * Configures click-based tooltips for images and videos
     * @returns {void}
     */
    setupImageTooltip() {
        modalLogger.time("ImageTooltipSetup");

        // Use the existing tooltip from your HTML
        this.tooltip = this.elements.modalTooltip;

        if (!this.tooltip) {
            modalLogger.warn("Modal tooltip element not found in DOM");
            modalLogger.timeEnd("ImageTooltipSetup");
            return;
        }

        modalLogger.debug("Found existing modal tooltip element");

        // Set up click event for tooltip display on image
        this.elements.modalImage.addEventListener("click", (e) => {
            this.showImageTooltip(e);
        });

        // Set up click event for video (if you want tooltips on videos too)
        if (this.elements.modalVideo) {
            this.elements.modalVideo.addEventListener("click", (e) => {
                this.showImageTooltip(e);
            });
        }
        this.elements.maximizeModalBtn?.addEventListener("click", () => {
            this.hideImageTooltip();
        });

        if (this.hammer) {
            this.hammer.on("tap", (e) => {
                e.preventDefault();
                modalLogger.debug(" tap detected, toggling tooltip");
                this.showImageTooltip(e);
            });
        }

        // Hide tooltip on escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.hideImageTooltip();
            }
        });

        modalLogger.debug("Image tooltip setup completed");
        modalLogger.timeEnd("ImageTooltipSetup");
    }

    /**
     * Shows the image tooltip at click position
     * Positions tooltip intelligently within viewport and modal bounds
     * @param {Event} event - The click event containing position data
     * @returns {void}
     */
    showImageTooltip(event) {
        // Don't show tooltip if we're in zoomed mode or if tooltip doesn't exist
        if (this.state.isZoomed || !this.tooltip) {
            return;
        }

        modalLogger.debug("Showing image tooltip", {
            clientX: event.clientX,
            clientY: event.clientY,
        });

        // Set tooltip message based on device type and current state
        const current = this._getCurrentMedia();
        const currentUser = this.state.currentUser || getCurrentUserInfo();

        let message;
        if (this.tooltip.getAttribute('data-intelligent-caption')) {
            // Use cached caption
            message = this.tooltip.getAttribute('data-intelligent-caption');
        } else {
            // Generate new caption
            message = generateSimpleMessage(this._getCurrentMediaData(), currentUser) || current.alt;
        }

        // Update tooltip text
        this.tooltip.textContent = message;

        // OFFSCREEN MEASUREMENT TECHNIQUE: Temporarily position offscreen to measure accurately
        // without affecting the visible UI or relying on hidden visibility
        const originalDisplay = this.tooltip.style.display;
        const originalLeft = this.tooltip.style.left;
        const originalTop = this.tooltip.style.top;
        const originalVisibility = this.tooltip.style.visibility;

        // Set up for measurement: display block, visible, positioned way offscreen
        this.tooltip.style.display = "block";
        this.tooltip.style.visibility = "visible";
        this.tooltip.style.left = "-9999px"; // Offscreen left
        this.tooltip.style.top = "auto"; // Reset top for natural height
        this.tooltip.classList.add("visible"); // Ensure full styles (e.g., animations/transitions) are applied

        // Force reflow to apply styles and compute dimensions
        this.tooltip.offsetHeight; // Trigger reflow

        // Now measure
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        // Reset to original state for positioning (will re-apply position later)
        this.tooltip.classList.remove("visible");
        this.tooltip.style.display = originalDisplay;
        this.tooltip.style.left = originalLeft;
        this.tooltip.style.top = originalTop;
        this.tooltip.style.visibility = originalVisibility;

        // Get modal and viewport dimensions
        const modalRect = this.elements.modalContainer.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate ideal position (centered near click with offset)
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Adjusted for "directly under the mouse": position below click, centered horizontally
        const offsetY = 10; // Small offset below the click
        let tooltipX = clickX - tooltipWidth / 2; // Center horizontally relative to click
        let tooltipY = clickY + offsetY;

        // Smart boundary detection and adjustment with priorities:
        // 1. Prefer below, then above, then clamp
        // 2. Horizontal: prefer centered at click, then shift left/right, then clamp
        const safeMargin = 12; // Slightly larger margin for better UX

        // HORIZONTAL POSITIONING
        // Check right boundary first (viewport)
        if (tooltipX + tooltipWidth > viewportWidth - safeMargin) {
            // Shift left from click position (without extra offset to avoid being too far)
            tooltipX = clickX - tooltipWidth;
        }

        // Check left boundary (viewport)
        if (tooltipX < safeMargin) {
            // Clamp to left edge or center if too narrow
            if (tooltipWidth > viewportWidth - 2 * safeMargin) {
                // Tooltip too wide for screen: center it
                tooltipX = (viewportWidth - tooltipWidth) / 2;
            } else {
                tooltipX = safeMargin;
            }
        }

        // VERTICAL POSITIONING
        // Prefer below click
        if (tooltipY + tooltipHeight > viewportHeight - safeMargin) {
            // Not enough space below: try above
            tooltipY = clickY - tooltipHeight - 10; // Above with small offset
            // If still hits top, clamp to top
            if (tooltipY < safeMargin) {
                tooltipY = safeMargin;
            }
        }

        // MODAL BOUNDS ADJUSTMENT: Ensure tooltip stays INSIDE modal
        // This is crucial if modal has overflow: hidden or padding
        const modalPadding = 20; // Account for modal's internal padding/borders

        // Horizontal modal bounds
        const modalSafeLeft = modalRect.left + modalPadding;
        const modalSafeRight = modalRect.right - modalPadding;
        if (tooltipX < modalSafeLeft) {
            tooltipX = modalSafeLeft;
        }
        if (tooltipX + tooltipWidth > modalSafeRight) {
            tooltipX = modalSafeRight - tooltipWidth;
            // If still overflows left, center in modal
            if (tooltipX < modalSafeLeft) {
                tooltipX = (modalRect.width - tooltipWidth) / 2 + modalRect.left;
            }
        }

        // Vertical modal bounds
        const modalSafeTop = modalRect.top + modalPadding;
        const modalSafeBottom = modalRect.bottom - modalPadding;
        if (tooltipY < modalSafeTop) {
            tooltipY = modalSafeTop;
        }
        if (tooltipY + tooltipHeight > modalSafeBottom) {
            tooltipY = modalSafeBottom - tooltipHeight;
            // If still overflows top, center vertically in modal
            if (tooltipY < modalSafeTop) {
                tooltipY = (modalRect.height - tooltipHeight) / 2 + modalRect.top;
            }
        }

        // Apply final position (absolute to document)
        this.tooltip.style.left = `${Math.round(tooltipX)}px`;
        this.tooltip.style.top = `${Math.round(tooltipY)}px`;

        // Show tooltip with smooth animation
        requestAnimationFrame(() => {
            this.tooltip.classList.add("visible");
        });

        // Auto-hide after 3.5 seconds (slight increase for readability)
        clearTimeout(this.tooltipTimeout);
        this.tooltipTimeout = setTimeout(() => {
            this.hideImageTooltip();
        }, 3500);

        modalLogger.debug("Image tooltip displayed", {
            message,
            clickPosition: {x: clickX, y: clickY},
            finalPosition: {x: tooltipX, y: tooltipY},
            tooltipDimensions: {width: tooltipWidth, height: tooltipHeight},
            viewport: {width: viewportWidth, height: viewportHeight},
            modalBounds: {
                left: modalRect.left,
                right: modalRect.right,
                top: modalRect.top,
                bottom: modalRect.bottom,
            },
        });
    }

    /**
     * Hides the image tooltip
     * @returns {void}
     */
    hideImageTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove("visible");
            clearTimeout(this.tooltipTimeout);
            modalLogger.debug("Image tooltip hidden");
        }
    }

    /**
     * Sets modal content based on media type
     * @private
     * @param {Object} mediaObj - The media object containing type and source
     * @returns {void}
     */
    _setMediaContent(mediaObj) {
        modalLogger.debug("Setting media content", {
            dataType: mediaObj.data_type,
            alt: mediaObj.alt,
        });

        const currentUser = this.state.currentUser || getCurrentUserInfo();
        const alt = mediaObj.alt;
        if (mediaObj.data_type === "image") {
            const intelligentAlt = this.generateIntelligentAltText(mediaObj, currentUser);
            this._showImage(mediaObj.src, alt);
        } else if (mediaObj.data_type === "video") {
            this._showVideo(mediaObj.vidSrc, alt);
        } else {
            modalLogger.warn("Unknown media type", {dataType: mediaObj.data_type});
        }
    }

    /**
     * Displays an image in the modal
     * @private
     * @param {string} src - Image source URL
     * @param {string} alt - Image alt text
     * @returns {void}
     */
    _showImage(src, alt) {
        modalLogger.debug("Showing image in modal", {src, alt});

        this.showMediaLoading(this.elements.modalImage);

        this.elements.modalVideo.classList.add("d-none");
        this.elements.modalImage.src = src;
        this.elements.modalImage.alt = alt;
        this.elements.modalImage.classList.remove("d-none");

        this.elements.modalImage.addEventListener("load", () => {
            if (this.state.isBrowserFullscreen) {
                this.extractPaletteAndCreateGradient(src).then(() => {
                    this.applyFullscreenBackground();
                });
            }
            this.hideMediaLoading(this.elements.modalImage);
            modalLogger.debug("Image loaded successfully");
        });
        modalLogger.debug("Image display configured");
    }

    /**
     * Updates active thumbnail styling based on current index
     * @returns {void}
     */
    _showVideo(src, alt) {
        modalLogger.debug("Showing video in modal", {src, alt});
        this.showMediaLoading(this.elements.modalVideo);

        this.elements.modalImage.classList.add("d-none");
        this.elements.modalVideo.src = src;
        this.elements.modalVideo.alt = alt;
        this.elements.modalVideo.classList.remove("d-none");

        this.elements.modalVideo.addEventListener("loadeddata", () => {
            modalLogger.debug("Video data loaded");
            this.hideMediaLoading(this.elements.modalVideo);
        });

        this.elements.modalVideo.addEventListener("error", () => {
            modalLogger.error("Video failed to load");
            this.hideMediaLoading(this.elements.modalVideo);
        });

        this.elements.modalVideo.addEventListener("waiting", () => {
            modalLogger.debug("Video buffering, show loading");
            this.showMediaLoading(this.elements.modalVideo);
        });

        this.elements.modalVideo.addEventListener("canplay", () => {
            modalLogger.debug("Video can play, hide loading");
            this.hideMediaLoading(this.elements.modalVideo);
        });

        this.elements.modalVideo
            .play()
            .then(() => {
                modalLogger.debug("Video playback started successfully");
            })
            .catch((error) => {
                this.elements.modalVideo.classList.add("d-none");
                modalLogger.error("Video playback failed", error);
            });

        modalLogger.debug("Video display configured");
    }

    /**
     * Updates active thumbnail styling based on current index
     * @returns {void}
     */
    activeThumbnail() {
        modalLogger.time("Active thumbnail update");

        this.elements.allVisibleThumbnails.forEach((thumb) => {
            thumb.classList.remove("active");
        });

        const thumbnail =
            this.elements.allVisibleThumbnails[this.state.currentIndex];
        if (thumbnail) {
            thumbnail.classList.add("active");
            this.elements.activeThumbnail = thumbnail.querySelector('img');
            modalLogger.debug("Thumbnail activated", {
                index: this.state.currentIndex,
            });
        } else {
            modalLogger.warn("No thumbnail found for index", {
                index: this.state.currentIndex,
            });
        }

        modalLogger.timeEnd("Active thumbnail update");
    }

    /**
     * Toggles fullscreen mode
     * @returns {void}
     */
    toggleFullscreen() {
        modalLogger.time("Toggle fullscreen");

        if (!this.state.isFullscreen) {
            modalLogger.debug("Entering fullscreen");
            this.enterFullscreen();
            this.hideImageTooltip();
        } else {
            modalLogger.debug("Exiting fullscreen");
            this.exitFullscreen();
        }

        modalLogger.timeEnd("Toggle fullscreen");
    }

    /**
     * @async
     * Enters fullscreen mode using browser API
     * @returns {void}
     */
   async enterFullscreen() {
        modalLogger.time("Enter fullscreen");

        if (this.elements.modalContainer.requestFullscreen) {
          await this.elements.modalContainer.requestFullscreen();
            modalLogger.debug("Fullscreen requested (standard)");
        } else if (this.elements.modalContainer.webkitRequestFullscreen) {
            this.elements.modalContainer.webkitRequestFullscreen();
            modalLogger.debug("Fullscreen requested (webkit)");
        } else if (this.elements.modalContainer.msRequestFullscreen) {
            this.elements.modalContainer.msRequestFullscreen();
            modalLogger.debug("Fullscreen requested (ms)");
        } else {
            modalLogger.warn("Fullscreen API not supported in this browser");
        }

        this.state.isFullscreen = true;
        this.elements.maximizeModalBtn.innerHTML =
            '<i class="fas fa-compress"></i>';
        this.elements.maximizeModalBtn.setAttribute(
            "aria-label",
            "Exit fullscreen"
        );

        this._toggleNavigationElements(true)

        // Add a class for custom fullscreen styling
        this.elements.modal.classList.add("fullscreen");
        modalLogger.info("Fullscreen entered successfully");
        modalLogger.timeEnd("Enter fullscreen");
    }

    /**
     * @async
     * Exits fullscreen mode using browser API
     * @returns {void}
     */
   async exitFullscreen() {
        modalLogger.time("Exit fullscreen");

        if (document.exitFullscreen) {
          await  document.exitFullscreen();
            modalLogger.debug("Fullscreen exit (standard)");
        } else if (document.webkitExitFullscreen) {
           await document.webkitExitFullscreen();
            modalLogger.debug("Fullscreen exit (webkit)");
        } else if (document.msExitFullscreen) {
          await  document.msExitFullscreen();
            modalLogger.debug("Fullscreen exit (ms)");
        } else {
            modalLogger.warn("Fullscreen exit API not supported");
        }

        this.state.isFullscreen = false;
        this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
        this.elements.maximizeModalBtn.setAttribute(
            "aria-label",
            "Enter fullscreen"
        );

        this._toggleNavigationElements(false)

        // Remove the custom fullscreen styling
        this.elements.modal.classList.remove("fullscreen");
        modalLogger.info("Fullscreen exited successfully");
        modalLogger.timeEnd("Exit fullscreen");
    }

    /**
     * Handles fullscreen change events from browser
     * Updates state and applies/removes gradient backgrounds
     * @returns {void}
     */
    handleFullscreenChange() {
        modalLogger.debug("Handling fullscreen change event");

        const fullscreenElement =
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;

        const isNowFullscreen = !!fullscreenElement;

        if (isNowFullscreen && !this.state.isBrowserFullscreen) {
            // Entered browser fullscreen
            modalLogger.debug("Entered browser fullscreen (F11)");
            this.state.isBrowserFullscreen = true;

            // Extract palette and apply gradient if showing an image
            const current = this._getCurrentMedia();
            if (current.data_type === 'image') {
                this.extractPaletteAndCreateGradient(current.src)
                    .then(() => {
                        this.applyFullscreenBackground();
                    });
            }
            else if(current.data_type === 'video' && this.elements.activeThumbnail) {
                this.extractPaletteAndCreateGradient(this.elements.activeThumbnail.src)
                    .then(() => {
                        this.applyFullscreenBackground();
                    });
            }

        } else if (!isNowFullscreen && this.state.isBrowserFullscreen) {
            // Exited browser fullscreen
            modalLogger.debug("Exited browser fullscreen (F11)");
            this.state.isBrowserFullscreen = false;

            // Remove gradient background
            this.restoreInitialBackgroundStyles();
        }

        if (!fullscreenElement) {
            modalLogger.debug("Fullscreen exited via browser controls");
            // We exited fullscreen
            this.state.isFullscreen = false;
            this.elements.maximizeModalBtn.innerHTML =
                '<i class="fas fa-expand"></i>';
            this.elements.maximizeModalBtn.setAttribute(
                "aria-label",
                "Enter fullscreen"
            );
            this.elements.modal.classList.remove("fullscreen");
        } else {
            modalLogger.debug("Fullscreen active via browser controls");
        }
    }

    /**
     * Creates a gallery figure element for thumbnail display
     * @param {Object} mediaData - Media data object containing thumb and alt
     * @param {number} index - Index position in gallery
     * @returns {HTMLElement} Created figure element
     */
    createGalleryFigure(mediaData, index) {
        modalLogger.debug("Creating gallery figure", {index, alt: mediaData.alt});

        const figure = document.createElement("figure");
        figure.className = "photo-thumbnail";
        figure.style.animationDelay = `${index * 5.1}s`;

        const img = document.createElement("img");
        img.src = mediaData.thumb;
        img.alt = mediaData.alt;
        img.loading = "lazy";
        img.width = 80;
        img.height = 80;
        figure.setAttribute("data-type", `${mediaData["data-type"] || "image"}`);
        figure.setAttribute("media-index", index);
        figure.appendChild(img);
        return figure;
    }

    /**
     * Generates the photo gallery from media data
     * Creates thumbnails and sets up initial gallery state
     * @async
     * @returns {Promise<void>}
     */
    async generateGallery() {
        modalLogger.time("Gallery generation");
        const {galleryContainer} = this.elements;
        if (!galleryContainer) {
            modalLogger.error("Gallery container not found");
            modalLogger.timeEnd("Gallery generation");
            return;
        }

        modalLogger.debug("Starting gallery generation");
        this.mediaData = await loadMediaData();

        this.mediaData.media.forEach((mediaData, index) => {
            const figure = this.createGalleryFigure(mediaData, index);

            // Hide images beyond the first 9 (index > 8) but  last 1 visible
            if (index > 8 && index !== this.mediaData.media.length - 1) {
                figure.classList.add("d-none");
            }
            galleryContainer.appendChild(figure);
        });

        this.cacheImages();
        this.setupEventListeners();
        this.setupSocialSharing();

        // Check if we need to show the See More button
        this.checkSeeMoreButton();

        modalLogger.info("Gallery generation completed", {
            mediaCount: this.mediaData.media.length,
            thumbnailsCreated: galleryContainer.children.length,
            hiddenThumbnails: this.elements.cardContent.querySelectorAll(
                ".photo-thumbnail.d-none"
            ).length,
        });
        modalLogger.timeEnd("Gallery generation");
    }

    /**
     * Checks if the See More button should be visible
     * Hides button when no hidden thumbnails remain
     * @returns {void}
     */
    checkSeeMoreButton() {
        const hiddenThumbnails = this.elements.cardContent.querySelectorAll(
            ".photo-thumbnail.d-none"
        );

        if (hiddenThumbnails.length === 0 && this.elements.seeMoreBtn) {
            modalLogger.debug("No hidden thumbnails, hiding See More button");
            this.elements.seeMoreBtn.style.display = "none";
        } else {
            modalLogger.debug(
                "Hidden thumbnails found, See More button should be visible",
                {
                    hiddenCount: hiddenThumbnails.length,
                }
            );
        }
    }

    /**
     * Sets up the See More button functionality
     * Configures click handler for revealing hidden thumbnails
     * @returns {void}
     */
    setupSeeMoreButton() {
        modalLogger.time("See More button setup");

        if (!this.elements.seeMoreBtn) {
            modalLogger.warn("See More button not found in DOM");
            modalLogger.timeEnd("See More button setup");
            return;
        }

        this.elements.seeMoreBtn.addEventListener("click", () => {
            this.showMoreMemories();
        });

        modalLogger.debug("See More button event listener added");
        modalLogger.timeEnd("See More button setup");
    }

    /**
     * Shows hidden memories when See More is clicked
     * Reveals thumbnails with staggered animations
     * @returns {void}
     */
    showMoreMemories() {
        modalLogger.time("Show more memories");

        // Show loading state
        const arrow = this.elements.seeMoreBtn.querySelector(".arrow");
        const text = this.elements.seeMoreBtn.querySelector(".text");

        if (arrow && text) {
            arrow.style.animation = "none";
            text.textContent = "Loading...";
            arrow.style.opacity = "0.7";
        }

        // Get all hidden thumbnails
        const hiddenThumbnails = this.elements.cardContent.querySelectorAll(
            ".photo-thumbnail.d-none"
        );
        modalLogger.debug("Found hidden thumbnails", {
            count: hiddenThumbnails.length,
        });

        if (hiddenThumbnails.length === 0) {
            modalLogger.debug("No more hidden thumbnails to show");
            this.hideSeeMoreButton();
            modalLogger.timeEnd("Show more memories");
            return;
        }

        // Show hidden thumbnails with staggered animation
        hiddenThumbnails.forEach((thumbnail, index) => {
            if (index >= 6) return; // Show only 6 at a time
            setTimeout(() => {
                thumbnail.classList.remove("d-none");
                thumbnail.classList.add("revealed");
                thumbnail.style.animationDelay = `${index * 0.1}s`;

                modalLogger.debug("Revealed thumbnail", {
                    index,
                    alt: thumbnail.querySelector("img")?.alt || "unknown",
                });
            }, index * 100);
        });

        // Check if there are still hidden thumbnails after revealing some
        setTimeout(() => {
            const remainingHidden = this.elements.cardContent.querySelectorAll(
                ".photo-thumbnail.d-none"
            );

            if (remainingHidden.length === 0) {
                modalLogger.debug("All thumbnails revealed, hiding See More button");
                this.hideSeeMoreButton();
            } else {
                // Reset button state if there are still more to show
                if (arrow && text) {
                    arrow.style.animation =
                        "float 2s ease-in-out infinite, pulse-glow 3s ease-in-out infinite";
                    text.textContent = "See More memories";
                    arrow.style.opacity = "1";
                }
                modalLogger.debug("Some thumbnails remain hidden", {
                    remaining: remainingHidden.length,
                });
            }

            // Update the media array to include the newly revealed thumbnails
            this.updateMediaArray();

            modalLogger.info("More memories revealed successfully", {
                revealedCount: Math.min(hiddenThumbnails.length, 6), // Show 6 at a time
                totalRevealed: this.state.media.length,
            });
        }, hiddenThumbnails.length * 100 + 500);

        modalLogger.timeEnd("Show more memories");
    }

    /**
     * Hides the See More button with animation
     * Used when all thumbnails have been revealed
     * @returns {void}
     */
    hideSeeMoreButton() {
        modalLogger.time("Hide See More button");

        if (this.elements.seeMoreBtn) {
            this.elements.seeMoreBtn.style.opacity = "0";
            this.elements.seeMoreBtn.style.transform = "translateY(20px)";

            setTimeout(() => {
                this.elements.seeMoreBtn.style.display = "none";
                modalLogger.debug("See More button hidden");
            }, 500);
        }

        modalLogger.timeEnd("Hide See More button");
    }

    /**
     * Updates the media array to include newly revealed thumbnails
     * Rebuilds media state based on visible thumbnails
     * @returns {void}
     */
    updateMediaArray() {
        modalLogger.time("Update media array");

        const allVisibleThumbnails = this.elements.cardContent.querySelectorAll(
            ".photo-thumbnail:not(.d-none)"
        );
        const updatedMedia = [];
        const mediaByIndex = {};

        // Create a map of all media data
        this.mediaData.media.forEach((media, index) => {
            mediaByIndex[index] = media;
        });

        // Build media array based on visible thumbnails and their media-index
        allVisibleThumbnails.forEach((thumb) => {
            const mediaIndex = parseInt(thumb.getAttribute("media-index"));

            if (!isNaN(mediaIndex) && mediaByIndex[mediaIndex]) {
                const mediaItem = mediaByIndex[mediaIndex];
                updatedMedia.push({
                    src: mediaItem.src,
                    alt: mediaItem.alt,
                    data_type: mediaItem["data-type"],
                    vidSrc: mediaItem["video-src"],
                    originalIndex: mediaIndex,
                });
            }
        });
        this.elements.allVisibleThumbnails = allVisibleThumbnails;
        this.state.media = updatedMedia;

        modalLogger.debug("Media array updated with media-index approach", {
            visibleThumbnails: allVisibleThumbnails.length,
            mediaCount: this.state.media.length,
            indices: this.state.media.map((m) => m.originalIndex),
        });

        modalLogger.timeEnd("Update media array");
    }

    /**
     * Updates social media sharing links with current media
     * @param {Object} current - Current media object
     * @returns {void}
     */
    updateSocialLinks(current) {
        modalLogger.time("Social links update");
        const currentUser = this.state.currentUser || getCurrentUserInfo();


        const twitterMessage = this.generatePlatformMessage(current, currentUser, 'twitter');
        const facebookMessage = this.generatePlatformMessage(current, currentUser, 'facebook');
        const pinterestMessage = this.generatePlatformMessage(current, currentUser, 'pinterest');
        const whatsappMessage = this.generatePlatformMessage(current, currentUser, 'whatsapp');

        const encodedUrl = encodeURIComponent(window.location.href);
        const encodedTwitter = encodeURIComponent(twitterMessage);
        const encodedFacebook = encodeURIComponent(facebookMessage);
        const encodedPinterest = encodeURIComponent(pinterestMessage);
        const encodedWhatsapp = encodeURIComponent(whatsappMessage);

        document.querySelector(".share-twitter").href =
            `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTwitter}`;

        document.querySelector(".share-facebook").href =
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedFacebook}`;

        document.querySelector(".share-pinterest").href =
            `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(current.src)}&description=${encodedPinterest}`;

        // If you have a WhatsApp share button
        const whatsappBtn = document.querySelector(".share-whatsapp");
        if (whatsappBtn) {
            whatsappBtn.href = `https://wa.me/?text=${encodedWhatsapp}`;
        }

        // Update copy-to-clipboard with intelligent message
        document.querySelector(".share-link").addEventListener("click", (e) => {
            e.preventDefault();
            modalLogger.debug("Share link clicked, copying to clipboard");

            const shareText = `${twitterMessage}\n\n${window.location.href}`;
            navigator.clipboard.writeText(shareText).then(() => {
                this.showTooltip("Message copied with photo link!", e.target);
            }).catch((err) => {
                modalLogger.error("Failed to copy to clipboard", err);
                this.showTooltip("Link not copied!", e.target);
            });
        });

        const intelligentAlt = this.generateIntelligentAltText(current, currentUser);
        this.elements.modalImage.alt = intelligentAlt;

        // Update tooltip with better caption
        this.updateTooltipCaption(current, currentUser);

        modalLogger.debug("Social links updated with intelligent messages", {
            twitterLength: twitterMessage.length,
            facebookLength: facebookMessage.length,
            altText: intelligentAlt
        });

        modalLogger.timeEnd("Social links update");
    }
    /**
     * Generates platform-specific message
     * @param {Object} media - Media object
     * @param {Object} currentUser - Current user info
     * @param {string} platform - Platform name
     * @returns {string} Generated message
     */
    generatePlatformMessage(media, currentUser, platform = 'twitter') {
        // Check cache first
        const cacheKey = `${media.src}_${platform}`;
        if (this.state.messageCache.has(cacheKey)) {
            return this.state.messageCache.get(cacheKey);
        }

        // Generate platform-specific message
        let message;
        switch(platform) {
            case 'twitter':
                message = this.generateTwitterMessage(media, currentUser);
                break;
            case 'facebook':
                message = this.generateFacebookMessage(media, currentUser);
                break;
            case 'pinterest':
                message = this.generatePinterestMessage(media, currentUser);
                break;
            case 'whatsapp':
                message = this.generateWhatsappMessage(media, currentUser);
                break;
            default:
                message = this.generateSimpleMessage(media, currentUser);
        }

        // Cache the message
        this.state.messageCache.set(cacheKey, message);

        // Limit cache size
        if (this.state.messageCache.size > 20) {
            const firstKey = this.state.messageCache.keys().next().value;
            this.state.messageCache.delete(firstKey);
        }

        return message;
    }

    /**
     * Generates Twitter message (280 chars max)
     */
    generateTwitterMessage(media, currentUser) {
        const generated = generateIntelligentMessage(media, currentUser, {
            sentiment: 'celebratory',
            complexity: 'simple',
            includeNames: true,
            includeEmojis: true
        });

        let message = generated.message || generated;

        // Ensure it fits Twitter limit
        if (message.length > 280) {
            message = message.substring(0, 275) + '...';
        }

        return message;
    }

    /**
     * Generates Facebook message
     */
    generateFacebookMessage(media, currentUser) {
        return generateStoryCaption(media, currentUser) ||
            generateIntelligentMessage(media, currentUser, {
                sentiment: 'nostalgic',
                complexity: 'medium'
            }).message;
    }

    /**
     * Generates Pinterest message
     */
    generatePinterestMessage(media, currentUser) {
        const story = generateStoryCaption(media, currentUser);
        const intelligent = generateIntelligentMessage(media, currentUser, {
            sentiment: 'romantic',
            complexity: 'medium'
        }).message;

        return `${story} ${intelligent}`.substring(0, 500);
    }

    /**
     * Generates WhatsApp message
     */
    generateWhatsappMessage(media, currentUser) {
        return generateSimpleMessage(media, currentUser) ||
            `Check out this memory! ${media.alt || "Beautiful photo"}`;
    }

    /**
     * Generates simple message fallback
     */
    generateSimpleMessage(media, currentUser) {
        const persons = Array.isArray(media.persons) ? media.persons : [];

        if (persons.length === 0) {
            return "Beautiful memory captured forever ✨";
        }

        const userCode = currentUser?.code;
        const userInPhoto = persons.some(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code === userCode;
        });

        const otherPersons = persons.filter(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code !== userCode;
        });

        if (otherPersons.length === 1) {
            const person = otherPersons[0];
            const name = typeof person === 'string' ? person : (person.name || person.code);
            return userInPhoto
                ? `Me with ${name} - great memories! 😊`
                : `${name} looking amazing! ✨`;
        }

        if (otherPersons.length === 2) {
            const names = otherPersons.map(p =>
                typeof p === 'string' ? p : (p.name || p.code)
            ).join(' and ');
            return userInPhoto
                ? `Amazing times with ${names}! 👥`
                : `${names} together - what a beautiful memory! 💖`;
        }

        return `${persons.length} amazing people in one frame! 📸`;
    }

    /**
     * Generates intelligent alt text for images
     */
    generateIntelligentAltText(media, currentUser) {
        const persons = Array.isArray(media.persons) ? media.persons : [];
        const userCode = currentUser?.code;

        if (persons.length === 0) {
            return media.alt || "A beautiful memory captured in time";
        }

        const userInPhoto = persons.some(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code === userCode;
        });

        const otherPersons = persons.filter(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code !== userCode;
        });

        if (otherPersons.length === 0 && userInPhoto) {
            return "A personal photo capturing a special moment in time";
        }

        if (otherPersons.length === 1) {
            const person = otherPersons[0];
            const name = typeof person === 'string' ? person : (person.name || 'friend');
            return userInPhoto
                ? `Photo of me with ${name}, sharing a special moment together`
                : `Photo of ${name}, captured in a beautiful memory`;
        }

        if (otherPersons.length === 2) {
            const names = otherPersons.map(p =>
                typeof p === 'string' ? p : (p.name || 'friend')
            ).join(' and ');
            return userInPhoto
                ? `Group photo with ${names} and me, enjoying time together`
                : `Photo of ${names} together, creating memories`;
        }

        return `Group photo with ${persons.length} people sharing special moments together`;
    }

    /**
     * Updates tooltip caption with intelligent message
     */
    updateTooltipCaption(media, currentUser) {
        if (!this.tooltip) return;

        const quickCaption = generateSimpleMessage(media, currentUser);
        // Store in data attribute for reference
        this.tooltip.setAttribute('data-intelligent-caption', quickCaption);

        // If tooltip is visible, update it
        if (this.tooltip.classList.contains('visible')) {
            this.tooltip.textContent = quickCaption;
        }
    }

    /**
     * Generates dynamic caption based on current media
     * Can be used for modal title or other UI elements
     */
    generateDynamicCaption() {
        const current = this._getCurrentMedia();
        const currentUser = this.state.currentUser || getCurrentUserInfo();
        const persons = Array.isArray(current.persons) ? current.persons : [];

        if (persons.length === 0) {
            return "A Special Memory";
        }

        const userCode = currentUser?.code;
        const userInPhoto = persons.some(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code === userCode;
        });

        const otherPersons = persons.filter(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code !== userCode;
        });

        if (otherPersons.length === 0 && userInPhoto) {
            return "A Moment to Remember";
        }

        if (otherPersons.length === 1) {
            const person = otherPersons[0];
            const name = typeof person === 'string' ? person : (person.name || person.code);
            return userInPhoto
                ? `With ${name}`
                : `${name}'s Moment`;
        }

        if (otherPersons.length === 2) {
            const names = otherPersons.map(p =>
                typeof p === 'string' ? p : (p.name || p.code)
            ).join(' & ');
            return userInPhoto
                ? `Memories with ${names}`
                : `${names} Together`;
        }

        return `Group of ${persons.length}`;
    }

    /**
     * Animates transitions between media items
     * Applies CSS animations based on direction and transition style
     * @param {number} direction - Navigation direction
     * @returns {void}
     */
    animateTransition(direction) {
        modalLogger.time("Transition animation");

        // Remove all animation classes
        this.elements.modalImage.classList.remove(
            "zoom-in",
            "fade-in",
            "slide-up",
            "slide-left",
            "slide-right"
        );

        // Force reflow
        void this.elements.modalImage.offsetWidth;

        // Apply selected animation
        let animationClass;
        if (this.state.transitionStyle === "zoom-in") {
            animationClass = "zoom-in";
        } else if (this.state.transitionStyle === "fade-in") {
            animationClass = "fade-in";
        } else if (this.state.transitionStyle === "slide-up") {
            animationClass = "slide-up";
        } else {
            // Default direction-based slide
            animationClass = direction > 0 ? "slide-left" : "slide-right";
        }

        this.elements.modalImage.classList.add(animationClass);
        modalLogger.debug("Transition animation applied", {
            direction,
            animationClass,
            transitionStyle: this.state.transitionStyle,
        });
        modalLogger.timeEnd("Transition animation");
    }

    /**
     * Sets up Hammer.js gestures specifically for zoom and pan
     * Configures pinch and pan gestures for image manipulation
     * @returns {void}
     */
    setupHammerForZoomPan() {
        if (!this.hammer) {
            modalLogger.warn("Hammer.js not available for zoom/pan setup");
            return;
        }
        if(!this.state.enableZoom){
            modalLogger.debug("Zoom functionality is disabled, skipping Hammer.js setup");
            return;
        }

        modalLogger.time("Hammer zoom/pan setup");

        // Pinch to zoom
        this.hammer.get("pinch").set({enable: true});
        this.hammer.on("pinchstart pinchmove", (e) => {
            if (!this.elements.modalImage.classList.contains("d-none")) {
                e.preventDefault();
                modalLogger.debug("Pinch gesture detected", {
                    type: e.type,
                    scale: e.scale,
                });
                this.handlePinch(e);
            }
        });

        this.hammer.on("pinchend", () => {
            modalLogger.debug("Pinch gesture ended");
            this.finalizeZoom();
        });

        modalLogger.debug("Hammer.js zoom/pan gestures configured");
        modalLogger.timeEnd("Hammer zoom/pan setup");
    }

    /**
     * Sets up mouse-based zoom and pan functionality
     * Configures double-click zoom and mouse drag panning
     * @returns {void}
     */
    setupMouseZoomPan() {
        modalLogger.time("Mouse zoom/pan setup");

        // Mouse zoom
        this.elements.modalImage.addEventListener("dblclick", (e) => {
            modalLogger.debug("Double click for zoom", {
                isZoomed: this.state.isZoomed,
            });
            if (this.state.isZoomed) {
                this.resetZoom();
            } else {
                this.zoomImage(e);
            }
        });

        // Mouse pan
        this.elements.modalImage.addEventListener("mousedown", (e) => {
            if (this.state.isZoomed) {
                modalLogger.debug("Mouse down for panning");
                this.startPan(e);
                document.addEventListener("mousemove", this.boundPanImage);
                document.addEventListener("mouseup", this.boundEndPan);
            }
        });

        // Store bound functions for removal
        this.boundPanImage = (e) => this.panImage(e);
        this.boundEndPan = () => this.endPan();

        modalLogger.debug("Mouse zoom/pan events configured");
        modalLogger.timeEnd("Mouse zoom/pan setup");
    }

    /**
     * Sets up touch-based zoom and pan functionality
     * Configures single-finger touch panning (multi-touch handled by Hammer)
     * @returns {void}
     */
    setupTouchZoomPan() {
        modalLogger.time("Touch zoom/pan setup");

        // Touch pan (for single finger, Hammer handles multi-touch)
        this.elements.modalImage.addEventListener(
            "touchstart",
            (e) => {
                if (this.state.isZoomed && e.touches.length === 1) {
                    e.preventDefault();
                    modalLogger.debug("Touch start for panning", {
                        touches: e.touches.length,
                    });
                    this.startPan(e.touches[0]);
                }
            },
            {passive: false}
        );

        modalLogger.debug("Touch zoom/pan events configured");
        modalLogger.timeEnd("Touch zoom/pan setup");
    }

    /**
     * Handles pinch gesture for zooming images
     * @param {Object} e - Hammer.js pinch event
     * @returns {void}
     */
    handlePinch(e) {
        if (e.type === "pinchstart") {
            modalLogger.debug("Pinch gesture started");
            this.state.pinchStart = {
                scale: this.state.currentScale || 1,
                centerX: e.center.x,
                centerY: e.center.y,
            };
            this.elements.modalImage.style.transition = "none";
        }

        const newScale = this.state.pinchStart.scale * e.scale;
        this.state.currentScale = Math.max(1, Math.min(newScale, 5)); // Limit scale 1x to 5x

        modalLogger.debug("Pinch scale updated", {
            newScale,
            constrainedScale: this.state.currentScale,
            originalScale: this.state.pinchStart.scale,
        });

        // Calculate pan offset to zoom toward pinch center
        const rect = this.elements.modalImage.getBoundingClientRect();
        const centerX = e.center.x - rect.left;
        const centerY = e.center.y - rect.top;

        this.state.panOffset.x =
            centerX -
            (centerX - this.state.panOffset.x) *
            (newScale / (this.state.currentScale || 1));
        this.state.panOffset.y =
            centerY -
            (centerY - this.state.panOffset.y) *
            (newScale / (this.state.currentScale || 1));

        this.updateImageTransform();
    }

    /**
     * Finalizes zoom state after pinch gesture ends
     * Resets zoom if scale is below threshold
     * @returns {void}
     */
    finalizeZoom() {
        modalLogger.debug("Finalizing zoom", {
            currentScale: this.state.currentScale,
        });

        if (this.state.currentScale <= 1.1) {
            modalLogger.debug("Scale below threshold, resetting zoom");
            this.resetZoom();
        } else {
            this.state.isZoomed = true;
            modalLogger.debug("Zoom finalized", {scale: this.state.currentScale});
            this.constrainPanning(); // Ensure we're within bounds
        }
        this.elements.modalImage.style.transition = "transform 0.2s ease";
    }

    /**
     * Zooms image on double-click
     * Centers zoom on click position
     * @param {Event} e - Double-click event
     * @returns {void}
     */
    zoomImage(e) {
        modalLogger.time("Image zoom");

        this.state.isZoomed = true;
        this.state.currentScale = 2; // Default zoom level

        const rect = this.elements.modalImage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Center zoom on click position
        this.state.panOffset = {
            x: (rect.width / 2 - clickX) * (this.state.currentScale / 1),
            y: (rect.height / 2 - clickY) * (this.state.currentScale / 1),
        };

        this.elements.modalImage.classList.add("zoomed");
        this.updateImageTransform();
        this.constrainPanning(); // Immediately constrain after zoom

        modalLogger.debug("Image zoom applied", {
            scale: this.state.currentScale,
            clickPosition: {x: clickX, y: clickY},
            panOffset: this.state.panOffset,
        });
        modalLogger.timeEnd("Image zoom");
    }

    /**
     * Resets zoom to original state
     * @returns {void}
     */
    resetZoom() {
        modalLogger.time("Reset zoom");

        this.state.isZoomed = false;
        this.state.currentScale = 1;
        this.elements.modalImage.classList.remove("zoomed");
        this.state.panOffset = {x: 0, y: 0};
        this.elements.modalImage.style.transition = "transform 0.3s ease";
        this.updateImageTransform();

        setTimeout(() => {
            this.elements.modalImage.style.transition = "";
        }, 300);

        modalLogger.debug("Zoom reset to original state");
        modalLogger.timeEnd("Reset zoom");
    }

    /**
     * Starts panning gesture
     * @param {Event} e - Mouse or touch start event
     * @returns {void}
     */
    startPan(e) {
        modalLogger.debug("Starting pan gesture");

        this.state.panStart = {
            x: e.clientX - this.state.panOffset.x,
            y: e.clientY - this.state.panOffset.y,
        };
        this.elements.modalImage.style.cursor = "grabbing";
        this.elements.modalImage.style.transition = "none";
    }

    /**
     * Updates image position during panning
     * @param {Event} e - Mouse or touch move event
     * @returns {void}
     */
    panImage(e) {
        this.elements.modalImage.style.cursor = "grabbing";

        this.state.panOffset = {
            x: e.clientX - this.state.panStart.x,
            y: e.clientY - this.state.panStart.y,
        };

        this.constrainPanning(); // Constrain during pan, not just at end
        this.updateImageTransform();
    }

    /**
     * Ends panning gesture
     * @returns {void}
     */
    endPan() {
        modalLogger.debug("Ending pan gesture");

        this.elements.modalImage.style.cursor = "grab";
        this.elements.modalImage.style.transition = "transform 0.2s ease";
        this.constrainPanning(); // Final constraint

        document.removeEventListener("mousemove", this.boundPanImage);
        document.removeEventListener("mouseup", this.boundEndPan);
    }

    /**
     * Constrains panning to keep image within bounds
     * @returns {void}
     */
    constrainPanning() {
        if (!this.state.isZoomed) return;

        const img = this.elements.modalImage;
        const scale = this.state.currentScale;
        const containerWidth = img.clientWidth;
        const containerHeight = img.clientHeight;

        // Calculate max pan based on current scale
        const maxX = Math.max(0, (containerWidth * scale - containerWidth) / 2);
        const maxY = Math.max(0, (containerHeight * scale - containerHeight) / 2);

        // Constrain panning with easing at edges
        this.state.panOffset.x = this.easeConstraint(
            this.state.panOffset.x,
            -maxX,
            maxX
        );
        this.state.panOffset.y = this.easeConstraint(
            this.state.panOffset.y,
            -maxY,
            maxY
        );

        this.updateImageTransform();

        modalLogger.debug("Panning constrained", {
            scale,
            panOffset: this.state.panOffset,
            maxBounds: {x: maxX, y: maxY},
        });
    }

    /**
     * Eases constraint values when panning beyond edges
     * @private
     * @param {number} value - Current pan value
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @returns {number} Constrained value with easing
     */
    easeConstraint(value, min, max) {
        if (value < min) {
            // Ease when pulling beyond left/top edge
            return min - (1 - Math.exp(-0.1 * (min - value)));
        } else if (value > max) {
            // Ease when pulling beyond right/bottom edge
            return max + (1 - Math.exp(-0.1 * (value - max)));
        }
        return value;
    }

    /**
     * Updates image transform with current scale and pan offset
     * @returns {void}
     */
    updateImageTransform() {
        const scale = this.state.currentScale || 1;
        this.elements.modalImage.style.transform = `scale(${scale}) translate(${this.state.panOffset.x}px, ${this.state.panOffset.y}px)`;

        modalLogger.debug("Image transform updated", {
            scale,
            translateX: this.state.panOffset.x,
            translateY: this.state.panOffset.y,
        });
    }

    /**
     * Handles social media share actions
     * Opens share popups and provides visual feedback
     * @param {HTMLElement} link - The clicked share link element
     * @returns {void}
     */
    handleSocialShare(link) {
        modalLogger.time("Social share handling");

        const type = link.classList.contains("share-facebook")
            ? "facebook"
            : link.classList.contains("share-twitter")
                ? "twitter"
                : link.classList.contains("share-pinterest")
                    ? "pinterest"
                    : "link";

        modalLogger.debug("Social share initiated", {platform: type});

        // Add click animation
        link.classList.add("animate__animated", "animate__tada");
        setTimeout(() => {
            link.classList.remove("animate__animated", "animate__tada");
        }, 1000);

        // For direct links, we already handle in updateSocialLinks
        if (type === "link") {
            modalLogger.debug("Link share handled separately");
            modalLogger.timeEnd("Social share handling");
            return;
        }

        // Open share window
        const popup = window.open(
            link.href,
            "share-popup",
            "width=600,height=600,top=100,left=100"
        );

        if (popup) {
            popup.focus();
            modalLogger.info("Share popup opened successfully", {platform: type});
        } else {
            modalLogger.warn("Share popup blocked by browser", {platform: type});
        }

        modalLogger.timeEnd("Social share handling");
    }

    /**
     * Shows a temporary tooltip message
     * @param {string} message - Tooltip text to display
     * @param {HTMLElement} element - Element to position tooltip near
     * @returns {void}
     */
    showTooltip(message, element) {
        modalLogger.time("Tooltip display");
        modalLogger.debug("Showing tooltip", {message});

        const tooltip = document.createElement("div");
        tooltip.className = "modal-tooltip";
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 40}px`;

        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.classList.add("visible");
        }, 10);

        setTimeout(() => {
            tooltip.classList.remove("visible");
            setTimeout(() => {
                tooltip.remove();
                modalLogger.debug("Tooltip removed");
            }, 300);
        }, 2000);

        modalLogger.timeEnd("Tooltip display");
    }


}

export default UltimateModal
