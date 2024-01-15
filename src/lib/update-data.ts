import { kv } from "@vercel/kv";
import { EXPIRATION_TIME } from "@/lib/get-busuanzi-data";

export async function updatePagePV(host: string, path: string) {
  const pageKey = `page_pv:${host}${path}`;
  const livePageKey = `live_page_pv:${host}${path}`;

  const pagePV = await kv.incr(pageKey);

  await Promise.all([
    kv.expire(pageKey, EXPIRATION_TIME),
    kv.expire(livePageKey, EXPIRATION_TIME),
  ]);

  return pagePV;
}

export async function updateSitePV(host: string) {
  const siteKey = `site_pv:${host}`;
  const liveSiteKey = `live_site_pv:${host}`;

  const sitePV = await kv.incr(siteKey);

  await Promise.all([
    kv.expire(siteKey, EXPIRATION_TIME),
    kv.expire(liveSiteKey, EXPIRATION_TIME),
  ]);

  return sitePV;
}

export async function updateSiteUV(host: string, ip: string) {
  const siteKey = `site_uv:${host}`;
  const liveSiteKey = `live_site_uv:${host}`;

  const siteUVKey = await kv.sadd(siteKey, ip);
  const siteUV = await kv.scard(siteKey);

  await Promise.all([
    kv.expire(siteKey, EXPIRATION_TIME),
    kv.expire(liveSiteKey, EXPIRATION_TIME),
  ]);

  return siteUV;
}
