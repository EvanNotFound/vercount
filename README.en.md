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

This guide will help you set up your own instance of Vercount. The setup consists of two main parts:
1. Redis KV Store
2. NextJS Application

### Prerequisites

- A server with Docker and Docker Compose installed
- A Vercel account (or any platform that can host NextJS applications)
- Basic knowledge of command line operations

### Part 1: Setting Up Redis KV Store

First, we'll set up the Redis instance that will store your counter data. Create a new directory for your Redis setup:

```bash
mkdir vercount-redis
cd vercount-redis
```

Create a `docker-compose.yml` file:

```yaml
services:
  redis:
    image: redis:latest
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - ./data:/data
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD-SHELL", "redis-cli -a ${REDIS_PASSWORD} ping | grep PONG"]
      interval: 1s
      timeout: 3s
      retries: 5

  serverless-redis-http:
    image: hiett/serverless-redis-http:latest
    ports:
      - '8080:80'
    environment:
      - SRH_MODE=env
      - SRH_TOKEN=${REST_TOKEN}
      - SRH_CONNECTION_STRING=redis://:${REDIS_PASSWORD}@redis:6379
    restart: unless-stopped
    depends_on:
      - redis
```

Create a `.env` file:

```env
REDIS_PASSWORD=your_secure_password_here
REST_TOKEN=your_secure_token_here
```

Start the Redis services:

```bash
docker-compose up -d
```

### Part 2: Deploying the NextJS Application

1. Fork the Vercount repository from GitHub:
   ```bash
   git clone https://github.com/EvanNotFound/vercount.git
   cd vercount
   ```

2. Create a `.env` file with your Redis configuration:
   ```env
   KV_URL=redis://:your_secure_password_here@your_server_ip:6379
   KV_REST_API_URL=http://your_server_ip:8080
   KV_REST_API_TOKEN=your_secure_token_here
   ```

3. Deploy to Vercel:
   ```bash
   vercel deploy
   ```

   Or deploy to your preferred hosting platform that supports NextJS applications.

## Configuration

1. Update your domain's DNS settings to point to your deployed application.

2. Add the script tag to your website, replacing the domain with your own:
   ```html
   <script defer src="https://your-domain.com/js"></script>
   ```

3. Add the counter elements to your HTML:
   ```html
   Total reads: <span id="vercount_value_page_pv">Loading</span>
   Total visits: <span id="vercount_value_site_pv">Loading</span>
   Total unique visitors: <span id="vercount_value_site_uv">Loading</span>
   ```

## Security Considerations

1. Always use strong passwords for Redis
2. Configure proper firewall rules to restrict Redis access
3. Keep your REST_TOKEN secure and never expose it publicly
4. Regularly update both Redis and the application

## Maintenance

1. Monitor Redis disk usage
2. Set up regular backups of the Redis data directory
3. Keep the application and dependencies updated
4. Monitor application logs for any issues

## Troubleshooting

- If counters don't update, check Redis connectivity
- Verify Redis credentials are correct
- Check application logs for errors
- Ensure ports are properly exposed and accessible

For additional support, please open an issue on the GitHub repository.

## 💗 Support Me

This is a non-profit project, and your support is sincerely appreciated. Even small donations help maintain the project's longevity.

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