import kv from "@/lib/kv";
import { EXPIRATION_TIME } from "@/lib/get-busuanzi-data";
import logger from "@/lib/logger";

/**
 * Sanitizes a URL path to ensure it's a valid web path
 * @param host The hostname
 * @param path The path
 * @returns A sanitized version of the host and path
 */
function sanitizeUrlPath(host: string, path: string): { host: string, path: string } {
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

export async function updatePagePV(host: string, path: string) {
  // Sanitize the URL components
  const sanitized = sanitizeUrlPath(host, path);
  host = sanitized.host;
  path = sanitized.path;
  
  logger.debug(`Updating page_pv for host: https://${host}${path}`);
  const pageKey = `page_pv:${host}${path}`;
  const livePageKey = `live_page_pv:${host}${path}`;

  const pagePV = await kv.incr(pageKey);
  logger.debug(
    `Page PV updated for host: https://${host}${path}, page_pv: ${pagePV}`,
  );

  await Promise.all([
    kv.expire(pageKey, EXPIRATION_TIME),
    kv.expire(livePageKey, EXPIRATION_TIME),
  ]);

  return pagePV;
}

export async function updateSitePV(host: string) {
  // Sanitize the host
  const sanitized = sanitizeUrlPath(host, "");
  host = sanitized.host;
  
  logger.debug(`Updating site_pv for host: https://${host}`);
  const siteKey = `site_pv:${host}`;
  const liveSiteKey = `site_pv_live:${host}`;

  const sitePV = await kv.incr(siteKey);
  logger.debug(`Site PV updated for host: https://${host}, site_pv: ${sitePV}`);

  await Promise.all([
    kv.expire(siteKey, EXPIRATION_TIME),
    kv.expire(liveSiteKey, EXPIRATION_TIME),
  ]);

  return sitePV;
}

export async function updateSiteUV(host: string, ip: string) {
  // Sanitize the host
  const sanitized = sanitizeUrlPath(host, "");
  host = sanitized.host;
  
  logger.debug(`Updating site_uv for host: https://${host}`);
  const siteKey = `site_uv:${host}`;
  const liveSiteKey = `site_uv_live:${host}`;

  const siteUVKey = await kv.sadd(siteKey, ip);
  const siteUV = await kv.scard(siteKey);
  logger.debug(
    `Site UV updated for host: https://${host}, site_uv: ${siteUV}, site_uv_key: ${siteUVKey}`,
  );

  await Promise.all([
    kv.expire(siteKey, EXPIRATION_TIME),
    kv.expire(liveSiteKey, EXPIRATION_TIME),
  ]);

  return siteUV;
}
