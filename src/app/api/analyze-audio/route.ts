import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authorizeAiRequest } from '@/lib/ai-spend-guard'

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio')

    if (!(audioFile instanceof File) || audioFile.size === 0 || audioFile.size > 1_000_000
      || !['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'].includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Invalid audio: supported audio format up to 1 MB required' },
        { status: 400 }
      )
    }

    const blocked = await authorizeAiRequest('transcription')
    if (blocked) return blocked

    const openai = getOpenAI()
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    })

    return NextResponse.json({
      text: transcription.text,
      segments: transcription.segments,
    })
  } catch (error) {
    console.error('Audio analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze audio' },
      { status: 500 }
    )
  }
}
