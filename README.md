
# Vercount 网站计数器

>  Powered by: 🚀 FastAPI + Redis ✨ + Vercel 


基于项目：https://github.com/zkeq/Busuanzi_backend_self


## 快速安装

将这个 script 添加到你的网站中，

```html
<script defer src="https://vercount.one/js"></script>
```

## 使用

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