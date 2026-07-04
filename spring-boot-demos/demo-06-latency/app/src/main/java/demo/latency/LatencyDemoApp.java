package demo.latency;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.lang.management.GarbageCollectorMXBean;
import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Demo 06 — Low-Latency JVM Tuning
 *
 * Two instances of this same app run side-by-side:
 *   G1GC  -> port 8080  (-XX:+UseG1GC)
 *   ZGC   -> port 8081  (-XX:+UseZGC -XX:+ZGenerational)
 *
 * Same code. Same heap. Same load. Different GC algorithm.
 * The GC pause delta under /pressure load is the demo.
 */
@SpringBootApplication
@RestController
public class LatencyDemoApp {

    private static final long START_MS = System.currentTimeMillis();

    // ── Records ─────────────────────────────────────────────────────────

    /** GC collector snapshot */
    record GcInfo(String name, long collectionCount, long collectionTimeMs) {}

    /** Response from /info */
    record InfoResponse(
        String gcAlgorithm,
        long heapUsedMb,
        long heapMaxMb,
        long uptimeMs,
        List<GcInfo> gcCollectors,
        String jvmVersion,
        String containerMemory
    ) {}

    /** Response from /pressure */
    record PressureResponse(
        int allocatedMb,
        int iterations,
        long durationMs,
        long gcPauseMs,
        String gcAlgorithm
    ) {}

    /** Response from /allocate */
    record AllocateResponse(
        int allocatedMb,
        long durationMs,
        long heapUsedMb,
        long heapMaxMb
    ) {}

    // ── Main ────────────────────────────────────────────────────────────

    public static void main(String[] args) {
        SpringApplication.run(LatencyDemoApp.class, args);
    }

    // ── Endpoints ───────────────────────────────────────────────────────

    /**
     * GET /info — GC algorithm name, heap info, JVM version, container memory.
     */
    @GetMapping("/info")
    public InfoResponse info() {
        var rt = Runtime.getRuntime();

        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMb  = rt.maxMemory() / (1024 * 1024);

        var gcs = ManagementFactory.getGarbageCollectorMXBeans()
            .stream()
            .map(gc -> new GcInfo(gc.getName(), gc.getCollectionCount(), gc.getCollectionTime()))
            .toList();

        String gcName = gcs.isEmpty() ? "unknown" : gcs.getFirst().name();

        return new InfoResponse(
            gcName, usedMb, maxMb,
            System.currentTimeMillis() - START_MS,
            gcs,
            System.getProperty("java.vm.name") + " " + System.getProperty("java.version"),
            readContainerMemory()
        );
    }

    /**
     * GET /pressure?mb=50&iterations=10
     *
     * Allocate mb megabytes of objects, repeat for iterations.
     * Each allocation fills the objects with data so the JVM cannot optimise them away.
     * This triggers real GC pressure so we can measure actual pause times.
     *
     * The key measurement: gcPauseMs before vs after.
     * G1GC will show large jumps. ZGC will show near-zero increments.
     */
    @GetMapping("/pressure")
    public PressureResponse pressure(
            @RequestParam(defaultValue = "50")  int mb,
            @RequestParam(defaultValue = "10")  int iterations) {

        long gcTimeBefore = totalGcTime();
        long start = System.currentTimeMillis();

        for (int i = 0; i < iterations; i++) {
            allocate(mb);
        }

        long duration  = System.currentTimeMillis() - start;
        long gcPauseMs = totalGcTime() - gcTimeBefore;

        String gcName = ManagementFactory.getGarbageCollectorMXBeans()
            .stream().findFirst().map(GarbageCollectorMXBean::getName).orElse("unknown");

        return new PressureResponse(mb * iterations, iterations, duration, gcPauseMs, gcName);
    }

    /**
     * GET /gc-stats — cumulative GC stats (collection count, total time, last pause).
     */
    @GetMapping("/gc-stats")
    public Map<String, Object> gcStats() {
        long totalCount = 0, totalTime = 0;
        var details = new ArrayList<Map<String, Object>>();

        for (var gc : ManagementFactory.getGarbageCollectorMXBeans()) {
            totalCount += Math.max(0, gc.getCollectionCount());
            totalTime  += Math.max(0, gc.getCollectionTime());
            details.add(Map.of(
                "name",   gc.getName(),
                "count",  Math.max(0, gc.getCollectionCount()),
                "timeMs", Math.max(0, gc.getCollectionTime())
            ));
        }

        var rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMb  = rt.maxMemory() / (1024 * 1024);

        return Map.of(
            "totalGcCount",  totalCount,
            "totalGcTimeMs", totalTime,
            "heapUsedMb",    usedMb,
            "heapMaxMb",     maxMb,
            "heapUsedPct",   maxMb > 0 ? Math.round(usedMb * 100.0 / maxMb) : 0,
            "collectors",    details
        );
    }

    /**
     * GET /allocate?mb=100 — simple allocation endpoint for load testing.
     */
    @GetMapping("/allocate")
    public AllocateResponse allocateEndpoint(@RequestParam(defaultValue = "100") int mb) {
        long start = System.currentTimeMillis();
        allocate(mb);
        long duration = System.currentTimeMillis() - start;

        var rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMb  = rt.maxMemory() / (1024 * 1024);

        return new AllocateResponse(mb, duration, usedMb, maxMb);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private long totalGcTime() {
        return ManagementFactory.getGarbageCollectorMXBeans()
            .stream()
            .mapToLong(gc -> Math.max(0, gc.getCollectionTime()))
            .sum();
    }

    /** Allocate mbToAllocate megabytes of byte arrays and touch them. */
    private void allocate(int mbToAllocate) {
        int chunkSize  = 1024 * 512; // 512 KB per chunk
        int chunks     = (mbToAllocate * 1024 * 1024) / chunkSize;
        var references = new ArrayList<byte[]>(chunks);

        for (int i = 0; i < chunks; i++) {
            byte[] chunk = new byte[chunkSize];
            // Touch the memory so the JVM cannot skip allocation
            chunk[0]             = (byte) i;
            chunk[chunkSize - 1] = (byte) i;
            references.add(chunk);
        }
        // references goes out of scope here -> eligible for collection
    }

    /** Read container memory limit from cgroup v2 or v1. */
    private String readContainerMemory() {
        try {
            // cgroup v2 (RHEL 9, OCP 4.14+)
            var v2 = Path.of("/sys/fs/cgroup/memory.max");
            if (Files.exists(v2)) {
                var s = Files.readString(v2).strip();
                if (!"max".equals(s)) return "%,d MB".formatted(Long.parseLong(s) / (1024 * 1024));
            }
            // cgroup v1 (RHEL 8, older OCP)
            var v1 = Path.of("/sys/fs/cgroup/memory/memory.limit_in_bytes");
            if (Files.exists(v1)) {
                long limit = Long.parseLong(Files.readString(v1).strip());
                if (limit < Long.MAX_VALUE / 2) return "%,d MB".formatted(limit / (1024 * 1024));
            }
        } catch (Exception ignored) {}
        return "not detected";
    }
}
