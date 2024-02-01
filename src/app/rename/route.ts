import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET(req: NextRequest) {
  const oldKeysUV = await kv.scan(0, {
    count: 1000,
    match: "live_site_uv:*",
  });
  const oldKeysPV = await kv.scan(0, {
    count: 1000,
    match: "live_site_pv:*",
  });

  const UVkeys = oldKeysUV[1];
  const PVkeys = oldKeysPV[1];

  for (const key of UVkeys) {
    await kv.rename(key, key.replace("live_site_uv:", "site_uv_live:"));
  }
  for (const key of PVkeys) {
    await kv.rename(key, key.replace("live_site_pv:", "site_pv_live:"));
  }

  return NextResponse.json(
    {
      message: "ok",
    },
    {
      status: 200,
    },
  );
}
