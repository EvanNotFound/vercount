import { Redis } from "@upstash/redis"

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
  enableAutoPipelining: true
});

export default kv;