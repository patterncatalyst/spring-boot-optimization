---
title: "Spring Boot Observability Stack"
excalidraw_file: "09-observability-stack.excalidraw"
order: 9
slide_ref: "13-14"
description: "Actuator + Micrometer → Prometheus → Grafana, with JFR/Cryostat side channel."
prev_url: "/diagrams/diagram-08/"
prev_title: "Startup Breakdown"
next_url: "/diagrams/diagram-10/"
next_title: "Panama FFM Call Chain"
---

**Walk-through:** Left column shows the Spring Boot app with three observability sources: Actuator (Prometheus endpoint), Micrometer (JVM metrics), and JFR (flight recordings). Middle column shows collection: Prometheus scrapes the Actuator endpoint, Cryostat manages JFR on OpenShift. Right column shows visualization: Grafana dashboards, PrometheusRule alerting, and Cryostat UI.

**Critical configuration:** `management.metrics.distribution.percentiles-histogram.jvm.gc.pause=true` — without this, the Grafana GC panels show no data.
