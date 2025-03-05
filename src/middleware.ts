import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import kv from "@/lib/kv";
import logger from "@/lib/logger";

// Stricter rate limiting: 50 requests per minute instead of 100
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(80, "1 m"),
});

// Precompile the User-Agent regex
const uaRegex = /mozilla\/|chrome\/|safari\//;
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
  logger.warn({
    message: `IP blocked for ${durationHours} hours`,
    ip,
  });
}

export const config = {
  matcher: ["/log", "/api/v1/log", "/api/v2/log"],
};

export default async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const ua = request.headers.get("user-agent")?.toLowerCase() || "unknown";

  // Check if IP is already blocked
  // if (await isIPBlocked(ip)) {
  //   logger.warn({
  //     message: "Request from blocked IP",
  //     ip,
  //     ua,
  //   });
  //   return NextResponse.json({ 
  //     status: "error",
  //     message: "Unauthorized access",
  //    }, { status: 403 });
  // }

  // Perform rate limiting first
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    logger.warn({
      message: "Rate limit exceeded",
      ip,
      limit,
      reset,
      remaining,
      ua,
    });
    return NextResponse.json({ 
      status: "error",
      message: "Rate limit exceeded",
    }, { status: 429 });
  }

  // Log only if rate limit check passes
  logger.info({
    message: "Request received",
    ip,
    ua,
    timestamp: Date.now(), // Use numeric timestamp for better performance
    path: request.nextUrl.pathname,
  });

  // Block suspicious user agents
  if (suspiciousUARegex.test(ua)) {
    // Block the IP for 24 hours after detecting suspicious UA
    // await blockIP(ip, 24);
    
    logger.warn({
      message: "Suspicious user agent detected",
      ip,
      ua,
    });
    // return NextResponse.json({ 
    //   status: "error",
    //   message: "Unauthorized access",
    // }, { status: 403 });
  }


  // Log warning if approaching rate limit
  if (remaining < 20) {
    logger.warn({
      message: "Approaching rate limit",
      ip,
      remaining,
      ua,
    });
  }

  return NextResponse.next();
}
