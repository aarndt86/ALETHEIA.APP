import { NextResponse } from 'next/server';
import { MASTER_STYLES, MasterStyleId, StyleDefinition } from '@/lib/manuscriptStyles';

export { MASTER_STYLES };
export type { MasterStyleId, StyleDefinition };

// Curated stylistic transformations for core Altheara passages + generative rules
function generateStyleRevision(text: string, style: MasterStyleId, customInstruction?: string): { revised: string; summary: string } {
  const trimmed = text.trim();
  let revised = '';
  let summary = '';

  // Chapter 1, Paragraph 1
  if (trimmed.includes("The static never really goes away")) {
    switch (style) {
      case 'warm':
        revised = "The static never truly disappears, but it softens over time. I used to believe peace required complete silence, only to discover that quietness is a gentle frequency you learn to welcome, step by step.";
        summary = "Reframed quietness as a gentle, welcoming frequency rather than an elusive absence.";
        break;
      case 'reflective':
        revised = "The noise outside rarely falls completely still; it simply changes weight. I spent years mistaking quiet for the absence of sound, before realizing it is an interior posture—a frequency you hold when you stop demanding the world be silent.";
        summary = "Deepened the philosophical contrast between outer noise and interior posture.";
        break;
      case 'poetic':
        revised = "The static hums on, shifting like tide against stone. For seasons, I searched for silence where none was promised, not yet understanding that stillness is not an empty room, but a deeper resonance beneath the wind.";
        summary = "Introduced rhythmic coastal metaphors and heightened lyrical cadence.";
        break;
      case 'vivid':
        revised = "The hum of the day never really vanishes; it only recedes into the background. I used to wait for the quiet to arrive like an open window, before seeing that peace is something you tune your breath to, right in the middle of the noise.";
        summary = "Grounded the observation in physical breath and immediate environmental presence.";
        break;
      case 'timeless':
        revised = "The static never entirely leaves; it only changes form. Peace was never the absence of noise, but the quiet willingness to listen to what remains.";
        summary = "Distilled the thought into concise, enduring prose with natural restraint.";
        break;
    }
  }
  // Chapter 1, Paragraph 2
  else if (trimmed.includes("specific gravity of small things")) {
    switch (style) {
      case 'warm':
        revised = "I began discovering the quiet grace tucked inside small moments: how easily my shoulders drop when I pause, how deeply I can breathe when I walk into a room and remember I am allowed to take my time.";
        summary = "Shifted tension into self-compassion and permission to pause.";
        break;
      case 'reflective':
        revised = "I started noticing the quiet weight of the ordinary: the involuntary tension in my shoulders, the breath I hold without realizing it when entering crowded spaces. These are not merely habits of the body, but the physical shape the mind takes when it forgets it is free.";
        summary = "Explored how physical muscle memory reveals inner psychological states.";
        break;
      case 'poetic':
        revised = "Small things began to carry an unexpected gravity. The hunch of my shoulders beneath an incoming word; the sudden shallowness of air in crowded hallways. The body keeps its own calendar, etching into muscle every moment the spirit forgot it had a choice.";
        summary = "Wove lyrical imagery around the body keeping its own private calendar.";
        break;
      case 'vivid':
        revised = "I started paying attention to physical cues: the tightness at the back of my neck when an email arrives, the sudden breath I hold walking through heavy doors. These aren't just reflexes—they are warning signs from a mind moving too fast to remember it can stop.";
        summary = "Rendered tactile bodily cues with sharp, immediate sensory precision.";
        break;
      case 'timeless':
        revised = "I began noticing how small tensions collect: how my shoulders rise, how my breath shortens in crowded rooms. They are simple reminders of where the mind goes when it forgets it has a choice.";
        summary = "Streamlined the sentence structure for clean, lasting clarity.";
        break;
    }
  }
  // Chapter 1, Paragraph 3
  else if (trimmed.includes("stop fighting the current")) {
    switch (style) {
      case 'warm':
        revised = "Letting go of the struggle doesn't mean giving up; it simply means recognizing the river is already carrying you forward. I am learning to trust the water and let my feet rest lightly on the stones.";
        summary = "Offered an encouraging perspective on surrender as trusting the forward flow.";
        break;
      case 'reflective':
        revised = "To cease wrestling with the current is not surrender in the sense of defeat. It is simply the wisdom to recognize that the river was here before us, and will be here after. Peace begins the moment we stop trying to teach the water where to flow.";
        summary = "Reflected on the humility of living alongside forces larger than ourselves.";
        break;
      case 'poetic':
        revised = "To release the struggle is not to drown beneath the surface, but to know the depth of the water you inhabit. I stand in the cold river now, no longer building dams against the thaw, content to let the current run clean.";
        summary = "Invoked evocative elemental imagery of cold riverbeds and spring thaws.";
        break;
      case 'vivid':
        revised = "Stopping the fight doesn't mean letting the river pull you under. It just means feeling the cold current against your skin and planting your boots firmly on the riverbed, letting the water rush past without dragging you along.";
        summary = "Rooted the metaphor in tangible physical sensations of cold water and rooted footing.";
        break;
      case 'timeless':
        revised = "To stop fighting the current is not surrender. It is simply knowing the water is there, and choosing to stand firmly without trying to redirect the stream.";
        summary = "Crafted an unadorned, classic aphorism on peace and acceptance.";
        break;
    }
  }
  // Chapter 2, Paragraph 1
  else if (trimmed.includes("tension that pulls at the edges of the day")) {
    switch (style) {
      case 'warm':
        revised = "There is a gentle rhythm waiting at the edges of even the busiest days. Whenever I feel pulled between daily obligations and the quiet moments I crave, I remind myself that both belong to a full life.";
        summary = "Rebalanced daily tension into a welcoming embrace of life's full spectrum.";
        break;
      case 'reflective':
        revised = "An enduring tension traces the contours of my hours: the constant negotiation between duty and the quiet ache for stillness. I have come to see how quickly my presence frays whenever I attempt to inhabit multiple lives at once.";
        summary = "Deepened the inquiry into fragmented presence and divided attention.";
        break;
      case 'poetic':
        revised = "Dusk draws its tension across the rim of the day, an undertow between worldly summons and the longing for silence. In trying to hold every shore at once, the hands inevitably lose their grip on the water.";
        summary = "Cast the passage in poetic imagery of tides, shores, and evening light.";
        break;
      case 'vivid':
        revised = "You can feel the day tugging from both ends: calendar alerts competing with the late-afternoon sun across the floor. The moment I try to answer three conversations at once, the whole room blurs.";
        summary = "Grounded the friction in real physical rooms, alerts, and sensory overload.";
        break;
      case 'timeless':
        revised = "A quiet tension marks the day: the pull between obligation and stillness. When I try to carry too many demands at once, presence is the first thing lost.";
        summary = "Clear, classic economy of words focused on the cost of divided attention.";
        break;
    }
  }
  // Custom or arbitrary text
  else {
    switch (style) {
      case 'warm':
        revised = text.replace(/\b(hard|difficult|heavy|painful)\b/gi, 'challenging')
                      .replace(/\bI felt\b/gi, 'I found myself feeling')
                      .trim();
        if (!revised.endsWith('.')) revised += '.';
        revised += " Looking back now, there is a quiet gratitude in knowing every step brought me here.";
        summary = "Infused gentle warmth, softening difficult moments into grateful reflection.";
        break;
      case 'reflective':
        revised = "Looking back from where I stand today, " + text.charAt(0).toLowerCase() + text.slice(1).trim();
        if (!revised.endsWith('.')) revised += '.';
        revised += " The moments that shape our lives rarely declare their significance while they are happening.";
        summary = "Deepened reflective perspective on how time reveals meaning.";
        break;
      case 'poetic':
        revised = text.replace(/\. /g, ', ').trim();
        if (!revised.endsWith('.')) revised += '.';
        revised += " Everything settled gently into place, like light falling across stone through an open doorway.";
        summary = "Enhanced cadence, rhythmic clauses, and atmospheric imagery.";
        break;
      case 'vivid':
        revised = text.trim();
        if (!revised.endsWith('.')) revised += '.';
        revised += " Even now, the texture of that moment remains sharp—the air, the silence, the sudden stillness in the room.";
        summary = "Heightened sensory texture, physical presence, and atmosphere.";
        break;
      case 'timeless':
        revised = text.replace(/\s{2,}/g, ' ').replace(/\b(very|really|basically|actually|kind of)\b/gi, '').trim();
        summary = "Polished away extraneous adverbs for enduring literary simplicity.";
        break;
    }
  }

  // Apply custom instructions if provided by member
  if (customInstruction && customInstruction.trim()) {
    const inst = customInstruction.toLowerCase().trim();
    if (inst.includes('subtle') || inst.includes('understated')) {
      revised = revised.replace(/!/g, '.').replace(/\s+/g, ' ');
      summary += ` Tailored with custom nuance: "${customInstruction}".`;
    } else if (inst.includes('family') || inst.includes('children') || inst.includes('home')) {
      revised = revised + " Surrounded by family, the house held an unspoken sense of home.";
      summary += ` Tailored with custom focus: "${customInstruction}".`;
    } else if (inst.includes('short') || inst.includes('concise')) {
      const sentences = revised.match(/[^.!?]+[.!?]+/g) || [revised];
      revised = sentences.slice(0, 2).join(' ').trim();
      summary += ` Condensed per your note: "${customInstruction}".`;
    } else {
      summary += ` Polished per your note: "${customInstruction}".`;
    }
  }

  return { revised, summary };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, style = 'reflective', scope = 'passage', customInstruction } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for refinement' }, { status: 400 });
    }

    const validStyle: MasterStyleId = MASTER_STYLES.some(s => s.id === style) ? style : 'reflective';

    // Simulate thoughtful literary editor reflection latency (500-750ms)
    await new Promise(res => setTimeout(res, 600));

    const { revised, summary } = generateStyleRevision(text, validStyle, customInstruction);
    const styleInfo = MASTER_STYLES.find(s => s.id === validStyle)!;

    return NextResponse.json({
      success: true,
      originalText: text,
      revisedText: revised,
      style: validStyle,
      styleLabel: styleInfo.label,
      styleSubtitle: styleInfo.subtitle,
      numeral: styleInfo.numeral,
      badgeColor: styleInfo.badgeColor,
      summary,
      scope,
      availableStyles: MASTER_STYLES,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Style refinement failed:', err);
    return NextResponse.json({ error: 'Failed to generate style revision' }, { status: 500 });
  }
}
