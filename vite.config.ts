import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import net from "net";

// Function to find available port
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      findAvailablePort(startPort + 1).then(resolve).catch(reject);
    });
  });
}

// Enhanced development configuration
export default defineConfig(({ mode }) => {
  // Use a simpler approach for port management
  const basePort = 8080;
  const baseHmrPort = 24678;
  
  return {
      server: {
    host: "localhost",
    port: basePort,
    hmr: {
      overlay: false,
      port: baseHmrPort,
      host: "localhost",
      clientPort: baseHmrPort
    },
    force: true,
    strictPort: false, // Allow fallback to other ports
    open: true, // Auto-open browser
    cors: true, // Enable CORS for development
    // Enhanced error handling and module resolution
    fs: {
      strict: false,
      allow: ['..']
    },
    // Better error handling
    middlewareMode: false,
    // Ensure proper module resolution
    optimizeDeps: {
      include: ['react', 'react-dom', '@supabase/supabase-js', 'react-router-dom']
    }
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
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name][extname]',
          manualChunks(id: string) {
            if (id.includes('node_modules')) return 'vendor';
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
    },
      // Enhanced development features
  define: {
    __DEV__: mode === 'development',
    __PROD__: mode === 'production'
  },
  // Better error overlay
  css: {
    devSourcemap: true
  },
  // Optimize dependencies for faster startup
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'react-router-dom',
      '@tanstack/react-query'
    ],
    exclude: ['@mendable/firecrawl-js'], // Exclude problematic dependencies
    force: true // Force re-optimization
  },
  // Enhanced logging
  logLevel: 'info',
  clearScreen: false
  }
});
