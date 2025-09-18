# Configuration Guide

This document explains how to configure the Noir Playground Server using environment variables.

## Environment Variables

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | The port on which the server will listen |

### Noir Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NOIR_DATA_PATH` | `/data/noir-profiler` | Base directory for storing temporary profiling data |
| `NOIR_BACKEND_PATH` | `/usr/local/bin/bb` | Full path to the Barretenberg (BB) binary |

### Database Configuration (Future Use)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `undefined` | Database connection string (not currently used) |

## Example .env File

Create a `.env` file in the root directory with your configuration:

```bash
# Server Configuration
PORT=4000

# Noir Configuration
NOIR_DATA_PATH=/data/noir-profiler
NOIR_BACKEND_PATH=/usr/local/bin/bb

# Database Configuration (if needed in the future)
# DATABASE_URL=postgresql://user:password@localhost:5432/noir_playground
```

## Docker Configuration

When running in Docker, you can override these values using environment variables:

```bash
docker run -e PORT=5000 -e NOIR_DATA_PATH=/custom/path noir-playground-server
```

## Configuration Priority

1. Environment variables (highest priority)
2. .env file
3. Default values (lowest priority)

## Validation

The configuration is validated at startup. If required values are missing, the application will use sensible defaults.

