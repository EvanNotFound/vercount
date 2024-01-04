# coding:utf-8
import time
import requests
import logging
from constants import EXPIRATION_TIME
# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
REQUEST_TIMEOUT = 3
MAX_RETRIES = 3
from redis_connection import redis_client

def get_busuanzi_site_uv_data(host, path):
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
                redis_client.set(f"live_site_uv:{host}", site_uv, ex=EXPIRATION_TIME)
                logging.debug(f"Data received: {data_dict}")
                logging.info(f"Data successfully retrieved and stored for host {host}")
                return data_dict
            else:
                logging.warning(f"Received non-200 response: {response.status_code}")
        except requests.RequestException as e:
            logging.error(f"Attempt {attempt + 1} failed with error: {e}")
            time.sleep(1)

    redis_client.set(f"live_site_uv:{host}", 0, ex=EXPIRATION_TIME)
    logging.error(f"Max retries exceeded for host {host}. Defaulting values to 0.")
    return {"site_uv": 0, "page_pv": 0, "site_pv": 0}


def get_busuanzi_site_pv_data(host, path):
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
                redis_client.set(f"live_site_pv:{host}", site_pv, ex=EXPIRATION_TIME)
                logging.debug(f"Data received: {data_dict}")
                logging.info(f"Data successfully retrieved and stored for host {host}")
                return data_dict
            else:
                logging.warning(f"Received non-200 response: {response.status_code}")
        except requests.RequestException as e:
            logging.error(f"Attempt {attempt + 1} failed with error: {e}")
            time.sleep(1)

    redis_client.set(f"live_site_pv:{host}", 0, ex=EXPIRATION_TIME)
    logging.error(f"Max retries exceeded for host {host}. Defaulting values to 0.")
    return {"site_uv": 0, "page_pv": 0, "site_pv": 0}

def get_busuanzi_page_pv_data(host, path):
    logging.info(f"Starting to get data from busuanzi for host: {host}")
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers_no_slash = {
        'Referer': f"https://{host}{path}",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }
    headers_slash = {
        'Referer': f"https://{host}{path}/",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }

    for attempt in range(MAX_RETRIES):
        logging.debug(f"Attempt {attempt + 1}: Sending request to {url}")
        try:
            response_no_slash = requests.get(url, headers=headers_no_slash, timeout=REQUEST_TIMEOUT)
            response_slash = requests.get(url, headers=headers_slash, timeout=REQUEST_TIMEOUT)
            logging.debug(f"Response received with status code {response_no_slash.status_code}")
            logging.debug(f"Response received with status code {response_slash.status_code}")
            if response_no_slash.status_code == 200 and response_slash.status_code == 200:
                # Safe JSON parsing
                data_str_no_slash = response_no_slash.text[34:-13]
                data_str_slash = response_slash.text[34:-13]
                data_dict_no_slash = eval(data_str_no_slash)
                data_dict_slash = eval(data_str_slash)
                page_pv_no_slash = data_dict_no_slash["page_pv"]
                page_pv_slash = data_dict_slash["page_pv"]
                page_pv = page_pv_no_slash > page_pv_slash and page_pv_no_slash or page_pv_slash

                redis_client.set(f"live_page_pv:{host}{path}", page_pv, ex=EXPIRATION_TIME)
                logging.debug(f"Data with no slash received: {data_dict_no_slash}")
                logging.debug(f"Data with slash received: {data_dict_slash}")
                logging.info(f"Data successfully retrieved and stored for host {host}")
                return {"page_pv": page_pv}
            else:
                logging.warning(f"Received non-200 response: {response_slash.status_code} and {response_no_slash.status_code}")
        except requests.RequestException as e:
            logging.error(f"Attempt {attempt + 1} failed with error: {e}")
            time.sleep(1)

    logging.error(f"Max retries exceeded for host {host}. Defaulting values to 0.")
    return {"page_pv": 0}