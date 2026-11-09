// ============================================================
// ALTHEARA VOLUME EDITOR — FIVE MASTER WRITING STYLES
// ============================================================
// Curated literary styles for refining member manuscripts
// while honoring authentic source memories.
// ============================================================

export type MasterStyleId = 'warm' | 'reflective' | 'poetic' | 'vivid' | 'timeless';

export interface StyleDefinition {
  id: MasterStyleId;
  label: string;
  subtitle: string;
  description: string;
  icon: string;
  badgeColor: string;
}

export const MASTER_STYLES: StyleDefinition[] = [
  {
    id: 'warm',
    label: 'Warm & Uplifting',
    subtitle: 'Hopeful, heartfelt, encouraging',
    description: 'Brings gentle warmth and gratitude to the surface while preserving authentic memories.',
    icon: '☀️',
    badgeColor: '#D97706' // warm amber
  },
  {
    id: 'reflective',
    label: 'Emotional & Reflective',
    subtitle: 'Thoughtful, intimate, poignant',
    description: 'Deepens emotional resonance and quiet honesty without exaggerating or manufacturing grief.',
    icon: '🕯️',
    badgeColor: '#8B5A42' // terracotta
  },
  {
    id: 'poetic',
    label: 'Poetic & Literary',
    subtitle: 'Imagery, cadence, lyricism',
    description: 'Enhances descriptive rhythm and atmospheric beauty while honoring your natural voice.',
    icon: '✒️',
    badgeColor: '#6366F1' // indigo slate
  },
  {
    id: 'vivid',
    label: 'Vivid & Storytelling',
    subtitle: 'Pacing, sensory flow, presence',
    description: 'Heightens sensory texture, pacing, and living presence without inventing fictional scenes.',
    icon: '🌿',
    badgeColor: '#059669' // muted emerald
  },
  {
    id: 'timeless',
    label: 'Clear & Timeless',
    subtitle: 'Simplicity, clarity, natural grace',
    description: 'Removes unnecessary clutter and sharpens prose so the essential truth of your words endures.',
    icon: '⏳',
    badgeColor: '#6E6C68' // graphite
  }
];
