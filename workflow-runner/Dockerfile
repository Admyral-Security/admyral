FROM --platform=linux/arm64 amazonlinux:latest AS base
# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
# Install gcc and other build essentials
RUN yum update -y && \
    yum install -y gcc gcc-c++ make openssl-devel pkgconfig tar perl
RUN cargo install sqlx-cli

FROM base AS chef
# We only pay the installation cost once, 
# it will be cached from the second build onwards
RUN cargo install cargo-chef
# Install cargo binstall
RUN cargo install cargo-binstall
WORKDIR app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release

# Runtime stage
FROM --platform=linux/arm64 amazonlinux:latest AS runtime 
COPY --from=builder /app/target/release/workflow-runner /usr/local/bin/workflow-runner
CMD ["workflow-runner", "--ip", "0.0.0.0", "--port", "80"]
