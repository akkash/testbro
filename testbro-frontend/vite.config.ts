import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { splitVendorChunkPlugin } from 'vite'

// ES Module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [
      react(),
      
      // Vendor chunk splitting for better caching
      splitVendorChunkPlugin(),
    ],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        'pages': path.resolve(__dirname, './src/pages'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '(components)': path.resolve(__dirname, './src/(components)'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@store': path.resolve(__dirname, './src/store'),
      }
    },
    
    // Development server configuration
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    
    // Preview server configuration
    preview: {
      port: 3000,
      host: true,
    },
    
    // Build optimizations
    build: {
      // Output directory
      outDir: 'dist',
      
      // Generate source maps for production debugging
      sourcemap: isProduction ? 'hidden' : true,
      
      // Remove console logs in production
      minify: isProduction ? 'esbuild' : false,
      
      // Target modern browsers
      target: 'es2015',
      
      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Rollup options for advanced optimizations
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal caching
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers'],
            'utils-vendor': ['clsx', 'class-variance-authority', 'date-fns'],
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            let extType = info[info.length - 1]
            
            // Organize assets by type
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              extType = 'images'
            } else if (/woff2?|ttf|eot/i.test(extType)) {
              extType = 'fonts'
            }
            
            return `assets/${extType}/[name]-[hash][extname]`
          },
          
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
        
        // External dependencies (for micro-frontend architecture)
        external: [],
        
        // Tree shaking optimizations
        treeshake: {
          moduleSideEffects: false,
        },
      },
      
      // Additional esbuild options
      esbuild: {
        // Remove debugger statements in production
        drop: isProduction ? ['console', 'debugger'] : [],
        
        // Legal comments handling
        legalComments: 'none',
      },
      
      // CSS optimization
      cssMinify: isProduction,
      
      // Terser options for additional minification
      terserOptions: isProduction ? {
        compress: {
          // Remove console logs
          drop_console: true,
          drop_debugger: true,
          // Remove unused code
          dead_code: true,
          // Boolean optimizations
          booleans_as_integers: true,
        },
        mangle: {
          // Mangle property names for smaller bundles
          properties: {
            regex: /^_/,
          },
        },
        format: {
          // Remove comments
          comments: false,
        },
      } : {},
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        'react-hook-form',
        'clsx',
        'date-fns',
      ],
      exclude: [
        // Exclude packages that should not be pre-bundled
      ],
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __DEV__: isDevelopment,
      __PROD__: isProduction,
    },
    
    // Environment variables
    envPrefix: 'VITE_',
    
    // CSS preprocessing
    css: {
      // PostCSS configuration
      postcss: './postcss.config.js',
      
      // CSS modules configuration
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProduction 
          ? '[hash:base64:8]'
          : '[name]__[local]___[hash:base64:5]',
      },
      
      // CSS preprocessing options
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
    
    // JSON optimization
    json: {
      namedExports: true,
      stringify: false,
    },
    
    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => [react() as any],
    },
  }
})
