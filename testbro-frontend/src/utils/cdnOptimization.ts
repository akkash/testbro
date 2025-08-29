// CDN Configuration and Asset Optimization
// This utility handles CDN integration and asset optimization for production builds

import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// CDN configuration
export interface CDNConfig {
  enabled: boolean
  baseUrl: string
  regions: string[]
  cacheControl: {
    [key: string]: string
  }
  optimization: {
    images: boolean
    fonts: boolean
    videos: boolean
    compression: boolean
  }
}

// Default CDN configuration
export const defaultCDNConfig: CDNConfig = {
  enabled: process.env.NODE_ENV === 'production',
  baseUrl: process.env.VITE_CDN_URL || 'https://cdn.testbro.ai',
  regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
  cacheControl: {
    // Static assets - long cache
    'images': 'public, max-age=31536000, immutable',
    'fonts': 'public, max-age=31536000, immutable',
    'videos': 'public, max-age=31536000, immutable',
    'js': 'public, max-age=31536000, immutable',
    'css': 'public, max-age=31536000, immutable',
    
    // HTML files - short cache
    'html': 'public, max-age=300, must-revalidate',
    
    // API responses - no cache
    'api': 'no-cache, no-store, must-revalidate',
  },
  optimization: {
    images: true,
    fonts: true,
    videos: true,
    compression: true,
  },
}

// Asset optimization utilities
export class AssetOptimizer {
  private config: CDNConfig

  constructor(config: CDNConfig = defaultCDNConfig) {
    this.config = config
  }

  // Generate optimized asset URL
  getAssetUrl(assetPath: string, options?: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'png' | 'jpg'
    blur?: number
  }): string {
    if (!this.config.enabled) {
      return assetPath
    }

    const baseUrl = this.config.baseUrl.replace(/\/$/, '')
    let url = `${baseUrl}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`

    // Add optimization parameters for images
    if (options && this.isImageAsset(assetPath)) {
      const params = new URLSearchParams()
      
      if (options.width) params.set('w', options.width.toString())
      if (options.height) params.set('h', options.height.toString())
      if (options.quality) params.set('q', options.quality.toString())
      if (options.format) params.set('f', options.format)
      if (options.blur) params.set('blur', options.blur.toString())

      if (params.toString()) {
        url += `?${params.toString()}`
      }
    }

    return url
  }

  // Generate responsive image URLs
  getResponsiveImageUrls(assetPath: string, options?: {
    sizes: number[]
    quality?: number
    format?: 'webp' | 'avif' | 'png' | 'jpg'
  }): { src: string; srcSet: string; sizes: string } {
    const { sizes = [320, 640, 960, 1280, 1920], quality = 80, format = 'webp' } = options || {}
    
    const srcSet = sizes
      .map(size => `${this.getAssetUrl(assetPath, { width: size, quality, format })} ${size}w`)
      .join(', ')

    const sizesString = sizes
      .map((size, index) => {
        if (index === sizes.length - 1) return `${size}px`
        return `(max-width: ${size}px) ${size}px`
      })
      .join(', ')

    return {
      src: this.getAssetUrl(assetPath, { width: sizes[0], quality, format }),
      srcSet,
      sizes: sizesString,
    }
  }

  // Check if asset is an image
  private isImageAsset(assetPath: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i
    return imageExtensions.test(assetPath)
  }

  // Check if asset is a font
  private isFontAsset(assetPath: string): boolean {
    const fontExtensions = /\.(woff|woff2|ttf|eot|otf)$/i
    return fontExtensions.test(assetPath)
  }

  // Generate cache headers for asset type
  getCacheHeaders(assetPath: string): string {
    if (this.isImageAsset(assetPath)) return this.config.cacheControl.images
    if (this.isFontAsset(assetPath)) return this.config.cacheControl.fonts
    if (assetPath.endsWith('.js')) return this.config.cacheControl.js
    if (assetPath.endsWith('.css')) return this.config.cacheControl.css
    if (assetPath.endsWith('.html')) return this.config.cacheControl.html
    
    return 'public, max-age=3600' // Default 1 hour cache
  }
}

// Vite plugin for CDN integration
export function cdnPlugin(config: CDNConfig = defaultCDNConfig): Plugin {
  return {
    name: 'cdn-integration',
    
    configResolved(resolvedConfig) {
      // Update base URL for production builds
      if (config.enabled && resolvedConfig.command === 'build') {
        resolvedConfig.base = config.baseUrl
      }
    },
    
    generateBundle(options, bundle) {
      // Add CDN URLs to assets
      Object.keys(bundle).forEach(fileName => {
        const chunk = bundle[fileName]
        
        if (chunk.type === 'asset' && config.enabled) {
          // Update asset references to use CDN URLs
          if (typeof chunk.source === 'string') {
            chunk.source = chunk.source.replace(
              /url\(([^)]+)\)/g,
              (match, url) => {
                const cleanUrl = url.replace(/['"]/g, '')
                if (cleanUrl.startsWith('http') || cleanUrl.startsWith('//')) {
                  return match // Already absolute URL
                }
                
                const optimizer = new AssetOptimizer(config)
                return `url("${optimizer.getAssetUrl(cleanUrl)}")`
              }
            )
          }
        }
      })
    },
    
    transformIndexHtml(html) {
      if (!config.enabled) return html
      
      // Add CDN preconnect hints
      const preconnectHints = `
        <link rel="preconnect" href="${config.baseUrl}">
        <link rel="dns-prefetch" href="${config.baseUrl}">
      `
      
      return html.replace('<head>', `<head>${preconnectHints}`)
    },
  }
}

// Image optimization plugin
export function imageOptimizationPlugin(): Plugin {
  return {
    name: 'image-optimization',
    
    generateBundle(options, bundle) {
      // Add image optimization hints to HTML
      Object.keys(bundle).forEach(fileName => {
        const chunk = bundle[fileName]
        
        if (chunk.type === 'asset' && fileName.endsWith('.html')) {
          if (typeof chunk.source === 'string') {
            // Add loading="lazy" to images
            chunk.source = chunk.source.replace(
              /<img([^>]+)>/g,
              (match, attrs) => {
                if (!attrs.includes('loading=')) {
                  return `<img${attrs} loading="lazy">`
                }
                return match
              }
            )
            
            // Add fetchpriority="high" to hero images
            chunk.source = chunk.source.replace(
              /<img([^>]+class="[^"]*hero[^"]*"[^>]*)>/g,
              (match, attrs) => {
                if (!attrs.includes('fetchpriority=')) {
                  return `<img${attrs} fetchpriority="high">`
                }
                return match
              }
            )
          }
        }
      })
    },
  }
}

// Compression plugin
export function compressionPlugin(): Plugin {
  return {
    name: 'asset-compression',
    
    writeBundle(options, bundle) {
      // This would integrate with build tools to generate compressed versions
      console.log('Generating compressed assets...')
      
      // In a real implementation, this would:
      // 1. Generate gzip versions of assets
      // 2. Generate brotli versions of assets
      // 3. Optimize images with tools like sharp or imagemin
      // 4. Generate WebP/AVIF versions of images
    },
  }
}

// Font optimization utilities
export class FontOptimizer {
  // Generate font-display CSS for better loading performance
  static generateFontDisplay(fontFamily: string, fontWeight: string = '400'): string {
    return `
      @font-face {
        font-family: '${fontFamily}';
        font-weight: ${fontWeight};
        font-display: swap;
        /* Add font URLs here */
      }
    `
  }

  // Generate preload links for critical fonts
  static generateFontPreloads(fonts: Array<{ family: string; weight: string; url: string }>): string {
    return fonts
      .map(font => 
        `<link rel="preload" href="${font.url}" as="font" type="font/woff2" crossorigin>`
      )
      .join('\n')
  }

  // Get font subset URL
  static getFontSubsetUrl(fontUrl: string, subset: string = 'latin'): string {
    const url = new URL(fontUrl)
    url.searchParams.set('subset', subset)
    return url.toString()
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  // Generate Core Web Vitals monitoring script
  static generateCWVScript(): string {
    return `
      <script>
        function reportWebVitals() {
          if ('web-vital' in window) {
            import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
              getCLS(console.log);
              getFID(console.log);
              getFCP(console.log);
              getLCP(console.log);
              getTTFB(console.log);
            });
          }
        }
        
        if (document.readyState === 'complete') {
          reportWebVitals();
        } else {
          window.addEventListener('load', reportWebVitals);
        }
      </script>
    `
  }

  // Generate resource hints
  static generateResourceHints(resources: Array<{ url: string; type: 'preload' | 'prefetch' | 'preconnect' }>): string {
    return resources
      .map(resource => {
        switch (resource.type) {
          case 'preload':
            return `<link rel="preload" href="${resource.url}">`
          case 'prefetch':
            return `<link rel="prefetch" href="${resource.url}">`
          case 'preconnect':
            return `<link rel="preconnect" href="${resource.url}">`
          default:
            return ''
        }
      })
      .join('\n')
  }
}

// Service Worker utilities for caching
export class ServiceWorkerGenerator {
  // Generate service worker for asset caching
  static generateSWConfig() {
    return {
      // Cache first strategy for static assets
      staticAssets: {
        strategy: 'CacheFirst',
        cacheName: 'static-assets',
        maxEntries: 100,
        maxAgeSeconds: 31536000, // 1 year
      },
      
      // Network first strategy for API calls
      apiCalls: {
        strategy: 'NetworkFirst',
        cacheName: 'api-cache',
        maxEntries: 50,
        maxAgeSeconds: 300, // 5 minutes
      },
      
      // Stale while revalidate for pages
      pages: {
        strategy: 'StaleWhileRevalidate',
        cacheName: 'pages',
        maxEntries: 20,
        maxAgeSeconds: 86400, // 1 day
      },
    }
  }
}

// Export main utilities
export {
  AssetOptimizer,
  FontOptimizer,
  PerformanceMonitor,
  ServiceWorkerGenerator,
}

export default {
  cdnPlugin,
  imageOptimizationPlugin,
  compressionPlugin,
  AssetOptimizer,
  FontOptimizer,
  PerformanceMonitor,
  ServiceWorkerGenerator,
}