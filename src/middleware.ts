import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(150, "1 h"),
});

// Define which routes you want to rate limit
export const config = {
  matcher: "/log",
};

export default async function middleware(request: NextRequest) {
  const ip = request.ip ?? "127.0.0.1";
  const { success, pending, limit, reset, remaining } = await ratelimit.limit(
    ip,
  );
  return success
    ? NextResponse.next()
    : NextResponse.json(
        {
          error: "Rate limit exceeded",
        },
        {
          status: 429,
        },
      );
}
