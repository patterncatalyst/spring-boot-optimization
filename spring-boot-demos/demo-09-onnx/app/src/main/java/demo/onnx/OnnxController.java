package demo.onnx;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.CosineSimilarity;

import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Demo 09 — AI Inference in Spring Boot via LangChain4j + ONNX + Panama
 *
 * The embedding model (all-MiniLM-L6-v2) runs in-process via:
 *   LangChain4j API -> ONNX Runtime Java -> Panama FFM -> native ONNX Runtime .so
 *
 * No Python sidecar. No gRPC. No subprocess. The model runs in the JVM using
 * Panama to bridge to the native inference kernels.
 *
 * Model: all-MiniLM-L6-v2
 *   - 384-dimension sentence embeddings
 *   - ~25MB ONNX file, bundled in the Maven dependency
 *   - Strong semantic similarity, good for RAG retrieval and classification
 */
@RestController
public class OnnxController {

    private final EmbeddingModel embeddingModel;

    public OnnxController(EmbeddingModel embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    // ── Response records ─────────────────────────────────────────────────────

    record EmbedResponse(
        String text,
        int dimensions,
        List<Float> vector,
        String model
    ) {}

    record SimilarityResponse(
        String textA,
        String textB,
        double similarity,
        String interpretation
    ) {}

    record ClassifyResponse(
        String text,
        String category,
        double confidence,
        Map<String, Double> allScores
    ) {}

    record InfoResponse(
        String model,
        int dimensions,
        String panamaNote,
        String javaVersion
    ) {}

    record RankRequest(String reference, List<String> candidates) {}

    // ── Runbook categories for the demo ──────────────────────────────────────

    private static final Map<String, String> RUNBOOK_EXAMPLES = Map.of(
        "GC / Memory",       "OutOfMemoryError heap space GC overhead limit exceeded full garbage collection",
        "CPU / Threads",     "CPU spike high utilisation thread pool exhausted executor queue full",
        "Network / Latency", "connection timeout read timeout HTTP 503 circuit breaker open",
        "Deployment",        "pod crash CrashLoopBackOff image pull failed OOMKilled liveness probe",
        "Database",          "connection pool exhausted SQL timeout deadlock slow query"
    );

    // ── Endpoints ────────────────────────────────────────────────────────────

    /**
     * Embed a sentence — returns the raw 384-dimension float vector.
     * Shows that LangChain4j wraps the Panama FFM call transparently.
     */
    @GetMapping("/embed")
    public EmbedResponse embed(
            @RequestParam(defaultValue = "Hello world") String text) {
        Embedding embedding = embeddingModel.embed(text).content();
        return new EmbedResponse(
            text,
            embedding.dimension(),
            embedding.vectorAsList(),
            "all-MiniLM-L6-v2"
        );
    }

    /**
     * Compute cosine similarity between two sentences.
     * Values: 1.0 = identical meaning, 0.0 = unrelated, -1.0 = opposite
     *
     * Try:
     *   a="OutOfMemoryError in heap"  b="JVM ran out of memory"    -> ~0.85
     *   a="OutOfMemoryError in heap"  b="database connection timeout" -> ~0.15
     */
    @GetMapping("/similarity")
    public SimilarityResponse similarity(
            @RequestParam(defaultValue = "OutOfMemoryError in heap space") String a,
            @RequestParam(defaultValue = "JVM ran out of memory") String b) {
        Embedding ea = embeddingModel.embed(a).content();
        Embedding eb = embeddingModel.embed(b).content();
        double sim   = CosineSimilarity.between(ea, eb);

        return new SimilarityResponse(a, b, sim, interpret(sim));
    }

    /**
     * Classify an alert or incident description into an operations category.
     * Uses embedding similarity against pre-embedded runbook category descriptions.
     *
     * Practical demo: "embed your runbook descriptions, find similar incidents"
     */
    @GetMapping("/classify")
    public ClassifyResponse classify(
            @RequestParam(defaultValue = "Pod restarted with OOMKilled exit code") String alert) {
        Embedding alertEmbedding = embeddingModel.embed(alert).content();

        Map<String, Double> scores = new LinkedHashMap<>();
        String bestCategory = "Unknown";
        double bestScore    = -1.0;

        for (var entry : RUNBOOK_EXAMPLES.entrySet()) {
            Embedding categoryEmbedding = embeddingModel.embed(entry.getValue()).content();
            double score = CosineSimilarity.between(alertEmbedding, categoryEmbedding);
            scores.put(entry.getKey(), Math.round(score * 1000.0) / 1000.0);
            if (score > bestScore) { bestScore = score; bestCategory = entry.getKey(); }
        }

        return new ClassifyResponse(alert, bestCategory, Math.round(bestScore * 1000.0) / 1000.0, scores);
    }

    /**
     * Bulk similarity — useful for on-stage demo comparing a set of incidents
     * to a reference description.
     */
    @PostMapping("/rank")
    public List<Map<String, Object>> rank(@RequestBody RankRequest req) {
        Embedding ref = embeddingModel.embed(req.reference()).content();
        return req.candidates().stream()
            .map(c -> {
                Embedding ce = embeddingModel.embed(c).content();
                double sim = CosineSimilarity.between(ref, ce);
                return Map.<String, Object>of(
                    "text", c,
                    "similarity", Math.round(sim * 1000.0) / 1000.0,
                    "interpretation", interpret(sim));
            })
            .sorted((x, y) -> Double.compare(
                (double) y.get("similarity"), (double) x.get("similarity")))
            .toList();
    }

    @GetMapping("/info")
    public InfoResponse info() {
        Embedding probe = embeddingModel.embed("probe").content();
        return new InfoResponse(
            "all-MiniLM-L6-v2",
            probe.dimension(),
            "ONNX Runtime uses Panama FFM to call native inference kernels — " +
            "no Python sidecar, no subprocess, in-process at JVM speed",
            System.getProperty("java.version")
        );
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static String interpret(double sim) {
        if (sim > 0.9)  return "very high — nearly identical meaning";
        if (sim > 0.75) return "high — strongly related";
        if (sim > 0.5)  return "moderate — somewhat related";
        if (sim > 0.25) return "low — loosely related";
        return "very low — unrelated";
    }
}
