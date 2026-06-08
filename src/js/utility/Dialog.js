

// ─── CSS Injection helpers ───────────────────────────────────────────────────

function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
}

const BASE_STYLES_ID = "cd-base";
const BASE_STYLES = `
/* ─── Layout ─────────────────────────────────── */
.cd-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: var(--cd-z, 9999);
  background: rgba(0, 0, 0, 0);
  transition: background var(--cd-dur, 220ms) ease;
}
.cd-overlay.cd-visible {
  background: rgba(0, 0, 0, 0.55);
}
.cd-overlay.cd-blur {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* ─── Card ────────────────────────────────────── */
.cd-card {
  --cd-card-bg: #ffffff;
  --cd-card-border: rgba(0,0,0,0.08);
  --cd-card-text: #111827;
  --cd-card-muted: #6b7280;
  --cd-card-surface: #f9fafb;
  --cd-card-hover: #f3f4f6;
  --cd-cancel-text: #374151;
  background: var(--cd-card-bg);
  border: 1px solid var(--cd-card-border);
  border-radius: 16px;
  width: min(460px, 100%);
  box-shadow:
    0 2px 4px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.10),
    0 24px 56px rgba(0,0,0,0.12);
  transform: scale(0.93) translateY(12px);
  opacity: 0;
  transition:
    transform var(--cd-dur, 220ms) cubic-bezier(0.34, 1.2, 0.64, 1),
    opacity var(--cd-dur, 220ms) ease;
  font-family: var(--cd-font, "Inter", system-ui, -apple-system, sans-serif);
  overflow: hidden;
  color: var(--cd-card-text);
}
.cd-card.cd-visible {
  transform: scale(1) translateY(0);
  opacity: 1;
}

/* ─── Icon strip ──────────────────────────────── */
.cd-strip {
  height: 4px;
  width: 100%;
}

/* ─── Body ────────────────────────────────────── */
.cd-body {
  padding: 24px 24px 0;
}
.cd-icon-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.cd-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.cd-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.4;
}
.cd-message {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.65;
  color: var(--cd-card-muted);
  padding: 0;
}
.cd-detail {
  margin: 8px 0 0;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--cd-card-muted);
  background: var(--cd-card-surface);
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid var(--cd-accent, #6366f1);
}

/* ─── Progress bar (timeout) ──────────────────── */
.cd-progress-wrap {
  padding: 14px 24px 0;
}
.cd-progress-track {
  height: 3px;
  background: var(--cd-card-surface);
  border-radius: 99px;
  overflow: hidden;
}
.cd-progress-bar {
  height: 100%;
  background: var(--cd-accent, #6366f1);
  border-radius: 99px;
  width: 100%;
  transition: width linear;
}

/* ─── Actions ─────────────────────────────────── */
.cd-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 24px 20px;
  flex-wrap: wrap;
}
.cd-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
  transition:
    background 140ms ease,
    transform 120ms ease,
    box-shadow 140ms ease,
    opacity 120ms ease;
  outline: none;
}
.cd-btn:focus-visible {
  box-shadow: 0 0 0 3px var(--cd-accent-focus, rgba(99,102,241,0.35));
}
.cd-btn:active {
  transform: scale(0.96);
}

/* Cancel */
.cd-btn-cancel {
  background: var(--cd-card-surface);
  color: var(--cd-cancel-text);
}
.cd-btn-cancel:hover {
  background: var(--cd-card-hover);
}

/* Confirm */
.cd-btn-confirm {
  background: var(--cd-accent, #6366f1);
  color: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.cd-btn-confirm:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.cd-btn-confirm[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  filter: none;
}

/* ─── Dark mode ───────────────────────────────── */
@media (prefers-color-scheme: dark) {
  .cd-card {
    --cd-card-bg: #1c1c1e;
    --cd-card-border: rgba(255,255,255,0.08);
    --cd-card-text: #f1f5f9;
    --cd-card-muted: #8e8e93;
    --cd-card-surface: #2c2c2e;
    --cd-card-hover: #3a3a3c;
    --cd-cancel-text: #d1d5db;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.5), 0 24px 56px rgba(0,0,0,0.6);
  }
}

[data-theme="dark"] .cd-card {
  --cd-card-bg: #1c1c1e;
  --cd-card-border: rgba(255,255,255,0.08);
  --cd-card-text: #f1f5f9;
  --cd-card-muted: #8e8e93;
  --cd-card-surface: #2c2c2e;
  --cd-card-hover: #3a3a3c;
  --cd-cancel-text: #d1d5db;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.5), 0 24px 56px rgba(0,0,0,0.6);
}

[data-theme="light"] .cd-card {
  --cd-card-bg: #ffffff;
  --cd-card-border: rgba(0,0,0,0.08);
  --cd-card-text: #111827;
  --cd-card-muted: #6b7280;
  --cd-card-surface: #f9fafb;
  --cd-card-hover: #f3f4f6;
  --cd-cancel-text: #374151;
  box-shadow: 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.10), 0 24px 56px rgba(0,0,0,0.12);
}
[data-theme="dark"] .cd-overlay.cd-visible,
.cd-overlay.cd-visible:is([data-theme="dark"] *) {
  background: rgba(0, 0, 0, 0.72);
}
`;

// ─── Type definitions ─────────────────────────────────────────────────────────

/** @typedef {'danger'|'warning'|'info'|'success'} DialogType */

/**
 * @typedef {Object} DialogOptions
 * @property {string}   [title]
 * @property {string}   [message]
 * @property {string}   [detail]         - Secondary detail text (displayed in a code-block style)
 * @property {DialogType} [type]
 * @property {string}   [confirmText]
 * @property {string}   [cancelText]
 * @property {boolean}  [showCancel]
 * @property {boolean}  [persist]        - Prevent backdrop click from closing
 * @property {number}   [timeoutMs]      - Auto-confirm after N ms (shows progress bar)
 * @property {boolean}  [timeoutConfirm] - true = auto-confirm, false = auto-cancel (default true)
 * @property {Function} [onConfirm]      - Called with true when confirmed
 * @property {Function} [onCancel]       - Called with false when cancelled
 */

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    danger: {
        accent:      "#ef4444",
        accentFocus: "rgba(239,68,68,0.35)",
        iconBg:      "rgba(239,68,68,0.12)",
        iconColor:   "#ef4444",
        icon:        "🗑️",
        stripColor:  "#ef4444",
    },
    warning: {
        accent:      "#f59e0b",
        accentFocus: "rgba(245,158,11,0.35)",
        iconBg:      "rgba(245,158,11,0.12)",
        iconColor:   "#f59e0b",
        icon:        "⚠️",
        stripColor:  "#f59e0b",
    },
    info: {
        accent:      "#6366f1",
        accentFocus: "rgba(99,102,241,0.35)",
        iconBg:      "rgba(99,102,241,0.12)",
        iconColor:   "#6366f1",
        icon:        "ℹ️",
        stripColor:  "#6366f1",
    },
    success: {
        accent:      "#10b981",
        accentFocus: "rgba(16,185,129,0.35)",
        iconBg:      "rgba(16,185,129,0.12)",
        iconColor:   "#10b981",
        icon:        "✅",
        stripColor:  "#10b981",
    },
};

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

export class ConfirmDialog {
    // ── Constructor ─────────────────────────────────────────────────────────────

    /**
     * @param {Object}  [globalOptions]
     * @param {string}  [globalOptions.defaultTitle]
     * @param {string}  [globalOptions.defaultMessage]
     * @param {string}  [globalOptions.defaultConfirmText]
     * @param {string}  [globalOptions.defaultCancelText]
     * @param {DialogType} [globalOptions.defaultType]
     * @param {number}  [globalOptions.zIndex]
     * @param {number}  [globalOptions.transitionDuration]  ms
     * @param {boolean} [globalOptions.blurBackdrop]
     * @param {string}  [globalOptions.fontFamily]
     */
    constructor(globalOptions = {}) {
        this._cfg = {
            defaultTitle:       globalOptions.defaultTitle       ?? "Confirm",
            defaultMessage:     globalOptions.defaultMessage     ?? "Are you sure?",
            defaultConfirmText: globalOptions.defaultConfirmText ?? "Confirm",
            defaultCancelText:  globalOptions.defaultCancelText  ?? "Cancel",
            defaultType:        globalOptions.defaultType        ?? "info",
            zIndex:             globalOptions.zIndex             ?? 9999,
            transitionDuration: globalOptions.transitionDuration ?? 220,
            blurBackdrop:       globalOptions.blurBackdrop       ?? true,
            fontFamily:         globalOptions.fontFamily         ?? null,
        };

        /** @type {HTMLElement|null} */
        this._overlay = null;
        /** @type {HTMLElement|null} */
        this._card = null;

        // Each show() call stores its own resolve/reject here, not shared state.
        /** @type {((v:boolean)=>void)|null} */
        this._resolve = null;
        /** @type {((e:Error)=>void)|null} */
        this._reject = null;

        this._isOpen = false;

        // Event handler refs for cleanup
        this._keyHandler           = null;
        this._backdropHandler      = null;
        this._focusTrapHandler     = null;

        // Timeout / progress bar
        this._timeoutId            = null;
        this._progressIntervalId   = null;

        // ARIA live region
        this._liveRegion           = null;

        injectStyle(BASE_STYLES_ID, BASE_STYLES);
    }

    // ── Public API ───────────────────────────────────────────────────────────────

    /**
     * Shows the dialog and returns a Promise<boolean>.
     * If called while already open the running dialog is replaced.
     *
     * @param {DialogOptions} [options]
     * @returns {Promise<boolean>}
     */
    show(options = {}) {
        return new Promise((resolve, reject) => {
            // If a previous call is pending, resolve it as cancelled before replacing.
            if (this._isOpen && this._resolve) {
                this._resolve(false);
            }

            this._resolve = resolve;
            this._reject  = reject;

            const opts = this._mergeOptions(options);

            if (this._overlay && this._card) {
                this._clearTimeout();
                this._detachEvents();
                this._updateCard(opts);
                this._attachEvents(opts);
                this._setupTimeout(opts);
                this._focusConfirm();
                return;
            }

            this._buildDialog(opts);
            this._attachEvents(opts);
            this._open();
            this._setupTimeout(opts);
            this._focusConfirm();
            this._announce(opts.title);
        });
    }

    /**
     * Resolves the current dialog with the given result.
     * Plays the exit animation before calling the promise resolver.
     *
     * @param {boolean} result
     * @returns {void}
     */
    close(result = false) {
        if (!this._isOpen) return;

        this._clearTimeout();
        this._isOpen = false;
        this._detachEvents();
        this._animateClose();

        const resolve = this._resolve;
        const opts    = this._lastOpts;

        this._resolve = null;
        this._reject  = null;

        setTimeout(() => {
            if (resolve) resolve(result);
            if (result && opts?.onConfirm) opts.onConfirm();
            if (!result && opts?.onCancel)  opts.onCancel();
        }, this._cfg.transitionDuration);
    }

    /**
     * Removes the dialog from the DOM entirely and rejects any pending promise.
     */
    destroy() {
        this._clearTimeout();
        this._detachEvents();

        if (this._reject) {
            this._reject(new Error("ConfirmDialog destroyed"));
        }
        this._resolve = null;
        this._reject  = null;

        if (this._overlay?.parentNode) {
            this._overlay.parentNode.removeChild(this._overlay);
        }
        if (this._liveRegion?.parentNode) {
            this._liveRegion.parentNode.removeChild(this._liveRegion);
        }

        this._overlay    = null;
        this._card       = null;
        this._liveRegion = null;
        this._isOpen     = false;
    }

    /** @returns {boolean} */
    get isOpen() { return this._isOpen; }

    // ── Static convenience methods ───────────────────────────────────────────────

    /**
     * Show a single-button informational alert.
     * Resolves when the user clicks OK.
     *
     * @param {string|DialogOptions} messageOrOptions
     * @returns {Promise<void>}
     */
    static alert(messageOrOptions = {}) {
        const opts = typeof messageOrOptions === "string"
            ? { message: messageOrOptions }
            : messageOrOptions;

        return getConfirmDialog().show({
            showCancel:  false,
            confirmText: "OK",
            type:        "info",
            ...opts,
        }).then(() => undefined);
    }

    // ── Private: Options ─────────────────────────────────────────────────────────

    /**
     * @param {DialogOptions} options
     * @returns {Object}
     * @private
     */
    _mergeOptions(options) {
        const type = options.type ?? this._cfg.defaultType;
        const tc   = TYPE_CONFIG[type] ?? TYPE_CONFIG.info;

        const merged = {
            title:         options.title         ?? this._cfg.defaultTitle,
            message:       options.message       ?? this._cfg.defaultMessage,
            detail:        options.detail        ?? null,
            type,
            confirmText:   options.confirmText   ?? this._cfg.defaultConfirmText,
            cancelText:    options.cancelText    ?? this._cfg.defaultCancelText,
            showCancel:    options.showCancel    ?? true,
            persist:       options.persist       ?? false,
            timeoutMs:     options.timeoutMs     ?? null,
            timeoutConfirm:options.timeoutConfirm?? true,
            onConfirm:     options.onConfirm     ?? null,
            onCancel:      options.onCancel      ?? null,
            ...tc,
        };

        this._lastOpts = merged;
        return merged;
    }

    // ── Private: DOM Build ───────────────────────────────────────────────────────

    /**
     * Builds the full dialog DOM tree.
     * @param {Object} opts
     * @private
     */
    _buildDialog(opts) {
        // ARIA live region
        if (!this._liveRegion) {
            this._liveRegion = document.createElement("div");
            this._liveRegion.setAttribute("aria-live", "assertive");
            this._liveRegion.setAttribute("aria-atomic", "true");
            Object.assign(this._liveRegion.style, {
                position: "absolute",
                width: "1px",
                height: "1px",
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                whiteSpace: "nowrap",
            });
            document.body.appendChild(this._liveRegion);
        }

        // Overlay
        this._overlay = document.createElement("div");
        this._overlay.className = "cd-overlay";
        if (this._cfg.blurBackdrop) this._overlay.classList.add("cd-blur");
        this._overlay.setAttribute("role", "dialog");
        this._overlay.setAttribute("aria-modal", "true");
        this._overlay.setAttribute("aria-labelledby",  "cd-title");
        this._overlay.setAttribute("aria-describedby", "cd-message");
        this._overlay.style.setProperty("--cd-z",   String(this._cfg.zIndex));
        this._overlay.style.setProperty("--cd-dur",  `${this._cfg.transitionDuration}ms`);
        if (this._cfg.fontFamily) {
            this._overlay.style.setProperty("--cd-font", this._cfg.fontFamily);
        }

        // Card
        this._card = document.createElement("div");
        this._card.className = "cd-card";

        this._updateCard(opts);
        this._overlay.appendChild(this._card);
        document.body.appendChild(this._overlay);
    }

    /**
     * Renders / re-renders the card's inner HTML.
     * @param {Object} opts
     * @private
     */
    _updateCard(opts) {
        if (!this._card) return;

        this._card.style.setProperty("--cd-accent",       opts.accent);
        this._card.style.setProperty("--cd-accent-focus",  opts.accentFocus);

        const detailHtml = opts.detail
            ? `<p class="cd-detail">${this._escapeHtml(opts.detail)}</p>`
            : "";

        const progressHtml = opts.timeoutMs
            ? `<div class="cd-progress-wrap">
           <div class="cd-progress-track">
             <div class="cd-progress-bar" id="cd-progress"></div>
           </div>
         </div>`
            : "";

        const cancelHtml = opts.showCancel
            ? `<button class="cd-btn cd-btn-cancel" data-action="cancel"
                 aria-label="${this._escapeHtml(opts.cancelText)}">
           ${this._escapeHtml(opts.cancelText)}
         </button>`
            : "";

        this._card.innerHTML = `
      <div class="cd-strip" style="background:${opts.stripColor};"></div>
      <div class="cd-body">
        <div class="cd-icon-wrap">
          <div class="cd-icon"
               style="background:${opts.iconBg};color:${opts.iconColor};"
               aria-hidden="true">
            ${opts.icon}
          </div>
          <h3 class="cd-title" id="cd-title">${this._escapeHtml(opts.title)}</h3>
        </div>
        <p class="cd-message" id="cd-message">${this._escapeHtml(opts.message)}</p>
        ${detailHtml}
      </div>
      ${progressHtml}
      <div class="cd-actions">
        ${cancelHtml}
        <button class="cd-btn cd-btn-confirm" data-action="confirm"
                aria-label="${this._escapeHtml(opts.confirmText)}">
          ${this._escapeHtml(opts.confirmText)}
        </button>
      </div>
    `;
    }

    // ── Private: Animations ───────────────────────────────────────────────────────

    /** @private */
    _open() {
        this._isOpen = true;
        // Force reflow so the transition fires
        void this._overlay.offsetHeight;
        this._overlay.classList.add("cd-visible");
        this._card.classList.add("cd-visible");
    }

    /** @private */
    _animateClose() {
        if (!this._overlay) return;
        this._overlay.classList.remove("cd-visible");
        this._card.classList.remove("cd-visible");

        const overlay = this._overlay;
        setTimeout(() => {
            overlay.parentNode?.removeChild(overlay);
        }, this._cfg.transitionDuration);
        this._overlay = null;
        this._card = null;
    }

    // ── Private: Events ───────────────────────────────────────────────────────────

    /**
     * @param {Object} opts
     * @private
     */
    _attachEvents(opts) {
        // Button delegation
        this._card.addEventListener("click", this._onCardClick);

        // Keyboard
        this._keyHandler = (e) => {
            if (e.key === "Escape" && !opts.persist) {
                e.preventDefault();
                this.close(false);
            }
            if (e.key === "Enter") {
                // Only confirm if focus is on the confirm button or no button is focused
                const active = document.activeElement;
                if (!active || !active.closest(".cd-btn-cancel")) {
                    e.preventDefault();
                    this.close(true);
                }
            }
        };
        document.addEventListener("keydown", this._keyHandler);

        // Backdrop
        this._backdropHandler = (e) => {
            if (e.target === this._overlay && !opts.persist) {
                this.close(false);
            }
        };
        this._overlay.addEventListener("click", this._backdropHandler);

        // Focus trap
        this._focusTrapHandler = this._buildFocusTrap();
        this._card.addEventListener("keydown", this._focusTrapHandler);
    }

    /** Arrow so `this` is bound, safe to add/remove by reference. @private */
    _onCardClick = (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "confirm") this.close(true);
        if (btn.dataset.action === "cancel")  this.close(false);
    };

    /** @private */
    _detachEvents() {
        if (this._keyHandler) {
            document.removeEventListener("keydown", this._keyHandler);
            this._keyHandler = null;
        }
        if (this._backdropHandler && this._overlay) {
            this._overlay.removeEventListener("click", this._backdropHandler);
            this._backdropHandler = null;
        }
        if (this._focusTrapHandler && this._card) {
            this._card.removeEventListener("keydown", this._focusTrapHandler);
            this._focusTrapHandler = null;
        }
        if (this._card) {
            this._card.removeEventListener("click", this._onCardClick);
        }
    }

    /**
     * Returns a keydown handler that traps Tab inside the card.
     * @returns {Function}
     * @private
     */
    _buildFocusTrap() {
        const selector =
            'button:not([disabled]), [href], input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

        return (e) => {
            if (e.key !== "Tab") return;
            const nodes   = [...this._card.querySelectorAll(selector)];
            const first   = nodes[0];
            const last    = nodes[nodes.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }
            }
        };
    }

    // ── Private: Timeout / Progress ──────────────────────────────────────────────

    /**
     * @param {Object} opts
     * @private
     */
    _setupTimeout(opts) {
        if (!opts.timeoutMs) return;

        const { timeoutMs, timeoutConfirm } = opts;
        const bar = this._card?.querySelector("#cd-progress");

        if (bar) {
            // Kick off the CSS transition
            requestAnimationFrame(() => {
                bar.style.transitionDuration = `${timeoutMs}ms`;
                bar.style.width = "0%";
            });
        }

        this._timeoutId = setTimeout(() => {
            this.close(timeoutConfirm);
        }, timeoutMs);
    }

    /** @private */
    _clearTimeout() {
        if (this._timeoutId !== null) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
        if (this._progressIntervalId !== null) {
            clearInterval(this._progressIntervalId);
            this._progressIntervalId = null;
        }
    }

    // ── Private: Accessibility ────────────────────────────────────────────────────

    /** @param {string} title @private */
    _announce(title) {
        if (!this._liveRegion) return;
        // Clear + re-set to retrigger announcement
        this._liveRegion.textContent = "";
        requestAnimationFrame(() => {
            this._liveRegion.textContent = title;
        });
    }

    /** @private */
    _focusConfirm() {
        requestAnimationFrame(() => {
            this._card?.querySelector("[data-action='confirm']")?.focus();
        });
    }

    // ── Private: Utilities ────────────────────────────────────────────────────────

    /**
     * @param {string} str
     * @returns {string}
     * @private
     */
    _escapeHtml(str) {
        const d = document.createElement("div");
        d.textContent = String(str ?? "");
        return d.innerHTML;
    }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

let _instance = null;

/**
 * Returns the shared ConfirmDialog singleton.
 * Pass options to replace it with a freshly configured instance.
 *
 * @param {Object} [options] - If provided, destroys the current instance and creates a new one.
 * @returns {ConfirmDialog}
 */
export function getConfirmDialog(options) {
    if (options) {
        _instance?.destroy();
        _instance = new ConfirmDialog(options);
    }
    if (!_instance) {
        _instance = new ConfirmDialog();
    }
    return _instance;
}

/**
 * One-liner confirmation using the singleton.
 *
 * @param {string|DialogOptions} messageOrOptions
 * @returns {Promise<boolean>}
 */
export async function confirm(messageOrOptions = {}) {
    const opts = typeof messageOrOptions === "string"
        ? { message: messageOrOptions }
        : messageOrOptions;
    return getConfirmDialog().show(opts);
}

/**
 * One-liner alert (no cancel button) using the singleton.
 *
 * @param {string|DialogOptions} messageOrOptions
 * @returns {Promise<void>}
 */
export async function alert(messageOrOptions = {}) {
    return ConfirmDialog.alert(messageOrOptions);
}

export default ConfirmDialog;