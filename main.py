# coding:utf-8
import json
import logging
import os
from urllib.parse import urlparse
from pydantic import BaseModel
import uvicorn
from fastapi import FastAPI, Request, Header, Response
from fastapi.responses import FileResponse,JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from get_before_data import get_page_pv_before, get_site_pv_before, get_site_uv_before
from pv import update_site_pv, update_page_pv
from sync_busuanzi_data import send_busuanzi_request
from uv import update_site_uv
import asyncio

app = FastAPI(docs_url=None, redoc_url=None)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class UrlData(BaseModel):
    url: str

@app.get("/js")
async def serve_js():
    return FileResponse("statics/js/src/client.js")

@app.get("/css")
async def serve_css():
    return FileResponse("statics/css/style.css")

@app.get("/")
async def root(request: Request, referer: str = Header(None), jsonpCallback: str = ""):
    if not referer:
        return FileResponse("statics/home.html")

    client_host = request.client.host
    parsed_url = urlparse(referer)
    host, path = parsed_url.netloc, parsed_url.path.rstrip('/index')

    site_uv_before, site_pv_before, page_pv_before = await asyncio.gather(
        get_site_uv_before(host, path),
        get_site_pv_before(host, path),
        get_page_pv_before(host, path)
    )

    site_uv, site_pv, page_pv = await asyncio.gather(
        update_site_uv(host, client_host),
        update_site_pv(host, client_host),
        update_page_pv(host, path)
    )

    site_uv += site_uv_before
    site_pv += site_pv_before
    page_pv += page_pv_before

    asyncio.create_task(send_busuanzi_request(host, path))

    dict_data = {"site_uv": site_uv, "page_pv": page_pv, "site_pv": site_pv, "version": 2.4}
    data_str = f"try{{{jsonpCallback}({json.dumps(dict_data)});}}catch(e){{}}"
    return Response(content=data_str, media_type="application/javascript")

@app.post("/log")
async def root(request: Request, data: UrlData, jsonpCallback: str = ""):
    if not data.url:
        return FileResponse("statics/home.html")

    client_host = request.client.host
    parsed_url = urlparse(data.url)
    host, path = parsed_url.netloc, parsed_url.path.rstrip('/index')

    site_uv_before, site_pv_before, page_pv_before = await asyncio.gather(
        get_site_uv_before(host, path),
        get_site_pv_before(host, path),
        get_page_pv_before(host, path)
    )

    site_uv, site_pv, page_pv = await asyncio.gather(
        update_site_uv(host, client_host),
        update_site_pv(host, client_host),
        update_page_pv(host, path)
    )

    site_uv += site_uv_before
    site_pv += site_pv_before
    page_pv += page_pv_before

    asyncio.create_task(send_busuanzi_request(host, path))

    dict_data = {"site_uv": site_uv, "page_pv": page_pv, "site_pv": site_pv, "version": 2.4}
    data_str = f"try{{{jsonpCallback}({json.dumps(dict_data)});}}catch(e){{}}"
    return JSONResponse(content=dict_data)

@app.options("/log")
async def options_log(request: Request):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    return Response(status_code=204, headers=headers)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, log_level="info", proxy_headers=True, forwarded_allow_ips="*")