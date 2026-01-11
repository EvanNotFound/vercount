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
		await kv.set(`uv:baseline:${hostSanitized}`, siteUv, { ex: EXPIRATION_TIME });
		logger.debug(`UV data retrieved and stored for ${hostSanitized}`);
		return siteUv;
	} else {
		await kv.set(`uv:baseline:${hostSanitized}`, 0, {
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
		await kv.set(`pv:site:${hostSanitized}`, sitePv, { ex: EXPIRATION_TIME });
		logger.debug(`Site PV data retrieved and stored for ${hostSanitized}`);
		return sitePv;
	} else {
		await kv.set(`pv:site:${hostSanitized}`, 0, {
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
		await kv.set(`pv:page:${hostSanitized}:${pathSanitized}`, pagePv, {
			ex: EXPIRATION_TIME,
		});
		logger.debug(
			`Page PV data retrieved and stored for ${hostSanitized}${pathSanitized}, ${pagePv}`
		);
		return pagePv;
	} else if (dataNoSlashResult || dataSlashResult) {
		const pagePv = (dataNoSlashResult || dataSlashResult).page_pv || 0;
		await kv.set(`pv:page:${hostSanitized}:${pathSanitized}`, pagePv, {
			ex: EXPIRATION_TIME,
		});
		logger.debug(
			`Page PV data retrieved and stored for ${hostSanitized}${pathSanitized}, ${pagePv}`
		);
		return pagePv;
	} else {
		await kv.set(`pv:page:${hostSanitized}:${pathSanitized}`, 0, { ex: EXPIRATION_TIME });
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

/**
 * Force sync site UV from Busuanzi service (overwrites existing data)
 * @param hostSanitized The sanitized hostname
 * @param hostOriginal The original hostname
 * @returns Object with success status and the synced value or error message
 */
async function forceSyncBusuanziSiteUV(hostSanitized: string, hostOriginal: string): Promise<{ success: boolean; value?: number; error?: string }> {
	const headers = {
		Referer: `https://${hostOriginal}/`,
		Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
	};

	const data = await fetchBusuanziData(BUSUANZI_URL, headers);
	if (data) {
		const siteUv = data.site_uv || 0;
		await kv.set(`uv:baseline:${hostSanitized}`, siteUv, { ex: EXPIRATION_TIME });
		logger.info(`Force sync: UV data retrieved and stored for ${hostSanitized}: ${siteUv}`);
		return { success: true, value: siteUv };
	} else {
		logger.error(`Force sync: Failed to retrieve UV data from Busuanzi for ${hostSanitized}`);
		return { success: false, error: "Failed to retrieve data from Busuanzi service. The service may be temporarily unavailable." };
	}
}

/**
 * Force sync site PV from Busuanzi service (overwrites existing data)
 * @param hostSanitized The sanitized hostname
 * @param hostOriginal The original hostname
 * @returns Object with success status and the synced value or error message
 */
async function forceSyncBusuanziSitePV(hostSanitized: string, hostOriginal: string): Promise<{ success: boolean; value?: number; error?: string }> {
	const headers = {
		Referer: `https://${hostOriginal}/`,
		Cookie: "busuanziId=89D15D1F66D2494F91FB315545BF9C2A",
	};

	const data = await fetchBusuanziData(BUSUANZI_URL, headers);
	if (data) {
		const sitePv = data.site_pv || 0;
		await kv.set(`pv:site:${hostSanitized}`, sitePv, { ex: EXPIRATION_TIME });
		logger.info(`Force sync: Site PV data retrieved and stored for ${hostSanitized}: ${sitePv}`);
		return { success: true, value: sitePv };
	} else {
		logger.error(`Force sync: Failed to retrieve Site PV data from Busuanzi for ${hostSanitized}`);
		return { success: false, error: "Failed to retrieve data from Busuanzi service. The service may be temporarily unavailable." };
	}
}

/**
 * Force sync all data (site UV, site PV) from Busuanzi service
 * @param hostSanitized The sanitized hostname
 * @param hostOriginal The original hostname
 * @returns Object with success status and synced values or error messages
 */
async function forceSyncAllFromBusuanzi(hostSanitized: string, hostOriginal: string): Promise<{
	success: boolean;
	siteUv?: { success: boolean; value?: number; error?: string };
	sitePv?: { success: boolean; value?: number; error?: string };
	error?: string;
}> {
	logger.info(`Force sync: Starting full sync from Busuanzi for ${hostSanitized}`);
	
	// Sync both UV and PV in parallel
	const [uvResult, pvResult] = await Promise.all([
		forceSyncBusuanziSiteUV(hostSanitized, hostOriginal),
		forceSyncBusuanziSitePV(hostSanitized, hostOriginal),
	]);

	const overallSuccess = uvResult.success && pvResult.success;
	
	logger.info(`Force sync completed for ${hostSanitized}: UV=${uvResult.success}, PV=${pvResult.success}`);
	
	return {
		success: overallSuccess,
		siteUv: uvResult,
		sitePv: pvResult,
		error: overallSuccess ? undefined : "Some data failed to sync from Busuanzi",
	};
}

export {
	fetchBusuanziSiteUV,
	fetchBusuanziSitePV,
	fetchBusuanziPagePV,
	notifyBusuanziService,
	forceSyncBusuanziSiteUV,
	forceSyncBusuanziSitePV,
	forceSyncAllFromBusuanzi,
};
