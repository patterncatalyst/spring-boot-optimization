# Spring Boot Configuration Reference

Comprehensive configuration reference for Spring Boot 4.0.5 workloads running on
OpenShift and Kubernetes. Covers all 9 demos from container images through Panama FFM.

---

## Container Images

### Java 21 (primary)

| Image | Source | Default GC | Shenandoah? | Use case |
|---|---|---|---|---|
| `registry.access.redhat.com/ubi9/openjdk-21-runtime` | Red Hat | G1GC | Available | Production (OpenShift/RHEL) |
| `docker.io/library/eclipse-temurin:21-jre` | Eclipse Adoptium | G1GC | Not included | Production (multi-cloud) |

### Java 25 (Leyden, Panama, ONNX demos)

| Image | Source | Default GC | Use case |
|---|---|---|---|
| `docker.io/library/eclipse-temurin:25` | Eclipse Adoptium | G1GC | Leyden AOT cache, Panama FFM, ONNX inference |
| `docker.io/library/eclipse-temurin:25-jre` | Eclipse Adoptium | G1GC | Production (JDK 25 features) |

### Multi-stage Containerfile pattern

```containerfile
# Stage 1: Build
FROM docker.io/library/maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Use Maven wrapper if present; fall back to global mvn
RUN if [ -f ./mvnw ]; then chmod +x ./mvnw && ./mvnw package -DskipTests; \
    else mvn package -DskipTests; fi

# Stage 2: Runtime
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY --from=builder /app/target/*.jar app.jar
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

### Image selection rules

1. **Default to UBI9 images** for OpenShift and Red Hat environments. They include
   Shenandoah and are certified for RHEL/OpenShift.
2. **Use Temurin images** for JDK 25 features (Leyden, Panama) or multi-cloud portability.
3. **Always use fully qualified image names** with Podman. Podman does not default to
   `docker.io` like Docker does.

---

## JVM Heap Sizing

### Container-aware heap sizing

```bash
# The three essential flags for every containerized JVM
-XX:+UseContainerSupport        # Read cgroup limits (default true since JDK 10)
-XX:MaxRAMPercentage=75.0       # 75% of container memory for max heap
-XX:InitialRAMPercentage=50.0   # 50% for initial heap (reduces early GC)
```

### Why 75% and not higher?

Spring Boot applications need significant off-heap memory:

| Component | Typical usage |
|---|---|
| Metaspace | 60-80 MB (Spring Boot loads 8,000-12,000 classes) |
| Thread stacks | 1 MB per thread (50 Tomcat threads = 50 MB) |
| JIT code cache | 48 MB (ReservedCodeCacheSize default) |
| Direct byte buffers | 10-50 MB (Netty, gRPC) |
| GC data structures | 5-15% of heap |

At `MaxRAMPercentage=75.0` in a 1 GB container, the heap is 768 MB with 256 MB for
off-heap components. At 90%, the heap is 921 MB with only 103 MB for off-heap -- tight
enough to trigger OOMKilled under load.

### Sizing by workload

| Workload | Container memory | MaxRAMPercentage | Effective heap |
|---|---|---|---|
| Light REST API | 512 Mi | 75.0 | 384 MB |
| Heavy REST API | 1 Gi | 75.0 | 768 MB |
| gRPC service | 1 Gi | 75.0 | 768 MB |
| Batch processing | 2 Gi | 75.0 | 1.5 GB |
| ONNX inference | 2 Gi | 75.0 | 1.5 GB |

---

## Garbage Collector Selection

Spring Boot has no framework-level GC property. Set the GC via `JAVA_OPTS` or JVM
arguments in the Containerfile `ENTRYPOINT`.

### Available collectors

```bash
# G1GC -- default on all JDK distributions
# No flag needed; it is the default

# Shenandoah -- available on Red Hat OpenJDK builds
-XX:+UseShenandoahGC

# ZGC -- available on JDK 15+ (all vendors)
-XX:+UseZGC
```

### Which GC for which demo

| Demo | GC used | Why |
|---|---|---|
| 01 - Heap Sizing | G1GC (default) | Focus is on heap sizing, not GC |
| 02 - GC Monitoring | G1GC baseline, then Shenandoah + ZGC | Comparison across all three |
| 03 - AppCDS | G1GC (default) | AppCDS is orthogonal to GC choice |
| 04 - Leyden | G1GC (default) | Leyden is orthogonal to GC choice |
| 05 - gRPC | Shenandoah | Low latency for RPC workload |
| 06 - Latency | All three (A/B/C) | Full GC comparison |
| 07 - Right-Sizing | G1GC (default) | Focus is on resource sizing |
| 08 - Panama | G1GC (default) | FFM is orthogonal to GC choice |
| 09 - ONNX | G1GC (default) | Inference workload is CPU-bound |

### Setting GC via environment variable

```yaml
# Kubernetes deployment
env:
  - name: JAVA_OPTS
    value: "-XX:+UseShenandoahGC -XX:MaxRAMPercentage=75.0"
```

```containerfile
# Containerfile ENTRYPOINT
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

---

## Startup Optimization

Spring Boot applications load 8,000-12,000 classes at startup, making them excellent
candidates for class-data sharing and AOT compilation.

### Techniques by impact

| Technique | Improvement | JDK | Demo |
|---|---|---|---|
| `-XX:TieredStopAtLevel=1` | 15-25% | Any | N/A |
| AppCDS | 35-55% | 13+ | Demo 03 |
| Project Leyden AOT Cache | 40-60% | 25 | Demo 04 |
| Spring AOT processing | 10-20% (additive) | 21+ | Built into Spring Boot 4.0.5 |

### Spring-specific startup tips

```yaml
# application.yml -- reduce startup work
spring:
  jpa:
    defer-datasource-initialization: true
    open-in-view: false
  main:
    lazy-initialization: true    # Defer bean creation until first use
```

> **Warning:** `lazy-initialization=true` improves startup but shifts initialization
> latency to the first request. Combine with a readiness probe that exercises lazy beans.

---

## AppCDS for Spring Boot

Application Class Data Sharing (AppCDS) pre-loads and pre-links classes into a shared
archive, eliminating redundant class loading and verification at startup. Spring Boot
benefits dramatically because of its high class count.

### Measured improvement

| Configuration | Startup time | Improvement |
|---|---|---|
| Baseline (no optimization) | 3.2 s | -- |
| AppCDS | 1.7 s | 47% faster |
| AppCDS + `TieredStopAtLevel=1` | 1.4 s | 56% faster |

### 3-stage Containerfile

```containerfile
# Stage 1: Build
FROM docker.io/library/maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

# Stage 2: Training run (record class usage)
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime AS trainer
COPY --from=builder /app/target/*.jar app.jar
RUN java -XX:ArchiveClassesAtExit=app-cds.jsa \
    -Dspring.context.exit=onRefresh \
    -jar app.jar

# Stage 3: Production (use the archive)
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY --from=trainer /app.jar app.jar
COPY --from=trainer /app-cds.jsa app-cds.jsa
ENTRYPOINT ["java", \
  "-XX:SharedArchiveFile=app-cds.jsa", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

### Important notes

- The CDS archive is tied to the exact JDK version. Rebuild the archive when you update
  the JDK.
- `-Dspring.context.exit=onRefresh` tells Spring Boot to exit after the application context
  is fully initialized, which is the ideal point for AppCDS training.
- Fat JAR classpath ordering matters. The training run and production run must use the same
  JAR file.

---

## Project Leyden AOT Cache

Project Leyden extends AppCDS with ahead-of-time compiled code and pre-initialized data
structures. Available in JDK 25.

### How it works

1. **Record phase** -- Run the application with `-XX:AOTMode=record` to capture which
   classes and methods are used during startup.
2. **Create phase** -- Run with `-XX:AOTMode=create` to compile hot methods ahead of time
   and build the AOT cache.
3. **Production run** -- Load the AOT cache with `-XX:AOTCache=app.aot`.

### Containerfile

```containerfile
# Stage 1: Build
FROM docker.io/library/maven:3.9-eclipse-temurin-25 AS builder
WORKDIR /app
COPY . .
RUN ./mvnw package -DskipTests

# Stage 2: Record + Create
FROM docker.io/library/eclipse-temurin:25 AS trainer
COPY --from=builder /app/target/*.jar app.jar

# Record phase: capture class/method usage
RUN java -XX:AOTMode=record \
    -XX:AOTConfiguration=app.aotconf \
    -Dspring.context.exit=onRefresh \
    -jar app.jar

# Create phase: build AOT cache
RUN java -XX:AOTMode=create \
    -XX:AOTConfiguration=app.aotconf \
    -XX:AOTCache=app.aot \
    -jar app.jar

# Stage 3: Production
FROM docker.io/library/eclipse-temurin:25
COPY --from=trainer /app.jar app.jar
COPY --from=trainer /app.aot app.aot
ENTRYPOINT ["java", \
  "-XX:AOTCache=app.aot", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

### Important notes

- Leyden requires **explicit** `-XX:AOTMode=record` and `-XX:AOTMode=create` steps.
  There is no single-property shortcut like Quarkus's `quarkus.package.type`.
- The AOT cache is tied to the exact JDK build. A JVM fingerprint mismatch (different JDK
  update) will cause the cache to be silently ignored.
- Use `-Dspring.context.exit=onRefresh` for the recording step to capture the full startup
  sequence and then exit cleanly.

---

## Observability — Micrometer + Actuator

Spring Boot uses Micrometer for metrics collection and Spring Boot Actuator for exposing
them via HTTP endpoints.

### Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

### Key difference from Quarkus

| Aspect | Spring Boot | Quarkus |
|---|---|---|
| Metrics library | Micrometer | Micrometer (via SmallRye) |
| Prometheus endpoint | `/actuator/prometheus` | `/q/metrics` |
| Health endpoint | `/actuator/health` | `/q/health` |
| Configuration style | `application.yml` properties | `application.properties` |

### Custom metrics

```java
@RestController
public class MyController {

    private final Counter requestCounter;
    private final Timer requestTimer;

    public MyController(MeterRegistry registry) {
        this.requestCounter = Counter.builder("api.requests")
            .description("Total API requests")
            .tag("endpoint", "/api/data")
            .register(registry);
        this.requestTimer = Timer.builder("api.latency")
            .description("API request latency")
            .tag("endpoint", "/api/data")
            .register(registry);
    }

    @GetMapping("/api/data")
    public ResponseEntity<String> getData() {
        return requestTimer.record(() -> {
            requestCounter.increment();
            // ... business logic
            return ResponseEntity.ok("data");
        });
    }
}
```

---

## Prometheus Endpoint Configuration

### Minimal configuration

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,info
  prometheus:
    metrics:
      export:
        enabled: true
```

### Kubernetes ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: spring-boot-app
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: spring-boot-app
  endpoints:
    - port: http
      path: /actuator/prometheus
      interval: 15s
```

### Key JVM metrics exposed

```
# GC metrics
jvm_gc_pause_seconds_count{action="end of major GC",cause="G1 Evacuation Pause",...}
jvm_gc_pause_seconds_sum{action="end of major GC",...}
jvm_gc_pause_seconds_max{action="end of major GC",...}

# Memory metrics
jvm_memory_used_bytes{area="heap",id="G1 Eden Space"}
jvm_memory_committed_bytes{area="heap",id="G1 Old Gen"}
jvm_memory_max_bytes{area="heap",id="G1 Old Gen"}
jvm_buffer_memory_used_bytes{id="direct"}

# Thread metrics
jvm_threads_live_threads
jvm_threads_daemon_threads
jvm_threads_peak_threads

# Class loading
jvm_classes_loaded_classes
jvm_classes_unloaded_classes_total

# Process
process_cpu_usage
process_uptime_seconds
system_cpu_usage
```

### Verifying the endpoint

```bash
# Check that the endpoint is exposed
curl -s http://localhost:8080/actuator | jq '.["_links"]'

# Fetch Prometheus metrics
curl -s http://localhost:8080/actuator/prometheus | head -50
```

---

## gRPC via Spring Boot 4

Spring Boot 4.0 provides first-class gRPC support via `spring-grpc-spring-boot-starter`.
No third-party library (like `net.devh:grpc-spring-boot-starter`) is needed.

### Setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.grpc</groupId>
    <artifactId>spring-grpc-spring-boot-starter</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  grpc:
    server:
      port: 9090
```

### Defining a service

```protobuf
// src/main/proto/hello.proto
syntax = "proto3";
package com.example;

service HelloService {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

```java
@GrpcService
public class HelloServiceImpl extends HelloServiceGrpc.HelloServiceImplBase {
    @Override
    public void sayHello(HelloRequest request, StreamObserver<HelloReply> responseObserver) {
        HelloReply reply = HelloReply.newBuilder()
            .setMessage("Hello, " + request.getName())
            .build();
        responseObserver.onNext(reply);
        responseObserver.onCompleted();
    }
}
```

### Testing with grpcurl

```bash
# List available services
grpcurl -plaintext localhost:9090 list

# Call a method
grpcurl -plaintext -d '{"name": "World"}' \
  localhost:9090 com.example.HelloService/SayHello

# Load test with ghz
ghz --insecure --call com.example.HelloService/SayHello \
    -d '{"name": "World"}' -n 10000 -c 50 localhost:9090
```

---

## Kubernetes Resource Configuration

### Resource requests and limits

```yaml
# deployment.yml
spec:
  containers:
    - name: spring-boot-app
      image: registry.access.redhat.com/ubi9/openjdk-21-runtime
      resources:
        requests:
          cpu: "500m"
          memory: "512Mi"
        limits:
          cpu: "2000m"
          memory: "1Gi"
      env:
        - name: JAVA_OPTS
          value: >-
            -XX:+UseContainerSupport
            -XX:MaxRAMPercentage=75.0
            -XX:ParallelGCThreads=2
```

### Sizing guidelines

| Workload type | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| REST API (light) | 250m | 1000m | 384Mi | 512Mi |
| REST API (heavy) | 500m | 2000m | 512Mi | 1Gi |
| gRPC service | 500m | 2000m | 512Mi | 1Gi |
| Batch / scheduled job | 1000m | 4000m | 1Gi | 2Gi |
| ML inference (ONNX) | 1000m | 4000m | 1Gi | 2Gi |

### Important rules

1. **Always set memory request = memory limit** for JVM workloads. The JVM sizes its heap
   from the memory limit (via `MaxRAMPercentage`). If the request is lower than the limit,
   the scheduler may place the pod on a node without enough physical memory.
2. **Set CPU request to your expected baseline**, CPU limit to your burst capacity.
   The JVM reads CPU limit for thread auto-sizing.
3. **Match `ParallelGCThreads` to CPU request**, not CPU limit. GC threads running on
   burst CPU contend with application threads.

---

## HPA Configuration for JVM Workloads

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spring-boot-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spring-boot-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

### JVM-specific HPA considerations

- **CPU target at 70%**, not the default 80%. GC activity creates periodic CPU spikes that
  can push utilization above the target, causing unnecessary scale-up/scale-down cycles.
- **Slow scale-down (300s stabilization)** -- JVM applications need 5-30 seconds to warm up
  (JIT compilation). Scaling down too quickly discards the JIT warmup investment.
- **ZGC for the most stable HPA** -- ZGC's flat CPU profile produces the most predictable
  CPU utilization signal. G1GC's STW pauses create spikes that confuse the HPA controller.
- **Custom metrics (recommended)** -- For latency-sensitive workloads, scale on
  `http_server_requests_seconds{quantile="0.99"}` instead of CPU utilization.

---

## Panama FFM (JDK 22+)

The Foreign Function & Memory (FFM) API, finalized in JDK 22 and stable in JDK 25,
provides a safe, pure-Java way to call native libraries and manage off-heap memory.
It replaces JNI.

### Required JVM flags

```bash
# Panama FFM requires explicit native access permission
--enable-native-access=ALL-UNNAMED
```

Without this flag, the JVM will throw an `IllegalCallerException` when the application
attempts to use the FFM API.

### Containerfile for Panama

```containerfile
FROM docker.io/library/eclipse-temurin:25
COPY target/*.jar app.jar
ENTRYPOINT ["java", \
  "--enable-native-access=ALL-UNNAMED", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

### API overview

```java
import java.lang.foreign.*;
import java.lang.invoke.MethodHandle;

// Allocate off-heap memory
try (Arena arena = Arena.ofConfined()) {
    MemorySegment segment = arena.allocate(ValueLayout.JAVA_INT, 100);
    segment.setAtIndex(ValueLayout.JAVA_INT, 0, 42);
    int value = segment.getAtIndex(ValueLayout.JAVA_INT, 0); // 42
}

// Call a native function
Linker linker = Linker.nativeLinker();
SymbolLookup lookup = linker.defaultLookup();
MethodHandle strlen = linker.downcallHandle(
    lookup.findOrThrow("strlen"),
    FunctionDescriptor.of(ValueLayout.JAVA_LONG, ValueLayout.ADDRESS)
);
try (Arena arena = Arena.ofConfined()) {
    MemorySegment str = arena.allocateFrom("Hello");
    long len = (long) strlen.invoke(str); // 5
}
```

### Spring Boot integration

Wire native components via `@Configuration` and `@Bean`:

```java
@Configuration
public class NativeConfig {

    @Bean
    public NativeProcessor nativeProcessor() {
        // Initialize native library via Panama FFM
        System.loadLibrary("mylib");
        return new PanamaBackedProcessor();
    }
}
```

### When to use Panama FFM

- Replacing legacy JNI calls (Panama is safer -- scoped memory prevents use-after-free).
- Calling BLAS/LAPACK libraries for matrix operations.
- Interfacing with OS-level APIs (e.g., io_uring on Linux).
- Wrapping C/C++ libraries that have no Java equivalent.

---

## LangChain4j ONNX Embeddings

Demo 09 shows how to run AI inference inside a Spring Boot application using
LangChain4j with the ONNX Runtime, eliminating the need for an external inference server.

### Dependencies

```xml
<!-- pom.xml -->
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-embeddings-all-minilm-l6-v2</artifactId>
</dependency>
<dependency>
    <groupId>dev.langchain4j</groupId>
    <artifactId>langchain4j-onnx</artifactId>
</dependency>
```

### Configuration

```java
@Configuration
public class EmbeddingConfig {

    @Bean
    public EmbeddingModel embeddingModel() {
        return new AllMiniLmL6V2EmbeddingModel();
    }
}
```

### Usage

```java
@Service
public class EmbeddingService {

    private final EmbeddingModel embeddingModel;

    public EmbeddingService(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    public float[] embed(String text) {
        Embedding embedding = embeddingModel.embed(text).content();
        return embedding.vector();
    }

    public double similarity(String text1, String text2) {
        Embedding e1 = embeddingModel.embed(text1).content();
        Embedding e2 = embeddingModel.embed(text2).content();
        return CosineSimilarity.between(e1, e2);
    }
}
```

### Performance characteristics

| Attribute | Value |
|---|---|
| Model | all-MiniLM-L6-v2 (22M parameters) |
| Embedding dimension | 384 |
| Inference time (CPU) | 5-15 ms per sentence |
| Memory overhead | ~100 MB (model loaded in memory) |
| JDK requirement | JDK 21+ |

### Why ONNX in-process?

- **No GPU required** -- ONNX Runtime runs on CPU with optimized math kernels.
- **No external service** -- No network hop to an inference server.
- **Predictable latency** -- No queue or network jitter.
- **Simple deployment** -- Single container, no sidecar.

---

## Spring Boot DevTools

Development-time tools for faster iteration:

### Setup

```xml
<!-- pom.xml -- marked as optional so it is excluded from production builds -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <optional>true</optional>
</dependency>
```

### Key features

| Feature | Description |
|---|---|
| Automatic restart | Restarts the application when classpath files change |
| LiveReload | Triggers browser refresh on resource changes |
| Property defaults | Disables caching for templates during development |
| H2 console auto-config | Enables `/h2-console` when H2 is on the classpath |

### Configuration

```yaml
# application-dev.yml
spring:
  devtools:
    restart:
      enabled: true
      poll-interval: 2s
      quiet-period: 1s
    livereload:
      enabled: true
```

### Tips

- **DevTools is automatically disabled in production** when running from a packaged JAR
  (it is excluded from the fat JAR by marking it `<optional>true</optional>`).
- **Use with `./mvnw spring-boot:run`** for the fastest development loop.
- **Maven wrapper permissions** -- On Fedora/macOS, you may need `chmod +x ./mvnw` after
  cloning the repo.

---

## Common Pitfalls

### 1. Unqualified image names in Podman

```bash
# WRONG -- Podman does not default to docker.io
FROM openjdk:21

# RIGHT -- Fully qualified
FROM docker.io/library/eclipse-temurin:21-jre
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
```

### 2. SELinux bind mount permissions

```bash
# WRONG -- Permission denied on Fedora/RHEL with SELinux enforcing
podman run -v ./data:/app/data myimage

# RIGHT -- Use :Z suffix for automatic SELinux relabeling
podman run -v ./data:/app/data:Z myimage
```

### 3. Named volume permissions (UBI9)

UBI9 OpenJDK images run as UID 185 (the `jboss` user). Named volumes created by Podman
are owned by root. Either set ownership or run with the correct user:

```bash
podman run -v app-data:/app/data:Z --user 185 myimage
```

### 4. Fat JAR classpath ordering for AppCDS

The AppCDS archive records the exact classpath. The training run and production run must
use the **exact same JAR file**. Rebuilding the JAR (even with identical source) can change
the internal classpath ordering, invalidating the archive.

### 5. Leyden JVM fingerprint mismatch

The AOT cache includes a JVM fingerprint. If you update the JDK (even a patch release),
the cache is silently ignored. Always rebuild the AOT cache as part of your CI/CD pipeline
when the base image changes.

### 6. Missing `--enable-native-access` for Panama

Without `--enable-native-access=ALL-UNNAMED`, the JVM throws `IllegalCallerException`
when Panama FFM API calls are made. This flag must be on the JVM command line -- it cannot
be set via `JAVA_OPTS` in all configurations.

### 7. Actuator endpoint not exposed

Spring Boot Actuator endpoints are not exposed by default (except `/health` and `/info`).
You must explicitly expose the Prometheus endpoint:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,info
```

### 8. Maven wrapper permissions

After cloning the repository, the Maven wrapper script may not be executable:

```bash
chmod +x ./mvnw
# Then run:
./mvnw package -DskipTests
```

### 9. MaxRAMPercentage too high

Setting `MaxRAMPercentage=90.0` leaves insufficient room for off-heap memory (Metaspace,
thread stacks, JIT cache, direct buffers). The container will be OOMKilled under load.
Use `MaxRAMPercentage=75.0`.

### 10. podman-compose not installed

`podman-compose` is not included with Podman. Install it separately:

```bash
pip install podman-compose --user
```
