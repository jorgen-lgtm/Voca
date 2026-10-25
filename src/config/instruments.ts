import type { InstrumentType } from '@/types/database'

export interface InstrumentConfig {
  type: InstrumentType
  name: string
  icon: string
  color: string
  soundfont: string
  category: 'rhythm' | 'bass' | 'keys' | 'strings' | 'brass'
  octaveRange: [number, number]
  description: string
}

export const SOUNDFONT_BASE_URL = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM'

export const INSTRUMENTS: InstrumentConfig[] = [
  {
    type: 'drums',
    name: 'Trummor',
    icon: '🥁',
    color: '#ef4444',
    soundfont: 'synth_drum',
    category: 'rhythm',
    octaveRange: [1, 2],
    description: 'Akustiskt trumkit med kick, virvel och hi-hat',
  },
  {
    type: 'bass',
    name: 'Akustisk Bas',
    icon: '🎸',
    color: '#f97316',
    soundfont: 'acoustic_bass',
    category: 'bass',
    octaveRange: [1, 4],
    description: 'Varm akustisk kontrabas',
  },
  {
    type: 'piano',
    name: 'Piano',
    icon: '🎹',
    color: '#3b82f6',
    soundfont: 'acoustic_grand_piano',
    category: 'keys',
    octaveRange: [2, 7],
    description: 'Klassiskt flygelpiano',
  },
  {
    type: 'guitar',
    name: 'Akustisk Gitarr',
    icon: '🎸',
    color: '#84cc16',
    soundfont: 'acoustic_guitar_nylon',
    category: 'strings',
    octaveRange: [2, 6],
    description: 'Nylonsträngad akustisk gitarr',
  },
  {
    type: 'synth',
    name: 'Synth',
    icon: '🎛️',
    color: '#8b5cf6',
    soundfont: 'synth_brass_1',
    category: 'brass',
    octaveRange: [2, 6],
    description: 'Analog synthesizer',
  },
  {
    type: 'strings',
    name: 'Stråkar',
    icon: '🎻',
    color: '#10b981',
    soundfont: 'string_ensemble_1',
    category: 'strings',
    octaveRange: [2, 7],
    description: 'Orkesterstråkar',
  },
  {
    type: 'brass',
    name: 'Blås',
    icon: '🎺',
    color: '#eab308',
    soundfont: 'brass_section',
    category: 'brass',
    octaveRange: [2, 6],
    description: 'Brassektion med trumpeter och tromboner',
  },
  {
    type: 'organ',
    name: 'Orgel',
    icon: '⛪',
    color: '#ec4899',
    soundfont: 'church_organ',
    category: 'keys',
    octaveRange: [2, 7],
    description: 'Kyrkoorgel',
  },
]

export const INSTRUMENT_MAP = new Map<InstrumentType, InstrumentConfig>(
  INSTRUMENTS.map(i => [i.type, i])
)

export function getInstrumentConfig(type: InstrumentType): InstrumentConfig {
  return INSTRUMENT_MAP.get(type) || INSTRUMENTS[0]
}

export const INSTRUMENT_COLORS: Record<InstrumentType, string> = Object.fromEntries(
  INSTRUMENTS.map(i => [i.type, i.color])
) as Record<InstrumentType, string>

export const DRUM_SAMPLES = {
  kick: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/kick.mp3',
    midiNote: 36,
  },
  snare: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/snare.mp3',
    midiNote: 38,
  },
  hihat: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/hh.mp3',
    midiNote: 42,
  },
  tom1: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/tom1.mp3',
    midiNote: 45,
  },
  tom2: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/tom2.mp3',
    midiNote: 47,
  },
  crash: {
    url: 'https://cdn.jsdelivr.net/gh/Tonejs/Tone.js@dev/examples/audio/drums/crash.mp3',
    midiNote: 49,
  },
}
