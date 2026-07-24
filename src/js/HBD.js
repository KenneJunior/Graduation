import {PlatformDetector} from "../PWA/pwa-prompt.js";
import UltimateModal from "./Modal.js";
import Notification from "./notification.js";
import logger from "./utility/logger.js";
import {confirm} from "./utility/Dialog.js";
import {getDeviceType} from "./utility/logger_info.js";
import { getCurrentUserInfo } from "./utility/utils.js";

/**
 * Main Graduation Application Class
 *
 * This class handles the core functionality of the graduation celebration app including:
 * - Audio controls and media playback
 * - Visual effects (confetti, heart animations, floating elements)
 * - Celebration sequences and user interactions
 * - Social sharing functionality
 * - Theme management
 *
 * @class GraduationAppMemories
 */
class GraduationAppMemories {
    /**
     * Creates an instance of GraduationAppMemories
     * Initializes loggers, state management, and configuration
     * @constructor
     */
    constructor() {
        // Create contextual loggers for different modules
        this.logger = logger.withContext({ name: "GraduationAppMemories" });
        this.confettiLogger = this.logger.withContext({ module: "Confetti" });
        this.audioLogger = this.logger.withContext({ module: "Audio" });
        this.heartLogger = this.logger.withContext({ module: "HeartEffects" });
        this.celebrationLogger = this.logger.withContext({ module: "Celebration" });
        this.socialLogger = this.logger.withContext({ module: "SocialSharing" });

        // DOM Elements (to be initialized in init method)
        this.elements = {
            GraduationAudio: null,
            celebrateButton: null,
            showFullMessageBtn: null,
            messagePreview: null,
            messageFull: null,
            seeMoreText: null,
            clickHeartsContainer: null,
            automaticHeartContainer: null,
            growButton: null,
            confettiElements: null,
            imageContainer: null,
            nameElement: null,
            playBtn: null,
            signatureElement: null,
            socialShareLinks: null,
        };

        // Application state management
        this.state = {
            audio: {
                isAllowed: false,
                isPlaying: false,
            },
            heart: {
                lastCreation: 0,
                growing: null,
                growInterval: null,
                maxSize: 100, // Maximum size in pixels
                growthRate: 3, // Growth rate in pixels per interval
            },
            growButton: {
                growInterval: 0,
                currentScale: 1,
                maxScale: 3, // Maximum scale when fully held
                scaleIncrement: 0.02, // How much to grow per interval
                growSpeed: 50, // Milliseconds between growth increments
            },
            confetti: {
                number: 100, // Number of confetti pieces
                colors: [
                    "#ff6b6b",
                    "#ff8e53",
                    "#ffd700",
                    "#4caf50",
                    "#2196f3",
                    "#9c27b0",
                    "#ff4081",
                    "#00bcd4",
                    "#8bc34a",
                    "#ff5722",
                    "#3e0909",
                ],
                interval: 5000,
                numberOfFloatingElement: 16,
            },
            animating: false,
            cooldown: 10000, // Cooldown period between effects in milliseconds
        };

        // Constants
        this.EMOJIS = [
            "❤️",
            "🎓",
            "💗",
            "🧑‍🎓",
            "👨‍🎓",
            "🌸",
            "🎊",
            "🎆",
            "💘",
            "💕",
            "🥳",
        ];
        this.LETTER_ANIMATIONS = [
            "fadeInUp",
            "swing",
            "bounce",
            "flip",
            "zoomIn",
            "rotate",
            "floatIn",
            "pulse",
            "rubberBand",
            "tada",
            "jello",
        ];

        // Module instances
        this.themeManager = null;
        this.ultimateModal = null;
        this.notification = null;

        // Bound event handlers for proper cleanup
        this.boundHandlers = {};

        this.logger.debug("GraduationAppMemories instance created");
    }

    /**
     * Initializes the Graduation Application
     * Sets up all components, event listeners, and starts the celebration sequence
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        this.logger.time("GraduationAppMemories initialization");

        try {
            // Cache DOM elements
            this.cacheDOMElements();

            // Initialize sub-modules
            this.initializeSubModules();

            // Detect platform and adjust settings
            this.detectPlatform();



            // Setup event listeners
            this.setupEventListeners();

            // Load images and start animations
            this.loadImages();

            // Start initial celebrations
            this.triggerCelebration(1000); // Initial celebration after 1 second

            this.animateName();
            this.triggerConfetti();
            this.createFloatingElements();

            // Initialize message read more button
            this.initReadMoreButton();

            // Setup periodic refresh of effects
            this.setupPeriodicEffects();


            // Personalize message content for specific users
            this.changePageContent();

            this.logger.info("GraduationAppMemories initialized successfully");
        } catch (error) {
            this.logger.error("Failed to initialize GraduationAppMemories", error);
            throw error;
        } finally {
            this.logger.timeEnd("GraduationAppMemories initialization");
        }
    }

    /**
     * Caches DOM elements for performance
     * @private
     * @returns {void}
     */
    cacheDOMElements() {
        this.logger.time("Cache DOM elements");

        this.elements = {
            GraduationAudio: document.getElementById("GraduationAudio"),
            celebrateButton: document.querySelector(".btn-celebrate"),
            showFullMessageBtn: document.getElementById('showFullMessage'),
            messagePreview: document.getElementById('messagePreview'),
            messageFull: document.getElementById('messageFull'),
            seeMoreText: document.querySelector('.see-more-text'),
            clickHeartsContainer: document.getElementById("clickHearts"),
            automaticHeartContainer: document.getElementById("autoHearts"),
            growButton: document.querySelector(".grow-button"),
            confettiElements: document.querySelectorAll(".confetti"),
            imageContainer: document.querySelector(".image-container"),
            nameElement: document.querySelector("#Graduation-name"),
            playBtn: document.getElementById("playBtn"),
            signatureElement: document.querySelector(".signature"),
            socialShareLinks: document.querySelectorAll(
                ".social-share a, .social-share button"
            ),
        };

        this.logger.debug("DOM elements cached", {
            elementsFound: Object.keys(this.elements).filter((key) => !!this.elements[key]).length,
            totalElements: Object.keys(this.elements).length,
        });

        this.logger.timeEnd("Cache DOM elements");
    }

    /**
     * Initializes sub-modules of the application
     * @private
     * @returns {void}
     */
    initializeSubModules() {
        this.logger.time("Initialize sub-modules");
        this.logger.debug("ThemeManager initialized");

        // Initialize notification system
        this.notification = new Notification();
        this.notification.toggleViewDetails(true).initialize();
        this.logger.debug("Notification system initialized");

        // Initialize UltimateModal
        this.ultimateModal = new UltimateModal();
        this.ultimateModal.init();
        this.logger.debug("UltimateModal instance created");

        this.logger.timeEnd("Initialize sub-modules");
    }

    /**
     * Detects the current platform and adjusts settings accordingly
     * Optimizes performance and effects for mobile vs desktop platforms
     * @private
     * @returns {void}
     */
    detectPlatform() {
        this.logger.time("Platform detection");
        const platform = PlatformDetector.detect();
        this.logger.debug("Platform detected", { platform });

        if (platform === "iOS" || platform === "Android") {
            // Mobile optimizations
            this.state.confetti.numberOfFloatingElement = 8;
            this.state.confetti.number = 50;
            this.state.confetti.interval = 8000;
            this.state.heart.growthRate = 2;
            this.state.heart.maxSize = 80;
            this.state.growButton.maxScale = 2.5;
            this.state.cooldown = 15000;

            this.logger.info("Mobile platform detected, adjusting settings", {
                floatingElements: this.state.confetti.numberOfFloatingElement,
                confettiCount: this.state.confetti.number,
                heartGrowthRate: this.state.heart.growthRate,
                cooldown: this.state.cooldown,
            });
        } else {
            this.logger.debug("Desktop platform detected, using default settings");
        }

        this.logger.timeEnd("Platform detection");
    }

    changePageContent(){
        const User = getCurrentUserInfo();
        if (User.code !== "L") {
            return
        }
        this.changeCelebrationButton();
        this.changeProfilepic();
        this.changeSignatureanimated();
        this.ChangeTitile();
        this.ChangeMessage();
    }
    ChangeMessage() {
        const messagePreview = document.getElementById('messagePreview');
        const messageFull = document.getElementById('messageFull');
        messagePreview.textContent = "Hey Lulu, on this special day, I want to express how much you mean to me. Your kindness, intelligence, and beauty have always inspired me.....";
        messageFull.innerHTML = "Dear Lulu, on this special day, I want to express how much you mean to me. Your kindness, intelligence, and beauty have always inspired me. click  to <a href='/LuxMea.html' target='_blank' rel='noopener noreferrer' style='text-decoration: underline; color: #d63384; font-weight: 700;'>discover the suprise </a> I specially made for you just to you to tell you how I feel";
    }
    changeProfilepic(){
          const profile_pic = document.getElementById('profile_pic');
        profile_pic.src = "/public/pics/[L]__1777618272874 (1).png";
    }
    changeCelebrationButton(){
        const celebrationButton = document.querySelector(".btn-celebrate");
        celebrationButton.textContent = "Celebrate with me, Lulu!";
    }
    changeSignatureanimated(){
        const signatureElement = document.querySelector(".signature");
        signatureElement.innerHTML = "With all my love,<br> Junior  ❤️🥰";
    }
    ChangeTitile(){
        const titleWord = document.querySelector("#Graduation-name");
        titleWord.textContent = "Lux Mea";
    }

    /**
     * Sets up all event listeners for user interactions
     * @private
     * @returns {void}
     */
    setupEventListeners() {
        this.logger.time("Setup event listeners");

        // Audio control - one-time enable
        document.body.addEventListener("click", this.enableAudio.bind(this), { once: true });
        this.logger.debug("One-time audio enable listener added");

        // Celebration button events
        this.setupCelebrationButtonEvents();

        // Name animation on hover
        this.setupNameAnimationEvents();

        // Click effects (hearts)
        this.setupClickEffectEvents();

        // Grow button events
        this.setupGrowButtonEvents();

        // Social share button events
        this.setupSocialShareEvents();

        // Window resize handling
        this.setupWindowResizeHandler();

        // Print event handlers
        this.setupPrintEventHandlers();

        this.logger.info("All event listeners configured successfully");
        this.logger.timeEnd("Setup event listeners");
    }

    /**
     * Sets up event listeners for the celebration button
     * @private
     * @returns {void}
     */
    setupCelebrationButtonEvents() {
        // Click event
        this.elements.celebrateButton.addEventListener("click", () => {
            this.celebrationLogger.debug("Celebrate button clicked");
            this.triggerCelebration(0);
        });

        // Keyboard navigation
        this.elements.celebrateButton.addEventListener("keydown", this.handleCelebrateKeyDown.bind(this));

        // Mobile touch feedback
        this.elements.celebrateButton.addEventListener("touchstart", () => {
            this.elements.celebrateButton.style.transform = "scale(0.95)";
            this.logger.debug("Celebrate button touch start - scaling down");
        }, {
            passive: true,
        });

        this.elements.celebrateButton.addEventListener("touchend", () => {
            this.elements.celebrateButton.style.transform = "";
            this.logger.debug("Celebrate button touch end - reset scale");
        }, {
            passive: true,
        });

        this.logger.debug("Celebration button event listeners added");
    }

    /**
     * Sets up event listeners for name animation
     * @private
     * @returns {void}
     */
    setupNameAnimationEvents() {
        this.elements.nameElement.addEventListener("mouseenter", () => {
            if (!this.state.animating) {
                this.logger.debug("Name element mouse enter - triggering animation");
                this.animateName();
            } else {
                this.logger.debug("Name element mouse enter - animation already in progress");
            }
        });

        this.logger.debug("Name animation event listeners added");
    }

    /**
     * Sets up event listeners for click effects (heart growth)
     * @private
     * @returns {void}
     */
    setupClickEffectEvents() {
        // Mouse click effects
        document.addEventListener("mousedown", (e) => {
            if (!e.target.closest(" .modal-container, img,  a,  button")) {
                this.heartLogger.debug("Mouse down on empty space - starting heart growth");
                this.startGrowingHeart(e);
            }
        });

        // Touch effects
        document.addEventListener("touchstart", (e) => {
            if (!e.target.closest(" .modal-container, img,  a,  button")) {
                this.heartLogger.debug("Touch start on empty space - starting heart growth");
                this.startGrowingHeart(e.touches[0]);
            }
        }, { passive: false });

        // Release events
        document.addEventListener("mouseup", this.releaseGrowingHeart.bind(this));
        document.addEventListener("touchend", this.releaseGrowingHeart.bind(this), {
            passive: true,
        });
        document.addEventListener("mouseleave", this.releaseGrowingHeart.bind(this));

        this.logger.debug("Heart growth control listeners added");
    }

    /**
     * Sets up event listeners for the grow button
     * @private
     * @returns {void}
     */
    setupGrowButtonEvents() {
        this.logger.time("Grow button event setup");

        // Mouse events
        this.elements.growButton.addEventListener("mousedown", this.startGrowing.bind(this));
        this.elements.growButton.addEventListener("touchstart", this.startGrowing.bind(this), { passive: true });

        // Release events
        this.elements.growButton.addEventListener("mouseup", this.releaseButton.bind(this));
        this.elements.growButton.addEventListener("touchend", this.releaseButton.bind(this), {
            passive: true,
        });

        // Reset transforms on mouse leave
        document.addEventListener("mouseleave", () => {
            this.logger.debug("Mouse left document, resetting transforms");
            this.elements.imageContainer.style.transform = "scale(1) rotate(0deg)";
            this.elements.signatureElement.style.transform = "translate(0, 0)";
        });

        // Parallax effect on mouse move
        let lastMove = 0;
        document.addEventListener("mousemove", (e) => {
            const now = Date.now();
            if (now - lastMove > 50) { // Throttle to 20fps
                lastMove = now;
                const { clientX, clientY } = e;
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const moveX = (clientX - centerX) / 60;
                const moveY = (clientY - centerY) / 60;

                this.elements.imageContainer.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.08) rotate(2deg)`;
                this.elements.signatureElement.style.transform = `translate(${moveX / 2}px, ${moveY / 2}px)`;
            }
        });

        this.logger.debug("Grow button event listeners configured");
        this.logger.timeEnd("Grow button event setup");
    }

    /**
     * Sets up event listeners for social share buttons
     * @private
     * @returns {void}
     */
    setupSocialShareEvents() {
        this.elements.socialShareLinks.forEach((link, index) => {
            link.addEventListener("click", this.handleSocialShareClick.bind(this));
            this.socialLogger.debug("Social share listener added", {
                index,
                platform: link.className,
            });
        });

        this.logger.debug("Social share event listeners added");
    }

    /**
     * Sets up window resize handler with debouncing
     * @private
     * @returns {void}
     */
    setupWindowResizeHandler() {
        window.addEventListener(
            "resize",
            this.debounce(() => {
                this.logger.debug("Window resize detected - handling responsive adjustments");
                // Handle any responsive adjustments if needed
            }, 200)
        );

        this.logger.debug("Window resize handler added");
    }

    /**
     * Sets up print event handlers for message display
     * @private
     * @returns {void}
     */
    setupPrintEventHandlers() {
        window.addEventListener('beforeprint', () => {
            if (this.elements.messageFull.classList.contains('d-none')) {
                this.elements.messagePreview.classList.add('d-none');
                this.elements.messageFull.classList.remove('d-none', 'show');
            }
        });

        window.addEventListener('afterprint', () => {
            if (!this.elements.messageFull.classList.contains('d-none')) {
                this.elements.messageFull.classList.add('d-none');
                this.elements.messagePreview.classList.remove('d-none');
                this.elements.showFullMessageBtn.classList.remove('expanded');
                this.elements.seeMoreText.textContent = 'Read Full Message';
            }
        });

        this.logger.debug("Print event handlers added");
    }

    /**
     * Initializes the "Read More" button functionality for the message
     * @private
     * @returns {void}
     */
    initReadMoreButton() {
        if (!this.elements.showFullMessageBtn) {
            this.logger.warn("Show Full Message button not found");
            return;
        }

        this.elements.showFullMessageBtn.addEventListener('click', () => {
            if (this.elements.messageFull.classList.contains('d-none')) {
                // Show full message
                this.elements.messagePreview.classList.add('d-none');
                this.elements.messageFull.classList.remove('d-none');
                setTimeout(() => {
                    this.elements.messageFull.classList.add('show');
                }, 10);
                this.elements.showFullMessageBtn.classList.add('expanded');
                this.elements.seeMoreText.textContent = 'Show Less';

                this.logger.debug('Full message revealed');
            } else {
                // Hide full message
                this.elements.messageFull.classList.remove('show');
                setTimeout(() => {
                    this.elements.messageFull.classList.add('d-none');
                    this.elements.messagePreview.classList.remove('d-none');
                    this.elements.showFullMessageBtn.classList.remove('expanded');
                    this.elements.seeMoreText.textContent = 'Read Full Message';
                }, 500);

                // Scroll to message preview
                this.elements.messagePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                this.logger.debug('Message collapsed to preview');
            }
        });

        this.logger.debug("Read More button initialized");
    }

    /**
     * Sets up periodic refresh of visual effects
     * @private
     * @returns {void}
     */
    setupPeriodicEffects() {
        const device = getDeviceType()
        if (device === 'mobile') {
            return;
        }
        // Periodic confetti and floating elements refresh
        setInterval(() => {
            this.logger.debug("Periodic celebration refresh triggered");
            this.triggerConfetti();
            this.createFloatingElements();
        }, this.state.cooldown);

        this.logger.debug("Periodic effects scheduler set up");
    }

    /**
     * Creates floating decorative elements (hearts, stars, flowers)
     * @private
     * @returns {void}
     */
    createFloatingElements() {
        this.logger.time("Create floating elements");

        const symbols = [
            { class: "hearts", emoji: "🎓" },
            { class: "hearts", emoji: "⭐" },
            { class: "hearts", emoji: "💗" },
            { class: "hearts", emoji: "👨‍🎓" },
            { class: "hearts", emoji: "🏫" },
            { class: "hearts", emoji: "💕" },
            { class: "hearts", emoji: "🥳" },
            { class: "flowers", emoji: "🌷" },
            { class: "flowers", emoji: "🎓" },
            { class: "flowers", emoji: "🌺" },
            { class: "flowers", emoji: "🌻" },
            { class: "stars", emoji: "✨" },
            { class: "stars", emoji: "🌟" },
            { class: "stars", emoji: "🎇" },
            { class: "flowers", emoji: "🎉" },
        ];

        let numElements = this.state.confetti.numberOfFloatingElement;
        const device = getDeviceType()
        if (device === 'mobile') {
            numElements = 3
        }

        this.logger.debug("Creating floating elements", {
            count: numElements,
            symbolTypes: symbols.length,
        });

        for (let i = 0; i < numElements; i++) {
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            const element = document.createElement("div");
            element.className = `floating ${randomSymbol.class}`;
            element.innerHTML = randomSymbol.emoji;
            element.setAttribute("aria-hidden", "true");

            // Random position within safe bounds (5% to 95% to avoid edges)
            const top = Math.floor(Math.random() * 90) + 5;
            const left = Math.floor(Math.random() * 90) + 5;
            element.style.top = `${top}%`;
            element.style.left = `${left}%`;

            // Random animation delay for staggered effect
            element.style.animationDelay = `${Math.random() * 3}s`;

            // Limit the number of floating elements to prevent memory leaks
            const maxFloatingElements = 40;
            const currentFloating = document.querySelectorAll(".floating");

            if (currentFloating.length >= maxFloatingElements) {
                // Remove oldest floating elements
                for (
                    let j = 0;
                    j < currentFloating.length - maxFloatingElements + 1;
                    j++
                ) {
                    currentFloating[j].remove();
                }
            }

            setTimeout(() => {
                element.remove();
            }, 15000);

            this.elements.automaticHeartContainer.appendChild(element);
        }

        this.logger.timeEnd("Create floating elements");
    }
    /**
     * Loads all images with fade-in effect and error handling
     * @private
     * @returns {void}
     */
    loadImages() {
        this.logger.time("Image loading");

        const images = document.querySelectorAll('img[loading="lazy"]');
        this.logger.debug("Found lazy images to load", { count: images.length });

        images.forEach((img, index) => {
            img.addEventListener("load", () => {
                img.style.opacity = "1";
                img.style.transition = "opacity 0.5s ease";
                this.logger.debug("Image loaded successfully", { index, src: img.src });
            });

            img.style.opacity = "0";
            this.logger.debug("Image opacity set to 0 for fade-in", { index });

            img.addEventListener("error", () => {
                this.logger.warn("Image failed to load, using fallback", {
                    src: img.src,
                });
                img.src = "https://via.placeholder.com/200?text=Photo+Not+Found";
                img.alt = "Image not available";
                img.style.opacity = "1";
            });
        });

        this.logger.info("Image loading system initialized");
        this.logger.timeEnd("Image loading");
    }

    /* ========== AUDIO CONTROL METHODS ========== */

    /**
     * Enables audio playback after user interaction (required for autoplay policies)
     * @private
     * @returns {void}
     */
    enableAudio() {
        this.audioLogger.time("Enable audio");
        this.state.audio.isAllowed = true;
        this.audioLogger.info("Audio interaction allowed by user");

        if (this.state.audio.isPlaying) {
            this.audioLogger.debug("Audio was playing, resuming playback");
            this.playAudio().catch((error) => {
                this.audioLogger.error("Failed to resume audio after enable", error);
            });
        }
        this.audioLogger.timeEnd("Enable audio");
    }

    /**
     * Toggles audio playback between play and pause states
     * @async
     * @returns {Promise<void>}
     */
    async toggleAudio() {
        this.audioLogger.time("Toggle audio");

        if (this.state.audio.isPlaying) {
            this.audioLogger.debug("Pausing audio");
            this.pauseAudio();
        } else {
            this.audioLogger.debug("Playing audio");
            await this.playAudio();
        }
        this.audioLogger.timeEnd("Toggle audio");
    }

    /**
     * Starts audio playback with error handling
     * @async
     * @returns {Promise<void>}
     */
    async playAudio() {
        this.audioLogger.time("Play audio");

        if (!this.state.audio.isAllowed) {
            this.audioLogger.warn("Audio not allowed by user, skipping playback");
            this.audioLogger.timeEnd("Play audio");
            return;
        }

        try {
            this.audioLogger.debug("Attempting to play Graduation audio");
            await this.elements.GraduationAudio.play();
            this.elements.playBtn.innerHTML =
                '<i class="fas fa-pause" aria-hidden="true"></i>';
            this.state.audio.isPlaying = true;
            this.audioLogger.info("Audio playback started successfully");
        } catch (error) {
            this.audioLogger.error("Audio playback failed", error);
        }
        this.audioLogger.timeEnd("Play audio");
    }

    /**
     * Pauses audio playback
     * @private
     * @returns {void}
     */
    pauseAudio() {
        this.audioLogger.time("Pause audio");

        this.elements.GraduationAudio.pause();
        this.elements.playBtn.innerHTML =
            '<i class="fas fa-play" aria-hidden="true"></i>';
        this.state.audio.isPlaying = false;
        this.audioLogger.info("Audio playback paused");
        this.audioLogger.timeEnd("Pause audio");
    }

    /* ========== CELEBRATION AND ANIMATION METHODS ========== */

    /**
     * Triggers a celebration sequence with confetti, animations, and audio
     * @param {number} delay - Delay in milliseconds before starting celebration
     * @returns {void}
     */
    triggerCelebration(delay = 0) {
        const device = getDeviceType()
        if (device === 'mobile') {
            return;
        }
        this.celebrationLogger.time("Trigger celebration");
        this.celebrationLogger.debug("Scheduling celebration effects", { delay });

        setTimeout(() => {
            this.celebrationLogger.info("Executing celebration sequence");
            this.createHeartBurst(100);
            this.animateImageBounce();
            this.triggerConfetti();
            this.animateName();

            if (!this.state.audio.isPlaying) {
                this.celebrationLogger.debug("Starting audio for celebration");
                this.elements.GraduationAudio.currentTime = 0;
                this.playAudio();
            } else {
                this.celebrationLogger.debug("Audio already playing, continuing");
            }

            this.celebrationLogger.timeEnd("Trigger celebration");
        }, delay);
    }

    /**
     * Animates the image container with a bounce effect
     * @private
     * @returns {void}
     */
    animateImageBounce() {
        this.celebrationLogger.time("Animate image bounce");

        this.elements.imageContainer.classList.add("animate__animated", "animate__tada");
        this.celebrationLogger.debug("Bounce animation added to image container");

        setTimeout(() => {
            this.elements.imageContainer.classList.remove(
                "animate__animated",
                "animate__bounce"
            );
            this.celebrationLogger.debug("Bounce animation removed from image container");
        }, 2000);

        this.celebrationLogger.timeEnd("Animate image bounce");
    }

    /**
     * Animates the graduation name with random letter animations
     * @private
     * @returns {void}
     */
    animateName() {
        const device = getDeviceType()
        if (device === 'mobile') {
            return;
        }
        this.logger.time("Animate name");

        const nameElement = this.elements.nameElement;
        if (!nameElement) {
            this.logger.warn("Name element not found for animation");
            this.logger.timeEnd("Animate name");
            return;
        }

        const name = nameElement.textContent.trim();
        nameElement.innerHTML = "";
        const randomAnimations = this.getUniqueRandomAnimations(name.length);

        this.logger.debug("Animating name letters", {
            nameLength: name.length,
            animationCount: randomAnimations.length,
        });

        name.split("").forEach((letter, index) => {
            this.state.animating = true;
            const span = document.createElement("span");
            if (letter !== " ") {
                span.className = "name-letter";
                span.textContent = letter;
                const anim = randomAnimations[index % randomAnimations.length];
                span.style.animation = `${anim} 2s ${index * 0.1 + 0.1}s forwards`;
                span.style.opacity = "1";
            }
            span.textContent = letter;
            span.addEventListener("animationend", () => {
                if (index === randomAnimations.length - 1) {
                    this.state.animating = false;
                }
            });
            nameElement.appendChild(span);
        });

        this.logger.timeEnd("Animate name");
    }

    /**
     * Gets unique random animations for name letters
     * @private
     * @param {number} count - Number of animations needed
     * @returns {string[]} Array of animation names
     */
    getUniqueRandomAnimations(count) {
        const shuffled = [...this.LETTER_ANIMATIONS];
        // Fisher-Yates shuffle algorithm
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    /**
     * Creates a burst of hearts at random positions
     * @private
     * @param {number} count - Number of hearts to create
     * @returns {void}
     */
    createHeartBurst(count) {
        this.heartLogger.time("Create heart burst");
        this.heartLogger.debug("Creating heart burst", { heartCount: count });

        for (let i = 0; i < count; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            this.createHeart(x, y);
        }

        this.heartLogger.info("Heart burst created successfully");
        this.heartLogger.timeEnd("Create heart burst");
    }

    /**
     * Creates a single heart element
     * @private
     * @param {number} x - X coordinate for heart position
     * @param {number} y - Y coordinate for heart position
     * @param {number} initialiseSize - Initial size of the heart in pixels
     * @param {boolean} isGrowing - Whether the heart should grow over time
     * @returns {HTMLElement} The created heart element
     */
    createHeart(x, y, initialiseSize = 20, isGrowing = false) {
        this.heartLogger.time("Create heart");

        const heart = document.createElement("div");
        heart.className = "hearts";
        const emoji = this.EMOJIS[Math.floor(Math.random() * this.EMOJIS.length)];
        heart.innerHTML = emoji;

        this.heartLogger.debug("Heart element created", {
            x,
            y,
            initialSize: initialiseSize,
            isGrowing,
            emoji,
        });

        // Position and style
        Object.assign(heart.style, {
            left: `${x}px`,
            top: `${y}px`,
            position: "fixed",
            fontSize: `${initialiseSize}px`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out forwards`,
            pointerEvents: "none",
            transform: `rotate(${Math.random() * 360}deg)`,
            filter: `hue-rotate(${Math.random() * 360}deg)`,
        });

        this.elements.clickHeartsContainer.appendChild(heart);

        if (!isGrowing) {
            // For regular hearts, use animationend event for removal
            heart.addEventListener("animationend", () => {
                if (heart.parentNode) {
                    heart.parentNode.removeChild(heart);
                }
            });
        } else {
            // For growing hearts, add expiration timeout as fallback
            setTimeout(() => {
                if (heart.parentNode && heart.dataset.growing === "false") {
                    heart.parentNode.removeChild(heart);
                    this.heartLogger.debug("Growing heart removed by safety timeout");
                }
            }, 8000); // Long timeout as safety net
        }

        this.heartLogger.timeEnd("Create heart");
        return heart;
    }

    /**
     * Starts growing a heart at the specified position
     * @private
     * @param {MouseEvent|Touch} e - Mouse or touch event
     * @returns {void}
     */
    startGrowingHeart(e) {
        this.heartLogger.time("Start growing heart");

        // Clear any existing growing heart
        if (this.state.heart.growing) {
            this.heartLogger.debug("Clearing existing growing heart");
            this.state.heart.growing.remove();
            clearInterval(this.state.heart.growInterval);
        }

        // Create initial heart
        this.state.heart.growing = this.createHeart(e.clientX, e.clientY, 30, true);
        this.state.heart.growing.style.animation = "none"; // Disable float animation while growing
        this.state.heart.growing.dataset.growing = "true";

        this.heartLogger.debug("Initial growing heart created", {
            clientX: e.clientX,
            clientY: e.clientY,
        });

        // Start growing interval
        this.state.heart.growInterval = setInterval(() => {
            const currentSize = parseInt(this.state.heart.growing.style.fontSize) || 30;
            const newSize = currentSize + this.state.heart.growthRate;

            if (newSize <= this.state.heart.maxSize) {
                this.state.heart.growing.style.fontSize = `${newSize}px`;
                this.heartLogger.debug("Heart growing", { currentSize: newSize });
            } else {
                // Release if reached max size
                this.heartLogger.debug("Heart reached max size, releasing");
                this.releaseGrowingHeart();
            }
        }, 50);

        this.heartLogger.info("Heart growth started");
        this.heartLogger.timeEnd("Start growing heart");
    }

    /**
     * Releases the currently growing heart
     * @private
     * @returns {void}
     */
    releaseGrowingHeart() {
        this.heartLogger.time("Release growing heart");

        clearInterval(this.state.heart.growInterval);
        this.heartLogger.debug("Growth interval cleared");

        if (this.state.heart.growing) {
            // Re-enable float animation
            this.state.heart.growing.dataset.growing = "false";
            this.state.heart.growing.style.animation = `float ${
                3 + Math.random() * 4
            }s ease-in-out forwards`;

            this.heartLogger.debug("Growing heart released for float animation");
            this.state.heart.growing = null;
        } else {
            this.heartLogger.debug("No growing heart to release");
        }

        this.heartLogger.timeEnd("Release growing heart");
    }

    /* ========== GROW BUTTON METHODS ========== */

    /**
     * Starts growing animation for the grow button
     * @private
     * @param {Event} e - Mouse or touch event
     * @returns {void}
     */
    startGrowing(e) {
        this.logger.time("Start growing animation");
        e.preventDefault();
        this.state.growButton.currentScale = 1;
        this.elements.growButton.classList.add("holding");
        clearInterval(this.state.growButton.growInterval);

        this.logger.debug("Starting grow interval", {
            currentScale: this.state.growButton.currentScale,
            maxScale: this.state.growButton.maxScale,
        });

        this.state.growButton.growInterval = setInterval(() => {
            if (this.state.growButton.currentScale < this.state.growButton.maxScale) {
                this.state.growButton.currentScale += this.state.growButton.scaleIncrement;
                this.elements.growButton.style.transform = `scale(${this.state.growButton.currentScale})`;
                this.logger.debug("Grow button scaling", {
                    currentScale: this.state.growButton.currentScale,
                });
            }
        }, this.state.growButton.growSpeed);

        this.logger.timeEnd("Start growing animation");
    }

    /**
     * Releases the grow button and handles audio toggle
     * @private
     * @param {Event} e - Mouse or touch event
     * @returns {void}
     */
    releaseButton(e) {
        this.logger.time("Release button");

        this.elements.growButton.classList.remove("holding");
        clearInterval(this.state.growButton.growInterval);

        const wasHeld = this.state.growButton.currentScale > 1.1;
        this.elements.growButton.style.transform = "scale(1)";

        this.logger.debug("Button released", {
            wasHeld,
            finalScale: this.state.growButton.currentScale,
        });

        this.state.growButton.currentScale = 1;
        e.preventDefault();

        if (!wasHeld) {
            this.logger.debug("Short press detected, toggling audio");
            this.toggleAudio();
        } else {
            this.logger.debug("Long press detected, toggling audio");
            this.toggleAudio();
        }

        this.logger.timeEnd("Release button");
    }

    /* ========== CONFETTI AND VISUAL EFFECTS ========== */

    /**
     * Triggers confetti animation with burst effect
     * @private
     * @returns {void}
     */
    triggerConfetti() {
        const device = getDeviceType()
        if (device === 'mobile') {
            return;
        }
        this.confettiLogger.time("Trigger confetti");

        this.confettiLogger.debug("Animating confetti elements", {
            elementCount: this.elements.confettiElements.length,
        });

        this.elements.confettiElements.forEach((confetti, index) => {
            confetti.style.animation = "none";
            void confetti.offsetWidth; // Trigger reflow
            confetti.style.animation = `confettiFall ${
                3 + index * 0.5
            }s infinite ease-in-out`;
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.transform = `translateY(-120vh) rotate(0deg) scale(1)`;
        });

        // Create additional confetti for burst effect
        this.confettiLogger.debug("Creating extra confetti", {
            count: this.state.confetti.number,
        });

        for (let i = 0; i < this.state.confetti.number; i++) {
            const extraConfetti = document.createElement("div");
            extraConfetti.className = "confetti extra-confetti";
            extraConfetti.style.top = `${Math.random() * 100}%`;
            extraConfetti.style.left = `${Math.random() * 100}%`;
            extraConfetti.style.background = this.getRandomColor();
            extraConfetti.style.width = `${8 + Math.random() * 8}px`;
            extraConfetti.style.height = extraConfetti.style.width;
            extraConfetti.style.animation = `confettiFall ${
                2 + Math.random() * 3
            }s linear`;
            document.querySelector(".container").appendChild(extraConfetti);

            // Remove extra confetti after animation
            setTimeout(() => {
                extraConfetti.remove();
            }, this.state.confetti.interval);
        }

        this.confettiLogger.debug("Confetti animation triggered");
        this.confettiLogger.timeEnd("Trigger confetti");
    }

    /**
     * Gets a random color from the confetti color palette
     * @private
     * @returns {string} Random hex color code
     */
    getRandomColor() {
        const { colors } = this.state.confetti;
        return colors[Math.floor(Math.random() * colors.length)];
    }

    /* ========== SOCIAL SHARING METHODS ========== */

    /**
     * Handles social share button clicks with animation
     * @private
     * @param {Event} e - Click event
     * @returns {void}
     */
    handleSocialShareClick(e) {
        this.socialLogger.time("Social share click");

        const target = e.currentTarget;
        this.socialLogger.debug("Social share clicked", {
            className: target.className,
            platform: Array.from(target.classList).find((cls) => cls.includes("fa-")),
        });

        // Add click animation
        target.classList.add("animate__animated", "animate__tada");
        this.socialLogger.debug("Share button animation started");

        setTimeout(() => {
            target.classList.remove("animate__animated", "animate__tada");
            this.socialLogger.debug("Share button animation ended");
        }, 5000);

        // Update share URLs if needed
        if (target.classList.contains("fa-whatsapp")) {
            const currentUrl = encodeURIComponent(window.location.href);
            const message = encodeURIComponent(
                "Check out this beautiful Graduation wish I received!"
            );
            target.href = `https://api.whatsapp.com/send?text=${message}%20${currentUrl}`;
            this.socialLogger.debug("WhatsApp share URL updated", { currentUrl });
        }

        this.socialLogger.timeEnd("Social share click");
    }

    /* ========== UTILITY AND HELPER METHODS ========== */

    /**
     * Handles keyboard events for the celebration button
     * @private
     * @param {KeyboardEvent} e - Keyboard event
     * @returns {void}
     */
    async handleCelebrateKeyDown(e) {
        if (!e) {
            this.logger.warn("Celebrate keydown event missing");
            return;
        }

        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.celebrationLogger.debug("Celebrate triggered via keyboard", {
                key: e.key,
            });
            await this.triggerCelebration();
        } else {
            this.celebrationLogger.debug("Unhandled key pressed on celebrate button", {
                key: e.key,
            });
        }
    }

    /**
     * Debounces function execution to prevent excessive calls
     * @private
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function () {
            const context = this,
                args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.logger.debug("Debounced function executed", { wait });
                func.apply(context, args);
            }, wait);
        };
    }

    /* ========== CLEANUP AND DESTRUCTION ========== */

    /**
     * Cleans up all event listeners and intervals to prevent memory leaks
     * Should be called before removing the application from the DOM
     * @returns {void}
     */
    destroy() {
        this.logger.time("GraduationAppMemories destruction");

        // Clear all intervals
        clearInterval(this.state.heart.growInterval);
        clearInterval(this.state.growButton.growInterval);

        // Clear any periodic effect intervals
        const intervalId = window.setInterval(() => {}, 999999);
        for (let i = 0; i < intervalId; i++) {
            window.clearInterval(i);
        }

        // Remove all event listeners
        document.body.removeEventListener("click", this.enableAudio);

        // Remove celebration button listeners
        if (this.elements.celebrateButton) {
            this.elements.celebrateButton.removeEventListener("click", () => {});
            this.elements.celebrateButton.removeEventListener("keydown", this.handleCelebrateKeyDown);
            this.elements.celebrateButton.removeEventListener("touchstart", () => {});
            this.elements.celebrateButton.removeEventListener("touchend", () => {});
        }

        // Remove name animation listeners
        if (this.elements.nameElement) {
            this.elements.nameElement.removeEventListener("mouseenter", () => {});
        }

        // Remove click effect listeners
        document.removeEventListener("mousedown", () => {});
        document.removeEventListener("touchstart", () => {});
        document.removeEventListener("mouseup", this.releaseGrowingHeart);
        document.removeEventListener("touchend", this.releaseGrowingHeart);
        document.removeEventListener("mouseleave", this.releaseGrowingHeart);

        // Remove grow button listeners
        if (this.elements.growButton) {
            this.elements.growButton.removeEventListener("mousedown", this.startGrowing);
            this.elements.growButton.removeEventListener("touchstart", this.startGrowing);
            this.elements.growButton.removeEventListener("mouseup", this.releaseButton);
            this.elements.growButton.removeEventListener("touchend", this.releaseButton);
        }

        // Remove social share listeners
        this.elements.socialShareLinks.forEach((link) => {
            link.removeEventListener("click", this.handleSocialShareClick);
        });

        // Remove window event listeners
        window.removeEventListener("resize", () => {});
        window.removeEventListener("beforeprint", () => {});
        window.removeEventListener("afterprint", () => {});

        // Remove read more button listener
        if (this.elements.showFullMessageBtn) {
            this.elements.showFullMessageBtn.removeEventListener("click", () => {});
        }

        // Remove mouse move listener
        document.removeEventListener("mousemove", () => {});
        document.removeEventListener("mouseleave", () => {});

        // Stop audio
        this.pauseAudio();

        // Clear DOM containers
        if (this.elements.clickHeartsContainer) {
            this.elements.clickHeartsContainer.innerHTML = "";
        }

        if (this.elements.automaticHeartContainer) {
            this.elements.automaticHeartContainer.innerHTML = "";
        }

        // Destroy sub-modules
        if (this.ultimateModal) {
             this.ultimateModal?.destroy();
        }

        if (this.notification) {
             this.notification?.destroy();
        }

        // Clear state
        this.state = {
            audio: { isAllowed: false, isPlaying: false },
            heart: { lastCreation: 0, growing: null, growInterval: null, maxSize: 100, growthRate: 3 },
            growButton: { growInterval: 0, currentScale: 1, maxScale: 3, scaleIncrement: 0.02, growSpeed: 50 },
            confetti: { number: 100, colors: [], interval: 5000, numberOfFloatingElement: 16 },
            animating: false,
            cooldown: 10000,
        };

        this.logger.info("GraduationAppMemories destroyed successfully");
        this.logger.timeEnd("GraduationAppMemories destruction");
    }

    /* ========== PUBLIC API METHODS ========== */

    /**
     * Public method to trigger a celebration manually
     * @param {number} delay - Optional delay in milliseconds
     * @returns {void}
     */
    celebrate(delay = 0) {
        this.triggerCelebration(delay);
    }

    /**
     * Public method to toggle audio playback
     * @async
     * @returns {Promise<void>}
     */
    async toggleMusic() {
        await this.toggleAudio();
    }

    /**
     * Public method to check if audio is currently playing
     * @returns {boolean} True if audio is playing
     */
    isMusicPlaying() {
        return this.state.audio.isPlaying;
    }

    /**
     * Public method to get the current application state
     * Useful for debugging or external integrations
     * @returns {Object} Current application state
     */
    getState() {
        return {
            audio: { ...this.state.audio },
            effects: {
                confettiCount: this.state.confetti.number,
                floatingElements: this.state.confetti.numberOfFloatingElement,
                cooldown: this.state.cooldown,
            },
            platform: PlatformDetector.detect(),
            timestamp: new Date().toISOString(),
        };
    }
}

export default GraduationAppMemories;
