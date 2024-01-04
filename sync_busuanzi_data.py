import asyncio
import logging
import httpx


async def send_busuanzi_request(host, path):
    url = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback_777487655111"
    headers = {
        'Referer': f"https://{host}{path}",
        'Cookie': 'busuanziId=89D15D1F66D2494F91FB315545BF9C2A'
    }
    logging.info(f"Sending request from busuanzi for host: https://{host}{path}")

    async with httpx.AsyncClient() as client:
        try:
            sleep_time = 0.5
            await asyncio.sleep(sleep_time)
            await client.get(url, headers=headers)
            logging.info(f"Request successfully sent for host: https://{host}{path}")
        except Exception as e:
            logging.error(f"Request failed with error: {e}")
