import kv from "@/lib/kv";
import logger from "@/lib/logger";
import {
  fetchBusuanziPagePV,
  fetchBusuanziSitePV,
  fetchBusuanziSiteUV,
} from "@/utils/busuanzi";

// Constants
export const EXPIRATION_TIME = 60 * 60 * 24 * 30 * 3; // 3 months in seconds

// Types
export interface SanitizedUrl {
  host: string;
  path: string;
}

/**
 * Sanitizes a URL path to ensure it's a valid web path
 * @param host The hostname
 * @param path The path
 * @returns A sanitized version of the host and path
 */
export function sanitizeUrlPath(host: string, path: string): SanitizedUrl {
  // Check if host is empty (which happens with file:// URLs)
  if (!host) {
    logger.warn(`Invalid host detected: empty host with path ${path}`);
    return { host: "invalid-host", path: "/invalid-path" };
  }
  
  // Check if path starts with a drive letter (like /D:/)
  if (/^\/[A-Za-z]:\//.test(path)) {
    logger.warn(`Local file path detected: ${path}`);
    return { host, path: "/invalid-local-path" };
  }
  
  // Ensure path starts with a slash
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // Limit path length to prevent abuse
  if (path.length > 200) {
    logger.warn(`Path too long: ${path.substring(0, 50)}...`);
    path = path.substring(0, 200);
  }
  
  return { host, path };
}

/**
 * Get site unique visitor count from historical data
 * @param host The hostname
 * @param path The path
 * @returns The number of unique visitors
 */
export async function fetchSiteUVHistory(host: string, path: string): Promise<number> {
  try {
    const siteKey = `uv:busuanzi:site:${host}`;
    const siteUV = await kv.get(siteKey);
    
    if (!siteUV) {
      logger.debug(`Site UV not found for host: https://${host}${path}`);
      const siteUVData = await fetchBusuanziSiteUV(host, path);
      return Number(siteUVData || 0);
    } else {
      logger.debug(
        `Site UV found for host: https://${host}${path}, site_uv: ${siteUV}`
      );
      return Number(siteUV);
    }
  } catch (error) {
    logger.error(`Error getting site UV data: ${error}`);
    return 0;
  }
}

/**
 * Get site page view count from historical data
 * @param host The hostname
 * @param path The path
 * @returns The number of site page views
 */
export async function fetchSitePVHistory(host: string, path: string): Promise<number> {
  try {
    const siteKey = `pv:busuanzi:site:${host}`;
    const sitePV = await kv.get(siteKey);
    
    if (!sitePV) {
      logger.debug(`Site PV not found for host: https://${host}${path}`);
      const sitePVData = await fetchBusuanziSitePV(host);
      logger.debug(`Site PV data: ${sitePVData}, site_pv: ${sitePVData || 0}`);
      return Number(sitePVData || 0);
    } else {
      logger.debug(
        `Site PV found for host: https://${host}${path}, site_pv: ${sitePV}`
      );
      return Number(sitePV);
    }
  } catch (error) {
    logger.error(`Error getting site PV data: ${error}`);
    return 0;
  }
}

/**
 * Get page view count for a specific page from historical data
 * @param host The hostname
 * @param path The path
 * @returns The number of page views
 */
export async function fetchPagePVHistory(host: string, path: string): Promise<number> {
  try {
    const pageKey = `pv:busuanzi:page:${host}:${path}`;
    const pagePV = await kv.get(pageKey);
    logger.debug(`Page PV: ${pagePV}, page_key: ${pageKey}`);

    if (!pagePV) {
      logger.debug(`Page PV not found for host: https://${host}${path}`);
      const pagePVData = await fetchBusuanziPagePV(host, path);
      return Number(pagePVData || 0);
    } else {
      logger.debug(
        `Page PV found for host: https://${host}${path}, page_pv: ${pagePV}`
      );
      return Number(pagePV);
    }
  } catch (error) {
    logger.error(`Error getting page PV data: ${error}`);
    return 0;
  }
}

/**
 * Helper function to generate possible old path formats from a new sanitized path
 * @param path The new sanitized path (with leading slash)
 * @returns Array of possible old path formats
 */
function generateOldPathFormats(path: string): string[] {
  // Remove leading slash if it exists
  const withoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  // Generate variations
  const possibleFormats = [
    withoutLeadingSlash,                                  // /about -> about
    withoutLeadingSlash.replace(/\//g, ':'),             // /category/wordpress -> category:wordpress
    withoutLeadingSlash + ':',                           // /about -> about:
    withoutLeadingSlash.replace(/\//g, ':') + ':',       // /category/wordpress -> category:wordpress:
  ];
  
  // Handle index.html variations
  if (path.endsWith('/')) {
    possibleFormats.push(withoutLeadingSlash + 'index.html');  // /friends/ -> friends/index.html
    possibleFormats.push(withoutLeadingSlash.replace(/\/$/, '') + ':index.html'); // /friends/ -> friends:index.html
    possibleFormats.push(withoutLeadingSlash.replace(/\/$/, '') + ':index'); // /friends/ -> friends:index
    possibleFormats.push(withoutLeadingSlash.replace(/\/$/, '') + 'index'); // /friends/ -> friendsindex
  } else {
    possibleFormats.push(withoutLeadingSlash + '/index.html'); // /friends -> friends/index.html
    possibleFormats.push(withoutLeadingSlash + ':index.html'); // /friends -> friends:index.html
    possibleFormats.push(withoutLeadingSlash + ':index'); // /friends -> friends:index
    possibleFormats.push(withoutLeadingSlash + 'index'); // /friends -> friendsindex
  }
  
  // Handle special case for root path
  if (path === '/' || path === '') {
    possibleFormats.push('index');
    possibleFormats.push('index:');
    possibleFormats.push('index.html');
  }
  
  // Handle paths that might end with "index" already
  if (withoutLeadingSlash.endsWith('index')) {
    // Add variations without the index suffix
    const withoutIndex = withoutLeadingSlash.replace(/index$/, '');
    if (withoutIndex) {
      possibleFormats.push(withoutIndex.replace(/\/$/, ''));
      possibleFormats.push(withoutIndex.replace(/\/$/, '') + ':');
    }
  }
  
  // Remove duplicates using Array.filter instead of Set
  return possibleFormats.filter((value, index, self) => self.indexOf(value) === index);
}

/**
 * Temporary migration function to handle both old and new key formats for page PV
 * Handles various old path formats including colons instead of slashes
 * @param host The hostname
 * @param path The path (with leading slash in new format)
 * @returns The combined PV count from both old and new formats
 */
export async function migratePagePV(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components for the new format
    const sanitized = sanitizeUrlPath(host, path);
    const sanitizedHost = sanitized.host;
    const sanitizedPath = sanitized.path;
    
    // Create key for new format
    const newPageKey = `pv:local:page:${sanitizedHost}:${sanitizedPath}`;
    
    // Generate possible old format keys
    const oldPathFormats = generateOldPathFormats(sanitizedPath);
    const oldPageKeys = oldPathFormats.map(oldPath => `pv:local:page:${sanitizedHost}:${oldPath}`);
    const busuanziOldPageKeys = oldPathFormats.map(oldPath => `pv:busuanzi:page:${sanitizedHost}:${oldPath}`);
    
    logger.debug(`Checking new key format: ${newPageKey}`);
    logger.debug(`Checking old key formats: ${oldPageKeys.join(', ')}`);
    
    // Get value from new key
    const newPV = await kv.get(newPageKey);
    const newPVNum = Number(newPV || 0);
    
    // If new format already has data, return it
    if (newPVNum > 0) {
      logger.debug(`Found PV count in new format: ${newPVNum}`);
      return newPVNum;
    }
    
    // Check all old format keys
    for (const oldKey of [...oldPageKeys, ...busuanziOldPageKeys]) {
      const oldPV = await kv.get(oldKey);
      const oldPVNum = Number(oldPV || 0);
      
      if (oldPVNum > 0) {
        logger.info(`Found old format PV data (${oldPVNum}) at key: ${oldKey}, migrating to new format`);
        
        // Migrate data to new format
        await kv.set(newPageKey, oldPVNum);
        await kv.expire(newPageKey, EXPIRATION_TIME);
        
        // Optionally, clear the old key after migration
        await kv.del(oldKey);
        
        return oldPVNum;
      }
    }
    
    // No data found in any format
    logger.debug(`No PV data found in any format for: ${sanitizedHost}${sanitizedPath}`);
    return 0;
  } catch (error) {
    logger.error(`Error during PV migration: ${error}`);
    return 0;
  }
}

/**
 * Temporary function to increment page PV while checking both old and new key formats
 * Handles various old path formats including colons instead of slashes
 * @param host The hostname
 * @param path The path
 * @returns The updated page PV count
 */
export async function incrementPagePVWithMigration(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const sanitizedHost = sanitized.host;
    const sanitizedPath = sanitized.path;
    
    // Create key for new format
    const newPageKey = `pv:local:page:${sanitizedHost}:${sanitizedPath}`;
    const newBusuanziPageKey = `pv:busuanzi:page:${sanitizedHost}:${sanitizedPath}`;
    
    // Generate possible old format keys
    const oldPathFormats = generateOldPathFormats(sanitizedPath);
    const oldPageKeys = oldPathFormats.map(oldPath => `pv:local:page:${sanitizedHost}:${oldPath}`);
    const busuanziOldPageKeys = oldPathFormats.map(oldPath => `pv:busuanzi:page:${sanitizedHost}:${oldPath}`);
    
    logger.debug(`Incrementing PV with migration for: https://${sanitizedHost}${sanitizedPath}`);
    
    // Check if new format already has data
    const newPV = await kv.get(newPageKey);
    if (newPV) {
      // New format already has data, just increment it
      const pagePV = await kv.incr(newPageKey);
      await Promise.all([
        kv.expire(newPageKey, EXPIRATION_TIME),
        kv.expire(newBusuanziPageKey, EXPIRATION_TIME)
      ]);
      
      logger.debug(`Page PV updated for new format: ${pagePV}`);
      return pagePV;
    }
    
    // Check all old format keys
    for (const oldKey of [...oldPageKeys, ...busuanziOldPageKeys]) {
      const oldPV = await kv.get(oldKey);
      const oldPVNum = Number(oldPV || 0);
      
      if (oldPVNum > 0) {
        logger.info(`Found old format PV data (${oldPVNum}) at key: ${oldKey}, migrating to new format`);
        
        // Set the new key with the old value + 1
        const newPVNum = oldPVNum + 1;
        await kv.set(newPageKey, newPVNum);
        
        // Optionally, clear the old key after migration
        await kv.del(oldKey);
        
        await Promise.all([
          kv.expire(newPageKey, EXPIRATION_TIME),
          kv.expire(newBusuanziPageKey, EXPIRATION_TIME)
        ]);
        
        return newPVNum;
      }
    }
    
    // No old data found, just increment the new format
    const pagePV = await kv.incr(newPageKey);
    await Promise.all([
      kv.expire(newPageKey, EXPIRATION_TIME),
      kv.expire(newBusuanziPageKey, EXPIRATION_TIME)
    ]);
    
    logger.debug(`Page PV updated for new format: ${pagePV}`);
    return pagePV;
  } catch (error) {
    logger.error(`Error incrementing page PV with migration: ${error}`);
    return 0;
  }
}

/**
 * Increment and return page view count
 * @param host The hostname
 * @param path The path
 * @returns The updated page view count
 */
export async function incrementPagePV(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    host = sanitized.host;
    path = sanitized.path;
    
    logger.debug(`Updating page PV for host: https://${host}${path}`);
    const pageKey = `pv:local:page:${host}:${path}`;
    const busuanziPageKey = `pv:busuanzi:page:${host}:${path}`;

    const pagePV = await kv.incr(pageKey);
    logger.debug(
      `Page PV updated for host: https://${host}${path}, page_pv: ${pagePV}`,
    );

    await Promise.all([
      kv.expire(pageKey, EXPIRATION_TIME),
      kv.expire(busuanziPageKey, EXPIRATION_TIME),
    ]);

    return pagePV;
  } catch (error) {
    logger.error(`Error updating page PV: ${error}`);
    return 0;
  }
}

/**
 * Increment and return site page view count
 * @param host The hostname
 * @returns The updated site page view count
 */
export async function incrementSitePV(host: string): Promise<number> {
  try {
    // Sanitize the host
    const sanitized = sanitizeUrlPath(host, "");
    host = sanitized.host;
    
    logger.debug(`Updating site PV for host: https://${host}`);
    const siteKey = `pv:local:site:${host}`;
    const busuanziSiteKey = `pv:busuanzi:site:${host}`;

    const sitePV = await kv.incr(siteKey);
    logger.debug(`Site PV updated for host: https://${host}, site_pv: ${sitePV}`);

    await Promise.all([
      kv.expire(siteKey, EXPIRATION_TIME),
      kv.expire(busuanziSiteKey, EXPIRATION_TIME),
    ]);

    return sitePV;
  } catch (error) {
    logger.error(`Error updating site PV: ${error}`);
    return 0;
  }
}

/**
 * Record unique visitor and return updated count
 * @param host The hostname
 * @param ip The visitor's IP address
 * @returns The updated unique visitor count
 */
export async function recordSiteUV(host: string, ip: string): Promise<number> {
  try {
    // Sanitize the host
    const sanitized = sanitizeUrlPath(host, "");
    host = sanitized.host;
    
    logger.debug(`Updating site UV for host: https://${host}`);
    const siteKey = `uv:local:site:${host}`;
    const busuanziSiteKey = `uv:busuanzi:site:${host}`;

    const siteUVKey = await kv.sadd(siteKey, ip);
    const siteUV = await kv.scard(siteKey);
    logger.debug(
      `Site UV updated for host: https://${host}, site_uv: ${siteUV}, site_uv_key: ${siteUVKey}`,
    );

    await Promise.all([
      kv.expire(siteKey, EXPIRATION_TIME),
      kv.expire(busuanziSiteKey, EXPIRATION_TIME),
    ]);

    return siteUV;
  } catch (error) {
    logger.error(`Error updating site UV: ${error}`);
    return 0;
  }
} 