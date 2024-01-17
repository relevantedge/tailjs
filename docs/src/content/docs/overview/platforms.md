---
title: Supported platforms
sidebar:
  order: 10
---

tail.js is designed to run embedded in all environments and programming languages that can interface with the V8 engine's native libraries (which is [pretty much all](https://v8.dev/)). It uses an approach roughly similar to web assemblies and [WASI](https://wasi.dev/) where a _host_ provides logging, I/O etc.
The tail.js runtime is compiled to ECMAScript that runs natively in V8 without external dependencies.

Currently, host bindings exists for ASP.NET, NextJS and Express and React. CMS integrations exist for Umbraco and Sitecore. In addition, the (P)React bindings makes it is quite easy to integrate with most headless solutions.

Hosts are rather involved to write (PHP is on the list). CMS integrations for existing hosts are pretty simple to write since it is a matter of fitting their API into well-defined extension points.
