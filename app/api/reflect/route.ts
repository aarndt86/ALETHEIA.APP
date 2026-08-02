interface ReflectRequest {
  echo: string;
  emotionalState: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getWordCount = (text: string) => text.split(/\s+/).filter(word => word.length > 0).length;

// Mock reflections mapped to the app's actual emotional states.
// Each follows the 3-paragraph structure: Mirror → Notice → Carry Forward.
// Tone: calm, observant, grounded, warm, precise, human. Never therapeutic, motivational, or diagnostic.
const REFLECTIONS: Record<string, string[]> = {
  calm: [
    "There is a stillness in what you have written, a kind of quiet that does not need to be filled. You seem to be standing in a clearing, aware of the space around you without needing to name every tree.\n\nWhat seems to be underneath this calm is not the absence of complexity but perhaps a temporary truce with it. There may be things still moving beneath the surface that you have chosen, for now, not to chase.\n\nYou might notice whether this quiet follows you into the rest of your day, or whether it belongs only to this moment.",

    "You are describing something that many people rush past without noticing. The fact that you paused long enough to name it suggests this stillness is not accidental but something you have been quietly building toward.\n\nThere may be a tension between wanting to stay in this space and knowing the noise will return. It sounds like you are holding both of those truths at once without forcing a resolution.\n\nWhat changes when you stop trying to extend the calm and simply let it be the size it already is?"
  ],
  heavy: [
    "You are carrying something that has weight to it, and the way you have described it makes that weight feel specific rather than abstract. This is not a vague heaviness. It belongs to something real.\n\nThere may be an expectation underneath this, a belief that you should have set this burden down by now or that carrying it says something about your ability to move forward. It sounds like the weight has been compounding quietly.\n\nYou do not need to put it down all at once. It may be enough to notice exactly where you feel it today.",

    "What you have written suggests a kind of accumulated pressure, something that has been building rather than arriving suddenly. You seem aware of it in a way that is honest rather than dramatic.\n\nIt sounds like part of this heaviness comes from holding things that may not entirely belong to you. There may be expectations or responsibilities that were never explicitly yours but settled on you anyway.\n\nIt may be worth asking which pieces of this weight you actually chose to carry and which simply arrived."
  ],
  anxious: [
    "The restlessness you are describing has a specific texture to it. It is not just general unease but something with edges, something that seems to be pulling your attention in a direction you have not fully identified yet.\n\nThere may be a gap between what you know and what you are afraid of knowing. It sounds like part of the anxiety comes from the space between those two points rather than from either one alone.\n\nNotice whether the feeling shifts when you stop asking it to explain itself and simply let it sit where it is.",

    "You seem to be moving through something that keeps circling back, a thought or a feeling that refuses to resolve into a single clear shape. The energy of it is real, even if its source remains slightly out of focus.\n\nWhat seems to be underneath this is not fear exactly but a heightened alertness, as though something important is trying to get your attention before you are ready to hear it.\n\nYou may want to notice when the restlessness quiets, even briefly, and what you were doing in that moment."
  ],
  content: [
    "There is a groundedness in what you have written that does not seem performative. You are not claiming everything is perfect. You are simply noting that right now, in this specific moment, something feels settled.\n\nIt sounds like this contentment arrived not because a problem was solved but because something shifted in how you are holding the problem. There may be a quiet acceptance here that was harder won than it appears.\n\nWhat would it mean to trust this feeling without needing to protect it from what comes next?",

    "You seem to be in a rare moment of alignment, where what you are doing and what you want to be doing are not at war with each other. That is worth noticing because it does not happen by accident.\n\nThere may be something underneath this ease that you built without realizing it, a small decision or a boundary that is now paying quiet dividends. It sounds like the ground beneath you has been steadying for longer than today.\n\nYou do not need to name why this moment feels right. It may be enough to notice that it does."
  ],
  unsettled: [
    "Something is slightly off, and you seem to know it without being able to locate it precisely. That kind of low-frequency discomfort is often harder to sit with than obvious distress because it offers no clear target.\n\nThere may be a mismatch between where you are and where you expected to be, not a dramatic one but enough to create a persistent sense of friction. It sounds like you are noticing the gap more than usual.\n\nIt may not need solving today. Sometimes the most useful thing is simply to name the feeling as real without demanding that it explain itself.",

    "You are describing a kind of quiet displacement, as though the ground has shifted just enough to make your footing uncertain without actually knocking you over. The unease is subtle but present.\n\nIt sounds like this feeling may be connected to something you have been postponing or avoiding, not out of fear but simply because the timing has not felt right. There may be a conversation or a decision quietly waiting.\n\nWhat would happen if you gave yourself permission to be unsettled without treating it as a problem to fix?"
  ],
  drifting: [
    "There is a particular kind of honesty in admitting that you feel untethered. You are not panicking about it. You are simply noticing that the usual anchors are not pulling as strongly as they normally do.\n\nThere may be a season of letting go happening beneath this feeling, something you have outgrown or something that is outgrowing you. It sounds like the drift is not aimless so much as directionless.\n\nYou may want to notice what you reach for when the drift becomes uncomfortable. That reflex often reveals what still matters.",

    "You seem to be floating between things rather than moving toward any one of them. The drift you are describing does not sound chaotic. It sounds like a space between chapters, where the last sentence has ended but the next has not yet begun.\n\nIt sounds like part of this is simply the absence of urgency, and you may not be entirely sure whether that absence is freedom or loss. Both can feel the same from the inside.\n\nWhat is one thing that still feels solid, even if everything else is shifting?"
  ],
  grounded: [
    "You are writing from a place that feels rooted, not rigid but steady. There is a difference between being stuck and being planted, and what you have described sounds like the latter.\n\nThere may be something you have recently clarified for yourself, a boundary or a priority that has brought this sense of stability. It sounds like the ground you are standing on was not always this firm.\n\nNotice what it cost you to arrive here. That awareness is often what keeps the ground solid.",

    "What comes through in your words is a sense of presence, an awareness of where you are without urgency to be elsewhere. You seem to be occupying your own life more fully than usual.\n\nIt sounds like this groundedness is not the result of having fewer problems but of relating to them differently. There may be a steadiness here that has been building quietly, one small choice at a time.\n\nWhat would it look like to carry this same steadiness into a moment that usually unsettles you?"
  ],
  searching: [
    "You are looking for something, and the looking itself seems to be as much the point as finding it. There is an openness in what you have written that suggests you are not chasing an answer so much as making space for one to arrive.\n\nThere may be an assumption underneath this search, a belief that the right direction should feel obvious or that clarity should have come by now. It sounds like you are being harder on yourself for not knowing than the situation requires.\n\nYou do not need to find it today. It may be enough to notice what questions keep returning.",

    "The search you are describing does not sound frantic. It sounds deliberate, like someone turning over stones carefully rather than tearing up the ground. You seem to know that whatever you are looking for will not be found through force.\n\nIt sounds like part of this restlessness comes from a deepening awareness that something in your life is ready to change, even if the shape of that change has not revealed itself yet.\n\nWhat would it mean to trust the search itself as evidence that you are already moving in the right direction?"
  ],
};

// Fallback for any state not in the map
const FALLBACK_REFLECTIONS = [
  "You have brought something into the open that was sitting quietly, and the act of writing it seems to have given it a shape it did not have before. That is not a small thing.\n\nThere may be a thread running through what you have described, a pattern or a tension that has been present longer than today. It sounds like you are beginning to see it more clearly.\n\nYou do not need to resolve it now. It may be enough to notice that you chose to look at it honestly.",

  "What you have written carries a weight that is specific to you, and the way you have expressed it suggests you are paying closer attention to your inner life than you may give yourself credit for.\n\nIt sounds like something is shifting, perhaps gradually, perhaps in ways that are difficult to articulate. There may be a growing awareness of what you need that has not yet translated into action.\n\nWhat is one thing you noticed today that you might have overlooked a month ago?"
];

function selectReflection(emotionalState: string): string {
  const key = emotionalState.toLowerCase();
  const pool = REFLECTIONS[key] || FALLBACK_REFLECTIONS;
  // Simple random selection from the pool
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(request: Request) {
  try {
    const body: ReflectRequest = await request.json();

    if (!body.echo || !body.emotionalState) {
      return Response.json(
        { error: 'Missing echo or emotionalState' },
        { status: 400 }
      );
    }

    // Simulate generation delay of 800-1500ms
    const delay = Math.floor(Math.random() * (1500 - 800 + 1)) + 800;
    await sleep(delay);

    const reflection = selectReflection(body.emotionalState);
    const wordCount = getWordCount(reflection);

    return Response.json({
      reflection,
      wordCount,
      generationTimeMs: delay
    }, { status: 200 });

  } catch {
    return Response.json(
      { error: 'Internal server error processing reflection' },
      { status: 500 }
    );
  }
}
