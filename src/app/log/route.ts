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

export async function GET(req: Request) {
  return redirect("/");
}

export async function POST(req: Request) {
  const data = await req.json();

  if (!data.url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const clientHost = headers().get("host");
  if (!clientHost) {
    return Response.json({ error: "Missing host" }, { status: 400 });
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
