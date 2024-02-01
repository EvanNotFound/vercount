import { kv } from "@vercel/kv";
import logger from "@/lib/logger";

export const EXPIRATION_TIME = 60 * 60 * 24 * 30 * 6; // Adjust as needed
const MAX_RETRIES = 3;
const BUSUANZI_URL =
  "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111";

async function fetchBusuanziData(url: string, headers: any) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });
      if (response.ok) {
        const dataStr = await response.text();
        const dataDict = JSON.parse(dataStr.substring(34, dataStr.length - 13));
        console.log(dataDict);
        return dataDict;
      } else {
        logger.warn(`Non-200 response: ${response.status}`);
      }
    } catch (e) {
      logger.error(`Attempt ${attempt + 1} failed: ${e}`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1 second
    }
  }
  return null;
}

export async function getBusuanziSiteUVData(host: string, path: string) {
  const headers = {
    Referer: `https://${host}/`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const data = await fetchBusuanziData(BUSUANZI_URL, headers);
  if (data) {
    const siteUv = data.site_uv || 0;
    await kv.set(`site_uv_live:${host}`, siteUv, { ex: EXPIRATION_TIME });
    logger.info(`UV data retrieved and stored for ${host}`);
    return siteUv;
  } else {
    await kv.set(`site_uv_live:${host}`, 0, {
      ex: EXPIRATION_TIME,
    });
    logger.error(
      `Max retries exceeded for ${host}. Defaulting UV values to 0.`,
    );
  }
}

export async function getBusuanziSitePVData(host: string) {
  const headers = {
    Referer: `https://${host}/`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const data = await fetchBusuanziData(BUSUANZI_URL, headers);
  if (data) {
    const sitePv = data.site_pv || 0;
    await kv.set(`site_pv_live:${host}`, sitePv, { ex: EXPIRATION_TIME });
    logger.info(`Site PV data retrieved and stored for ${host}`);
    return sitePv;
  } else {
    await kv.set(`site_pv_live:${host}`, 0, {
      ex: EXPIRATION_TIME,
    });
    logger.error(
      `Max retries exceeded for ${host}. Defaulting PV values to 0.`,
    );
  }
}

export async function getBusuanziPagePVData(host: string, path: string) {
  const headers = {
    Referer: `https://${host}${path}`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const dataNoSlash = await fetchBusuanziData(BUSUANZI_URL, headers);
  const dataSlash = await fetchBusuanziData(BUSUANZI_URL, {
    ...headers,
    Referer: `${headers["Referer"]}/`,
  });

  const [dataNoSlashResult, dataSlashResult] = await Promise.all([
    dataNoSlash,
    dataSlash,
  ]);

  if (dataNoSlashResult && dataSlashResult) {
    const pagePv = Math.max(
      dataNoSlashResult.page_pv || 0,
      dataSlashResult.page_pv || 0,
    );
    await kv.set(`live_page_pv:${host}${path}`, pagePv, {
      ex: EXPIRATION_TIME,
    });
    logger.info(
      `Page PV data retrieved and stored for ${host}${path}, ${pagePv}`,
    );
    return pagePv;
  } else if (dataNoSlashResult || dataSlashResult) {
    const pagePv = (dataNoSlashResult || dataSlashResult).page_pv || 0;
    await kv.set(`live_page_pv:${host}${path}`, pagePv, {
      ex: EXPIRATION_TIME,
    });
    logger.error(
      `Max retries exceeded for ${host}${path}. Defaulting Page PV values to 0.`,
    );
    return pagePv;
  } else {
    await kv.set(`live_page_pv:${host}${path}`, 0, { ex: EXPIRATION_TIME });
    logger.error(
      `Max retries exceeded for ${host}${path}. Defaulting Page PV values to 0.`,
    );
  }
}
