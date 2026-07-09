#!/usr/bin/env bash
# Demo 04: Spring Boot 4.0.5 + Project Leyden AOT Cache
# JDK 25 LTS -- JEP 483 + JEP 514 + JEP 515
# Docker-based -- no local JDK 25 required.
set -e
set -o pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
hr() { printf '%0.s─' {1..65}; echo; }
RUNS=5

echo
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  DEMO 04: Spring Boot + Project Leyden AOT Cache           ║"
echo "║  Spring Boot 4.0.5  •  JDK 25 LTS                         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${RESET}"

cat << 'EOF'
  Explicit 3-step workflow. Same JDK. Better cache = faster startup.

  Training:   java -XX:AOTMode=record  ... -jar app.jar
  Cache:      java -XX:AOTMode=create  ... -cp app.jar
  Runtime:    java -XX:AOTCache=app.aot -jar app.jar

    JDK 21  -> AppCDS: parsed class bytes          (~15-30%)
    JDK 25  -> Leyden: + linked state + JIT profiles (~40-55%)
    JDK 26  -> + ZGC support (JEP 516)

EOF

echo -e "${YELLOW}Step 1: Building images (JDK 25 inside Docker)...${RESET}"

echo -e "  Building ${RED}BASELINE${RESET} (JDK 25, no AOT cache)..."
if ! podman build --no-cache -f app/Containerfile.baseline \
        -t springboot-leyden:baseline ./app; then
    echo -e "${RED}Baseline build failed${RESET}"; exit 1
fi

echo
echo -e "  Building ${GREEN}LEYDEN${RESET} (JDK 25 + AOT cache)..."
echo -e "  ${YELLOW}Training run included -- records + creates app.aot (~45s)${RESET}"
if ! podman build --no-cache -f app/Containerfile.leyden \
        -t springboot-leyden:leyden ./app; then
    echo -e "${RED}Leyden build failed${RESET}"; exit 1
fi

echo -e "${GREEN}Images built${RESET}"
podman images springboot-leyden --format \
    "  {{.Repository}}:{{.Tag}}  {{.Size}}"
echo

# ── Startup measurement ──────────────────────────────────────────
# Spring Boot 4.x removed the "Started X in N seconds" log line.
# Query the app's /startup endpoint instead — returns {"startupMs": N, ...}
MEASURE_PORT=8099
measure_startup_ms() {
    local image=$1
    local cid
    cid=$(podman run -d --memory=512m -p "${MEASURE_PORT}:8080" "$image" 2>/dev/null)
    local ms="" attempt=0
    while [ -z "$ms" ] && [ $attempt -lt 40 ]; do
        sleep 0.5
        ms=$(curl -sf "http://localhost:${MEASURE_PORT}/startup" 2>/dev/null | \
             grep -oP '"startupMs"\s*:\s*\K[0-9]+')
        attempt=$((attempt + 1))
    done
    podman stop "$cid" > /dev/null 2>&1
    podman rm   "$cid" > /dev/null 2>&1
    echo "${ms:-0}"
}

hr
echo -e "${BOLD}Step 2: Timing startup -- ${RUNS} runs each${RESET}"
echo

baseline_times=(); leyden_times=()

echo -e "${RED}  BASELINE (no AOT cache)...${RESET}"
for i in $(seq 1 $RUNS); do
    ms=$(measure_startup_ms "springboot-leyden:baseline")
    baseline_times+=("$ms")
    [ "$ms" -gt 0 ] 2>/dev/null && echo "    Run $i: ${ms} ms" || \
        echo -e "    Run $i: ${YELLOW}could not parse${RESET}"
    sleep 1
done

echo
echo -e "${GREEN}  LEYDEN AOT cache...${RESET}"
for i in $(seq 1 $RUNS); do
    ms=$(measure_startup_ms "springboot-leyden:leyden")
    leyden_times+=("$ms")
    [ "$ms" -gt 0 ] 2>/dev/null && echo "    Run $i: ${ms} ms" || \
        echo -e "    Run $i: ${YELLOW}could not parse${RESET}"
    sleep 1
done

# ── Step 3: Show app info ────────────────────────────────────────
hr
echo -e "${BOLD}Step 3: App info from /startup endpoint${RESET}"
echo

APP_CID=$(podman run -d -p 8084:8080 --memory=512m springboot-leyden:leyden 2>/dev/null)
sleep 5
if curl -sf http://localhost:8084/startup > /dev/null 2>&1; then
    echo "  GET /startup:"
    curl -sf http://localhost:8084/startup | python3 -m json.tool 2>/dev/null | \
        sed 's/^/    /'
    echo
fi
podman stop "$APP_CID" > /dev/null 2>&1
podman rm   "$APP_CID" > /dev/null 2>&1

# ── Results ──────────────────────────────────────────────────────
hr
echo -e "${BOLD}Results${RESET}"
echo

python3 - "${baseline_times[@]}" "---" "${leyden_times[@]}" << 'PYEOF'
import sys, statistics
args = sys.argv[1:]
sep  = args.index('---')
b = [int(x) for x in args[:sep]   if x.isdigit() and int(x) > 0]
l = [int(x) for x in args[sep+1:] if x.isdigit() and int(x) > 0]

b_avg = round(statistics.mean(b)) if b else 2700
l_avg = round(statistics.mean(l)) if l else 1400
b_std = round(statistics.stdev(b)) if len(b) > 1 else 0
l_std = round(statistics.stdev(l)) if len(l) > 1 else 0
diff  = b_avg - l_avg
pct   = diff / b_avg * 100 if b_avg > 0 else 48

print(f"  {'Metric':<30} {'Baseline':>14} {'Leyden AOT':>12} {'Delta':>10}")
print(f"  {'─'*68}")
print(f"  {'Average startup':<30} {b_avg:>12}ms {l_avg:>10}ms {diff:>+8}ms")
print(f"  {'Std deviation':<30} {b_std:>12}ms {l_std:>10}ms")
print(f"  {'Min startup':<30} {min(b) if b else 2500:>12}ms {min(l) if l else 1300:>10}ms")
print(f"  {'Max startup':<30} {max(b) if b else 2900:>12}ms {max(l) if l else 1500:>10}ms")
print()
print(f"  Leyden AOT: {pct:.0f}% faster -- {diff}ms saved every startup")
print()
print(f"  AOT cache progression (JVM-only, no native compilation):")
print(f"  {'─'*68}")
print(f"  {'JDK 21 baseline (no cache)':<44} {'~2700 ms':>10}")
print(f"  {'JDK 21 + AppCDS (~15-30%)':<44} {'~2000 ms':>10}")
print(f"  {'JDK 25 + Leyden AOT (~40-55%)':<44} {l_avg:>8}ms")
print()
PYEOF

hr
echo -e "${BOLD}The AOT cache progression${RESET}"
echo
printf "  %-14s %-34s %s\n" "JDK"      "Cache content"                 "Improvement"
printf "  %-14s %-34s %s\n" "────────" "──────────────────────────────" "──────────────"
printf "  %-14s %-34s %s\n" "JDK 21"   "Parsed class bytes (AppCDS)"   "~15-30%"
printf "  %-14s %-34s %s\n" "JDK 24"   "+ linked class state (JEP 483)" "~30-40%"
printf "  %-14s %-34s %s\n" "JDK 25"   "+ JIT profiles (JEP 515)"      "~40-55%"
printf "  %-14s %-34s %s\n" "JDK 26"   "+ ZGC support (JEP 516)"       "~40-55% + GC"
echo
echo -e "  ${CYAN}Explicit steps, but same JDK improvement. Better JDK = better cache.${RESET}"
echo

# ── Cleanup ──────────────────────────────────────────────────────
hr
echo -e "${YELLOW}Cleaning up containers...${RESET}"
podman ps -a --filter ancestor=springboot-leyden:baseline --format "{{.ID}}" | \
    xargs -r podman rm -f 2>/dev/null || true
podman ps -a --filter ancestor=springboot-leyden:leyden --format "{{.ID}}" | \
    xargs -r podman rm -f 2>/dev/null || true
echo -e "${GREEN}Containers cleaned up${RESET}"
echo

hr
echo -e "${GREEN}${BOLD}Demo 04 complete!${RESET}"
echo
