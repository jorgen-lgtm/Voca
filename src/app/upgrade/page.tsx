import Link from 'next/link'

export default function UpgradePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-lg text-center rounded-2xl border border-purple-500/30 bg-gray-800/50 p-8">
        <span className="inline-flex rounded-full bg-purple-500/20 px-4 py-1 text-sm font-semibold text-purple-200">Voca Free Beta</span>
        <h1 className="mt-5 text-3xl font-bold text-white">Skapa musik gratis under betan</h1>
        <p className="mt-4 text-gray-300">Voca är i beta. Alla befintliga kreativa funktioner är tillgängliga utan betalning under testperioden. Funktioner som ännu inte är färdiga kan vara begränsade.</p>
        <p className="mt-3 text-sm text-gray-400">Vi meddelar i god tid innan eventuella betalabonnemang införs.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white hover:opacity-90">Börja skapa musik</Link>
      </section>
    </main>
  )
}

