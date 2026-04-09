# @vercount/core

`@vercount/core` contains the shared browser-side counter logic used by Vercount clients.

It owns the common request, response parsing, cache, and UV cookie behavior used by:

- the embedded client in `app/src/lib/client.js`
- the React hook package in `packages/react`

It does **not** own React hook state/lifecycle behavior or embedded DOM rendering behavior.
