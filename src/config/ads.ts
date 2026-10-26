// Ad Configuration
// Replace these with your actual ad network IDs when ready to monetize

export const AD_CONFIG = {
  // Google AdSense - set NEXT_PUBLIC_ADSENSE_ID to enable real ads
  adsensePublisherId: process.env.NEXT_PUBLIC_ADSENSE_ID || '',
  
  // Ad slots
  slots: {
    banner: process.env.NEXT_PUBLIC_AD_SLOT_BANNER || '',
    interstitial: process.env.NEXT_PUBLIC_AD_SLOT_INTERSTITIAL || '',
  },
  
  // Ad display settings
  showAdsToFreeUsers: true,
  bannerPosition: 'bottom' as const,
  
  // Interstitial frequency (show after X loops recorded)
  interstitialFrequency: 5,
  
  // Use promotional banner (upgrade to Pro) when no AdSense is configured
  // Set to false to hide all ads when AdSense isn't set up
  usePromoBannerAsFallback: true,
  
  // Real AdSense ads enabled when ID is set
  hasRealAds: !!process.env.NEXT_PUBLIC_ADSENSE_ID,
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
