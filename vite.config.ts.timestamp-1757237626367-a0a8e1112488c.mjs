// vite.config.ts
import { defineConfig } from "file:///Users/0xandee/Documents/Github/noir-playground/.yarn/__virtual__/vite-virtual-962747f466/4/.yarn/berry/cache/vite-npm-5.4.19-6d369030b0-10c0.zip/node_modules/vite/dist/node/index.js";
import react from "file:///Users/0xandee/Documents/Github/noir-playground/.yarn/__virtual__/@vitejs-plugin-react-swc-virtual-02a998c3ad/4/.yarn/berry/cache/@vitejs-plugin-react-swc-npm-3.11.0-4cc16eee82-10c0.zip/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///Users/0xandee/Documents/Github/noir-playground/.yarn/__virtual__/lovable-tagger-virtual-9744fb1317/4/.yarn/berry/cache/lovable-tagger-npm-1.1.9-640b4b4333-10c0.zip/node_modules/lovable-tagger/dist/index.js";
import wasm from "file:///Users/0xandee/Documents/Github/noir-playground/.yarn/__virtual__/vite-plugin-wasm-virtual-2f642b7533/4/.yarn/berry/cache/vite-plugin-wasm-npm-3.5.0-dcd7a8480e-10c0.zip/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///Users/0xandee/Documents/Github/noir-playground/.yarn/__virtual__/vite-plugin-top-level-await-virtual-ae34b90fc6/4/.yarn/berry/cache/vite-plugin-top-level-await-npm-1.6.0-19eec4f223-10c0.zip/node_modules/vite-plugin-top-level-await/exports/import.mjs";
var __vite_injected_original_dirname = "/Users/0xandee/Documents/Github/noir-playground";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin"
    },
    fs: {
      allow: [".."]
    },
    // Add WASM MIME type support
    middlewareMode: false,
    proxy: {},
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith(".wasm")) {
          console.log(`[VITE] WASM request intercepted: ${req.url}`);
          if (req.url.includes("node_modules/.vite/deps/noirc_abi_wasm_bg.wasm")) {
            console.log("[VITE] Redirecting noirc_abi_wasm_bg.wasm to public directory");
            req.url = "/wasm/noirc_abi_wasm_bg.wasm";
          } else if (req.url.includes("node_modules/.vite/deps/acvm_js_bg.wasm")) {
            console.log("[VITE] Redirecting acvm_js_bg.wasm to public directory");
            req.url = "/wasm/acvm_js_bg.wasm";
          }
        }
        next();
      });
    }
  },
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      buffer: "buffer",
      process: "process/browser"
    }
  },
  optimizeDeps: {
    include: ["@noir-lang/noir_js", "@aztec/bb.js", "buffer", "process"],
    exclude: ["@noir-lang/noir_wasm", "@noir-lang/noirc_abi", "@noir-lang/acvm_js"],
    force: true
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    target: "es2022",
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          noir: ["@noir-lang/noir_js", "@aztec/bb.js"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"]
        }
      }
    }
  },
  define: {
    global: "globalThis",
    process: JSON.stringify({
      env: {}
    })
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvMHhhbmRlZS9Eb2N1bWVudHMvR2l0aHViL25vaXItcGxheWdyb3VuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzLzB4YW5kZWUvRG9jdW1lbnRzL0dpdGh1Yi9ub2lyLXBsYXlncm91bmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzLzB4YW5kZWUvRG9jdW1lbnRzL0dpdGh1Yi9ub2lyLXBsYXlncm91bmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcbmltcG9ydCB3YXNtIGZyb20gXCJ2aXRlLXBsdWdpbi13YXNtXCI7XG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tIFwidml0ZS1wbHVnaW4tdG9wLWxldmVsLWF3YWl0XCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiBcIjo6XCIsXG4gICAgcG9ydDogODA4MCxcbiAgICBoZWFkZXJzOiB7XG4gICAgICBcIkNyb3NzLU9yaWdpbi1FbWJlZGRlci1Qb2xpY3lcIjogXCJyZXF1aXJlLWNvcnBcIixcbiAgICAgIFwiQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3lcIjogXCJzYW1lLW9yaWdpblwiLFxuICAgIH0sXG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbJy4uJ11cbiAgICB9LFxuICAgIC8vIEFkZCBXQVNNIE1JTUUgdHlwZSBzdXBwb3J0XG4gICAgbWlkZGxld2FyZU1vZGU6IGZhbHNlLFxuICAgIHByb3h5OiB7fSxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAvLyBSZWRpcmVjdCBXQVNNIHJlcXVlc3RzIGZyb20gZGVwcyB0byBwdWJsaWMgZGlyZWN0b3J5XG4gICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBpZiAocmVxLnVybCAmJiByZXEudXJsLmVuZHNXaXRoKCcud2FzbScpKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coYFtWSVRFXSBXQVNNIHJlcXVlc3QgaW50ZXJjZXB0ZWQ6ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZWRpcmVjdCBWaXRlIGRlcGVuZGVuY3kgV0FTTSByZXF1ZXN0cyB0byBwdWJsaWMgZGlyZWN0b3J5XG4gICAgICAgICAgaWYgKHJlcS51cmwuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy8udml0ZS9kZXBzL25vaXJjX2FiaV93YXNtX2JnLndhc20nKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWSVRFXSBSZWRpcmVjdGluZyBub2lyY19hYmlfd2FzbV9iZy53YXNtIHRvIHB1YmxpYyBkaXJlY3RvcnknKTtcbiAgICAgICAgICAgIHJlcS51cmwgPSAnL3dhc20vbm9pcmNfYWJpX3dhc21fYmcud2FzbSc7XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXEudXJsLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvLnZpdGUvZGVwcy9hY3ZtX2pzX2JnLndhc20nKSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWSVRFXSBSZWRpcmVjdGluZyBhY3ZtX2pzX2JnLndhc20gdG8gcHVibGljIGRpcmVjdG9yeScpO1xuICAgICAgICAgICAgcmVxLnVybCA9ICcvd2FzbS9hY3ZtX2pzX2JnLndhc20nO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB3YXNtKCksXG4gICAgdG9wTGV2ZWxBd2FpdCgpLFxuICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiZcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcbiAgXS5maWx0ZXIoQm9vbGVhbiksXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICBidWZmZXI6ICdidWZmZXInLFxuICAgICAgcHJvY2VzczogJ3Byb2Nlc3MvYnJvd3NlcicsXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydAbm9pci1sYW5nL25vaXJfanMnLCAnQGF6dGVjL2JiLmpzJywgJ2J1ZmZlcicsICdwcm9jZXNzJ10sXG4gICAgZXhjbHVkZTogWydAbm9pci1sYW5nL25vaXJfd2FzbScsICdAbm9pci1sYW5nL25vaXJjX2FiaScsICdAbm9pci1sYW5nL2Fjdm1fanMnXSxcbiAgICBmb3JjZTogdHJ1ZSxcbiAgfSxcbiAgYXNzZXRzSW5jbHVkZTogWycqKi8qLndhc20nXSxcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlczIwMjInLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICB2ZW5kb3I6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgbm9pcjogWydAbm9pci1sYW5nL25vaXJfanMnLCAnQGF6dGVjL2JiLmpzJ10sXG4gICAgICAgICAgdWk6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JywgJ0ByYWRpeC11aS9yZWFjdC10YWJzJ11cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gIH0sXG4gIGRlZmluZToge1xuICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnLFxuICAgIHByb2Nlc3M6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGVudjoge31cbiAgICB9KSxcbiAgfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsU0FBUyxvQkFBb0I7QUFDNVYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUNoQyxPQUFPLFVBQVU7QUFDakIsT0FBTyxtQkFBbUI7QUFMMUIsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxnQ0FBZ0M7QUFBQSxNQUNoQyw4QkFBOEI7QUFBQSxJQUNoQztBQUFBLElBQ0EsSUFBSTtBQUFBLE1BQ0YsT0FBTyxDQUFDLElBQUk7QUFBQSxJQUNkO0FBQUE7QUFBQSxJQUVBLGdCQUFnQjtBQUFBLElBQ2hCLE9BQU8sQ0FBQztBQUFBLElBQ1IsZ0JBQWdCLFFBQVE7QUFFdEIsYUFBTyxZQUFZLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUN6QyxZQUFJLElBQUksT0FBTyxJQUFJLElBQUksU0FBUyxPQUFPLEdBQUc7QUFDeEMsa0JBQVEsSUFBSSxvQ0FBb0MsSUFBSSxHQUFHLEVBQUU7QUFHekQsY0FBSSxJQUFJLElBQUksU0FBUyxnREFBZ0QsR0FBRztBQUN0RSxvQkFBUSxJQUFJLCtEQUErRDtBQUMzRSxnQkFBSSxNQUFNO0FBQUEsVUFDWixXQUFXLElBQUksSUFBSSxTQUFTLHlDQUF5QyxHQUFHO0FBQ3RFLG9CQUFRLElBQUksd0RBQXdEO0FBQ3BFLGdCQUFJLE1BQU07QUFBQSxVQUNaO0FBQUEsUUFDRjtBQUNBLGFBQUs7QUFBQSxNQUNQLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sS0FBSztBQUFBLElBQ0wsY0FBYztBQUFBLElBQ2QsU0FBUyxpQkFDVCxnQkFBZ0I7QUFBQSxFQUNsQixFQUFFLE9BQU8sT0FBTztBQUFBLEVBQ2hCLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUNwQyxRQUFRO0FBQUEsTUFDUixTQUFTO0FBQUEsSUFDWDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxzQkFBc0IsZ0JBQWdCLFVBQVUsU0FBUztBQUFBLElBQ25FLFNBQVMsQ0FBQyx3QkFBd0Isd0JBQXdCLG9CQUFvQjtBQUFBLElBQzlFLE9BQU87QUFBQSxFQUNUO0FBQUEsRUFDQSxlQUFlLENBQUMsV0FBVztBQUFBLEVBQzNCLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQztBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLFVBQzdCLE1BQU0sQ0FBQyxzQkFBc0IsY0FBYztBQUFBLFVBQzNDLElBQUksQ0FBQywwQkFBMEIsMEJBQTBCLHNCQUFzQjtBQUFBLFFBQ2pGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixTQUFTLEtBQUssVUFBVTtBQUFBLE1BQ3RCLEtBQUssQ0FBQztBQUFBLElBQ1IsQ0FBQztBQUFBLEVBQ0g7QUFDRixFQUFFOyIsCiAgIm5hbWVzIjogW10KfQo=
