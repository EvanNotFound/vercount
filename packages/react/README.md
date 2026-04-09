# vercount-react

`vercount-react` is the React hook package for Vercount.

This package is maintained inside the main Vercount monorepo at `packages/react`.
It uses the shared browser-side client logic from `packages/core`.

## Install

```bash
npm install vercount-react
pnpm install vercount-react
yarn add vercount-react
```

## Usage

```tsx
import { useVercount } from "vercount-react";

export default function Home() {
  const { sitePv, pagePv, siteUv } = useVercount();

  return (
    <div>
      <h1>Site Page Views: {sitePv}</h1>
      <h2>Page Views: {pagePv}</h2>
      <h2>Unique Visitors: {siteUv}</h2>
    </div>
  );
}
```

## Source

- Monorepo: `https://github.com/EvanNotFound/vercount`
- Package directory: `https://github.com/EvanNotFound/vercount/tree/main/packages/react`
