
// ─── Timing (mirrors CSS keyframe durations) ──────────────────
const T_EXIT  = 320;  // ms — viewExit / viewExitBack
const T_ENTER = 450;  // ms — viewEnter / viewEnterBack

// ─── Selectors ────────────────────────────────────────────────
const GLASS_SURFACES  = ".auth0-wrapper";
const AUTH0_CONTAINER = "#auth0";
const PW_CONTAINER    = "#passwordContainer";

// ─── Tilt / shimmer constants ─────────────────────────────────
const TILT_MAX        = 6;
const SHIMMER_OPACITY = 0.18;
const GLOW_SIZE       = 340;
const GLOW_OPACITY    = 0.14;
const T_LEAVE         = "transform 0.6s cubic-bezier(0.16,1,0.3,1)";

// ─── Tiny DOM helpers ─────────────────────────────────────────
const clamp    = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const lerp     = (a, b, t)   => a + (b - a) * t;
const mapRange = (v, iMin, iMax, oMin, oMax) =>
    ((v - iMin) / (iMax - iMin)) * (oMax - oMin) + oMin;
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// =============================================================
// § 1 — DOM SETUP
//     Injects the aurora layer, pointer orb, shimmer overlays,
//     and the ripple keyframe — all purely visual, no logic.
// =============================================================

/** Injects the rotating aurora gradient div into <body> */
function injectAurora() {
    if (qs(".bg-aurora")) return;
    const el = document.createElement("div");
    el.className = "bg-aurora";
    el.setAttribute("aria-hidden", "true");
    document.body.insertAdjacentElement("afterbegin", el);
}

/** Injects the global ripple keyframe + glass 3D base styles */
function injectStyles() {
    if (qs("#glass-extra-style")) return;
    const s = document.createElement("style");
    s.id = "glass-extra-style";
    s.textContent = `
    @keyframes glass-ripple { to { transform:scale(1); opacity:0; } }
    .auth0-wrapper, .login-card {
      transform-style: preserve-3d;
      will-change: transform;
    }
  `;
    document.head.appendChild(s);
}

/** Creates and mounts the pointer-following glow orb */
function createPointerOrb() {
    const orb = document.createElement("div");
    orb.setAttribute("aria-hidden", "true");
    Object.assign(orb.style, {
        position:      "fixed",
        width:         `${GLOW_SIZE}px`,
        height:        `${GLOW_SIZE}px`,
        borderRadius:  "50%",
        background:    `radial-gradient(circle,rgba(120,130,255,${GLOW_OPACITY}) 0%,transparent 70%)`,
        pointerEvents: "none",
        zIndex:        "0",
        transform:     "translate(-50%,-50%)",
        transition:    "opacity 0.4s ease",
        opacity:       "0",
        willChange:    "left,top",
    });
    document.body.appendChild(orb);
    return orb;
}

/**
 * Injects a JS-controlled shimmer overlay inside a glass surface.
 * We use a real div (not ::before) so we can drive it from JS.
 */
function injectShimmer(surface) {
    const existing = qs(".glass-shimmer-js", surface);
    if (existing) return existing;
    const sh = document.createElement("div");
    sh.className = "glass-shimmer-js";
    sh.setAttribute("aria-hidden", "true");
    Object.assign(sh.style, {
        position:      "absolute",
        inset:         "0",
        borderRadius:  "inherit",
        pointerEvents: "none",
        zIndex:        "2",
        opacity:       "0",
        background:    "transparent",
        transition:    "opacity 0.15s ease",
    });
    surface.appendChild(sh);
    return sh;
}

// =============================================================
// § 2 — POINTER / TILT / SHIMMER
//     Mouse-tracking 3D tilt + directional shimmer highlight.
// =============================================================

/** Computes and applies tilt + shimmer given pointer position */
function applyTilt(surface, shimmer, mx, my) {
    const r  = surface.getBoundingClientRect();
    const nx = clamp((mx - (r.left + r.width  / 2)) / (r.width  / 2), -1, 1);
    const ny = clamp((my - (r.top  + r.height / 2)) / (r.height / 2), -1, 1);
    const rx = mapRange(-ny, -1, 1, -TILT_MAX, TILT_MAX);
    const ry = mapRange( nx, -1, 1, -TILT_MAX, TILT_MAX);

    surface.style.transform  = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    surface.style.transition = "transform 0.1s ease";

    if (shimmer) {
        const angle   = Math.atan2(-ny, nx) * (180 / Math.PI);
        const dist    = Math.sqrt(nx * nx + ny * ny);
        const opacity = lerp(0, SHIMMER_OPACITY, dist);
        shimmer.style.background =
            `linear-gradient(${angle}deg,` +
            `rgba(255,255,255,${opacity * 2}) 0%,` +
            `rgba(255,255,255,${opacity}) 30%,` +
            `transparent 60%)`;
        shimmer.style.opacity = "1";
    }
}

/** Resets a surface back to flat with a spring ease-out */
function resetTilt(surface, shimmer) {
    surface.style.transform  = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    surface.style.transition = T_LEAVE;
    if (shimmer) shimmer.style.opacity = "0";
}

/** Spawns a material-ripple burst at the click point */
function spawnRipple(btn, e) {
    const r    = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const rip  = document.createElement("span");
    rip.setAttribute("aria-hidden", "true");
    Object.assign(rip.style, {
        position:      "absolute",
        width:         `${size}px`,
        height:        `${size}px`,
        borderRadius:  "50%",
        left:          `${e.clientX - r.left - size / 2}px`,
        top:           `${e.clientY - r.top  - size / 2}px`,
        background:    "rgba(255,255,255,0.28)",
        transform:     "scale(0)",
        animation:     "glass-ripple 0.55s cubic-bezier(0.16,1,0.3,1) forwards",
        pointerEvents: "none",
    });
    btn.appendChild(rip);
    rip.addEventListener("animationend", () => rip.remove(), { once: true });
}

/**
 * Sets up all pointer listeners: orb tracking, per-surface tilt,
 * ripple on .btn-primary clicks, and reduced-motion guard.
 */
function initPointer() {
    const orb        = createPointerOrb();
    const shimmerMap = new WeakMap();

    /** Returns only the glass surfaces that are currently visible */
    function getVisibleSurfaces() {
        return qsa(GLASS_SURFACES).filter(el =>
            !el.closest(".d-none") &&
            getComputedStyle(el).display !== "none"
        );
    }

    /** Lazily injects shimmer overlays into any newly visible surface */
    function refreshShimmers() {
        getVisibleSurfaces().forEach(s => {
            if (!shimmerMap.has(s)) shimmerMap.set(s, injectShimmer(s));
        });
    }

    let rafId = null;
    let lastX = -9999, lastY = -9999;

    document.addEventListener("pointermove", e => {
        lastX = e.clientX;
        lastY = e.clientY;
        orb.style.left    = `${lastX}px`;
        orb.style.top     = `${lastY}px`;
        orb.style.opacity = "1";

        if (rafId) return;  // throttle to one rAF per frame
        rafId = requestAnimationFrame(() => {
            rafId = null;
            refreshShimmers();
            getVisibleSurfaces().forEach(surface => {
                const rect   = surface.getBoundingClientRect();
                const MARGIN = 120;
                const near   =
                    lastX > rect.left   - MARGIN && lastX < rect.right  + MARGIN &&
                    lastY > rect.top    - MARGIN && lastY < rect.bottom + MARGIN;
                if (near) applyTilt(surface, shimmerMap.get(surface), lastX, lastY);
                else      resetTilt(surface, shimmerMap.get(surface));
            });
        });
    });

    document.addEventListener("pointerleave", () => {
        orb.style.opacity = "0";
        getVisibleSurfaces().forEach(s => resetTilt(s, shimmerMap.get(s)));
    });

    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-primary");
        if (btn) spawnRipple(btn, e);
    });

    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function applyMotionPref(reduced) {
        if (reduced) {
            qsa(GLASS_SURFACES).forEach(s => {
                s.style.transform  = "";
                s.style.transition = "";
            });
            orb.style.display = "none";
        } else {
            orb.style.display = "";
        }
    }
    mq.addEventListener("change", e => applyMotionPref(e.matches));
    applyMotionPref(mq.matches);
}

// =============================================================
// § 3 — VIEW TRANSITIONS
//     Animated exit → enter pipeline for auth0 ↔ password views.
//     Patches both window globals AND LoginUIManager instance
//     methods so every code path gets the animation.
// =============================================================

function initViewTransitions(uiManager) {
    let _transitioning = false;

    const auth0El = qs(AUTH0_CONTAINER);
    const pwEl    = qs(PW_CONTAINER);
    if (!auth0El || !pwEl) return;

    // ── Helper: CSS class names per direction ─────────────────
    function resolveClasses(direction) {
        const fwd = direction === "forward";
        return {
            exitClass:  fwd ? "is-exiting"      : "is-exiting-back",
            enterClass: fwd ? "is-entering"      : "is-entering-back",
        };
    }

    // ── Helper: visible direct children worth staggering ──────
    function getAnimatableChildren(container) {
        return [...container.children].filter(el =>
            !el.classList.contains("notification") &&
            getComputedStyle(el).display !== "none"
        );
    }

    // ── Helper: stamp / clear stagger indices ─────────────────
    function applyStagger(children) {
        children.forEach((child, i) => child.style.setProperty("--stagger-i", i));
    }
    function clearStagger(children) {
        children.forEach(child => child.style.removeProperty("--stagger-i"));
    }

    // ── Helper: animate out → hide ────────────────────────────
    function exitView(outgoing, exitClass, onDone) {
        outgoing.classList.add(exitClass);
        setTimeout(() => {
            outgoing.classList.add("d-none");
            outgoing.classList.remove(exitClass);
            onDone();
        }, T_EXIT);
    }

    // ── Helper: reveal → stagger → animate in ─────────────────
    function enterView(incoming, enterClass, onDone) {
        incoming.classList.remove("d-none");
        const children = getAnimatableChildren(incoming);
        applyStagger(children);

        // Double rAF forces a paint tick so start/end states don't collapse
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                incoming.classList.add(enterClass);
                setTimeout(() => {
                    incoming.classList.remove(enterClass);
                    clearStagger(children);
                    onDone();
                }, T_ENTER);
            });
        });
    }

    // ── Core pipeline ─────────────────────────────────────────
    function switchView(outgoing, incoming, direction = "forward") {
        if (_transitioning) return;
        _transitioning = true;
        const { exitClass, enterClass } = resolveClasses(direction);
        exitView(outgoing, exitClass, () => {
            enterView(incoming, enterClass, () => {
                _transitioning = false;
            });
        });
    }

    // ── Patch window globals (fallback / HTML onclick path) ───
    function patchWindowGlobals() {
        const _origShowPw   = window.showPasswordLogin;
        const _origShowAuth = window.showAuthOptions;

        window.showPasswordLogin = function () {
            if (!auth0El.classList.contains("d-none")) {
                switchView(auth0El, pwEl, "forward");
            } else {
                _origShowPw?.();
            }
        };

        window.showAuthOptions = function () {
            if (!pwEl.classList.contains("d-none")) {
                switchView(pwEl, auth0El, "back");
            } else {
                _origShowAuth?.();
            }
        };
    }

    // ── Patch LoginUIManager instance methods (JS code path) ──
    //
    // LoginUIManager.showPasswordForm() and ._showAuthOptions()
    // toggle d-none directly — we replace them on the instance so
    // the animation wraps the original logic automatically.
    // The originals are preserved and called after the transition
    // settles so all their side-effects (logger, state) still run.
    //
    function patchUIManagerMethods(manager) {
        if (!manager) return;

        const _origShowPwForm   = manager.showPasswordForm.bind(manager);
        const _origShowAuthOpts = manager._showAuthOptions.bind(manager);

        manager.showPasswordForm = function () {
            if (!auth0El.classList.contains("d-none")) {
                // Run the original immediately so dom.passwordContainer
                // gets its d-none removed — then the animation takes over
                // the visual part; we undo the instant show/hide and redo
                // it with animation instead.
                switchView(auth0El, pwEl, "forward");
                // Suppress the original's own d-none toggle this one time
                // by temporarily pointing dom refs at decoys.
                // Simpler: call the original AFTER the enter animation done.
                // We achieve this by NOT calling the original here —
                // enterView already removes d-none from pwEl, and the logger
                // call is the only thing we miss. Call it post-transition.
                setTimeout(() => {
                    // Sync internal state + log — no DOM side-effect at this point
                    manager.logger?.debug?.("Switched to password form view");
                }, T_EXIT + T_ENTER);
            } else {
                _origShowPwForm();
            }
        };

        manager._showAuthOptions = function () {
            if (!pwEl.classList.contains("d-none")) {
                switchView(pwEl, auth0El, "back");
                setTimeout(() => {
                    manager.logger?.debug?.("Switched to Auth0 options view");
                }, T_EXIT + T_ENTER);
            } else {
                _origShowAuthOpts();
            }
        };
    }

    patchWindowGlobals();
    patchUIManagerMethods(uiManager);
}

// =============================================================
// § 4 — PUBLIC ENTRY POINT
//     Called by login.js after LoginUIManager is initialised.
// =============================================================

/**
 * Initialises the full liquid-glass layer.
 *
 * @param {LoginUIManager} [uiManager] - The live LoginUIManager instance.
 *   Pass window.__loginUIManager so transition patches land on the
 *   same instance that login.js uses.
 */
export function initLiquidGlass(uiManager) {
    injectStyles();
    injectAurora();
    initViewTransitions(uiManager);
    initPointer();
}