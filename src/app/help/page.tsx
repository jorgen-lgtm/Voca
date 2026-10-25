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
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎹 Instruments (9 total)</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🥁</span>
                  <span className="font-semibold">Drums</span>
                </div>
                <p className="text-gray-400 text-sm">Tap the drum pads for Kick, Snare, Hi-Hat. Heavy bass kick!</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎸</span>
                  <span className="font-semibold">Bass</span>
                </div>
                <p className="text-gray-400 text-sm">Deep, punchy bass with sub frequencies.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎹</span>
                  <span className="font-semibold">Piano</span>
                </div>
                <p className="text-gray-400 text-sm">Rich piano with harmonics and chorus.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎸</span>
                  <span className="font-semibold">Guitar</span>
                </div>
                <p className="text-gray-400 text-sm">Warm acoustic guitar tone.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎻</span>
                  <span className="font-semibold">Strings</span>
                </div>
                <p className="text-gray-400 text-sm">Lush orchestral strings.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎺</span>
                  <span className="font-semibold">Brass</span>
                </div>
                <p className="text-gray-400 text-sm">Bold brass section sound.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎛️</span>
                  <span className="font-semibold">Synth</span>
                </div>
                <p className="text-gray-400 text-sm">Modern synthesizer tones.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎵</span>
                  <span className="font-semibold">Organ</span>
                </div>
                <p className="text-gray-400 text-sm">Classic organ with warmth.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🗣️</span>
                  <span className="font-semibold">Voice Mode</span>
                </div>
                <p className="text-gray-400 text-sm">Speak and melody follows your intonation!</p>
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
                <h3 className="font-semibold text-lg mb-2">🎤 Mic Toggle</h3>
                <p className="text-gray-400">Toggle the microphone on/off at the top of the screen. Turn it off to use only the keyboard for input - useful if pitch detection isn&apos;t working well on your device.</p>
              </div>
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
              <div className="bg-gray-800/50 rounded-xl p-4">
                <h3 className="font-semibold text-lg mb-2">💾 Export</h3>
                <p className="text-gray-400">Export your creations as MIDI files (works in any DAW) or JSON format. Click the Export button in the transport controls.</p>
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">👤 Account</h2>
            <div className="bg-gray-800/50 rounded-2xl p-6">
              <p className="text-gray-300 mb-4">Create a free account to save your projects:</p>
              <ul className="text-gray-400 space-y-2">
                <li className="flex gap-3"><span>📧</span> Sign up with email and password</li>
                <li className="flex gap-3"><span>💾</span> Save unlimited projects</li>
                <li className="flex gap-3"><span>🔄</span> Access your projects from any device</li>
                <li className="flex gap-3"><span>📤</span> Export to MIDI and JSON</li>
              </ul>
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
              <p className="flex gap-3"><span>📱</span> <span className="text-gray-300">On mobile, make sure to allow microphone access when prompted.</span></p>
              <p className="flex gap-3"><span>🎧</span> <span className="text-gray-300">Use the on-screen mini keyboard on mobile for best results.</span></p>
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
