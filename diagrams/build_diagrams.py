#!/usr/bin/env python3
"""Generate all 10 Excalidraw diagrams for spring-boot-optimization.

Uses the LGTM diagram generator for SVG + Excalidraw output, then patches
the Excalidraw appState to use dark theme matching the presentation.
"""
import sys, json, os

sys.path.insert(0, os.path.expanduser("~/.claude/skills/lgtm-diagram-generator/scripts"))
import generate_diagram as g

g.OUT = os.path.dirname(os.path.abspath(__file__))

# Dark theme colors matching the presentation
CYAN = "#00BCD4"
GREEN = "#27AE60"
RED = "#E84855"
AMBER = "#F5A623"
BLUE = "#1E6FC8"
PURPLE = "#9B59B6"
GREY = "#90A4AE"
DARK_BG = "#0A1628"
PANEL_BG = "#122040"
BORDER = "#1E3A5F"
WHITE = "#ECF0F1"
DARK_FILL = "#0D1B2A"
GREEN_FILL = "#0D2818"
RED_FILL = "#2C1810"
BLUE_FILL = "#0D1B2A"
PURPLE_FILL = "#1A0D28"
AMBER_FILL = "#281E0D"

# Override the default styles for dark theme
g.STYLES = {
    "box":    (PANEL_BG, BORDER),
    "sub":    (DARK_FILL, BORDER),
    "accent": (AMBER_FILL, AMBER),
    "kernel": (DARK_FILL, GREY),
    "user":   (BLUE_FILL, BLUE),
    "ghost":  (DARK_FILL, BORDER),
    "ink":    (CYAN, CYAN),
    "green":  (GREEN_FILL, GREEN),
    "red":    (RED_FILL, RED),
    "purple": (PURPLE_FILL, PURPLE),
}
g.INK = WHITE
g.GREY = GREY
g.AMBER = AMBER


def patch_dark_theme(name):
    """Patch generated Excalidraw file for dark theme."""
    path = f"{g.OUT}/{name}.excalidraw"
    d = json.load(open(path))
    d["appState"]["viewBackgroundColor"] = DARK_BG
    d["appState"]["theme"] = "dark"
    # Fix text colors for dark background
    for el in d["elements"]:
        if el["type"] == "text":
            if el["strokeColor"] == "#111111":
                el["strokeColor"] = WHITE
            if el["strokeColor"] == "#555555":
                el["strokeColor"] = GREY
    json.dump(d, open(path, "w"), indent=1)


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 01 — GC-Induced HPA Thrash Cycle
# ═══════════════════════════════════════════════════════════════════
def diagram_01():
    g.emit("01-gc-hpa-thrash-cycle", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 840, "h": 300, "label": "Kubernetes Cluster", "fill": DARK_FILL},
        ],
        nodes=[
            {"x": 60,  "y": 140, "w": 170, "h": 70, "style": "green", "lines": ["JVM Pod", "Running normally"]},
            {"x": 280, "y": 140, "w": 170, "h": 70, "style": "red",   "lines": ["GC Pause", "CPU spike 100%"]},
            {"x": 500, "y": 140, "w": 170, "h": 70, "style": "accent","lines": ["HPA Controller", "Sees CPU > threshold"]},
            {"x": 720, "y": 140, "w": 120, "h": 70, "style": "red",   "lines": ["Scale Out", "+2 pods"]},
            {"x": 60,  "y": 280, "w": 170, "h": 70, "style": "red",   "lines": ["New Pods", "Cold start + GC"]},
            {"x": 280, "y": 280, "w": 170, "h": 70, "style": "red",   "lines": ["More CPU Spikes", "Cascading GC"]},
            {"x": 500, "y": 280, "w": 170, "h": 70, "style": "accent","lines": ["HPA Again", "Scales out more"]},
            {"x": 720, "y": 280, "w": 120, "h": 70, "style": "ink",   "lines": ["20 pods", "Needs 3"]},
        ],
        edges=[
            {"x1": 230, "y1": 175, "x2": 280, "y2": 175, "label": "STW"},
            {"x1": 450, "y1": 175, "x2": 500, "y2": 175, "label": "CPU > 80%", "amber": True},
            {"x1": 670, "y1": 175, "x2": 720, "y2": 175},
            {"x1": 780, "y1": 210, "x2": 780, "y2": 280},
            {"x1": 720, "y1": 315, "x2": 670, "y2": 315},
            {"x1": 500, "y1": 315, "x2": 450, "y2": 315},
            {"x1": 280, "y1": 315, "x2": 230, "y2": 315, "label": "repeat", "amber": True},
            {"x1": 60,  "y1": 315, "x2": 60,  "y2": 210, "dashed": True, "label": "cycle"},
        ],
        notes=[
            {"x": 440, "y": 30, "text": "GC-Induced HPA Thrash Cycle", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 55, "text": "Why CPU-based HPA fails for Java workloads", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("01-gc-hpa-thrash-cycle")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 02 — JVM Memory Regions
# ═══════════════════════════════════════════════════════════════════
def diagram_02():
    g.emit("02-jvm-memory-regions", 880, 500,
        bands=[
            {"x": 40, "y": 100, "w": 200, "h": 380, "label": "Container: 2 GB", "fill": BLUE_FILL},
        ],
        nodes=[
            # Heap (largest block)
            {"x": 60,  "y": 135, "w": 160, "h": 160, "style": "green", "lines": ["Heap", "Old + Young Gen", "50-75% of limit", "MaxRAMPercentage"]},
            # Other regions
            {"x": 60,  "y": 305, "w": 160, "h": 50,  "style": "accent","lines": ["Metaspace", "80-250 MB"]},
            {"x": 60,  "y": 365, "w": 160, "h": 50,  "style": "box",   "lines": ["Thread Stacks", "1 MB / thread"]},
            {"x": 60,  "y": 425, "w": 160, "h": 45,  "style": "sub",   "lines": ["Native + GC", "150-400 MB"]},
            # Right side explanations
            {"x": 300, "y": 135, "w": 250, "h": 60,  "style": "green", "lines": ["MaxRAMPercentage=75", "Controlled via JVM flag"]},
            {"x": 300, "y": 215, "w": 250, "h": 60,  "style": "accent","lines": ["MaxMetaspaceSize=256m", "Spring Boot: 80-250 MB"]},
            {"x": 300, "y": 295, "w": 250, "h": 60,  "style": "box",   "lines": ["Virtual Threads", "Stacks move to heap"]},
            {"x": 300, "y": 375, "w": 250, "h": 60,  "style": "sub",   "lines": ["Direct ByteBuffers", "Netty / NIO config"]},
            # Warning box
            {"x": 610, "y": 135, "w": 230, "h": 100, "style": "red",   "lines": ["WARNING", "MaxRAMPercentage=90", "starves off-heap regions", "OOMKill during class load"]},
            {"x": 610, "y": 260, "w": 230, "h": 80,  "style": "ink",   "lines": ["MEASURE WITH", "jcmd pid", "VM.native_memory summary"]},
        ],
        edges=[
            {"x1": 220, "y1": 195, "x2": 300, "y2": 165, "label": "75%"},
            {"x1": 220, "y1": 330, "x2": 300, "y2": 245},
            {"x1": 220, "y1": 390, "x2": 300, "y2": 325},
        ],
        notes=[
            {"x": 440, "y": 30, "text": "JVM Memory Regions in a Container", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 55, "text": "MaxRAMPercentage=75 only controls Heap — leaving 25% for 5 other regions", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("02-jvm-memory-regions")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 03 — AOT Cache Progression
# ═══════════════════════════════════════════════════════════════════
def diagram_03():
    g.emit("03-aot-cache-progression", 880, 380,
        bands=[
            {"x": 20, "y": 100, "w": 840, "h": 120, "label": "JDK 10-21", "fill": DARK_FILL},
            {"x": 20, "y": 240, "w": 840, "h": 120, "label": "JDK 24-25+", "fill": PURPLE_FILL},
        ],
        nodes=[
            {"x": 40,  "y": 120, "w": 170, "h": 80, "style": "box",    "lines": ["CDS", "Class Data Sharing", "JDK base classes only"]},
            {"x": 250, "y": 120, "w": 190, "h": 80, "style": "green",  "lines": ["AppCDS", "Application CDS", "All classes + app classes"]},
            {"x": 480, "y": 120, "w": 190, "h": 80, "style": "accent", "lines": ["Spring Boot + AppCDS", "35-55% startup gain", "3-stage Dockerfile"]},
            {"x": 40,  "y": 260, "w": 190, "h": 80, "style": "purple", "lines": ["Leyden (JDK 24)", "AOT class loading", "~40% startup reduction"]},
            {"x": 280, "y": 260, "w": 210, "h": 80, "style": "purple", "lines": ["Leyden (JDK 25 LTS)", "Method profiles + ergonomics", "~40-55% startup reduction"]},
            {"x": 540, "y": 260, "w": 190, "h": 80, "style": "ghost",  "lines": ["Leyden (JDK 26+)", "ZGC support", "Pre-compiled native code"]},
        ],
        edges=[
            {"x1": 210, "y1": 160, "x2": 250, "y2": 160, "amber": True},
            {"x1": 440, "y1": 160, "x2": 480, "y2": 160, "amber": True},
            {"x1": 230, "y1": 300, "x2": 280, "y2": 300, "amber": True},
            {"x1": 490, "y1": 300, "x2": 540, "y2": 300, "dashed": True},
            {"x1": 575, "y1": 200, "x2": 375, "y2": 260, "label": "evolution", "dashed": True},
        ],
        notes=[
            {"x": 440, "y": 30, "text": "AOT Cache Progression: CDS → AppCDS → Leyden", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 55, "text": "Each generation caches more — configure once, benefit on every JDK upgrade", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("03-aot-cache-progression")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 04 — Container-Aware JVM
# ═══════════════════════════════════════════════════════════════════
def diagram_04():
    g.emit("04-container-aware-jvm", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 400, "h": 300, "label": "BEFORE (broken)", "fill": RED_FILL},
            {"x": 460, "y": 100, "w": 400, "h": 300, "label": "AFTER (correct)", "fill": GREEN_FILL},
        ],
        nodes=[
            # Before
            {"x": 40,  "y": 140, "w": 160, "h": 60, "style": "box",   "lines": ["Host Node", "64 GB RAM"]},
            {"x": 240, "y": 140, "w": 160, "h": 60, "style": "red",   "lines": ["/proc/meminfo", "Reports 64 GB"]},
            {"x": 40,  "y": 230, "w": 160, "h": 60, "style": "red",   "lines": ["JVM reads host", "Claims 16 GB heap"]},
            {"x": 240, "y": 230, "w": 160, "h": 60, "style": "box",   "lines": ["Container", "Limit: 512 MB"]},
            {"x": 140, "y": 320, "w": 160, "h": 60, "style": "red",   "lines": ["OOMKill!", "Exit code 137"]},
            # After
            {"x": 480, "y": 140, "w": 160, "h": 60, "style": "box",   "lines": ["Host Node", "64 GB RAM"]},
            {"x": 680, "y": 140, "w": 160, "h": 60, "style": "green", "lines": ["cgroup limits", "memory.max=512m"]},
            {"x": 480, "y": 230, "w": 180, "h": 60, "style": "green", "lines": ["UseContainerSupport", "Reads cgroup, not host"]},
            {"x": 700, "y": 230, "w": 140, "h": 60, "style": "green", "lines": ["MaxRAMPct=75", "Heap = 384 MB"]},
            {"x": 560, "y": 320, "w": 180, "h": 60, "style": "ink",   "lines": ["Healthy Pod", "Respects limits"]},
        ],
        edges=[
            {"x1": 200, "y1": 170, "x2": 240, "y2": 170},
            {"x1": 320, "y1": 200, "x2": 120, "y2": 230},
            {"x1": 120, "y1": 290, "x2": 180, "y2": 320, "amber": True, "label": "boom"},
            {"x1": 320, "y1": 260, "x2": 280, "y2": 320, "amber": True},
            {"x1": 640, "y1": 170, "x2": 680, "y2": 170},
            {"x1": 560, "y1": 290, "x2": 620, "y2": 320},
            {"x1": 770, "y1": 290, "x2": 710, "y2": 320},
        ],
        notes=[
            {"x": 440, "y": 30, "text": "Container-Aware JVM: Before & After", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 55, "text": "UseContainerSupport reads cgroup limits instead of /proc/meminfo", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("04-container-aware-jvm")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 05 — Spring Boot Leyden Flow
# ═══════════════════════════════════════════════════════════════════
def diagram_05():
    g.emit("05-spring-boot-leyden-flow", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 260, "h": 130, "label": "Stage 1: Compile", "fill": DARK_FILL},
            {"x": 300, "y": 100, "w": 280, "h": 280, "label": "Stage 2: Train", "fill": PURPLE_FILL},
            {"x": 600, "y": 100, "w": 260, "h": 130, "label": "Stage 3: Runtime", "fill": GREEN_FILL},
        ],
        nodes=[
            {"x": 40,  "y": 130, "w": 220, "h": 80, "style": "box",    "lines": ["Maven Build", "mvn package -DskipTests", "Output: app.jar"]},
            {"x": 320, "y": 130, "w": 240, "h": 80, "style": "purple", "lines": ["-XX:AOTMode=record", "Run app, capture profile", "Output: app.aotconf"]},
            {"x": 320, "y": 270, "w": 240, "h": 90, "style": "purple", "lines": ["-XX:AOTMode=create", "Build AOT cache from profile", "Output: app.aot"]},
            {"x": 620, "y": 130, "w": 220, "h": 80, "style": "green",  "lines": ["-XX:AOTCache=app.aot", "Startup with cached data", "~40-55% faster"]},
            # artifacts
            {"x": 40,  "y": 280, "w": 100, "h": 50, "style": "accent", "lines": ["app.jar"]},
            {"x": 620, "y": 280, "w": 100, "h": 50, "style": "ink",    "lines": ["app.aot"]},
            {"x": 740, "y": 280, "w": 100, "h": 50, "style": "accent", "lines": ["app.jar"]},
        ],
        edges=[
            {"x1": 260, "y1": 170, "x2": 320, "y2": 170, "label": "jar", "amber": True},
            {"x1": 440, "y1": 210, "x2": 440, "y2": 270, "label": "aotconf"},
            {"x1": 560, "y1": 315, "x2": 620, "y2": 290, "label": "cache", "amber": True},
            {"x1": 140, "y1": 305, "x2": 320, "y2": 170, "dashed": True},
        ],
        notes=[
            {"x": 440, "y": 30, "text": "Spring Boot + Project Leyden — 3-Stage Build", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 55, "text": "Explicit -XX:AOTMode steps: record profile, create cache, run with cache", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("05-spring-boot-leyden-flow")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 06 — Anti-Patterns vs Fixes
# ═══════════════════════════════════════════════════════════════════
def diagram_06():
    g.emit("06-anti-patterns-vs-fixes", 880, 480,
        bands=[
            {"x": 20, "y": 90, "w": 410, "h": 380, "label": "ANTI-PATTERNS", "fill": RED_FILL},
            {"x": 450, "y": 90, "w": 410, "h": 380, "label": "FIXES", "fill": GREEN_FILL},
        ],
        nodes=[
            # Anti-patterns
            {"x": 40,  "y": 120, "w": 370, "h": 50, "style": "red", "lines": ["Hardcoded -Xmx/-Xms", "Breaks with VPA / container resize"]},
            {"x": 40,  "y": 185, "w": 370, "h": 50, "style": "red", "lines": ["MaxRAMPercentage=90", "Starves Metaspace and off-heap regions"]},
            {"x": 40,  "y": 250, "w": 370, "h": 50, "style": "red", "lines": ["Default ParallelGCThreads", "64 GC threads on a 4-CPU container"]},
            {"x": 40,  "y": 315, "w": 370, "h": 50, "style": "red", "lines": ["CPU-based HPA", "GC pauses trigger false scale-out"]},
            {"x": 40,  "y": 380, "w": 370, "h": 50, "style": "red", "lines": ["No AppCDS with 4-8s startup", "Spring Boot loads 10k+ classes at boot"]},
            # Fixes
            {"x": 470, "y": 120, "w": 370, "h": 50, "style": "green", "lines": ["MaxRAMPercentage=75.0", "Dynamic — scales with container limit"]},
            {"x": 470, "y": 185, "w": 370, "h": 50, "style": "green", "lines": ["75% + MaxMetaspaceSize=256m", "Reserve 25% for off-heap regions"]},
            {"x": 470, "y": 250, "w": 370, "h": 50, "style": "green", "lines": ["ParallelGCThreads = CPU request", "Match GC threads to available CPUs"]},
            {"x": 470, "y": 315, "w": 370, "h": 50, "style": "green", "lines": ["HPA on RPS, not CPU", "KEDA or Prometheus Adapter"]},
            {"x": 470, "y": 380, "w": 370, "h": 50, "style": "green", "lines": ["3-stage AppCDS Dockerfile", "35-55% startup reduction, zero code changes"]},
        ],
        edges=[
            {"x1": 410, "y1": 145, "x2": 470, "y2": 145, "amber": True},
            {"x1": 410, "y1": 210, "x2": 470, "y2": 210, "amber": True},
            {"x1": 410, "y1": 275, "x2": 470, "y2": 275, "amber": True},
            {"x1": 410, "y1": 340, "x2": 470, "y2": 340, "amber": True},
            {"x1": 410, "y1": 405, "x2": 470, "y2": 405, "amber": True},
        ],
        notes=[
            {"x": 440, "y": 25, "text": "Anti-Patterns vs Fixes", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 50, "text": "Every fix is a configuration change — no application code changes required", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("06-anti-patterns-vs-fixes")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 07 — gRPC vs REST Wire Format
# ═══════════════════════════════════════════════════════════════════
def diagram_07():
    g.emit("07-grpc-vs-rest-wire", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 410, "h": 300, "label": "REST / JSON", "fill": RED_FILL},
            {"x": 450, "y": 100, "w": 410, "h": 300, "label": "gRPC / Protobuf", "fill": BLUE_FILL},
        ],
        nodes=[
            # REST side
            {"x": 40,  "y": 130, "w": 170, "h": 60, "style": "red",   "lines": ["HTTP/1.1", "Text-based"]},
            {"x": 230, "y": 130, "w": 180, "h": 60, "style": "red",   "lines": ["JSON payload", "~400 bytes per message"]},
            {"x": 40,  "y": 210, "w": 170, "h": 60, "style": "box",   "lines": ["New connection", "per request"]},
            {"x": 230, "y": 210, "w": 180, "h": 60, "style": "box",   "lines": ["Streaming", "SSE / WebSocket only"]},
            {"x": 140, "y": 300, "w": 170, "h": 60, "style": "accent","lines": ["Best for", "Public APIs, browsers"]},
            # gRPC side
            {"x": 470, "y": 130, "w": 170, "h": 60, "style": "user",  "lines": ["HTTP/2", "Binary, multiplexed"]},
            {"x": 660, "y": 130, "w": 180, "h": 60, "style": "user",  "lines": ["Protobuf payload", "~40 bytes per message"]},
            {"x": 470, "y": 210, "w": 170, "h": 60, "style": "box",   "lines": ["Persistent conn", "Multiplexed streams"]},
            {"x": 660, "y": 210, "w": 180, "h": 60, "style": "box",   "lines": ["4 streaming modes", "Built-in, first-class"]},
            {"x": 570, "y": 300, "w": 180, "h": 60, "style": "ink",   "lines": ["Best for", "Pod-to-pod, internal"]},
        ],
        edges=[
            {"x1": 210, "y1": 160, "x2": 230, "y2": 160},
            {"x1": 640, "y1": 160, "x2": 660, "y2": 160},
        ],
        notes=[
            {"x": 440, "y": 25, "text": "gRPC vs REST Wire Format", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 50, "text": "10x smaller payloads · persistent connections · built-in streaming", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("07-grpc-vs-rest-wire")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 08 — Spring Boot Startup Breakdown
# ═══════════════════════════════════════════════════════════════════
def diagram_08():
    g.emit("08-spring-boot-startup-breakdown", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 840, "h": 140, "label": "Baseline Startup: ~4-8 seconds", "fill": RED_FILL},
            {"x": 20, "y": 260, "w": 840, "h": 140, "label": "With AppCDS: ~2-4 seconds (35-55% faster)", "fill": GREEN_FILL},
        ],
        nodes=[
            # Baseline waterfall
            {"x": 40,  "y": 130, "w": 200, "h": 80, "style": "red",    "lines": ["Class Loading", "~1.5-3s", "10,000-15,000 classes"]},
            {"x": 260, "y": 130, "w": 180, "h": 80, "style": "red",    "lines": ["Auto-Config", "~0.5-1.5s", "Condition evaluation"]},
            {"x": 460, "y": 130, "w": 180, "h": 80, "style": "accent", "lines": ["Bean Init + DI", "~1-2s", "Instantiation & wiring"]},
            {"x": 660, "y": 130, "w": 180, "h": 80, "style": "accent", "lines": ["Tomcat Start", "~0.5-1s", "Embedded server"]},
            # With AppCDS
            {"x": 40,  "y": 290, "w": 120, "h": 80, "style": "green",  "lines": ["Class Loading", "~0.3-0.8s", "CDS archive"]},
            {"x": 180, "y": 290, "w": 140, "h": 80, "style": "green",  "lines": ["Auto-Config", "~0.3-0.8s", "Pre-linked"]},
            {"x": 340, "y": 290, "w": 180, "h": 80, "style": "accent", "lines": ["Bean Init + DI", "~0.8-1.5s", "Same (not cached)"]},
            {"x": 540, "y": 290, "w": 140, "h": 80, "style": "accent", "lines": ["Tomcat Start", "~0.4-0.8s", "Same"]},
            # Arrow showing the savings
            {"x": 720, "y": 290, "w": 120, "h": 80, "style": "ink",    "lines": ["SAVINGS", "35-55%", "faster"]},
        ],
        edges=[
            {"x1": 240, "y1": 170, "x2": 260, "y2": 170},
            {"x1": 440, "y1": 170, "x2": 460, "y2": 170},
            {"x1": 640, "y1": 170, "x2": 660, "y2": 170},
            {"x1": 160, "y1": 330, "x2": 180, "y2": 330},
            {"x1": 320, "y1": 330, "x2": 340, "y2": 330},
            {"x1": 520, "y1": 330, "x2": 540, "y2": 330},
            {"x1": 680, "y1": 330, "x2": 720, "y2": 330, "amber": True},
        ],
        notes=[
            {"x": 440, "y": 25, "text": "Spring Boot Startup Breakdown", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 50, "text": "AppCDS caches class loading + linking — the phases Spring Boot spends most time on", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("08-spring-boot-startup-breakdown")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 09 — Observability Stack
# ═══════════════════════════════════════════════════════════════════
def diagram_09():
    g.emit("09-observability-stack", 880, 420,
        bands=[
            {"x": 20, "y": 100, "w": 280, "h": 300, "label": "Spring Boot App", "fill": DARK_FILL},
            {"x": 320, "y": 100, "w": 240, "h": 300, "label": "Collection", "fill": BLUE_FILL},
            {"x": 580, "y": 100, "w": 280, "h": 300, "label": "Visualization", "fill": GREEN_FILL},
        ],
        nodes=[
            # Spring Boot internals
            {"x": 40,  "y": 130, "w": 240, "h": 60, "style": "green",  "lines": ["Spring Boot Actuator", "/actuator/prometheus"]},
            {"x": 40,  "y": 210, "w": 240, "h": 60, "style": "accent", "lines": ["Micrometer", "jvm.gc.pause, memory, threads"]},
            {"x": 40,  "y": 290, "w": 240, "h": 60, "style": "user",   "lines": ["JDK Flight Recorder", "GC events, allocations, I/O"]},
            # Collection
            {"x": 340, "y": 150, "w": 180, "h": 60, "style": "box",    "lines": ["Prometheus", "Scrapes /actuator/prom"]},
            {"x": 340, "y": 280, "w": 180, "h": 60, "style": "box",    "lines": ["Cryostat (OCP)", "JFR management"]},
            # Visualization
            {"x": 600, "y": 130, "w": 240, "h": 80, "style": "ink",    "lines": ["Grafana", "GC pause histograms", "Memory used vs limit"]},
            {"x": 600, "y": 240, "w": 240, "h": 70, "style": "box",    "lines": ["Alerting", "PrometheusRule:", "GC P99 > 500ms for 2m"]},
            {"x": 600, "y": 330, "w": 240, "h": 60, "style": "user",   "lines": ["Cryostat UI", "JFR recordings, analysis"]},
        ],
        edges=[
            {"x1": 280, "y1": 160, "x2": 340, "y2": 180, "label": "metrics"},
            {"x1": 280, "y1": 240, "x2": 340, "y2": 180, "dashed": True},
            {"x1": 280, "y1": 320, "x2": 340, "y2": 310},
            {"x1": 520, "y1": 180, "x2": 600, "y2": 170, "amber": True, "label": "query"},
            {"x1": 520, "y1": 180, "x2": 600, "y2": 275, "dashed": True},
            {"x1": 520, "y1": 310, "x2": 600, "y2": 360},
        ],
        notes=[
            {"x": 440, "y": 25, "text": "Spring Boot Observability Stack", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 50, "text": "Actuator + Micrometer → Prometheus → Grafana + JFR → Cryostat", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("09-observability-stack")


# ═══════════════════════════════════════════════════════════════════
# DIAGRAM 10 — Panama FFM Call Chain
# ═══════════════════════════════════════════════════════════════════
def diagram_10():
    g.emit("10-panama-ffm-call-chain", 880, 380,
        bands=[
            {"x": 20, "y": 100, "w": 540, "h": 260, "label": "JVM (Java 25)", "fill": BLUE_FILL},
            {"x": 580, "y": 100, "w": 280, "h": 260, "label": "Native (C++)", "fill": AMBER_FILL},
        ],
        nodes=[
            {"x": 40,  "y": 130, "w": 160, "h": 70, "style": "green",  "lines": ["Spring Controller", "@GetMapping /stats"]},
            {"x": 240, "y": 130, "w": 160, "h": 70, "style": "user",   "lines": ["Arena.ofConfined()", "Scoped native memory"]},
            {"x": 40,  "y": 230, "w": 160, "h": 70, "style": "user",   "lines": ["MemorySegment", "arena.allocateFrom()"]},
            {"x": 240, "y": 230, "w": 160, "h": 70, "style": "accent", "lines": ["MethodHandle", "Linker.nativeLinker()"]},
            {"x": 440, "y": 180, "w": 110, "h": 70, "style": "box",    "lines": ["SymbolLookup", "libjvmstats.so"]},
            {"x": 600, "y": 130, "w": 240, "h": 70, "style": "accent", "lines": ["computeP99()", "C++ native function"]},
            {"x": 600, "y": 230, "w": 240, "h": 70, "style": "ink",    "lines": ["Result", "Written to MemorySegment"]},
        ],
        edges=[
            {"x1": 200, "y1": 165, "x2": 240, "y2": 165, "label": "open"},
            {"x1": 320, "y1": 200, "x2": 320, "y2": 230, "label": "allocate"},
            {"x1": 200, "y1": 265, "x2": 240, "y2": 265},
            {"x1": 400, "y1": 265, "x2": 440, "y2": 215, "label": "lookup"},
            {"x1": 550, "y1": 215, "x2": 600, "y2": 165, "amber": True, "label": "invoke"},
            {"x1": 720, "y1": 200, "x2": 720, "y2": 230},
            {"x1": 600, "y1": 265, "x2": 200, "y2": 300, "dashed": True, "label": "Arena.close() frees all"},
        ],
        notes=[
            {"x": 440, "y": 25, "text": "Panama FFM Call Chain", "anchor": "middle", "bold": True, "size": 20, "color": CYAN},
            {"x": 440, "y": 50, "text": "Java → Arena → MemorySegment → MethodHandle → Native C++ — zero-leak by construction", "anchor": "middle", "size": 13, "color": GREY},
        ])
    patch_dark_theme("10-panama-ffm-call-chain")


# ═══════════════════════════════════════════════════════════════════
# Generate all diagrams
# ═══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    light_mode = "--light" in sys.argv

    if light_mode:
        # Light palette for pptx (white slide backgrounds).  Keeps the same
        # semantic hue per style but swaps dark fills for light washes and
        # inverts text from white-on-dark to dark-on-white.
        CYAN   = "#EE0000"     # diagram title → Red Hat red accent
        GREEN  = "#27AE60"
        RED    = "#E84855"
        AMBER  = "#F5A623"
        BLUE   = "#0066CC"     # match deck svc color
        PURPLE = "#6A1B9A"     # match deck data color
        GREY   = "#5A5A5A"     # subtitle → deck caption
        WHITE  = "#151515"     # text → deck ink
        DARK_BG    = "#FFFFFF"
        PANEL_BG   = "#FFFFFF"
        BORDER     = "#D2D2D2"
        DARK_FILL  = "#F8F8F8"
        GREEN_FILL = "#F0FAF5"
        RED_FILL   = "#FEF5F5"
        BLUE_FILL  = "#EEF4FB"
        PURPLE_FILL = "#F5EFF8"
        AMBER_FILL = "#FFF8EF"

        g.STYLES = {
            "box":    ("#FFFFFF", "#242424"),
            "sub":    ("#FFFFFF", "#999999"),
            "accent": ("#FFF8EF", AMBER),
            "kernel": ("#F4F4F4", "#888888"),
            "user":   ("#EEF4FB", BLUE),
            "ghost":  ("#FFFFFF", "#999999"),
            "ink":    ("#151515", "#151515"),
            "green":  (GREEN_FILL, GREEN),
            "red":    (RED_FILL, RED),
            "purple": (PURPLE_FILL, PURPLE),
        }
        g.INK   = "#151515"
        g.GREY  = "#5A5A5A"
        g.AMBER = "#b8650a"

        def patch_dark_theme(_name):
            pass

        import tempfile, subprocess, shutil
        light_dir = tempfile.mkdtemp(prefix="diagrams-light-")
        g.OUT = light_dir

    diagram_01()
    diagram_02()
    diagram_03()
    diagram_04()
    diagram_05()
    diagram_06()
    diagram_07()
    diagram_08()
    diagram_09()
    diagram_10()

    if light_mode:
        png_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "..", "presentation", "png")
        os.makedirs(png_dir, exist_ok=True)
        for f in sorted(os.listdir(light_dir)):
            if f.endswith(".svg"):
                name = f[:-4]
                subprocess.run([
                    "magick", "-density", "192", "-background", "white",
                    os.path.join(light_dir, f), "-flatten",
                    os.path.join(png_dir, f"{name}.png"),
                ], check=True)
                print(f"  {name}.png")
        shutil.rmtree(light_dir)
        print(f"\nLight PNGs written to {png_dir}")
    else:
        print("All 10 diagrams generated.")
