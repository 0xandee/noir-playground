# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server on localhost:8080 (not 5173)
npm run build           # Production build with sitemap generation
npm run build:dev       # Development build without sitemap
npm run lint            # Run ESLint
npm run preview         # Preview production build
npm run sitemap:generate # Generate sitemap.xml manually

# WASM Debugging
# If WASM issues occur, delete node_modules/.vite and restart dev server
```

## Core Architecture

### Noir Integration Layer
The app integrates Noir zero-knowledge proof compilation through a carefully orchestrated WASM setup:

- **NoirService**: Primary service that orchestrates Noir compilation and proof generation using `@noir-lang/noir_js` and `@aztec/bb.js`
- **NoirWasmCompiler**: Handles WASM compilation with `@noir-lang/noir_wasm`
- **WASM Routing**: Vite config redirects WASM requests from `node_modules/.vite/deps/` to `/public/wasm/` directory
- **Cross-Origin Headers**: Required CORP/COOP headers for WASM execution in `vite.config.ts`

### Code Sharing & SEO System
The app includes a sophisticated code sharing system with dynamic SEO:

- **Client-Side**: React app with `ShareDialog` component and `/share/:id` routes
- **Server-Side**: Serverless functions (`api/share.js`, `netlify/functions/share.js`) detect social media crawlers and serve dynamic HTML with OpenGraph tags
- **Database**: Supabase integration for snippet storage via `SnippetService`
- **SEO Generation**: Dynamic meta tags generated from code analysis in `seoUtils.ts`

### Key Components Architecture

#### CodePlayground Component
- **Multi-file editor**: Supports `main.nr` + `Nargo.toml` with Monaco editor
- **Dynamic input forms**: Automatically generates input forms from Noir function signatures
- **Execution pipeline**: 5-step workflow (Parse → Compile → Execute → Prove → Verify)
- **State management**: Handles code, inputs, proof data, and execution steps
- **Props interface**: Supports both standalone and shared snippet modes

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
- **Cross-origin isolation**: Headers required for SharedArrayBuffer support
- **Manual chunk splitting**: Noir libraries isolated to prevent bundling conflicts

#### Environment Variables
```bash
# Client-side (VITE_ prefix required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

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