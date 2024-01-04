from redis_connection import redis_client
from constants import EXPIRATION_TIME


async def update_site_uv(site_name, ip):
    """
    Adds an IP to the set of unique visitors (UV) for a site and sets an expiration time.

    Args:
    site_name (str): The name of the site.
    ip (str): The IP address of the visitor.

    Returns:
    int: The number of unique visitors for the site.
    """
    site_uv_key = f"site_uv:{site_name}"
    live_site_key = f"live_site_uv:{site_name}"

    # Add IP to the set and get the count of unique visitors
    redis_client.sadd(site_uv_key, ip)
    site_uv_count = redis_client.scard(site_uv_key)

    # Set expiration for the unique visitors set and live site key
    redis_client.expire(site_uv_key, EXPIRATION_TIME)
    redis_client.expire(live_site_key, EXPIRATION_TIME)

    return site_uv_count
