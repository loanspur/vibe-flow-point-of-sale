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

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Find available port automatically
  const port = await findAvailablePort(8080);
  
  return {
    server: {
      host: "localhost",
      port,
      hmr: {
        overlay: false,
        port: port + 1000, // Use different port for HMR
        host: "localhost"
      },
      force: true,
      strictPort: false, // Allow fallback to other ports
      open: true // Auto-open browser
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
        manualChunks(id) {
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
  }
  }
});
