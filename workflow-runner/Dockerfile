FROM debian:bullseye-slim AS base
# Install gcc and other build essentials
RUN rm -rf /var/lib/apt/lists/* && apt-get update -o Acquire::CompressionTypes::Order::=gz && \
    apt-get update && \
    apt-get install -y --fix-missing gcc g++ make libssl-dev pkg-config curl && \
    apt-get clean
# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
# Install sqlx
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
FROM debian:bullseye-slim AS runtime 
RUN apt-get update && apt-get install -y --fix-missing curl
COPY --from=builder /app/target/release/workflow-runner /usr/local/bin/workflow-runner
CMD ["workflow-runner", "--ip", "0.0.0.0", "--port", "80"]
