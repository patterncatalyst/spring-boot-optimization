# Demo Prerequisites — Fedora & macOS

Complete install guide for all tools required to run the nine Spring Boot optimization
demos. Instructions are provided for both Fedora Linux and macOS.

---

## Quick-Install Summary

### Fedora

```bash
# Core tools
sudo dnf install -y podman git python3 curl

# podman-compose (not included with Podman)
pip install podman-compose --user

# SDKMAN for JDK management
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# JDK 21 (primary) and JDK 25 (Leyden/Panama/ONNX demos)
sdk install java 21.0.10-tem
sdk install java 25.0.1-tem

# Load testing tools (Demo 05)
# hey: HTTP load tester
go install github.com/rakyll/hey@latest
# Or download the binary from https://github.com/rakyll/hey/releases

# grpcurl: gRPC CLI client
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
# Or: sudo dnf install grpcurl (if available in your repos)

# ghz: gRPC load tester
go install github.com/bojand/ghz/cmd/ghz@latest
```

### macOS

```bash
# Core tools via Homebrew
brew install podman git python3 curl

# Initialize and start Podman machine (macOS uses a Linux VM)
podman machine init --memory 8192 --cpus 4
podman machine start

# podman-compose
pip3 install podman-compose

# SDKMAN for JDK management
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# JDK 21 and JDK 25
sdk install java 21.0.10-tem
sdk install java 25.0.1-tem

# Load testing tools (Demo 05)
brew install hey grpcurl ghz
```

> **Note:** All demos include a Maven wrapper (`./mvnw`), so you do not need a global
> Maven installation. The wrapper downloads the correct Maven version automatically.

---

## Tools by Demo

Not every demo requires every tool. Here is what you need for each:

| Demo | Required tools | Optional tools |
|---|---|---|
| 01 - Heap Sizing | podman, JDK 21 | curl (for testing) |
| 02 - GC Monitoring | podman, podman-compose, JDK 21 | curl |
| 03 - AppCDS | podman, JDK 21 | curl |
| 04 - Leyden | podman, JDK 25 | curl |
| 05 - gRPC | podman, JDK 21 | grpcurl, ghz, hey |
| 06 - Latency | podman, podman-compose, JDK 21 | hey, curl |
| 07 - Right-Sizing | python3 | (no containers) |
| 08 - Panama | podman, JDK 25 | curl |
| 09 - ONNX | podman, JDK 21 | curl |

### Minimum install (Demos 01, 03, 07)

If you only want to run the basic demos, you need:

```bash
# Fedora
sudo dnf install -y podman git python3
sdk install java 21.0.10-tem

# macOS
brew install podman git python3
podman machine init && podman machine start
sdk install java 21.0.10-tem
```

---

## Git

Git is required to clone the repository.

### Fedora

```bash
sudo dnf install -y git
```

### macOS

```bash
# Xcode Command Line Tools (includes git)
xcode-select --install

# Or via Homebrew
brew install git
```

### Verify

```bash
git --version
# Expected: git version 2.x.x
```

### Clone the repository

```bash
git clone https://github.com/<org>/spring-boot-optimization.git
cd spring-boot-optimization/spring-boot-demos
```

---

## Podman

Podman is the container runtime used by all demos. These demos use Podman, not Docker.

### Fedora

```bash
sudo dnf install -y podman
```

Podman is typically pre-installed on Fedora.

### macOS

```bash
brew install podman

# Initialize the Podman machine (Linux VM)
podman machine init --memory 8192 --cpus 4
podman machine start
```

> **macOS note:** Podman runs containers inside a Linux VM. Allocate at least 8 GB memory
> and 4 CPUs to the machine for the GC comparison demos (Demo 02, 06).

### Verify

```bash
podman --version
# Expected: podman version 4.x.x or 5.x.x

podman info --format '{{.Host.OCIRuntime.Name}}'
# Expected: crun (Fedora) or crun (macOS)
```

### Rootless Podman (Fedora)

All demos run with rootless Podman (no `sudo`). This is the default on Fedora. If you
encounter permission issues:

```bash
# Ensure your user has a valid subuid/subgid mapping
grep $USER /etc/subuid
grep $USER /etc/subgid

# If missing, add mappings
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
podman system migrate
```

---

## podman-compose

`podman-compose` is required for demos that use `compose.yml` files (Demo 02 and Demo 06).
It is a drop-in replacement for `docker-compose` that works with Podman.

### Fedora

```bash
pip install podman-compose --user
```

### macOS

```bash
pip3 install podman-compose
```

### Verify

```bash
podman-compose --version
# Expected: podman-compose version x.x.x

# Test with a simple compose file
podman-compose up -d   # (from a demo directory with compose.yml)
podman-compose down
```

> **Note:** `podman-compose` is a Python package, not a system package. Make sure `pip`
> installs to a location on your `PATH` (usually `~/.local/bin`).

---

## SDKMAN (JDK Version Manager)

SDKMAN manages multiple JDK versions side by side. The demos require JDK 21 (primary)
and JDK 25 (for Leyden, Panama, and ONNX demos).

### Install SDKMAN

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
```

### Install JDK 21

```bash
sdk install java 21.0.10-tem
```

### Install JDK 25

```bash
sdk install java 25.0.1-tem
```

### Switching between versions

```bash
# Use JDK 21 (default for most demos)
sdk use java 21.0.10-tem

# Use JDK 25 (for Leyden/Panama/ONNX demos)
sdk use java 25.0.1-tem

# Set a permanent default
sdk default java 21.0.10-tem
```

### Verify

```bash
java -version
# Expected: openjdk version "21.0.10" ...

sdk use java 25.0.1-tem
java -version
# Expected: openjdk version "25.0.1" ...
```

### Available JDK distributions in SDKMAN

| Identifier | Vendor | Notes |
|---|---|---|
| `21.0.10-tem` | Eclipse Temurin | Recommended for demos |
| `25.0.1-tem` | Eclipse Temurin | Required for JDK 25 demos |
| `21.0.10-librca` | BellSoft Liberica | Alternative |
| `21.0.10-zulu` | Azul Zulu | Alternative |

> **Note:** The demos use Eclipse Temurin builds. Red Hat OpenJDK builds (with Shenandoah)
> are used inside containers via UBI9 images; you do not need to install Red Hat OpenJDK
> on your host machine.

---

## Python 3

Python 3 is required for Demo 07 (Right-Sizing) and for `podman-compose`.

### Fedora

```bash
sudo dnf install -y python3 python3-pip
```

Python 3 is pre-installed on Fedora.

### macOS

```bash
brew install python3
```

### Verify

```bash
python3 --version
# Expected: Python 3.10+ (any 3.x version works)

pip3 --version
# Expected: pip 23.x+ from ...
```

---

## hey — HTTP Load Tester

`hey` is an HTTP load testing tool used in Demo 05 and Demo 06 to generate traffic
for latency comparisons.

### Fedora

```bash
# Via Go install (requires Go toolchain)
go install github.com/rakyll/hey@latest

# Or download the binary
curl -L https://github.com/rakyll/hey/releases/latest/download/hey_linux_amd64 -o ~/bin/hey
chmod +x ~/bin/hey
```

### macOS

```bash
brew install hey
```

### Verify

```bash
hey -h
# Should display help text
```

### Usage example

```bash
# 10,000 requests, 50 concurrent connections
hey -n 10000 -c 50 http://localhost:8080/api/data
```

---

## grpcurl — gRPC CLI Client

`grpcurl` is a command-line tool for interacting with gRPC services, similar to `curl`
for REST APIs. Used in Demo 05.

### Fedora

```bash
# Via Go install
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# Or download the binary
curl -L https://github.com/fullstorydev/grpcurl/releases/latest/download/grpcurl_linux_amd64.tar.gz | tar xz
mv grpcurl ~/bin/
```

### macOS

```bash
brew install grpcurl
```

### Verify

```bash
grpcurl --version
# Expected: grpcurl v1.x.x
```

### Usage example

```bash
# List services on a gRPC server
grpcurl -plaintext localhost:9090 list

# Call a method
grpcurl -plaintext -d '{"name": "World"}' \
  localhost:9090 com.example.HelloService/SayHello
```

---

## ghz — gRPC Load Tester

`ghz` is a gRPC benchmarking and load testing tool, analogous to `hey` for HTTP.
Used in Demo 05 for gRPC performance comparison.

### Fedora

```bash
# Via Go install
go install github.com/bojand/ghz/cmd/ghz@latest

# Or download the binary
curl -L https://github.com/bojand/ghz/releases/latest/download/ghz-linux-x86_64.tar.gz | tar xz
mv ghz ~/bin/
```

### macOS

```bash
brew install ghz
```

### Verify

```bash
ghz --version
# Expected: ghz version x.x.x
```

### Usage example

```bash
# Load test a gRPC service
ghz --insecure --call com.example.HelloService/SayHello \
    -d '{"name": "World"}' -n 10000 -c 50 localhost:9090
```

---

## curl and python3 (Standard CLI Tools)

`curl` and `python3` are used throughout the demos for quick HTTP requests and the
right-sizing script.

### Fedora

```bash
sudo dnf install -y curl python3
```

Both are typically pre-installed on Fedora.

### macOS

```bash
# curl is pre-installed on macOS
# python3 via Homebrew
brew install python3
```

### Common usage in demos

```bash
# Test a Spring Boot endpoint
curl -s http://localhost:8080/actuator/health | python3 -m json.tool

# Check Prometheus metrics
curl -s http://localhost:8080/actuator/prometheus | head -20

# Run the right-sizing script (Demo 07)
python3 rightsizing.py --pod my-app --namespace default
```

---

## Podman Image Pre-Pull (Optional but Recommended)

Pre-pulling container images avoids download delays during live demos. This step is
optional but recommended if you are presenting or have limited bandwidth.

```bash
# Java 21 images
podman pull registry.access.redhat.com/ubi9/openjdk-21-runtime
podman pull docker.io/library/maven:3.9-eclipse-temurin-21

# Java 25 images (for Demos 04, 08, 09)
podman pull docker.io/library/eclipse-temurin:25
podman pull docker.io/library/eclipse-temurin:25-jre
podman pull docker.io/library/maven:3.9-eclipse-temurin-25

# Observability stack (Demo 02, 06)
podman pull docker.io/prom/prometheus:latest
podman pull docker.io/grafana/grafana:latest
```

### Verify pulled images

```bash
podman images --format "table {{.Repository}} {{.Tag}} {{.Size}}"
```

---

## Verify Your Setup

Run this checklist to confirm everything is installed correctly:

```bash
echo "=== Git ==="
git --version

echo "=== Podman ==="
podman --version
podman info --format '{{.Host.OCIRuntime.Name}}'

echo "=== podman-compose ==="
podman-compose --version

echo "=== Java 21 ==="
sdk use java 21.0.10-tem
java -version

echo "=== Java 25 ==="
sdk use java 25.0.1-tem
java -version

echo "=== Python 3 ==="
python3 --version

echo "=== hey ==="
hey -h 2>&1 | head -1

echo "=== grpcurl ==="
grpcurl --version

echo "=== ghz ==="
ghz --version

echo "=== Container test ==="
podman run --rm registry.access.redhat.com/ubi9/openjdk-21-runtime java -version
```

### Expected output (summary)

| Tool | Expected version |
|---|---|
| git | 2.x.x |
| podman | 4.x.x or 5.x.x |
| podman-compose | 1.x.x |
| java (21) | 21.0.10 |
| java (25) | 25.0.1 |
| python3 | 3.10+ |
| hey | (any) |
| grpcurl | 1.x.x |
| ghz | (any) |

---

## Fedora — SELinux and Podman Rootless

Fedora uses SELinux in enforcing mode and rootless Podman by default. These are important
considerations for bind-mounted volumes.

### SELinux and bind mounts

When mounting host directories into containers, add the `:Z` suffix to relabel the
files for the container's SELinux context:

```bash
# WRONG -- will fail with "Permission denied"
podman run -v ./data:/app/data myimage

# RIGHT -- :Z relabels for the container's context
podman run -v ./data:/app/data:Z myimage

# In compose.yml
volumes:
  - ./data:/app/data:Z
```

### `:z` vs `:Z`

| Suffix | Meaning | Use case |
|---|---|---|
| `:z` | Shared label -- multiple containers can access | Shared data volumes |
| `:Z` | Private label -- only this container can access | Single-container mounts (most common) |
| (none) | No relabeling | Will fail on SELinux-enforcing systems |

### Checking SELinux status

```bash
getenforce
# Expected: Enforcing

# Temporarily set to permissive (for debugging only)
sudo setenforce 0

# Check SELinux denials
sudo ausearch -m avc -ts recent
```

### Rootless Podman networking

Rootless Podman uses `pasta` (or `slirp4netns` on older versions) for networking.
Port mapping works for ports > 1024:

```bash
# Works (port > 1024)
podman run -p 8080:8080 myimage

# Fails rootless (port < 1024) unless configured
podman run -p 80:8080 myimage

# To allow low ports rootless:
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
```

---

## macOS — Podman Machine

On macOS, Podman runs containers inside a Linux virtual machine. The machine must be
initialized and started before any container operations.

### Initial setup

```bash
# Create a Podman machine with enough resources for the demos
podman machine init --memory 8192 --cpus 4 --disk-size 50

# Start the machine
podman machine start
```

### Resource recommendations

| Resource | Minimum | Recommended |
|---|---|---|
| Memory | 4 GB | 8 GB |
| CPUs | 2 | 4 |
| Disk | 20 GB | 50 GB |

### Common operations

```bash
# Check machine status
podman machine info

# Stop the machine (preserves state)
podman machine stop

# Restart the machine
podman machine start

# Delete and recreate (if issues arise)
podman machine rm
podman machine init --memory 8192 --cpus 4 --disk-size 50
podman machine start
```

### Volume mounts on macOS

On macOS, the Podman machine mounts your home directory by default. Bind mounts from
your home directory work without additional configuration:

```bash
# Works if the project is under $HOME
podman run -v ./data:/app/data myimage

# SELinux :Z suffix is NOT needed on macOS (no SELinux in the VM)
```

### Apple Silicon (M1/M2/M3)

Podman supports Apple Silicon natively. Container images must be available for `linux/arm64`.
All images used in these demos have ARM64 variants.

---

## Uninstall / Cleanup

To remove all tools installed for these demos:

### Fedora

```bash
# Remove Podman and containers
podman system prune --all --force
sudo dnf remove -y podman

# Remove podman-compose
pip uninstall podman-compose

# Remove SDKMAN and all JDKs
rm -rf "$HOME/.sdkman"
# Remove the SDKMAN init line from ~/.bashrc or ~/.zshrc

# Remove Go-installed tools
rm -f "$(go env GOPATH)/bin/hey"
rm -f "$(go env GOPATH)/bin/grpcurl"
rm -f "$(go env GOPATH)/bin/ghz"
```

### macOS

```bash
# Remove Podman machine and all containers
podman machine rm --force
brew uninstall podman hey grpcurl ghz

# Remove podman-compose
pip3 uninstall podman-compose

# Remove SDKMAN and all JDKs
rm -rf "$HOME/.sdkman"
# Remove the SDKMAN init line from ~/.zshrc
```

### Cleanup container artifacts only (keep tools)

```bash
# Remove all containers, images, and volumes
podman system prune --all --force --volumes

# Remove only demo-related images
podman rmi registry.access.redhat.com/ubi9/openjdk-21-runtime
podman rmi docker.io/library/eclipse-temurin:25
podman rmi docker.io/library/maven:3.9-eclipse-temurin-21
```

---

## Minimum vs Full Install

### Minimum install (Demos 01, 03, 07 only)

These three demos cover the fundamentals (heap sizing, AppCDS, right-sizing) and require
the fewest tools:

| Tool | Required? |
|---|---|
| git | Yes |
| podman | Yes (Demos 01, 03) |
| python3 | Yes (Demo 07) |
| JDK 21 | Yes |
| JDK 25 | No |
| podman-compose | No |
| hey | No |
| grpcurl | No |
| ghz | No |

```bash
# Minimum install -- Fedora
sudo dnf install -y podman git python3
curl -s "https://get.sdkman.io" | bash && source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.10-tem

# Minimum install -- macOS
brew install podman git python3
podman machine init && podman machine start
curl -s "https://get.sdkman.io" | bash && source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.10-tem
```

### Full install (all 9 demos)

| Tool | Required for |
|---|---|
| git | All demos |
| podman | Demos 01-06, 08-09 |
| podman-compose | Demos 02, 06 |
| python3 | Demo 07, podman-compose |
| JDK 21 | Demos 01-03, 05-07, 09 |
| JDK 25 | Demos 04, 08 |
| hey | Demos 05, 06 |
| grpcurl | Demo 05 |
| ghz | Demo 05 |

Install everything from the [Quick-Install Summary](#quick-install-summary) section above.

---

## Reference Links

- [Podman documentation](https://docs.podman.io/)
- [podman-compose on GitHub](https://github.com/containers/podman-compose)
- [SDKMAN documentation](https://sdkman.io/usage)
- [Eclipse Temurin releases](https://adoptium.net/temurin/releases/)
- [Red Hat UBI9 OpenJDK images](https://catalog.redhat.com/software/containers/ubi9/openjdk-21-runtime)
- [hey on GitHub](https://github.com/rakyll/hey)
- [grpcurl on GitHub](https://github.com/fullstorydev/grpcurl)
- [ghz on GitHub](https://github.com/bojand/ghz)
- [Fedora SELinux guide](https://docs.fedoraproject.org/en-US/quick-docs/selinux-getting-started/)
- [Podman on macOS](https://podman-desktop.io/docs/podman/installing)
