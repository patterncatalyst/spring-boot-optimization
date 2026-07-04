package demo.grpc;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.Map;

/**
 * Demo 05 -- REST endpoint for side-by-side comparison with gRPC.
 *
 * Same data as MetricsGrpcService.buildMetrics() but:
 *   - JSON text (vs Protobuf binary)
 *   - HTTP/1.1 (vs HTTP/2)
 *   - New connection per request by default (vs persistent multiplexed channel)
 *   - No streaming mode (no equivalent of StreamMetrics without SSE boilerplate)
 *
 * Load test with:   hey -n 10000 -c 50 http://localhost:8080/metrics
 * Load test gRPC:   ghz --insecure --proto metrics.proto \
 *                       --call MetricsService/GetJvmMetrics \
 *                       -n 10000 -c 50 localhost:9000
 */
@RestController
public class MetricsController {

    @GetMapping("/metrics")
    public Map<String, Object> getJvmMetrics() {
        var rt   = Runtime.getRuntime();
        var bean = ManagementFactory.getRuntimeMXBean();
        var gcs  = ManagementFactory.getGarbageCollectorMXBeans();

        long usedBytes = rt.totalMemory() - rt.freeMemory();
        long maxBytes  = rt.maxMemory();
        long usedMb    = usedBytes / (1024 * 1024);
        long maxMb     = maxBytes  / (1024 * 1024);
        double pct     = maxBytes > 0 ? (usedBytes * 100.0 / maxBytes) : 0;
        String gcName  = gcs.isEmpty() ? "unknown" : gcs.getFirst().getName();

        return Map.of(
            "heapUsedMb",  usedMb,
            "heapMaxMb",   maxMb,
            "heapUsedPct", Math.round(pct * 10.0) / 10.0,
            "timestamp",   System.currentTimeMillis(),
            "jvmVersion",  bean.getVmVersion(),
            "gcName",      gcName,
            "uptimeMs",    bean.getUptime()
        );
    }
}
