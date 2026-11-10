# V6 Automation

Automation for the [wod6e](https://foundryvtt.com/) system in Foundry VTT, built for the **Vampire: The Masquerade Alpha 2.0 playtest** rules.

Unofficial fan-made module. It is not affiliated with or endorsed by the publishers of Vampire: The Masquerade. It contains code only, no book text.

## Install

In Foundry's setup screen: **Add-on Modules → Install Module**, paste this manifest URL and click **Install**:

```
https://raw.githubusercontent.com/DennisPrudlik/v6-automation/main/module.json
```

Then enable **V6 Automation** in your world under **Manage Modules**. Updates show up on the setup screen's Add-on Modules tab.

Needs Foundry v13 or later (verified on v14) and the wod6e system.

## What it does

- **Dice:** 6+ succeeds, a 10 counts as 2, Difficulty = successes needed, Hunger dice with painful and bestial failures, Taking Half, contested margins.
- **Chat cards:** verdict and margin, Compare, Roll for target, Reroll (1 Willpower, normal dice only), Beast's Bargain (vampires only), Apply damage.
- **Trackers:** Health (Stamina + 5), Vitae (5 + 5 × generation modifier), Willpower (Composure + Resolve), a 10-box Humanity or Path tracker, impairment.
- **Powers:** pays Vitae and Willpower costs (asks first when you can't afford it), tracks scene and night durations, rolls opposing pools and applies the result.
- **Toggles:** merit, flaw, clan trait and power bonuses appear as checkboxes in the roll dialog.
- **Damage:** formulas such as "½ Oblivion dots + margin" are worked out and follow the margin; unarmed attacks offer natural weapons from active powers; attack riders (Powerful Strike, Might of the Heroes) are tick boxes; worn armour is found on the target; Retributive Hide sends half back.
- **Frenzy:** tests made in a frenzy can take the + or − dice for its aim. Long-term impairments heal by themselves on New Night.
- **Journals:** pages made by the V6 importer get one look (headings, tables, call-outs for V6 notes) and no longer repeat the page title as a second headline. Client setting: V6 journals, all journals, or off.
- **Attacks that run themselves:** attack a targeted token and the target is asked to defend (Dodge or Parry buttons on the card); Storyteller characters defend at once. The two rolls are linked, so the card shows the margin and Apply damage knows the target. Optional: apply the damage without a click.
- **Bonuses that tick themselves:** situational toggles whose condition the table can see (a frenzy test of that kind, resisting a Discipline, the kind or clan of the targeted token, a running fight, a hunt) are ticked when the roll dialog opens, with the reason. Bonuses with a further story condition are marked "may apply" and left to you.
- **Clickable journals:** in V6 journal pages, "Wits + Awareness, Difficulty 3" is a roll button (Shift-click as Storyteller: ask the players for it), and character names from the same book open their sheet, importing it from the compendium on first use. Every power, clan trait, merit and flaw named on a page links to its item: click to open, drag onto a sheet.
- **Roll requests:** the megaphone tool asks chosen characters for a pool against a Difficulty (shown or hidden); each gets a Roll button and the card collects the results.
- **Combat flow:** turn order by Wits without rolling (players win ties), and a turn card for whoever is up: movement, action, minor action, a reaction counter, and what weighs on the character.
- **Character creation:** a step-by-step window on blank characters: creature, generation and tier, ages, sire, clan, lifepaths, Attributes, Skills, Disciplines and powers, clan traits, merits, flaws, Resources. It counts every budget and writes the finished sheet.
- **States:** surprised, on the ground, held, tied up, staked, torpor, burning, in sunlight, awake by day, cover, a hurt limb, blissful and failed Justify are token statuses that add or take dice by themselves. Fire and sunlight deal their damage at the start of the turn, with Put out and the fear frenzy test on the card.
- **Action menu:** the fist tool opens every combat action: attacks, called shot, stake, decapitate, wrestling (grab, crush, tie up, escape), feed attack, coordinate, demoralize, distract, find flaw, assist, steady aim, cover. Each rolls the right contest and applies the result; one-off edges are used up by the roll they fit.
- **Chat commands:** `/test wits+awareness 3`, `/req`, `/act`, `/states`, `/feed`, `/frenzy`, `/night` and more; `/v6 help` lists them.
- **Nightfall look:** one dark look with a blood-red edge and gold display headings for the chat log (dice as tiles, verdicts as banners), journals and the module's windows. Client setting, can be switched off.
- **Social conflict:** two sides, goals and 3, 5 or 7 rounds; each round is a card where anyone speaks for a side by picking one of the eleven approaches, the card totals the successes, and the outcome is named for both sides at the end.
- **Prolonged tasks:** a success target and a test limit on a card with a progress bar; a painful or bestial failure ends it.
- **Blood Bonds:** drinks are logged per donor (feed attacks do it by themselves), stages form over three nights and weaken at New Night; the stage comes off the thrall's rolls against the master and adds to the master's Social rolls on the thrall.
- **Downtime:** the seven downtime actions; the Resource ones move the dots and Repair the Masquerade lowers the tracker.
- **Complications:** a painful failure's card gets a Complication button; Expose Vulnerability and Suffer Harm are applied.
- **Storyteller dashboard:** every player character and scene token in one live window: Health, Vitae, Hunger, Willpower, Humanity, states, bonds, XP, with the night clock and Masquerade Tracker.
- **Tokens:** new tokens get Health and Vitae bars; a mortal at 0 Health is marked defeated; torpor shows as a state.
- **Coterie page:** domain, haven, shared Resources, and each member's Resources and herd.
- **NPC maker:** kind, category and three pools make a full sheet by the Storyteller Packet's rules, with a token ready to drop.
- **Group hunt, Vaulderie and vinculum, session recap** (a journal page written from the chat log), and a **reaction menu** on the turn card (reaction powers, Blood Surge).
- **Sheets** share the Nightfall look.
- **Storyteller tools:** New Night, End Scene, Feed, Frenzy test, Masquerade Tracker, Award and Spend XP.

Every part can be switched off under **Configure Settings → V6 Automation**.

## Files

- `module.json`: the manifest Foundry reads.
- `scripts/v6-automation.js`: the module code.
- `scripts/world-scripter-ready.js`: the same code as a World Scripter "ready" script, for use without installing the module.
- `releases/`: the zip for each version.
