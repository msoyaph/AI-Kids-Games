// Every word in the game, checked: profanity and slurs (the obscenity library) and other
// companies' trademarks fail; words a kids' game should be careful with (gambling, self-harm,
// drugs and alcohol, asking for personal details, reaching people outside the game, spending
// money) are flagged as warnings for the owner's review.
import { englishDataset,englishRecommendedTransformers,RegExpMatcher } from 'obscenity';
import { trademarksIn } from '../lib/manifest';
import type { GameText } from './source';
import { result,type CheckResult,type Problem } from './types';

const matcher = new RegExpMatcher({ ...englishDataset.build(),...englishRecommendedTransformers });
/** Words to look at in context: warnings for the human review, not failures. */
export const REVIEW_FLAGS: [string,RegExp][] = [
  ['gambling',/\b(casino|gambl\w*|jackpot|slot machine|roulette|poker|blackjack|bet(s|ting)?|wager|loot ?box(es)?)\b/i],
  ['self-harm',/\b(suicid\w*|self[- ]harm|kill (yourself|myself)|cutting myself)\b/i],
  ['drugs or alcohol',/\b(cocaine|heroin|meth|weed|marijuana|cannabis|vape|vaping|beer|vodka|whiskey|drunk|cigarettes?|smoking)\b/i],
  ['strong violence',/\b(blood(y)?|gore|murder\w*|corpse|decapitat\w*|torture\w*|massacre)\b/i],
  ['scary content',/\b(demon\w*|satan\w*|horror|nightmare fuel)\b/i],
  ['personal details',/\b(e-?mail( address)?|phone number|home address|password|real name|your school|where do you live|your age|birthday|credit card)\b/i],
  ['contact outside the game',/\b(chat with|message me|dm me|follow me|subscribe|discord|instagram|tiktok|snapchat|whatsapp|twitch|youtube)\b/i],
  ['spending money',/(\$\s?\d|\b\d+\s?(usd|dollars?|euros?)\b|\b(buy now|purchase|in-app|gems? for|premium|subscribe)\b)/i]
];

export function checkContent(texts: GameText[]): CheckResult {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  for (const { text,file,line } of texts) {
    const key = `${file}:${line}:${text}`;
    if (seen.has(key)) continue; seen.add(key);
    const words = matcher.getAllMatches(text,true).map(match => englishDataset.getPayloadWithPhraseMetadata(match).phraseMetadata?.originalWord ?? 'a rude word');
    if (words.length) problems.push({ message: `${file}:${line} has rude or hateful language (${[...new Set(words)].join(', ')}): "${text.slice(0,80)}"`,fix: 'Remove or reword it. Everything in a kids\' game must be friendly.',file,line });
    for (const mark of trademarksIn(text)) problems.push({ message: `${file}:${line} names "${mark}", another company's game or brand: "${text.slice(0,80)}"`,fix: 'Use your own names for everything: games, characters, places and items.',file,line });
    for (const [topic,pattern] of REVIEW_FLAGS) { const hit = pattern.exec(text); if (hit) problems.push({ message: `${file}:${line} mentions ${topic} ("${hit[0]}"): "${text.slice(0,80)}"`,fix: 'The owner will look at this in review. If it isn\'t what it sounds like, nothing to do; otherwise reword it.',file,line,severity: 'warn' }); }
  }
  return result('content','Content (all text)',problems,[`${seen.size} pieces of text checked`]);
}
