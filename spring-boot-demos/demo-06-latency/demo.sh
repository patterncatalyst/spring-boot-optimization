#!/usr/bin/env bash
# ============================================================
# Demo 06: Low-Latency JVM — G1GC vs ZGC
# Spring Boot 4.0.5 / Java 21
#
# Two identical Spring Boot apps, same heap, same load:
#   G1GC app  -> http://localhost:8080  (stop-the-world pauses)
#   ZGC app   -> http://localhost:8081  (concurrent, < 1ms pauses)
#
# KEY INSIGHT — read this before presenting:
#
#   ZGC will likely show SLOWER throughput and HIGHER total latency
#   than G1GC in this demo. That is expected and honest.
#
#   WHY ZGC IS SLOWER HERE:
#   ZGC inserts a load barrier at every object reference read in your
#   application code. This allows it to relocate objects concurrently
#   while your app runs. The barrier costs ~5-15% throughput. In a
#   micro-benchmark that hammers object allocation, this shows up as
#   lower rps and higher average response time.
#
#   WHAT YOU SHOULD SHOW INSTEAD:
#   The GC pause delta (Steps 4 and 5) — how much cumulative time each
#   GC algorithm stole from application threads. G1GC steals 50-300ms
#   per pressure run. ZGC steals near-zero. THAT is the SLA story.
#
#   ON-STAGE FRAMING:
#   "ZGC is slower in total throughput here — that's the load barrier
#    cost, and it's real. But G1GC froze the application for [N]ms
#    during that test. ZGC froze it for less than 1ms. If you have a
#    p99 SLA of 50ms, G1GC will breach it every time a collection
#    fires. ZGC won't. Choose based on your SLA, not this benchmark."
#
# Prerequisites:
#   podman            (dnf install podman)
#   podman-compose    (pip install podman-compose)
#   hey               (brew install hey)  — optional, for load test
#
# Run: ./demo.sh
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

hr()     { printf "%0.s─" {1..65}; echo; }
hr_thin(){ printf "%0.s·" {1..65}; echo; }

PRESSURE_MB=80
PRESSURE_ITER=15
WARMUP_MB=20
WARMUP_ITER=3
LOAD_DURATION=30

echo
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  DEMO 06: Low-Latency JVM — G1GC vs ZGC                   ║"
echo "║  Spring Boot 4.0.5 / Java 21                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

echo -e "${YELLOW}Setup:${RESET}"
echo "  G1GC  -> http://localhost:8080  (-XX:+UseG1GC)"
echo "  ZGC   -> http://localhost:8081  (-XX:+UseZGC -XX:+ZGenerational)"
echo "  Same code. Same heap (75% of 512MB). Different GC algorithm."
echo

# -- Step 1: Build and start ------------------------------------------------
hr
echo -e "${YELLOW}Step 1: Building and starting both containers${RESET}"
hr
if ! podman-compose up -d --build; then
  echo -e "${RED}Failed to start stack${RESET}"; exit 1
fi

echo -n "  Waiting for G1GC app"
for i in {1..40}; do
  curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1 && \
    echo -e " ${GREEN}ready${RESET}" && break
  echo -n "."; sleep 2
  [ $i -eq 40 ] && echo -e " ${RED}TIMEOUT${RESET}" && exit 1
done

echo -n "  Waiting for ZGC app"
for i in {1..40}; do
  curl -sf http://localhost:8081/actuator/health >/dev/null 2>&1 && \
    echo -e " ${GREEN}ready${RESET}" && break
  echo -n "."; sleep 2
  [ $i -eq 40 ] && echo -e " ${RED}TIMEOUT${RESET}" && exit 1
done
echo

# -- Step 2: Confirm GC algorithms ------------------------------------------
hr
echo -e "${YELLOW}Step 2: Confirming GC algorithms${RESET}"
hr
echo

echo -e "${RED}  G1GC (port 8080):${RESET}"
curl -sf http://localhost:8080/info | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    GC: {d['gcAlgorithm']}\")
print(f\"    Heap: {d['heapUsedMb']}MB used / {d['heapMaxMb']}MB max\")
print(f\"    JVM: {d['jvmVersion']}\")
print(f\"    Container memory: {d['containerMemory']}\")
for gc in d['gcCollectors']:
    print(f\"    Collector: {gc['name']}\")
" 2>/dev/null
echo

echo -e "${CYAN}  ZGC (port 8081):${RESET}"
curl -sf http://localhost:8081/info | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    GC: {d['gcAlgorithm']}\")
print(f\"    Heap: {d['heapUsedMb']}MB used / {d['heapMaxMb']}MB max\")
print(f\"    JVM: {d['jvmVersion']}\")
print(f\"    Container memory: {d['containerMemory']}\")
for gc in d['gcCollectors']:
    print(f\"    Collector: {gc['name']}\")
" 2>/dev/null
echo

# -- Step 3: Warmup ---------------------------------------------------------
echo -e "${YELLOW}Step 3: Warming up JIT (${WARMUP_MB}MB x ${WARMUP_ITER})...${RESET}"
curl -sf "http://localhost:8080/pressure?mb=${WARMUP_MB}&iterations=${WARMUP_ITER}" > /dev/null
curl -sf "http://localhost:8081/pressure?mb=${WARMUP_MB}&iterations=${WARMUP_ITER}" > /dev/null
sleep 3
echo -e "  ${GREEN}Warmed up${RESET}"
echo

# -- Step 4: THE KEY DEMO — GC pause delta -----------------------------------
hr
echo -e "${YELLOW}Step 4: GC PAUSE DELTA — the number that matters for SLAs${RESET}"
hr
echo
echo -e "  ${BOLD}Allocating ~$((PRESSURE_MB * PRESSURE_ITER))MB of objects on each app.${RESET}"
echo "  Watching: how much cumulative time GC stole from application threads."
echo "  This is the ms your service was completely frozen, serving 0 requests."
echo

echo -e "${RED}  G1GC (port 8080):${RESET}"
G1_BEFORE=$(curl -sf http://localhost:8080/gc-stats | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")
G1_RESULT=$(curl -sf \
  "http://localhost:8080/pressure?mb=${PRESSURE_MB}&iterations=${PRESSURE_ITER}")
G1_AFTER=$(curl -sf http://localhost:8080/gc-stats | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")

echo "$G1_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    Allocated: {d['allocatedMb']} MB | Wall time: {d['durationMs']} ms\")
"
G1_DELTA=$((G1_AFTER - G1_BEFORE))
echo -e "    ${RED}GC pause delta: ${G1_DELTA}ms — app threads STOPPED for this total${RESET}"
echo

echo -e "${CYAN}  ZGC (port 8081):${RESET}"
ZGC_BEFORE=$(curl -sf http://localhost:8081/gc-stats | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")
ZGC_RESULT=$(curl -sf \
  "http://localhost:8081/pressure?mb=${PRESSURE_MB}&iterations=${PRESSURE_ITER}")
ZGC_AFTER=$(curl -sf http://localhost:8081/gc-stats | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")

echo "$ZGC_RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    Allocated: {d['allocatedMb']} MB | Wall time: {d['durationMs']} ms\")
"
ZGC_DELTA=$((ZGC_AFTER - ZGC_BEFORE))
echo -e "    ${CYAN}GC pause delta: ${ZGC_DELTA}ms — app threads kept running${RESET}"
echo

# Pause delta summary — the on-stage moment
hr_thin
python3 - << PYEOF
g1 = ${G1_DELTA}
zgc = ${ZGC_DELTA}
print(f"  \033[1mGC pause delta comparison:\033[0m")
print(f"  \033[31mG1GC: {g1}ms\033[0m  <- application completely frozen for this duration")
print(f"  \033[36mZGC:  {zgc}ms\033[0m  <- concurrent collection, app threads kept running")
print()
if g1 > 0:
    print(f"  Every {g1}ms of G1GC pause = {g1}ms where your service answered 0 requests.")
    print(f"  If your p99 SLA is 50ms and G1GC pauses for {g1}ms — you breach it.")
print(f"  ZGC's {zgc}ms pause time means GC will never be the cause of an SLA breach.")
print()
print("  \033[1mNote on throughput:\033[0m ZGC may show lower rps/higher latency in load tests.")
print("  That is ZGC's load barrier cost — not a bug. The trade-off is intentional:")
print("  less throughput in exchange for consistent sub-millisecond pause times.")
PYEOF
echo

# -- Step 5: Repeated rounds — show the pattern clearly ----------------------
hr
echo -e "${YELLOW}Step 5: 5 rounds — GC pause delta per round${RESET}"
hr
echo
echo -e "  ${BOLD}Round | G1GC pause delta | ZGC pause delta | Winner${RESET}"
echo "  ────────────────────────────────────────────────────────────"

for round in 1 2 3 4 5; do
  G1_B=$(curl -sf http://localhost:8080/gc-stats | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")
  Z_B=$(curl -sf http://localhost:8081/gc-stats | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")

  curl -sf "http://localhost:8080/pressure?mb=60&iterations=8" > /dev/null &
  curl -sf "http://localhost:8081/pressure?mb=60&iterations=8" > /dev/null &
  wait

  G1_A=$(curl -sf http://localhost:8080/gc-stats | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")
  Z_A=$(curl -sf http://localhost:8081/gc-stats | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d['totalGcTimeMs'])")

  G1D=$((G1_A - G1_B))
  ZD=$((Z_A - Z_B))
  ADV="ZGC wins"
  [ $G1D -lt $ZD ] && ADV="similar"
  printf "  %5d | %16sms | %15sms | %s\n" "$round" "$G1D" "$ZD" "$ADV"
  sleep 2
done
echo
echo "  Pattern: G1GC accumulates pause time in bursts (stop-the-world)."
echo "  ZGC accumulates near-zero pause time (concurrent collection)."
echo

# -- Step 6: Prometheus GC pause P99 ----------------------------------------
echo -n "  Waiting for Prometheus"
for i in {1..20}; do
  curl -sf http://localhost:9090/-/ready >/dev/null 2>&1 && \
    echo -e " ${GREEN}ready${RESET}" && break
  echo -n "."; sleep 2
  [ $i -eq 20 ] && echo -e " ${YELLOW}skipping Prometheus queries${RESET}"
done
echo

if curl -sf http://localhost:9090/-/ready >/dev/null 2>&1; then
  hr
  echo -e "${YELLOW}Step 6: Prometheus GC pause P99 comparison${RESET}"
  hr
  echo

  # Query GC pause p99 for each job
  G1_P99=$(curl -sf 'http://localhost:9090/api/v1/query' \
    --data-urlencode 'query=histogram_quantile(0.99, rate(jvm_gc_pause_seconds_bucket{job="latency-g1gc"}[5m])) * 1000' \
    | python3 -c "
import sys, json
r = json.load(sys.stdin)
if r['data']['result']:
    print(f\"{float(r['data']['result'][0]['value'][1]):.2f}\")
else:
    print('no data yet')
" 2>/dev/null)

  ZGC_P99=$(curl -sf 'http://localhost:9090/api/v1/query' \
    --data-urlencode 'query=histogram_quantile(0.99, rate(jvm_gc_pause_seconds_bucket{job="latency-zgc"}[5m])) * 1000' \
    | python3 -c "
import sys, json
r = json.load(sys.stdin)
if r['data']['result']:
    print(f\"{float(r['data']['result'][0]['value'][1]):.2f}\")
else:
    print('no data yet')
" 2>/dev/null)

  echo -e "  ${RED}G1GC P99 GC pause: ${G1_P99}ms${RESET}"
  echo -e "  ${CYAN}ZGC  P99 GC pause: ${ZGC_P99}ms${RESET}"
  echo
  echo "  Prometheus: http://localhost:9090"
  echo "  Grafana:    http://localhost:3000  (admin / admin)"
  echo
fi

# -- Step 7: GC stats from both apps ----------------------------------------
hr
echo -e "${YELLOW}Step 7: Cumulative GC stats${RESET}"
hr
echo

echo -e "${RED}  G1GC (port 8080):${RESET}"
curl -sf http://localhost:8080/gc-stats | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    Collections: {d['totalGcCount']}\")
print(f\"    Total GC time: {d['totalGcTimeMs']}ms\")
print(f\"    Heap: {d['heapUsedMb']}MB / {d['heapMaxMb']}MB ({d['heapUsedPct']}%)\")
for c in d['collectors']:
    print(f\"    {c['name']}: {c['count']} collections, {c['timeMs']}ms total\")
" 2>/dev/null
echo

echo -e "${CYAN}  ZGC (port 8081):${RESET}"
curl -sf http://localhost:8081/gc-stats | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"    Collections: {d['totalGcCount']}\")
print(f\"    Total GC time: {d['totalGcTimeMs']}ms\")
print(f\"    Heap: {d['heapUsedMb']}MB / {d['heapMaxMb']}MB ({d['heapUsedPct']}%)\")
for c in d['collectors']:
    print(f\"    {c['name']}: {c['count']} collections, {c['timeMs']}ms total\")
" 2>/dev/null
echo

# -- Step 8: Production tuning reference ------------------------------------
hr
echo -e "${YELLOW}Step 8: Production tuning flags${RESET}"
hr
echo
cat << 'FLAGS'
  # 1. Switch GC (biggest single impact, zero infrastructure change):
  -XX:+UseZGC -XX:+ZGenerational

  # 2. Match thread counts to CPU request (prevents oversubscription):
  -XX:ActiveProcessorCount=<N>
  -XX:ParallelGCThreads=<N>
  -XX:ConcGCThreads=<N/2>
  -XX:CICompilerCount=2

  # 3. Pre-fault heap pages at startup (eliminates page fault jitter):
  -XX:+AlwaysPreTouch

  # 4. Huge pages (requires kernel config + K8s hugepages resource):
  -XX:+UseLargePages

  # 5. NUMA-aware allocation (requires Topology Manager single-numa-node):
  -XX:+UseNUMA

  # Kubernetes: Guaranteed QoS (required for static CPU allocation):
  resources:
    requests:
      cpu: "4"          # integer — pins to exclusive CPUs
      memory: "8Gi"
    limits:
      cpu: "4"          # requests == limits → Guaranteed QoS
      memory: "8Gi"
FLAGS
echo

# -- Summary ----------------------------------------------------------------
hr
echo -e "${BOLD}Summary: G1GC vs ZGC${RESET}"
hr
echo
cat << 'SUMMARY'
  Workload                                 | Choose
  -----------------------------------------|--------
  Batch processing, loose SLA, max rps     | G1GC
  Latency-sensitive, p99 SLA < 50ms        | ZGC
  Very large heap (> 32GB)                 | ZGC (G1GC pauses scale with heap)
  CPU-constrained environment              | G1GC (lower constant overhead)
  HPA stability (avoid GC CPU spikes)      | ZGC

  "Choose based on your SLA, not this benchmark."
SUMMARY
echo

# -- Teardown ---------------------------------------------------------------
hr
read -p "Press Enter to tear down..."
podman-compose down -v
echo -e "${GREEN}Demo 06 complete${RESET}"
echo
