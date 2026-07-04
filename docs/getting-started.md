---
layout: default
permalink: /docs/getting-started/
title: "Getting Started"
description: Clone the repo, install prerequisites, and run your first demo in under 10 minutes.
---

<div class="container">
  <nav class="breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a> /
    <a href="{{ '/docs/' | relative_url }}">Docs</a> /
    <span>Getting Started</span>
  </nav>

  <h1>Getting Started</h1>
  <p style="color:var(--muted);margin-top:.4rem;">
    Clone the repo, install prerequisites, and run your first demo in under 10 minutes.
  </p>

  <div class="callout" style="margin:1.5rem 0;">
    <strong>Time required:</strong> ~10 minutes for setup, then 5-15 minutes per demo.
    Most demos need only <code>podman</code>. No Kubernetes cluster required.
  </div>

  <h2 id="clone" style="color:var(--teal);">1. Clone the Repository</h2>

  <div class="run-box">
    <div class="run-box-header">Terminal</div>
    <pre><code>git clone https://github.com/patterncatalyst/spring-boot-optimization.git
cd spring-boot-optimization</code></pre>
  </div>

  <h2 id="prerequisites" style="color:var(--teal);margin-top:2rem;">2. Install Prerequisites</h2>

  <p>Every demo runs in containers — you do not need to install Java locally (though it helps for inspection). The minimum set:</p>

  <div class="grid grid-2" style="margin:1rem 0;">
    <div class="card" style="pointer-events:none;">
      <h3>Fedora / RHEL</h3>
      <pre style="font-size:.78rem;"><code>sudo dnf install -y podman git python3
pip install podman-compose --user</code></pre>
    </div>
    <div class="card" style="pointer-events:none;">
      <h3>macOS</h3>
      <pre style="font-size:.78rem;"><code>brew install podman git python3
podman machine init --memory 8192 --cpus 4
podman machine start
pip3 install podman-compose</code></pre>
    </div>
  </div>

  <p>For demos 04, 08, and 09 (JDK 25), the container handles everything — no local JDK 25 installation needed. For the full tool list, see the <a href="{{ '/docs/prerequisites/' | relative_url }}">Prerequisites page</a>.</p>

  <h2 id="verify" style="color:var(--teal);margin-top:2rem;">3. Verify Your Setup</h2>

  <div class="run-box">
    <div class="run-box-header">Verify Podman</div>
    <pre><code># Podman should report version 4.x or 5.x
podman --version

# Run a quick test container
podman run --rm registry.access.redhat.com/ubi9/openjdk-21:latest java -version

# Verify podman-compose
podman-compose --version</code></pre>
  </div>

  <div class="callout" style="margin:1rem 0;">
    <strong>SELinux note (Fedora/RHEL):</strong> All bind mounts in demo compose files use the <code>:Z</code> suffix
    for SELinux relabeling. If you see "permission denied" errors on mounted volumes,
    ensure you're running the provided compose files — they handle this automatically.
  </div>

  <h2 id="first-demo" style="color:var(--teal);margin-top:2rem;">4. Run Your First Demo</h2>

  <p>Start with Demo 01 — it's self-contained, takes 2 minutes, and demonstrates the foundational
  container-aware JVM configuration that every other demo builds on.</p>

  <div class="run-box">
    <div class="run-box-header">Demo 01: Container-Aware Heap Sizing</div>
    <pre><code>cd spring-boot-demos/demo-01-heap-sizing
chmod +x demo.sh
./demo.sh</code></pre>
  </div>

  <p>The script builds two container images (one misconfigured, one correct) and runs them side-by-side so you can see the difference in heap behavior. Watch for:</p>

  <ul style="color:var(--muted);line-height:1.8;margin:1rem 0;">
    <li><strong>Bad container:</strong> JVM reads host RAM, claims a huge heap, gets OOMKilled</li>
    <li><strong>Good container:</strong> JVM respects container memory limit (512 MB), heap sized proportionally</li>
  </ul>

  <h2 id="next-steps" style="color:var(--teal);margin-top:2rem;">5. Next Steps</h2>

  <div class="grid grid-2" style="margin:1rem 0;">
    <a href="{{ '/docs/demo-walkthrough/' | relative_url }}" class="card">
      <h3>Demo Walkthrough</h3>
      <p>Step-by-step guide through all 9 demos with expected output and learning objectives.</p>
    </a>
    <a href="{{ '/docs/apply-to-your-app/' | relative_url }}" class="card">
      <h3>Apply to Your App</h3>
      <p>How to bring these optimizations to your existing Spring Boot applications.</p>
    </a>
    <a href="{{ '/docs/jvm-cheatsheet/' | relative_url }}" class="card">
      <h3>JVM Cheat Sheet</h3>
      <p>Quick-reference flag table, GC decision tree, and right-sizing formula.</p>
    </a>
    <a href="{{ '/demos/' | relative_url }}" class="card">
      <h3>All Demos</h3>
      <p>Browse all 9 demo pages with source links and run instructions.</p>
    </a>
  </div>

</div>
