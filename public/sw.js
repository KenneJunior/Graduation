// ---------------------------------------------------------------------------
// 0. Module imports — importScripts is the only valid mechanism inside a SW
// ---------------------------------------------------------------------------

// The external offline template may define/override the OFFLINE_HTML variable.
// We wrap it so a missing file doesn't kill the entire worker.
try {
  importScripts("./offline-template.js");
} catch (e) {
  // offline-template.js is optional; we have a built-in fallback below.
  console.warn("[SW] offline-template.js not found — using built-in fallback.");
}

// Custom structured logger — expected to set self.logger
try {
  importScripts("./logger/logger-global.js");
} catch (e) {
  // Provide a minimal console-backed logger so the rest of the file still works
  // in environments where the logger script isn't available (e.g. unit tests).
  self.logger = {
    withContext: () => self.logger,
    debug: (...a) => console.debug(...a),
    info: (...a) => console.info(...a),
    warn: (...a) => console.warn(...a),
    error: (...a) => console.error(...a),
    time: (l) => console.time(l),
    timeEnd: (l) => console.timeEnd(l),
  };
}

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------

const CACHE_VERSION = "v1.02";
const STATIC_CACHE   = `graduation-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE  = `graduation-dynamic-${CACHE_VERSION}`;   // fixed typo: "gradutation"
const CSS_JS_CACHE   = `graduation-css_js-${CACHE_VERSION}`;

// Per-cache item limits.  Oldest entries (by insertion order) are evicted first.
const CACHE_LIMITS = {
  [STATIC_CACHE]:  150,   // pre-cached essentials rarely exceed this
  [DYNAMIC_CACHE]: 100,   // HTML pages + redirects
  [CSS_JS_CACHE]:  200,   // JS / CSS / external CDN resources
};

// Create a module-level logger with service-worker context
const logger = self.logger;
const swLogger = logger.withContext({
  module: "ServiceWorker",
  cacheVersion: CACHE_VERSION,
  scope: self.registration?.scope ?? "unknown",
});

// ---------------------------------------------------------------------------
// 2. External CDN allow-lists
// ---------------------------------------------------------------------------

const EXTERNAL_CDN_HOSTS = new Set([
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.fontawesome.com",
  "code.jquery.com",
  "maxcdn.bootstrapcdn.com",
]);

// Regex patterns that identify well-known library bundles (belt-and-suspenders
// check for CDN resources that might come from unexpected hostnames).
const EXTERNAL_LIBRARY_PATTERNS = [
  /bootstrap.*\.min\.(css|js)/i,
  /fontawesome|font-awesome|all\.min\.(css|js)/i,
  /animate(\.min)?\.css/i,
  /hammer(\.min)?\.js/i,
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
];

// ---------------------------------------------------------------------------
// 3. Essential URLs pre-cached on install
// ---------------------------------------------------------------------------

const ESSENTIAL_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/memories.html",
  "/logout",
  "/manifest.webmanifest",
  "/gallery-data.json",
  "/auth_config.json",
  "/screenshot.svg",
  // Images
  "/pics/img1.jpg",
  "/pics/img2.jpg",
  "/pics/img3.jpg",
  "/pics/img4.jpg",
  "/pics/img5.jpg",
  "/pics/profile_pic.jpg",
  "/pics/tat.jpg",
];

// ---------------------------------------------------------------------------
// 4. Cache routing rules
// ---------------------------------------------------------------------------

/** Extensions we will dynamically cache when seen in the wild */
const CACHEABLE_EXTENSIONS = new Set([
  ".html", ".css", ".js", ".json",
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico",
  ".mp3", ".webm", ".ogg", ".wav",
  ".woff", ".woff2", ".ttf", ".eot",
  ".txt", ".xml", ".webmanifest",
]);

/** Directory prefixes that must never be cached (source/dev artefacts) */
const EXCLUDED_PATH_PREFIXES = [
  "/node_modules/", "/.vscode/", "/.github/", "/.idea/", "/.git/",
  "/test/", "/tests/", "/spec/", "/coverage/", "/build/",
  "/src/scripts/", "/src/utils/",
];

// ---------------------------------------------------------------------------
// 5. Built-in offline page (overridden if offline-template.js defines OFFLINE_HTML)
// ---------------------------------------------------------------------------

/* global OFFLINE_HTML */  // declared by offline-template.js when present
if (typeof OFFLINE_HTML === "undefined") {
  // eslint-disable-next-line no-global-assign
  self.OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You're offline</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;display:flex;align-items:center;
         justify-content:center;min-height:100vh;background:#f0f4f8;color:#2d3748;text-align:center;padding:2rem}
    .card{background:#fff;border-radius:1rem;padding:3rem 2rem;max-width:400px;
          box-shadow:0 4px 24px rgba(0,0,0,.08)}
    svg{width:80px;height:80px;margin-bottom:1.5rem;opacity:.6}
    h1{font-size:1.5rem;margin-bottom:.75rem}
    p{color:#718096;line-height:1.6;margin-bottom:1.5rem}
    button{background:#4a90e2;color:#fff;border:none;border-radius:.5rem;
           padding:.75rem 2rem;font-size:1rem;cursor:pointer}
    button:hover{background:#357abd}
  </style>
</head>
<body>
  <div class="card">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M3 8.25l8.25-4.5 8.25 4.5M3 12l8.25 4.5 8.25-4.5M3 15.75l8.25 4.5 8.25-4.5"/>
    </svg>
    <h1>You're offline</h1>
    <p>It looks like you've lost your internet connection. Check your network and try again.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 7. Utility helpers
// ---------------------------------------------------------------------------

/**
 * Safely parse a URL string.  Returns null on failure rather than throwing.
 * Only accepts http/https schemes to guard against chrome-extension://, blob:, etc.
 */
function safeURL(urlStr) {
  if (!urlStr || urlStr.startsWith("data:") || urlStr.startsWith("blob:")) {
    return null;
  }
  try {
    const url = new URL(urlStr, self.location.origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    swLogger.warn("Invalid URL encountered", { url: urlStr });
    return null;
  }
}

function isKnownCDNHost(hostname) {
  return EXTERNAL_CDN_HOSTS.has(hostname);
}

function matchesLibraryPattern(urlStr) {
  return EXTERNAL_LIBRARY_PATTERNS.some((rx) => rx.test(urlStr));
}

/**
 * Decides whether a given URL's response should ever enter a cache.
 * Returns false for data:, blob:, non-http(s), excluded dirs, API/auth, etc.
 */
function shouldCache(urlStr) {
  const urlObj = safeURL(urlStr);
  if (!urlObj) return false;

  const { pathname, hostname } = urlObj;

  // Always cache well-known CDN hosts and matched library patterns
  if (isKnownCDNHost(hostname) || matchesLibraryPattern(urlStr)) return true;

  // Block cross-origin URLs that aren't on the CDN allow-list
  if (urlObj.origin !== self.location.origin) return false;

  // Block excluded source/dev directories
  if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  // Block API and auth endpoints — never cache these
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return false;
  }

  // Root and HTML files are always cacheable
  if (pathname === "/" || pathname.endsWith(".html")) return true;

  // Cache by allowed extension
  const dotIdx = pathname.lastIndexOf(".");
  if (dotIdx !== -1) {
    const ext = pathname.slice(dotIdx).toLowerCase();
    if (CACHEABLE_EXTENSIONS.has(ext)) return true;
  }

  return false;
}

/**
 * Generates a short unique ID for request tracing.
 * Prefers crypto.randomUUID() when available (modern browsers / Node 19+).
 */
function generateRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `req_${crypto.randomUUID().slice(0, 13)}`;
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// 8. Cache trimming
// ---------------------------------------------------------------------------

/**
 * Trims a named cache to its configured item limit by evicting the oldest
 * entries (caches.keys() preserves insertion order).
 */
async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  try {
    const cache = await caches.open(cacheName);
    const keys  = await cache.keys();

    if (keys.length <= limit) return;

    const toDelete = keys.slice(0, keys.length - limit);
    await Promise.all(toDelete.map((key) => cache.delete(key)));

    swLogger.debug("Cache trimmed", {
      cache: cacheName,
      removed: toDelete.length,
      remaining: limit,
    });
  } catch (err) {
    swLogger.error("Cache trim failed", { cache: cacheName, error: err.message });
  }
}

// ---------------------------------------------------------------------------
// 9. Install event
// ---------------------------------------------------------------------------

self.addEventListener("install", (event) => {
  swLogger.info("🛠 Service Worker installing", {
    cacheVersion: CACHE_VERSION,
    essentialCount: ESSENTIAL_URLS.length,
  });

  event.waitUntil(
    cacheEssentialResources()
      .then(() => {
        swLogger.info("✅ Installation complete — skipping waiting");
        return self.skipWaiting();
      })
      .catch((err) => {
        // Don't abort installation on a cache failure — SW still activates.
        swLogger.error("⚠️ Installation cache step failed", { error: err.message });
        return self.skipWaiting();
      })
  );
});

async function cacheEssentialResources() {
  swLogger.time("EssentialCaching");
  const cache = await caches.open(STATIC_CACHE);

  const results = await Promise.allSettled(
    ESSENTIAL_URLS.map((url) =>
      cache.add(new Request(url, { credentials: "same-origin" })).catch((err) => {
        // Individual URL failures are logged but don't abort the batch.
        swLogger.warn("Essential URL cache failure", { url, error: err.message });
      })
    )
  );

  const ok   = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.length - ok;
  swLogger.info("Essential caching done", { ok, fail, total: results.length });
  swLogger.timeEnd("EssentialCaching");
}

// ---------------------------------------------------------------------------
// 10. Activate event
// ---------------------------------------------------------------------------

self.addEventListener("activate", (event) => {
  swLogger.info("🚀 Service Worker activating");

  event.waitUntil(
    cleanupOldCaches()
      .then(() => self.clients.claim())
      .then(() => swLogger.info("✅ Service Worker active and controlling all clients"))
      .catch((err) => swLogger.error("❌ Activation error", { error: err.message }))
  );
});

async function cleanupOldCaches() {
  const currentCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE]);
  const allKeys = await caches.keys();
  const stale  = allKeys.filter((k) => !currentCaches.has(k));

  await Promise.all(stale.map((k) => caches.delete(k)));

  if (stale.length) {
    swLogger.info("Old caches removed", { removed: stale });
  }
}

// ---------------------------------------------------------------------------
// 11. Fetch event
// ---------------------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  const reqLogger = swLogger.withContext({
    requestId: generateRequestId(),
    url: event.request.url,
    mode: event.request.mode,
  });

  event.respondWith(
    handleFetch(event.request, reqLogger).catch((err) => {
      // Last-resort catch: log and return a generic error response so the
      // browser doesn't display an opaque "Failed to fetch" error.
      reqLogger.error("Unhandled fetch error", {
        url: event.request.url,   // ← was "url.request.url" in original (bug fixed)
        error: err.message,
        stack: err.stack,
      });
      return new Response("Service Worker error", { status: 500 });
    })
  );
});

/**
 * Central routing function: picks the right caching strategy for each request.
 *
 * Routing table (in priority order):
 *  1. Navigation / HTML accept header  → htmlDocumentsStrategy (network-first)
 *  2. Not cacheable                    → network pass-through
 *  3. Invalid URL                      → network pass-through
 *  4. Images / fonts / media           → staticAssetsStrategy  (cache-first)
 *  5. CSS or external CDN resource     → cssAndExternalStrategy (cache-first)
 *  6. HTML (caught inside non-navigate)→ htmlDocumentsStrategy
 *  7. Everything else (JS, JSON, …)    → staleWhileRevalidateStrategy
 */
async function handleFetch(request, log = swLogger) {
  // Detect navigation requests — Safari may not set mode="navigate" so we
  // additionally inspect the Accept header.
  const isNavigation =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    return htmlDocumentsStrategy(request, log);
  }

  if (!shouldCache(request.url)) {
    return fetch(request);
  }

  const urlObj = safeURL(request.url);
  if (!urlObj) return fetch(request);

  const isExternal = urlObj.origin !== self.location.origin;
  const { pathname } = urlObj;

  if (/\.(jpe?g|png|gif|svg|webp|ico|mp3|webm|ogg|wav|woff2?|ttf|eot)$/i.test(pathname)) {
    return staticAssetsStrategy(request, isExternal, log);
  }

  if (/\.css$/i.test(pathname) || isExternal) {
    return cssAndExternalStrategy(request, isExternal, log);
  }

  if (pathname === "/" || /\.html$/i.test(pathname)) {
    return htmlDocumentsStrategy(request, log);
  }

  return staleWhileRevalidateStrategy(request, isExternal, log);
}

// ---------------------------------------------------------------------------
// 12. Caching strategies
// ---------------------------------------------------------------------------

/**
 * CACHE-FIRST for static assets (images, fonts, media).
 * Falls back to an SVG placeholder when a binary asset is unavailable offline.
 */
async function staticAssetsStrategy(request, isExternal = false, log = swLogger) {

  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;
  const sLog = log.withContext({ strategy: "staticAssets", cache: cacheName });

  sLog.time("StaticAsset");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      sLog.debug("Cache hit", { url: request.url });
      return cached;
    }

    const response = await fetch(request);

    // Only cache clean same-origin responses, or opaque responses from known CDNs.
    // Opaque CDN responses are safe here because we already verified the host.
    if (response && (response.ok || (response.type === "opaque" && isExternal))) {
      await cache.put(request, response.clone());
      trimCache(cacheName);   // fire-and-forget
    }


    return response;
  } catch (err) {
    sLog.info("Offline — returning placeholder", { url: request.url });

    const isImage =
      request.destination === "image" ||
      /\.(jpe?g|png|gif|svg|webp)$/i.test(request.url);

    if (isImage) return createImagePlaceholder();

    return new Response("Asset unavailable offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  } finally {
    sLog.timeEnd("StaticAsset");
  }
}

/**
 * CACHE-FIRST for CSS and external (CDN) resources.
 * Returns an empty stylesheet on failure so the page doesn't hard-error.
 */
async function cssAndExternalStrategy(request, isExternal = false, log = swLogger) {
  const cacheName = isExternal ? DYNAMIC_CACHE : CSS_JS_CACHE;
  const sLog = log.withContext({ strategy: "cssAndExternal", cache: cacheName });

  sLog.time("CSSExternal");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      sLog.debug("Cache hit", { url: request.url });
      return cached;
    }

    const response = await fetch(request);

    if (response && (response.ok || (response.type === "opaque" && isExternal))) {
      await cache.put(request, response.clone());
      trimCache(cacheName);
    }

    return response;
  } catch (err) {
    sLog.warn("Offline — returning empty CSS/JS stub", { url: request.url });

    const isCss = request.url.endsWith(".css") ||
                  request.headers.get("accept")?.includes("text/css");

    // Return a valid empty document so the browser doesn't treat it as an error
    return new Response(isCss ? "/* offline */" : "/* offline */", {
      status: 503,
      headers: {
        "Content-Type": isCss ? "text/css" : "application/javascript",
      },
    });
  } finally {
    sLog.timeEnd("CSSExternal");
  }
}

/**
 * NETWORK-FIRST for HTML documents.
 * Tries the network; on failure checks multiple cache patterns; final fallback
 * is the generated offline page.
 */
async function htmlDocumentsStrategy(request, log = swLogger) {
  const sLog = log.withContext({ strategy: "htmlDocuments" });
  sLog.time("HTMLDoc");

  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Handle server-side redirects gracefully
    if (networkResponse.redirected) {
      sLog.debug("Following redirect", {
        from: request.url,
        to: networkResponse.url,
      });
      // Cache under the original request key so offline lookups still work
      if (networkResponse.ok) {
        const cacheableResponse = new Response(networkResponse.body, {
          status: networkResponse.status,
          statusText: networkResponse.statusText,
          headers: networkResponse.headers,
        });
        await cache.put(request, cacheableResponse);
        trimCache(DYNAMIC_CACHE);
      }
      return networkResponse;
    }

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      trimCache(DYNAMIC_CACHE);
    }

    return networkResponse;
  } catch {
    sLog.debug("Network failed — searching caches", { url: request.url });

    // Try progressively looser cache keys
    const candidates = [
      request,
      !request.url.endsWith(".html") ? request.url + ".html"  : null,
       request.url.endsWith(".html") ? request.url.replace(/\.html$/, "") : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      const cached = await caches.match(candidate);
      if (cached) {
        sLog.info("Serving from cache", { key: typeof candidate === "string" ? candidate : candidate.url });
        return cached;
      }
    }

    sLog.warn("Nothing in cache — serving offline page", { url: request.url });
    return createOfflinePage();
  } finally {
    sLog.timeEnd("HTMLDoc");
  }
}

/**
 * STALE-WHILE-REVALIDATE for JS, JSON, and other cacheable files.
 * Returns cached version immediately (if available) and refreshes in background.
 */
async function staleWhileRevalidateStrategy(request, isExternal = false, log = swLogger) {
  const cacheName = isExternal ? DYNAMIC_CACHE : CSS_JS_CACHE;
  const sLog = log.withContext({ strategy: "SWR", cache: cacheName });

  sLog.time("SWR");
  try {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);

    // Kick off background refresh regardless of cache state
    const networkUpdate = fetch(request)
      .then(async (response) => {
        if (response && (response.ok || (response.type === "opaque" && isExternal))) {
          await cache.put(request, response.clone());
          await trimCache(cacheName);
        }
      })
      .catch((err) => {
        sLog.debug("Background SWR update failed", { url: request.url, error: err.message });
      });

    if (cached) {
      sLog.debug("Serving stale, revalidating in background", { url: request.url });
      // Let the background update complete even if client navigates away
      // (waitUntil is not available here outside event scope; the detached
      // promise is the correct pattern for SWR background updates)
      networkUpdate.catch(() => {});
      return cached;
    }

    // No cache entry — wait for network
    sLog.debug("Cache miss — awaiting network", { url: request.url });
    return await fetch(request).then(async (response) => {
      if (response && (response.ok || (response.type === "opaque" && isExternal))) {
        await cache.put(request, response.clone());
        trimCache(cacheName);
      }
      return response;
    });
  } catch {
    sLog.warn("Offline — no SWR fallback", { url: request.url });
    return createOfflinePage();
  } finally {
    sLog.timeEnd("SWR");
  }
}

// ---------------------------------------------------------------------------
// 13. Response factories
// ---------------------------------------------------------------------------

function createImagePlaceholder() {
  return new Response(IMAGE_PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

function createOfflinePage() {
  // OFFLINE_HTML is either from offline-template.js or our built-in fallback
  const html = typeof OFFLINE_HTML !== "undefined" ? OFFLINE_HTML : self.OFFLINE_HTML;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Offline-Page": "true",
    },
  });
}

// ---------------------------------------------------------------------------
// 14. Message handler
// ---------------------------------------------------------------------------

self.addEventListener("message", (event) => {
  const { data } = event;
  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    swLogger.info("Skipping waiting phase by client request");
    self.skipWaiting();
  }

  if (data.type === "SET_GRADUATION_LOG_LEVEL") {
    self.clients.matchAll().then((clients) =>
      clients.forEach((client) =>
        client.postMessage({
          type: "GRADUATION_LOG_LEVEL",
          level: data.level,
          persist: !!data.persist,
        })
      )
    );
  }
});

// ---------------------------------------------------------------------------
// 15. Background sync
// ---------------------------------------------------------------------------

self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    swLogger.info("Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    swLogger.info("Background sync completed");
    return true;
  } catch (err) {
    swLogger.error("Background sync failed", { error: err.message });
    return false;
  }
}

// ---------------------------------------------------------------------------
// 16. Global error handlers
// ---------------------------------------------------------------------------

self.addEventListener("error", (event) => {
  swLogger.error("SW runtime error", {
    message: event.error?.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

self.addEventListener("unhandledrejection", (event) => {
  swLogger.error("SW unhandled promise rejection", {
    reason: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack,
  });
});

// ---------------------------------------------------------------------------
// 17. Periodic health check
// ---------------------------------------------------------------------------

async function performHealthCheck() {
  const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE];
  const stats = {};

  try {
    await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys  = await cache.keys();
        stats[name] = { size: keys.length, limit: CACHE_LIMITS[name] };
      })
    );
    swLogger.info("Health check", { caches: stats, timestamp: new Date().toISOString() });
  } catch (err) {
    swLogger.error("Health check failed", { error: err.message });
  }
}

// Run every 5 minutes; only when logging is enabled to avoid idle overhead
setInterval(() => {
  if (self.shouldLog) performHealthCheck();
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// 18. Startup log
// ---------------------------------------------------------------------------

swLogger.info("🎯 Service Worker script evaluated", {
  version: CACHE_VERSION,
  caches: { STATIC_CACHE, DYNAMIC_CACHE, CSS_JS_CACHE },
  limits: CACHE_LIMITS,
  essentialUrls: ESSENTIAL_URLS.length,
  timestamp: new Date().toISOString(),
});
