# Demo 05 -- REST vs gRPC: Same Service, Two Protocols

**Spring Boot 4.0.5 / Java 21**

The same JVM metrics exposed over REST (JSON/HTTP 1.1) and gRPC (Protobuf/HTTP 2)
simultaneously from a single Spring Boot application. Demonstrates throughput,
latency, and the streaming capability that REST cannot match.

---

## Run the Demo

```bash
chmod +x demo.sh
./demo.sh
```

**Tools required for the full load-test comparison:**
```bash
brew install hey grpcurl ghz      # macOS
# Linux: download binaries from github.com/rakyll/hey, fullstory/grpcurl, bojand/ghz
```

If `hey`/`ghz` are not installed, the demo runs in observe mode -- still shows
both protocols responding and the streaming demo.

---

## What's Running

```
┌─────────────────────────────────────────────┐
│        Spring Boot 4.0.5 container          │
│                                             │
│  MetricsController   ->  :8080  (REST)      │
│  MetricsGrpcService  ->  :9000  (gRPC)      │
│                                             │
│  Same data. Same JVM. Same GC.              │
└─────────────────────────────────────────────┘
```

### REST endpoint
```bash
curl http://localhost:8080/metrics | jq
# { "heapUsedMb": 45, "heapMaxMb": 384, "gcName": "G1 Young Generation", ... }
# Payload: ~220 bytes JSON
```

### gRPC unary (equivalent)
```bash
grpcurl -plaintext -d '{"host":"localhost"}' \
    localhost:9000 demo.grpc.MetricsService/GetJvmMetrics
# Same data as Protobuf binary
# Wire size: ~40 bytes
```

### gRPC streaming (no REST equivalent)
```bash
grpcurl -plaintext -d '{"host":"localhost"}' \
    localhost:9000 demo.grpc.MetricsService/StreamMetrics
# Streams a new JVM snapshot every second until Ctrl+C
```

---

## Spring Boot 4.0 gRPC Setup

### How it works

Spring gRPC (`org.springframework.grpc`) is the official gRPC integration for
Spring Boot 4.0+. Adding `spring-grpc-spring-boot-starter` auto-configures a
Netty-based gRPC server that runs alongside the Tomcat REST server:

- **Tomcat** serves REST on `server.port` (8080)
- **Netty** serves gRPC on `spring.grpc.server.port` (9000)
- Both run in the same JVM, sharing the same heap and GC

### Proto compilation

The `protobuf-maven-plugin` (Ascopes) handles all code generation at `mvn compile`:

1. Reads `src/main/proto/metrics.proto`
2. Runs `protoc` to generate Protobuf message classes (`MetricsRequest`, `MetricsResponse`)
3. Runs `protoc-gen-grpc-java` to generate gRPC service stubs (`MetricsServiceGrpc`)
4. Output lands in `target/generated-sources/protobuf/` and is automatically on the classpath

No manual `protoc` installation needed -- the plugin downloads platform-specific
binaries from Maven Central automatically (no `os-maven-plugin` required).

### Service registration

Any Spring bean that implements `BindableService` (which the generated
`MetricsServiceGrpc.MetricsServiceImplBase` does) is automatically discovered
and bound to the gRPC server. Just annotate with `@Service`:

```java
@Service
public class MetricsGrpcService extends MetricsServiceGrpc.MetricsServiceImplBase {
    @Override
    public void getJvmMetrics(MetricsRequest request,
                              StreamObserver<MetricsResponse> responseObserver) {
        responseObserver.onNext(buildMetrics());
        responseObserver.onCompleted();
    }
}
```

### Key difference from Quarkus

| Aspect | Spring Boot 4.0 | Quarkus 3.x |
|--------|-----------------|-------------|
| gRPC library | Spring gRPC (standard gRPC-Java) | quarkus-grpc (Mutiny reactive) |
| Service base class | `MetricsServiceGrpc.MetricsServiceImplBase` | `MutinyMetricsServiceGrpc.MetricsServiceImplBase` |
| Unary return type | `void` + `StreamObserver` callback | `Uni<Response>` |
| Streaming return type | `void` + `StreamObserver` callback | `Multi<Response>` |
| Registration | `@Service` (any `BindableService` bean) | `@GrpcService` |
| Proto compilation | protobuf-maven-plugin (Ascopes) | quarkus-maven-plugin `generate-code` |

---

## Comparison Methodology

The demo runs four comparisons to show when each protocol wins:

### 1. Protocol response (Step 3)
Both endpoints return the same JVM metrics data. REST returns ~220 bytes of JSON;
gRPC returns ~40 bytes of Protobuf. Shows they are functionally equivalent.

### 2. Streaming throughput (Step 4)
Receives 1000 metric snapshots as fast as possible:
- **gRPC**: 1 connection, server pushes all 1000 messages over HTTP/2
- **REST**: 1000 separate HTTP requests, each with full TCP + HTTP framing overhead

gRPC wins 10-30x even on localhost because the serialization overhead alone
(JSON vs Protobuf, per-request HTTP framing vs streaming frames) is significant.

### 3. Live stream (Step 5)
Demonstrates server-push -- one gRPC connection stays open while the server
pushes a new JVM snapshot every second. REST has no equivalent without
SSE or WebSocket boilerplate.

### 4. Unary load test (Step 6)
- **Low concurrency (c=50)**: REST wins on localhost -- no real network means
  gRPC's connection efficiency advantage disappears
- **High concurrency (c=500)**: HTTP/2 multiplexing helps gRPC -- REST opens
  500 TCP connections while gRPC multiplexes over a few HTTP/2 connections

---

## When to Choose gRPC

| Situation | Choose |
|-----------|--------|
| Public API / browser clients | REST |
| Internal pod-to-pod calls | gRPC |
| Debugging with curl | REST |
| High frequency (>100 calls/sec) | gRPC |
| Streaming data continuously | gRPC |
| Partner APIs / external consumers | REST |
| Bandwidth-constrained environment | gRPC |

---

## Files

| File | Purpose |
|------|---------|
| `app/src/main/proto/metrics.proto` | Service contract -- protoc generates stubs from this |
| `app/src/main/java/demo/grpc/MetricsGrpcService.java` | gRPC implementation (`@Service`) |
| `app/src/main/java/demo/grpc/MetricsController.java` | REST implementation (`@RestController`) |
| `app/src/main/java/demo/grpc/GrpcDemoApp.java` | `@SpringBootApplication` entry point |
| `app/src/main/resources/application.properties` | gRPC port 9000, REST port 8080 |
| `app/Containerfile` | UBI multi-stage build, exposes both ports |
| `demo.sh` | Full demo with load testing and streaming |

---

## Reference

- Spring gRPC: https://docs.spring.io/spring-grpc/reference/
- Protocol Buffers: https://protobuf.dev
- protobuf-maven-plugin (Ascopes): https://ascopes.github.io/protobuf-maven-plugin/
- `ghz` gRPC load tester: https://ghz.sh
- `grpcurl` CLI: https://github.com/fullstory/grpcurl
