import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ADMOB_IDS } from '../constants';

interface UseAdMobBannerOptions {
  /** If true, hides the banner for PRO users. Default: false (show for everyone). */
  hideForPro?: boolean;
  isPro?: boolean;
  /** If true, completely skips showing the banner (e.g. in Layout when on a league detail page). */
  skip?: boolean;
}

/**
 * Centralized hook for managing the AdMob bottom banner.
 *
 * Usage:
 * - In Layout.tsx (global pages): useAdMobBanner({}) → shows for ALL users
 * - In League detail pages: useAdMobBanner({ hideForPro: true, isPro }) → hides for PRO
 *
 * Safety: Only one banner can be visible at a time. This hook handles
 * show/hide on mount/unmount automatically.
 *
 * Padding: Automatically adjusts body padding-bottom so app content is
 * never hidden behind the banner.
 */
export const useAdMobBanner = ({ hideForPro = false, isPro = false, skip = false }: UseAdMobBannerOptions = {}) => {
  const adMobModuleRef = useRef<any>(null);
  const bannerActiveRef = useRef(false);
  const sizeListenerRef = useRef<any>(null);

  const clearBannerPadding = () => {
    document.documentElement.style.setProperty('--admob-banner-height', '0px');
    document.body.style.paddingBottom = '';
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // If explicitly skipped (e.g. Layout on league-detail pages), remove any lingering banner
    if (skip) {
      if (bannerActiveRef.current && adMobModuleRef.current) {
        bannerActiveRef.current = false;
        adMobModuleRef.current.AdMob.hideBanner().catch(() => {});
        adMobModuleRef.current.AdMob.removeBanner().catch(() => {});
        clearBannerPadding();
      }
      return;
    }

    // If this page hides for PRO users and user is PRO, clean up any active banner and bail
    if (hideForPro && isPro) {
      if (bannerActiveRef.current && adMobModuleRef.current) {
        bannerActiveRef.current = false;
        adMobModuleRef.current.AdMob.hideBanner().catch(() => {});
        adMobModuleRef.current.AdMob.removeBanner().catch(() => {});
        clearBannerPadding();
      }
      return;
    }

    // If banner is already active, no need to re-show
    if (bannerActiveRef.current) return;

    let isMounted = true;

    (async () => {
      try {
        if (!adMobModuleRef.current) {
          adMobModuleRef.current = await import('@capacitor-community/admob');
        }
        if (!isMounted) return;

        const { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } = adMobModuleRef.current;

        // Listen for banner size to push content above it
        sizeListenerRef.current = await AdMob.addListener(
          BannerAdPluginEvents.SizeChanged,
          (info: { width: number; height: number }) => {
            if (!isMounted) return;
            const heightPx = `${info.height}px`;
            document.documentElement.style.setProperty('--admob-banner-height', heightPx);
            document.body.style.paddingBottom = heightPx;
          }
        );

        await AdMob.showBanner({
          adId: ADMOB_IDS.BANNER,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });

        if (isMounted) bannerActiveRef.current = true;
      } catch (e) {
        // AdMob errors must never crash the app
        if (import.meta.env.DEV) console.error('[useAdMobBanner] show error:', e);
      }
    })();

    return () => {
      isMounted = false;
      if (sizeListenerRef.current) {
        sizeListenerRef.current.remove();
        sizeListenerRef.current = null;
      }
      if (bannerActiveRef.current && adMobModuleRef.current) {
        bannerActiveRef.current = false;
        adMobModuleRef.current.AdMob.hideBanner().catch(() => {});
        adMobModuleRef.current.AdMob.removeBanner().catch(() => {});
        clearBannerPadding();
      }
    };
  }, [hideForPro, isPro, skip]);
};
