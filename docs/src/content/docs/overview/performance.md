---
title: Performance
---

tail.js is practically invisible in Time to Interactive (TTI) measurements and general performance benchmarks (e.g. a Lighthouse score of 100 stays at 100).

- Depending on which web technology you use it adds somewhere between none to very limited extra overhead to your rendered markup.
- The server-side part adds a rendering overhead in the sub-millisecond range.
- The client script is about 15 KiB, and it adds about 3.5 KiB to React bundles.
