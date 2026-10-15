/**
 * The people of Breezeport (every name web-checked against kids' TV, books and games; see the IP log
 * in ../CLAUDE.md). Their portraits are drawn in code from these colours (ui/portrait.ts).
 */
export interface Person {
  id: string;
  name: string;
  /** What they do in town, in a few words. */
  role: string;
  skin: number;
  hair: number;
  shirt: number;
  /** A little extra: glasses, a cap, a bun, a captain's hat… */
  extra?: 'glasses' | 'cap' | 'bun' | 'captain' | 'helmet' | 'bow' | 'beard' | 'scarf';
}

const people: Person[] = [
  { id: 'marisol', name: 'Marisol Vega', role: 'the city planner', skin: 0xd9a07a, hair: 0x2e2420, shirt: 0x2fa3b0, extra: 'glasses' },
  { id: 'teodor', name: 'Teodor', role: 'the lighthouse keeper', skin: 0xf2c39b, hair: 0xe6e6e6, shirt: 0x3f6f8f, extra: 'beard' },
  { id: 'noor', name: 'Captain Noor', role: 'the ferry captain', skin: 0xb07a52, hair: 0x1e1e26, shirt: 0xf6f0e2, extra: 'captain' },
  { id: 'lin', name: 'Dr. Lin', role: 'the clinic doctor', skin: 0xffd9b8, hair: 0x1e1e26, shirt: 0xf9fbfd, extra: 'bun' },
  { id: 'rania', name: 'Rania', role: 'who runs the café', skin: 0xd9a07a, hair: 0x5a3a24, shirt: 0xef6a55, extra: 'scarf' },
  { id: 'ozzie', name: 'Ozzie', role: 'who loves skating', skin: 0x8a5a3a, hair: 0x1e1e26, shirt: 0xffc23d, extra: 'cap' },
  { id: 'abernathy', name: 'Mr. Abernathy', role: 'the librarian', skin: 0xf2c39b, hair: 0x8a5a30, shirt: 0x5a4636, extra: 'glasses' },
  { id: 'gemma', name: 'Gemma', role: 'who wants a greener town', skin: 0xffd9b8, hair: 0xb0482e, shirt: 0x5fbf7a, extra: 'bow' },
  { id: 'dalia', name: 'Chief Dalia', role: 'who leads the safety crew', skin: 0xb07a52, hair: 0x2e2420, shirt: 0xe25c4a, extra: 'helmet' },
  { id: 'pearl', name: 'Auntie Pearl', role: 'who runs the Bay Festival', skin: 0x6a4430, hair: 0xd9d9d9, shirt: 0xb08ae0, extra: 'bun' },
  { id: 'kofi', name: 'Kofi', role: 'the bus driver', skin: 0x6a4430, hair: 0x1e1e26, shirt: 0x2fa3b0, extra: 'cap' },
];

export const PERSON: Record<string, Person> = Object.fromEntries(people.map(p => [p.id, p]));
export const CAST: readonly Person[] = people;
