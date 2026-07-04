# Demo 05 — Spring Boot gRPC + REST comparison
# Exposes both protocols from the same JVM:
#   REST: port 8080  (GET /metrics -> JSON)
#   gRPC: port 9000  (MetricsService/GetJvmMetrics + StreamMetrics -> Protobuf)

FROM registry.access.redhat.com/ubi9/openjdk-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
# protobuf-maven-plugin generates Java stubs from metrics.proto, then compiles the app
USER 0
RUN mvn package -Dmaven.test.skip=true --no-transfer-progress

FROM registry.access.redhat.com/ubi9/openjdk-21-runtime
WORKDIR /deployments

COPY --from=builder /build/target/grpc-demo-*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
EXPOSE 8080 9000
USER 185
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
