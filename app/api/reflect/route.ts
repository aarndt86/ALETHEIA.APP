import { NextResponse } from 'next/server';

type EmotionalState = 'calm' | 'heavy' | 'anxious' | 'content' | 'unsettled' | 'drifting' | 'grounded' | 'searching';

interface ReflectionRequest {
  text: string;
  state?: EmotionalState;
}

const REFLECTIONS: Record<EmotionalState, string[]> = {
  calm: [
    "Your words carry a quiet stillness today, moving at a deliberate and measured pace. There is no immediate rush in how you describe these passing moments, only a gentle presence.\n\nIt seems the surrounding noise has faded, leaving behind only the elements that actually matter. The clarity emerging in this particular space is entirely yours, untouched by outside demands.\n\nCarry this steady quiet with you into the next hour. Let it settle deeply into the space you occupy, knowing it remains available whenever you choose to return.",
    "A distinct and undeniable peace is woven through the thoughts you have shared. You are simply observing the present as it unfolds, without any urge to change its shape.\n\nThis stillness feels deeply earned, resembling a long breath taken after an extended pause. You are standing on solid earth, recognizing the subtle equilibrium of this exact moment.\n\nHold onto this steadiness as the day continues. It will wait for you patiently, ready to offer a quiet retreat when you need it again."
  ],
  heavy: [
    "A profound quiet weight sits firmly beneath these words. The undeniable burden you are describing is palpable, demanding a vast amount of invisible effort just to sustain.\n\nYou are carrying significantly more than is visible to others, holding it almost entirely on your own. It takes immense strength simply to name this reality without looking away.\n\nLeave this particular weight right here for now. You do not have to carry every single piece of it forward into whatever tomorrow might bring.",
    "There is a deep, lingering exhaustion woven directly into this reflection. The things you describe navigating have continually demanded an extraordinary toll on your internal reserves.\n\nIt is clear exactly how much hidden energy simply enduring has required of you lately. Acknowledging this profound fatigue is a quiet act of uncompromising honesty with yourself.\n\nRest wherever you possibly can in the coming hours. The persistent expectation to keep moving forward can quietly wait while you gather your remaining strength."
  ],
  anxious: [
    "The pace of your thoughts feels intensely hurried, pulling your attention in several directions at once. There is a taut tension vibrating through everything you are experiencing.\n\nYou are heavily anticipating what has not yet arrived, holding the unknown entirely too tightly. It is deeply exhausting to continually brace for every single possibility on the horizon.\n\nLet the immediate, quiet moment be enough for now. The rest of the uncertainties can slowly unfold on their own time, without your constant vigilance.",
    "A restless, moving current surges beneath what you have shared today. You are attempting to hold many disparate threads, working tirelessly to keep them from hopelessly tangling together.\n\nThe internal pressure to resolve absolutely everything at once is heavy, drastically narrowing your view to the immediate urgency. This lingering tension speaks very loudly.\n\nLoosen your grip just slightly on the things you cannot control. Not every single thread requires your immediate, undivided attention to remain completely intact."
  ],
  content: [
    "A gentle, quiet satisfaction rests deeply within these lines. The precise details you noticed today carry a subtle warmth that quietly anchors the mind.\n\nYou are deeply present in a space that asks absolutely nothing more of you than to simply be. There is a profound, undeniable sufficiency radiating from this particular moment.\n\nLet this quiet satisfaction linger as long as it naturally wants to. It is beautifully and completely enough, exactly as it exists right now.",
    "These words reflect a quiet, steady appreciation for the immediate present. The internal landscape you describe today is incredibly soft, inviting, and deeply forgiving.\n\nYou are clearly recognizing the quiet goodness that exists entirely without fanfare or grand gestures. Possessing this specific clarity is a rare, quiet gift that often goes entirely unnoticed by others.\n\nKeep this simple noticing alive today. Carry this gentle, uncomplicated perspective forward into the hours ahead, letting it shape how you see."
  ],
  unsettled: [
    "There is a lingering, quiet dissonance in what you shared. Things simply do not quite fit together in the usual, familiar way you have come to expect.\n\nYou are currently standing in a space of shifting transition, where the previously familiar feels slightly out of reach. This specific discomfort is a deeply natural companion here.\n\nAllow the dust to remain suspended in the air for a while. You do not have to force anything to definitively settle today.",
    "A quiet, persistent friction hums continuously through these thoughts. The defining edges of everything around you currently feel considerably sharper and less forgiving than usual.\n\nYou are carefully navigating a profound sense of unease, acutely noticing the subtle shifts occurring just beneath the surface. This hyper-awareness is exceptionally sharp and precise.\n\nSit quietly with this exact friction for a little longer. The necessary clarity will eventually arrive entirely on its own when the timing is exactly right."
  ],
  drifting: [
    "Your words wander quietly and aimlessly across the page. There is a profound sense of moving forward without a definitive destination securely in mind.\n\nYou are simply observing the landscape passing by, comfortably untethered from immediate external demands or pressures. This particular lack of a secure anchor offers a quiet kind of unburdened freedom.\n\nLet the gentle drifting continue for a bit. The correct direction will naturally reveal itself exactly when it is finally needed.",
    "A soft mist seems to rest lightly over these thoughts. Things remain highly fluid, lacking a distinct shape or any firmly established internal boundaries.\n\nYou are simply floating through these passing moments, neither grasping tightly nor deliberately pushing anything away. There is a quiet, undeniable grace in this temporary suspension.\n\nRest easily in the completely undefined spaces. You definitely do not need a reliable map for this particular kind of quiet, internal terrain."
  ],
  grounded: [
    "There is a remarkably deep root directly beneath these words. The absolute clarity present in your current perspective is entirely unwavering and incredibly strong.\n\nYou are standing firmly within your own unique experience, knowing exactly where your personal boundaries begin and end. This solid foundation is undeniably and completely yours.\n\nWalk forward with this profound certainty. It serves as a quiet, unshakeable anchor in what is often a chaotic and rapidly moving external world.",
    "A highly deliberate presence powerfully shapes this reflection. You are clearly speaking from a place of a quiet, assured foundation that you have built yourself.\n\nYou have successfully located a steady center of gravity amidst the surrounding noise, choosing your stance with absolute intention. The quiet authority residing here is unmistakably clear.\n\nTrust completely in this secure footing. It is undeniably strong enough to securely hold whatever ultimately comes next in your path."
  ],
  searching: [
    "There is a quiet, persistent reaching clearly visible within these thoughts. You are deliberately looking for a recognizable shape hidden somewhere in the deep shadows.\n\nYou are asking fundamental questions that do not yet have clear answers, turning things over with deliberate and patient care. The seeking itself is incredibly profound.\n\nLet these important questions breathe a little. The necessary answers will arrive quietly, completely in their own unhurried season, when you are ready.",
    "A gentle, persistent curiosity profoundly drives what you have shared today. You are carefully turning over stones, intensely looking for meaning hidden just beneath.\n\nYou are actively exploring the outer edges of what you currently understand, standing bravely at the absolute boundary of the known. This quiet exploration requires immense patience.\n\nKeep looking closely at what is there. The profound act of seeking is often just as vital as the final discovery itself."
  ]
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
