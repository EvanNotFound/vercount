from redis_connection import redis_client

# Constants
EXPIRATION_TIME = 60 * 60 * 24 * 30  # 30 days in seconds

def pv(host, path):
    """
    Increments and retrieves the page view (PV) count for a specific page and site.

    Args:
    host (str): The host name.
    path (str): The path of the page.

    Returns:
    tuple: A tuple containing the page view count for the page and the site.
    """
    # Increment page view count for the specific page
    page_key = f"page_pv:{host}:{path}"
    page_pv = redis_client.incr(page_key)

    # Increment page view count for the site
    site_key = f"site_pv:{host}"
    site_pv = redis_client.incr(site_key)

    # Set expiration for site page view count
    redis_client.expire(site_key, EXPIRATION_TIME)

    return page_pv, site_pv