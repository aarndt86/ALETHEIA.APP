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

// Progression algorithm: Every 3 Echoes unlocks precisely 1 paragraph.
// So 9 echoes = 3 paragraphs (1 full chapter).
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
      
      // If we perfectly unlocked this chapter, we technically start the next chapter at 0
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

  // Cap at maximum content length
  if (currentChapterIndex >= STORY_CHAPTERS.length) {
    currentChapterIndex = STORY_CHAPTERS.length - 1;
    paragraphsUnlockedInCurrentChapter = STORY_CHAPTERS[STORY_CHAPTERS.length - 1].paragraphs.length;
  }

  return {
    currentChapterIndex,
    paragraphsUnlockedInCurrentChapter
  };
};
