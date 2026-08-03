export interface InsightQuestion {
  id: string;
  category: 'family' | 'childhood' | 'values' | 'relationships' | 'identity' | 'career' | 'legacy' | 'beliefs' | 'places' | 'purpose';
  question: string;
}

export interface InsightAnswer {
  questionId: string;
  answer: string;
  answeredAt: string;
}

const QUESTIONS: InsightQuestion[] = [
  { id: 'q_1', category: 'family', question: 'Who first taught you what kindness looked like?' },
  { id: 'q_2', category: 'places', question: 'What place has always felt like home?' },
  { id: 'q_3', category: 'values', question: 'What lesson took you years to understand?' },
  { id: 'q_4', category: 'family', question: 'What family tradition do you hope never disappears?' },
  { id: 'q_5', category: 'identity', question: 'What moment changed the direction of your life?' },
  { id: 'q_6', category: 'legacy', question: 'What do you hope future generations understand about you?' },
  { id: 'q_7', category: 'childhood', question: 'What is the earliest memory that still shapes how you see the world?' },
  { id: 'q_8', category: 'relationships', question: 'Who do you think of when you hear the word "safety"?' },
  { id: 'q_9', category: 'identity', question: 'What have you outgrown that once defined you?' },
  { id: 'q_10', category: 'purpose', question: 'What do you want your life to say when the pages are all written?' },
  { id: 'q_11', category: 'childhood', question: 'What belief did you hold as a child that you still carry?' },
  { id: 'q_12', category: 'career', question: 'What work have you done that felt like it mattered beyond yourself?' },
  { id: 'q_13', category: 'relationships', question: 'What relationship taught you the most about who you are?' },
  { id: 'q_14', category: 'values', question: 'What value do you hold that you would never compromise?' },
  { id: 'q_15', category: 'beliefs', question: 'What is one thing you believe that most people around you do not?' },
  { id: 'q_16', category: 'places', question: 'Where do you go in your mind when you need to feel calm?' },
  { id: 'q_17', category: 'purpose', question: 'What dream have you quietly kept alive despite everything?' },
  { id: 'q_18', category: 'identity', question: 'What loss shaped you more than any success?' },
  { id: 'q_19', category: 'childhood', question: 'What do you wish you could tell your younger self?' },
  { id: 'q_20', category: 'relationships', question: 'Who in your life sees you most clearly?' },
  { id: 'q_21', category: 'beliefs', question: 'What truth took you the longest to accept?' },
  { id: 'q_22', category: 'legacy', question: 'What is the most meaningful thing you have ever created?' }
];

export function getNextInsight(completedInsightIds: string[]): InsightQuestion | null {
  const completedSet = new Set(completedInsightIds);
  const remainingQuestions = QUESTIONS.filter(q => !completedSet.has(q.id));
  
  if (remainingQuestions.length === 0) {
    return null;
  }
  
  return remainingQuestions[0];
}

const STORAGE_KEY = 'kairo_insights';

export function loadInsightAnswers(): InsightAnswer[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveInsightAnswer(answer: InsightAnswer): void {
  if (typeof window === 'undefined') return;
  const answers = loadInsightAnswers();
  answers.push(answer);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  } catch (e) {
    console.error('Failed to save insight answer', e);
  }
}

export function getCompletedInsightIds(): string[] {
  return loadInsightAnswers().map(a => a.questionId);
}
