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

export function  showMediaLoading(loadingContainer) {
    // Show loading container with proper classes
    if (loadingContainer) {
        loadingContainer.classList.add("is-visible", "is-loading");
        loadingContainer.setAttribute("aria-hidden", "false");
        loadingContainer.setAttribute("aria-live", "off");
    }
}

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
/**
 * ADVANCED MEDIA FILTER - Filters media based on logged-in user with advanced features
 *
 * @param {Array} media - Media array from JSON
 * @param {Object} authResult - Authentication result from password check
 * @param {{
 * includeVideos: boolean,       // Whether to include videos in results
 * includeImages: boolean,       // Whether to include images in results
 * sortBy: string,              // 'date', 'relevance', 'random', 'personsCount'
 * sortOrder: string,           // 'asc', 'desc'
 * shuffle: boolean,            // Whether to shuffle results after sorting
 * limit: number,              // Limit number of results returned
 * returnAllOnError: boolean,    // Whether to return all media if there's an error with authResult
 * groupByPerson: boolean,       // Whether to group results by person combinations
 * excludeSolo: boolean,        // Whether to exclude solo photos (with only one person)
 * onlyWithPerson: string|null, // If set, only include media that has this person code
 * minPersons: number,          // Minimum number of persons in media to include
 * maxPersons: number|null,       // Maximum number of persons in media to include
 * enhanceMetadata: boolean,     // Whether to add enhanced metadata (relevanceScore, personCount, etc.)
 * generateThumbnails: boolean,  // Whether to generate thumbnail URLs for media items
 * debug: boolean                // Whether to enable debug logging for the filtering process
 * }}
 * @returns {Array} Filtered and processed media array
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
    onlyWithPerson: null,    // Filter to only include media with specific person code
    excludeCodes: [],        // NEW: array of person codes to exclude entirely
    includeOnlyCodes: [],        // NEW: array of person codes to only inlcude (media should have just one of these codes to be inlcuded )
    minPersons: 1,
    maxPersons: null,
    enhanceMetadata: true,
    generateThumbnails: true,
    debug: false,
    ...options
  };

  // Validation
  if (!Array.isArray(media)) {
    console.warn('filterMediaByUser: media is not an array');
    return [];
  }

  if (!authResult || typeof authResult !== 'object') {
    console.warn('filterMediaByUser: authResult is missing or invalid');
    return config.returnAllOnError ? media : [];
  }

  const { accessLevel, code, name } = authResult;

  if (config.debug) {
    console.debug('🔍 Advanced Media Filter started:', {
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
      if (config.debug) console.warn('Personal access requested but no code provided');
      return [];
    }

    filteredMedia = filteredMedia.filter(item => {
      if (!Array.isArray(item.persons) || item.persons.length === 0) return false;
      return item.persons.some(person => {
        const personCode = typeof person === 'string' ? person : (person && person.code);
        return personCode === code;
      });
    });
  }

  // PHASE 2: Content type filtering (images / videos)
  filteredMedia = filteredMedia.filter(item => {
    const dataType = item['data-type'] || item.type || 'image';
    if (config.includeImages && config.includeVideos) return true;
    if (config.includeImages && dataType === 'image') return true;
    if (config.includeVideos && dataType === 'video') return true;
    return false;
  });

// PHASE 3: Only include items with specific person(s)
if (config.onlyWithPerson) {
  // Convert to array if it's just a string to support both formats
  const searchCodes = Array.isArray(config.onlyWithPerson)
    ? config.onlyWithPerson
    : [config.onlyWithPerson];

  filteredMedia = filteredMedia.filter(item => {
    if (!Array.isArray(item.persons)) return false;
    return item.persons.some(person => {
      const personCode = typeof person === 'string' ? person : (person && person.code);
      return searchCodes.includes(personCode);
    });
  });
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

  //  PHASE 3.6: only include items that contain just one of the specified codes (ie if the media has code A and B but we only want to include media with code A, then this media will be excluded because it has code B as well - this is useful for creating a "solo" collection for each person)
    if (config.includeOnlyCodes && config.includeOnlyCodes.length > 0) {
        filteredMedia = filteredMedia.filter(item => {
            if (!Array.isArray(item.persons)) return false;
            // Include item only if it contains at least one of the specified codes and does not contain any other codes
            const itemCodes = item.persons.map(person => typeof person === 'string' ? person : (person && person.code));
            const hasIncludedCode = itemCodes.some(code => config.includeOnlyCodes.includes(code));
            const hasExcludedCode = itemCodes.some(code => !config.includeOnlyCodes.includes(code));
            return hasIncludedCode && !hasExcludedCode;
        });

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
    console.debug('✅ Advanced Media Filter complete:', {
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
 * Generate thumbnail URL from main image URL
 * @param {string} src - Original image source URL
 * @returns {string} Thumbnail URL
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
 * Generate responsive srcset for images
 * @param {string} src - Original image source URL
 * @returns {string} Srcset attribute value
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
 * Generate alt text for images based on persons
 * @param {Object} mediaItem - Media item object
 * @param {string} userCode - Logged-in user's code
 * @param {string} userName - Logged-in user's name
 * @returns {Object} Media item with updated alt text
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
 * Group media by person combinations
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
 * Get media statistics for user
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
 * Create personalized media feed with recommendations
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
      onlyWithPerson: personCode,
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
 * Utility: Get current user info from localStorage
 * @returns {{code, name, isGraduand, accessLevel}|null}
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
 * ADVANCED INTELLIGENT MESSAGE GENERATOR
 * Creates human-like messages with context, sentiment, and personality
 */

// Context patterns for different scenarios
const contextPatterns = {
    // Based on number of people
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

// Emotion dictionary
const emotions = {
    happy: ["joyful", "ecstatic", "delighted", "overjoyed", "blissful", "elated"],
    nostalgic: ["sentimental", "wistful", "bittersweet", "melancholy", "yearning", "reminiscent"],
    loving: ["affectionate", "fond", "devoted", "caring", "tender", "warm"],
    proud: ["accomplished", "triumphant", "victorious", "achieving", "successful", "fulfilled"],
    grateful: ["thankful", "appreciative", "blessed", "fortunate", "privileged", "indebted"]
};

// Message frameworks
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

/**
 * Enhanced message generator with AI-like intelligence
 */
export function generateIntelligentMessage(mediaItem, currentUser, options = {}) {
    const config = {
        sentiment: 'auto', // 'auto', 'positive', 'nostalgic', 'celebratory'
        complexity: 'medium', // 'simple', 'medium', 'complex'
        includeNames: true,
        useFullNames: true,
        includeCurrentUser: true,
        addLocationHint: false,
        addTimeContext: true,
        ...options
    };

    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const userCode = currentUser?.code;
    const userName = currentUser?.name;

    // ANALYZE THE PHOTO CONTEXT
    const analysis = analyzePhotoContext(persons, userCode, mediaItem);

    // DETERMINE MESSAGE TYPE
    const messageType = determineMessageType(analysis, config.sentiment);

    // BUILD THE MESSAGE
    const message = buildMessage(analysis, messageType, config);

    // ENHANCE WITH EMOJIS AND HASHTAGS
    return enhanceMessage(message, analysis, config);
}

/**
 * Analyze photo context
 */
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

    // Calculate relationship depth
    let relationshipDepth = 'casual';
    if (totalPeople === 1 && userInPhoto) relationshipDepth = 'personal';
    if (totalPeople === 2) relationshipDepth = 'close';
    if (totalPeople >= 5) relationshipDepth = 'community';

    // Determine likely emotion
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

/**
 * Determine message type based on analysis
 */
function determineMessageType(analysis, configuredSentiment) {
    if (configuredSentiment !== 'auto') {
        return configuredSentiment;
    }

    const { totalPeople, userInPhoto, relationshipDepth } = analysis;

    if (totalPeople === 1 && userInPhoto) {
        return 'reflection';
    }

    if (totalPeople === 2) {
        return userInPhoto ? 'celebration' : 'appreciation';
    }

    if (totalPeople >= 3 && totalPeople <= 5) {
        return 'celebration';
    }

    if (totalPeople > 5) {
        return 'nostalgic';
    }

    return 'appreciation';
}

/**
 * @param {Object} mediaItem
 * @param {{code: string, name: string}} currentUser
 * @param {Object} options
 * @return {{message: string, template: *, scenario: string, style: string, persons: (string|*)[], userInPhoto: boolean, hashtags: *[], metadata: {length: *, charactersUsed: *, maxLength: number, language: string, generatedAt: string}}}
 */
export function generatePhotoMessage(mediaItem, currentUser , options = {}) {
    // Default options
    const config = {
        style: 'casual', // 'casual', 'formal', 'funny', 'romantic', 'nostalgic'
        includeEmojis: true,
        maxLength: 280,
        includeHashtags: true,
        includePhotoContext: true,
        language: 'en', // 'en', 'fr', 'es', etc.
        customTemplate: null,
        debug: false,
        ...options
    };

    // Extract persons from media item
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];

    // Extract current user info
    const userCode = currentUser?.code || null;
    const userName = currentUser?.name || null;

    // Classify persons
    const otherPersons = persons.filter(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        return personCode !== userCode;
    });

    const userInPhoto = persons.some(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        return personCode === userCode;
    });

    // Count
    const totalPersons = persons.length;
    const otherCount = otherPersons.length;

    if (config.debug) {
        console.debug('Message Generation:', {
            mediaItem: mediaItem.alt,
            persons,
            userInPhoto,
            userCode,
            userName,
            totalPersons,
            otherCount
        });
    }

    // PERSONALITY PROFILES (for different styles)
    const personalities = {
        casual: {
            tone: 'friendly',
            pronouns: ['I', 'we', 'you'],
            adjectives: ['amazing', 'great', 'fun', 'awesome', 'memorable'],
            verbs: ['remember', 'cherish', 'miss', 'love', 'enjoy']
        },
        formal: {
            tone: 'respectful',
            pronouns: ['one', 'we', 'individuals'],
            adjectives: ['significant', 'memorable', 'notable', 'precious', 'valuable'],
            verbs: ['recall', 'appreciate', 'value', 'treasure', 'commemorate']
        },
        funny: {
            tone: 'humorous',
            pronouns: ['we', 'you guys', 'y\'all'],
            adjectives: ['hilarious', 'epic', 'legendary', 'ridiculous', 'priceless'],
            verbs: ['crack up', 'laugh about', 'can\'t forget', 'still giggle about']
        },
        romantic: {
            tone: 'affectionate',
            pronouns: ['we', 'our', 'us'],
            adjectives: ['beautiful', 'magical', 'heartwarming', 'special', 'cherished'],
            verbs: ['treasure', 'hold dear', 'adore', 'love', 'embrace']
        },
        nostalgic: {
            tone: 'sentimental',
            pronouns: ['I', 'we', 'us'],
            adjectives: ['nostalgic', 'timeless', 'classic', 'unforgettable', 'golden'],
            verbs: ['reminisce', 'look back on', 'remember fondly', 'miss', 'cherish']
        }
    };

    // EMOJI LIBRARY
    const emojis = {
        casual: ['😊', '✨', '🌟', '💫', '🎉', '🤗', '👏', '🙌', '🎈'],
        formal: ['🎓', '📸', '🏛️', '👔', '📚'],
        funny: ['😂', '🤣', '😆', '🤪', '😜', '🎭', '🤹', '🎪'],
        romantic: ['💕', '❤️', '🥰', '😍', '💖', '🌹', '💐', '✨'],
        nostalgic: ['🕰️', '📜', '🎞️', '📷', '💭', '🌅', '🌇']
    };

    // HASHTAG TEMPLATES
    const hashtags = {
        general: ['Memories', 'Throwback', 'GoodTimes', 'Friends', 'Family'],
        style: {
            casual: ['FunTimes', 'GreatMemories', 'AwesomePeople'],
            formal: ['SignificantMoments', 'PreciousMemories', 'NotableOccasions'],
            funny: ['EpicTimes', 'LaughingSoHard', 'Unforgettable'],
            romantic: ['BeautifulMoments', 'Heartwarming', 'CherishedMemories'],
            nostalgic: ['Nostalgic', 'Flashback', 'TimelessMoments']
        }
    };

    // TEMPLATES FOR DIFFERENT SCENARIOS
    const templates = {
        // User alone in photo
        soloUser: [
            "Looking back at this moment with fond memories. {adj} times indeed!",
            "This brings back so many memories! What an {adj} journey it has been.",
            "Remembering this special moment. Truly {adj} to look back on.",
            "A {adj} memory that I will always {verb}. So grateful for this moment."
        ],

        // User with others
        userWithOthers: [
            "What {adj} times with {names}! {emoji} Miss you all!",
            "Remember when {names} and I {verb} this? {adj} memories! {emoji}",
            "So many {adj} memories with {names}! Can't wait to make more!",
            "Thinking of the {adj} times with {names}. Truly unforgettable! {emoji}"
        ],

        // User not in photo (others only)
        othersOnly: [
            "What a {adj} photo of {names}! {emoji} Beautiful memories!",
            "Look at {names} here! Such {adj} moments captured forever.",
            "This {adj} memory with {names} is priceless! {emoji}",
            "{names} looking {adj} as always! {emoji} Great times together!"
        ],

        // Group photos (3+ people)
        group: [
            "The {adj} squad! {names} {emoji} What an amazing group!",
            "Unforgettable times with these amazing people: {names} {emoji}",
            "Looking back at this {adj} moment with everyone. {names} {emoji}",
            "The {adj} crew! {names} {emoji} Memories that last a lifetime!"
        ],

        // Couple photos (2 people)
        couple: [
            "What a {adj} moment with {names}! {emoji} Beautiful times together.",
            "{names} - two peas in a pod! {adj} memories! {emoji}",
            "Special bond with {names} captured here. {adj} moments! {emoji}",
            "Thinking of {names} and this {adj} memory we share. {emoji}"
        ]
    };

    // SELECT TEMPLATE BASED ON SCENARIO
    let scenario;
    let template;

    if (userInPhoto) {
        if (totalPersons === 1) {
            scenario = 'soloUser';
        } else if (totalPersons === 2) {
            scenario = 'couple';
        } else if (totalPersons >= 3) {
            scenario = 'group';
        } else {
            scenario = 'userWithOthers';
        }
    } else {
        if (otherCount === 1) {
            scenario = 'othersOnly';
        } else if (otherCount === 2) {
            scenario = 'couple';
        } else if (otherCount >= 3) {
            scenario = 'group';
        } else {
            scenario = 'othersOnly';
        }
    }

    // Get personality for selected style
    const personality = personalities[config.style] || personalities.casual;

    // Select random template
    const scenarioTemplates = templates[scenario];
    const selectedTemplate = config.customTemplate ||
        scenarioTemplates[Math.floor(Math.random() * scenarioTemplates.length)];

    // GET NAMES STRING
    function getNamesString() {
        if (otherCount === 0) {
            return userName || 'me';
        }

        const names = otherPersons.map(person => {
            if (typeof person === 'string') {
                return person;
            }
            return person.name || person.code;
        });

        if (names.length === 1) {
            return names[0];
        } else if (names.length === 2) {
            return `${names[0]} and ${names[1]}`;
        } else {
            const last = names.pop();
            return `${names.join(', ')}, and ${last}`;
        }
    }

    // GET RANDOM ELEMENT
    function getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // REPLACE PLACEHOLDERS
    let message = selectedTemplate
        .replace('{names}', getNamesString())
        .replace('{adj}', getRandomElement(personality.adjectives))
        .replace('{verb}', getRandomElement(personality.verbs));

    // ADD EMOJI
    if (config.includeEmojis) {
        const emojiSet = emojis[config.style] || emojis.casual;
        const emoji = getRandomElement(emojiSet);
        if (!message.includes(emoji)) {
            message += ` ${emoji}`;
        }
    }

    // ADD PHOTO CONTEXT (if it's interesting)
    if (config.includePhotoContext && mediaItem.alt && !mediaItem.alt.startsWith('Memory:')) {
        const altWords = mediaItem.alt.split(' ').slice(0, 5).join(' ');
        if (altWords.length < 30) {
            message += ` ${altWords}`;
        }
    }

    // TRUNCATE IF TOO LONG
    if (message.length > config.maxLength) {
        message = message.substring(0, config.maxLength - 3) + '...';
    }

    // ADD HASHTAGS
    let finalMessage = message;
    let generatedHashtags = [];

    if (config.includeHashtags) {
        // Add style-specific hashtags
        const styleHashtags = hashtags.style[config.style] || hashtags.style.casual;
        generatedHashtags.push(...styleHashtags.slice(0, 2));

        // Add person-based hashtags (using codes)
        persons.forEach(person => {
            const personCode = typeof person === 'string' ? person : person.code;
            if (personCode && personCode.length <= 4) {
                generatedHashtags.push(`Person${personCode}`);
            }
        });

        // Add general hashtags
        generatedHashtags.push(...hashtags.general.slice(0, 2));

        // Remove duplicates and limit
        generatedHashtags = [...new Set(generatedHashtags)].slice(0, 5);

        // Append hashtags
        if (generatedHashtags.length > 0) {
            const hashtagString = generatedHashtags.map(tag => `#${tag}`).join(' ');
            if (finalMessage.length + hashtagString.length + 1 <= config.maxLength) {
                finalMessage += ` ${hashtagString}`;
            }
        }
    }

    // Return structured result
    return {
        message: finalMessage,
        template: selectedTemplate,
        scenario,
        style: config.style,
        persons: otherPersons.map(p => typeof p === 'string' ? p : p.code),
        userInPhoto,
        hashtags: generatedHashtags,
        metadata: {
            length: finalMessage.length,
            charactersUsed: finalMessage.length,
            maxLength: config.maxLength,
            language: config.language,
            generatedAt: new Date().toISOString()
        }
    };
}

/**
 * PERSONALIZED SHARE MESSAGE - Create share message based on media and platform
 * @param {Object} mediaItem - Media item
 * @param {Object} currentUser - Current user
 * @param {String} platform - 'facebook', 'twitter', 'pinterest', 'whatsapp'
 * @returns {Object} Platform-specific share content
 */
export function createShareMessage(mediaItem, currentUser = null, platform = 'twitter') {
    // Platform-specific constraints
    const platformConfig = {
        twitter: {
            maxLength: 280,
            includeLink: true,
            includeMedia: true,
            hashtagLimit: 3
        },
        facebook: {
            maxLength: 2000,
            includeLink: true,
            includeMedia: true,
            hashtagLimit: 5
        },
        pinterest: {
            maxLength: 500,
            includeLink: true,
            includeMedia: true,
            descriptionFocus: true,
            hashtagLimit: 5
        },
        whatsapp: {
            maxLength: 1000,
            includeLink: false,
            includeMedia: false,
            personalStyle: true,
            hashtagLimit: 0
        },
        instagram: {
            maxLength: 2200,
            includeLink: false,
            includeMedia: true,
            hashtagLimit: 30
        }
    };

    const config = platformConfig[platform] || platformConfig.twitter;

    // Generate base message
    const style = platform === 'whatsapp' ? 'casual' :
        platform === 'pinterest' ? 'romantic' : 'funny';

    const baseMessage = generatePhotoMessage(mediaItem, currentUser, {
        style,
        includeEmojis: true,
        includeHashtags: config.hashtagLimit > 0,
        maxLength: config.maxLength - 100 // Leave space for URL
    });

    // Build final message
    let finalMessage = baseMessage.message;

    // Add URL if needed
    const currentUrl = window.location.href;
    if (config.includeLink && currentUrl) {
        finalMessage += ` ${currentUrl}`;
    }

    // Platform-specific adjustments
    if (platform === 'pinterest' && mediaItem.alt) {
        finalMessage = `${mediaItem.alt}. ${finalMessage}`;
    }

    if (platform === 'instagram') {
        // Instagram likes lots of hashtags
        const extraHashtags = ['PhotoOfTheDay', 'MemoryLane', 'ThrowbackThursday', 'FlashbackFriday'];
        const hashtags = [...baseMessage.hashtags, ...extraHashtags].slice(0, config.hashtagLimit);
        if (hashtags.length > 0) {
            finalMessage += `\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`;
        }
    }

    // Truncate to platform limit
    if (finalMessage.length > config.maxLength) {
        finalMessage = finalMessage.substring(0, config.maxLength - 3) + '...';
    }

    return {
        text: finalMessage,
        url: config.includeLink ? currentUrl : null,
        mediaUrl: config.includeMedia ? mediaItem.src : null,
        platform,
        metadata: baseMessage.metadata
    };
}
/**
 * Build the message
 */
function buildMessage(analysis, messageType, config) {
    const { totalPeople, userInPhoto, otherPersons } = analysis;

    // GET NAMES
    const names = getFormattedNames(otherPersons, config.useFullNames);

    // SELECT PATTERN BASED ON GROUP SIZE
    let pattern;
    if (totalPeople === 1) pattern = contextPatterns.solo;
    else if (totalPeople === 2) pattern = contextPatterns.duo;
    else if (totalPeople <= 5) pattern = contextPatterns.smallGroup;
    else pattern = contextPatterns.largeGroup;

    // SELECT FRAMEWORK
    const fram_getCurrentMediaDataework = selectFramework(messageType, config.complexity);

    // BUILD COMPONENTS
    const components = {
        intro: selectRandom(pattern.intro),
        middle: selectRandom(pattern.middle),
        ending: selectRandom(pattern.ending),
        names: names,
        emotion: selectRandom(analysis.possibleEmotions)
    };

    // APPLY TEMPLATE
    let message = applyTemplate(framework, components);

    // ADD USER CONTEXT
    if (userInPhoto && config.includeCurrentUser) {
        message = personalizeMessage(message, config);
    }

    // ADD TIME CONTEXT
    if (config.addTimeContext) {
        message = addTimeContext(message);
    }

    return message;
}

/**
 * Get formatted names
 */
function getFormattedNames(persons, useFullNames) {
    if (persons.length === 0) return '';

    const names = persons.map(person => {
        if (typeof person === 'string') {
            return useFullNames ? person : person.substring(0, 1);
        }
        return useFullNames ? (person.name || person.code) : person.code;
    });

    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;

    const last = names.pop();
    return `${names.join(', ')}, and ${last}`;
}

/**
 * Select framework based on complexity
 */
function selectFramework(messageType, complexity) {
    const frameworks = messageFrameworks[messageType] || messageFrameworks.appreciation;

    if (complexity === 'simple') {
        return frameworks[0]; // Shortest
    } else if (complexity === 'complex') {
        return frameworks[frameworks.length - 1]; // Longest
    } else {
        return frameworks[Math.floor(frameworks.length / 2)]; // Medium
    }
}

/**
 * Apply template with components
 */
function applyTemplate(template, components) {
    return template
        .replace(/{(\w+)}/g, (match, key) => components[key] || match)
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Personalize message for current user
 */
function personalizeMessage(message, config) {
    const userPronouns = {
        male: ['he', 'him', 'his'],
        female: ['she', 'her', 'hers'],
        neutral: ['they', 'them', 'theirs']
    };

    // Add personal touch
    const personalTouches = [
        "I'll always remember this.",
        "Me in my element.",
        "This was such a me moment.",
        "Feeling nostalgic about this.",
        "This captures my essence perfectly."
    ];

    if (Math.random() > 0.7) { // 30% chance to add personal touch
        return `${message} ${selectRandom(personalTouches)}`;
    }

    return message;
}

/**
 * Add time context
 */
function addTimeContext(message) {
    const timeReferences = [
        "Back when life was simpler",
        "In those golden days",
        "During that amazing phase",
        "At that perfect moment",
        "When everything felt right"
    ];

    if (Math.random() > 0.6) { // 40% chance to add time context
        return `${selectRandom(timeReferences)}, ${message.toLowerCase()}`;
    }

    return message;
}

/**
 * Enhance message with emojis and hashtags
 */
function enhanceMessage(message, analysis, config) {
    const { totalPeople, userInPhoto, otherPersons } = analysis;

    // ADD EMOJIS
    const emoji = selectEmoji(totalPeople, userInPhoto);
    let enhanced = `${message} ${emoji}`;

    // ADD HASHTAGS
    if (config.includeNames) {
        const hashtags = generateHashtags(otherPersons, totalPeople, userInPhoto);
        enhanced += ` ${hashtags}`;
    }

    // ADD LOCATION HINT (if available in metadata)
    if (config.addLocationHint && analysis.mediaItem.location) {
        enhanced += ` 📍 ${analysis.mediaItem.location}`;
    }

    return {
        message: enhanced,
        rawMessage: message,
        analysis: {
            totalPeople,
            userInPhoto,
            personCount: otherPersons.length,
            sentiment: analysis.possibleEmotions[0]
        },
        metadata: {
            generatedAt: new Date().toISOString(),
            length: enhanced.length
        }
    };
}

/**
 * Select appropriate emoji
 */
function selectEmoji(totalPeople, userInPhoto) {
    if (totalPeople === 1) {
        return userInPhoto ? '✨' : '🌟';
    } else if (totalPeople === 2) {
        return userInPhoto ? '💖' : '👥';
    } else if (totalPeople <= 5) {
        return '👨‍👩‍👧‍👦';
    } else {
        return '🎉';
    }
}

/**
 * Generate relevant hashtags
 */
function generateHashtags(persons, totalPeople, userInPhoto) {
    const hashtags = [];

    // Person hashtags
    persons.forEach(person => {
        const code = typeof person === 'string' ? person : person.code;
        if (code && code.length <= 4) {
            hashtags.push(`#Person${code}`);
        }
    });

    // Size hashtags
    if (totalPeople === 1) hashtags.push('#Solo');
    else if (totalPeople === 2) hashtags.push('#Duo');
    else if (totalPeople <= 5) hashtags.push('#Squad');
    else hashtags.push('#GroupPhoto');

    // Sentiment hashtags
    if (userInPhoto) {
        hashtags.push('#MyMemory', '#Personal');
    } else {
        hashtags.push('#Friends', '#BeautifulPeople');
    }

    // General hashtags
    hashtags.push('#Memories', '#Throwback', '#GoodTimes');

    // Limit to 5 hashtags
    return hashtags.slice(0, 5).join(' ');
}

/**
 * Utility: Select random element from array
 */
function selectRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * STORYTELLER MODE - Creates narrative captions
 */
export function generateStoryCaption(mediaItem, currentUser) {
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const userCode = currentUser?.code;

    const stories = {
        // Single person stories
        solo: [
            "In this moment, time stood still. A memory frozen forever, waiting to be revisited.",
            "There's something about this photo that tells a story words never could.",
            "This wasn't just a picture; it was a feeling, a moment, a memory etched in time."
        ],

        // Two people stories
        duo: [
            "Two souls, one frame. A story of friendship that photographs can only begin to tell.",
            "Some moments are too precious for words. This photo captures a bond that speaks volumes.",
            "Together in this moment, creating a memory that would become part of their story forever."
        ],

        // Group stories
        group: [
            "Every person in this frame has a story, and together they created this beautiful chapter.",
            "This wasn't just a gathering; it was where stories intersected and memories were born.",
            "Look closely and you'll see not just faces, but stories waiting to be told."
        ]
    };

    const totalPeople = persons.length;
    let storyType;

    if (totalPeople === 1) storyType = 'solo';
    else if (totalPeople === 2) storyType = 'duo';
    else storyType = 'group';

    const baseStory = selectRandom(stories[storyType]);

    // Add personal names if available
    if (persons.length > 0 && persons.length <= 3) {
        const names = persons.map(p => typeof p === 'string' ? p : p.name).join(' and ');
        return `${baseStory} Featuring ${names}.`;
    }

    return baseStory;
}

/**
 * BATCH GENERATOR WITH VARIETY
 */
export function generateBatchMessages(mediaArray, currentUser, count = 5) {
    const styles = ['reflection', 'celebration', 'story', 'simple', 'detailed'];
    const results = [];

    // Shuffle media array
    const shuffled = [...mediaArray].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
        const media = shuffled[i];
        const style = styles[i % styles.length];

        let message;
        switch(style) {
            case 'story':
                message = generateStoryCaption(media, currentUser);
                break;
            case 'simple':
                message = generateSimpleCaption(media, currentUser);
                break;
            case 'detailed':
                message = generateDetailedDescription(media, currentUser);
                break;
            default:
                message = generateIntelligentMessage(media, currentUser, {
                    sentiment: style === 'celebration' ? 'celebratory' : 'auto'
                }).message;
        }

        results.push({
            media: media.src,
            message,
            style,
            persons: media.persons || []
        });
    }

    return results;
}

/**
 * Simple caption generator
 */
function generateSimpleCaption(mediaItem, currentUser) {
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const userCode = currentUser?.code;

    if (persons.length === 0) {
        return "A beautiful moment captured 📸";
    }

    const userInPhoto = persons.some(p => {
        const code = typeof p === 'string' ? p : p.code;
        return code === userCode;
    });

    const otherCount = persons.filter(p => {
        const code = typeof p === 'string' ? p : p.code;
        return code !== userCode;
    }).length;

    if (userInPhoto && otherCount === 0) {
        return "That's me! Living in the moment 😊";
    }

    if (otherCount === 1) {
        const person = persons.find(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code !== userCode;
        });
        const name = typeof person === 'string' ? person : person.name;
        return userInPhoto ? `Me with ${name} 👫` : `${name} looking great!`;
    }

    if (otherCount === 2) {
        const otherPersons = persons.filter(p => {
            const code = typeof p === 'string' ? p : p.code;
            return code !== userCode;
        });
        const names = otherPersons.map(p =>
            typeof p === 'string' ? p : p.name
        ).join(' & ');
        return userInPhoto ? `Hanging with ${names} 👥` : `${names} together!`;
    }

    return `${persons.length} amazing people in one frame! 🎉`;
}

/**
 * Detailed description generator
 */
function generateDetailedDescription(mediaItem, currentUser) {
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const totalPeople = persons.length;
    const userCode = currentUser?.code;

    const userInPhoto = persons.some(p => {
        const code = typeof p === 'string' ? p : p.code;
        return code === userCode;
    });

    const otherPersons = persons.filter(p => {
        const code = typeof p === 'string' ? p : p.code;
        return code !== userCode;
    });

    let description = "";

    // Start with context
    if (totalPeople === 1) {
        if (userInPhoto) {
            description = "A personal moment of reflection";
        } else {
            const person = persons[0];
            const name = typeof person === 'string' ? person : person.name;
            description = `${name} in a moment of quiet contemplation`;
        }
    } else if (totalPeople === 2) {
        description = "Two friends sharing a special connection";
    } else if (totalPeople <= 5) {
        description = `A close-knit group of ${totalPeople} friends`;
    } else {
        description = `A vibrant gathering of ${totalPeople} amazing individuals`;
    }

    // Add details about people
    if (otherPersons.length > 0 && otherPersons.length <= 3) {
        const names = otherPersons.map(p =>
            typeof p === 'string' ? p : p.name
        ).join(', ');
        description += userInPhoto ? ` with ${names}` : ` featuring ${names}`;
    }

    // Add emotional tone
    const emotions = ['joyful', 'memorable', 'heartwarming', 'unforgettable'];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    description += `. A truly ${emotion} memory`;

    // Add closing
    const closings = [
        "that will be cherished forever.",
        "captured in this single frame.",
        "that tells a beautiful story.",
        "preserved for years to come."
    ];
    description += ` ${selectRandom(closings)}`;

    return description;
}

/**
 * SOCIAL MEDIA OPTIMIZER
 */
export function optimizeForPlatform(message, platform) {
    const optimizations = {
        twitter: {
            maxLength: 280,
            hashtagStrategy: 'end', // 'end', 'middle', 'separate'
            linkPosition: 'end',
            emojiLimit: 3
        },
        instagram: {
            maxLength: 2200,
            hashtagStrategy: 'separate',
            emojiLimit: 5,
            lineBreaks: true
        },
        facebook: {
            maxLength: 2000,
            hashtagStrategy: 'minimal',
            emojiLimit: 2
        },
        linkedin: {
            maxLength: 3000,
            hashtagStrategy: 'end',
            emojiLimit: 1,
            professional: true
        }
    };

    const config = optimizations[platform] || optimizations.twitter;

    let optimized = message.message || message;

    // Truncate if too long
    if (optimized.length > config.maxLength) {
        optimized = optimized.substring(0, config.maxLength - 3) + '...';
    }

    // Adjust emojis
    if (config.emojiLimit) {
        const emojiRegex = /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu;
        const emojis = optimized.match(emojiRegex) || [];
        if (emojis.length > config.emojiLimit) {
            optimized = optimized.replace(emojiRegex, (match, index) => {
                return index < config.emojiLimit ? match : '';
            });
        }
    }

    // Format for platform
    if (platform === 'instagram' && config.lineBreaks) {
        optimized = optimized.replace(/\. /g, '.\n\n');
    }

    if (platform === 'linkedin' && config.professional) {
        optimized = optimized.replace(/[😊😂🤣]/g, '');
    }

    return optimized;
}
/**
 * Generates a quick, simple caption for photos
 * Used for tooltips and quick displays
 */
export function generateQuickCaption(mediaItem, currentUser) {
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const userCode = currentUser?.code;

    if (persons.length === 0) {
        return "A beautiful memory ✨";
    }

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
        return userInPhoto ? `With ${name} 😊` : `${name} looking great!`;
    }

    if (otherPersons.length === 2) {
        const names = otherPersons.map(p =>
            typeof p === 'string' ? p : (person.name || person.code)
        ).join(' & ');
        return userInPhoto ? `Hanging with ${names} 👥` : `${names} together!`;
    }

    return `${persons.length} amazing people 📸`;
}

/**
 * Simple message generator for social sharing
 */
export function generateSimpleMessage(mediaItem =[''], currentUser ={}) {
    const persons = Array.isArray(mediaItem.persons) ? mediaItem.persons : [];
    const userCode = currentUser?.code;

    if (persons.length === 0) {
        return "Beautiful memory captured forever ✨";
    }

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

    return `${persons.length-1} amazing people in one frame! 📸`;
}

// Export the main function and utilities
export default filterMediaByUser;
  /**
   * Utility: Delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
