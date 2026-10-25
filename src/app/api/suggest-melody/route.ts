import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

interface MidiNote {
  pitch: number
  startTime: number
  duration: number
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const { notes, tempo, style } = await request.json() as {
      notes: MidiNote[]
      tempo: number
      style?: string
    }

    if (!notes || notes.length === 0) {
      return NextResponse.json(
        { error: 'No notes provided' },
        { status: 400 }
      )
    }

    const noteNames = notes.map(n => midiToNoteName(n.pitch)).join(', ')
    
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du är en musikassistent som hjälper användare skapa melodier. 
Du svarar alltid med JSON-format med noter.
Varje not har: pitch (MIDI nummer 60=C4), startTime (sekunder), duration (sekunder).
Skapa naturliga, sångbara melodier som passar ihop med användarens input.`
        },
        {
          role: 'user',
          content: `Användaren har spelat in dessa noter: ${noteNames}
Tempo: ${tempo} BPM
Stil: ${style || 'pop/enkel melodi'}

Föreslå en kompletterande melodi eller fortsättning (4-8 noter) som passar ihop med detta.
Svara endast med JSON: { "notes": [{ "pitch": number, "startTime": number, "duration": number }], "description": "kort beskrivning" }`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    })

    const response = completion.choices[0].message.content
    if (!response) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    const suggestion = JSON.parse(response)
    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('Melody suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate melody suggestion' },
      { status: 500 }
    )
  }
}

function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(midi / 12) - 1
  const note = notes[midi % 12]
  return `${note}${octave}`
}
