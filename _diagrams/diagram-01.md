---
title: "GC-Induced HPA Thrash Cycle"
excalidraw_file: "01-gc-hpa-thrash-cycle.excalidraw"
order: 1
slide_ref: "8, 15"
description: "The GC pause → CPU spike → HPA false scale-out feedback loop."
prev_url: ""
prev_title: ""
next_url: "/diagrams/diagram-02/"
next_title: "JVM Memory Regions"
---

**Walk-through:** Start at the green "JVM Pod" box. A GC pause creates a CPU spike that HPA interprets as load. HPA scales out, but the new pods also GC on startup, creating more CPU spikes. The cycle repeats until you have 20 pods for a workload that needs 3.

**Fix:** Scale on RPS (requests per second), not CPU. Add `stabilizationWindowSeconds: 120` to absorb GC spikes. Set `minReplicas: 2` so a single pod GC pause never means 100% downtime.
