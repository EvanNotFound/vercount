<div align="right">
  <img src="https://img.shields.io/badge/-English-4A628A?style=for-the-badge" alt="English" />
  <a title="zh-CN" href="README.md">  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-545759?style=for-the-badge" alt="简体中文"></a>
</div>

# Vercount Website Counter

> Powered by: 🚀 NextJS + ✨ Redis + ▲ Vercel

Looking for a simple, easy-to-use website counter? Try Vercount! It’s the ultimate solution for fast and reliable statistics.

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

## 💗 Support Me

This is a non-profit project, and your support is sincerely appreciated. Even small donations help maintain the project’s longevity.

<details><summary>📝 Expense Details</summary>
I cover the operation costs personally, including Vercel fees and database server costs. Monthly and annual expenses are as follows:

Monthly expenses:
- Vercel Pro subscription: $20 USD
- Vercel Function Invocations: $1 USD
- Edge Middleware Invocations: $1 USD
- Total: approx. ¥154 CNY

Annual expenses:
- Database server fees: $40 USD
- Domain fees: $15 USD
- Total: approx. ¥390 CNY

I hope for your support as the project grows.
</details>

You can visit my [personal website donation page](https://evannotfound.com/sponsor) to donate.

Or support my other projects, like [GPT Plus Share](https://gpt.oknice.ca), which allows sharing multiple ChatGPT Plus accounts with the same interface, starting at only 17 RMB per month!

[![GPT Billboard](https://github.com/EvanNotFound/hexo-theme-redefine/assets/68590232/55346629-cd54-45a4-9b31-3f979750b0c0)](https://gpt.oknice.ca)

## Disclaimer

The ultimate interpretation rights belong to EvanNotFound.