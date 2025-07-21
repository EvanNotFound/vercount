<div align="right">
  <img src="https://img.shields.io/badge/-English-4A628A?style=for-the-badge" alt="English" />
  <a title="zh-CN" href="README.md">  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

![vercount banner@3x](https://github.com/user-attachments/assets/e41667c9-f5f3-426f-b9f0-ece87d404840)

# Vercount Website Counter

> Powered by: 🚀 NextJS + ✨ Redis + ▲ Vercel

Looking for a simple, easy-to-use website counter? Try Vercount! It's the ultimate solution for fast and reliable statistics.

Vercount is an efficient website counter based on NextJS and Redis, featuring:

- **Lightning Fast**: Server response time under 10ms.
- **High Availability**: 99.99% uptime with global CDN support.
- **Accurate Statistics**: Utilizes POST requests for precise data.
- **Security**: JSON callback to eliminate CSRF attack risks; learn more: [JSONP](https://en.wikipedia.org/wiki/JSONP).
- **Automatic Data Sync**: No manual operation needed; data auto-syncs.
- **Seamless Compatibility**: Easy integration with existing HTML.
- **Persistent Data Storage**: Regular Redis backups to prevent data loss.
- **Serverless Architecture**: Back-end support via Vercel Serverless Functions.

## Why Choose Vercount?

Vercount is designed to be faster, more stable, and secure. Easy deployment requires only adding a script tag. Future updates will include customizable statistics.

## Project Website

- [vercount.one](https://vercount.one)

## Quick Start

**For React projects, use [vercount-react](https://github.com/EvanNotFound/vercount-react).**

To get started, simply add this script to your site:

```html
<script defer src="https://cn.vercount.one/js"></script>
```

After adding the script, use these tags to start counting:

```html
Total reads: <span id="vercount_value_page_pv">Loading</span>
Total visits: <span id="vercount_value_site_pv">Loading</span>
Total unique visitors: <span id="vercount_value_site_uv">Loading</span>
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

Coming soon.