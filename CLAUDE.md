# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server on localhost:5173 (Vite default port)
npm run build           # Production build with sitemap generation
npm run build:dev       # Development build without sitemap
npm run lint            # Run ESLint
npm run preview         # Preview production build
npm run sitemap:generate # Generate sitemap.xml manually

# Testing
# Uses Playwright for end-to-end testing
npx playwright test      # Run all tests
npx playwright test --ui # Run tests with UI mode

# Manual Testing
# Comprehensive manual test cases available in MANUAL_TEST_CASES.md
# Includes heatmap functionality, cross-browser compatibility, and performance testing

# WASM Debugging
# If WASM issues occur, delete node_modules/.vite and restart dev server
# WASM files are served from /public/wasm/ directory, not bundled by Vite
```

## Core Architecture

### Noir Integration Layer
The app integrates Noir zero-knowledge proof compilation through both server-side and browser-based compilers:

- **NoirService**: Primary service orchestrating the 5-step execution pipeline (Parse → Compile → Execute → Prove → Verify) using `@noir-lang/noir_js` and `@aztec/bb.js`. Supports dual compiler modes (server/WASM) via `VITE_USE_SERVER_COMPILER` env variable.
- **NoirServerCompiler** (Recommended): HTTP client for server-side compilation using native `nargo compile` CLI. Eliminates CORS issues, provides native git dependency resolution, and faster compilation (~2-5x speedup).
- **NoirWasmCompiler** (Fallback): Handles browser WASM compilation with `@noir-lang/noir_wasm` using file manager pattern. Subject to CORS restrictions for git dependencies.
- **NoirProfilerService**: Provides circuit profiling capabilities with ACIR/gate analysis via external profiler server
- **NoirDebuggerService**: HTTP client for DAP (Debug Adapter Protocol) operations with the debugger server
- **DependencyResolverService**: Manages external library dependencies with recursive git resolution for browser environment (WASM compiler only)
- **WASM Routing**: Vite config redirects WASM requests from `node_modules/.vite/deps/` to `/public/wasm/` directory
- **Cross-Origin Headers**: Required CORP/COOP headers for WASM execution and SharedArrayBuffer support in `vite.config.ts`

### Debugging System (DAP Integration)

The playground includes a complete debugging system based on the Debug Adapter Protocol (DAP):

#### Architecture
- **DebugContext** (`src/contexts/DebugContext.tsx`): React context managing global debug state, session lifecycle, and user actions
- **NoirDebuggerService** (`src/services/NoirDebuggerService.ts`): HTTP client for DAP operations (start/stop session, stepping, breakpoints, variable inspection)
- **Debug UI Components**:
  - `DebugControlPanel`: VSCode-style controls (play/pause, step over/in/out, restart, stop)
  - `InspectorPanel`: Side-by-side view showing variables, witnesses, and ACIR opcodes
  - `NoirEditorWithHover`: Monaco editor with debug decorations (breakpoints, current line highlighting)

#### Debug Session Lifecycle
1. **Start Session**: Send source code + Nargo.toml + initial inputs to server
2. **Server Initialization**: Server compiles circuit, creates debug session, returns session ID
3. **Interactive Debugging**: Step through code with next/stepIn/stepOut/continue commands
4. **State Inspection**: View variables, witness map, and ACIR opcodes at each step
5. **Breakpoint Management**: Set/remove breakpoints with server verification
6. **Session Termination**: Clean up server resources when debugging ends

#### Glyph Margin Decorations
The Monaco editor glyph margin (narrow column between line numbers and code) is dedicated exclusively to **breakpoint management**:
- **Red circles**: Verified breakpoints
- **Gray circles**: Unverified breakpoints (invalid line positions)
- **Semi-transparent red**: Hover placeholder showing where breakpoints can be placed
- **No other indicators**: Debug current line and heatmap use inline highlights only (no glyph margin indicators)

#### Step Commands (DAP Standard)
- **next**: Step over (execute current line, don't enter functions)
- **stepIn**: Step into (enter function calls)
- **stepOut**: Step out (continue until function returns)
- **continue**: Continue execution until next breakpoint or program end

#### State Management
The debug system maintains:
- **Session state**: Session ID, stopped state, current line/frame/thread
- **Variables**: Named local variables with types and values
- **Witness map**: Low-level witness entries (index → field value)
- **ACIR opcodes**: Circuit-level operation information
- **Breakpoints**: User-set breakpoints with verification status
- **Loading states**: Session starting/stopping/restarting flags for UI feedback

### Server-Side Compilation (Recommended)

The playground supports two compilation modes with server-side compilation as the recommended approach:

#### Compilation Modes

**1. Server Compiler (Default - Recommended)**
- Uses native `nargo compile` CLI on backend server
- Native git dependency resolution (no CORS issues)
- Faster compilation (~2-5x speedup vs WASM)
- Handles transitive dependencies automatically
- Better error messages from Nargo CLI
- Requires companion server deployment

**2. WASM Compiler (Fallback)**
- Browser-based compilation via `@noir-lang/noir_wasm`
- No server dependency required
- Subject to CORS restrictions for git dependencies
- Requires complex dependency resolution workarounds
- Slower compilation performance

#### Configuration

**Environment Variables:**
```bash
# Enable server-side compilation (recommended)
VITE_USE_SERVER_COMPILER=true

# Server URL (same server handles compilation, profiling, and debugging)
VITE_PROFILER_SERVER_URL=http://localhost:4000              # Local development
VITE_PROFILER_SERVER_URL=https://your-server.ondigitalocean.app  # Production

# Debug server URL (defaults to VITE_PROFILER_SERVER_URL if not set)
VITE_DEBUG_SERVER_URL=http://localhost:4000  # Optional override
```

**How It Works:**
1. Client sends source code + Nargo.toml to server via `POST /api/compile`
2. Server creates temporary project directory with UUID isolation
3. Server runs `nargo compile` with native git operations
4. Server returns compiled artifact JSON to client
5. Client uses artifact for execution/proving (same as WASM flow)
6. Server automatically cleans up temporary files

**Benefits Over WASM:**
- ✅ No CORS errors when fetching git dependencies
- ✅ Native git clone operations (supports any GitHub repository)
- ✅ Automatic transitive dependency resolution
- ✅ ~2-5x faster compilation (native vs WASM)
- ✅ Better error messages from Nargo CLI
- ✅ No browser dependency caching complexity

**Server Integration:**
- Server repository: https://github.com/0xandee/noir-playground-server
- Same server handles compilation, profiling, and debugging
- Compilation endpoint: `POST /api/compile`
- Health check: `GET /api/compile/check-nargo`
- Debug endpoints: `/api/debug/*` (start, step, breakpoints, variables, witness, opcodes)

**Development Workflow:**
```bash
# Terminal 1: Start server
cd noir-playground-server
NOIR_DATA_PATH=./data/noir-profiler npm run start:dev

# Terminal 2: Start client
cd noir-playground
npm run dev  # Will use server at localhost:4000
```

**Production Deployment:**
Both client and server must be deployed:
- Client: Static site (Vercel, Netlify, etc.)
- Server: Node.js server (DigitalOcean, Heroku, etc.)
- Configure `VITE_PROFILER_SERVER_URL` to point to deployed server

### External Library Support (WASM Compiler)
**Note:** When using server-side compilation, dependencies are handled natively by the server. The information below applies to WASM compiler mode only.

The playground supports external Noir libraries from GitHub with automatic dependency resolution:

#### How It Works
1. **Git Dependency Parsing**: Parses `Nargo.toml` to extract git dependencies with tag/version
2. **Recursive Resolution**: Automatically resolves transitive dependencies (dependencies of dependencies)
3. **GitHub API Integration**: Fetches library files from GitHub using public API
4. **Virtual Filesystem**: Writes dependencies to browser's virtual filesystem via `FileManager`
5. **Path Conversion**: Converts all git dependencies to path dependencies before compilation
6. **noir_wasm Compatibility**: Prevents noir_wasm from attempting browser-incompatible git operations

#### Dependency Caching System
The playground includes an intelligent caching layer that dramatically reduces dependency loading times:

**Cache Architecture:**
- **Storage**: Browser IndexedDB (persistent across sessions, up to 50MB)
- **Cache Key**: Version-specific (`repo@tag` format, e.g., `noir-lang/noir-bignum@v0.8.0`)
- **Invalidation**: Automatic - changing version creates new cache entry
- **Eviction**: LRU (Least Recently Used) when cache exceeds 50MB

**Performance Impact:**
- **First compile**: 2-5 seconds (populates cache)
- **Cached compile**: <100ms for dependencies (~95% reduction)
- **Persistent**: Works across page refreshes and browser sessions

**Cache Service** (`DependencyCacheService`):
- `getDependency(key)`: Check cache before GitHub fetch
- `saveDependency(data)`: Store fetched library for reuse
- `clearCache()`: Manual cache reset via UI
- `getStats()`: View cache size, hit rate, and statistics

**UI Integration:**
- Navigate to "Cache" tab in right panel to view statistics
- See real-time cache hits/misses during compilation
- Progress messages show "✓ Using cached bignum@v0.8.0" vs "Fetching..."
- Clear cache button for troubleshooting

**Technical Details:**
- Cache checks integrated in `DependencyResolverService.resolveDependency()`
- Graceful fallback: Cache errors automatically trigger network fetch
- Includes file contents + metadata (repository, tag, size, timestamps)
- LRU tracking via IndexedDB indexes for efficient eviction

#### Usage Example
```toml
# In Nargo.toml tab
[dependencies]
bignum = { tag = "v0.8.0", git = "https://github.com/noir-lang/noir-bignum" }
```

```noir
// In main.nr tab
use bignum;

pub fn main(x: Field, y: pub Field) -> pub Field {
    x + y
}
```

#### Supported Formats
- **Git with tag**: `{ tag = "v1.0.0", git = "https://github.com/owner/repo" }` ✅
- **Git with subdirectory**: `{ tag = "v1.0.0", git = "https://github.com/owner/repo", directory = "crates/lib" }` ✅
- **Local path**: `{ path = "../my-lib" }` ❌ (browser cannot access local filesystem)

#### Common Libraries
- **noir-bignum**: Arbitrary precision arithmetic (`noir-lang/noir-bignum`)
- **poseidon**: Poseidon hash function (`noir-lang/poseidon`)
- **ecrecover**: Ethereum signature recovery (via standard library)

#### Limitations
- Only GitHub repositories supported
- Requires public repositories (no private repo access)
- Must use tagged releases (commit SHAs not supported)
- CORS-compliant sources only (GitHub raw files work by default)

#### Version Compatibility Considerations
**Important**: Not all library versions are compatible with the current Noir compiler (v1.0.0-beta.11). When testing or using external libraries:

- **Check library release dates**: Libraries released before major Noir compiler updates may have breaking changes
- **Use latest stable versions**: Prefer recent tags (e.g., bignum v0.8.0 over v0.6.0)
- **Verify compiler_version**: Check the library's `Nargo.toml` for `compiler_version` requirements
- **Test compilation**: Some older libraries may resolve dependencies correctly but fail compilation due to:
  - Type system changes in newer Noir versions
  - Deprecated syntax or APIs
  - Missing dependencies in older versions (e.g., bignum v0.6.0 lacks poseidon dependency)

**Known Compatible Libraries** (tested with Noir v1.0.0-beta.11):
- `bignum` v0.8.0 → poseidon v0.1.1 ✅
- `ecrecover` v1.0.0 → array_helpers v0.30.0 + keccak256 v0.1.0 ✅
- `poseidon` v0.1.1 (standalone) ✅

**Deprecated/Incompatible**:
- `noir_rsa` v0.7.0 (uses outdated bignum v0.6.0, not actively maintained) ❌

#### Service Architecture
- **DependencyResolverService** (`src/services/DependencyResolverService.ts`):
  - `parseDependencies()`: Extracts git dependencies from TOML
  - `resolveDependency()`: Recursively resolves single dependency and its transitive deps
  - `fetchGitHubTree()`: Gets file list from GitHub API
  - `fetchFileContent()`: Downloads raw file content
  - `convertGitToPathDependencies()`: Rewrites TOML with path dependencies

### Code Sharing & SEO System
The app includes a sophisticated code sharing system with dynamic SEO:

- **Client-Side**: React app with `ShareDialog` component and `/share/:id` routes
- **Server-Side**: Serverless functions (`api/share.js`, `netlify/functions/share.js`) detect social media crawlers and serve dynamic HTML with OpenGraph tags
- **Database**: Supabase integration for snippet storage via `SnippetService`
- **SEO Generation**: Dynamic meta tags generated from code analysis in `seoUtils.ts`

### Key Components Architecture

#### CodePlayground Component
- **Multi-file editor**: Supports `main.nr` + `Nargo.toml` with Monaco editor integration
- **Dynamic input forms**: Automatically generates input forms from Noir function signatures using regex parsing
- **Execution pipeline**: 5-step workflow (Parse → Compile → Execute → Prove → Verify) with step-by-step UI feedback
- **State management**: Manages code, inputs, proof data, execution steps, and console output
- **Props interface**: Supports both standalone and shared snippet modes with `CodePlaygroundProps`
- **Complexity analysis**: Integrates with `CombinedComplexityPanel` for circuit profiling and ACIR visualization
- **Debug integration**: Connects to `DebugContext` for interactive debugging sessions

#### NoirEditorWithHover Component
Enhanced Monaco editor with multiple overlay systems:
- **Syntax highlighting**: Custom Noir language definition with enhanced token colors
- **Hover tooltips**: Show expression-level complexity metrics when heatmap is enabled
- **Heatmap decorations**: Inline badges showing opcode counts and percentages
- **Debug decorations**: Current line highlighting (yellow background) and breakpoint indicators (glyph margin)
- **Glyph margin management**: Dedicated to breakpoint controls (red/gray dots, hover placeholders)
- **Performance optimization**: Debounced heatmap updates (1-second delay), cached analysis results

#### Sharing Workflow
1. User clicks Share button → `ShareDialog` opens
2. User enters title, selects data to share → Creates `CreateSnippetData`
3. `SnippetService.saveSnippet()` stores in Supabase → Returns snippet ID
4. `PreviewService.preGenerateSharePreview()` generates preview image (fire-and-forget)
5. User gets shareable URL: `/share/{uuid}`

### Critical Dependencies & Constraints

#### WASM Configuration
- **vite-plugin-wasm** + **vite-plugin-top-level-await**: Required for Noir WASM modules
- **WASM files**: Must be in `/public/wasm/` directory, not handled by Vite bundler
- **Cross-origin isolation**: CORP/COOP headers required for SharedArrayBuffer support
- **Manual chunk splitting**: Noir libraries isolated in separate chunks to prevent bundling conflicts
- **Middleware routing**: Custom Vite middleware redirects `.wasm` requests from `node_modules/.vite/deps/` to `/public/wasm/`
- **Excluded dependencies**: `@noir-lang/noir_wasm`, `@noir-lang/noirc_abi`, `@noir-lang/acvm_js` excluded from Vite optimization

#### Environment Variables
```bash
# Client-side (VITE_ prefix required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Compilation, Profiling & Debugging Server
VITE_PROFILER_SERVER_URL=http://localhost:4000              # Local development
VITE_PROFILER_SERVER_URL=https://your-server.ondigitalocean.app  # Production

# Debug server URL (optional, defaults to VITE_PROFILER_SERVER_URL)
VITE_DEBUG_SERVER_URL=http://localhost:4000

# Compiler Mode Selection
VITE_USE_SERVER_COMPILER=true   # Use server-side nargo compiler (recommended)
VITE_USE_SERVER_COMPILER=false  # Use browser WASM compiler (fallback)

# Server-side (for serverless functions)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Routing & Deployment

#### SPA Routing Configuration
- **Vercel**: `vercel.json` rewrites + serverless functions
- **Netlify**: `netlify.toml` + `_redirects` + Netlify functions
- **Apache**: `.htaccess` for client-side routing

#### Social Media Crawler Handling
Serverless functions detect bots via User-Agent and serve dynamic HTML while redirecting humans to React app. See `DYNAMIC_META_TAGS.md` for details.

### Code Patterns & Conventions

#### Service Layer Pattern
Services are stateful classes with singleton patterns:
```typescript
// Example: NoirService maintains compilation state
const noirService = new NoirService();
await noirService.executeCircuit(code, inputs, stepCallback);
```

#### Component Props Interface
Major components use comprehensive props interfaces to support both standalone and embedded usage:
```typescript
interface CodePlaygroundProps {
  initialCode?: string;
  initialInputs?: Record<string, string>;
  snippetTitle?: string; // Shared snippet mode
  snippetId?: string;    // Shared snippet mode
}
```

#### Error Handling
- **NoirService**: Returns structured `NoirExecutionResult` with error details
- **UI Components**: Toast notifications for user feedback
- **Async Operations**: Try-catch with detailed error messages

### Special Considerations

#### Mobile Support
App shows `MobileWarning` component on mobile devices due to Monaco editor performance limitations.

#### Build Process
The build process automatically generates `sitemap.xml` via `scripts/generateSitemap.js` before Vite compilation.

#### TypeScript Configuration
Uses path aliases (`@/` maps to `src/`) and ES2022 target for modern browser features required by WASM modules.

#### Browser Compatibility
- **Modern browsers required**: Chrome, Firefox, Safari, Edge (latest versions)
- **WASM support**: Requires WebAssembly and SharedArrayBuffer support
- **Cross-origin isolation**: CORP/COOP headers enable SharedArrayBuffer in browsers
- **Mobile limitations**: Monaco editor performance constraints show mobile warning

### Package Manager
This project uses Yarn 4.8.1+ with node_modules linker (not PnP). The `.yarnrc.yml` configures `nodeLinker: node-modules` for compatibility. Use `yarn` instead of `npm` for all package operations.

### Key Service Classes

#### NoirService (`src/services/NoirService.ts`)
Core service managing the complete Noir execution pipeline:
- **Stateful singleton**: Maintains compilation state across operations
- **5-step execution**: Parse → Compile → Execute → Prove → Verify
- **Dual compiler support**: Selects server or WASM compiler based on `VITE_USE_SERVER_COMPILER` environment variable
- **Compiler abstraction**: `getCompiler()` method returns appropriate compiler instance
- **UltraHonkBackend**: Uses `@aztec/bb.js` for proof generation and verification
- **Public input extraction**: Parses Noir code to identify public parameters without full proof generation
- **Error handling**: Structured error responses with detailed execution steps

#### NoirServerCompiler (`src/services/NoirServerCompiler.ts`)
HTTP client for server-side Noir compilation (recommended):
- **Native compilation**: Sends source code to server for `nargo compile` execution
- **No CORS issues**: Server handles git operations natively
- **Faster performance**: ~2-5x speedup vs WASM compilation
- **Progress callbacks**: Reports compilation status to UI
- **Availability check**: `checkAvailability()` verifies server connectivity
- **Compatible interface**: Matches `NoirWasmCompiler` interface for easy switching

#### NoirWasmCompiler (`src/services/NoirWasmCompiler.ts`)
Handles browser-based Noir compilation (fallback):
- **File manager pattern**: Uses `createFileManager` for virtual file system in browser
- **Stream-based file writing**: Converts strings to ReadableStreams for WASM file operations
- **Default Nargo.toml generation**: Provides fallback configuration for compilation
- **CORS limitations**: Subject to browser security restrictions for git dependencies

#### NoirDebuggerService (`src/services/NoirDebuggerService.ts`)
HTTP client for DAP (Debug Adapter Protocol) operations:
- **Session management**: Start/stop/restart debug sessions
- **Step commands**: Execute next/stepIn/stepOut/continue operations
- **State inspection**: Fetch variables, witness map, and ACIR opcodes
- **Breakpoint management**: Set/clear breakpoints with server verification
- **Health checks**: `checkAvailability()` verifies debug server is running
- **Parallel fetching**: `getDebugState()` fetches variables/witnesses/opcodes in parallel

#### SnippetService (`src/services/SnippetService.ts`)
Manages code snippet persistence and sharing via Supabase integration.

#### MetricsAggregationService (`src/services/MetricsAggregationService.ts`)
Processes SVG profiler output into structured complexity metrics:
- **Normalized heat values**: Calculates 0-1 scale heat indicators
- **Hotspot identification**: Ranks lines by circuit complexity
- **Performance tracking**: Monitors complexity changes over time

#### HeatmapDecorationService (`src/services/HeatmapDecorationService.ts`)
Manages Monaco editor visual decorations for complexity heatmaps:
- **Inline badges**: Metric counts displayed at line ends (e.g., "// 15 opcodes, 3.45%")
- **Background highlights**: Subtle red/pink backgrounds on high-complexity lines (top 5 hotspots)
- **Gradient colors**: Dynamic color application based on complexity thresholds
- **No glyph margin indicators**: Heatmap does not use glyph margin (dedicated to breakpoints only)

### UI Component Patterns

#### Monaco Editor Integration
- **NoirEditor**: Basic Monaco editor with Noir syntax highlighting
- **NoirEditorWithHover**: Enhanced editor with hover information, line analysis, debug decorations, and heatmap overlays
- Uses `@monaco-editor/react` with custom Noir language definition

#### ShadCN/UI Component Library
Extensive use of Radix UI components with Tailwind CSS styling. All components follow consistent patterns in `src/components/ui/`.

### Key Type Definitions

#### Circuit Metrics Types (`src/types/circuitMetrics.ts`)
Core TypeScript interfaces for complexity analysis:
- **LineMetrics**: Per-line complexity data with ACIR/Brillig/gate counts
- **CircuitComplexityReport**: Complete analysis results from profiler
- **HeatmapData**: Visualization data with normalized heat values
- **MetricsConfiguration**: Customization options for thresholds and colors

#### Debug Types (`src/types/debug.ts`)
Core TypeScript interfaces for debugging:
- **DebugSession**: Session state (session ID, stopped state, current line/frame/thread)
- **DebugVariable**: Named variable with type and value
- **DebugWitnessEntry**: Witness map entry (index → field value)
- **DebugOpcodeInfo**: ACIR opcode information
- **Breakpoint**: Line number with verification status
- **StepCommand**: DAP step command type (`'next' | 'stepIn' | 'stepOut' | 'continue'`)

### Development Notes

#### Circuit Profiling System
- **External profiler server**: Requires separate Noir profiler server for ACIR/gate analysis
- **SVG visualization**: Renders circuit complexity as interactive flamegraphs
- **Metrics tracking**: Provides ACIR opcodes, Brillig opcodes, and gate count analysis

#### Real-Time Heatmap Feature
- **Monaco editor integration**: Visual heat overlays with inline badges and background highlights
- **Three metric types**: ACIR opcodes, Brillig opcodes, and proving gates
- **Hotspot navigator**: Interactive panel showing complexity rankings with click-to-jump navigation
- **Real-time updates**: Debounced analysis (1-second delay) with background processing
- **Color gradient**: Green (low) → Yellow (medium) → Red (high complexity)
- **Performance optimized**: Caching system and non-blocking UI updates
- **No glyph margin decorations**: Heatmap uses inline annotations only (glyph margin reserved for breakpoints)

#### Interactive Debugging System
- **DAP-based architecture**: Follows Debug Adapter Protocol standard for debugger communication
- **Session-based**: Each debug session maintains isolated state on the server
- **Step-by-step execution**: Support for next/stepIn/stepOut/continue with current line tracking
- **Real-time state inspection**: View variables, witnesses, and opcodes at each execution point
- **Breakpoint management**: Click glyph margin to set/remove breakpoints, server verifies validity
- **Visual feedback**: Yellow current line highlighting, red/gray breakpoint dots in glyph margin
- **Clean separation**: Debug indicators use inline highlights; breakpoint controls use glyph margin exclusively

## Noir Profiler & Debugger Server

The profiler and debugger servers have been combined into a single repository for unified development and deployment.

**Repository**: https://github.com/0xandee/noir-playground-server

### Overview
A standalone NestJS-based REST API server that provides HTTP endpoints for:

- **Circuit Profiling**: ACIR opcodes, Brillig opcodes, and gates profiling via noir-profiler CLI
- **Circuit Compilation**: Native `nargo compile` with git dependency support
- **Interactive Debugging**: DAP (Debug Adapter Protocol) operations for step-by-step debugging
- **Docker Support**: Pre-built container with noir-profiler CLI and Barretenberg backend
- **Automatic File Management**: Creates temporary directories, writes artifacts, and cleans up automatically
- **Health Checks**: Built-in monitoring endpoints

### Quick Start

```bash
# Clone the server repository
git clone https://github.com/0xandee/noir-playground-server.git
cd noir-playground-server

# Development
npm install
npm run start:dev          # Runs on http://localhost:4000

# Docker (recommended)
docker build -t noir-playground-server .
docker run -p 4000:4000 noir-playground-server
```

### Frontend Integration

The main React application integrates with the server via multiple services:

```typescript
// Circuit profiling
const noirProfilerService = new NoirProfilerService();
const result = await noirProfilerService.profileCircuit({
  sourceCode: noirCode,
  cargoToml: manifestContent
});

// Interactive debugging
const noirDebuggerService = new NoirDebuggerService();
await noirDebuggerService.startSession({
  sourceCode: noirCode,
  cargoToml: manifestContent,
  initialInputs: inputValues
});
```

### Environment Configuration

Configure the frontend to connect to the unified server:

```bash
# Client Integration
VITE_PROFILER_SERVER_URL=http://localhost:4000  # Local development
VITE_PROFILER_SERVER_URL=https://your-server.ondigitalocean.app  # Production

# Optional: Override debug server URL (defaults to VITE_PROFILER_SERVER_URL)
VITE_DEBUG_SERVER_URL=http://localhost:4000
```

For detailed documentation on server architecture, deployment, and API endpoints, see the [server repository](https://github.com/0xandee/noir-playground-server).
