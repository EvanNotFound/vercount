import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import logger from "@/lib/logger"; // Ensure this is the correct import path for your logger

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(500, "1 h"),
});

export const config = {
  matcher: "/log",
};

export default async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const ua = request.headers.get("user-agent")?.toLowerCase() || "unknown";
  const isUAValid = /mozilla\/|chrome\/|safari\//.test(ua);

  // Enhanced logging for User-Agent validation
  // if (!isUAValid) {
  //   logger.error(
  //     `Unauthorized access attempt with invalid User-Agent. IP: ${ip}, User-Agent: ${ua}`,
  //   );
  //   return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // }

  logger.info({
    message: "Request received",
    ip,
    ua,
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
  });

  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    ip,
  );

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

  if (remaining < 20) {
    // Consider 20 as a threshold close to rate limit
    logger.warn({
      message: "Approaching rate limit",
      ip,
      remaining,
      ua,
    });
  }

  return NextResponse.next();
}
