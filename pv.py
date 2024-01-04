from redis_connection import redis_client
from constants import EXPIRATION_TIME




async def update_page_pv(host, path):
    """
    Increments and retrieves the page view (PV) count for a specific page and sets an expiration time.

    Args:
    host (str): The host name.
    path (str): The path of the page.

    Returns:
    int: The page view count for the page.
    """
    page_key = f"page_pv:{host}{path}"
    live_page_key = f"live_page_pv:{host}{path}"

    page_pv = redis_client.incr(page_key)

    # Set expiration for the page view count
    redis_client.expire(page_key, EXPIRATION_TIME)
    redis_client.expire(live_page_key, EXPIRATION_TIME)
    return page_pv


async def update_site_pv(site_name, ip):
    """
    Adds an IP to the set of unique visitors (UV) for a site and sets an expiration time.

    Args:
    site_name (str): The name of the site.
    ip (str): The IP address of the visitor.

    Returns:
    int: The number of unique visitors for the site.
    """
    site_pv_key = f"site_pv:{site_name}"
    live_site_key = f"live_site_pv:{site_name}"

    site_pv = redis_client.incr(site_pv_key)

    # Set expiration for the unique visitors set and live site key
    redis_client.expire(site_pv_key, EXPIRATION_TIME)
    redis_client.expire(live_site_key, EXPIRATION_TIME)

    return site_pv
