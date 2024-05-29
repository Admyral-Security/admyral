# Workflow Runner

## Development Setup

### Prerequisites

-   Rust >= 1.77.2 (For installation please refer to [Rust Installation](https://www.rust-lang.org/tools/install))

### Build

1. Set up the environment variables in `.env` file. You can copy the `.env.example` file and update the values marked with a TODO accordingly.

    - we use OpenAI for AI actions. In order to enable AI actions, please provide an OpenAI API key in the `.env` file.
    - we use Resend for Send Email action. In order to enabble Send Email action, please provide a Resend API key in the `.env` file.

2. The following commands are important:

```bash
# Build the service
cargo build

# Run the service
cargo run

# Run the service in release mode
cargo run --release

# Run the service from a different IP and port
cargo run -- --ip 0.0.0.0 --port 8080

# Run the tests
cargo test

# Format the code
cargo fmt
```
