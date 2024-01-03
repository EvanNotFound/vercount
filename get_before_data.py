# coding:utf-8
import time
import requests
import redis
import os

# Constants
REQUEST_TIMEOUT = 3
MAX_RETRIES = 3
EXPIRATION_TIME = 60 * 60 * 24 * 30  # 30 days
from redis_connection import redis_client


def get_data_from_busuanzi(host):
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}/",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
            if response.status_code == 200:
                # Safe JSON parsing
                data_str = response.text[34:-13]
                data_dict = response.json(data_str)
                return data_dict
        except requests.RequestException as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(1)

    redis_client.set(f"live_site:{host}", 0, ex=EXPIRATION_TIME)
    return {"site_uv": 0, "page_pv": 0, "site_pv": 0}
