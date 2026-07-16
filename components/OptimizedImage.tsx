import React, { useState, useEffect } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: string;
    containerClassName?: string;
}

interface CacheEntry {
    blobUrl: string;
    expiry: number;
}

const imageCache = new Map<string, CacheEntry>();

const cleanExpiredCache = () => {
    const now = Date.now();
    for (const [key, entry] of imageCache.entries()) {
        if (entry.expiry <= now) {
            try {
                URL.revokeObjectURL(entry.blobUrl);
            } catch (e) {
                console.error("Error revoking object URL", e);
            }
            imageCache.delete(key);
        }
    }
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    className,
    fallback = 'https://placehold.co/400x400/e2e8f0/94a3b8?text=?',
    containerClassName = '',
    ...props
}) => {
    const [displaySrc, setDisplaySrc] = useState<string>('');
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!src) {
            setDisplaySrc(fallback);
            setIsLoaded(true);
            return;
        }

        // Only cache remote assets (e.g. Supabase Storage urls), exclude SVG generation or placeholder services
        // Also exclude googleusercontent.com and other OAuth avatar providers since they fail CORS on fetch
        const isExcluded = src.includes('placehold.co') ||
                           src.includes('dicebear.com') ||
                           src.includes('googleusercontent.com') ||
                           src.includes('facebook.com') ||
                           src.includes('fbcdn.net') ||
                           src.includes('githubusercontent.com');

        const shouldCache = src.startsWith('http') && !isExcluded;

        if (!shouldCache) {
            setDisplaySrc(src);
            setIsLoaded(true); // <--- Changed from false to true so local/uncached assets don't have fade-in delay
            setHasError(false);
            return;
        }

        // Check if we have a valid cache entry
        const cached = imageCache.get(src);
        if (cached && cached.expiry > Date.now()) {
            setDisplaySrc(cached.blobUrl);
            setIsLoaded(true);
            setHasError(false);
            return;
        }

        setIsLoaded(false);
        setHasError(false);

        let active = true;
        const loadImage = async () => {
            try {
                // Fetch image using standard cache policies
                const res = await fetch(src, { cache: 'force-cache' });
                if (!res.ok) throw new Error('Fetch failed');
                const blob = await res.blob();
                if (!active) return;

                cleanExpiredCache();
                const blobUrl = URL.createObjectURL(blob);
                
                imageCache.set(src, {
                    blobUrl,
                    expiry: Date.now() + 5 * 60 * 1000 // 5 minutes cache
                });

                setDisplaySrc(blobUrl);
            } catch (err) {
                // Safe fallback to direct source url if fetch fails (e.g. CORS or offline)
                if (active) {
                    try {
                        cleanExpiredCache();
                        imageCache.set(src, {
                            blobUrl: src, // Store original URL to avoid retrying fetch
                            expiry: Date.now() + 5 * 60 * 1000 // Cache failure for 5 minutes
                        });
                    } catch (cacheErr) {
                        console.error("Failed to cache image load failure:", cacheErr);
                    }
                    setDisplaySrc(src);
                }
            }
        };

        loadImage();

        return () => {
            active = false;
        };
    }, [src, fallback]);

    const finalSrc = hasError ? fallback : displaySrc;

    return (
        <div className={`relative overflow-hidden flex-shrink-0 ${containerClassName}`}>
            {/* Skeleton Loader */}
            {!isLoaded && !hasError && src && (
                <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 pointer-events-none" />
            )}

            <img
                src={finalSrc || undefined}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    console.warn("Image load error:", src);
                    setHasError(true);
                }}
                className={`${className} transition-opacity duration-500 ${isLoaded || hasError || !src ? 'opacity-100' : 'opacity-0'}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                {...props}
            />
        </div>
    );
};
