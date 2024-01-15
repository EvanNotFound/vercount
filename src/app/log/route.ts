import { redirect } from "next/navigation";
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

export async function GET(req: Request) {
  return redirect("/");
}

export async function POST(req: NextRequest) {
  const header = headers();
  const data = await req.json();

  if (!data.url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const clientHost =
    header.get("X-Real-IP") || header.get("X-Forwarded-For")?.split(",")[0];
  console.log(`client_host: ${clientHost}`);
  if (!clientHost) {
    return Response.json({ error: "Missing host" }, { status: 400 });
  }
  const parsedUrl = new URL(data.url);
  const [host, path] = [
    parsedUrl.host,
    parsedUrl.pathname.replace(/\/index$/, ""),
  ];
  logger.info(`host: ${host}, path: ${path}, client_host: ${clientHost}`);

  const [siteUVBefore, sitePVBefore, pagePVBefore] = await Promise.all([
    getSiteUVBeforeData(host, path),
    getSitePVBeforeData(host, path),
    getPagePVBeforeData(host, path),
  ]);

  logger.info(
    `site_uv_before: ${siteUVBefore}, site_pv_before: ${sitePVBefore}, page_pv_before: ${pagePVBefore}`,
  );

  let [siteUVAfter, sitePVAfter, pagePVAfter] = await Promise.all([
    updateSiteUV(host, clientHost),
    updateSitePV(host),
    updatePagePV(host, path),
  ]);

  siteUVAfter += siteUVBefore;
  sitePVAfter += sitePVBefore;
  pagePVAfter += pagePVBefore;

  logger.info(
    `Data updated for host: https://${host}${path}. site_uv: ${siteUVAfter}, site_pv: ${sitePVAfter}, page_pv: ${pagePVAfter}`,
  );

  syncBusuanziData(host, path);

  const dataDict = {
    site_uv: siteUVAfter,
    site_pv: sitePVAfter,
    page_pv: pagePVAfter,
  };
  return Response.json(dataDict);
}
