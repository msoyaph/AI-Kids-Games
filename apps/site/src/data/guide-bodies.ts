// The words of each guide (see guides.ts): used for the page, its Article structured data and
// llms-full.txt.
import type { Block } from '../lib/rich-text';
import { REPO } from '../lib/links';

export const guideBodies: Record<string,Block[]> = {
  'choose-ad-free-games-for-kids': [
    { p: 'Most “free” games make their money from ads and in-app purchases. For adults that’s a trade-off. For kids, it means interruptions every few minutes, buttons that lead to app stores, and constant nudges to spend. Here is how to spot it before your child starts playing.' },
    { h: 'Read the store listing first' },
    { ul: [
      'On Google Play, look for **Contains ads** and **In-app purchases** under the install button. On the App Store, look for **In-App Purchases** next to the price.',
      'Scroll to the privacy section: **Data safety** on Google Play, **App Privacy** on the App Store. If a kids’ game lists data “used to track you” or shared with advertisers, skip it.',
      'Check who made it. A developer with dozens of near-identical games is usually running an ad business.'
    ] },
    { h: 'Know the patterns that matter for kids' },
    { ul: [
      '**Rewarded ads:** “Watch a video to continue” or “to double your coins”. Kids learn to tap them, and they lead to other apps.',
      '**Ads after every level:** full-screen ads that interrupt play and are easy to tap by mistake.',
      '**Currencies:** gems or coins that can be bought with real money. They hide the real price and make spending feel like play.',
      '**Loot boxes and surprise packs:** random rewards for money or premium currency. They work like a slot machine.',
      '**Pay-to-skip timers:** waits designed to be annoying, so paying feels like relief.'
    ] },
    { h: 'Try it yourself for ten minutes' },
    { p: 'Play the first few levels before your child does. Count the ads, look for a shop button, and see what happens when you lose. Many ad-funded games show their real model only after the first level.' },
    { h: 'Turn on the safety nets' },
    { ul: [
      'On iPhone and iPad, use Family Sharing with **Ask to Buy**, so every purchase needs your approval.',
      'On Android, use Google Family Link or Google Play’s **purchase approvals** setting.',
      'Don’t leave a payment card on a device your child uses alone.'
    ] },
    { h: 'Where ad-free games come from' },
    { p: 'Games without ads are usually paid for some other way. Each way has its own catch:' },
    { ul: [
      '**One price up front:** check that “paid” doesn’t also mean in-app purchases.',
      '**A subscription service that bans ads and purchases:** only worth it if your family will use the catalog.',
      '**Public-service or open-source games:** nobody is selling anything. Check that they’re still kept up to date.'
    ] },
    { p: '[AI Kids Games](/) is one of the open-source kind: every game is free, with no ads, purchases or accounts, and the source is public. Each game page has a **Safety and privacy** section that says exactly what the game does and doesn’t do.' },
    { h: 'A quick checklist' },
    { ol: [
      'No “Contains ads” or “In-app purchases” label, or you’ve checked what they are.',
      'No tracking or data shared with advertisers in the privacy section.',
      'You played ten minutes and found no ads, shop or currency.',
      'Purchase approval is on for your child’s device.'
    ] }
  ],
  'what-makes-a-game-kid-safe': [
    { p: 'An age rating tells you about violence, language and scary moments. It says much less about who can talk to your child, what data the game collects, or how hard it works to keep them playing. These six checks cover the rest.' },
    { h: '1. Who can contact your child' },
    { p: 'Chat, friend requests, voice chat and shared creations are the biggest risk in kids’ games, because they let strangers in. Check whether the game has them, whether they can be switched off, and whether that setting is locked behind a parent’s PIN. If you can’t find a clear answer, assume contact is possible.' },
    { h: '2. What the rating actually covers' },
    { p: 'ESRB (North America) and PEGI (Europe) rate content. Both also flag extras worth reading:' },
    { ul: [
      'ESRB’s **Interactive Elements**, such as “Users Interact”, “In-Game Purchases” and “In-Game Purchases (Includes Random Items)”.',
      'PEGI’s **In-game Purchases** descriptor.'
    ] },
    { p: 'Read those lines as carefully as the age.' },
    { h: '3. What data it collects' },
    { p: 'Look for accounts, sign-ups and requests for a name, email, birthday or photo. In the United States, services aimed at children under 13 need a parent’s consent before collecting personal information (COPPA). A game that needs no account at all has the least to lose.' },
    { h: '4. How it makes money' },
    { p: 'Ads, purchases, currencies, loot boxes and subscriptions all shape the design. Our guide on [choosing ad-free games](/guides/choose-ad-free-games-for-kids) covers what to look for.' },
    { h: '5. Whether it respects stopping' },
    { p: 'Healthy games have natural stopping points and save whenever you leave. Watch out for designs that punish taking a break:' },
    { ul: [
      'daily login rewards that reset if you miss a day;',
      'streaks you can lose;',
      'countdown timers on offers;',
      'red notification badges;',
      'endless “one more” loops with no ending.'
    ] },
    { h: '6. Whether it fits your child' },
    { p: 'Check the reading level, the controls and how it handles losing. A game that’s too hard is frustrating; one that’s too easy gets dropped. Accessibility options help too: subtitles, colorblind modes, larger text, and keyboard or controller support.' },
    { h: 'Play together first' },
    { p: 'Ten minutes side by side tells you more than any listing. You’ll see the menus, the pace and the moments that need a grown-up. You’ll also have something to talk about later.' },
    { h: 'How AI Kids Games handles these' },
    { ul: [
      '**Contact and data:** no chat, accounts, ads, purchases or tracking, and the games make no network requests.',
      '**Ages and content:** each game lists suggested ages and content notes, written in plain words, on its page and on [For parents](/parents).',
      '**Saves:** progress saves on the device, so stopping is always fine.'
    ] },
    { p: 'The answers to the most common questions are in the [parent FAQ](/faq).' }
  ],
  'build-a-game-with-your-kid-using-ai': [
    { p: 'AI coding assistants can turn a clear description into a small, working game. That makes them a great way to build something with your kid. They come up with the idea and the rules; you handle the account and the typing; the AI writes the code. Every game on AI Kids Games started the same way, from a written brief.' },
    { h: 'Before you start' },
    { ul: [
      '**The grown-up owns the AI account.** Most AI assistants require an adult account, and some allow teens with a parent’s permission. You type, and your kid designs.',
      '**Keep personal details out.** Don’t put names, schools, photos or locations in what you type.',
      '**You need:** a computer with a web browser, an AI assistant that can write code, and about an hour.'
    ] },
    { h: 'Step 1: Design it on paper' },
    { p: 'Keep it tiny. Answer five questions together:' },
    { ol: [
      'Who is the player?',
      'What do they do?',
      'What gets in the way?',
      'How do you win?',
      'What happens when you miss?'
    ] },
    { p: 'One screen and one goal is plenty for a first game. Draw it if that helps.' },
    { h: 'Step 2: Describe it to the AI' },
    { p: 'Be specific about the age, the controls and the rules, and ask for one self-contained HTML file. That way it runs on any computer, without installing anything or loading anything from the internet. Here is an example to copy and change:' },
    { p: '“Make a small game for a 7-year-old as one HTML file with everything inside it: no images, libraries or anything loaded from the internet. A smiling basket at the bottom of the screen catches falling stars. Move the basket with the arrow keys, or by dragging a finger on a phone or tablet. Each star caught is worth 1 point; at 20 points show ‘You did it!’ and a Play again button. Missed stars just disappear: there is no losing. Use big, bright shapes and large text. Then tell me how to run it.”' },
    { h: 'Step 3: Run it' },
    { p: 'Save the code the assistant gives you as a file named **game.html**, then open it in your browser. If something doesn’t work, describe exactly what you see (“the basket doesn’t move when I press the arrow keys”) and ask for a fix.' },
    { h: 'Step 4: Play-test and change one thing at a time' },
    { p: 'Let your kid play and decide what to change next, one request at a time:' },
    { ul: [
      '“Make the stars fall a little slower.”',
      '“Add a rainbow star worth 5 points.”',
      '“Let me pick the basket’s color at the start.”'
    ] },
    { p: 'Small steps are easier to check, and when something breaks you know which change did it.' },
    { h: 'Step 5: Learn from the code' },
    { p: 'Ask the assistant to explain a part your kid cares about, in words they understand: “Explain the part that moves the basket, for a 9-year-old.” Try changing one number together, like the speed, and see what happens. That’s real programming.' },
    { h: 'Going further' },
    { p: `When you’re ready for more, the AI Kids Games [starter and game guide](${REPO}/blob/main/docs/CREATE-A-GAME.md) explains how our games stay kid-safe: one file, no network, saves on the device. The [briefs](${REPO}/tree/main/docs/prompts) show how each game on this site was described.` }
  ]
};

/** Reading time at about 200 words a minute. */
export const readingMinutes = (slug: string) => Math.max(1,Math.round(JSON.stringify(guideBodies[slug] ?? []).split(/\s+/).length/200));
