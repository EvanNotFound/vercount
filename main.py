# coding:utf-8
import json
import os
from urllib.parse import urlparse

import redis
import uvicorn
from fastapi import FastAPI, Request, Header, Response
from fastapi.responses import FileResponse

from get_before_data import get_data_from_busuanzi
from pv import pv
from uv import update_site_uv_and_set_expiration

from redis_connection import redis_client

app = FastAPI(docs_url=None, redoc_url=None)

@app.get("/js")
async def serve_js():
    return FileResponse("statics/js/busuanzi.pure.mini.js")

@app.get("/css")
async def serve_css():
    return FileResponse("statics/css/style.css")

@app.get("/")
def root(request: Request, referer: str = Header(None), jsonpCallback: str = ""):
    if not referer:
        return FileResponse("statics/home.html")

    client_host = request.client.host
    parsed_url = urlparse(referer)
    host = parsed_url.netloc
    path = parsed_url.path.rstrip('/index')

    site_uv_before = redis_client.get(f"live_site:{host}")
    if site_uv_before is None:
        site_uv_before = get_data_from_busuanzi(host)["site_uv"]
    else:
        site_uv_before = int(site_uv_before.decode())

    uv = update_site_uv_and_set_expiration(host, client_host) + site_uv_before
    page_pv, site_pv = pv(host, path)

    dict_data = {
        "site_uv": uv,
        "page_pv": page_pv,
        "site_pv": site_pv,
        "version": 2.4
    }
    data_str = f"try{{{jsonpCallback}({json.dumps(dict_data)});}}catch(e){{}}"
    return Response(content=data_str, media_type="application/javascript")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, log_level="info", proxy_headers=True, forwarded_allow_ips="*")