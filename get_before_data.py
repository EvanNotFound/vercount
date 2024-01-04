import logging

from redis_connection import redis_client
from get_busuanzi_data import get_busuanzi_page_pv_data, get_busuanzi_site_uv_data, get_busuanzi_site_pv_data

def get_page_pv_before(host, path):
    """
    Retrieves the page view (PV) count for a specific page.

    Args:
    host (str): The host name.
    path (str): The path of the page.

    Returns:
    int: The page view count for the page.
    """
    page_key = f"live_page_pv:{host}{path}"
    page_pv = redis_client.get(page_key)
    logging.debug(f"page_pv: {page_pv}, page_key: {page_key}")
    if page_pv is None:
        page_pv = get_busuanzi_page_pv_data(host, path)["page_pv"]
        return page_pv
    else:
        return int(page_pv.decode())


def get_site_pv_before(host, path):
    """
    Retrieves the site page view (PV) count for a specific site.

    Args:
    host (str): The host name.
    path (str): The path of the page.

    Returns:
    int: The site page view count for the site.
    """
    site_key = f"live_site_pv:{host}"
    site_pv = redis_client.get(site_key)
    if site_pv is None:
        site_pv = get_busuanzi_site_pv_data(host, path)["site_pv"]
        return site_pv
    else:
        return int(site_pv.decode())


def get_site_uv_before(host, path):
    """
    Retrieves the site unique visitor (UV) count for a specific site.

    Args:
    host (str): The host name.
    path (str): The path of the page.

    Returns:
    int: The site unique visitor count for the site.
    """
    site_key = f"live_site_uv:{host}"
    site_uv = redis_client.get(site_key)
    if site_uv is None:
        site_uv = get_busuanzi_site_uv_data(host, path)["site_uv"]
        return site_uv
    else:
        return int(site_uv.decode())
