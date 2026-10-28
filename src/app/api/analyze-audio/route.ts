import { NextResponse } from 'next/server'

// File size does not bound decoded duration. Keep paid transcription disabled
// even if a legacy environment flag is present, until duration/cost is verified.
export async function POST() {
  return NextResponse.json({ error: 'Audio transcription is unavailable during beta. Local music tools still work.' }, { status: 503 })
}
