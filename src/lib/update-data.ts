import { kv } from "@vercel/kv";
import { EXPIRATION_TIME } from "@/lib/get-busuanzi-data";
import logger from "@/lib/logger";

export async function updatePagePV(host: string, path: string) {
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
