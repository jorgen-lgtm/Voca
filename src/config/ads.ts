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
  showAdsToFreeUsers: true,
  bannerPosition: 'bottom' as const,
  
  // Interstitial frequency (show after X loops recorded)
  interstitialFrequency: 5,
  
  // Use promotional banner (upgrade to Pro) as fallback when no ad slots configured
  usePromoBannerAsFallback: true,
  
  // Real AdSense ads enabled - publisher ID is now configured
  // Will show real ads when ad slots are also configured
  hasRealAds: !!(process.env.NEXT_PUBLIC_AD_SLOT_BANNER),
}

// Check if user should see ads
export function shouldShowAds(isPro: boolean): boolean {
  if (isPro) return false
  return AD_CONFIG.showAdsToFreeUsers
}

// Check if interstitial should show
export function shouldShowInterstitial(loopCount: number, isPro: boolean): boolean {
  if (isPro) return false
  return loopCount > 0 && loopCount % AD_CONFIG.interstitialFrequency === 0
}
