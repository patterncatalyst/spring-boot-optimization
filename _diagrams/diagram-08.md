---
title: "Spring Boot Startup Breakdown"
excalidraw_file: "08-spring-boot-startup-breakdown.excalidraw"
order: 8
slide_ref: "11, 18-20"
description: "Waterfall showing where startup time is spent and where AppCDS helps most."
prev_url: "/diagrams/diagram-07/"
prev_title: "gRPC vs REST"
next_url: "/diagrams/diagram-09/"
next_title: "Observability Stack"
---

**Walk-through:** Top row shows baseline Spring Boot startup (~4-8s): class loading (1.5-3s), auto-configuration (0.5-1.5s), bean initialization (1-2s), and Tomcat start (0.5-1s). Bottom row shows the same phases with AppCDS — class loading and auto-config phases are dramatically reduced because the CDS archive pre-processes class data.

**Key insight:** AppCDS helps most with the phases Spring Boot spends the most time on — class loading and linking. Bean initialization and Tomcat startup are not cached, which is why the improvement is 35-55%, not 90%.
