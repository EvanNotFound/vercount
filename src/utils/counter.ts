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
 * Calculate the total UV count by combining the set cardinality with baseline
 * @param hostSanitized The sanitized hostname
 * @returns An object containing the set count, baseline value, and total UV count
 */
export async function calculateTotalUV(hostSanitized: string): Promise<{ setCount: number; baseline: number; total: number }> {
  const siteKey = `uv:site:${hostSanitized}`;
  const baselineKey = `uv:baseline:${hostSanitized}`;
  
  // Execute Redis operations in parallel
  const [siteUVSetCount, baseline] = await Promise.all([
    kv.scard(siteKey),
    kv.get(baselineKey),
  ]);
  
  // Combine the set cardinality with the baseline
  const totalUV = Number(siteUVSetCount || 0) + Number(baseline || 0);
  
  return {
    setCount: Number(siteUVSetCount || 0),
    baseline: Number(baseline || 0),
    total: totalUV
  };
}

/**
 * Get site unique visitor count from unified counters
 * @param host The hostname
 * @param path The path
 * @returns The number of unique visitors
 */
export async function fetchSiteUVHistory(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    
    // Initialize UV baseline from Busuanzi if needed
    const baselineKey = `uv:baseline:${hostSanitized}`;
    if (!(await kv.exists(baselineKey))) {
      const busuanziUV = await fetchBusuanziSiteUV(hostSanitized, host);
      await kv.set(baselineKey, Number(busuanziUV || 0), { ex: EXPIRATION_TIME });
    }
    
    // Calculate total UV using the utility function
    const { total } = await calculateTotalUV(hostSanitized);
    
    logger.debug(
      `Site UV for host: https://${hostSanitized}${sanitized.path}, site_uv: ${total}`
    );
    return total;
    
  } catch (error) {
    logger.error(`Error getting site UV data: ${error}`);
    return 0;
  }
}

/**
 * Get site page view count from unified counters
 * @param host The hostname
 * @param path The path
 * @returns The number of site page views
 */
export async function fetchSitePVHistory(host: string, path: string): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    
    // Initialize site PV from Busuanzi if needed
    const sitePVKey = `pv:site:${hostSanitized}`;
    if (!(await kv.exists(sitePVKey))) {
      const busuanziSitePV = await fetchBusuanziSitePV(hostSanitized, host);
      await kv.set(sitePVKey, Number(busuanziSitePV || 0), { ex: EXPIRATION_TIME });
    }
    
    const siteKey = `pv:site:${hostSanitized}`;
    const [sitePV] = await Promise.all([
      kv.get(siteKey),
      kv.expire(siteKey, EXPIRATION_TIME),
    ]);
    
    const result = Number(sitePV || 0);
    logger.debug(
      `Site PV for host: https://${hostSanitized}${sanitized.path}, site_pv: ${result}`
    );
    return result;
    
  } catch (error) {
    logger.error(`Error getting site PV data: ${error}`);
    return 0;
  }
}

/**
 * Get page view count for a specific page from unified counters
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
    
    // Initialize page PV from Busuanzi if needed
    const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    if (!(await kv.exists(pagePVKey))) {
      const busuanziPagePV = await fetchBusuanziPagePV(hostSanitized, pathSanitized, host, path);
      await kv.set(pagePVKey, Number(busuanziPagePV || 0), { ex: EXPIRATION_TIME });
    }
    
    const pageKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    const [pagePV] = await Promise.all([
      kv.get(pageKey),
      kv.expire(pageKey, EXPIRATION_TIME),
    ]);

    const result = Number(pagePV || 0);
    logger.debug(
      `Page PV for host: https://${hostSanitized}${pathSanitized}, page_pv: ${result}`
    );
    return result;
    
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
    
    // Initialize page PV from Busuanzi if needed
    const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    if (!(await kv.exists(pagePVKey))) {
      const busuanziPagePV = await fetchBusuanziPagePV(hostSanitized, pathSanitized, host, path);
      await kv.set(pagePVKey, Number(busuanziPagePV || 0), { ex: EXPIRATION_TIME });
    }
    
    logger.debug(`Updating page PV for host: https://${hostSanitized}${pathSanitized}`);
    const pageKey = `pv:page:${hostSanitized}:${pathSanitized}`;

    const [pagePV] = await Promise.all([
      kv.incr(pageKey),
      kv.expire(pageKey, EXPIRATION_TIME),
    ]);

    logger.debug(
      `Page PV updated for host: https://${hostSanitized}${pathSanitized}, page_pv: ${pagePV}`,
    );

    return Number(pagePV);
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
    
    // Initialize site PV from Busuanzi if needed
    const sitePVKey = `pv:site:${hostSanitized}`;
    if (!(await kv.exists(sitePVKey))) {
      const busuanziSitePV = await fetchBusuanziSitePV(hostSanitized, host);
      await kv.set(sitePVKey, Number(busuanziSitePV || 0), { ex: EXPIRATION_TIME });
    }
    
    logger.debug(`Updating site PV for host: https://${hostSanitized}`);
    const siteKey = `pv:site:${hostSanitized}`;

    const [sitePV] = await Promise.all([
      kv.incr(siteKey),
      kv.expire(siteKey, EXPIRATION_TIME),
    ]);

    logger.debug(`Site PV updated for host: https://${hostSanitized}, site_pv: ${sitePV}`);

    return Number(sitePV);
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
    
    // Initialize UV baseline from Busuanzi if needed
    const baselineKey = `uv:baseline:${hostSanitized}`;
    if (!(await kv.exists(baselineKey))) {
      const busuanziUV = await fetchBusuanziSiteUV(hostSanitized, host);
      await kv.set(baselineKey, Number(busuanziUV || 0), { ex: EXPIRATION_TIME });
    }
    
    logger.debug(`Updating site UV for host: https://${hostSanitized}`);
    const siteKey = `uv:site:${hostSanitized}`;

    // Add IP to the set and calculate total
    const [, totalUVresult] = await Promise.all([
      kv.sadd(siteKey, ip),
      calculateTotalUV(hostSanitized),
      kv.expire(siteKey, EXPIRATION_TIME),
      kv.expire(baselineKey, EXPIRATION_TIME),
    ]);
    
    // Calculate total UV using the utility function
    const { setCount, baseline, total } = totalUVresult;

    logger.debug(
      `Site UV updated for host: https://${hostSanitized}, site_uv_set: ${setCount}, uv_baseline: ${baseline}, total_site_uv: ${total}`
    );

    return total;
  } catch (error) {
    logger.error(`Error updating site UV: ${error}`);
    return 0;
  }
}

/**
 * Update the UV baseline value for a domain and recalculate the total UV
 * @param hostSanitized The sanitized hostname
 * @param newUvValue The new total UV value to set
 * @returns An object containing the updated set count, baseline value, and total UV count
 */
export async function updateTotalUV(hostSanitized: string, newUvValue: number): Promise<{ setCount: number; baseline: number; total: number }> {
  const siteKey = `uv:site:${hostSanitized}`;
  const baselineKey = `uv:baseline:${hostSanitized}`;
  
  // Get the current set cardinality
  const setCount = await kv.scard(siteKey);
  
  // Calculate the baseline needed to reach the desired total
  const requiredBaseline = Math.max(0, newUvValue - Number(setCount || 0));
  
  // Store the baseline in Redis
  await kv.set(baselineKey, requiredBaseline);
  await kv.expire(baselineKey, EXPIRATION_TIME); // 3 months
  
  return {
    setCount: Number(setCount || 0),
    baseline: requiredBaseline,
    total: Number(setCount || 0) + requiredBaseline
  };
}