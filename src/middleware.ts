import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import logger from "@/lib/logger";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

// Precompile the User-Agent regex
const uaRegex = /mozilla\/|chrome\/|safari\//;

export const config = {
  matcher: "/log",
};

export default async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const ua = request.headers.get("user-agent")?.toLowerCase() || "unknown";

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
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Log only if rate limit check passes
  logger.info({
    message: "Request received",
    ip,
    ua,
    timestamp: Date.now(), // Use numeric timestamp for better performance
    path: request.nextUrl.pathname,
  });

  // Optional: Check User-Agent validity
  // const isUAValid = uaRegex.test(ua);
  // if (!isUAValid) {
  //   logger.error(
  //     `Unauthorized access attempt with invalid User-Agent. IP: ${ip}, User-Agent: ${ua}`,
  //   );
  //   return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // }

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
