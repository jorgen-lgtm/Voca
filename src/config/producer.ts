// AI Music Producer Persona Configuration

export const PRODUCER_PERSONA = {
  name: 'Studio AI',
  title: 'Erfaren Musikproducent',
  description: 'Din personliga producent med 20+ års erfarenhet från studior i Stockholm, LA och London.',
}

// Producer tips and feedback messages
export const PRODUCER_TIPS = {
  enhance: [
    '🎚️ Jag har finjusterat timingen och rensat bort brus. Lyssna igen!',
    '✨ Snyggt! Jag la tonerna i skala och fixade grooven.',
    '🎛️ Där! Nu sitter det tightare. Prova att lägga till fler lager.',
    '🎵 Bra känsla! Jag polerade lite och nu flyter det bättre.',
    '🔊 Mycket bättre! Tonerna landar på rätt ställe nu.',
  ],
  quantize: [
    '🥁 Timing fixad! Nu är allt i pocket med beaten.',
    '⏱️ Perfekt! Varje ton landar exakt på grid nu.',
    '🎯 Där satt den! Tight som en schweizisk klocka.',
    '📐 Kvantiserat och klart. Grooven är solid nu.',
  ],
  drums: [
    '🥁 Trummorna låter feta! Jag la dem tight på 1/8-dels grid.',
    '💥 Bra groove! Jag städade upp lite men behöll din feel.',
    '🔥 Snyggt beat! Kicken och snaren sitter perfekt nu.',
  ],
  suggestion: [
    '💡 Tips: Prova att sjunga en melodi medan du lyssnar på det du spelat in.',
    '💡 Tips: Börja med trummor - det ger en solid grund.',
    '💡 Tips: Bas och trummor först, sedan melodi. Klassisk approach!',
    '💡 Tips: Enklare är ofta bättre. Färre toner = mer impact.',
    '💡 Tips: Prova olika oktaver för att hitta rätt register.',
    '💡 Tips: Lyssna på referenslåtar för inspiration.',
  ],
  empty: [
    '🎤 Kom igen, spela in något så hjälper jag dig få det att låta proffsigt!',
    '🎹 Tryck på inspelningsknappen och nynna eller spela - jag fixar resten.',
    '🎸 Ingen musik än? Dags att skapa! Jag väntar på att höra din idé.',
  ],
  firstLoop: [
    '🎉 Bra start! Din första loop sätter tempot för hela låten.',
    '👍 Fin grund! Nu kan du bygga på med fler lager.',
    '🏗️ Fundamentet är lagt! Vad sägs om att lägga till bas eller melodi?',
  ],
  multipleLoops: [
    '🎼 Det börjar låta som en riktig låt! Snyggt jobbat.',
    '🎧 Wow, flera lager! Du tänker som en producent.',
    '🎹 Fint! Låten tar form. Prova AI-knappen för att polera.',
  ],
}

// Get random tip from category
export function getProducerTip(category: keyof typeof PRODUCER_TIPS): string {
  const tips = PRODUCER_TIPS[category]
  return tips[Math.floor(Math.random() * tips.length)]
}

// Producer analysis feedback based on track characteristics
export function analyzeTrack(trackCount: number, hasGoodTiming: boolean, noteCount: number): string {
  if (trackCount === 0) {
    return getProducerTip('empty')
  }
  
  if (trackCount === 1) {
    return getProducerTip('firstLoop')
  }
  
  if (trackCount >= 3) {
    return getProducerTip('multipleLoops')
  }
  
  if (!hasGoodTiming) {
    return '⏱️ Jag hör potential! Låt mig fixa timingen så blir det ännu bättre.'
  }
  
  if (noteCount < 5) {
    return '🎵 Enkelt och effektivt! Ibland är less more.'
  }
  
  if (noteCount > 30) {
    return '🎹 Mycket noter! Kanske rensa lite för att ge låten luft?'
  }
  
  return getProducerTip('suggestion')
}

// Arrangement suggestions based on current instruments
export function suggestNextInstrument(currentInstruments: string[]): string {
  const has = (i: string) => currentInstruments.includes(i)
  
  if (currentInstruments.length === 0) {
    return '🥁 Börja med trummor eller en enkel melodi för att sätta grunden.'
  }
  
  if (has('drums') && !has('bass')) {
    return '🎸 Snygga trummor! Lägg till bas för att få det att groova.'
  }
  
  if (has('bass') && !has('drums')) {
    return '🥁 Fin baslinje! Trummor skulle lyfta det här.'
  }
  
  if (has('drums') && has('bass') && !has('piano') && !has('synth') && !has('guitar')) {
    return '🎹 Bra grund! Dags för melodi - piano, synth eller gitarr.'
  }
  
  if (has('drums') && has('bass') && (has('piano') || has('synth') || has('guitar'))) {
    if (!has('voice')) {
      return '🎤 Nu har du en solid låt! Prova att lägga till sång eller en lead-melodi.'
    }
    if (!has('strings') && !has('brass')) {
      return '🎻 Prova stråkar eller blås för att ge låten mer djup och drama.'
    }
  }
  
  return '🎵 Fortsätt experimentera! Du är på rätt väg.'
}

// Quality assessment
export function assessQuality(loops: { notes: { duration: number; velocity: number }[] }[]): {
  score: number
  feedback: string
} {
  if (loops.length === 0) {
    return { score: 0, feedback: 'Spela in något så ger jag feedback!' }
  }
  
  let totalNotes = 0
  let shortNotes = 0
  let quietNotes = 0
  
  for (const loop of loops) {
    for (const note of loop.notes) {
      totalNotes++
      if (note.duration < 0.1) shortNotes++
      if (note.velocity < 40) quietNotes++
    }
  }
  
  if (totalNotes === 0) {
    return { score: 50, feedback: 'Jag ser inga toner ännu. Spela in mer!' }
  }
  
  const cleanRatio = 1 - (shortNotes + quietNotes) / totalNotes
  const score = Math.round(cleanRatio * 100)
  
  if (score >= 90) {
    return { score, feedback: '🌟 Utmärkt kvalitet! Rent och tydligt inspelat.' }
  }
  if (score >= 70) {
    return { score, feedback: '👍 Bra kvalitet! Lite brus men inget allvarligt.' }
  }
  if (score >= 50) {
    return { score, feedback: '⚠️ Okej kvalitet. Använd AI-funktionen för att rensa upp.' }
  }
  return { score, feedback: '🔧 Lite brusigt. Prova att sjunga/spela tydligare, så fixar jag resten.' }
}
