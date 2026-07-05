---
layout: default
permalink: /docs/spring-boot-reference/
title: Spring Boot Configuration Reference
description: "Full configuration reference for Spring Boot 4.0.5 on OpenShift and Kubernetes"
---

<div class="container">
  <nav class="breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a> /
    <a href="{{ '/docs/' | relative_url }}">Docs</a> /
    <span>Spring Boot Configuration Reference</span>
  </nav>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin:1.5rem 0;flex-wrap:wrap;gap:1rem;">
    <div>
      <h1>Spring Boot Configuration Reference</h1>
      <p style="color:var(--muted);margin-top:.4rem;">
        Comprehensive configuration reference for Spring Boot 4.0.5 workloads running on
        OpenShift and Kubernetes. Covers all 9 demos from container images through Panama FFM.
      </p>
    </div>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md"
       target="_blank" class="btn btn-outline btn-sm">View on GitHub ↗</a>
  </div>

  <div class="grid grid-2" style="margin-bottom:1.5rem;">
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">Container Images</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        <strong style="color:var(--text);">Java 21:</strong> <code>ubi9/openjdk-21-runtime</code> (Shenandoah default) or <code>eclipse-temurin:21-jre</code> (G1GC default).<br>
        <strong style="color:var(--text);">Java 25:</strong> <code>eclipse-temurin:25-jre</code> for Leyden, Panama, ONNX demos.
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">Multi-Stage Containerfile Pattern</h3>
      <pre style="font-size:.75rem;margin-top:.5rem;"><code>FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests
FROM ubi9/openjdk-21-runtime
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java",
  "-XX:+UseContainerSupport",
  "-XX:MaxRAMPercentage=75.0",
  "-jar", "app.jar"]</code></pre>
    </div>
  </div>

  <h2 style="color:var(--teal);margin:1.5rem 0 .75rem;">Sections</h2>
  <div class="grid grid-2" style="margin-bottom:1.5rem;">

    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#container-images"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Container Images
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#jvm-heap-sizing"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      JVM Heap Sizing
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#garbage-collector-selection"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Garbage Collector Selection
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#startup-optimization"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Startup Optimization
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#appcds-for-spring-boot"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      AppCDS for Spring Boot
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#project-leyden-aot-cache"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Project Leyden AOT Cache
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#observability--micrometer--actuator"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Observability — Micrometer + Actuator
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#prometheus-endpoint-configuration"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Prometheus Endpoint Configuration
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#grpc-via-spring-boot-4"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      gRPC via Spring Boot 4
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#kubernetes-resource-configuration"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Kubernetes Resource Configuration
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#hpa-configuration-for-jvm-workloads"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      HPA Configuration
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#panama-ffm-jdk-22"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Panama FFM (JDK 22+)
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#langchain4j-onnx-embeddings"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      LangChain4j ONNX Embeddings
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#spring-boot-devtools"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Spring Boot DevTools
    </a>
    <a href="{{ site.repo }}/blob/main/spring-boot-demos/SPRING-BOOT-README.md#common-pitfalls"
       target="_blank" class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Common Pitfalls
    </a>
    <a href="{{ '/docs/apply-to-your-app/#step-8' | relative_url }}"
       class="tag tag-teal" style="display:block;padding:.55rem .85rem;font-size:.82rem;text-align:center;">
      Graceful Shutdown &amp; Health Probes
    </a>

  </div>

  <div class="callout">
    <strong>Key differences from Quarkus:</strong>
  </div>

  <div class="grid grid-2" style="margin-bottom:1.5rem;">
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">GC Selection</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        Spring Boot has no framework-level GC property. Set GC via <code>JAVA_OPTS</code>
        environment variable or JVM arguments: <code>-XX:+UseZGC</code>, <code>-XX:+UseG1GC</code>,
        or <code>-XX:+UseShenandoahGC</code>.
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">AppCDS (35-55% improvement)</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        Spring Boot benefits dramatically from AppCDS because it loads 8,000-12,000 classes at startup.
        Uses a 3-stage Containerfile: build, train (<code>-XX:ArchiveClassesAtExit</code>),
        run (<code>-XX:SharedArchiveFile</code>).
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">Leyden AOT Cache</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        No single-property shortcut. Explicit <code>-XX:AOTMode=record</code>,
        <code>-XX:AOTMode=create</code>, and <code>-XX:AOTCache=app.aot</code> steps required.
        Use <code>-Dspring.context.exit=onRefresh</code> to exit training cleanly.
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">Metrics via Actuator</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        Prometheus endpoint at <code>/actuator/prometheus</code> (not <code>/q/metrics</code>).
        Requires <code>management.endpoints.web.exposure.include=prometheus</code>
        and <code>management.prometheus.metrics.export.enabled=true</code>.
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">gRPC — Spring Boot 4.0</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        First-class support via <code>spring-grpc-spring-boot-starter</code>.
        Configure port with <code>spring.grpc.server.port</code>.
        No third-party library needed.
      </p>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3 style="color:var(--teal);">Panama FFM</h3>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        Same JDK 22+ API. Spring Boot needs <code>--enable-native-access=ALL-UNNAMED</code>
        as a JVM flag. Wire native components via <code>@Configuration</code> + <code>@Bean</code>.
      </p>
    </div>
  </div>

  <div class="callout">
    <strong>Common pitfalls covered:</strong> Unqualified image names in Podman, SELinux bind mounts
    (<code>:Z</code>), named volume permissions, fat JAR classpath ordering for AppCDS,
    Leyden JVM fingerprint mismatch, <code>--enable-native-access</code> missing for Panama,
    Actuator endpoint exposure, Maven wrapper permissions.
  </div>

  <div class="run-box" style="margin-top:1.5rem;">
    <div class="run-box-header">File location in repo</div>
    <pre><code>spring-boot-demos/SPRING-BOOT-README.md</code></pre>
  </div>
</div>
