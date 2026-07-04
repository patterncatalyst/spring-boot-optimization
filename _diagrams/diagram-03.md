---
title: "AOT Cache Progression: CDS → AppCDS → Leyden"
excalidraw_file: "03-aot-cache-progression.excalidraw"
order: 3
slide_ref: "11, 23-25"
description: "How JVM class caching evolved from basic CDS to Project Leyden."
prev_url: "/diagrams/diagram-02/"
prev_title: "JVM Memory Regions"
next_url: "/diagrams/diagram-04/"
next_title: "Container-Aware JVM"
---

**Walk-through:** Top row shows the JDK 10-21 progression: basic CDS (JDK base classes only) → AppCDS (application classes) → Spring Boot + AppCDS (35-55% startup reduction). Bottom row shows Leyden on JDK 24-25+, adding method profiles and JIT data to the cache.

**Spring Boot advantage:** Because Spring Boot loads more classes at runtime than build-time frameworks, the CDS archive has more work to cache — resulting in a much larger percentage improvement (35-55% vs ~5%).
