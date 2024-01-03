from redis_connection import redis_client


redis_client.sadd("site_uv:icodeq.com", "127.0.0.1")
