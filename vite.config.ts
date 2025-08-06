import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
      port: 24678
    },
    force: true
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          charts: ['recharts'],
          query: ['@tanstack/react-query']
        }
      }
    },
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    // Enhanced build optimizations
    assetsInlineLimit: 8192,
    emptyOutDir: true,
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js'],
      force: false
    },
    // Faster builds
    write: true,
    copyPublicDir: true
  }
}));
