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
/**
 * ADVANCED MEDIA FILTER - Filters media based on logged-in user with advanced features
 * 
 * @param {Array} media - Media array from JSON
 * @param {Object} authResult - Authentication result from password check
 * @param {Object} options - Filtering options
 * @returns {Array} Filtered and processed media array
 */
export function filterMediaByUser(media, authResult, options = {}) {
  // Default options
  const config = {
    includeVideos: true,
    includeImages: true,
    sortBy: 'date', // 'date', 'relevance', 'random', 'personsCount'
    sortOrder: 'desc', // 'asc', 'desc'
    shuffle: false,
    limit: null,
    groupByPerson: false,
    excludeSolo: false,
    onlyWithPerson: null, // Filter to only include media with specific person code
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
    // Return empty array or all media based on your preference
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
  
  // GENERAL access (accessLevel > 50) → show everything
  const hasGeneralAccess = accessLevel && accessLevel > 50;
  
  if (!hasGeneralAccess) {
    // PERSONAL access → filter by user code
    if (!code) {
      if (config.debug) console.warn('Personal access requested but no code provided');
      return [];
    }

    filteredMedia = filteredMedia.filter(item => {
      // Skip if no persons array
      if (!Array.isArray(item.persons) || item.persons.length === 0) {
        if (config.debug) console.debug('Item excluded - no persons array:', item.src);
        return false;
      }

      // Check if user's code is in the persons list
      const hasAccess = item.persons.some(person => {
        if (typeof person === 'string') {
          return person === code;
        } else if (person && person.code) {
          return person.code === code;
        }
        return false;
      });

      if (!hasAccess && config.debug) {
        console.debug(`Item excluded - code ${code} not found in:`, 
          item.persons.map(p => typeof p === 'string' ? p : p.code)
        );
      }

      return hasAccess;
    });
  }

  if (config.debug) {
    console.debug('Phase 1 - Access filtering complete:', {
      originalCount: media.length,
      accessibleCount: filteredMedia.length,
      hasGeneralAccess
    });
  }

  // PHASE 2: Content type filtering
  filteredMedia = filteredMedia.filter(item => {
    const dataType = item['data-type'] || item.type || 'image';
    
    if (config.includeImages && config.includeVideos) {
      return true;
    }
    
    if (config.includeImages && dataType === 'image') {
      return true;
    }
    
    if (config.includeVideos && dataType === 'video') {
      return true;
    }
    
    return false;
  });

  // PHASE 3: Person-based filtering (if specified)
  if (config.onlyWithPerson) {
    filteredMedia = filteredMedia.filter(item => {
      if (!Array.isArray(item.persons)) return false;
      
      return item.persons.some(person => {
        const personCode = typeof person === 'string' ? person : person.code;
        return personCode === config.onlyWithPerson;
      });
    });
  }

  // PHASE 4: Group size filtering
  filteredMedia = filteredMedia.filter(item => {
    const personCount = Array.isArray(item.persons) ? item.persons.length : 0;
    
    // Exclude solo photos if configured
    if (config.excludeSolo && personCount <= 1) {
      return false;
    }
    
    // Min persons check
    if (personCount < config.minPersons) {
      return false;
    }
    
    // Max persons check
    if (config.maxPersons !== null && personCount > config.maxPersons) {
      return false;
    }
    
    return true;
  });

  // PHASE 5: Enhance metadata
  if (config.enhanceMetadata) {
    filteredMedia = filteredMedia.map((item, index) => {
      const enhanced = { ...item };
      
      // Add unique ID
      enhanced.id = `media_${code || 'guest'}_${index}_${Date.now()}`;
      
      // Calculate relevance score (based on how many persons match)
      if (hasGeneralAccess) {
        enhanced.relevanceScore = 100;
      } else {
        const personCodes = enhanced.persons
          ? enhanced.persons.map(p => typeof p === 'string' ? p : p.code)
          : [];
        enhanced.relevanceScore = personCodes.includes(code) ? 90 : 10;
      }
      
      // Add person count
      enhanced.personCount = Array.isArray(enhanced.persons) ? enhanced.persons.length : 0;
      
      // Generate thumbnail if not present
      if (config.generateThumbnails && !enhanced.thumb) {
        enhanced.thumb = generateThumbnailUrl(enhanced.src);
      }
      
      // Add user-specific alt text
      if (!enhanced.alt) {
        enhanced.alt = generateAltText(enhanced, code, name);
      }
      
      // Add responsive srcset if not present
      if (!enhanced.srcset && enhanced.src) {
        enhanced.srcset = generateResponsiveSrcset(enhanced.src);
      }
      
      // Add sorting metadata
      enhanced.sortDate = enhanced.date || new Date(2023, 0, index + 1).toISOString();
      enhanced.sortPersons = enhanced.personCount;
      
      return enhanced;
    });
  }

  // PHASE 6: Sorting
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
      
      if (config.sortOrder === 'desc') {
        return valueB - valueA;
      } else {
        return valueA - valueB;
      }
    });
  }

  // PHASE 7: Shuffling (if specified, overrides sorting)
  if (config.shuffle && filteredMedia.length > 0) {
    filteredMedia = [...filteredMedia].sort(() => Math.random() - 0.5);
  }

  // PHASE 8: Limiting
  if (config.limit && filteredMedia.length > config.limit) {
    filteredMedia = filteredMedia.slice(0, config.limit);
  }

  // PHASE 9: Grouping (optional)
  if (config.groupByPerson && filteredMedia.length > 0) {
    const grouped = groupMediaByPerson(filteredMedia, code);
    return grouped;
  }

  if (config.debug) {
    console.debug('✅ Advanced Media Filter complete:', {
      finalCount: filteredMedia.length,
      sample: filteredMedia.slice(0, 3).map(m => ({
        src: m.src,
        persons: m.persons?.map(p => typeof p === 'string' ? p : p.code),
        relevance: m.relevanceScore
      }))
    });
  }

  return filteredMedia;
}

// HELPER FUNCTIONS

/**
 * Generate thumbnail URL from main image URL
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
