# coding:utf-8
import time
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
REQUEST_TIMEOUT = 3
MAX_RETRIES = 3
EXPIRATION_TIME = 60 * 60 * 24 * 30  # 30 days
from redis_connection import redis_client

def get_data_from_busuanzi(host):
    logging.info(f"Starting to get data from busuanzi for host: {host}")
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}/",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    for attempt in range(MAX_RETRIES):
        logging.debug(f"Attempt {attempt + 1}: Sending request to {url}")
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            logging.debug(f"Response received with status code {response.status_code}")
            if response.status_code == 200:
                # Safe JSON parsing
                data_str = response.text[34:-13]
                data_dict = eval(data_str)
                site_uv = data_dict["site_uv"]
                site_pv = data_dict["site_pv"]
                page_pv = data_dict["page_pv"]
                redis_client.set(f"live_site:{host}", site_uv, ex=EXPIRATION_TIME)
                redis_client.set(f"site_pv:{host}", site_pv, ex=EXPIRATION_TIME)
                logging.info(f"Data successfully retrieved and stored for host {host}")
                return data_dict
            else:
                logging.warning(f"Received non-200 response: {response.status_code}")
        except requests.RequestException as e:
            logging.error(f"Attempt {attempt + 1} failed with error: {e}")
            time.sleep(1)

    redis_client.set(f"live_site:{host}", 0, ex=EXPIRATION_TIME)
    logging.error(f"Max retries exceeded for host {host}. Defaulting values to 0.")
    return {"site_uv": 0, "page_pv": 0, "site_pv": 0}

logging.info("Process finished.")