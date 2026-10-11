// Villager dialogue for Driftlight Isle, keyed by personality and topic. All lines are original.
//
// Each string is one speech bubble. An optional expression tag may lead the line:
//   [neutral] [happy] [sad] [surprised] [angry] [love] [sleepy] [smug]
// Template tokens substituted at runtime:
//   {player}   the player's name
//   {catch}    the speaking villager's catchphrase
//   {villager} another neighbor's name (chat only)
//   {item}     an item name (gift* and request* topics only)
//   {qty}      a quantity (requestDeliver only)
//   {place}    a place description like "near the beach" (requestLost only)
import type { Personality } from './villagers';
import { SUNNY } from './dialogue/sunny';
import { GRUFF } from './dialogue/gruff';
import { BOOKISH } from './dialogue/bookish';
import { SPORTY } from './dialogue/sporty';
import { DAPPER } from './dialogue/dapper';
import { SPUNKY } from './dialogue/spunky';
import { DREAMY } from './dialogue/dreamy';
import { MELLOW } from './dialogue/mellow';

export type DialogueTopic =
  | 'greetMorning' | 'greetDay' | 'greetEvening' | 'greetNight'
  | 'chat' | 'rain' | 'sunny' | 'rainbow'
  | 'friendLow' | 'friendMid' | 'friendHigh'
  | 'giftLove' | 'giftLike' | 'giftNeutral' | 'giftDislike'
  | 'requestDeliver' | 'requestLost' | 'requestCatch' | 'requestThanks' | 'requestDecline' | 'requestRemind'
  | 'movedIn' | 'museum' | 'festival' | 'heartGift' | 'bye'
  | 'outfit';

export const DIALOGUE: Record<Personality, Record<DialogueTopic, string[]>> = {
  sunny: SUNNY,
  gruff: GRUFF,
  bookish: BOOKISH,
  sporty: SPORTY,
  dapper: DAPPER,
  spunky: SPUNKY,
  dreamy: DREAMY,
  mellow: MELLOW,
};
