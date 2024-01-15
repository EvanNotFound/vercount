import { kv } from "@vercel/kv";
import logger from "@/lib/logger";
import {
  getBusuanziPagePVData,
  getBusuanziSitePVData,
  getBusuanziSiteUVData,
} from "@/lib/get-busuanzi-data";

export async function getSiteUVBeforeData(host: string, path: string) {
  const siteKey = `live_site_uv:${host}`;
  const siteUV = await kv.get(siteKey);
  if (!siteUV) {
    const siteUVData = await getBusuanziSiteUVData(host, path);
    const siteUV = siteUVData ? siteUVData : 0;
    // console.log(`site_uv_data: ${siteUVData}, site_uv: ${siteUV}`);
    return Number(siteUV);
  } else {
    // console.log(`site_uv: ${siteUV}`);
    return Number(siteUV);
  }
}

export async function getSitePVBeforeData(host: string, path: string) {
  const siteKey = `live_site_pv:${host}`;
  const sitePV = await kv.get(siteKey);
  if (!sitePV) {
    const sitePVData = await getBusuanziSitePVData(host);
    const sitePV = sitePVData ? sitePVData : 0;
    // console.log(`site_pv_data: ${sitePVData}, site_pv: ${sitePV}`);
    return Number(sitePV);
  } else {
    // console.log(`site_pv: ${sitePV}`);
    return Number(sitePV);
  }
}

export async function getPagePVBeforeData(host: string, path: string) {
  const pageKey = `live_page_pv:${host}${path}`;
  const pagePV = await kv.get(pageKey);
  logger.debug(`page_pv: ${pagePV}, page_key: ${pageKey}`);

  if (!pagePV) {
    const pagePVData = await getBusuanziPagePVData(host, path);
    const pagePV = pagePVData ? pagePVData : 0;
    // console.log(`page_pv_data: ${pagePVData}, page_pv: ${pagePV}`);
    return Number(pagePV);
  } else {
    // console.log(`page_pv: ${pagePV}`);
    return Number(pagePV);
  }
}
