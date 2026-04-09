import {
  fetchPagePVHistory,
  fetchSitePVHistory,
  fetchSiteUVHistory,
  incrementPagePV,
  incrementSitePV,
  recordSiteUV,
} from "@/utils/counter";
import logger from "@/lib/logger";
import { NextRequest } from "next/server";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Check rate limit first
  const rateLimitResult = await checkRateLimit(req);
  if (!rateLimitResult.success) {
    return errorResponse(rateLimitResult.error || "Rate limit exceeded", 429, {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
    });
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    logger.warn(`GET request with missing URL parameter`, { status: 400 });
    return ApiErrors.badRequest("Missing url parameter");
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(targetUrl);

    // Check if it's a file:// URL or other non-http(s) protocol
    if (!parsedUrl.protocol.startsWith("http")) {
      logger.warn(`Invalid URL protocol: ${parsedUrl.protocol}`, {
        status: 400,
      });
      return successResponse(
        {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0,
        },
        "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        200,
      );
    }

    // Check if host is empty
    if (!parsedUrl.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return successResponse(
        {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0,
        },
        "Invalid URL host",
        200,
      );
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

    return successResponse(
      {
        site_uv: siteUV,
        site_pv: sitePV,
        page_pv: pagePV,
      },
      "Data retrieved successfully",
    );
  } catch (error) {
    logger.warn(`Invalid URL format: ${targetUrl}`, { status: 400, error });
    return successResponse(
      {
        site_uv: 0,
        site_pv: 0,
        page_pv: 0,
      },
      "Invalid URL format",
      200,
    );
  }
}

export async function POST(req: NextRequest) {
  // Check rate limit first
  const rateLimitResult = await checkRateLimit(req);
  if (!rateLimitResult.success) {
    return errorResponse(rateLimitResult.error || "Rate limit exceeded", 429, {
      limit: rateLimitResult.limit,
      remaining: rateLimitResult.remaining,
    });
  }

  const data = await req.json();

  if (!data.url) {
    logger.warn(`POST request with missing URL`, { status: 400 });
    return ApiErrors.badRequest("Missing url");
  }

  // Validate URL format
  try {
    const url = new URL(data.url);

    // Check if it's a file:// URL or other non-http(s) protocol
    if (!url.protocol.startsWith("http")) {
      logger.warn(`Invalid URL protocol: ${url.protocol}`, { status: 400 });
      return successResponse(
        {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0,
        },
        "Invalid URL protocol. Only HTTP and HTTPS are supported.",
        200,
      );
    }

    // Check if host is empty
    if (!url.host) {
      logger.warn(`Invalid URL host: empty`, { status: 400 });
      return successResponse(
        {
          site_uv: 0,
          site_pv: 0,
          page_pv: 0,
        },
        "Invalid URL host",
        200,
      );
    }
  } catch (error) {
    logger.warn(`Invalid URL format: ${data.url}`, { status: 400, error });
    return successResponse(
      {
        site_uv: 0,
        site_pv: 0,
        page_pv: 0,
      },
      "Invalid URL format",
      200,
    );
  }

  const parsedUrl = new URL(data.url);
  const isNewUv = data.isNewUv === true;
  const [host, path] = [
    parsedUrl.host,
    parsedUrl.pathname.replace(/\/index$/, ""),
  ];

  // Update counts
  const [siteUV, sitePV, pagePV] = await Promise.all([
    recordSiteUV(host, isNewUv),
    incrementSitePV(host),
    incrementPagePV(host, path),
  ]);

  logger.info(`Data updated`, {
    host,
    path,
    isNewUv,
    siteUV,
    sitePV,
    pagePV,
  });

  return successResponse(
    {
      site_uv: siteUV,
      site_pv: sitePV,
      page_pv: pagePV,
    },
    "Data updated successfully",
  );
}

export async function OPTIONS() {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Browser-Token",
  };
  return successResponse(
    { message: "OK" },
    "CORS preflight successful",
    200,
    corsHeaders,
  );
}
