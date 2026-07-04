// deck.js — Red Hat branded pptx for "Taming the JVM: Optimizing Spring Boot"
// Build:  node deck.js

"use strict";

const H = require("./deck-helpers.js");
const {
  COLOR, FONT, W, ASSETS,
  newDeck, addFooter, addContentTitle, addBullets, addTwoColBullets,
  addStatusTable, addCaption, addCodeSlide, addSectionDivider, addNotes,
  addPerfCallout, addDiagramSlide,
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
  s.addText("Spring Boot 4.0.5  |  Java 21 & 25 LTS  |  G1GC / ZGC / Shenandoah  |  AppCDS + Leyden  |  Virtual Threads", { x: 6.00, y: 5.10, w: 6.70, h: 0.40,
    fontFace: FONT.mono, fontSize: 10, color: COLOR.caption, align: "left", valign: "top" });
  s.addText(REV, { x: 11.85, y: 5.85, w: 0.95, h: 0.30, fontFace: FONT.mono, fontSize: 11, color: COLOR.caption, align: "right", valign: "middle" });
  try { s.addImage({ path: `${ASSETS}/logo-candidate-2.png`, x: 11.10, y: 6.80, w: 1.55, h: 0.37 }); } catch (e) {}
  addNotes(s, `Welcome. This talk is about closing the gap between how Java was designed — owning the whole machine — and how it actually runs in Kubernetes — sharing a cgroup with 20 other pods.

Everything in this talk has a live demo. All slides, code, and demos are in the GitHub repo on screen. Encourage the audience to pull it up now — they can follow along.

We're using Spring Boot 4.0.5 — the latest release — with both Java 21 and JDK 25 LTS. Spring Boot is the most deployed Java framework in enterprise Kubernetes, so the wins here apply to most of the audience's production workloads.

Tech stack pills on screen: Spring Boot 4.0.5, Java 21 & 25, G1GC/ZGC/Shenandoah, AppCDS + Leyden, Virtual Threads. Every one of these gets a dedicated section and demo.

Timing: core talk is 60 minutes with 3 live demos. Bonus material adds 6 more demos for a 90-minute extended session. Gauge the room and decide which bonus sections to include.`);
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
  addNotes(s, `Seven sections in the core talk, each building on the previous one. Walk through the cards briefly — don't read them, just point and say "we'll cover these in order."

Sections 01-04 are the technical foundation: container JVM, right-sizing, GC, and startup. These take about 35 minutes including demos.
Sections 05-07 are operational: observability, autoscaling, and the business case. About 20 minutes.
The remaining 5 minutes are for takeaways and Q&A.

The purple "Bonus" card covers Leyden, gRPC, low-latency GC comparison, right-sizing cost analysis, Panama FFM, Valhalla, and anti-patterns. Six additional demos. Use these for a 90-minute session or as Q&A-driven deep dives.

Three core demos: Demo 01 (heap sizing, 5 min), Demo 02 (GC monitoring, 10 min), Demo 03 (AppCDS, 5 min). All nine are in the GitHub repo.`);
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
  addNotes(s, `These four statistics come from real customer environments. The $$$ line has an actual number for each of them — and it's usually five or six figures annually.

Walk through each stat:
- 60% overprovision: most teams set -Xmx to host RAM or a guess. The JVM sees /proc/meminfo, which reports the NODE's RAM, not the container's cgroup limit.
- 4-8s cold start: Spring Boot loads 10,000-15,000 classes at startup for classpath scanning, auto-configuration resolution, and bean initialization. This is where AppCDS and Leyden give us 35-55% reduction — much bigger than build-time frameworks because there's more runtime work to cache.
- 2-3x waste: when every pod requests 4GB but uses 1.5GB, you're paying for empty nodes. We'll quantify this in Demo 07.
- $$$: we'll put a real number on this in the right-sizing section. Spoiler: $80K/year per cluster is typical.

The callout at the bottom is the root cause of all four problems. Pause here — this is the "aha" moment for people who've seen OOMKills they couldn't explain.

Transition: "Let's fix this. Section 01 starts with the single most impactful change."`);
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
  addNotes(s, `This is the single most impactful slide in the talk. Every optimization that follows depends on getting this right first.

Left column — the "before" anti-pattern:
- Hardcoded -Xms512m -Xmx2048m: this breaks silently when VPA changes the container limit or the cluster admin resizes the node. The JVM still claims 2GB inside a 512MB container.
- /proc/meminfo reports HOST RAM: on a 64GB node, the JVM sees 64GB and sizes its heap accordingly — then gets OOMKilled when the cgroup enforces the 512MB limit.

Right column — the fix:
- MaxRAMPercentage=75.0: heap scales dynamically with the container's memory limit. If the limit is 512MB, heap is ~384MB. If VPA bumps it to 1GB, heap automatically becomes ~768MB. No rebuild needed.
- InitialRAMPercentage=50.0: start at half to avoid initial GC pressure during warmup.
- NativeMemoryTracking=summary: enables jcmd VM.native_memory to see where memory actually goes. Small overhead (~5%), worth it in staging.

UseContainerSupport has been ON by default since Java 10. The audience probably already has it. The missing piece is MaxRAMPercentage — ask for a show of hands: "Who is using MaxRAMPercentage today?" Usually less than a third.

The callout mentions cgroup v2 — RHEL 9 / OCP 4.14+ uses v2 by default. Java 21 handles both v1 and v2 correctly.

The next slide shows the container-aware JVM diagram.

Reference: Optimizing Cloud Native Java Ch. 3 — Container Memory Management.

Transition: "75% for the heap. What about the other 25%? Next slide."`);
}

// SLIDE — Diagram: Container-Aware JVM
{
  const s = S();
  addDiagramSlide(s, "FUNDAMENTALS", "Container-Aware JVM", "04-container-aware-jvm",
    "Before: /proc/meminfo. After: cgroup-aware with UseContainerSupport.");
  addNotes(s, `This diagram shows the before/after of container-aware JVM behavior.

Left side (before UseContainerSupport): the JVM reads /proc/meminfo and sees the host node's full RAM (e.g., 64GB). It sizes its heap accordingly — way over the container's cgroup limit. Result: OOMKill.

Right side (after): with UseContainerSupport (on by default since JDK 10), the JVM reads the cgroup limit instead. If the container limit is 512MB, the JVM sees 512MB and sizes heap to 75% of that = 384MB.

This is the foundational fix that everything else in this talk builds on. Without this, all other tuning is pointless — the JVM doesn't even know how much memory it has.`);
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
  addNotes(s, `This table is the "why 75% and not 90%" explanation. Walk through each row:

- Heap (50-75%): this is what MaxRAMPercentage controls. Old Gen + Young Gen. The GC manages this.
- Metaspace (80-250MB): class metadata storage. Spring Boot loads significantly more classes at startup than build-time frameworks — auto-configuration, component scanning, conditional evaluation. Always set -XX:MaxMetaspaceSize=256m to cap it; without this, a classloader leak can consume all remaining memory.
- Platform Thread Stacks (1MB/thread): each platform thread gets a 1MB stack by default. 200 threads = 200MB of off-heap memory the heap metric never shows. This is why virtual threads matter — they move stacks into the heap as continuations.
- Native Memory (100-300MB): JIT compiler code cache, GC internal structures, and JVM bookkeeping. Not directly controllable but must be accounted for.
- Direct ByteBuffers: Netty, NIO, and any I/O framework that allocates off-heap. Spring WebFlux apps with heavy I/O can use significant direct memory.
- GC Bookkeeping (50-100MB): card tables, remembered sets, concurrent mark bitmaps. Grows with heap size.

The common mistake: setting MaxRAMPercentage=90 and wondering why pods OOMKill even when the heap metric shows 70% utilization. The answer is always off-heap: Metaspace + thread stacks + native memory exceeded the remaining 10%.

Key diagnostic command: jcmd <pid> VM.native_memory summary — this breaks down exactly where memory is going. Run it in staging before and after tuning.

The next slide shows the JVM memory regions diagram.

Transition: "Now that we know how memory is allocated, how do we right-size our containers?"`);
}

// SLIDE — Diagram: JVM Memory Regions
{
  const s = S();
  addDiagramSlide(s, "FUNDAMENTALS", "JVM Memory Regions", "02-jvm-memory-regions",
    "Six buckets: Heap, Metaspace, Thread Stacks, Native, ByteBuffers, GC.");
  addNotes(s, `This diagram visualizes the six JVM memory regions and their relative sizes within a container's memory limit.

The heap (controlled by MaxRAMPercentage) is the largest region, but it's NOT the only one. The five off-heap regions — Metaspace, Thread Stacks, Native Memory, Direct ByteBuffers, and GC Bookkeeping — must fit in the remaining 25%.

This is the visual answer to "why 75% and not 90%": with 90%, the off-heap regions have only 10% to share. Metaspace alone can be 200MB on a Spring Boot app — that's 40% of a 512MB container.

Point to each region and give a rough size range. The audience should understand that "JVM memory" is not just "the heap."`);
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
  addNotes(s, `The key insight: requests and limits serve DIFFERENT purposes. Say it explicitly — most people think they're the same thing.

Left column — requests (scheduling guarantee):
- The Kubernetes scheduler uses requests to find a node with enough capacity. If you request 4GB but only use 1GB, you're wasting 3GB of schedulable capacity on that node.
- Set to P50 steady-state RSS: run your app under realistic load for 15-30 minutes, collect container_memory_rss from Prometheus, and use the P50 value.
- Too high: pods stay Pending because no node has enough free capacity. Too low: pods get scheduled on full nodes and experience CPU throttling under contention.

Right column — limits (hard ceiling):
- Memory limit exceeded = OOMKill (exit code 137). No warning, no graceful shutdown. The kernel cgroup OOM killer terminates the process immediately.
- CPU limit exceeded = throttled (not killed). The pod runs slower but stays alive. This is why CPU limits should be 2-4x the request — GC needs burst CPU capacity.
- Set memory limit 25-30% above P99 RSS to absorb GC allocation spikes and Metaspace growth.

Common anti-pattern: setting requests = limits. This gives Guaranteed QoS class (good for CPU Manager / real-time workloads) but leaves zero headroom for GC CPU bursts. For most Java workloads, Burstable QoS is actually better.

Demo 07 shows this analysis on a real 7-service cluster: 4 nodes to 2 nodes, $6,720/month saving.

Transition: "What does that look like visually? Next slide."`);
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
  addNotes(s, `Same node, same 16GB of RAM. The visual tells the story — let it breathe for a moment before explaining.

Left side — Before: 3 pods at 4GB each because every JVM was configured with -Xmx4g or MaxRAMPercentage=90. 4GB wasted (the dashed box). 75% node utilization. You need 4 nodes to run 12 pods.

Right side — After: 8 pods at 1.5GB each because each JVM correctly uses MaxRAMPercentage=75 with right-sized container limits. 94% utilization. You need 2 nodes for the same 12 pods.

The math: 2.7x more pods per node. Half the nodes. Half the cloud bill. This is the slide you show your manager when requesting time for JVM optimization work.

How to measure this for your own cluster:
1. kubectl top pods --containers to see actual RSS usage
2. Compare against resources.requests in your deployment specs
3. The gap between actual and requested is your waste

Common question from the audience: "What about memory spikes?" That's why limits are higher than requests. The 25-30% headroom above P99 RSS absorbs spikes. If P99 + 30% is still less than what you're currently requesting, you're overprovisioned.

Transition: "Bin-packing improves with right-sizing, but GC behavior can undo all of it. Section 03."`);
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
  addNotes(s, `Four cards, each a distinct container GC challenge. Walk through each:

Card 1 — CPU Throttling Extends GC: when a G1GC pause starts, GC threads need burst CPU. But if the pod is at its CPU limit, the kernel throttles those threads mid-collection. A 100ms pause on an unthrottled JVM becomes 400ms+ under throttle. Fix: set CPU limit to 2-4x the request so GC has burst headroom.

Card 2 — ParallelGCThreads Default: this is the most surprising one. Ask the audience: "How many GC threads does your JVM use?" Most don't know. The JVM defaults ParallelGCThreads to the number of CPUs it SEES — which is the host node's CPU count, not the container's CPU limit. On a 64-core node with a 4 CPU limit, you get 64 GC threads all fighting for 4 CPU slots. Fix: -XX:ParallelGCThreads=4 (match your CPU limit). This is a zero-cost, 5-minute fix that immediately improves GC pauses.

Card 3 — GC-Induced HPA Thrash: this is a feedback loop. GC pause -> CPU spike -> HPA sees high CPU -> scales out -> new pods start -> new pods run GC during warmup -> more CPU spikes -> more scale-out. Fix: scale on RPS (requests per second), not CPU.

Card 4 — Heap Sizing vs GC Pressure: small heap = frequent but short GC. Large heap = infrequent but long GC. MaxRAMPercentage=75 is the sweet spot for most workloads. Tune from there based on your GC pause histogram data.

The next slide shows the GC-HPA thrash cycle diagram.

Transition: "Which GC should you use? Next slide has the decision guide."`);
}

// SLIDE — Diagram: GC-Induced HPA Thrash Cycle
{
  const s = S();
  addDiagramSlide(s, "GC · CONTAINERS", "GC-Induced HPA Thrash Cycle", "01-gc-hpa-thrash-cycle",
    "GC pause → CPU spike → HPA scale-out → more GC → repeat.");
  addNotes(s, `This diagram shows the vicious cycle that happens when you combine GC pauses with CPU-based HPA autoscaling.

Walk through the cycle clockwise:
1. JVM Pod running normally.
2. GC pause fires — CPU spikes to 100% (the JVM is doing GC work, not application work).
3. HPA Controller sees CPU exceeding the threshold and decides to scale out.
4. New pods are created (+2 replicas).
5. New pods cold-start — they load classes, warm up the JIT, and do their own GC.
6. More GC across more pods → more CPU spikes → HPA sees more scaling signals.
7. The cycle repeats until you hit maxReplicas.

The fix: scale on RPS (requests per second), not CPU. GC pauses are an internal JVM event, not an indicator of actual load. Demo 02 shows this in practice.`);
}

// SLIDE 12 — GC Selection Guide
{
  const s = S();
  addContentTitle(s, "SECTION 03 · GC SELECTION", "GC Selection Guide");
  addStatusTable(s, [
    { code: "G1GC", name: "50–300ms pauses", purpose: "General purpose, Temurin/Corretto default. -XX:+UseG1GC -XX:MaxGCPauseMillis=200" },
    { code: "Shenandoah", name: "1–20ms pauses", purpose: "Available on Red Hat OpenJDK / UBI9. -XX:+UseShenandoahGC", codeColor: COLOR.red },
    { code: "ZGC (Gen)", name: "<1ms pauses", purpose: "Low-latency APIs, any heap size. -XX:+UseZGC -XX:+ZGenerational", codeColor: COLOR.svc },
    { code: "Serial GC", name: "STW", purpose: "CLI tools, batch, <256MB heap only. -XX:+UseSerialGC" },
  ], { colW: [1.80, 2.40, 7.89] });
  addCaption(s, "G1GC is the default everywhere. Shenandoah is available on Red Hat OpenJDK / UBI9 builds.");
  addNotes(s, `Walk through the table row by row. Each collector has a clear use case:

G1GC (50-300ms): the default on Temurin and Corretto images. Good general-purpose collector. Tunable via MaxGCPauseMillis. Best for workloads that can tolerate occasional 200-300ms pauses.

Shenandoah (1-20ms): available on Red Hat OpenJDK builds (UBI9 images). G1GC is still the default — you opt in to Shenandoah with -XX:+UseShenandoahGC. Uses Brooks pointers for concurrent compaction — lower pause than G1GC but slightly more CPU overhead. Good middle ground between G1GC and ZGC.

ZGC Generational (sub-1ms): the low-latency option. Pauses are constant regardless of heap size — a 4GB heap and a 64GB heap have the same sub-millisecond pause. The trade-off is a load barrier on every object reference (~5-15% throughput cost). Best for latency-sensitive APIs where P99 matters more than throughput.

Serial GC: only for CLI tools, batch jobs, or heaps under 256MB. Full stop-the-world collection. Never use this for a web service.

Decision heuristic from SRE with Java Microservices: monitor jvm_gc_pause_seconds via Micrometer. If your P99 GC pause exceeds 500ms, don't try to tune G1GC parameters — switch the algorithm to ZGC or Shenandoah. Algorithm selection beats parameter tuning every time.

Transition: "Once you've chosen a GC, here are the container-specific flags you need."`);
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
  addNotes(s, `Two columns: critical flags on the left, the Spring Boot deployment pattern on the right.

Left column — Critical Container Flags:
- ParallelGCThreads=4 and ConcGCThreads=2: match these to your CPU limit. This is the single most commonly missed flag. The JVM defaults ParallelGCThreads to the host's CPU count — on a 64-core node with a 2-CPU limit, you get 64 GC threads fighting for 2 CPU slots. The fix takes 5 minutes and immediately reduces GC pause duration by 30-50%.
- MaxGCPauseMillis=200: G1GC's target pause time. It won't always hit this, but it adjusts region sizes to try.
- ZGC needs NO tuning: just enable it. That's the entire configuration.

Right column — Spring Boot JAVA_OPTS Pattern:
- The key insight is the Dockerfile ENTRYPOINT pattern: java $JAVA_OPTS -jar app.jar. This reads JAVA_OPTS from the environment, which lets you override JVM flags at deploy time via Kubernetes env vars — no image rebuild needed.
- Different environments (staging vs production) can use different flags from the same image.
- NativeMemoryTracking=summary: enable this in staging to measure actual memory breakdown. Small overhead (~5%), but invaluable for right-sizing.

Transition: "GC is optimized. Now let's tackle the other big container pain point: startup time."`);
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
  addNotes(s, `This is where Spring Boot's architecture actually becomes an advantage for optimization. Walk through the left column:

Left column — Startup Breakdown:
- Class loading + verification (1.5-3s): Spring Boot loads 10,000-15,000 classes at startup — far more than build-time frameworks (~3,000-5,000). Every class must be read from the JAR, parsed, verified, and linked. This is THE bottleneck and exactly what AppCDS caches.
- Auto-configuration resolution (0.5-1.5s): Spring Boot evaluates hundreds of @Conditional annotations to decide which auto-configurations to activate. More dependencies = more conditions = more time.
- Bean instantiation and DI (1-2s): constructing the dependency injection graph, running @PostConstruct methods, initializing connection pools.
- Embedded Tomcat start (0.5-1s): starting the HTTP connector, SSL initialization, registering request handlers.
- Total: 4-8 seconds baseline for a typical Spring Boot microservice.

Right column — AppCDS Fix:
- 3-stage Dockerfile: builder (compile) -> trainer (dump CDS archive) -> runtime (use archive).
- spring.context.exit=onRefresh: this critical property tells Spring Boot to exit after the ApplicationContext refreshes. It ensures the training run loads ALL classes — without it, you miss the classes loaded during actual request handling.
- Result: 35-55% startup reduction. This is MUCH bigger than what build-time frameworks see from CDS (~5%) because Spring Boot loads far more classes at runtime.

Frame this positively: "Spring Boot's runtime architecture means CDS has more to cache. The bigger your app, the bigger the win."

The next slide shows the startup breakdown diagram.

Transition: "And you can go even further with virtual threads for the memory side."`);
}

// SLIDE — Diagram: Spring Boot Startup Breakdown
{
  const s = S();
  addDiagramSlide(s, "STARTUP", "Spring Boot Startup Breakdown", "08-spring-boot-startup-breakdown",
    "Class loading + auto-config dominate. AppCDS caches both.");
  addNotes(s, `This waterfall diagram breaks down where Spring Boot spends its startup time.

The bars show the major phases: JVM bootstrap, class loading, auto-configuration evaluation, bean initialization, and embedded Tomcat startup. Class loading and auto-configuration dominate — they account for 60-70% of total startup time.

This is WHY AppCDS gives Spring Boot 35-55% improvement — it caches the two biggest phases. Build-time frameworks like Quarkus do this work at compile time, so their runtime class loading is much smaller and CDS helps less (~5%).

Point to the class loading bar: "Spring Boot loads 10,000-15,000 classes. That's the opportunity."

Point to the auto-config bar: "Auto-configuration evaluates hundreds of conditions. With spring.context.exit=onRefresh, we capture all of it in the CDS archive."`);
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
  addNotes(s, `3-stage Dockerfile walkthrough:

Stage 1 — Builder: standard Maven build, nothing special. Same as any multi-stage Docker build.

Stage 2 — CDS Training: the training stage uses spring.context.exit=onRefresh — it loads all classes, evaluates all @Conditional annotations, creates all beans, then exits cleanly. The CDS dump captures every class that was loaded during this process. At runtime, -Xshare:on memory-maps the archive for near-instant class loading.

Stage 3 — Runtime: uses the slim runtime image with just the JAR and the CDS archive. The JAVA_OPTS pattern lets you override flags at deploy time.

This is a Dockerfile-only change with zero application code modifications.

Frame positively: "Spring Boot's runtime architecture means CDS has more to cache. The bigger your app, the bigger the win."`);
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
  addNotes(s, `JEP 444, finalized in Java 21. One property in Spring Boot enables it globally.

Left column — the code:
- Standard @RestController — no code changes needed. The virtual thread switch is entirely in configuration.
- spring.threads.virtual.enabled=true: this single property switches Tomcat's request executor, @Async methods, and @Scheduled tasks to virtual threads. No per-method annotations.

Right column — container sizing impact:
- Platform thread stacks: 1MB each, allocated OFF-heap. The heap metric never shows this memory. 200 threads = 200MB of invisible memory consumption.
- Virtual thread stacks: stored as continuations ON the heap. The GC manages them. You can run 10,000 concurrent I/O-bound tasks with minimal additional memory.
- The YAML snippet shows the concrete impact: a service that needed 512Mi for 200 platform threads can drop to 256Mi with virtual threads handling the same concurrency.

Important caveats to mention:
- synchronized blocks with I/O inside pin the carrier thread — use ReentrantLock instead. Spring Boot's own code has been updated for this, but third-party libraries may not be.
- Virtual threads are best for I/O-bound workloads (REST calls, database queries, file I/O). For CPU-bound work, platform threads are still better.
- Connection pools become the bottleneck: 10,000 virtual threads all wanting a database connection from a pool of 20. Size your pools with virtual threads in mind.

Transition: "We've tuned memory, GC, startup, and threads. How do we know it's working? Observability."`);
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
  addNotes(s, `"You can't tune what you can't see" — say this line. It's the section thesis.

Walk through each card:
- JFR (JDK Flight Recorder): built into every JDK, less than 1% overhead in production. Captures GC events, allocation profiles, I/O waits, and thread activity. Start it with jcmd pid JFR.start. The data goes to a .jfr file you analyze with JDK Mission Control or IntelliJ.
- Cryostat: OpenShift-native JFR management. The Kubernetes operator auto-discovers JVM pods and lets you start/stop recordings via a web UI. Add the io.cryostat annotation to your pod spec. Great for production profiling without kubectl exec.
- Actuator + Micrometer: the main observability stack for Spring Boot. Two Maven dependencies: spring-boot-starter-actuator and micrometer-registry-prometheus. All JVM metrics automatically exposed at /actuator/prometheus in Prometheus exposition format.
- Essential Metrics: jvm_gc_pause_seconds histogram is the most important. If P99 exceeds 500ms, switch GC. jvm_memory_used_bytes tracks heap + off-heap usage for right-sizing.

The callout at the bottom is the single most commonly missed configuration. Without percentiles-histogram.jvm.gc.pause=true, the Prometheus endpoint only exports a COUNTER (how many GC events) but not a HISTOGRAM (what the pause durations were). Your Grafana GC panels will show nothing.

The next slide shows the observability stack diagram.

Demo 02 shows all of this live with a Grafana LGTM stack.

Transition: "Here's the exact configuration — two dependencies, three lines."`);
}

// SLIDE — Diagram: Observability Stack
{
  const s = S();
  addDiagramSlide(s, "OBSERVABILITY", "Observability Stack", "09-observability-stack",
    "Actuator → Micrometer → Prometheus → Grafana. JFR + Cryostat as side channel.");
  addNotes(s, `This diagram shows the full observability pipeline for Spring Boot on Kubernetes.

Main path (left to right): Spring Boot Actuator exposes metrics via Micrometer. Prometheus scrapes /actuator/prometheus. Grafana visualizes the dashboards. This is the stack Demo 02 uses.

Side channel: JFR (Java Flight Recorder) captures low-overhead profiling data. Cryostat manages JFR recordings in Kubernetes — start, stop, download recordings without connecting directly to the JVM.

The two paths are complementary: Prometheus/Grafana gives you dashboards and alerting for operational monitoring. JFR/Cryostat gives you deep profiling data for root-cause analysis when something goes wrong.`);
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
  addNotes(s, `This is the "just copy this" slide. Two dependencies, three lines of properties. Say: "Take a photo of this slide."

Left column — application.properties:
- management.endpoints.web.exposure.include: expose only the endpoints you need. health and info for liveness/readiness probes, prometheus for metrics scraping, metrics for the JSON metrics API.
- percentiles-histogram.jvm.gc.pause=true: the critical line. Without this, Prometheus only gets a counter. With this, it gets histogram buckets that Grafana can render as percentile distributions. This is the difference between "GC happened" and "GC P99 was 800ms."
- management.metrics.tags.application: tags every metric with your Spring application name. When you have 10 microservices all scraping to the same Prometheus, this tag lets you filter per service in Grafana.

Right column — Maven dependencies:
- spring-boot-starter-actuator: provides the management endpoints (/actuator/*), health checks, and the metrics registry.
- micrometer-registry-prometheus: auto-configures the Prometheus exposition endpoint. No additional configuration needed — Micrometer detects the Prometheus registry on the classpath and exposes /actuator/prometheus automatically.

That's the entire setup. No custom code. No MetricsFilter beans. No custom HealthIndicators.

Common audience question: "What about distributed tracing?" Spring Boot 4.0 integrates Micrometer Tracing (formerly Spring Cloud Sleuth). Add micrometer-tracing-bridge-otel + the OTLP exporter for traces alongside metrics. Demo 02's LGTM stack receives both.

Transition: "Now that we can see what's happening, let's fix autoscaling."`);
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
  addNotes(s, `Walk through the YAML top to bottom:

minReplicas: 2 — NEVER set this to 1. With a single pod, any GC stop-the-world pause means 100% of your traffic drops. Two pods means one can pause while the other serves. This is the cheapest reliability improvement you can make.

scaleUp.stabilizationWindowSeconds: 120 — this absorbs GC-induced CPU spikes. Without it, a 300ms G1GC pause causes a CPU spike that HPA interprets as increased load, triggering a scale-out. The new pod starts, runs its own startup GC, causes another spike, and the cycle continues. The 120-second window says "wait 2 minutes before acting on scale-up signals" — long enough for any GC transient to pass.

scaleDown.stabilizationWindowSeconds: 300 — conservative scale-down prevents flapping. 5 minutes ensures traffic really has decreased before removing pods.

External metrics (http_requests_per_second, jvm_memory_used_ratio): scale on RPS, not CPU. GC pauses create CPU spikes that look like load to the metrics-server. RPS measures actual incoming traffic. The memory ratio metric provides a safety net — scale out at 80% memory utilization before OOMKill territory.

To use external metrics, you need either Prometheus Adapter or KEDA installed in the cluster. KEDA is simpler for Prometheus-based metrics. If the audience doesn't have either, they can still use the stabilization windows with the default CPU metric — that alone eliminates most GC-induced thrash.

Transition: "We've covered the what. Now let's talk about the how — systematic tuning."`);
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
  addNotes(s, `The 5-step workflow is on screen. Point to each step in order:

Step 1 — Instrument: add Actuator + Micrometer + Prometheus. Enable the GC pause histogram. This is the 30-minute setup from the previous slides.

Step 2 — Baseline: run your app under realistic load for 15-30 minutes. Capture P50 and P99 RSS, GC pause distribution, startup time, and thread count. This is your "before" snapshot. Without it, you can't prove any optimization worked.

Step 3 — Diagnose: look at the data. Is the problem memory (OOMKills, high RSS)? GC pauses (P99 > 500ms)? Startup time (cold start > 5s)? Thread count (200+ platform threads eating off-heap)?

Step 4 — Tune: change ONE flag. Not three. Not five. One. MaxRAMPercentage, ParallelGCThreads, AppCDS, virtual threads — pick the one that addresses your diagnosed bottleneck. If you stack five flags without measuring each one, you can't attribute any improvement to any specific flag — and worse, if something breaks, you don't know which flag caused it.

Step 5 — Validate: re-run the same load test. Compare against your baseline. If the metric improved, commit. If it didn't, revert. Data-driven decisions.

The stats at the bottom are specific to Spring Boot:
- 40-60% memory reduction from right-sizing (MaxRAMPercentage + container limits)
- 2-3x pod density per node from better bin-packing
- 35-55% startup reduction from AppCDS (larger than build-time frameworks because Spring Boot loads more classes)
- $$$ savings tracked per namespace via OpenShift Cost Management

Transition: "Here's the checklist — what to change, in what order."`);
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
  addNotes(s, `Walk through the table top to bottom. Emphasize the "Time" column — this is NOT a multi-sprint refactoring effort.

Row 1 — MaxRAMPercentage=75 + right-size (30 min): the highest-impact, lowest-effort change. Add the JVM flag to your JAVA_OPTS env var, adjust container resources.requests and resources.limits based on actual RSS measurements. 40-60% memory savings.

Row 2 — AppCDS multi-stage Dockerfile (2 hrs): the longest task because it requires restructuring the Dockerfile into 3 stages. But it's still a Dockerfile change — zero application code modifications. 35-55% faster startup, and the improvement compounds with more dependencies.

Row 3 — ParallelGCThreads = CPU limit (5 min): add one JVM flag. Literally the fastest fix in the talk. 30-50% shorter GC pauses.

Row 4 — spring.threads.virtual.enabled=true (1 min): one property in application.properties. 50% thread stack memory savings for I/O-bound workloads.

Row 5 — HPA on RPS (1 hr): requires Prometheus Adapter or KEDA, plus updating your HPA spec. Eliminates the GC-induced thrash cycle entirely.

Row 6 — GC pause histogram alerting (30 min): add the Prometheus property + create a PrometheusRule that alerts when GC P99 exceeds 500ms for 2 minutes.

The callout: ~4 hours total for one microservice. For a team with 10 services, budget two days. Most of the time is measuring (Steps 2 and 5 of the tuning workflow), not changing.

Say: "Every single row is a configuration change. No application code rewrites. No architectural redesign."

Transition: "Let's see these in action. Three live demos."`);
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
  addNotes(s, `Demo 01 is the foundational fix. Everything else in this talk builds on getting this right first.

Demo walkthrough:
1. cd demo-01-heap-sizing && ./demo.sh
2. The script builds two container images: one misconfigured (no container support), one correct (MaxRAMPercentage=75).
3. First container: point out the jcmd output showing MaxHeapSize based on HOST RAM (e.g., 16GB on your laptop). The JVM claimed far more than the 512MB container limit allows. It will OOMKill.
4. Second container: jcmd shows MaxHeapSize at ~384MB (75% of 512MB). The JVM correctly reads the cgroup limit and sizes itself proportionally.
5. Key moment: the OOMKill. Let the audience see exit code 137. Ask: "Has anyone seen this in production?" Most hands will go up.

Timing: 3-5 minutes. No external dependencies — just Podman.

If the demo fails (Podman not running, image pull timeout): fall back to the before/after jcmd output on the previous content slides. The concept is clear from the slides alone.`);
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
  addNotes(s, `Demo 02 brings in the full observability stack. This is the longest core demo — budget 8-10 minutes.

Demo walkthrough:
1. cd demo-02-gc-monitoring && ./demo.sh — starts the podman-compose stack (Spring Boot app + Prometheus + Grafana).
2. Open Grafana at http://localhost:3000 (admin/admin). Navigate to the pre-provisioned JVM dashboard.
3. Key moment #1: show the GC pause histogram panel. Without the percentiles-histogram property, this panel would be blank. Point it out: "This is the most commonly missed configuration."
4. Generate GC pressure: curl "http://localhost:8080/allocate?mb=50" then curl "http://localhost:8080/allocate?mb=100". Watch the Grafana dashboard update in real time — heap usage spikes, GC events appear, pause durations show in the histogram.
5. Key moment #2: show the three memory metrics — used vs committed vs max. Explain: used is what's actively occupied, committed is what the OS has allocated, max is the limit. Right-sizing targets used, not committed.
6. Virtual threads demo: curl "http://localhost:8080/threads?count=500". Show the thread count panel — 500 concurrent tasks but only a handful of platform threads visible. This is virtual threads in action.
7. Stop: podman-compose down.

If Grafana is slow to load: have the Prometheus endpoint as a fallback — curl http://localhost:8080/actuator/prometheus | grep jvm_gc_pause shows the raw histogram buckets.

Transition: "We can see GC. Now let's fix startup time."`);
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
  addNotes(s, `Demo 03 is the most visually satisfying demo — startup times printed side by side.

Demo walkthrough:
1. cd demo-03-appcds && ./demo.sh
2. The script builds two images: baseline (no CDS) and optimized (with AppCDS archive).
3. Show the Dockerfile: point out the 3 stages — builder, CDS trainer, runtime. The trainer stage uses spring.context.exit=onRefresh to capture the full class list, then dumps the CDS archive.
4. Run both containers. The output prints startup time for each.
5. Key moment: the side-by-side comparison. Baseline ~4-8 seconds, with AppCDS ~2-4 seconds. That's 35-55% reduction with zero code changes.
6. Explain why Spring Boot benefits more than build-time frameworks: Spring Boot loads 10,000-15,000 classes at startup (classpath scanning, auto-configuration, conditional evaluation). Build-time frameworks resolve most of this during compilation, so they only load 3,000-5,000 classes at runtime. More classes = more CDS benefit.

Frame this positively: "This is not a weakness of Spring Boot — it's an optimization opportunity. The more runtime work your framework does, the more CDS can cache. And with Leyden on JDK 25, the cache gets even richer."

Timing: 3-5 minutes including build time. If the build takes too long, pre-build the images.

Transition: "Those are the three core demos. Let's recap the key takeaways."`);
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
  addNotes(s, `Read each takeaway slowly. Pause after each one. This is the audience's callback — they should be mentally checking these against their own environments.

1. UseContainerSupport + MaxRAMPercentage: "How many of you are using hardcoded -Xmx today? That's the first thing to fix Monday morning."
2. Right-size first, then tune: "Measure RSS + off-heap with jcmd VM.native_memory before touching any JVM flags."
3. Match GC to workload: "G1GC is fine for most things. If your P99 pause exceeds 500ms, switch to ZGC or Shenandoah. Don't try to tune G1GC to get there."
4. AppCDS = 35-55% faster startup: "This is a Dockerfile change. Zero code modifications. The more dependencies your Spring Boot app has, the bigger the win."
5. Observe before you tune: "JFR, Cryostat, Actuator, Prometheus — pick your stack, but always have a baseline before making changes."
6. Autoscale on RPS not CPU: "GC pauses lie to HPA. Scale on requests per second. Enable virtual threads to reduce thread stack memory."
7. Quantify savings: "Track cost per namespace before and after. Show your manager the dollar number, not the technical improvement."

If you're short on time, emphasize takeaways 1, 4, and 7 — they have the highest impact-to-effort ratio.

Transition: "Resources on the next slide, then questions."`);
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
  addNotes(s, `Keep this slide up during Q&A. Point to the resources as relevant questions come up.

Resources to highlight:
- The GitHub repo has all 9 demos, the Reveal.js slides, 10 Excalidraw diagrams, and reference documentation. PRs welcome — especially if a demo breaks on a platform you're running.
- Optimizing Cloud Native Java (O'Reilly): the definitive reference for JVM performance in containers. Chapters 3-5 cover everything in this talk in depth.
- SRE with Java Microservices (O'Reilly): operational perspective — monitoring, alerting, capacity planning for Java services.
- Grafana Dashboard 4701: the JVM dashboard used in Demo 02. Import it into any Grafana instance connected to Prometheus.

Common Q&A questions and answers:
- "What about GraalVM Native Image?" — Native is a different trade-off: closed-world AOT, no reflection without configuration, but near-instant startup. Leyden stays on the JVM with full reflection support. Choose based on your constraints.
- "Does this work with Spring Boot 3.x?" — Yes, everything except the gRPC starter (which is 4.0+). The JVM flags, AppCDS, and Leyden are JDK features, not framework features.
- "What about Quarkus/Micronaut?" — All the JVM-level optimizations (MaxRAMPercentage, GC tuning, AppCDS) apply equally. The AppCDS improvement is smaller (~5%) because those frameworks load fewer classes at runtime.
- "Should I use ZGC in production?" — Yes, if your workload is latency-sensitive. ZGC has been production-ready since JDK 15 and generational ZGC since JDK 21.

If time remains, offer to show a bonus demo — Demo 04 (Leyden) or Demo 05 (gRPC) are the crowd favorites.`);
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
  addNotes(s, `Walk through the table — this is a timeline of Leyden's evolution:

JDK 24 (JEP 483): AOT class loading and linking. The JVM pre-loads and pre-links classes from the cache, skipping the verification and linking steps at startup. ~40% improvement.

JDK 25 LTS (JEP 514+515): the sweet spot. Adds ergonomic improvements (easier to use) and JIT method profiles (the cache stores which methods were hot during training, so the JIT compiler can start optimizing immediately at startup instead of waiting for profiling data). ~40-55% improvement.

JDK 26 (JEP 516): ZGC support. Currently you have to choose between Leyden and ZGC — JDK 26 removes that constraint. This is significant because ZGC is the preferred GC for latency-sensitive APIs.

Future: pre-compiled native code in the cache. The training run JIT-compiles hot methods and stores the native code in the cache. At startup, the JVM loads pre-compiled native code instead of interpreting. This is "instant peak performance" — no warmup period.

The callout explains the Spring Boot difference: unlike Quarkus (which wraps Leyden in quarkus.package.jar.aot.enabled=true), Spring Boot requires explicit -XX:AOTMode=record and -XX:AOTMode=create steps. That's more Dockerfile work but gives you full control over the training run.

The next slide shows the AOT cache progression diagram.

Leyden vs GraalVM Native: Leyden stays on the JVM — full reflection, dynamic loading, JIT compilation, all continue to work. GraalVM Native is the closed-world AOT option where you give up dynamic features for instant startup. Different trade-offs for different use cases.

Transition: "Let me show you the exact Dockerfile workflow."`);
}

// SLIDE — Diagram: AOT Cache Progression
{
  const s = S();
  addDiagramSlide(s, "LEYDEN · TIMELINE", "AOT Cache Progression", "03-aot-cache-progression",
    "CDS (JDK 10) → AppCDS (JDK 13) → Leyden (JDK 24-25).");
  addNotes(s, `This timeline diagram shows the evolution of class data sharing from basic CDS through to Project Leyden.

Walk through left to right:
- CDS (JDK 10): basic class data sharing for JDK classes only. Limited improvement.
- AppCDS (JDK 13): application class data sharing — includes your application and library classes. This is what Demo 03 shows. 35-55% startup reduction for Spring Boot.
- Leyden (JDK 24-25): the full AOT cache — includes CDS classes, application classes, JIT method profiles, and linking decisions. 40-55% startup reduction, and on JDK 25 it subsumes AppCDS entirely.

Each step in the progression caches MORE — the visual shows the cache growing richer at each stage.`);
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
  addNotes(s, `Walk through the Dockerfile left column, then the explanation right column.

Stage 1 — Compile: standard Maven build, nothing special. Same as any multi-stage Docker build.

Stage 2 — Train (the interesting part): two separate JVM invocations.
- First: -XX:AOTMode=record runs the app and captures which classes are loaded and which methods are hot into app.aotconf. The "sleep 15 && kill" pattern lets Spring Boot complete its auto-configuration, exercise bean creation, and then exit. In production Dockerfiles, you'd poll a health check endpoint instead of sleeping.
- Second: -XX:AOTMode=create reads the recorded profile and builds the AOT cache (app.aot). This step pre-compiles hot methods, pre-links classes, and stores everything in a single cache file.

Stage 3 — Runtime: just -XX:AOTCache=app.aot. The JVM reads the cache and skips class loading, linking, and JIT warmup for everything that was recorded.

Why this is more verbose than Quarkus: Quarkus wraps the record+create into its build plugin, so you get a single property toggle. Spring Boot gives you the raw JVM flags because Spring's plugin ecosystem doesn't yet wrap Leyden. This is actually an advantage for advanced users — you control the training run precisely.

The next slide shows the Leyden flow diagram.

Result: ~40-55% startup reduction. On JDK 25, Leyden subsumes AppCDS — you don't need both.

Transition: "Let's see this running. Demo 04."`);
}

// SLIDE — Diagram: Spring Boot Leyden Flow
{
  const s = S();
  addDiagramSlide(s, "LEYDEN · WORKFLOW", "Spring Boot Leyden Flow", "05-spring-boot-leyden-flow",
    "Compile → Train (record + create) → Runtime with AOT cache.");
  addNotes(s, `This diagram shows the three-stage Leyden workflow as a flow chart.

Stage 1 (Compile): standard Maven build, produces the JAR.
Stage 2 (Train): two JVM invocations — first with -XX:AOTMode=record to capture the profile, then -XX:AOTMode=create to build the cache.
Stage 3 (Runtime): the application starts with -XX:AOTCache=app.aot, loading the pre-built cache.

The key visual: the training stage has TWO steps (record then create), not one. This is the part that's more verbose than Quarkus's single-property approach, but it gives you full control over what gets cached.`);
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
  addNotes(s, `Demo 04 is a JDK 25 feature — the container uses eclipse-temurin:25.

Demo walkthrough:
1. cd demo-04-leyden && ./demo.sh
2. The script builds two images: baseline (no Leyden cache) and optimized (with AOT cache).
3. Show the Dockerfile and walk through the three stages — the training stage (record + create) is the key insight.
4. Run both containers. Compare startup times side by side.
5. Key moment: show the timing difference. Baseline ~4-8s, with Leyden ~2-3s. That's 40-55% reduction — similar to AppCDS but with richer caching (method profiles, linking decisions).

Important distinction: on JDK 25, Leyden subsumes AppCDS. The AOT cache includes everything CDS would cache plus JIT method profiles. You don't need both — Leyden replaces AppCDS.

If the demo fails (JDK 25 not available): fall back to the Dockerfile walkthrough. The concept is clear from the code. The audience needs to understand the record -> create -> runtime workflow, not see the timing numbers live.

Common question: "Will Spring Boot wrap this in a property like Quarkus does?" Answer: likely yes, in a future release. For now, the explicit flags give you full control.

Timing: 3-5 minutes. The build takes longer than AppCDS because of the two-step training.

Transition: "Next: gRPC. A different kind of optimization — wire format instead of JVM."`);
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
  addNotes(s, `Walk through the two columns side by side. This is about choosing the right protocol for inter-service communication inside a cluster.

REST / JSON (left column):
- HTTP/1.1 or 2 — most load balancers default to HTTP/1.1.
- JSON text body — human-readable but verbose. A typical JVM metrics payload is ~400 bytes in JSON.
- New connection per request (HTTP/1.1) or multiplexed (HTTP/2).
- Streaming requires separate mechanisms (SSE, WebSocket).
- curl-friendly and browser-native — great for external APIs and debugging.

gRPC / Protobuf (right column):
- HTTP/2 always — multiplexed, persistent connections.
- Binary Protobuf — the same JVM metrics payload is ~40 bytes. 10x smaller on the wire.
- Built-in streaming in 4 modes: unary, server-streaming, client-streaming, bidirectional.
- Needs specialized tools (grpcurl, ghz, Postman with gRPC support).
- Generated stubs provide type-safe clients — no hand-written HTTP clients.

The callout is critical — be honest about it: on localhost, gRPC unary is actually SLOWER than REST because network serialization cost is zero and HTTP/2 has higher connection setup overhead. The win shows in two scenarios: (1) high concurrency (c=500) where multiplexing beats connection-per-request, and (2) streaming where gRPC's built-in support is fundamentally better.

In production with pod-to-pod latency across nodes, gRPC wins 3-4x on throughput and 73% on P50 latency. The wire size difference matters when you're paying for network bandwidth.

The next slide shows the wire format comparison diagram.

Say: "Use REST for external APIs. Use gRPC for service-to-service inside the cluster."

Transition: "Spring Boot 4.0 makes gRPC first-class. Here's how."`);
}

// SLIDE — Diagram: gRPC vs REST Wire Format
{
  const s = S();
  addDiagramSlide(s, "gRPC · COMPARISON", "gRPC vs REST Wire Format", "07-grpc-vs-rest-wire",
    "JSON ~400 bytes vs Protobuf ~40 bytes. HTTP/1.1 vs HTTP/2.");
  addNotes(s, `This diagram visualizes the wire format difference between REST/JSON and gRPC/Protobuf side by side.

Left side: REST sends a JSON payload (~400 bytes for a JVM metrics response) over HTTP/1.1 with text headers. Right side: gRPC sends binary Protobuf (~40 bytes for the same data) over HTTP/2 with binary headers.

The 10x size difference is the key visual takeaway. In a cluster with hundreds of service-to-service calls per second, that 10x reduction translates directly to network bandwidth savings and lower latency.`);
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
  addNotes(s, `Walk through the left column (code) then the right column (configuration).

Left — Service Implementation:
- @GrpcService annotation — this is the Spring Boot equivalent of @RestController for gRPC. It auto-registers the service with the gRPC server, wires up dependency injection, and handles lifecycle. No manual gRPC ServerBuilder.
- The service extends the generated ImplBase class from protobuf-maven-plugin. The .proto file defines the contract; Maven generates the Java stubs.
- StreamObserver pattern: onNext() sends the response, onCompleted() signals end-of-stream. For server-streaming, you'd call onNext() multiple times before onCompleted().

Right — Configuration:
- One Maven dependency: spring-grpc-spring-boot-starter. This is new in Spring Boot 4.0 — it was previously a separate project (grpc-spring-boot-starter from various third parties). Now it's official.
- Two ports: REST on :8080 (Tomcat), gRPC on :9000 (Netty). Both run in the same JVM, same Spring context, same beans. This is the recommended pattern — don't force a choice between protocols.
- protobuf-maven-plugin generates the stubs at build time. The .proto file is the single source of truth for the API contract.

Why this matters for optimization: the same Spring Boot app can serve REST to external clients (browsers, mobile) and gRPC to internal microservices. You get the debugging friendliness of REST where you need it and the performance of gRPC where it counts.

Transition: "Let's see the performance difference. Demo 05."`);
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
  addNotes(s, `Demo 05 runs both REST and gRPC in the same Spring Boot app — same JVM, same beans, different protocols.

Demo walkthrough:
1. cd demo-05-grpc && ./demo.sh — starts the Spring Boot app with both endpoints.
2. Show the REST endpoint: curl http://localhost:8080/metrics — returns JSON (~400 bytes).
3. Show the gRPC endpoint: grpcurl -plaintext localhost:9000 metrics.MetricsService/GetJvmMetrics — returns Protobuf (~40 bytes).
4. Run the load test — hey for REST, ghz for gRPC. The script runs both with matching parameters (200 requests, 50 concurrent).
5. Key moment — the localhost caveat: gRPC unary will be SLOWER on localhost. Show it. Don't hide it. Explain: on localhost, network serialization cost is zero, so gRPC's binary encoding advantage disappears. HTTP/2 connection setup overhead actually makes it slower for single requests.
6. Now run at high concurrency (c=500): gRPC wins because HTTP/2 multiplexing handles concurrent requests on a single connection, while HTTP/1.1 needs connection-per-request.
7. Streaming comparison: the demo runs server-streaming (gRPC) vs repeated polling (REST). gRPC streaming is fundamentally better — single connection, push-based, backpressure built in.

Focus the audience on the wire size difference. In a cluster with hundreds of inter-service calls per second, 10x smaller payloads = 10x less network bandwidth. That translates directly to cost.

Timing: 5-7 minutes. If ghz is not installed, fall back to grpcurl for manual comparison.

Transition: "Now let's talk about latency at a deeper level — the garbage collector."`);
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
  addNotes(s, `This slide is the theoretical foundation for Demo 06. Walk through each column.

G1GC — Default (left column):
- Young GC pause: 10-200ms — this is the pause your P99 latency sees most often. Most requests survive it, but some get caught in the pause.
- Mixed GC: 50-500ms — G1GC pauses the application to collect both young and old regions. This is where SLA violations happen.
- Full GC (worst case): 1-10 seconds. This is the catastrophic scenario — the JVM stops everything to compact the entire heap. Usually happens when heap is under-sized or allocation rate is extreme.
- Key insight: G1GC pauses SCALE with heap size. Bigger heap = longer pauses. This creates a perverse incentive in containers: you want more heap for your app, but more heap means longer GC pauses.
- The HPA connection: a G1GC Full GC looks like a CPU spike to Kubernetes. HPA sees "CPU at 100%" and scales out. The new pod starts, also needs to warm up, also GC pauses... and you get the thrash cycle from Slide 8.

ZGC Generational — JDK 21+ (right column):
- All pauses under 1ms — regardless of heap size. This is the breakthrough. 1GB heap or 16TB heap — same pause time.
- Load barrier overhead: 5-15% throughput cost. ZGC trades throughput for latency. Every object reference load goes through a barrier that checks if the object has been relocated. This is the price you pay.
- Smooth CPU profile: no spikes, no HPA false triggers.

The trade-off is clear: G1GC gives you maximum throughput, ZGC gives you predictable latency. If your SLA is "P99 under 50ms," ZGC is the only way to guarantee it on the JVM.

Say: "Don't try to tune G1GC to get sub-millisecond pauses. Switch to ZGC."

Transition: "Let me show you the difference. Demo 06 runs both side by side."`);
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
  addNotes(s, `Demo 06 is the visual proof of the previous slide's theory. Same app, same heap, same load — different GC.

Demo walkthrough:
1. cd demo-06-latency && ./demo.sh — starts the podman-compose stack with two Spring Boot containers (G1GC on :8080, ZGC on :8081) plus Prometheus and Grafana.
2. Open Grafana at http://localhost:3000. Navigate to the JVM dashboard.
3. Generate allocation pressure: curl "http://localhost:8080/pressure?mb=50" for G1GC, curl "http://localhost:8081/pressure?mb=50" for ZGC.
4. Key moment #1: the GC pause histogram panel. G1GC shows pauses in the 50-500ms buckets. ZGC shows pauses in the sub-1ms bucket. The visual difference is dramatic.
5. Key moment #2: increase pressure — curl "http://localhost:8080/pressure?mb=100". G1GC pauses get LONGER as allocation rate increases. ZGC pauses stay sub-1ms. This is the "pauses scale with heap" insight in action.
6. Show the CPU profile panel: G1GC shows spikes during GC events. ZGC shows a smooth, flat CPU line. Ask: "Which one would HPA react to?"
7. Stop: podman-compose down.

The honest throughput caveat: run hey against both endpoints. ZGC will show 5-15% lower raw throughput. That's the load barrier cost. But the P99 latency will be dramatically better. Ask the audience: "Would you trade 10% throughput for guaranteed sub-millisecond GC pauses?"

Timing: 5-7 minutes including Grafana exploration.

If Grafana is slow: use the Prometheus endpoint directly. curl http://localhost:8080/actuator/prometheus | grep jvm_gc_pause shows the raw histogram.

Transition: "We've optimized the JVM. Now let's optimize the bill."`);
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
  addNotes(s, `This is the "convince your manager" slide. The big number at the top — $80,640 — is annual savings from a single cluster.

Walk through the four cards:

1. Direct savings: 2 nodes eliminated from a 4-node cluster. Monthly cost drops from $1,120 to $560. That's $6,720/year from fewer nodes alone. The node reduction comes from better pod density — right-sizing JVM memory means each pod needs less, so more pods fit per node.

2. Engineering cost: ~4 hours of work (the checklist from the previous slide). At a loaded engineering rate of ~$100/hour, that's $400 of engineering time for $6,720 in savings. 17x ROI. This is an easy business case to make.

3. Indirect benefits: HPA stops thrashing (no more GC-induced false scale-outs), VPA recommendations become trustworthy (because memory usage is now predictable), and alert thresholds can be set correctly (because you have a baseline).

4. At scale: if your organization has 10 clusters, multiply. $67,200/year. For larger enterprises with 50+ clusters, this is a six-figure annual saving from configuration changes. OpenShift Cost Management (or Kubecost, or cloud provider cost tools) tracks the before/after.

Tailor to the audience:
- Engineers: focus on cards 1 and 3 (the technical improvements).
- Managers/directors: focus on the headline number and card 2 (the ROI).
- Platform/SRE teams: focus on card 4 (the at-scale multiplication).

Say: "This is not a multi-quarter migration project. It's an afternoon of configuration changes with measurable dollar impact."

Transition: "Demo 07 shows exactly how to calculate this for your workloads."`);
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
  addNotes(s, `Demo 07 is the "money slide" demo — literally. No containers needed, just Python.

Demo walkthrough:
1. cd demo-07-rightsizing && python3 analyze.py
2. The script analyzes 7 workload profiles: API gateways, batch processors, event consumers. These represent real workload archetypes, not toy examples.
3. Walk through the output:
   - Current state: 4 nodes, each workload over-provisioned (requests too high, limits too generous).
   - Recommended state: specific resources.requests and resources.limits for each workload based on actual usage patterns.
   - After right-sizing: 2 nodes handle the same workloads. +67% pod density.
4. Key moment: the confidence intervals. The script doesn't just give you a number — it shows P50, P95, and P99 of actual memory usage, so you can set requests at P95 and limits at P99. This is data-driven right-sizing, not guessing.
5. Show the cost calculation: $1,120/month → $560/month = $6,720/year. For 10 clusters: $67,200/year.

The audience takeaway: you can run this analysis on your own workloads. Export Prometheus metrics (container_memory_usage_bytes, container_cpu_usage_seconds_total) for the last 7 days, feed them to a similar script, and get specific recommendations.

Common question: "What about traffic spikes?" Answer: that's what HPA handles. Right-sizing sets the per-pod baseline; HPA scales horizontally for demand. They're complementary, not competing.

Timing: 3-5 minutes. Very fast demo — no build, no containers, just Python output.

Transition: "Let's look at some cutting-edge JDK features. Project Panama."`);
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
      "sun.misc.Unsafe: private API, breaks each JDK",
    ],
    [
      "✅ Panama FFM (JDK 22 — finalized)",
      "Arena-managed memory (try-with-resources)",
      "MethodHandle + Linker replaces javah",
      "Zero leaks by construction",
      "Java-native stack traces preserved",
    ], { fontSize: 15 });
  addNotes(s, `This slide compares JNI (left) with Panama FFM (right). The contrast is dramatic.

JNI (left column — 1996):
- Three files to call one native function: Java class, C header (generated by javah), C implementation. Each platform/architecture needs its own compiled native library.
- Manual native memory management — if you allocate with malloc() in your JNI code and forget to free, the JVM leaks native memory. These leaks don't show up in heap dumps. They kill the JVM with an OS-level OOMKill.
- JNI crash = no Java stack trace. The JVM just dies. You get a hs_err_pid.log with a native stack trace that's useless unless you have the C debugging symbols.
- sun.misc.Unsafe: the unofficial escape hatch for native memory access. Private API, breaks with every JDK release, removed in JDK 23.

Panama FFM (right column — finalized JDK 22):
- Pure Java. No C headers, no C wrappers, no native compilation step.
- Arena-managed memory: the key safety feature. Arena.ofConfined() creates a scope. Everything allocated in the arena (MemorySegment) is freed when the arena closes. If you use try-with-resources, you CANNOT leak native memory. Period.
- allocateFrom() — note the method name. During the preview period it was called allocateArray(). The API was renamed at GA. If you see old blog posts using allocateArray(), they're out of date.
- MethodHandle invocation: you look up the native function via Linker.nativeLinker(), get a MethodHandle, and invoke it. Type-safe, inspectable, and the JIT can inline the call.

No --enable-preview required on JDK 22+. This is production-ready.

The next slide shows the FFM call chain diagram.

Transition: "Here's how it looks inside a Spring Boot app."`);
}

// SLIDE — Diagram: Panama FFM Call Chain
{
  const s = S();
  addDiagramSlide(s, "PANAMA · FFM", "Panama FFM Call Chain", "10-panama-ffm-call-chain",
    "Java → Arena → MemorySegment → MethodHandle → Native C++.");
  addNotes(s, `This diagram shows the complete FFM call chain from Java through to native code.

Walk through left to right: Java code creates an Arena, allocates a MemorySegment, looks up the native function via Linker to get a MethodHandle, and invokes it. The Arena boundary is the safety guarantee — everything inside is freed when the Arena closes.

Compare this with JNI where you'd need: Java class → javah header → C implementation → JNI_OnLoad → manual malloc/free. The FFM chain is pure Java, type-safe, and leak-proof.`);
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
  addNotes(s, `Walk through the left column (Spring Boot controller) then the right (Dockerfile).

Left — Spring MVC Controller:
- The Panama FFM code is pure JDK API — no framework-specific abstraction. It works identically in Spring Boot, Quarkus, Micronaut, or plain Java. Spring Boot just provides the @RestController wrapper.
- The MethodHandle fields (computeP99, getSystemLoad) are initialized once at bean construction time via Linker.nativeLinker(). The lookup is expensive, but the handle is reusable.
- Each request gets its own Arena.ofConfined(). This means each request's native memory is isolated and freed when the request completes. No shared state, no leaks, no concurrency issues.
- The result MemorySegment is read with result.get(JAVA_DOUBLE, 0) — typed access, no casting, no pointer arithmetic.

Right — 3-Stage Dockerfile:
- Stage 1 (UBI9): compiles the C++ library. UBI9 provides gcc-c++ and cmake. The output is a shared library (libjvmstats.so).
- Stage 2 (Temurin 25): builds the Java app. Standard Maven build.
- Stage 3 (Temurin 25 JRE): copies both the .so from Stage 1 and the .jar from Stage 2. Minimal runtime image.

This is a common pattern for Panama FFM apps: the C/C++ compilation happens in the container build, not on the developer's machine. Developers write Java code and the Dockerfile handles cross-compilation.

Container sizing note: the native library loads into native memory. If you're doing heavy native memory allocation (large arrays, many concurrent requests), reduce MaxRAMPercentage to leave room.

Transition: "Let me show you this running. Demo 08."`);
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
  addNotes(s, `Demo 08 is a JDK 25 demo — the container uses eclipse-temurin:25.

Demo walkthrough:
1. cd demo-08-panama && ./demo.sh
2. The script builds the 3-stage container: C++ compilation → Java build → runtime.
3. Show the native C++ code briefly: a statistics library that computes P99, standard deviation, and system load. This is compute-intensive work that benefits from native execution speed.
4. Show the REST endpoints:
   - curl http://localhost:8080/panama/stats — returns P99 and standard deviation computed by the C++ library.
   - curl http://localhost:8080/panama/system — returns system load via native calls.
5. Key moment: explain Arena-managed memory. Open the PanamaController source. Show the try-with-resources pattern. Ask: "What happens if an exception is thrown before the Arena closes?" Answer: the Arena still closes — that's the try-with-resources guarantee. Zero leaks by construction.
6. If time allows, show the MethodHandle setup code. The Linker.nativeLinker() call, the FunctionDescriptor that describes the C function signature, and the downcallHandle that creates the callable handle.

Why this matters for optimization: if you have performance-critical computation (ML inference, signal processing, compression, cryptography), you can call optimized C/C++ code from Java without the pain of JNI. The JIT can even inline across the FFM boundary in some cases.

Timing: 5-7 minutes. The build takes longer because of C++ compilation.

If the build fails (missing gcc-c++ in UBI9): the demo Dockerfile installs it via dnf. If there's a network issue pulling UBI9, fall back to the code walkthrough.

Transition: "Next up: AI inference without a Python sidecar."`);
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
  addNotes(s, `Walk through the left column (code) then the right column (why).

Left — Spring Boot Configuration:
- @Configuration + @Bean: the ONNX embedding model becomes a standard Spring bean. You can inject it anywhere, test it with mocks, scope it as a singleton (which it should be — model loading is expensive).
- OnnxEmbeddingModel takes two files: the .onnx model file and the tokenizer.json. Both are bundled in the Maven dependency — no manual downloads, no model registry, no file management.
- The REST controller is trivial: inject the model, call embed(), return the vector. LangChain4j handles tokenization, ONNX Runtime handles inference.

Right — Why ONNX on the JVM:
- No Python sidecar: this is the headline benefit. A typical ML inference setup requires a Python service (Flask/FastAPI + torch/transformers), separate container, separate deployment, separate monitoring. With ONNX on the JVM, it's all one deployment unit.
- CPU inference — no GPU required: MiniLM-L6-v2 has only 22 million parameters. It runs inference in ~30ms on a modern CPU. For embedding-based search, classification, and RAG retrieval, this is fast enough.
- Single deployment unit: one container, one health check, one set of resource requests/limits, one log stream. Operational simplicity.

The callout is critical for this talk: the ONNX model loads into native memory (~100MB for MiniLM-L6-v2), OUTSIDE the JVM heap. If you're using MaxRAMPercentage=75, your total memory consumption is 75% heap + 100MB ONNX model + thread stacks + other off-heap. That can exceed the container limit. Drop MaxRAMPercentage to 65% to leave room.

This connects back to Slide 5 (JVM Memory Regions): the ONNX model is in the "Native Memory" region, not the heap.

Transition: "Let me show you this in action. Demo 09."`);
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
  addNotes(s, `Demo 09 is a JDK 25 demo — the final bonus demo. The punchline: AI inference as a single Spring Boot deployment unit.

Demo walkthrough:
1. cd demo-09-onnx && ./demo.sh
2. The app takes longer to start than usual — the ONNX model loads at bean initialization time (~100MB into native memory). Point this out: "Notice the startup time. The model loading is the cost you pay once."
3. Show the /embed endpoint: curl -X POST http://localhost:8080/onnx/embed -H "Content-Type: text/plain" -d "Spring Boot optimization". Returns a 384-dimensional float vector.
4. Show the /similarity endpoint: compare two sentences semantically. "Spring Boot performance" vs "JVM optimization" should show high similarity. "Spring Boot performance" vs "chocolate cake recipe" should show low similarity.
5. Key moment: the /benchmark endpoint. curl http://localhost:8080/onnx/benchmark — runs 100 embeddings and reports average latency. Expect ~30ms per embedding on CPU. Ask: "Is 30ms fast enough for your use case?" For most RAG and search applications, yes.
6. Memory observation: curl http://localhost:8080/actuator/prometheus | grep jvm_memory. Show that heap usage is normal but process RSS is higher than expected — that's the ONNX model in native memory.

Connect back to container sizing: if your container limit is 512MB and MaxRAMPercentage is 75%, that's 384MB heap + 100MB ONNX model = 484MB. Add thread stacks and GC bookkeeping, and you're over the limit → OOMKill. Solution: reduce MaxRAMPercentage to 65% or increase the container limit.

Timing: 3-5 minutes. Fast demo once the app is running.

Transition: "One more future-looking topic: Project Valhalla."`);
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
  addNotes(s, `Valhalla is the "patience project" of the JVM — 10+ years in development, and it changes something fundamental about how Java stores objects in memory.

Walk through the two code examples at the top:

Today — record Point(double x, double y):
- Every Point object has an 8-byte header (mark word + klass pointer).
- In a List of 1 million Points: 1M headers x 8 bytes = 8MB of pure overhead.
- Every Point is a separate heap object, GC-tracked, allocated individually.
- In an array, you store pointers to Points, not the Points themselves. Cache misses on every access because the data is scattered across the heap.

Valhalla — value class Point:
- No header. x and y are stored inline, densely packed: x0,y0,x1,y1,x2,y2...
- In a List of 1 million Points: zero overhead. Just the raw doubles.
- GC never sees value types — they're not heap objects. Zero GC pressure from Point allocation.
- Cache-friendly: sequential memory access, L1/L2 cache lines stay hot, SIMD-friendly layout.

Walk through the four cards:

1. Memory: List<double> (Valhalla) uses 1x storage. List<Double> (today) uses 3x. For Spring Boot apps with large in-memory caches, this cuts pod memory requests by up to 50%.

2. GC Pressure: value types produce zero heap allocations. If your DTOs and query results are value types, GC has dramatically less work. HPA stays quiet because there are no GC-induced CPU spikes.

3. Cache Performance: sequential memory means the CPU prefetcher works efficiently. For data-heavy Spring Boot apps (analytics, time-series, financial calculations), this is a significant throughput improvement.

4. Timeline: Preview in JDK 25+. Universal generics (List<int> instead of List<Integer>) come after primitive classes land. Stable around JDK 27-29.

Say: "You don't need to rewrite your app. When Valhalla lands, change 'record' to 'value class' for your data types, and the JVM does the rest."

Transition: "Before we wrap up, let's make sure you're not falling into common anti-patterns."`);
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
      { text: "❌ No stabilizationWindowSeconds", sub: true },
    ],
    [
      "🚀 Startup / CDS",
      { text: "❌ No spring.context.exit=onRefresh in training", sub: true },
      { text: "❌ Missing -Xshare:on at runtime", sub: true },
      { text: "❌ CDS archive from different JDK version", sub: true },
      { text: "❌ No AppCDS despite 4-8s startup", sub: true },
      "👁 Observability",
      { text: "❌ No GC pause histogram configured", sub: true },
      { text: "❌ Missing Actuator Prometheus endpoint", sub: true },
      { text: "❌ Tuning JVM flags without baseline", sub: true },
    ], { fontSize: 13 });
  addNotes(s, `This is the "audit checklist" slide. Walk through each quadrant and ask for a show of hands.

Memory (top-left):
- Hardcoded -Xmx/-Xms: "How many of you have -Xmx512m hardcoded in a Dockerfile right now?" Usually 60%+ of the room. This ignores container limits entirely.
- MaxRAMPercentage=90: slightly better — at least it's proportional — but 90% starves off-heap (Metaspace, thread stacks, native memory, GC bookkeeping). The OOMKill happens outside the heap and the JVM doesn't know why.
- No MaxMetaspaceSize: Metaspace grows unbounded. In Spring Boot apps with many auto-configuration classes, this can silently consume 200-300MB.

GC & CPU (top-right):
- Default ParallelGCThreads on large nodes: on a 64-core node, the JVM creates 64 GC threads even if your pod has a 2-core CPU limit. Those 64 threads fight for 2 cores, and GC pauses explode.
- CPU-based HPA with Java: covered in Slide 8 — GC pauses look like CPU spikes. HPA scales on false signals.
- minReplicas: 1 in HPA: if the single pod is in a GC pause when traffic arrives, all requests queue. Minimum 2 replicas for any production Java workload.
- No stabilizationWindowSeconds: without a cooldown, HPA oscillates — scale up, scale down, scale up, scale down — every time a GC pause triggers and resolves.

Startup / CDS (bottom-left):
- No spring.context.exit=onRefresh: this is Spring Boot-specific. Without it, the CDS training run doesn't exercise auto-configuration, conditional evaluation, or bean creation. You miss half the classes and your CDS improvement drops from 35-55% to 10-15%.
- Missing -Xshare:on: without this flag, the JVM silently falls back to no-CDS mode if the archive is missing or incompatible. You think you have CDS, but you don't.
- CDS archive from different JDK version: CDS archives are JDK-version-specific. If you build with JDK 21.0.3 and run with JDK 21.0.4, the archive may be silently ignored.

Observability (bottom-right):
- No GC pause histogram: without management.metrics.distribution.percentiles-histogram.jvm.gc.pause=true, you can't see GC pause distributions.
- Missing Actuator Prometheus endpoint: the metrics exist but they're not exposed. One property.
- No PrometheusRule: you have the data but no alerting. GC P99 exceeds 500ms for 2 minutes → page someone.
- Tuning without baseline: the cardinal sin. If you don't measure before changing flags, you don't know if your change helped or hurt.

The next slide shows the anti-patterns vs fixes diagram.

Transition: "Here's how to fix every single one of these."`);
}

// SLIDE — Diagram: Anti-Patterns vs Fixes
{
  const s = S();
  addDiagramSlide(s, "ANTI-PATTERNS", "Anti-Patterns vs Fixes", "06-anti-patterns-vs-fixes",
    "16 anti-patterns across Memory, GC, Startup, and Observability.");
  addNotes(s, `This diagram provides a visual summary of all 16 anti-patterns and their fixes in a two-column layout.

Walk through it row by row — left side (red) is the anti-pattern, right side (green) is the fix. The audience can photograph this as a quick-reference card.

The four sections match the previous two slides: Memory, GC & CPU, Startup / CDS, and Observability. Use this as a review if you went through the text slides quickly.`);
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
      { text: "→ stabilizationWindowSeconds: 120", sub: true },
    ],
    [
      "✅ Startup / CDS Fixes",
      { text: "→ spring.context.exit=onRefresh for training", sub: true },
      { text: "→ -Xshare:on in ENTRYPOINT (fail if archive missing)", sub: true },
      { text: "→ Pin JDK minor version in Dockerfile FROM", sub: true },
      { text: "→ Use 3-stage Dockerfile for AppCDS (Demo 03)", sub: true },
      "✅ Observability Fixes",
      { text: "→ percentiles-histogram.jvm.gc.pause=true", sub: true },
      { text: "→ management.endpoints.web.exposure.include=prometheus", sub: true },
      { text: "→ Baseline first. Change one flag. Measure again.", sub: true },
    ], { fontSize: 13 });
  addNotes(s, `This slide mirrors the previous anti-patterns slide — same four quadrants, but now with the fixes. Every fix is a drop-in change.

Memory Fixes (top-left):
- UseContainerSupport + MaxRAMPercentage=75.0: the single most impactful flag combination in this entire talk. Add it to JAVA_OPTS or JAVA_TOOL_OPTIONS in your Dockerfile. 30 seconds.
- 75%, not 90%: the 25% headroom covers Metaspace (~150-250MB for Spring Boot), thread stacks (~1MB per platform thread x 200 default Tomcat threads), direct ByteBuffers, GC bookkeeping, and the JVM's own native memory.
- MaxMetaspaceSize=256m: puts a ceiling on Metaspace growth. If your app exceeds this, you get an OutOfMemoryError with a clear message instead of a silent OOMKill.

GC & CPU Fixes (top-right):
- ParallelGCThreads=N where N equals your CPU request: if your pod requests 2 cores, set ParallelGCThreads=2. The JVM won't create more GC threads than it has cores to run them on.
- HPA on RPS via KEDA or Prometheus Adapter: scale on actual request throughput, not CPU utilization. KEDA is easier to set up; Prometheus Adapter is more flexible.
- minReplicas: 2 minimum: always have a hot standby for a Java workload. Cold start + class loading + JIT warmup means a single pod takes 5-10 seconds to handle traffic efficiently.
- stabilizationWindowSeconds: 120: HPA waits 2 minutes before scaling down. This prevents oscillation during normal GC activity.

Startup / CDS Fixes (bottom-left):
- spring.context.exit=onRefresh: tells Spring Boot to exit immediately after the ApplicationContext is fully refreshed. This is the training run — it loads all classes, evaluates all conditions, creates all beans, then exits cleanly. The CDS dump captures everything.
- -Xshare:on (not auto): "on" means "fail if the archive is missing." "auto" means "silently skip CDS if the archive is missing." You want to know immediately if CDS is broken.
- Pin JDK minor version: use eclipse-temurin:21.0.3 not eclipse-temurin:21. CDS archives are version-specific.
- Use 3-stage Dockerfile for AppCDS (Demo 03): builder → CDS trainer → runtime. The trainer stage captures the full class list.

Observability Fixes (bottom-right):
- percentiles-histogram: one line in application.properties. Enables the histogram buckets that Grafana needs to show P50/P95/P99 GC pause distributions.
- endpoints.web.exposure.include=prometheus: exposes the /actuator/prometheus endpoint for Prometheus scraping.
- PrometheusRule: a Kubernetes custom resource that triggers an alert. GC P99 > 500ms for 2 consecutive minutes → page the on-call engineer.
- Baseline → change → measure: the golden rule. Never change two flags at once. You won't know which one helped.

Say: "Take a photo of this slide. It's your Monday morning checklist."

This is a natural closing point for the bonus slides. If there are more questions, loop back to the Q&A slide.`);
}

// ═══════════════════════════════════════════════════════════════════════
// Build
// ═══════════════════════════════════════════════════════════════════════
console.log(`Total slides: ${pageNum}`);
pres.writeFile({ fileName: OUT })
  .then(p => console.log("WROTE", p))
  .catch(e => { console.error(e); process.exit(1); });
