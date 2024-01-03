import redis
import os
from dotenv import load_dotenv
load_dotenv()  # This loads the environment variables from .env

def get_redis_client():
    return redis.Redis(
        host=os.environ.get('REDIS_HOST', 'default_host'),
        password=os.environ.get('REDIS_PASSWORD', 'default_password'),
        port=int(os.environ.get('REDIS_PORT', 6379)),
        db=int(os.environ.get('REDIS_DB', 0)),
        ssl=True
    )

redis_client = get_redis_client()