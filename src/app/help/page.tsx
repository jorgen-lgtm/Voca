'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          HumWeave
        </Link>
        <Link 
          href="/"
          className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to App
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            How to Use HumWeave
          </h1>

          {/* Quick Start */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">🚀 Quick Start</h2>
            <div className="bg-gray-800/50 rounded-2xl p-6 space-y-4">
              <div className="flex gap-4">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-semibold text-lg">Press the Record Button</h3>
                  <p className="text-gray-400">Tap the big purple button to start. Allow microphone access when prompted.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-semibold text-lg">Hum, Sing, or Play</h3>
                  <p className="text-gray-400">The app detects your voice pitch and converts it to musical notes. You can also use the on-screen keyboard or your computer keyboard.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h3 className="font-semibold text-lg">Release to Stop</h3>
                  <p className="text-gray-400">Tap the button again to stop recording. Your loop appears as a colored ring.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">4️⃣</span>
                <div>
                  <h3 className="font-semibold text-lg">Layer Multiple Loops</h3>
                  <p className="text-gray-400">Change instruments and record more loops. They stack and play together!</p>
                </div>
              </div>
            </div>
          </section>

          {/* Instruments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎹 Instruments</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🥁</span>
                  <span className="font-semibold">Drums</span>
                </div>
                <p className="text-gray-400 text-sm">Tap the drum pads (Kick, Snare, Hi-Hat) to create beats. Heavy bass kick for punchy rhythms.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎸</span>
                  <span className="font-semibold">Bass</span>
                </div>
                <p className="text-gray-400 text-sm">Deep, punchy bass with sub frequencies. Perfect for laying down the foundation.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎹</span>
                  <span className="font-semibold">Piano</span>
                </div>
                <p className="text-gray-400 text-sm">Rich piano with harmonics and subtle chorus. Great for melodies and chords.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎸</span>
                  <span className="font-semibold">Guitar</span>
                </div>
                <p className="text-gray-400 text-sm">Warm acoustic guitar tone with natural decay.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🗣️</span>
                  <span className="font-semibold">Voice/Speech Mode</span>
                </div>
                <p className="text-gray-400 text-sm">Speak naturally and the melody follows your intonation. Voice up = note up, voice down = note down.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎻</span>
                  <span className="font-semibold">Strings</span>
                </div>
                <p className="text-gray-400 text-sm">Lush orchestral strings with beautiful sustain.</p>
              </div>
            </div>
          </section>

          {/* Keyboard Controls */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">⌨️ Computer Keyboard</h2>
            <div className="bg-gray-800/50 rounded-2xl p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">White Keys</h3>
                  <div className="flex gap-2 flex-wrap">
                    {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'].map((key, i) => (
                      <div key={key} className="w-10 h-12 bg-white text-gray-900 rounded flex flex-col items-center justify-center text-sm font-bold">
                        <span className="text-xs text-gray-500">{['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'][i]}</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Black Keys</h3>
                  <div className="flex gap-2">
                    {['W', 'E', 'T', 'Y', 'U'].map((key, i) => (
                      <div key={key} className="w-8 h-10 bg-gray-900 border border-gray-700 rounded flex flex-col items-center justify-center text-xs font-bold">
                        <span className="text-[10px] text-gray-500">{['C#', 'D#', 'F#', 'G#', 'A#'][i]}</span>
                        <span>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-400"><strong className="text-white">Z</strong> = Octave down &nbsp;|&nbsp; <strong className="text-white">X</strong> = Octave up</p>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">✨ Features</h2>
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-lg mb-2">🎚️ Loop Controls</h3>
                <p className="text-gray-400">Click on any loop ring to:</p>
                <ul className="text-gray-400 ml-6 mt-2 list-disc">
                  <li>Adjust volume (0-100%)</li>
                  <li>Transpose up/down by semitones or octaves</li>
                  <li>Delete the loop</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-lg mb-2">🕐 Metronome</h3>
                <p className="text-gray-400">Enable the metronome to stay in time. Visual beats show the current position. Toggle audio click on/off.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-lg mb-2">🤖 AI Assistant</h3>
                <p className="text-gray-400">Use AI to enhance your loops: quantize notes to the beat, smooth melodies, and snap to musical scales.</p>
              </div>
            </div>
          </section>

          {/* Pro Features */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-pink-400">⭐ Pro Features</h2>
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border border-purple-500/30">
              <p className="text-lg mb-6">Upgrade to Pro to unlock the full potential of HumWeave:</p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Unlimited Projects</h3>
                    <p className="text-gray-400 text-sm">Save as many projects as you want (Free: 3 projects)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Export to WAV/MP3</h3>
                    <p className="text-gray-400 text-sm">Download your creations as audio files</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Export to MIDI</h3>
                    <p className="text-gray-400 text-sm">Use your loops in any DAW or music software</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Unlimited Loops</h3>
                    <p className="text-gray-400 text-sm">Layer as many tracks as you need (Free: 4 loops)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Advanced AI Tools</h3>
                    <p className="text-gray-400 text-sm">More AI features for music enhancement</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-400 text-xl">✓</span>
                  <div>
                    <h3 className="font-semibold">Priority Support</h3>
                    <p className="text-gray-400 text-sm">Get help when you need it</p>
                  </div>
                </div>
              </div>

              <Link
                href="/upgrade"
                className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30"
              >
                Upgrade to Pro →
              </Link>
            </div>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">💡 Tips</h2>
            <div className="bg-gray-800/50 rounded-2xl p-6 space-y-3">
              <p className="flex gap-3"><span>🎤</span> <span className="text-gray-300">For best pitch detection, use headphones to avoid feedback.</span></p>
              <p className="flex gap-3"><span>🎵</span> <span className="text-gray-300">Start with drums to set the rhythm, then add bass, then melody.</span></p>
              <p className="flex gap-3"><span>🗣️</span> <span className="text-gray-300">In Voice mode, exaggerate your intonation for better results.</span></p>
              <p className="flex gap-3"><span>⌨️</span> <span className="text-gray-300">Use the computer keyboard for precise note control.</span></p>
              <p className="flex gap-3"><span>🔇</span> <span className="text-gray-300">Turn off the mic and use only the keyboard if pitch detection isn&apos;t working well.</span></p>
            </div>
          </section>

        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>HumWeave - Transform your voice into music</p>
      </footer>
    </div>
  )
}
