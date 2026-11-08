// Local, offline text matching over the static HPCL grade catalog — no LLM,
// no API key, no per-query cost. Powers both the directory search box and
// the chat-style grade finder. Scoring is deliberately simple (substring +
// a hand-written keyword->category/condition hint map) since the catalog is
// only ~200 rows; a real search index would be overkill.
import { HPCL_GRADES, RECOMMENDER_CATEGORIES } from './hpclCatalog.js';

export const CATEGORY_LABELS = Object.fromEntries(
  Object.values(RECOMMENDER_CATEGORIES)
    .flat()
    .map((c) => [c.id, c.label])
);

// Everyday words a dealer or plant engineer would actually type, mapped to
// the category/condition/sector ids they imply. Matched as whole-word
// substrings against the query, not against the catalog itself — this is
// the only place synonyms are guessed rather than taken from HPCL's own
// grade names, so it's kept conservative (equipment nouns and standard
// lubrication terms, not invented technical claims).
const KEYWORD_HINTS = [
  { words: ['excavator', 'crane', 'jcb', 'loader', 'earthmover'], categories: ['hydraulic'] },
  { words: ['hydraulic'], categories: ['hydraulic', 'hydraulic-transmission'] },
  { words: ['truck', 'lorry', 'bus', 'commercial vehicle', 'heavy vehicle', 'diesel'], categories: ['commercial-diesel'] },
  { words: ['car', 'sedan', 'hatchback', 'petrol'], categories: ['passenger-petrol'] },
  { words: ['bike', 'scooter', 'motorcycle', 'two wheeler', '2 wheeler', '3 wheeler', 'three wheeler', 'auto rickshaw'], categories: ['two-three-wheeler'] },
  { words: ['tractor', 'farm', 'agriculture', 'agricultural', 'pumpset', 'pump set'], categories: ['tractor-agri'] },
  { words: ['train', 'railway', 'rail', 'marine', 'ship', 'boat', 'vessel'], categories: ['railway-marine'] },
  { words: ['gearbox', 'gear', 'transmission'], categories: ['gearbox', 'hydraulic-transmission'] },
  { words: ['compressor', 'pneumatic'], categories: ['compressor'] },
  { words: ['turbine'], categories: ['turbine'] },
  { words: ['bearing', 'slideway', 'slide way', 'way lube', 'way oil'], categories: ['bearing-slideway'] },
  { words: ['cutting', 'machining', 'metalworking', 'metal working', 'lathe', 'drilling', 'spindle'], categories: ['metalworking', 'metalworking-drawing'] },
  { words: ['heat transfer', 'thermic', 'boiler', 'furnace'], categories: ['heat-transfer'] },
  { words: ['quench', 'quenching', 'heat treatment'], categories: ['heat-treatment-processing'] },
  { words: ['rust', 'corrosion', 'preventive', 'anti rust', 'anti-rust'], categories: ['rust-preventives-special'] },
  { words: ['grease'], sectors: ['greases'] },
  { words: ['cng', 'natural gas', 'gas engine', 'lpg'], conditions: ['low-ash-cng'] },
  { words: ['fire resistant', 'fireproof', 'fire-resistant', 'fire'], conditions: ['fire-resistant'] },
  { words: ['high temperature', 'high temp', 'shock load'], conditions: ['high-temp-shock'] },
  { words: ['extreme pressure', 'heavy load'], conditions: ['extreme-pressure'] },
  { words: ['synthetic', 'eco'], conditions: ['eco-synthetic'] },
  { words: ['food grade', 'textile', 'non staining', 'non-staining'], conditions: ['food-textile-nonstaining'] },
];

// Words too common in this catalog (nearly every name contains "oil") or too
// low-signal ("for", "a") to help rank anything — scored via hints instead,
// or not at all.
const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'of', 'and', 'or', 'oil', 'oils', 'need', 'want', 'looking', 'some', 'my', 'is', 'in']);

function normalize(str) {
  return str.toLowerCase().trim();
}

function tokenize(str) {
  return str.split(/[^a-z0-9]+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function scoreGrade(grade, tokens, hints) {
  const name = grade.name.toLowerCase();
  const group = grade.group.toLowerCase();
  let score = 0;

  for (const t of tokens) {
    if (name.includes(t)) score += 3;
    if (group.includes(t)) score += 1;
  }

  for (const hint of hints) {
    const catHit = hint.categories?.some((c) => grade.categories.includes(c));
    const condHit = hint.conditions?.some((c) => grade.conditions.includes(c));
    // A named product type ("grease") is a stronger, more direct signal
    // than an application context ("bearing", "truck") — weighted higher
    // so it isn't lost to ties against an unrelated category hint that
    // happens to match more items.
    const sectorHit = hint.sectors?.includes(grade.sector);
    if (catHit) score += 4;
    if (condHit) score += 4;
    if (sectorHit) score += 6;
  }

  return score;
}

// Returns up to `limit` grades ranked by relevance to free-text `query`.
// Used by the chatbot (broad natural-language input) and, with a plain
// substring query, by the directory search box.
export function searchGrades(query, { limit = 6 } = {}) {
  const q = normalize(query);
  if (!q) return [];

  const tokens = tokenize(q);
  const hints = KEYWORD_HINTS.filter((hint) => hint.words.some((w) => q.includes(w)));

  const scored = HPCL_GRADES.map((grade) => ({ grade, score: scoreGrade(grade, tokens, hints) })).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.grade);
}
