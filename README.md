
![](https://github.com/EvanNotFound/vercount/assets/68590232/5d0019ab-c0a7-4f16-8649-76db613015e8)

# Vercount 网站计数器

>  Powered by: 🚀 NextJS + Redis ✨ + Vercel

不蒜子计数访问慢？总是 502？那就试试 Vercount 吧！完美不蒜子计数替代方案。

Vercount 是一个基于 NextJS + Redis 的网站计数器，它的特点是：
- 速度快，服务器响应时间在 10ms 以内
- 可选使用中国加速版本（国内访问优化），或者使用 Vercel 全球 CDN，保证 99.99% 可用性
- 使用 POST 请求进行统计，不再使用不蒜子的过时 Referrer 方法进行统计，实现移动端 / Firefox / Safari 等浏览器的准确统计。
- 使用 Json 回调，不再使用不蒜子的 JSONP 回调方法，防止 CSRF 攻击，详情请看：[JSONP](https://en.wikipedia.org/wiki/JSONP)
- 初始化自动同步 (site_pv, site_uv, page_pv) 所有不蒜子的数据，无需手动操作
- 自动保持和不蒜子的数据同步，每访问一次，数据就会自动同步
- 兼容不蒜子的 span 标签，可以无缝切换
- 使用 Serverless Redis 作为数据存储，数据不会丢失，保证 99.99% 可用性
- 使用 Vercel Serverless Functions 作为后端，保证 99.99% 可用性


## 为什么要做这个项目？

不蒜子是一个很好的网站计数器，但是它的缺点也很明显：
- 不蒜子速度慢，不稳定，经常会出现 502 错误。
- 不蒜子的代码已经过时，使用的是 Referrer 方法进行统计，这种方法在移动端 / Firefox / Safari 上统计不准确。
- 不蒜子的代码使用的是 JSONP 回调，这种方法容易受到 CSRF 攻击，威胁网站安全，详情请看：[JSONP](https://en.wikipedia.org/wiki/JSONP)

这个项目的目的就是为了解决这些问题，让网站计数器更快，更稳定，更安全。无需自己部署，无需自己维护，只需要引入一个 script 标签就可以使用。

后续会增加更多的功能，比如：自定义网站统计数据等。

## 项目官网

- https://vercount.one

## 从不蒜子切换到 Vercount

直接替换不蒜子的 script 标签即可，其他保持相同。数据会在初次访问时自动从不蒜子同步，使用时，也会自动保持和不蒜子的数据同步（~~当然是在不蒜子不挂的前提下，Vercount 会自动回调给不蒜子~~）。

替换为中国访问优化版本：

```html
<script defer src="https://cn.vercount.one/js"></script>
```

或者，替换为海外访问优化版本：

```html
<script defer src="https://events.vercount.one/js"></script>
```


## 快速使用

将这个 script (中国访问优化) 添加到你的网站中，

```html
<script defer src="https://cn.vercount.one/js"></script>
```

或者这个 script (海外访问优化) 添加到你的网站中，

```html
<script defer src="https://events.vercount.one/js"></script>
```

在你的网站中添加上面其中之一的 script 之后，和不蒜子一样，你的网站就可以开始统计了，比如。

```html
本文总阅读量 <span id="busuanzi_value_page_pv">Loading</span> 次
本站总访问量 <span id="busuanzi_value_site_pv">Loading</span> 次
本站总访客数 <span id="busuanzi_value_site_uv">Loading</span> 人
```

## 统计方式

对于 page_view 网站访问量, 每访问一次加一.

对于 user_view 访客量, 会通过用户浏览器的 UserAgent 以及用户的IP地址 进行判断.

## ☕️ 捐赠请求

目前，Vercount 项目所有的运营费用均由我个人承担，包括 Vercel 的 Function Invocations 和 Edge Middleware Invocations 的费用，以及项目数据库所需服务器的费用。

这是一个公益项目，因此我诚挚地请求您的支持。即使是几元钱的捐助，也能帮助我们维持项目的长期运转。

每月的支出明细如下：
- Vercel Pro 订阅费用：$20 USD = ¥140 CNY
- Vercel Function Invocations 费用：$1 USD = ¥7 CNY
- Edge Middleware Invocations 费用：$1 USD = ¥7 CNY

每月总计：¥154 CNY

每年的支出明细如下：
- Vercount 数据库服务器费用：$40 USD = ¥280 CNY
- Vercount.one 域名费用：$15 USD = ¥116 CNY

每年总计：¥390 CNY

虽然目前我可以承担这些费用，但随着项目规模的扩大和用户数量的增加，我希望能得到您的帮助和支持。

您可以扫描下方二维码，或访问我的[个人网站捐赠页面](https://evannotfound.com/sponsor)进行捐赠。

![image](https://github.com/user-attachments/assets/5d8c530a-d324-42f0-9f60-5e44fd1e546b)

非常感谢您的支持！


## Disclaimer

最终解释权归 EvanNotFound 所有。
