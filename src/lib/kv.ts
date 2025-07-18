import { Redis } from "@upstash/redis"
import { env } from "@/env";

const kv = new Redis({
  url: env.KV_REST_API_URL,
  token: env.KV_REST_API_TOKEN,
  enableAutoPipelining: true
});

export default kv;