# Use Ubuntu base image for better compatibility with Noir binaries
FROM ubuntu:24.04 AS builder

# Set noninteractive installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    git \
    build-essential \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM ubuntu:24.04 AS production

# Set noninteractive installation
ENV DEBIAN_FRONTEND=noninteractive

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    git \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install noirup and noir-profiler in production image
ENV SHELL=/bin/bash
ENV NARGO_HOME="/usr/local"
ENV PATH="/usr/local/bin:$PATH"

# Install noirup and Noir tools
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash && \
    noirup --version 1.0.0-beta.11

# Install Barretenberg (BB) proving backend
ENV BB_HOME="/usr/local"
ENV PATH="/usr/local/bin:$PATH"

RUN curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/master/barretenberg/bbup/install | bash && \
    /root/.bb/bbup --version 1.0.0 && \
    echo "=== Contents of /root/.bb ===" && \
    ls -la /root/.bb/ && \
    echo "=== Copying BB binaries ===" && \
    cp /root/.bb/bb /usr/local/bin/ && \
    cp /root/.bb/bbup /usr/local/bin/ && \
    chmod +x /usr/local/bin/bb && \
    chmod +x /usr/local/bin/bbup && \
    echo "=== BB binary permissions ===" && \
    ls -la /usr/local/bin/bb && \
    ls -la /usr/local/bin/bbup

# Create app user
RUN groupadd -r nestjs && useradd -r -g nestjs nestjs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/package*.json ./

# Create required directories with proper permissions
RUN mkdir -p /data/noir-profiler && \
    chown -R nestjs:nestjs /data && \
    mkdir -p ./output && \
    chown -R nestjs:nestjs ./output && \
    mkdir -p /home/nestjs/.bb-crs && \
    chown -R nestjs:nestjs /home/nestjs

# Switch to non-root user
USER nestjs

# Expose correct port (4000 as per the server configuration)
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start:prod"]
