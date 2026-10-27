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

          <section className="mb-12 space-y-4" aria-labelledby="singing-guide">
            <h2 id="singing-guide" className="text-2xl font-semibold text-purple-300">From humming to a usable melody</h2>
            <p className="text-gray-300">HumWeave transcribes one pitched voice at a time. It estimates the fundamental frequency and converts stable pitches into MIDI notes. It does not transcribe lyrics, chords, or several singers at once. Your instrument changes the playback sound; it does not change which notes you sang.</p>
            <ol className="list-decimal pl-6 space-y-3 text-gray-300">
              <li>Use headphones so the backing loop and metronome do not enter the microphone. Start in a quiet room, with the microphone roughly a hand span from your mouth. Avoid blowing directly into it.</li>
              <li>Choose piano and record a short phrase of three or four sustained notes. Hum on a comfortable vowel or a closed-mouth “mm”. Keep a steady volume and leave a short silence between phrases.</li>
              <li>Listen back before adding another layer. If extra notes appear, reduce background sound and sing a little more clearly. If notes disappear, move closer without clipping and hold them longer. Very breathy sounds, consonants, and extremely fast ornamentation may not produce stable pitches.</li>
              <li>Record the same phrase with Memo to keep the original performance. Compare its rhythm and melody with the converted instrument loop. MIDI captures note pitches and timing, not the full expression or sound of your voice.</li>
              <li>Once the phrase is usable, add accompaniment and export MIDI to a music editor for detailed note and rhythm editing. Keep the Memo recording as a reference.</li>
            </ol>
            <h3 className="text-xl font-semibold">What to do when the result sounds wrong</h3>
            <p className="text-gray-300">An octave error means a harmonic was mistaken for the main pitch. Try a smoother vowel, lower playback volume, and a less breathy tone. Small pitch movement within a held note is normal vibrato; the converter stabilizes it instead of treating every fluctuation as another note. Deliberate note changes must last long enough to be distinguished from these fluctuations.</p>
            <p className="text-gray-300">Microphone processing differs across phones and browsers. HumWeave requests unprocessed input where supported, but the device may apply its own processing. On iPhone, allow microphone access, keep Safari in the foreground, and make a short test after returning from another app. If conversion is unreliable, save the idea in Memo and enter the intended notes with the keyboard.</p>
          </section>

          {/* Instruments */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4 text-purple-300">🎹 Instruments (10 total)</h2>
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
                <p className="text-gray-400 text-sm">Sing a stable melody to play it with a choir-like instrument.</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-rose-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎤</span>
                  <span className="font-semibold">Memo</span>
                  <span className="text-xs bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">NEW</span>
                </div>
                <p className="text-gray-400 text-sm">Ren ljudinspelning - fånga sångidéer utan tonkonvertering!</p>
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
                <h3 className="font-semibold text-lg mb-2">🤖 AI Producer (Studio AI)</h3>
                <p className="text-gray-400">Din personliga musikproducent! AI:n kan:</p>
                <ul className="text-gray-400 ml-6 mt-2 list-disc">
                  <li>Polera och förbättra dina inspelningar</li>
                  <li>Föreslå nästa instrument att lägga till</li>
                  <li>Bygga vidare på din melodi med bas, trummor och harmonier</li>
                  <li>Kvantisera noter till rätt beat</li>
                </ul>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-rose-500/30">
                <h3 className="font-semibold text-lg mb-2">🎤 Memo Mode</h3>
                <p className="text-gray-400">Perfekt för artister som vill fånga idéer snabbt:</p>
                <ul className="text-gray-400 ml-6 mt-2 list-disc">
                  <li>Spela in din röst/sång som ren ljudfil</li>
                  <li>Ingen tonkonvertering - exakt vad du sjunger</li>
                  <li>Fungerar som en röstmemo för låtidéer</li>
                  <li>Kan kombineras med andra instrument-loopar</li>
                </ul>
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

