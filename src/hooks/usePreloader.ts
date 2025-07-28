import { useEffect, useState } from 'react';
import heroPos from '@/assets/hero-pos.jpg';
import dashboardPreview from '@/assets/dashboard-preview.jpg';

interface PreloaderOptions {
  images?: string[];
  delay?: number;
}

export const usePreloader = ({ images = [], delay = 0 }: PreloaderOptions = {}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const preloadImages = async () => {
      if (images.length === 0) {
        setTimeout(() => setIsLoading(false), delay);
        return;
      }

      const promises = images.map((src, index) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            setProgress(((index + 1) / images.length) * 100);
            resolve();
          };
          img.onerror = () => {
            setProgress(((index + 1) / images.length) * 100);
            resolve(); // Don't reject to avoid blocking
          };
          img.src = src;
        });
      });

      await Promise.all(promises);
      setTimeout(() => setIsLoading(false), delay);
    };

    preloadImages();
  }, [images, delay]);

  return { isLoading, progress };
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical images only (fonts are handled by index.html)
  const criticalImages = [heroPos, dashboardPreview];

  criticalImages.forEach(src => {
    // Check if src is valid before creating preload link
    if (src && typeof src === 'string' && src.length > 0) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    }
  });
};