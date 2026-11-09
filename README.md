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
- **Storyteller tools:** New Night, End Scene, Feed, Frenzy test, Masquerade Tracker, Award and Spend XP.

Every part can be switched off under **Configure Settings → V6 Automation**.

## Files

- `module.json`: the manifest Foundry reads.
- `scripts/v6-automation.js`: the module code.
- `scripts/world-scripter-ready.js`: the same code as a World Scripter "ready" script, for use without installing the module.
- `releases/`: the zip for each version.
