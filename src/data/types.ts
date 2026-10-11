// Typed content contracts. Everything the game shows or simulates is described by data in src/data/.

// ---------------------------------------------------------------------------
// Procedural model recipes (rendered by src/render/lowpoly.ts)
// ---------------------------------------------------------------------------

export type Shape = 'box' | 'sphere' | 'cyl' | 'cone' | 'torus' | 'capsule' | 'wedge' | 'ico';

/**
 * Colour may be a hex number or a token that is substituted at build time:
 * 'paint' / 'paint2' (kart paint), 'skin', 'accent', 'trim', 'tire', 'metal', 'glass'.
 */
export type ColorRef = number | 'paint' | 'paint2' | 'accent' | 'trim' | 'tire' | 'metal' | 'glass';

export interface ModelPart {
  shape: Shape;
  /** Position (metres). */
  p?: [number, number, number];
  /** Scale (for unit primitives: box is 1×1×1, sphere/ico radius 0.5, cyl/cone radius 0.5 height 1). */
  s?: [number, number, number];
  /** Rotation in degrees (XYZ). */
  r?: [number, number, number];
  c: ColorRef;
  /** Low-poly segment count override. */
  seg?: number;
  /** Mirror across X (creates the part twice: as given and with p.x negated). */
  mirror?: boolean;
}

// ---------------------------------------------------------------------------
// Racers and kart parts
// ---------------------------------------------------------------------------

export type WeightClass = 'light' | 'medium' | 'heavy';

/** All stat bars are 0..10. */
export interface Stats {
  speed: number;
  accel: number;
  handling: number;
  weight: number;
  traction: number;
}

export type Personality = 'aggressive' | 'careful' | 'itemFocused' | 'balanced' | 'showoff';

export interface RacerData {
  id: string;
  name: string;
  /** Short kid-friendly bio. */
  bio: string;
  kind: 'kid' | 'animal' | 'robot' | 'fantasy';
  weight: WeightClass;
  /** Signature colours used for UI cards and default paint. */
  color: number;
  color2: number;
  /** Driver model sitting in the seat; origin = seat centre, +Z forward. */
  model: ModelPart[];
  /** Head part indices that bob/turn (optional). */
  headParts?: number[];
  personality: Personality;
  /** Default kart setup when picking this racer. */
  defaultKart: { body: string; wheels: string; glider: string };
  /** Synth voice for cheers (pitch multiplier). */
  voice: number;
  unlocked: boolean;
}

export interface KartPartData {
  id: string;
  name: string;
  /** Stat modifiers added on top of the weight-class base. */
  mod: Partial<Stats>;
  model: ModelPart[];
  unlocked: boolean;
}

export interface DecalPanel {
  /** Panel centre. */
  p: [number, number, number];
  /** Width (x) and length (z) for horizontal panels; width (z) and height (y) for side panels. */
  w: number;
  l: number;
  /** 'top' panels face up; 'side' panels face +X (mirrored to -X when mirror is set). */
  face: 'top' | 'side';
  mirror?: boolean;
  /** Decal colour (default 'paint2'). */
  color?: ColorRef;
}

export interface BodyData extends KartPartData {
  /** Where the 4 wheels attach (x is mirrored). */
  wheelFront: [number, number, number];
  wheelBack: [number, number, number];
  seatY: number;
  /** Surfaces decals are painted on. */
  decals: DecalPanel[];
}

export interface WheelData extends KartPartData {
  radius: number;
  width: number;
}

export type GliderData = KartPartData;

export interface PaintData {
  id: string;
  name: string;
  color: number;
  color2: number;
  unlocked: boolean;
}

export type DecalPattern = 'none' | 'stripes' | 'stars' | 'dots' | 'bolt' | 'hearts' | 'checker' | 'flame' | 'waves' | 'number' | 'zigzag' | 'swirl';

export interface DecalData {
  id: string;
  name: string;
  pattern: DecalPattern;
  unlocked: boolean;
}

export interface KartConfig {
  body: string;
  wheels: string;
  glider: string;
  paint: string;
  decal: string;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export type ItemId =
  | 'bumperBall'
  | 'paperPlane'
  | 'gooPuddle'
  | 'turbo'
  | 'turbo3'
  | 'magnet'
  | 'shield'
  | 'cloud'
  | 'tornado'
  | 'rocketDash'
  | 'springTrap'
  | 'popper';

export interface ItemData {
  id: ItemId;
  name: string;
  description: string;
  /** How to dodge or block it (shown in the collection screen). */
  counter: string;
  /** Uses before the slot empties. */
  uses: number;
  /** Can be held behind the kart to block hits from the rear. */
  canTrail: boolean;
  /** UI icon colours. */
  color: number;
  color2: number;
  /**
   * Roll weights by position bucket: [1st, front, middle, back, last].
   * Buckets come from normalised race position (see sim/items/rolls.ts).
   */
  weights: [number, number, number, number, number];
  /** Included in the "basic" item set for Versus. */
  basic: boolean;
}

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export type CupId = 'sunrise' | 'thunder' | 'galaxy' | 'legend';

export type Theme =
  | 'beach'
  | 'rooftops'
  | 'candy'
  | 'canyon'
  | 'volcano'
  | 'themepark'
  | 'ruins'
  | 'snow'
  | 'moon'
  | 'underwater'
  | 'sky'
  | 'robot'
  | 'neon'
  | 'jungle'
  | 'cloudcastle'
  | 'rainbow'
  | 'test';

export type EdgeType = 'wall' | 'drop' | 'open';
export type SurfaceKind = 'road' | 'offroad' | 'boost' | 'water' | 'ice';

/** Positions along the track are expressed in control-point units `u`: 3.5 = halfway from point 3 to 4. */
export interface TrackPoint {
  x: number;
  z: number;
  /** Elevation (metres). Defaults to the previous point's elevation, or 0. */
  y?: number;
  /** Full road width (metres). Defaults to track.width. */
  w?: number;
  /** Manual bank in degrees (positive lifts the left edge). Added to auto-banking. */
  bank?: number;
}

export interface URange {
  from: number;
  to: number;
}

export interface EdgeSpan extends URange {
  side: 'left' | 'right' | 'both';
  type: EdgeType;
}

export interface BoostPadData {
  at: number;
  /** Lateral position, -1 (left edge) .. 1 (right edge). */
  offset: number;
  /** Width in metres (default 3.2). */
  width?: number;
}

export interface ItemRowData {
  at: number;
  /** Boxes across the road (default 4). */
  count?: number;
  /** Lateral spread as fraction of half-width (default 0.75). */
  spread?: number;
  /** Lateral centre -1..1 (default 0). */
  offset?: number;
}

export interface RampData {
  at: number;
  /** Lateral centre -1..1 (default 0 = whole road). */
  offset?: number;
  /** Ramp width in metres (default: full road). */
  width?: number;
  length?: number;
  height?: number;
  /** 'glider' ramps deploy the glider; 'trick' ramps are normal jump ramps that allow tricks. */
  kind: 'trick' | 'glider';
}

export interface ZoneData extends URange {
  kind: 'water' | 'lowgrav';
}

/** Moving or static hazards that bump karts (cartoony, never scary). */
export interface HazardData {
  kind: 'roller' | 'bumper' | 'geyser' | 'crab' | 'swinger';
  at: number;
  offset?: number;
  /** Movement: side-to-side amplitude across the road (fraction of half-width), period seconds. */
  amp?: number;
  period?: number;
  phase?: number;
}

export interface ShortcutData {
  /** Open path; first/last points should sit on (or just off) the main road. */
  points: TrackPoint[];
  width: number;
  edge: EdgeType;
  surface: 'road' | 'offroad';
  /** Main-track u where the shortcut leaves and rejoins (used for progress mapping). */
  joinFrom: number;
  joinTo: number;
  boostPads?: BoostPadData[];
  ramps?: RampData[];
  gaps?: URange[];
  /** Kid-friendly description of the risk, shown in Time Trial tips. */
  hint: string;
  /** AI probability multiplier (0 = never). */
  aiUse?: number;
}

export interface SkyData {
  top: number;
  bottom: number;
  fog: number;
  /** Fog start / end as multiples of draw distance. */
  fogNear?: number;
  sun: number;
  ambient: number;
  /** Ground plane below the track (null = none / void). */
  ground: number | null;
  groundY?: number;
  /** Optional decorative backdrop: mountains, stars, clouds, city skyline... */
  backdrop?: 'mountains' | 'stars' | 'clouds' | 'skyline' | 'dunes' | 'waves' | 'none';
  backdropColor?: number;
  night?: boolean;
}

export interface TrackPalette {
  road: number;
  road2: number;
  line: number;
  kerb: number;
  kerb2: number;
  offroad: number;
  wall: number;
  wall2: number;
  /** Underside/sides of elevated road. */
  side: number;
}

export interface PropPlacement {
  type: string;
  x: number;
  z: number;
  y?: number;
  rot?: number;
  scale?: number;
  color?: number;
}

export interface PropScatter {
  types: string[];
  /** Approx props per 100 m of track per side. */
  density: number;
  /** Distance range from the boundary (metres). */
  near: number;
  far: number;
  scale?: [number, number];
}

export interface TrackData {
  id: string;
  name: string;
  cup: CupId;
  theme: Theme;
  /** One line describing the memorable feature. */
  feature: string;
  points: TrackPoint[];
  width: number;
  /** Off-road strip each side beyond the road (metres). */
  shoulder: number;
  /** Default boundary behaviour beyond the shoulder. */
  edge: EdgeType;
  edges?: EdgeSpan[];
  /** 0..1 how much curvature auto-banks the road. */
  autoBank?: number;
  /** Track-wide gravity multiplier (moon = 0.5). */
  gravity?: number;
  /** u of the start/finish line. */
  start?: number;
  boostPads?: BoostPadData[];
  itemRows?: ItemRowData[];
  ramps?: RampData[];
  gaps?: URange[];
  zones?: ZoneData[];
  hazards?: HazardData[];
  shortcuts: ShortcutData[];
  palette: TrackPalette;
  sky: SkyData;
  scatter?: PropScatter[];
  props?: PropPlacement[];
  /** Song id from data/songs.ts. */
  music: string;
}

export interface CupData {
  id: CupId;
  name: string;
  color: number;
  tracks: [string, string, string, string];
  /** Unlocked from the start (otherwise unlocked by progression). */
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Battle arenas
// ---------------------------------------------------------------------------

export interface ArenaObstacle {
  kind: 'box' | 'cyl';
  x: number;
  z: number;
  /** Half-size (box) or radius (cyl). */
  hx: number;
  hz: number;
  h: number;
  rot?: number;
  color?: number;
}

export interface ArenaRamp {
  x: number;
  z: number;
  /** Direction the ramp rises toward (degrees, 0 = +Z). */
  dir: number;
  width: number;
  length: number;
  height: number;
}

export interface ArenaPlatform {
  x: number;
  z: number;
  hx: number;
  hz: number;
  h: number;
}

export interface ArenaData {
  id: string;
  name: string;
  theme: Theme;
  shape: 'circle' | 'square' | 'cross' | 'ring';
  /** Radius / half-extent (metres). */
  size: number;
  /** Ring inner radius (ring) or arm half-width (cross). */
  inner?: number;
  obstacles: ArenaObstacle[];
  ramps: ArenaRamp[];
  platforms: ArenaPlatform[];
  itemBoxes: Array<{ x: number; z: number; y?: number }>;
  palette: TrackPalette;
  sky: SkyData;
  music: string;
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export interface AiProfile {
  id: Personality;
  /** 0..1 likelihood to bump/attack nearby racers. */
  aggression: number;
  /** 0..1 how eagerly items are used vs held. */
  itemEagerness: number;
  /** 0..1 tendency to hold defensive items behind. */
  defense: number;
  /** Multiplier on shortcut probability. */
  shortcutBias: number;
  /** Lateral wobble around the racing line (metres). */
  lineNoise: number;
  /** Multiplier on corner speed (risk taking). */
  cornerRisk: number;
}

export type SpeedClass = 'rookie' | 'pro' | 'champion';

export interface SpeedClassData {
  id: SpeedClass;
  name: string;
  /** Top-speed multiplier on the shared base speed. */
  speedScale: number;
  /** AI skill 0..1 (line accuracy, drift use, reaction times). */
  aiSkill: number;
  /** Max rubber-band speed bonus for AI far behind / penalty far ahead. */
  rubberBack: number;
  rubberFront: number;
}

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

export type UnlockRef =
  | { kind: 'racer'; id: string }
  | { kind: 'body'; id: string }
  | { kind: 'wheels'; id: string }
  | { kind: 'glider'; id: string }
  | { kind: 'paint'; id: string }
  | { kind: 'decal'; id: string }
  | { kind: 'arena'; id: string }
  | { kind: 'cup'; id: CupId }
  | { kind: 'class'; id: SpeedClass | 'mirror' };

/** Conditions are evaluated against race results and the save file (see game/progression.ts). */
export type ChallengeGoal =
  | { type: 'winRace'; track?: string; speedClass?: SpeedClass; noItems?: boolean; mirror?: boolean }
  | { type: 'finishPosition'; maxPosition: number; track?: string; speedClass?: SpeedClass }
  | { type: 'driftSeconds'; seconds: number }
  | { type: 'miniTurbos'; count: number; tier?: 1 | 2 | 3 }
  | { type: 'tricks'; count: number }
  | { type: 'hitWithItem'; count: number; item?: ItemId }
  | { type: 'dodge'; count: number }
  | { type: 'shortcut'; count: number; track?: string }
  | { type: 'perfectStart'; count: number }
  | { type: 'timeTrial'; track: string; beatStaff: boolean }
  | { type: 'trophy'; cup?: CupId; speedClass?: SpeedClass; medal: 'gold' | 'silver' | 'bronze'; count?: number }
  | { type: 'battleWin'; arena?: string }
  | { type: 'battlePops'; count: number }
  | { type: 'comeback'; fromPosition: number }
  | { type: 'noHitRace' }
  | { type: 'coinsLike'; boosts: number }
  | { type: 'totalRaces'; count: number }
  | { type: 'leadWholeRace' }
  | { type: 'boostPads'; count: number };

export interface ChallengeData {
  id: string;
  name: string;
  description: string;
  goal: ChallengeGoal;
  /** If true, progress accumulates across races (e.g. total tricks). */
  cumulative: boolean;
  reward: UnlockRef;
}

export interface SongData {
  id: string;
  name: string;
  bpm: number;
  /** Root MIDI note. */
  root: number;
  scale: 'major' | 'minor' | 'dorian' | 'mixolydian' | 'pentatonic' | 'blues' | 'lydian' | 'harmonicMinor' | 'wholeTone';
  /** Chord degrees per bar (0-based scale degrees). */
  chords: number[];
  /** Instrument styles. */
  lead: 'square' | 'saw' | 'triangle' | 'sine' | 'pluck' | 'bell' | 'organ';
  bass: 'square' | 'saw' | 'triangle' | 'sine' | 'pluck';
  pad?: 'saw' | 'triangle' | 'sine' | 'organ';
  drums: 'pop' | 'rock' | 'latin' | 'shuffle' | 'electro' | 'march' | 'halftime' | 'breakbeat' | 'none';
  /** Seed for the melody generator. */
  seed: number;
  swing?: number;
  /** Arpeggio style. */
  arp?: 'up' | 'down' | 'updown' | 'random' | 'none';
  /** Overall brightness 0..1 (filter cutoff). */
  bright?: number;
}
