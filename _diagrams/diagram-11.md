---
title: "G1GC vs ZGC Pause Behavior"
excalidraw_file: "11-g1gc-vs-zgc-pauses.excalidraw"
order: 11
slide_ref: "30-31"
description: "Side-by-side comparison of G1GC scaling pauses (10ms–10s with heap) vs ZGC constant sub-1ms pauses."
prev_url: "/diagrams/diagram-10/"
prev_title: "Panama FFM Call Chain"
next_url: "/diagrams/diagram-12/"
next_title: "Cloud-Native Lifecycle"
---

**Walk-through:** Two side-by-side panels compare GC pause behavior. G1GC (left, red) shows pauses that scale with heap size — from 10ms on small heaps to 10+ seconds on large heaps. ZGC (right, blue) shows constant sub-1ms pauses regardless of heap size, at the cost of 5-15% throughput overhead from its load barrier on every object reference.

**Key decision point:** If your P99 GC pause exceeds 500ms, don't try to tune G1GC parameters — switch the algorithm to ZGC or Shenandoah. Algorithm selection beats parameter tuning every time. ZGC's throughput cost is real but predictable; G1GC's worst-case pauses are unpredictable and grow with your data.
