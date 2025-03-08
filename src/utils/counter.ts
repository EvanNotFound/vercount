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
  
  // Normalize index files to root path
  if (/^\/(index|index\.html|index\.htm)$/.test(path)) {
    path = '/';
  }
  
  // Remove trailing slash except for root path
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  
  // Normalize paths ending with /index, /index.html, or /index.htm
  if (/\/index(\.html|\.htm)?$/.test(path)) {
    path = path.replace(/\/index(\.html|\.htm)?$/, '');
    // If we removed everything, ensure we have at least the root path
    if (path === '') {
      path = '/';
    }
  }
  
  // Limit path length to prevent abuse
  if (path.length > 200) {
    logger.warn(`Path too long: ${path.substring(0, 50)}...`);
    path = path.substring(0, 200);
  }
  
  return { host, path };
}

/**
 * Calculate the total UV count by combining the set cardinality with any manual adjustment
 * @param hostSanitized The sanitized hostname
 * @returns An object containing the set count, adjustment value, and total UV count
 */
export async function calculateTotalUV(hostSanitized: string): Promise<{ setCount: number; adjustment: number; total: number; busuanzi: number }> {
  const siteKey = `uv:local:site:${hostSanitized}`;
  const siteUVAdjustKey = `uv:adjust:site:${hostSanitized}`;
  const busuanziSiteKey = `uv:busuanzi:site:${hostSanitized}`;
  
  // Execute Redis operations in parallel
  const [siteUVSetCount, siteUVAdjust, busuanziSiteUV] = await Promise.all([
    kv.scard(siteKey),
    kv.get(siteUVAdjustKey),
    kv.get(busuanziSiteKey),
  ]);
  
  // Combine the set cardinality with the manual adjustment
  const totalUV = Number(siteUVSetCount || 0) + Number(siteUVAdjust || 0);
  
  return {
    setCount: Number(siteUVSetCount || 0),
    adjustment: Number(siteUVAdjust || 0),
    busuanzi: Number(busuanziSiteUV || 0),
    total: totalUV
  };
}

/**
 * Get site unique visitor count from historical data
 * @param host The hostname
 * @param path The path
 * @returns The number of unique visitors
 */
export async function fetchSiteUVHistory(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;
    
    // Calculate total UV using the utility function
    const { setCount, adjustment, total, busuanzi } = await calculateTotalUV(hostSanitized);
    
    if (!setCount) {
      logger.debug(`Site UV not found for host: https://${hostSanitized}${pathSanitized}`);
      const siteUVData = await fetchBusuanziSiteUV(hostSanitized, host);
      return Number(siteUVData || 0) + adjustment;
    } 
    logger.debug(
      `Site UV found for host: https://${hostSanitized}${pathSanitized}, site_uv: ${total}`
    );
    return total;
    
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
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;
    
    const siteKey = `pv:local:site:${hostSanitized}`;
    const busuanziSiteKey = `pv:busuanzi:site:${hostSanitized}`;
    const [sitePV, busuanziPV] = await Promise.all([
      kv.get(siteKey),
      kv.get(busuanziSiteKey),
    ]);
    
    if (!sitePV) {
      logger.debug(`Site PV not found for host: https://${hostSanitized}${pathSanitized}`);
      const sitePVData = await fetchBusuanziSitePV(hostSanitized, host);
      logger.debug(`Site PV data: ${sitePVData}, site_pv: ${sitePVData || 0}`);
      return Number(sitePVData || 0);
    } 
    logger.debug(
      `Site PV found for host: https://${hostSanitized}${pathSanitized}, site_pv: ${sitePV}`
    );
    return Number(sitePV) + Number(busuanziPV || 0);
    
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
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;
    
    const pageKey = `pv:local:page:${hostSanitized}:${pathSanitized}`;
    const busuanziPageKey = `pv:busuanzi:page:${hostSanitized}:${pathSanitized}`;
    const [pagePV, busuanziPV] = await Promise.all([
      kv.get(pageKey),
      kv.get(busuanziPageKey),
    ]);
    logger.debug(`Page PV: ${pagePV}, page_key: ${pageKey}`);

    if (!pagePV) {
      logger.debug(`Page PV not found for host: https://${hostSanitized}${pathSanitized}`);
      const pagePVData = await fetchBusuanziPagePV(hostSanitized, pathSanitized, host, path);
      return Number(pagePVData || 0);
    }
    logger.debug(
      `Page PV found for host: https://${hostSanitized}${pathSanitized}, page_pv: ${pagePV}`
    );
    return Number(pagePV) + Number(busuanziPV || 0);
    
  } catch (error) {
    logger.error(`Error getting page PV data: ${error}`);
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
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;
    
    logger.debug(`Updating page PV for host: https://${hostSanitized}${pathSanitized}`);
    const pageKey = `pv:local:page:${hostSanitized}:${pathSanitized}`;
    const busuanziPageKey = `pv:busuanzi:page:${hostSanitized}:${pathSanitized}`;

    const pagePV = await kv.incr(pageKey);
    logger.debug(
      `Page PV updated for host: https://${hostSanitized}${pathSanitized}, page_pv: ${pagePV}`,
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
    const hostSanitized = sanitized.host;
    
    logger.debug(`Updating site PV for host: https://${hostSanitized}`);
    const siteKey = `pv:local:site:${hostSanitized}`;
    const busuanziSiteKey = `pv:busuanzi:site:${hostSanitized}`;

    const sitePV = await kv.incr(siteKey);
    logger.debug(`Site PV updated for host: https://${hostSanitized}, site_pv: ${sitePV}`);

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
 * Record a unique visitor for a site
 * @param host The hostname
 * @param ip The visitor's IP address
 * @returns The updated unique visitor count
 */
export async function recordSiteUV(host: string, ip: string): Promise<number> {
  try {
    // Sanitize the host
    const sanitized = sanitizeUrlPath(host, "");
    const hostSanitized = sanitized.host;
    
    logger.debug(`Updating site UV for host: https://${hostSanitized}`);
    const siteKey = `uv:local:site:${hostSanitized}`;
    const busuanziSiteKey = `uv:busuanzi:site:${hostSanitized}`;
    const siteUVAdjustKey = `uv:adjust:site:${hostSanitized}`;

    // Add IP to the set
    await kv.sadd(siteKey, ip);
    
    // Calculate total UV using the utility function
    const { setCount, adjustment, total } = await calculateTotalUV(hostSanitized);
    
    logger.debug(
      `Site UV updated for host: https://${hostSanitized}, site_uv_set: ${setCount}, total_site_uv: ${total}`
    );

    // Set expiration for all keys in parallel
    await Promise.all([
      kv.expire(siteKey, EXPIRATION_TIME),
      kv.expire(busuanziSiteKey, EXPIRATION_TIME),
      kv.expire(siteUVAdjustKey, EXPIRATION_TIME),
    ]);

    return total;
  } catch (error) {
    logger.error(`Error updating site UV: ${error}`);
    return 0;
  }
}

/**
 * Update the UV adjustment value for a domain and recalculate the total UV
 * @param hostSanitized The sanitized hostname
 * @param newUvValue The new total UV value to set
 * @returns An object containing the updated set count, adjustment value, and total UV count
 */
export async function updateTotalUV(hostSanitized: string, newUvValue: number): Promise<{ setCount: number; adjustment: number; total: number }> {
  const siteKey = `uv:local:site:${hostSanitized}`;
  const siteUVAdjustKey = `uv:adjust:site:${hostSanitized}`;
  
  // Get the current set cardinality
  const setCount = await kv.scard(siteKey);
  
  // Calculate the adjustment needed to reach the desired total
  const requiredAdjustment = Math.max(0, newUvValue - Number(setCount || 0));
  
  // Store the adjustment in Redis
  await kv.set(siteUVAdjustKey, requiredAdjustment);
  await kv.expire(siteUVAdjustKey, EXPIRATION_TIME); // 3 months
  
  return {
    setCount: Number(setCount || 0),
    adjustment: requiredAdjustment,
    total: Number(setCount || 0) + requiredAdjustment
  };
}