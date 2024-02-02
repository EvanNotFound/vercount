import { headers } from "next/headers";
import {
  getPagePVBeforeData,
  getSitePVBeforeData,
  getSiteUVBeforeData,
} from "@/lib/get-before-data";
import { updatePagePV, updateSitePV, updateSiteUV } from "@/lib/update-data";
import syncBusuanziData from "@/lib/sync-busuanzi-data";
import logger from "@/lib/logger";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const header = headers();
    const data = await req.json();

    if (!data.url) {
      logger.error(`POST request with missing URL in the body.`);
      return Response.json({ error: "Missing url" }, { status: 400 });
    }

    const clientHost =
      req.ip ||
      header.get("X-Real-IP") ||
      header.get("X-Forwarded-For")?.split(",")[0];
    const referer = header.get("Referer");

    if (!clientHost || !referer) {
      logger.error(
        `Unauthorized access attempt detected. Client host or referer missing.`,
      );
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const parsedUrl = new URL(data.url);
    const [host, path] = [
      parsedUrl.host,
      parsedUrl.pathname.replace(/\/index$/, ""),
    ];

    const [siteUVBefore, sitePVBefore, pagePVBefore] = await Promise.all([
      getSiteUVBeforeData(host, path),
      getSitePVBeforeData(host, path),
      getPagePVBeforeData(host, path),
    ]);

    let [siteUVAfter, sitePVAfter, pagePVAfter] = await Promise.all([
      updateSiteUV(host, clientHost),
      updateSitePV(host),
      updatePagePV(host, path),
    ]);

    // Accumulate the counts
    siteUVAfter += siteUVBefore;
    sitePVAfter += sitePVBefore;
    pagePVAfter += pagePVBefore;

    logger.info(
      `After update - Site UV: ${siteUVAfter}, Site PV: ${sitePVAfter}, Page PV: ${pagePVAfter}, Host: https://${host}${path}`,
    );

    // Sync with external system if needed
    syncBusuanziData(host, path);

    const dataDict = {
      site_uv: siteUVAfter,
      site_pv: sitePVAfter,
      page_pv: pagePVAfter,
    };
    return Response.json(dataDict);
  } catch (error: any) {
    logger.error(`Error processing POST request: ${error.message}`);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return Response.json({}, { status: 204 });
}
