import { headers } from "next/headers";
import {
  fetchPagePVHistory,
  fetchSitePVHistory,
  fetchSiteUVHistory,
  incrementPagePV,
  incrementSitePV,
  recordSiteUV,
} from "@/utils/counter";
import { notifyBusuanziService } from "@/utils/busuanzi";
import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { ipAddress } from "@vercel/functions";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Check rate limit first
  const rateLimitResult = await checkRateLimit(req);
  if (!rateLimitResult.success) {
    return Response.json({ 
      error: rateLimitResult.error || "Rate limit exceeded"
    }, { status: 429 });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    logger.warn(`GET request with missing URL parameter`, { status: 400 });
    return Response.json({ error: "Missing url parameter" }, { status: 400 });
  }
  
  // Validate URL format
  try {
    const parsedUrl = new URL(targetUrl);
    
    // Check if it's a file:// URL or other non-http(s) protocol
    if (!parsedUrl.protocol.startsWith('http')) {
      logger.warn(`Invalid URL protocol: ${parsedUrl.protocol}`, { status: 400 });
      return Response.json({ 
        error: "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }, { status: 200 });
    }
    
    // Check if host is empty
    if (!parsedUrl.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return Response.json({ 
        error: "Invalid URL host",
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }, { status: 200 });
    }
    
    const host = parsedUrl.host;
    const path = parsedUrl.pathname.replace(/\/index$/, "");
    
    // Get the counts without updating them
    const [siteUV, sitePV, pagePV] = await Promise.all([
      fetchSiteUVHistory(host, path),
      fetchSitePVHistory(host, path),
      fetchPagePVHistory(host, path),
    ]);
    
    logger.info(`Retrieved data for GET request`, {
      host,
      path,
      siteUV,
      sitePV,
      pagePV,
    });
    
    return Response.json({
      site_uv: siteUV,
      site_pv: sitePV,
      page_pv: pagePV,
    });
    
  } catch (error) {
    logger.warn(`Invalid URL format: ${targetUrl}`, { status: 400, error });
    return Response.json({ 
      error: "Invalid URL format",
      site_uv: 0,
      site_pv: 0,
      page_pv: 0
    }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  // Check rate limit first
  const rateLimitResult = await checkRateLimit(req);
  if (!rateLimitResult.success) {
    return Response.json({ 
      error: rateLimitResult.error || "Rate limit exceeded"
    }, { status: 429 });
  }

  const header = await headers();
  const data = await req.json();

  if (!data.url) {
    logger.warn(`POST request with missing URL`, { status: 400 });
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  // Validate URL format
  try {
    const url = new URL(data.url);
    
    // Check if it's a file:// URL or other non-http(s) protocol
    if (!url.protocol.startsWith('http')) {
      logger.warn(`Invalid URL protocol: ${url.protocol}`, { status: 400 });
      return Response.json({ 
        error: "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }, { status: 200 }); // Return 200 with zeros to not break client
    }
    
    // Check if host is empty
    if (!url.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return Response.json({ 
        error: "Invalid URL host",
        site_uv: 0,
        site_pv: 0,
        page_pv: 0
      }, { status: 200 }); // Return 200 with zeros to not break client
    }
  } catch (error) {
    logger.warn(`Invalid URL format: ${data.url}`, { status: 400, error });
    return Response.json({ 
      error: "Invalid URL format",
      site_uv: 0,
      site_pv: 0,
      page_pv: 0
    }, { status: 200 }); // Return 200 with zeros to not break client
  }

  // Check for browser token
  const browserToken = data.token || header.get("X-Browser-Token");
  if (!browserToken) {
    logger.warn(`POST request with missing browser token`, { status: 400 });
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const clientHost =
    ipAddress(req) ||
    header.get("X-Real-IP") ||
    header.get("X-Forwarded-For")?.split(",")[0];

  // Use structured logging where possible for easier parsing
  logger.debug("Request details", {
    clientHost,
    realIp: header.get("X-Real-IP"),
    xForwardedFor: header.get("X-Forwarded-For"),
    reqIp: ipAddress(req),
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
    fetchSiteUVHistory(host, path),
    fetchSitePVHistory(host, path),
    fetchPagePVHistory(host, path),
  ]);

  // logger.info(`Initial data`, {
  //   siteUVBefore,
  //   sitePVBefore,
  //   pagePVBefore,
  // });

  let [siteUVAfter, sitePVAfter, pagePVAfter] = await Promise.all([
    recordSiteUV(host, clientHost),
    incrementSitePV(host),
    incrementPagePV(host, path),
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

  notifyBusuanziService(host, path);

  const dataDict = {
    site_uv: siteUVAfter,
    site_pv: sitePVAfter,
    page_pv: pagePVAfter,
  };
  return Response.json(dataDict);
}

export async function OPTIONS() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Browser-Token",
  };
  return NextResponse.json({ message: "OK" }, { headers: corsHeaders });
}