---
layout: default
permalink: /docs/demo-walkthrough/
title: "Demo Walkthrough"
description: Step-by-step guide through all 9 demos with expected output, learning objectives, and timing.
---

<div class="container">
  <nav class="breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a> /
    <a href="{{ '/docs/' | relative_url }}">Docs</a> /
    <span>Demo Walkthrough</span>
  </nav>

  <h1>Demo Walkthrough</h1>
  <p style="color:var(--muted);margin-top:.4rem;">
    Step-by-step guide through all 9 demos. Demos 01-03 are the core set
    for a 60-minute talk. Demos 04-09 are bonus material for extended sessions.
  </p>

  <div class="callout" style="margin:1.5rem 0;">
    <strong>Before you begin:</strong> Complete the <a href="{{ '/docs/getting-started/' | relative_url }}">Getting Started</a> guide.
    All commands assume you're in the <code>spring-boot-demos/</code> directory.
  </div>

  <!-- ═══════ DEMO 01 ═══════ -->
  <h2 id="demo-01" style="color:var(--green);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 01: Container-Aware Heap Sizing
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag">Core</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-teal">Java 21</span>
  </div>

  <h3>Learning Objective</h3>
  <p>Understand why the JVM reads host RAM by default and how <code>UseContainerSupport</code> + <code>MaxRAMPercentage=75</code> fixes the mismatch.</p>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-01-heap-sizing</code></li>
    <li>Run: <code>./demo.sh</code></li>
    <li>Observe the <strong>"bad" container</strong> — JVM sees host RAM, claims a huge heap, and gets OOMKilled</li>
    <li>Observe the <strong>"good" container</strong> — JVM reads cgroup limits, sets heap to ~75% of the 512 MB container limit</li>
    <li>Note the <code>jcmd</code> output showing the heap sizes in both scenarios</li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>The "bad" container's <code>MaxHeapSize</code> is based on host RAM (e.g., 16GB on a 64GB host)</li>
    <li>The "good" container's <code>MaxHeapSize</code> is ~384 MB (75% of 512 MB limit)</li>
    <li>The OOMKill happens because the JVM allocates more memory than the container limit allows</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>Never hardcode <code>-Xmx</code>/<code>-Xms</code> in containers. Use <code>-XX:MaxRAMPercentage=75.0</code> so the JVM dynamically sizes the heap to the container's memory limit.</p>

  <!-- ═══════ DEMO 02 ═══════ -->
  <h2 id="demo-02" style="color:var(--green);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 02: GC Monitoring with Prometheus &amp; Grafana
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag">Core</span>
    <span class="tag tag-muted">10 min</span>
    <span class="tag tag-teal">Spring Boot 4.0.5</span>
    <span class="tag tag-teal">Podman Compose</span>
  </div>

  <h3>Learning Objective</h3>
  <p>See GC behavior in real time via Micrometer + Prometheus + Grafana. Understand why <code>percentiles-histogram.jvm.gc.pause=true</code> is essential.</p>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-02-gc-monitoring</code></li>
    <li>Start the stack: <code>./demo.sh</code> (starts Spring Boot app + Prometheus + Grafana via podman-compose)</li>
    <li>Open Grafana: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a> (admin/admin)</li>
    <li>Navigate to the JVM dashboard (pre-provisioned)</li>
    <li>Generate GC pressure:
      <pre style="margin:.5rem 0;"><code>curl "http://localhost:8080/allocate?mb=50"
curl "http://localhost:8080/allocate?mb=100"</code></pre>
    </li>
    <li>Watch the GC pause histogram update in Grafana</li>
    <li>Test virtual threads:
      <pre style="margin:.5rem 0;"><code>curl "http://localhost:8080/threads?count=500"</code></pre>
    </li>
    <li>Stop the stack: <code>podman-compose down</code></li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>GC pause histogram panels in Grafana — these are empty without the <code>percentiles-histogram</code> config</li>
    <li>Memory used vs memory committed vs memory max — three separate metrics</li>
    <li>Thread count: virtual threads show minimal platform thread usage even at 500 concurrent tasks</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>Two dependencies (<code>spring-boot-starter-actuator</code> + <code>micrometer-registry-prometheus</code>) and three lines of <code>application.properties</code> give you full JVM observability. The histogram property is the most commonly missed piece.</p>

  <!-- ═══════ DEMO 03 ═══════ -->
  <h2 id="demo-03" style="color:var(--green);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 03: AppCDS Startup Acceleration
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag">Core</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-teal">Spring Boot 4.0.5</span>
    <span class="tag tag-teal">3-stage build</span>
  </div>

  <h3>Learning Objective</h3>
  <p>See the 35-55% startup reduction from AppCDS, understand the 3-stage Containerfile pattern, and learn why Spring Boot benefits more from CDS than build-time frameworks.</p>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-03-appcds</code></li>
    <li>Run: <code>./demo.sh</code></li>
    <li>The script builds two images: baseline (no CDS) and optimized (with AppCDS archive)</li>
    <li>Compare the startup times printed in the output</li>
    <li>Note the 3-stage Containerfile: builder → CDS trainer → runtime</li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>Baseline startup: ~4-8 seconds (Spring Boot loads 10,000-15,000 classes)</li>
    <li>With AppCDS: ~2-4 seconds (35-55% reduction)</li>
    <li>The <code>spring.context.exit=onRefresh</code> property in the training stage — this captures the full class list</li>
    <li>The CDS archive size in the build output</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>Spring Boot's runtime class loading is its Achilles' heel for startup — and that's exactly what AppCDS caches. The more classes your app loads, the bigger the CDS win. This is a Containerfile-only change with zero application code modifications.</p>

  <!-- ═══════ DEMO 04 ═══════ -->
  <h2 id="demo-04" style="color:var(--purple);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 04: Project Leyden AOT Cache
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-purple">JDK 25</span>
  </div>

  <h3>Learning Objective</h3>
  <p>Understand the Project Leyden workflow for Spring Boot: explicit <code>-XX:AOTMode=record</code> and <code>-XX:AOTMode=create</code> steps in a 3-stage Containerfile.</p>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-04-leyden</code></li>
    <li>Run: <code>./demo.sh</code> (builds with eclipse-temurin:25 in the container)</li>
    <li>Observe the three build stages: compile → train (record + create) → runtime</li>
    <li>Compare baseline startup vs AOT-cached startup</li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>The training stage runs the app briefly to capture class and method profiles</li>
    <li>Two explicit steps: <code>-XX:AOTMode=record</code> captures the profile, <code>-XX:AOTMode=create</code> builds the cache</li>
    <li>The <code>app.aot</code> file alongside <code>app.jar</code> in the runtime stage</li>
    <li>Expected improvement: ~40-55% startup reduction beyond what AppCDS alone provides</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>Leyden is the successor to AppCDS — it caches method profiles and JIT data in addition to class data. Unlike frameworks with single-property support, Spring Boot requires explicit <code>-XX:AOTMode</code> steps, but the result is the same: dramatically faster startup with no code changes.</p>

  <!-- ═══════ DEMO 05 ═══════ -->
  <h2 id="demo-05" style="color:var(--teal);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 05: REST vs gRPC Performance
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">10 min</span>
    <span class="tag tag-teal">Spring Boot 4.0.5</span>
    <span class="tag tag-teal">spring-grpc</span>
  </div>

  <h3>Prerequisites</h3>
  <p>This demo requires <code>hey</code> (HTTP load tester), <code>grpcurl</code>, and <code>ghz</code> (gRPC load tester). See <a href="{{ '/docs/prerequisites/' | relative_url }}">Prerequisites</a> for installation.</p>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-05-grpc</code></li>
    <li>Run: <code>./demo.sh</code></li>
    <li>The script builds and starts the app with REST on :8080 and gRPC on :9000</li>
    <li>Runs load tests: <code>hey</code> against REST, <code>ghz</code> against gRPC</li>
    <li>Compares throughput, latency, and wire sizes</li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li><strong>Localhost caveat:</strong> gRPC unary will be SLOWER than REST because network cost is zero</li>
    <li>gRPC wins at high concurrency (c=500) and streaming even on localhost</li>
    <li>Wire size comparison: JSON ~400 bytes vs Protobuf ~40 bytes</li>
    <li>The <code>@GrpcService</code> annotation — Spring Boot 4.0's first-party gRPC support</li>
  </ul>

  <!-- ═══════ DEMO 06 ═══════ -->
  <h2 id="demo-06" style="color:var(--amber);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 06: Low-Latency G1GC vs ZGC
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">10 min</span>
    <span class="tag tag-teal">Podman Compose</span>
    <span class="tag tag-teal">Grafana</span>
  </div>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-06-latency</code></li>
    <li>Start: <code>./demo.sh</code> (launches two Spring Boot instances + Prometheus + Grafana)</li>
    <li>Open Grafana: <a href="http://localhost:3000" target="_blank">http://localhost:3000</a></li>
    <li>Generate allocation pressure on both:
      <pre style="margin:.5rem 0;"><code># G1GC instance
curl "http://localhost:8080/pressure?mb=50&iterations=10"
# ZGC instance
curl "http://localhost:8081/pressure?mb=50&iterations=10"</code></pre>
    </li>
    <li>Compare GC pause histograms in Grafana — side by side</li>
    <li>Stop: <code>podman-compose down</code></li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>G1GC pauses: 50-500ms, scaling with heap size</li>
    <li>ZGC pauses: &lt;1ms, regardless of heap size</li>
    <li>ZGC has ~5-15% lower throughput (load barrier overhead)</li>
    <li>G1GC CPU spikes during collection vs ZGC's smooth CPU profile</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>If your P99 GC pause exceeds 500ms, switch to ZGC. Don't try to tune G1GC parameters — switch the algorithm. The throughput cost (5-15%) is almost always worth the latency consistency.</p>

  <!-- ═══════ DEMO 07 ═══════ -->
  <h2 id="demo-07" style="color:var(--green);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 07: Right-Sizing &amp; Cost Analysis
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-green">Python only</span>
  </div>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-07-rightsizing</code></li>
    <li>Run: <code>python3 analyze.py</code> (no containers needed)</li>
    <li>Review the output: workload analysis, optimization recommendations, and cost savings</li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>7 workloads analyzed across API gateways, batch processors, and event consumers</li>
    <li>Before: 4 nodes, After: 2 nodes — 67% improvement in pod density</li>
    <li>$6,720/month savings with 17x ROI</li>
    <li>The analysis generates specific <code>resources.requests</code> and <code>resources.limits</code> recommendations</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>Right-sizing is the highest ROI optimization. One afternoon of analysis can save $80K+/year per cluster. The script generates ready-to-paste Kubernetes resource specs.</p>

  <!-- ═══════ DEMO 08 ═══════ -->
  <h2 id="demo-08" style="color:var(--amber);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 08: Project Panama FFM — Native C++ Interop
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-purple">JDK 25</span>
    <span class="tag tag-teal">3-stage build</span>
  </div>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-08-panama</code></li>
    <li>Run: <code>./demo.sh</code> (3-stage build: UBI9 C++ → Temurin 25 Java → Temurin 25 JRE)</li>
    <li>Call the REST endpoints:
      <pre style="margin:.5rem 0;"><code>curl http://localhost:8080/panama/stats
curl http://localhost:8080/panama/system-load
curl -X POST http://localhost:8080/panama/compute \
  -H "Content-Type: application/json" \
  -d '{"values": [1.0, 2.0, 3.0, 4.0, 5.0]}'</code></pre>
    </li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>Arena-managed native memory: allocated on call, freed when Arena closes</li>
    <li>No JNI boilerplate: MethodHandle + Linker replaces javah + native headers</li>
    <li>The C++20 native library computes statistics (P99, standard deviation) in native code</li>
    <li>The 3-stage Containerfile: C++ on UBI9, Java on Temurin 25, runtime on Temurin 25 JRE</li>
  </ul>

  <!-- ═══════ DEMO 09 ═══════ -->
  <h2 id="demo-09" style="color:var(--teal);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Demo 09: AI Inference — LangChain4j + ONNX
  </h2>
  <div style="display:flex;gap:.5em;flex-wrap:wrap;margin:.5rem 0 1rem;">
    <span class="tag tag-purple">Bonus</span>
    <span class="tag tag-muted">5 min</span>
    <span class="tag tag-purple">JDK 25</span>
    <span class="tag tag-teal">LangChain4j</span>
  </div>

  <h3>Steps</h3>
  <ol style="line-height:2;">
    <li>Navigate: <code>cd demo-09-onnx</code></li>
    <li>Run: <code>./demo.sh</code> (builds with Temurin 25, bundles MiniLM-L6-v2 model)</li>
    <li>Call the REST endpoints:
      <pre style="margin:.5rem 0;"><code># Generate an embedding
curl -X POST http://localhost:8080/onnx/embed \
  -H "Content-Type: text/plain" \
  -d "JVM garbage collection optimization"

# Compare similarity
curl -X POST http://localhost:8080/onnx/similarity \
  -H "Content-Type: application/json" \
  -d '{"text1": "JVM tuning", "text2": "Java performance"}'

# Benchmark
curl http://localhost:8080/onnx/benchmark</code></pre>
    </li>
  </ol>

  <h3>What to Look For</h3>
  <ul style="color:var(--muted);line-height:1.8;">
    <li>Embedding vectors: 384-dimensional float arrays from the MiniLM-L6-v2 model</li>
    <li>Inference latency: ~30ms per embedding on CPU</li>
    <li>No Python sidecar: the ONNX model runs directly on the JVM</li>
    <li><strong>Memory impact:</strong> The ONNX model loads ~100MB into native memory — reduce <code>MaxRAMPercentage</code> to 65% to compensate</li>
  </ul>

  <h3>Key Takeaway</h3>
  <p>LangChain4j + ONNX Runtime lets you run AI inference as a single Spring Boot deployment unit with no GPU and no Python dependency. Account for the native memory overhead when sizing containers.</p>

  <!-- ═══════ SUMMARY ═══════ -->
  <h2 id="summary" style="color:var(--teal);margin-top:2rem;border-top:1px solid var(--border);padding-top:1.5rem;">
    Summary — What You've Learned
  </h2>

  <table style="font-size:.85rem;margin:1rem 0;">
    <thead>
      <tr><th>Demo</th><th>Technique</th><th>Impact</th></tr>
    </thead>
    <tbody>
      <tr><td>01</td><td>UseContainerSupport + MaxRAMPercentage</td><td>Prevents OOMKill, correct heap sizing</td></tr>
      <tr><td>02</td><td>Actuator + Micrometer + Prometheus</td><td>Full JVM observability</td></tr>
      <tr><td>03</td><td>AppCDS 3-stage Containerfile</td><td>35-55% faster startup</td></tr>
      <tr><td>04</td><td>Project Leyden AOT Cache</td><td>40-55% faster startup (JDK 25)</td></tr>
      <tr><td>05</td><td>Spring gRPC + Protobuf</td><td>10x smaller payloads, built-in streaming</td></tr>
      <tr><td>06</td><td>ZGC vs G1GC comparison</td><td>&lt;1ms pauses vs 50-500ms</td></tr>
      <tr><td>07</td><td>Right-sizing analysis</td><td>$80K+/year savings, 2-3x pod density</td></tr>
      <tr><td>08</td><td>Panama FFM native interop</td><td>Safe native calls, no JNI</td></tr>
      <tr><td>09</td><td>ONNX AI inference on JVM</td><td>No Python sidecar, CPU-only</td></tr>
    </tbody>
  </table>

  <div style="margin-top:1.5rem;">
    <a href="{{ '/docs/apply-to-your-app/' | relative_url }}" class="btn">Next: Apply to Your App →</a>
  </div>

</div>
