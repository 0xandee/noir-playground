# Noir Playground Server API Documentation

## 🚀 Overview

The Noir Playground Server is a NestJS-based backend service that provides profiling capabilities for Noir zero-knowledge proof circuits. It integrates with the `noir-profiler` CLI tool to generate flamegraphs and performance analysis for ACIR opcodes, proving backend gates, and execution traces.

**Base URL**: `http://localhost:4000`  
**API Prefix**: `/api`  
**Content-Type**: `application/json`

**CLI Versions**:
- **nargo**: `1.0.0-beta.8` (noirc: `1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68`)
- **noir-profiler**: `1.0.0-beta.8`

---

## 📋 Table of Contents

- [Health & Status](#health--status)
- [Profiling Endpoints](#profiling-endpoints)
- [Error Handling](#error-handling)
- [Request/Response Examples](#requestresponse-examples)
- [Integration Guide](#integration-guide)
- [Docker Deployment](#docker-deployment)

---

## 🏥 Health & Status

### GET `/api/health`

Check the server's health status and availability.

**Response:**
```json
{
  "status": "OK",
  "message": "Noir Playground Server is running",
  "timestamp": "2025-08-29T05:39:39.714Z"
}
```

**Status Codes:**
- `200 OK` - Server is healthy and running

---

## 🔍 Profiling Endpoints

### GET `/api/profile/check-profiler`

Check if the `noir-profiler` CLI tool is available and get its version information.

**Response:**
```json
{
  "available": true,
  "version": "Noir profiler version = 1.0.0-beta.8",
  "message": "Noir profiler is available"
}
```

**Status Codes:**
- `200 OK` - Profiler check completed successfully

**Error Response (when profiler not available):**
```json
{
  "available": false,
  "version": null,
  "message": "Noir profiler not found. Install with: noirup"
}
```

---

### POST `/api/profile/opcodes`

Profile Noir circuits using both `noir-profiler opcodes` and `noir-profiler gates` commands to generate comprehensive flamegraph SVGs.

**Profiling Commands Executed:**

1. **`noir-profiler opcodes`** - Generates ACIR and Brillig opcode profiling
2. **`noir-profiler gates --backend-path bb`** - Generates gate-level backend profiling using Barretenberg backend

**Profiling Types Generated:**

1. **ACIR Opcodes** (`acir_opcodes`) - Main circuit execution profiling
   - Shows ACIR opcode distribution across functions
   - Identifies performance bottlenecks in constraint generation
   - Example: `main_acir_opcodes.svg`

2. **Brillig Opcodes** (`brillig_opcodes`) - Unconstrained execution profiling
   - Shows Brillig opcode distribution for unconstrained functions
   - Identifies performance in unconstrained execution traces
   - Examples: `directive_invert_0_brillig_opcodes.svg`, `directive_integer_quotient_1_brillig_opcodes.svg`

3. **Gates** (`gates`) - Backend gate-level profiling
   - Shows gate-level performance analysis
   - Identifies proving backend bottlenecks
   - Example: `main_gates.svg`

**Note:** 
- **Source Code Required**: The `sourceCode` field is mandatory as it's needed for `nargo info` to analyze the circuit
- **Project Structure**: The service automatically creates a proper Noir project structure with `src/main.nr`
- **Cargo.toml Optional**: The `cargoToml` field is optional but recommended for proper project setup
- **Gates Profiling**: Requires a proving backend (currently configured for Barretenberg with `--backend-path bb`)
- **Fallback**: If gates profiling fails (e.g., unsupported backend), the API continues with opcodes profiling only
- **Backend Path**: Can be customized in the service configuration if needed

**Request Body:**
```typescript
{
  artifact: any;           // Circuit artifact object (required)
  sourceCode: string;      // Noir source code (required)
  cargoToml?: string;      // Optional Cargo.toml content
}
```

**Response:**
```json
{
  "success": true,
  "svgs": [
    {
      "content": "<svg>...</svg>",           // Generated flamegraph SVG content
      "filename": "main_acir_opcodes.svg",   // Generated filename
      "function": "main",                    // Function name
      "type": "acir_opcodes"                // Profiling type
    },
    {
      "content": "<svg>...</svg>",
      "filename": "directive_invert_0_brillig_opcodes.svg",
      "function": "directive_invert_0",
      "type": "brillig_opcodes"
    },
    {
      "content": "<svg>...</svg>",
      "filename": "directive_integer_quotient_1_brillig_opcodes.svg",
      "function": "directive_integer_quotient_1",
      "type": "brillig_opcodes"
    }
  ],
  "error": null                      // Error message (if any)
}
```

**Status Codes:**
- `200 OK` - Profiling completed successfully
- `400 Bad Request` - Invalid request body or validation error
- `500 Internal Server Error` - Profiling failed or server error

**Error Response:**
```json
{
  "success": false,
  "svgs": null,
  "tempFileCreated": false,
  "error": "Detailed error message"
}
```

---

## 📊 Request/Response Examples

### Example 1: Profile a Simple Circuit

**Request:**
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": {
      "noir_version": "1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68",
      "hash": "12345",
      "abi": {
        "parameters": []
      },
      "bytecode": "test"
    },
    "sourceCode": "fn main(x: Field, y: pub Field) { assert(x != y); }"
  }'
```

**Response:**
```json
{
  "success": true,
  "svgs": [
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"...",
      "filename": "main_acir_opcodes.svg",
      "function": "main",
      "type": "acir_opcodes"
    }
  ],
  "circuitMetrics": {
    "totalAcirOpcodes": 5,
    "totalBrilligOpcodes": 0,
    "totalGates": 2902,
    "functions": [
      {
        "package": "simple_circuit",
        "function": "main",
        "expressionWidth": "Bounded { width: 4 }",
        "acirOpcodes": 5,
        "brilligOpcodes": 0
      }
    ]
  },
  "error": null
}
```

### Example 2: Profile a Real Circuit (hello_world)

**Request:**
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": "{\"noir_version\":\"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68\",\"hash\":\"13406761233232836770\",\"abi\":{\"parameters\":[{\"name\":\"x\",\"type\":{\"kind\":\"field\"},\"visibility\":\"private\"},{\"name\":\"y\",\"type\":{\"kind\":\"field\"},\"visibility\":\"public\"}],\"return_type\":{\"abi_type\":{\"kind\":\"field\"},\"visibility\":\"public\"},\"error_types\":{}},\"bytecode\":\"H4sIAAAAAAAA/9VZbXKiQBBtBI2KH6uCrh5iixFQ+LW5SsziMfdsu8TpqsmAWoTXBrsq1RNGm/6afg906CK7/3+/9NrT2qGq8LVXraN2ooC2ItNfV9Jh17gR242jQ5IUx32hYvUW7fNTlkZJejpkKlNplv7ZZ3FcZEl2zE/5McpVEhfqnObxWRt+ZNIdkkm6J+mwJ5T00naPqtIDx9DVAtaE/lXbyr5g5rWv9YAbxNW63PhrXRsYTrB47ZyrOCtVkIZNGVlNqfqEa/AByTSKfTja+omM+eVGzE1tmz35ovu0yaRG5gURC8tQ0uEh3Z+eTe8zJNxhHQHjlcrhiO6jaNP7jAg7DNAoP9Bxt0e+F0V0dvhPTpfBFnvMTCH5nAp7f6my3C5xki6zL1r3BVhEb7WE04IJ7DcsFnEhKoswm3nXMVZ01Zb5PcJ16gTeg7kR8Y8JRnkn9Ljkd8nGeSfSTo8Izzyzwh3WOfUbeQvczgnPPLPqdvIP9Fxo5EfWe8fJIP8pd17yI8eusDHQtUCaCpIXxO6CItYaL0k+swYlnT/vUNXk9+WfSyAMS6FmgI9cBe4WkSPpO7P+AJwpXXACeFDV27Y1D0geeqOfGm3IlxTBiRTXDSKIGMOSYa6h/R46r4Cx8KylnR4TXjqvibcYd0A45XK4Ybw1H1D2GGARqJAx42m7sh6/wTm0Bwupd1npu4tgObbqPtW6x03MxdjR89F3QPCsY8tMMadUFOgB+6WsIORxQX7ibQFpP2qR9ihWMewHEPz2jzMvB5ZOjS+5wJjZvuBjP2Pn55tCY11YMVp5uIV5APb4z7uU1V61h5/dmj55+D9U7Yvbs29WD49MmoJr/g6NuwAa7pn+76M/dqeGRtr39rj2nk133Ou/N+z9K3P3npCmtbssU2ulekvx/EPSjcifmYoAAA=\",\"debug_symbols\":\"pZPBjoMgFEX/hbULeaBgf2UyaailDQlBQ7XJpOm/zytXO51Fk4mzeUfAc4kPuYmjP8znfUin4SJ2HzdxyCHGcN7HoXdTGBLP3u6VWIf7KXvPU+Jlna3RZZ8msUtzjJW4ujiXly6jS4WTy7xaV8KnI5MDTyH6x9O9+rHr96qszSJLqZ5683efnr7a4pPsFp9Ib/HVuj9ps8Vv1uZRY/+3/zbfNqvfbeqfoTf+J49cH/KvP07UfFCVkKUSS5VQpWqx05VoSm1LNaXaUrtSZQ1IgAAFIEByAn+QbAEDWKAroBqQAAEK0ABSiFNahgEs0BUoTuHOKwkQoAANNEALGMACXYFGiuYUyyBAAZzyONGry8Edol8u7GlO/cv9nb7GdWW94WMeen+cs390vqzxWXwD\",\"file_map\":{\"50\":{\"source\":\"pub fn main(x: Field, y: pub Field) -> pub Field {\\n    // Verify that x and y are both non-zero\\n    assert(x != 0);\\n    assert(y != 0);\\n    \\n    // Compute the sum and verify it\\u0027s greater than both inputs\\n    let sum = x + y;\\n    assert(sum as u64 > x as u64);\\n    assert(sum as u64 > y as u64);\\n    \\n    // Return the sum as proof output\\n    sum\\n}\",\"path\":\"/Users/ted/SuperData/working/research/aztec/hello_world/src/main.nr\"}},\"names\":[\"main\"],\"brillig_names\":[\"directive_invert\",\"directive_integer_quotient\"]}"
  }'
```

**Response:**
```json
{
  "success": true,
  "svgs": [
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"...",
      "filename": "main_acir_opcodes.svg",
      "function": "main",
      "type": "acir_opcodes"
    },
    },
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"...",
      "filename": "directive_invert_0_brillig_opcodes.svg",
      "function": "directive_invert_0",
      "type": "brillig_opcodes"
    },
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\"...",
      "filename": "directive_integer_quotient_1_brillig_opcodes.svg",
      "function": "directive_integer_quotient_1",
      "type": "brillig_opcodes"
    }
  ],
  "circuitMetrics": {
    "totalAcirOpcodes": 10,
    "totalBrilligOpcodes": 16,
    "totalGates": 2902,
    "functions": [
      {
        "package": "hello_world",
        "function": "main",
        "expressionWidth": "Bounded { width: 4 }",
        "acirOpcodes": 10,
        "brilligOpcodes": 8
      },
      {
        "package": "hello_world",
        "function": "directive_integer_quotient",
        "expressionWidth": "N/A",
        "acirOpcodes": 0,
        "brilligOpcodes": 8
      }
    ]
  },
  "error": null
}
```

**Circuit Details:**
- **Function**: `main(x: Field, y: pub Field) -> pub Field`
- **Logic**: Adds two fields, verifies they're non-zero, and ensures sum > inputs
- **Brillig Functions**: `directive_invert`, `directive_integer_quotient`
- **Generated SVGs**: ACIR opcodes + 2 Brillig opcode flamegraphs

### Example 3: Check Server Health

**Request:**
```bash
curl http://localhost:4000/api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Noir Playground Server is running",
  "timestamp": "2025-08-29T05:39:39.714Z"
}
```

---

## ⚠️ Error Handling

### Validation Errors (400 Bad Request)

When request validation fails:

```json
{
  "statusCode": 400,
  "message": [
    "artifact should not be empty",
    "artifact must be an object",
    "sourceCode should not be empty",
    "sourceCode must be a string"
  ],
  "error": "Bad Request"
}
```

### Server Errors (500 Internal Server Error)

When profiling fails:

```json
{
  "success": false,
  "error": "Failed to execute noir-profiler command"
}
```

### Common Error Scenarios

1. **Missing Required Fields**: `artifact` and `sourceCode` fields are required
2. **Invalid Artifact**: The artifact must be a valid circuit artifact object
3. **Invalid Source Code**: The sourceCode must be valid Noir code
4. **Profiler Not Available**: `noir-profiler` CLI tool not installed
5. **Permission Issues**: Server cannot write to output directory
6. **Invalid Circuit**: Malformed or unsupported circuit artifact

---

## 🔧 Integration Guide

### Frontend Integration (JavaScript/TypeScript)

```typescript
class NoirProfilerClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    return response.json();
  }

  async checkProfiler(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/profile/check-profiler`);
    return response.json();
  }

  async profileOpcodes(artifact: any, sourceCode: string, cargoToml?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/profile/opcodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifact: artifact,
        sourceCode: sourceCode,
        cargoToml: cargoToml
      })
    });
    return response.json();
  }
}

// Usage
const client = new NoirProfilerClient();
const result = await client.profileOpcodes(circuitArtifact, sourceCode, cargoToml);
if (result.success) {
  // Display all SVG flamegraphs
  result.svgs.forEach(svg => {
    const container = document.createElement('div');
    container.innerHTML = `
      <h3>${svg.function} (${svg.type})</h3>
      <div class="flamegraph">${svg.content}</div>
    `;
    document.getElementById('flamegraphs').appendChild(container);
  });
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

export const useNoirProfiler = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ svgs: Array<{ content: string; filename: string; function?: string; type?: string }> } | null>(null);

  const profileCircuit = useCallback(async (artifact: any, sourceCode: string, cargoToml?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:4000/api/profile/opcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact: artifact,
          sourceCode: sourceCode,
          cargoToml: cargoToml
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Profiling failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { profileCircuit, loading, error, result };
};
```

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t noir-playground-server .

# Run container
docker run -p 4000:4000 \
  -v $(pwd)/output:/app/output \
  -e PORT=4000 \
  noir-playground-server
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Node environment |

---

## 📁 File Management

### Temporary Files

The server automatically manages temporary files:

1. **Creates** temporary artifact files when processing JSON content
2. **Executes** `noir-profiler` commands
3. **Reads** generated SVG output
4. **Cleans up** all temporary files and generated SVGs
5. **Returns** SVG content in the response

### Output Directory

- **Default**: `./output` (relative to server working directory)
- **Permissions**: Server must have write access
- **Cleanup**: Generated files are automatically removed after response

---

## 🔒 Security Considerations

### CORS Configuration

The server has CORS enabled for development:

```typescript
app.enableCors({
  origin: true,                    // Allow all origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});
```

### Input Validation

All requests are validated using `class-validator`:

- **Required fields** are enforced
- **Type validation** ensures correct data types
- **Whitelist mode** rejects unknown properties
- **Transform mode** automatically converts types

### File System Security

- **Temporary files** are created in system temp directory
- **Output paths** are validated and sanitized
- **Automatic cleanup** prevents file system pollution
- **Non-root user** in Docker containers

---

## 🧪 Testing

### Test Script

Run the included test script:

```bash
node test-server.js
```

### Manual Testing with cURL

#### Health Check
```bash
curl -X GET http://localhost:4000/api/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Noir Playground Server is running",
  "timestamp": "2025-08-29T06:43:22.322Z"
}
```

#### Check Profiler Availability
```bash
curl -X GET http://localhost:4000/api/profile/check-profiler
```

**Expected Response:**
```json
{
  "available": true,
  "version": "Noir profiler version = 1.0.0-beta.8",
  "message": "Noir profiler is available"
}
```

#### Profile Circuit Opcodes
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "artifact": {
      "noir_version": "1.0.0-beta.8",
      "hash": "12345",
      "abi": {
        "parameters": []
      },
      "bytecode": "test"
    }
  }'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "svgs": [
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>",
      "filename": "main_acir_opcodes.svg",
      "function": "main",
      "type": "acir_opcodes"
    },
    {
      "content": "<svg xmlns=\"http://www.w3.org/2000/svg\">...</svg>",
      "filename": "main_gates.svg",
      "function": "main",
      "type": "gates"
    }
  ],
  "circuitMetrics": {
    "totalAcirOpcodes": 5,
    "totalBrilligOpcodes": 0,
    "totalGates": 2902,
    "functions": []
  },
  "error": null
}
```

**Expected Response (Error):**
```json
{
  "success": false,
  "svgs": null,
  "error": "Command failed: noir-profiler opcodes..."
}
```

### Advanced cURL Examples

#### Profile with Verbose Output
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -v \
  -d '{
    "artifact": {
      "noir_version": "1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68",
      "hash": "12345",
      "abi": {
        "parameters": []
      },
      "bytecode": "test"
    },
    "sourceCode": "fn main(x: Field, y: pub Field) { assert(x != y); }"
  }'
```

#### Profile with Pretty JSON Response
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -s \
  -d '{"artifact":{"noir_version":"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68","hash":"12345","abi":{"parameters":[]},"bytecode":"test"},"sourceCode":"fn main(x: Field, y: pub Field) { assert(x != y); }"}' | jq '.'
```

#### Profile with Error Handling
```bash
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -d '{"artifact":{"noir_version":"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68","hash":"12345","abi":{"parameters":[]},"bytecode":"test"},"sourceCode":"fn main(x: Field, y: pub Field) { assert(x != y); }"}'
```

#### Test with Real Circuit Artifact
```bash
# Create a circuit artifact file
cat > hello_world.json << 'EOF'
{
  "noir_version": "1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68",
  "hash": "13406761233232836770",
  "abi": {
    "parameters": [
      {"name": "x", "type": {"kind": "field"}, "visibility": "private"},
      {"name": "y", "type": {"kind": "field"}, "visibility": "public"}
    ],
    "return_type": {"abi_type": {"kind": "field"}, "visibility": "public"},
    "error_types": {}
  },
  "bytecode": "H4sIAAAAAAAA/9VZbXKiQBBtBI2KH6uCrh5iixFQ+LW5SsziMfdsu8TpqsmAWoTXBrsq1RNGm/6afg906CK7/3+/9NrT2qGq8LVXraN2ooC2ItNfV9Jh17gR242jQ5IUx32hYvUW7fNTlkZJejpkKlNplv7ZZ3FcZEl2zE/5McpVEhfqnObxWRt+ZNIdkkm6J+mwJ5T00naPqtIDx9DVAtaE/lXbyr5g5rWv9YAbxNW63PhrXRsYTrB47ZyrOCtVkIZNGVlNqfqEa/AByTSKfTja+omM+eVGzE1tmz35ovu0yaRG5gURC8tQ0uEh3Z+eTe8zJNxhHQHjlcrhiO6jaNP7jAg7DNAoP9Bxt0e+F0V0dvhPTpfBFnvMTCH5nAp7f6my3C5xki6zL1r3BVhEb7WE04IJ7DcsFnEhKoswm3nXMVZ01Zb5PcJ16gTeg7kR8Y8JRnkn9Ljkd8nGeSfSTo8Izzyzwh3WOfUbeQvczgnPPLPqdvIP9Fxo5EfWe8fJIP8pd17yI8eusDHQtUCaCpIXxO6CItYaL0k+swYlnT/vUNXk9+WfSyAMS6FmgI9cBe4WkSPpO7P+AJwpXXACeFDV27Y1D0geeqOfGm3IlxTBiRTXDSKIGMOSYa6h/R46r4Cx8KylnR4TXjqvibcYd0A45XK4Ybw1H1D2GGARqJAx42m7sh6/wTm0Bwupd1npu4tgObbqPtW6x03MxdjR89F3QPCsY8tMMadUFOgB+6WsIORxQX7ibQFpP2qR9ihWMewHEPz2jzMvB5ZOjS+5wJjZvuBjP2Pn55tCY11YMVp5uIV5APb4z7uU1V61h5/dmj55+D9U7Yvbs29WD49MmoJr/g6NuwAa7pn+76M/dqeGRtr39rj2nk133Ou/N+z9K3P3npCmtbssU2ulekvx/EPSjcifmYoAAA=",
  "debug_symbols": "pZPBjoMgFEX/hbULeaBgf2UyaailDQlBQ7XJpOm/zytXO51Fk4mzeUfAc4kPuYmjP8znfUin4SJ2HzdxyCHGcN7HoXdTGBLP3u6VWIf7KXvPU+Jlna3RZZ8msUtzjJW4ujiXly6jS4WTy7xaV8KnI5MDTyH6x9O9+rHr96qszSJLqZ5683efnr7a4pPsFp9Ib/HVuj9ps8Vv1uZRY/+3/zbfNqvfbeqfoTf+J49cH/KvP07UfFCVkKUSS5VQpWqx05VoSm1LNaXaUrtSZQ1IgAAFIEByAn+QbAEDWKAroBqQAAEK0ABSiFNahgEs0BUoTuHOKwkQoAANNEALGMACXYFGiuYUyyBAAZzyONGry8Edol8u7GlO/cv9nb7GdWW94WMeen+cs390vqzxWXwD",
  "file_map": {
    "50": {
      "source": "pub fn main(x: Field, y: pub Field) -> pub Field {\n    // Verify that x and y are both non-zero\n    assert(x != 0);\n    assert(y != 0);\n    \n    // Compute the sum and verify it's greater than both inputs\n    let sum = x + y;\n    assert(sum as u64 > x as u64);\n    assert(sum as u64 > y as u64);\n    \n    // Return the sum as proof output\n    sum\n}",
      "path": "/Users/ted/SuperData/working/research/aztec/hello_world/src/main.nr"
    }
  },
  "names": ["main"],
  "brillig_names": ["directive_invert", "directive_integer_quotient"]
}
EOF

# Profile the circuit
curl -X POST http://localhost:4000/api/profile/opcodes \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": @hello_world.json,
    "sourceCode": "pub fn main(x: Field, y: pub Field) -> pub Field {\n    // Verify that x and y are both non-zero\n    assert(x != 0);\n    assert(y != 0);\n    \n    // Compute the sum and verify it'\''s greater than both inputs\n    let sum = x + y;\n    assert(sum as u64 > x as u64);\n    assert(sum as u64 > y as u64);\n    \n    // Return the sum as proof output\n    sum\n}"
  }'
```

**Expected Output:**
- `main_acir_opcodes.svg` - Main function ACIR opcode profiling
- `directive_invert_0_brillig_opcodes.svg` - Brillig opcode profiling for invert
- `directive_integer_quotient_1_brillig_opcodes.svg` - Brillig opcode profiling for quotient

### Testing with Different HTTP Clients

#### Using HTTPie
```bash
# Install HTTPie: pip install httpie
http GET http://localhost:4000/api/health
http GET http://localhost:4000/api/profile/check-profiler
http POST http://localhost:4000/api/profile/opcodes artifact:='{"noir_version":"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68","hash":"12345","abi":{"parameters":[]},"bytecode":"test"}' sourceCode='fn main(x: Field, y: pub Field) { assert(x != y); }'
```

#### Using wget
```bash
# Health check
wget -qO- http://localhost:4000/api/health

# Profile circuit
wget --post-data='{"artifact":{"noir_version":"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68","hash":"12345","abi":{"parameters":[]},"bytecode":"test"},"sourceCode":"fn main(x: Field, y: pub Field) { assert(x != y); }"}' \
     --header='Content-Type:application/json' \
     -qO- http://localhost:4000/api/profile/opcodes
```

#### Using PowerShell (Windows)
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get

# Check profiler
Invoke-RestMethod -Uri "http://localhost:4000/api/profile/check-profiler" -Method Get

# Profile circuit
$body = @{
    artifact = @{
        noir_version = "1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68"
        hash = "12345"
        abi = @{
            parameters = @()
        }
        bytecode = "test"
    }
    sourceCode = "fn main(x: Field, y: pub Field) { assert(x != y); }"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/api/profile/opcodes" -Method Post -Body $body -ContentType "application/json"
```

---

## 🔍 Understanding Profiling Types

### ACIR Opcodes (`acir_opcodes`)
- **What**: Profiling of the Abstract Circuit Intermediate Representation
- **Shows**: How constraint generation is distributed across your circuit functions
- **Use Case**: Identify which parts of your circuit are generating the most constraints
- **Example**: `main_acir_opcodes.svg` shows constraint distribution in your main function

## 📊 Circuit Metrics

The API automatically runs `nargo info` after profiling to provide comprehensive circuit metrics. The service creates a proper Noir project structure:

**Note**: Circuit metrics are collected using the current CLI versions:
- **nargo**: `1.0.0-beta.8` (noirc: `1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68`)
- **noir-profiler**: `1.0.0-beta.8`

```
/data/noir-profiler/{request-id}/
├── src/
│   └── main.nr          # Source code from request
├── Nargo.toml           # Project configuration (if provided)
├── circuit.json         # Artifact file
└── output/              # Generated SVG files
```

### **Total Counts**
- **Total ACIR Opcodes**: Sum of all ACIR opcodes across all functions
- **Total Brillig Opcodes**: Sum of all Brillig opcodes across all functions
- **Total Gates**: Total gates count from gates profiling (e.g., "Total gates by opcodes: 2902")

### **Per-Function Breakdown**
- **Package**: Project package name
- **Function**: Function name in the circuit
- **Expression Width**: Backend expression width (e.g., "Bounded { width: 4 }")
- **ACIR Opcodes**: Number of ACIR opcodes for this function
- **Brillig Opcodes**: Number of Brillig opcodes for this function

### **Example Output**
```
📈 Circuit Statistics:
   - Total ACIR Opcodes: 10
   - Total Brillig Opcodes: 16
   - Total Gates: 2902
   - Functions: 2
     • main: 10 ACIR, 8 Brillig
     • directive_integer_quotient: 0 ACIR, 8 Brillig
```

### Brillig Opcodes (`brillig_opcodes`)
- **What**: Profiling of unconstrained execution traces
- **Shows**: Performance of unconstrained code (like helper functions, complex computations)
- **Use Case**: Optimize unconstrained execution that doesn't affect the proof
- **Example**: `directive_invert_0_brillig_opcodes.svg` shows performance of inversion operations

### Gates (`gates`)
- **What**: Backend gate-level profiling using proving backends
- **Shows**: How the proving backend processes your circuit at the gate level
- **Use Case**: Identify proving backend bottlenecks and optimize for specific backends
- **Example**: `main_gates.svg` shows gate-level performance analysis
- **Note**: Requires a valid backend binary (e.g., Barretenberg)

### When Each Type is Generated
- **ACIR + Brillig**: Always generated by `noir-profiler opcodes`
- **Gates**: Generated by `noir-profiler gates` if backend supports it
- **Total SVGs**: Typically 3-4 files per circuit (ACIR + 1-2 Brillig + optional Gates)

---

## 📚 Additional Resources

- **Noir Documentation**: [https://noir-lang.org/docs](https://noir-lang.org/docs)
- **Noir Profiler**: [https://noir-lang.org/docs/dev/tooling/profiler](https://noir-lang.org/docs/dev/tooling/profiler)
- **NestJS Documentation**: [https://docs.nestjs.com](https://docs.nestjs.com)
- **Docker Documentation**: [https://docs.docker.com](https://docs.docker.com)

---

## 🆘 Support

For issues or questions:

1. Check the server logs for detailed error information
2. Verify `noir-profiler` is installed: `noirup`
3. Ensure proper file permissions for output directory
4. Check network connectivity and CORS configuration

---

*Last updated: August 29, 2025*
*Version: 1.0.0*
