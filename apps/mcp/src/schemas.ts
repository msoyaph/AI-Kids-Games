// What tools return as structuredContent (their outputSchema), for the model and the widget.
// The widget imports only the types.
import * as z from 'zod';

export const siteSchema = z.object({
  origin: z.string().describe('The website\'s address.'),
  host: z.string(),
  label: z.string().describe('How buttons name the website, e.g. "aikids.games".')
});

export const gameSchema = z.object({
  slug: z.string(),title: z.string(),tagline: z.string(),pitch: z.string(),
  ages: z.string().describe('Suggested ages, e.g. "6+" or "10–14".'),minAge: z.number(),
  genres: z.array(z.string()),devices: z.array(z.string()),controls: z.array(z.string()),moods: z.array(z.string()),
  sessionMinutes: z.array(z.number()).length(2).optional().describe('One sitting, [shortest, longest] minutes.'),
  playTime: z.string(),contentNotes: z.string(),quickStart: z.array(z.string()),
  embed: z.enum(['inline','fullscreen','site']).describe('How it plays here: inline, fullscreen, or only on the website.'),
  url: z.string().describe('The game\'s page on the website. Share this link.'),cover: z.string(),logo: z.string().optional(),
  accentColor: z.string(),madeBy: z.string().optional().describe('Community games: the creator\'s nickname.'),
  build: z.object({ url: z.string(),uri: z.string(),bytes: z.number(),sha256: z.string() }).optional().describe('The verified single-file build (games that play here).')
});
export type GameView = z.infer<typeof gameSchema>;

export const listOutput = z.object({
  view: z.literal('list'),site: siteSchema,
  filters: z.record(z.string(),z.union([z.string(),z.number()])),
  relaxed: z.array(z.string()).describe('Filters dropped because nothing matched all of them (never age).'),
  games: z.array(gameSchema),source: z.string()
});
export const gameOutput = z.object({
  view: z.enum(['card','player']),site: siteSchema,game: gameSchema,
  note: z.string().optional(),source: z.string()
});
export const parentOutput = z.object({
  promises: z.array(z.object({ title: z.string(),text: z.string() })),
  links: z.object({ forParents: z.string(),privacy: z.string(),github: z.string() }),
  source: z.string()
});
export type ListOutput = z.infer<typeof listOutput>;
export type GameOutput = z.infer<typeof gameOutput>;
