// vite.config.ts
import { defineConfig } from "file:///D:/mahmood%20zaky/ibrahim-store/node_modules/vite/dist/node/index.js";
import react from "file:///D:/mahmood%20zaky/ibrahim-store/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "D:\\mahmood zaky\\ibrahim-store";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 3e3,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        rewrite: (path2) => path2.replace(/^\/api/, "")
      }
    },
    hmr: {
      overlay: true,
      protocol: "ws",
      host: "localhost",
      timeout: 5e3,
      clientPort: 3e3
    },
    force: true,
    watch: {
      usePolling: true,
      interval: 1e3
    },
    strictPort: true,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    dedupe: ["firebase"]
  },
  build: {
    sourcemap: true,
    cache: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: void 0
      },
      external: ["firebase"]
    }
  },
  optimizeDeps: {
    force: true,
    include: [
      "react",
      "react-dom",
      "vaul",
      "@radix-ui/react-dialog",
      "framer-motion",
      "zustand",
      "react-router-dom"
    ],
    exclude: ["@vite/client", "@vite/env", "firebase"]
  },
  css: {
    devSourcemap: true
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxtYWhtb29kIHpha3lcXFxcaWJyYWhpbS1zdG9yZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcbWFobW9vZCB6YWt5XFxcXGlicmFoaW0tc3RvcmVcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L21haG1vb2QlMjB6YWt5L2licmFoaW0tc3RvcmUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiMC4wLjAuMFwiLFxuICAgIHBvcnQ6IDMwMDAsXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIHRhcmdldDogXCJodHRwOi8vbG9jYWxob3N0OjMwMDFcIixcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgXCJcIiksXG4gICAgICB9LFxuICAgIH0sXG4gICAgaG1yOiB7XG4gICAgICBvdmVybGF5OiB0cnVlLFxuICAgICAgcHJvdG9jb2w6IFwid3NcIixcbiAgICAgIGhvc3Q6IFwibG9jYWxob3N0XCIsXG4gICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgY2xpZW50UG9ydDogMzAwMCxcbiAgICB9LFxuICAgIGZvcmNlOiB0cnVlLFxuICAgIHdhdGNoOiB7XG4gICAgICB1c2VQb2xsaW5nOiB0cnVlLFxuICAgICAgaW50ZXJ2YWw6IDEwMDAsXG4gICAgfSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIGNvcnM6IHRydWUsXG4gICAgaGVhZGVyczoge1xuICAgICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXG4gICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHNcIjogXCJHRVQsIFBPU1QsIFBVVCwgREVMRVRFLCBPUFRJT05TXCIsXG4gICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCJDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb25cIixcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgICBkZWR1cGU6IFtcImZpcmViYXNlXCJdLFxuICB9LFxuICBidWlsZDoge1xuICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICBjYWNoZTogZmFsc2UsXG4gICAgbWluaWZ5OiBcInRlcnNlclwiLFxuICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgIGNvbXByZXNzOiB7XG4gICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB1bmRlZmluZWQsXG4gICAgICB9LFxuICAgICAgZXh0ZXJuYWw6IFtcImZpcmViYXNlXCJdLFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGZvcmNlOiB0cnVlLFxuICAgIGluY2x1ZGU6IFtcbiAgICAgIFwicmVhY3RcIiwgXG4gICAgICBcInJlYWN0LWRvbVwiLCBcbiAgICAgIFwidmF1bFwiLFxuICAgICAgXCJAcmFkaXgtdWkvcmVhY3QtZGlhbG9nXCIsXG4gICAgICBcImZyYW1lci1tb3Rpb25cIixcbiAgICAgIFwienVzdGFuZFwiLFxuICAgICAgXCJyZWFjdC1yb3V0ZXItZG9tXCJcbiAgICBdLFxuICAgIGV4Y2x1ZGU6IFtcIkB2aXRlL2NsaWVudFwiLCBcIkB2aXRlL2VudlwiLCBcImZpcmViYXNlXCJdLFxuICB9LFxuICBjc3M6IHtcbiAgICBkZXZTb3VyY2VtYXA6IHRydWUsXG4gIH0sXG59KSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlSLFNBQVMsb0JBQW9CO0FBQzlTLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFGakIsSUFBTSxtQ0FBbUM7QUFJekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE9BQU87QUFBQSxFQUN6QyxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsUUFDUixTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxVQUFVLEVBQUU7QUFBQSxNQUM5QztBQUFBLElBQ0Y7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNILFNBQVM7QUFBQSxNQUNULFVBQVU7QUFBQSxNQUNWLE1BQU07QUFBQSxNQUNOLFNBQVM7QUFBQSxNQUNULFlBQVk7QUFBQSxJQUNkO0FBQUEsSUFDQSxPQUFPO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxZQUFZO0FBQUEsTUFDWixVQUFVO0FBQUEsSUFDWjtBQUFBLElBQ0EsWUFBWTtBQUFBLElBQ1osTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsK0JBQStCO0FBQUEsTUFDL0IsZ0NBQWdDO0FBQUEsTUFDaEMsZ0NBQWdDO0FBQUEsSUFDbEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsSUFDQSxRQUFRLENBQUMsVUFBVTtBQUFBLEVBQ3JCO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUEsSUFDWCxPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixlQUFlO0FBQUEsTUFDYixVQUFVO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFVBQVUsQ0FBQyxVQUFVO0FBQUEsSUFDdkI7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixPQUFPO0FBQUEsSUFDUCxTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVMsQ0FBQyxnQkFBZ0IsYUFBYSxVQUFVO0FBQUEsRUFDbkQ7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILGNBQWM7QUFBQSxFQUNoQjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
