package demo.grpc;

import demo.grpc.proto.MetricsRequest;
import demo.grpc.proto.MetricsResponse;
import demo.grpc.proto.MetricsServiceGrpc;
import io.grpc.Context;
import io.grpc.stub.StreamObserver;
import org.springframework.stereotype.Service;

import java.lang.management.ManagementFactory;

/**
 * Demo 05 -- gRPC service implementation (standard gRPC-Java with StreamObserver)
 *
 * protobuf-maven-plugin generates MetricsServiceGrpc from metrics.proto at mvn compile.
 * The @Service annotation registers this as a Spring bean; Spring gRPC auto-detects
 * any BindableService bean and binds it to the Netty gRPC server.
 *
 * Two RPC methods:
 *   GetJvmMetrics  -- unary (equivalent to REST GET /metrics)
 *   StreamMetrics  -- server streaming (no REST equivalent without SSE/WebSocket)
 *
 * Key difference from Quarkus:
 *   Quarkus uses Mutiny (Uni/Multi) reactive types.
 *   Spring gRPC uses standard gRPC-Java StreamObserver callbacks.
 */
@Service
public class MetricsGrpcService extends MetricsServiceGrpc.MetricsServiceImplBase {

    /**
     * Unary RPC -- equivalent to GET /metrics.
     * One request in, one response out, connection stays open for reuse.
     */
    @Override
    public void getJvmMetrics(MetricsRequest request,
                              StreamObserver<MetricsResponse> responseObserver) {
        responseObserver.onNext(buildMetrics());
        responseObserver.onCompleted();
    }

    /**
     * Server streaming -- two modes depending on the request:
     *
     *   count == 0  -> live mode: pushes a new snapshot every second indefinitely
     *                  Used in the demo "watch the stream" step
     *
     *   count  > 0  -> benchmark mode: pushes N messages as fast as possible then stops
     *                  Used in the streaming throughput comparison vs REST polling
     *
     * In both cases: one HTTP/2 connection, zero per-message round-trip overhead.
     * The REST equivalent requires count separate HTTP requests.
     */
    @Override
    public void streamMetrics(MetricsRequest request,
                              StreamObserver<MetricsResponse> responseObserver) {
        int count = request.getCount();

        if (count > 0) {
            // Benchmark mode -- emit N items as fast as possible
            for (int i = 0; i < count; i++) {
                responseObserver.onNext(buildMetrics());
            }
            responseObserver.onCompleted();
        } else {
            // Live mode -- one update per second on a virtual thread.
            // Checks gRPC Context cancellation so the stream stops
            // cleanly when the client disconnects.
            Thread.startVirtualThread(() -> {
                try {
                    while (!Context.current().isCancelled()) {
                        responseObserver.onNext(buildMetrics());
                        Thread.sleep(1000);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    // Client disconnected -- expected during live streaming
                } finally {
                    try {
                        responseObserver.onCompleted();
                    } catch (Exception ignored) {
                        // Stream already closed by client
                    }
                }
            });
        }
    }

    /**
     * Builds a JVM metrics snapshot -- identical data to MetricsController.
     * Uses the Protobuf builder (generated from metrics.proto) instead of Map.
     */
    private MetricsResponse buildMetrics() {
        var rt   = Runtime.getRuntime();
        var bean = ManagementFactory.getRuntimeMXBean();
        var gcs  = ManagementFactory.getGarbageCollectorMXBeans();

        long usedBytes = rt.totalMemory() - rt.freeMemory();
        long maxBytes  = rt.maxMemory();
        long usedMb    = usedBytes / (1024 * 1024);
        long maxMb     = maxBytes  / (1024 * 1024);
        double pct     = maxBytes > 0 ? (usedBytes * 100.0 / maxBytes) : 0;
        String gcName  = gcs.isEmpty() ? "unknown" : gcs.getFirst().getName();

        return MetricsResponse.newBuilder()
                .setHeapUsedMb(usedMb)
                .setHeapMaxMb(maxMb)
                .setHeapUsedPct(Math.round(pct * 10.0) / 10.0)
                .setTimestamp(System.currentTimeMillis())
                .setJvmVersion(bean.getVmVersion())
                .setGcName(gcName)
                .setUptimeMs(bean.getUptime())
                .build();
    }
}
