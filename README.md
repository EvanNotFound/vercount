<div align="right">
  <a title="en" href="README.en.md"><img src="https://img.shields.io/badge/-English-545759?style=for-the-badge" alt="english"></a>
  <img src="https://img.shields.io/badge/-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-4A628A?style=for-the-badge" alt="简体中文">
</div>

![vercount banner@3x](https://github.com/user-attachments/assets/e41667c9-f5f3-426f-b9f0-ece87d404840)

# Vercount 网站计数器

> Powered by: 🚀 Go + ✨ Redis + ▲ Next.js

不蒜子计数访问慢？总是遇到 502 错误？那就试试 Vercount！这是一个更快、更稳定的不蒜子替代方案。

Vercount 以 Go 和 Redis 为核心驱动计数 API，用 Next.js 搭建管理后台和兼容层。它具备以下特点：

- **极速响应**：计数请求由 Go 服务直接处理，响应快、够稳定。
- **高可用性**：高频的公开事件流量与管理后台分离，减轻主站运行压力。
- **统计精准**：采用 POST 请求，克服传统 Referrer 方式在移动端和部分浏览器上的统计缺陷。
- **安全可靠**：保留兼容接口的同时，持续加强公开计数接口的安全与风控。
- **数据自动同步**：无需手动操作，site_pv、site_uv、page_pv 可自动从不蒜子迁移，数据不丢。
- **无缝兼容**：直接支持不蒜子的 span 标签，切换毫无负担。
- **架构清晰**：Go + Redis 负责计数后端，Next.js 负责后台、鉴权、域名管理和兼容层。
- **支持自托管**：你可以分别部署公共事件服务与 Web 管理后台。
- **访客数据可编辑**：登录 [vercount.one](https://vercount.one) 验证域名后，即可自定义网站访客数据。

## 为什么要做这个项目？

不蒜子虽然是个不错的计数器，但也有明显的不足之处：

- 速度慢，容易出现 502 错误。
- 使用过时的 Referrer 方法，导致在移动端和某些浏览器上统计不准确。
- JSONP 回调存在安全隐患，易受 CSRF 攻击，了解更多请查看：[JSONP](https://en.wikipedia.org/wiki/JSONP)。

Vercount 正是为了解决这些问题而生——更快、更稳、更安全。对使用者来说，依然只需一行 script 标签就能接入；而在底层，Vercount 以 Go + Redis 作为计数核心，Next.js 负责后台、鉴权和兼容能力。现已支持自定义统计数据，请前往 [vercount.one](https://vercount.one) 登录并验证域名后即可使用。

## 项目官网

- [vercount.one](https://vercount.one)

## 快速上手

**如果你用的是 React 项目，可以直接使用 `@vercount/react`，它的源码就在本仓库的 `packages/react` 目录下，与主站应用一起维护。**

> 注意：`vercount-react` 已更名为 `@vercount/react`。

- Monorepo 地址：https://github.com/EvanNotFound/vercount
- 包路径：https://github.com/EvanNotFound/vercount/tree/main/packages/react

在你的网站中添加下面这段代码即可：

```html
<script defer src="https://events.vercount.one/js"></script>
```

添加 script 后，用这些标签来展示统计数据：

```html
本文总阅读量 <span id="vercount_value_page_pv">Loading</span> 次  

本站总访问量 <span id="vercount_value_site_pv">Loading</span> 次  

本站总访客数 <span id="vercount_value_site_uv">Loading</span> 人
```

## 从不蒜子切换到 Vercount

只需替换原来的不蒜子 script 标签，其它完全不用动。Vercount 会兼容不蒜子的 span 标签，数据在第一次访问时会自动同步。

替换成：

```html
<script defer src="https://events.vercount.one/js"></script>
```

**Vercount 既支持原有的不蒜子标签，也推荐使用专属 ID 标签**，方便后续功能扩展：

```html
<span id="vercount_value_page_pv">Loading</span> 次
<span id="vercount_value_site_pv">Loading</span> 次
<span id="vercount_value_site_uv">Loading</span> 人
```

## 统计方式

- **页面浏览量**：每访问一次加一。
- **独立访客量**：通过浏览器 Cookie 去重，同一浏览器首次访问同一主机时计为一个独立访客。

## ⚠️ 重要声明

**严禁使用脚本或程序尝试修改访问计数！** 如需修改计数，请通过 [vercount.one](https://vercount.one) 后台管理页面进行修改。

## 开发与部署说明

- Web 管理后台位于 `apps/web/`
- API 服务位于 `apps/api/`
- 当前架构以 Go + Redis 作为主要计数后端，Next.js 处理后台、鉴权和兼容层
- 如果你在 Vercel 上部署这个仓库的 Web 应用，请将 Project Root Directory 设置为 `apps/web`
- 像 `events.vercount.one` 这样的公共计数入口，应由 `apps/api` 提供服务

## 💗 支持我

Vercount 是一个公益项目，诚挚希望能得到你的支持。哪怕是小额捐助，也能帮助我维持它的长期运行。

<details><summary>📝 支出明细</summary>
目前 Vercount 的运营费用由我个人承担，主要包括 Vercel、云服务器和 CDN 的开销。每月和每年的支出明细如下：

每月支出：

- Vercel Pro 订阅：$20 USD
- CDN 服务：$5 USD
- Vercel 函数调用（Function Invocations）：$1 USD
- Edge 中间件调用（Edge Middleware Invocations）：$1 USD
- 合计：约 ¥190 CNY

每年支出：

- Redis 数据库服务器：$40 USD
- 域名：$15 USD
- 合计：约 ¥390 CNY

随着项目规模扩大，希望能得到你的支持。
</details>

</details>

你也可以支持我的其他项目：

🎉 **ChatGPT Plus 会员，每月仅需 23.9 元！省下官网 20 美元/月**\
👉 [立即体验 GPT Plus 共享站](https://www.gptplus.ca/home)

- ✅ **官方正版账号池**，支持 GPT-5.2 / GPT-5.2 Pro 等最新模型，Sora 2 视频/图片生成
- ✅ **国内直接访问**，无需梯子，即开即用
- ✅ **免费试用一天**，满意再付款，零风险体验
- ✅ 高级语音对话 + 超高对话上限，随便问不心疼
- ✅ 运营两年老站，售后有保障，Evan 亲自维护

[![gpt-billboard](https://github.com/user-attachments/assets/e4b142ad-b48f-4ea1-828e-57a743f54d90)](https://www.gptplus.ca/home)

👨‍💻 **AI 编程助手，让效率翻倍！Arc Codex 一站式编程平台**\
💰 注册即送 $5 美元额度，首月套餐仅 ¥35.9 起！\
👉 [立即体验 Arc Codex](https://www.arccodex.com)

- ✅ 支持 GPT-5.3-codex 等最新编程模型，代码生成更精准
- ✅ 每日 \$40 美元额度自动重置，月总额高达 \$1200，随便用不封顶
- ✅ 标准版首月仅 15.9 元，远低于官网价，同时使用优惠码 `REDEFINE`，续费享 **8折** 优惠！
- ✅ Evan 运营保障，不满意包退，无后顾之忧

[![arccodex-billboard](https://github.com/user-attachments/assets/6b1f49c9-9791-4466-8d1f-211b0c712633)](https://www.arccodex.com)

## Disclaimer

最终解释权归 EvanNotFound 所有。

## 自托管

完整文档整理中。当前仓库的自托管架构主要由以下部分组成：

- `apps/api`：Go 公共事件服务
- `apps/web`：Next.js 管理后台与兼容层
- Redis：核心计数存储

后续会补充更完整的部署说明。
