# Shenandoah GC Guide

Red Hat's concurrent, low-latency garbage collector -- available on Red Hat OpenJDK builds
including `ubi9/openjdk-21-runtime` and `ubi9/openjdk-25-runtime` images.
Opt in with `-XX:+UseShenandoahGC`.

---

## What Is Shenandoah?

Shenandoah is a **low-pause-time garbage collector** developed by Red Hat and included in
upstream OpenJDK since JDK 12 (and backported to Red Hat builds of JDK 8 and 11).
It performs concurrent compaction -- meaning it can relocate live objects while the
application threads are still running -- keeping GC pauses typically between **1 ms and
20 ms** regardless of heap size.

### Key characteristics

| Property | Value |
|---|---|
| Pause target | 1-20 ms (sub-millisecond on small heaps) |
| Heap range | Works well from 256 MB to 100+ GB |
| Concurrency | Concurrent mark, concurrent compact, concurrent evacuation |
| Barrier type | Load-reference barrier (Brooks pointer / forwarding pointer) |
| Available since | JDK 12 upstream; JDK 8u+ in Red Hat builds |
| Default on any JDK? | **No** -- G1GC is the default on all JDK distributions |
| Opt-in flag | `-XX:+UseShenandoahGC` |

### When to choose Shenandoah

- You need predictable sub-20 ms pauses on medium-to-large heaps (4-100 GB).
- Your workload runs on Red Hat OpenJDK, OpenShift, or UBI9 container images.
- You must support JDK 8 or 11 (Shenandoah is backported in Red Hat builds; ZGC is not).
- You want a single GC that works well across a wide heap range without extensive tuning.

---

## GC Defaults by Container Image

**G1GC is the default garbage collector on all standard JDK distributions**, including
Red Hat's UBI9 OpenJDK images. Shenandoah is *available* (shipped in the JDK) on Red Hat
builds but requires an explicit opt-in flag.

| Base image | Default GC | Shenandoah available? | Opt-in |
|---|---|---|---|
| `registry.access.redhat.com/ubi9/openjdk-21-runtime` | G1GC | Yes | `-XX:+UseShenandoahGC` |
| `registry.access.redhat.com/ubi9/openjdk-25-runtime` | G1GC | Yes | `-XX:+UseShenandoahGC` |
| `eclipse-temurin:21-jre` | G1GC | No (not shipped) | N/A |
| `eclipse-temurin:25-jre` | G1GC | No (not shipped) | N/A |
| Red Hat build of OpenJDK (RPM) | G1GC | Yes | `-XX:+UseShenandoahGC` |
| Azul Zulu, Amazon Corretto | G1GC | No (not shipped) | N/A |

> **Common misconception:** Shenandoah is sometimes described as "the default on UBI9."
> This is incorrect. G1GC is the default on every JDK distribution. Red Hat's builds
> *include* Shenandoah, making it available for use, but you must explicitly enable it.

### Verifying the active GC

```bash
# Inside a running container
java -XX:+PrintFlagsFinal -version 2>&1 | grep -i "Use.*GC "

# Expected output with default settings:
#   bool UseG1GC = true
#   bool UseShenandoahGC = false

# After adding -XX:+UseShenandoahGC:
#   bool UseG1GC = false
#   bool UseShenandoahGC = true
```

---

## How Shenandoah Works

Shenandoah divides the heap into **regions** (similar to G1GC) but differs fundamentally
in how it handles object relocation. While G1GC evacuates objects during a stop-the-world
pause, Shenandoah performs evacuation **concurrently** with the application.

### GC phases

1. **Init Mark (STW)** -- Scans GC roots. Typically < 1 ms.
2. **Concurrent Mark** -- Traces the object graph concurrently with the application.
3. **Final Mark (STW)** -- Drains the SATB buffer, selects the collection set. Typically < 1 ms.
4. **Concurrent Cleanup** -- Reclaims regions that are entirely garbage.
5. **Concurrent Evacuation** -- Copies live objects out of collection-set regions *while the application runs*. This is the key innovation.
6. **Init Update Refs (STW)** -- Prepares for reference updating. Typically < 1 ms.
7. **Concurrent Update References** -- Walks the heap and updates forwarding pointers.
8. **Final Update Refs (STW)** -- Updates GC roots. Typically < 1 ms.
9. **Concurrent Cleanup** -- Reclaims evacuated regions.

The three STW phases (Init Mark, Final Mark, Init/Final Update Refs) are each typically
**under 1 ms**. Total pause time per cycle is usually **1-5 ms** on moderate heaps.

### The forwarding pointer

Every object in Shenandoah carries a **forwarding pointer** (also called a Brooks pointer)
in its header. When an object is relocated, the forwarding pointer at the old location is
updated to point to the new location. Load barriers in the generated code check this pointer
on every object reference load, ensuring the application always sees the correct (relocated)
copy.

---

## Shenandoah vs G1GC vs ZGC — Full Comparison

| Attribute | G1GC | Shenandoah | ZGC |
|---|---|---|---|
| **Pause target** | 200 ms (tunable via `-XX:MaxGCPauseMillis`) | 1-20 ms | < 1 ms (sub-millisecond) |
| **Concurrent compaction** | No (evacuates in STW) | Yes | Yes |
| **Barrier type** | Write barrier (remembered sets) | Load barrier (forwarding pointer) | Load barrier (colored pointers) |
| **Heap range** | 256 MB - 64 GB typical | 256 MB - 100+ GB | 256 MB - 16 TB |
| **CPU overhead** | Low (5-10%) | Moderate (10-15%) | Moderate (10-15%) |
| **Memory overhead** | ~10% for remembered sets | ~5% for forwarding pointers | ~3% for colored pointers + multi-mapping |
| **Default on any JDK?** | Yes -- all distributions | No | No |
| **Min JDK version** | JDK 7+ | JDK 12 (upstream), JDK 8+ (Red Hat) | JDK 15 (production), JDK 21 (generational) |
| **Availability** | All JDK vendors | Red Hat builds only | All JDK vendors (JDK 15+) |
| **Best for** | General purpose, batch | Low-latency on Red Hat | Ultra-low-latency, very large heaps |

### Throughput comparison (Spring Boot 4.0.5 workload)

Measured with the demo-06 latency comparison setup (`hey -n 50000 -c 50`):

| GC | p50 | p99 | p999 | Throughput (req/s) |
|---|---|---|---|---|
| G1GC | 2.1 ms | 45 ms | 210 ms | 4,800 |
| Shenandoah | 2.3 ms | 12 ms | 28 ms | 4,600 |
| ZGC | 2.4 ms | 8 ms | 15 ms | 4,500 |

Key takeaway: G1GC wins on raw throughput, Shenandoah dramatically reduces tail latency,
and ZGC provides the tightest latency distribution at a slight throughput cost.

---

## Shenandoah vs G1GC — When Each Wins

### Choose Shenandoah when

- **p99 SLA between 10 ms and 100 ms** -- Shenandoah's concurrent evacuation eliminates the multi-hundred-millisecond pauses G1GC can produce on large heaps.
- **Medium to large heaps (4 GB - 100 GB)** -- Shenandoah scales well without tuning. G1GC pauses grow with heap size because evacuation is stop-the-world.
- **Red Hat / OpenShift deployments** -- Shenandoah is available in Red Hat builds and tested against UBI9 container images.
- **Need JDK 8 or 11 support** -- Red Hat backports Shenandoah to JDK 8u and 11; ZGC requires JDK 15+.
- **Unpredictable allocation rates** -- Shenandoah's concurrent compaction handles bursty allocations more gracefully than G1GC's STW evacuation.

### Choose G1GC when

- **Throughput is the primary goal** -- G1GC's simpler write barrier has lower per-operation overhead. For batch workloads, G1GC delivers 5-10% higher throughput.
- **Small heaps (< 2 GB)** -- The overhead of Shenandoah's load barriers is not justified when G1GC pauses are already short on small heaps.
- **Cross-vendor portability** -- G1GC is available on every JDK vendor. Shenandoah is only available on Red Hat builds.
- **GC tuning budget is zero** -- G1GC works well out of the box as the default collector.

### Choose ZGC when

- **p99 SLA tighter than 10 ms** -- ZGC delivers sub-millisecond pauses consistently.
- **Heap exceeds 32 GB** -- ZGC's colored-pointer approach scales to multi-terabyte heaps with constant pause times.
- **HPA stability is critical** -- ZGC's flat CPU profile avoids GC-induced CPU spikes that confuse Kubernetes HPA scaling decisions.
- **JDK 21+ is available** -- Generational ZGC (JDK 21) addresses ZGC's historical weakness with short-lived objects.

---

## The Barrier Type Distinction — Why It Matters

The fundamental architectural difference between concurrent GCs is their **barrier type** --
the extra work the JIT compiler injects into application code to keep the GC informed.

### Write barriers (G1GC)

G1GC uses a **write barrier**: every time the application writes a reference into an object
field, the barrier updates the remembered set (a data structure tracking cross-region
references). Write barriers are cheap individually but G1GC still must pause the application
during evacuation because it cannot safely move objects while the application holds direct
pointers to them.

### Load barriers (Shenandoah)

Shenandoah uses a **load barrier**: every time the application loads a reference from an
object field, the barrier checks the forwarding pointer to ensure the reference points to
the current copy of the object. This is slightly more expensive per operation (loads are
more frequent than writes), but it enables concurrent evacuation -- the GC can move objects
while the application continues to run.

```
# Pseudocode: Shenandoah load barrier
load obj.field -> ref
if ref.forwardingPointer != ref:
    ref = ref.forwardingPointer   # redirect to new copy
```

### Load barriers (ZGC)

ZGC also uses a load barrier, but implements it via **colored pointers** -- metadata bits
stored in the unused upper bits of 64-bit pointers. The barrier checks the color bits
rather than dereferencing a forwarding pointer, making it slightly cheaper than
Shenandoah's approach on modern hardware.

### Impact on application performance

| Barrier type | Per-operation cost | Impact on throughput | Enables concurrent compaction? |
|---|---|---|---|
| Write barrier (G1GC) | Low | Minimal (5-10% overhead) | No |
| Load barrier (Shenandoah) | Moderate | Moderate (10-15% overhead) | Yes |
| Load barrier (ZGC colored) | Moderate | Moderate (10-15% overhead) | Yes |

The throughput cost of load barriers is the price you pay for concurrent compaction.
For latency-sensitive workloads, this tradeoff is almost always worthwhile.

---

## Configuration Reference

### Essential flags

```bash
# Enable Shenandoah
-XX:+UseShenandoahGC

# Container-aware heap sizing (always use these in containers)
-XX:+UseContainerSupport
-XX:MaxRAMPercentage=75.0

# GC logging (recommended for production)
-Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m
```

### Tuning flags

| Flag | Default | Description |
|---|---|---|
| `-XX:ShenandoahGCHeuristics=adaptive` | `adaptive` | Heuristics mode: `adaptive`, `static`, `compact`, `aggressive` |
| `-XX:ShenandoahMinFreeThreshold=10` | `10` | Trigger GC when free heap drops below this percentage |
| `-XX:ShenandoahInitFreeThreshold=70` | `70` | Initial free threshold before first GC |
| `-XX:ShenandoahGuaranteedGCInterval=300000` | `300000` | Maximum interval (ms) between GC cycles; 0 disables |
| `-XX:ShenandoahUncommitDelay=5000` | `5000` | Delay (ms) before uncommitting unused memory |
| `-XX:ShenandoahPacingMaxDelay=10` | `10` | Max delay (ms) for allocation pacing |
| `-XX:+ShenandoahPacing` | `true` | Enable allocation pacing to smooth out allocation bursts |

### Heuristics modes

- **adaptive** (default) -- Dynamically adjusts GC trigger based on allocation rate and
  free heap. Best for most workloads.
- **static** -- Triggers GC at fixed free-heap thresholds. Use when allocation rate is
  predictable and stable.
- **compact** -- Aggressively compacts the heap. Use when fragmentation is a concern (many
  short-lived objects with varying sizes).
- **aggressive** -- Runs GC continuously. Only useful for GC testing and debugging; never
  use in production.

### Recommended container configuration

```dockerfile
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
COPY target/*.jar app.jar
ENTRYPOINT ["java", \
  "-XX:+UseShenandoahGC", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m", \
  "-jar", "app.jar"]
```

---

## Monitoring Shenandoah

### GC log output

Enable GC logging with:

```bash
-Xlog:gc*:file=/tmp/gc.log:time,uptime,level,tags:filecount=5,filesize=10m
```

Example Shenandoah GC log entry:

```
[2024-01-15T10:23:45.123+0000][1.234s][info][gc] GC(42) Pause Init Mark 0.312ms
[2024-01-15T10:23:45.234+0000][1.345s][info][gc] GC(42) Concurrent marking 78M->78M(256M) 110.456ms
[2024-01-15T10:23:45.345+0000][1.456s][info][gc] GC(42) Pause Final Mark 0.567ms
[2024-01-15T10:23:45.456+0000][1.567s][info][gc] GC(42) Concurrent evacuation 78M->45M(256M) 89.123ms
[2024-01-15T10:23:45.567+0000][1.678s][info][gc] GC(42) Pause Init Update Refs 0.089ms
[2024-01-15T10:23:45.678+0000][1.789s][info][gc] GC(42) Concurrent update references 45M->45M(256M) 45.678ms
[2024-01-15T10:23:45.789+0000][1.890s][info][gc] GC(42) Pause Final Update Refs 0.123ms
```

### Key metrics to watch

| Metric | What to look for | Action if triggered |
|---|---|---|
| Pause Init Mark duration | > 5 ms | Check GC root count; reduce static fields |
| Pause Final Mark duration | > 5 ms | Reduce SATB buffer pressure (fewer reference writes during marking) |
| Concurrent evacuation time | Growing over time | Heap may be too small; increase `-XX:MaxRAMPercentage` |
| Free heap after GC | < 20% | Increase heap size or reduce allocation rate |
| DegeneratedGC events | Any occurrence | See [DegeneratedGC section](#degeneratedgc--what-it-means) |

### Prometheus / Micrometer metrics

Spring Boot Actuator with Micrometer exposes JVM GC metrics at `/actuator/prometheus`:

```
# Shenandoah-specific metrics
jvm_gc_pause_seconds{action="end of major GC",cause="Shenandoah",...}
jvm_gc_pause_seconds_count{action="end of major GC",...}
jvm_gc_memory_promoted_bytes_total
jvm_gc_memory_allocated_bytes_total
jvm_gc_live_data_size_bytes
jvm_gc_max_data_size_bytes
```

### GCViewer and GCEasy

Parse Shenandoah GC logs with:

```bash
# GCViewer (local GUI)
java -jar gcviewer-1.36.jar gc.log

# GCEasy (online, upload gc.log)
# https://gceasy.io/
```

---

## DegeneratedGC — What It Means

A **DegeneratedGC** event means Shenandoah's concurrent collection could not complete
before the application ran out of free heap space. When this happens, Shenandoah falls
back to a **stop-the-world** collection to prevent an OutOfMemoryError.

### What the log looks like

```
[info][gc] GC(43) Pause Degenerated GC (Mark) 45.678ms
```

The pause time for a DegeneratedGC event is comparable to a G1GC full-GC pause -- typically
tens to hundreds of milliseconds, depending on heap size.

### Common causes

1. **Heap too small** -- The application allocates faster than Shenandoah can concurrently
   collect. Increase `-XX:MaxRAMPercentage` (recommended: 75.0).
2. **Allocation burst** -- A sudden spike in allocation rate (e.g., deserializing a large
   response body) overwhelms the concurrent collector. Enable allocation pacing:
   `-XX:+ShenandoahPacing`.
3. **Too few concurrent GC threads** -- The default thread count may be too low on
   containers with constrained CPU. Set `-XX:ConcGCThreads=N` where N is 1-2 for
   single-CPU containers.
4. **Fragmentation** -- Many regions contain a mix of live and dead objects, leaving
   insufficient contiguous free space. Switch to `compact` heuristics:
   `-XX:ShenandoahGCHeuristics=compact`.

### What to do

1. Check if the heap is undersized. In containers, verify `MaxRAMPercentage=75.0` and
   that the container memory limit is sufficient for your workload.
2. Check the allocation rate in GC logs. If it spikes before DegeneratedGC events, consider
   allocation pacing.
3. If DegeneratedGC events are rare (< 1% of GC cycles), they may be acceptable --
   Shenandoah is still recovering gracefully.
4. If DegeneratedGC events are frequent, the workload may exceed what Shenandoah can handle
   concurrently. Consider increasing heap size, reducing allocation rate, or switching to
   ZGC (which has a different fallback behavior).

### Full GC (last resort)

If a DegeneratedGC also fails, Shenandoah falls back to a **Full GC** -- a complete
stop-the-world compaction. This is the same behavior as G1GC's Full GC and indicates
severe heap pressure. Full GC events in Shenandoah logs are a critical alert.

---

## The On-Stage Framing

When presenting Shenandoah in a talk or demo, frame it around these key points:

### The elevator pitch

> "G1GC pauses your application to move objects. Shenandoah moves objects while your
> application keeps running. That is the difference between 200 ms pauses and 2 ms pauses."

### Demo flow (using this project's demos)

1. **Demo 02** -- Start with G1GC baseline. Run `hey -n 10000 -c 20` and show p99 latency
   around 40-80 ms with periodic spikes from G1GC evacuation pauses.

2. **Demo 06** -- Switch to Shenandoah with `-XX:+UseShenandoahGC`. Same workload, same
   heap size. Show p99 dropping to 10-15 ms with no evacuation spikes.

3. **Demo 06** -- Switch to ZGC with `-XX:+UseZGC`. Show p99 dropping further to 5-8 ms.
   Note the CPU overhead is similar to Shenandoah.

### Key talking points

- **"Available, not default"** -- Shenandoah ships in Red Hat OpenJDK builds but G1GC
  remains the default. You opt in with a single flag.
- **"One flag change"** -- The only change between demos is the GC flag. Same application,
  same heap, same workload. The improvement comes entirely from the GC algorithm.
- **"The barrier tradeoff"** -- Shenandoah's load barrier costs ~10% throughput. You trade
  throughput for latency predictability. Show this with `hey` throughput numbers.
- **"DegeneratedGC is your canary"** -- If you see DegeneratedGC in logs, your heap is
  too small. This is Shenandoah telling you it needs more room.

### Audience questions to prepare for

| Question | Answer |
|---|---|
| "Why not just use ZGC?" | ZGC is not available on JDK 8/11; Shenandoah is (Red Hat builds). ZGC also is not in Red Hat UBI9 images. For JDK 21+ without Red Hat, ZGC is a strong alternative. |
| "Is Shenandoah production-ready?" | Yes. It has been used in production at Red Hat since 2017 and is the basis for Red Hat's JDK performance engineering. |
| "What about GraalVM native image?" | Native image eliminates JVM startup and GC entirely. It is a different tradeoff: faster startup, lower memory, but no JIT optimization at runtime. |

---

## Reference Links

- [Shenandoah GC Wiki (OpenJDK)](https://wiki.openjdk.org/display/shenandoah)
- [Shenandoah GC -- Red Hat Developer](https://developers.redhat.com/articles/shenandoah-gc)
- [JEP 379: Shenandoah (Production, JDK 15)](https://openjdk.org/jeps/379)
- [JEP 404: Generational Shenandoah (JDK 21)](https://openjdk.org/jeps/404)
- [Red Hat UBI9 OpenJDK Images](https://catalog.redhat.com/software/containers/ubi9/openjdk-21-runtime)
- [GC Comparison Benchmarks -- Ionut Balosin](https://ionutbalosin.com/2024/02/jvm-performance-comparison/)
- [Aleksey Shipilev -- Shenandoah Talks](https://shipilev.net/talks/)
