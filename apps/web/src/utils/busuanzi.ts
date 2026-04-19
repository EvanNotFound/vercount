import logger from "@/lib/logger";

const BUSUANZI_TIMEOUT_MS = 500;
const BUSUANZI_URL =
  "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111";

type BusuanziData = {
  site_uv?: number;
  site_pv?: number;
  page_pv?: number;
};

/**
 * Fetches analytics data from Busuanzi service once with a short timeout.
 * @param url The Busuanzi service URL
 * @param headers Request headers including referer
 * @returns The parsed analytics data or null if failed
 */
async function fetchBusuanziData(
  url: string,
  headers: Record<string, string>,
): Promise<BusuanziData | null> {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(BUSUANZI_TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.debug(`Busuanzi response status: ${response.status}`);
      return null;
    }

    const dataStr = await response.text();
    const dataDict = JSON.parse(
      dataStr.substring(34, dataStr.length - 13),
    ) as BusuanziData;
    logger.debug("Busuanzi data retrieved", dataDict);
    return dataDict;
  } catch (error) {
    logger.debug("Busuanzi request failed", error);
    return null;
  }
}

/**
 * Retrieves site unique visitor count from Busuanzi service
 * @param host The hostname
 * @param path The path
 * @returns The site unique visitor count
 */
async function fetchBusuanziSiteUVValue(
  hostSanitized: string,
  hostOriginal: string,
) {
  // Note: host and path are already sanitized by the caller
  const headers = {
    Referer: `https://${hostOriginal}/`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const data = await fetchBusuanziData(BUSUANZI_URL, headers);
  if (data) {
    const siteUv = data.site_uv || 0;
    logger.debug(`UV data retrieved for ${hostSanitized}`);
    return siteUv;
  }

  return 0;
}

/**
 * Retrieves site page view count from Busuanzi service
 * @param host The hostname
 * @returns The site page view count
 */
async function fetchBusuanziSitePVValue(
  hostSanitized: string,
  hostOriginal: string,
) {
  // Note: host is already sanitized by the caller
  const headers = {
    Referer: `https://${hostOriginal}/`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const data = await fetchBusuanziData(BUSUANZI_URL, headers);
  if (data) {
    const sitePv = data.site_pv || 0;
    logger.debug(`Site PV data retrieved for ${hostSanitized}`);
    return sitePv;
  }

  return 0;
}

/**
 * Retrieves page view count for a specific page from Busuanzi service
 * @param host The hostname
 * @param path The path
 * @returns The page view count
 */
async function fetchBusuanziPagePVValue(
  hostSanitized: string,
  pathSanitized: string,
  hostOriginal: string,
) {
  // Note: host and path are already sanitized by the caller
  const headers = {
    Referer: `https://${hostOriginal}${pathSanitized}`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  const data = await fetchBusuanziData(BUSUANZI_URL, headers);
  if (data) {
    const pagePv = data.page_pv || 0;
    logger.debug(
      `Page PV data retrieved for ${hostSanitized}${pathSanitized}, ${pagePv}`,
    );
    return pagePv;
  }

  return 0;
}

/**
 * Sends a non-blocking request to Busuanzi to sync analytics data
 * @param host The hostname
 * @param path The path
 * @deprecated This function is no longer used
 */
function notifyBusuanziService(hostOriginal: string, pathOriginal: string) {
  // Note: host and path may not be sanitized here, as this function might be called directly
  const headers = {
    Referer: `https://${hostOriginal}${pathOriginal}`,
    Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
  };

  // Fire and forget - explicitly non-blocking
  fetch(BUSUANZI_URL, {
    method: "GET",
    headers,
  })
    .then(() => {
      logger.debug(
        `Busuanzi sync request sent for: https://${hostOriginal}${pathOriginal}`,
      );
    })
    .catch((e) => {
      logger.error(
        `Busuanzi sync failed for: https://${hostOriginal}${pathOriginal}. Error: ${e}`,
      );
    });
}

export {
  fetchBusuanziSiteUVValue,
  fetchBusuanziSitePVValue,
  fetchBusuanziPagePVValue,
  notifyBusuanziService,
};
