# Demo 08 — Project Panama: C++20 → Spring Boot via FFM

**Spring Boot 4.0.5 / JDK 25 LTS / C++20**

Demonstrates the **Foreign Function & Memory API** (JEP 454, finalized JDK 22,
stable JDK 25) calling a native C++20 shared library from pure Java — no JNI
wrapper code, no C header translations, no per-platform compilation pipeline.

---

## Run the Demo

```bash
chmod +x demo.sh
./demo.sh
```

**Prerequisites:** `podman` only. The C++ compiler (`g++`/`cmake`) and JDK 25
run inside the container — nothing needs to be installed locally.

---

## What's Running

```
┌──────────────────────────────────────────────────────┐
│  Spring Boot REST app  →  http://localhost:8080       │
│  JDK 25 LTS + Foreign Function & Memory API          │
│  Calls libjvmstats.so via Panama (no JNI)            │
└──────────────────────────────────────────────────────┘
```

### Three-stage Containerfile

```
Stage 1: ubi9 base + gcc-c++ + cmake
         → gcc-c++ is in the freely accessible UBI appstream repo
         → no Red Hat subscription required
         → compiles jvmstats.cpp → libjvmstats.so

Stage 2: maven:3.9-eclipse-temurin-25
         → builds Spring Boot fat jar

Stage 3: eclipse-temurin:25-jre
         → copies .so + Spring Boot jar
         → ldconfig registers the native library
         → JVM loads it via SymbolLookup at startup
```

Stage 1 uses Red Hat UBI for the C++ compiler (compatible with OpenShift image
scanning). Stages 2 and 3 use Eclipse Temurin for the JDK/JRE — consistent
with the other Spring Boot demos.

---

## Project Structure

```
demo-08-panama/
├── demo.sh                          ← Run this
├── Containerfile                    ← Three-stage build
│
├── native/
│   ├── CMakeLists.txt               ← cmake build config
│   └── src/
│       ├── jvmstats.h               ← C ABI header (extern "C")
│       └── jvmstats.cpp             ← C++20 implementation
│
└── app/
    ├── pom.xml
    └── src/main/java/demo/panama/
        ├── PanamaDemoApp.java       ← @SpringBootApplication
        └── PanamaController.java    ← FFM calls, Arena usage
```

---

## The Native Library — jvmstats

A C++20 shared library exposing three JVM workload analysis functions.
Uses `std::span`, `std::ranges::sort`, structured bindings, and
`std::transform_reduce` — modern C++ features that would be painful in Java
without native access.

The library exports a **C ABI** (`extern "C"`) so Panama's `Linker` can
locate and bind the functions by symbol name. C++ features live entirely
in the implementation; the header exposes a clean C interface.

### Exported functions

```c
// Analyse GC pause times, recommend a GC algorithm
// Returns: 0=G1GC, 1=Shenandoah, 2=ZGC
int jvmstats_recommend_gc(
    const double* pauses_ms,   // array of pause durations
    int32_t       count,       // number of elements
    double*       out_p50,     // output: median pause
    double*       out_p99,     // output: p99 pause
    double*       out_max);    // output: max pause

// Analyse CPU utilisation samples
// Returns: 1 if profile is GC-dominated (p95/mean > 3x), 0 otherwise
int jvmstats_cpu_profile(
    const double* samples,
    int32_t       count,
    double*       out_mean,
    double*       out_stddev,
    double*       out_p95);

// Recommend a right-sized memory request from RSS observations
// Returns: p99 RSS x 1.25, rounded to nearest 64MB, min 256MB
int32_t jvmstats_recommend_memory_mb(
    const double* rss_mb_samples,
    int32_t       count);
```

---

## How Panama FFM Works — The Java Side

### 1. Load the shared library

```java
SymbolLookup lib = SymbolLookup.libraryLookup(
    System.mapLibraryName("jvmstats"),   // "libjvmstats.so" on Linux
    Arena.global()
);
```

### 2. Bind a C function to a MethodHandle

```java
// Describe the C function signature
FunctionDescriptor desc = FunctionDescriptor.of(
    JAVA_INT,   // return type: int
    ADDRESS,    // const double* pauses_ms
    JAVA_INT,   // int32_t count
    ADDRESS,    // double* out_p50
    ADDRESS,    // double* out_p99
    ADDRESS     // double* out_max
);

MethodHandle recommendGc = Linker.nativeLinker()
    .downcallHandle(lib.find("jvmstats_recommend_gc").orElseThrow(), desc);
```

### 3. Call with Arena-managed native memory

```java
try (Arena arena = Arena.ofConfined()) {

    // Allocate a native double array — filled from Java double[]
    // JDK 22+ final API: allocateFrom() (not allocateArray())
    MemorySegment pauses = arena.allocateFrom(JAVA_DOUBLE, myPauseData);
    MemorySegment outP50 = arena.allocate(JAVA_DOUBLE);
    MemorySegment outP99 = arena.allocate(JAVA_DOUBLE);
    MemorySegment outMax = arena.allocate(JAVA_DOUBLE);

    // Call into C++ — no JNI, no wrapper code
    int gcCode = (int) recommendGc.invoke(
        pauses, myPauseData.length, outP50, outP99, outMax);

    // Read output values back from native memory
    double p99 = outP99.get(JAVA_DOUBLE, 0);

} // ← all native memory freed here, deterministically
```

### Arena types — choosing the right lifetime

| Arena | Lifetime | Thread safety | Use when |
|-------|----------|---------------|----------|
| `Arena.ofConfined()` | Explicit close | Single thread only | Request-scoped allocations |
| `Arena.ofShared()` | Explicit close | Multi-thread safe | Shared across threads |
| `Arena.ofAuto()` | GC-managed | Multi-thread safe | No deterministic close needed |
| `Arena.global()` | Never freed | Multi-thread safe | Library handles, startup |

---

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /demo` | Full demo — runs all three C++ analyses on synthetic data |
| `POST /gc-recommend` | Analyse your own GC pause array (JSON body: `[10, 45, 180, ...]`) |
| `GET /info` | JVM version, vendor, Panama API status |
| `GET /actuator/health` | Health check (Spring Boot Actuator) |

### Example requests

```bash
# Full demo — all three native analyses in one Arena scope
curl -s http://localhost:8080/demo | python3 -m json.tool

# Analyse custom GC pause data
# G1GC-shaped data → expect G1GC recommendation
curl -s -X POST http://localhost:8080/gc-recommend \
  -H "Content-Type: application/json" \
  -d '[10,12,15,11,14,180,12,9,13,11,175,10,14,12,190]' \
  | python3 -m json.tool

# ZGC-shaped data → expect ZGC recommendation
curl -s -X POST http://localhost:8080/gc-recommend \
  -H "Content-Type: application/json" \
  -d '[0.1,0.2,0.15,0.3,0.12,0.18,0.25,0.09,0.14,0.3]' \
  | python3 -m json.tool

# JVM version info
curl -s http://localhost:8080/info | python3 -m json.tool
```

---

## FFM vs JNI — What We Didn't Have to Write

| Step | JNI (old way) | Panama FFM (this demo) |
|------|---------------|----------------------|
| Write native header | `jvmstats.h` | `jvmstats.h` |
| Write native implementation | `jvmstats.cpp` | `jvmstats.cpp` |
| Write JNI wrapper `.cpp` | Required (JNIEXPORT, JNICALL, array handling) | Not needed |
| Compile per platform | Required (x86, ARM, aarch64) | Not needed |
| Java `native` declarations | Required | Not needed |
| Memory management | Manual (DeleteLocalRef, free()) | Arena handles it |
| Crash recovery | Kills JVM — no stack trace | Safer — errors surface as Java exceptions |
| Generate bindings | Manual | `jextract` can auto-generate from header |

---

## Spring Boot vs Quarkus — Key Differences

| Aspect | Quarkus version | Spring Boot version |
|--------|-----------------|---------------------|
| Framework | Quarkus 3.33.1 | Spring Boot 4.0.5 |
| REST annotations | `@Path`, `@GET`, `@POST`, `@Consumes` (JAX-RS) | `@GetMapping`, `@PostMapping`, `@RequestBody` (Spring MVC) |
| Health endpoint | `/q/health/live` | `/actuator/health` |
| JSON serialization | `quarkus-rest-jackson` | Built into `spring-boot-starter-web` (Jackson auto-configured) |
| Build output | Quarkus fast-jar (multiple dirs) | Single fat jar (`app.jar`) |
| Runtime image | `ubi9/openjdk-25-runtime` | `eclipse-temurin:25-jre` |
| Panama FFM code | Identical | Identical |

The Panama FFM code (SymbolLookup, Linker, Arena, MethodHandle) is pure
`java.lang.foreign` API — it is identical between Quarkus and Spring Boot.
Only the REST layer and packaging differ.

---

## API Note — allocateFrom() vs allocateArray()

The FFM API changed between preview iterations and the JDK 22 GA release:

```java
// Preview API (removed) — causes compilation error on JDK 22+
MemorySegment seg = arena.allocateArray(JAVA_DOUBLE, myArray);

// Final API (JDK 22+, stable in JDK 25)
MemorySegment seg = arena.allocateFrom(JAVA_DOUBLE, myArray);
```

---

## jextract — Auto-generating Bindings (Not Used Here)

In this demo the `MethodHandle` bindings are written by hand to show the
underlying Panama API. In production, `jextract` generates them automatically
from the C header:

```bash
# Point jextract at the header — generates Java bindings
jextract --output src/generated \
  --target-package demo.panama.native \
  native/src/jvmstats.h

# Generated class JvmStats.java has:
# - A static MethodHandle for every exported C function
# - MemoryLayout descriptors for every struct
# - Constants for every #define

# Call the generated binding
int result = (int) JvmStats.jvmstats_recommend_gc(
    pauses, count, outP50, outP99, outMax);
```

jextract is distributed separately from the JDK: https://jdk.java.net/jextract/

---

## Reference

- JEP 454 — Foreign Function & Memory API (finalized): https://openjdk.org/jeps/454
- Project Panama: https://openjdk.org/projects/panama/
- jextract tool: https://jdk.java.net/jextract/
- Panama API Javadoc: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/lang/foreign/package-summary.html
- Spring Boot 4.0: https://spring.io/blog/2025/05/22/spring-boot-4-0-goes-ga
