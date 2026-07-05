# Presenter Guide — Taming the JVM: Optimizing Spring Boot on OpenShift & Kubernetes
## Speaker Notes & Timing Cues

---

## Session Overview

**Total time:** 60 minutes  
**Format:** 50 min talk + 10 min Q&A (or 45 min + 15 min if audience is interactive)  
**Target:** Java developers and platform engineers with some Kubernetes exposure  
**Tone:** Engineering-first, data-driven, hands-on  
**Framework:** Spring Boot 4.0.5  
**JDK:** Java 21 (core demos) + JDK 25 LTS (bonus demos 04, 08, 09)

---

## Slide-by-Slide Notes

---

### SLIDE 1 — Title (0:00–1:00)

**Say:**
> "If you've deployed Java to Kubernetes and wondered why your pods keep getting OOMKilled,
> why autoscaling fires at 3am for no apparent reason, or why your startup time is 8 seconds
> when your Golang colleagues ship in 50ms — this talk is for you.
> Everything we cover today is based on two O'Reilly books and real production incidents.
> We're using Spring Boot 4.0.5 — the latest release — with Java 21 and JDK 25 LTS."

**Transition:** "Let's look at what we're covering and where the demos fit."

---

### SLIDE 2 — Agenda (1:00–2:00)

**Say:**
> "Seven topics, three live demos. Each section builds on the previous one —
> we go from 'how does the JVM even see memory in a container' all the way to
> 'here's how to show your CFO you saved money.' The demos are runnable right now
> on your laptop — all Podman, no Kubernetes cluster needed."

**Point out:** The bonus card — demos 04-09 for extended sessions or self-study.

---

### SLIDE 3 — The Problem (2:00–4:00)

**Say:**
> "Before we tune anything, let's understand why this is hard. The JVM was designed
> in 1995 for a world where you owned the whole machine. Kubernetes is a world where
> you own 512 megabytes of a shared machine. These two worlds collide badly.
>
> Spring Boot's 4-8 second cold start comes from classpath scanning, auto-configuration,
> and bean initialization — all at runtime. That's actually good news for us, because
> AppCDS and Leyden have more work to cache."

**Anecdote option:**
> "I've seen a team running 3 Spring Boot pods on a 16GB node — each claiming a 4GB
> heap — meaning 12GB reserved for JVM processes that actually used 600MB each.
> Same application, properly tuned: 8 pods on the same node."

---

### SLIDE 4 — Container-Native JVM Fundamentals (4:00–8:00)

**Key point to emphasize:**
> "UseContainerSupport is ON by default in Java 21. But MaxRAMPercentage is NOT set
> to a sensible value by default — it's 25%, which is too conservative.
> The first flag you add to every Java container is MaxRAMPercentage=75."

**Live check for audience:**
> "Quick show of hands — how many of you explicitly set MaxRAMPercentage in your
> Kubernetes deployments today?" [Usually <30%]

**Explain the code block:**
- Left column: the BEFORE — hardcoded -Xmx breaks when VPA changes limits
- Right column: the AFTER — reads cgroup dynamically, scales with container

**cgroup v2 note:**
> "If you're on RHEL 9 or OCP 4.14+, you're on cgroup v2. Java 15+ handles this correctly."

---

### SLIDE 5 — JVM Memory Regions (8:00–10:00)

**The key misconception to bust:**
> "People set MaxRAMPercentage=90 thinking 'more heap = better'.
> But heap is only ONE of six memory regions the JVM uses.
> Spring Boot loads more classes than build-time frameworks, so Metaspace is on the
> higher end — typically 80-250MB. Setting the heap to 90% starves Metaspace,
> and you'll OOMKill during class loading."

**Virtual Threads callout:**
> "Java 21's Virtual Threads change the thread stack budget entirely.
> With platform threads, 200 threads × 1MB stack = 200MB off-heap.
> With virtual threads, those stacks live in heap as small continuations."

---

### SLIDE 6 — Right-Sizing (10:00–12:00)

**Requests vs Limits framing:**
> "Think of requests as your SLA to the scheduler: 'I promise I'll use at least this much.'
> Think of limits as your circuit breaker: 'Kill me if I exceed this.'
> Most teams set them equal. That's wrong. Your limit should be 25-30% above your
> P99 usage — enough buffer for a GC surge without triggering OOMKill."

**Formula walkthrough:**
- Walk through the sizing rules slowly
- Stress the `jcmd VM.native_memory summary` command — it's the ground truth

**Resource redistribution (from Bruno Borges, InfoQ Dev Summit):**
> "Borges showed that consolidating from 6 small replicas to 2 larger replicas
> (6 CPU → 4 CPU, 6GB → 4GB) improved BOTH throughput AND latency. Fewer,
> better-resourced JVMs outperform many starved ones."

**Startup resource spike:**
> "A fresh JVM needs 2-4× more CPU than at steady state — class loading, JIT,
> and Spring auto-config all spike simultaneously. This is why CPU limits should
> be 2-4× requests. The burst headroom absorbs both GC spikes AND startup spikes."

---

### SLIDE 7 — Pod Bin-Packing (12:00–14:00)

**The visual is the story here:**
> "Same node, same 16GB of RAM. Before: 3 pods because each JVM claimed 4GB.
> After: 8 pods because each JVM correctly claims 1.5GB.
> That's a 2.7× improvement in node density — meaning you could potentially
> cut your node count in half."

> "This slide should be your 'business case' slide when talking to your manager."

---

### SLIDE 8 — GC in Containers (14:00–16:00)

**GC-induced HPA thrash is the most surprising finding:**
> "Most people have never thought about this: your GC pauses look like CPU spikes
> to Kubernetes. HPA sees CPU spike → scales out → new pods start → they also have
> GC → more CPU spikes → more scale-out. You can end up with 20 pods for a workload
> that needs 3.
> The fix involves both GC tuning AND HPA configuration — we cover both."

**ActiveProcessorCount tip:**
> "For I/O-bound microservices, `-XX:ActiveProcessorCount=N` overrides the JVM's
> detected processor count. You can get a larger thread pool despite a low CPU limit.
> But use carefully — GC threads also scale with this."

---

### SLIDE 9 — GC Selection Guide (16:00–18:00)

**Walk through each row:**
- **G1GC:** "The safe default. Good for 99% of Spring Boot microservices. Start here."
- **ZGC (Generational):** "Java 21's headline GC. Sub-millisecond pauses at any heap size."
- **Shenandoah:** "UBI9's default. Excellent if you're on Red Hat images."
- **Serial GC:** "Never for microservices. Only for tiny batch containers or CLIs."

**Decision rule:**
> "If your P99 GC pause from Prometheus is > 500ms consistently → switch from G1 to ZGC.
> If P99 is < 200ms, G1 is fine — don't change what's working."

**GC threshold fun fact (from Bruno Borges, Microsoft):**
> "The JVM's auto-selection is hardcoded: 2 CPUs + 1792MB → G1GC, but 2 CPUs + 1791MB
> → Serial GC. One megabyte difference. Always set the GC explicitly."

---

### SLIDE 10 — GC Tuning Parameters (18:00–20:00)

**Critical for the audience:**
> "ParallelGCThreads is the most commonly missed flag.
> The JAVA_OPTS pattern in the Containerfile ENTRYPOINT lets you override at deploy time
> via Kubernetes env vars without rebuilding the image."

**Spring Boot specific:**
> "Note the ENTRYPOINT pattern: `java $JAVA_OPTS -jar app.jar`. This lets you
> inject GC flags via a ConfigMap or deployment spec without changing the image."

---

### SLIDE 11 — Startup Time Reduction (20:00–23:00)

**Set up the AppCDS story:**
> "Here's what makes Spring Boot's startup story interesting for AppCDS.
> Spring Boot loads 10,000-15,000 classes at startup — classpath scanning,
> auto-configuration resolution, bean instantiation. Every one of those classes
> benefits from the CDS archive.
> That's why AppCDS gives us 35-55% improvement on Spring Boot,
> compared to ~5% on build-time frameworks."

**Explain the training property:**
> "spring.context.exit=onRefresh — this tells Spring Boot to exit after context
> initialization, so we capture the full class list including all Spring beans."

---

### SLIDE 12 — Virtual Threads (23:00–25:00)

**This is a high-energy slide — deliver it with conviction:**
> "Virtual threads are the biggest concurrency change in Java in 20 years.
> In Spring Boot, it's one property: spring.threads.virtual.enabled=true.
> This switches Tomcat's executor, @Async methods, and scheduled tasks
> to virtual threads — globally."

**Container sizing impact:**
> "200 concurrent requests = 200MB of thread stack off-heap with platform threads.
> With virtual threads? Same stacks, in heap. Your off-heap budget just freed up 200MB."

---

### SLIDE 13 — Observability Overview (25:00–27:00)

**Four-card layout:**
> "JFR is built into the JDK. Cryostat manages JFR on OpenShift. Spring Boot Actuator
> with Micrometer gives you Prometheus metrics at /actuator/prometheus.
> The essential metrics are jvm_gc_pause_seconds and jvm_memory_used_bytes."

**The histogram callout is critical:**
> "Without percentiles-histogram.jvm.gc.pause=true, Grafana GC panels show no data.
> This is the #1 thing teams miss."

---

### SLIDE 14 — Spring Boot Actuator Configuration (27:00–29:00)

**Walk through both columns:**
> "Two dependencies and three lines of configuration — that's the entire
> observability setup. management.metrics.tags.application tags every metric
> with your app name for Grafana filtering."

**Hands-on note:**
> "If you take nothing else from this talk, add these two dependencies and
> three properties to your Spring Boot app today."

---

### SLIDE 15 — HPA with JVM-Aware Metrics (29:00–31:00)

**Three key points:**
1. minReplicas: 2 — "one extra pod, zero downtime during GC pause"
2. stabilizationWindowSeconds: 120 — "longer than any normal GC pause"
3. Scale on RPS not CPU — "GC pauses lie to HPA"

**VPA note:**
> "VPA (Vertical Pod Autoscaler) increases pod resources without adding replicas.
> Kubernetes 1.27+ supports InPlacePodVerticalScaling. However, the JVM can't yet
> dynamically grow its heap in response — work is ongoing (Google G1, Oracle ZGC,
> Microsoft Serial GC). For now, VPA works best for non-heap resources."

---

### SLIDE 16 — Cloud-Native Lifecycle (31:00–33:00)

**Three things that kill your pods on deploy:**
> "Graceful shutdown is two properties. Health probes are three YAML blocks.
> terminationGracePeriodSeconds is one number. All three are required —
> without them, every deployment drops in-flight requests."

**The startupProbe story:**
> "Without a startupProbe, Kubernetes uses livenessProbe from second zero.
> Your JVM is loading 12,000 classes, takes 6 seconds to start, and
> liveness kills it at second 3. The pod restarts. And restarts again.
> CrashLoopBackOff from a health check — not from a bug."

**The preStop race condition:**
> "When Kubernetes terminates a pod, two things happen simultaneously:
> SIGTERM is sent AND the pod is removed from Service endpoints. But endpoint
> removal takes 1-5 seconds to propagate. preStop sleep(5) delays SIGTERM,
> giving the load balancer time to stop sending traffic."

**Walk through the timeline:**
- t=0: K8s removes pod from endpoints + preStop starts
- t=5: preStop completes, SIGTERM sent to Spring Boot
- t=5-35: Spring Boot drains in-flight requests (30s timeout)
- t=40: terminationGracePeriodSeconds expires, SIGKILL

---

### SLIDE 16b — JVM Warmup HealthIndicator (33:00–34:30)

**The gap between "started" and "ready":**
> "Your startupProbe says 'the JVM is alive.' But is it actually ready to handle
> traffic at full speed? The JIT hasn't compiled your hot paths yet. Connection pools
> aren't warmed. Caches are empty. The first 100 requests hit cold code paths and
> take 3-10× longer than steady state."

**The pattern:**
> "A custom HealthIndicator that performs active warmup — invokes your key endpoints,
> loads caches, establishes connections — before reporting UP. The readiness group
> includes this indicator, so K8s won't send traffic until warmup completes."

**The startup resource spike:**
> "A fresh JVM needs 2-4× more CPU than at steady state. Class loading, JIT compilation,
> Spring auto-configuration all spike CPU. That's why we set CPU limits to 2-4× requests.
> For more control, kube-startup-cpu-boost gives temporary extra CPU during startup,
> then scales back automatically."

**The three solutions together:**
1. Burstable QoS (requests < limits) — burst headroom for GC + startup
2. kube-startup-cpu-boost — temporary extra CPU during initialization
3. Warmup HealthIndicator — gates readiness on actual warmup, not just process liveness

---

### SLIDE 17 — Systematic Tuning Workflow (34:30–36:30)

**Walk through the 5-step pipeline:**
> "Instrument → Baseline → Diagnose → Tune → Validate. One change at a time.
> If you accumulate five JVM flags without measuring each one, you can't
> attribute any improvement to any flag."

**Stats bar:**
> "35-55% startup reduction is specific to Spring Boot. It's larger than
> build-time frameworks because Spring Boot loads more classes at startup."

---

### SLIDE 18 — Cost Optimization Checklist (35:00–37:00)

**Walk through the table:**
> "Every row is a configuration change — not an architectural rewrite.
> The virtual threads change is one property. The AppCDS change is a Containerfile rebuild.
> Total estimated effort: about 4.5 hours per microservice."

---

### SLIDE 19 — Demo 01 Recap (37:00–39:00)

**If running live:**
> Run `./demo.sh` in demo-01-heap-sizing. Show the "bad" container claiming host RAM,
> then the "good" container respecting the 512MB limit.

**If slides only:**
> Walk through the bullet points. Emphasize that this is the foundational fix —
> everything else builds on UseContainerSupport + MaxRAMPercentage.

---

### SLIDE 20 — Demo 02 Recap (39:00–42:00)

**If running live (recommended):**
> Run `./demo.sh` in demo-02-gc-monitoring. Wait for podman-compose to start.
> Open Grafana at localhost:3000. Generate GC pressure with curl. Watch the
> GC pause histogram in real time.

**Key moment:**
> "See the jvm_gc_pause_seconds histogram? Without the percentiles-histogram property,
> this panel would be empty. That one property is the difference between seeing and not
> seeing your GC behavior."

---

### SLIDE 21 — Demo 03 Recap (42:00–45:00)

**If running live:**
> Run `./demo.sh` in demo-03-appcds. Compare the startup time with and without CDS.
> Point out the 35-55% improvement and the 3-stage Containerfile pattern.

**Emphasis:**
> "The more classes your app loads at startup, the bigger the CDS win. Spring Boot's
> auto-configuration is heavy — and that works in our favor here."

---

### SLIDE 22 — Key Takeaways (45:00–47:00)

**Read each one slowly. This is the callback for the audience:**
1. UseContainerSupport + MaxRAMPercentage — always
2. Right-size first, then tune
3. Match GC to workload
4. Spring Boot + AppCDS = 35-55% faster startup
5. Observe before you tune
6. Autoscale on RPS not CPU
7. Configure graceful shutdown + health probes
8. Quantify savings

---

### SLIDE 23 — Resources & Q&A (47:00–50:00+)

**Deliver the repo URL:**
> "All slides, all nine demos, and the analysis scripts are in this repo.
> Fork it, break things, send PRs if a demo doesn't work on your platform."

**Handle Q&A.** Common questions and answers:

- "Does this apply to GraalVM Native?" → "Different tradeoffs. Native eliminates startup but limits reflection/dynamic loading. These techniques keep you on the JVM with full capabilities."
- "What about Spring AOT (Ahead-of-Time processing)?" → "Spring AOT is complementary — it pre-computes bean definitions at build time. Combine it with AppCDS/Leyden for maximum effect."
- "We're still on Java 17..." → "Everything except Virtual Threads and ZGC Generational works on Java 17. Use AppCDS, MaxRAMPercentage, ParallelGCThreads — upgrade to 21 when you can."

---

## BONUS SLIDES — For Extended Sessions or Self-Study

The following slides are designed for 90-minute sessions or as self-study material.
Each bonus section has its own demo.

---

### SLIDES 24-26 — Project Leyden (Bonus)

**Timing:** 5-7 minutes

**Key messages:**
- Leyden is the successor to AppCDS — richer cache, more speedup
- JDK 25 LTS adds method profiles and ergonomics
- Spring Boot requires explicit -XX:AOTMode steps (unlike frameworks with single-property support)

**Walk through the 3-stage Containerfile:**
> "Stage 1 builds. Stage 2 records a profile and creates the AOT cache. Stage 3 runs
> with -XX:AOTCache. The sleep-and-kill pattern in training lets Spring Boot
> exercise its auto-configuration."

**Demo 04:** Run `./demo.sh` in demo-04-leyden. Show baseline vs AOT-cached startup.

---

### SLIDES 27-29 — gRPC (Bonus)

**Timing:** 5-7 minutes

**Key messages:**
- REST vs gRPC: different tools for different problems
- Spring Boot 4.0 added first-party gRPC support via spring-grpc
- One dependency, one annotation (@GrpcService)
- Localhost caveat: gRPC unary is SLOWER than REST — network cost is zero

**Demo 05:** Run `./demo.sh` in demo-05-grpc. Show the `hey` vs `ghz` comparison.

---

### SLIDES 30-31 — Low-Latency G1GC vs ZGC (Bonus)

**Timing:** 5-7 minutes

**Key messages:**
- G1GC pauses scale with heap size. ZGC pauses don't.
- Same app, same heap, different GC = different production behavior
- ZGC has 5-15% throughput overhead from load barriers

**Demo 06:** Run `./demo.sh` in demo-06-latency. Open Grafana, generate pressure,
watch the GC pause histograms diverge.

---

### SLIDES 32-34 — Right-Sizing Cost Analysis (Bonus)

**Timing:** 3-5 minutes

**Key messages:**
- $80,640/year from one cluster, one afternoon of analysis
- 17× ROI: $6,720 saving for ~$400 engineering time

**Demo 07:** Run `python3 analyze.py` in demo-07-rightsizing. Walk through the output.

---

### SLIDES 35-37 — Project Panama FFM (Bonus)

**Timing:** 5-7 minutes

**Key messages:**
- Panama FFM replaces JNI — safe, leak-free native memory
- Arena-based memory management — zero leaks by construction
- 3-stage Containerfile: C++ on UBI9, Java on Temurin 25, runtime on Temurin 25 JRE

**Demo 08:** Run `./demo.sh` in demo-08-panama. Call the /panama/stats endpoint.

---

### SLIDES 38-39 — AI Inference (Bonus)

**Timing:** 5-7 minutes

**Key messages:**
- LangChain4j + ONNX Runtime = AI inference without Python sidecar
- CPU-only inference, no GPU required
- Memory impact: ONNX model loads into native memory — adjust MaxRAMPercentage

**Demo 09:** Run `./demo.sh` in demo-09-onnx. Call /onnx/embed and /onnx/similarity.

---

### SLIDE 40 — Project Valhalla (Bonus)

**Timing:** 3-5 minutes

**Key messages:**
- Value classes: inline storage, no headers, no GC tracking
- Memory: 3× reduction for boxed types
- Preview in JDK 25+, stable ~JDK 27-29

---

### SLIDES 41-42 — Anti-Patterns (Bonus)

**Timing:** 5-7 minutes

**Present the anti-patterns slide as a gallery (now 6 categories, 22 items):**
> "Quick show of hands for each row. How many of you have..."

**New categories to highlight:**
> Lifecycle — "How many of you have server.shutdown=graceful set? No startupProbe?"
> Build — "How many are running fat JARs in a single Containerfile layer?"

**Then flip to the remediation slide:**
> "Everything on this slide is a drop-in change. No application code changes.
> Configuration and build pipeline changes only."

---

## Equipment Checklist

- [ ] Laptop with Podman and podman-compose installed
- [ ] Java 21 SDK (for building demos 01-03, 05-07)
- [ ] JDK 25 (for demos 04, 08, 09 — in containers, no local install needed)
- [ ] Python 3.x (for demo 07)
- [ ] `hey` (HTTP load test tool)
- [ ] `ghz` (gRPC load test tool)
- [ ] `grpcurl` (gRPC curl equivalent)
- [ ] Browser open to localhost:3000 (Grafana) before demos 02 and 06
- [ ] Terminal with large font (24pt+) for audience visibility
- [ ] Backup screenshots in case Podman acts up

## Timing Summary

| Section | Slides | Time | Running Total |
|---------|--------|------|---------------|
| Title + Agenda | 1-2 | 2 min | 2 min |
| The Problem | 3 | 2 min | 4 min |
| Container Fundamentals | 4-5 | 6 min | 10 min |
| Right-Sizing | 6-7 | 4 min | 14 min |
| GC Optimization | 8-10 | 6 min | 20 min |
| Startup + Virtual Threads | 11-12 | 5 min | 25 min |
| Observability | 13-14 | 4 min | 29 min |
| Autoscaling + Lifecycle + Warmup | 15-16b | 5.5 min | 34.5 min |
| Tuning + Cost | 17-18 | 4 min | 38.5 min |
| Demo Recaps | 19-21 | 8 min | 46.5 min |
| Takeaways | 22 | 2 min | 48.5 min |
| Q&A | 23 | 5-15 min | 53.5-63.5 min |
| **Bonus (extended)** | 24-42 | 30-40 min | 92-102 min |
