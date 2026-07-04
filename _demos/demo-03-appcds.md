---
title: "Demo 03 — AppCDS Startup Acceleration"
demo_number: "03"
session: core
runtime: "Spring Boot 4.0.5 / Java 21"
time: "~8 min"
demo_dir: "demo-03-appcds"
run_command: "./demo.sh"
prev_url: "/demos/demo-02-gc-monitoring/"
prev_title: "Demo 02 — GC Monitoring"
next_url: "/demos/demo-04-leyden/"
next_title: "Demo 04 — Project Leyden"
---

AppCDS caches parsed + verified bytecode from the classpath. Spring Boot gets **~35-55% improvement** — significantly more than Quarkus (~5%) because Spring Boot loads thousands of classes at startup that AppCDS can accelerate.

## Why Spring Boot benefits so much

Spring Boot's fat JAR classpath typically contains 8,000-12,000 classes loaded at startup for auto-configuration, component scanning, and dependency injection. AppCDS caches all of these as pre-parsed, pre-verified bytecode — eliminating the most expensive part of Spring Boot startup.

Quarkus moves most of this work to build time, which is why AppCDS only gives ~5% there. For Spring Boot, AppCDS addresses the largest remaining startup bottleneck.

## Three-stage Dockerfile

| Stage | Purpose |
|-------|---------|
| builder | `mvn package` to create the fat JAR |
| trainer | Run the app once with `-XX:ArchiveClassesAtExit` to dump the class list |
| runtime | Run with `-XX:SharedArchiveFile` to load the cached classes |

```dockerfile
# Stage 2: Training run — creates the AppCDS archive
FROM ubi9/openjdk-21-runtime AS trainer
COPY --from=builder /app/target/*.jar app.jar
RUN java -XX:ArchiveClassesAtExit=app-cds.jsa \
         -Dspring.context.exit=onRefresh \
         -jar app.jar || true

# Stage 3: Runtime — uses the pre-built archive
FROM ubi9/openjdk-21-runtime
COPY --from=trainer /app/app-cds.jsa app-cds.jsa
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java", "-XX:SharedArchiveFile=app-cds.jsa", "-jar", "app.jar"]
```

## Honest benchmark

| Configuration | Startup time | Delta |
|---------------|-------------|-------|
| Spring Boot baseline | ~4-8s | — |
| Spring Boot + AppCDS | ~2.4s | -35-55% |

## Reference

- [Demo source]({{ site.repo }}/tree/main/spring-boot-demos/demo-03-appcds)
- [Red Hat AppCDS article](https://developers.redhat.com/articles/2024/01/23/speed-java-application-startup-time-appcds)
