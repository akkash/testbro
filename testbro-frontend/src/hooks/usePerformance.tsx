import React, { 
  Suspense, 
  lazy, 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  memo,
  forwardRef,
  ComponentType,
  LazyExoticComponent,
} from 'react'
import { AssetOptimizer } from '../utils/cdnOptimization'

// Lazy loading utilities
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): LazyExoticComponent<T> {
  const LazyComponent = lazy(importFunc)
  
  return memo(forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <Suspense fallback={fallback ? <fallback /> : <div>Loading...</div>}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ))) as LazyExoticComponent<T>
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  targetRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      { threshold: 0.1, ...options }
    )

    observer.observe(target)

    return () => {
      observer.unobserve(target)
    }
  }, [targetRef, hasIntersected, options])

  return { isIntersecting, hasIntersected }
}

// Optimized Image Component
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'png' | 'jpg'
  lazy?: boolean
  responsive?: boolean
  sizes?: number[]
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
  fallback?: string
}

export const OptimizedImage = memo(forwardRef<HTMLImageElement, OptimizedImageProps>(({
  src,
  alt,
  width,
  height,
  quality = 80,
  format = 'webp',
  lazy = true,
  responsive = false,
  sizes = [320, 640, 960, 1280, 1920],
  priority = false,
  onLoad,
  onError,
  fallback,
  className,
  ...props
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const { hasIntersected } = useIntersectionObserver(imgRef, { threshold: 0.1 })

  const optimizer = useMemo(() => new AssetOptimizer(), [])

  // Trigger loading when element is in viewport
  useEffect(() => {
    if (lazy && hasIntersected && !shouldLoad) {
      setShouldLoad(true)
    }
  }, [lazy, hasIntersected, shouldLoad])

  // Generate optimized URLs
  const imageUrls = useMemo(() => {
    if (!shouldLoad) return { src: '', srcSet: '', sizes: '' }

    if (responsive) {
      return optimizer.getResponsiveImageUrls(src, { sizes, quality, format })
    } else {
      return {
        src: optimizer.getAssetUrl(src, { width, height, quality, format }),
        srcSet: '',
        sizes: '',
      }
    }
  }, [shouldLoad, src, responsive, width, height, quality, format, sizes, optimizer])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // Show placeholder while loading
  if (!shouldLoad) {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={`Loading ${alt}`}
      />
    )
  }

  // Show fallback on error
  if (hasError && fallback) {
    return (
      <img
        ref={ref}
        src={fallback}
        alt={alt}
        className={className}
        onLoad={handleLoad}
        {...props}
      />
    )
  }

  return (
    <>
      {/* Preload critical images */}
      {priority && (
        <link
          rel="preload"
          as="image"
          href={imageUrls.src}
          {...(responsive && { imageSrcSet: imageUrls.srcSet })}
        />
      )}
      
      <img
        ref={ref || imgRef}
        src={imageUrls.src}
        srcSet={responsive ? imageUrls.srcSet : undefined}
        sizes={responsive ? imageUrls.sizes : undefined}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </>
  )
}))

OptimizedImage.displayName = 'OptimizedImage'

// Virtual Scrolling Hook
interface VirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItemsCount = Math.ceil(containerHeight / itemHeight)
  const totalItems = items.length
  const totalHeight = totalItems * itemHeight

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    totalItems - 1,
    startIndex + visibleItemsCount + overscan * 2
  )

  const visibleItems = useMemo(() => {
    const result = []
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: i * itemHeight,
      })
    }
    return result
  }, [items, startIndex, endIndex, itemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  }
}

// Virtual List Component
interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  overscan = 5,
}: VirtualListProps<T>) {
  const { visibleItems, totalHeight, handleScroll } = useVirtualScroll(items, {
    itemHeight,
    containerHeight: height,
    overscan,
  })

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetTop }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetTop,
              width: '100%',
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Code Splitting Hook
export function useCodeSplitting() {
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set())

  const preloadComponent = useCallback(async (importFunc: () => Promise<any>, chunkName: string) => {
    if (loadedChunks.has(chunkName)) return

    try {
      await importFunc()
      setLoadedChunks(prev => new Set(prev).add(chunkName))
    } catch (error) {
      console.warn(`Failed to preload chunk: ${chunkName}`, error)
    }
  }, [loadedChunks])

  return { preloadComponent, loadedChunks }
}

// Performance Monitoring Hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    fcp?: number
    lcp?: number
    fid?: number
    cls?: number
    ttfb?: number
  }>({})

  useEffect(() => {
    // Dynamic import to avoid loading web-vitals in SSR
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => setMetrics(prev => ({ ...prev, cls: metric.value })))
      getFID((metric) => setMetrics(prev => ({ ...prev, fid: metric.value })))
      getFCP((metric) => setMetrics(prev => ({ ...prev, fcp: metric.value })))
      getLCP((metric) => setMetrics(prev => ({ ...prev, lcp: metric.value })))
      getTTFB((metric) => setMetrics(prev => ({ ...prev, ttfb: metric.value })))
    }).catch(error => {
      console.warn('Failed to load web-vitals:', error)
    })
  }, [])

  return metrics
}

// Debounced Hook for Performance
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled Hook for Performance
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

// Memoized Expensive Computation Hook
export function useExpensiveComputation<T, R>(
  computeFunc: (input: T) => R,
  input: T,
  deps: React.DependencyList = []
): R {
  return useMemo(() => computeFunc(input), [input, ...deps])
}

// Progressive Enhancement Hook
export function useProgressiveEnhancement() {
  const [isEnhanced, setIsEnhanced] = useState(false)

  useEffect(() => {
    // Check for modern browser features
    const hasIntersectionObserver = 'IntersectionObserver' in window
    const hasWebP = document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')
    const hasServiceWorker = 'serviceWorker' in navigator

    setIsEnhanced(hasIntersectionObserver && hasWebP && hasServiceWorker)
  }, [])

  return isEnhanced
}

// Export all utilities
export {
  createLazyComponent,
  useIntersectionObserver,
  OptimizedImage,
  useVirtualScroll,
  VirtualList,
  useCodeSplitting,
  usePerformanceMonitor,
  useDebounce,
  useThrottle,
  useExpensiveComputation,
  useProgressiveEnhancement,
}