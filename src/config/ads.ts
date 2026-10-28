// Ad Configuration
// Google AdSense Publisher ID: ca-pub-8489834818532493

export const AD_CONFIG = {
  // Google AdSense
  adsensePublisherId: process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-8489834818532493',
  
  // Ad slots - create these in your AdSense dashboard
  slots: {
    banner: process.env.NEXT_PUBLIC_AD_SLOT_BANNER || '',
    interstitial: process.env.NEXT_PUBLIC_AD_SLOT_INTERSTITIAL || '',
  },
  
  // Ad display settings
  showAdsToFreeUsers: false,
  bannerPosition: 'bottom' as const,
  
  // Interstitial frequency (show after X loops recorded)
  interstitialFrequency: 5,
  
  // Use promotional banner (upgrade to Pro) as fallback when no ad slots configured
  usePromoBannerAsFallback: false,
  
  // Paused pending publisher-content and placement review.
  // Environment variables alone must never re-enable Google ads.
  hasRealAds: false,
}

// Check if user should see ads
export function shouldShowAds(isPro: boolean): boolean {
  if (isPro) return false
  return AD_CONFIG.showAdsToFreeUsers
}

// Check if interstitial should show
export function shouldShowInterstitial(loopCount: number, isPro: boolean): boolean {
  void loopCount
  void isPro
  return false
}
