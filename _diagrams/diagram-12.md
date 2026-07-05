---
title: "Cloud-Native Lifecycle"
excalidraw_file: "12-cloud-native-lifecycle.excalidraw"
order: 12
slide_ref: "16"
description: "Pod termination timeline (preStop → SIGTERM → drain → SIGKILL) and health probe relationships."
prev_url: "/diagrams/diagram-11/"
prev_title: "G1GC vs ZGC Pause Behavior"
next_url: ""
next_title: ""
---

**Walk-through:** Two bands show the pod termination timeline and health probe lifecycle. The top band traces the termination sequence: K8s signals at t=0, preStop sleep(5) runs, SIGTERM delivered at t=5, Spring Boot drains in-flight requests for up to 30s, and SIGKILL fires at t=40. The bottom band shows the three health probes: startupProbe guards JVM warmup (60s budget), livenessProbe restarts only on deadlock, and readinessProbe removes from Service during transient issues.

**Key race condition:** Kubernetes sends SIGTERM and removes the pod from endpoints simultaneously, but endpoint removal takes 1-5s to propagate through kube-proxy/iptables. The preStop sleep(5) delays SIGTERM so the load balancer stops sending traffic before Spring Boot starts shutting down — zero dropped requests.
