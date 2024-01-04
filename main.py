# coding:utf-8
import json
import logging
import os
from urllib.parse import urlparse

import uvicorn
from fastapi import FastAPI, Request, Header, Response
from fastapi.responses import FileResponse

from get_before_data import get_page_pv_before, get_site_pv_before, get_site_uv_before
from pv import update_site_pv, update_page_pv
from sync_busuanzi_data import send_busuanzi_request
from uv import update_site_uv
import asyncio

app = FastAPI(docs_url=None, redoc_url=None)

@app.get("/js")
async def serve_js():
    return FileResponse("statics/js/busuanzi.pure.mini.js")

@app.get("/css")
async def serve_css():
    return FileResponse("statics/css/style.css")

@app.get("/")
async def root(request: Request, referer: str = Header(None), jsonpCallback: str = ""):
    logging.info(f"New request received: referer={referer}, jsonpCallback={jsonpCallback}")

    if not referer:
        return FileResponse("statics/home.html")

    client_host = request.client.host
    parsed_url = urlparse(referer)
    host = parsed_url.netloc
    path = parsed_url.path.rstrip('/index')

    logging.info(f"Request parsed: host={host}, path={path}, client_host={client_host}")

    site_uv_before = get_site_uv_before(host, path)
    site_pv_before = get_site_pv_before(host, path)
    page_pv_before = get_page_pv_before(host, path)

    logging.info(f"Statistics before update: host={host}, path={path}, site_uv_before={site_uv_before}, site_pv_before={site_pv_before}, page_pv_before={page_pv_before}")

    site_uv = update_site_uv(host, client_host) + site_uv_before
    site_pv = update_site_pv(host, client_host) + site_pv_before
    page_pv = update_page_pv(host, path) + page_pv_before

    logging.info(f"Updated statistics: host={host}, path={path}, site_uv={site_uv}, site_pv={site_pv}, page_pv={page_pv}")

    asyncio.create_task(send_busuanzi_request(host, path))

    dict_data = {
        "site_uv": site_uv,
        "page_pv": page_pv,
        "site_pv": site_pv,
        "version": 2.4
    }
    data_str = f"try{{{jsonpCallback}({json.dumps(dict_data)});}}catch(e){{}}"
    logging.debug(f"Sending response data: {data_str}")

    return Response(content=data_str, media_type="application/javascript")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, log_level="info", proxy_headers=True, forwarded_allow_ips="*")