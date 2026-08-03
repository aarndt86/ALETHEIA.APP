export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
}

export const STORY_CHAPTERS: Chapter[] = [
  {
    id: 'chap-1',
    title: 'Chapter I: The First Drop',
    paragraphs: [
      "The static never really goes away, it only changes shape. For so long, I believed peace meant the absence of noise, failing to realize that quiet is just another frequency you have to tune into.",
      "I started noticing the specific gravity of small things. How my shoulders sit when I open an email. The way I hold my breath walking into a crowded room. These are not just physical reactions; they are the shape my mind takes when it forgets it has a choice.",
      "To stop fighting the current doesn't mean letting it drown you. It simply means acknowledging the water is there. I am learning to stand in the river without trying to redirect the stream."
    ]
  },
  {
    id: 'chap-2',
    title: 'Chapter II: The Quiet Undertow',
    paragraphs: [
      "There is a tension that pulls at the edges of the day, a constant shifting between the noise of obligation and the desire for stillness. I have noticed how easily my attention fragments when I try to hold too many worlds at once.",
      "Yet, beneath that scattered surface, a deeper pattern is emerging. When I allow myself a single moment of pause before answering the demands of others, the weight shifts. It becomes less about reacting to the storm and more about observing it from a quiet room.",
      "This season seems to be asking me not to solve every problem, but to simply sit with the uncertainty until the water clears. The most profound realization has been that I don't need to organize the chaos to find peace; I only need to stop fighting it."
    ]
  },
  {
    id: 'chap-3',
    title: 'Chapter III: Unfolding',
    paragraphs: [
      "Once you stop trying to control the pieces, you notice they assemble themselves perfectly without you. I realized I was carrying the unsaid expectations of people who weren't even in the room.",
      "Focus is not a beam of light you force onto the dark; focus is the courage to let the peripheral shadows be exactly what they are. You do not have to conquer the shadows.",
      "I close my eyes now and the static is still there, but it is just weather. It passes over the plains without altering the earth beneath it. I am the earth."
    ]
  }
];

// --- Sentence-level splitting ---

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by a space or end of string.
  // Handles: "word. Next", "word? Next", "word; next"
  // Preserves the punctuation with the preceding sentence.
  const raw = text.match(/[^.!?;]+[.!?;]+(?:\s|$)/g);
  if (!raw) return [text];
  return raw.map(s => s.trim()).filter(s => s.length > 0);
}

// Build a flat array of all sentences across all chapters for granular progression
export interface SentenceRef {
  chapterIndex: number;
  paragraphIndex: number;
  sentenceIndex: number;
  text: string;
}

function buildSentenceIndex(): SentenceRef[] {
  const refs: SentenceRef[] = [];
  for (let cIdx = 0; cIdx < STORY_CHAPTERS.length; cIdx++) {
    const chap = STORY_CHAPTERS[cIdx];
    for (let pIdx = 0; pIdx < chap.paragraphs.length; pIdx++) {
      const sentences = splitIntoSentences(chap.paragraphs[pIdx]);
      for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
        refs.push({
          chapterIndex: cIdx,
          paragraphIndex: pIdx,
          sentenceIndex: sIdx,
          text: sentences[sIdx],
        });
      }
    }
  }
  return refs;
}

const ALL_SENTENCES = buildSentenceIndex();

// --- V1.2 Granular Progression ---
// Echo 1: Chapter title + 1 sentence
// Echo 3: 1 additional sentence
// Echo 5: Paragraph one fully readable
// Echo 8: Paragraph two begins
// Echo 12: Half the chapter
// Echo 20+: Entire first chapter; continue into future chapters
//
// Implementation: map echo count → total sentences revealed.
// We use a curve that starts slow (building anticipation) then accelerates.

function getSentencesRevealedForEchoCount(echoCount: number): number {
  if (echoCount <= 0) return 0;
  if (echoCount === 1) return 1;    // Echo 1: 1 sentence
  if (echoCount === 2) return 1;    // Echo 2: still 1 (anticipation)
  if (echoCount === 3) return 2;    // Echo 3: +1 sentence
  if (echoCount === 4) return 3;    // Echo 4: +1
  if (echoCount === 5) return 4;    // Echo 5: ~paragraph one (4 sentences)
  if (echoCount <= 7) return 4 + (echoCount - 5);  // 6→5, 7→6
  if (echoCount <= 12) return 6 + (echoCount - 7);  // 8→7, 9→8... 12→11
  // After 12: roughly 1 sentence per echo
  return 11 + (echoCount - 12);
}

export interface StoryProgressDetailed {
  // Total sentences revealed across all chapters
  totalSentencesRevealed: number;
  // Current chapter being revealed
  currentChapterIndex: number;
  // For the Revelation: which sentences in the current chapter are revealed
  revealedSentences: SentenceRef[];
  // The most recently revealed sentence (today's addition)
  newestSentence: SentenceRef | null;
  // Sentences that exist but are not yet revealed (for blur treatment)
  upcomingSentences: SentenceRef[];
  // For the Story page backward compat
  paragraphsUnlockedInCurrentChapter: number;
}

export function getDetailedStoryProgress(totalEchoCount: number): StoryProgressDetailed {
  const totalRevealed = Math.min(
    getSentencesRevealedForEchoCount(totalEchoCount),
    ALL_SENTENCES.length
  );

  const revealedSentences = ALL_SENTENCES.slice(0, totalRevealed);
  const newestSentence = totalRevealed > 0 ? ALL_SENTENCES[totalRevealed - 1] : null;

  // Current chapter = the chapter containing the newest revealed sentence
  const currentChapterIndex = newestSentence ? newestSentence.chapterIndex : 0;

  // Upcoming sentences in the current chapter (for blur treatment)
  const upcomingSentences = ALL_SENTENCES.filter(
    s => s.chapterIndex === currentChapterIndex && !revealedSentences.includes(s)
  );

  // Backward compat: how many full paragraphs are unlocked in the current chapter
  // A paragraph is "unlocked" when ALL its sentences are revealed
  const currentChap = STORY_CHAPTERS[currentChapterIndex];
  let paragraphsUnlocked = 0;
  for (let pIdx = 0; pIdx < currentChap.paragraphs.length; pIdx++) {
    const pSentences = ALL_SENTENCES.filter(
      s => s.chapterIndex === currentChapterIndex && s.paragraphIndex === pIdx
    );
    const allRevealed = pSentences.every(s => revealedSentences.includes(s));
    if (allRevealed) {
      paragraphsUnlocked = pIdx + 1;
    } else {
      break;
    }
  }

  return {
    totalSentencesRevealed: totalRevealed,
    currentChapterIndex,
    revealedSentences,
    newestSentence,
    upcomingSentences,
    paragraphsUnlockedInCurrentChapter: paragraphsUnlocked,
  };
}

// --- Backward-compatible API for the full Story page ---
// The Story page uses paragraph-level progression (every 3 echoes = 1 paragraph).
// We keep this intact so the full Story page is unchanged.
const ECHOES_PER_PARAGRAPH = 3;

export const getStoryProgress = (totalEchoCount: number) => {
  const totalUnlockedParagraphs = Math.floor(totalEchoCount / ECHOES_PER_PARAGRAPH);

  let paragraphsCounted = 0;
  let currentChapterIndex = 0;
  let paragraphsUnlockedInCurrentChapter = 0;

  for (let i = 0; i < STORY_CHAPTERS.length; i++) {
    const chap = STORY_CHAPTERS[i];
    if (paragraphsCounted + chap.paragraphs.length <= totalUnlockedParagraphs) {
      paragraphsCounted += chap.paragraphs.length;

      if (paragraphsCounted === totalUnlockedParagraphs && i + 1 < STORY_CHAPTERS.length) {
        currentChapterIndex = i + 1;
        paragraphsUnlockedInCurrentChapter = 0;
        break;
      }
    } else {
      currentChapterIndex = i;
      paragraphsUnlockedInCurrentChapter = totalUnlockedParagraphs - paragraphsCounted;
      break;
    }
  }

  if (currentChapterIndex >= STORY_CHAPTERS.length) {
    currentChapterIndex = STORY_CHAPTERS.length - 1;
    paragraphsUnlockedInCurrentChapter = STORY_CHAPTERS[STORY_CHAPTERS.length - 1].paragraphs.length;
  }

  return {
    currentChapterIndex,
    paragraphsUnlockedInCurrentChapter
  };
};

// --- Helper: Get sentence count for a paragraph ---
export function getSentencesForParagraph(chapterIndex: number, paragraphIndex: number): SentenceRef[] {
  return ALL_SENTENCES.filter(
    s => s.chapterIndex === chapterIndex && s.paragraphIndex === paragraphIndex
  );
}

// --- Export for testing ---
export { ALL_SENTENCES, splitIntoSentences };
