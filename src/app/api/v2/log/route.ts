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
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    logger.warn(`GET request with missing URL parameter`, { status: 400 });
    return Response.json({ 
      status: "error",
      message: "Missing url parameter" 
    }, { status: 400 });
  }
  
  // Validate URL format
  try {
    const parsedUrl = new URL(targetUrl);
    
    // Check if it's a file:// URL or other non-http(s) protocol
    if (!parsedUrl.protocol.startsWith('http')) {
      logger.warn(`Invalid URL protocol: ${parsedUrl.protocol}`, { status: 400 });
      return Response.json({ 
        status: "error",
        message: "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        data: {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0
        }
      }, { status: 200 });
    }
    
    // Check if host is empty
    if (!parsedUrl.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return Response.json({ 
        status: "error",
        message: "Invalid URL host",
        data: {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0
        }
      }, { status: 200 });
    }
    
    const host = parsedUrl.host;
    const path = parsedUrl.pathname.replace(/\/index$/, "");
    
    // Get the counts without updating them
    const [siteUV, sitePV, pagePV] = await Promise.all([
      getSiteUVBeforeData(host, path),
      getSitePVBeforeData(host, path),
      getPagePVBeforeData(host, path),
    ]);
    
    logger.info(`Retrieved data for GET request`, {
      host,
      path,
      siteUV,
      sitePV,
      pagePV,
    });
    
    return Response.json({
      status: "success",
      message: "Data retrieved successfully",
      data: {
        site_uv: siteUV,
        site_pv: sitePV,
        page_pv: pagePV,
      }
    });
    
  } catch (error) {
    logger.warn(`Invalid URL format: ${targetUrl}`, { status: 400, error });
    return Response.json({ 
      status: "error",
      message: "Invalid URL format",
      data: {
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }
    }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const header = headers();
  const data = await req.json();

  if (!data.url) {
    logger.warn(`POST request with missing URL`, { status: 400 });
    return Response.json({ 
      status: "error",
      message: "Missing url" 
    }, { status: 400 });
  }

  // Validate URL format
  try {
    const url = new URL(data.url);
    
    // Check if it's a file:// URL or other non-http(s) protocol
    if (!url.protocol.startsWith('http')) {
      logger.warn(`Invalid URL protocol: ${url.protocol}`, { status: 400 });
      return Response.json({ 
        status: "error",
        message: "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        data: {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0
        }
      }, { status: 200 }); // Return 200 with zeros to not break client
    }
    
    // Check if host is empty
    if (!url.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return Response.json({ 
        status: "error",
        message: "Invalid URL host",
        data: {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0
        }
      }, { status: 200 }); // Return 200 with zeros to not break client
    }
  } catch (error) {
    logger.warn(`Invalid URL format: ${data.url}`, { status: 400, error });
    return Response.json({ 
      status: "error",
      message: "Invalid URL format",
      data: {
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }
    }, { status: 200 }); // Return 200 with zeros to not break client
  }

  // Check for browser token
  const browserToken = data.token || header.get("X-Browser-Token");
  if (!browserToken) {
    logger.warn(`POST request with missing browser token`, { status: 400 });
    return Response.json({ 
      status: "error",
      message: "Missing token" 
    }, { status: 400 });
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
    return Response.json({ 
      status: "error",
      message: "Missing host" 
    }, { status: 400 });
  }

  const parsedUrl = new URL(data.url);
  const [host, path] = [
    parsedUrl.host,
    parsedUrl.pathname.replace(/\/index$/, ""),
  ];

  // Get initial data and update counts in parallel
  const [
    initialData,
    updateResults
  ] = await Promise.all([
    // Get initial data
    Promise.all([
      getSiteUVBeforeData(host, path),
      getSitePVBeforeData(host, path),
      getPagePVBeforeData(host, path),
    ]),
    // Update counts
    Promise.all([
      updateSiteUV(host, clientHost),
      updateSitePV(host),
      updatePagePV(host, path),
    ])
  ]);

  const [siteUVBefore, sitePVBefore, pagePVBefore] = initialData;
  const [siteUVAfter, sitePVAfter, pagePVAfter] = updateResults;

  // Add the before values to the after values
  const finalSiteUV = siteUVAfter + siteUVBefore;
  const finalSitePV = sitePVAfter + sitePVBefore;
  const finalPagePV = pagePVAfter + pagePVBefore;

  logger.info(`Data updated`, {
    host,
    path,
    siteUVAfter: finalSiteUV,
    sitePVAfter: finalSitePV,
    pagePVAfter: finalPagePV,
  });

  // Fire and forget
  syncBusuanziData(host, path);

  return Response.json({
    status: "success",
    message: "Data updated successfully",
    data: {
      site_uv: finalSiteUV,
      site_pv: finalSitePV,
      page_pv: finalPagePV,
    }
  });
}

export async function OPTIONS() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Browser-Token",
  };
  return NextResponse.json({ 
    status: "success",
    message: "OK" 
  }, { headers: corsHeaders });
} 