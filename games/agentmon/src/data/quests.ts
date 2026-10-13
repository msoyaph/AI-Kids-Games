/** Quests: the main story and the small side quests. Each stage is one short line for the log. */
export interface QuestDef { id: string; title: string; side: boolean; stages: string[] }

export const QUESTS: QuestDef[] = [
  { id: 'main', title: 'Relight the Beacons', side: false, stages: [
    'Wake up and say good morning to Gran.',
    'Meet Chief Nell at the Field Agent Academy.',
    'Go north on the Meadow Path to Saltwhistle.',
  ] },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map(q => [q.id, q]));
