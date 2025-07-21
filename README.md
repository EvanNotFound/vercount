<div align="right">
  <a title="en" href="README.en.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="english"></a>
  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-4A628A?style=for-the-badge" alt="简体中文">
</div>

![vercount banner@3x](https://github.com/user-attachments/assets/e41667c9-f5f3-426f-b9f0-ece87d404840)

# Vercount 网站计数器

> Powered by: 🚀 NextJS + ✨ Redis + ▲ Vercel

不蒜子计数访问慢？总是遇到 502 错误？那就试试 Vercount！这是一个完美的不蒜子替代方案。

Vercount 是一个基于 NextJS 和 Redis 的高效网站计数器，具有以下特点：

- **极速响应**：服务器响应时间在 100ms 以内。
- **高可用性**：Vercel 全球 CDN，确保 99.99% 的可用性。
- **精准统计**：使用 POST 请求，克服传统 Referrer 方法在移动端和某些浏览器上的不足。
- **安全防护**：采用 JSON 回调方式，杜绝 CSRF 攻击风险，了解更多请查看：[JSONP](https://en.wikipedia.org/wiki/JSONP)。
- **自动数据初始化**：无需手动操作，`site_pv`、`site_uv` 和 `page_pv` 数据会自动从不蒜子迁移，无需担心数据丢失。
- **无缝兼容**：支持不蒜子的 `span` 标签，轻松切换。
- **Serverless 架构**：通过 Vercel Serverless Functions 提供后端支持，保证 99.99% 的可用性。
- **自托管**：支持自托管，可以部署到任何支持 NextJS 的平台。
- **编辑访客数据**：支持自定义网站的访客数据，前往 [vercount.one](https://vercount.one) 登录并验证域名后即可使用。

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

将以下代码添加到你的网站中：

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

只需替换不蒜子的 script 标签，其他保持不变，Vercount 兼容 Busuanzi 的 span 标签。数据会在首次访问时自动同步。

替换为：

```html
<script defer src="https://events.vercount.one/js"></script>
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

**严禁使用脚本或程序尝试修改访问计数！** 如需修改计数，请通过 [vercount.one](https://vercount.one) 后台管理页面进行修改。

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
- Redis 数据库服务器费用：$40 USD
- 域名费用：$15 USD
- 总计：约 ¥390 CNY

随着项目规模扩大，我希望能得到您的支持。
</details>

您可以支持我其他的项目，加入我的 [GPT Plus Share](https://gptplus.ca) GPT Plus 共享站，ChatGPT Plus 随心用。

- ✅ 支持 OpenAI 最新所有模型，包括 `GPT-4o`, `o3` 系列模型，支持高级图片生成
- ✅ 后台大量官方正版账号号池，随心使用
- ✅ 每月仅需低至 23.99 人民币，支持一天免费试用
- ✅ 无需梯子，国内免翻访问！
- ✅ 由 Evan 本人运营，售后保证，已稳定运行超过一年

[![gpt-billboard](https://github.com/user-attachments/assets/f049fb37-0587-4af9-b59d-b1910d310549)](https://www.gptplus.ca/home)

## Disclaimer

最终解释权归 EvanNotFound 所有。

## 自托管

Coming soon...