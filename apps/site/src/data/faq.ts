// The parent FAQ (/faq): plain answers, written once and used for the page, its FAQPage
// structured data and llms-full.txt. Answers about the games are generated from their manifests.
import type { Block } from '../lib/rich-text';
import { REPO } from '../lib/links';
import type { Game } from './games';

export interface Question { id: string; question: string; answer: Block[] }

const list = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0,-1).join(', ')} and ${items.at(-1)}`;

export function faq(games: Game[]): Question[] {
  const touch = games.filter(game => game.controls.types.includes('Touch') && game.supportedDevices.some(device => device !== 'Computer'));
  const computerOnly = games.filter(game => !touch.includes(game));
  const needs = games.filter(game => game.requirements.length);
  return [
    { id: 'free',question: 'Is it really free?',answer: [
      { p: 'Yes. Every game is free to play in full. There are no trials, premium versions, subscriptions, paid levels or "pay to skip" timers.' },
      { p: `The site and every game are open source under the MIT license, so anyone can read exactly what they do on [GitHub](${REPO}).` }
    ] },
    { id: 'ads-purchases',question: 'Are there ads or in-app purchases?',answer: [
      { p: 'No. There are no ads of any kind, including "watch an ad for a reward". There are no in-app purchases, loot boxes or coins sold for real money.' },
      { p: 'Anything a game unlocks, like helpers, themes or new levels, is earned by playing. Each game’s page says so in its **Safety and privacy** section.' }
    ] },
    { id: 'accounts',question: 'Does my child need an account?',answer: [
      { p: 'No. There are no accounts, sign-ups or logins, and nothing asks for a name, email, photo or age. Kids pick a game and press Play.' }
    ] },
    { id: 'data',question: 'What data do you collect?',answer: [
      { p: 'Nothing about you or your child. The site has no analytics, tracking, cookies or outside scripts, and the games never send anything anywhere.' },
      { p: 'Game progress, settings, favorites and recently played are saved in your browser’s storage on this device. They are never sent to us.' },
      { p: 'Like any website, our host (Vercel) processes standard request data, such as IP addresses, to deliver the pages and keep them secure. We don’t use it to identify or track anyone. The details are on the [privacy page](/privacy).' }
    ] },
    { id: 'assistants',question: 'Can I use AI Kids Games in ChatGPT or Claude?',answer: [
      { p: 'Yes. The AI Kids Games app lets an AI assistant find a game by age, kind of game, device, time or mood, show it as a card with its ages and content notes, and let you try it together in the chat.' },
      { p: 'Those assistants are for teens and adults, so the app is for parents and caregivers. It receives only the choices you make there, never your conversation, and it sets no cookies. Progress made in the chat may not be saved; play on the website to keep it. The details are on the [privacy page](/privacy).' }
    ] },
    { id: 'chat',question: 'Can strangers contact my child?',answer: [
      { p: 'No. There is no chat, messaging, comments, uploading or online multiplayer, so no one can reach your child through the site or the games.' },
      { p: 'Any link that leaves the site asks a grown-up first.' }
    ] },
    { id: 'ages',question: 'What ages is each game for?',answer: [
      { p: 'Ages are our suggestion, based on the reading, controls and content. They are not an official rating. Try a game together first and decide what feels right.' },
      { ul: games.map(game => `[${game.title}](/game/${game.slug}): ${game.ageGuidance}. ${game.contentNotes}`) }
    ] },
    { id: 'devices',question: 'Does it work on phones, tablets and iPad?',answer: [
      { p: `Every game plays in a web browser on a computer.${touch.length ? ` ${touch.length === games.length ? 'All of them also play' : `${list(touch.map(game => game.title))} also play`} by touch on phones and tablets, including iPhone and iPad.` : ''}${computerOnly.length ? ` ${list(computerOnly.map(game => game.title))} ${computerOnly.length > 1 ? 'need' : 'needs'} a keyboard and mouse or a game controller.` : ''}` },
      { p: `Use a recent version of Safari, Chrome, Edge or Firefox.${needs.length ? ` ${needs.map(game => `${game.title} needs ${list(game.requirements)}`).join('; ')}.` : ''}` },
      { p: 'On a phone or tablet, the **Add to Home** button on the home page puts AI Kids Games on your Home Screen like an app.' }
    ] },
    { id: 'offline',question: 'Does it work offline?',answer: [
      { p: 'You need an internet connection to open the site and load a game. Once a game has loaded, it doesn’t use the internet: each game is one file with all its art and sound inside. If the connection drops, keep playing; you’ll need it back to open another game.' },
      { p: 'Adding the site to your Home Screen makes it quicker to reach, but it doesn’t download the games for offline play.' }
    ] },
    { id: 'saves',question: 'Where is progress saved, and how do I clear it?',answer: [
      { p: 'Progress is saved in this browser on this device. It doesn’t move between devices or browsers.' },
      { p: 'On iPhone and iPad, a game opened from the Home Screen keeps its own saves, separate from Safari’s.' },
      { p: 'To remove favorites and recently played, use **Clear saved lists** on [For parents](/parents). To remove game progress, clear this site’s data in your browser’s settings. Each game’s page lists exactly what it stores.' },
      { p: 'Community games save under their own separate address, which their game page names; clearing all site data in your browser’s settings removes those saves too.' }
    ] },
    { id: 'makers',question: 'Who makes the games? Are they made with AI?',answer: [
      { p: 'AI Kids Games is a small independent project. Each game starts from a written brief and is built with AI coding tools.' },
      { p: 'Before every release, automated tests check that it works on computers, tablets and phones, that saves survive a reload, and that it makes no network requests.' },
      { p: `The full source of every game, and the briefs they were built from, are public on [GitHub](${REPO}).` }
    ] },
    { id: 'community',question: 'What are community games, and are they safe?',answer: [
      { p: 'Community games are made by kids and families from our starter game, often with an AI helper, and sent in on GitHub. They follow the same rules as our own games: no ads, purchases, chat, accounts, tracking or network requests, honest ages and no fast flashing.' },
      { p: 'Each one passes the same automated checks, and a person plays it and reads every word in it before it’s approved. Until then, it doesn’t appear on the site.' },
      { p: 'Community games run from their own separate web address, so they can’t reach this site, your favorites or other games’ saves. If you spot a problem, each community game’s page has a **Report a problem** link, and we can take a game down at any time.' }
    ] },
    { id: 'make-your-own',question: 'Can my child make their own game?',answer: [
      { p: 'Yes, with a grown-up. Our guide [Build a simple game with your kid using AI](/guides/build-a-game-with-your-kid-using-ai) walks through a first game in an afternoon, with an example to copy. When it’s ready, you can [submit it](/list-your-game) for Community games.' }
    ] }
  ];
}
