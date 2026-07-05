---
layout: default
permalink: /docs/apply-to-your-app/
title: "Apply to Your App"
description: How to bring these JVM optimizations to your existing Spring Boot applications.
---

<div class="container">
  <nav class="breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a> /
    <a href="{{ '/docs/' | relative_url }}">Docs</a> /
    <span>Apply to Your App</span>
  </nav>

  <h1>Apply to Your App</h1>
  <p style="color:var(--muted);margin-top:.4rem;">
    A checklist for bringing these optimizations to your existing Spring Boot applications.
    Every item is a configuration or build change — no application code rewrites.
  </p>

  <div class="callout" style="margin:1.5rem 0;">
    <strong>Estimated effort:</strong> ~4 hours per microservice. Most of the time is measuring, not changing.
    For a team with 10 services, budget two days.
  </div>

  <!-- ═══════ STEP 1 ═══════ -->
  <h2 id="step-1" style="color:var(--teal);margin-top:2rem;">
    Step 1: Fix Container Memory (30 minutes)
  </h2>

  <p>This is the single most impactful change. If you do nothing else, do this.</p>

  <h3>In your Containerfile</h3>
  <div class="run-box">
    <div class="run-box-header">Containerfile ENTRYPOINT</div>
    <pre><code>ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]</code></pre>
  </div>

  <h3>In your Kubernetes deployment</h3>
  <div class="run-box">
    <div class="run-box-header">deployment.yaml</div>
    <pre><code>env:
- name: JAVA_OPTS
  value: >-
    -XX:MaxRAMPercentage=75.0
    -XX:InitialRAMPercentage=50.0
    -XX:MaxMetaspaceSize=256m
    -XX:NativeMemoryTracking=summary
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "768Mi"
    cpu: "2000m"</code></pre>
  </div>

  <h3>Verify</h3>
  <div class="run-box">
    <div class="run-box-header">Check heap sizing</div>
    <pre><code># After deploying, exec into the pod:
kubectl exec -it &lt;pod&gt; -- jcmd 1 VM.flags | grep -i heap
# Verify MaxHeapSize is ~75% of container limit</code></pre>
  </div>

  <!-- ═══════ STEP 2 ═══════ -->
  <h2 id="step-2" style="color:var(--teal);margin-top:2rem;">
    Step 2: Add Observability (30 minutes)
  </h2>

  <h3>Maven dependencies</h3>
  <div class="run-box">
    <div class="run-box-header">pom.xml</div>
    <pre><code>&lt;dependency&gt;
  &lt;groupId&gt;org.springframework.boot&lt;/groupId&gt;
  &lt;artifactId&gt;spring-boot-starter-actuator&lt;/artifactId&gt;
&lt;/dependency&gt;
&lt;dependency&gt;
  &lt;groupId&gt;io.micrometer&lt;/groupId&gt;
  &lt;artifactId&gt;micrometer-registry-prometheus&lt;/artifactId&gt;
&lt;/dependency&gt;</code></pre>
  </div>

  <h3>Configuration</h3>
  <div class="run-box">
    <div class="run-box-header">application.properties</div>
    <pre><code># Expose the Prometheus endpoint
management.endpoints.web.exposure.include=health,info,prometheus,metrics

# GC pause histogram — REQUIRED for Grafana GC panels
management.metrics.distribution.percentiles-histogram.jvm.gc.pause=true

# Tag metrics with app name for Grafana filtering
management.metrics.tags.application=${spring.application.name}</code></pre>
  </div>

  <h3>Verify</h3>
  <div class="run-box">
    <div class="run-box-header">Check metrics endpoint</div>
    <pre><code>curl http://localhost:8080/actuator/prometheus | grep jvm_gc_pause
# Should show histogram buckets, not just a counter</code></pre>
  </div>

  <!-- ═══════ STEP 3 ═══════ -->
  <h2 id="step-3" style="color:var(--teal);margin-top:2rem;">
    Step 3: Set GC Threads (5 minutes)
  </h2>

  <p>Add to your <code>JAVA_OPTS</code>:</p>

  <div class="run-box">
    <div class="run-box-header">Match GC threads to CPU limit</div>
    <pre><code># If your CPU request is 2 cores:
-XX:ParallelGCThreads=2
-XX:ConcGCThreads=1</code></pre>
  </div>

  <p style="color:var(--muted);">Without this, the JVM defaults to the host node's CPU count. A 64-core node with a 2-CPU limit = 64 GC threads fighting for 2 CPU slots.</p>

  <!-- ═══════ STEP 4 ═══════ -->
  <h2 id="step-4" style="color:var(--teal);margin-top:2rem;">
    Step 4: Enable Virtual Threads (1 minute)
  </h2>

  <div class="run-box">
    <div class="run-box-header">application.properties</div>
    <pre><code>spring.threads.virtual.enabled=true</code></pre>
  </div>

  <p style="color:var(--muted);">One property. Switches Tomcat's executor, @Async methods, and scheduled tasks to virtual threads. Reduces thread stack memory by ~50% for I/O-bound workloads.</p>

  <div class="callout">
    <strong>Caveat:</strong> Avoid <code>synchronized</code> blocks with I/O inside — they pin the carrier thread. Use <code>ReentrantLock</code> instead.
  </div>

  <!-- ═══════ STEP 5 ═══════ -->
  <h2 id="step-5" style="color:var(--teal);margin-top:2rem;">
    Step 5: Add AppCDS (2 hours)
  </h2>

  <p>Convert your Containerfile from a 1-stage or 2-stage build to a 3-stage build:</p>

  <div class="run-box">
    <div class="run-box-header">Containerfile (3-stage AppCDS pattern)</div>
    <pre><code># Stage 1: Build
FROM registry.access.redhat.com/ubi9/openjdk-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -q

# Stage 2: CDS Training
FROM registry.access.redhat.com/ubi9/openjdk-21 AS cds-trainer
COPY --from=builder /build/target/*.jar /app/app.jar
WORKDIR /app
RUN java -Dspring.context.exit=onRefresh \
    -XX:ArchiveClassesAtExit=app-cds.jsa \
    -jar app.jar || true
RUN java -Xshare:dump \
    -XX:SharedClassListFile=/dev/null \
    -XX:SharedArchiveFile=app-cds.jsa \
    -jar app.jar || true

# Stage 3: Runtime
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY --from=cds-trainer /app/app.jar /app/app-cds.jsa /deployments/
WORKDIR /deployments
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Xshare:on \
  -XX:SharedArchiveFile=app-cds.jsa -jar app.jar"]</code></pre>
  </div>

  <p style="color:var(--muted);margin:.5rem 0;">The training stage runs Spring Boot just long enough to load all classes, then dumps the CDS archive. At runtime, the JVM memory-maps the archive for near-instant class loading.</p>

  <!-- ═══════ STEP 6 ═══════ -->
  <h2 id="step-6" style="color:var(--teal);margin-top:2rem;">
    Step 6: Right-Size Resources (1 hour)
  </h2>

  <ol style="line-height:2;">
    <li>Run your app under realistic load for 15-30 minutes</li>
    <li>Collect P50 and P99 RSS from Prometheus: <code>container_memory_rss</code></li>
    <li>Set <code>requests.memory</code> to P50 RSS + 10%</li>
    <li>Set <code>limits.memory</code> to P99 RSS + 25-30%</li>
    <li>Set <code>limits.cpu</code> to 2-4x <code>requests.cpu</code> for GC headroom</li>
    <li>Run <code>jcmd pid VM.native_memory summary</code> to verify heap + off-heap fits within limits</li>
  </ol>

  <!-- ═══════ STEP 7 ═══════ -->
  <h2 id="step-7" style="color:var(--teal);margin-top:2rem;">
    Step 7: Fix HPA (30 minutes)
  </h2>

  <div class="run-box">
    <div class="run-box-header">hpa.yaml</div>
    <pre><code>spec:
  minReplicas: 2     # Never 1
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 300
  metrics:
  - type: External
    external:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "50"</code></pre>
  </div>

  <p style="color:var(--muted);">Scale on RPS, not CPU. GC pauses create CPU spikes that trigger false scale-out events. The 120-second stabilization window absorbs GC transients.</p>

  <!-- ═══════ STEP 8 ═══════ -->
  <h2 id="step-8" style="color:var(--teal);margin-top:2rem;">
    Step 8: Configure Lifecycle &amp; Health Probes (15 minutes)
  </h2>

  <div class="run-box">
    <div class="run-box-header">application.properties</div>
    <pre><code># Graceful shutdown — drain in-flight requests before stopping
server.shutdown=graceful
spring.lifecycle.timeout-per-shutdown-phase=30s</code></pre>
  </div>

  <div class="run-box" style="margin-top:1rem;">
    <div class="run-box-header">deployment.yaml — pod spec</div>
    <pre><code>spec:
  terminationGracePeriodSeconds: 40  # Must exceed shutdown timeout (30s)
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          command: ["sleep", "5"]  # Let LB drain before SIGTERM
    startupProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      failureThreshold: 30   # 30 × 2s = 60s for JVM startup
      periodSeconds: 2
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      periodSeconds: 5</code></pre>
  </div>

  <h4>Verify</h4>
  <div class="run-box">
    <div class="run-box-header">bash</div>
    <pre><code>kubectl describe pod &lt;pod-name&gt; | grep -A 5 "Liveness\|Readiness\|Startup"</code></pre>
  </div>

  <p style="color:var(--muted);">
    <strong>Why startupProbe?</strong> Without it, livenessProbe runs from second zero — the JVM is still loading 12,000 classes and liveness kills it at second 3. CrashLoopBackOff from a health check, not from a bug.<br>
    <strong>Why preStop sleep(5)?</strong> Kubernetes sends SIGTERM and removes the pod from endpoints simultaneously, but endpoint removal takes 1-5s to propagate. The sleep delays SIGTERM so the load balancer stops sending traffic before Spring Boot starts shutting down.
  </p>

  <div class="callout" style="margin:1.5rem 0;">
    <strong>Pro Tip — Active JVM Warmup:</strong> A pod that passes its startupProbe isn't necessarily
    ready to handle traffic at full speed. The JIT hasn't compiled hot paths, connection pools
    aren't established, and caches are cold. Create a custom <code>HealthIndicator</code> that performs
    active warmup (invoking key endpoints, loading caches) before reporting UP. Include it in the
    readiness health group:
  </div>

  <div class="run-box">
    <div class="run-box-header">application.properties — warmup readiness gate</div>
    <pre><code># Include custom warmup indicator in readiness group
management.endpoint.health.group.readiness.include=applicationWarmup
management.endpoint.health.group.readiness.show-details=always</code></pre>
  </div>

  <p style="color:var(--muted);margin-top:.5rem;">
    The <code>ApplicationWarmup</code> component implements <code>HealthIndicator</code> and
    <code>ApplicationListener&lt;ApplicationReadyEvent&gt;</code>. It reports <code>DOWN</code>
    until <code>performWarmup()</code> completes (invokes internal endpoints via <code>RestClient</code>),
    then reports <code>UP</code>. The readinessProbe won't pass until warmup is done —
    Kubernetes won't route traffic until the JVM is actually warm.<br><br>
    <strong>Startup resource spike:</strong> A fresh JVM needs 2-4× more CPU during class loading
    and JIT compilation than at steady state. Consider Google's open-source
    <code>kube-startup-cpu-boost</code> to grant temporary extra CPU during startup.
  </p>

  <!-- ═══════ CHECKLIST ═══════ -->
  <h2 id="checklist" style="color:var(--teal);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Quick Checklist
  </h2>

  <table style="font-size:.85rem;margin:1rem 0;">
    <thead>
      <tr><th>Change</th><th>Effort</th><th>Impact</th><th>Code Change?</th></tr>
    </thead>
    <tbody>
      <tr><td>MaxRAMPercentage=75</td><td>5 min</td><td>Prevents OOMKill</td><td>No</td></tr>
      <tr><td>ParallelGCThreads = CPU limit</td><td>5 min</td><td>30-50% shorter GC pauses</td><td>No</td></tr>
      <tr><td>spring.threads.virtual.enabled</td><td>1 min</td><td>50% thread stack savings</td><td>No</td></tr>
      <tr><td>Actuator + Micrometer</td><td>30 min</td><td>Full JVM observability</td><td>2 deps + 3 lines</td></tr>
      <tr><td>AppCDS 3-stage Containerfile</td><td>2 hrs</td><td>35-55% faster startup</td><td>No</td></tr>
      <tr><td>Right-size resources</td><td>1 hr</td><td>40-60% memory savings</td><td>No</td></tr>
      <tr><td>HPA on RPS</td><td>30 min</td><td>Eliminates GC thrash</td><td>No</td></tr>
      <tr><td>Graceful shutdown + health probes</td><td>15 min</td><td>Zero-downtime deploys</td><td>2 props + YAML</td></tr>
    </tbody>
  </table>

  <div class="callout" style="margin:1.5rem 0;">
    <strong>Order matters:</strong> Fix memory first (Step 1), add observability second (Step 2), then tune based on data (Steps 3-7). Step 8 (lifecycle) can be done in parallel with any other step. Never tune without a baseline.
  </div>

  <div style="margin-top:1.5rem;">
    <a href="{{ '/docs/jvm-cheatsheet/' | relative_url }}" class="btn">JVM Cheat Sheet →</a>
    <a href="{{ '/docs/spring-boot-reference/' | relative_url }}" class="btn btn-outline" style="margin-left:.5rem;">Spring Boot Reference →</a>
  </div>

</div>
