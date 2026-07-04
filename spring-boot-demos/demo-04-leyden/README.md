# Demo 04: Spring Boot + Project Leyden AOT Cache

Spring Boot 4.0.5 on JDK 25 LTS with Project Leyden AOT caching.

## What is Project Leyden?

Project Leyden extends the JVM's class data sharing into a full ahead-of-time
compilation cache. On JDK 25, the AOT cache stores:

- **Parsed and linked class data** (JEP 483, JDK 24+) -- classes are loaded
  pre-linked, skipping verification and resolution at startup
- **JIT compiler profiles** (JEP 515, JDK 25) -- the JIT can immediately compile
  hot methods using profiles recorded during training, instead of waiting for the
  interpreter to gather them at runtime

Combined, these deliver ~40-55% startup improvement with zero code changes.

## Spring Boot vs. Quarkus

Quarkus integrates Leyden with a single property:
```properties
quarkus.package.jar.aot.enabled=true
```

Spring Boot requires explicit JVM flag steps:

```bash
# Step 1: Training run -- record class loading and JIT profiles
java -XX:AOTMode=record -XX:AOTConfiguration=app.aotconf \
     -Dspring.context.exit=onRefresh -jar app.jar

# Step 2: Create the AOT cache from training data
java -XX:AOTMode=create -XX:AOTConfiguration=app.aotconf \
     -XX:AOTCache=app.aot -cp app.jar

# Step 3: Production run with the cache
java -XX:AOTCache=app.aot -jar app.jar
```

The 3-stage Dockerfile handles steps 1 and 2 at build time. Only the final
`app.jar` + `app.aot` are copied into the production image.

## Running the Demo

```bash
./demo.sh
```

Requires `podman` (or `docker`). No local JDK 25 needed -- everything runs
inside containers using `eclipse-temurin:25`.

The script:
1. Builds baseline and Leyden images
2. Runs 5 timed startup comparisons for each
3. Shows mean/stddev/improvement statistics
4. Displays the AOT cache progression table (CDS -> AppCDS -> Leyden)
5. Queries the `/startup` endpoint for runtime AOT status

## Expected Results

| Configuration | Startup | Improvement |
|---|---|---|
| Baseline (JDK 25, no cache) | ~2700 ms | -- |
| Leyden AOT cache | ~1400 ms | ~40-55% |

Results vary by hardware. The improvement comes from the JVM, not the framework.

## The AOT Cache Progression

| JDK | Cache Content | Improvement |
|---|---|---|
| JDK 21 | Parsed class bytes (AppCDS) | ~15-30% |
| JDK 24 | + linked class state (JEP 483) | ~30-40% |
| JDK 25 | + JIT profiles (JEP 515) | ~40-55% |
| JDK 26 | + ZGC support (JEP 516) | ~40-55% + GC |

## Training Workload Quality

The AOT cache is only as good as the training run. Spring Boot's
`-Dspring.context.exit=onRefresh` starts the application context (loading all
beans, auto-configuration, and dependency injection) then exits cleanly. This
captures the startup class loading pattern that matters most.

For production use, a more representative training workload (e.g., running
integration tests against the started app) would capture additional JIT profiles
and improve steady-state performance.

## Requirements

- **JDK 25** -- Leyden AOT cache requires JDK 24+ (JEP 483), with full
  ergonomics and method profiling available on JDK 25 (JEP 514, JEP 515)
- **podman** or **docker** -- images are built with `eclipse-temurin:25`
- No local JDK 25 installation needed

## Files

```
demo-04-leyden/
  demo.sh                    -- run the full demo
  README.md                  -- this file
  app/
    pom.xml                  -- Spring Boot 4.0.5, java.version=25
    Dockerfile.baseline      -- 2-stage, JDK 25, no AOT cache
    Dockerfile.leyden        -- 3-stage, training + cache creation
    src/main/java/demo/leyden/
      LeydenDemoApp.java     -- @SpringBootApplication + endpoints
    src/main/resources/
      application.properties -- app config, cache, actuator
```
