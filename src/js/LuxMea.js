const WHATSAPP_NUMBER = '237670852835';

const RESPONSES = Object.freeze({
  yes:   "Yes!! I'd love to 💕 You've been on my mind too, and honestly this just made my day.",
  maybe: "Hmm… I don't know just yet 🙈 I really value what we have, and I need a little time to think. But the fact you asked me this way already means a lot. 💖",
  no:    "I really appreciate you being this open with me 🥹 You're amazing, and I don't want to hurt you — but I don't see us that way. I hope this doesn't change the bond we already share. 🤍",
});

/** Easing factor for the cursor/orb lerp animation (0 < ease ≤ 1). */
const CURSOR_EASE = 0.12;

/** How long (ms) after the last mousemove before we clear the `is-moving` class. */
const MOVE_IDLE_DELAY = 150;

/** Duration (ms) a button stays disabled after a click (prevents double-send). */
const BTN_COOLDOWN_MS = 900;

/** Number of confetti particles spawned on "yes". */
const PARTICLE_COUNT = 60;


// ─── Utility helpers ───────────────────────────────────────────────────────

/**
 * Returns the element matching `selector`, or null.
 * Warns in dev environments if the element is missing.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
function qs(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) console.warn(`LuxMea: element not found → "${selector}"`);
  return el;
}

/**
 * Returns all elements matching `selector`.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {NodeListOf<Element>}
 */
function qsAll(selector, root = document) {
  return root.querySelectorAll(selector);
}

/**
 * Clamps a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Linear interpolation.
 * @param {number} a  - current value
 * @param {number} b  - target value
 * @param {number} t  - interpolation factor (0–1)
 * @returns {number}
 */
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Returns true if the user prefers reduced motion.
 * @returns {boolean}
 */
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Returns true on touch-primary devices.
 * @returns {boolean}
 */
const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;


// ─── WhatsApp integration ─────────────────────────────────────────────────

/**
 * Builds a wa.me deep-link and opens it.
 * Falls back to same-tab redirect if the pop-up is blocked.
 *
 * @param {string} message - Pre-filled message text.
 */
function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  try {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');

    // Pop-up blocked (common on mobile Safari / some Android browsers)
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      console.info('LuxMea: pop-up blocked — falling back to same-tab redirect.');
      window.location.href = url;
    }
  } catch (err) {
    // window.open threw (e.g. sandboxed iframe) — redirect as last resort
    console.error('LuxMea: window.open failed:', err);
    window.location.href = url;
  }
}

/**
 * Binds a response button: sets a loading state, opens WhatsApp,
 * then resets after the cooldown period.
 *
 * @param {HTMLElement}  btn      - The button element.
 * @param {string}       response - Key of RESPONSES to send.
 * @param {Function}    [onSend]  - Optional callback fired immediately on click.
 */
function bindResponseButton(btn, response, onSend) {
  if (!btn) return;

  btn.addEventListener('click', () => {
    if (btn.disabled) return;

    // 1. Lock the button
    btn.disabled = true;
    btn.classList.add('is-loading');
    btn.setAttribute('aria-busy', 'true');

    // 2. Optional side-effect (e.g. confetti burst)
    onSend?.();

    // 3. Open WhatsApp
    openWhatsApp(RESPONSES[response]);

    // 4. Unlock after cooldown
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove('is-loading');
      btn.removeAttribute('aria-busy');
    }, BTN_COOLDOWN_MS);
  });
}


// ─── Cursor & interactive orb ─────────────────────────────────────────────

/**
 * Initialises the custom cursor follower and the mouse-reactive
 * background orb. Both use a shared rAF loop for performance.
 *
 * On touch devices the cursor element is hidden via CSS class;
 * the orb still responds to touch for visual richness.
 *
 * @param {HTMLElement} orb    - The `.interactive` gradient orb.
 * @param {HTMLElement} cursor - The `.cursor-follower` element.
 */
function initCursor(orb, cursor) {
  const touch = isTouchDevice();

  // Hide cursor ring on touch devices
  if (touch) cursor.classList.add('is-hidden');

  // Lerp state
  let targetX  = window.innerWidth  / 2;
  let targetY  = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  // Moving-state timeout handle
  let moveTimer = null;

  /**
   * Single rAF loop — runs for the entire page lifetime.
   * We accept this trade-off: one persistent loop is cheaper
   * than creating/cancelling many overlapping ones.
   */
  function tick() {
    currentX = lerp(currentX, targetX, CURSOR_EASE);
    currentY = lerp(currentY, targetY, CURSOR_EASE);

    // Orb follows the lerped (smooth) position
    orb.style.transform =
      `translate(${currentX | 0}px, ${currentY | 0}px)`;

    // Cursor ring snaps closer to the actual pointer
    if (!touch) {
      cursor.style.transform =
        `translate(${targetX | 0}px, ${targetY | 0}px)`;
    }

    requestAnimationFrame(tick);
  }

  /**
   * Mouse/touch move handler — updates targets and tints the orb.
   * @param {number} x - Client X coordinate.
   * @param {number} y - Client Y coordinate.
   */
  function onPointerMove(x, y) {
    targetX = x;
    targetY = y;

    // Tint the orb based on horizontal position (0–360 hue)
    const hue = Math.round((x / window.innerWidth) * 360);
    orb.style.background =
      `radial-gradient(circle, hsla(${hue},80%,65%,0.8) 0%, hsla(${hue},80%,65%,0) 60%)`;

    // Moving class — used by CSS to expand the cursor ring
    if (!touch) {
      document.body.classList.add('is-moving');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(
        () => document.body.classList.remove('is-moving'),
        MOVE_IDLE_DELAY,
      );
    }
  }

  // Mouse
  window.addEventListener('mousemove', e => onPointerMove(e.clientX, e.clientY), { passive: true });

  // Touch — use first touch point for orb tinting
  window.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (t) onPointerMove(t.clientX, t.clientY);
  }, { passive: true });

  // Cursor hover states on interactive elements
  const interactiveEls = qsAll('a, button, [role="button"]');
  interactiveEls.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
  });

  requestAnimationFrame(tick);
}


// ─── Entrance animations ──────────────────────────────────────────────────


function initEntranceAnimations() {
  if (prefersReducedMotion()) return;

  const targets = qsAll(
    '.greeting-title, .decoration-line, .message-text, .cta-button, .card-footer-note',
  );

  targets.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${i * 60}ms`);
    el.classList.add('will-reveal');
  });

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target); // fire once only
        }
      });
    },
    { threshold: 0.15 },
  );

  targets.forEach(el => observer.observe(el));
}


// ─── Confetti / particle burst ────────────────────────────────────────────

function spawnConfetti() {
  if (prefersReducedMotion()) return;

  const emojis  = ['💕', '🌸', '✨', '💖', '🌹', '💫', '🎀'];
  const origin  = document.getElementById('yes-btn')?.getBoundingClientRect();
  const startX  = origin ? origin.left + origin.width  / 2 : window.innerWidth  / 2;
  const startY  = origin ? origin.top  + origin.height / 2 : window.innerHeight / 2;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particle = document.createElement('span');
    particle.className  = 'confetti-particle';
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    particle.setAttribute('aria-hidden', 'true');

    // Random spread
    const angle    = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 200;
    const dx       = Math.cos(angle) * distance;
    const dy       = Math.sin(angle) * distance - 80; // bias upward
    const duration = 700 + Math.random() * 600;
    const size     = 14 + Math.random() * 18;

    Object.assign(particle.style, {
      position:   'fixed',
      left:       `${startX}px`,
      top:        `${startY}px`,
      fontSize:   `${size}px`,
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex:     9999,
      transform:  'translate(-50%, -50%)',
      transition: `transform ${duration}ms cubic-bezier(.22,.61,.36,1), opacity ${duration}ms ease`,
      opacity:    '1',
    });

    document.body.appendChild(particle);

    // Trigger the transition on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        particle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`;
        particle.style.opacity   = '0';
      });
    });

    particle.addEventListener('transitionend', () => particle.remove(), { once: true });
  }
}


// ─── Ambient sound ────────────────────────────────────────────────────────

/**
 * Wires up the ambient hover sound.
 * Audio only starts after the first user gesture (browser autoplay policy).
 * Uses a low-volume fade-in so it never startles.
 *
 * @param {HTMLAudioElement|null} audio
 */
function initAmbientSound(audio) {
  if (!audio) return;

  audio.volume = 0;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;

    audio.play().then(() => {
      // Fade in over 2 s
      let vol = 0;
      const step = () => {
        vol = clamp(vol + 0.01, 0, 0.18); // max volume 18% — very subtle
        audio.volume = vol;
        if (vol < 0.18) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }).catch(() => {
      // Autoplay still blocked — silently give up
    });
  }

  // Unlock on first meaningful interaction
  ['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, unlock, { once: true, passive: true }),
  );
}


// ─── Keyboard accessibility ───────────────────────────────────────────────


function initKeyboardNav() {
  qsAll('[role="button"]:not(button)').forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        el.click();
      }
    });
  });
}


// ─── Boot ─────────────────────────────────────────────────────────────────

/**
 * Main entry point. Queries the DOM once and passes refs to sub-systems.
 * Fails gracefully if critical elements are absent.
 */
function boot() {
  // ── Critical elements ──────────────────────────────────────────
  const orb    = qs('.interactive');
  const cursor = qs('.cursor-follower');
  const yesBtn = qs('#yes-btn');
  const maybeBtn = qs('#maybe-btn');
  const nopeBtn  = qs('#nope-btn');

  if (!orb || !yesBtn || !maybeBtn || !nopeBtn) {
    console.error('LuxMea: critical DOM elements missing — aborting.');
    return;
  }

  // ── Optional elements (no-op if absent) ───────────────────────
  const audio = document.getElementById('hover-sound');

  // ── Subsystem initialisation ───────────────────────────────────

  // 1. Response buttons → WhatsApp
  bindResponseButton(yesBtn,   'yes',   spawnConfetti);
  bindResponseButton(maybeBtn, 'maybe');
  bindResponseButton(nopeBtn,  'no');

  // 2. Cursor & orb (cursor may be null — initCursor handles it)
  if (cursor) initCursor(orb, cursor);

  // 3. Staggered entrance animations
  initEntranceAnimations();

  // 4. Ambient sound
  initAmbientSound(audio);

  // 5. Keyboard nav fallback
  initKeyboardNav();

  console.info('LuxMea: initialised ✓');
}

// Run after the DOM is fully parsed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot(); // already ready (e.g. script loaded with defer + DOMContentLoaded already fired)
}
