/**
 * Every balance number in one place: money, growth, happiness, traffic and transit. The simulations, the
 * playthrough bot and the balance tests read these; nothing else hard-codes a number that changes
 * how the game plays. Times are seconds of play (a town day is 480 s; a minute of play is 1/8 day).
 */
export const TUNING = {
  start: {
    coins: 650,
  },
  money: {
    /** Each resident pays the town this much a minute of play (their town fee). */
    feePerResidentPerMin: 0.15,
    /** A business's bubble fills with this much a minute at levels 1–3, when it has all its customers or workers. */
    shopPerMin: [4, 6, 8],
    workPerMin: [3, 5, 7],
    /** A bubble collects itself when it has filled for this long (one minute of play). */
    autoCollectSec: 60,
    /** Building a road, a bike lane or tram track, per tile. */
    road: 8,
    bikeLane: 4,
    tram: 18,
    /** Removing things gives everything back (kind mistakes cost nothing). */
    refund: 1,
  },
  grant: {
    /** The city grant: when coins are below this and the town isn't earning, coins are topped up to `to`. */
    below: 60,
    to: 500,
    /** …and upkeep is halved for this long. */
    halfUpkeepSec: 480,
    /** At most one grant in this long. */
    everySec: 240,
  },
  growth: {
    /**
     * Seconds of play between the town's looks for a lot to build on (per zone kind). A small town
     * grows a little slower and a big one a little faster (slowPerBuilding is negative), so every
     * chapter takes about as long; kept between min and max.
     */
    everySec: 135,
    slowPerBuilding: -0.12,
    maxEverySec: 135,
    minEverySec: 85,
    /** The first few buildings the player's zoning grows come quickly (it's the tutorial). */
    quickStart: 8,
    quickSec: 10,
    /** Scaffolding shows for this long before the building pops. */
    buildSec: 14,
    /** Seconds between level-up checks; a building levels up when its area is happy enough. */
    levelEverySec: 100,
    levelSlowPerBuilding: -0.1,
    maxLevelEverySec: 100,
    minLevelEverySec: 60,
    levelHappy: [0, 73, 84],
    /** Demand below this builds nothing new. */
    minDemand: 0.12,
  },
  people: {
    residents: [3, 6, 12],
    /** Jobs at the old harbour (boats, the fish market, the ferry office) for homes on its roads, so a town grows before it has workplaces. */
    harborJobs: 36,
    /** Share of residents with a job to go to. */
    workers: 0.55,
    shopJobs: [2, 4, 7],
    workJobs: [6, 11, 18],
    /** Shoppers a shop needs nearby for a full bubble, by level. */
    shoppers: [10, 18, 30],
    /** How far people walk, cycle or drive to a job or a shop (tiles along the roads). */
    reach: 24,
    shopReach: 12,
  },
  happiness: {
    base: 46,
    /** Never lower than this ("a bit glum"): missing things only cost a little. */
    floor: 32,
    work: 14,
    fun: 9,
    nature: 9,
    /** Each covered service, and the most they add together. */
    service: { school: 5, clinic: 5, safety: 4, library: 3, community: 3, recycling: 2 },
    /** Busy streets right outside take off up to this much. */
    traffic: 8,
    /** Trees, parks and green streets (eco) add up to this much. */
    eco: 5,
  },
  services: {
    radius: { school: 14, library: 13, clinic: 14, safety: 14, community: 10, recycling: 16 },
    /** Upkeep a minute of play. */
    upkeep: { school: 3.5, library: 2.5, clinic: 4, safety: 3.5, community: 2.5, recycling: 3, bus: 2.5, tram: 7, park: 0.25 },
  },
  nature: {
    /** A park or a tree counts for homes this many tiles away. */
    reach: 5,
    /** Green points a home wants for full nature (a tree is 1, a park piece 2, a park lot tile 1). */
    want: 6,
  },
  traffic: {
    /** Car trips a street tile carries comfortably in a town hour (more and it gets busy). */
    capacity: 40,
    /** Share of trips that move to the bus for homes near a stop on a route, to bikes on a bike lane, to the tram. */
    bus: 0.4,
    bike: 0.25,
    tram: 0.6,
    stopReach: 4,
  },
  caps: {
    buildings: 900,
    decor: 1500,
    routes: 8,
    stopsPerRoute: 24,
  },
} as const;
