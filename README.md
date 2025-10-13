# 🔮 Noir Playground

A browser-based Noir zero-knowledge proof development environment with Monaco editor integration.

[![Noir](https://img.shields.io/badge/Noir-v1.0.0--beta.11-black?style=flat-square)](https://noir-lang.org/)
[![Barretenberg](https://img.shields.io/badge/Barretenberg-v1.0.0-black?style=flat-square)](https://github.com/AztecProtocol/barretenberg)

🚀 **[Live Demo](https://noir-playground.app)** | 📚 **[Documentation](./docs/noirjs-barretenberg-integration.md)**

![Noir Playground Interface](./docs/playground-screenshot.png)

## Quick Start

### Frontend Only (Basic Features)

```bash
# Clone and install
git clone https://github.com/0xandee/noir-playground.git
cd noir-playground
npm install

# Start development server (WASM compilation mode)
npm run dev
# → Open http://localhost:5173
```

### Full-Featured Setup (Recommended)

For debugging, profiling, and faster compilation, run the companion server:

```bash
# Terminal 1: Clone and start server
git clone https://github.com/0xandee/noir-playground-server.git
cd noir-playground-server
npm install
npm run start:dev  # Runs on http://localhost:4000

# Terminal 2: Configure and start frontend
cd noir-playground
echo "VITE_USE_SERVER_COMPILER=true" > .env
echo "VITE_PROFILER_SERVER_URL=http://localhost:4000" >> .env
npm run dev  # Runs on http://localhost:5173
```

## Features

### Core Functionality
-   **Monaco Editor** with Noir syntax highlighting and smart completions
-   **5-step execution pipeline**: Parse → Compile → Execute → Prove → Verify
-   **Dynamic input forms** automatically generated from function signatures
-   **Multi-file support** (main.nr + Nargo.toml editor tabs)
-   **Zero-knowledge proof** generation and verification using UltraHonkBackend

### Advanced Development Tools
-   **🐛 Interactive Debugging** - VSCode-style debugger with DAP (Debug Adapter Protocol) integration
    -   Step-through execution (next/stepIn/stepOut/continue)
    -   Breakpoint management with glyph margin controls
    -   Real-time variable inspection and witness map viewing
    -   ACIR opcode exploration at each execution step
-   **⚡ Dual Compilation Modes**
    -   Server-side compilation (recommended): Native `nargo compile`, 2-5x faster, no CORS issues
    -   WASM compilation (fallback): Browser-based, works without server
-   **📊 Circuit Complexity Profiling** with real-time heatmaps
    -   Visual heat overlays showing ACIR opcodes, Brillig opcodes, and gate counts
    -   Inline badges with per-line complexity metrics
    -   Interactive hotspot navigator with click-to-jump functionality
-   **📦 External Library Support**
    -   Git dependency resolution from GitHub (e.g., `noir-bignum`, `poseidon`)
    -   Automatic recursive transitive dependency resolution
    -   Intelligent IndexedDB caching (95% faster subsequent loads)
-   **🔗 Code Sharing** with dynamic SEO and social media previews
-   **Professional UI** with dark theme optimization and responsive design

## Example

Write Noir circuits directly in the browser:

```noir
fn main(secret: Field, public_value: pub Field) -> Field {
    assert(secret > 0);
    assert(public_value > 0);
    secret + public_value
}
```

The playground automatically:

1. Generates input forms based on your function signature
2. Compiles and executes circuits
3. Generates zero-knowledge proofs
4. Provides detailed execution feedback

## Architecture

### Compilation Modes

The playground supports two compilation strategies with intelligent fallback:

#### 🚀 Server-Side Compilation (Recommended)
```bash
VITE_USE_SERVER_COMPILER=true  # Enable in .env
```
- **Native performance**: Uses `nargo compile` CLI (~2-5x faster than WASM)
- **Full git support**: Native dependency resolution, no CORS restrictions
- **Better error messages**: Direct Nargo CLI output
- **Requires**: Companion [noir-playground-server](https://github.com/0xandee/noir-playground-server) deployment

#### 🌐 WASM Compilation (Fallback)
```bash
VITE_USE_SERVER_COMPILER=false  # Default if server unavailable
```
- **No server needed**: Pure browser-based compilation via `@noir-lang/noir_wasm`
- **Limited git support**: Subject to CORS restrictions for external dependencies
- **Slower performance**: WASM overhead vs native execution
- **Use case**: Standalone deployments without backend infrastructure

### Unified Server Integration

The companion [noir-playground-server](https://github.com/0xandee/noir-playground-server) provides three core services:

1. **Compilation API** (`POST /api/compile`) - Server-side `nargo compile` with git dependency resolution
2. **Profiler API** (`POST /api/profile`) - Circuit complexity analysis with ACIR/Brillig/gates metrics
3. **Debug API** (`/api/debug/*`) - DAP protocol implementation for interactive debugging

All three services run on a single NestJS server (default: `http://localhost:4000`).

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run linter
npm run preview  # Preview production build
```

### Environment Configuration

Create a `.env` file in the project root to configure features:

```bash
# Compilation Mode (Recommended: true for full features)
VITE_USE_SERVER_COMPILER=true

# Unified Server URLs (compilation + profiling + debugging)
VITE_PROFILER_SERVER_URL=http://localhost:4000              # Local development
# VITE_PROFILER_SERVER_URL=https://your-server.app          # Production

# Optional: Override debug server URL (defaults to VITE_PROFILER_SERVER_URL)
# VITE_DEBUG_SERVER_URL=http://localhost:4000

# Code Sharing & Social Previews (optional)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Local Development with Full Features:**
```bash
# Terminal 1: Start the backend server
git clone https://github.com/0xandee/noir-playground-server.git
cd noir-playground-server
npm install
npm run start:dev  # Runs on port 4000

# Terminal 2: Start the frontend (this repo)
cd noir-playground
npm run dev  # Runs on port 5173, connects to server
```

### Tech Stack

-   React 18.3+ + TypeScript 5.5+
-   Vite 5.4+ with WASM support
-   Monaco Editor 0.52+
-   ShadCN/UI + Tailwind CSS
-   **NoirJS Integration**: @noir-lang/noir_js ^1.0.0-beta.11
-   **Barretenberg Backend**: @aztec/bb.js ^1.0.0
-   **WASM Compilation**: @noir-lang/noir_wasm ^1.0.0-beta.11

> 📖 Learn more about the [NoirJS + Barretenberg integration](./docs/noirjs-barretenberg-integration.md) that powers this playground's zero-knowledge proof capabilities.

## Related Repositories

-   **[noir-playground-server](https://github.com/0xandee/noir-playground-server)** - Unified NestJS backend providing:
    -   **Compilation API**: Native `nargo compile` with git dependency resolution
    -   **Profiler API**: Circuit complexity analysis (ACIR/Brillig opcodes, gate counts, heatmap generation)
    -   **Debug API**: DAP (Debug Adapter Protocol) implementation for interactive debugging
    -   **Docker Support**: Pre-built container with noir-profiler CLI and Barretenberg backend

## Use Cases

-   **Learning Noir** - Interactive playground with instant feedback
-   **Prototyping ZK circuits** - Rapid iteration without local setup
-   **Teaching ZK concepts** - Visual workflow demonstration
-   **Experimenting** - Safe environment for testing ideas

## Recent Additions

-   ✅ **Real-time circuit complexity metrics and heatmaps** - Visual heat overlays with per-line ACIR/Brillig/gate analysis
-   ✅ **Runtime witness value probing** - Interactive debugger with witness map inspection and variable viewing
-   ✅ **External library support with caching** - Git dependency resolution with IndexedDB caching (95% faster)
-   ✅ **Server-side compilation** - Native `nargo compile` integration with 2-5x performance boost
-   ✅ **Interactive debugging** - Full DAP implementation with breakpoints, step execution, and state inspection

## Roadmap

-   [ ] **Interactive DAG renders of ACIR bytecodes** - Visual flowchart representation of compiled circuit logic
-   [ ] **Side-by-side constraint inspector** - Compare Noir source code with generated ACIR constraints line-by-line
-   [ ] **Circuit optimization analyzer** - Automated suggestions for reducing gate count and complexity
-   [ ] **VS Code extension integration** - Port core features to a native IDE extension for local development
-   [ ] **Collaborative editing** - Multi-user real-time code sharing and debugging sessions

## Known Limitations

-   **Mobile support**: Monaco editor performance limitations require desktop browsers
-   **Dependency bundling**: Cannot preload Noir stdlib locally due to [noir#7823](https://github.com/noir-lang/noir/issues/7823)
-   **Private repositories**: Git dependency resolution only supports public GitHub repositories

## UI Inspiration

-   Inspired by the excellent [Cairo VM Playground](https://cairovm.codes/) and [Walnut](https://app.walnut.dev/).

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [Noir Playground Contributors](./LICENSE)
