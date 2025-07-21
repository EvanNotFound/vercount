import kv from "@/lib/kv";
import logger from "@/lib/logger";
import { EXPIRATION_TIME } from "@/utils/counter";

const MAX_RETRIES = 3;
const BUSUANZI_URL =
	"https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111";

/**
 * Fetches analytics data from Busuanzi service with retry logic
 * @param url The Busuanzi service URL
 * @param headers Request headers including referer
 * @returns The parsed analytics data or null if failed
 */
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
				logger.debug(dataDict);
				return dataDict;
			} else {
				logger.debug(`Non-200 response: ${response.status}`);
			}
		} catch (e) {
			logger.error(`Attempt ${attempt + 1} failed: ${e}`);
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1 second
		}
	}
	return null;
}

/**
 * Retrieves site unique visitor count from Busuanzi service
 * @param host The hostname
 * @param path The path
 * @returns The site unique visitor count
 */
async function fetchBusuanziSiteUV(hostSanitized: string, hostOriginal: string) {
	// Note: host and path are already sanitized by the caller
	const headers = {
		Referer: `https://${hostOriginal}/`,
		Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
	};

	const data = await fetchBusuanziData(BUSUANZI_URL, headers);
	if (data) {
		const siteUv = data.site_uv || 0;
		await kv.set(`uv:busuanzi:site:${hostSanitized}`, siteUv, { ex: EXPIRATION_TIME });
		logger.debug(`UV data retrieved and stored for ${hostSanitized}`);
		return siteUv;
	} else {
		await kv.set(`uv:busuanzi:site:${hostSanitized}`, 0, {
			ex: EXPIRATION_TIME,
		});
		logger.error(
			`Max retries exceeded for ${hostSanitized}. Defaulting UV values to 0.`
		);
	}
}

/**
 * Retrieves site page view count from Busuanzi service
 * @param host The hostname
 * @returns The site page view count
 */
async function fetchBusuanziSitePV(hostSanitized: string, hostOriginal: string) {
	// Note: host is already sanitized by the caller
	const headers = {
		Referer: `https://${hostOriginal}/`,
		Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
	};

	const data = await fetchBusuanziData(BUSUANZI_URL, headers);
	if (data) {
		const sitePv = data.site_pv || 0;
		await kv.set(`pv:busuanzi:site:${hostSanitized}`, sitePv, { ex: EXPIRATION_TIME });
		logger.debug(`Site PV data retrieved and stored for ${hostSanitized}`);
		return sitePv;
	} else {
		await kv.set(`pv:busuanzi:site:${hostSanitized}`, 0, {
			ex: EXPIRATION_TIME,
		});
		logger.error(
			`Max retries exceeded for ${hostSanitized}. Defaulting PV values to 0.`
		);
	}
}

/**
 * Retrieves page view count for a specific page from Busuanzi service
 * @param host The hostname
 * @param path The path
 * @returns The page view count
 */
async function fetchBusuanziPagePV(hostSanitized: string, pathSanitized: string, hostOriginal: string, pathOriginal: string) {
	// Note: host and path are already sanitized by the caller
	const headers = {
		Referer: `https://${hostOriginal}${pathOriginal}`,
		Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
	};

	const headersWithSlash = {
		...headers,
		Referer: `${headers["Referer"]}/`,
	};

	// Make both API calls in parallel
	const [dataNoSlashResult, dataSlashResult] = await Promise.all([
		fetchBusuanziData(BUSUANZI_URL, headers),
		fetchBusuanziData(BUSUANZI_URL, headersWithSlash),
	]);

	if (dataNoSlashResult && dataSlashResult) {
		const pagePv = Math.max(
			dataNoSlashResult.page_pv || 0,
			dataSlashResult.page_pv || 0
		);
		await kv.set(`pv:busuanzi:page:${hostSanitized}:${pathSanitized}`, pagePv, {
			ex: EXPIRATION_TIME,
		});
		logger.debug(
			`Page PV data retrieved and stored for ${hostSanitized}${pathSanitized}, ${pagePv}`
		);
		return pagePv;
	} else if (dataNoSlashResult || dataSlashResult) {
		const pagePv = (dataNoSlashResult || dataSlashResult).page_pv || 0;
		await kv.set(`pv:busuanzi:page:${hostSanitized}:${pathSanitized}`, pagePv, {
			ex: EXPIRATION_TIME,
		});
		logger.debug(
			`Page PV data retrieved and stored for ${hostSanitized}${pathSanitized}, ${pagePv}`
		);
		return pagePv;
	} else {
		await kv.set(`pv:busuanzi:page:${hostSanitized}:${pathSanitized}`, 0, { ex: EXPIRATION_TIME });
		logger.error(
			`Max retries exceeded for ${hostSanitized}${pathSanitized}. Defaulting Page PV values to 0.`
		);
		return 0;
	}
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
			logger.debug(`Busuanzi sync request sent for: https://${hostOriginal}${pathOriginal}`);
		})
		.catch((e) => {
			logger.error(
				`Busuanzi sync failed for: https://${hostOriginal}${pathOriginal}. Error: ${e}`
			);
		});
}

export {
	fetchBusuanziSiteUV,
	fetchBusuanziSitePV,
	fetchBusuanziPagePV,
	notifyBusuanziService,
};
