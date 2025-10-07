# Noir Playground Server

A NestJS-based server that provides HTTP endpoints to execute Noir profiler CLI commands. Built with modern TypeScript practices and Docker support.

## 🚀 Features

- **NestJS Framework** - Modern, scalable Node.js framework with ConfigService
- **ACIR Opcodes Profiling** - Profile circuit complexity with `noir-profiler`
- **Automatic File Management** - Creates temporary files and cleans up automatically
- **Docker Support** - Pre-built image with `noir-profiler` and Barretenberg backend
- **Input Validation** - DTO validation with class-validator
- **CORS Enabled** - Cross-origin requests supported
- **Health Checks** - Built-in health monitoring endpoints
- **Environment Configuration** - Flexible configuration using environment variables

## 🏗️ Architecture

```
src/
├── app/
│   ├── app.controller.ts      # Health endpoint
│   ├── app.module.ts          # Root module
│   └── app.service.ts         # App service
├── config/
│   ├── configuration.ts       # Configuration structure
│   └── config.module.ts      # Config module
├── profiling/
│   ├── dto/                   # Data Transfer Objects
│   ├── interfaces/            # TypeScript interfaces
│   ├── profiling.controller.ts # Profiling endpoints
│   ├── profiling.service.ts   # Core profiling logic
│   └── profiling.module.ts    # Profiling module
└── main.ts                    # Application bootstrap
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Docker** (for containerized deployment)
- **Noir Profiler CLI** (automatically installed in Docker)
- **Barretenberg Backend** (automatically installed in Docker)

## ⚙️ Configuration

The server uses NestJS ConfigService for configuration management. See [CONFIGURATION.md](./CONFIGURATION.md) for detailed configuration options.

### Key Environment Variables

- `PORT` - Server port (default: 4000)
- `NOIR_DATA_PATH` - Base directory for profiling data (default: `/data/noir-profiler`)
- `NOIR_BACKEND_PATH` - Path to BB binary (default: `/usr/local/bin/bb`)

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or build and run manually
docker build -t noir-playground-server .
docker run -p 4000:4000 noir-playground-server
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Install noir-profiler locally
curl -L https://noirup.dev/install | bash
export PATH="$HOME/.noirup/bin:$PATH"
noirup install

# Start development server
npm run start:dev

# Or start production server
npm run start:prod
```

## 🔌 API Endpoints

### Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "status": "OK",
  "message": "Noir Playground Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Check Profiler Availability
```bash
GET /api/profile/check-profiler
```

**Response:**
```json
{
  "available": true,
  "version": "noir-profiler 1.0.0",
  "message": "Noir profiler is available"
}
```

### Profile ACIR Opcodes
```bash
POST /api/profile/opcodes
Content-Type: application/json

{
  "artifact": "{\"noir_version\":\"1.0.0-beta.8+ba05d729b9753aa5ce2b076c1dd4795edb173f68\",\"hash\":\"...\",...}",
  "outputPath": "./output"  // Optional, defaults to ./output
}
```

**Response:**
```json
{
  "success": true,
  "svg": "<svg>flamegraph content...</svg>",
  "filename": "flamegraph.svg",
  "stdout": "Profiling completed",
  "stderr": "",
  "tempFileCreated": true
}
```

## 🧪 Testing

### Test the Server
```bash
# Run the test script
node test-server.js
```

### Run Unit Tests
```bash
npm run test
npm run test:e2e
```

## 🐳 Docker

### Build Image
```bash
docker build -t noir-playground-server .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -v $(pwd)/output:/app/output \
  noir-playground-server
```

### Docker Compose
```bash
# Start services
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f
```

## 🔒 Security Features

- **Input Validation** - DTO validation with class-validator
- **Non-root User** - Docker container runs as non-root user
- **File Cleanup** - Automatic temporary file removal
- **CORS Configuration** - Configurable cross-origin settings

## 📁 File Management

### Temporary Files
- **Location**: System temp directory (`/tmp/noir-profiler-*`)
- **Cleanup**: Automatic removal after profiling
- **Error Handling**: Cleanup occurs even on failures

### Generated Files
- **SVG Files**: Automatically removed after reading
- **Output Directory**: Created if it doesn't exist
- **Permissions**: Proper ownership in Docker

## 🚨 Error Handling

### Common Errors
- **JSON Parsing**: Invalid artifact format
- **Command Execution**: `noir-profiler` not found
- **File Operations**: Permission or disk space issues
- **SVG Generation**: Profiling command failures

### Error Response Format
```json
{
  "success": false,
  "error": "Error description",
  "stdout": "Command output",
  "stderr": "Error output"
}
```

## 🔧 Development

### Project Structure
```
noir-playground-server/
├── src/                    # Source code
├── test/                   # Test files
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose
├── .dockerignore          # Docker ignore file
└── package.json           # Dependencies
```

### Available Scripts
```bash
npm run build          # Build for production
npm run start          # Start production server
npm run start:dev      # Start development server
npm run start:debug    # Start with debug
npm run start:prod     # Start production server
npm run test           # Run unit tests
npm run test:e2e       # Run e2e tests
npm run test:cov       # Run tests with coverage
npm run test:watch     # Run tests in watch mode
```

## 🌐 Integration

### Frontend Integration
```javascript
// Example React integration
const profileCircuit = async (artifactJson) => {
  const response = await fetch('http://localhost:3000/api/profile/opcodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artifact: JSON.stringify(artifactJson)
    })
  });
  
  const result = await response.json();
  if (result.success) {
    // result.svg contains the flamegraph
    return result.svg;
  }
};
```

### Health Monitoring
```bash
# Health check endpoint
curl http://localhost:3000/api/health

# Docker health check
docker inspect --format='{{.State.Health.Status}}' container_name
```

## 🚀 Deployment

### Production Docker
```bash
# Build production image
docker build -t noir-playground-server:prod .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --name noir-server \
  noir-playground-server:prod
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: noir-playground-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: noir-playground-server
  template:
    metadata:
      labels:
        app: noir-playground-server
    spec:
      containers:
      - name: noir-server
        image: noir-playground-server:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
```

## 🐛 Troubleshooting

### Common Issues

1. **"noir-profiler not found"**
   - Ensure Docker image built successfully
   - Check if `noirup install` completed

2. **Permission Denied**
   - Verify Docker volume permissions
   - Check output directory ownership

3. **Port Already in Use**
   - Change PORT environment variable
   - Check for conflicting services

4. **Build Failures**
   - Ensure sufficient disk space
   - Check Docker daemon status

### Debug Mode
```bash
# Start with debug logging
npm run start:debug

# Docker with debug
docker run -p 3000:3000 \
  -e NODE_ENV=development \
  noir-playground-server
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Noir Profiler Documentation](https://noir-lang.org/docs/dev/tooling/profiler)
- [Docker Documentation](https://docs.docker.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
