import kv from "@/lib/kv";
import logger from "@/lib/logger";
import {
  fetchBusuanziPagePV,
  fetchBusuanziSitePV,
  fetchBusuanziSiteUVValue,
} from "@/utils/busuanzi";

// Constants
export const EXPIRATION_TIME = 60 * 60 * 24 * 30 * 3; // 3 months in seconds
const SITE_UV_COUNT_KEY_PREFIX = "uv:site:count:";

// Types
export interface SanitizedUrl {
  host: string;
  path: string;
}

function getSiteUVCountKey(hostSanitized: string): string {
  return `${SITE_UV_COUNT_KEY_PREFIX}${hostSanitized}`;
}

async function getLegacySiteUVTotal(
  hostSanitized: string,
): Promise<number | null> {
  const legacySiteKey = `uv:site:${hostSanitized}`;
  const legacyBaselineKey = `uv:baseline:${hostSanitized}`;

  const [legacySetCount, legacyBaseline] = await Promise.all([
    kv.scard(legacySiteKey),
    kv.get(legacyBaselineKey),
  ]);

  if (Number(legacySetCount || 0) > 0 || legacyBaseline !== null) {
    return Number(legacySetCount || 0) + Number(legacyBaseline || 0);
  }

  return null;
}

async function initializeSiteUVCount(
  hostSanitized: string,
  hostOriginal: string,
): Promise<number> {
  const siteUVKey = getSiteUVCountKey(hostSanitized);
  const existingValue = await kv.get(siteUVKey);

  if (existingValue !== null) {
    return Number(existingValue || 0);
  }

  const legacyTotal = await getLegacySiteUVTotal(hostSanitized);
  const initialValue =
    legacyTotal ??
    Number((await fetchBusuanziSiteUVValue(hostSanitized, hostOriginal)) || 0);

  await kv.set(siteUVKey, initialValue, { ex: EXPIRATION_TIME });
  return initialValue;
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
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Normalize index files to root path
  if (/^\/(index|index\.html|index\.htm)$/.test(path)) {
    path = "/";
  }

  // Remove trailing slash except for root path
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // Normalize paths ending with /index, /index.html, or /index.htm
  if (/\/index(\.html|\.htm)?$/.test(path)) {
    path = path.replace(/\/index(\.html|\.htm)?$/, "");
    // If we removed everything, ensure we have at least the root path
    if (path === "") {
      path = "/";
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
 * Get site unique visitor count from unified counters
 * @param host The hostname
 * @param path The path
 * @returns The number of unique visitors
 */
export async function fetchSiteUVHistory(
  host: string,
  path: string,
): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const siteUVKey = getSiteUVCountKey(hostSanitized);

    await initializeSiteUVCount(hostSanitized, host);

    const [siteUV] = await Promise.all([
      kv.get(siteUVKey),
      kv.expire(siteUVKey, EXPIRATION_TIME),
    ]);
    const total = Number(siteUV || 0);

    logger.debug(
      `Site UV for host: https://${hostSanitized}${sanitized.path}, site_uv: ${total}`,
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
export async function fetchSitePVHistory(
  host: string,
  path: string,
): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;

    // Initialize site PV from Busuanzi if needed
    const sitePVKey = `pv:site:${hostSanitized}`;
    if (!(await kv.exists(sitePVKey))) {
      const busuanziSitePV = await fetchBusuanziSitePV(hostSanitized, host);
      await kv.set(sitePVKey, Number(busuanziSitePV || 0), {
        ex: EXPIRATION_TIME,
      });
    }

    const siteKey = `pv:site:${hostSanitized}`;
    const [sitePV] = await Promise.all([
      kv.get(siteKey),
      kv.expire(siteKey, EXPIRATION_TIME),
    ]);

    const result = Number(sitePV || 0);
    logger.debug(
      `Site PV for host: https://${hostSanitized}${sanitized.path}, site_pv: ${result}`,
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
export async function fetchPagePVHistory(
  host: string,
  path: string,
): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;

    // Initialize page PV from Busuanzi if needed
    const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    if (!(await kv.exists(pagePVKey))) {
      const busuanziPagePV = await fetchBusuanziPagePV(
        hostSanitized,
        pathSanitized,
        host,
        path,
      );
      await kv.set(pagePVKey, Number(busuanziPagePV || 0), {
        ex: EXPIRATION_TIME,
      });
    }

    const pageKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    const [pagePV] = await Promise.all([
      kv.get(pageKey),
      kv.expire(pageKey, EXPIRATION_TIME),
    ]);

    const result = Number(pagePV || 0);
    logger.debug(
      `Page PV for host: https://${hostSanitized}${pathSanitized}, page_pv: ${result}`,
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
export async function incrementPagePV(
  host: string,
  path: string,
): Promise<number> {
  try {
    // Sanitize the URL components
    const sanitized = sanitizeUrlPath(host, path);
    const hostSanitized = sanitized.host;
    const pathSanitized = sanitized.path;

    // Initialize page PV from Busuanzi if needed
    const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    if (!(await kv.exists(pagePVKey))) {
      const busuanziPagePV = await fetchBusuanziPagePV(
        hostSanitized,
        pathSanitized,
        host,
        path,
      );
      await kv.set(pagePVKey, Number(busuanziPagePV || 0), {
        ex: EXPIRATION_TIME,
      });
    }

    logger.debug(
      `Updating page PV for host: https://${hostSanitized}${pathSanitized}`,
    );
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
      await kv.set(sitePVKey, Number(busuanziSitePV || 0), {
        ex: EXPIRATION_TIME,
      });
    }

    logger.debug(`Updating site PV for host: https://${hostSanitized}`);
    const siteKey = `pv:site:${hostSanitized}`;

    const [sitePV] = await Promise.all([
      kv.incr(siteKey),
      kv.expire(siteKey, EXPIRATION_TIME),
    ]);

    logger.debug(
      `Site PV updated for host: https://${hostSanitized}, site_pv: ${sitePV}`,
    );

    return Number(sitePV);
  } catch (error) {
    logger.error(`Error updating site PV: ${error}`);
    return 0;
  }
}

/**
 * Record a unique visitor for a site
 * @param host The hostname
 * @param isNewVisitor Whether the client marked this request as a new UV
 * @returns The updated unique visitor count
 */
export async function recordSiteUV(
  host: string,
  isNewVisitor: boolean,
): Promise<number> {
  try {
    // Sanitize the host
    const sanitized = sanitizeUrlPath(host, "");
    const hostSanitized = sanitized.host;
    const siteUVKey = getSiteUVCountKey(hostSanitized);

    await initializeSiteUVCount(hostSanitized, host);

    logger.debug(`Updating site UV for host: https://${hostSanitized}`);
    const [siteUV] = await Promise.all([
      isNewVisitor ? kv.incr(siteUVKey) : kv.get(siteUVKey),
      kv.expire(siteUVKey, EXPIRATION_TIME),
    ]);
    const total = Number(siteUV || 0);

    logger.debug(
      `Site UV updated for host: https://${hostSanitized}, is_new_uv: ${isNewVisitor}, total_site_uv: ${total}`,
    );

    return total;
  } catch (error) {
    logger.error(`Error updating site UV: ${error}`);
    return 0;
  }
}

/**
 * Update the stored UV value for a domain
 * @param hostSanitized The sanitized hostname
 * @param newUvValue The new total UV value to set
 * @returns The updated UV value
 */
export async function updateTotalUV(
  hostSanitized: string,
  newUvValue: number,
): Promise<number> {
  const siteUVKey = getSiteUVCountKey(hostSanitized);
  const normalizedValue = Math.max(0, Number(newUvValue || 0));

  await kv.set(siteUVKey, normalizedValue);
  await kv.expire(siteUVKey, EXPIRATION_TIME);

  return normalizedValue;
}
