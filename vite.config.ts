import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    fs: {
      allow: ['..']
    },
    // Add WASM MIME type support
    middlewareMode: false,
    proxy: {},
    configureServer(server) {
      // Redirect WASM requests from deps to public directory
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith('.wasm')) {
          console.log(`[VITE] WASM request intercepted: ${req.url}`);
          
          // Redirect Vite dependency WASM requests to public directory
          if (req.url.includes('node_modules/.vite/deps/noirc_abi_wasm_bg.wasm')) {
            console.log('[VITE] Redirecting noirc_abi_wasm_bg.wasm to public directory');
            req.url = '/wasm/noirc_abi_wasm_bg.wasm';
          } else if (req.url.includes('node_modules/.vite/deps/acvm_js_bg.wasm')) {
            console.log('[VITE] Redirecting acvm_js_bg.wasm to public directory');
            req.url = '/wasm/acvm_js_bg.wasm';
          }
        }
        next();
      });
    },
  },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  optimizeDeps: {
    include: ['@noir-lang/noir_js', '@aztec/bb.js', 'buffer', 'process'],
    exclude: ['@noir-lang/noir_wasm', '@noir-lang/noirc_abi', '@noir-lang/acvm_js'],
    force: true,
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    target: 'es2022',
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          noir: ['@noir-lang/noir_js', '@aztec/bb.js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs']
        }
      }
    },
  },
  define: {
    global: 'globalThis',
    process: JSON.stringify({
      env: {}
    }),
  },
}));
