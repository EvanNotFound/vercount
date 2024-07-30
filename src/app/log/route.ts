import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  getPagePVBeforeData,
  getSitePVBeforeData,
  getSiteUVBeforeData,
} from "@/lib/get-before-data";
import { updatePagePV, updateSitePV, updateSiteUV } from "@/lib/update-data";
import syncBusuanziData from "@/lib/sync-busuanzi-data";
import logger from "@/lib/logger"; // Ensure this logger is configured for env-based logging
import type { NextRequest } from "next/server";

export async function GET(req: Request) {
  return redirect("/");
}

export async function POST(req: NextRequest) {
  const header = headers();
  const data = await req.json();

  if (!data.url) {
    logger.warn(`POST request with missing URL`, { status: 400 });
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const clientHost =
    req.ip ||
    header.get("X-Real-IP") ||
    header.get("X-Forwarded-For")?.split(",")[0];

  // Use structured logging where possible for easier parsing
  logger.debug("Request details", {
    clientHost,
    realIp: header.get("X-Real-IP"),
    xForwardedFor: header.get("X-Forwarded-For"),
    reqIp: req.ip,
  });

  if (!clientHost) {
    logger.warn(`POST request with missing client host`, { status: 400 });
    return Response.json({ error: "Missing host" }, { status: 400 });
  }

  const parsedUrl = new URL(data.url);
  const [host, path] = [
    parsedUrl.host,
    parsedUrl.pathname.replace(/\/index$/, ""),
  ];

  // logger.info(`Processing request`, { host, path, clientHost });

  const [siteUVBefore, sitePVBefore, pagePVBefore] = await Promise.all([
    getSiteUVBeforeData(host, path),
    getSitePVBeforeData(host, path),
    getPagePVBeforeData(host, path),
  ]);

  // logger.info(`Initial data`, {
  //   siteUVBefore,
  //   sitePVBefore,
  //   pagePVBefore,
  // });

  let [siteUVAfter, sitePVAfter, pagePVAfter] = await Promise.all([
    updateSiteUV(host, clientHost),
    updateSitePV(host),
    updatePagePV(host, path),
  ]);

  siteUVAfter += siteUVBefore;
  sitePVAfter += sitePVBefore;
  pagePVAfter += pagePVBefore;

  logger.info(`Data updated`, {
    host,
    path,
    siteUVAfter,
    sitePVAfter,
    pagePVAfter,
  });

  syncBusuanziData(host, path);

  const dataDict = {
    site_uv: siteUVAfter,
    site_pv: sitePVAfter,
    page_pv: pagePVAfter,
  };
  return Response.json(dataDict);
}
