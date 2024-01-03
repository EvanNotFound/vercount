
# Vercount 网站计数器

>  Powered by: 🚀 FastAPI + Redis ✨ + Vercel 

不蒜子计数访问慢？总是 502？那就试试 Vercount 吧！

Vercount 是一个基于 FastAPI + Redis 的网站计数器，它的特点是：
- 速度快，响应时间在 10ms 以内
- 使用 Upstash Redis 作为数据存储，数据不会丢失，保证 99.99% 可用性
- 使用 Vercel Serverless Functions 作为后端，保证 99.99% 可用性
- 使用 Vercel 全球 CDN 作为前端，保证 99.99% 可用性
- 兼容不蒜子的 span 标签，可以无缝切换

## 为什么要做这个项目？

不蒜子是一个很好的网站计数器，但是它的缺点也很明显，就是速度慢，经常会出现 502 错误。

这个项目的目的就是为了解决这个问题，让网站计数器更快，更稳定。无需自己部署，无需自己维护，只需要引入一个 script 标签就可以使用。

后续会增加更多的功能，比如：自定义网站统计数据等。

## 从不蒜子切换到 Vercount

直接替换不蒜子的 script 标签即可，不需要修改任何代码。

```html
<script defer src="https://vercount.one/js"></script>
```


## 快速使用

将这个 script 添加到你的网站中，

```html
<script defer src="https://vercount.one/js"></script>
```

在你的网站中添加上面的 script 之后，和不蒜子一样，你的网站就可以开始统计了，比如。

```html
本文总阅读量 <span id="busuanzi_page_pv"></span> 次
本文总访客量 <span id="busuanzi_page_uv"></span> 人
本站总访问量 <span id="busuanzi_site_pv"></span> 次
本站总访客数 <span id="busuanzi_site_uv"></span> 人
```

## 统计方式

对于 page_view 网站访问量, 每访问一次加一.

对于 user_view 访客量, 会通过用户浏览器的 UserAgent 以及用户的IP地址 进行判断.

## 鸣谢

基于项目：https://github.com/zkeq/Busuanzi_backend_self

非常感谢此项目的作者。