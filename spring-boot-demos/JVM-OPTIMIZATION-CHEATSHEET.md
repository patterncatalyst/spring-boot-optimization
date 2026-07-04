# JVM Optimization Cheat Sheet

Quick-reference card for JVM tuning on OpenShift and Kubernetes.
All flags verified on Red Hat UBI9 with Podman. Spring Boot 4.0.5 / Java 21 / JDK 25.

---

## Container Heap Sizing

The most impactful JVM configuration for containers. Without these flags, the JVM may see
the host's total memory instead of the container's memory limit.

```bash
# Always use these three flags in containers
-XX:+UseContainerSupport        # Enabled by default since JDK 10
-XX:MaxRAMPercentage=75.0       # Use 75% of container memory for heap
-XX:InitialRAMPercentage=50.0   # Start at 50% to reduce resize pauses
```

### Why 75% and not higher?

| MaxRAMPercentage | Heap (in 512 MB container) | Room for off-heap | Risk |
|---|---|---|---|
| 50.0 | 256 MB | 256 MB | Under-utilizing memory |
| **75.0** | **384 MB** | **128 MB** | **Recommended balance** |
| 80.0 | 410 MB | 102 MB | Tight for Metaspace + thread stacks |
| 90.0 | 460 MB | 52 MB | OOMKilled risk from off-heap growth |

Off-heap memory includes: Metaspace (~64 MB typical for Spring Boot), thread stacks
(1 MB x thread count), direct byte buffers, JIT code cache, and GC data structures.

### Quick formula

```
Container memory limit = Heap (75%) + Metaspace + (thread_count x 1MB) + GC overhead + buffer
                       = MaxRAMPercentage + ~100-150 MB headroom
```

### Verifying heap size inside a container

```bash
podman exec <container> java -XX:+PrintFlagsFinal -version 2>&1 | grep MaxHeapSize
# Or at runtime:
podman exec <container> jcmd 1 VM.flags | grep MaxHeapSize
```

---

## GC Quick-Select

| Workload type | Recommended GC | Flag | Why |
|---|---|---|---|
| General purpose / batch | G1GC | (default, no flag needed) | Best throughput, simple tuning |
| Latency-sensitive API (p99 < 100 ms) | Shenandoah | `-XX:+UseShenandoahGC` | Concurrent compaction, 1-20 ms pauses |
| Ultra-low-latency (p99 < 10 ms) | ZGC | `-XX:+UseZGC` | Sub-millisecond pauses |
| Microservice, small heap (< 512 MB) | G1GC | (default) | Load barrier overhead not justified |
| Large heap (> 32 GB) | ZGC | `-XX:+UseZGC` | Constant pause time regardless of heap size |
| Red Hat / OpenShift, needs JDK 8/11 | Shenandoah | `-XX:+UseShenandoahGC` | Backported to Red Hat JDK 8u+ |

### Decision flowchart

```
Is p99 SLA < 10ms?
  YES -> Use ZGC (-XX:+UseZGC)
  NO  -> Is p99 SLA < 100ms AND heap > 4GB?
           YES -> On Red Hat OpenJDK? 
                    YES -> Use Shenandoah (-XX:+UseShenandoahGC)
                    NO  -> Use ZGC (-XX:+UseZGC)
           NO  -> Use G1GC (default)
```

---

## GC Defaults by Image

G1GC is the default garbage collector on **all** JDK distributions. No JDK ships with
a non-G1GC default.

| Image | JDK | Default GC | Shenandoah? | ZGC? |
|---|---|---|---|---|
| `ubi9/openjdk-21-runtime` | Red Hat OpenJDK 21 | G1GC | Available | Available |
| `ubi9/openjdk-25-runtime` | Red Hat OpenJDK 25 | G1GC | Available | Available |
| `eclipse-temurin:21-jre` | Eclipse Temurin 21 | G1GC | Not included | Available |
| `eclipse-temurin:25-jre` | Eclipse Temurin 25 | G1GC | Not included | Available |
| `amazoncorretto:21` | Amazon Corretto 21 | G1GC | Not included | Available |

> **Note:** To use Shenandoah, you must use a Red Hat OpenJDK build (UBI9 images, RHEL
> RPMs, or Red Hat's JDK tarballs). Other vendors do not ship Shenandoah.

---

## Thread Count Tuning

The JVM auto-detects CPU count from the container's CPU limit, but thread pool sizes
need manual tuning for containers.

```bash
# Parallel GC threads (for STW phases) -- set to CPU request
-XX:ParallelGCThreads=2

# Concurrent GC threads (for concurrent phases) -- set to ~25% of ParallelGCThreads
-XX:ConcGCThreads=1

# Compiler threads -- reduce on small containers
-XX:CICompilerCount=2
```

### Spring Boot thread tuning

```yaml
# application.yml
server:
  tomcat:
    threads:
      max: 50       # Default 200 is too high for containers
      min-spare: 5  # Default 10
    accept-count: 20
```

### Rule of thumb

| Container CPU | ParallelGCThreads | ConcGCThreads | Tomcat max-threads |
|---|---|---|---|
| 0.5 | 1 | 1 | 20 |
| 1.0 | 1 | 1 | 30 |
| 2.0 | 2 | 1 | 50 |
| 4.0 | 4 | 2 | 100 |

---

## Startup Optimization

From slowest to fastest, with implementation complexity:

| Technique | Startup improvement | Complexity | JDK requirement |
|---|---|---|---|
| Baseline (no optimization) | 0% | None | Any |
| `-XX:TieredStopAtLevel=1` | 15-25% | Low | Any |
| AppCDS | 35-55% | Medium | JDK 13+ |
| Project Leyden (AOT Cache) | 40-60% | Medium | JDK 25 |
| CRaC (Checkpoint/Restore) | 90-95% | High | JDK 17+ (Azul) |
| GraalVM Native Image | 95-99% | Very High | GraalVM |

### AppCDS quick setup (3-stage Containerfile)

```containerfile
# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21 AS builder
COPY . /app
WORKDIR /app
RUN ./mvnw package -DskipTests

# Stage 2: Training run
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime AS trainer
COPY --from=builder /app/target/*.jar app.jar
RUN java -XX:ArchiveClassesAtExit=app-cds.jsa \
    -Dspring.context.exit=onRefresh \
    -jar app.jar

# Stage 3: Production
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY --from=trainer /app.jar app.jar
COPY --from=trainer /app-cds.jsa app-cds.jsa
ENTRYPOINT ["java", "-XX:SharedArchiveFile=app-cds.jsa", \
  "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
```

### Project Leyden quick setup

```containerfile
FROM eclipse-temurin:25 AS trainer
COPY target/*.jar app.jar
RUN java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf \
    -Dspring.context.exit=onRefresh -jar app.jar
RUN java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf \
    -XX:AOTCache=app.aot -jar app.jar

FROM eclipse-temurin:25
COPY --from=trainer /app.jar app.jar
COPY --from=trainer /app.aot app.aot
ENTRYPOINT ["java", "-XX:AOTCache=app.aot", "-jar", "app.jar"]
```

---

## Right-Sizing Quick Reference

Match container resources to workload type:

| Workload | CPU request | CPU limit | Memory request | Memory limit |
|---|---|---|---|---|
| REST API (light) | 250m | 1000m | 384Mi | 512Mi |
| REST API (heavy) | 500m | 2000m | 512Mi | 1Gi |
| gRPC service | 500m | 2000m | 512Mi | 1Gi |
| Batch / scheduled | 1000m | 4000m | 1Gi | 2Gi |
| ML inference (ONNX) | 1000m | 4000m | 1Gi | 2Gi |

### The right-sizing script (Demo 07)

```bash
cd spring-boot-demos/demo-07-rightsizing
python3 rightsizing.py --pod my-app --namespace default
```

The script queries Prometheus for actual CPU/memory usage and recommends resource
requests and limits based on p95 actual consumption plus a safety margin.

---

## HPA Configuration

Kubernetes Horizontal Pod Autoscaler settings that work well with JVM workloads:

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
          averageUtilization: 70    # Not 80 -- leave headroom for GC spikes
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 minutes -- JVM needs time to warm up
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120          # Scale down one pod at a time
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

### HPA tips for JVM workloads

- **CPU target 70%, not 80%** -- GC activity creates CPU spikes. A 70% target prevents
  thrashing between scale-up and scale-down.
- **Slow scale-down** -- JVM applications take 5-30 seconds to warm up (JIT compilation).
  Fast scale-down followed by scale-up wastes the warmup investment.
- **ZGC for HPA stability** -- ZGC's flat CPU profile produces the most predictable
  autoscaling behavior. Shenandoah is second-best. G1GC's periodic STW pauses create
  CPU spikes that can trigger unnecessary scale-up events.

---

## Prometheus Metrics

### Spring Boot Actuator setup

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
  metrics:
    tags:
      application: ${spring.application.name}
```

### Key JVM metrics to monitor

| Metric | PromQL | Alert threshold |
|---|---|---|
| GC pause time | `rate(jvm_gc_pause_seconds_sum[5m])` | > 0.05 (5% time in GC) |
| Heap usage | `jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"}` | > 0.85 |
| Thread count | `jvm_threads_live_threads` | > 200 |
| CPU usage | `process_cpu_usage` | > 0.8 |
| Startup time | `application_started_time_seconds` | > 30 |

### Grafana dashboard variables

```
Datasource: Prometheus
Job filter: spring-boot-app
Instance: $__all
GC type: jvm_gc_pause_seconds{gc=~"$gc_type"}
```

---

## Low-Latency Ladder

A step-by-step approach to reducing tail latency, ordered by effort:

| Step | Action | Expected impact | Effort |
|---|---|---|---|
| 1 | Set `MaxRAMPercentage=75.0` | Prevents OOMKilled, stable GC | 5 min |
| 2 | Match `ParallelGCThreads` to CPU request | Prevents thread contention | 5 min |
| 3 | Reduce Tomcat `max-threads` to 50 | Less context switching | 5 min |
| 4 | Switch to Shenandoah (`-XX:+UseShenandoahGC`) | p99 drops 50-80% | 5 min |
| 5 | Add AppCDS | Startup 35-55% faster, warmer JIT | 30 min |
| 6 | Switch to ZGC (`-XX:+UseZGC`) | p99 drops another 30-50% | 5 min |
| 7 | Profile with async-profiler | Find application-level bottlenecks | 2-4 hrs |
| 8 | Switch to gRPC (if applicable) | 2-5x throughput vs REST | 2-8 hrs |

---

## Panama FFM

Panama Foreign Function & Memory (FFM) API -- finalized in JDK 22, stable in JDK 25.
Replaces JNI for calling native libraries from Java.

### Quick example (Demo 08)

```java
// Load a native library and call a function
try (Arena arena = Arena.ofConfined()) {
    MemorySegment input = arena.allocateFrom("Hello from Java");
    MethodHandle nativeFunc = Linker.nativeLinker().downcallHandle(
        SymbolLookup.loaderLookup().findOrThrow("native_process"),
        FunctionDescriptor.of(ValueLayout.ADDRESS, ValueLayout.ADDRESS)
    );
    MemorySegment result = (MemorySegment) nativeFunc.invoke(input);
}
```

### Container flags for Panama

```bash
# Required -- JVM will refuse native access without this flag
--enable-native-access=ALL-UNNAMED

# Recommended: pin to JDK 25 for stable FFM API
FROM eclipse-temurin:25
```

### When to use Panama FFM

- Calling BLAS/LAPACK for matrix operations (ML preprocessing).
- Wrapping a C library that has no Java equivalent.
- Replacing JNI calls in legacy code (FFM is safer -- no JNI global references to leak).

---

## gRPC vs REST

Comparison using Spring Boot 4.0.5 with `spring-grpc-spring-boot-starter`:

| Attribute | REST (JSON/HTTP) | gRPC (Protobuf/HTTP2) |
|---|---|---|
| Serialization | JSON (text) | Protobuf (binary) |
| Transport | HTTP/1.1 | HTTP/2 (multiplexed) |
| Latency (p50) | 2.1 ms | 0.8 ms |
| Latency (p99) | 12 ms | 4 ms |
| Throughput | 4,800 req/s | 12,000 req/s |
| Payload size | ~1.5 KB | ~0.4 KB |
| Streaming | No (SSE/WebSocket separate) | Bidirectional, built-in |
| Browser support | Native | Requires grpc-web proxy |

### Spring Boot 4.0 gRPC setup

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

### Load testing gRPC

```bash
# Single request
grpcurl -plaintext localhost:9090 list
grpcurl -plaintext localhost:9090 com.example.MyService/MyMethod

# Load test with ghz
ghz --insecure --call com.example.MyService/MyMethod \
    -n 10000 -c 50 localhost:9090
```

---

## Podman Gotchas

Common issues when running Spring Boot containers with Podman (not Docker):

### 1. Unqualified image names

```bash
# WRONG -- Podman does not assume docker.io like Docker does
podman pull openjdk:21

# RIGHT -- Use fully qualified image names
podman pull registry.access.redhat.com/ubi9/openjdk-21-runtime
podman pull docker.io/library/eclipse-temurin:21-jre
```

### 2. SELinux bind mounts (Fedora/RHEL)

```bash
# WRONG -- Permission denied on Fedora with SELinux
podman run -v ./data:/app/data myimage

# RIGHT -- Add :Z suffix for SELinux relabeling
podman run -v ./data:/app/data:Z myimage
```

### 3. Rootless networking

```bash
# Rootless Podman uses slirp4netns; ports < 1024 need special handling
podman run -p 8080:8080 myimage     # Works (> 1024)
podman run -p 80:8080 myimage       # Fails rootless without net.ipv4.ip_unprivileged_port_start=80
```

### 4. podman-compose vs docker-compose

```bash
# Install podman-compose
pip install podman-compose --user

# Use podman-compose (not docker-compose)
podman-compose up -d
podman-compose down
```

### 5. Named volume permissions

```bash
# Spring Boot runs as non-root (UID 185 in UBI9 images)
# Named volumes may need permission adjustment
podman volume create app-data
podman run -v app-data:/app/data:Z --user 185 myimage
```

---

## JVM Flags Cookbook

Copy-paste recipes for common scenarios:

### REST API (Spring Boot, moderate latency requirements)

```bash
java \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseShenandoahGC \
  -XX:ParallelGCThreads=2 \
  -XX:ConcGCThreads=1 \
  -XX:CICompilerCount=2 \
  -Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \
  -jar app.jar
```

### Low-latency API (strict p99 SLA)

```bash
java \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:+UseZGC \
  -XX:ParallelGCThreads=2 \
  -XX:ConcGCThreads=1 \
  -XX:CICompilerCount=2 \
  -Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \
  -jar app.jar
```

### Batch processing (throughput-first)

```bash
java \
  -XX:+UseContainerSupport \
  -XX:MaxRAMPercentage=75.0 \
  -XX:ParallelGCThreads=4 \
  -XX:CICompilerCount=4 \
  -Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m \
  -jar app.jar
```

### Fast startup (AppCDS)

```bash
# Training run
java -XX:ArchiveClassesAtExit=app-cds.jsa \
  -Dspring.context.exit=onRefresh -jar app.jar

# Production run
java -XX:SharedArchiveFile=app-cds.jsa \
  -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 \
  -jar app.jar
```

---

## Key Flags Reference

| Flag | Default | Description |
|---|---|---|
| `-XX:+UseContainerSupport` | `true` (JDK 10+) | JVM reads cgroup limits instead of host memory/CPU |
| `-XX:MaxRAMPercentage=75.0` | `25.0` | Percentage of container memory used for max heap |
| `-XX:InitialRAMPercentage=50.0` | `1.5625` | Percentage of container memory used for initial heap |
| `-XX:+UseG1GC` | `true` | Use G1 Garbage Collector (default on all JDKs) |
| `-XX:+UseShenandoahGC` | `false` | Use Shenandoah GC (Red Hat builds only) |
| `-XX:+UseZGC` | `false` | Use Z Garbage Collector |
| `-XX:ParallelGCThreads=N` | auto | STW GC thread count; set to CPU request |
| `-XX:ConcGCThreads=N` | auto | Concurrent GC thread count; ~25% of ParallelGCThreads |
| `-XX:CICompilerCount=N` | auto | JIT compiler thread count; 2 for small containers |
| `-XX:MaxGCPauseMillis=200` | `200` | G1GC pause time target in ms |
| `-XX:TieredStopAtLevel=1` | N/A | Stop JIT at C1 (faster startup, lower peak throughput) |
| `-XX:ArchiveClassesAtExit=FILE` | N/A | AppCDS: dump class archive at exit |
| `-XX:SharedArchiveFile=FILE` | N/A | AppCDS: load class archive at startup |
| `-XX:AOTMode=record` | N/A | Leyden: record AOT configuration |
| `-XX:AOTMode=create` | N/A | Leyden: create AOT cache from configuration |
| `-XX:AOTCache=FILE` | N/A | Leyden: load AOT cache at startup |
| `--enable-native-access=ALL-UNNAMED` | N/A | Panama FFM: allow native access |

---

## AppCDS vs Leyden vs Native

| Attribute | AppCDS | Project Leyden | GraalVM Native Image |
|---|---|---|---|
| **Startup improvement** | 35-55% | 40-60% | 95-99% |
| **JDK requirement** | JDK 13+ | JDK 25 | GraalVM |
| **Training step needed** | Yes (1 run) | Yes (2 runs: record + create) | Yes (native-image build) |
| **Runtime optimization** | Full JIT | Full JIT + AOT-compiled hot paths | AOT only (no JIT) |
| **Peak throughput** | Same as baseline | Same or slightly better | 10-30% lower |
| **Memory footprint** | Same as baseline | Same as baseline | 50-80% lower |
| **Reflection support** | Full | Full | Requires configuration |
| **Spring Boot support** | Full | Full (4.0.5+) | Via Spring Native (experimental) |
| **Complexity** | Low (3-stage Containerfile) | Medium (record + create steps) | High (reflection config, build time) |
| **Portability** | Archive tied to JDK version | Cache tied to JDK version | Platform-specific binary |

### Recommendation

- **Start with AppCDS** -- easiest to adopt, compatible with all JDK vendors.
- **Upgrade to Leyden** when you are on JDK 25 and want the extra 5-15% improvement.
- **Use Native Image** only when sub-second startup is a hard requirement and you can
  accept the throughput tradeoff and build complexity.

---

## Health Check Endpoints

### Spring Boot Actuator health endpoints

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true   # Enables /actuator/health/liveness and /actuator/health/readiness
```

### Kubernetes probe configuration

```yaml
# deployment.yml
spec:
  containers:
    - name: app
      livenessProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        initialDelaySeconds: 15   # JVM needs time to start
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /actuator/health/readiness
          port: 8080
        initialDelaySeconds: 10
        periodSeconds: 5
        failureThreshold: 3
      startupProbe:
        httpGet:
          path: /actuator/health/liveness
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        failureThreshold: 30      # 5s * 30 = 150s max startup time
```

### Tips

- **Always use a startup probe** for JVM applications. Without it, the liveness probe
  may kill the pod during slow startup (especially without AppCDS).
- **Separate liveness and readiness** -- readiness should include downstream dependency
  checks (database, cache); liveness should not (a slow database should not restart your pod).
- **Increase `initialDelaySeconds` for AppCDS training containers** -- the training run
  is slower because it is recording class usage.
