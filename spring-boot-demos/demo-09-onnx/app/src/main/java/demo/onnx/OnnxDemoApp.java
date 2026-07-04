package demo.onnx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Demo 09 — AI Inference: LangChain4j + ONNX + Panama
 * Spring Boot 4.0.5 / JDK 25 LTS / all-MiniLM-L6-v2
 *
 * In-process sentence embedding inference via:
 *   Spring Boot -> LangChain4j API -> ONNX Runtime Java -> Panama FFM -> native .so
 *
 * No Python sidecar. No gRPC. No subprocess.
 */
@SpringBootApplication
public class OnnxDemoApp {

    public static void main(String[] args) {
        SpringApplication.run(OnnxDemoApp.class, args);
    }
}
