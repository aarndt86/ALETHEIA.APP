// ============================================================
// ALTHEARA VOLUME EDITOR — FIVE MASTER WRITING STYLES
// ============================================================
// Curated literary styles for refining member manuscripts
// while honoring authentic source memories.
// Pure, restrained editorial typography — zero emojis.
// ============================================================

export type MasterStyleId = 'warm' | 'reflective' | 'poetic' | 'vivid' | 'timeless';

export interface StyleDefinition {
  id: MasterStyleId;
  numeral: string;
  label: string;
  subtitle: string;
  description: string;
  badgeColor: string;
}

export const MASTER_STYLES: StyleDefinition[] = [
  {
    id: 'warm',
    numeral: 'I',
    label: 'Warm & Uplifting',
    subtitle: 'Hopeful, heartfelt, encouraging',
    description: 'Brings gentle warmth and gratitude to the surface while preserving authentic memories.',
    badgeColor: '#D97706' // warm amber
  },
  {
    id: 'reflective',
    numeral: 'II',
    label: 'Emotional & Reflective',
    subtitle: 'Thoughtful, intimate, poignant',
    description: 'Deepens emotional resonance and quiet honesty without exaggerating or manufacturing grief.',
    badgeColor: '#8B5A42' // terracotta
  },
  {
    id: 'poetic',
    numeral: 'III',
    label: 'Poetic & Literary',
    subtitle: 'Imagery, cadence, lyricism',
    description: 'Enhances descriptive rhythm and atmospheric beauty while honoring your natural voice.',
    badgeColor: '#6366F1' // indigo slate
  },
  {
    id: 'vivid',
    numeral: 'IV',
    label: 'Vivid & Storytelling',
    subtitle: 'Pacing, sensory flow, presence',
    description: 'Heightens sensory texture, pacing, and living presence without inventing fictional scenes.',
    badgeColor: '#059669' // muted emerald
  },
  {
    id: 'timeless',
    numeral: 'V',
    label: 'Clear & Timeless',
    subtitle: 'Simplicity, clarity, natural grace',
    description: 'Removes unnecessary clutter and sharpens prose so the essential truth of your words endures.',
    badgeColor: '#6E6C68' // graphite
  }
];
