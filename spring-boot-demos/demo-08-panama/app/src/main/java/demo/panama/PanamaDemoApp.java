package demo.panama;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Demo 08 — Project Panama: C++20 native library via Spring Boot + FFM
 *
 * Spring Boot 4.0.5 / JDK 25 LTS
 *
 * Calls a C++20 shared library (libjvmstats.so) from pure Java via the
 * Foreign Function & Memory API (JEP 454) — no JNI, no wrapper code.
 */
@SpringBootApplication
public class PanamaDemoApp {

    public static void main(String[] args) {
        SpringApplication.run(PanamaDemoApp.class, args);
    }
}
