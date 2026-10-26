// Ad Configuration
// Replace these with your actual ad network IDs when ready to monetize

export const AD_CONFIG = {
  // Google AdSense
  adsensePublisherId: process.env.NEXT_PUBLIC_ADSENSE_ID || 'ca-pub-XXXXXXXXXXXXXXXX',
  
  // Ad slots
  slots: {
    banner: process.env.NEXT_PUBLIC_AD_SLOT_BANNER || '1234567890',
    interstitial: process.env.NEXT_PUBLIC_AD_SLOT_INTERSTITIAL || '0987654321',
  },
  
  // Ad display settings
  showAdsToFreeUsers: true,
  bannerPosition: 'bottom' as const,
  
  // Interstitial frequency (show after X loops recorded)
  interstitialFrequency: 5,
  
  // Test mode (shows placeholder ads)
  testMode: process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_ADSENSE_ID,
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
