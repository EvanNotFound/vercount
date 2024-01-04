from redis_connection import redis_client

redis_client.sadd("site_uv:vercount.one", "127.0.0.1")
