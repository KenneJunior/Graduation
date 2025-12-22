// Utility: Fetch manifest and get app name
import logger from "./logger";
export async function getAppName() {
  // Find manifest link
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return null;
  try {
    const res = await fetch(manifestLink.href);
    if (!res.ok) return null;
    const manifest = await res.json();
    return manifest.name || manifest.short_name || null;
  } catch {
    return null;
  }
}
/**
 * Utility: Load media data from gallery-data.json
 * @returns {Promise<Object>} Parsed media data
 */
export async function loadMediaData() {
    logger.time("Media data loading");

    try {
      logger.debug("Fetching gallery data from /gallery-data.json");
      const response = await fetch("/gallery-data.json");

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const mediaData = await response.json();
      logger.info("Media data loaded successfully", {
        mediaCount: mediaData.media?.length || 0,
      });

      logger.timeEnd("Media data loading");
      return mediaData;
    } catch (error) {
      logger.error("Error loading gallery data:", error);
      logger.timeEnd("Media data loading");
      throw error;
    }
  }

// Utility: for syncronous wait/delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
