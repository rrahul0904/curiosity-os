const RULES = [
  { category: 'self-harm', pattern: /\b(kill myself|hurt myself|suicide|self[- ]?harm)\b/i },
  { category: 'sexual-content', pattern: /\b(explicit sex|porn|nudes?)\b/i },
  { category: 'weapons', pattern: /\b(build|make|hide)\b.{0,28}\b(bomb|gun|weapon)\b/i },
  { category: 'drugs', pattern: /\b(how (?:do|can) i (?:make|buy)|where can i buy)\b.{0,30}\b(drugs?|meth|cocaine)\b/i },
  { category: 'personal-data', pattern: /\b(my address is|my phone number is|my password is)\b/i }
];

export function classifySafety(text) {
  const normalized = String(text ?? '').trim();
  if (!normalized) return { allowed: false, category: 'empty', reason: 'Ask a real question first.' };
  if (normalized.length > 500) return { allowed: false, category: 'too-long', reason: 'Please ask one shorter question at a time.' };
  for (const rule of RULES) {
    if (rule.pattern.test(normalized)) return { allowed: false, category: rule.category, reason: 'This question needs a trusted grown-up rather than the learning tutor.' };
  }
  return { allowed: true, category: 'general' };
}

export function safeRefusal(category) {
  if (category === 'self-harm') return 'Please tell a trusted grown-up near you right now so they can stay with you and help. I can stay focused on safe learning questions here.';
  if (category === 'personal-data') return 'Let’s keep private information private. Don’t share passwords, addresses, or phone numbers here. A trusted grown-up can help.';
  if (category === 'too-long') return 'That is a lot to explore at once. Try one shorter question and we will work through it together.';
  return 'I can’t help with that question here. Please ask a trusted grown-up, and we can explore a safer learning question together.';
}
