// Utility: Fetch manifest and get app name
import logger from "./logger";

/**
 * Retrieves the application name from the web app manifest.
 * Looks for a `<link rel="manifest">` tag, fetches the JSON, and returns
 * the `name` or `short_name` property.
 *
 * @returns {Promise<string|null>} The app name, or `null` if not found or on error.
 */
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
 * Displays a media loading container.
 * Adds CSS classes and sets ARIA attributes to indicate loading state.
 *
 * @param {HTMLElement} loadingContainer - The loading container element.
 */
export function showMediaLoading(loadingContainer) {
    // Show loading container with proper classes
    if (loadingContainer) {
        loadingContainer.classList.add("is-visible", "is-loading");
        loadingContainer.setAttribute("aria-hidden", "false");
        loadingContainer.setAttribute("aria-live", "off");
    }
}

/**
 * Hides a media loading container after a short delay.
 * Removes CSS classes and updates ARIA attributes for accessibility.
 *
 * @param {HTMLElement} loadingContainer - The loading container element.
 */
export function hideMediaLoading(loadingContainer) {
    // Hide loading container and reset attributes
    setTimeout(() => {
        if (loadingContainer) {
            loadingContainer.classList.remove("is-visible", "is-loading");
            loadingContainer.setAttribute("aria-hidden", "true");
            loadingContainer.setAttribute("aria-live", "polite");
        }
    }, 500);
}

/**
 * Loads media data from `/gallery-data.json`.
 *
 * @returns {Promise<Object>} The parsed JSON object, expected to contain a `media` array.
 * @throws {Error} If the fetch fails or the response is not OK.
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

/**
 * ADVANCED MEDIA FILTER - Filters media based on logged-in user with advanced features.
 *
 * @param {Object[]} media - Array of media objects (from gallery-data.json).
 *   Each object is expected to have at least `src`, `persons`, and optionally
 *   `type`, `data-type`, `date`, `alt`, `thumb`, `srcset`.
 * @param {Object} authResult - Authentication result object containing:
 *   @param {number} [authResult.accessLevel] - Access level; >50 grants general access.
 *   @param {string} [authResult.code] - User's personal code.
 *   @param {string} [authResult.name] - User's display name.
 * @param {Object} [options={}] - Filtering and processing options.
 * @param {boolean} [options.includeVideos=true] - Include video media.
 * @param {boolean} [options.includeImages=true] - Include image media.
 * @param {'date'|'relevance'|'random'|'personsCount'} [options.sortBy='date'] - Sort criterion.
 * @param {'asc'|'desc'} [options.sortOrder='desc'] - Sort order.
 * @param {boolean} [options.shuffle=false] - Shuffle results (overrides sorting).
 * @param {number|null} [options.limit=null] - Maximum number of results.
 * @param {boolean} [options.returnAllOnError=false] - Return all media if authResult is invalid.
 * @param {boolean} [options.groupByPerson=false] - Group results by person combinations.
 * @param {boolean} [options.excludeSolo=false] - Exclude media with ≤1 person.
  * @param {string|string[]|null} [options.onlyWithPerson=null] - SUBSET: If set, only media whose person list contains only codes from this set will be included (items may contain one or more of the codes, but no other codes). Example: `['M','K']` will include `['M']`, `['K']`, `['M','K']` but exclude `['M','J']`.
  * @param {string[]} [options.excludeCodes=[]] - Array of person codes; media containing any will be excluded.
  * @param {string[]} [options.personCodesToShow=[]] - Show only media containing at least one of these person codes. Empty array shows all. Example: `['M', 'K']` shows media with M or K.
  * @param {number} [options.minPersons=1] - Minimum number of persons in the media.
  * @param {number|null} [options.maxPersons=null] - Maximum number of persons in the media.
 * @param {boolean} [options.enhanceMetadata=true] - Add computed properties (id, relevanceScore, etc.).
 * @param {boolean} [options.generateThumbnails=true] - Generate thumbnail URLs if missing.
 * @param {boolean} [options.debug=false] - Enable debug logging.
 *
 * @returns {Object[]} The filtered and optionally enhanced media array.
 *   Each object (when `enhanceMetadata` is true) will additionally contain:
 *   - `id` : string – Unique identifier.
 *   - `relevanceScore` : number – 100 for general access, 90 if user code matched, else 10.
 *   - `personCount` : number – Number of persons in the media.
 *   - `thumb` : string – Thumbnail URL (if generated).
 *   - `alt` : string – Generated alt text (if missing originally).
 *   - `srcset` : string – Responsive image srcset (if generated).
 *   - `sortDate` : string – Date used for sorting.
 *   - `sortPersons` : number – Person count used for sorting.
 *
 * @throws {Error} If required parameters are missing or invalid.
 */
export function filterMediaByUser(media, authResult, options = {}) {
  // Default options
  const config = {
    includeVideos: true,
    includeImages: true,
    sortBy: 'date',          // 'date', 'relevance', 'random', 'personsCount'
    sortOrder: 'desc',       // 'asc', 'desc'
    shuffle: false,
    limit: null,
    returnAllOnError: false,
    groupByPerson: false,
    excludeSolo: false,
    onlyWithPerson: null,    // SUBSET filter: include items whose person codes are a subset of the provided codes
    excludeCodes: [],        // array of person codes to exclude entirely
    personCodesToShow: [],   // NEW: Filter media to show only items containing at least one of these person codes (from dropdown toggle)
    minPersons: 1,
    maxPersons: null,
    enhanceMetadata: true,
    generateThumbnails: true,
    debug: false,
    ...options
  };

  // Validation
  if (!Array.isArray(media)) {
    logger.warn('filterMediaByUser: media is not an array');
    return [];
  }

  if (!authResult || typeof authResult !== 'object') {
    logger.warn('filterMediaByUser: authResult is missing or invalid');
    return config.returnAllOnError ? media : [];
  }

  const { accessLevel, code, name } = authResult;

  if (config.debug) {
    logger.debug('🔍 Advanced Media Filter started:', {
      mediaCount: media.length,
      authResult,
      config
    });
  }

  // PHASE 1: Initial filtering by access level
  let filteredMedia = [...media];
  const hasGeneralAccess = accessLevel && accessLevel > 50;

  if (!hasGeneralAccess) {
    if (!code) {
      if (config.debug) logger.warn('Personal access requested but no code provided');
      return [];
    }

   /* filteredMedia = filteredMedia.filter(item => {
      if (!Array.isArray(item.persons) || item.persons.length === 0) return false;
      return item.persons.some(person => {
        const personCode = typeof person === 'string' ? person : (person && person.code);
        return personCode === code;
      });
    });*/
  }

  // PHASE 2: Content type filtering (images / videos)
  filteredMedia = filteredMedia.filter(item => {
    const dataType = item['data-type'] || item.type || 'image';
    if (config.includeImages && config.includeVideos) return true;
    if (config.includeImages && dataType === 'image') return true;
    return config.includeVideos && dataType === 'video';
  });

// PHASE 3: Only include items with specific person(s)
// SUBSET MODE: `onlyWithPerson` now means "include items whose person list contains
// only codes from the provided set (i.e., item.persons is a subset of search codes)".
// This allows items that are exactly one of the search codes or combinations of them,
// but excludes items that include any other person codes.
if (config.onlyWithPerson && (Array.isArray(config.onlyWithPerson) ? config.onlyWithPerson.length > 0 : !!config.onlyWithPerson)) {
  const searchCodes = Array.isArray(config.onlyWithPerson)
    ? config.onlyWithPerson
    : [config.onlyWithPerson];

  // Normalize and build set for fast lookup
  const normalizedSearchCodes = searchCodes.map(c => (c == null ? '' : String(c))).filter(Boolean);
  const searchSet = new Set(normalizedSearchCodes);

  filteredMedia = filteredMedia.filter(item => {
    if (!Array.isArray(item.persons) || item.persons.length === 0) return false;

    const itemCodes = item.persons.map(p => (typeof p === 'string' ? p : (p && p.code))).filter(Boolean);

    // Ensure every code on the item is within the allowed search set
    for (const code of itemCodes) {
      if (!searchSet.has(code)) return false;
    }

    // At this point the item's codes are a non-empty subset of the search codes
    return true;
  });

  if (config.debug) {
    logger.debug('🔍 onlyWithPerson (subset) applied', {
      onlyWithPerson: normalizedSearchCodes,
      remaining: filteredMedia.length
    });
  }
}

  //  PHASE 3.5: Exclude items that contain any of the specified codes
  if (config.excludeCodes && config.excludeCodes.length > 0) {
    filteredMedia = filteredMedia.filter(item => {
      if (!Array.isArray(item.persons)) return true;
      // Remove item if it contains any excluded code
      return !item.persons.some(person => {
        const personCode = typeof person === 'string' ? person : (person && person.code);
        return config.excludeCodes.includes(personCode);
      });
    });
  }

  // PHASE 3.6: Filter by specific person codes from dropdown toggle
  // Include items that contain at least one of the specified person codes
  if (config.personCodesToShow && config.personCodesToShow.length > 0) {
    filteredMedia = filteredMedia.filter(item => {
      if (!Array.isArray(item.persons)) return false;
      // Return true if item contains at least one of the specified person codes
      return item.persons.some(person => {
        const personCode = typeof person === 'string' ? person : (person && person.code);
        return config.personCodesToShow.includes(personCode);
      });
    });

    if (config.debug) {
      logger.debug('🔍 Filtered by person codes:', {
        personCodesToShow: config.personCodesToShow,
        itemsAfterFilter: filteredMedia.length
      });
    }
  }

   // PHASE 4: Group size filtering
  filteredMedia = filteredMedia.filter(item => {
    const personCount = Array.isArray(item.persons) ? item.persons.length : 0;
    if (config.excludeSolo && personCount <= 1) return false;
    if (personCount < config.minPersons) return false;
    if (config.maxPersons !== null && personCount > config.maxPersons) return false;
    return true;
  });

  // PHASE 5: Enhance metadata
  if (config.enhanceMetadata) {
    filteredMedia = filteredMedia.map((item, index) => {
      const enhanced = { ...item };
      enhanced.id = `media_${code || 'guest'}_${index}_${Date.now()}`;
      if (hasGeneralAccess) {
        enhanced.relevanceScore = 100;
      } else {
        const personCodes = enhanced.persons
          ? enhanced.persons.map(p => typeof p === 'string' ? p : (p && p.code))
          : [];
        enhanced.relevanceScore = personCodes.includes(code) ? 90 : 10;
      }
      enhanced.personCount = Array.isArray(enhanced.persons) ? enhanced.persons.length : 0;
      if (config.generateThumbnails && !enhanced.thumb) {
        enhanced.thumb = generateThumbnailUrl(enhanced.src);
      }
      if (!enhanced.alt) {
        enhanced.alt = generateAltText(enhanced, code, name);
      }
      if (!enhanced.srcset && enhanced.src) {
        enhanced.srcset = generateResponsiveSrcset(enhanced.src);
      }
      enhanced.sortDate = enhanced.date || new Date(2023, 0, index + 1).toISOString();
      enhanced.sortPersons = enhanced.personCount;
      return enhanced;
    });
  }

  // PHASE 6: Sorting (unchanged)
  if (config.sortBy !== 'random' && filteredMedia.length > 0) {
    filteredMedia.sort((a, b) => {
      let valueA, valueB;
      switch (config.sortBy) {
        case 'date':
          valueA = new Date(a.sortDate || a.date || 0).getTime();
          valueB = new Date(b.sortDate || b.date || 0).getTime();
          break;
        case 'relevance':
          valueA = a.relevanceScore || 0;
          valueB = b.relevanceScore || 0;
          break;
        case 'personsCount':
          valueA = a.personCount || 0;
          valueB = b.personCount || 0;
          break;
        case 'filename':
          valueA = a.src || '';
          valueB = b.src || '';
          break;
        default:
          valueA = 0;
          valueB = 0;
      }
      return config.sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });
  }

  // PHASE 7: Shuffling (unchanged)
  if (config.shuffle && filteredMedia.length > 0) {
    filteredMedia = [...filteredMedia].sort(() => Math.random() - 0.5);
  }

  // PHASE 8: Limiting
  if (config.limit && filteredMedia.length > config.limit) {
    filteredMedia = filteredMedia.slice(0, config.limit);
  }

  // PHASE 9: Grouping (unchanged)
  if (config.groupByPerson && filteredMedia.length > 0) {
    return groupMediaByPerson(filteredMedia, code);
  }

  if (config.debug) {
    logger.debug('✅ Advanced Media Filter complete:', {
      finalCount: filteredMedia.length,
      sample: filteredMedia.slice(0, 3).map(m => ({
        src: m.src,
        persons: m.persons?.map(p => (typeof p === 'string' ? p : p?.code)),
        relevance: m.relevanceScore
      }))
    });
  }

  return filteredMedia;
}

// HELPER FUNCTIONS

/**
 * Generate thumbnail URL from main image URL.
 * Checks WebP support and appends `-thumb` or `.webp`.
 *
 * @param {string} src - Original image source URL.
 * @returns {string} Thumbnail URL.
 */
function generateThumbnailUrl(src) {
  if (!src) return '';

  // Simple implementation - adjust based on your setup
  const basePath = src.substring(0, src.lastIndexOf('.'));
  const extension = src.substring(src.lastIndexOf('.'));

  // Check for WebP support
  const supportsWebP = document.createElement('canvas')
    .toDataURL('image/webp')
    .indexOf('data:image/webp') === 0;

  if (supportsWebP) {
    return `${basePath}.webp`;
  }

  // Fallback to jpg thumbnail
  return `${basePath}-thumb${extension}`;
}

/**
 * Generate responsive srcset for images.
 * Creates size variants at common breakpoints.
 *
 * @param {string} src - Original image source URL.
 * @returns {string} Srcset attribute value (e.g., "path-320w.jpg 320w, path-640w.jpg 640w").
 */
function generateResponsiveSrcset(src) {
  if (!src) return '';

  const sizes = [320, 640, 960, 1280, 1920];
  const basePath = src.substring(0, src.lastIndexOf('.'));
  const extension = src.substring(src.lastIndexOf('.'));

  return sizes
    .map(size => `${basePath}-${size}w${extension} ${size}w`)
    .join(', ');
}

/**
 * Generate alt text for images based on the persons in the media.
 * Modifies the `mediaItem` object directly and returns it.
 *
 * @param {Object} mediaItem - The media item to enhance.
 * @param {string} userCode - Logged-in user's code.
 * @param {string} userName - Logged-in user's name.
 * @returns {Object} The same media item with an `alt` property.
 */
function generateAltText(mediaItem, userCode, userName) {
  if (!Array.isArray(mediaItem.persons) || mediaItem.persons.length === 0) {
    mediaItem.alt = 'Shared memory';
    return mediaItem;
  }

  const persons = mediaItem.persons.map(person => {
    if (typeof person === 'string') {
      return person;
    }
    return person.name || person.code;
  });

  // Check if user is in the photo
  const userInPhoto = persons.some(personCode =>
    typeof personCode === 'string' && personCode === userCode
  );

  if (userInPhoto) {
    if (persons.length === 1) {
      mediaItem.alt = `Photo of ${userName || 'you'}`;
    } else {
      const others = persons.filter(p => p !== userCode).join(' and ');
      mediaItem.alt = `${userName || 'You'} with ${others}`;
    }
  } else {
    mediaItem.alt = `Photo with ${persons.join(' and ')}`;
  }
  return mediaItem;
}

/**
 * Group media items by the combination of persons (excluding the current user).
 *
 * @param {Object[]} media - Array of media items.
 * @param {string} userCode - Current user's code to exclude from group keys.
 * @returns {Object[]} Array of group objects, each containing:
 *   - `id` : string - Group identifier.
 *   - `persons` : Object[] - Person details (code, name).
 *   - `items` : Object[] - Media items belonging to this group.
 *   - `count` : number - Number of items in the group.
 *   - `preview` : string - Thumbnail or src of the first item.
 */
function groupMediaByPerson(media, userCode) {
  const groups = {};

  media.forEach(item => {
    if (!Array.isArray(item.persons)) return;

    // Create group key based on person codes (excluding the user)
    const otherPersons = item.persons
      .filter(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        return personCode !== userCode;
      })
      .map(person => typeof person === 'string' ? person : person.code)
      .sort()
      .join('_');

    const groupKey = otherPersons || 'solo';

    if (!groups[groupKey]) {
      // Extract person info for the group
      const groupPersons = item.persons
        .filter(person => {
          const personCode = typeof person === 'string' ? person : person.code;
          return personCode !== userCode;
        })
        .map(person => {
          if (typeof person === 'string') {
            return { code: person, name: person };
          }
          return person;
        });

      groups[groupKey] = {
        id: `group_${groupKey}`,
        persons: groupPersons,
        items: [],
        count: 0,
        preview: item.thumb || item.src
      };
    }

    groups[groupKey].items.push(item);
    groups[groupKey].count++;
  });

  // Convert to array and sort by count
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

/**
 * Get media statistics for a user.
 *
 * @param {Object[]} media - Full media array.
 * @param {Object} authResult - Authentication result (see {@link filterMediaByUser}).
 * @returns {Object} Statistics object:
 *   - `total` : number - Total media items.
 *   - `accessible` : number - Number of items accessible to the user.
 *   - `percentage` : number - Accessible percentage.
 *   - `byType` : Object<string, number> - Count per media type.
 *   - `byPersonCount` : Object<number, number> - Count per person count.
 *   - `byPerson` : Object<string, {count: number, name: string}> - Count per person code.
 */
export function getMediaStatistics(media, authResult) {
  const filtered = filterMediaByUser(media, authResult, {
    enhanceMetadata: false,
    debug: false
  });

  const stats = {
    total: media.length,
    accessible: filtered.length,
    percentage: media.length > 0 ? Math.round((filtered.length / media.length) * 100) : 0,
    byType: {},
    byPersonCount: {},
    byPerson: {}
  };

  // Count by type
  filtered.forEach(item => {
    const type = item['data-type'] || item.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  // Count by person count
  filtered.forEach(item => {
    const count = Array.isArray(item.persons) ? item.persons.length : 0;
    stats.byPersonCount[count] = (stats.byPersonCount[count] || 0) + 1;
  });

  // Count by individual person
  filtered.forEach(item => {
    if (Array.isArray(item.persons)) {
      item.persons.forEach(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        if (personCode) {
          if (!stats.byPerson[personCode]) {
            stats.byPerson[personCode] = {
              count: 0,
              name: typeof person === 'object' ? person.name : personCode
            };
          }
          stats.byPerson[personCode].count++;
        }
      });
    }
  });

  return stats;
}

/**
 * Create a personalized media feed with collections and recommendations.
 *
 * @param {Object[]} media - Full media array.
 * @param {Object} authResult - Authentication result (see {@link filterMediaByUser}).
 * @returns {Object} Feed object:
 *   - `userInfo` : {code: string, name: string} - User info.
 *   - `collections` : Object - Named collections (e.g., `solo`, `groups`, `featured`), each with:
 *       - `title` : string
 *       - `description` : string
 *       - `items` : Object[] - Filtered media items.
 *       - `count` : number
 *   - `recommendations` : Object[] - Array of recommendation objects:
 *       - `basedOn` : string - Person code the recommendation is based on.
 *       - `items` : Object[] - Suggested media items.
 *   - `statistics` : Object - Result from {@link getMediaStatistics}.
 *   - `totalMemories` : number - Total accessible media items.
 */
export function createPersonalizedMediaFeed(media, authResult) {
  const { code, name } = authResult;

  // Get all accessible media
  const allMedia = filterMediaByUser(media, authResult, {
    enhanceMetadata: true,
    debug: false
  });

  // Create different collections
  const feed = {
    userInfo: { code, name },
    collections: {},
    recommendations: [],
    statistics: getMediaStatistics(media, authResult)
  };

  // Collection 1: Solo photos (just the user)
  const soloPhotos = filterMediaByUser(allMedia, authResult, {
    onlyWithPerson: code,
    minPersons: 1,
    maxPersons: 1,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  if (soloPhotos.length > 0) {
    feed.collections.solo = {
      title: `${name || 'Your'} Photos`,
      description: `Photos featuring ${name || 'you'}`,
      items: soloPhotos,
      count: soloPhotos.length
    };
  }

  // Collection 2: Group photos
  const groupPhotos = filterMediaByUser(allMedia, authResult, {
    excludeSolo: true,
    minPersons: 2,
    sortBy: 'personsCount',
    sortOrder: 'desc'
  });

  if (groupPhotos.length > 0) {
    feed.collections.groups = {
      title: 'Group Memories',
      description: 'Photos with friends and family',
      items: groupPhotos.slice(0, 12), // Limit for display
      count: groupPhotos.length
    };
  }

  // Collection 3: Most relevant (high person overlap)
  const relevantPhotos = [...allMedia]
    .filter(item => item.relevanceScore > 80)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 8);

  if (relevantPhotos.length > 0) {
    feed.collections.featured = {
      title: 'Featured Memories',
      description: 'Your most significant moments',
      items: relevantPhotos,
      count: relevantPhotos.length
    };
  }

  // Generate recommendations (photos user might like based on common persons)
  const allPersons = new Set();
  allMedia.forEach(item => {
    if (Array.isArray(item.persons)) {
      item.persons.forEach(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        if (personCode && personCode !== code) {
          allPersons.add(personCode);
        }
      });
    }
  });

  // For each person user appears with, find other photos with that person
  Array.from(allPersons).forEach(personCode => {
    const personPhotos = filterMediaByUser(allMedia, authResult, {
      personCodesToShow: [personCode],
      limit: 3
    });

    if (personPhotos.length > 0) {
      feed.recommendations.push({
        basedOn: personCode,
        items: personPhotos
      });
    }
  });

  // Add total count
  feed.totalMemories = allMedia.length;

  return feed;
}

/**
 * Utility: Get current user info from localStorage.
 * Expects `GraduationAppPassword` key; if absent, redirects to `/login`.
 *
 * @returns {{code: string, name: string, isGraduand: boolean, accessLevel: number}|null}
 *          The parsed user info, or `null` if parsing fails.
 */
export function getCurrentUserInfo() {
    const authData = localStorage.getItem('GraduationAppPassword');
    if (!authData) window.location.href = '/login';
    try {
        const parsed = JSON.parse(authData);
        return {
            code: parsed.code || null,
            name: parsed.name || null,
            isGraduand: parsed.isGraduand || false,
            accessLevel: parsed.accessLevel || 0
        }
    } catch {
        return null;
    }

}
/**
 * ADVANCED AI PHOTO MESSAGE GENERATOR
 * Creates human-like, context-aware messages with personality, sentiment, and style.
 * Merges and enhances the previous intelligentMessage and generatePhotoMessage capabilities.
 */

// --------------- CORE DATA & PATTERNS ---------------

const contextPatterns = {
  solo: {
    intro: ["This moment", "Looking back", "This memory", "Remembering"],
    middle: ["was so special", "means so much", "brings back feelings", "still feels vivid"],
    ending: ["to me", "even now", "after all this time", "always and forever"]
  },
  duo: {
    intro: ["You and me", "The two of us", "Our special bond", "Together"],
    middle: ["created magic", "shared something special", "had unforgettable times", "made memories"],
    ending: ["that last forever", "that I'll always treasure", "that define friendship", "that matter most"]
  },
  smallGroup: {
    intro: ["Our little group", "The squad", "These amazing people", "My favorite humans"],
    middle: ["knew how to have fun", "made every moment count", "created pure joy", "shared the best laughs"],
    ending: ["and I miss it", "what a time", "those were the days", "forever in my heart"]
  },
  largeGroup: {
    intro: ["This incredible gathering", "When everyone came together", "The whole crew", "Every amazing person here"],
    middle: ["created something magical", "made history together", "shared unforgettable moments", "built memories"],
    ending: ["that define an era", "that we'll talk about forever", "that show true connection", "that matter"]
  }
};

const emotionDictionary = {
  happy: ["joyful", "ecstatic", "delighted", "overjoyed", "blissful", "elated"],
  nostalgic: ["sentimental", "wistful", "bittersweet", "melancholy", "yearning", "reminiscent"],
  loving: ["affectionate", "fond", "devoted", "caring", "tender", "warm"],
  proud: ["accomplished", "triumphant", "victorious", "achieving", "successful", "fulfilled"],
  grateful: ["thankful", "appreciative", "blessed", "fortunate", "privileged", "indebted"]
};

const messageFrameworks = {
  reflection: [
    "{intro}, {middle} {ending}.",
    "{intro}. {middle} {ending}.",
    "{intro} {middle}. {ending}!"
  ],
  celebration: [
    "Cheers to {names}! {middle} 🥂",
    "Celebrating {names} and {middle} 🎉",
    "{names} deserve all the {emotion}! {middle}!"
  ],
  missing: [
    "Missing {names} and our {middle} days 💭",
    "Wish {names} were here to {middle} again",
    "Thinking of {names} and how we used to {middle} 💖"
  ],
  appreciation: [
    "So grateful for {names} and our {middle} moments 🙏",
    "Thankful for {names} who {middle} with me",
    "Appreciating {names} for the {middle} memories ❤️"
  ]
};

// Personality styles for tonal variation
const personalities = {
  casual: {
    tone: 'friendly',
    adjectives: ['amazing', 'great', 'fun', 'awesome', 'memorable'],
    verbs: ['remember', 'cherish', 'miss', 'love', 'enjoy']
  },
  formal: {
    tone: 'respectful',
    adjectives: ['significant', 'memorable', 'notable', 'precious', 'valuable'],
    verbs: ['recall', 'appreciate', 'value', 'treasure', 'commemorate']
  },
  funny: {
    tone: 'humorous',
    adjectives: ['hilarious', 'epic', 'legendary', 'ridiculous', 'priceless'],
    verbs: ['crack up', 'laugh about', 'can\'t forget', 'still giggle about']
  },
  romantic: {
    tone: 'affectionate',
    adjectives: ['beautiful', 'magical', 'heartwarming', 'special', 'cherished'],
    verbs: ['treasure', 'hold dear', 'adore', 'love', 'embrace']
  },
  nostalgic: {
    tone: 'sentimental',
    adjectives: ['nostalgic', 'timeless', 'classic', 'unforgettable', 'golden'],
    verbs: ['reminisce', 'look back on', 'remember fondly', 'miss', 'cherish']
  }
};

const emojis = {
  casual: ['😊', '✨', '🌟', '💫', '🎉', '🤗', '👏', '🙌', '🎈'],
  formal: ['🎓', '📸', '🏛️', '👔', '📚'],
  funny: ['😂', '🤣', '😆', '🤪', '😜', '🎭', '🤹', '🎪'],
  romantic: ['💕', '❤️', '🥰', '😍', '💖', '🌹', '💐', '✨'],
  nostalgic: ['🕰️', '📜', '🎞️', '📷', '💭', '🌅', '🌇']
};

const defaultHashtags = {
  general: ['Memories', 'Throwback', 'GoodTimes', 'Friends', 'Family'],
  style: {
    casual: ['FunTimes', 'GreatMemories', 'AwesomePeople'],
    formal: ['SignificantMoments', 'PreciousMemories', 'NotableOccasions'],
    funny: ['EpicTimes', 'LaughingSoHard', 'Unforgettable'],
    romantic: ['BeautifulMoments', 'Heartwarming', 'CherishedMemories'],
    nostalgic: ['Nostalgic', 'Flashback', 'TimelessMoments']
  }
};

// --------------- UTILITY FUNCTIONS ---------------

function selectRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getNamesString(persons, userInPhoto, userName, useFullNames) {
  if (persons.length === 0) return userName || 'me';

  const names = persons.map(p =>
      typeof p === 'string'
          ? (useFullNames ? p : p.charAt(0))
          : (useFullNames ? (p.name || p.code) : p.code)
  );

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const last = names.pop();
  return `${names.join(', ')}, and ${last}`;
}

function getRandomEmoji(style, totalPeople, userInPhoto) {
  if (style && emojis[style]) {
    return selectRandom(emojis[style]);
  }
  // Default fallback based on context
  if (totalPeople === 1) return userInPhoto ? '✨' : '🌟';
  if (totalPeople === 2) return userInPhoto ? '💖' : '👥';
  if (totalPeople <= 5) return '👨‍👩‍👧‍👦';
  return '🎉';
}

function generateHashtags(persons, totalPeople, userInPhoto, style) {
  const tags = [];

  // Person hashtags (if code is short)
  persons.forEach(p => {
    const code = typeof p === 'string' ? p : p.code;
    if (code && code.length <= 4) tags.push(`Person${code}`);
  });

  // Size tag
  if (totalPeople === 1) tags.push('Solo');
  else if (totalPeople === 2) tags.push('Duo');
  else if (totalPeople <= 5) tags.push('Squad');
  else tags.push('GroupPhoto');

  // Sentiment tag
  if (userInPhoto) tags.push('MyMemory');
  else tags.push('Friends');

  // Style specific
  if (style && defaultHashtags.style[style]) {
    tags.push(...defaultHashtags.style[style].slice(0, 2));
  }

  // General
  tags.push(...defaultHashtags.general.slice(0, 2));

  return [...new Set(tags)].slice(0, 5);
}

function addTimeContext(message) {
  const references = [
    "Back when life was simpler",
    "In those golden days",
    "During that amazing phase",
    "At that perfect moment",
    "When everything felt right"
  ];
  if (Math.random() > 0.5) {
    return `${selectRandom(references)}, ${message.toLowerCase()}`;
  }
  return message;
}

function personalizeMessage(message, userInPhoto) {
  const touches = [
    "I'll always remember this.",
    "Me in my element.",
    "This was such a me moment.",
    "Feeling nostalgic about this.",
    "This captures my essence perfectly."
  ];
  if (userInPhoto && Math.random() > 0.7) {
    return `${message} ${selectRandom(touches)}`;
  }
  return message;
}

// --------------- ANALYSIS FUNCTIONS ---------------

function analyzePhotoContext(persons, userCode, mediaItem) {
  const totalPeople = persons.length;
  const userInPhoto = persons.some(p => {
    const code = typeof p === 'string' ? p : p.code;
    return code === userCode;
  });

  const otherPersons = persons.filter(p => {
    const code = typeof p === 'string' ? p : p.code;
    return code !== userCode;
  });

  let relationshipDepth = 'casual';
  if (totalPeople === 1 && userInPhoto) relationshipDepth = 'personal';
  if (totalPeople === 2) relationshipDepth = 'close';
  if (totalPeople >= 5) relationshipDepth = 'community';

  const possibleEmotions = [];
  if (userInPhoto) possibleEmotions.push('proud', 'happy');
  if (otherPersons.length > 0) possibleEmotions.push('loving', 'grateful');
  if (totalPeople >= 3) possibleEmotions.push('nostalgic');

  return {
    totalPeople,
    userInPhoto,
    otherPersons,
    relationshipDepth,
    possibleEmotions,
    mediaItem
  };
}

function determineMessageType(analysis, configuredSentiment) {
  if (configuredSentiment !== 'auto') return configuredSentiment;

  const { totalPeople, userInPhoto } = analysis;
  if (totalPeople === 1 && userInPhoto) return 'reflection';
  if (totalPeople === 2) return userInPhoto ? 'celebration' : 'appreciation';
  if (totalPeople >= 3 && totalPeople <= 5) return 'celebration';
  if (totalPeople > 5) return 'nostalgic';
  return 'appreciation';
}

// --------------- CORE MESSAGE BUILDER ---------------

function buildMessage(analysis, messageType, config) {
  const { totalPeople, userInPhoto, otherPersons, possibleEmotions } = analysis;

  // Select pattern based on group size
  let pattern;
  if (totalPeople === 1) pattern = contextPatterns.solo;
  else if (totalPeople === 2) pattern = contextPatterns.duo;
  else if (totalPeople <= 5) pattern = contextPatterns.smallGroup;
  else pattern = contextPatterns.largeGroup;

  // Select framework template
  const frameworkTemplates = messageFrameworks[messageType] || messageFrameworks.appreciation;
  const template = config.customTemplate || frameworkTemplates[Math.floor(frameworkTemplates.length / 2)];

  // Build components with style/personality influence
  const personality = personalities[config.style] || personalities.casual;
  const components = {
    intro: selectRandom(pattern.intro),
    middle: selectRandom(pattern.middle),
    ending: selectRandom(pattern.ending),
    names: getNamesString(otherPersons, userInPhoto, config.currentUserName, config.useFullNames),
    emotion: selectRandom(possibleEmotions.length ? possibleEmotions : ['happy']),
    adj: selectRandom(personality.adjectives),
    verb: selectRandom(personality.verbs)
  };

  let message = template.replace(/{(\w+)}/g, (_, key) => components[key] || `{${key}}`).replace(/\s+/g, ' ').trim();

  // Add user context
  if (userInPhoto && config.includeCurrentUser) {
    message = personalizeMessage(message, userInPhoto);
  }

  // Add time context
  if (config.addTimeContext) {
    message = addTimeContext(message);
  }

  return message;
}

// --------------- ENHANCE FUNCTION ---------------

function enhanceMessage(message, analysis, config) {
  const { totalPeople, userInPhoto, otherPersons } = analysis;

  // Add emoji
  if (config.includeEmojis !== false) {
    const emoji = getRandomEmoji(config.style, totalPeople, userInPhoto);
    if (!message.endsWith(emoji)) message += ` ${emoji}`;
  }

  // Add hashtags
  if (config.includeHashtags) {
    const hashtagList = generateHashtags(otherPersons, totalPeople, userInPhoto, config.style);
    const hashtagStr = hashtagList.map(t => `#${t}`).join(' ');
    if (message.length + hashtagStr.length + 1 <= (config.maxLength || 280)) {
      message += ` ${hashtagStr}`;
    }
  }

  // Add location hint
  if (config.addLocationHint && analysis.mediaItem?.location) {
    message += ` 📍 ${analysis.mediaItem.location}`;
  }

  // Truncate if needed
  if (config.maxLength && message.length > config.maxLength) {
    message = message.substring(0, config.maxLength - 3) + '...';
  }

  return message;
}

// --------------- SPECIAL STYLES (STORY, DETAILED, SIMPLE) ---------------

function generateStoryStyle(analysis, config) {
  const { totalPeople, otherPersons, userInPhoto } = analysis;
  const storyBases = {
    solo: [
      "In this moment, time stood still. A memory frozen forever, waiting to be revisited.",
      "There's something about this photo that tells a story words never could.",
      "This wasn't just a picture; it was a feeling, a moment, a memory etched in time."
    ],
    duo: [
      "Two souls, one frame. A story of friendship that photographs can only begin to tell.",
      "Some moments are too precious for words. This photo captures a bond that speaks volumes.",
      "Together in this moment, creating a memory that would become part of their story forever."
    ],
    group: [
      "Every person in this frame has a story, and together they created this beautiful chapter.",
      "This wasn't just a gathering; it was where stories intersected and memories were born.",
      "Look closely and you'll see not just faces, but stories waiting to be told."
    ]
  };
  let storyType = totalPeople === 1 ? 'solo' : totalPeople === 2 ? 'duo' : 'group';
  let story = selectRandom(storyBases[storyType]);

  if (otherPersons.length > 0 && otherPersons.length <= 3) {
    const names = getNamesString(otherPersons, userInPhoto, config.currentUserName, true);
    story += ` Featuring ${names}.`;
  }
  return story;
}

function generateDetailedStyle(analysis, config) {
  const { totalPeople, otherPersons, userInPhoto } = analysis;
  let desc = "";

  if (totalPeople === 1) {
    if (userInPhoto) {
      desc = "A personal moment of reflection";
    } else {
      const name = getNamesString(otherPersons, userInPhoto, config.currentUserName, true) || 'Someone';
      desc = `${name} in a moment of quiet contemplation`;
    }
  } else if (totalPeople === 2) {
    desc = "Two friends sharing a special connection";
  } else if (totalPeople <= 5) {
    desc = `A close-knit group of ${totalPeople} friends`;
  } else {
    desc = `A vibrant gathering of ${totalPeople} amazing individuals`;
  }

  if (otherPersons.length > 0 && otherPersons.length <= 3) {
    const names = getNamesString(otherPersons, userInPhoto, config.currentUserName, true);
    desc += userInPhoto ? ` with ${names}` : ` featuring ${names}`;
  }

  const emotions = ['joyful', 'memorable', 'heartwarming', 'unforgettable'];
  desc += `. A truly ${selectRandom(emotions)} memory`;

  const closings = [
    "that will be cherished forever.",
    "captured in this single frame.",
    "that tells a beautiful story.",
    "preserved for years to come."
  ];
  desc += ` ${selectRandom(closings)}`;
  return desc;
}

function generateSimpleStyle(analysis, config) {
  const { totalPeople, otherPersons, userInPhoto } = analysis;
  if (totalPeople === 0) return "A beautiful moment captured 📸";

  if (userInPhoto && totalPeople === 1) return "That's me! Living in the moment 😊";

  if (otherPersons.length === 1) {
    const name = getNamesString(otherPersons, false, '', true);
    return userInPhoto ? `Me with ${name} 👫` : `${name} looking great!`;
  }
  if (otherPersons.length === 2) {
    const names = getNamesString(otherPersons, false, '', true);
    return userInPhoto ? `Hanging with ${names} 👥` : `${names} together!`;
  }
  return `${totalPeople} amazing people in one frame! 🎉`;
}

// ========================================================
// MAIN MERGED FUNCTION: generateAIPhotoMessage
// ========================================================

/**
 * Generates an AI-like, context-aware message for a photo.
 *
 * @param {Object} mediaItem - Media object with `persons` array (and optional `location`, `alt`).
 * @param {Object} currentUser - User object with `code` and optionally `name`.
 * @param {Object} [options={}] - Generation options.
 * @param {'auto'|'positive'|'nostalgic'|'celebratory'|'reflection'|'missing'|'appreciation'} [options.sentiment='auto'] - Primary sentiment.
 * @param {'casual'|'formal'|'funny'|'romantic'|'nostalgic'|'story'|'detailed'|'simple'} [options.style='casual'] - Tone / style.
 * @param {'simple'|'medium'|'complex'} [options.complexity='medium'] - Message complexity (ignored for story/detailed/simple styles).
 * @param {boolean} [options.includeNames=true] - Include person names.
 * @param {boolean} [options.useFullNames=true] - Use full names (vs. codes).
 * @param {boolean} [options.includeCurrentUser=true] - Personalize for current user.
 * @param {boolean} [options.addLocationHint=false] - Add location if available.
 * @param {boolean} [options.addTimeContext=true] - Add time reference.
 * @param {boolean} [options.includeEmojis=true] - Append emoji.
 * @param {boolean} [options.includeHashtags=true] - Append hashtags.
 * @param {number} [options.maxLength=280] - Maximum message length.
 * @param {string} [options.customTemplate=null] - Override the template.
 * @param {boolean} [options.debug=false] - Debug logging.
 *
 * @returns {Object} { message, rawMessage, analysis, metadata }
 */
export function generateAIPhotoMessage(mediaItem, currentUser, options = {}) {
  const config = {
    sentiment: 'auto',
    style: 'casual',
    complexity: 'medium',
    includeNames: true,
    useFullNames: true,
    includeCurrentUser: true,
    addLocationHint: false,
    addTimeContext: true,
    includeEmojis: true,
    includeHashtags: true,
    maxLength: 280,
    customTemplate: null,
    debug: false,
    ...options
  };

  const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
  const userCode = currentUser?.code;
  const userName = currentUser?.name;
  config.currentUserName = userName; // for helper functions

  // Analyze photo context
  const analysis = analyzePhotoContext(persons, userCode, mediaItem);

  // For special styles that bypass the standard template pipeline
  if (config.style === 'story') {
    const raw = generateStoryStyle(analysis, config);
    const enhanced = enhanceMessage(raw, analysis, config);
    return {
      message: enhanced,
      rawMessage: raw,
      analysis: {
        totalPeople: analysis.totalPeople,
        userInPhoto: analysis.userInPhoto,
        personCount: analysis.otherPersons.length,
        sentiment: 'nostalgic'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        length: enhanced.length,
        style: 'story'
      }
    };
  }

  if (config.style === 'detailed') {
    const raw = generateDetailedStyle(analysis, config);
    const enhanced = enhanceMessage(raw, analysis, config);
    return {
      message: enhanced,
      rawMessage: raw,
      analysis: {
        totalPeople: analysis.totalPeople,
        userInPhoto: analysis.userInPhoto,
        personCount: analysis.otherPersons.length,
        sentiment: 'reflective'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        length: enhanced.length,
        style: 'detailed'
      }
    };
  }

  if (config.style === 'simple') {
    const raw = generateSimpleStyle(analysis, config);
    const enhanced = enhanceMessage(raw, analysis, config);
    return {
      message: enhanced,
      rawMessage: raw,
      analysis: {
        totalPeople: analysis.totalPeople,
        userInPhoto: analysis.userInPhoto,
        personCount: analysis.otherPersons.length,
        sentiment: 'casual'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        length: enhanced.length,
        style: 'simple'
      }
    };
  }

  // Standard pipeline for style: casual, formal, funny, romantic, nostalgic
  const messageType = determineMessageType(analysis, config.sentiment);
  const rawMessage = buildMessage(analysis, messageType, config);
  const enhancedMessage = enhanceMessage(rawMessage, analysis, config);

  return {
    message: enhancedMessage,
    rawMessage,
    analysis: {
      totalPeople: analysis.totalPeople,
      userInPhoto: analysis.userInPhoto,
      personCount: analysis.otherPersons.length,
      sentiment: analysis.possibleEmotions[0] || 'happy'
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      length: enhancedMessage.length,
      style: config.style,
      complexity: config.complexity,
      messageType
    }
  };
}

// --------------- REWORKED EXPORTED FUNCTIONS ---------------

/**
 * Generates a batch of varied AI messages for multiple media items.
 * Uses different styles and sentiments automatically for diversity.
 *
 * @param {Object[]} mediaArray - Array of media items.
 * @param {Object} currentUser - Current user.
 * @param {number} [count=5] - Number of messages to generate.
 * @returns {Object[]} Array of results (same structure as single message).
 */
export function generateBatchMessages(mediaArray, currentUser, count = 5) {
  const styles = ['casual', 'nostalgic', 'story', 'detailed', 'funny'];
  const sentiments = ['auto', 'celebratory', 'reflection', 'missing'];
  const results = [];
  const shuffled = [...mediaArray].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const media = shuffled[i];
    const style = styles[i % styles.length];
    const sentiment = sentiments[i % sentiments.length];

    const { message, analysis, metadata } = generateAIPhotoMessage(media, currentUser, {
      style,
      sentiment,
      includeEmojis: true,
      includeHashtags: i % 2 === 0,  // mix hashtags on/off
      addTimeContext: true
    });

    results.push({
      media: media.src || media.alt || 'media_' + i,
      message,
      style,
      sentiment,
      persons: analysis.personCount,
      userInPhoto: analysis.userInPhoto,
      metadata
    });
  }

  return results;
}

/**
 * Simple, quick message (calls the unified generator with 'simple' style).
 */
export function generateSimpleMessage(mediaItem = {}, currentUser = {}) {
  const result = generateAIPhotoMessage(mediaItem, currentUser, {
    style: 'simple',
    includeEmojis: true,
    includeHashtags: false,
    includeCurrentUser: true,
    useFullNames: false,
    addTimeContext: false,
    maxLength: 120
  });
  return result.message;
}

/**
 * Generates a narrative, storytelling caption (uses 'story' style).
 */
export function generateStoryCaption(mediaItem, currentUser) {
  const result = generateAIPhotoMessage(mediaItem, currentUser, { style: 'story' });
  return result.message;
}

/**
 * Generates a full paragraph description (uses 'detailed' style).
 */
export function generateDetailedDescription(mediaItem, currentUser) {
  const result = generateAIPhotoMessage(mediaItem, currentUser, { style: 'detailed' });
  return result.message;
}


export const generateIntelligentMessage = generateAIPhotoMessage;
 export const generatePhotoMessage = generateAIPhotoMessage;

// Export the main function and utilities
export default filterMediaByUser;

/**
 * Utility: Delay function (returns a promise that resolves after ms).
 *
 * @param {number} ms - Milliseconds to delay.
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
