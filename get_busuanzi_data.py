import httpx
import asyncio
import logging
import json
from constants import EXPIRATION_TIME
from redis_connection import redis_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
REQUEST_TIMEOUT = 3
MAX_RETRIES = 3

async def fetch_busuanzi_data(session, url, headers):
    for attempt in range(MAX_RETRIES):
        try:
            response = await session.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            if response.status_code == 200:
                data_str = response.text[34:-13]  # Adjust as needed
                data_dict = json.loads(data_str)
                return data_dict
            else:
                logging.warning(f"Non-200 response: {response.status_code}")
        except Exception as e:
            logging.error(f"Attempt {attempt + 1} failed: {e}")
            await asyncio.sleep(1)
    return None

async def get_busuanzi_site_uv_data(host, path):
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}/",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    async with httpx.AsyncClient() as session:
        data = await fetch_busuanzi_data(session, url, headers)
        if data:
            site_uv = data.get("site_uv", 0)
            redis_client.set(f"live_site_uv:{host}", site_uv, ex=EXPIRATION_TIME)
            logging.info(f"UV data retrieved and stored for {host}")
            logging.debug(f"UV data: {data}")
            return {"site_uv": site_uv}
        else:
            redis_client.set(f"live_site_uv:{host}", json.dumps({"site_uv": 0}), ex=EXPIRATION_TIME)
            logging.error(f"Max retries exceeded for {host}. Defaulting UV values to 0.")

async def get_busuanzi_site_pv_data(host, path):
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}/",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    async with httpx.AsyncClient() as session:
        data = await fetch_busuanzi_data(session, url, headers)
        if data:
            site_pv = data.get("site_pv", 0)
            redis_client.set(f"live_site_pv:{host}", site_pv, ex=EXPIRATION_TIME)
            logging.info(f"PV data retrieved and stored for {host}")
            logging.debug(f"PV data: {data}")
            return {"site_pv": site_pv}
        else:
            redis_client.set(f"live_site_pv:{host}", json.dumps({"site_pv": 0}), ex=EXPIRATION_TIME)
            logging.error(f"Max retries exceeded for {host}. Defaulting PV values to 0.")

async def get_busuanzi_page_pv_data(host, path):
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}{path}",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    async with httpx.AsyncClient() as session:
        data_no_slash, data_slash = await asyncio.gather(
            fetch_busuanzi_data(session, url, headers),
            fetch_busuanzi_data(session, url, {**headers, 'Referer': f"{headers['Referer']}/"})
        )

        if data_no_slash and data_slash:
            page_pv = max(data_no_slash.get("page_pv", 0), data_slash.get("page_pv", 0))
            redis_client.set(f"live_page_pv:{host}{path}", page_pv, ex=EXPIRATION_TIME)
            logging.info(f"Page PV data retrieved and stored for {host}{path}")
            logging.debug(f"Page PV data: {page_pv}")
            return {"page_pv": page_pv}
        elif data_no_slash:
            redis_client.set(f"live_page_pv:{host}{path}", data_no_slash.get("page_pv", 0), ex=EXPIRATION_TIME)
            logging.error(f"Max retries exceeded for {host}{path}. Defaulting Page PV values to 0.")
            return {"page_pv": data_no_slash.get("page_pv", 0)}
        elif data_slash:
            redis_client.set(f"live_page_pv:{host}{path}", data_slash.get("page_pv", 0), ex=EXPIRATION_TIME)
            logging.error(f"Max retries exceeded for {host}{path}. Defaulting Page PV values to 0.")
            return {"page_pv": data_slash.get("page_pv", 0)}
        else:
            redis_client.set(f"live_page_pv:{host}{path}", 0, ex=EXPIRATION_TIME)
            logging.error(f"Max retries exceeded for {host}{path}. Defaulting Page PV values to 0.")
