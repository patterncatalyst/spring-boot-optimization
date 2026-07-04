# Demo 08 — Panama FFM: C++20 native library + Spring Boot on JDK 25
#
# Three stages:
#   1. cpp-builder   — compile the C++20 shared library on UBI9
#   2. java-builder  — build the Spring Boot app with maven + JDK 25
#   3. runtime       — eclipse-temurin JRE 25 with both artifacts

# ── Stage 1: C++20 shared library ─────────────────────────────────────────────
# ubi9 base image — gcc-c++ and cmake are in the freely accessible UBI repos
# (ubi-9-appstream, ubi-9-baseos) — no subscription required
FROM registry.access.redhat.com/ubi9 AS cpp-builder

RUN dnf install -y gcc-c++ cmake make && \
    dnf clean all

WORKDIR /build
COPY native .
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --parallel && \
    cmake --install build --prefix /install

# ── Stage 2: Spring Boot Java app ─────────────────────────────────────────────
FROM docker.io/library/maven:3.9-eclipse-temurin-25 AS java-builder
WORKDIR /build
USER root

COPY app/pom.xml .
COPY app/src ./src
RUN mvn package -Dmaven.test.skip=true --no-transfer-progress

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM docker.io/library/eclipse-temurin:25-jre
WORKDIR /app

# Copy native library into a standard path
COPY --from=cpp-builder /install/lib/libjvmstats.so /usr/local/lib/libjvmstats.so

# Refresh dynamic linker cache so SymbolLookup can find libjvmstats.so
RUN echo "/usr/local/lib" > /etc/ld.so.conf.d/jvmstats.conf && ldconfig

# Copy the Spring Boot fat jar
COPY --from=java-builder /build/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
