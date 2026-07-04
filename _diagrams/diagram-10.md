---
title: "Panama FFM Call Chain"
excalidraw_file: "10-panama-ffm-call-chain.excalidraw"
order: 10
slide_ref: "34-36"
description: "Java → Arena → MemorySegment → MethodHandle → Native C++ — zero-leak by construction."
prev_url: "/diagrams/diagram-09/"
prev_title: "Observability Stack"
next_url: ""
next_title: ""
---

**Walk-through:** The flow starts at a Spring `@RestController` endpoint, opens a confined `Arena` for scoped native memory, allocates a `MemorySegment`, looks up the native function via `SymbolLookup`, and invokes it through a `MethodHandle`. The result is written back to a MemorySegment. When `Arena.close()` is called (via try-with-resources), all native memory is freed — zero leaks possible.

**Key safety feature:** The Arena is the breakthrough. Everything allocated in a confined arena is freed when it closes. You cannot leak native memory if you use try-with-resources. This replaces JNI's manual memory management, which was the #1 source of native memory leaks in JVM applications.
