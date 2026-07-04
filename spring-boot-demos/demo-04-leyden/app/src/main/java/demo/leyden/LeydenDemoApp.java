package demo.leyden;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.nio.file.Files;
import java.util.List;
import java.util.Map;

/**
 * Demo 04 — Spring Boot + Project Leyden AOT Cache / JDK 25 LTS
 *
 * Spring Boot needs explicit -XX:AOTMode steps (no single property like Quarkus).
 * The 3-stage Dockerfile handles training, cache creation, and runtime.
 *
 * Dependencies: starter-web, starter-actuator, starter-cache load enough classes
 * at startup to make the Leyden AOT cache improvement clearly visible.
 */
@SpringBootApplication
@RestController
@EnableCaching
public class LeydenDemoApp {

    private static final long JVM_START_MS =
        ManagementFactory.getRuntimeMXBean().getStartTime();
    private static final long READY_MS = System.currentTimeMillis();

    public static void main(String[] args) {
        SpringApplication.run(LeydenDemoApp.class, args);
    }

    // ── Records ──────────────────────────────────────────────────

    record StartupInfo(
        long startupMs, String jvmVersion, long pid,
        String aotCacheStatus, String gcName,
        String containerMemoryLimit, Map<String, String> leydenJeps
    ) {}

    // ── Endpoints ────────────────────────────────────────────────

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
            "app",          "leyden-demo",
            "springBoot",   org.springframework.boot.SpringBootVersion.getVersion(),
            "java",         System.getProperty("java.version"),
            "startupMs",    READY_MS - JVM_START_MS,
            "aotCache",     aotCacheStatus()
        );
    }

    @GetMapping("/startup")
    public StartupInfo startup() {
        return new StartupInfo(
            READY_MS - JVM_START_MS,
            System.getProperty("java.vm.name") + " " + System.getProperty("java.version"),
            ProcessHandle.current().pid(),
            aotCacheStatus(), activeGcName(),
            containerMemoryLimit(), leydenJepAvailability()
        );
    }

    @GetMapping("/cached-info")
    @Cacheable("startup-cache")
    public Map<String, Object> cachedInfo() {
        return Map.of(
            "jvmArgs",  ManagementFactory.getRuntimeMXBean().getInputArguments(),
            "uptime",   ManagementFactory.getRuntimeMXBean().getUptime(),
            "cachedAt", System.currentTimeMillis()
        );
    }

    @GetMapping("/jvm/flags")
    public Map<String, Object> jvmFlags() {
        List<String> allFlags = ManagementFactory.getRuntimeMXBean().getInputArguments();
        return Map.of(
            "aotFlags",       allFlags.stream().filter(f -> f.contains("AOT")).toList(),
            "gcFlags",        allFlags.stream().filter(f -> f.contains("GC") || f.contains("Gc")).toList(),
            "containerFlags", allFlags.stream().filter(f -> f.contains("Container") || f.contains("RAM")).toList(),
            "all",            allFlags
        );
    }

    // ── Helpers ──────────────────────────────────────────────────

    private String aotCacheStatus() {
        List<String> flags = ManagementFactory.getRuntimeMXBean().getInputArguments();
        if (flags.stream().anyMatch(f -> f.contains("AOTMode=record")))
            return "TRAINING -- recording class loading for AOT cache";
        if (flags.stream().anyMatch(f -> f.contains("AOTMode=create")))
            return "CREATING -- building AOT cache from training data";
        if (flags.stream().anyMatch(f -> f.contains("AOTCache=")))
            return "ACTIVE -- Leyden AOT cache loaded (JEP 483+515)";
        return "NONE -- cold start, no AOT cache";
    }

    private Map<String, String> leydenJepAvailability() {
        int v = Runtime.version().feature();
        return Map.of(
            "JEP_483", v >= 24 ? "available" : "requires JDK 24+",
            "JEP_514", v >= 25 ? "available" : "requires JDK 25 LTS",
            "JEP_515", v >= 25 ? "available" : "requires JDK 25 LTS",
            "JEP_516", v >= 26 ? "available" : "requires JDK 26",
            "running_jdk", String.valueOf(v)
        );
    }

    private String activeGcName() {
        return ManagementFactory.getGarbageCollectorMXBeans()
            .stream().findFirst().map(gc -> gc.getName()).orElse("unknown");
    }

    private String containerMemoryLimit() {
        try {
            var v2 = java.nio.file.Path.of("/sys/fs/cgroup/memory.max");
            if (Files.exists(v2)) {
                String s = Files.readString(v2).strip();
                if (!"max".equals(s))
                    return "%,d MB".formatted(Long.parseLong(s) / (1024 * 1024));
            }
        } catch (Exception ignored) {}
        return "not detected";
    }
}
