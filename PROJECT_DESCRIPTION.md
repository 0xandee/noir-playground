# Noir Playground - Project Description

## Short Description

A browser-based IDE for Noir zero-knowledge proof development featuring interactive debugging, real-time circuit complexity profiling, dual compilation modes (server-side/WASM), and seamless external library integration - eliminating the need for local toolchain setup.

---

## Description

Noir Playground is a production-grade web application that brings zero-knowledge proof development to the browser, making ZK circuit development accessible without requiring complex local toolchain installation. Built with React + TypeScript and Monaco Editor, it provides a complete development environment for the Noir programming language with professional-grade tooling.

The platform features a **5-step execution pipeline** (Parse → Compile → Execute → Prove → Verify) powered by @noir-lang/noir_js and @aztec/bb.js (Barretenberg backend). It supports **dual compilation modes**: server-side native compilation using `nargo compile` CLI (2-5x faster, native git dependency resolution) and browser-based WASM compilation as a fallback.

### Advanced Features

-   **Interactive DAP-based debugger** with step-through execution, breakpoint management, and real-time variable/witness inspection
-   **Circuit complexity profiling** with visual heatmaps showing ACIR/Brillig opcodes and gate counts per line
-   **External library support** with automatic recursive dependency resolution and IndexedDB caching (95% faster subsequent loads)
-   **Dynamic input generation** from function signatures with intelligent form rendering
-   **Code sharing system** with Supabase integration and dynamic SEO for social media previews

### Architecture

The architecture employs a companion NestJS server ([noir-playground-server](https://github.com/0xandee/noir-playground-server)) providing unified APIs for compilation, profiling, and debugging - deployable via Docker with pre-built noir-profiler CLI and Barretenberg binaries.

---

## Contribution & Impact

### Contributions (what you built or delivered)

#### 1. Complete Browser-Based ZK Development Environment

-   Implemented full Noir compilation and proof generation workflow using @noir-lang/noir_js and @aztec/bb.js UltraHonkBackend
-   Designed dual-compiler architecture supporting both server-side native compilation and browser WASM fallback
-   Built multi-file Monaco Editor integration with custom Noir syntax highlighting and language definition

#### 2. Interactive Debugging System (DAP Protocol)

-   Architected Debug Adapter Protocol (DAP) client-server integration for step-by-step circuit execution
-   Implemented DebugContext React state management for session lifecycle, breakpoints, and variable inspection
-   Created VSCode-style debug UI with step controls (next/stepIn/stepOut/continue), current line highlighting, and glyph margin breakpoint indicators
-   Built NoirDebuggerService HTTP client for parallel fetching of variables, witness map, and ACIR opcodes

#### 3. Real-Time Circuit Complexity Profiling

-   Developed MetricsAggregationService for processing SVG profiler output into normalized heat values (0-1 scale)
-   Implemented HeatmapDecorationService managing Monaco editor inline badges, background highlights, and gradient color application
-   Created interactive hotspot navigator with click-to-jump functionality for high-complexity line identification
-   Engineered debounced analysis pipeline (1-second delay) with caching for non-blocking UI updates

#### 4. External Library Dependency System

-   Built DependencyResolverService with recursive git dependency resolution supporting transitive dependencies
-   Implemented DependencyCacheService using IndexedDB with LRU eviction (50MB limit, version-keyed storage)
-   Created GitHub API integration layer for fetching library files from public repositories
-   Designed TOML rewriting system converting git dependencies to path dependencies for noir_wasm compatibility

#### 5. Unified Server Backend

Repository: [noir-playground-server](https://github.com/0xandee/noir-playground-server)

-   Architected NestJS REST API providing three core services: compilation, profiling, and debugging
-   Implemented NoirServerCompiler with native `nargo compile` execution and automatic git operations
-   Built DAP server handling debug session management, stepping commands, and state inspection
-   Created Docker deployment with pre-built noir-profiler CLI and Barretenberg binaries

#### 6. Production-Ready Infrastructure

-   Configured Vite WASM support with custom middleware routing and cross-origin isolation headers (CORP/COOP)
-   Implemented code sharing system with Supabase integration and dynamic SEO meta tag generation for social media crawlers
-   Built serverless functions (Vercel/Netlify) for bot detection and dynamic HTML serving
-   Set up automated sitemap generation, Vercel Analytics integration, and responsive UI with mobile warnings

---

### Impact (what changed because of it)

#### 1. Democratized Zero-Knowledge Development

-   **Eliminated barrier to entry**: New developers can start writing ZK circuits immediately without installing Nargo, Barretenberg, or managing Rust toolchains
-   **Educational accessibility**: Provides instant feedback and visualization for learning Noir syntax and ZK concepts
-   **Rapid prototyping**: Reduced circuit experimentation time from hours (local setup + compilation) to seconds (browser-based workflow)

#### 2. Enabled Visual Understanding of Circuit Complexity

-   **Transparency in optimization**: Real-time heatmaps reveal performance bottlenecks at source code level, guiding optimization efforts
-   **Quantified complexity metrics**: ACIR/Brillig opcode counts and gate analysis provide concrete data for comparing circuit designs
-   **Hotspot-driven development**: Interactive navigator enables developers to focus optimization on high-impact code sections

#### 3. Streamlined Debugging Workflow

-   **Runtime introspection**: Step-through debugging with witness value inspection enables understanding of circuit execution at intermediate steps
-   **Reduced debugging cycles**: Visual breakpoints and variable viewing replace manual print debugging and recompilation loops
-   **Aligned with familiar workflows**: DAP-based architecture mirrors VSCode debugging UX, reducing cognitive load for developers

#### 4. Fostered Noir Ecosystem Growth

-   **Library discoverability**: Seamless integration with noir-bignum, poseidon, and other ecosystem libraries encourages reuse over reimplementation
-   **Dependency caching**: 95% load time reduction for cached libraries (2-5 seconds → <100ms) improves developer experience and encourages experimentation
-   **Version compatibility testing**: Instant feedback on library compatibility helps identify and resolve version mismatches

#### 5. Accelerated Compilation Performance

-   **Server-side compilation**: Native `nargo compile` achieves 2-5x speedup vs WASM, reducing iteration cycles
-   **No CORS workarounds**: Server-side git operations eliminate browser security restrictions, enabling reliable dependency fetching
-   **Production viability**: Dual-mode architecture provides fallback compatibility while optimizing for performance when server available

#### 6. Community Adoption & Feedback Loop

-   **Public deployment**: Live at [noir-playground.app](https://noir-playground.app) with code sharing enabling collaboration and knowledge distribution
-   **Open source contribution**: MIT-licensed codebase with comprehensive documentation ([CLAUDE.md](CLAUDE.md), [CONTRIBUTING.md](CONTRIBUTING.md)) lowers contribution barriers
-   **Real-world usage data**: Vercel Analytics tracks feature usage, informing future development priorities

---

## Key Technical Innovations

### 1. Dual Compiler Strategy

The server-side vs WASM compilation architecture provides graceful degradation - users get native performance when possible, but the platform remains functional even without backend infrastructure.

### 2. Caching as Force Multiplier

IndexedDB dependency caching transforms user experience from "slow enough to abandon" (5 second loads) to "instant" (<100ms), dramatically improving retention for repeat users.

### 3. Visual Debugging Innovation

Integrating DAP protocol with Monaco editor decorations brings IDE-quality debugging to browser ZK development - a capability previously unavailable in any Noir playground.

---

## Links

-   **Live Demo**: [noir-playground.app](https://noir-playground.app)
-   **Frontend Repository**: [github.com/0xandee/noir-playground](https://github.com/0xandee/noir-playground)
-   **Backend Repository**: [github.com/0xandee/noir-playground-server](https://github.com/0xandee/noir-playground-server)
-   **License**: MIT
