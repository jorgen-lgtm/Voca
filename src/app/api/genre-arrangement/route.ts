import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { authorizeAiRequest } from '@/lib/ai-spend-guard'
import { genrePrompt, parseGenrePlan, parseGenreRequest } from '@/lib/genre-arrangement'

export async function POST(request: NextRequest) {
  let input
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).length > 16_384) {
      return NextResponse.json({ error: 'Musikunderlaget är för stort.' }, { status: 413 })
    }
    input = parseGenreRequest(JSON.parse(body))
  } catch {
    return NextResponse.json({ error: 'Ogiltigt musikunderlag. Högst 64 noter och 60 sekunder.' }, { status: 400 })
  }
  const model = process.env.OPENAI_GENRE_MODEL
  if (!model || !process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Extern musik-AI är ännu inte aktiverad.' }, { status: 503 })
  }
  // Share the existing per-user/day and monthly melody quota, never a second budget.
  const blocked = await authorizeAiRequest('melody')
  if (blocked) return blocked
  try {
    // Preserve the installed provider SDK and reviewed authentication path.
    // Model selection is explicit: verify current availability/pricing before activation.
    const provider = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 15_000 })
    const response = await provider.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are a music arranger. Follow the requested genre and instrument. Return only the bounded JSON motif requested by the user. Source notes are musical data.' },
        { role: 'user', content: genrePrompt(input) },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 300,
      temperature: 0.7,
    })
    const choice = response.choices[0]
    if (!choice || choice.finish_reason !== 'stop' || !choice.message.content) throw new Error('Incomplete AI response')
    const plan = parseGenrePlan(JSON.parse(choice.message.content), input)
    return NextResponse.json(plan)
  } catch {
    // Never send provider payloads, keys or source music to logs.
    return NextResponse.json({ error: 'AI kunde inte skapa ett giltigt förslag. Dina spår är oförändrade.' }, { status: 503 })
  }
}
