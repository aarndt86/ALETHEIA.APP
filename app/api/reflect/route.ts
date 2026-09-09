import { NextResponse } from 'next/server';

type EmotionalState = 'calm' | 'heavy' | 'anxious' | 'content' | 'unsettled' | 'drifting' | 'grounded' | 'searching';

interface ReflectionRequest {
  text: string;
  state?: EmotionalState;
}

// ============================================================
// ALTHEARA REFLECTION CONTRACT
// ============================================================
// Target: 15–25 words. Hard max: 30 words.
// ONE meaningful observation. Not advice, not diagnosis.
// Altheara notices. It does not declare truth.
//
// ReflectionOutput {
//   text: string
//   targetWords: 15–25
//   maxWords: 30
// }
//
// The future backend (Yuri) should enforce the same contract.
// ============================================================

const REFLECTIONS: Record<EmotionalState, string[]> = {
  calm: [
    "A quiet steadiness holds your words today. You are simply here, and that is its own kind of clarity.",
    "There is an unusual stillness in what you shared. The noise has faded, and only what matters remains.",
  ],
  heavy: [
    "You are carrying more than anyone sees. Naming it honestly is its own quiet act of courage.",
    "The weight beneath these words is real. You do not have to carry every piece of it forward.",
  ],
  anxious: [
    "Your thoughts are reaching in several directions at once. The unknown is asking a lot of you right now.",
    "A restless current runs beneath what you shared. Not every thread needs your attention at once.",
  ],
  content: [
    "A quiet warmth lives in these words. You noticed something good, and you let it stay.",
    "You are present in a way that asks nothing more of you. That kind of sufficiency is rare.",
  ],
  unsettled: [
    "Something doesn't quite fit the way it used to. That discomfort often arrives just before clarity does.",
    "A quiet friction hums through your words. You are noticing shifts others might miss entirely.",
  ],
  drifting: [
    "Your thoughts move without a fixed destination. There is a quiet freedom in not needing one yet.",
    "A soft openness holds these words. You are floating between things, and that is its own kind of honesty.",
  ],
  grounded: [
    "There is a deep root beneath what you shared. You know exactly where you stand right now.",
    "A deliberate presence shapes these words. You are speaking from a foundation you built yourself.",
  ],
  searching: [
    "You are turning something over carefully, looking for a shape in the shadows. The seeking itself matters.",
    "A quiet curiosity drives what you shared. You are standing at the edge of what you know, looking further.",
  ],
};

export async function POST(request: Request) {
  try {
    const body: ReflectionRequest = await request.json();
    
    // Default to 'calm' if no state is provided or if it's invalid
    const state = (body.state && REFLECTIONS[body.state]) ? body.state : 'calm';
    
    const variations = REFLECTIONS[state];
    const selectedReflection = variations[Math.floor(Math.random() * variations.length)];

    // Mock delay 800-1500ms
    const delay = Math.floor(Math.random() * 700) + 800;
    await new Promise(resolve => setTimeout(resolve, delay));

    return NextResponse.json({ reflection: selectedReflection });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate reflection' },
      { status: 500 }
    );
  }
}
