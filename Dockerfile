Based on the repository's structure, which includes a Rust-based on-chain program and a TypeScript SDK, here are Dockerfiles to containerize the development environment and the production build for the Solana KYC Compliance SDK.

I've created two configurations: one optimized for development with hot-reloading and another for production builds.

1. Development Dockerfile ( Dockerfile.dev )

This file sets up a complete environment with Rust, Solana, Anchor, and Node.js, ideal for coding and testing.

```dockerfile
# Dockerfile.dev
# Stage 1: Base with Rust and Node
FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive \
    RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    NVM_DIR=/usr/local/nvm \
    NODE_VERSION=20

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    pkg-config \
    libssl-dev \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (stable)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && rustup default stable \
    && rustup update

# Install Solana CLI
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Node.js via NVM
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Install Yarn and global tools
RUN npm install -g yarn @project-serum/anchor

# Set working directory
WORKDIR /app

# Copy only dependency files first for caching
COPY Cargo.toml Cargo.lock ./
COPY programs/ programs/
COPY package.json yarn.lock ./

# Build dependencies
RUN yarn install && \
    cargo build --release

# Copy the rest of the source code
COPY . .

# Default command for development (starts a local validator and watches for changes)
CMD ["sh", "-c", "solana-test-validator & anchor test --skip-local-validator"]
```

2. Production Dockerfile ( Dockerfile )

This multi-stage file builds the Rust program and the TypeScript SDK, then creates a lightweight image containing only the compiled artifacts.

```dockerfile
# Dockerfile (Production)
# Stage 1: Builder - Compile Rust program and build TypeScript SDK
FROM ubuntu:22.04 as builder

ENV DEBIAN_FRONTEND=noninteractive \
    RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    NVM_DIR=/usr/local/nvm \
    NODE_VERSION=20

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    pkg-config \
    libssl-dev \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && rustup default stable

# Install Solana CLI (needed for build)
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install Node.js
RUN mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default
ENV PATH=$NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# Install Yarn and Anchor
RUN npm install -g yarn @project-serum/anchor

WORKDIR /build

# Copy source and dependency files
COPY Cargo.toml Cargo.lock ./
COPY programs/ programs/
COPY package.json yarn.lock ./
COPY src/ src/
COPY tsconfig.json ./

# Install dependencies and build
RUN yarn install --frozen-lockfile && \
    anchor build && \
    yarn build

# Stage 2: Final minimal image
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled artifacts from builder
COPY --from=builder /build/target/deploy /app/target/deploy
COPY --from=builder /build/dist /app/dist
COPY --from=builder /build/node_modules /app/node_modules
COPY --from=builder /build/package.json /app/package.json

# Set default command (can be overridden)
CMD ["node", "dist/index.js"]
```

3. Docker Compose for Easy Orchestration ( docker-compose.yml )

To tie everything together and manage services like a Solana validator, use this compose file.

```yaml
version: '3.8'

services:
  solana-validator:
    image: solanalabs/solana:v1.18.4
    command: solana-test-validator --quiet --bind-address 0.0.0.0 --rpc-port 8899
    ports:
      - "8899:8899" # RPC
      - "8900:8900" # WebSocket
    networks:
      - solana-net

  sdk-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - cargo-cache:/usr/local/cargo/registry
      - node-modules-cache:/app/node_modules
    ports:
      - "3000:3000" # Example: if you have a dev server
    environment:
      - RPC_URL=http://solana-validator:8899
    depends_on:
      - solana-validator
    networks:
      - solana-net
    stdin_open: true
    tty: true

volumes:
  cargo-cache:
  node-modules-cache:

networks:
  solana-net:
    driver: bridge
```

🚀 How to Use

1. Development:
   ```bash
   # Start the entire stack (validator + dev environment)
   docker-compose up sdk-dev
   
   # Or, build and run the dev image independently
   docker build -f Dockerfile.dev -t solana-kyc-dev .
   docker run -v $(pwd):/app -it solana-kyc-dev bash
   ```
2. Production Build:
   ```bash
   # Build the production image
   docker build -t solana-kyc-sdk:latest .
   
   # Run the container (example: run tests inside)
   docker run --rm solana-kyc-sdk:latest anchor test
   ```

🔧 Key Adjustments

· Solana Version: Update v1.18.4 in both Dockerfiles and the compose file to match the version required by your project.
· Ports: If your SDK exposes a different port, update the ports section in the docker-compose.yml.
· Commands: The CMD in the Dockerfiles are examples. You should replace them with the specific commands needed to run your application (e.g., yarn start, anchor deploy).

These files provide a solid foundation. You may need to adjust file paths or add environment variables based on the exact build scripts in the repository's package.json or Anchor.toml.

If you encounter any errors related to missing dependencies or specific build steps, feel free to share them, and I can help you refine the Dockerfiles further.
