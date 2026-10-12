export type Mood = 'happy' | 'wow' | 'think' | 'sleepy';

/** One line of dialogue. Keep text short: one or two simple sentences. `{name}` = the player's name. */
export interface Line {
  who: string;
  text: string;
  mood?: Mood;
}
