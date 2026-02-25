import React, { useState } from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: string;
    containerClassName?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    className,
    fallback = 'https://placehold.co/400x400/e2e8f0/94a3b8?text=?',
    containerClassName = '',
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // If there's no src, we show the fallback immediately
    const finalSrc = !src || hasError ? fallback : src;

    return (
        <div className={`relative overflow-hidden flex-shrink-0 ${containerClassName}`}>
            {/* Skeleton Loader */}
            {!isLoaded && !hasError && src && (
                <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 pointer-events-none" />
            )}

            <img
                src={finalSrc}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={(e) => {
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
