import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
export async function exportFile(bytes: Uint8Array, name: string, type: string) {
  if (Capacitor.isNativePlatform()) {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const file = await Filesystem.writeFile({path:name,data:btoa(binary),directory:Directory.Cache})
    await Share.share({title:name,files:[file.uri]})
    return // Cache retained until next export or OS eviction; user controls share destination.
  }
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type}))
  const a = document.createElement('a'); a.href=url; a.download=name; a.click()
  setTimeout(()=>URL.revokeObjectURL(url),10000)
}
