---
title: "Demo 04 — Project Leyden AOT Cache"
demo_number: "04"
session: bonus
runtime: "Spring Boot 4.0.5 / JDK 25"
time: "~12 min"
demo_dir: "demo-04-leyden"
run_command: "./demo.sh"
jdk25: true
prev_url: "/demos/demo-03-appcds/"
prev_title: "Demo 03 — AppCDS"
next_url: "/demos/demo-05-grpc/"
next_title: "Demo 05 — gRPC"
---

Project Leyden's AOT cache goes beyond AppCDS — it caches parsed + linked classes AND JIT method profiles. First requests after startup get near-peak JIT performance.

## How Leyden works with Spring Boot

Unlike Quarkus (which sets Leyden configuration via a single property), Spring Boot requires explicit `-XX:AOTMode` JVM flags in a multi-step process:

### Step 1: Training run — record the AOT cache

```bash
java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf \
     -Dspring.context.exit=onRefresh \
     -jar app.jar
```

### Step 2: Create the AOT cache

```bash
java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf \
     -XX:AOTCache=app.aot \
     -jar app.jar
```

### Step 3: Run with the AOT cache

```bash
java -XX:AOTCache=app.aot -jar app.jar
```

## Three-stage Dockerfile

| Stage | Image | Purpose |
|-------|-------|---------|
| builder | `maven:3.9-eclipse-temurin-25` | Build JAR |
| trainer | `eclipse-temurin:25` | Training run + cache creation |
| runtime | `eclipse-temurin:25-jre` | Copy JAR + app.aot |

JVM fingerprint must match between trainer and runtime — use the same JDK distribution.

## Common pitfalls

- JDK 25+ required — Leyden AOT cache is not available on JDK 21
- Trainer and runtime must use the same JDK build — JVM fingerprint mismatch silently disables the cache
- Use `-Dspring.context.exit=onRefresh` to exit cleanly after recording
- The `-XX:AOTMode` flags are explicit — unlike Quarkus, there is no single property shortcut

## Reference

- [Demo source]({{ site.repo }}/tree/main/spring-boot-demos/demo-04-leyden)
- [JEP 483](https://openjdk.org/jeps/483) / [JEP 514](https://openjdk.org/jeps/514) / [JEP 515](https://openjdk.org/jeps/515)
- [Spring Boot AOT documentation](https://docs.spring.io/spring-boot/reference/packaging/aot.html)
