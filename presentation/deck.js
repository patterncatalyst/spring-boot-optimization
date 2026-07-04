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
  addNotes(s, "Welcome. This talk is about closing the gap between how Java was designed — owning the whole machine — and how it actually runs in Kubernetes — sharing a cgroup with 20 other pods. Everything has a live demo. All slides, code, and demos are in the GitHub repo.");
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
  addNotes(s, "Seven sections, three live demos in the core 60 minutes, six bonus demos for extended sessions. The repo has all nine.");
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
  addNotes(s, "These four statistics come from real customer environments. Spring Boot's 4-8s cold start comes from classpath scanning, auto-configuration resolution, and bean initialization at runtime. That's where AppCDS and Leyden give the biggest wins.");
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
  addNotes(s, "UseContainerSupport is the foundational fix. It's been on by default since Java 10 but most teams don't know about MaxRAMPercentage. The old -Xmx approach breaks silently whenever a VPA changes the container limit.");
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
  addNotes(s, "Setting 90% starves Metaspace and Netty buffers — OOMKills even when your heap metric looks fine. Spring Boot's auto-configuration loads many classes at startup, so Metaspace usage is on the higher end. Measure with: jcmd pid VM.native_memory summary.");
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
  addNotes(s, "Most teams set requests and limits equal — that gives Guaranteed QoS (good for CPU Manager) but no GC surge headroom. Demo 07 shows this analysis on a real 7-service cluster.");
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
  addNotes(s, "Same node, same 16GB of RAM. This slide should be your 'business case' slide when talking to your manager.");
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
  addNotes(s, "The ParallelGCThreads problem is the most surprising. Write this down: -XX:ParallelGCThreads=N where N equals resources.requests.cpu. This costs nothing and immediately improves GC pause duration.");
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
  addNotes(s, "If P99 pause > 500ms, switch from G1GC to ZGC or Shenandoah. Don't tune G1GC parameters hoping to get there — switch the algorithm.");
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
  addNotes(s, "ParallelGCThreads is the most commonly missed flag. Set it equal to your CPU limit. Always. The JAVA_OPTS pattern in the Dockerfile ENTRYPOINT lets you override at deploy time without rebuilding.");
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
  addNotes(s, "A typical Spring Boot app loads 10,000–15,000 classes at startup. Every one benefits from the CDS archive. The spring.context.exit=onRefresh property is key — it tells Spring to exit after context init so we capture the full class list.");
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
  addNotes(s, "The training stage runs Spring Boot just long enough to load all classes, then dumps the CDS archive. At runtime, the JVM memory-maps the archive for near-instant class loading. This is a Dockerfile-only change with zero application code modifications.");
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
  addNotes(s, "One property in Spring Boot: spring.threads.virtual.enabled=true. This switches Tomcat's executor to virtual threads globally. A REST service that needed 512m for 200 platform threads can handle 10,000 virtual threads with the same memory.");
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
  addNotes(s, "The histogram configuration is not optional. The counter tells you 'GC happened 40 times'. The histogram tells you 'GC P99 was 800ms — fire an alert'. Set this before your next deployment.");
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
  addNotes(s, "The management.metrics.tags.application property tags every metric with your app name, which lets you filter in Grafana when running multiple services. The percentiles-histogram property is the one most teams miss.");
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
  addNotes(s, "Scale on RPS not CPU. GC pauses create CPU spikes — CPU-based HPA treats those as load signals and scales out. The 120s stabilisation window is longer than any normal GC pause. minReplicas:2 — one extra pod, zero downtime during GC pause.");
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
  addNotes(s, "If you accumulate five JVM flags without measuring each one, you can't attribute any improvement to any flag. The 35-55% number is specific to Spring Boot.");
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
  addNotes(s, "Walk through the table top to bottom. Emphasize that every row is a configuration change — not an architectural rewrite. For a team with 10 microservices, budget two days.");
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
  addNotes(s, "Demo 01 is the foundational fix. Everything else in this talk builds on getting this right first.");
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
  addNotes(s, "Demo 02 brings in the full Grafana LGTM stack. Key moment: show the GC pause histogram panel — without the percentiles-histogram property it's blank. End with virtual threads: 500 concurrent tasks, only a handful of platform threads.");
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
  addNotes(s, "The 35-55% improvement is much larger for Spring Boot than for build-time frameworks (~5%). Spring Boot loads 10,000-15,000 classes at startup — every one benefits from the CDS archive.");
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
  addNotes(s, "Read each one slowly. This is the audience's callback for their own environments.");
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
  addNotes(s, "Slides and all demos are in the GitHub repo. PRs welcome — especially if a demo breaks on your platform.");
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
  addNotes(s, "Leyden stays on the JVM — full reflection, dynamic loading, JIT all continue to work. Native is the closed-world AOT option. Unlike some frameworks that wrap this in a single property, Spring Boot requires explicit -XX:AOTMode steps.");
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
  addNotes(s, "The two -XX:AOTMode steps are the key difference. The record step runs the app and captures a profile. The create step builds the cache. The sleep-and-kill pattern lets the app exercise its auto-configuration, then exit.");
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
  addNotes(s, "This is a JDK 25 preview. Unlike Quarkus which has a single property toggle, Spring Boot requires the explicit two-step workflow. Show the 3-stage Dockerfile — the training stage is the key insight.");
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
  addNotes(s, "The localhost result is expected. Show it — hiding it would be dishonest. In production with pod-to-pod latency, gRPC wins 3-4x on throughput and 73% on p50 latency. The streaming comparison is real regardless of where you run it.");
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
  addNotes(s, "Spring Boot 4.0 added first-party gRPC support. The @GrpcService annotation registers the service automatically. Demo 05 runs both REST and gRPC endpoints in the same app.");
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
  addNotes(s, "On localhost, gRPC unary will be SLOWER than REST because network cost is zero and HTTP/2 has higher setup overhead. Focus the audience on wire size: JSON ~400 bytes vs Protobuf ~40 bytes.");
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
  addNotes(s, "Same app, same heap, same Spring Boot config. ZGC will show lower throughput — that's the load barrier cost. The meaningful metric is the GC pause delta.");
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
  addNotes(s, "This demo makes the GC theory concrete. Two identical apps, same heap, different GC. The key insight: ZGC pauses are sub-millisecond regardless of heap size.");
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
  addNotes(s, "$80,640/year from one cluster, one afternoon of analysis. That's not a rounding error. The ROI argument: $6,720 saving for ~$400 engineering time = 17x return.");
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
  addNotes(s, "This is the money slide — literally. One afternoon of measurement can save $80K/year per cluster. No containers needed for this demo, just Python.");
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
  addNotes(s, "The Arena is the key safety feature. Everything allocated in a confined arena is freed when it closes. You cannot leak if you use try-with-resources. allocateFrom() — not allocateArray(). The preview API was renamed at GA.");
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
  addNotes(s, "The Panama FFM code is identical whether you use Spring Boot or any other framework. The Spring Boot wrapper just exposes it via REST. The 3-stage Dockerfile: UBI9 compiles C++, Temurin 25 builds Java, slim JRE runs both.");
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
  addNotes(s, "Panama FFM replaces JNI entirely — no javah, no native headers. Arena-managed memory: allocate, call C++, Arena closes automatically. Show the REST endpoints that expose native computation results.");
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
  addNotes(s, "LangChain4j with ONNX Runtime lets you run AI inference on the JVM without a Python sidecar. The MiniLM-L6-v2 model is small enough for CPU inference. Key sizing: the ONNX model loads ~100MB into native memory — drop MaxRAMPercentage to 65%.");
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
  addNotes(s, "The punchline: AI inference as a single Spring Boot deployment unit. ~30ms per embedding on CPU. Practical for semantic search, classification, and RAG retrieval without a separate inference service.");
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
  addNotes(s, "A List of Points written today will automatically get better memory layout on a Valhalla JVM if Point is a value class. For Spring Boot apps with large in-memory caches, Valhalla will significantly reduce heap usage and GC pressure.");
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
  addNotes(s, "The Spring Boot-specific anti-patterns: not using spring.context.exit=onRefresh means you miss half the classes. Not enabling Actuator/Prometheus means you're flying blind.");
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
  addNotes(s, "Everything on this slide is a drop-in change. No application code. No architectural redesign. Configuration and build pipeline changes only. The golden rule: one change at a time, measure before and after.");
}

// ═══════════════════════════════════════════════════════════════════════
// Build
// ═══════════════════════════════════════════════════════════════════════
console.log(`Total slides: ${pageNum}`);
pres.writeFile({ fileName: OUT })
  .then(p => console.log("WROTE", p))
  .catch(e => { console.error(e); process.exit(1); });
