import kv from "@/lib/kv";
import logger from "@/lib/logger";
import {
  getBusuanziPagePVData,
  getBusuanziSitePVData,
  getBusuanziSiteUVData,
} from "@/utils/busuanzi";

export const EXPIRATION_TIME = 60 * 60 * 24 * 30 * 3; 

/**
 * Sanitizes a URL path to ensure it's a valid web path
 * @param host The hostname
 * @param path The path
 * @returns A sanitized version of the host and path
 */
export function sanitizeUrlPath(host: string, path: string): { host: string, path: string } {
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
 * Get site unique visitor count
 */
export async function getSiteUVBeforeData(host: string, path: string): Promise<number> {
  const siteKey = `uv:busuanzi:site:${host}`;
  const siteUV = await kv.get(siteKey);
  
  if (!siteUV) {
    logger.debug(`Site UV not found for host: https://${host}${path}`);
    const siteUVData = await getBusuanziSiteUVData(host, path);
    const siteUV = siteUVData ? siteUVData : 0;
    return Number(siteUV);
  } else {
    logger.debug(
      `Site UV found for host: https://${host}${path}, site_uv: ${siteUV}`
    );
    return Number(siteUV);
  }
}

/**
 * Get site page view count
 */
export async function getSitePVBeforeData(host: string, path: string): Promise<number> {
  const siteKey = `pv:busuanzi:site:${host}`;
  const sitePV = await kv.get(siteKey);
  
  if (!sitePV) {
    logger.debug(`Site PV not found for host: https://${host}${path}`);
    const sitePVData = await getBusuanziSitePVData(host);
    const sitePV = sitePVData ? sitePVData : 0;
    logger.debug(`Site PV data: ${sitePVData}, site_pv: ${sitePV}`);
    return Number(sitePV);
  } else {
    logger.debug(
      `Site PV found for host: https://${host}${path}, site_pv: ${sitePV}`
    );
    return Number(sitePV);
  }
}

/**
 * Get page view count for a specific page
 */
export async function getPagePVBeforeData(host: string, path: string): Promise<number> {
  const pageKey = `pv:busuanzi:page:${host}:${path}`;
  const pagePV = await kv.get(pageKey);
  logger.debug(`Page PV: ${pagePV}, page_key: ${pageKey}`);

  if (!pagePV) {
    logger.debug(`Page PV not found for host: https://${host}${path}`);
    const pagePVData = await getBusuanziPagePVData(host, path);
    const pagePV = pagePVData ? pagePVData : 0;
    return Number(pagePV);
  } else {
    logger.debug(
      `Page PV found for host: https://${host}${path}, page_pv: ${pagePV}`
    );
    return Number(pagePV);
  }
}

/**
 * Update page view count
 */
export async function updatePagePV(host: string, path: string): Promise<number> {
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
}

/**
 * Update site page view count
 */
export async function updateSitePV(host: string): Promise<number> {
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
}

/**
 * Update site unique visitor count
 */
export async function updateSiteUV(host: string, ip: string): Promise<number> {
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
} 