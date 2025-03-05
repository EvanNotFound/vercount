<div align="right">
  <a title="en" href="README.en.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="english"></a>
  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-4A628A?style=for-the-badge" alt="简体中文">
</div>

![vercount banner@3x](https://github.com/user-attachments/assets/e41667c9-f5f3-426f-b9f0-ece87d404840)

# Vercount 网站计数器

> Powered by: 🚀 NextJS + ✨ Redis + ▲ Vercel

不蒜子计数访问慢？总是遇到 502 错误？那就试试 Vercount！这是一个完美的不蒜子替代方案。

Vercount 是一个基于 NextJS 和 Redis 的高效网站计数器，具有以下特点：

- **极速响应**：服务器响应时间在 10ms 以内。
- **高可用性**：支持中国加速版本或 Vercel 全球 CDN，确保 99.99% 的可用性。
- **精准统计**：使用 POST 请求，克服传统 Referrer 方法在移动端和某些浏览器上的不足。
- **安全防护**：采用 JSON 回调方式，杜绝 CSRF 攻击风险，了解更多请查看：[JSONP](https://en.wikipedia.org/wiki/JSONP)。
- **自动数据同步**：无需手动操作，`site_pv`、`site_uv` 和 `page_pv` 数据会自动同步。
- **无缝兼容**：支持不蒜子的 `span` 标签，轻松切换。
- **持久数据存储**：使用 Redis 定期备份，确保数据不丢失。
- **Serverless 架构**：通过 Vercel Serverless Functions 提供后端支持，保证 99.99% 的可用性。
- **自托管**：支持自托管，可以部署到任何支持 NextJS 的平台。

## 为什么要做这个项目？

不蒜子虽然是个不错的计数器，但也有明显的不足之处：

- 速度慢，容易出现 502 错误。
- 使用过时的 Referrer 方法，导致在移动端和某些浏览器上统计不准确。
- JSONP 回调存在安全隐患，易受 CSRF 攻击，了解更多请查看：[JSONP](https://en.wikipedia.org/wiki/JSONP)。

Vercount 旨在解决这些问题，让网站计数器更快、更稳定、更安全。无需复杂部署，只需添加一个 script 标签即可使用。未来我还会增加更多功能，比如自定义统计数据等。

## 项目官网

- [vercount.one](https://vercount.one)

## 快速使用

**如果你需要在 React 项目中使用 Vercount，可以使用 [vercount-react](https://github.com/EvanNotFound/vercount-react)。**

将以下 script（中国访问优化）添加到你的网站中：

```html
<script defer src="https://cn.vercount.one/js"></script>
```

或者使用这个 script（海外访问优化）：

```html
<script defer src="https://events.vercount.one/js"></script>
```

添加 script 后，使用以下标签开始统计：

```html
本文总阅读量 <span id="vercount_value_page_pv">Loading</span> 次
本站总访问量 <span id="vercount_value_site_pv">Loading</span> 次
本站总访客数 <span id="vercount_value_site_uv">Loading</span> 人
```

## 从不蒜子切换到 Vercount

只需替换不蒜子的 script 标签，其他保持不变，Vercount 兼容 Busuanzi 的 span 标签。数据会在首次访问时自动同步，后续访问也会保持同步（前提是不蒜子正常运行）。

替换为：

```html
<script defer src="https://cn.vercount.one/js"></script>
```

**Vercount 支持不蒜子的 span 标签，你可以继续使用原有的标签**，或者推荐切换到 Vercount 的专属 ID 标签，以便后续功能扩展：

```html
<span id="vercount_value_page_pv">Loading</span> 次
<span id="vercount_value_site_pv">Loading</span> 次
<span id="vercount_value_site_uv">Loading</span> 人
```

## 统计方式

- **页面浏览量**：每访问一次加一。
- **独立访客量**：通过用户的 UserAgent 和 IP 地址判断。

## ⚠️ 重要声明

**严禁使用脚本或程序尝试修改访问计数！** 这种行为违反了服务条款，可能导致您的 IP 被永久封禁。

请注意，此服务完全由我个人资金支持，Vercel 对每个边缘请求都会收费。通过脚本恶意刷访问量只会增加运营成本，最终可能导致我不得不暂停或终止这项公共服务。

如果您有特殊需求需要修改计数，请通过 [evannotfound.com/contact](https://evannotfound.com/contact) 联系我。我将根据具体情况评估您的请求。

我已实施多层安全措施来检测和阻止自动脚本访问，包括但不限于：
- 用户代理检测
- IP 封禁
- 浏览器指纹识别
- 访问频率限制

## 💗 支持我

这是一个公益项目，诚挚请求您的支持。即使是小额捐助，也能帮助我维持项目的长期运转。

<details><summary>📝 支出明细</summary>
目前，Vercount 项目的运营费用由我个人承担，包括 Vercel 的费用和数据库服务器的费用。每月和每年的支出明细如下：

每月支出：
- Vercel Pro 订阅费用：$20 USD
- Vercel Function Invocations 费用：$1 USD
- Edge Middleware Invocations 费用：$1 USD
- 总计：约 ¥154 CNY

每年支出：
- 数据库服务器费用：$40 USD
- 域名费用：$15 USD
- 总计：约 ¥390 CNY

随着项目规模扩大，我希望能得到您的支持。
</details>

您可以访问我的[个人网站捐赠页面](https://evannotfound.com/sponsor)进行捐赠。

或者支持我其他的项目，比如我个人运营的 [GPT Plus Share](https://gpt.oknice.ca)，可以共享使用多个 ChatGPT Plus 账户，与官方界面相同，起步价仅需每月 17 人民币！

[![GPT Billboard](https://github.com/EvanNotFound/hexo-theme-redefine/assets/68590232/55346629-cd54-45a4-9b31-3f979750b0c0)](https://gpt.oknice.ca)

## Disclaimer

最终解释权归 EvanNotFound 所有。

## Vercount 自托管指南

本指南将帮助你搭建自己的 Vercount 实例。整个设置分为两个主要部分：
1. Redis KV 存储
2. NextJS 应用程序

### 前置要求

- 一台安装了 Docker 和 Docker Compose 的服务器
- Vercel 账号（或其他能够托管 NextJS 应用的平台）
- 基本的命令行操作知识

### 第一部分：设置 Redis KV 存储

首先，我们需要设置用于存储计数器数据的 Redis 实例。在你的服务器上创建一个新目录：

```bash
mkdir vercount-redis
cd vercount-redis
```

创建 `docker-compose.yml` 文件：

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

创建 `.env` 文件：

```env
REDIS_PASSWORD=你的安全密码
REST_TOKEN=你的安全令牌
```

启动 Redis 服务：

```bash
docker-compose up -d
```

### 第二部分：部署 NextJS 应用

1. 从 GitHub 克隆 Vercount 仓库：
   ```bash
   git clone https://github.com/EvanNotFound/vercount.git
   cd vercount
   ```

2. 创建包含 Redis 配置的 `.env` 文件：
   ```env
   KV_URL=redis://:你的安全密码@你的服务器IP:6379
   KV_REST_API_URL=http://你的服务器IP:8080
   KV_REST_API_TOKEN=你的安全令牌
   ```

3. 部署到 Vercel：
   ```bash
   vercel deploy
   ```

   或者部署到你选择的支持 NextJS 的托管平台。

### 配置说明

1. 更新你的域名 DNS 设置，指向你部署的应用程序。

2. 在你的网站中添加脚本标签，记得替换为你自己的域名（Vercel 上面绑定的域名），比如：
   ```html
   <script defer src="https://你的域名.com/js"></script>
   ```

3. 在 HTML 中添加计数器元素：
   ```html
   阅读次数：<span id="vercount_value_page_pv">Loading</span>
   访问次数：<span id="vercount_value_site_pv">Loading</span>
   访客数量：<span id="vercount_value_site_uv">Loading</span>
   ```

### 安全注意事项

1. 务必使用强密码保护 Redis
2. 配置适当的防火墙规则以限制 Redis 访问
3. 确保 REST_TOKEN 安全且不被公开
4. 定期更新应用程序和依赖项

### 故障排除

- 如果计数器不更新，检查 Redis 连接状态
- 验证 Redis 凭据是否正确
- 检查应用程序日志中的错误信息
- 确保端口正确开放且可访问

如需其他帮助，请在 GitHub 仓库提出 Issue。

### 性能优化建议

1. 考虑使用 CDN 加速静态资源
2. 适当配置 Redis 内存使用
3. 根据访问量调整服务器配置

### 常见问题

Q：如何迁移现有的不蒜子数据？
A：首次访问时，Vercount 会自动同步不蒜子的数据。

Q：如何查看访问统计数据？
A：目前可以直接通过 Redis 命令查看，或者用 TinyRDM 等工具查看，后续会开发管理界面。