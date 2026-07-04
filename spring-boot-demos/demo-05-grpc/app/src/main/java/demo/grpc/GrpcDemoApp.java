package demo.grpc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Demo 05 -- REST vs gRPC: Same Service, Two Protocols
 *
 * Spring Boot 4.0.5 auto-configures two servers from a single application:
 *   - Tomcat on port 8080 serving REST (MetricsController)
 *   - Netty  on port 9000 serving gRPC (MetricsGrpcService)
 *
 * Both expose the same JVM metrics -- the demo compares throughput,
 * latency, and streaming capability between the two protocols.
 */
@SpringBootApplication
public class GrpcDemoApp {

    public static void main(String[] args) {
        SpringApplication.run(GrpcDemoApp.class, args);
    }
}
