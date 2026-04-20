<div align="right">
  <img src="https://img.shields.io/badge/-English-4A628A?style=for-the-badge" alt="English" />
  <a title="zh-CN" href="README.md">  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

![vercount banner@3x](https://github.com/user-attachments/assets/e41667c9-f5f3-426f-b9f0-ece87d404840)

# Vercount Website Counter

> Powered by: 🚀 Go + ✨ Redis + ▲ Next.js

Looking for a simple, easy-to-use website counter? Try Vercount! It's a fast and reliable alternative for website analytics.

Vercount is an efficient website counter built around a Go public events service and Redis, with Next.js serving as the dashboard, auth, and compatibility layer. It features:

- **Lightning Fast**: The public counting path is handled directly by the Go service for fast and stable responses.
- **High Availability**: Public event traffic is separated from the management web app, reducing pressure on the main site runtime.
- **Accurate Statistics**: Utilizes POST requests for precise data.
- **Security**: Keeps the compatibility surface while continuing to strengthen public endpoint safety and abuse protection.
- **Automatic Data Sync**: No manual operation needed; counter data can initialize automatically from existing Busuanzi data.
- **Seamless Compatibility**: Easy integration with existing HTML and Busuanzi-compatible spans.
- **Persistent Data Storage**: Redis remains the shared counter storage layer.
- **Clear Architecture**: Go + Redis power the core counting backend, while Next.js handles dashboard, auth, domain management, and compatibility flows.

## Why Choose Vercount?

Vercount is designed to be faster, more stable, and more secure. From the user's perspective, it still takes only a script tag to get started. Under the hood, Vercount now centers on a Go + Redis counting backend, while the Next.js app handles dashboard, authentication, and compatibility workflows. Future updates will include more customizable statistics and management features.

## Project Website

- [vercount.one](https://vercount.one)

## Quick Start

**For React projects, use `@vercount/react`. Its source is now maintained inside this monorepo under `packages/react`.**

> `vercount-react` has been renamed to `@vercount/react`.

- Monorepo: https://github.com/EvanNotFound/vercount
- Package path: https://github.com/EvanNotFound/vercount/tree/main/packages/react

To get started, simply add this script to your site:

```html
<script defer src="https://events.vercount.one/js"></script>
```

After adding the script, use these tags to start counting:

```html
Total reads: <span id="vercount_value_page_pv">Loading</span> Total visits:
<span id="vercount_value_site_pv">Loading</span> Total unique visitors:
<span id="vercount_value_site_uv">Loading</span>
```

## Counting Method

- **Page Views**: Increment by one for each visit.
- **Unique Visitors**: Determined via UserAgent and IP address.

## ⚠️ Important Notice

**It is strictly forbidden to use scripts or programs to attempt to modify visit counts!** Such behavior violates our terms of service and may result in your IP being permanently banned.

Please note that this service is entirely funded by me personally, and Vercel charges for each edge request. Spamming the endpoint with scripts only increases operational costs and may ultimately force me to suspend or terminate this public service.

If you have special requirements to modify counts, please contact us through [evannotfound.com/contact](https://evannotfound.com/contact). We will evaluate your request based on specific circumstances.

We have implemented multiple layers of security measures to detect and block automated script access, including but not limited to:

- User agent detection
- IP blocking
- Browser fingerprinting
- Access frequency limitations

## Self-Hosting Guide

Full self-hosting documentation is still being organized. At a high level, the current architecture consists of:

- `apps/api`: the Go public events service
- `apps/web`: the Next.js dashboard and compatibility layer
- Redis: the shared counter storage backend

More detailed deployment instructions will be added soon.

## Development and Deployment Notes

- The web dashboard app lives in `apps/web/`
- The public events service lives in `apps/api/`
- The main counting backend is now Go + Redis, while Next.js remains the dashboard, auth, and compatibility layer
- If you deploy the web app on Vercel, set the Project Root Directory to `apps/web`
- Public counter traffic such as `events.vercount.one` should be served by `apps/api`
