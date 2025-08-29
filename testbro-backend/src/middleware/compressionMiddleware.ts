import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger, LogCategory } from '../services/loggingService';

// Compression configuration interface
interface CompressionConfig {
  threshold: number;          // Minimum response size to compress (bytes)
  level: number;             // Compression level (1-9, 6 is default)
  chunkSize: number;         // Chunk size for streaming compression
  windowBits: number;        // Window size for compression
  memLevel: number;          // Memory level (1-9)
  strategy: number;          // Compression strategy
  filter: (req: Request, res: Response) => boolean;
}

// Default compression configuration optimized for API responses
const defaultConfig: CompressionConfig = {
  threshold: 1024,           // Compress responses larger than 1KB
  level: 6,                  // Balanced compression level
  chunkSize: 16 * 1024,      // 16KB chunks
  windowBits: 15,            // Maximum window size
  memLevel: 8,               // High memory usage for better compression
  strategy: 0,               // Default strategy
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't accept encoding
    if (!req.headers['accept-encoding']) {
      return false;
    }

    // Don't compress if response is already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }

    // Don't compress small responses
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength.toString()) < 1024) {
      return false;
    }

    // Compress text-based content types
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.toString().toLowerCase();
      return (
        type.includes('text/') ||
        type.includes('application/json') ||
        type.includes('application/javascript') ||
        type.includes('application/xml') ||
        type.includes('application/rss') ||
        type.includes('image/svg')
      );
    }

    return true;
  }
};

// Smart compression middleware with performance monitoring
export class CompressionMiddleware {
  private config: CompressionConfig;
  private stats = {
    totalRequests: 0,
    compressedRequests: 0,
    totalBytesOriginal: 0,
    totalBytesCompressed: 0,
    totalCompressionTime: 0,
  };

  constructor(config?: Partial<CompressionConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  // Get compression middleware
  getMiddleware() {
    return compression({
      threshold: this.config.threshold,
      level: this.config.level,
      chunkSize: this.config.chunkSize,
      windowBits: this.config.windowBits,
      memLevel: this.config.memLevel,
      strategy: this.config.strategy,
      filter: (req: Request, res: Response) => {
        const startTime = Date.now();
        const shouldCompress = this.config.filter(req, res);
        
        if (shouldCompress) {
          // Override res.end to track compression stats
          const originalEnd = res.end.bind(res);
          const originalWrite = res.write.bind(res);
          
          let originalSize = 0;
          let compressedSize = 0;

          // Track original write calls
          res.write = function(chunk: any, encoding?: any, callback?: any) {
            if (chunk) {
              originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
            }
            return originalWrite(chunk, encoding, callback);
          };

          // Track final response
          res.end = function(chunk?: any, encoding?: any, callback?: any) {
            if (chunk) {
              originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
            }
            
            const compressionTime = Date.now() - startTime;
            compressedSize = parseInt(res.getHeader('content-length')?.toString() || '0') || originalSize;

            // Update statistics
            compressionMiddleware.updateStats({
              compressed: true,
              originalSize,
              compressedSize,
              compressionTime,
            });

            logger.debug('Response compressed', LogCategory.PERFORMANCE, {
              metadata: {
                path: req.path,
                method: req.method,
                originalSize,
                compressedSize,
                compressionRatio: originalSize > 0 ? ((originalSize - compressedSize) / originalSize * 100).toFixed(2) + '%' : '0%',
                compressionTime: `${compressionTime}ms`,
                encoding: res.getHeader('content-encoding'),
              }
            });

            return originalEnd(chunk, encoding, callback);
          };
        } else {
          // Track uncompressed responses
          compressionMiddleware.updateStats({
            compressed: false,
            originalSize: 0,
            compressedSize: 0,
            compressionTime: 0,
          });
        }

        return shouldCompress;
      }
    });
  }

  // Update compression statistics
  private updateStats(data: {
    compressed: boolean;
    originalSize: number;
    compressedSize: number;
    compressionTime: number;
  }) {
    this.stats.totalRequests++;
    
    if (data.compressed) {
      this.stats.compressedRequests++;
      this.stats.totalBytesOriginal += data.originalSize;
      this.stats.totalBytesCompressed += data.compressedSize;
      this.stats.totalCompressionTime += data.compressionTime;
    }
  }

  // Get compression statistics
  getStats() {
    const compressionRatio = this.stats.totalBytesOriginal > 0 
      ? ((this.stats.totalBytesOriginal - this.stats.totalBytesCompressed) / this.stats.totalBytesOriginal * 100)
      : 0;

    const averageCompressionTime = this.stats.compressedRequests > 0
      ? this.stats.totalCompressionTime / this.stats.compressedRequests
      : 0;

    const bandwidthSaved = this.stats.totalBytesOriginal - this.stats.totalBytesCompressed;

    return {
      totalRequests: this.stats.totalRequests,
      compressedRequests: this.stats.compressedRequests,
      compressionRate: this.stats.totalRequests > 0 
        ? (this.stats.compressedRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
        : '0%',
      totalBytesOriginal: this.stats.totalBytesOriginal,
      totalBytesCompressed: this.stats.totalBytesCompressed,
      compressionRatio: compressionRatio.toFixed(2) + '%',
      bandwidthSaved,
      averageCompressionTime: averageCompressionTime.toFixed(2) + 'ms',
      estimatedMonthlySavings: this.calculateMonthlySavings(bandwidthSaved),
    };
  }

  // Calculate estimated monthly bandwidth savings
  private calculateMonthlySavings(bandwidthSaved: number): string {
    if (bandwidthSaved === 0) return '0 MB';
    
    // Extrapolate to monthly savings (assuming current rate)
    const hoursInMonth = 30 * 24;
    const currentHour = 1; // Simplified assumption
    const monthlySavings = (bandwidthSaved / currentHour) * hoursInMonth;
    
    if (monthlySavings > 1024 * 1024 * 1024) {
      return `${(monthlySavings / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (monthlySavings > 1024 * 1024) {
      return `${(monthlySavings / (1024 * 1024)).toFixed(2)} MB`;
    } else if (monthlySavings > 1024) {
      return `${(monthlySavings / 1024).toFixed(2)} KB`;
    } else {
      return `${monthlySavings.toFixed(0)} bytes`;
    }
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      totalRequests: 0,
      compressedRequests: 0,
      totalBytesOriginal: 0,
      totalBytesCompressed: 0,
      totalCompressionTime: 0,
    };
  }
}

// Compression utilities for manual compression
export class CompressionUtils {
  // Compress string data manually
  static async compressString(data: string, level: number = 6): Promise<Buffer> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, { level }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  // Decompress data
  static async decompressData(data: Buffer): Promise<string> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result.toString());
      });
    });
  }

  // Check if client supports compression
  static supportsCompression(req: Request): boolean {
    const acceptEncoding = req.headers['accept-encoding'];
    if (!acceptEncoding) return false;
    
    return acceptEncoding.includes('gzip') || 
           acceptEncoding.includes('deflate') || 
           acceptEncoding.includes('br');
  }

  // Get best supported compression method
  static getBestCompressionMethod(req: Request): string | null {
    const acceptEncoding = req.headers['accept-encoding'];
    if (!acceptEncoding) return null;

    // Prefer brotli, then gzip, then deflate
    if (acceptEncoding.includes('br')) return 'br';
    if (acceptEncoding.includes('gzip')) return 'gzip';
    if (acceptEncoding.includes('deflate')) return 'deflate';
    
    return null;
  }

  // Estimate compression ratio for content type
  static estimateCompressionRatio(contentType: string): number {
    const type = contentType.toLowerCase();
    
    // Text-based content compresses well
    if (type.includes('text/html')) return 0.7; // 70% compression
    if (type.includes('text/css')) return 0.8;  // 80% compression
    if (type.includes('application/javascript')) return 0.75; // 75% compression
    if (type.includes('application/json')) return 0.6; // 60% compression
    if (type.includes('text/')) return 0.65; // 65% compression
    
    // Binary content doesn't compress much
    if (type.includes('image/')) return 0.95; // 5% compression
    if (type.includes('video/')) return 0.98; // 2% compression
    if (type.includes('audio/')) return 0.97; // 3% compression
    
    return 0.5; // Default 50% compression estimate
  }
}

// Create singleton compression middleware instance
export const compressionMiddleware = new CompressionMiddleware();

// Export default compression middleware
export default compressionMiddleware.getMiddleware();