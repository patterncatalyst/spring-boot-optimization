---
title: "JVM Memory Regions in a Container"
excalidraw_file: "02-jvm-memory-regions.excalidraw"
order: 2
slide_ref: "5"
description: "Six memory regions the JVM uses — MaxRAMPercentage only controls one of them."
prev_url: "/diagrams/diagram-01/"
prev_title: "HPA Thrash Cycle"
next_url: "/diagrams/diagram-03/"
next_title: "AOT Cache Progression"
---

**Walk-through:** The left column shows the container with its 2GB limit. Heap is the largest region (50-75%), but five other regions — Metaspace, thread stacks, native memory, direct ByteBuffers, and GC bookkeeping — share the remaining 25%.

**Key point:** Spring Boot loads 10,000-15,000 classes at startup, which means Metaspace usage is typically 80-250MB. Setting MaxRAMPercentage=90 starves these off-heap regions and causes OOMKills even when heap metrics look healthy.
