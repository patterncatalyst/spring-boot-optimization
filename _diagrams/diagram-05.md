---
title: "Spring Boot + Project Leyden Flow"
excalidraw_file: "05-spring-boot-leyden-flow.excalidraw"
order: 5
slide_ref: "24-25"
description: "The 3-stage Containerfile workflow: compile → train (record + create) → runtime with AOT cache."
prev_url: "/diagrams/diagram-04/"
prev_title: "Container-Aware JVM"
next_url: "/diagrams/diagram-06/"
next_title: "Anti-Patterns vs Fixes"
---

**Walk-through:** Stage 1 builds the JAR with Maven. Stage 2 runs two `-XX:AOTMode` steps: first `record` to capture a class/method profile during a training run, then `create` to build the AOT cache from that profile. Stage 3 runs the app with `-XX:AOTCache=app.aot`, skipping class loading and JIT warmup.

**Spring Boot specific:** Unlike frameworks with single-property AOT support, Spring Boot requires explicit `-XX:AOTMode` steps. This gives you full control over the training run but requires a more complex Containerfile.
