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
The app integrates Noir zero-knowledge proof compilation through a carefully orchestrated WASM setup:

- **NoirService**: Primary service orchestrating the 5-step execution pipeline (Parse → Compile → Execute → Prove → Verify) using `@noir-lang/noir_js` and `@aztec/bb.js`
- **NoirWasmCompiler**: Handles WASM compilation with `@noir-lang/noir_wasm` using file manager pattern for browser environment
- **NoirProfilerService**: Provides circuit profiling capabilities with ACIR/gate analysis via external profiler server
- **WASM Routing**: Vite config redirects WASM requests from `node_modules/.vite/deps/` to `/public/wasm/` directory
- **Cross-Origin Headers**: Required CORP/COOP headers for WASM execution and SharedArrayBuffer support in `vite.config.ts`

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
VITE_PROFILER_SERVER_URL=http://localhost:4000  # Optional, for circuit profiling

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
- **UltraHonkBackend**: Uses `@aztec/bb.js` for proof generation and verification
- **Public input extraction**: Parses Noir code to identify public parameters without full proof generation
- **Error handling**: Structured error responses with detailed execution steps

#### NoirWasmCompiler (`src/services/NoirWasmCompiler.ts`)
Handles browser-based Noir compilation:
- **File manager pattern**: Uses `createFileManager` for virtual file system in browser
- **Stream-based file writing**: Converts strings to ReadableStreams for WASM file operations
- **Default Nargo.toml generation**: Provides fallback configuration for compilation

#### SnippetService (`src/services/SnippetService.ts`)
Manages code snippet persistence and sharing via Supabase integration.

#### MetricsAggregationService (`src/services/MetricsAggregationService.ts`)
Processes SVG profiler output into structured complexity metrics:
- **Normalized heat values**: Calculates 0-1 scale heat indicators
- **Hotspot identification**: Ranks lines by circuit complexity
- **Performance tracking**: Monitors complexity changes over time

#### HeatmapDecorationService (`src/services/HeatmapDecorationService.ts`)
Manages Monaco editor visual decorations for complexity heatmaps:
- **Gutter indicators**: Colored bars showing circuit complexity
- **Inline badges**: Metric counts displayed at line ends
- **Gradient colors**: Dynamic color application based on complexity thresholds

### UI Component Patterns

#### Monaco Editor Integration
- **NoirEditor**: Basic Monaco editor with Noir syntax highlighting
- **NoirEditorWithHover**: Enhanced editor with hover information and line analysis
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

### Development Notes

#### Circuit Profiling System
- **External profiler server**: Requires separate Noir profiler server for ACIR/gate analysis
- **SVG visualization**: Renders circuit complexity as interactive flamegraphs
- **Metrics tracking**: Provides ACIR opcodes, Brillig opcodes, and gate count analysis

#### Real-Time Heatmap Feature
- **Monaco editor integration**: Visual heat overlays with gutter indicators and inline badges
- **Three metric types**: ACIR opcodes, Brillig opcodes, and proving gates
- **Hotspot navigator**: Interactive panel showing complexity rankings with click-to-jump navigation
- **Real-time updates**: Debounced analysis (1-second delay) with background processing
- **Color gradient**: Green (low) → Yellow (medium) → Red (high complexity)
- **Performance optimized**: Caching system and non-blocking UI updates

## Noir Profiler Server

The profiler server has been moved to a separate repository for independent development and deployment.

**Repository**: https://github.com/0xandee/noir-playground-server

### Overview
A standalone NestJS-based REST API server that provides HTTP endpoints for circuit profiling:

- **NestJS Framework**: Modern TypeScript server with dependency injection and configuration management
- **Circuit Profiling**: ACIR opcodes, Brillig opcodes, and gates profiling via noir-profiler CLI
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

The main React application integrates with the profiler server via `NoirProfilerService`:

```typescript
// Frontend integration pattern
const noirProfilerService = new NoirProfilerService();
const result = await noirProfilerService.profileCircuit({
  sourceCode: noirCode,
  cargoToml: manifestContent
});
```

### Environment Configuration

Configure the frontend to connect to the profiler server:

```bash
# Client Integration
VITE_PROFILER_SERVER_URL=http://localhost:4000  # Local development
VITE_PROFILER_SERVER_URL=https://your-server.ondigitalocean.app  # Production
```

For detailed documentation on server architecture, deployment, and API endpoints, see the [server repository](https://github.com/0xandee/noir-playground-server).