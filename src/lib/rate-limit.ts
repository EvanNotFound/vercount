import { NextRequest } from "next/server";
import { ipAddress } from "@vercel/functions";
import { Ratelimit } from "@upstash/ratelimit";
import kv from "@/lib/kv";
import logger from "@/lib/logger";

// Rate limiting configuration: 80 requests per minute sliding window
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(80, "1 m"),
});

// Expanded regex to detect various bot and script user agents
const suspiciousUARegex = /python-requests|python\/|requests\/|curl\/|wget\/|go-http-client\/|httpie\/|postman\/|axios\/|node-fetch\/|empty|unknown|bot|crawl|spider/i;

// Store blocked IPs with a TTL
async function isIPBlocked(ip: string): Promise<boolean> {
  const blockedUntil = await kv.get(`blocked:${ip}`);
  return blockedUntil !== null && parseInt(blockedUntil as string) > Date.now();
}

async function blockIP(ip: string, durationHours = 24): Promise<void> {
  const blockUntil = Date.now() + (durationHours * 60 * 60 * 1000);
  await kv.set(`blocked:${ip}`, blockUntil.toString(), { ex: durationHours * 60 * 60 });
  logger.warn(`IP blocked for ${durationHours} hours`, { ip });
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  reset: number;
  remaining: number;
  error?: string;
}

export async function checkRateLimit(request: NextRequest): Promise<RateLimitResult> {
  const ip = ipAddress(request) ?? "127.0.0.1";
  const ua = request.headers.get("user-agent")?.toLowerCase() || "unknown";

  // Check if IP is already blocked (commented out for now as in original middleware)
  // if (await isIPBlocked(ip)) {
  //   logger.warn("Request from blocked IP", { ip, ua });
  //   return {
  //     success: false,
  //     limit: 0,
  //     reset: 0,
  //     remaining: 0,
  //     error: "IP blocked"
  //   };
  // }

  // Perform rate limiting
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    logger.warn("Rate limit exceeded", {
      ip,
      limit,
      reset,
      remaining,
      ua,
    });
    return {
      success: false,
      limit,
      reset,
      remaining,
      error: "Rate limit exceeded"
    };
  }

  // Log request details
  logger.info("Request received", {
    ip,
    ua,
    timestamp: Date.now(),
    path: request.nextUrl.pathname,
  });

  // Check for suspicious user agents (warning only, not blocking as in original)
  if (suspiciousUARegex.test(ua)) {
    logger.warn("Suspicious user agent detected", { ip, ua });
    // Could implement IP blocking here if needed:
    // await blockIP(ip, 24);
  }

  // Log warning if approaching rate limit
  if (remaining < 20) {
    logger.warn("Approaching rate limit", {
      ip,
      remaining,
      ua,
    });
  }

  return {
    success: true,
    limit,
    reset,
    remaining
  };
}

export { blockIP, isIPBlocked };