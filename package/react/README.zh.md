# vercount-react

`vercount-react` 是 Vercount 的 React Hook 包。

这个包现在维护在 Vercount 主仓库中的 `package/react` 目录里。

## 安装

```bash
npm install vercount-react
pnpm install vercount-react
yarn add vercount-react
```

## 使用

```tsx
import { useVercount } from "vercount-react";

export default function Home() {
  const { sitePv, pagePv, siteUv } = useVercount();

  return (
    <div>
      <h1>全站浏览量：{sitePv}</h1>
      <h2>当前页面浏览量：{pagePv}</h2>
      <h2>独立访客：{siteUv}</h2>
    </div>
  );
}
```

## 源码位置

- 主仓库：`https://github.com/EvanNotFound/vercount`
- 包目录：`https://github.com/EvanNotFound/vercount/tree/main/package/react`
