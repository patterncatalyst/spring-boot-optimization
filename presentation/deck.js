// deck.js — Red Hat branded pptx for "Taming the JVM: Optimizing Spring Boot"
// Build:  node deck.js

"use strict";

const H = require("./deck-helpers.js");
const {
  COLOR, FONT, W, ASSETS,
  newDeck, addFooter, addContentTitle, addBullets, addTwoColBullets,
  addStatusTable, addCaption, addCodeSlide, addSectionDivider, addNotes,
  addPerfCallout,
} = H;

const OUT = "./java-openshift-optimization.pptx";
const REV = "r01.0";

const pres = newDeck();
pres.title = "Taming the JVM: Optimizing Spring Boot Workloads on OpenShift & Kubernetes";
pres.author = "Robert Sedor";
pres.company = "Red Hat";
let pageNum = 0;

function S() {
  const s = pres.addSlide(); pageNum += 1; addFooter(s, pageNum); return s;
}
function divider(code, title, subtitle, notes) {
  const s = pres.addSlide(); pageNum += 1; addSectionDivider(s, code, title, subtitle); addNotes(s, notes);
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════
{
  const s = pres.addSlide();
  pageNum += 1;
  s.background = { color: COLOR.white };
  try { s.addImage({ path: `${ASSETS}/cover-panel.png`, x: 0, y: 0, w: W, h: 7.5 }); } catch (e) {}
  s.addText("60-MINUTE DEEP DIVE", { x: 6.00, y: 1.98, w: 6.90, h: 0.34,
    fontFace: FONT.title, fontSize: 14, bold: true, color: COLOR.red, charSpacing: 6, align: "left", valign: "middle" });
  s.addText([{ text: "Taming the JVM:", options: { breakLine: true } }, { text: "Optimizing Spring Boot" }], {
    x: 5.95, y: 2.42, w: 6.95, h: 2.00, fontFace: FONT.title, fontSize: 44, bold: true, color: COLOR.ink, align: "left", valign: "top" });
  s.addText("Workloads on OpenShift & Kubernetes", { x: 6.00, y: 4.45, w: 6.70, h: 0.50,
    fontFace: FONT.body, fontSize: 18, italic: true, color: COLOR.caption, align: "left", valign: "top" });
  s.addText("Spring Boot 4.0.5  |  Java 21 & 25 LTS  |  AppCDS + Leyden  |  Virtual Threads", { x: 6.00, y: 5.10, w: 6.70, h: 0.40,
    fontFace: FONT.mono, fontSize: 10, color: COLOR.caption, align: "left", valign: "top" });
  s.addText(REV, { x: 11.85, y: 5.85, w: 0.95, h: 0.30, fontFace: FONT.mono, fontSize: 11, color: COLOR.caption, align: "right", valign: "middle" });
  try { s.addImage({ path: `${ASSETS}/logo-candidate-2.png`, x: 11.10, y: 6.80, w: 1.55, h: 0.37 }); } catch (e) {}
  addNotes(s, "Welcome. This talk is about closing the gap between how Java was designed — owning the whole machine — and how it actually runs in Kubernetes — sharing a cgroup with 20 other pods. Everything has a live demo. All slides, code, and demos are in the GitHub repo. We're using Spring Boot 4.0.5 with both Java 21 and JDK 25 LTS. Core talk is 60 minutes with 3 live demos. Bonus material adds 6 more demos for a 90-minute extended session.");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 2 — Agenda
// ═══════════════════════════════════════════════════════════════════════
{
  const s = S();
  addContentTitle(s, "OVERVIEW", "Agenda");
  addTwoColBullets(s,
    [
      "Container-Native JVM Fundamentals",
      "Right-Sizing Java Workloads",
      "Garbage Collection Optimization",
      "Startup Time Reduction (AppCDS)",
    ],
    [
      "Observability & Instrumentation",
      "Autoscaling Integration",
      "Systematic Tuning & Cost ROI",
      { text: "Bonus: Leyden · gRPC · Latency · Panama · Valhalla", muted: true },
    ], { fontSize: 16 });
  addNotes(s, "Seven sections in the core talk, each building on the previous one. Sections 01-04 are the technical foundation: container JVM, right-sizing, GC, and startup (~35 min including demos). Sections 05-07 are operational: observability, autoscaling, and the business case (~20 min). The remaining 5 minutes are for takeaways and Q&A. Three core demos: Demo 01 (heap sizing, 5 min), Demo 02 (GC monitoring, 10 min), Demo 03 (AppCDS, 5 min). The purple Bonus card covers 6 additional demos for a 90-minute session.");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 3 — The Problem
// ═══════════════════════════════════════════════════════════════════════
{
  const s = S();
  addContentTitle(s, "THE PROBLEM", "Why Java + Kubernetes = Complexity");
  addStatusTable(s, [
    { code: "60%", name: "of Java apps", purpose: "Overprovision memory — JVM reads /proc/meminfo, sees the NODE's full RAM." },
    { code: "4–8s", name: "typical cold start", purpose: "Spring Boot classpath scanning, auto-configuration resolution, bean init." },
    { code: "2–3×", name: "infra waste", purpose: "Poor bin-packing from over-requested containers. Half the cloud bill is waste." },
    { code: "$$$", name: "cloud spend", purpose: "Unnecessary spend each month — usually five or six figures annually per org." },
  ], { colW: [1.00, 2.20, 8.89] });
  addPerfCallout(s, "Default JVM reads /proc/meminfo and sees the NODE's full RAM — claims 64 GB heap inside a 512 MB container → OOMKill.");
  addNotes(s, "These four statistics come from real customer environments. Walk through each: 60% overprovision because JVM sees /proc/meminfo (node RAM, not cgroup limit). 4-8s cold start from Spring Boot loading 10,000-15,000 classes — this is where AppCDS/Leyden give 35-55% reduction. 2-3x waste from over-requested containers. $$$: usually five or six figures annually. The callout at the bottom is the root cause of all four. Pause here — this is the 'aha' moment for people who've seen unexplained OOMKills.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 01 — Container-Native JVM Fundamentals
// ═══════════════════════════════════════════════════════════════════════
divider("01", "Container-Native\nJVM Fundamentals", "UseContainerSupport + MaxRAMPercentage",
  "This section covers the foundational container JVM fix that everything else builds on.");

// SLIDE 5 — Before/After Container Support
{
  const s = S();
  addContentTitle(s, "SECTION 01 · FUNDAMENTALS", "Container-Native JVM — Before & After");
  addTwoColBullets(s,
    [
      "❌ Hardcoded -Xms512m -Xmx2048m",
      "JVM reads /proc/meminfo → host RAM",
      "Claims 64GB inside 512MB container",
      "Breaks with resize / VPA changes",
    ],
    [
      "✅ -XX:MaxRAMPercentage=75.0",
      "-XX:InitialRAMPercentage=50.0",
      "-XX:MinRAMPercentage=25.0",
      "-XX:NativeMemoryTracking=summary",
    ], { fontSize: 15 });
  addPerfCallout(s, "UseContainerSupport is ON by default in Java 21. Reads cgroup v2 limits. Never hardcode -Xmx in containers.");
  addNotes(s, "This is the single most impactful slide. Left column: hardcoded -Xmx breaks silently when VPA changes the container limit. /proc/meminfo reports HOST RAM — on a 64GB node, JVM sees 64GB and gets OOMKilled in a 512MB container. Right column: MaxRAMPercentage=75.0 scales dynamically with the container limit. InitialRAMPercentage=50.0 avoids initial GC pressure. NativeMemoryTracking=summary enables jcmd VM.native_memory for diagnostics. Ask: 'Who is using MaxRAMPercentage today?' Usually less than a third.");
}

// SLIDE 6 — Memory Regions
{
  const s = S();
  addContentTitle(s, "SECTION 01 · MEMORY", "JVM Memory Regions — Six Buckets, Not One");
  addStatusTable(s, [
    { code: "Heap", name: "Old + Young Gen", purpose: "50–75% of container — controlled by MaxRAMPercentage" },
    { code: "Meta", name: "Metaspace", purpose: "80–250 MB — Spring Boot loads more classes than build-time frameworks" },
    { code: "Stacks", name: "Platform Threads", purpose: "1 MB/thread — 200 threads = 200 MB off-heap" },
    { code: "Native", name: "JIT + GC", purpose: "100–300 MB — not directly controlled" },
    { code: "Direct", name: "ByteBuffers", purpose: "Netty / NIO — varies with I/O patterns" },
    { code: "GC", name: "Bookkeeping", purpose: "50–100 MB — card tables, remembered sets" },
  ], { colW: [1.00, 2.60, 8.49], rowH: 0.40 });
  addCaption(s, "MaxRAMPercentage=75 controls ONLY the heap. The remaining 25% must cover five other regions.");
  addNotes(s, "This table explains 'why 75% and not 90%'. Walk through each row: Heap (50-75%) controlled by MaxRAMPercentage. Metaspace (80-250MB) for class metadata — Spring Boot loads more classes than build-time frameworks, always set MaxMetaspaceSize=256m. Platform Thread Stacks (1MB/thread) — 200 threads = 200MB off-heap that heap metrics never show. Native Memory (100-300MB) for JIT and GC internals. Direct ByteBuffers for Netty/NIO. GC Bookkeeping (50-100MB). The common mistake: 90% leaves only 10% for all five off-heap regions. Diagnostic: jcmd <pid> VM.native_memory summary.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 02 — Right-Sizing
// ═══════════════════════════════════════════════════════════════════════
divider("02", "Right-Sizing\nJava Workloads", "requests vs limits, bin-packing, cost impact",
  "The key insight: requests and limits serve different purposes. Requests are for the scheduler. Limits are for safety.");

// SLIDE 8 — Requests vs Limits
{
  const s = S();
  addContentTitle(s, "SECTION 02 · RIGHT-SIZING", "Requests vs Limits — Two Different Jobs");
  addTwoColBullets(s,
    [
      "requests = scheduling guarantee",
      "Scheduler uses this to find a node",
      "Set to P50 steady-state RSS",
      "Too high → pods can't schedule",
    ],
    [
      "limits = hard ceiling",
      "Memory exceeded → OOMKill (exit 137)",
      "Set memory limit 25-30% above P99 RSS",
      "Set CPU limit 2-4× request for GC spikes",
    ], { fontSize: 15 });
  addPerfCallout(s, "Demo 07: 7-workload analysis · 4 nodes → 2 nodes · +67% pod density · $6,720/month saving · 17× ROI.");
  addNotes(s, "Key insight: requests and limits serve DIFFERENT purposes. Say it explicitly. Left: requests are for the scheduler — set to P50 steady-state RSS. Too high = pods can't schedule, too low = CPU throttle on full node. Right: limits are the hard ceiling — memory exceeded = OOMKill (exit 137), CPU exceeded = throttled (not killed). Set memory limit 25-30% above P99 RSS, CPU limit 2-4x request for GC burst. Common anti-pattern: requests = limits gives Guaranteed QoS but zero GC headroom. Demo 07 shows real analysis: 4 nodes → 2 nodes.");
}

// SLIDE 9 — Bin-Packing Before & After
{
  const s = S();
  addContentTitle(s, "SECTION 02 · BIN-PACKING", "Pod Density — Before & After");
  addTwoColBullets(s,
    [
      "❌ Before: 3 pods / node",
      "Each JVM claims 4GB heap",
      "16GB node · 75% utilization",
      "4GB wasted per node",
    ],
    [
      "✅ After: 8 pods / node",
      "Each JVM correctly claims 1.5GB",
      "16GB node · 94% utilization",
      "2.7× more pods per node",
    ], { fontSize: 15 });
  addPerfCallout(s, "Same application, same functionality. Half the nodes needed = half the cloud bill.");
  addNotes(s, "Same node, same 16GB of RAM. Let the visual breathe for a moment. Left: 3 pods at 4GB each = 75% utilization, 4GB wasted. Right: 8 pods at 1.5GB each = 94% utilization. 2.7x more pods per node. Half the nodes. Half the cloud bill. This is the slide you show your manager when requesting time for JVM optimization work. Measure for your cluster: kubectl top pods --containers → compare against resources.requests → the gap is your waste.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 03 — GC Optimization
// ═══════════════════════════════════════════════════════════════════════
divider("03", "Garbage Collection\nOptimization", "G1GC · Shenandoah · ZGC · Container gotchas",
  "GC is where container JVM behavior diverges most from developer laptops.");

// SLIDE 11 — GC in Containers
{
  const s = S();
  addContentTitle(s, "SECTION 03 · GC", "GC in Containers — Four Challenges");
  addBullets(s, [
    "CPU Throttling Extends GC — CPU limits throttle GC threads mid-pause. 100ms G1GC → 400ms under throttle.",
    "ParallelGCThreads Default — JVM defaults to host CPU count. 64-core node + 4 CPU limit = 64 threads.",
    "GC-Induced HPA Thrash — GC pause → CPU spike → HPA fires → new pods GC → repeat.",
    "Heap Sizing vs GC Pressure — Small heap = frequent GC. Too large = infrequent but long. Start at 75%.",
  ], { fontSize: 14 });
  addNotes(s, "Four container GC challenges. Card 1 — CPU Throttling: CPU limits throttle GC threads mid-pause, 100ms becomes 400ms+. Fix: CPU limit 2-4x request. Card 2 — ParallelGCThreads: JVM defaults to HOST CPU count, not container limit. 64-core node + 4 CPU limit = 64 GC threads fighting for 4 CPUs. Fix: -XX:ParallelGCThreads=4. Card 3 — HPA Thrash: GC pause → CPU spike → HPA scales out → new pods GC → repeat. Fix: scale on RPS. Card 4 — Heap sizing: small heap = frequent GC, large = infrequent but long. Start at 75%.");
}

// SLIDE 12 — GC Selection Guide
{
  const s = S();
  addContentTitle(s, "SECTION 03 · GC SELECTION", "GC Selection Guide");
  addStatusTable(s, [
    { code: "G1GC", name: "50–300ms pauses", purpose: "General purpose, Temurin/Corretto default. -XX:+UseG1GC -XX:MaxGCPauseMillis=200" },
    { code: "Shenandoah", name: "1–20ms pauses", purpose: "UBI9 default — Red Hat images ship this. -XX:+UseShenandoahGC", codeColor: COLOR.red },
    { code: "ZGC (Gen)", name: "<1ms pauses", purpose: "Low-latency APIs, any heap size. -XX:+UseZGC -XX:+ZGenerational", codeColor: COLOR.svc },
    { code: "Serial GC", name: "STW", purpose: "CLI tools, batch, <256MB heap only. -XX:+UseSerialGC" },
  ], { colW: [1.80, 2.40, 7.89] });
  addCaption(s, "UBI9 ships Shenandoah. Demos 02 and 06 override to G1GC / ZGC for clean comparison.");
  addNotes(s, "Walk through each row: G1GC (50-300ms) is the default on Temurin/Corretto — tunable via MaxGCPauseMillis. Shenandoah (1-20ms) is what UBI9 ships — if you're running Red Hat images, you already have it. ZGC Generational (sub-1ms) is the low-latency option — constant pause regardless of heap size, but 5-15% throughput cost from load barriers. Serial GC: only for CLI tools or <256MB heap. Decision heuristic: if P99 GC pause exceeds 500ms, don't tune G1GC parameters — switch the algorithm to ZGC or Shenandoah.");
}

// SLIDE 13 — GC Tuning Parameters
{
  const s = S();
  addCodeSlide(s, "SECTION 03 · GC TUNING", "GC Tuning Parameters", "bash · Dockerfile",
    [
      "# Match GC threads to CPU limit",
      "-XX:ParallelGCThreads=4",
      "-XX:ConcGCThreads=2",
      "",
      "# G1GC tuning",
      "-XX:MaxGCPauseMillis=200",
      "-XX:G1HeapRegionSize=4m",
      "",
      "# ZGC — no tuning needed",
      "-XX:+UseZGC -XX:+ZGenerational",
      "",
      "# Spring Boot Dockerfile ENTRYPOINT",
      'ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]',
    ],
    "The JAVA_OPTS pattern lets you override at deploy time via Kubernetes env vars.");
  addNotes(s, "Left: ParallelGCThreads=4 and ConcGCThreads=2 — match to CPU limit. Most commonly missed flag. ZGC needs no tuning — just enable it. Right: the JAVA_OPTS Dockerfile pattern (java $JAVA_OPTS -jar app.jar) lets you override at deploy time via Kubernetes env vars — no image rebuild needed. Different environments can use different flags from the same image. NativeMemoryTracking=summary: enable in staging for memory diagnostics (~5% overhead).");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 04 — Startup Time
// ═══════════════════════════════════════════════════════════════════════
divider("04", "Startup Time\nReduction", "AppCDS · 3-stage build · Virtual Threads",
  "Spring Boot does a LOT of work at startup. That's actually good news — it means AppCDS has more to cache.");

// SLIDE 15 — Startup Breakdown
{
  const s = S();
  addContentTitle(s, "SECTION 04 · STARTUP", "Spring Boot Startup Breakdown");
  addStatusTable(s, [
    { code: "1.5–3s", name: "Class loading + verification", purpose: "Spring Boot loads 10,000–15,000 classes at startup (vs 3,000–5,000 for build-time frameworks)" },
    { code: "0.5–1.5s", name: "Auto-config resolution", purpose: "Classpath scanning, condition evaluation, auto-configuration ordering" },
    { code: "1–2s", name: "Bean instantiation & DI", purpose: "Dependency injection graph construction and bean initialization" },
    { code: "0.5–1s", name: "Embedded Tomcat", purpose: "Connector start, SSL initialization, request handler registration" },
    { code: "4–8s", name: "Total baseline", purpose: "With AppCDS: 2–4s (35–55% reduction). Zero code changes." },
  ], { colW: [1.40, 3.00, 7.69], rowH: 0.42 });
  addNotes(s, "Spring Boot's architecture is actually an advantage for optimization. Walk through the breakdown: class loading (1.5-3s) is THE bottleneck — 10,000-15,000 classes vs 3,000-5,000 for build-time frameworks. Auto-config resolution (0.5-1.5s) evaluates hundreds of @Conditional annotations. Bean instantiation (1-2s) builds the DI graph. Tomcat start (0.5-1s). Total: 4-8s baseline. With AppCDS: 35-55% reduction — much bigger than build-time frameworks (~5%) because more classes = more CDS benefit. spring.context.exit=onRefresh ensures the training run loads ALL classes.");
}

// SLIDE 16 — AppCDS 3-Stage Build
{
  const s = S();
  addCodeSlide(s, "SECTION 04 · APPCDS", "AppCDS — 3-Stage Dockerfile", "Dockerfile",
    [
      "# Stage 1: Build",
      "FROM registry.access.redhat.com/ubi9/openjdk-21 AS builder",
      "COPY pom.xml . && COPY src ./src",
      "RUN mvn package -DskipTests -q",
      "",
      "# Stage 2: CDS Training",
      "FROM ubi9/openjdk-21 AS cds-trainer",
      "COPY --from=builder /build/target/*.jar /app/app.jar",
      "RUN java -Dspring.context.exit=onRefresh \\",
      "    -XX:ArchiveClassesAtExit=app-cds.jsa -jar app.jar",
      "",
      "# Stage 3: Runtime",
      "FROM ubi9/openjdk-21-runtime",
      "COPY --from=cds-trainer /app/app.jar /app/app-cds.jsa .",
      'ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -Xshare:on \\',
      '  -XX:SharedArchiveFile=app-cds.jsa -jar app.jar"]',
    ],
    "35–55% startup reduction — the more classes your app loads, the bigger the win.", { fontSize: 10 });
  addNotes(s, "3-stage Dockerfile: builder (compile) → trainer (dump CDS archive) → runtime (use archive). The training stage uses spring.context.exit=onRefresh — it loads all classes, evaluates all conditions, creates all beans, then exits cleanly. At runtime, -Xshare:on memory-maps the archive for near-instant class loading. This is a Dockerfile-only change with zero application code modifications. Frame positively: Spring Boot's runtime architecture means CDS has more to cache. The bigger your app, the bigger the win.");
}

// SLIDE 17 — Virtual Threads
{
  const s = S();
  addContentTitle(s, "SECTION 04 · VIRTUAL THREADS", "spring.threads.virtual.enabled=true");
  addTwoColBullets(s,
    [
      "JEP 444 — Java 21, one property in Spring Boot",
      "Switches Tomcat executor to virtual threads",
      "@Async methods use virtual threads",
      "Scheduled tasks use virtual threads",
    ],
    [
      "Platform thread stacks: 1MB each",
      "200 threads = 200MB off-heap",
      "Virtual thread stacks → in heap",
      "10,000 concurrent I/O tasks, same memory",
    ], { fontSize: 15 });
  addPerfCallout(s, "Caveat: avoid synchronized + I/O (pins carrier thread) — use ReentrantLock instead.");
  addNotes(s, "JEP 444 finalized in Java 21. One property switches Tomcat executor, @Async, and @Scheduled to virtual threads. Platform threads: 1MB stack each, OFF-heap — 200 threads = 200MB invisible memory. Virtual threads: stored as continuations ON the heap, GC-managed. 10,000 concurrent I/O tasks with minimal memory. Caveats: synchronized + I/O pins the carrier thread (use ReentrantLock), connection pools become the bottleneck (10,000 virtual threads wanting 20 connections), best for I/O-bound not CPU-bound work.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 05 — Observability
// ═══════════════════════════════════════════════════════════════════════
divider("05", "Observability &\nInstrumentation", "JFR · Actuator · Micrometer · Prometheus",
  "You can't tune what you can't see. This section covers the three lines of configuration that unlock full JVM observability.");

// SLIDE 19 — Observability Overview
{
  const s = S();
  addContentTitle(s, "SECTION 05 · OBSERVABILITY", "You Can't Tune What You Can't See");
  addBullets(s, [
    "JFR (JDK Flight Recorder) — built-in, <1% overhead, GC events, allocations, IO. jcmd pid JFR.start",
    "Cryostat — OpenShift-native JFR management via Kubernetes operator. Auto-discover pods.",
    "Actuator + Micrometer — spring-boot-starter-actuator + micrometer-registry-prometheus",
    "Essential: jvm_gc_pause_seconds P99 >500ms → switch GC. jvm_memory_used_bytes → heap + off-heap.",
  ], { fontSize: 14 });
  addPerfCallout(s, "Required: management.metrics.distribution.percentiles-histogram.jvm.gc.pause=true — without this, Grafana GC panels show no data.");
  addNotes(s, "'You can't tune what you can't see' — say this line. Walk through each card: JFR (built-in, <1% overhead, GC events/allocations/IO), Cryostat (OpenShift-native JFR via operator), Actuator + Micrometer (two Maven deps, all JVM metrics at /actuator/prometheus), Essential Metrics (jvm_gc_pause_seconds P99 >500ms → switch GC). The callout is the most commonly missed config: without percentiles-histogram.jvm.gc.pause=true, Prometheus exports only a counter (how many GC events) not a histogram (what pause durations were). Grafana panels show nothing without it.");
}

// SLIDE 20 — Spring Boot Actuator Config
{
  const s = S();
  addCodeSlide(s, "SECTION 05 · ACTUATOR", "Spring Boot Actuator Configuration", "properties · xml",
    [
      "# application.properties",
      "management.endpoints.web.exposure.include=\\",
      "  health,info,prometheus,metrics",
      "",
      "# GC pause histogram (required!)",
      "management.metrics.distribution.\\",
      "  percentiles-histogram.jvm.gc.pause=true",
      "",
      "# Tag all metrics with app name",
      "management.metrics.tags.application=\\",
      "  ${spring.application.name}",
      "",
      "<!-- pom.xml -->",
      "<!-- spring-boot-starter-actuator -->",
      "<!-- micrometer-registry-prometheus -->",
    ],
    "Two dependencies and three lines of configuration — that's the entire observability setup.");
  addNotes(s, "Left: three lines of application.properties — exposure, histogram, and tagging. The management.metrics.tags.application property tags every metric with your app name so you can filter in Grafana across services. Right: two Maven dependencies. That's the entire observability setup. The percentiles-histogram property is the one most teams miss — without it, GC pause data is invisible. Demo 02 shows all of this live with a Grafana LGTM stack.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 06 — Autoscaling
// ═══════════════════════════════════════════════════════════════════════
divider("06", "Autoscaling\nIntegration", "HPA with JVM-aware metrics",
  "Scale on RPS not CPU. GC pauses create CPU spikes — CPU-based HPA treats those as load signals.");

// SLIDE 22 — HPA Configuration
{
  const s = S();
  addCodeSlide(s, "SECTION 06 · AUTOSCALING", "HPA with JVM-Aware Metrics", "yaml · Kubernetes",
    [
      "spec:",
      "  minReplicas: 2     # NEVER 1 — single pod + GC STW = 100% downtime",
      "  behavior:",
      "    scaleUp:",
      "      stabilizationWindowSeconds: 120  # Absorb GC spikes",
      "      policies:",
      "      - type: Pods",
      "        value: 2",
      "        periodSeconds: 60",
      "    scaleDown:",
      "      stabilizationWindowSeconds: 300",
      "  metrics:",
      "  - type: External",
      '    external: { metric: { name: http_requests_per_second } }',
      "  - type: External",
      '    external: { metric: { name: jvm_memory_used_ratio } }',
    ],
    "minReplicas:2 is the single cheapest reliability improvement.", { fontSize: 10 });
  addNotes(s, "Walk through the YAML. minReplicas: 2 — NEVER 1 for a Java workload. If the single pod is in a GC pause, all requests queue. stabilizationWindowSeconds: 120 for scaleUp (absorb GC spikes without reacting), 300 for scaleDown (avoid thrashing). Metrics: use External type with http_requests_per_second instead of CPU. KEDA is easiest to set up, Prometheus Adapter is more flexible. The policies limit scaleUp to 2 pods per 60 seconds — prevents HPA avalanche during GC events.");
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 07 — Systematic Tuning & Cost
// ═══════════════════════════════════════════════════════════════════════
divider("07", "Systematic Tuning\n& Cost ROI", "Measure → tune → validate → repeat",
  "One change at a time. Measure before and after. Commit or revert based on data.");

// SLIDE 24 — Tuning Workflow
{
  const s = S();
  addContentTitle(s, "SECTION 07 · TUNING", "Systematic Tuning Workflow");
  addStatusTable(s, [
    { code: "1", name: "Instrument", purpose: "Add Actuator + Micrometer + Prometheus. Enable GC pause histogram." },
    { code: "2", name: "Baseline", purpose: "Measure RSS, GC pauses, startup time under realistic load for 15–30 min." },
    { code: "3", name: "Diagnose", purpose: "Identify the bottleneck: memory, GC pauses, startup, thread count." },
    { code: "4", name: "Tune", purpose: "Change ONE flag. MaxRAMPercentage, ParallelGCThreads, AppCDS, etc." },
    { code: "5", name: "Validate", purpose: "Re-measure. Compare before/after. Commit or revert based on data." },
  ], { colW: [0.60, 2.00, 9.49] });
  addPerfCallout(s, "The 35–55% startup reduction from AppCDS is specific to Spring Boot — much bigger than build-time frameworks (~5%).");
  addNotes(s, "Five steps, always in this order. Step 1: Instrument — add Actuator + Micrometer + Prometheus + GC histogram. Step 2: Baseline — measure RSS, GC pauses, startup time under realistic load for 15-30 minutes. Step 3: Diagnose — identify the bottleneck. Step 4: Tune — change ONE flag. Step 5: Validate — re-measure, compare, commit or revert. If you change five flags at once, you can't attribute any improvement. The 35-55% AppCDS number is specific to Spring Boot — build-time frameworks see ~5%.");
}

// SLIDE 25 — Cost Optimization Checklist
{
  const s = S();
  addContentTitle(s, "SECTION 07 · COST", "Cost Optimization Checklist");
  addStatusTable(s, [
    { code: "30 min", name: "MaxRAMPercentage=75 + right-size", purpose: "40–60% memory savings — prevents OOMKill" },
    { code: "2 hrs", name: "AppCDS multi-stage Dockerfile", purpose: "35–55% faster startup — zero code changes" },
    { code: "5 min", name: "ParallelGCThreads = CPU limit", purpose: "30–50% shorter GC pauses" },
    { code: "1 min", name: "spring.threads.virtual.enabled", purpose: "50% thread stack savings — one property" },
    { code: "1 hr", name: "HPA on RPS, not CPU", purpose: "Eliminates GC-induced thrash" },
    { code: "30 min", name: "GC pause histogram alerting", purpose: "Catch issues before users do" },
  ], { colW: [1.20, 3.60, 7.29], rowH: 0.38 });
  addPerfCallout(s, "Total estimated effort: ~4 hours for a typical Spring Boot microservice. Every change is configuration, not code.");
  addNotes(s, "Walk through the table top to bottom. Emphasize the Time column — this is NOT a multi-sprint refactoring effort. Row 1: MaxRAMPercentage=75 + right-size (30 min) — highest impact, lowest effort. Row 2: AppCDS 3-stage Dockerfile (2 hrs) — longest task but still just a Dockerfile change. Row 3: ParallelGCThreads (5 min) — literally the fastest fix. Row 4: virtual threads (1 min) — one property. Row 5: HPA on RPS (1 hr) — requires KEDA or Prometheus Adapter. Row 6: GC alerting (30 min) — one property + one PrometheusRule. Total: ~4 hours for one microservice. Say: 'Every single row is a configuration change. No code rewrites.'");
}

// ═══════════════════════════════════════════════════════════════════════
// DEMO RECAPS (Slides 26-29)
// ═══════════════════════════════════════════════════════════════════════
divider("DEMO", "Live Demos", "Core: Demos 01–03 · Bonus: Demos 04–09",
  "Three live demos in the core 60 minutes. Six bonus demos for extended sessions.");

// SLIDE 27 — Demo 01 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 01", "Container-Aware Heap Sizing");
  addBullets(s, [
    "Run WITHOUT UseContainerSupport → JVM claims host RAM → OOMKill",
    "Run WITH UseContainerSupport + MaxRAMPercentage=75 → respects 512MB limit",
    "Live jcmd output showing heap sizes before and after",
    "OOMKill simulation when JVM ignores container limits",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-01-heap-sizing && ./demo.sh");
  addNotes(s, "Demo 01 is the foundational fix. Walkthrough: build two containers — one misconfigured (no container support), one correct (MaxRAMPercentage=75). First container: jcmd shows heap based on HOST RAM. It will OOMKill. Second: jcmd shows heap at ~384MB (75% of 512MB limit). Key moment: the OOMKill — exit code 137. Ask: 'Has anyone seen this in production?' Most hands go up. Timing: 3-5 minutes. No external dependencies — just Podman. Fallback: the before/after jcmd output on the content slides.");
}

// SLIDE 28 — Demo 02 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 02", "GC Monitoring with Prometheus & Grafana");
  addBullets(s, [
    "Spring Boot 4.0.5 + Actuator + Micrometer + Grafana LGTM stack",
    "Live GC pause histograms at /actuator/prometheus",
    "Generate GC pressure — watch metrics AND traces simultaneously",
    "G1GC vs Generational ZGC side-by-side pause comparison",
    "Virtual threads: 500 concurrent tasks, minimal platform thread count",
  ], { fontSize: 15 });
  addCaption(s, "cd demo-02-gc-monitoring && ./demo.sh  # starts podman-compose stack");
  addNotes(s, "Demo 02 is the longest core demo — budget 8-10 minutes. Walkthrough: start podman-compose stack, open Grafana at localhost:3000, navigate to JVM dashboard. Key moment 1: GC pause histogram panel — without percentiles-histogram property it's blank. Generate GC pressure: curl /allocate?mb=50 then ?mb=100 — watch Grafana update in real time. Key moment 2: show used vs committed vs max memory metrics. Virtual threads finale: curl /threads?count=500 — 500 concurrent tasks, handful of platform threads. Fallback: curl /actuator/prometheus | grep jvm_gc_pause.");
}

// SLIDE 29 — Demo 03 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 03", "AppCDS Startup Acceleration");
  addBullets(s, [
    "Spring Boot baseline: ~4–8s (much higher than build-time frameworks)",
    "3-stage UBI build: builder → CDS trainer → runtime",
    "spring.context.exit=onRefresh captures full class list",
    "Spring Boot + AppCDS: ~2–4s (35–55% reduction)",
    "Progression: AppCDS (JDK 21) → Leyden (JDK 25)",
  ], { fontSize: 15 });
  addCaption(s, "cd demo-03-appcds && ./demo.sh");
  addNotes(s, "Most visually satisfying demo — startup times printed side by side. Walkthrough: builds two images (baseline and optimized), shows the 3-stage Dockerfile, runs both containers. Key moment: baseline ~4-8s, with AppCDS ~2-4s = 35-55% reduction with zero code changes. Explain why Spring Boot benefits more: 10,000-15,000 classes loaded at startup vs 3,000-5,000 for build-time frameworks. More classes = more CDS benefit. Frame positively: 'This is an optimization opportunity, not a weakness.' Timing: 3-5 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 30 — Key Takeaways
// ═══════════════════════════════════════════════════════════════════════
{
  const s = S();
  addContentTitle(s, "TAKEAWAYS", "Key Takeaways");
  addBullets(s, [
    "Always enable UseContainerSupport + MaxRAMPercentage — hardcoded -Xmx is a container anti-pattern",
    "Right-size first, then tune — measure RSS + off-heap before setting requests/limits",
    "Match GC to workload — G1GC general, ZGC/Shenandoah for latency-sensitive APIs",
    "Spring Boot + AppCDS = 35–55% faster startup — 3-stage Dockerfile, zero code changes",
    "Observe before you tune — JFR + Cryostat + Actuator/Prometheus validates every change",
    "Autoscale on RPS not CPU — GC pauses lie to HPA. Enable virtual threads.",
    "Quantify savings — track cost per namespace to show business value",
  ], { fontSize: 14 });
  addNotes(s, "Read each takeaway slowly. Pause after each. This is the audience's callback. 1: 'How many of you are using hardcoded -Xmx today? That's the first thing to fix Monday morning.' 2: 'Measure RSS + off-heap with jcmd before touching any JVM flags.' 3: 'If P99 pause exceeds 500ms, switch to ZGC — don't try to tune G1GC.' 4: 'A Dockerfile change. Zero code modifications.' 5: 'Pick your stack but always have a baseline.' 6: 'GC pauses lie to HPA.' 7: 'Show your manager the dollar number, not the technical improvement.' If short on time, emphasize 1, 4, and 7.");
}

// ═══════════════════════════════════════════════════════════════════════
// SLIDE 31 — Resources & Q&A
// ═══════════════════════════════════════════════════════════════════════
{
  const s = S();
  addContentTitle(s, "RESOURCES", "Resources & Q&A");
  addBullets(s, [
    "📗 Optimizing Cloud Native Java — Benjamin Evans et al. · O'Reilly",
    "📗 SRE with Java Microservices — Jonathan Schneider · O'Reilly",
    "🔗 Demo Repo: github.com/patterncatalyst/spring-boot-optimization",
    "Spring Boot Docs: docs.spring.io/spring-boot/reference/",
    "Grafana JVM Dashboard: grafana.com/grafana/dashboards/4701",
    "Virtual Threads: docs.spring.io/spring-boot/reference/features/threading.html",
    "JVM Tuning: access.redhat.com/articles/2988411",
  ], { fontSize: 14 });
  addNotes(s, "Keep this slide up during Q&A. Highlight: the GitHub repo has all 9 demos, Reveal.js slides, 10 diagrams, and reference docs. PRs welcome. Optimizing Cloud Native Java (O'Reilly): chapters 3-5 cover everything in this talk. Common Q&A: 'What about GraalVM Native?' — different trade-off, closed-world AOT vs Leyden's open-world. 'Does this work with Spring Boot 3.x?' — Yes, everything except gRPC starter. 'ZGC in production?' — Yes, production-ready since JDK 15, generational since JDK 21. If time remains, offer Demo 04 (Leyden) or Demo 05 (gRPC).");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Project Leyden
// ═══════════════════════════════════════════════════════════════════════
divider("B1", "Project Leyden", "JVM AOT Cache — JDK 25 LTS",
  "Leyden is the successor to AppCDS — same concept, richer cache.");

// SLIDE 33 — Leyden Timeline
{
  const s = S();
  addContentTitle(s, "LEYDEN · TIMELINE", "Project Leyden — JVM AOT Cache");
  addStatusTable(s, [
    { code: "JDK 24", name: "JEP 483", purpose: "AOT class loading & linking — ~40% startup reduction" },
    { code: "JDK 25", name: "JEP 514+515", purpose: "Ergonomics + JIT method profiles — ~40–55% startup", codeColor: COLOR.svc },
    { code: "JDK 26", name: "JEP 516", purpose: "ZGC support — no longer have to choose between Leyden and ZGC" },
    { code: "Future", name: "—", purpose: "Pre-compiled native code in cache — instant peak performance" },
  ], { colW: [1.20, 2.00, 8.89] });
  addPerfCallout(s, "Spring Boot 4.0.5: Requires explicit -XX:AOTMode steps — no single-property shortcut. See Demo 04.");
  addNotes(s, "Walk through the timeline. JDK 24 (JEP 483): AOT class loading and linking, ~40% improvement. JDK 25 LTS (JEP 514+515): the sweet spot — adds JIT method profiles so the JIT can start optimizing immediately, ~40-55%. JDK 26 (JEP 516): ZGC support — currently you must choose between Leyden and ZGC. Future: pre-compiled native code = 'instant peak performance.' Spring Boot difference: requires explicit -XX:AOTMode=record and -XX:AOTMode=create steps, unlike Quarkus which wraps it in a single property. This gives full control over the training run. Leyden vs GraalVM Native: Leyden stays on the JVM with full reflection support.");
}

// SLIDE 34 — Leyden Workflow
{
  const s = S();
  addCodeSlide(s, "LEYDEN · WORKFLOW", "Spring Boot + Leyden — 3-Stage Dockerfile", "Dockerfile · JDK 25",
    [
      "# Stage 1: Build",
      "FROM eclipse-temurin:25 AS compiler",
      "COPY pom.xml . && COPY src ./src",
      "RUN ./mvnw package -DskipTests",
      "",
      "# Stage 2: Train",
      "FROM eclipse-temurin:25 AS trainer",
      "COPY --from=compiler /build/target/*.jar app.jar",
      "RUN java -XX:AOTMode=record \\",
      "    -XX:AOTConfiguration=app.aotconf \\",
      "    -jar app.jar & sleep 15 && kill $!",
      "RUN java -XX:AOTMode=create \\",
      "    -XX:AOTConfiguration=app.aotconf \\",
      "    -XX:AOTCache=app.aot -jar app.jar",
      "",
      "# Stage 3: Runtime",
      "FROM eclipse-temurin:25-jre",
      "COPY --from=trainer /app.jar /app.aot ./",
      'ENTRYPOINT ["java", "-XX:AOTCache=app.aot", "-jar", "app.jar"]',
    ],
    "~40–55% startup reduction. The more classes your app loads, the bigger the win.", { fontSize: 10 });
  addNotes(s, "Walk through the Dockerfile. Stage 1: standard Maven build. Stage 2 (the key part): two JVM invocations. -XX:AOTMode=record runs the app and captures which classes are loaded and which methods are hot into app.aotconf. The sleep-and-kill pattern lets Spring Boot complete auto-configuration then exit. -XX:AOTMode=create builds the AOT cache from the profile. Stage 3: just -XX:AOTCache=app.aot — the JVM skips class loading, linking, and JIT warmup. On JDK 25, Leyden subsumes AppCDS — you don't need both. Result: ~40-55% startup reduction.");
}

// SLIDE 35 — Demo 04 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 04 · JDK 25 LTS", "Spring Boot + Project Leyden AOT Cache");
  addBullets(s, [
    "3-stage build: compile → train (record + create) → runtime",
    "Explicit -XX:AOTMode=record + -XX:AOTMode=create",
    "Output: app.aot alongside app.jar",
    "~40–55% startup reduction beyond AppCDS baseline",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-04-leyden && ./demo.sh  # JDK 25 required (in container)");
  addNotes(s, "JDK 25 demo using eclipse-temurin:25. Walkthrough: build baseline (no Leyden) and optimized (with AOT cache) images. Compare startup times: baseline ~4-8s, with Leyden ~2-3s = 40-55% reduction. On JDK 25, Leyden subsumes AppCDS — the AOT cache includes everything CDS would cache plus JIT method profiles. If the demo fails (JDK 25 not available): fall back to Dockerfile walkthrough. Common question: 'Will Spring Boot wrap this in a property?' — Likely yes, in a future release. Timing: 3-5 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — gRPC
// ═══════════════════════════════════════════════════════════════════════
divider("B2", "gRPC", "REST vs gRPC inside the cluster",
  "The localhost result is expected. Show it — hiding it would be dishonest. In production with pod-to-pod latency, gRPC wins 3-4x.");

// SLIDE 37 — REST vs gRPC
{
  const s = S();
  addContentTitle(s, "gRPC · COMPARISON", "REST vs gRPC — Inside the Cluster");
  addTwoColBullets(s,
    [
      "❌ REST / JSON",
      "HTTP/1.1 (or 2)",
      "JSON text (~400 bytes)",
      "New connection per request",
      "curl friendly, browser native",
    ],
    [
      "✅ gRPC / Protobuf",
      "HTTP/2 always",
      "Binary Protobuf (~40 bytes)",
      "Multiplexed, persistent connections",
      "Built-in streaming (4 modes)",
    ], { fontSize: 15 });
  addPerfCallout(s, "Localhost caveat: gRPC unary is SLOWER than REST on localhost — network cost is zero. gRPC wins streaming and high concurrency (c=500).");
  addNotes(s, "Walk through columns side by side. REST: HTTP/1.1, JSON text ~400 bytes, new connection per request, curl-friendly. gRPC: HTTP/2 always, binary Protobuf ~40 bytes (10x smaller), multiplexed persistent connections, built-in streaming. The callout is critical — be honest: on localhost, gRPC unary is SLOWER because network cost is zero and HTTP/2 has higher setup overhead. The win shows at high concurrency (c=500) and streaming. In production with pod-to-pod latency, gRPC wins 3-4x throughput and 73% P50. Say: 'Use REST for external APIs. Use gRPC for service-to-service inside the cluster.'");
}

// SLIDE 38 — Spring Boot gRPC
{
  const s = S();
  addCodeSlide(s, "gRPC · SPRING BOOT", "spring-grpc-spring-boot-starter", "java · properties",
    [
      "@GrpcService",
      "public class MetricsGrpcService",
      "    extends MetricsServiceGrpc.MetricsServiceImplBase {",
      "",
      "  @Override",
      "  public void getJvmMetrics(",
      "      MetricsRequest request,",
      "      StreamObserver<JvmMetrics> observer) {",
      "    JvmMetrics metrics = JvmMetrics.newBuilder()",
      "      .setHeapUsed(runtime.totalMemory() - runtime.freeMemory())",
      "      .setHeapMax(runtime.maxMemory()).build();",
      "    observer.onNext(metrics);",
      "    observer.onCompleted();",
      "  }",
      "}",
      "",
      "# application.properties",
      "spring.grpc.server.port=9000",
    ],
    "New in Spring Boot 4.0. One dependency, one annotation.", { fontSize: 10 });
  addNotes(s, "Spring Boot 4.0 added first-party gRPC via spring-grpc. @GrpcService is the gRPC equivalent of @RestController — auto-registers, wires DI, handles lifecycle. Two ports: REST on :8080 (Tomcat), gRPC on :9000 (Netty) in the same JVM, same Spring context. The .proto file is the single source of truth — protobuf-maven-plugin generates stubs. This means the same app serves REST to external clients and gRPC to internal services — best of both worlds.");
}

// SLIDE 39 — Demo 05 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 05", "REST vs gRPC Performance Comparison");
  addBullets(s, [
    "Spring Boot 4.0.5 + spring-grpc-spring-boot-starter",
    "REST endpoint on :8080, gRPC on :9000",
    "hey for HTTP load test, ghz for gRPC",
    "Unary, server-streaming, and concurrent comparisons",
    "Protobuf wire size vs JSON wire size",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-05-grpc && ./demo.sh");
  addNotes(s, "Walkthrough: start app with both endpoints. Show REST (curl :8080/metrics = ~400 bytes JSON) and gRPC (grpcurl :9000 = ~40 bytes Protobuf). Run load test: hey for REST, ghz for gRPC with matching params. Key moment: gRPC unary is SLOWER on localhost — show it, don't hide it. Then run at c=500: gRPC wins because HTTP/2 multiplexing handles concurrent requests on one connection. Focus on wire size difference: 10x smaller = 10x less bandwidth in a cluster. Timing: 5-7 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Low Latency
// ═══════════════════════════════════════════════════════════════════════
divider("B3", "Low Latency", "G1GC vs ZGC — side by side",
  "Same app, same heap, same Spring Boot config. Different GC = different production behaviour.");

// SLIDE 41 — G1GC vs ZGC
{
  const s = S();
  addContentTitle(s, "LOW LATENCY · GC", "Why the JVM Breaks Latency SLAs");
  addTwoColBullets(s,
    [
      "❌ G1GC — Default",
      "Young GC pause: 10–200ms",
      "Mixed GC pause: 50–500ms",
      "Full GC (worst): 1–10s",
      "Pauses SCALE with heap size",
    ],
    [
      "✅ ZGC Generational — JDK 21+",
      "All pauses: <1ms",
      "Scales with thread count, not heap",
      "Load barrier overhead: ~5-15%",
      "Smooth CPU profile → no HPA thrash",
    ], { fontSize: 15 });
  addNotes(s, "Walk through each column. G1GC: Young GC 10-200ms, Mixed 50-500ms, Full GC 1-10s (catastrophic). Key insight: pauses SCALE with heap size — bigger heap = longer pauses. CPU spikes during GC trigger false HPA scale-out. ZGC Generational: ALL pauses sub-1ms regardless of heap size. Load barrier overhead 5-15% throughput cost — every object reference load goes through a barrier. Smooth CPU = no HPA thrash. Trade-off: G1GC gives max throughput, ZGC gives predictable latency. Say: 'Don't try to tune G1GC to get sub-millisecond pauses. Switch to ZGC.'");
}

// SLIDE 42 — Demo 06 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 06", "Low-Latency G1GC vs ZGC");
  addBullets(s, [
    "Spring Boot 4.0.5 + Actuator + Prometheus + Grafana",
    "Same app, two containers: G1GC on :8080, ZGC on :8081",
    "Generate allocation pressure with /pressure?mb=50",
    "Side-by-side GC pause histograms in Grafana",
    "G1GC: 50–500ms pauses vs ZGC: <1ms pauses",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-06-latency && ./demo.sh  # starts podman-compose stack");
  addNotes(s, "Visual proof of the theory. Walkthrough: podman-compose starts two Spring Boot containers (G1GC on :8080, ZGC on :8081) + Prometheus + Grafana. Generate pressure: curl /pressure?mb=50 for each. Key moment 1: GC pause histogram — G1GC shows 50-500ms buckets, ZGC shows sub-1ms. Key moment 2: increase pressure to ?mb=100 — G1GC pauses get LONGER, ZGC stays sub-1ms. Show CPU profile: G1GC has spikes, ZGC is flat. Ask: 'Which one would HPA react to?' Honest throughput caveat: ZGC shows 5-15% lower throughput. Timing: 5-7 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Right-Sizing
// ═══════════════════════════════════════════════════════════════════════
divider("B4", "Right-Sizing\nCost Analysis", "$80K/year from one cluster, one afternoon",
  "The money slide — literally.");

// SLIDE 44 — Cost Impact
{
  const s = S();
  addContentTitle(s, "RIGHT-SIZING · COST", "Cost Impact Analysis & Business Case");
  addStatusTable(s, [
    { code: "$80,640", name: "Annual saving", purpose: "2 nodes × $0.384/hr × 8,760 hrs — this cluster alone", codeColor: "27AE60" },
    { code: "17×", name: "ROI", purpose: "$6,720 saving for ~$400 engineering time", codeColor: "27AE60" },
    { code: "+67%", name: "Pod density", purpose: "4 nodes → 2 nodes. Same app, same functionality.", codeColor: "27AE60" },
    { code: "10×", name: "At scale", purpose: "10 clusters = $67,200/year. OpenShift Cost Management tracks it.", codeColor: "27AE60" },
  ], { colW: [1.40, 2.20, 8.49] });
  addNotes(s, "This is the 'convince your manager' slide. Walk through four cards: 1) Direct savings: 2 nodes eliminated, $1,120 → $560/month. 2) Engineering cost: ~4 hours × $100/hr = $400 for $6,720 savings = 17x ROI. 3) Indirect: HPA stability, VPA trustworthiness, correct alert thresholds. 4) At scale: 10 clusters = $67,200/year. Tailor to audience — engineers: focus on technical improvements; managers: headline number and ROI; platform teams: multiplication at scale. Say: 'This is an afternoon of configuration changes with measurable dollar impact.'");
}

// SLIDE 45 — Demo 07 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 07", "Right-Sizing & Cost Analysis");
  addBullets(s, [
    "Python analysis script — no containers needed",
    "7 workloads analyzed: API gateways, batch processors, event consumers",
    "Before: 4 nodes · After: 2 nodes",
    "+67% pod density · $6,720/month saving",
    "Generates recommendations with confidence intervals",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-07-rightsizing && python3 analyze.py");
  addNotes(s, "The 'money slide' demo — no containers needed. Walkthrough: python3 analyze.py analyzes 7 workload profiles (API gateways, batch processors, event consumers). Output: current state (4 nodes, over-provisioned), recommended state (specific requests/limits based on P50/P95/P99 usage), after right-sizing (2 nodes, +67% density). Key moment: confidence intervals — data-driven right-sizing, not guessing. Cost: $1,120 → $560/month = $6,720/year per cluster. For 10 clusters: $67,200/year. Common question: 'What about traffic spikes?' — That's what HPA handles. Timing: 3-5 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Panama
// ═══════════════════════════════════════════════════════════════════════
divider("B5", "Project Panama", "The end of JNI — Arena-managed native memory",
  "FFM is production-ready in JDK 22, stable in JDK 25. No --enable-preview required.");

// SLIDE 47 — Panama Overview
{
  const s = S();
  addContentTitle(s, "PANAMA · FFM", "Project Panama — The End of JNI");
  addTwoColBullets(s,
    [
      "❌ JNI (1996)",
      "Write Java + C header + C wrapper",
      "Compile C per platform/arch",
      "Manual native memory — leaks kill JVM",
      "JNI crash = no Java stack trace",
    ],
    [
      "✅ Panama FFM (JDK 22 — finalized)",
      "Arena-managed memory (try-with-resources)",
      "MethodHandle + Linker replaces javah",
      "Zero leaks by construction",
      "Java-native stack traces preserved",
    ], { fontSize: 15 });
  addNotes(s, "Compare JNI (left) with Panama FFM (right). JNI (1996): three files per native call, manual memory management (leaks kill JVM), JNI crash = no Java stack trace, sun.misc.Unsafe as escape hatch (removed JDK 23). Panama FFM (JDK 22): pure Java, Arena-managed memory — try-with-resources guarantees zero leaks. allocateFrom() not allocateArray() — API was renamed at GA. MethodHandle invocation is type-safe and JIT-inlineable. No --enable-preview required on JDK 22+. This is production-ready.");
}

// SLIDE 48 — Panama + Spring Boot
{
  const s = S();
  addCodeSlide(s, "PANAMA · SPRING BOOT", "Spring Boot + Panama FFM", "java · Dockerfile",
    [
      "@RestController",
      "@RequestMapping(\"/panama\")",
      "public class PanamaController {",
      "  private final MethodHandle computeP99;",
      "",
      "  @GetMapping(\"/stats\")",
      "  public Map<String, Object> stats() {",
      "    try (Arena arena = Arena.ofConfined()) {",
      "      MemorySegment result = arena.allocate(JAVA_DOUBLE);",
      "      computeP99.invoke(data, len, result);",
      "      return Map.of(\"p99\", result.get(JAVA_DOUBLE, 0));",
      "    }",
      "  }",
      "}",
      "",
      "// 3-Stage: UBI9 C++ → Temurin 25 Java → Temurin 25 JRE",
    ],
    "Panama FFM code is pure JDK API — Spring Boot just wraps it via REST.", { fontSize: 10 });
  addNotes(s, "Panama FFM code is pure JDK API — works identically in any framework. MethodHandle fields are initialized once at bean construction; each request gets its own Arena.ofConfined() for isolation and automatic cleanup. 3-stage Dockerfile: Stage 1 (UBI9) compiles C++ library, Stage 2 (Temurin 25) builds Java, Stage 3 combines both into slim JRE. Container sizing note: native library loads into native memory — if doing heavy native allocation, reduce MaxRAMPercentage to leave room.");
}

// SLIDE 49 — Demo 08 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 08 · JDK 25", "Project Panama FFM — Native C++ Interop");
  addBullets(s, [
    "Spring Boot 4.0.5 + JDK 25 + Panama FFM API",
    "C++20 native library for statistics (P99, standard deviation)",
    "3-stage build: UBI9 C++ → Temurin 25 Java → Temurin 25 JRE",
    "Arena-managed native memory — zero leak by construction",
    "REST endpoints expose native computation results",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-08-panama && ./demo.sh");
  addNotes(s, "JDK 25 demo. Walkthrough: 3-stage build (C++ compilation → Java build → runtime). Show native C++ stats library (P99, std dev). REST endpoints: curl /panama/stats and /panama/system. Key moment: explain Arena-managed memory — show try-with-resources pattern, ask 'What happens if an exception is thrown?' — Arena still closes, zero leaks by construction. If time allows: show MethodHandle setup via Linker.nativeLinker(). Why it matters: call optimized C/C++ from Java without JNI pain. Timing: 5-7 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — AI / ONNX
// ═══════════════════════════════════════════════════════════════════════
divider("B6", "AI Inference", "LangChain4j + ONNX on the JVM",
  "AI inference as a single Spring Boot deployment unit. No GPU. No Python sidecar.");

// SLIDE 51 — LangChain4j + ONNX
{
  const s = S();
  addCodeSlide(s, "AI · ONNX", "LangChain4j + ONNX — AI on the JVM", "java · Spring Boot",
    [
      "@Configuration",
      "public class EmbeddingModelConfig {",
      "  @Bean",
      "  public EmbeddingModel embeddingModel() {",
      "    return new OnnxEmbeddingModel(",
      "      \"all-MiniLM-L6-v2.onnx\", \"tokenizer.json\");",
      "  }",
      "}",
      "",
      "@RestController",
      "@RequestMapping(\"/onnx\")",
      "public class OnnxController {",
      "  @Autowired EmbeddingModel embeddingModel;",
      "",
      "  @PostMapping(\"/embed\")",
      "  public float[] embed(@RequestBody String text) {",
      "    return embeddingModel.embed(text).content().vector();",
      "  }",
      "}",
    ],
    "No Python sidecar. Single deployment unit. CPU inference — no GPU required.", { fontSize: 10 });
  addNotes(s, "Left: OnnxEmbeddingModel becomes a Spring bean via @Configuration + @Bean. LangChain4j handles tokenization, ONNX Runtime handles inference. Right: no Python sidecar (single deployment unit), CPU-only inference (~30ms/embed for MiniLM-L6-v2, 22M params), single container/health check/log stream. Critical callout: ONNX model loads ~100MB into native memory OUTSIDE the heap. If using MaxRAMPercentage=75, total = 75% heap + 100MB ONNX + stacks + GC = over limit. Drop to 65%. Connects back to Slide 5 (JVM Memory Regions).");
}

// SLIDE 52 — Demo 09 Recap
{
  const s = S();
  addContentTitle(s, "DEMO 09 · JDK 25", "AI Inference — LangChain4j + ONNX");
  addBullets(s, [
    "Spring Boot 4.0.5 + LangChain4j 0.36.2 + ONNX Runtime",
    "MiniLM-L6-v2 embedding model (bundled in Maven dependency)",
    "REST API: /embed, /similarity, /benchmark",
    "CPU-only inference — no GPU required",
    "Memory-aware container sizing with ONNX model overhead (~100MB native)",
  ], { fontSize: 16 });
  addCaption(s, "cd demo-09-onnx && ./demo.sh");
  addNotes(s, "Final bonus demo. Walkthrough: app takes longer to start (ONNX model loads ~100MB at init). Show /embed endpoint (POST text → 384-dimensional vector), /similarity (compare two sentences semantically), /benchmark (100 embeddings, ~30ms average). Memory observation: curl /actuator/prometheus | grep jvm_memory — heap is normal but RSS is higher due to ONNX model in native memory. Container sizing: 512MB limit with 75% heap = 384MB + 100MB ONNX = over limit → OOMKill. Solution: reduce to 65% or increase limit. Timing: 3-5 minutes.");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Valhalla
// ═══════════════════════════════════════════════════════════════════════
divider("B7", "Project Valhalla", "Closing the 30-year gap — value classes",
  "Valhalla doesn't change how you write code — it changes what the JVM does with your code.");

// SLIDE 54 — Valhalla
{
  const s = S();
  addContentTitle(s, "VALHALLA", "Project Valhalla — Value Types");
  addTwoColBullets(s,
    [
      "Today — record Point(double x, double y)",
      "Heap object — 8-byte header per element",
      "GC-tracked — every allocation",
      "Pointer indirection on access",
    ],
    [
      "Valhalla — value class Point { double x, y; }",
      "Stored inline — no header",
      "x0,y0,x1,y1 densely packed",
      "GC never sees it — zero GC pressure",
    ], { fontSize: 15 });
  addBullets(s, [
    { text: "📉 Memory: List<double>: 1× vs List<Double>: 3×. Pod requests cut up to 50%.", sub: true },
    { text: "♻️ GC Pressure: Zero heap allocation, zero GC tracking. HPA stays quiet.", sub: true },
    { text: "⚡ Cache Performance: Sequential memory. L1/L2 cache-friendly. SIMD-friendly.", sub: true },
    { text: "📅 Timeline: Preview JDK 25+. Universal generics after primitive classes. Stable ~JDK 27-29.", sub: true },
  ], { y: 4.20, h: 2.50, fontSize: 13 });
  addNotes(s, "Valhalla is 10+ years in development. Today's record Point: 8-byte header per object, 1M Points = 8MB overhead, GC-tracked, pointer indirection (cache misses). Valhalla value class: no header, inline storage (x0,y0,x1,y1 densely packed), GC never sees it, cache-friendly sequential access. Four impacts: Memory (List<double> 1x vs List<Double> 3x, pod requests cut 50%), GC Pressure (zero heap allocation from value types), Cache Performance (SIMD-friendly layout), Timeline (preview JDK 25+, stable ~JDK 27-29). Say: 'Change record to value class for your data types, and the JVM does the rest.'");
}

// ═══════════════════════════════════════════════════════════════════════
// BONUS — Anti-Patterns
// ═══════════════════════════════════════════════════════════════════════
divider("B8", "Anti-Patterns\n& Remediation", "Common JVM anti-patterns on Kubernetes",
  "Pick 2-3 from each category that resonate with your audience. Ask for a show of hands.");

// SLIDE 56 — Anti-Patterns
{
  const s = S();
  addContentTitle(s, "ANTI-PATTERNS", "Common JVM Anti-Patterns on Kubernetes");
  addTwoColBullets(s,
    [
      "🧠 Memory",
      { text: "❌ Hardcoded -Xmx/-Xms", sub: true },
      { text: "❌ MaxRAMPercentage=90 — starves off-heap", sub: true },
      { text: "❌ No -XX:MaxMetaspaceSize", sub: true },
      "⚙️ GC & CPU",
      { text: "❌ Default ParallelGCThreads on large node", sub: true },
      { text: "❌ CPU-based HPA with Java workloads", sub: true },
      { text: "❌ minReplicas: 1 in HPA", sub: true },
    ],
    [
      "🚀 Startup / CDS",
      { text: "❌ No spring.context.exit=onRefresh in training", sub: true },
      { text: "❌ Missing -Xshare:on at runtime", sub: true },
      { text: "❌ No AppCDS despite 4-8s startup", sub: true },
      "👁 Observability",
      { text: "❌ No GC pause histogram configured", sub: true },
      { text: "❌ Missing Actuator Prometheus endpoint", sub: true },
      { text: "❌ Tuning JVM flags without baseline", sub: true },
    ], { fontSize: 13 });
  addNotes(s, "Audit checklist — walk through each quadrant, ask for show of hands. Memory: hardcoded -Xmx (60%+ of rooms), MaxRAMPercentage=90 (starves off-heap), no MaxMetaspaceSize (unbounded growth). GC & CPU: default ParallelGCThreads (64 threads for 2 CPU limit), CPU-based HPA (GC = false signals), minReplicas:1 (GC pause = downtime), no stabilizationWindow (oscillation). Startup: no spring.context.exit=onRefresh (miss half the classes), missing -Xshare:on (silent fallback), wrong JDK version (archive ignored). Observability: no GC histogram, no Actuator endpoint, no alerting, tuning without baseline.");
}

// SLIDE 57 — Anti-Pattern Remediation
{
  const s = S();
  addContentTitle(s, "REMEDIATION", "Anti-Pattern Fixes — All Configuration, Zero Code");
  addTwoColBullets(s,
    [
      "✅ Memory Fixes",
      { text: "→ UseContainerSupport + MaxRAMPercentage=75.0", sub: true },
      { text: "→ Use 75%, not 90% — reserve 25% for off-heap", sub: true },
      { text: "→ Add -XX:MaxMetaspaceSize=256m", sub: true },
      "✅ GC & CPU Fixes",
      { text: "→ -XX:ParallelGCThreads=N (= CPU request)", sub: true },
      { text: "→ HPA on RPS, not CPU (KEDA or Prometheus Adapter)", sub: true },
      { text: "→ minReplicas: 2 minimum", sub: true },
    ],
    [
      "✅ Startup / CDS Fixes",
      { text: "→ spring.context.exit=onRefresh for training", sub: true },
      { text: "→ -Xshare:on in ENTRYPOINT (fail if archive missing)", sub: true },
      { text: "→ Pin JDK minor version in Dockerfile FROM", sub: true },
      "✅ Observability Fixes",
      { text: "→ percentiles-histogram.jvm.gc.pause=true", sub: true },
      { text: "→ management.endpoints.web.exposure.include=prometheus", sub: true },
      { text: "→ Baseline first. Change one flag. Measure again.", sub: true },
    ], { fontSize: 13 });
  addNotes(s, "Mirror of anti-patterns — same quadrants, now with fixes. Memory: UseContainerSupport + MaxRAMPercentage=75.0 (30 seconds), 75% not 90% (25% headroom for Metaspace/stacks/native), MaxMetaspaceSize=256m. GC: ParallelGCThreads=N (= CPU request), HPA on RPS via KEDA, minReplicas:2, stabilizationWindowSeconds:120. Startup: spring.context.exit=onRefresh for training, -Xshare:on (not auto — fail if archive missing), pin JDK minor version. Observability: percentiles-histogram, endpoints.web.exposure, PrometheusRule for GC P99 >500ms. Say: 'Take a photo of this slide. It's your Monday morning checklist.' Golden rule: one change at a time, measure before and after.");
}

// ═══════════════════════════════════════════════════════════════════════
// Build
// ═══════════════════════════════════════════════════════════════════════
console.log(`Total slides: ${pageNum}`);
pres.writeFile({ fileName: OUT })
  .then(p => console.log("WROTE", p))
  .catch(e => { console.error(e); process.exit(1); });
