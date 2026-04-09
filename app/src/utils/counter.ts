import kv from "@/lib/kv";
import logger from "@/lib/logger";
import {
  fetchBusuanziPagePV,
  fetchBusuanziPagePVValue,
  fetchBusuanziSitePV,
  fetchBusuanziSitePVValue,
  fetchBusuanziSiteUVValue,
} from "@/utils/busuanzi";

// Constants
export const EXPIRATION_TIME = 60 * 60 * 24 * 30 * 3; // 3 months in seconds
const SITE_UV_COUNT_KEY_PREFIX = "uv:site:count:";
const PAGE_INVENTORY_KEY_PREFIX = "pv:page:index:";
const PAGE_SCAN_COUNT = 200;

// Types
export interface SanitizedUrl {
  host: string;
  path: string;
}

function getSiteUVCountKey(hostSanitized: string): string {
  return `${SITE_UV_COUNT_KEY_PREFIX}${hostSanitized}`;
}

function getPageInventoryKey(hostSanitized: string): string {
  return `${PAGE_INVENTORY_KEY_PREFIX}${hostSanitized}`;
}

async function addStoredPageToInventory(
  hostSanitized: string,
  pathSanitized: string,
): Promise<void> {
  const inventoryKey = getPageInventoryKey(hostSanitized);

  await Promise.all([
    kv.sadd(inventoryKey, pathSanitized),
    kv.expire(inventoryKey, EXPIRATION_TIME),
  ]);
}

async function initializeSitePVCount(
  hostSanitized: string,
  hostOriginal: string,
): Promise<number> {
  const sitePVKey = `pv:site:${hostSanitized}`;
  const existingValue = await kv.get(sitePVKey);

  if (existingValue !== null) {
    return Number(existingValue || 0);
  }

  const busuanziSitePV = await fetchBusuanziSitePV(hostSanitized, hostOriginal);
  return Number(busuanziSitePV || 0);
}

async function initializePagePVCount(
  hostSanitized: string,
  pathSanitized: string,
  hostOriginal: string,
  pathOriginal: string,
): Promise<number> {
  const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
  const existingValue = await kv.get(pagePVKey);

  if (existingValue !== null) {
    return Number(existingValue || 0);
  }

  const busuanziPagePV = await fetchBusuanziPagePV(
    hostSanitized,
    pathSanitized,
    hostOriginal,
    pathOriginal,
  );
  await addStoredPageToInventory(hostSanitized, pathSanitized);
  return Number(busuanziPagePV || 0);
}

async function scanStoredPageKeys(hostSanitized: string): Promise<string[]> {
  let cursor = 0;
  const pageKeys: string[] = [];

  do {
    const [nextCursor, scannedKeys] = await kv.scan(cursor, {
      match: `pv:page:${hostSanitized}:*`,
      count: PAGE_SCAN_COUNT,
    });

    pageKeys.push(...(scannedKeys as string[]));
    cursor = Number(nextCursor || 0);
  } while (cursor !== 0);

  return pageKeys;
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
 * Get known stored page paths for a host and lazily rebuild the inventory from
 * existing page keys when the inventory is missing.
 */
export async function getStoredPagePaths(host: string): Promise<string[]> {
  const sanitized = sanitizeUrlPath(host, "");
  const hostSanitized = sanitized.host;
  const inventoryKey = getPageInventoryKey(hostSanitized);

  if (await kv.exists(inventoryKey)) {
    const pagePaths = await kv.smembers<string[]>(inventoryKey);
    return Array.from(new Set((pagePaths || []).map(String)));
  }

  const prefix = `pv:page:${hostSanitized}:`;
  const pageKeys = await scanStoredPageKeys(hostSanitized);
  const pagePaths = Array.from(
    new Set(
      pageKeys.map((key) => key.substring(prefix.length)).filter(Boolean),
    ),
  );

  if (pagePaths.length > 0) {
    await Promise.all([
      kv.sadd(inventoryKey, ...(pagePaths as [string, ...string[]])),
      kv.expire(inventoryKey, EXPIRATION_TIME),
    ]);
  }

  return pagePaths;
}

/**
 * Remove stale page paths from the per-domain inventory set.
 */
export async function pruneStoredPagePaths(
  host: string,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const sanitized = sanitizeUrlPath(host, "");
  await kv.srem(getPageInventoryKey(sanitized.host), ...paths);
}

/**
 * Persist an exact page PV value and keep the page inventory in sync.
 */
export async function setPagePVCount(
  host: string,
  path: string,
  pageViews: number,
): Promise<number> {
  const sanitized = sanitizeUrlPath(host, path);
  const hostSanitized = sanitized.host;
  const pathSanitized = sanitized.path;
  const pageKey = `pv:page:${hostSanitized}:${pathSanitized}`;
  const normalizedValue = Math.max(0, Number(pageViews || 0));

  await Promise.all([
    kv.set(pageKey, normalizedValue),
    kv.expire(pageKey, EXPIRATION_TIME),
    addStoredPageToInventory(hostSanitized, pathSanitized),
  ]);

  return normalizedValue;
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
 * Get site page view count without mutating Redis on reads
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
    const sitePVKey = `pv:site:${hostSanitized}`;
    const sitePV = await kv.get(sitePVKey);
    const result =
      sitePV === null
        ? Number((await fetchBusuanziSitePVValue(hostSanitized, host)) || 0)
        : Number(sitePV || 0);

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
 * Get page view count for a specific page without mutating Redis on reads
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
    const pagePVKey = `pv:page:${hostSanitized}:${pathSanitized}`;
    const pagePV = await kv.get(pagePVKey);
    const result =
      pagePV === null
        ? Number(
            (await fetchBusuanziPagePVValue(
              hostSanitized,
              pathSanitized,
              host,
              path,
            )) || 0,
          )
        : Number(pagePV || 0);

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

    await initializePagePVCount(hostSanitized, pathSanitized, host, path);

    logger.debug(
      `Updating page PV for host: https://${hostSanitized}${pathSanitized}`,
    );
    const pageKey = `pv:page:${hostSanitized}:${pathSanitized}`;

    const [pagePV] = await Promise.all([
      kv.incr(pageKey),
      kv.expire(pageKey, EXPIRATION_TIME),
      addStoredPageToInventory(hostSanitized, pathSanitized),
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

    await initializeSitePVCount(hostSanitized, host);

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
