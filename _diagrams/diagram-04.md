---
title: "Container-Aware JVM: Before & After"
excalidraw_file: "04-container-aware-jvm.excalidraw"
order: 4
slide_ref: "4"
description: "How UseContainerSupport fixes the /proc/meminfo vs cgroup mismatch."
prev_url: "/diagrams/diagram-03/"
prev_title: "AOT Cache Progression"
next_url: "/diagrams/diagram-05/"
next_title: "Leyden Flow"
---

**Walk-through:** Left side (red) shows the broken state: JVM reads `/proc/meminfo`, sees 64GB of host RAM, claims a 16GB heap inside a 512MB container, and gets OOMKilled. Right side (green) shows the fix: UseContainerSupport reads cgroup limits, MaxRAMPercentage=75 sets heap to 384MB, and the pod runs healthily.

**Key fact:** UseContainerSupport is ON by default in Java 21. MaxRAMPercentage is NOT set to a sensible value by default — you must explicitly set it to 75%.
