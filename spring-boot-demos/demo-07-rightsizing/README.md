# Demo 07 — Right-Sizing & Cost Impact Analysis

**Spring Boot 4.0.5 / Java 21**

A complete right-sizing exercise: observe actual resource usage, generate
recommendations, model bin-packing improvements, and build a business case.

Pure Python — no cluster, no containers, no pip installs needed.

---

## Run the Demo

```bash
chmod +x demo.sh
./demo.sh
```

## What It Does

Analyses 7 Spring Boot workloads from bundled sample data (14-day Prometheus
export) and produces:

1. **Right-sizing recommendations** per workload (CPU and memory)
2. **Bin-packing improvement** — pods per node before/after
3. **Cost impact calculation** — monthly and annual savings
4. **GC algorithm recommendations** — ZGC upgrade candidates
5. **Implementation plan** — prioritised kubectl commands

No cluster needed. The sample data represents a realistic production cluster
with a mix of over-provisioned and well-sized Spring Boot services.

---

## The Methodology

### Step 1 — Observe (1-2 weeks minimum)

Run VPA in Off mode, then query Prometheus:

```promql
# CPU p95 over 2 weeks
quantile_over_time(0.95, rate(container_cpu_usage_seconds_total[5m])[2w:5m])

# Memory p99 RSS over 2 weeks
quantile_over_time(0.99, container_memory_working_set_bytes[2w:5m])
```

### Step 2 — Calculate

```
CPU request  = p95 actual × 1.30    (30% headroom)
CPU limit    = OMIT                 (throttling hurts JVM more than contention)
Memory req   = p99 RSS × 1.25      (25% headroom)
Memory limit = memory request × 1.20
```

**Why no CPU limit?** JIT compilation and GC threads cause legitimate bursts.
Throttling extends GC pauses, slows JIT warmup, and breaks rollouts.

**Why p95 CPU but p99 memory?** CPU is compressible — throttle slows the pod.
Memory is non-compressible — exceeding the limit causes an immediate OOMKill.

### Step 3 — Apply

```yaml
resources:
  requests:
    cpu: "250m"      # was 2000m
    memory: "512Mi"  # was 2Gi
  limits:
    # cpu: intentionally omitted
    memory: "614Mi"  # 512Mi × 1.2
```

### Step 4 — Measure and repeat quarterly

---

## Tools

### analyze.py

```bash
python3 analyze.py
python3 analyze.py --live    # connect to live cluster (optional)
python3 analyze.py --data sample-data/workloads.json --output report.json
```

Analyses workload data, computes waste, generates recommendations, models
bin-packing improvement, and calculates infrastructure savings.

Uses only Python stdlib — no pip installs required.

---

## Business Case Formula

```
Annual savings = (current_nodes − right_sized_nodes) × node_cost_hr × 8,760
              + oomkills_per_month × mttr_hours × eng_cost_hr × 12

Payback period = implementation_cost / annual_savings × 365
```

Typical results: $150K-$500K/year infra savings, payback < 10 days.

---

## OpenShift Cost Management

`console.redhat.com/openshift/cost-management` — free with subscription.

- **Optimisation Advisor**: automated right-sizing recommendations with savings
- **Cost allocation**: breaks infrastructure cost down to namespace for chargeback
- **Showback reports**: monthly exports for budget conversations

Without OpenShift: Kubecost, OpenCost (CNCF), AWS Cost Explorer for EKS.

---

## Reference

- VPA: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- OpenCost: https://opencost.io
- Kubecost: https://kubecost.com
- *Optimizing Cloud Native Java* (O'Reilly)
