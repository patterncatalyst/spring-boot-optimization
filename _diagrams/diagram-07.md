---
title: "gRPC vs REST Wire Format"
excalidraw_file: "07-grpc-vs-rest-wire.excalidraw"
order: 7
slide_ref: "26-28"
description: "Side-by-side comparison: JSON ~400 bytes vs Protobuf ~40 bytes, HTTP/1.1 vs HTTP/2."
prev_url: "/diagrams/diagram-06/"
prev_title: "Anti-Patterns vs Fixes"
next_url: "/diagrams/diagram-08/"
next_title: "Startup Breakdown"
---

**Walk-through:** Left side shows REST characteristics: HTTP/1.1, JSON text payloads (~400 bytes), new connection per request, and SSE/WebSocket for streaming. Right side shows gRPC: HTTP/2, binary Protobuf (~40 bytes), persistent multiplexed connections, and 4 built-in streaming modes.

**Important caveat:** gRPC unary is SLOWER than REST on localhost because network cost is zero. gRPC wins at high concurrency and streaming, and in production with pod-to-pod latency.
