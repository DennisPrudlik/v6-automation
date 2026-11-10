// V6 Automation for the World Scripter module: paste all of this into its "ready" script box.
// It then runs every time the world loads. The importer stays a normal macro.
// ---------------------------------------------------------------------------
// V6 Automation for the wod6e system (Vampire: The Masquerade Alpha 2.0 playtest rules).
// One file, two uses: the esmodule of the "v6-automation" module, or the body
// of a script macro you run once per session. Running it twice does nothing.
//
// What it does (each part can be switched off in the module settings):
//  - costs:      pays a power's Vitae/Willpower cost when you roll it
//  - bonuses:    merits and clan traits with a known passive bonus get a
//                matching condition, which the roll dialog offers as a toggle
//  - situational: hide toggles whose Skill/Attribute/Discipline isn't in the roll
//  - vitae:      Satisfied / Thirsty / Hungry / Torpor condition kept up to date
//  - quickening: Quickening gained when entering Thirsty (1) or Hungry (2)
//  - humanity:   Humanity Scale stage conditions kept up to date
//  - maturing:   chat note when more Discipline dots mature a power
//  - clanSetup:  dropping a clan on a vampire shows its in-clan Disciplines
//  - alpha2:     the Alpha 2.0 rules (alpha2-core.js, appended by the build).
//                While it is on, vitae / quickening / humanity count as off.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry, ChatMessage, Item, Roll, CONFIG */

const V6A_MOD = 'v6-automation'
const V6A_STAGES = {"vitae": [{"key": "satisfied", "min": 11, "max": 999, "name": "Vitae: Satisfied", "text": "<p>Satisfied (11+ Vitae, packet p.86): +1 die on Self-Control tests against frenzy or an outburst, +1 die on clan Discipline Power tests.</p>", "effects": [{"label": "clanDisciplines", "type": "dice", "targets": ["@clan"], "mode": "add", "value": 1, "predicates": []}, {"type": "dice", "targets": [], "mode": "add", "value": 1, "predicates": ["situational"], "note": "Self-Control vs frenzy or outburst"}]}, {"key": "thirsty", "min": 6, "max": 10, "name": "Vitae: Thirsty", "quickening": 1, "text": "<p>Thirsty (6–10 Vitae, packet p.86): gain 1 Quickening on entering this threshold and at the start of each later scene.</p>", "effects": []}, {"key": "hungry", "min": 1, "max": 5, "name": "Vitae: Hungry", "quickening": 2, "text": "<p>Hungry (1–5 Vitae, packet p.86): gain 2 Quickening on entering and at the start of each later scene. Seeing a helpless mortal or someone bleeding, or smelling fresh blood, calls for a Self-Control test or hunger frenzy (automatic, by our table ruling).</p>", "effects": []}, {"key": "torpor", "min": 0, "max": 0, "name": "Vitae: Torpor", "text": "<p>Torpor (0 Vitae, packet p.86): you can't move, speak or use powers and look freshly dead. You lose all Quickening and gain none. When fed you wake at once, but must pass Self-Control at Difficulty 5 or go into hunger frenzy.</p>", "effects": []}], "humanity": [{"value": 1, "name": "Humanity: Monstrous 3", "text": "<p>Monstrous 3 (packet p.113–117): −3 to connect with mortals, +3 to intimidate (vampires too); positive dealings with mortals fail automatically. Plainly undead. You can't resist hunger, fear or rage frenzy; +2 to resist an outburst; +1 on clan Discipline Power tests. Blush of Life gives no warmth or heartbeat; food comes straight back up.</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression"], "mode": "subtract", "value": 3, "predicates": ["situational"], "note": "connect with mortals"}, {"type": "dice", "targets": ["persuasion"], "mode": "add", "value": 3, "predicates": ["situational"], "note": "intimidate"}, {"type": "dice", "targets": [], "mode": "add", "value": 2, "predicates": ["situational"], "note": "resist an outburst"}, {"type": "dice", "targets": ["@clan"], "mode": "add", "value": 1, "predicates": []}]}, {"value": 2, "name": "Humanity: Monstrous 2", "text": "<p>Monstrous 2: −2 to connect with mortals, +2 to intimidate them. Visibly a corpse. +1 on clan Discipline Power tests. Food comes back up within turns and you stay nauseous; sex costs 1 extra Vitae and gives no pleasure.</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression"], "mode": "subtract", "value": 2, "predicates": ["situational"], "note": "connect with mortals"}, {"type": "dice", "targets": ["persuasion"], "mode": "add", "value": 2, "predicates": ["situational"], "note": "intimidate mortals"}, {"type": "dice", "targets": ["@clan"], "mode": "add", "value": 1, "predicates": []}]}, {"value": 3, "name": "Humanity: Monstrous 1", "text": "<p>Monstrous 1: −1 to connect with mortals, +1 to intimidate them. Something predatory unsettles people. You can't eat or drink (you vomit next scene and take −1 on all tests in it).</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression"], "mode": "subtract", "value": 1, "predicates": ["situational"], "note": "connect with mortals"}, {"type": "dice", "targets": ["persuasion"], "mode": "add", "value": 1, "predicates": ["situational"], "note": "intimidate mortals"}]}, {"value": 4, "name": null, "text": "", "effects": []}, {"value": 5, "name": "Humanity: Mortal 1", "text": "<p>Mortal 1: +1 to connect with mortals, −1 to intimidate them. Human with a slight pallor. One meal a night under Blush of Life.</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression"], "mode": "add", "value": 1, "predicates": ["situational"], "note": "connect with mortals"}, {"type": "dice", "targets": ["persuasion"], "mode": "subtract", "value": 1, "predicates": ["situational"], "note": "intimidate mortals"}]}, {"value": 6, "name": "Humanity: Mortal 2", "text": "<p>Mortal 2: +2 to connect with mortals, −2 to intimidate them; also with animals, powers included. Only a doctor could tell. Blush of Life is free, with heartbeat and breath. +1 to resist any frenzy (not outbursts).</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression", "survival", "animalism"], "mode": "add", "value": 2, "predicates": ["situational"], "note": "connect with mortals or animals"}, {"type": "dice", "targets": ["persuasion"], "mode": "subtract", "value": 2, "predicates": ["situational"], "note": "intimidate mortals"}, {"type": "dice", "targets": [], "mode": "add", "value": 1, "predicates": ["situational"], "note": "resist a frenzy"}]}, {"value": 7, "name": "Humanity: Mortal 3", "text": "<p>Mortal 3: +3 to connect with mortals, −3 to intimidate them. Seemingly alive. Two meals. −1 on all Discipline Power tests; sunlight burns every other turn; fire damage one category lower. +2 to resist any frenzy, but you can't resist an outburst.</p>", "effects": [{"type": "dice", "targets": ["persuasion", "expression"], "mode": "add", "value": 3, "predicates": ["situational"], "note": "connect with mortals"}, {"type": "dice", "targets": ["persuasion"], "mode": "subtract", "value": 3, "predicates": ["situational"], "note": "intimidate mortals"}, {"type": "dice", "targets": [], "mode": "add", "value": 2, "predicates": ["situational"], "note": "resist a frenzy"}, {"type": "dice", "targets": ["@all"], "mode": "subtract", "value": 1, "predicates": []}]}]}
const V6A_DEFAULTS = {
  costs: true, bonuses: true, situational: true, vitae: true, quickening: true,
  humanity: true, maturing: true, clanSetup: true
}
const V6A_LABELS = {
  costs: ['Pay power costs', 'Deduct Vitae or Willpower when a power with a cost is rolled.'],
  bonuses: ['Merit bonuses', 'Merits and clan traits with a known passive bonus get a matching condition the roll dialog can use.'],
  situational: ['Hide unrelated toggles', 'In the roll dialog, hide our bonus toggles whose Skill, Attribute or Discipline is not part of the roll.'],
  vitae: ['Vitae thresholds', 'Keep a Satisfied / Thirsty / Hungry / Torpor condition on each vampire.'],
  quickening: ['Hunger Quickening', 'Give the player 1 Quickening on entering Thirsty and 2 on entering Hungry.'],
  humanity: ['Humanity stages', 'Keep the Humanity Scale stage conditions on each vampire.'],
  maturing: ['Maturing notes', 'Post a chat note when new Discipline dots mature a power.'],
  clanSetup: ['Clan setup', 'Dropping a clan on a vampire shows its in-clan Disciplines and fills in the clan name.']
}

// Alpha 1 systems that Alpha 2 removed (Vitae thresholds, Quickening, Humanity Scale).
const V6A_ALPHA1_ONLY = ['vitae', 'quickening', 'humanity']

function v6aSetting (key) {
  if (V6A_ALPHA1_ONLY.includes(key) && typeof a2Enabled === 'function' && a2Enabled()) return false
  try {
    if (game.settings.settings.has(`${V6A_MOD}.${key}`)) return game.settings.get(V6A_MOD, key)
  } catch (e) { /* not registered (macro mode) */ }
  return V6A_DEFAULTS[key]
}

function v6aRegisterSettings () {
  for (const [key, [name, hint]] of Object.entries(V6A_LABELS)) {
    game.settings.register(V6A_MOD, key, { name, hint, scope: 'world', config: true, type: Boolean, default: V6A_DEFAULTS[key] })
  }
  if (typeof a2RegisterSettings === 'function') a2RegisterSettings(V6A_MOD, 'alpha2')
}

// The system's own module files, loaded from the same URL the system uses, so we
// patch the very classes its sheets call.
function v6aSystemUrl (path) {
  const tag = [...document.querySelectorAll('script[type="module"]')].find((s) => /\/wod6e\/system\/main\.js(\?|$)/.test(s.src))
  const base = tag ? tag.src.replace(/main\.js(\?.*)?$/, '') : foundry.utils.getRoute('systems/wod6e/system/')
  return new URL(path, base).href
}

const v6aIsGM = () => game.user === game.users.activeGM
const v6aAllDisciplines = () => Object.keys(WOD6E?.configs?.Disciplines?.getList?.({}) ?? {})
const v6aClanDisciplines = (actor) => [...(actor.items.find((i) => i.type === 'clan')?.system?.disciplines ?? [])]

// The roll dialog matches full trait paths (system.skills.persuasion), so bare keys are mapped.
function v6aPath (t) {
  if (t.includes('.') || t.includes(':')) return t
  for (const cfg of ['Attributes', 'Skills', 'Disciplines']) {
    const def = WOD6E?.configs?.[cfg]?.getList?.({})?.[t]
    if (def) return def.path ?? t
  }
  return t
}

function v6aEffect (e, actor, item = null) {
  if (typeof a2bEffect === 'function') { e = a2bEffect(e, actor, item); if (!e) return null }
  let targets = e.targets ?? []
  if (targets.includes('@clan')) targets = v6aClanDisciplines(actor)
  else if (targets.includes('@all')) targets = v6aAllDisciplines()
  targets = targets.map(v6aPath)
  return {
    type: e.type ?? 'dice', targets, mode: e.mode ?? 'add', value: Number(e.value) || 0,
    valueSource: e.valueSource ?? 'flat', valueTrait: e.valueTrait ?? '',
    predicates: e.predicates ?? [], exclusions: e.exclusions ?? []
  }
}

// ---- condition bookkeeping -------------------------------------------------
// Every condition we create carries flags.world.v6auto = { kind, source, sig }.
function v6aDesired (actor) {
  const out = [] // { kind, source, name, img, description, effects }
  if (v6aSetting('bonuses')) {
    for (const item of actor.items) {
      if (item.type === 'condition') continue
      const auto = item.getFlag('world', 'v6auto')
      if (!auto?.effects?.length) continue
      auto.effects.forEach((e, i) => {
        const eff = v6aEffect(e, actor, item)
        if (!eff) return
        out.push({
          kind: 'bonus', source: `${item.id}:${i}`,
          name: auto.effects.length > 1 && e.note ? `${auto.label ?? item.name} (${e.note})` : (auto.label ?? item.name),
          img: 'icons/svg/upgrade.svg',
          description: `<p>Automatic bonus from <strong>${item.name}</strong>. Remove the item to remove this.</p>`,
          effects: [eff]
        })
      })
    }
  }
  if (actor.type === 'vampire') {
    if (v6aSetting('vitae')) {
      const v = Number(actor.system.health?.value ?? 0)
      const t = V6A_STAGES.vitae.find((s) => v >= s.min && v <= s.max)
      if (t) v6aStage(out, actor, 'vitae', t, 'icons/svg/blood.svg')
    }
    if (v6aSetting('humanity')) {
      const h = Number(actor.system.vampire?.humanity?.value ?? 0)
      const s = V6A_STAGES.humanity.find((x) => x.value === h)
      if (s?.name) v6aStage(out, actor, 'humanity', s, 'icons/svg/heal.svg')
    }
  }
  return out
}

function v6aStage (out, actor, kind, stage, img) {
  const base = { kind, img, description: stage.text, stage: stage.key ?? stage.value }
  if (!stage.effects.length) { out.push({ ...base, source: `${kind}:0`, name: stage.name, effects: [] }); return }
  stage.effects.forEach((e, i) => {
    const eff = v6aEffect(e, actor)
    if (!eff.targets.length && (e.targets ?? []).some((t) => t.startsWith('@'))) return // no clan yet
    out.push({ ...base, source: `${kind}:${i}`, name: e.note ? `${stage.name} (${e.note})` : stage.name, effects: [eff] })
  })
  if (!out.some((d) => d.kind === kind)) out.push({ ...base, source: `${kind}:0`, name: stage.name, effects: [] })
}

const v6aPending = new Map()
function v6aQueueSync (actor) {
  if (!actor || !v6aIsGM()) return
  clearTimeout(v6aPending.get(actor.uuid))
  v6aPending.set(actor.uuid, setTimeout(() => { v6aPending.delete(actor.uuid); v6aSync(actor).catch((e) => console.error('V6 Automation |', e)) }, 150))
}

async function v6aSync (actor) {
  const want = v6aDesired(actor)
  const have = actor.items.filter((i) => i.type === 'condition' && i.getFlag('world', 'v6auto'))
  const key = (d) => `${d.kind}|${d.source}`
  const haveByKey = new Map(have.map((i) => [`${i.flags.world.v6auto.kind}|${i.flags.world.v6auto.source}`, i]))
  const create = []; const update = []; const keep = new Set()
  const oldVitae = have.find((i) => i.flags.world.v6auto.kind === 'vitae')?.flags.world.v6auto.stage
  for (const d of want) {
    const sig = JSON.stringify([d.name, d.effects, d.description])
    const flags = { world: { v6auto: { kind: d.kind, source: d.source, stage: d.stage ?? null, sig } } }
    const ex = haveByKey.get(key(d))
    if (ex) {
      keep.add(ex.id)
      if (ex.flags.world.v6auto.sig !== sig) update.push({ _id: ex.id, name: d.name, 'system.description': d.description, 'system.effects': d.effects, flags })
    } else {
      create.push({ name: d.name, type: 'condition', img: d.img, system: { description: d.description, condition: { duration: 'none' }, effects: d.effects }, flags })
    }
  }
  const remove = have.filter((i) => !keep.has(i.id)).map((i) => i.id)
  if (remove.length) await actor.deleteEmbeddedDocuments('Item', remove)
  if (update.length) await actor.updateEmbeddedDocuments('Item', update)
  if (create.length) await actor.createEmbeddedDocuments('Item', create)

  // Hunger Quickening when entering Thirsty or Hungry from a better threshold.
  const newVitae = want.find((d) => d.kind === 'vitae')?.stage
  const order = ['satisfied', 'thirsty', 'hungry', 'torpor']
  if (v6aSetting('quickening') && oldVitae && newVitae && order.indexOf(newVitae) > order.indexOf(oldVitae)) {
    const gain = V6A_STAGES.vitae.find((s) => s.key === newVitae)?.quickening ?? 0
    const player = game.users.find((u) => !u.isGM && u.character?.id === actor.id)
    if (gain && player) {
      try {
        const { adjustQuickening } = await import(v6aSystemUrl('core/scripts/quickening.js'))
        await adjustQuickening(player, gain)
      } catch (e) { console.warn('V6 Automation | Quickening', e) }
    }
  }
}

// ---- power costs and roll-dialog filtering ---------------------------------
async function v6aPatchRollDialog () {
  const { RollDialog } = await import(v6aSystemUrl('core/dialogs/roll-dialog.js'))
  if (RollDialog.__v6a) return
  RollDialog.__v6a = true

  const open = RollDialog.open
  RollDialog.open = async function (input = {}) {
    const item = input instanceof Item ? input : (input?.item ?? null)
    const result = await open.call(this, input)
    if (item && result instanceof Roll && v6aSetting('costs')) await v6aPayCost(item)
    return result
  }

  const prep = RollDialog._prepareConditionEffects
  RollDialog._prepareConditionEffects = function (actor, test, data) {
    const list = prep.call(this, actor, test, data)
    if (!v6aSetting('situational')) return list
    const inRoll = new Set([test?.attribute, test?.skill, test?.discipline].flat().filter(Boolean))
    if (test?.category) inRoll.add(`category:${test.category}`)
    const prepared = new Map((actor.preparedEffects?.effects ?? []).map((e) => [e.effectId, e]))
    return list.filter((e) => {
      const p = prepared.get(e.id)
      if (!p || e.normallyApplies || e.enabled) return true
      if (!actor.items.get(p.sourceId)?.getFlag('world', 'v6auto')) return true
      const targets = [...(p.targets ?? [])]
      return !targets.length || targets.some((t) => inRoll.has(t))
    })
  }
}

async function v6aPayCost (item) {
  const actor = item.actor
  if (!actor) return
  const base = item.system?.activation?.cost
  const costs = typeof a2xItemCosts === 'function' && typeof a2Enabled === 'function' && a2Enabled()
    ? a2xItemCosts(item.system, item.flags) // cost + extras marked "part of the cost" (PG p.149)
    : { [base?.type]: Number(base?.amount) || 0 }
  const upd = {}
  const paid = []
  for (const [type, label] of [['health', 'Vitae'], ['willpower', 'Willpower']]) {
    const amount = Number(costs[type]) || 0
    if (!amount) continue
    const current = Number(foundry.utils.getProperty(actor, `system.${type}.value`) ?? 0)
    if (current < amount) ui.notifications.warn(`${actor.name} has only ${current} ${label} for ${item.name} (cost ${amount}).`)
    upd[`system.${type}.value`] = Math.max(current - amount, 0)
    paid.push(`${Math.min(amount, current)} ${label}`)
  }
  if (!paid.length) return
  await actor.update(upd)
  ui.notifications.info(`${item.name}: paid ${paid.join(' and ')}.`)
}

// ---- hooks --------------------------------------------------------------
function v6aHooks () {
  const onItem = (item) => { if (item.parent instanceof Actor && item.type !== 'condition') v6aQueueSync(item.parent) }
  Hooks.on('createItem', onItem)
  Hooks.on('deleteItem', onItem)
  Hooks.on('updateItem', (item, changes) => { if (item.parent instanceof Actor && item.type !== 'condition' && (changes.flags || changes.system)) v6aQueueSync(item.parent) })

  Hooks.on('createItem', async (item) => {
    if (!v6aIsGM() || item.type !== 'clan' || !(item.parent instanceof Actor) || !v6aSetting('clanSetup')) return
    const actor = item.parent
    const upd = { 'system.vampire.clan.name': item.name }
    for (const key of item.system?.disciplines ?? []) upd[`system.vampire.disciplines.${key}.visible`] = true
    await actor.update(upd)
  })

  Hooks.on('preUpdateActor', (actor, changes, options) => {
    const disc = changes?.system?.vampire?.disciplines
    if (!disc) return
    options.v6aOldDisc = Object.fromEntries(Object.keys(disc).map((k) => [k, actor.system.vampire?.disciplines?.[k]?.value ?? 0]))
  })
  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    const s = changes?.system
    if (s && (s.health || s.vampire?.humanity || s.vampire?.disciplines)) v6aQueueSync(actor)
    if (options.v6aOldDisc && v6aSetting('maturing') && game.user.id === userId) await v6aMaturing(actor, options.v6aOldDisc)
  })
}

async function v6aMaturing (actor, old) {
  const lines = []
  for (const [key, before] of Object.entries(old)) {
    const now = actor.system.vampire?.disciplines?.[key]?.value ?? 0
    if (now <= before) continue
    for (const power of actor.items.filter((i) => i.type === 'discipline' && i.system?.disciplineType === key)) {
      for (const m of power.system?.maturing ?? []) {
        if (m.level > before && m.level <= now) lines.push(`<li><strong>${power.name}</strong> (${m.level} dots): ${m.description}</li>`)
      }
    }
  }
  if (!lines.length) return
  const whisper = [...new Set([...game.users.filter((u) => u.isGM), ...game.users.filter((u) => actor.testUserPermission(u, 'OWNER'))].map((u) => u.id))]
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper, content: `<div class="wod6e chat-card"><h4 class="chat-card-name">Powers matured</h4><ul>${lines.join('')}</ul></div>` })
}

async function v6aBoot () {
  globalThis.V6Automation ??= {}
  if (globalThis.V6Automation.active) {
    // An older copy may be running without the Alpha 2 part: add it.
    if (typeof a2Boot === 'function' && !globalThis.V6Alpha2?.booted) { a2EnsureSettings(); if (a2Enabled()) await a2Boot() }
    ui.notifications.info('V6 Automation is already running.')
    return
  }
  globalThis.V6Automation.active = true
  globalThis.V6Automation.sync = (actor) => v6aSync(actor)
  globalThis.V6Automation.syncAll = async () => { for (const a of game.actors) if (a.type !== 'group') await v6aSync(a) }
  try { await v6aPatchRollDialog() } catch (e) { console.error('V6 Automation | roll dialog patch failed', e); ui.notifications.warn('V6 Automation: power costs and toggle filtering are off (see console).') }
  v6aHooks()
  if (typeof a2Boot === 'function') { a2EnsureSettings(); if (a2Enabled()) await a2Boot() }
  if (v6aIsGM()) { for (const a of game.actors) if (a.type !== 'group') await v6aSync(a).catch((e) => console.error('V6 Automation |', a.name, e)) }
  console.log('V6 Automation | ready')
  ui.notifications.info('V6 Automation is running.')
}

// ---------------------------------------------------------------------------
// Alpha 2.0 rules for the wod6e system 1.0.11 (built for the V6 Alpha 1.0
// playtest). Part of V6 Automation: build_automation.py appends this file to
// automation-core.js, and v6aBoot calls a2Boot() while the "Alpha 2 rules"
// setting is on. With the setting off, every patch falls through to the
// system's own behaviour.
//
// Page numbers: PG = Alpha 2.0 Player Guide, ST = Alpha 2.0 Storyteller Packet.
//  - Dice (PG 93-98, 103): the full pool is rolled, 6+ is a success, a 10 counts
//    as 2, you win at successes >= Difficulty, contested rolls show the margin,
//    Hunger dice replace normal dice, painful / bestial failure, Beast's Bargain,
//    Taking Half. Overqualified and Quickening are gone.
//  - Actors of type "vampire" (PCs and fully statted NPCs, PG 99-105):
//    Health = Stamina + 5 in flags.world.a2.health, system.health stays the
//    Vitae track (max 5 + 5 x generation modifier, ghouls 5), Willpower =
//    Composure + Resolve, Hunger dice from the Hunger Dice per Vitae table.
//    flags.world.a2.creature picks the blood rules (vampire, ghoul, mortal,
//    animal, other).
//  - Humanity / Paths (PG 125-129): one 10-box tracker drawn from
//    system.vampire.humanity.value (rank) and system.vampire.nature.value
//    (violations), the convention of the Alpha 2 Paths data.
//  - The system's "npc" actor type rolls its level pools with the same dice.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry, ChatMessage, Actor, CONFIG, WOD6E, fromUuidSync */

const A2_SETTING_KEYS = [['v6-automation', 'alpha2'], ['wod6e', 'v6aAlpha2']]
const A2_SETTING = {
  name: 'Alpha 2 rules (V6 Automation)',
  hint: 'Play by the VtM V6 Alpha 2.0 rules: full pool rolled, 6+ succeeds, 10 counts as 2, Difficulty = successes needed, Hunger dice, Taking Half, separate Health, 10-box Humanity. Off = the system\'s Alpha 1 behaviour.',
  scope: 'world',
  config: true,
  type: Boolean,
  default: true
}
const A2_HUNGER = 'Hunger'
const A2_CREATURES = ['vampire', 'ghoul', 'mortal', 'animal', 'other']
// What each creature gets under Alpha 2. Ghouls are mortals with 5 Vitae and
// no Hunger dice (PG 102-103, 136); mortals and animals have no Vitae; only
// vampires (and Duskborn) have a generation modifier and Humanity (PG 28, 50, 99).
const A2_CREATURE_RULES = {
  vampire: { vitae: true, hunger: true, surge: true, endurance: true, humanity: true, baneful: true, mendPerTurn: 'twice the generation modifier' },
  ghoul: { vitae: true, hunger: false, surge: false, endurance: false, humanity: false, baneful: false, mendPerTurn: '1' },
  mortal: { vitae: false, hunger: false, surge: false, endurance: false, humanity: false, baneful: false },
  animal: { vitae: false, hunger: false, surge: false, endurance: false, humanity: false, baneful: false },
  other: { vitae: false, hunger: false, surge: false, endurance: false, humanity: false, baneful: true }
}
// PG p.126 Humanity Ranks table; the Path items carry the same bands in
// flags.world.a2.tracker.rankBands and those win when present.
const A2_RANK_BANDS = [
  { ranks: [10, 10], modifier: 2, torpor: 'One day', torporExtended: 'One week' },
  { ranks: [8, 9], modifier: 1, torpor: 'One week', torporExtended: 'One month' },
  { ranks: [4, 7], modifier: 0, torpor: 'One month', torporExtended: 'One year' },
  { ranks: [2, 3], modifier: -1, torpor: 'One year', torporExtended: 'One decade' },
  { ranks: [1, 1], modifier: -2, torpor: 'One decade', torporExtended: 'One century' }
]
// Alpha 1 Humanity Scale position (system value 1-7: 1 = Monstrous 3,
// 4 = Neutral, 7 = Mortal 3) to Alpha 2 rank, per alpha2/paths-notes.md item 6.
const A2_ALPHA1_RANK = { 1: 1, 2: 3, 3: 5, 4: 6, 5: 8, 6: 9, 7: 10 }
const a2State = { pendingVs: new Map(), pendingPreset: new Map(), localVs: new Map(), RollDialog: null, booting: null }

// ---- pure helpers (no Foundry globals; unit-tested in test/alpha2.test.mjs) ----
// nothing there (null, undefined, an empty field) is the default, not 0
function a2Int (v, d = 0) { if (v === null || v === undefined || v === '') return d; const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : d }
// Remove a key from a document: Foundry 14 wants an operator, older versions the "-=" key.
// a2Unset(update, 'flags.world.a2.torpor') adds the right entry to an update object.
function a2Unset (upd, path) {
  const Op = globalThis.foundry?.data?.operators?.ForcedDeletion
  if (Op) upd[path] = new Op()
  else upd[path.replace(/\.([^.]+)$/, '.-=$1')] = null
  return upd
}
function a2Clamp (v, lo, hi) { return Math.min(Math.max(v, lo), Math.max(lo, hi)) }
function a2Half (n) { return Math.max(0, Math.ceil(a2Int(n) / 2)) }
function a2Esc (s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function a2Plural (n, one, many) { return `${n} ${n === 1 ? one : many}` }
function a2Signed (n) { return n > 0 ? `+${n}` : String(n) }

// Generation categories, PG p.28.
function a2GenModifier (generation) {
  const g = a2Int(generation, 13)
  if (g <= 5) return 4
  if (g <= 8) return 3
  if (g <= 10) return 2
  return 1
}

// Total Vitae, PG p.102: 5 + 5 x generation modifier; ghouls 5; others none.
function a2TotalVitae (creature, genMod) {
  if (creature === 'ghoul') return 5
  if (creature === 'vampire') return 5 + 5 * Math.max(0, a2Int(genMod))
  return null
}

// Hunger Dice per Vitae, PG p.103. One die per fifth of Total Vitae spent:
// neonate 10 / 9-8 / 7-6 / 5-4 / 3-2 / 1-0, ancilla 15 / 14-12 / ...,
// elder 20 / 19-16 / ... Ghouls (Total 5) have none.
function a2HungerFromVitae (vitae, total) {
  total = a2Int(total)
  if (total < 10) return 0
  const missing = total - a2Clamp(a2Int(vitae), 0, total)
  return a2Clamp(Math.ceil((missing * 5) / total), 0, 5)
}

// Health = Stamina + 5, PG p.99.
function a2HealthMax (stamina) { return Math.max(1, a2Int(stamina) + 5) }

// Split a pool into normal and Hunger dice (PG p.103) or Take Half (PG p.94).
function a2PlanDice (pool, hunger = 0, takeHalf = false) {
  pool = Math.max(0, a2Int(pool))
  if (takeHalf) {
    const half = a2Half(pool)
    return { pool, normal: 0, hunger: 0, half, formula: String(half) }
  }
  const h = Math.min(Math.max(0, a2Int(hunger)), pool)
  const n = pool - h
  const parts = []
  if (n) parts.push(`${n}d10cs>=6`)
  if (h) parts.push(`${h}d10cs>=6[${A2_HUNGER}]`)
  return { pool, normal: n, hunger: h, half: null, formula: parts.join(' + ') || '0' }
}

// 6+ is a success, a 10 counts as 2 (PG p.96).
function a2CountSuccesses (values = []) {
  return values.reduce((t, v) => t + (v >= 10 ? 2 : v >= 6 ? 1 : 0), 0)
}

// Categorise a test (PG 96-98, 103; ST p.14 for the Bargain).
function a2Classify ({
  normal = [], hunger = [], takeHalf = false, half = null, difficulty = 0, opponent = null,
  contested = false, tieWin = null, automaticSuccess = false, automaticFailure = false, basicSuccesses = 0
} = {}) {
  const dice = [...normal, ...hunger]
  const crits = takeHalf ? 0 : dice.filter((v) => v === 10).length
  const hungerOnes = takeHalf ? 0 : hunger.filter((v) => v === 1).length
  const rolled = takeHalf ? a2Int(half) : a2CountSuccesses(dice)
  const noDice = !takeHalf && dice.length === 0
  const successes = automaticFailure ? 0 : automaticSuccess ? Math.max(rolled, 1) : Math.max(rolled, a2Int(basicSuccesses))
  difficulty = Math.max(0, a2Int(difficulty))
  const opp = opponent === null || opponent === undefined || opponent === '' ? null : Math.max(0, a2Int(opponent))
  let mode
  let win
  let margin = null
  let tie = false
  if (opp !== null) {
    mode = 'contested'
    margin = successes - opp
    tie = margin === 0
    win = margin > 0 ? true : margin < 0 ? false : tieWin
  } else if (difficulty > 0) {
    mode = 'difficulty'
    margin = successes - difficulty
    win = margin >= 0
  } else {
    mode = contested ? 'contested' : 'open'
    win = null
  }
  if (automaticFailure || noDice) win = false
  else if (automaticSuccess) { win = true; if (margin !== null && margin < 0) margin = 0 } // a basic win gives no margin (PG p.19)
  tie = tie && win === null // still open after tieWin
  const painful = !takeHalf && !noDice && !automaticSuccess && !automaticFailure && successes === 0 && win !== true
  const bestial = hungerOnes > 0 && (win === false || painful)
  const bestialRisk = hungerOnes > 0 && !bestial && win === null
  const critical = win === true && crits > 0
  const beastsBargain = win === false && !painful && !bestial && !automaticFailure // TR3: an empty pool may take a Bargain
  let outcome
  let label
  if (win === true) { outcome = critical ? 'critical' : 'win'; label = takeHalf ? 'Win (Taking Half)' : critical ? 'Critical win' : 'Win' } else if (painful && bestial) { outcome = 'painful-bestial'; label = 'Painful and bestial failure' } else if (painful) { outcome = 'painful'; label = 'Painful failure' } else if (bestial) { outcome = 'bestial'; label = 'Bestial failure' } else if (win === false) { outcome = 'fail'; label = noDice || automaticFailure ? 'Automatic failure' : 'Failure' } else if (tie) { outcome = 'tie'; label = 'Tie' } else { outcome = 'open'; label = a2Plural(successes, 'success', 'successes') }
  return { successes, crits, hungerOnes, hungerDice: hunger.length, normalDice: normal.length, mode, win, tie, margin, opponent: opp, difficulty, painful, bestial, bestialRisk, critical, beastsBargain, noDice, takeHalf: Boolean(takeHalf), outcome, label }
}

// Contested test between two rolls (PG p.94): more successes wins; a tie goes
// to the higher Attribute, then to whoever started the contest.
function a2Compare (a = {}, b = {}, aInitiated = true) {
  const margin = a2Int(a.successes) - a2Int(b.successes)
  if (margin) return { margin, win: margin > 0, tieBreak: null }
  const aa = a2Int(a.attr)
  const ba = a2Int(b.attr)
  if (aa !== ba) return { margin, win: aa > ba, tieBreak: 'attribute' }
  return { margin, win: Boolean(aInitiated), tieBreak: 'initiator' }
}

// Damage to the Health track (PG 99-101). state = {value, baneful, max}.
function a2ApplyDamage (state = {}, amount = 0, { baneful = false, endurance = 0, noBaneful = false } = {}) {
  const max = Math.max(0, a2Int(state.max))
  let ban = a2Clamp(a2Int(state.baneful), 0, max)
  let value = a2Clamp(state.value === undefined || state.value === null ? max : a2Int(state.value), 0, max - ban)
  let dmg = Math.max(0, a2Int(amount))
  if (noBaneful) baneful = false // mortals have no fire / sunlight weakness (PG p.100)
  let reduced = 0
  if (dmg > 0 && !baneful && endurance > 0) {
    const after = Math.max(1, dmg - a2Int(endurance)) // Vampiric Endurance, never below 1
    reduced = dmg - after
    dmg = after
  }
  let vitaeLoss = 0
  let toBaneful = 0
  if (baneful) {
    const cross = Math.min(dmg, max - ban)
    ban += cross
    vitaeLoss = dmg - cross
  } else {
    const lose = Math.min(dmg, value)
    value -= lose
    const over = dmg - lose
    if (over > 0 && !noBaneful) { // Excessive Damage, PG p.100
      toBaneful = Math.min(over, max - ban)
      ban += toBaneful
      vitaeLoss = over - toBaneful
    }
  }
  value = Math.min(value, max - ban)
  return { value, baneful: ban, max, taken: dmg, reduced, toBaneful, vitaeLoss, massive: max > 0 && dmg >= 2 * max, allBaneful: max > 0 && ban >= max }
}

// Mend Health by spending Vitae, 1 Health per Vitae (PG p.99).
function a2Mend (state = {}, vitae = 0, limit = null) {
  const max = Math.max(0, a2Int(state.max))
  const ban = a2Clamp(a2Int(state.baneful), 0, max)
  const value = a2Clamp(a2Int(state.value), 0, max - ban)
  let spend = Math.max(0, a2Int(vitae))
  if (limit !== null && limit !== undefined) spend = Math.min(spend, Math.max(0, a2Int(limit)))
  spend = Math.min(spend, max - ban - value)
  return { value: value + spend, baneful: ban, max, spent: spend }
}

// Humanity tracker (PG 126-127): rank fills from the left, violations slash
// empty boxes from the right. A slash that would hit a filled box empties it
// (rank - 1) and erases all slashes; the rest of that act's marks go with them.
function a2HumanityNormalize (h = {}) {
  const rank = a2Clamp(a2Int(h.rank, 6), 0, 10)
  return { rank, violations: a2Clamp(a2Int(h.violations), 0, 10 - rank) }
}
function a2HumanityViolate (h = {}, n = 1) {
  let { rank, violations } = a2HumanityNormalize(h)
  let lost = 0
  for (let i = 0; i < Math.max(0, a2Int(n)); i++) {
    if (violations >= 10 - rank) {
      if (rank > 0) { rank--; lost++ }
      violations = 0
      break
    }
    violations++
  }
  return { rank, violations, lost }
}
function a2HumanityErase (h = {}, n = 1) {
  const { rank, violations } = a2HumanityNormalize(h)
  return { rank, violations: Math.max(0, violations - Math.max(0, a2Int(n))) }
}
function a2HumanitySetRank (h = {}, rank = 6) {
  return a2HumanityNormalize({ rank, violations: a2HumanityNormalize(h).violations })
}
function a2HumanityBoxes (h = {}) {
  const { rank, violations } = a2HumanityNormalize(h)
  return Array.from({ length: 10 }, (_, i) => (i + 1 <= rank ? 'filled' : i + 1 > 10 - violations ? 'violation' : 'empty'))
}
function a2RankBand (rank, bands = A2_RANK_BANDS) {
  const r = a2Int(rank)
  return (Array.isArray(bands) && bands.length ? bands : A2_RANK_BANDS).find((b) => r >= b.ranks[0] && r <= b.ranks[1]) ?? null
}
// Alpha 1 to Alpha 2 (paths-notes.md items 6-7). src = system.vampire.
function a2MigrateHumanityValues (src = {}, onPath = false) {
  const h = src.humanity ?? {}
  const max = a2Int(h.max, 7)
  const value = a2Int(h.value, 4)
  if (max === 10) {
    const rank = a2Clamp(value, 0, 10)
    return { status: 'alpha2', rank, violations: a2Clamp(a2Int(src.nature?.value), 0, 10 - rank) }
  }
  if (max !== 7 || !(value in A2_ALPHA1_RANK)) {
    return { status: 'ambiguous', reason: `Humanity ${value} of ${max} is not an Alpha 1 scale position (1-7 of 7)` }
  }
  const rank = A2_ALPHA1_RANK[value]
  const from = onPath ? 'nature' : 'beast'
  const old = a2Int(src[from]?.value)
  return { status: 'convert', rank, violations: a2Clamp(old, 0, 10 - rank), from: { value, max, slashesFrom: from, old } }
}

// Text for the roll dialog's pool line.
function a2PoolText (plan, { cap = null, difficulty = 0, rolling = (s) => `Rolling ${s}` } = {}) {
  if (plan.half !== null && plan.half !== undefined) return `Take Half: ${a2Plural(plan.half, 'success', 'successes')} (no roll)`
  if (!plan.pool) return 'No dice: automatic failure'
  let out = rolling(`${plan.pool}d10${plan.hunger ? ` (${plan.hunger} Hunger)` : ''}`)
  if (cap !== null && cap !== undefined) out += ` · capped at ${cap}`
  const d = a2Int(difficulty)
  if (d > 0 && plan.pool >= 2 * d) out += ' · automatic win allowed'
  return out
}

// ---- settings --------------------------------------------------------------
function a2Enabled () {
  try {
    for (const [ns, key] of A2_SETTING_KEYS) {
      if (game.settings.settings.has(`${ns}.${key}`)) return Boolean(game.settings.get(ns, key))
    }
  } catch (e) { /* settings not ready */ }
  return true
}

// Called from v6aRegisterSettings (module, init hook).
function a2RegisterSettings (ns = 'v6-automation', key = 'alpha2') {
  if (game.settings.settings.has(`${ns}.${key}`)) return
  game.settings.register(ns, key, { ...A2_SETTING, onChange: (v) => a2OnToggle(v) })
}

// Macro / World Scripter: no module namespace, so the switch lives in the
// system's settings tab (key wod6e.v6aAlpha2).
function a2EnsureSettings () {
  if (A2_SETTING_KEYS.some(([ns, key]) => game.settings.settings.has(`${ns}.${key}`))) return
  a2RegisterSettings('wod6e', 'v6aAlpha2')
}

async function a2SetEnabled (on) {
  a2EnsureSettings()
  const [ns, key] = A2_SETTING_KEYS.find(([n, k]) => game.settings.settings.has(`${n}.${k}`))
  await game.settings.set(ns, key, Boolean(on))
}

async function a2OnToggle (on) {
  if (on && !globalThis.V6Alpha2?.booted) { await a2Boot(); return }
  a2Quickening(Boolean(on))
  a2RefreshActors()
  if (!game.user.isGM) return
  // Back on: drop the Alpha 1 conditions again. Off: let V6 Automation rebuild them.
  if (on) await a2RemoveAlpha1Automation()
  else await globalThis.V6Automation?.syncAll?.()
}

function a2SystemUrl (path) {
  // eslint-disable-next-line no-undef
  if (typeof v6aSystemUrl === 'function') return v6aSystemUrl(path)
  return foundry.utils.getRoute(`systems/wod6e/system/${path}`)
}

// ---- actor reading ---------------------------------------------------------
function a2FromUuid (uuid) { try { return uuid ? fromUuidSync(uuid) : null } catch (e) { return null } }
function a2Creature (actor) {
  if (actor?.type === 'npc') return 'npc'
  if (actor?.type !== 'vampire') return null
  const c = actor.flags?.world?.a2?.creature
  return A2_CREATURES.includes(c) ? c : 'vampire'
}
function a2Rules (actor) { return A2_CREATURE_RULES[a2Creature(actor)] ?? null }
function a2NpcInfo (actor) { return actor?.flags?.world?.a2?.npc ?? null }
function a2ActorGenMod (actor) {
  return a2Creature(actor) === 'vampire' ? a2GenModifier(actor.system?.vampire?.generation?.value) : 0
}
function a2ActorVitaeTotal (actor) { return a2TotalVitae(a2Creature(actor), a2ActorGenMod(actor)) }
function a2ActorHunger (actor) {
  if (!a2Rules(actor)?.hunger) return 0
  const override = actor.flags?.world?.a2?.hungerOverride
  if (override !== null && override !== undefined && Number.isFinite(Number(override))) return a2Clamp(a2Int(override), 0, 5)
  return a2HungerFromVitae(actor.system?.health?.value, a2ActorVitaeTotal(actor))
}
function a2ActorHealth (actor) {
  const npc = a2NpcInfo(actor)
  const max = npc?.minion ? 1 : a2Int(npc?.healthMax) > 0 ? a2Int(npc.healthMax) : a2HealthMax(actor.system?.attributes?.stamina?.value) // a made NPC keeps the Health from the ST Packet's table
  const f = actor.flags?.world?.a2?.health ?? {}
  const baneful = a2Clamp(a2Int(f.baneful), 0, max)
  const value = a2Clamp(f.value === undefined || f.value === null ? max : a2Int(f.value), 0, max - baneful)
  return { value, baneful, max }
}
function a2ActorHumanity (actor) {
  const v = actor.system?.vampire ?? {}
  const migrated = a2Int(v.humanity?.max) === 10
  const rank = migrated ? a2Clamp(a2Int(v.humanity?.value), 0, 10) : (A2_ALPHA1_RANK[a2Int(v.humanity?.value)] ?? 6)
  const violations = migrated ? a2Clamp(a2Int(v.nature?.value), 0, 10 - rank) : 0
  return { rank, violations, migrated }
}
function a2PathInfo (actor) {
  const item = actor.items?.find((i) => i.type === 'nature') ?? null
  const flags = item?.flags?.world?.a2 ?? null
  const kind = flags?.kind ?? (/^(path|road) of /i.test(item?.name ?? '') ? 'path' : 'humanity')
  return { item, kind, name: kind === 'path' ? item.name : 'Humanity', bands: flags?.tracker?.rankBands ?? A2_RANK_BANDS, teachings: flags?.teachings ?? '' }
}
function a2NpcLevels (actor) {
  const tiers = globalThis.WOD6E?.configs?.NpcTiers?.getList?.({}) ?? {}
  const keys = tiers[actor.system?.tier]?.levels ?? ['value']
  const names = { value: 'Level', physical: 'Physical', social: 'Social', mental: 'Mental' }
  return keys.map((key) => ({ key, label: names[key] ?? key, value: a2Int(actor.system?.level?.[key]) }))
}
// The best "npc"-type level for an opposing pool: the largest applicable
// Attribute category, as NPCs resist powers (PG p.149).
function a2NpcBestLevel (actor, attributeKeys = []) {
  const levels = a2NpcLevels(actor)
  const defs = WOD6E?.configs?.Attributes?.getList?.({}) ?? {}
  const cats = new Set(attributeKeys.map((k) => defs[k]?.type).filter(Boolean))
  const pick = levels.filter((l) => cats.has(l.key))
  return (pick.length ? pick : levels).sort((a, b) => b.value - a.value)[0] ?? { key: 'value', label: 'Level', value: 0 }
}

// ---- data preparation ------------------------------------------------------
// Runs after WoDActor.prepareDerivedData (whose Vitae / Willpower maxima are the
// Alpha 1 ones). Derived data only: source values stay, so turning the
// setting off restores the system's numbers.
function a2PrepareActor (actor) {
  const rules = a2Rules(actor)
  if (!rules) return
  const s = actor.system
  if (s.willpower) {
    const c = Number(s.attributes?.composure?.value)
    const r = Number(s.attributes?.resolve?.value)
    if (Number.isFinite(c) && Number.isFinite(r)) {
      s.willpower.max = Math.max(0, c + r) // PG p.104
      s.willpower.value = a2Clamp(a2Int(s.willpower.value), 0, s.willpower.max - a2Int(s.willpower.disabled))
    }
  }
  const total = a2ActorVitaeTotal(actor)
  if (s.health && total !== null) {
    s.health.max = total
    // The system already clamped value to its Alpha 1 max (10 + Stamina); re-read the stored value.
    const stored = actor._source?.system?.health?.value
    s.health.value = a2Clamp(a2Int(stored ?? s.health.value), 0, total - a2Int(s.health.disabled))
  }
  if (!rules.surge) s.canBloodSurge = false
}

function a2PatchActorPrep () {
  const proto = CONFIG.Actor.documentClass.prototype
  if (Object.prototype.hasOwnProperty.call(proto, '__a2Prep')) return
  const orig = proto.prepareDerivedData
  proto.prepareDerivedData = function (...args) {
    const out = orig.apply(this, args) // the system's version is async, but its maxima are set before its first await
    // wod6e 1.0.11 saves a player character's default ownership from inside data prep; on a
    // brand-new actor that runs before it has an id and rejects unhandled. The next prep, after creation, does it properly.
    if (!this.id && out && typeof out.catch === 'function') out.catch(() => {})
    try { if (a2Enabled()) a2PrepareActor(this) } catch (e) { console.error('V6 Alpha 2 | data prep', this?.name, e) }
    return out
  }
  Object.defineProperty(proto, '__a2Prep', { value: true })
}

// ---- dice: WOD6eRoll ---------------------------------------------------------
const a2IsHungerTerm = (t) => (t?.options?.flavor ?? t?.flavor) === A2_HUNGER

function a2BuildTerms (roll) {
  const a2 = roll.options.a2
  let pool = Math.max(0, a2Int(roll.options.dicePool))
  if (a2.cap !== null && a2.cap !== undefined) pool = Math.min(pool, Math.max(0, a2Int(a2.cap)))
  const plan = a2PlanDice(pool, a2.hunger, a2.takeHalf)
  const RollCls = foundry.dice.Roll
  roll.terms = RollCls.parse(plan.formula, roll.data ?? {})
  if (typeof roll.resetFormula === 'function') roll.resetFormula()
  else roll._formula = RollCls.getFormula(roll.terms)
  for (const term of roll.dice ?? []) {
    // Dice So Nice reads this; plain Foundry ignores it.
    if (a2IsHungerTerm(term)) term.options.appearance = { colorset: 'bloodmoon', background: '#7a0000', foreground: '#ffffff', edge: '#3a0000', outline: '#000000' }
  }
  roll.options.dicePool = pool
  Object.assign(a2, { pool, normal: plan.normal, hungerDice: plan.hunger, half: plan.half, built: true })
}

function a2DieValues (roll) {
  const out = { normal: [], hunger: [] }
  for (const term of roll.dice ?? []) {
    const vals = (term.results ?? []).filter((r) => r.active !== false && !r.discarded).map((r) => r.result)
    ;(a2IsHungerTerm(term) ? out.hunger : out.normal).push(...vals)
  }
  return out
}

// World Scripter runs on ready, after the chat log drew its cards. Redraw the
// cards on screen so older messages get their Alpha 2 block and buttons too.
function a2RerenderChat () {
  if (!game.ready || typeof ui?.chat?.updateMessage !== 'function') return
  const ids = new Set([...document.querySelectorAll('[data-message-id]')].map((el) => el.dataset.messageId))
  for (const id of ids) {
    const m = game.messages?.get(id)
    if (m) Promise.resolve(ui.chat.updateMessage(m, { notify: false })).catch(() => { /* the card stays as drawn */ })
  }
}

function a2RollVerdict (roll, opp = null) {
  const a2 = roll.options?.a2 ?? {}
  const { normal, hunger } = a2DieValues(roll)
  const v = a2Classify({
    normal,
    hunger,
    takeHalf: a2.takeHalf,
    half: a2.half,
    difficulty: roll.options?.difficulty,
    opponent: opp ? opp.successes : a2.opponent,
    contested: a2.contested || Boolean(opp),
    tieWin: opp?.tieWin ?? null,
    automaticSuccess: roll.options?.automaticSuccess,
    automaticFailure: roll.options?.automaticFailure,
    basicSuccesses: roll.options?.basicSuccesses
  })
  // The Bargain means reaching out to the Beast: vampires only (PG p.98).
  if (a2.creature && a2.creature !== 'vampire') { v.beastsBargain = false; v.noBeast = true }
  return v
}

// Narrowest point: the roll keeps the system's class and options; a roll that
// carries options.a2 (set by the roll dialog patch) builds its own terms on
// evaluate and answers the system's getters by Alpha 2 rules. Rolls without
// options.a2 (older chat cards, setting off) behave exactly as before.
function a2PatchRoll (WOD6eRoll) {
  if (Object.prototype.hasOwnProperty.call(WOD6eRoll, '__a2')) return
  const proto = WOD6eRoll.prototype
  const wrapGetter = (key, fn) => {
    const orig = Object.getOwnPropertyDescriptor(proto, key)?.get
    Object.defineProperty(proto, key, {
      configurable: true,
      get () { return this.options?.a2?.built ? fn.call(this, orig) : orig?.call(this) }
    })
  }
  wrapGetter('rolledSuccesses', function () {
    return this.options.a2.takeHalf ? a2Int(this.options.a2.half) : a2CountSuccesses(this.results.map((r) => r.result))
  })
  wrapGetter('isSuccess', function () { const v = a2RollVerdict(this); return v.win === true || (v.win === null && v.successes > 0) })
  wrapGetter('isPainfulFailure', function () { return a2RollVerdict(this).painful })
  wrapGetter('canDevilsBargain', function () { return a2RollVerdict(this).beastsBargain })
  wrapGetter('isOverqualified', () => false) // replaced by Taking Half (PG p.7)
  wrapGetter('quickeningGained', () => 0) // Quickening is out (PG p.7)
  wrapGetter('result', function (orig) { return { ...orig.call(this), a2: a2RollVerdict(this) } })
  Object.defineProperty(proto, 'a2Verdict', { configurable: true, get () { return this.options?.a2?.built ? a2RollVerdict(this) : null } })

  for (const m of ['evaluate', 'evaluateSync']) {
    const orig = proto[m]
    if (typeof orig !== 'function') continue
    proto[m] = function (options = {}) {
      if (!this._evaluated && this.options?.a2 && !this.options.a2.built) a2BuildTerms(this)
      const out = orig.call(this, options)
      const fix = () => { if (this.options?.a2?.built) this._total = this.successes }
      if (out && typeof out.then === 'function') return out.then((r) => { fix(); return r })
      fix()
      return out
    }
  }
  const origTotal = proto._evaluateTotal
  if (typeof origTotal === 'function') {
    proto._evaluateTotal = function () { return this.options?.a2?.built ? this.successes : origTotal.call(this) }
  }
  Object.defineProperty(WOD6eRoll, '__a2', { value: true })
}

// Rolls made without the dialog (macros calling executeTest) still get Hunger.
function a2PatchTest (WOD6eTest) {
  if (Object.prototype.hasOwnProperty.call(WOD6eTest, '__a2')) return
  const exec = WOD6eTest.executeTest
  WOD6eTest.executeTest = function (args = {}) {
    if (a2Enabled() && args?.context) {
      args.context.quickeningSpent = 0
      if (!args.context.a2 && args.actor) args.context.a2 = { v: 2, hunger: a2ActorHunger(args.actor), takeHalf: false, contested: false, opponent: null, cap: null, attr: 0, notes: [] }
    }
    return exec.call(this, args)
  }
  Object.defineProperty(WOD6eTest, '__a2', { value: true })
}

// ---- roll dialog -----------------------------------------------------------
function a2PatchRollDialog (RD, WOD6eTest) {
  if (Object.prototype.hasOwnProperty.call(RD, '__a2')) return
  const getData = RD._getDataFromForm
  RD._getDataFromForm = function (form) {
    const data = getData.call(this, form)
    if (a2Enabled()) data.a2 = a2ReadControls(form)
    return data
  }
  const prep = RD._prepareContext
  RD._prepareContext = function (args = {}) {
    const res = prep.call(this, args)
    if (a2Enabled()) {
      try { a2AdjustContext(res, args, WOD6eTest) } catch (e) { console.error('V6 Alpha 2 | roll context', e) }
    }
    return res
  }
  const listen = RD._activateListeners
  RD._activateListeners = function (dialog, opts = {}) {
    const out = listen.call(this, dialog, opts)
    if (a2Enabled()) {
      try { a2InjectControls(this, dialog, opts) } catch (e) { console.error('V6 Alpha 2 | roll dialog', e) }
    }
    return out
  }
  Object.defineProperty(RD, '__a2', { value: true })
}

// Same sum as the system's _calculateDicePool, without subtracting Difficulty
// (PG p.7: no more reducing dice for Difficulty).
function a2RawPool (actor, data = {}) {
  const sum = (keys) => (keys ?? []).reduce((t, k) => t + (Number(foundry.utils.getProperty(actor, `${k}.effective`)) || 0), 0)
  return sum(data.attributes) + sum(data.skills) + sum(data.disciplines) +
    a2Int(data.itemModifier) + a2Int(data.customModifier) + (data.focus ? 1 : 0)
}

// -2 dice per impaired Attribute in the pool (PG p.105): Physical at 0 Health
// for vampires (PG p.101), Social and Mental at 0 Willpower (PG p.104).
function a2Impairment (actor, attributePaths = []) {
  if (actor?.type !== 'vampire') return 0
  const cats = new Set()
  if (a2Creature(actor) === 'vampire' && a2ActorHealth(actor).value === 0) cats.add('physical')
  if (a2Int(actor.system?.willpower?.max) > 0 && a2Int(actor.system?.willpower?.value) === 0) { cats.add('social'); cats.add('mental') }
  if (!cats.size) return 0
  const defs = WOD6E.configs.Attributes.getList({ usePath: true })
  return 2 * (attributePaths ?? []).filter((p) => cats.has(defs[p]?.type)).length
}

function a2TraitLabel (cfg, key) {
  const k = String(key).split('.').pop()
  return WOD6E?.configs?.[cfg]?.getList?.({})?.[k]?.displayName ?? k
}

// flags.world.a2.oppose on discipline items (PG p.149).
function a2OpposeInfo (item) {
  const o = item?.flags?.world?.a2?.oppose
  if (!o) return null
  const keys = (k) => (Array.isArray(o[k]) ? o[k].filter(Boolean).map((x) => String(x).split('.').pop()) : [])
  const out = { attributes: keys('attributes'), skills: keys('skills'), disciplines: keys('disciplines') }
  out.text = o.text || [
    ...out.attributes.map((k) => a2TraitLabel('Attributes', k)),
    ...out.skills.map((k) => a2TraitLabel('Skills', k)),
    ...out.disciplines.map((k) => a2TraitLabel('Disciplines', k))
  ].join(' + ') || 'see the power'
  return out
}

// The first targeted token's opposing pool.
function a2TargetInfo (oppose) {
  const token = [...(game.user?.targets ?? [])][0]
  const actor = token?.actor
  if (!actor || !oppose) return null
  const base = { name: token.name ?? actor.name, uuid: actor.uuid }
  if (actor.type === 'npc') {
    const best = a2NpcBestLevel(actor, oppose.attributes)
    return { ...base, pool: best.value, note: `${best.label} level`, level: best.key }
  }
  const sum = (cfg, keys) => keys.reduce((t, k) => {
    const p = WOD6E.configs[cfg].getList({})[k]?.path
    return t + (p ? a2Int(foundry.utils.getProperty(actor, `${p}.effective`)) : 0)
  }, 0)
  return { ...base, pool: sum('Attributes', oppose.attributes) + sum('Skills', oppose.skills) + sum('Disciplines', oppose.disciplines) }
}

// Dice for a test made in a frenzy (PG p.145). aim: 'serves' | 'unrelated' | ''.
function a2FrenzyDice (aim, genMod) {
  const g = Math.max(0, a2Int(genMod))
  return aim === 'serves' ? g : aim === 'unrelated' ? -2 * g : 0
}
function a2FrenzyAim (actor, aim) {
  const f = actor?.flags?.world?.a2?.frenzy
  if (!f || typeof f !== 'object' || !f.type || !aim) return { dice: 0, note: '' }
  const dice = a2FrenzyDice(aim, a2ActorGenMod(actor))
  return { dice, note: dice > 0 ? `${a2Cap(f.type)} frenzy, serves its aim: +${dice} dice (PG p.145).` : dice < 0 ? `${a2Cap(f.type)} frenzy, unrelated to its aim: −${-dice} dice (PG p.145).` : '' }
}
function a2Cap (s) { s = String(s ?? ''); return s ? s[0].toUpperCase() + s.slice(1) : s }

function a2ReadControls (form) {
  const box = form?.querySelector?.('.a2-controls')
  if (!box) return null
  const q = (k) => box.querySelector(`[data-a2="${k}"]`)
  const opp = q('opponent')?.value
  return {
    hunger: q('hunger') ? q('hunger').checked : false,
    takeHalf: Boolean(q('takeHalf')?.checked),
    contested: Boolean(q('contested')?.checked),
    opponent: opp === '' || opp === undefined || opp === null ? null : Math.max(0, a2Int(opp)),
    frenzy: Boolean(q('frenzy')?.checked),
    aim: q('aim')?.value || '',
    trueFaith: Boolean(q('trueFaith')?.checked),
    npcLevel: q('npcLevel')?.value ?? null,
    itemUuid: box.dataset.a2Item || null,
    vsMessage: box.dataset.a2Vs || null
  }
}

function a2AdjustContext (res, args, WOD6eTest) {
  const actor = args.actor ?? res?.actor
  const t = res?.test
  if (!actor || !t) return
  const data = args.data ?? {}
  const c = data.a2 ?? null
  const item = args.item ?? a2FromUuid(c?.itemUuid)
  const preset = c ? null : (a2State.pendingPreset.get(actor.uuid) ?? null)
  const notes = []

  // Quickening is out of the core game (PG p.7).
  t.quickeningSpent = 0
  t.canSpendQuickening = false
  t.showQuickening = false

  let raw
  let attr = Math.max(0, ...(t.attributeOptions ?? []).filter((o) => o.selected).map((o) => a2Int(o.value)))
  if (actor.type === 'npc') {
    // The system's npc type has no Attributes: roll a level as the pool.
    const levels = a2NpcLevels(actor)
    const key = c?.npcLevel ?? preset?.level ?? levels[0]?.key ?? 'value'
    const lvl = levels.find((l) => l.key === key) ?? levels[0] ?? { key: 'value', label: 'Level', value: 0 }
    raw = lvl.value + a2Int(data.itemModifier) + a2Int(data.customModifier)
    attr = a2Half(lvl.value) // ST p.42: Attribute rank = half the pool
    const label = `${lvl.label} (${lvl.value})`
    const none = game.i18n.localize('WOD6E.ROLL.NoTraitsSelected')
    t.testText = String(t.testText ?? '').startsWith(none) ? String(t.testText).replace(none, label) : `${label} · ${t.testText}`
  } else {
    raw = a2RawPool(actor, { ...data, focus: t.focus })
    const imp = a2Impairment(actor, t.attributes)
    if (imp) { raw -= imp; notes.push(`Impaired: −${imp} dice.`) }
  }
  // In a frenzy: + generation modifier on tests that serve its aim, −2 × the
  // modifier on tests that don't (PG p.145). The player says which this test is.
  const fz = a2FrenzyAim(actor, c?.aim)
  if (fz.dice) { raw += fz.dice; notes.push(fz.note) }
  // token states and one-off edges (alpha2-states)
  const sm = typeof a2zMods === 'function' ? a2zMods(actor, t) : null
  if (sm) { raw += sm.dice; notes.push(...sm.notes) }
  const tfRank = a2Int(a2NpcInfo(actor)?.trueFaith)
  const useTF = Boolean(c?.trueFaith) && tfRank > 0
  if (useTF) { raw += tfRank; notes.push(`True Faith +${tfRank} against the supernatural (ST p.28).`) }

  const et = {
    attribute: t.attributes, skill: t.skills, discipline: t.disciplines, action: t.action, category: t.category,
    dicePool: raw, difficulty: t.difficulty, conditionEffectIds: t.conditionEffectIds
  }
  WOD6eTest.applyEffects(actor, et)
  t.baseDicePool = raw // executeTest rebuilds the pool from this
  t.dicePool = et.dicePool

  const hungerAvailable = a2ActorHunger(actor)
  const hunger = (c ? Boolean(c.hunger) : true) ? hungerAvailable : 0
  const humanity = a2Rules(actor)?.humanity ? a2ActorHumanity(actor).rank : null
  const frenzy = Boolean(c?.frenzy) && humanity !== null
  const oppose = a2OpposeInfo(item)
  const target = oppose ? a2TargetInfo(oppose) : null
  const takeHalf = Boolean(c?.takeHalf)
  const pool = Math.max(0, frenzy ? Math.min(et.dicePool, humanity) : et.dicePool)
  const plan = a2PlanDice(pool, hunger, takeHalf)
  t.a2 = {
    v: 2,
    hunger,
    hungerAvailable,
    takeHalf,
    contested: c ? Boolean(c.contested) : Boolean(oppose),
    opponent: c?.opponent ?? null,
    cap: frenzy ? humanity : null,
    frenzy,
    attr,
    notes,
    oppose: oppose ? { ...oppose, target } : null,
    vsMessage: c?.vsMessage || null,
    itemUuid: item?.uuid ?? null,
    creature: a2Creature(actor),
    npc: Boolean(a2NpcInfo(actor)),
    trueFaith: useTF ? tfRank : 0
  }
  t.dicePoolText = a2PoolText(plan, {
    cap: t.a2.cap,
    difficulty: t.difficulty,
    rolling: (s) => game.i18n.format('WOD6E.ROLL.RollingString', { string: s })
  })
}

function a2InjectControls (RD, dialog, { actor, item } = {}) {
  const el = dialog?.element
  if (el && actor && typeof a2uClaim === 'function') a2uClaim(actor, dialog.id) // eslint-disable-line no-undef
  if (!el || !actor || el.querySelector('.a2-controls')) return
  const header = el.querySelector('.roll-dialog-header')
  if (!header) return
  const preset = a2State.pendingPreset.get(actor.uuid) ?? null
  a2State.pendingPreset.delete(actor.uuid)
  const vs = a2State.pendingVs.get(actor.uuid) ?? null
  a2State.pendingVs.delete(actor.uuid)
  const hunger = a2ActorHunger(actor)
  const humanity = a2Rules(actor)?.humanity ? a2ActorHumanity(actor).rank : null
  const oppose = a2OpposeInfo(item)
  const target = oppose ? a2TargetInfo(oppose) : null
  const tf = a2Int(a2NpcInfo(actor)?.trueFaith)
  const parts = []
  if (actor.type === 'npc') {
    const levels = a2NpcLevels(actor)
    parts.push(`<label title="The system's NPC level, rolled as the dice pool.">Pool <select data-a2="npcLevel">${levels.map((l) => `<option value="${l.key}"${l.key === preset?.level ? ' selected' : ''}>${a2Esc(l.label)} (${l.value})</option>`).join('')}</select></label>`)
  }
  if (hunger > 0) parts.push(`<label title="Hunger dice replace normal dice one for one and can't be rerolled with Willpower (PG p.103)."><input type="checkbox" data-a2="hunger" checked> Hunger dice (${hunger})</label>`)
  parts.push('<label title="No roll: successes = half the pool, rounded up. Not in stressful situations (PG p.94)."><input type="checkbox" data-a2="takeHalf"> Take Half</label>')
  parts.push(`<label title="Rolled against an opponent: whoever gets more successes wins (PG p.94)."><input type="checkbox" data-a2="contested"${oppose || vs ? ' checked' : ''}> Contested</label>`)
  parts.push(`<label title="The opponent's successes, if already known. The result then shows win or loss and the margin.">vs <input type="number" data-a2="opponent" min="0" step="1" value="${vs ? a2Int(vs.successes) : ''}" placeholder="–"> successes</label>`)
  if (humanity !== null) parts.push(`<label title="Resisting frenzy or keeping the Beast under control: you can't roll more dice than your Humanity or Path rank (PG p.126)."><input type="checkbox" data-a2="frenzy"> Resist frenzy (max ${humanity} dice)</label>`)
  const fz = actor.flags?.world?.a2?.frenzy
  if (fz && typeof fz === 'object' && fz.type && a2ActorGenMod(actor) > 0) {
    const g = a2ActorGenMod(actor)
    parts.push(`<label title="In a frenzy, tests that serve its aim get + the generation modifier, and tests unrelated to it take −2 × the modifier (PG p.145).">${a2Esc(a2Cap(fz.type))} frenzy <select data-a2="aim"><option value="">this test…</option><option value="serves">serves its aim (+${g})</option><option value="unrelated">is unrelated to its aim (−${2 * g})</option></select></label>`)
  }
  if (tf > 0) parts.push(`<label title="True Faith adds its rank to tests to defend against supernatural creatures and their powers (ST p.28)."><input type="checkbox" data-a2="trueFaith"> True Faith (+${tf})</label>`)
  if (oppose) {
    const tText = target ? ` · target ${a2Esc(target.name)}: ${target.pool} dice${target.note ? ` (${a2Esc(target.note)})` : ''}` : ' · no token targeted'
    parts.push(`<div class="a2-oppose">Oppose: ${a2Esc(oppose.text)}${tText}</div>`)
  }
  if (vs) parts.push(`<div class="a2-oppose">Against ${a2Esc(vs.name)}: ${a2Plural(a2Int(vs.successes), 'success', 'successes')}</div>`)
  const box = document.createElement('div')
  box.className = 'a2-controls'
  box.dataset.a2Item = item?.uuid ?? ''
  box.dataset.a2Vs = vs?.messageId ?? ''
  box.innerHTML = parts.join('')
  header.after(box)
  const diff = el.querySelector('.difficulty-section label')
  if (diff) diff.title = 'Alpha 2: the number of successes needed to win. The full pool is rolled (PG p.96).'
  box.addEventListener('change', () => RD._updatePreview(el, actor))
  RD._updatePreview(el, actor)
}

// ---- chat card ---------------------------------------------------------------
function a2RenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root || message?.isContentVisible === false) return
  const rolls = message.rolls ?? []
  if (!rolls.some((r) => r?.options?.a2?.built)) return
  root.querySelectorAll('.a2-result').forEach((e) => e.remove())
  const rollEls = root.querySelectorAll('.dice-roll')
  rolls.forEach((roll, i) => {
    if (!roll?.options?.a2?.built) return
    const el = rollEls[i] ?? null
    if (el) a2DecorateRoll(el, roll)
    const block = a2ResultBlock(message, roll)
    if (el) el.after(block)
    else (root.querySelector('.message-content') ?? root).append(block)
  })
}

function a2DecorateRoll (el, roll) {
  const a2 = roll.options.a2
  const f = el.querySelector('.dice-formula')
  if (f) f.textContent = a2.takeHalf ? `Taking Half: ${a2.pool} dice` : `${a2.pool}d10${a2.hungerDice ? ` (${a2.hungerDice} Hunger)` : ''} · 6+ succeeds, 10 counts 2`
  const dice = roll.dice ?? []
  el.querySelectorAll('.dice-tooltip .tooltip-part').forEach((part, j) => {
    const term = dice[j]
    if (!term) return
    const hunger = a2IsHungerTerm(term)
    if (hunger) part.classList.add('a2-hunger-part')
    const vals = []
    part.querySelectorAll('li').forEach((li) => {
      const v = parseInt(li.textContent, 10)
      if (!Number.isFinite(v)) return
      vals.push(v)
      if (hunger) li.classList.add('a2-hunger')
      if (v === 10) li.classList.add('a2-crit')
      if (hunger && v === 1) li.classList.add('a2-bestial')
    })
    const tot = part.querySelector('.part-total')
    if (tot) tot.textContent = String(a2CountSuccesses(vals))
  })
  el.querySelector('.dice-total')?.classList.add('a2-total', `a2-${a2RollVerdict(roll).outcome}`)
}

// Another roll this one is compared with: a linked opposition roll, a manual
// comparison (flags.world.a2vs) or a later roll that answered this one.
function a2FindOpponent (message, roll) {
  const a2 = roll.options.a2
  const id = a2.vsMessage || message.flags?.world?.a2vs || a2State.localVs.get(message.id) || null
  let other = id ? game.messages.get(id) : null
  if (!other) other = game.messages.contents.slice(-80).find((m) => m.id !== message.id && m.rolls?.some((r) => r?.options?.a2?.vsMessage === message.id)) ?? null
  if (!other || other.isContentVisible === false) return null
  const otherRoll = other.rolls?.find((r) => r?.options?.a2?.built)
  if (!otherRoll) return null
  const mine = { successes: a2Int(roll.total), attr: a2Int(a2.attr) }
  const theirs = { successes: a2Int(otherRoll.total), attr: a2Int(otherRoll.options.a2.attr) }
  const iStarted = (message.timestamp ?? 0) <= (other.timestamp ?? 0)
  return { message: other, roll: otherRoll, successes: theirs.successes, name: other.alias ?? other.speaker?.alias ?? 'opponent', compare: a2Compare(mine, theirs, iStarted), theirCritical: a2RollVerdict(otherRoll).crits > 0 }
}

function a2ResultBlock (message, roll) {
  const a2 = roll.options.a2
  const opp = a2FindOpponent(message, roll)
  const v = a2RollVerdict(roll, opp ? { successes: opp.successes, tieWin: opp.compare.win } : null)
  const { normal, hunger } = a2DieValues(roll)
  const chip = (x, h) => `<span class="a2-die${h ? ' a2-h' : ''}${x >= 6 ? ' a2-succ' : ''}${x === 10 ? ' a2-crit' : ''}${h && x === 1 ? ' a2-bestial' : ''}" title="${h ? 'Hunger die' : 'Normal die'}">${x}</span>`
  let detail
  if (v.mode === 'difficulty') detail = `${a2Plural(v.successes, 'success', 'successes')} vs Difficulty ${v.difficulty} · margin ${a2Signed(v.margin)}`
  else if (v.opponent !== null) detail = `${v.successes} vs ${opp ? a2Esc(opp.name) + ' ' : ''}${v.opponent} · margin ${a2Signed(v.margin)}`
  else detail = `${a2Plural(v.successes, 'success', 'successes')}${v.mode === 'contested' ? ' · contested: compare with the opposing roll' : ''}`
  const lines = []
  if (v.critical) lines.push(`Critical win: ${a2Plural(v.crits, 'ten', 'tens')} (extra benefits at the Storyteller's call, PG p.96).`)
  if (v.bestial) lines.push('Bestial failure: a Hunger die shows 1. The Beast lashes out: collateral damage, Feed the Beast (mark a violation), a Masquerade breach or a frenzy risk (PG p.103).')
  else if (v.bestialRisk) lines.push('A Hunger die shows 1: a bestial failure if this test is lost.')
  if (v.painful) lines.push('Painful failure: add a complication (PG p.97). No Beast\'s Bargain.')
  if (v.beastsBargain) lines.push(`Beast's Bargain possible: accept a Beast complication for a basic win (PG p.98)${a2Int(a2.hungerAvailable) >= 3 ? '. With 3 or more Hunger dice it can risk a hunger frenzy' : ''}.`)
  if (v.noDice) lines.push('No dice left: automatic failure (PG p.105).')
  if (a2.takeHalf) lines.push('Taking Half: no dice rolled (PG p.94).')
  if (a2.cap !== null && a2.cap !== undefined) lines.push(`Frenzy test: pool capped at rank ${a2.cap} (PG p.126).`)
  for (const n of a2.notes ?? []) lines.push(n)
  if (a2.oppose) lines.push(`Opposed by ${a2.oppose.text}${a2.oppose.target ? ` (${a2.oppose.target.name}: ${a2.oppose.target.pool} dice)` : ''}.`)
  if (opp?.compare.tieBreak === 'attribute') lines.push('Tie broken by the higher Attribute (PG p.94).')
  else if (opp?.compare.tieBreak === 'initiator') lines.push('Tie with equal Attributes: whoever started the contest wins (PG p.94).')
  else if (v.tie) lines.push('Tie: the higher Attribute wins, then whoever started the contest (PG p.94).')
  const speaker = ChatMessage.getSpeakerActor?.(message.speaker)
  if (speaker && a2NpcInfo(speaker) && a2Creature(speaker) === 'vampire' && (v.painful || (opp && opp.compare.win === false && opp.theirCritical))) {
    lines.push(`NPC vampire: a painful failure or a PC's critical win against it can set off a rage or clan frenzy (clan frenzy Difficulty ${3 + a2ActorGenMod(speaker)}, ST p.41).`)
  }
  const block = document.createElement('div')
  block.className = `a2-result a2-${v.outcome}`
  block.innerHTML = `${a2.takeHalf ? '' : `<div class="a2-dice">${normal.map((x) => chip(x, false)).join('')}${hunger.map((x) => chip(x, true)).join('')}</div>`}` +
    `<div class="a2-verdict"><strong>${a2Esc(v.label)}</strong> <span>${detail}</span></div>` +
    (lines.length ? `<ul class="a2-notes">${lines.map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul>` : '')
  const actions = document.createElement('div')
  actions.className = 'a2-actions'
  if (v.mode !== 'difficulty' && !opp) {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = '<i class="fa-solid fa-scale-balanced"></i> Compare'
    b.title = 'Compare with the opposing roll in chat'
    b.addEventListener('click', (ev) => { ev.preventDefault(); a2PromptCompare(message) })
    actions.append(b)
  }
  const target = a2FromUuid(a2.oppose?.target?.uuid)
  if (target?.isOwner && !opp && a2State.RollDialog) {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = `<i class="fa-solid fa-dice-d10"></i> Roll for ${a2Esc(a2.oppose.target.name)}`
    b.title = `Roll ${a2.oppose.text} for the target against this roll`
    b.addEventListener('click', (ev) => { ev.preventDefault(); a2RollForTarget(message, roll, target) })
    actions.append(b)
  }
  if (actions.childElementCount) block.append(actions)
  return block
}

function a2RollForTarget (message, roll, target) {
  const o = roll.options.a2.oppose
  a2State.pendingVs.set(target.uuid, { messageId: message.id, successes: a2Int(roll.total), name: message.alias ?? 'opponent' })
  if (target.type === 'npc') a2State.pendingPreset.set(target.uuid, { level: a2NpcBestLevel(target, o.attributes).key })
  if (typeof a2uHint === 'function') { // what the target resists, for its situational bonuses
    const src = a2FromUuid(roll.options.a2.itemUuid)
    a2uHint(target, { resist: src?.system?.disciplineType ? [src.system.disciplineType] : [], against: (typeof a2xSpeaker === 'function' ? a2xSpeaker(message)?.uuid : null) ?? null })
  }
  a2State.RollDialog.open({ actor: target, test: { attributes: o.attributes, skills: o.skills, disciplines: o.disciplines } })
}

async function a2PromptCompare (message) {
  const list = game.messages.contents.slice(-40).reverse().filter((m) => m.id !== message.id && m.isContentVisible !== false && m.rolls?.some((r) => r?.options?.a2?.built))
  if (!list.length) { ui.notifications.info('There is no other Alpha 2 roll in recent chat to compare with.'); return }
  const options = list.map((m) => {
    const r = m.rolls.find((x) => x?.options?.a2?.built)
    return `<option value="${m.id}">${a2Esc(m.alias)}: ${a2Plural(a2Int(r.total), 'success', 'successes')} (${new Date(m.timestamp).toLocaleTimeString()})</option>`
  }).join('')
  const id = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Compare contested rolls' },
    content: `<div class="form-group"><label>Opposing roll</label><select name="vs">${options}</select></div>`,
    ok: { label: 'Compare', callback: (ev, button) => button.form.elements.vs.value },
    rejectClose: false
  })
  if (!id) return
  const other = game.messages.get(id)
  a2State.localVs.set(message.id, id)
  a2State.localVs.set(id, message.id)
  if (message.isOwner) await message.setFlag('world', 'a2vs', id).catch(() => null)
  if (other?.isOwner) await other.setFlag('world', 'a2vs', message.id).catch(() => null)
  a2Rerender(message)
  if (other) a2Rerender(other)
}

function a2Rerender (message) { try { ui.chat?.updateMessage?.(message) } catch (e) { /* not in the log */ } }

function a2OnCreateMessage (message) {
  const id = message.rolls?.find((r) => r?.options?.a2?.vsMessage)?.options.a2.vsMessage
  const original = id ? game.messages.get(id) : null
  if (original) a2Rerender(original)
}

// ---- sheets ----------------------------------------------------------------
function a2RenderSheet (app, element) {
  if (!a2Enabled()) return
  const actor = app?.actor ?? app?.document
  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app?.element)
  if (!actor || !root) return
  try {
    if (actor.type === 'vampire') a2DecorateVampireSheet(app, root, actor)
    else if (actor.type === 'npc') a2DecorateNpcSheet(root, actor)
  } catch (e) { console.error('V6 Alpha 2 | sheet', actor.name, e) }
}

function a2Boxes (count, cls) { return Array.from({ length: count }, (_, i) => cls(i + 1)) }
function a2Grouped (buttons, size = 5) {
  const out = []
  for (let i = 0; i < buttons.length; i += size) out.push(`<div class="resource-tracker-group">${buttons.slice(i, i + size).join('')}</div>`)
  return out.join('')
}
function a2On (el, type, fn) {
  el?.addEventListener(type, (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(ev) })
}

function a2DecorateVampireSheet (app, root, actor) {
  const editable = Boolean(app?.isEditable ?? actor.isOwner)
  const creature = a2Creature(actor)
  const rules = A2_CREATURE_RULES[creature]
  const hw = root.querySelector('[data-actor-section="healthWillpower"]')
  if (hw) {
    hw.querySelectorAll('.a2-health-row').forEach((e) => e.remove())
    const vitae = hw.querySelector('.health-section')
    if (vitae) a2DecorateVitae(vitae, actor, rules, creature)
    hw.append(a2HealthRow(actor, editable, rules, creature))
  }
  const hs = root.querySelector('[data-actor-section="humanityScale"]')
  if (hs) {
    hs.classList.add('a2-on')
    hs.querySelectorAll('.a2-humanity').forEach((e) => e.remove())
    hs.append(a2HumanityTracker(actor, editable, rules, creature))
  }
}

function a2DecorateVitae (section, actor, rules, creature) {
  section.classList.toggle('a2-na', !rules.vitae)
  const header = section.querySelector('.resource-tracker-header')
  if (!header) return
  header.querySelectorAll('.a2-hunger-chip, .a2-na-label').forEach((e) => e.remove())
  if (!rules.vitae) {
    header.insertAdjacentHTML('beforeend', `<span class="a2-na-label">none (${a2Esc(creature)})</span>`)
    return
  }
  const total = a2ActorVitaeTotal(actor)
  const label = header.querySelector('.resource-tracker-label')
  if (label) label.title = creature === 'ghoul' ? 'Alpha 2: a ghoul holds 5 Vitae and has no Hunger dice (PG p.102-103).' : `Alpha 2: Vitae = 5 + 5 × generation modifier ${a2ActorGenMod(actor)} = ${total} (PG p.102).`
  if (rules.hunger) {
    const h = a2ActorHunger(actor)
    const pips = Array.from({ length: 5 }, (_, i) => `<i class="a2-pip${i < h ? ' on' : ''}"></i>`).join('')
    header.insertAdjacentHTML('beforeend', `<span class="a2-hunger-chip" title="Hunger dice from the Hunger Dice per Vitae table (PG p.103). Hunger frenzy Difficulty = ${h} (PG p.145).">Hunger ${h} ${pips}</span>`)
  }
}

function a2HealthRow (actor, editable, rules, creature) {
  const h = a2ActorHealth(actor)
  const mod = a2ActorGenMod(actor)
  const usable = h.max - h.baneful
  const buttons = a2Boxes(h.max, (pos) => {
    const crossed = pos > usable
    const cls = `resource-tracker-space a2-hbox${pos <= h.value ? ' filled' : ''}${crossed ? ' tracker-disabled' : ''}`
    const title = crossed ? 'Baneful damage (right-click to mend this box)' : `Set Health to ${pos} (right-click: baneful)`
    return `<button type="button" class="${cls}" data-pos="${pos}" title="${title}"></button>`
  })
  const notes = []
  if (creature === 'vampire') notes.push(`Vampiric Endurance: −${mod} damage per hit (minimum 1), not against baneful damage. Mend: 1 Health per Vitae, up to ${2 * mod} Vitae per turn (PG p.99).`)
  else if (creature === 'ghoul') notes.push('Ghoul: no Vampiric Endurance, fire and sunlight deal normal damage. Mend: 1 Vitae per turn (PG p.99). At 0 Health a ghoul dies.')
  else if (creature === 'other') notes.push('Other creature: whether it dies at 0 Health depends on what it is and on the cause (ST p.42).')
  else notes.push(`${creature === 'animal' ? 'Animal' : 'Mortal'}: no Vampiric Endurance or baneful damage. At 0 Health it dies (PG p.101).`)
  const status = a2ZeroHealthLines(actor, h)
  const npc = a2NpcInfo(actor)
  const opts = A2_CREATURES.map((c) => `<option value="${c}"${c === creature ? ' selected' : ''}>${c[0].toUpperCase()}${c.slice(1)}</option>`).join('')
  const row = document.createElement('section')
  row.className = 'a2-health-row'
  row.innerHTML = `
    <div class="resource-tracker a2-health-tracker">
      <header class="resource-tracker-header">
        <span class="resource-tracker-label" title="Alpha 2: Health = Stamina + 5 (PG p.99)">Health</span>
        <span class="resource-tracker-total">(${h.value} / ${usable}${h.baneful ? `, ${h.baneful} baneful` : ''})</span>
        ${editable ? `<span class="a2-tools"><a class="a2-act" data-a2-act="damage" title="Take damage (applies Vampiric Endurance)"><i class="fa-solid fa-burst"></i></a>${rules.vitae ? '<a class="a2-act" data-a2-act="mend" title="Spend Vitae to mend Health"><i class="fa-solid fa-droplet"></i></a>' : ''}</span>` : ''}
      </header>
      <div class="resource-tracker-spaces">${a2Grouped(buttons)}</div>
      <div class="a2-subnote">${notes.map(a2Esc).join(' ')}${status.length ? `<br><strong>${status.map(a2Esc).join(' ')}</strong>` : ''}</div>
    </div>
    <div class="a2-side">
      <label class="a2-creature" title="Alpha 2 blood rules for this actor (flags.world.a2.creature)">Creature <select ${editable && game.user.isGM ? '' : 'disabled'}>${opts}</select></label>
      ${npc ? `<div class="a2-npc-strip" title="${a2Esc(npc.notes ?? '')}">NPC${npc.role ? ` (${a2Esc(npc.role)})` : ''}${a2Int(npc.trueFaith) ? ` · True Faith ${a2Int(npc.trueFaith)}` : ''} <label title="Minion: Health 1 (ST p.43)"><input type="checkbox" class="a2-minion"${npc.minion ? ' checked' : ''}${editable ? '' : ' disabled'}> Minion</label></div>` : ''}
      <div class="a2-subnote">Willpower = Composure + Resolve (PG p.104). At 0 Willpower, Social and Mental Attributes are impaired (−2).${rules.surge ? '' : ' No Blood Surge.'}</div>
    </div>`
  if (!editable) return row
  row.querySelectorAll('.a2-hbox').forEach((btn) => {
    const pos = a2Int(btn.dataset.pos)
    a2On(btn, 'click', () => {
      const cur = a2ActorHealth(actor)
      if (pos > cur.max - cur.baneful) return
      a2WriteHealth(actor, { value: pos === cur.value ? pos - 1 : pos, baneful: cur.baneful })
    })
    a2On(btn, 'contextmenu', () => {
      const cur = a2ActorHealth(actor)
      const crossed = pos > cur.max - cur.baneful
      const baneful = crossed ? cur.max - pos : cur.max - pos + 1
      a2WriteHealth(actor, { value: Math.min(cur.value, cur.max - baneful), baneful })
    })
  })
  a2On(row.querySelector('[data-a2-act="damage"]'), 'click', () => a2PromptDamage(actor))
  a2On(row.querySelector('[data-a2-act="mend"]'), 'click', () => a2PromptMend(actor))
  const sel = row.querySelector('.a2-creature select')
  sel?.addEventListener('change', (ev) => { ev.stopPropagation(); actor.update({ 'flags.world.a2.creature': sel.value }) })
  const minion = row.querySelector('.a2-minion')
  minion?.addEventListener('change', (ev) => { ev.stopPropagation(); actor.update({ 'flags.world.a2.npc.minion': minion.checked }) })
  return row
}

function a2HumanityTracker (actor, editable, rules, creature) {
  const wrap = document.createElement('div')
  if (!rules.humanity) {
    wrap.className = 'resource-tracker a2-humanity a2-na'
    wrap.innerHTML = `<header class="resource-tracker-header"><span class="resource-tracker-label">Humanity</span><span class="a2-na-label">none (${a2Esc(creature)})</span></header><div class="resource-tracker-spaces">${a2Grouped(a2Boxes(10, () => '<button type="button" class="resource-tracker-space a2-square" disabled></button>'))}</div>`
    return wrap
  }
  const hum = a2ActorHumanity(actor)
  const path = a2PathInfo(actor)
  const band = a2RankBand(hum.rank, path.bands)
  const boxes = a2HumanityBoxes(hum)
  const buttons = boxes.map((state, i) => `<button type="button" class="resource-tracker-space a2-square${state === 'filled' ? ' filled' : ''}${state === 'violation' ? ' a2-violation' : ''}" data-pos="${i + 1}" title="${state === 'violation' ? 'Violation: click to erase it (right-click anywhere marks one)' : `Set rank ${i + 1} (right-click: mark a violation)`}"></button>`)
  const mod = band ? `${a2Signed(band.modifier)} dice${path.teachings ? ` on ${path.teachings}` : ''} and with humans` : 'wight (rank 0)'
  wrap.className = 'resource-tracker a2-humanity'
  wrap.innerHTML = `
    <header class="resource-tracker-header">
      <span class="resource-tracker-label" title="${a2Esc(path.teachings)}">${a2Esc(path.name)}</span>
      <span class="resource-tracker-total">(${hum.rank} / 10)</span>
      <span class="a2-subnote">${a2Plural(hum.violations, 'violation', 'violations')}</span>
    </header>
    <div class="resource-tracker-spaces">${a2Grouped(buttons)}</div>
    <div class="a2-subnote">Rank modifier ${a2Esc(mod)} (PG p.126). Frenzy tests: at most ${hum.rank} dice. Torpor: ${a2Esc(band?.torpor ?? '—')} (extended ${a2Esc(band?.torporExtended ?? '—')}).${hum.migrated ? '' : ' <strong>Not yet migrated: shown from the Alpha 1 scale.</strong>'}${editable ? '<br>Click: set rank. Right-click: mark a violation. Shift + right-click: erase one.' : ''}</div>`
  if (!editable) return wrap
  wrap.querySelectorAll('button[data-pos]').forEach((btn) => {
    const pos = a2Int(btn.dataset.pos)
    a2On(btn, 'click', (ev) => {
      const cur = a2ActorHumanity(actor)
      // A click on a slashed box erases that slash; it never sets the rank.
      if (pos > 10 - cur.violations) { a2WriteHumanity(actor, a2HumanityErase(cur, 1)); return }
      const rank = pos === cur.rank ? pos - 1 : pos
      if (rank > cur.rank && cur.violations && !ev?.shiftKey) {
        ui.notifications.warn('Alpha 2: you can\'t raise your rank while you have violations (PG p.127). Erase them first, or Shift-click to override.')
        return
      }
      a2WriteHumanity(actor, a2HumanitySetRank(cur, rank))
    })
    a2On(btn, 'contextmenu', (ev) => {
      const cur = a2ActorHumanity(actor)
      if (ev.shiftKey) { a2WriteHumanity(actor, a2HumanityErase(cur, 1)); return }
      a2Violate(actor, 1)
    })
  })
  return wrap
}

// The system's npc type: a dice button per level.
function a2DecorateNpcSheet (root, actor) {
  if (!actor.isOwner) return
  root.querySelectorAll('.npc-level-field').forEach((label) => {
    if (label.querySelector('.a2-roll')) return
    const input = label.querySelector('input[name^="system.level."]')
    if (!input) return
    const key = input.name.split('.').pop()
    const a = document.createElement('a')
    a.className = 'a2-roll'
    a.title = 'Roll this level as a dice pool (Alpha 2)'
    a.innerHTML = '<i class="fa-solid fa-dice-d10"></i>'
    a2On(a, 'click', () => { a2State.pendingPreset.set(actor.uuid, { level: key }); a2State.RollDialog?.open({ actor }) })
    label.append(a)
  })
}

// ---- actor writes ------------------------------------------------------------
function a2WriteHealth (actor, { value, baneful }, options = {}) {
  return actor.update({ 'flags.world.a2.health': { value: Math.max(0, a2Int(value)), baneful: Math.max(0, a2Int(baneful)) } }, options)
}

// Native fields, per the Alpha 2 Paths data: humanity.value = rank (max 10),
// nature.value = violations (max 10 - rank; the schema's minimum is 1).
function a2WriteHumanity (actor, h) {
  const { rank, violations } = a2HumanityNormalize(h)
  return actor.update({
    'system.vampire.humanity.max': 10,
    'system.vampire.humanity.value': rank,
    'system.vampire.nature.max': Math.max(1, 10 - rank),
    'system.vampire.nature.value': violations
  })
}

async function a2Violate (actor, n = 1) {
  const res = a2HumanityViolate(a2ActorHumanity(actor), n)
  await a2WriteHumanity(actor, res)
  if (res.lost) await a2Note(actor, `${actor.name}: ${a2PathInfo(actor).name}`, [`A violation hit a filled box: rank drops to ${res.rank} and all slashes are erased (PG p.127).`])
  return res
}

async function a2Note (actor, title, lines) {
  if (!lines?.length) return null
  const whisper = game.users.filter((u) => u.isGM || actor.testUserPermission(u, 'OWNER')).map((u) => u.id)
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper,
    content: `<div class="wod6e chat-card a2-note"><h4 class="chat-card-name">${a2Esc(title)}</h4><ul>${lines.map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul></div>`
  })
}

// What 0 Health or all-baneful means for this creature (PG 100-101, ST 41-42).
function a2ZeroHealthLines (actor, st) {
  const creature = a2Creature(actor)
  const out = []
  const allBaneful = st.max > 0 && st.baneful >= st.max
  if (creature === 'vampire') {
    const vitae = a2Int(actor.system?.health?.value)
    if (allBaneful) out.push(vitae > 0 ? 'All Health is baneful: torpor (PG p.100).' : 'All Health is baneful and no Vitae is left: Final Death (PG p.101).')
    else if (st.value === 0) out.push('0 Health: Physical Attributes impaired, −2 dice to pools using them, until 1 Health is regained (PG p.101).')
    if (a2NpcInfo(actor)) {
      if (allBaneful) out.push('NPC in torpor: further baneful damage can destroy it (ST p.42).')
      else if (st.value === 0) out.push(`NPC at 0 Health: it risks a hunger frenzy, Difficulty ${2 * a2ActorGenMod(actor)} (ST p.41).`)
    }
  } else if (st.value === 0) {
    out.push(creature === 'other' ? '0 Health: whether it dies depends on the creature and the cause (ST p.42).' : '0 Health: a mortal dies (PG p.101).')
  }
  return out
}

async function a2DamageActor (actor, amount, { baneful = false, note = true } = {}) {
  const rules = a2Rules(actor)
  if (!rules || actor.type !== 'vampire') return null
  const before = a2ActorHealth(actor)
  const res = a2ApplyDamage(before, amount, { baneful, endurance: rules.endurance ? a2ActorGenMod(actor) : 0, noBaneful: !rules.baneful })
  const upd = { 'flags.world.a2.health': { value: res.value, baneful: res.baneful } }
  let vitaeLost = 0
  if (res.vitaeLoss && rules.vitae) {
    const cur = a2Int(actor.system.health?.value)
    vitaeLost = Math.min(cur, res.vitaeLoss)
    upd['system.health.value'] = cur - vitaeLost
  }
  await actor.update(upd, { a2Damage: true })
  if (note) {
    const lines = [`${amount}${baneful && rules.baneful ? ' baneful' : ''} damage${res.reduced ? `, Vampiric Endurance −${res.reduced}` : ''}: Health ${res.value} of ${res.max - res.baneful}${res.baneful ? ` (${res.baneful} baneful)` : ''}.`]
    if (res.toBaneful) lines.push(`${res.toBaneful} damage past an empty track became baneful (PG p.100).`)
    if (res.vitaeLoss) lines.push(rules.vitae ? `All Health is baneful: ${vitaeLost} Vitae lost instead (PG p.100).` : `${res.vitaeLoss} damage past a fully baneful track.`)
    if (res.massive) lines.push('Massive damage (twice the maximum Health in one blow): Final Death in almost all cases (PG p.101).')
    lines.push(...a2ZeroHealthLines(actor, res))
    await a2Note(actor, `${actor.name}: damage`, lines)
  }
  return res
}

async function a2MendActor (actor, vitae) {
  const rules = a2Rules(actor)
  if (!rules?.vitae) return null
  const cur = a2Int(actor.system.health?.value)
  const res = a2Mend(a2ActorHealth(actor), Math.min(a2Int(vitae), cur))
  if (!res.spent) { ui.notifications.info(`${actor.name}: nothing to mend, or no Vitae.`); return res }
  await actor.update({ 'flags.world.a2.health': { value: res.value, baneful: res.baneful }, 'system.health.value': cur - res.spent })
  return res
}

async function a2PromptDamage (actor) {
  const rules = a2Rules(actor)
  const mod = rules?.endurance ? a2ActorGenMod(actor) : 0
  const hint = mod ? `Vampiric Endurance reduces normal damage by ${mod} (minimum 1). Baneful damage isn't reduced and crosses out boxes from the right.` : 'No Vampiric Endurance for this creature.'
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Damage: ${actor.name}` },
    content: `<div class="form-group"><label>Damage</label><input type="number" name="amount" value="1" min="1" step="1" autofocus></div>${rules?.baneful ? '<div class="form-group"><label><input type="checkbox" name="baneful"> Baneful (fire, sunlight, …)</label></div>' : ''}<p class="hint">${a2Esc(hint)}</p>`,
    ok: { label: 'Apply', callback: (ev, button) => ({ amount: button.form.elements.amount.valueAsNumber, baneful: Boolean(button.form.elements.baneful?.checked) }) },
    rejectClose: false
  })
  if (r && a2Int(r.amount) > 0) await a2DamageActor(actor, a2Int(r.amount), { baneful: r.baneful })
}

async function a2PromptMend (actor) {
  const h = a2ActorHealth(actor)
  const vitae = a2Int(actor.system.health?.value)
  const limit = a2Creature(actor) === 'vampire' ? 2 * a2ActorGenMod(actor) : 1
  const missing = h.max - h.baneful - h.value
  const def = Math.max(0, Math.min(limit, missing, vitae))
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Mend: ${actor.name}` },
    content: `<div class="form-group"><label>Vitae to spend</label><input type="number" name="vitae" value="${def}" min="0" max="${Math.min(missing, vitae)}" step="1" autofocus></div><p class="hint">1 Health per Vitae, at most ${limit} Vitae per turn as a minor action. Baneful boxes need 5 Vitae and 1 Willpower each, once per night (PG p.99-100).</p>`,
    ok: { label: 'Mend', callback: (ev, button) => button.form.elements.vitae.valueAsNumber },
    rejectClose: false
  })
  if (a2Int(r) > 0) await a2MendActor(actor, a2Int(r))
}

// Watch Health set from the sheet boxes (damage from a2DamageActor notes itself).
function a2PreUpdateActor (actor, changes, options) {
  if (!a2Enabled() || actor.type !== 'vampire') return
  if (foundry.utils.hasProperty(changes, 'flags.world.a2.health') || foundry.utils.hasProperty(changes, 'flags.world.a2.npc.minion')) options.a2OldHealth = a2ActorHealth(actor)
}
function a2UpdateActor (actor, changes, options, userId) {
  if (!options?.a2OldHealth || options.a2Damage || game.user.id !== userId) return
  const before = options.a2OldHealth
  const now = a2ActorHealth(actor)
  const hitZero = before.value > 0 && now.value === 0
  const allBaneful = now.baneful >= now.max && before.baneful < before.max
  if (hitZero || allBaneful) a2Note(actor, `${actor.name}: Health`, a2ZeroHealthLines(actor, now))
}

// ---- Humanity migration --------------------------------------------------------
// Sets humanity.max to 10 and converts the Alpha 1 position (paths-notes.md
// items 6-7). The old values are kept in flags.world.a2.alpha1Humanity so
// revertHumanity() can restore them. Ambiguous actors are reported, not changed.
async function a2MigrateHumanity ({ dryRun = false, actors = null } = {}) {
  const report = { converted: [], fixed: [], ambiguous: [], skipped: 0 }
  if (!game.user.isGM) return report
  for (const actor of actors ?? game.actors) {
    if (actor.type !== 'vampire' || !a2Rules(actor)?.humanity) { report.skipped++; continue }
    const v = actor.system.vampire ?? {}
    const onPath = a2PathInfo(actor).kind === 'path'
    const m = a2MigrateHumanityValues({ humanity: v.humanity, nature: v.nature, beast: v.beast }, onPath)
    if (m.status === 'ambiguous') { report.ambiguous.push(`${actor.name}: ${m.reason}`); continue }
    const natureMax = Math.max(1, 10 - m.rank)
    if (m.status === 'alpha2') {
      if (a2Int(v.nature?.max) !== natureMax || a2Int(v.nature?.value) !== m.violations) {
        if (!dryRun) await actor.update({ 'system.vampire.nature.max': natureMax, 'system.vampire.nature.value': m.violations })
        report.fixed.push(actor.name)
      }
      continue
    }
    if (!dryRun) {
      await actor.update({
        'system.vampire.humanity.max': 10,
        'system.vampire.humanity.value': m.rank,
        'system.vampire.nature.max': natureMax,
        'system.vampire.nature.value': m.violations,
        'system.vampire.beast.value': 0,
        'flags.world.a2.alpha1Humanity': {
          humanity: { value: a2Int(v.humanity?.value), max: a2Int(v.humanity?.max) },
          nature: { value: a2Int(v.nature?.value), max: a2Int(v.nature?.max) },
          beast: { value: a2Int(v.beast?.value), max: a2Int(v.beast?.max) },
          onPath,
          at: new Date().toISOString()
        }
      })
    }
    report.converted.push(`${actor.name}: Alpha 1 position ${m.from.value} → rank ${m.rank}, ${m.violations} violation(s) from ${m.from.slashesFrom}`)
  }
  return report
}

async function a2RevertHumanity () {
  const done = []
  if (!game.user.isGM) return done
  for (const actor of game.actors) {
    const old = actor.flags?.world?.a2?.alpha1Humanity
    if (!old) continue
    await actor.update(a2Unset({
      'system.vampire.humanity.max': Math.max(1, old.humanity.max),
      'system.vampire.humanity.value': old.humanity.value,
      'system.vampire.nature.max': Math.max(1, old.nature.max),
      'system.vampire.nature.value': old.nature.value,
      'system.vampire.beast.max': Math.max(1, old.beast.max),
      'system.vampire.beast.value': old.beast.value
    }, 'flags.world.a2.alpha1Humanity'))
    done.push(actor.name)
  }
  return done
}

function a2ReportMigration (rep) {
  if (rep.converted.length) console.log('V6 Alpha 2 | Humanity converted:\n' + rep.converted.join('\n'))
  if (rep.fixed.length) console.log('V6 Alpha 2 | violation tracker max fixed:', rep.fixed.join(', '))
  if (rep.ambiguous.length) {
    console.warn('V6 Alpha 2 | Humanity left unchanged (ambiguous):\n' + rep.ambiguous.join('\n'))
    ui.notifications.warn(`V6 Alpha 2: ${rep.ambiguous.length} actor(s) have a Humanity value that isn't an Alpha 1 scale position; left unchanged (see console).`)
  }
}

// ---- Alpha 1 leftovers -----------------------------------------------------------
// While Alpha 2 is on, v6aSetting() reports vitae / humanity / quickening as off,
// so v6aSync stops making those conditions. This also deletes the ones that exist
// and, with persist: true, switches the module settings off for good.
async function a2RemoveAlpha1Automation ({ deleteConditions = true, persist = false } = {}) {
  let removed = 0
  if (game.user.isGM) {
    if (persist) {
      for (const k of ['vitae', 'humanity', 'quickening']) {
        if (game.settings.settings.has(`v6-automation.${k}`) && game.settings.get('v6-automation', k)) await game.settings.set('v6-automation', k, false)
      }
    }
    if (deleteConditions) {
      for (const actor of game.actors) {
        const ids = actor.items.filter((i) => i.type === 'condition' && ['vitae', 'humanity'].includes(i.flags?.world?.v6auto?.kind)).map((i) => i.id)
        if (ids.length) { await actor.deleteEmbeddedDocuments('Item', ids); removed += ids.length }
      }
    }
  }
  a2Quickening(true)
  return removed
}

function a2Quickening (alpha2On) {
  const app = globalThis.WOD6E?.applications?.quickeningDramaTracker
  if (!app) return
  if (alpha2On) { if (app.rendered) app.close({ animate: false }) } else if (!app.rendered && (game.user.isGM || game.user.character)) app.render({ force: true })
}

function a2RefreshActors () {
  for (const a of game.actors ?? []) if (a.type === 'vampire') a.reset()
  for (const t of globalThis.canvas?.tokens?.placeables ?? []) {
    if (t.actor && !t.document?.actorLink && t.actor.type === 'vampire') t.actor.reset()
  }
  for (const app of foundry.applications.instances?.values?.() ?? []) {
    if (app.rendered && (app.document instanceof Actor)) app.render()
  }
}

// ---- styles and boot ---------------------------------------------------------
function a2InjectStyles () {
  document.getElementById('v6a-alpha2-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-alpha2-style'
  style.textContent = `
.roll-dialog .a2-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 14px; margin: 6px 0 4px; font-size: 13px; }
.roll-dialog .a2-controls label { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.roll-dialog .a2-controls input[type=number] { width: 3.5em; }
.roll-dialog .a2-controls .a2-oppose { flex-basis: 100%; font-style: italic; }
.chat-message .a2-result { margin-top: 6px; padding: 6px 8px; border-left: 4px solid #777; background: rgba(0,0,0,0.05); font-size: 13px; }
.chat-message .a2-result.a2-win, .chat-message .a2-result.a2-critical { border-left-color: #2e7d32; }
.chat-message .a2-result.a2-fail, .chat-message .a2-result.a2-tie { border-left-color: #b26a00; }
.chat-message .a2-result.a2-painful { border-left-color: #6d1b1b; }
.chat-message .a2-result.a2-bestial, .chat-message .a2-result.a2-painful-bestial { border-left-color: #c00000; background: rgba(160,0,0,0.08); }
.chat-message .a2-dice { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 4px; }
.chat-message .a2-die { min-width: 20px; height: 20px; line-height: 18px; padding: 0 2px; text-align: center; border: 1px solid #555; border-radius: 3px; font-weight: bold; font-size: 12px; background: #f2f2f2; color: #222; }
.chat-message .a2-die.a2-succ { background: #d5ead6; }
.chat-message .a2-die.a2-crit { box-shadow: inset 0 0 0 2px #c9a400; }
.chat-message .a2-die.a2-h { background: #7a0000; color: #fff; border-color: #3a0000; }
.chat-message .a2-die.a2-h.a2-succ { background: #b31b1b; }
.chat-message .a2-die.a2-bestial { background: #000; color: #ff4d4d; border-color: #ff4d4d; }
.chat-message .a2-notes { margin: 4px 0 0; padding-left: 16px; }
.chat-message .a2-actions { display: flex; gap: 4px; margin-top: 4px; }
.chat-message .a2-actions button { flex: 1; line-height: 22px; font-size: 12px; }
.chat-message .dice-tooltip .a2-hunger-part .part-flavor { color: #b31b1b; font-weight: bold; }
.chat-message .dice-tooltip li.a2-hunger { filter: sepia(1) saturate(6) hue-rotate(-45deg); }
.chat-message .dice-tooltip li.a2-bestial { outline: 2px solid #c00000; }
.chat-message .dice-tooltip li.a2-crit { outline: 2px solid #c9a400; }
.chat-message .dice-total.a2-bestial, .chat-message .dice-total.a2-painful-bestial { color: #c00000; }
.actor.sheet [data-actor-section="healthWillpower"] .a2-health-row { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(260px, 1fr) minmax(260px, 1fr); gap: 16px; padding-top: 6px; }
.actor.sheet .a2-tools { display: inline-flex; gap: 8px; margin-left: 6px; font-size: 15px; }
.actor.sheet .a2-act { cursor: pointer; }
.actor.sheet .a2-subnote { font-size: 12px; font-weight: normal; text-transform: none; line-height: 1.3; opacity: 0.9; margin-top: 4px; }
.actor.sheet .a2-side { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; text-align: right; }
.actor.sheet .a2-side label { display: inline-flex; gap: 6px; align-items: center; }
.actor.sheet .a2-side select { width: auto; }
.actor.sheet .a2-hunger-chip { margin-left: auto; display: inline-flex; gap: 3px; align-items: center; font-size: 13px; text-transform: none; }
.actor.sheet .a2-pip { display: inline-block; width: 10px; height: 10px; border: 1px solid currentColor; }
.actor.sheet .a2-pip.on { background: #b31b1b; border-color: #b31b1b; }
.actor.sheet .a2-na { opacity: 0.4; filter: grayscale(1); pointer-events: none; }
.actor.sheet .a2-na-label { font-size: 13px; text-transform: none; font-weight: normal; margin-left: 6px; }
.actor.sheet [data-actor-section="humanityScale"].a2-on > .humanity-tracker { display: none; }
.actor.sheet .a2-humanity { padding: 4px 16px 8px; }
.actor.sheet .a2-humanity .resource-tracker-header .a2-subnote { margin: 0 0 0 auto; }
.actor.sheet .resource-tracker-space.a2-square { border-radius: 3px; }
.actor.sheet .resource-tracker-space.a2-violation::after { content: ''; position: absolute; top: 50%; left: -3px; width: calc(100% + 6px); height: 2px; background: var(--tracker-text, currentColor); transform: translateY(-50%) rotate(-45deg); }
.actor.sheet.npc .a2-roll { margin-left: 4px; cursor: pointer; }
`
  document.head.append(style)
}

function a2Hooks () {
  if (globalThis.V6Alpha2?.hooked) return
  Hooks.on('renderActorSheetV2', a2RenderSheet)
  Hooks.on('renderChatMessageHTML', (message, html) => {
    try { a2RenderChat(message, html) } catch (e) { console.error('V6 Alpha 2 | chat card', e) }
  })
  Hooks.on('createChatMessage', a2OnCreateMessage)
  Hooks.on('preUpdateActor', a2PreUpdateActor)
  Hooks.on('updateActor', a2UpdateActor)
  // A new character starts with its full Vitae (the system's default is 5, the Alpha 1 figure).
  Hooks.on('preCreateActor', (actor, data) => {
    try {
      if (!a2Enabled() || actor.type !== 'vampire' || data?.system?.health?.value !== undefined) return
      const creature = A2_CREATURES.includes(data?.flags?.world?.a2?.creature) ? data.flags.world.a2.creature : 'vampire'
      const total = a2TotalVitae(creature, creature === 'vampire' ? a2GenModifier(data?.system?.vampire?.generation?.value) : 0)
      if (total) actor.updateSource({ 'system.health.value': total, 'system.health.max': total })
    } catch (e) { console.error('V6 Alpha 2 | new actor', e) }
  })
  Hooks.on('createActor', (actor, options, userId) => {
    if (a2Enabled() && game.user.id === userId && game.user.isGM && actor.type === 'vampire') a2MigrateHumanity({ actors: [actor] }).then(a2ReportMigration)
  })
  Hooks.on('renderQuickeningDramaTrackerApplication', (app) => { if (a2Enabled()) app.close({ animate: false }) })
  globalThis.V6Alpha2.hooked = true
}

async function a2Boot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.booted) return true
  if (a2State.booting) return a2State.booting
  a2State.booting = (async () => {
    a2EnsureSettings()
    a2InjectStyles()
    const [{ WOD6eRoll }, { WOD6eTest }, { RollDialog }] = await Promise.all([
      import(a2SystemUrl('core/scripts/wod6e-roll.js')),
      import(a2SystemUrl('core/scripts/wod6e-test.js')),
      import(a2SystemUrl('core/dialogs/roll-dialog.js'))
    ])
    a2State.RollDialog = RollDialog
    a2PatchRoll(WOD6eRoll)
    a2PatchTest(WOD6eTest)
    a2PatchRollDialog(RollDialog, WOD6eTest)
    a2PatchActorPrep()
    a2Hooks()
    Object.assign(api, {
      enabled: a2Enabled,
      setEnabled: a2SetEnabled,
      removeAlpha1Automation: a2RemoveAlpha1Automation,
      migrateHumanity: a2MigrateHumanity,
      revertHumanity: a2RevertHumanity,
      refresh: a2RefreshActors,
      creature: a2Creature,
      hunger: a2ActorHunger,
      health: a2ActorHealth,
      humanity: a2ActorHumanity,
      vitaeMax: a2ActorVitaeTotal,
      damage: a2DamageActor,
      mend: a2MendActor,
      violate: a2Violate,
      eraseViolation: (actor, n = 1) => a2WriteHumanity(actor, a2HumanityErase(a2ActorHumanity(actor), n)),
      setRank: (actor, rank) => a2WriteHumanity(actor, a2HumanitySetRank(a2ActorHumanity(actor), rank)),
      rules: { classify: a2Classify, planDice: a2PlanDice, hungerFromVitae: a2HungerFromVitae, applyDamage: a2ApplyDamage, compare: a2Compare }
    })
    api.booted = true
    // Round-2 automation (each file is optional; boots are idempotent)
    for (const [name, boot] of [['actions', globalThis.a2ActionsBoot ?? (typeof a2ActionsBoot === 'function' ? a2ActionsBoot : null)],
      ['tools', globalThis.a2ToolsBoot ?? (typeof a2ToolsBoot === 'function' ? a2ToolsBoot : null)],
      ['bonuses', globalThis.a2BonusesBoot ?? (typeof a2BonusesBoot === 'function' ? a2BonusesBoot : null)],
      ['powers', globalThis.a2PowersBoot ?? (typeof a2PowersBoot === 'function' ? a2PowersBoot : null)],
      ['journal styling', globalThis.a2StyleBoot ?? (typeof a2StyleBoot === 'function' ? a2StyleBoot : null)],
      ['opposed tests', globalThis.a2OpposeBoot ?? (typeof a2OpposeBoot === 'function' ? a2OpposeBoot : null)],
      ['self-ticking bonuses', globalThis.a2AutoBoot ?? (typeof a2AutoBoot === 'function' ? a2AutoBoot : null)],
      ['journal links', globalThis.a2LinksBoot ?? (typeof a2LinksBoot === 'function' ? a2LinksBoot : null)],
      ['combat flow', globalThis.a2CombatBoot ?? (typeof a2CombatBoot === 'function' ? a2CombatBoot : null)],
      ['character creation', globalThis.a2CreateBoot ?? (typeof a2CreateBoot === 'function' ? a2CreateBoot : null)],
      ['states', globalThis.a2StatesBoot ?? (typeof a2StatesBoot === 'function' ? a2StatesBoot : null)],
      ['moves', globalThis.a2MovesBoot ?? (typeof a2MovesBoot === 'function' ? a2MovesBoot : null)],
      ['theme', globalThis.a2ThemeBoot ?? (typeof a2ThemeBoot === 'function' ? a2ThemeBoot : null)],
      ['story', globalThis.a2StoryBoot ?? (typeof a2StoryBoot === 'function' ? a2StoryBoot : null)],
      ['table tools', globalThis.a2TableBoot ?? (typeof a2TableBoot === 'function' ? a2TableBoot : null)],
      ['guide', globalThis.a2GuideBoot ?? (typeof a2GuideBoot === 'function' ? a2GuideBoot : null)],
      ['tracked powers', globalThis.a2TrackBoot ?? (typeof a2TrackBoot === 'function' ? a2TrackBoot : null)],
      ['sheet actions', globalThis.a2ActsBoot ?? (typeof a2ActsBoot === 'function' ? a2ActsBoot : null)]]) {
      if (!boot) continue
      try { await boot() } catch (e) { console.error(`V6 Automation | ${name} failed to load`, e) }
    }
    if (a2Enabled()) {
      a2Quickening(true)
      if (game.user.isGM) {
        await a2RemoveAlpha1Automation()
        a2ReportMigration(await a2MigrateHumanity())
      }
      a2RefreshActors()
    }
    a2RerenderChat()
    console.log('V6 Automation | Alpha 2 rules loaded')
    return true
  })()
  try {
    return await a2State.booting
  } catch (e) {
    a2State.booting = null
    console.error('V6 Automation | Alpha 2 rules failed to load', e)
    ui.notifications.error('V6 Automation: the Alpha 2 rules failed to load (see console).')
    return false
  }
}

const A2P_POWER_EFFECTS = {"version":1,"note":"Built by powers-work/gen_power_effects.py; read by out/automation/src/alpha2-powers.js. Keys: disciplineType::name (book::<Book>::disciplineType::name for the name collisions, listed in variants).","kinds":["selfBonus","targetPenalty","damage","heal","resource","damageReduction","extraAction","upkeep","status","narrativeOnly"],"counts":{"published":96,"elder":57,"book":146,"ported":115,"homebrew":16,"ritual":10},"variants":{"bloodSorcery::Fire in the Blood":["book::Cults-of-the-Blood-Gods::bloodSorcery::Fire in the Blood","book::Player-s-Guide::bloodSorcery::Fire in the Blood"],"bloodSorcery::Guided Memory":["book::In-Memoriam::bloodSorcery::Guided Memory","book::Player-s-Guide::bloodSorcery::Guided Memory"],"bloodSorcery::Shape the Sanguine Sacrament":["book::Book-of-Nod-Apocrypha::bloodSorcery::Shape the Sanguine Sacrament","book::Tattered-Facade::bloodSorcery::Shape the Sanguine Sacrament"]},"powers":{"animalism::Animal Messenger":{"name":"Animal Messenger","discipline":"animalism","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"An animal carries your message.","steps":[{"level":4,"duration":"maintained"},{"level":6,"duration":"maintained"}],"auto":"curated","kinds":["narrativeOnly"]},"animalism::Army of Beasts":{"name":"Army of Beasts","discipline":"animalism","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"night","fx":[{"kind":"targetPenalty","value":"3","targets":[],"situational":false},{"kind":"damage","amount":"dots","baneful":false,"track":"health","perTurn":true}],"summary":"One night Once per night you call every animal for miles around, across a whole city or county, and they…","auto":"heuristic","kinds":["targetPenalty","damage"]},"animalism::Aspect of the Beast":{"name":"Aspect of the Beast","discipline":"animalism","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"non-conflict tests the borrowed feature helps"},{"kind":"status","status":"shape","note":"borrowed animal feature","steps":[{"level":3,"note":"two animal features"},{"level":5,"note":"three animal features"}]}],"summary":"Animalism dots on non-conflict tests the feature helps (toggle).","auto":"curated","kinds":["selfBonus","status"]},"animalism::Augury":{"name":"Augury","discipline":"animalism","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"targetPenalty","value":2,"targets":["animalism"],"situational":true,"note":"later Animalism tests involving living creatures this session (uncontested: +1 Difficulty instead)","on":"self","lasts":"night"}],"summary":"Feed a swarm, flock or shoal food laced with your Vitae and put a single question about any person or thing…","auto":"curated","kinds":["targetPenalty"]},"animalism::Awaken the Parasite":{"name":"Awaken the Parasite","discipline":"animalism","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"damage","amount":"dots","baneful":false,"track":"health","when":"manual","text":"Animalism dots, once (margin 2+)"}],"summary":"One scene Every body carries tiny passengers","auto":"heuristic","kinds":["damage"]},"animalism::Beast Shape":{"name":"Beast Shape","discipline":"animalism","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests where the animal form has an edge"},{"kind":"status","status":"shape","note":"no speech; no Social or Mental powers except on that animal family"}],"summary":"Animal form: Animalism dots where the form has an edge (toggle).","auto":"curated","kinds":["selfBonus","status"]},"animalism::Bestial Instinct":{"name":"Bestial Instinct","discipline":"animalism","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["awareness","investigation"],"situational":true,"note":"Awareness/Investigation involving the supernatural"},{"kind":"status","status":"senses","note":"senses supernatural beings within Short"}],"summary":"Animalism dots on Awareness and Investigation involving the supernatural (toggle).","auto":"curated","kinds":["selfBonus","status"]},"animalism::Bestial Spirits":{"name":"Bestial Spirits","discipline":"animalism","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"confused","note":"in a murderous fit for the scene: attacks whoever is closest, or itself, as in a rage frenzy without its bonuses","on":"target"}],"summary":"One scene You let your Beast's hunger for blood and violence spill into the minds of the mortals around you","auto":"curated","kinds":["status"]},"animalism::Call of the Wild":{"name":"Call of the Wild","discipline":"animalism","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays","note":"margin 1: a quarter of the family comes, 2: half, 3: most, 4: all"}],"summary":"Animals of one family come to you.","auto":"curated","kinds":["narrativeOnly"],"elderSteps":[8]},"animalism::Coax the Bestial Temper":{"name":"Coax the Bestial Temper","discipline":"animalism","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"power","note":"frenzy tests of other vampires in earshot: Difficulty ±1 (±2 at margin 2, ±3 at margin 4), for the scene"}],"summary":"One scene You hum, purr or growl a wordless sound that plucks at every Beast within earshot","auto":"curated","kinds":["status"]},"animalism::Conquer the Beast":{"name":"Conquer the Beast","discipline":"animalism","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"scene","fx":[{"kind":"upkeep","amount":1,"resource":"willpower","per":"turnStart","note":"start of each turn, while you hold a frenzy you fell into"}],"summary":"One scene You have broken your Beast to the saddle","auto":"heuristic","kinds":["upkeep"]},"animalism::Drawing Out the Beast":{"name":"Drawing Out the Beast","discipline":"animalism","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"fear","on":"target","when":"win","note":"the target falls into your rage or fear frenzy in your place, for the scene or until its aim is met"}],"summary":"Instantaneous When you would test Self-Control against a rage or fear frenzy, you can use this power instead…","auto":"curated","kinds":["status"]},"animalism::Eyes of the Forest":{"name":"Eyes of the Forest","discipline":"animalism","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"senses","note":"merged with your domain: its animals are your senses, you sleep in its earth; great harm to the land hurts you"}],"summary":"Until you rise You sink into the ground of a domain you know well, an area with clear borders up to a few…","auto":"curated","kinds":["status"]},"animalism::Feral Claws":{"name":"Feral Claws","discipline":"animalism","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"power","note":"unarmed attacks deal damage = Strength","weapon":"strength","steps":[{"level":6,"note":"unarmed damage = Strength; baneful if 2 more Vitae were paid"}]}],"summary":"Unarmed attacks deal damage equal to Strength.","auto":"curated","kinds":["status"]},"animalism::Leash the Beast":{"name":"Leash the Beast","discipline":"animalism","level":2,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Instantaneous You turn your Blood on your own Beast and hold it down","auto":"heuristic","kinds":["narrativeOnly"]},"animalism::Messenger's Command":{"name":"Messenger's Command","discipline":"animalism","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"As Animal Messenger You must know Animal Messenger and either Command or Submerged Directive","auto":"heuristic","kinds":["narrativeOnly"]},"animalism::Plague of Beasts":{"name":"Plague of Beasts","discipline":"animalism","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"band(margin, 0, 1, 1, 2, 4, 3)","targets":[],"situational":false},{"kind":"damage","amount":"band(margin, 2, half(dots), 3, dots)","baneful":false,"perTurn":true,"note":"animals attack at the start of its turns"}],"summary":"Harassed by animals: −1 to −3 dice by margin; from margin 2 they bite each turn.","auto":"curated","kinds":["targetPenalty","damage"]},"animalism::Quell the Beast":{"name":"Quell the Beast","discipline":"animalism","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"entranced","on":"target","when":"win","note":"mortal or animal: lethargic for the scene. Vampire: no Blood Surge and no frenzy from bestial failures for 1 + margin turns"}],"summary":"One scene (mortals) or 1 + margin turns (vampires) You lock eyes with a creature and push its Beast down…","auto":"curated","kinds":["status"]},"animalism::Scent of Prey":{"name":"Scent of Prey","discipline":"animalism","level":2,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests to track them"}],"summary":"One scene You smell the particular fear of prey that has looked a predator in the face","auto":"heuristic","kinds":["selfBonus"]},"animalism::Serpent's Kiss":{"name":"Serpent's Kiss","discipline":"animalism","level":2,"src":"book","book":"Blood-Stained-Love","file":"out-a2/mod/Blood-Stained-Love/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"power","note":"each bite or kiss you choose puts 1 Vitae of yours into the victim: a drink toward a Blood Bond (Blood Bonds window), ghouling, learning a Discipline"}],"summary":"(Homebrew) Rank 2 Physical Animalism power for our table","auto":"curated","kinds":["status"]},"animalism::Subsume the Spirit":{"name":"Subsume the Spirit","discipline":"animalism","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"damage","amount":"2","track":"willpower","baneful":false,"on":"self","when":"manual","text":"the animal dies while you ride it: 2 Willpower damage"},{"kind":"targetPenalty","on":"self","impair":["composure"],"when":"manual","lasts":"night","note":"the animal died under you: Composure impaired until your next daysleep"}],"summary":"One scene You meet an animal's eyes and pour your mind into it","steps":[{"level":5,"duration":"maintained"}],"auto":"curated","kinds":["damage","targetPenalty"]},"animalism::Swarm":{"name":"Swarm","discipline":"animalism","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":false},{"kind":"damage","amount":"1","baneful":false,"track":"health","perTurn":true,"when":"manual","text":"1 per target per turn"}],"summary":"One scene, or until you end it Spend a full turn dissolving into a swarm of small creatures","auto":"heuristic","kinds":["targetPenalty","damage"]},"animalism::Sweet Whispers":{"name":"Sweet Whispers","discipline":"animalism","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"an order to an animal: it obeys, the Storyteller plays it"}],"summary":"The animal follows a one-sentence order.","auto":"curated","kinds":["narrativeOnly"],"elderSteps":[6]},"animalism::Thrill of the Hunt":{"name":"Thrill of the Hunt","discipline":"animalism","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tracking or following prey (your Hunger dice instead, if that is more)"}],"summary":"One scene Your hunger sharpens your hunting sense","auto":"curated","kinds":["selfBonus"]},"animalism::Tracing the Blood":{"name":"Tracing the Blood","discipline":"animalism","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"senses","note":"you feel Vitae being spent within Short and from where; margin 1+: what it paid for"}],"summary":"One scene Your Beast stirs whenever another creature calls on its blood","auto":"curated","kinds":["status"]},"animalism::Unchain the Ferocious Beast":{"name":"Unchain the Ferocious Beast","discipline":"animalism","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"instant","fx":[{"kind":"damage","amount":"2 + margin","baneful":true,"track":"health"}],"summary":"Instantaneous You meet the eyes of a creature that carries a Beast (a vampire, Duskborn, ghoul or werewolf)…","auto":"heuristic","kinds":["damage"]},"animalism::Vermin Blood":{"name":"Vermin Blood","discipline":"animalism","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"maintained","fx":[{"kind":"targetPenalty","impair":["strength","stamina"]}],"summary":"One week You wake the old sickness in your dead blood and pour it out for the vermin","auto":"heuristic","kinds":["targetPenalty"]},"auspex::Analyze":{"name":"Analyze","discipline":"auspex","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"You know the touched object inside out.","auto":"curated","kinds":["narrativeOnly"]},"auspex::Clairvoyance":{"name":"Clairvoyance","discipline":"auspex","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"senses","note":"your sight and hearing are at a distant spot"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Senses projected to a spot within range.","auto":"curated","kinds":["status","narrativeOnly"]},"auspex::Dreams of the Past":{"name":"Dreams of the Past","discipline":"auspex","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You rebuild a ruined object or room as a vision of what it once was","auto":"heuristic","kinds":["narrativeOnly"]},"auspex::Elysian Eye":{"name":"Elysian Eye","discipline":"auspex","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"resource","resource":"willpower","amount":"-1","on":"self","when":"manual","note":"the target is an unwilling, awake vampire or other supernatural creature","label":"−1 Willpower: the target is an unwilling, awake vampire or other supernatural creature"}],"summary":"One scene You must know Sense the Unseen","auto":"curated","kinds":["resource"]},"auspex::Eyes of Chaos (Black Hand)":{"name":"Eyes of Chaos (Black Hand)","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests to solve cryptic puzzles, break codes and make out the gist"}],"summary":"One scene You see the hidden order in a mess","auto":"heuristic","kinds":["selfBonus"]},"auspex::Haruspex":{"name":"Haruspex","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","value":1,"targets":["auspex"],"situational":true,"note":"you killed it yourself (it dies under your hands as you read: add 1 more by hand)"},{"kind":"status","status":"power","note":"once before sunrise: reroll all standard dice of one test and keep the better (three tests on a critical win). On a win the button appears on your roll cards"}],"summary":"One night You read your own fate in the entrails of the dying","auto":"curated","kinds":["selfBonus","status"]},"auspex::Heart Laid Bare":{"name":"Heart Laid Bare","discipline":"auspex","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"selfBonus","value":1,"targets":["auspex"],"situational":true,"note":"the object of the fear or desire is present"},{"kind":"selfBonus","value":1,"targets":["auspex"],"situational":true,"note":"the conversation touches on it"}],"summary":"Instantaneous You draw out what a creature fears or longs for most","auto":"curated","kinds":["selfBonus"]},"auspex::Heightened Senses":{"name":"Heightened Senses","discipline":"auspex","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["awareness","investigation"],"situational":false},{"kind":"status","status":"senses","note":"senses reach twice as far; sudden overload: Dexterity + Wits or −2 (−3 at ●●●)"}],"summary":"Auspex dots on Awareness and Investigation tests.","auto":"curated","kinds":["selfBonus","status"],"elderSteps":[6]},"auspex::Lethe's Kindness":{"name":"Lethe's Kindness","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"selfBonus","value":"3","targets":["knowledge"],"situational":true,"note":"tests where that knowledge helps)","lasts":"maintained"}],"summary":"Permanent You tear memories out of a creature and keep them for yourself","auto":"heuristic","kinds":["selfBonus"]},"auspex::Panacea":{"name":"Panacea","discipline":"auspex","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"resource","resource":"willpower","amount":"min(dots, 1 + margin)","on":"target","when":"win"}],"summary":"Instantaneous Your touch steadies a troubled mind","auto":"curated","kinds":["resource"]},"auspex::Possession (Auspex)":{"name":"Possession (Auspex)","discipline":"auspex","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"damage","amount":"3","track":"willpower","baneful":false,"on":"self","when":"manual","text":"the host dies while you are in it: 3 Willpower damage"},{"kind":"targetPenalty","on":"self","impair":["composure","resolve"],"when":"manual","lasts":"night","note":"the host died under you: Composure and Resolve impaired until your next daysleep"}],"summary":"One night or until ended You push a mortal's will out of the way and step into its body","auto":"curated","kinds":["damage","targetPenalty"]},"auspex::Premonition":{"name":"Premonition","discipline":"auspex","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"defending against the sensed foe or hazard"}],"summary":"Half Auspex dots to defend against one foe or hazard (toggle).","auto":"curated","kinds":["selfBonus"],"elderSteps":[7]},"auspex::Psychic Assault":{"name":"Psychic Assault","discipline":"auspex","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"instant","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"willpower","text":"½ Auspex dots + margin; overflow to Health","overflow":true}],"summary":"Instantaneous You hurl the full weight of your mind at a creature whose eyes you meet or whose skin you touch","auto":"heuristic","kinds":["damage"]},"auspex::Psychic Projection":{"name":"Psychic Projection","discipline":"auspex","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"night","fx":[{"kind":"damage","amount":"margin","track":"willpower","baneful":false,"when":"manual","text":"Another projected mind, or a ghost if the Storyteller allows, can see you and fight you:…"}],"summary":"One night or until ended Your mind leaves your body as an invisible, intangible presence","auto":"heuristic","kinds":["damage"]},"auspex::Psychometry":{"name":"Psychometry","discipline":"auspex","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn","note":"one answer, plus one per point of margin"}],"summary":"Answers from an object's past.","auto":"curated","kinds":["narrativeOnly"]},"auspex::Pulse of the Canaille":{"name":"Pulse of the Canaille","discipline":"auspex","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You open your mind to the whole mortal population of your city at once","auto":"heuristic","kinds":["narrativeOnly"]},"auspex::Read the Room":{"name":"Read the Room","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous You take a silent poll of a crowd","auto":"heuristic","kinds":["narrativeOnly"]},"auspex::Reveal the Invisible Leash":{"name":"Reveal the Invisible Leash","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous A touch shows you who a creature bows to","auto":"heuristic","kinds":["narrativeOnly"]},"auspex::Scry the Soul":{"name":"Scry the Soul","discipline":"auspex","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"status","status":"fear","on":"target","lasts":"maintained"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous You see a creature's soul as a shifting haze of colour around it","auto":"heuristic","kinds":["status","narrativeOnly"]},"auspex::Sense the Unseen":{"name":"Sense the Unseen","discipline":"auspex","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"senses","note":"contested Power test to find a creature hidden by a power; Difficulty = its rank for objects and traces"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"You sense hidden supernatural presences and active powers.","auto":"curated","kinds":["status","narrativeOnly"]},"auspex::Share Senses":{"name":"Share Senses","discipline":"auspex","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":-1,"targets":[],"situational":true,"note":"all senses taken: the strain of two points of view"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Perceive through another creature's senses.","steps":[{"level":6,"duration":"night"},{"level":8,"duration":"maintained"}],"auto":"curated","kinds":["selfBonus"]},"auspex::Telepathy":{"name":"Telepathy","discipline":"auspex","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn","note":"one surface thought, plus one per point of margin; 1 Willpower against an unwilling supernatural mind"},{"kind":"resource","resource":"willpower","amount":"-1","on":"self","when":"manual","note":"the target is an unwilling vampire or other supernatural creature","label":"−1 Willpower: the target is an unwilling vampire or other supernatural creature"}],"summary":"Send and read thoughts.","auto":"curated","kinds":["resource"],"elderSteps":[7]},"auspex::Unerring Pursuit":{"name":"Unerring Pursuit","discipline":"auspex","level":2,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"One night, +1 night per point of margin Prerequisite: Dominate 1","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Aapilu Awakening":{"name":"Aapilu Awakening","discipline":"bloodSorcery","level":1,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Until sunrise · XP 8 for each aapilu's ritual Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Animate the Unmoving":{"name":"Animate the Unmoving","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"2 + margin","baneful":false,"track":"health"}],"summary":"One scene Objects you can see within range move as you direct, within what their shape allows: a statue…","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Antebrachia Ignium":{"name":"Antebrachia Ignium","discipline":"bloodSorcery","level":5,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"power","note":"burning arms: a touch (Dexterity + Fighting) deals 2 baneful damage; wrestling sets both of you alight (fire, PG p.139); vampires within Short resist fear frenzy at Difficulty 2","weapon":"2","baneful":true}],"summary":"Until you will it out or the scene ends · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::As Fog on Water":{"name":"As Fog on Water","discipline":"bloodSorcery","level":2,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"The rest of the night · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Astromancy":{"name":"Astromancy","discipline":"bloodSorcery","level":1,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Atrocity's Release":{"name":"Atrocity's Release","discipline":"bloodSorcery","level":5,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Beelzebeatit":{"name":"Beelzebeatit","discipline":"bloodSorcery","level":1,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"One scene or one night · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Bind the Accusing Tongue":{"name":"Bind the Accusing Tongue","discipline":"bloodSorcery","level":1,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"silenced","note":"can't say, write or signal anything harmful about you unless it first passes Self-Control against your Blood Sorcery dots + 2 (+3 on a critical win)","on":"target"}],"summary":"Until resisted or the cord unwinds · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Blood Aegis":{"name":"Blood Aegis","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"shield","note":"soaks ranged damage before Endurance: 2 × Blood Sorcery dots in points (+2 per extra Vitae); nothing against melee, fire or sunlight. The module counts the points: see the barrier's card"}],"summary":"One scene or until depleted A sheet of your blood rises out of a cut and hangs in the air around you,…","auto":"curated","kinds":["status"]},"bloodSorcery::Blood Apocrypha":{"name":"Blood Apocrypha","discipline":"bloodSorcery","level":1,"src":"book","book":"Book-of-Nod-Apocrypha","file":"out-a2/mod/Book-of-Nod-Apocrypha/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"One month, +1 month per point of margin · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Blood Missive":{"name":"Blood Missive","discipline":"bloodSorcery","level":1,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"One month, +1 month per point of margin · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Blood Rage":{"name":"Blood Rage","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"Self-Control tests to resist frenzy"}],"summary":"One scene You touch a vampire, Duskborn or ghoul and make its blood surge out of its control","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Blood Reading":{"name":"Blood Reading","discipline":"bloodSorcery","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous Taste a drop of blood, fresh or dried, no more than one night old, and learn what it came…","auto":"heuristic","kinds":["narrativeOnly"],"elderSteps":[7]},"bloodSorcery::Blood Sigil":{"name":"Blood Sigil","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Blood Sympathy":{"name":"Blood Sympathy","discipline":"bloodSorcery","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"targetPenalty","on":"self","value":2,"targets":["bloodSorcery"],"situational":true,"note":"Power tests made through the sympathy"}],"summary":"One scene You hold a sample of a creature's blood, fresh or dried, no more than a week old, and use it as a…","auto":"curated","kinds":["targetPenalty"]},"bloodSorcery::Blood Walk":{"name":"Blood Walk","discipline":"bloodSorcery","level":1,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Blood to Water":{"name":"Blood to Water","discipline":"bloodSorcery","level":1,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Instantaneous · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Blood's Curse":{"name":"Blood's Curse","discipline":"bloodSorcery","level":2,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"weakened","note":"until dawn its generation modifier counts 1 higher for its clan Curse and clan frenzy (Difficulty +1); tests that exploit an NPC's curse get +2 dice","on":"target","when":"win","lasts":"night"}],"summary":"One night You thicken a vampire's or ghoul's blood until the curse in it bites harder","auto":"curated","kinds":["status"]},"bloodSorcery::Burnout":{"name":"Burnout","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Instantaneous You send a surge through an electronic device you can see within range: a phone, a camera, a…","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Calix Secretus":{"name":"Calix Secretus","discipline":"bloodSorcery","level":2,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until released · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Call the Weather":{"name":"Call the Weather","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"sight-based tests beyond Close distance and to driving"}],"summary":"One night You work on the sky over the area around you, a few kilometres across, or a smaller area you name","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Cauldron of Blood":{"name":"Cauldron of Blood","discipline":"bloodSorcery","level":3,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"damage","amount":"dots + margin","baneful":false,"track":"health"}],"summary":"Instantaneous You lay a hand on a target and make the blood in its body boil","auto":"heuristic","kinds":["damage"],"elderSteps":[8]},"bloodSorcery::Caustic Blood":{"name":"Caustic Blood","discipline":"bloodSorcery","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health","min":5,"steps":[{"level":7,"amount":"dots + margin"}]}],"summary":"Instantaneous Squeeze a little blood from a fingertip onto an object within reach","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Centering":{"name":"Centering","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"selfBonus","value":"2","targets":["mental"],"situational":true,"note":"Mental tests you make under pressure or distraction, such as in a…"}],"summary":"One scene You narrow your mind to the task in front of you","auto":"heuristic","kinds":["selfBonus"]},"bloodSorcery::Clinging of the Insect":{"name":"Clinging of the Insect","discipline":"bloodSorcery","level":1,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"One scene · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Coax the Garden":{"name":"Coax the Garden","discipline":"bloodSorcery","level":1,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":["physical"],"situational":false}],"summary":"One scene · XP 8 Ingredients","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Communal Vigor":{"name":"Communal Vigor","discipline":"bloodSorcery","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"night","fx":[{"kind":"selfBonus","value":"3","targets":[],"situational":true,"note":"Dominate and Presence Power tests against members of the pack"}],"summary":"One night · XP 8 Ingredients","auto":"heuristic","kinds":["selfBonus"]},"bloodSorcery::Communicate with Kindred Sire":{"name":"Communicate with Kindred Sire","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Ten minutes of contact · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Compel the Inanimate":{"name":"Compel the Inanimate","discipline":"bloodSorcery","level":4,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes the target's memories: the Storyteller plays it out"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Concentrated Blood":{"name":"Concentrated Blood","discipline":"bloodSorcery","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"power","note":"this scene a Blood Surge on a Discipline costs 1 Vitae per dot instead of 2: correct the Vitae by hand after the Blood Surge window"}],"summary":"One scene You draw the strength of your blood together","auto":"curated","kinds":["status"]},"bloodSorcery::Conflagration":{"name":"Conflagration","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"2","baneful":true,"track":"health"},{"kind":"damage","amount":"2","baneful":true,"track":"health","perTurn":true,"steps":[{"level":5,"amount":"3"}]}],"summary":"One scene Fire bursts out of nothing at a point you can see within range and fills the space out to Close…","auto":"heuristic","kinds":["damage"],"elderSteps":[8]},"bloodSorcery::Craft Bloodstone":{"name":"Craft Bloodstone","discipline":"bloodSorcery","level":1,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"One week, or until the stone is destroyed · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Craftmaster":{"name":"Craftmaster","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"power","note":"until dawn you use the subject's dots and specialty in one of Craft, Expression or Knowledge in place of your own (a week on a critical win)","lasts":"night"},{"kind":"selfBonus","value":1,"targets":["craft","expression","knowledge"],"situational":true,"note":"you already had that specialty","lasts":"night"}],"summary":"Until dawn (a week on a critical win) · XP 8 Ingredients","auto":"curated","kinds":["status","selfBonus"]},"bloodSorcery::Creatio Ignis":{"name":"Creatio Ignis","discipline":"bloodSorcery","level":5,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"power","note":"unarmed attacks deal 2 + margin, baneful to vampires; a target you wrestle catches fire; vampires who see it resist fear frenzy at Difficulty 2","weapon":"2 + margin","baneful":true}],"summary":"Ritual (level 5): Blood Sorcery","auto":"curated","kinds":["status"]},"bloodSorcery::Crone's Pride":{"name":"Crone's Pride","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":["social"],"situational":true,"note":"Social tests, except tests to frighten or browbeat, and on Presence…"}],"summary":"One night You speak a verse of Caine's condemnation at a vampire or Duskborn within range that can hear you…","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Dagon's Call":{"name":"Dagon's Call","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"damage","amount":"dots + margin","track":"health","baneful":false,"when":"manual","text":"It takes damage equal to your Blood Sorcery dots plus your margin; Vampiric Endurance…"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Dampen the Fear":{"name":"Dampen the Fear","discipline":"bloodSorcery","level":1,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"selfBonus","value":2,"targets":["composure","resolve"],"situational":true,"note":"resist fear frenzy"}],"summary":"One scene · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"bloodSorcery::Dance of Vines":{"name":"Dance of Vines","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health"},{"kind":"status","status":"held","on":"target"}],"summary":"One scene Plants within range, such as ivy, hedges, roots, long grass or a potted tree, writhe and reach for…","auto":"heuristic","kinds":["damage","status"]},"bloodSorcery::Defense of the Sacred Haven":{"name":"Defense of the Sacred Haven","discipline":"bloodSorcery","level":4,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"shield","note":"no sunlight enters the warded place for the whole day: fully protected (PG p.139)","lasts":"night"}],"summary":"One day · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Deflection of Wooden Doom":{"name":"Deflection of Wooden Doom","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"shield","note":"the first real staking attempt shatters on your skin (make the ritual test then); margin 1+: the attacker is blinded until the end of its next turn","lasts":"night"}],"summary":"Until dawn, or until the splinter comes out · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Depths of Nightmare":{"name":"Depths of Nightmare","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"damage","amount":"1","track":"willpower","baneful":false,"on":"target","when":"manual","text":"each time it first wakes, for one day per success; it doesn't come back until the curse ends"},{"kind":"targetPenalty","impair":["composure"],"when":"manual","lasts":"maintained","note":"critical win: Composure impaired until the curse ends"}],"summary":"One day per success · XP 8 Ingredients","auto":"curated","kinds":["damage","targetPenalty"]},"bloodSorcery::Distant Hand":{"name":"Distant Hand","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"1 + margin","baneful":false,"track":"health","steps":[{"level":3,"amount":"2 + margin"}]}],"summary":"One scene For the scene you can move one object within range with your mind, as long as you could lift it…","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Dominion":{"name":"Dominion","discipline":"bloodSorcery","level":5,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"}],"summary":"Until a seal is broken · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Douse the Fear":{"name":"Douse the Fear","discipline":"bloodSorcery","level":1,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"night","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"Self-Control tests to resist fear frenzy"}],"summary":"One night · XP 8 Ingredients","auto":"heuristic","kinds":["selfBonus"]},"bloodSorcery::Eden's Bounty":{"name":"Eden's Bounty","discipline":"bloodSorcery","level":5,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"1","targets":["physical"],"situational":false,"lasts":"maintained"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Egregore Consultation":{"name":"Egregore Consultation","discipline":"bloodSorcery","level":4,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","value":"1 + margin","targets":[],"situational":true,"uses":3,"note":"the chosen Skill, next three uses (+1 or +2 more if it is common locally)"}],"summary":"Next three uses of the Skill · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"bloodSorcery::Escape to True Sanctuary":{"name":"Escape to True Sanctuary","discipline":"bloodSorcery","level":5,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Until either circle is damaged · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Essence of Air":{"name":"Essence of Air","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"speed","note":"flying: Short a turn, Medium if you give up your action; lifting someone or being pulled down is Strength + Blood Sorcery against Strength + Athletics"}],"summary":"One scene (the potion keeps for one night) · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Eyes of Babel":{"name":"Eyes of Babel","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes the target's memories: the Storyteller plays it out"}],"summary":"One week · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Eyes of the Nighthawk":{"name":"Eyes of the Nighthawk","discipline":"bloodSorcery","level":4,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"senses","note":"you steer the bird and see through its eyes at any range, and can use non-physical Disciplines through it; pluck out its eyes at dawn or be blind for three nights","lasts":"night"}],"summary":"One night · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Feast of Ashes":{"name":"Feast of Ashes","discipline":"bloodSorcery","level":4,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"weakened","note":"can't keep blood down tonight: feeding gives it no Vitae; only ash feeds it, and never below 3 Hunger dice","on":"target","lasts":"night"}],"summary":"One night · XP 8 Ingredients","auto":"curated","kinds":["status"]},"book::Cults-of-the-Blood-Gods::bloodSorcery::Fire in the Blood":{"name":"Fire in the Blood","discipline":"bloodSorcery","level":3,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"damage","amount":"margin","track":"health","baneful":false,"when":"manual","text":"The target takes damage equal to your margin and is wracked with pain: −2 dice to…"}],"summary":"One scene · XP 8 Ingredients","auto":"heuristic","kinds":["damage"],"match":{"book":"Homebrew (Dennis)","level":3,"descLen":1421}},"book::Player-s-Guide::bloodSorcery::Fire in the Blood":{"name":"Fire in the Blood","discipline":"bloodSorcery","level":3,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"damage","amount":"max(1, margin)","track":"health","baneful":false}],"summary":"The rest of the scene · XP 8 Ingredients","auto":"heuristic","kinds":["damage"],"match":{"book":"Homebrew (Dennis)","level":3,"descLen":1346}},"bloodSorcery::Firewalker":{"name":"Firewalker","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"shield","note":"halve, rounding down, the baneful damage the subject takes from fire for the rest of the night (by hand in the damage window)","lasts":"night"}],"summary":"The rest of the night · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Fisher King":{"name":"Fisher King","discipline":"bloodSorcery","level":5,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Until the end of the story · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Foundation of the Chantry":{"name":"Foundation of the Chantry","discipline":"bloodSorcery","level":5,"src":"book","book":"Courts-of-the-Damned","file":"out-a2/mod/Courts-of-the-Damned/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Until disturbed or ended · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Fulminating Vitae":{"name":"Fulminating Vitae","discipline":"bloodSorcery","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"night","fx":[{"kind":"damage","amount":"1 + margin","baneful":false,"track":"health","when":"manual","text":"1 + margin (baneful to vampires)"}],"summary":"Armed until dawn Seal your charged Vitae in a glass vial","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Galvanic Ruination":{"name":"Galvanic Ruination","discipline":"bloodSorcery","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Gnarl Wood":{"name":"Gnarl Wood","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"targetPenalty","on":"self","value":2,"targets":["bloodSorcery"],"situational":true,"note":"someone holds or wears it: the −2 of a called shot"},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"when":"win","note":"tests that use the bent object, until it is repaired"}],"summary":"Permanent You look at a piece of dead wood within range, up to about as much as a door, and it twists,…","auto":"curated","kinds":["targetPenalty"]},"bloodSorcery::Grim Chrysalis":{"name":"Grim Chrysalis","discipline":"bloodSorcery","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shield","note":"in the chrysalis: each day all normal damage, or 2 baneful boxes, mend at no cost; the shell keeps out sunlight and takes 30 damage to break","lasts":"maintained"}],"summary":"At least a day, unless broken · XP 8 Ingredients","auto":"curated","kinds":["status"]},"book::In-Memoriam::bloodSorcery::Guided Memory":{"name":"Guided Memory","discipline":"bloodSorcery","level":4,"src":"book","book":"In-Memoriam","file":"out-a2/mod/In-Memoriam/items.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until the session ends (or through the next one) · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"],"match":{"book":"In Memoriam (V5)","level":4,"descLen":2058}},"book::Player-s-Guide::bloodSorcery::Guided Memory":{"name":"Guided Memory","discipline":"bloodSorcery","level":4,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until the end of the session · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"],"match":{"book":"Homebrew (Dennis)","level":4,"descLen":1362}},"bloodSorcery::Heart of Stone":{"name":"Heart of Stone","discipline":"bloodSorcery","level":5,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"targetPenalty","on":"self","value":3,"targets":["social"],"situational":true,"note":"social tests you start (not Intimidation or Dominate) and Justify tests"},{"kind":"selfBonus","value":3,"targets":["composure","resolve"],"situational":true,"note":"resist Presence"}],"summary":"Until you cast it again to reverse it · XP 8 Ingredients","auto":"curated","kinds":["targetPenalty","selfBonus"]},"bloodSorcery::Illuminate the Trail of Prey":{"name":"Illuminate the Trail of Prey","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"The whole night · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Incorporeal Passage":{"name":"Incorporeal Passage","discipline":"bloodSorcery","level":4,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shape","note":"insubstantial while you hold the shard: only fire, sunlight and magic or weapons that harm spirits hurt you; you can't touch anything, spend Vitae or Blood Surge"},{"kind":"damageReduction","amount":"99","min1":false,"notBaneful":true}],"summary":"One scene, or until you drop the shard · XP 8 Ingredients","auto":"curated","kinds":["status","damageReduction"]},"bloodSorcery::Innocence's Veil":{"name":"Innocence's Veil","discipline":"bloodSorcery","level":4,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"hidden","note":"until you next feed, no power reads diablerie in your blood or aura","lasts":"maintained"}],"summary":"Until you next feed · XP 8 · Downtime Taking Half allowed Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Invisible Chains of Binding":{"name":"Invisible Chains of Binding","discipline":"bloodSorcery","level":4,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"4","targets":["physical"],"situational":true,"note":"physical defence tests and to melee attacks"}],"summary":"Ingredients","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Land's Sustenance":{"name":"Land's Sustenance","discipline":"bloodSorcery","level":4,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Until the end of the story · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Le Sang de l'Amour":{"name":"Le Sang de l'Amour","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"selfBonus","value":"-1","targets":["composure"],"situational":true,"note":"Composure-based tests","lasts":"maintained"}],"summary":"While both vials are worn and unbroken · XP 8 Ingredients","auto":"heuristic","kinds":["selfBonus"]},"bloodSorcery::Levitation":{"name":"Levitation","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health"},{"kind":"status","status":"held","on":"target"}],"summary":"One scene You seize a creature within range with your mind and lift it off the ground","auto":"heuristic","kinds":["damage","status"]},"bloodSorcery::Lightning Strike":{"name":"Lightning Strike","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"damage","amount":"dots + margin","baneful":false,"track":"health"}],"summary":"Instantaneous You call a bolt of lightning down on a creature or object outdoors that you can see within range","auto":"heuristic","kinds":["damage"],"elderSteps":[8]},"bloodSorcery::Lotus Sleep":{"name":"Lotus Sleep","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"resist acting on the feeling you planted"}],"summary":"One night Let a drop of your blood fall on the lips or eyelids of a sleeping mortal or ghoul, and it sinks…","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Marionette":{"name":"Marionette","discipline":"bloodSorcery","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"turn","fx":[{"kind":"status","status":"entranced","on":"target"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"(Homebrew) Rank 3 Physical Blood Sorcery power for our table","auto":"heuristic","kinds":["status","narrativeOnly"]},"bloodSorcery::Nepenthe":{"name":"Nepenthe","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::One with the Blade":{"name":"One with the Blade","discipline":"bloodSorcery","level":3,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"selfBonus","value":2,"targets":["fighting"],"situational":true,"note":"attacks with the anointed blade (1 Vitae, minor action)"}],"summary":"Permanent (anointing: one scene) · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"bloodSorcery::Palm of Flame":{"name":"Palm of Flame","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"1","baneful":true,"track":"health","text":"+1 baneful (burning hand); margin + 1 baneful (hurled, 3+ dots)","rider":true,"on":"self"}],"summary":"One scene A flame the size of a torch's springs up in your open hand","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Power over Life":{"name":"Power over Life","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You conjure a living creature: an animal, or a person you picture, whole, breathing and warm, but…","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Preservation":{"name":"Preservation","discipline":"bloodSorcery","level":1,"src":"book","book":"Courts-of-the-Damned","file":"out-a2/mod/Courts-of-the-Damned/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Until disturbed or ended · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Prison of Water":{"name":"Prison of Water","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"status","status":"held","on":"target"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One scene Water within range rises and closes around a creature standing in or next to it","auto":"heuristic","kinds":["status","narrativeOnly"]},"bloodSorcery::Reawakened Vigor":{"name":"Reawakened Vigor","discipline":"bloodSorcery","level":5,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"}],"summary":"Until the orb is drunk, or the dawn after it is dug up · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Reclamation of Vitae":{"name":"Reclamation of Vitae","discipline":"bloodSorcery","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"damage","amount":"2 * dots","baneful":false,"track":"health"}],"summary":"Instantaneous Concentrate for a turn and choose which of your ghouls will repay their blood debt","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Remote Access":{"name":"Remote Access","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"damage","amount":"1","track":"willpower","baneful":false,"on":"self","when":"manual","text":"the device is destroyed while you are in it"}],"summary":"One scene You take control of an electronic device you can see within range","auto":"curated","kinds":["damage"]},"bloodSorcery::Revealing the Crimson Trail":{"name":"Revealing the Crimson Trail","discipline":"bloodSorcery","level":1,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Riding the Earth's Veins":{"name":"Riding the Earth's Veins","discipline":"bloodSorcery","level":4,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Instantaneous (one-way trip) · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Ripples of the Heart":{"name":"Ripples of the Heart","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Stained-Love","file":"out-a2/mod/Blood-Stained-Love/items.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Up to a month Touch your own Blood, or blood you're feeding from (a mortal or a Kindred), and plant a…","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Rite of Introduction":{"name":"Rite of Introduction","discipline":"bloodSorcery","level":1,"src":"book","book":"Courts-of-the-Damned","file":"out-a2/mod/Courts-of-the-Damned/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Sanguine Interdict":{"name":"Sanguine Interdict","discipline":"bloodSorcery","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"weakened","note":"can't spend Vitae this scene: no powers that cost Vitae, no Blood Surge, no mending, no Blush of Life. Once: an action and 1 Willpower for a new contest","on":"target","when":"win"}],"summary":"One scene You lay your will over every drop of blood around you","auto":"curated","kinds":["status"]},"bloodSorcery::Sanguine Thread":{"name":"Sanguine Thread","discipline":"bloodSorcery","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"night","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests to track or find it"}],"summary":"One night Hold a sample of a creature's blood, or something soaked in it, and you feel a pull toward whoever…","auto":"heuristic","kinds":["selfBonus"]},"bloodSorcery::Sanguine Tidings":{"name":"Sanguine Tidings","discipline":"bloodSorcery","level":1,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Until read; one reader per success · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Scorpion's Sting":{"name":"Scorpion's Sting","discipline":"bloodSorcery","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":"physical"},{"kind":"damage","amount":"band(dots, 4, half(dots))","baneful":false,"track":"health","perTurn":true,"min":4,"text":"½ Blood Sorcery per turn (4+ dots)"}],"summary":"One scene You turn some of your Vitae into venom and coat your fangs, your nails, a melee weapon, or up to…","auto":"heuristic","kinds":["targetPenalty","damage"]},"bloodSorcery::Scour Secrets":{"name":"Scour Secrets","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"One night or until found You open a vein over a desk, a shelf or a stack of files and let the blood run","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Seal the Brand":{"name":"Seal the Brand","discipline":"bloodSorcery","level":1,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"damage","amount":"1","baneful":false,"track":"health","on":"target","text":"the brand; mended as normal"}],"summary":"Permanent · XP 8 Ingredients","auto":"curated","kinds":["damage"]},"bloodSorcery::Seeing with the Sky's Eyes":{"name":"Seeing with the Sky's Eyes","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Seek the Gathered Vitae":{"name":"Seek the Gathered Vitae","discipline":"bloodSorcery","level":4,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One hour · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Seeking Tiamat":{"name":"Seeking Tiamat","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"damage","amount":"1","baneful":true,"track":"health","on":"self","text":"the spike driven into your forearm"}],"summary":"Until you find it (about a scene) · XP 8 Ingredients","auto":"curated","kinds":["damage"]},"bloodSorcery::Seizure":{"name":"Seizure","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"turn","fx":[{"kind":"targetPenalty","impair":["dexterity"]},{"kind":"damage","amount":"1","baneful":false,"track":"health","perTurn":true,"min":4}],"summary":"You touch a creature and take its muscles away from it","auto":"heuristic","kinds":["targetPenalty","damage"]},"bloodSorcery::Shaft of Belated Dissolution":{"name":"Shaft of Belated Dissolution","discipline":"bloodSorcery","level":5,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"selfBonus","value":3,"targets":["fighting"],"situational":true,"note":"the staking attack"}],"summary":"Until used · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"book::Book-of-Nod-Apocrypha::bloodSorcery::Shape the Sanguine Sacrament":{"name":"Shape the Sanguine Sacrament","discipline":"bloodSorcery","level":1,"src":"book","book":"Book-of-Nod-Apocrypha","file":"out-a2/mod/Book-of-Nod-Apocrypha/items.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests to find, collect or clean up blood, and anyone searching lat"}],"summary":"One scene You make spilled blood or Vitae move and hold a shape: a word on a wall, a sigil drawn in perfect…","auto":"heuristic","kinds":["selfBonus"],"match":{"book":"Homebrew (Dennis)","level":1,"descLen":1092}},"book::Tattered-Facade::bloodSorcery::Shape the Sanguine Sacrament":{"name":"Shape the Sanguine Sacrament","discipline":"bloodSorcery","level":1,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"}],"summary":"One scene Spilled blood or Vitae within reach flows into a shape you concentrate on: a sign, a picture, a…","auto":"heuristic","kinds":["narrativeOnly"],"match":{"book":"Tattered Facade (V5)","level":1,"descLen":1085}},"bloodSorcery::Shared Memory":{"name":"Shared Memory","discipline":"bloodSorcery","level":1,"src":"book","book":"In-Memoriam","file":"out-a2/mod/In-Memoriam/items.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"The Memoriam · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Silentia Mortis":{"name":"Silentia Mortis","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"silenced","note":"once the holder activates it (minor action, 1 Vitae): all sound within Short of the holder is muted for an hour (twice as far on a critical win)"}],"summary":"One hour once activated · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Simulacrum Gate":{"name":"Simulacrum Gate","discipline":"bloodSorcery","level":5,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until as many have returned as went through · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Soporific Touch":{"name":"Soporific Touch","discipline":"bloodSorcery","level":2,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"max(1, margin)","targets":["social"],"situational":true,"note":"every test to resist social pressure, interrogation, Dominate or…"}],"summary":"The rest of the scene · XP 8 Ingredients","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Soul of the Hemonculus":{"name":"Soul of the Hemonculus","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes the target's memories: the Storyteller plays it out"}],"summary":"Permanent · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Stagnate the Blood":{"name":"Stagnate the Blood","discipline":"bloodSorcery","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":["physical"],"situational":true,"note":"Physical tests instead"},{"kind":"damage","amount":"band(dots, 4, margin)","baneful":false,"track":"health","min":4,"onlyMortal":true,"when":"manual","text":"Margin of success, mortals only (4+ dots)"}],"summary":"One scene You thicken the blood in a target's veins until it crawls","auto":"heuristic","kinds":["targetPenalty","damage"]},"bloodSorcery::Stolen Memory":{"name":"Stolen Memory","discipline":"bloodSorcery","level":2,"src":"book","book":"In-Memoriam","file":"out-a2/mod/In-Memoriam/items.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"The Memoriam · XP 8 · Downtime Taking Half allowed Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Stone of the True Form":{"name":"Stone of the True Form","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"targetPenalty","value":"margin","targets":[],"situational":true,"note":"its next attempt to resume, repair itself or change shape","on":"target","when":"win"}],"summary":"One turn · XP 8 Ingredients","auto":"curated","kinds":["targetPenalty"]},"bloodSorcery::Summon the Simple Form":{"name":"Summon the Simple Form","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One scene You conjure a simple object out of nothing into your hand or at your feet: something made of one…","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::The Balm of Bathory":{"name":"The Balm of Bathory","discipline":"bloodSorcery","level":4,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"selfBonus","value":1,"targets":["social"],"situational":true,"note":"social tests where your looks matter, while you keep applying the balm","lasts":"maintained"}],"summary":"One week, if applied regularly · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"bloodSorcery::The Ritual of Transferring the Soul (Blood Sorcery)":{"name":"The Ritual of Transferring the Soul (Blood Sorcery)","discipline":"bloodSorcery","level":5,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Permanent · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Theft of Vitae":{"name":"Theft of Vitae","discipline":"bloodSorcery","level":3,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"health","when":"manual","text":"Margin of success (plus Vitae drained = Blood Sorcery dots)"},{"kind":"resource","resource":"vitae","amount":"dots","on":"self","when":"win"},{"kind":"resource","resource":"vitae","amount":"-(dots)","on":"target"}],"summary":"Instantaneous A thin stream of blood leaps from a target you can see within range straight into your mouth","auto":"heuristic","kinds":["damage","resource"]},"bloodSorcery::Tiamat Glistens":{"name":"Tiamat Glistens","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","value":1,"targets":["bloodSorcery"],"situational":true,"note":"rituals at this site: its bonus, usually +1 to +3 (add the rest by hand); one night per success","lasts":"maintained"}],"summary":"One night per success · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"bloodSorcery::Transitive Bond":{"name":"Transitive Bond","discipline":"bloodSorcery","level":2,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent When you store your blood, or feed it to a ghoul, you can make it keep its binding power","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Trespass":{"name":"Trespass","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"hidden","note":"inside the building ordinary people take you for part of it, for about thirty minutes; 1 Willpower to flow through cracks and vents. Supernatural beings see you normally"}],"summary":"About thirty minutes, while the thread is wet · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Truth of Blood":{"name":"Truth of Blood","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene, or until the first failure · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Twin Working":{"name":"Twin Working","discipline":"bloodSorcery","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-D.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"targetPenalty","on":"self","value":1,"targets":["bloodSorcery"],"situational":true,"note":"each of the two Power tests this turn"}],"summary":"One turn Once per scene, as a minor action, you split your attention between two workings","auto":"curated","kinds":["targetPenalty"]},"bloodSorcery::Unseen Underground":{"name":"Unseen Underground","discipline":"bloodSorcery","level":1,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"hidden","note":"unseen and unheard while underground; ends above ground or on a hostile action"},{"kind":"targetPenalty","on":"self","value":2,"targets":["subterfuge"],"situational":true,"when":"manual","lasts":"night","note":"after a painful failure: sneaking or hiding, until dawn"}],"summary":"One hour · XP 8 Ingredients","auto":"curated","kinds":["status","targetPenalty"]},"bloodSorcery::Uriel's Disfavor":{"name":"Uriel's Disfavor","discipline":"bloodSorcery","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"all tests while in ordinary electric light"},{"kind":"damage","amount":"margin","baneful":true,"track":"health","perTurn":true,"when":"manual","text":"1 baneful per turn in bright light"}],"summary":"One night The verse turns light against a vampire or Duskborn within range that hears it","auto":"heuristic","kinds":["targetPenalty","damage"]},"bloodSorcery::Vinculum Magnum":{"name":"Vinculum Magnum","discipline":"bloodSorcery","level":2,"src":"book","book":"Courts-of-the-Damned","file":"out-a2/mod/Courts-of-the-Damned/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"power","note":"this drink counts as two occasions toward the Blood Bond to you: record the drink twice in the Blood Bonds window"}],"summary":"Instantaneous You thicken the binding power of the Vitae you give","auto":"curated","kinds":["status"]},"bloodSorcery::Viral Haruspex":{"name":"Viral Haruspex","discipline":"bloodSorcery","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes the target's memories: the Storyteller plays it out"}],"summary":"Instantaneous · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Viscera Garden":{"name":"Viscera Garden","discipline":"bloodSorcery","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"resist a contested power, and a power with a set Difficulty gets −1…","lasts":"maintained"}],"summary":"While watered monthly · XP 8 Ingredients","auto":"heuristic","kinds":["targetPenalty"]},"bloodSorcery::Voice of Command":{"name":"Voice of Command","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene For the scene you can see and hear spirits within range, the spirits of wild places, storms and…","auto":"heuristic","kinds":["narrativeOnly"]},"bloodSorcery::Wake with Evening's Freshness":{"name":"Wake with Evening's Freshness","discipline":"bloodSorcery","level":1,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"aided","note":"wakes at once when danger threatens by day, and ignores the penalty for being awake by day for that scene"}],"summary":"One scene · XP 8 Ingredients","auto":"curated","kinds":["status"]},"bloodSorcery::Ward against Ghouls":{"name":"Ward against Ghouls","discipline":"bloodSorcery","level":2,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"night","fx":[{"kind":"damage","amount":"dots","track":"health","baneful":false,"when":"manual","text":"Each time a ghoul touches the object, whether it won that test or was shoved against it,…"}],"summary":"One night (the whole next story if cast in downtime) · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Ward against Kindred":{"name":"Ward against Kindred","discipline":"bloodSorcery","level":5,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"shield","note":"a vampire must win Self-Control against your Blood Sorcery dots to touch or pass the warded object","lasts":"night"},{"kind":"damage","amount":"half(dots)","baneful":true,"track":"health","on":"target","when":"manual","text":"a vampire touches the warded object, or is shoved against it"}],"summary":"One night (the whole next story if cast in downtime) · XP 8 Ingredients","auto":"curated","kinds":["status","damage"]},"bloodSorcery::Ward against Lupines":{"name":"Ward against Lupines","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"damage","amount":"dots","track":"health","baneful":false,"when":"manual","text":"Each time it touches the object, whether it won that test or was shoved against it, it…"}],"summary":"One night (the whole next story if cast in downtime) · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Ward against Spirits":{"name":"Ward against Spirits","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"damage","amount":"dots","track":"health","baneful":false,"when":"manual","text":"A spirit can force its way through only by winning a test with its largest applicable…"}],"summary":"One night (the whole next story if cast in downtime) · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Warding Circle against Ghouls":{"name":"Warding Circle against Ghouls","discipline":"bloodSorcery","level":2,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"damage","amount":"dots","track":"health","baneful":false,"when":"manual","text":"A ghoul that touches it anyway, or is shoved against it, takes damage equal to your dots…"}],"summary":"Until dawn, or a year and a day · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Warding Circle against Kindred":{"name":"Warding Circle against Kindred","discipline":"bloodSorcery","level":5,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a ward or barrier: whether something crosses it is the Storyteller's call"},{"kind":"status","status":"shield","note":"vampires and Duskborn other than you must win Self-Control against your Blood Sorcery dots to cross or touch the circle","lasts":"night"},{"kind":"damage","amount":"half(dots)","baneful":true,"track":"health","on":"target","when":"manual","text":"a vampire touches the circle, or is shoved against it"}],"summary":"Until dawn, or a year and a day · XP 8 Ingredients","auto":"curated","kinds":["status","damage"]},"bloodSorcery::Warding Circle against Lupines":{"name":"Warding Circle against Lupines","discipline":"bloodSorcery","level":4,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"damage","amount":"dots","track":"health","baneful":false,"when":"manual","text":"A werewolf that touches it anyway, or is shoved against it, takes damage equal to your…"}],"summary":"Until dawn, or a year and a day · XP 8 Ingredients","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Warding Circle against Spirits":{"name":"Warding Circle against Spirits","discipline":"bloodSorcery","level":3,"src":"book","book":"Core-Rulebook-Enhanced-Edition","file":"out-a2/mod/Core-Rulebook-Enhanced-Edition/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shield","note":"spirits can't cross; one forces its way in only by beating your Blood Sorcery dots with its best pool","lasts":"night"},{"kind":"damage","amount":"dots","baneful":false,"track":"health","on":"target","when":"manual","text":"a spirit forces its way into the circle"}],"summary":"Until dawn, or a year and a day · XP 8 Ingredients","auto":"curated","kinds":["status","damage"]},"bloodSorcery::Watered Blood":{"name":"Watered Blood","discipline":"bloodSorcery","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"health","when":"manual","text":"Vitae loss ½ Blood Sorcery + margin; mortal also takes margin damage"}],"summary":"Instantaneous You touch a creature and turn some of the blood in its veins to plain water","auto":"heuristic","kinds":["damage"]},"bloodSorcery::Web of Hunger":{"name":"Web of Hunger","discipline":"bloodSorcery","level":4,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"power","note":"for a month you spend no Vitae to rise from daysleep","lasts":"maintained"},{"kind":"resource","resource":"vitae","amount":"half(dots)","on":"self","when":"manual","label":"Vitae from the web (once a night, a minor action)"}],"summary":"One month · XP 8 Ingredients","auto":"curated","kinds":["status","resource"]},"bloodSorcery::Wooden Tongues":{"name":"Wooden Tongues","discipline":"bloodSorcery","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You touch something made of wood, stone, earth or metal, such as a wall, a statue, a doorframe or…","auto":"heuristic","kinds":["narrativeOnly"]},"celerity::A Thousand Cuts":{"name":"A Thousand Cuts","discipline":"celerity","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"turn","fx":[{"kind":"status","status":"speed"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"targetPenalty","impair":["physical"],"when":"manual","lasts":"scene","note":"a living target: Physical Attributes impaired for the scene"}],"summary":"Your next attack this turn Your next Fighting attack this turn, with claws or an edged weapon, adds your…","auto":"curated","kinds":["status","targetPenalty"]},"celerity::Between Heartbeats":{"name":"Between Heartbeats","discipline":"celerity","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"maintained","fx":[{"kind":"status","status":"speed"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Two turns of your own Once per night you slip between one instant and the next","auto":"heuristic","kinds":["status","narrativeOnly"]},"celerity::Blink":{"name":"Blink","discipline":"celerity","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"speed","note":"move up to Medium distance and keep your action"},{"kind":"selfBonus","value":"half(dots)","targets":["fighting"],"situational":true,"note":"first melee attack after moving","min":4}],"summary":"Move up to Medium each turn.","auto":"curated","kinds":["status","selfBonus"],"elderSteps":[8]},"celerity::Blurred Passage":{"name":"Blurred Passage","discipline":"celerity","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"status","status":"speed","note":"one body part passes through solid matter","steps":[{"level":5,"note":"your whole body passes through solid matter"}]},{"kind":"upkeep","amount":1,"resource":"willpower","per":"turnEnd","note":"At the end of your turn, 1 Willpower extends it to the end of your next turn."}],"summary":"Part of you passes through solid objects.","auto":"curated","kinds":["status","upkeep"]},"celerity::Cat's Grace":{"name":"Cat's Grace","discipline":"celerity","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"speed","note":"automatic win on balance tests on narrow supports"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Perfect balance.","auto":"curated","kinds":["status","narrativeOnly"],"elderSteps":[8]},"celerity::Draught of Elegance":{"name":"Draught of Elegance","discipline":"celerity","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"speed","note":"this scene it has Celerity dots equal to half yours (rounded down) and can use your Celerity powers up to that rank, paying from its own Vitae; the drink counts toward a Blood Bond","on":"target"}],"summary":"One scene Your speed saturates your blood, and you can share it","auto":"curated","kinds":["status"]},"celerity::Faster than Light":{"name":"Faster than Light","discipline":"celerity","level":3,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"turn","fx":[{"kind":"status","status":"speed"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"One turn You can only use this while Blink is active","auto":"heuristic","kinds":["status","narrativeOnly"]},"celerity::Fighter's Alacrity":{"name":"Fighter's Alacrity","discipline":"celerity","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"maintained","fx":[{"kind":"extraAction","actions":"max(1, extra)","note":"must use a Physical Attribute"},{"kind":"upkeep","amount":1,"resource":"willpower","per":"turnStart","note":"1 Willpower per extra action at the start of each later turn, or the power ends."}],"summary":"Extra action each turn (Physical); Willpower upkeep per extra action.","ask":{"extra":{"label":"Extra actions","max":"band(dots, 0, 1, 6, 2, 8, 3)","default":1}},"auto":"curated","kinds":["extraAction","upkeep"]},"celerity::Flower of Death":{"name":"Flower of Death","discipline":"celerity","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"every unarmed and melee attack test you make"}],"summary":"One scene Your speed pours into every blow","auto":"heuristic","kinds":["selfBonus"]},"celerity::Kinetic Disruption":{"name":"Kinetic Disruption","discipline":"celerity","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene","note":"successes set the hardest material damaged"},{"kind":"damage","when":"manual","amount":"half(dots)","min":3,"text":"add half Celerity to an unarmed or light melee attack","note":"extra damage on the attack made with the power"}],"summary":"Vibration cracks the touched object.","auto":"curated","kinds":["damage"],"elderSteps":[8]},"celerity::Paragon of Motion":{"name":"Paragon of Motion","discipline":"celerity","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"turn","fx":[{"kind":"status","status":"speed"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"One turn For one turn you move with perfect grace","auto":"heuristic","kinds":["status","narrativeOnly"]},"celerity::Rapid Reflexes":{"name":"Rapid Reflexes","discipline":"celerity","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"selfBonus","value":2,"targets":["athletics"],"situational":true,"note":"Dodge defense tests","steps":[{"level":3,"value":3},{"level":5,"value":4},{"level":7,"value":5}]},{"kind":"status","status":"speed"}],"summary":"+2 dice on Dodge defense (more with Maturing); 1 turn + 1 per success.","turns":"1 + successes","auto":"curated","kinds":["selfBonus","status"],"elderSteps":[8]},"celerity::Rush Job":{"name":"Rush Job","discipline":"celerity","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"speed","note":"turn-long tasks take seconds; scene-long tasks take a minute"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Time-consuming work in a blur.","auto":"curated","kinds":["status","narrativeOnly"]},"celerity::Unerring Aim":{"name":"Unerring Aim","discipline":"celerity","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"turn","fx":[{"kind":"status","status":"speed"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One turn The world slows to a crawl while you aim","auto":"heuristic","kinds":["status","narrativeOnly"]},"celerity::Willful Grace":{"name":"Willful Grace","discipline":"celerity","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","trait":"dexterity","value":"1 + extra"},{"kind":"status","status":"speed"}],"summary":"Dexterity +1 for the scene (counts as Blood Surge, one dot past the tier limit).","ask":{"extra":{"label":"Extra Willpower (each +1 Dexterity, ●●●● only)","max":"band(dots, 4, 3)","cost":{"resource":"willpower","each":1},"hint":"You still can't go more than 1 dot past your tier's Blood Surge limit."}},"auto":"curated","kinds":["selfBonus","status"]},"corruption::Cobra Fangs":{"name":"Cobra Fangs","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":["strength"]},{"kind":"damage","amount":"margin","baneful":false,"track":"health","onlyMortal":true,"when":"manual","text":"venom: 2, then 1 per turn (mortals); Vitae loss (vampires)"},{"kind":"damage","amount":"margin","baneful":false,"track":"health","perTurn":true,"onlyMortal":true,"when":"manual","text":"venom: 2, then 1 per turn (mortals); Vitae loss (vampires)"}],"summary":"One scene Your fangs become a cobra's, hollow and dripping, though the rest of you stays as it is","auto":"heuristic","kinds":["targetPenalty","damage"]},"corruption::Contradict":{"name":"Contradict","discipline":"corruption","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"status","status":"confused","note":"must spend its next action doing the opposite of what it meant","on":"target","steps":[{"level":3,"note":"driven to change its goals for the scene"}]}],"summary":"The target reverses its next action.","steps":[{"level":3,"duration":"scene"}],"auto":"curated","kinds":["status"]},"corruption::Dark Secrets":{"name":"Dark Secrets","discipline":"corruption","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"it blurts out a secret; a bigger margin, a deeper secret"},{"kind":"selfBonus","value":2,"targets":["charisma","manipulation","composure"],"situational":true,"note":"Social tests against the target using the secret","when":"win"}],"summary":"+2 dice on Social tests that use the secret against it (toggle).","auto":"curated","kinds":["selfBonus"]},"corruption::Doubt Competence":{"name":"Doubt Competence","discipline":"corruption","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":1,"targets":[],"situational":true,"note":"tests for the named activity"},{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"ends if it wins one of those tests by margin 2+; ●●●: a vampire pays 1 extra Willpower per power"}],"summary":"−1 die on tests of one activity (toggle).","auto":"curated","kinds":["targetPenalty"]},"corruption::Estrange":{"name":"Estrange","discipline":"corruption","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests to defend or help its allies"},{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"no assist action; Blood Bonds one stage weaker; vinculum ignored"}],"summary":"−2 dice to defend or help allies (toggle).","auto":"curated","kinds":["targetPenalty"]},"corruption::Fool the Heart's Eye":{"name":"Fool the Heart's Eye","discipline":"corruption","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":2,"targets":["charisma","manipulation","composure"],"situational":true,"note":"Social tests against the target","when":"win"},{"kind":"status","status":"entranced","note":"treats you as someone it loves","on":"target"}],"summary":"+2 dice on Social tests against the deceived target.","auto":"curated","kinds":["selfBonus","status"]},"corruption::Form of the Cobra":{"name":"Form of the Cobra","discipline":"corruption","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests the form helps with: sneaking, climbing, squeezing through a"},{"kind":"damage","amount":"3 + margin","baneful":false,"track":"health","perTurn":true,"onlyMortal":true,"when":"manual","text":"3 (medium weapon) + margin; venom 1 per turn to mortals"}],"summary":"One scene You become a great black cobra, as long as you are tall and as heavy as you are","auto":"heuristic","kinds":["selfBonus","damage"]},"corruption::Heart Thief":{"name":"Heart Thief","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"instant","fx":[{"kind":"status","status":"held","on":"target","lasts":"maintained"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Instantaneous You push your hand into a creature's chest as if it were water and draw out its heart, leaving…","auto":"heuristic","kinds":["status","narrativeOnly"]},"corruption::Mark of Damnation":{"name":"Mark of Damnation","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"night","fx":[{"kind":"targetPenalty","value":"3","targets":["social"],"situational":true,"note":"all Social tests except tests to intimidate"}],"summary":"One night (a week on a margin of 3 or more) You brand a creature with your god's contempt","auto":"heuristic","kinds":["targetPenalty"]},"corruption::Nightmare Glimpses":{"name":"Nightmare Glimpses","discipline":"corruption","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests against you, except to get away","steps":[{"level":3,"value":3}]},{"kind":"status","status":"fear","on":"target"}],"summary":"−2 dice to tests against you (−3 at ●●●).","auto":"curated","kinds":["targetPenalty","status"],"elderSteps":[7]},"corruption::Pact with Ra":{"name":"Pact with Ra","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"shield","note":"sunlight does no harm and risks no fear frenzy from sunrise to sunset. At sunset: lose half your current Vitae, rounded up. The module skips sunlight damage and takes the Vitae at New Night"}],"summary":"One day Before dawn you spend a scene in prayer to the sun that hates you, and for one day it lets you pass","auto":"curated","kinds":["status"]},"corruption::Poison Heart":{"name":"Poison Heart","discipline":"corruption","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"max(1, margin)","targets":["composure","resolve"],"situational":true,"note":"tests to resist frenzy"}],"summary":"Penalty = margin on its tests to resist frenzy (toggle).","auto":"curated","kinds":["targetPenalty"]},"corruption::Seed of Corruption":{"name":"Seed of Corruption","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests to resist temptation, bribery, seduction and Corruption powers"}],"summary":"One week With a touch and a few words the target soon forgets, you plant a slow rot in its conscience","auto":"heuristic","kinds":["targetPenalty"]},"corruption::Set's Curse":{"name":"Set's Curse","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests to act against your spoken orders"},{"kind":"targetPenalty","impair":"physical"}],"summary":"One night (a week on a margin of 3 or more) Touch a creature and curse it with the shape of a serpent","auto":"heuristic","kinds":["targetPenalty"]},"corruption::Skin of the Adder":{"name":"Skin of the Adder","discipline":"corruption","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests to escape a wrestle, bonds or restraints"},{"kind":"damageReduction","amount":"1","min1":false,"notBaneful":true}],"summary":"One scene Your skin turns to mottled scales and your bones loosen like a snake's","auto":"heuristic","kinds":["selfBonus","damageReduction"]},"corruption::Tainted":{"name":"Tainted","discipline":"corruption","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":["$choice"],"situational":false,"label":"{v} $choice tests"}],"summary":"−2 dice to all Social or Mental tests.","ask":{"choose":{"label":"Penalty on","options":[{"value":"social","label":"Social tests"},{"value":"mental","label":"Mental tests"}]}},"auto":"curated","kinds":["targetPenalty"]},"corruption::Temptation":{"name":"Temptation","discipline":"corruption","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests for anything else"}],"summary":"One night You talk to a creature about something it wants and shouldn't have: a drink, someone else's lover,…","auto":"heuristic","kinds":["targetPenalty"]},"corruption::Tongue of the Asp":{"name":"Tongue of the Asp","discipline":"corruption","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"damage","amount":"2 + margin","baneful":false,"track":"health","text":"2 (light weapon) + margin"}],"summary":"One scene Your tongue grows long, forked and tough as a whip","auto":"heuristic","kinds":["damage"]},"dominate::Ancestral Dominion":{"name":"Ancestral Dominion","discipline":"dominate","level":3,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"(Homebrew) Rank 3 Mental Dominate power for our table","auto":"heuristic","kinds":["narrativeOnly"]},"dominate::Apathy":{"name":"Apathy","discipline":"dominate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":false,"steps":[{"level":3,"value":3}],"label":"{v} tests not about self-preservation"},{"kind":"selfBonus","on":"target","when":"win","value":1,"targets":["composure","resolve"],"situational":true,"note":"resist strong emotion (frenzy too)","steps":[{"level":3,"value":2}]},{"kind":"status","status":"entranced","on":"target","steps":[{"level":5,"note":"can't summon the energy to move"}]}],"summary":"Flat feelings: −2 to tests not about self-preservation, +1 to resist emotion.","auto":"curated","kinds":["targetPenalty","selfBonus","status"]},"dominate::Blood Leash":{"name":"Blood Leash","discipline":"dominate","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"Instantaneous Your will rides in your blood, however long it has been out of your body","auto":"heuristic","kinds":["narrativeOnly"]},"dominate::Chain of Command":{"name":"Chain of Command","discipline":"dominate","level":2,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"night","fx":[{"kind":"selfBonus","value":"dots","targets":["social"],"situational":true,"note":"Social tests to persuade, order or recruit people to help achieve…","on":"target"}],"summary":"As the command Your thralls drag others along with them","auto":"heuristic","kinds":["selfBonus"]},"dominate::Chain the Psyche (Dominate)":{"name":"Chain the Psyche (Dominate)","discipline":"dominate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until the guarded power ends You lock your commands in with pain","auto":"heuristic","kinds":["narrativeOnly"]},"dominate::Cloud Memory":{"name":"Cloud Memory","discipline":"dominate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"it forgets up to the last 5 minutes (more with Maturing)"}],"summary":"The target forgets.","auto":"curated","kinds":["narrativeOnly"],"elderSteps":[8]},"dominate::Command":{"name":"Command","discipline":"dominate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"status","status":"entranced","note":"obeys a one-sentence command","on":"target"}],"summary":"The target must obey.","auto":"curated","kinds":["status"]},"dominate::Conditioning":{"name":"Conditioning","discipline":"dominate","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"maintained","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests that call for creativity or acting without instructions"}],"summary":"Until it fades Night after night you wear a mind into the shape you want","auto":"heuristic","kinds":["targetPenalty"]},"dominate::Deliver Command":{"name":"Deliver Command","discipline":"dominate","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"a Dominate power planted to be passed on"}],"summary":"A carried command.","steps":[{"level":5,"duration":"maintained"}],"auto":"curated","kinds":["narrativeOnly"]},"dominate::Dementation":{"name":"Dementation","discipline":"dominate","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"willpower"}],"summary":"One scene Nothing you say is quite wrong, yet every word picks at the listener's sanity","auto":"heuristic","kinds":["damage"]},"dominate::Domitor's Favor":{"name":"Domitor's Favor","discipline":"dominate","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"acting against your direct will"}],"summary":"Until the end of the bond's interval You tighten the hold your blood has on a thrall","auto":"curated","kinds":["targetPenalty"]},"dominate::Far Mastery":{"name":"Far Mastery","discipline":"dominate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"resource","resource":"willpower","amount":"-1","on":"self","when":"manual","note":"the target is a vampire or other supernatural creature","label":"−1 Willpower: the target is a vampire or other supernatural creature"}],"summary":"One scene You reach out to a creature you know, one you have met face to face, wherever it is, as long as…","auto":"curated","kinds":["resource"]},"dominate::Lethe's Call":{"name":"Lethe's Call","discipline":"dominate","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes the target's memories: the Storyteller plays it out"}],"summary":"Permanent With a glance you blank out whole stretches of a creature's life","auto":"heuristic","kinds":["narrativeOnly"]},"dominate::Puppet Master":{"name":"Puppet Master","discipline":"dominate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"night","fx":[{"kind":"selfBonus","value":"-2","targets":[],"situational":true,"note":"your own tests while your attention is spread so thin"}],"summary":"One night You gather the strings of every mind you hold","auto":"heuristic","kinds":["selfBonus"]},"dominate::Sap Will":{"name":"Sap Will","discipline":"dominate","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"damage","amount":"half(dots)","track":"willpower","steps":[{"level":6,"amount":"dots"}]}],"summary":"Each won Power test (instead of a Social test) deals Willpower damage.","repeat":{"note":"Each Social test against the target becomes a Power test: choose \"Same activation\" for it."},"auto":"curated","kinds":["damage"]},"dominate::Slavish Devotion":{"name":"Slavish Devotion","discipline":"dominate","level":2,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"4","targets":[],"situational":true,"note":"it (V5: −4 dice in a contest","lasts":"maintained"}],"summary":"Permanent Anyone you currently hold with one of your Dominate powers (including a Submerged Directive still…","auto":"heuristic","kinds":["targetPenalty"]},"dominate::Speak Through the Blood":{"name":"Speak Through the Blood","discipline":"dominate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"maintained","fx":[{"kind":"targetPenalty","value":"1","targets":[],"situational":true,"note":"act against it but needn't spend anything"}],"summary":"Decades Once a year you can whisper a command down your bloodline","auto":"heuristic","kinds":["targetPenalty"]},"dominate::Stifle Will":{"name":"Stifle Will","discipline":"dominate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"targetPenalty","value":2,"targets":["composure","resolve"],"situational":true,"note":"Self-Control tests"},{"kind":"status","status":"entranced","note":"can't spend Willpower","on":"target"}],"summary":"No Willpower; −2 on Self-Control; 1 turn + 1 per margin.","turns":"1 + margin","auto":"curated","kinds":["targetPenalty","status"]},"dominate::Still the Mortal Flesh":{"name":"Still the Mortal Flesh","discipline":"dominate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-A.json","duration":"turn","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":false},{"kind":"targetPenalty","value":"2","targets":["physical"],"situational":false}],"summary":"Your will reaches past a creature's mind into the workings of its body","auto":"heuristic","kinds":["targetPenalty"]},"dominate::Submerged Directive":{"name":"Submerged Directive","discipline":"dominate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller","note":"a complex command, now or on a trigger"}],"summary":"A planted command.","steps":[{"level":4,"duration":"maintained"}],"auto":"curated","kinds":["narrativeOnly"]},"dominate::Suppress Mind":{"name":"Suppress Mind","discipline":"dominate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","trait":"$choice","value":"margin"}],"summary":"One Mental Attribute lowered by the margin.","ask":{"choose":{"label":"Mental Attribute","options":["intelligence","wits","resolve"]}},"auto":"curated","kinds":["targetPenalty"],"elderSteps":[7]},"dominate::Tabula Rasa":{"name":"Tabula Rasa","discipline":"dominate","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent You hold the gaze of a restrained or submissive victim for a full scene and scrape its mind empty","auto":"heuristic","kinds":["narrativeOnly"]},"dominate::The Stolen Voice":{"name":"The Stolen Voice","discipline":"dominate","level":1,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"silenced","note":"can't communicate in any meaningful way this scene; powers and abilities that need it to speak or be understood fail","on":"target","when":"win"}],"summary":"One scene You take a creature's voice, and every other way it has to make itself understood","auto":"curated","kinds":["status"]},"dominate::Whispers of Unreason":{"name":"Whispers of Unreason","discipline":"dominate","level":3,"src":"ported","file":"out-a2/disciplines/ported-A.json","duration":"scene","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"willpower"}],"summary":"One scene You must know Dementation","auto":"heuristic","kinds":["damage"]},"fortitude::Calloused Soul":{"name":"Calloused Soul","discipline":"fortitude","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"night","fx":[{"kind":"status","status":"shield"},{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Until dawn Rather than let the Beast eat away at you by chance, you wound your own humanity on purpose to…","auto":"heuristic","kinds":["status","narrativeOnly"]},"fortitude::Comrade's Aegis":{"name":"Comrade's Aegis","discipline":"fortitude","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"shield","note":"while within Medium of you: half of any normal damage it takes from an attack (rounded down) goes to you instead, split before either of you applies Endurance. The drink counts toward a Blood Bond","on":"target","lasts":"night"}],"summary":"One night You bind a comrade to you through your blood and take part of every blow meant for it","auto":"curated","kinds":["status"]},"fortitude::Curse the Laurel":{"name":"Curse the Laurel","discipline":"fortitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"damage","amount":"2","baneful":true,"track":"health","on":"self","when":"manual","text":"the stake tears free of your heart"}],"summary":"Permanent Your heart rejects the wood","auto":"curated","kinds":["damage"]},"fortitude::Defiance of the Dawn":{"name":"Defiance of the Dawn","discipline":"fortitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"status","status":"shield"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One scene Once per night, for one scene, fire and sunlight lose their hold on you","auto":"heuristic","kinds":["status","narrativeOnly"]},"fortitude::Defy Bane":{"name":"Defy Bane","discipline":"fortitude","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"status","status":"shield"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One scene You steel your body against the things that truly destroy your kind","auto":"heuristic","kinds":["status","narrativeOnly"]},"fortitude::Eternal Vigilance":{"name":"Eternal Vigilance","discipline":"fortitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"maintained","fx":[{"kind":"status","status":"shield"},{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Until the next sunset The day no longer takes you unless you let it","auto":"heuristic","kinds":["status","narrativeOnly"]},"fortitude::Fortify":{"name":"Fortify","discipline":"fortitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"status","status":"shield","note":"Power test against the attack replaces your defense tests"},{"kind":"narrativeOnly","why":"replaces your defense tests: roll the power against the attack"}],"summary":"Defend with Stamina + Fortitude.","steps":[{"level":3,"turns":2},{"level":5,"duration":"scene"}],"auto":"curated","kinds":["status","narrativeOnly"]},"fortitude::Hardened Skin":{"name":"Hardened Skin","discipline":"fortitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"damageReduction","amount":"min(1 + extra, half(dots))","min1":false,"notBaneful":true}],"summary":"Physical damage −1 per Vitae spent (max half Fortitude), not baneful.","ask":{"extra":{"label":"Extra Vitae (each −1 more damage)","max":"max(0, half(dots) - 1)","cost":{"resource":"vitae","each":1}}},"auto":"curated","kinds":["damageReduction"]},"fortitude::Khan's Gambit":{"name":"Khan's Gambit","discipline":"fortitude","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Instantaneous You roll with a blow you can't avoid and send its force into someone else","auto":"heuristic","kinds":["narrativeOnly"]},"fortitude::Meat Shields":{"name":"Meat Shields","discipline":"fortitude","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"selfBonus","trait":"fortitude","value":1,"note":"Fortitude counts higher by half the weak mortals within Close (at most +5): this adds 1, set the rest by hand"}],"summary":"One scene, or until you leave them Among weak mortals (the sick and dying, children, the wounded) your Blood…","auto":"curated","kinds":["selfBonus"]},"fortitude::Prowess from Pain":{"name":"Prowess from Pain","discipline":"fortitude","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"1","targets":["physical"],"situational":true,"note":"tests using a Physical Attribute for every 2 points of damage on y"}],"summary":"One scene Every wound you carry drives you on instead of slowing you down","auto":"heuristic","kinds":["selfBonus"]},"fortitude::Purification":{"name":"Purification","discipline":"fortitude","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"ends a 1-dot Social or Mental power on you (more with Maturing): end it by hand"}],"summary":"Throw off a lesser power.","auto":"curated","kinds":["narrativeOnly"]},"fortitude::Repair the Undead Flesh":{"name":"Repair the Undead Flesh","discipline":"fortitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"heal","track":"baneful","amount":1}],"summary":"Permanent Your blood can knit even what fire and sunlight burned away","auto":"curated","kinds":["heal"]},"fortitude::Restore Limb":{"name":"Restore Limb","discipline":"fortitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"heal","track":"impairment","amount":1},{"kind":"narrativeOnly","why":"removes limb impairments: clear them by hand"}],"summary":"One limb whole again.","auto":"curated","kinds":["heal"]},"fortitude::Retributive Hide":{"name":"Retributive Hide","discipline":"fortitude","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"shield","note":"attackers take half the damage you take (full if 1 more Vitae at ●●●●●●); projectiles and weapons break","reflect":"half"}],"summary":"Harm comes back on your attackers.","auto":"curated","kinds":["status"],"elderSteps":[8]},"fortitude::Self-Assurance":{"name":"Self-Assurance","discipline":"fortitude","level":2,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"maintained","fx":[{"kind":"status","status":"shield"},{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Until the social conflict ends When someone tries to cut you down to size, your ego doesn't budge","auto":"heuristic","kinds":["status","narrativeOnly"]},"fortitude::Shared Resilience":{"name":"Shared Resilience","discipline":"fortitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"damageReduction","amount":"genMod","min1":false,"notBaneful":true,"on":"target","when":"activate"},{"kind":"damageReduction","noEndurance":true,"notBaneful":true}],"summary":"The target reduces damage by your generation modifier; you lose your Vampiric Endurance.","auto":"curated","kinds":["damageReduction"],"elderSteps":[7]},"fortitude::Unmoving":{"name":"Unmoving","discipline":"fortitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":["strength","stamina","athletics"],"situational":true,"note":"defending against wrestle attacks"},{"kind":"status","status":"shield","note":"nothing can move you against your will"}],"summary":"Can't be moved; half Fortitude to defend against wrestling (toggle).","auto":"curated","kinds":["selfBonus","status"]},"fortitude::Unswayable Mind":{"name":"Unswayable Mind","discipline":"fortitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":["charisma","manipulation","composure","intelligence","wits","resolve"],"situational":true,"note":"resisting influence on your mind"}],"summary":"Half Fortitude dots to resist mental influence (toggle).","auto":"curated","kinds":["selfBonus"],"elderSteps":[7]},"necromancy::Ashen Relic":{"name":"Ashen Relic","discipline":"necromancy","level":2,"src":"book","book":"Book-of-Nod-Apocrypha","file":"out-a2/mod/Book-of-Nod-Apocrypha/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Until destroyed or exposed to sunlight · XP 8 Requires Grave Rot or Shroudsight (Necromancy 1), which…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Awaken the Homuncular Servant":{"name":"Awaken the Homuncular Servant","discipline":"necromancy","level":2,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Requires Shroudsight (Necromancy 1), which replaces Where the Veil Thins","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Befoul Vessel":{"name":"Befoul Vessel","discipline":"necromancy","level":4,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"weakened","note":"a vampire that feeds on it loses as much Vitae as it would have gained; the victim dies in its sleep the next night","on":"target","lasts":"night"}],"summary":"Until the vessel dies, the next night · XP 8 Prerequisite: Charnel Miasma (V5 required \"Necrotic Touch\")","auto":"curated","kinds":["status"]},"necromancy::Bind the Spirit":{"name":"Bind the Spirit","discipline":"necromancy","level":4,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"resist feeling and acting as the ghost feels","lasts":"maintained"}],"summary":"Until released or broken · XP 8 Requires Charnel Miasma (Necromancy 2) with Necromancy at 6 dots or more,…","auto":"heuristic","kinds":["targetPenalty"]},"necromancy::Bind to Mortal Form":{"name":"Bind to Mortal Form","discipline":"necromancy","level":4,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Decades · XP 8 Prerequisite","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Blinding the Alloy Eye":{"name":"Blinding the Alloy Eye","discipline":"necromancy","level":2,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"One scene, or until the mesh is removed · XP 8 Prerequisite: Shroudsight (V5 required Shadow Cast)","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Breath of Thanatos":{"name":"Breath of Thanatos","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":["social"],"situational":true,"note":"Social tests with them, except tests to frighten"},{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health","steps":[{"level":5,"amount":"margin"}]}],"summary":"One scene You breathe out a cold grey fog that smells of the grave and send it at a creature within range","auto":"heuristic","kinds":["targetPenalty","damage"]},"necromancy::Call of the Hungry Dead":{"name":"Call of the Hungry Dead","discipline":"necromancy","level":1,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":["mental"],"situational":true,"note":"Mental tests and to any test that depends on concentration or hearing"},{"kind":"targetPenalty","impair":["composure"]},{"kind":"status","status":"fear","on":"target"}],"summary":"One scene · XP 8 Ingredients","auto":"heuristic","kinds":["targetPenalty","status"]},"necromancy::Charnel Miasma":{"name":"Charnel Miasma","discipline":"necromancy","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":["stamina"]}],"summary":"One scene An aura of decay spreads out from you to Close distance and moves with you","auto":"heuristic","kinds":["targetPenalty"]},"necromancy::Cold of the Grave":{"name":"Cold of the Grave","discipline":"necromancy","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"selfBonus","value":"2","targets":["social"],"situational":true,"note":"tests to resist powers and Social tests that work on your feelings"},{"kind":"selfBonus","value":"-2","targets":["social"],"situational":true,"note":"your own Social tests that need warmth or sympathy"}],"summary":"One scene Your body takes on a corpse's indifference","auto":"heuristic","kinds":["selfBonus"]},"necromancy::Compel Spirit":{"name":"Compel Spirit","discipline":"necromancy","level":2,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"damage","amount":"margin","track":"health","baneful":false,"when":"manual","text":"You take damage equal to your margin of failure and lose hold of the fetter; the ghost…"}],"summary":"Until the tasks are done or the chronicle ends · XP 8 Requires Shroudsight (Necromancy 1)","auto":"heuristic","kinds":["damage"]},"necromancy::Corrupt the Undead Flesh":{"name":"Corrupt the Undead Flesh","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"health","when":"manual","text":"mortal 1 per day; Dissolve: Necromancy + margin (5+ dots)"}],"summary":"Up to a week You give a creature within range a sickness of the dead flesh","auto":"heuristic","kinds":["damage"]},"necromancy::Craft Flesh Golem":{"name":"Craft Flesh Golem","discipline":"necromancy","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Until the tzel is destroyed · XP 8 Prerequisite","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Create Corpse Suit":{"name":"Create Corpse Suit","discipline":"necromancy","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"selfBonus","value":1,"targets":["awareness"],"situational":true,"note":"noticing ambushes and hidden threats while you wear the suit","lasts":"maintained"}],"summary":"Until destroyed by fire, sorcery or Oblivion · XP 8 Prerequisite","auto":"curated","kinds":["selfBonus"]},"necromancy::Death Knell":{"name":"Death Knell","discipline":"necromancy","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene For the scene, when you touch a person or an object, you can feel whether a ghost has touched it…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Death Pact":{"name":"Death Pact","discipline":"necromancy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-D.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests to act against the pact's terms","lasts":"maintained"}],"summary":"Permanent You draw up a pact with a living mortal or ghoul, written out and signed in your blood and its own","auto":"heuristic","kinds":["targetPenalty"]},"necromancy::Death Rattle":{"name":"Death Rattle","discipline":"necromancy","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"damage","amount":"1","track":"willpower","baneful":false,"on":"self","when":"manual","text":"the death you lived through was violent"}],"summary":"One turn Hold a corpse's head and look into its eyes, and you live through the end of its life from behind…","auto":"curated","kinds":["damage"]},"necromancy::Ex Nihilo":{"name":"Ex Nihilo","discipline":"necromancy","level":5,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"damage","amount":"2","track":"willpower","baneful":false,"on":"self","when":"manual","text":"a ghost drains you: lost Composure + Resolve against its Strength + Fighting. Composure is impaired until you recover it"}],"summary":"Ceremony (level 5): Necromancy","auto":"curated","kinds":["damage"]},"necromancy::Fatal Prediction":{"name":"Fatal Prediction","discipline":"necromancy","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"night","fx":[{"kind":"damage","amount":"band(dots, 0, 1 + margin, 5, half(dots) + margin)","baneful":false,"track":"health","when":"manual","text":"1 + margin within 24 hours (½ Necromancy + margin at 5+ dots)"}],"summary":"One night You knot threads of ill luck around a mortal or ghoul you can see within range","auto":"heuristic","kinds":["damage"]},"necromancy::Ghost Walk":{"name":"Ghost Walk","discipline":"necromancy","level":3,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":"physical"},{"kind":"damage","amount":"10","baneful":false,"track":"health","when":"manual","text":"10 if you return inside something solid"}],"summary":"One scene You draw a doorway on a wall, a floor or a gravestone in chalk, grave dirt or your own blood, and…","auto":"heuristic","kinds":["targetPenalty","damage"]},"necromancy::Gift of True Life":{"name":"Gift of True Life","discipline":"necromancy","level":5,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Until the gift is spent · XP 8 Prerequisite","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Gift of the Corpse":{"name":"Gift of the Corpse","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shield","lasts":"turns","note":"for as many turns as successes: no frenzy; fire deals normal damage; sunlight 1 normal damage a turn; a stake is only a wound. No other powers, Blood Surge or mending"}],"summary":"Turns equal to successes For a few moments you stop being a vampire and become a true corpse","auto":"curated","kinds":["status"]},"necromancy::Grave Rot":{"name":"Grave Rot","discipline":"necromancy","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"targetPenalty","on":"self","value":2,"targets":["necromancy"],"situational":true,"note":"someone holds or wears it: the −2 of a called shot"}],"summary":"Instantaneous Touch something made of once-living matter (wood, paper, leather, cloth, food, bone) or a…","auto":"curated","kinds":["targetPenalty"]},"necromancy::Harrowhaunt":{"name":"Harrowhaunt","discipline":"necromancy","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent, until the bones are dug up · XP 8 Prerequisite: Charnel Miasma (V5 required Aura of Decay)","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Host Spirit":{"name":"Host Spirit","discipline":"necromancy","level":3,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"selfBonus","value":"2","targets":["physical"],"situational":true,"note":"Physical tests and 2 extra Health boxes (lost when it leaves"}],"summary":"Requires Charnel Miasma (Necromancy 2), which replaces Aura of Decay","auto":"heuristic","kinds":["selfBonus"]},"necromancy::Lazarene Blessing":{"name":"Lazarene Blessing","discipline":"necromancy","level":5,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"heal","track":"health","amount":"1"}],"summary":"Until the body dies again or the ghost is driven out · XP 8 Requires Withering Touch (Necromancy 2), which…","auto":"heuristic","kinds":["heal"]},"necromancy::Masque of Death":{"name":"Masque of Death","discipline":"necromancy","level":2,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shape","note":"corpse-like: you can't move or speak; baneful damage lands only when you return to normal","lasts":"night"},{"kind":"damageReduction","amount":"99","min1":false,"notBaneful":true}],"summary":"Until you end it or the next sunset; longer if you enter torpor You take on the look of a true corpse:…","auto":"curated","kinds":["status","damageReduction"]},"necromancy::Maw of Ahriman":{"name":"Maw of Ahriman","discipline":"necromancy","level":2,"src":"book","book":"Blood-Stained-Love","file":"out-a2/mod/Blood-Stained-Love/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"targetPenalty","impair":["resolve"],"when":"manual","lasts":"maintained","note":"a bitten victim: Resolve impaired until it recovers"}],"summary":"Until sunrise or cancelled · XP 8 Ingredients","auto":"curated","kinds":["targetPenalty"]},"necromancy::Misfortune's Hand":{"name":"Misfortune's Hand","discipline":"necromancy","level":3,"src":"book","book":"Courts-of-the-Damned","file":"out-a2/mod/Courts-of-the-Damned/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"One week after a few nights' build-up (a month on a critical win) · XP 8 · Downtime Taking Half allowed…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Name of the Father":{"name":"Name of the Father","discipline":"necromancy","level":3,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"entranced","note":"paralysed by despair for turns equal to your margin (at least 1): it senses nothing but touch and pain. Any damage ends it, or Willpower equal to the turns left","on":"target","when":"win"}],"summary":"Ceremony (level 3): Necromancy","auto":"curated","kinds":["status"]},"necromancy::Pit of Contemplation":{"name":"Pit of Contemplation","discipline":"necromancy","level":5,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"held","note":"failed Dexterity + Athletics at Difficulty 4: gone into the pit until you pour Vitae on the door (a mortal dies at once)","on":"target","when":"manual"}],"summary":"Ceremony (level 5): Necromancy","auto":"curated","kinds":["status"]},"necromancy::Profane the Sanctified":{"name":"Profane the Sanctified","discipline":"necromancy","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"confused","note":"its True Faith counts as 0 until the end of its next turn and it loses its next action (or: a holy symbol goes inert)","on":"target","when":"win"}],"summary":"(Homebrew) Rank 2 Mental Necromancy power for our table","auto":"curated","kinds":["status"]},"necromancy::Raise the Corpse":{"name":"Raise the Corpse","discipline":"necromancy","level":3,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"One night You force a scrap of false life into a corpse you touch","auto":"heuristic","kinds":["narrativeOnly"],"elderSteps":[6]},"necromancy::Resume the Coil":{"name":"Resume the Coil","discipline":"necromancy","level":2,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Instantaneous You lay your hands on a vampire or Duskborn in torpor and call its soul back into the flesh","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Rigor Mortis":{"name":"Rigor Mortis","discipline":"necromancy","level":1,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"turn","fx":[{"kind":"status","status":"held","on":"target"},{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"defending itself"}],"summary":"Until the end of its next turn You make a creature's muscles lock like a corpse's","auto":"curated","kinds":["status","targetPenalty"]},"necromancy::Severing the Ties of Death":{"name":"Severing the Ties of Death","discipline":"necromancy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-D.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Permanent You pull a ghost wholly out of the Shadowlands and shut it in a vessel: an urn, a jar, a gem, a…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Shambling Hordes":{"name":"Shambling Hordes","discipline":"necromancy","level":3,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until dismissed or destroyed · XP 8 Requires Charnel Miasma (Necromancy 2)","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Shroudsight":{"name":"Shroudsight","discipline":"necromancy","level":1,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"senses","note":"sees and hears ghosts and spirits within Short, and whether a body holds a living soul, an undead one or none"},{"kind":"selfBonus","value":"dots","targets":["awareness","investigation"],"situational":true,"note":"tests involving ghosts, death or the Shroud"}],"summary":"One scene You see and hear ghosts and other spirits within Short distance, including those that haven't…","auto":"curated","kinds":["status","selfBonus"]},"necromancy::Skuld Fulfilled":{"name":"Skuld Fulfilled","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"instant","fx":[{"kind":"targetPenalty","impair":"physical","lasts":"maintained"}],"summary":"Permanent You smear your palms and face with your own blood, picture a mortal or ghoul you can see within…","auto":"heuristic","kinds":["targetPenalty"]},"necromancy::Soul Stealing":{"name":"Soul Stealing","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"entranced","note":"its soul is driven out: the body lies empty until the end of the scene (1 Willpower from you: until sunrise)","on":"target","when":"win"}],"summary":"One scene You tear the soul out of a living mortal or ghoul within range","auto":"curated","kinds":["status"],"elderSteps":[8,9]},"necromancy::Split the Veil":{"name":"Split the Veil","discipline":"necromancy","level":4,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"The rest of the night · XP 8 Requires Charnel Miasma (Necromancy 2) with Necromancy at 6 dots or more, which…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Summon Spirit":{"name":"Summon Spirit","discipline":"necromancy","level":1,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"}],"summary":"Until the end of the scene · XP 8 Requires Shroudsight (Necromancy 1), which replaces the V5 prerequisite…","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::Summon the Shade":{"name":"Summon the Shade","discipline":"necromancy","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"scene","fx":[{"kind":"status","status":"held","on":"target"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"selfBonus","value":2,"targets":["necromancy"],"situational":true,"note":"holding one of the ghost's fetters"}],"summary":"One scene You call a ghost to you","auto":"curated","kinds":["status","selfBonus"]},"necromancy::The Gift of False Life":{"name":"The Gift of False Life","discipline":"necromancy","level":1,"src":"book","book":"Player-s-Guide","file":"out-a2/mod/Player-s-Guide/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Until destroyed or the task is done · XP 8 Requires Grave Rot (Necromancy 1), which replaces Ashes to Ashes","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::The Knowing Stone":{"name":"The Knowing Stone","discipline":"necromancy","level":1,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"The rest of the scene · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::The Ritual of Transferring the Soul (Necromancy)":{"name":"The Ritual of Transferring the Soul (Necromancy)","discipline":"necromancy","level":5,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Permanent · XP 8 Ingredients","auto":"heuristic","kinds":["narrativeOnly"]},"necromancy::The Shallow Slumber":{"name":"The Shallow Slumber","discipline":"necromancy","level":3,"src":"book","book":"Gehenna-War","file":"out-a2/mod/Gehenna-War/items.json","duration":"instant","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"tests to wake from torpor (PG p","on":"target","lasts":"night"},{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"wake from it","lasts":"night"}],"summary":"While the sigils remain · XP 8 · Downtime Taking Half allowed Requires Withering Touch or Summon the Shade…","auto":"heuristic","kinds":["selfBonus","targetPenalty"]},"necromancy::Torment":{"name":"Torment","discipline":"necromancy","level":3,"src":"ported","file":"out-a2/disciplines/ported-D.json","duration":"scene","fx":[{"kind":"damage","amount":"dots + margin","baneful":false,"track":"health"}],"summary":"One scene Your hands reach across the Shroud","auto":"heuristic","kinds":["damage"],"elderSteps":[7]},"necromancy::Traveler's Call":{"name":"Traveler's Call","discipline":"necromancy","level":1,"src":"book","book":"Cults-of-the-Blood-Gods","file":"out-a2/mod/Cults-of-the-Blood-Gods/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"when":"manual","note":"tests that need concentration, if it ignores the call"}],"summary":"Ceremony (level 1): Necromancy","auto":"curated","kinds":["targetPenalty"]},"necromancy::Where the Shroud Thins":{"name":"Where the Shroud Thins","discipline":"necromancy","level":1,"src":"ritual","file":"out-a2/disciplines/rituals.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"selfBonus","value":2,"targets":["necromancy"],"situational":true,"note":"Necromancy at this spot where the Shroud is Thin (+3 Torn, −1 Thick: adjust by hand)"}],"summary":"One night · XP 8 Ingredients","auto":"curated","kinds":["selfBonus"]},"necromancy::Wisdom of the Dead":{"name":"Wisdom of the Dead","discipline":"necromancy","level":3,"src":"book","book":"Book-of-Nod-Apocrypha","file":"out-a2/mod/Book-of-Nod-Apocrypha/items.json","duration":"night","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"tests with those Skills, but only where the dead person was more s"}],"summary":"Until dawn, or until the head or skull is destroyed · XP 8 Requires Shroudsight (Necromancy 1) or the…","auto":"heuristic","kinds":["selfBonus"]},"necromancy::Withering Touch":{"name":"Withering Touch","discipline":"necromancy","level":2,"src":"homebrew","file":"out-a2/disciplines/homebrew.json","duration":"instant","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests that rely on it","lasts":"maintained"},{"kind":"damage","amount":"half(dots)","baneful":false,"track":"health","steps":[{"level":4,"amount":"dots"}]}],"summary":"Instantaneous Touch a target's limb or other body part and age it decades in a moment","auto":"heuristic","kinds":["targetPenalty","damage"]},"obfuscate::Cache":{"name":"Cache","discipline":"obfuscate","level":1,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"status","status":"hidden"},{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"One scene, or until dawn for 1 Willpower You hide things where they lie","auto":"heuristic","kinds":["status","narrativeOnly"]},"obfuscate::Conceal":{"name":"Conceal","discipline":"obfuscate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"hidden","note":"small objects on you are hidden"},{"kind":"narrativeOnly","why":"hidden objects: a careful search is a contested Power test"}],"summary":"Objects on you are overlooked.","auto":"curated","kinds":["status","narrativeOnly"]},"obfuscate::Create Name":{"name":"Create Name","discipline":"obfuscate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"instant","fx":[{"kind":"status","status":"hidden","lasts":"maintained"},{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent You build a whole second self: a face, a voice, a bearing, a mind and a soul that are not yours","auto":"heuristic","kinds":["status","narrativeOnly"]},"obfuscate::Double Talk":{"name":"Double Talk","discipline":"obfuscate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"Hidden messages in your words.","auto":"curated","kinds":["narrativeOnly"]},"obfuscate::Erase the Name":{"name":"Erase the Name","discipline":"obfuscate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"One night, or a month for 3 more Willpower Once per night, you make the world forget a creature or a place","auto":"heuristic","kinds":["narrativeOnly"]},"obfuscate::Fool's Gold":{"name":"Fool's Gold","discipline":"obfuscate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Objects look like something else.","auto":"curated","kinds":["narrativeOnly"]},"obfuscate::From Under the Bed":{"name":"From Under the Bed","discipline":"obfuscate","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"maintained","fx":[{"kind":"status","status":"hidden"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"As long as it is fed (see text) You draw a nightmare out of a sleeping mortal and give it a body made of…","auto":"heuristic","kinds":["status","narrativeOnly"]},"obfuscate::Horrid Reality":{"name":"Horrid Reality","discipline":"obfuscate","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":false},{"kind":"status","status":"fear","note":"believes its worst fears are real","on":"target"}],"summary":"−2 dice to its tests.","auto":"curated","kinds":["targetPenalty","status"]},"obfuscate::Labyrinth Trail":{"name":"Labyrinth Trail","discipline":"obfuscate","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"night","fx":[{"kind":"status","status":"hidden"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One night Your trail twists itself behind you","auto":"heuristic","kinds":["status","narrativeOnly"]},"obfuscate::Mask of Ages":{"name":"Mask of Ages","discipline":"obfuscate","level":1,"src":"book","book":"Live-From-the-Succubus-Club","file":"out-a2/mod/Live-From-the-Succubus-Club/items.json","duration":"night","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"tests to pass as someone of that age (including yourself at that a"},{"kind":"status","status":"hidden"}],"summary":"Until sunrise, or until you end it You make yourself seem older or younger than you look, staying roughly…","auto":"heuristic","kinds":["selfBonus","status"]},"obfuscate::Mask of Isolation":{"name":"Mask of Isolation","discipline":"obfuscate","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"hidden","note":"nobody recognises it, not even its family, for one night + 1 per point of margin; it ends for good if the victim learns of it","on":"target","when":"win","lasts":"maintained"},{"kind":"targetPenalty","value":2,"targets":["persuasion"],"situational":true,"note":"convincing anyone who it is, even with proof","when":"win","lasts":"maintained"}],"summary":"One night, +1 night per point of margin Prerequisite: Mask of a Thousand Faces, Dominate 1","auto":"curated","kinds":["status","targetPenalty"]},"obfuscate::Mask of a Thousand Faces":{"name":"Mask of a Thousand Faces","discipline":"obfuscate","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"hidden","note":"a forgettable face (a specific face at ●●●●)"}],"summary":"A nondescript stranger.","auto":"curated","kinds":["status"]},"obfuscate::Mental Maze":{"name":"Mental Maze","discipline":"obfuscate","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"confused","note":"can't find its way out of the place. A supernatural creature may try once per scene: Wits + Awareness against 2 + your margin","on":"target","when":"win","lasts":"night"},{"kind":"damage","amount":"1","track":"willpower","baneful":false,"on":"target","when":"manual","text":"a failed attempt to find the way out"}],"summary":"One night You take away a target's sense of direction","auto":"curated","kinds":["status","damage"]},"obfuscate::Mind Masque":{"name":"Mind Masque","discipline":"obfuscate","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"status","status":"hidden"},{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You wear a false mind over your own","auto":"heuristic","kinds":["status","narrativeOnly"]},"obfuscate::Mind Tricks":{"name":"Mind Tricks","discipline":"obfuscate","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests relying on the senses"},{"kind":"status","status":"confused","on":"target"}],"summary":"−2 dice on sense-based tests (toggle).","auto":"curated","kinds":["targetPenalty","status"]},"obfuscate::Old Friend":{"name":"Old Friend","discipline":"obfuscate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["social"],"situational":true,"note":"Social tests to get it to confide in you, help you or believe you"}],"summary":"One scene One creature you are dealing with sees and hears you as the person it trusts most: a friend, a…","auto":"heuristic","kinds":["selfBonus"]},"obfuscate::River of Dreams":{"name":"River of Dreams","discipline":"obfuscate","level":1,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You slip into dreams, your victims' or your own","auto":"heuristic","kinds":["narrativeOnly"]},"obfuscate::Seclusion":{"name":"Seclusion","discipline":"obfuscate","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"confused","note":"perceives no person, living or undead, for the scene (+1 scene per point of margin); harming it gives a new Power test, and the power ends if it wins","on":"target","when":"win"}],"summary":"One scene + one per point of margin Obfuscate turned inside out","auto":"curated","kinds":["status"]},"obfuscate::Silence of Death":{"name":"Silence of Death","discipline":"obfuscate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"silenced","note":"you make no sound"}],"summary":"Your sounds go silent.","auto":"curated","kinds":["status"]},"obfuscate::Unseen Passage":{"name":"Unseen Passage","discipline":"obfuscate","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["subterfuge"],"situational":false,"note":"sneak or hide from active searchers"},{"kind":"status","status":"hidden","note":"ends if you move, attack or make a sound (moving is fine at ●●)"}],"summary":"Obfuscate dots to sneak and hide; unseen by those not looking.","auto":"curated","kinds":["selfBonus","status"],"elderSteps":[6,7]},"obfuscate::Veil of Blissful Ignorance":{"name":"Veil of Blissful Ignorance","discipline":"obfuscate","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"status","status":"hidden"},{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"One scene, or until sunrise (see text) You wrap another creature in your Obfuscate by touch, and nothing it…","auto":"heuristic","kinds":["status","narrativeOnly"]},"oblivion::Ahriman's Demesne":{"name":"Ahriman's Demesne","discipline":"oblivion","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"damage","amount":"max(1, margin)","baneful":false,"track":"health","perTurn":true}],"summary":"One scene Darkness pours out over a point you can see within range, out to Short distance from it, and…","auto":"heuristic","kinds":["damage"]},"oblivion::Black Metamorphosis":{"name":"Black Metamorphosis","discipline":"oblivion","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"damageReduction","amount":"1","min1":false,"notBaneful":true}],"summary":"One scene You pull the Abyss into your own body","auto":"heuristic","kinds":["damageReduction"]},"oblivion::Cloud of Darkness":{"name":"Cloud of Darkness","discipline":"oblivion","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":["subterfuge"],"situational":true,"note":"sneaking and hiding inside the cloud"},{"kind":"narrativeOnly","why":"area: sight-based tests across its edge take −half Oblivion dots; apply by hand"}],"summary":"A cloud of shadow: half Oblivion to hide inside (toggle).","auto":"curated","kinds":["selfBonus"]},"oblivion::Dead Man's Hand":{"name":"Dead Man's Hand","discipline":"oblivion","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"power","note":"unarmed damage to a mortal or ghoul can't be mended until the next night; at 0 Health at scene end it dies. Your hands can touch shadows and ghosts"}],"summary":"One scene The cold of the Abyss settles into your hands","auto":"curated","kinds":["status"]},"oblivion::Draining Darkness":{"name":"Draining Darkness","discipline":"oblivion","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"damage","amount":"max(1, margin)","track":"willpower"}],"summary":"Each won test drains Willpower = margin (at least 1).","repeat":{"note":"Each further test (an action) is a new Power test on the same activation."},"auto":"curated","kinds":["damage"],"elderSteps":[6]},"oblivion::Grasping Shadows":{"name":"Grasping Shadows","discipline":"oblivion","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"held","note":"held as if wrestled; breaking free is a Power test","on":"target"}],"summary":"Held by its shadow.","repeat":{"note":"Crush (an action): a Power test against Strength + Stamina; damage = half Oblivion + margin.","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false}]},"auto":"curated","kinds":["status"]},"oblivion::Night Shroud":{"name":"Night Shroud","discipline":"oblivion","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"targetPenalty","impair":["composure"],"when":"manual","lasts":"night","note":"someone who comes out alive: Composure impaired until it has slept"}],"summary":"One scene Your shadow swallows what you can't be seen carrying","auto":"curated","kinds":["targetPenalty"]},"oblivion::Night Terrors":{"name":"Night Terrors","discipline":"oblivion","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":"mental"},{"kind":"status","status":"fear","on":"target"}],"summary":"Mental Attributes impaired; a later minor action can impair Social ones.","repeat":{"note":"A later minor action and Power test impair its Social Attributes too.","fx":[{"kind":"targetPenalty","impair":"social"}]},"auto":"curated","kinds":["targetPenalty","status"]},"oblivion::Oubliette":{"name":"Oubliette","discipline":"oblivion","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"held","on":"target","when":"win","note":"gone into the Abyss: once an hour Wits + Resolve against your Oblivion dots to climb out; a mortal takes 1 damage an hour; a vampire coming out resists fear frenzy at Difficulty 2"}],"summary":"One night, or until you release the prisoner You open a creature's shadow under its feet and drop it into a…","auto":"curated","kinds":["status"]},"oblivion::Shadow Mask":{"name":"Shadow Mask","discipline":"oblivion","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"hidden","note":"still in shadow: detection is a Power test against Wits + Awareness"}],"summary":"Hidden in the shadows.","auto":"curated","kinds":["status"],"elderSteps":[8]},"oblivion::Shadow Parasite":{"name":"Shadow Parasite","discipline":"oblivion","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":["physical"],"situational":false},{"kind":"damage","amount":"max(1, margin)","baneful":false,"track":"health"},{"kind":"damage","amount":"1","baneful":false,"track":"health","perTurn":true}],"summary":"One scene You push a sliver of the Abyss into a creature's shadow, and it crawls up into the body","auto":"heuristic","kinds":["targetPenalty","damage"]},"oblivion::Shadow Perspective":{"name":"Shadow Perspective","discipline":"oblivion","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"-1","targets":[],"situational":true,"note":"tests to notice things around your own body"}],"summary":"One scene You send your senses into a shadow you can see within range, and see and hear from it as if you…","auto":"heuristic","kinds":["selfBonus"]},"oblivion::Shadow Play":{"name":"Shadow Play","discipline":"oblivion","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests the shadow images help"}],"summary":"Half Oblivion dots where the images help (toggle).","auto":"curated","kinds":["selfBonus"]},"oblivion::Shadow Step":{"name":"Shadow Step","discipline":"oblivion","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Step from shadow to shadow.","auto":"curated","kinds":["narrativeOnly"],"elderSteps":[7,9]},"oblivion::Shadow Tools":{"name":"Shadow Tools","discipline":"oblivion","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"}],"summary":"Tools of solid shadow.","auto":"curated","kinds":["narrativeOnly"],"elderSteps":[7]},"oblivion::Shadow Twin":{"name":"Shadow Twin","discipline":"oblivion","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"power","note":"the twin acts on your minor action: your Physical pools at −2 (at least 1), unarmed damage 3, Health = your Oblivion dots; bright light a further −2"}],"summary":"One scene Your shadow peels off the ground and stands up as a solid copy of you made of darkness, with your…","auto":"curated","kinds":["status"]},"oblivion::Tchernabog":{"name":"Tchernabog","discipline":"oblivion","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"shield","note":"the sun is blotted out over the area until sunset while you stay awake: vampires there count as fully protected from sunlight","lasts":"maintained"}],"summary":"Until sunset, while you stay awake You raise the Abyss into the sky and blot out the sun","auto":"curated","kinds":["status"]},"oblivion::The Darkness Within":{"name":"The Darkness Within","discipline":"oblivion","level":3,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"scene","fx":[{"kind":"damage","amount":"1","baneful":false,"track":"health","when":"manual","text":"1 (baneful to vampires)"}],"summary":"One scene, or until one is destroyed Tear a murderous shadow-twin out of a target you can clearly see","auto":"heuristic","kinds":["damage"]},"oblivion::Umbrous Clutch":{"name":"Umbrous Clutch","discipline":"oblivion","level":3,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"instant","fx":[{"kind":"targetPenalty","impair":["composure"],"lasts":"night"}],"summary":"Instantaneous You need a clear view of the victim and its shadow, and you must cast a shadow yourself","auto":"heuristic","kinds":["targetPenalty"]},"potence::Aftershock":{"name":"Aftershock","discipline":"potence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"maintained","fx":[{"kind":"damage","amount":"half(dots)","baneful":false,"track":"health","text":"attack damage + ½ Potence dots, delayed","rider":true,"on":"self"}],"summary":"Up to 24 hours You hold back the force of a blow and let it land later","auto":"heuristic","kinds":["damage"]},"potence::Bone Breaker":{"name":"Bone Breaker","discipline":"potence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests using the mangled limb","when":"manual","lasts":"maintained"}],"summary":"A called shot that mangles a limb: apply the −2 after the attack hits.","auto":"curated","kinds":["targetPenalty"]},"potence::Bring Down the Walls":{"name":"Bring Down the Walls","discipline":"potence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"instant","fx":[{"kind":"damage","amount":"dots + margin","baneful":false,"track":"health"}],"summary":"Instantaneous Once per night, you strike the ground or a building with everything you have","auto":"heuristic","kinds":["damage"]},"potence::Brutal Feed":{"name":"Brutal Feed","discipline":"potence","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"turn","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"health","when":"manual","text":"= Vitae drained"}],"summary":"One turn You feed like a predator tearing open its kill","auto":"heuristic","kinds":["damage"]},"potence::Bull Rush":{"name":"Bull Rush","discipline":"potence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"selfBonus","value":"max(1, half(dots))","targets":["fighting"],"situational":false,"note":"the charge attack"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change","note":"on a win the target is knocked down (pushed further with Maturing)"}],"summary":"Charge: +half Potence (min 1) on the melee attack.","auto":"curated","kinds":["selfBonus"]},"potence::Draught of Might":{"name":"Draught of Might","discipline":"potence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"night","fx":[{"kind":"selfBonus","value":"half(dots)","targets":["strength"],"situational":false,"on":"target"}],"summary":"One night Your blood carries your strength to whoever drinks it","auto":"heuristic","kinds":["selfBonus"]},"potence::Earthshock":{"name":"Earthshock","discipline":"potence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"note":"knocked down"}],"summary":"Damage = half Potence + margin; knocked down.","auto":"curated","kinds":["damage"]},"potence::Exuberance":{"name":"Exuberance","discipline":"potence","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","trait":"potence","value":2,"lasts":"maintained","note":"Potence counts 2 dots higher for Power tests, Maturing and anything that counts your Potence dots"},{"kind":"damage","amount":"1","baneful":true,"track":"health","on":"self","when":"manual","text":"a test using Potence failed, or showed two or more 10s"}],"summary":"Passive You push your body past even a vampire's limits","auto":"curated","kinds":["selfBonus","damage"]},"potence::Fist of Caine":{"name":"Fist of Caine","discipline":"potence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"damage","amount":"strength + margin","baneful":false,"track":"health","when":"manual","text":"Strength + margin, ignores Vampiric Endurance (baneful at ●●●●●● for +2 Vitae)"}],"summary":"One scene Your bare hands tear flesh and bone like blades","auto":"heuristic","kinds":["damage"]},"potence::Imprint":{"name":"Imprint","discipline":"potence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"resisting being moved"}],"summary":"Potence dots to resist being moved (toggle).","steps":[{"level":3,"duration":"scene"}],"auto":"curated","kinds":["selfBonus"]},"potence::Juggernaut":{"name":"Juggernaut","discipline":"potence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"instant","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"their test","lasts":"maintained"},{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health"}],"summary":"Instantaneous Once per scene, you charge in a straight line up to Medium distance, using your movement and…","auto":"heuristic","kinds":["selfBonus","damage"]},"potence::Might of the Heroes":{"name":"Might of the Heroes","discipline":"potence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"damage","amount":"half(dots)","baneful":false,"track":"health","text":"+½ Potence dots to unarmed and melee damage","rider":true,"on":"self"}],"summary":"One scene For the scene your strength is the stuff of legend","auto":"heuristic","kinds":["damage"]},"potence::Powerful Strike":{"name":"Powerful Strike","discipline":"potence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"damage","rider":true,"on":"self","amount":"dots","text":"extra damage on the hit","note":"added to the attack in the damage dialog"}],"summary":"+Potence dots damage on the attack.","auto":"curated","kinds":["damage"],"elderSteps":[6,8]},"potence::Relentless Grasp":{"name":"Relentless Grasp","discipline":"potence","level":1,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":[],"situational":true,"note":"any test to keep hold of something"}],"summary":"One scene Once you have a grip, nothing short of losing the hand makes you let go","auto":"heuristic","kinds":["selfBonus"]},"potence::Soaring Leap":{"name":"Soaring Leap","discipline":"potence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"selfBonus","value":"dots","targets":["athletics"],"situational":true,"note":"jump tests"},{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"Leap anywhere within Short.","auto":"curated","kinds":["selfBonus"]},"potence::Strike True":{"name":"Strike True","discipline":"potence","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"status","status":"power","note":"next melee attack hits automatically, margin = half Potence"}],"summary":"The next melee attack hits automatically.","auto":"curated","kinds":["status"]},"potence::Subtle Hammer":{"name":"Subtle Hammer","discipline":"potence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["strength"],"situational":true,"note":"tests of strength made while you can barely move, such as snapping"}],"summary":"One scene You can put your whole strength into the smallest movement: a flick of the finger lands like a…","auto":"heuristic","kinds":["selfBonus"]},"potence::War Cry":{"name":"War Cry","discipline":"potence","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":false,"label":"{v} tests not about fleeing"},{"kind":"selfBonus","value":"half(dots)","targets":["composure","resolve"],"situational":true,"note":"resisting fear (fear frenzy too)"}],"summary":"Targets −2 to tests not about fleeing; you +half Potence against fear.","auto":"curated","kinds":["targetPenalty","selfBonus"]},"presence::Awe":{"name":"Awe","discipline":"presence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["expression","persuasion"],"situational":false,"if":"amaze"},{"kind":"selfBonus","on":"target","when":"activate","if":"inspire","value":"half(dots)","targets":["expression","persuasion"],"situational":false},{"kind":"targetPenalty","value":"half(dots)","targets":[],"situational":true,"note":"resisting intimidation and fear (powers too)","if":"menace"}],"summary":"Amaze, Inspire or Menace.","ask":{"choose":{"label":"Effect","options":[{"value":"amaze","label":"Amaze: + Presence on Expression / Persuasion"},{"value":"inspire","label":"Inspire: allies + half Presence"},{"value":"menace","label":"Menace: hostile targets −half Presence to resist fear"}]}},"auto":"curated","kinds":["selfBonus","targetPenalty"]},"presence::Bring It On":{"name":"Bring It On","discipline":"presence","level":1,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"attacks against you"}],"summary":"One scene You make yourself the biggest threat in the room and dare your enemies to come at you","auto":"heuristic","kinds":["targetPenalty"]},"presence::Captivating Gaze":{"name":"Captivating Gaze","discipline":"presence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"status","status":"entranced","note":"can't move and stares at you; can still defend; damage frees it","on":"target"}],"summary":"Enthralled: 1 turn + 1 per margin.","turns":"1 + margin","auto":"curated","kinds":["status"]},"presence::Compose Yourself":{"name":"Compose Yourself","discipline":"presence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","on":"target","when":"activate","value":2,"targets":["composure","resolve"],"situational":true,"note":"resist being frightened and fear or rage frenzy"}],"summary":"The touched creature: +2 to resist fear and fear or rage frenzy (toggle).","auto":"curated","kinds":["selfBonus"]},"presence::Cooperation":{"name":"Cooperation","discipline":"presence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"Self-Control tests to resist rage frenzy provoked by one another,…"},{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"attack or act against one another, add 2 dice to Self-Control tests…"}],"summary":"One scene, or until sunrise for 1 Willpower You make a room work together","auto":"heuristic","kinds":["selfBonus","targetPenalty"]},"presence::Dread Gaze":{"name":"Dread Gaze","discipline":"presence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":false,"label":"{v} all tests while it sees you"},{"kind":"status","status":"fear","on":"target"}],"summary":"−2 dice to all its tests while it sees you.","repeat":{"note":"●●●: 1 Willpower at the start of its turn and a new test raise the penalty to −3.","fx":[{"kind":"targetPenalty","value":3,"targets":[],"situational":false,"label":"{v} all tests while it sees you","replace":true}]},"auto":"curated","kinds":["targetPenalty","status"],"elderSteps":[6]},"presence::Dream World":{"name":"Dream World","discipline":"presence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","value":2,"targets":["presence"],"situational":true,"note":"Presence powers on anyone whose dream showed you"}],"summary":"One day, and its effects through the following night As you sink into daysleep, you send one dream into…","auto":"curated","kinds":["selfBonus"]},"presence::Friends to Enemies":{"name":"Friends to Enemies","discipline":"presence","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"selfBonus","on":"target","when":"win","if":"strengthen","value":2,"targets":[],"situational":true,"note":"helping or protecting the other"},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"helping or protecting the other","if":"weaken"}],"summary":"Strengthen or weaken the bond between two targets.","ask":{"choose":{"label":"The bond","options":[{"value":"strengthen","label":"Strengthen (+2 to help or protect)"},{"value":"weaken","label":"Weaken (−2 to help or protect, no assist)"}]}},"auto":"curated","kinds":["selfBonus","targetPenalty"]},"presence::Impassion":{"name":"Impassion","discipline":"presence","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests the emotion affects"},{"kind":"status","status":"entranced","note":"feels the emotion you chose","on":"target"}],"summary":"A strong emotion; −2 where it matters (toggle).","auto":"curated","kinds":["targetPenalty","status"]},"presence::Ironclad Command":{"name":"Ironclad Command","discipline":"presence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"Permanent Your Presence doesn't let go","auto":"heuristic","kinds":["narrativeOnly"]},"presence::Love":{"name":"Love","discipline":"presence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"2","targets":[],"situational":true,"note":"tests to command or influence it, and your powers that need eye co"},{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"act against your direct wishes"}],"summary":"One scene A non-animal target you can see falls for you as hard as any thrall","auto":"heuristic","kinds":["selfBonus","targetPenalty"]},"presence::Passion Leech":{"name":"Passion Leech","discipline":"presence","level":2,"src":"book","book":"Tattered-Facade","file":"out-a2/mod/Tattered-Facade/items.json","duration":"night","fx":[{"kind":"resource","resource":"willpower","amount":"1","on":"self"}],"summary":"Until sunset Spend a scene near a mortal (it doesn't work on Kindred) and feed on their feelings","auto":"heuristic","kinds":["resource"]},"presence::Predator's Lure":{"name":"Predator's Lure","discipline":"presence","level":1,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"entranced","note":"drawn to you at a normal pace, without taking risks, until it comes within Close","on":"target","when":"win"}],"summary":"One scene, or until the target reaches you Your hunger becomes a faint call that draws one victim to you","auto":"curated","kinds":["status"]},"presence::Pulse of the City":{"name":"Pulse of the City","discipline":"presence","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-B.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"}],"summary":"One hour to a week, by margin You set the mood of a whole city","auto":"heuristic","kinds":["narrativeOnly"]},"presence::Redirect Desire":{"name":"Redirect Desire","discipline":"presence","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":false,"label":"{v} tests unrelated to the desire"},{"kind":"status","status":"entranced","on":"target"}],"summary":"−2 dice to tests unrelated to the new desire.","auto":"curated","kinds":["targetPenalty","status"]},"presence::Suffuse the Edifice":{"name":"Suffuse the Edifice","discipline":"presence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"}],"summary":"As the channelled power, while you stay in the building You make a building carry your Presence","auto":"heuristic","kinds":["narrativeOnly"]},"presence::Summon":{"name":"Summon","discipline":"presence","level":3,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"entranced","note":"makes its way to you for the rest of the night as fast as it safely can, knowing roughly where you are","on":"target","when":"win","lasts":"night"}],"summary":"One night You call someone to you from wherever it is","auto":"curated","kinds":["status"]},"presence::Transcendent Aura":{"name":"Transcendent Aura","discipline":"presence","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"power","note":"attract or repel: a Power test when a creature moves against it"},{"kind":"narrativeOnly","why":"movement limits tested as creatures move"}],"summary":"Untouchable or magnetic.","auto":"curated","kinds":["status","narrativeOnly"]},"presence::True Love's Face":{"name":"True Love's Face","discipline":"presence","level":2,"src":"ported","file":"out-a2/disciplines/ported-B.json","duration":"scene","fx":[{"kind":"selfBonus","value":"dots","targets":["social"],"situational":true,"note":"Social tests to sway its feelings or win its trust"},{"kind":"selfBonus","value":"-2","targets":["social"],"situational":true,"note":"Social tests against it"}],"summary":"One scene To one target, and only to it, you look and sound like someone it loves or loved deeply","auto":"heuristic","kinds":["selfBonus"]},"presence::Wingman":{"name":"Wingman","discipline":"presence","level":3,"src":"book","book":"Blood-Stained-Love","file":"out-a2/mod/Blood-Stained-Love/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"}],"summary":"As the power lent Lend one of your Presence powers to a willing vampire for tense negotiations or a night…","auto":"heuristic","kinds":["narrativeOnly"]},"tellurgy::Army of Apparitions":{"name":"Army of Apparitions","discipline":"tellurgy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"those tests"}],"summary":"One scene You bend mist, heat-shimmer, smoke and light into a crowd of up to twice your Tellurgy dots…","auto":"heuristic","kinds":["targetPenalty"]},"tellurgy::Awaken the Forest Giants":{"name":"Awaken the Forest Giants","discipline":"tellurgy","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"upkeep","amount":1,"resource":"willpower","per":"turnStart","note":"start of each turn you direct it with a minor action"}],"summary":"One scene You wake a tree within range, or a dense tangle of hedge or thicket","auto":"heuristic","kinds":["upkeep"]},"tellurgy::Breath of Whispers":{"name":"Breath of Whispers","discipline":"tellurgy","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You speak into the wind and it carries your voice to one creature you have met, anywhere within a…","auto":"heuristic","kinds":["narrativeOnly"]},"tellurgy::Breeze of Lethargy":{"name":"Breeze of Lethargy","discipline":"tellurgy","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"targetPenalty","impair":["stamina"]}],"summary":"One scene A slow, heavy wind carries the weariness of a long winter to creatures within range, as long as…","auto":"heuristic","kinds":["targetPenalty"]},"tellurgy::Curse of Life":{"name":"Curse of Life","discipline":"tellurgy","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2 + margin","targets":[],"situational":false},{"kind":"narrativeOnly","why":"a vampire can't Blood Surge its Physical Attributes"}],"summary":"−(2 + margin) dice to its tests.","auto":"curated","kinds":["targetPenalty"]},"tellurgy::Decay":{"name":"Decay","discipline":"tellurgy","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene","note":"ages an object (a creature by half as much); on a vampire the Storyteller picks the effect"},{"kind":"targetPenalty","on":"self","value":2,"targets":["tellurgy"],"situational":true,"note":"someone holds or wears it: the −2 of a called shot"},{"kind":"targetPenalty","impair":["physical"],"when":"manual","note":"a vampire, if the Storyteller rules it: one Physical Attribute impaired for a time (or Vitae lost: half your Tellurgy dots)"}],"summary":"The touch of time.","auto":"curated","kinds":["targetPenalty"]},"tellurgy::Earth's Embrace":{"name":"Earth's Embrace","discipline":"tellurgy","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"hidden","note":"inside the earth: nothing outside it can see or attack you and sunlight can't reach you; you feel what moves above within Short"}],"summary":"One scene You sink into natural earth, sand, clay or rock and move through it as if swimming, at your normal…","auto":"curated","kinds":["status"]},"tellurgy::Earth's Vast Haven":{"name":"Earth's Vast Haven","discipline":"tellurgy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"status","status":"shield","note":"merged with the land: nothing short of tearing up the whole area harms you, sunlight can't reach you; no Vitae to rise, and no feeding","lasts":"maintained"},{"kind":"damageReduction","amount":"99","min1":false,"notBaneful":false}],"summary":"Until you rise You sink into the land itself and spread through it, becoming one with an area of natural…","auto":"curated","kinds":["status","damageReduction"]},"tellurgy::Elemental Attack":{"name":"Elemental Attack","discipline":"tellurgy","level":5,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"damage","amount":"successes","baneful":false,"track":"health","on":"target","note":"fire is baneful to vampires: tick Baneful by hand"},{"kind":"damage","amount":"successes","baneful":false,"track":"health","on":"target","perTurn":true,"note":"again at the start of each of its turns until it escapes (a fitting test against your Resolve + Tellurgy)"}],"summary":"Ritual (level 5): Tellurgy","auto":"curated","kinds":["damage"]},"tellurgy::Elemental Grasp":{"name":"Elemental Grasp","discipline":"tellurgy","level":2,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"damage","amount":"successes","baneful":false,"track":"health","on":"target"},{"kind":"status","status":"held","note":"to keep moving or acting against the element it must pass a fitting test against 1 + your successes","on":"target"}],"summary":"Ritual (level 2): Tellurgy","auto":"curated","kinds":["damage","status"]},"tellurgy::Elemental Shelter":{"name":"Elemental Shelter","discipline":"tellurgy","level":3,"src":"book","book":"Blood-Sigils","file":"out-a2/mod/Blood-Sigils/items.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"status","status":"shield","note":"inside your element: no physical attack, sunlight or fire can hurt you. Sense the Unseen, or Wits + Awareness against your margin, spots you","lasts":"maintained"},{"kind":"damageReduction","amount":"99","min1":false,"notBaneful":false}],"summary":"Ritual (level 3): Tellurgy","auto":"curated","kinds":["status","damageReduction"]},"tellurgy::Endurance of Stone":{"name":"Endurance of Stone","discipline":"tellurgy","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"damageReduction","amount":"half(dots)","min1":true,"notBaneful":true}],"summary":"Damage −half Tellurgy dots, never to 0, not baneful.","auto":"curated","kinds":["damageReduction"]},"tellurgy::Eyes of the Deep":{"name":"Eyes of the Deep","discipline":"tellurgy","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn","note":"successes set how far back you see"}],"summary":"Water shows you its past.","auto":"curated","kinds":["narrativeOnly"]},"tellurgy::Fantasy World":{"name":"Fantasy World","discipline":"tellurgy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"entranced","note":"perceives only the world you describe for the scene. Each time it takes damage it can spend 1 Willpower to make you repeat the Power test","on":"target","when":"win"}],"summary":"One scene You wrap one creature within range in a world of your making","auto":"curated","kinds":["status"]},"tellurgy::Gathering Wind":{"name":"Gathering Wind","discipline":"tellurgy","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"selfBonus","on":"target","when":"activate","value":2,"targets":[],"situational":true,"note":"finding you or the place, getting past obstacles"}],"summary":"Targets +2 to reach the place (toggle).","auto":"curated","kinds":["selfBonus"]},"tellurgy::Gaze of Misfortune":{"name":"Gaze of Misfortune","discipline":"tellurgy","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"max(2, 2 * margin)","targets":["$choice"],"situational":false,"uses":1,"steps":[{"level":4,"uses":2},{"level":6,"uses":3}]}],"summary":"The next test with the chosen Attribute: −2 × margin.","ask":{"choose":{"label":"Attribute","options":["strength","dexterity","stamina","charisma","manipulation","composure","intelligence","wits","resolve"]}},"auto":"curated","kinds":["targetPenalty"]},"tellurgy::Hidden Roads":{"name":"Hidden Roads","discipline":"tellurgy","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"pursuers test Wits + Survival against your successes"},{"kind":"status","status":"hidden","note":"the road hides you: 1 hour per Tellurgy dot"}],"summary":"The road hides you.","auto":"curated","kinds":["narrativeOnly","status"]},"tellurgy::Hungry Earth":{"name":"Hungry Earth","discipline":"tellurgy","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health"}],"summary":"One scene The ground at a point within range turns to sucking mud and clutching roots, out to Close distance…","auto":"heuristic","kinds":["damage"]},"tellurgy::Kupala's Fury":{"name":"Kupala's Fury","discipline":"tellurgy","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"instant","fx":[{"kind":"damage","amount":"max(1, margin)","baneful":false,"track":"health","steps":[{"level":5,"amount":"dots"}]}],"summary":"Instantaneous You call on the earth's anger, and the ground heaves at a point you can see within range, out…","auto":"heuristic","kinds":["damage"]},"tellurgy::Lasting Curse":{"name":"Lasting Curse","discipline":"tellurgy","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"night","fx":[{"kind":"targetPenalty","value":"2","targets":["social"],"situational":true,"note":"all Social tests with mortals and animals"},{"kind":"targetPenalty","impair":["stamina"]}],"summary":"One night You speak a curse over a creature within range, naming it and what you wish on it","auto":"heuristic","kinds":["targetPenalty"]},"tellurgy::Lucky Charm":{"name":"Lucky Charm","discipline":"tellurgy","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"a descriptive effect with no fixed dice or track change"},{"kind":"selfBonus","on":"target","value":2,"targets":[],"situational":true,"uses":1,"note":"one test, chosen before rolling"}],"summary":"One night You put luck into a token: a knotted thread, a coin you spat on, a ribbon tied around a wrist","auto":"curated","kinds":["selfBonus"]},"tellurgy::Mayaparisatya":{"name":"Mayaparisatya","discipline":"tellurgy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":true,"note":"tests that rely on that part"}],"summary":"One scene For one scene you make the false real or the real false","auto":"heuristic","kinds":["targetPenalty"]},"tellurgy::Miasma":{"name":"Miasma","discipline":"tellurgy","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"sight-based tests in the cloud","when":"activate"},{"kind":"damage","amount":1,"baneful":false,"perTurn":true,"onlyMortal":true,"when":"activate"},{"kind":"damage","amount":1,"baneful":false,"perTurn":true,"when":"activate","min":5,"note":"acid: every creature in the cloud (mortals take 2 in all)"}],"summary":"A poison cloud: −2 sight-based tests, damage each turn to mortals.","auto":"curated","kinds":["targetPenalty","damage"]},"tellurgy::Nemesis of the Land":{"name":"Nemesis of the Land","discipline":"tellurgy","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"targetPenalty","value":"2","targets":[],"situational":false}],"summary":"You turn the land against one creature","auto":"heuristic","kinds":["targetPenalty"]},"tellurgy::Ride the Tempest":{"name":"Ride the Tempest","discipline":"tellurgy","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"status","status":"shape","note":"riding the wind: only fire, sunlight and supernatural attacks harm you, and you can't act until you arrive","lasts":"maintained"}],"summary":"Until you arrive (a few minutes) You give yourself to the wind and ride it, a shape of grit and cold air, to…","auto":"curated","kinds":["status"]},"tellurgy::Shroud of Mist":{"name":"Shroud of Mist","discipline":"tellurgy","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests to sneak and hide, and sight-based tests into, out of or thr"},{"kind":"selfBonus","value":"-1","targets":["physical"],"situational":true,"note":"Physical tests, and nobody can move more than Close distance a turn…"}],"summary":"One scene You call weather down on a point within range, fog or a gale, out to Close distance from it","auto":"heuristic","kinds":["selfBonus"]},"tellurgy::Speed the Season":{"name":"Speed the Season","discipline":"tellurgy","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"instant","fx":[{"kind":"narrativeOnly","why":"movement or a physical feat with no dice or track change"},{"kind":"selfBonus","value":2,"targets":["subterfuge"],"situational":true,"note":"hiding behind the fast growth"}],"summary":"Permanent You hurry the plants at a point within range a season along, out to Close distance from it","auto":"curated","kinds":["selfBonus"]},"tellurgy::Voice of the Soil":{"name":"Voice of the Soil","discipline":"tellurgy","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"One scene You feel the ground as if it were your own skin","auto":"heuristic","kinds":["narrativeOnly"]},"vicissitude::Blindsight":{"name":"Blindsight","discipline":"vicissitude","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"},{"kind":"selfBonus","value":2,"targets":["auspex"],"situational":true,"note":"Sense the Unseen against hidden creatures in range"}],"summary":"One scene Feelers, pits and wet new organs open on your skin, tasting heat, scent, air pressure and the…","auto":"curated","kinds":["selfBonus"]},"vicissitude::Blood of Acid":{"name":"Blood of Acid","discipline":"vicissitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"damage","amount":"margin","baneful":false,"track":"health","when":"manual","text":"1 per hit on you; spray 2 + margin"}],"summary":"One scene Your Vitae turns to acid for the scene","auto":"heuristic","kinds":["damage"]},"vicissitude::Bloodform":{"name":"Bloodform","discipline":"vicissitude","level":3,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"status","status":"shape","note":"can't be staked, grabbed, wrestled or tied up; physical attacks do no harm (area effects, fire and sunlight still do); no speech, attacks or Physical powers"}],"summary":"One scene Your body melts into a mass of thick, living Vitae","auto":"curated","kinds":["status"]},"vicissitude::Body Blade":{"name":"Body Blade","discipline":"vicissitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"status","status":"power","note":"a body part is a light or medium weapon (+1 damage at ●●●●, +2 at ●●●●●●)","weapon":"3 + band(dots, 4, 1, 6, 2)"}],"summary":"A bone weapon.","auto":"curated","kinds":["status"]},"vicissitude::Body Sculpting":{"name":"Body Sculpting","discipline":"vicissitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"selfBonus","value":1,"targets":[],"situational":true,"note":"tests a change helps (max +3 per test)"}],"summary":"+1 die per helpful change (toggle).","auto":"curated","kinds":["selfBonus"],"elderSteps":[8]},"vicissitude::Bone Shield":{"name":"Bone Shield","discipline":"vicissitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"shield","note":"parry with a Power test; breaks after twice Vicissitude dots in parries"},{"kind":"selfBonus","value":-2,"targets":[],"situational":true,"note":"fine control with the shield arm"}],"summary":"Parry with your bone shield.","auto":"curated","kinds":["status","selfBonus"]},"vicissitude::Breath of the Dragon":{"name":"Breath of the Dragon","discipline":"vicissitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"instant","fx":[{"kind":"damage","amount":"max(1, margin)","baneful":true,"track":"health"}],"summary":"Instantaneous Your throat and lungs become a furnace and you breathe a gout of burning blood and gas at a…","auto":"heuristic","kinds":["damage"]},"vicissitude::Carapace":{"name":"Carapace","discipline":"vicissitude","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"-1","targets":["dexterity"],"situational":true,"note":"Dexterity tests that need fine movement or quiet"},{"kind":"damageReduction","amount":"half(dots)","min1":true,"notBaneful":true}],"summary":"One scene Bone pushes out through your skin and locks into overlapping plates and ridges of cartilage","auto":"heuristic","kinds":["selfBonus","damageReduction"]},"vicissitude::Cocoon":{"name":"Cocoon","discipline":"vicissitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"maintained","fx":[{"kind":"narrativeOnly","why":"changes to objects or the scene"},{"kind":"status","status":"shield","note":"in the shell: it has Health equal to 2 × Stamina + your Vicissitude dots and soaks like your Endurance; sunlight can't reach you. Breaking out takes an action","lasts":"maintained"}],"summary":"Until you break out You pour flesh and bone out of your skin into a hard, knotted shell around yourself,…","auto":"curated","kinds":["status"]},"vicissitude::Detachable Parts":{"name":"Detachable Parts","discipline":"vicissitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"narrativeOnly","why":"information or perception: the Storyteller describes what you learn"}],"summary":"A sense organ keeps working apart from you.","auto":"curated","kinds":["narrativeOnly"]},"vicissitude::Flesh Disguise":{"name":"Flesh Disguise","discipline":"vicissitude","level":2,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"selfBonus","value":"dots","targets":["subterfuge"],"situational":true,"note":"passing as that person","steps":[{"level":4,"value":"2 * dots"}]}],"summary":"A copied face: Vicissitude dots to pass as that person (toggle).","auto":"curated","kinds":["selfBonus"],"elderSteps":[6]},"vicissitude::Liquefy the Mortal Coil":{"name":"Liquefy the Mortal Coil","discipline":"vicissitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"instant","fx":[{"kind":"targetPenalty","impair":["strength","dexterity"],"lasts":"maintained"},{"kind":"damage","amount":"half(dots) + margin","baneful":false,"track":"health"}],"summary":"Instantaneous Your touch tells a body to forget its shape","auto":"heuristic","kinds":["targetPenalty","damage"]},"vicissitude::Multilimb":{"name":"Multilimb","discipline":"vicissitude","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests the extra limbs help"}],"summary":"Extra limbs (toggle).","auto":"curated","kinds":["selfBonus"],"elderSteps":[7]},"vicissitude::Read the Flesh":{"name":"Read the Flesh","discipline":"vicissitude","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":["medicine"],"situational":true,"note":"Medicine tests on that creature"}],"summary":"One scene Touch a living, dead or undead creature and your fingers tell you how its body is put together:…","auto":"heuristic","kinds":["selfBonus"]},"vicissitude::Sculpt the Servant":{"name":"Sculpt the Servant","discipline":"vicissitude","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"instant","fx":[{"kind":"damageReduction","amount":"1","min1":false,"notBaneful":true,"on":"target"}],"summary":"Permanent Given a full night of uninterrupted work on a willing or helpless mortal or ghoul, you rebuild its…","auto":"heuristic","kinds":["damageReduction"]},"vicissitude::Squirm":{"name":"Squirm","discipline":"vicissitude","level":1,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"scene","fx":[{"kind":"selfBonus","value":"half(dots)","targets":[],"situational":true,"note":"tests to escape a wrestle, bonds or restraints and to wriggle thro"}],"summary":"One scene Your joints come loose and your bones go soft as gristle","auto":"heuristic","kinds":["selfBonus"]},"vicissitude::The Dracul":{"name":"The Dracul","discipline":"vicissitude","level":3,"src":"elder","file":"out-a2/disciplines/elder-powers-C.json","duration":"scene","fx":[{"kind":"damageReduction","amount":"2","min1":false,"notBaneful":true}],"summary":"One scene Once per night, you take a full turn to unfold into a winged, scaled monster three times your height","auto":"heuristic","kinds":["damageReduction"]},"vicissitude::The False Sip":{"name":"The False Sip","discipline":"vicissitude","level":2,"src":"book","book":"Blood-Stained-Love","file":"out-a2/mod/Blood-Stained-Love/items.json","duration":"scene","fx":[{"kind":"narrativeOnly","why":"control of the target's mind or feelings, played out by the Storyteller"},{"kind":"status","status":"power","note":"the blood you swallowed stays out of your system this scene: no Vitae gained, no drink toward a Blood Bond, no poison or humour"}],"summary":"(Homebrew) Rank 2 Physical Vicissitude power for our table","auto":"curated","kinds":["status"]},"vicissitude::Twist Flesh":{"name":"Twist Flesh","discipline":"vicissitude","level":3,"src":"published","file":"out-a2/disciplines/published.json","duration":"night","fx":[{"kind":"damage","amount":"margin","baneful":false},{"kind":"targetPenalty","value":2,"targets":[],"situational":true,"note":"tests using the mangled limb"},{"kind":"upkeep","amount":1,"resource":"willpower","per":"night","note":"At the end of the night 1 Willpower keeps it going (target within Short)."}],"summary":"Damage = margin; −2 on tests with the limb.","auto":"curated","kinds":["damage","targetPenalty","upkeep"],"elderSteps":[7]},"vicissitude::Visceral Absorption":{"name":"Visceral Absorption","discipline":"vicissitude","level":2,"src":"book","book":"Sabbat-The-Black-Hand","file":"out-a2/mod/Sabbat-The-Black-Hand/items.json","duration":"turn","fx":[{"kind":"narrativeOnly","why":"animals, spirits or servants the Storyteller plays"},{"kind":"resource","resource":"vitae","amount":"min(successes, max(1, bloodSorcery)) * (genMod + 1)","on":"self","when":"manual","label":"Vitae for one fresh corpse per success"}],"summary":"One turn per body Prerequisite: Blood Sorcery 2","auto":"curated","kinds":["resource"]},"vicissitude::Weight of a Feather":{"name":"Weight of a Feather","discipline":"vicissitude","level":1,"src":"published","file":"out-a2/disciplines/published.json","duration":"scene","fx":[{"kind":"status","status":"power","note":"half damage from falls, collisions and being thrown; sets off no pressure sensors"}],"summary":"Featherlight.","auto":"curated","kinds":["status"]},"vicissitude::Whispers to the Flesh":{"name":"Whispers to the Flesh","discipline":"vicissitude","level":2,"src":"ported","file":"out-a2/disciplines/ported-C.json","duration":"instant","fx":[{"kind":"damage","amount":"max(1, margin)","baneful":false,"track":"health"}],"summary":"Instantaneous You speak to a creature's flesh as if it were your own, and it starts to come apart: skin…","auto":"heuristic","kinds":["damage"]}}}

// ---------------------------------------------------------------------------
// Alpha 2.0 table actions (V6 Automation, round 2). The build appends this file
// after alpha2-core.js, so it runs in the same scope and uses that file's
// helpers (a2Enabled, a2RollVerdict, a2FindOpponent, a2DamageActor, a2Violate,
// a2Impairment, ...). a2Boot() calls a2ActionsBoot() once the core patches are in.
//
// Page numbers: PG = Alpha 2.0 Player Guide, ST = Alpha 2.0 Storyteller Packet,
// TRnn = table rulings in alpha2/decisions-a2.md, CG = conversion-guide-a2.md.
//  1. Activation guard: an item whose Vitae or Willpower cost is more than the
//     actor has can't be rolled (PG p.102, p.149). The GM overrides with
//     Shift-click or a confirm dialog. In a hunger, fear or rage frenzy, Mental
//     and Social Discipline powers are blocked too (PG p.145-146).
//  2. Willpower reroll, "Push Yourself" (PG p.104): 1 Willpower, up to 3
//     standard dice, never Hunger dice (PG p.103), once per test (TR7), not
//     after a Beast's Bargain or after damage was applied from the card.
//  3. Beast's Bargain (PG p.98, ST p.14): a failure that is neither painful nor
//     bestial becomes a basic win (margin 0) with a Beast complication. A pool
//     reduced to 0 dice is a plain failure and qualifies (TR3).
//  4. Frenzy (PG p.144-147): Self-Control (Composure + Resolve) capped at the
//     Humanity / Path rank (PG p.126, TR24); Difficulty by type; Ride the Wave
//     (+1 Willpower when it ends, PG p.145; a violation on Paths that say so,
//     PG p.130); a clan frenzy test after a bestial failure (PG p.103, p.147).
//  5. Damage (PG p.55, p.99-101, p.116-120): weapon damage + margin, unarmed
//     ½ Strength; armour by our house rule (CG §12); applied through
//     V6Alpha2.damage (Vampiric Endurance, baneful and excess damage).
//  6. Impairment (PG p.105): per-Attribute marks, -2 dice per impaired
//     Attribute in a pool, merged with the automatic ones (0 Health, PG p.101;
//     0 Willpower, PG p.104) without double counting.
//
// Data keys:
//  Actor   flags.world.a2.impaired = { <attributeKey>: true|false }  manual marks
//          flags.world.a2.frenzy   = { type, rode, since, messageId } | null
//          flags.world.a2.armour   = number (optional: armour rating override, 0 = none)
//  Item    flags.world.a2.armour   = number (optional: armour rating of a worn item)
//          flags.world.a2.extraCosts[] with when ~ "part of the cost" (read only)
//          flags.world.a2.violations[] on the Path ("nature") item (read only)
//  Message flags.world.a2.act.roll<i> = { reroll: {user, name, at, from[], to[]},
//            bargain: {user, name, at, complication, text, marginOfFailure, violations, masquerade},
//            damage: [{at, user, text}] }    (i = index in message.rolls)
//          flags.world.a2.note = { kind, actorUuid, frenzy?, messageId? } on note cards
//  Socket  module.v6-automation (module) or system.wod6e (macro / World Scripter):
//          { a2x: 1, op: 'damage' | 'message', user, ... }, handled by the active GM.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry, ChatMessage, Item */

const A2X_SOCKETS = ['module.v6-automation', 'system.wod6e']
const A2X_MAX_REROLL = 3 // PG p.104
const A2X_FRENZY = {
  hunger: { label: 'Hunger frenzy', page: 'PG p.145', aim: 'feeding or getting into a position to feed', ends: 'when you have drunk down to 1 or fewer Hunger dice', noPowers: true },
  fear: { label: 'Fear frenzy', page: 'PG p.146', aim: 'escaping the source of your fear', ends: 'when you are no longer under the threat', noPowers: true },
  rage: { label: 'Rage frenzy', page: 'PG p.146-147', aim: 'destroying things or lashing out at the cause of your rage', ends: 'when your thirst for vengeance is satisfied or you are subdued', noPowers: true },
  clan: { label: 'Clan frenzy', page: 'PG p.147', aim: 'your clan frenzy', ends: 'after one scene', noPowers: false }
}
// PG p.146, Fear Frenzy Difficulty table.
const A2X_FEAR = [
  [5, 'Direct sunlight'],
  [4, 'Fire that could engulf you (flamethrower)'],
  [3, 'Large flames over half your body (burning building)'],
  [2, 'Medium flames over a third of your body (bonfire)'],
  [1, 'Obscured sunlight (overcast sky, heavy clothing)']
]
// PG p.146, Rage Frenzy Modifier table (Difficulty 2 plus these).
const A2X_RAGE = [
  ['allyHarmed', 1, 'Ally or friend harmed'],
  ['allyKilled', 2, 'Ally or friend killed or sent into torpor'],
  ['lovedHarmed', 2, 'Loved one harmed'],
  ['lovedKilled', 3, 'Loved one killed or sent into torpor'],
  ['inferior', 1, 'Caused by a perceived inferior'],
  ['superior', -1, 'Caused by a perceived superior'],
  ['respected', -2, 'Caused by someone you greatly respect'],
  ['enemy', 1, 'Caused by an enemy'],
  ['humiliating', 1, 'Your failure was particularly humiliating']
]
// PG p.98 complication kinds; the hunger frenzy risk needs 3+ Hunger dice (PG p.98, TR5).
const A2X_BARGAIN = [
  ['collateral', 'Collateral Damage', 'You harm others nearby, or lose or threaten some of your resources (PG p.98).'],
  ['feed', 'Feed the Beast', 'You win, but your actions show the cruel, animal side of the curse; it can count against your Path or Humanity (PG p.98).'],
  ['masquerade', 'Masquerade Breach', 'You show or leave evidence of what you are: the Masquerade Tracker rises by 1 or more (PG p.98, ST p.34).'],
  ['frenzy-rage', 'Risk a rage frenzy', 'After the win you risk a rage frenzy if the moment makes you angry or humiliated (PG p.98, p.146).'],
  ['frenzy-hunger', 'Risk a hunger frenzy', 'Only with 3 or more Hunger dice and fresh blood within Short (PG p.98, p.145, TR5).'],
  ['frenzy-clan', 'Risk a clan frenzy', 'Where your clan frenzy fits the scene (PG p.147).']
]
const a2xState = { RD: null, Test: null, mod: { shift: false, t: 0 }, booting: null }

// ---- pure helpers (no Foundry globals; unit-tested in test/actions.test.mjs) ----
function a2xKey (path) { return String(path ?? '').split('.').pop() }

// Vitae ("health") and Willpower an item needs at activation: its cost plus the
// extra costs our power data marks as "part of the cost" (PG p.149).
function a2xItemCosts (system = {}, flags = {}) {
  const out = { health: 0, willpower: 0 }
  const c = system?.activation?.cost
  if (c && Object.prototype.hasOwnProperty.call(out, c.type)) out[c.type] += Math.max(0, a2Int(c.amount))
  for (const e of flags?.world?.a2?.extraCosts ?? []) {
    if (e && Object.prototype.hasOwnProperty.call(out, e.type) && /part of the cost/i.test(String(e.when ?? ''))) out[e.type] += Math.max(0, a2Int(e.amount))
  }
  return out
}

// What the actor is short of. vitae = false: the creature has no Vitae (PG p.102).
function a2xCostShortfall (costs = {}, have = {}, { vitae = true } = {}) {
  const out = []
  for (const [type, label] of [['health', 'Vitae'], ['willpower', 'Willpower']]) {
    const need = Math.max(0, a2Int(costs[type]))
    if (!need) continue
    const none = type === 'health' && !vitae
    const cur = none ? 0 : Math.max(0, a2Int(have[type]))
    if (cur < need) out.push({ type, label, need, have: cur, none })
  }
  return out
}

// Dice a Willpower reroll may pick: active results of standard (non-Hunger)
// dice terms in a roll's JSON (PG p.103-104).
function a2xRerollable (terms = []) {
  const out = []
  ;(terms ?? []).forEach((t, ti) => {
    if (!Array.isArray(t?.results) || (t?.options?.flavor ?? t?.flavor) === A2_HUNGER) return
    t.results.forEach((r, ri) => { if (r && r.active !== false && !r.discarded) out.push({ term: ti, result: ri, value: a2Int(r.result) }) })
  })
  return out
}
function a2xHungerValues (terms = []) {
  const out = []
  for (const t of terms ?? []) {
    if ((t?.options?.flavor ?? t?.flavor) !== A2_HUNGER) continue
    for (const r of t.results ?? []) if (r && r.active !== false && !r.discarded) out.push(a2Int(r.result))
  }
  return out
}

// Preselect the failed dice, lowest first, up to 3.
function a2xDefaultPicks (dice = [], max = A2X_MAX_REROLL) {
  return dice.map((d, i) => ({ i, v: d.value })).filter((d) => d.v < 6).sort((a, b) => a.v - b.v).slice(0, max).map((d) => d.i)
}

// Successes of a roll's JSON, by the same rules as alpha2-core's patched
// WOD6eRoll: 6+ succeeds, 10 counts 2 (PG p.96), basic / automatic results.
function a2xRollSuccesses (json = {}) {
  const o = json.options ?? {}
  if (o.a2?.takeHalf) return Math.max(0, a2Int(o.a2.half))
  const vals = []
  for (const t of json.terms ?? []) for (const r of t?.results ?? []) if (r && r.active !== false && !r.discarded) vals.push(a2Int(r.result))
  const rolled = a2CountSuccesses(vals)
  if (o.automaticFailure) return 0
  if (o.automaticSuccess) return Math.max(rolled, 1)
  return Math.max(rolled, Math.max(0, a2Int(o.basicSuccesses)))
}

// Replace picked standard dice with new values, the way Foundry marks rerolls
// (old result inactive + rerolled, new result appended). Returns a new JSON.
function a2xApplyReroll (json = {}, picks = [], values = []) {
  const out = JSON.parse(JSON.stringify(json))
  const dice = a2xRerollable(out.terms)
  const chosen = [...new Set(picks.map(Number))].filter((i) => dice[i]).slice(0, A2X_MAX_REROLL)
  const from = []
  const to = []
  chosen.forEach((i, k) => {
    const d = dice[i]
    const term = out.terms[d.term]
    const v = a2Clamp(a2Int(values[k], 1), 1, 10)
    term.results[d.result] = { ...term.results[d.result], active: false, rerolled: true }
    term.results.push({ result: v, active: true, success: v >= 6, count: v >= 6 ? 1 : 0 })
    from.push(d.value)
    to.push(v)
  })
  out.total = a2xRollSuccesses(out)
  return { json: out, from, to }
}

function a2xRerollCheck ({ a2 = {}, act = {}, willpower = 0, dice = 0, hasWillpower = true } = {}) {
  if (a2.takeHalf) return { ok: false, show: false, reason: 'Taking Half: no dice were rolled (PG p.94).' }
  if (act.reroll) return { ok: false, show: false, reason: 'Already rerolled: one Willpower reroll per test (TR7).' }
  if (act.bargain) return { ok: false, show: false, reason: "No reroll after a Beast's Bargain: the test is settled (PG p.98)." }
  if (act.damage?.length) return { ok: false, show: false, reason: 'Damage was already applied from this test: the result is final.' }
  if (!hasWillpower) return { ok: false, show: false, reason: 'No Willpower track.' }
  if (dice <= 0) return { ok: false, show: false, reason: 'No standard dice to reroll: Hunger dice can never be rerolled (PG p.103-104).' }
  if (a2Int(willpower) < 1) return { ok: false, show: true, reason: 'No Willpower left to spend (PG p.104).' }
  return { ok: true, show: true, reason: '' }
}

// Beast's Bargain (PG p.98, ST p.14, TR3, TR4).
function a2xBargainCheck (v = {}, { act = {}, automaticFailure = false } = {}) {
  if (act.bargain) return { ok: false, reason: "A Beast's Bargain was already made on this test." }
  if (v.noBeast) return { ok: false, reason: "Only a vampire has a Beast to bargain with (PG p.98)." }
  if (v.win !== false) return { ok: false, reason: "A Beast's Bargain is only for a failed test (PG p.98)." }
  if (v.painful) return { ok: false, reason: "No Beast's Bargain after a painful failure (PG p.98)." }
  if (v.bestial) return { ok: false, reason: "No Beast's Bargain after a bestial failure (ST p.14, TR4)." }
  if (automaticFailure) return { ok: false, reason: 'An effect made this test fail automatically.' }
  if (v.beastsBargain || v.noDice) return { ok: true, reason: '' }
  return { ok: false, reason: "No Beast's Bargain on this test." }
}

function a2xFrenzyDifficulty (type, { hunger = 0, genMod = 1, fear = 5, rage = [], rageExtra = 0 } = {}) {
  if (type === 'hunger') return Math.max(0, a2Int(hunger)) // = current Hunger dice, PG p.145
  if (type === 'fear') return a2Clamp(a2Int(fear, 5), 1, 5) // PG p.146 table
  if (type === 'rage') return Math.max(0, 2 + a2Int(rageExtra) + (rage ?? []).reduce((t, k) => t + (A2X_RAGE.find((r) => r[0] === k)?.[1] ?? 0), 0)) // PG p.146
  if (type === 'clan') return 3 + Math.max(0, a2Int(genMod)) // PG p.147
  return 0
}

// Self-Control pool (PG p.94, p.144): the rank cap is applied last, after every
// bonus (PG p.126, TR24, TR25); alpha2-core applies it when the dice are built.
function a2xFrenzyPool ({ composure = 0, resolve = 0, modifier = 0, teachings = 0, impairment = 0, rank = 10 } = {}) {
  const raw = Math.max(0, a2Int(composure) + a2Int(resolve) + a2Int(modifier) + a2Int(teachings) - Math.max(0, a2Int(impairment)))
  const cap = Math.max(0, a2Int(rank))
  return { raw, cap, dice: Math.min(raw, cap) }
}

// PG p.144: win = resisted for the scene, failure = frenzy, painful = frenzy + complication.
function a2xFrenzyOutcome (v = {}, bargained = false) {
  if (bargained || v.win === true) return 'resisted'
  return v.painful ? 'frenzy-painful' : 'frenzy'
}

// A Path violation that forbids choosing to ride the wave (PG p.130 and our
// Path items: "Choosing to Ride the Wave of a frenzy" / "... of a fear frenzy").
function a2xRideViolation (violations = [], type = '') {
  for (const v of Array.isArray(violations) ? violations : []) {
    const text = typeof v === 'string' ? v : String(v?.text ?? '')
    if (!/\brid(?:e|ing) the wave\b/i.test(text)) continue
    const m = text.match(/\bof an? (hunger|fear|rage|clan) frenzy/i)
    if (!m || m[1].toLowerCase() === type) return text
  }
  return null
}

// ---- damage formulas --------------------------------------------------------------
// An item's free damage text ("½ Oblivion dots + margin (crush)", "+Potence dots",
// "1 + margin (light); 2 + margin (3+ dots)") to an expression in the powers
// module's language: numbers, + and *, half(), max(), band(dots, t1, v1, ...),
// and the variables dots, margin and every trait key. Pure; null expr = not understood.
const A2X_TRAIT_KEYS = {
  strength: 'strength', dexterity: 'dexterity', stamina: 'stamina', charisma: 'charisma', manipulation: 'manipulation', composure: 'composure', intelligence: 'intelligence', wits: 'wits', resolve: 'resolve',
  athletics: 'athletics', awareness: 'awareness', craft: 'craft', expression: 'expression', fighting: 'fighting', investigation: 'investigation', knowledge: 'knowledge', medicine: 'medicine', persuasion: 'persuasion', shooting: 'shooting', sabotage: 'sabotage', subterfuge: 'subterfuge', survival: 'survival',
  animalism: 'animalism', auspex: 'auspex', 'blood sorcery': 'bloodSorcery', celerity: 'celerity', corruption: 'corruption', dominate: 'dominate', fortitude: 'fortitude', necromancy: 'necromancy', obfuscate: 'obfuscate', oblivion: 'oblivion', potence: 'potence', presence: 'presence', tellurgy: 'tellurgy', vicissitude: 'vicissitude'
}
const A2X_TRAIT_RE = Object.keys(A2X_TRAIT_KEYS).sort((a, b) => b.length - a.length).join('|')
function a2xFormulaTerm (piece, discipline, min1) {
  let t = piece.trim().replace(/\s+/g, ' ')
  t = t.replace(/\b(?:baneful|damage|health|willpower)\b/g, '').replace(/\s+/g, ' ').trim()
  let m
  if ((m = /^(\d+)$/.exec(t))) return { expr: m[1] }
  if (/^margin(?: of success)?$/.test(t)) return { expr: min1 ? 'max(1, margin)' : 'margin', margin: true }
  const trait = (name) => { const k = A2X_TRAIT_KEYS[name]; return k === discipline ? 'dots' : k }
  if ((m = new RegExp(`^(?:½|1/2|half)\\s*(?:your |of )?(${A2X_TRAIT_RE})(?: dots)?$`).exec(t))) return { expr: `half(${trait(m[1])})` }
  if ((m = new RegExp(`^(?:2\\s*[×x*]|twice|double)\\s*(?:your )?(${A2X_TRAIT_RE})(?: dots)?$`).exec(t))) return { expr: `2 * ${trait(m[1])}` }
  if ((m = new RegExp(`^(?:your )?(${A2X_TRAIT_RE})(?: dots)?$`).exec(t))) return { expr: trait(m[1]) }
  return null
}
function a2xFormulaSum (text, discipline, min1) {
  // Trailing words that say how or to whom, not how much.
  let t = text.trim().replace(/^[=:]\s*/, '')
  t = t.replace(/,?\s*\b(?:per (?:turn|win|day)|a turn|each turn|every turn|while it lasts|once|delayed|on a win|mortals only|ghosts only|within \d+ hours?|to (?:each|every|mortals|unarmed)[^,;]*|ignores? (?:vampiric )?endurance|then .*|in bright light|if .*|when .*)\s*$/g, '').trim()
  t = t.replace(/,\s*baneful$/, ' baneful').replace(/[,.]\s*$/, '').trim()
  if (!t) return null
  const parts = t.replace(/^\+\s*/, '').split('+')
  const terms = parts.map((p) => a2xFormulaTerm(p, discipline, min1))
  if (terms.some((x) => !x)) return null
  return { expr: terms.map((x) => x.expr).join(' + '), margin: terms.some((x) => x.margin) }
}
function a2xFormulaExpr (formula = '', { discipline = null } = {}) {
  const text = String(formula ?? '').trim()
  const out = { expr: null, rider: false, baneful: false, ignoreEndurance: false, perTurn: false, usesMargin: false, clean: false, text }
  let s = text.toLowerCase().replace(/[−–]/g, '-').replace(/●+/g, (m) => `${m.length}+ dots`)
  if (!s) return out
  out.baneful = /\bbaneful\b/.test(s) && !/\bbaneful\s+(?:at|vs\.?|against|with|if|when)\b/.test(s) && !/\bor\b/.test(s) && !/baneful at \d/.test(s)
  out.ignoreEndurance = /ignores?\s+(?:vampiric\s+)?endurance/.test(s)
  out.perTurn = /\b(?:per|a|each|every)\s+turn\b/.test(s)
  out.rider = /^\+/.test(s) || /^attack damage\s*\+/.test(s) || /\bto (?:unarmed|melee)[^;]*damage/.test(s) || /\bextra damage\b/.test(s)
  s = s.replace(/^attack damage\s*\+\s*/, '+')
  let clean = true
  const tiers = [] // [minDots, expr]
  for (const [ci, clauseRaw] of s.split(';').entries()) {
    let clause = clauseRaw.trim()
    if (!clause) continue
    if (/\bor\b/.test(clause)) { clause = clause.split(/\bor\b/)[0]; clean = false }
    const groups = []
    clause = clause.replace(/\(([^()]*)\)/g, (m, g) => { groups.push(g.trim()); return ' ' })
    const min1 = groups.some((g) => /^(?:min(?:imum)?\.?|at least)\s*1$/.test(g))
    let tier = ci === 0 ? 0 : null
    const alts = []
    for (const g of groups) {
      let m
      if (/^(?:min(?:imum)?\.?|at least)\s*1$/.test(g)) continue
      if ((m = /^(\d+)\+\s*dots$/.exec(g))) { tier = a2Int(m[1]); continue }
      if ((m = /^(.*?)\s+at\s+(\d+)\+\s*dots(.*)$/.exec(g))) {
        // "(Necromancy at 4+ dots)": a better amount with Maturing. One that needs an extra payment stays manual.
        const alt = m[3].trim() ? null : a2xFormulaSum(m[1].replace(/^full$/, ''), discipline, min1)
        if (alt) alts.push([a2Int(m[2]), alt])
        else clean = false
        continue
      }
      if (!/^[a-z ,'-]+$/.test(g) || /\b(?:mortal|ghost|only|vitae|if|when)\b/.test(g)) clean = false // a condition we can't judge
    }
    const sum = a2xFormulaSum(clause, discipline, min1)
    if (!sum) { if (ci === 0) return out; clean = false; continue }
    if (tier === null) { clean = false; continue } // a second clause with no dot threshold: an alternative
    tiers.push([tier, sum.expr])
    if (sum.margin) out.usesMargin = true
    for (const [t, a] of alts) { tiers.push([t, a.expr]); if (a.margin) out.usesMargin = true }
  }
  if (!tiers.length) return out
  tiers.sort((a, b) => a[0] - b[0])
  out.expr = tiers.length === 1 && tiers[0][0] === 0 ? tiers[0][1] : `band(dots, ${tiers.map(([t, e]) => `${t}, ${e}`).join(', ')})`
  out.clean = clean && !/\b(?:mortals?|ghosts?|vampires?|vitae|drained|chosen|take|if|when|within|delayed|once)\b/.test(s)
  return out
}

// An item's damage text (system.activation.damage.formula) to a number. With
// `evaluate` (the powers module's a2pEval) and `vars`, any understood formula
// gives a base; without them only numbers and Strength do.
function a2xParseDamage (formula = '', { strength = 0, discipline = null, vars = null, evaluate = null } = {}) {
  const text = String(formula ?? '').trim()
  const f = a2xFormulaExpr(text, { discipline })
  let base = null
  let calc = null
  if (f.expr && typeof evaluate === 'function' && vars) {
    try {
      calc = (margin = 0) => Math.max(0, a2Int(evaluate(f.expr, { ...vars, margin: Math.max(0, a2Int(margin)) })))
      base = calc(0)
    } catch (e) { calc = null }
  }
  if (base === null) {
    if (/^\d+/.test(text)) base = a2Int(text.match(/^(\d+)/)[1])
    else if (/^(?:½|1\/2|half)\s*(?:your\s+|of\s+)?strength/i.test(text)) base = a2Half(strength) // PG p.55
    else if (/^strength\b/i.test(text)) base = Math.max(0, a2Int(strength))
  }
  return { base, baneful: f.baneful, ignoreEndurance: f.ignoreEndurance, text, expr: f.expr, rider: f.rider, usesMargin: f.usesMargin, perTurn: f.perTurn, calc: f.usesMargin ? calc : null }
}

// Is this test an attack? Str + Fighting (melee), Dex or Str + Shooting (ranged),
// PG p.116; Dex + Fighting alone is a parry (PG p.120), not an attack.
function a2xAttackKind ({ itemType = null, dealsDamage = false, itemSkills = [], skills = [], attributes = [] } = {}) {
  const has = (arr, k) => [...(arr ?? [])].some((p) => a2xKey(p) === k)
  const melee = has(skills, 'fighting') || has(itemSkills, 'fighting')
  if (dealsDamage) return { kind: itemType === 'equipment' ? 'weapon' : 'power', melee }
  if (itemType === 'equipment' && (has(skills, 'fighting') || has(skills, 'shooting'))) return { kind: 'weapon', melee: has(skills, 'fighting') }
  if (itemType) return null
  if (has(skills, 'shooting')) return { kind: 'ranged', melee: false }
  if (has(skills, 'fighting') && has(attributes, 'strength')) return { kind: 'unarmed', melee: true }
  return null
}

// Weapon damage + margin of success (PG p.116); a called shot adds no margin (PG p.117).
function a2xDamageTotal ({ base = 0, margin = 0, addMargin = true, calledShot = false, bonus = 0 } = {}) {
  return Math.max(0, a2Int(base) + (addMargin && !calledShot ? Math.max(0, a2Int(margin)) : 0) + a2Int(bonus))
}

// Armour house rule (CG §12): mortals and ghouls take off the rating, minimum 1;
// for vampires worn armour raises Vampiric Endurance by 1 whatever its rating,
// not stacking with Tough Skin (PG p.49, p.99); never against baneful damage
// (PG p.100); armour-piercing ignores 1 point. `send` is what goes to
// V6Alpha2.damage, which then takes off the generation modifier itself.
function a2xArmourPlan ({ amount = 0, baneful = false, rating = 0, piercing = false, endurance = false, genMod = 0, toughSkin = false, ignoreEndurance = false } = {}) {
  amount = Math.max(0, a2Int(amount))
  const eff = Math.max(0, a2Int(rating) - (piercing ? 1 : 0))
  const g = Math.max(0, a2Int(genMod))
  const out = { send: amount, expected: amount, endurance: 0, armour: 0, raise: 0, raisedBy: '', ignored: false }
  if (!amount || baneful) return out
  if (endurance) {
    if (ignoreEndurance) { out.send = amount + g; out.ignored = true; return out } // cancels a2ApplyDamage's -g
    out.raise = eff > 0 || toughSkin ? 1 : 0
    out.raisedBy = eff > 0 ? 'armour' : toughSkin ? 'Tough Skin' : ''
    out.send = out.raise ? Math.max(1, amount - out.raise) : amount
    out.endurance = g + out.raise
    out.expected = Math.max(1, amount - out.endurance)
    return out
  }
  if (eff > 0) { out.armour = eff; out.send = Math.max(1, amount - eff); out.expected = out.send }
  return out
}

// Armour rating from an item's name and description (our items say "Rating 2",
// "Armour 2" or "each hit is reduced by 2"). null: not armour.
function a2xArmourFromText (name = '', description = '') {
  const n = String(name ?? '')
  if (!/\barmou?r\b|kevlar|\bvest\b|flak|mail\b|plating|helmet|\bpads\b/i.test(n) || /piercing|rounds|ammo|\bsuv\b|vehicle/i.test(n)) return null
  const s = `${n} ${String(description ?? '').replace(/<[^>]+>/g, ' ')}`
  const m = s.match(/\brating\s*:?\s*(\d)\b/i) ?? s.match(/(?<!V5\s)\barmou?r\s*:?\s*(\d)\b/i) ??
    s.match(/reduces?\s+each\s+hit[^.]*?\bby\s+(\d)/i) ?? s.match(/each\s+hit\s+is\s+reduced\s+by\s+(\d)/i)
  return m ? a2Int(m[1]) : 1
}

// Repeated impairment (PG p.105): an impaired Attribute passes it on to another
// one (same group first; the Storyteller may pick); all nine: lose 1 Willpower.
function a2xCascadeTarget (key, impaired = new Set(), groups = {}) {
  if (!impaired.has(key)) return { key, willpower: 0, moved: false }
  const all = Object.keys(groups)
  const next = all.find((k) => groups[k] === groups[key] && !impaired.has(k)) ?? all.find((k) => !impaired.has(k)) ?? null
  return next ? { key: next, willpower: 0, moved: true } : { key: null, willpower: 1, moved: false }
}

// -2 dice per impaired Attribute in the pool, cumulative (PG p.105).
function a2xImpairPenalty (attributeKeys = [], impaired = new Set()) {
  return 2 * [...new Set(attributeKeys)].filter((k) => impaired.has(k)).length
}

// ---- reading documents ---------------------------------------------------------
function a2xAttrDefs () { return globalThis.WOD6E?.configs?.Attributes?.getList?.({}) ?? {} }
function a2xSpeaker (message) {
  try { return ChatMessage.getSpeakerActor?.(message?.speaker) ?? message?.speakerActor ?? null } catch (e) { return null }
}
function a2xAct (message, i) { return message?.flags?.world?.a2?.act?.[`roll${i}`] ?? {} }
function a2xMessage (m) { return typeof m === 'string' ? game.messages?.get(m) ?? null : (m ?? null) }
function a2xFirstA2Roll (message) { return (message?.rolls ?? []).findIndex((r) => r?.options?.a2?.built) }
function a2xIsGM () { return typeof v6aIsGM === 'function' ? v6aIsGM() : game.user === game.users?.activeGM }
function a2xGMActive () { return Boolean(game.users?.activeGM) }

// An Actor from an Actor, Token, TokenDocument or uuid; default: the selected
// token's actor, then the user's character.
function a2xActor (x) {
  if (typeof x === 'string') x = a2FromUuid(x)
  if (!x) x = globalThis.canvas?.tokens?.controlled?.[0] ?? game.user?.character ?? null
  const actor = x?.actor ?? x
  return actor && typeof actor.update === 'function' && actor.type ? actor : null
}

function a2xFrenzyState (actor) {
  const f = actor?.flags?.world?.a2?.frenzy
  return f && typeof f === 'object' && A2X_FRENZY[f.type] ? f : null
}

// Manual marks plus the automatic ones: 0 Health impairs Physical Attributes of
// vampires (PG p.101), 0 Willpower Social and Mental ones (PG p.104). Same tests
// as alpha2-core's a2Impairment, which only knows the automatic ones.
function a2xImpairment (actor) {
  const defs = a2xAttrDefs()
  const manual = new Set(Object.entries(actor?.flags?.world?.a2?.impaired ?? {}).filter(([k, v]) => v === true && k in defs).map(([k]) => k))
  const auto = new Map()
  if (actor?.type === 'vampire') {
    const cats = new Map()
    if (a2Creature(actor) === 'vampire' && a2ActorHealth(actor).value === 0) cats.set('physical', '0 Health')
    if (a2Int(actor.system?.willpower?.max) > 0 && a2Int(actor.system?.willpower?.value) === 0) { cats.set('social', '0 Willpower'); cats.set('mental', '0 Willpower') }
    for (const [k, d] of Object.entries(defs)) if (cats.has(d.type)) auto.set(k, cats.get(d.type))
  }
  return { manual, auto, all: new Set([...manual, ...auto.keys()]) }
}
function a2xImpairmentPenalty (actor, attributePaths = []) {
  if (actor?.type !== 'vampire') return 0
  return a2xImpairPenalty((attributePaths ?? []).map(a2xKey), a2xImpairment(actor).all)
}

// Highest worn armour: the actor's override, else items with a numeric
// flags.world.a2.armour, else armour items recognised by name (CG §12).
function a2xArmourRating (actor) {
  const own = actor?.flags?.world?.a2?.armour
  if (own !== undefined && own !== null && Number.isFinite(Number(own))) return Math.max(0, a2Int(own))
  let best = 0
  for (const i of actor?.items ?? []) {
    if (!['equipment', 'merit', 'npcAbility', 'clanTrait'].includes(i.type)) continue
    const f = i.flags?.world?.a2?.armour
    const r = f !== undefined && f !== null && Number.isFinite(Number(f)) ? a2Int(f) : a2xArmourFromText(i.name, i.system?.description)
    if (r) best = Math.max(best, r)
  }
  return best
}
function a2xToughSkin (actor) { return (actor?.items ?? []).some((i) => /^tough skin\b/i.test(String(i.name ?? ''))) } // PG p.49

// ---- 1. activation guard ------------------------------------------------------
function a2xTrackMods (ev) { a2xState.mod = { shift: Boolean(ev?.shiftKey), t: Date.now() } }
function a2xShiftHeld () {
  try { if (game.keyboard?.isModifierActive?.('Shift')) return true } catch (e) { /* older API */ }
  return a2xState.mod.shift && Date.now() - a2xState.mod.t < 1500
}

async function a2xActivationGuard (item, actor, { override = false } = {}) {
  if (!item || !actor || actor.type === 'npc') return true // ST p.42: simple NPC abilities cost nothing
  const problems = []
  const rules = a2Rules(actor)
  const short = a2xCostShortfall(a2xItemCosts(item.system, item.flags), { health: actor.system?.health?.value, willpower: actor.system?.willpower?.value }, { vitae: rules ? rules.vitae : true })
  for (const s of short) problems.push(s.none ? `${actor.name} has no Vitae (${a2Creature(actor)}) for ${item.name} (cost ${s.need} Vitae).` : `${actor.name} has only ${s.have} ${s.label} for ${item.name} (cost ${s.need}).`)
  const fr = a2xFrenzyState(actor)
  if (fr && A2X_FRENZY[fr.type].noPowers && item.type === 'discipline' && ['mental', 'social'].includes(item.system?.attribute)) {
    problems.push(`${actor.name} is in a ${fr.type} frenzy: no Mental or Social Discipline powers (PG p.145-146).`)
  }
  if (!problems.length) return true
  const text = problems.join(' ')
  if (game.user.isGM) {
    if (override || a2xShiftHeld()) { ui.notifications.warn(`${text} GM override.`); return true }
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Activate ${item.name}?` },
      content: `<p>${a2Esc(text)}</p><p>Activate it anyway? A cost is paid as far as it goes (PG p.102, p.149). Shift-click the roll button to skip this question.</p>`,
      rejectClose: false
    })
    return ok === true
  }
  ui.notifications.warn(`${text} It can't be activated (PG p.102, p.149); the Storyteller can override.`)
  return false
}

function a2xPatchRollDialog (RD) {
  if (!RD) return
  if (!Object.prototype.hasOwnProperty.call(RD, '__a2xOpen')) {
    const open = RD.open
    RD.open = async function (input = {}) {
      try {
        if (a2Enabled()) {
          const isItem = typeof Item === 'function' && input instanceof Item
          const item = isItem ? input : (input?.item ?? null)
          const actor = isItem ? input.actor : (input?.actor ?? item?.actor ?? null)
          if (item && actor && !(await a2xActivationGuard(item, actor, { override: Boolean(input?.a2Override) }))) return null
        }
      } catch (e) { console.error('V6 Alpha 2 | activation guard', e) }
      return open.call(this, input)
    }
    Object.defineProperty(RD, '__a2xOpen', { value: true })
  }
  if (!Object.prototype.hasOwnProperty.call(RD, '__a2xPrep')) {
    const prep = RD._prepareContext
    RD._prepareContext = function (args = {}) {
      const res = prep.call(this, args)
      if (a2Enabled()) {
        try { a2xAdjustContext(res, args) } catch (e) { console.error('V6 Alpha 2 | impairment', e) }
      }
      return res
    }
    Object.defineProperty(RD, '__a2xPrep', { value: true })
  }
}

// ---- 6. impairment in the roll dialog --------------------------------------------
// alpha2-core already took off its automatic impairment; only the rest comes
// off here, so nothing is counted twice (and nothing at all once alpha2-core
// counts the manual marks itself; see alpha2/actions-notes.md).
function a2xAdjustContext (res, args) {
  const actor = args?.actor ?? res?.actor
  const t = res?.test
  if (!actor || !t?.a2 || actor.type !== 'vampire') return
  const paths = [...(t.attributes ?? [])]
  const extra = a2xImpairmentPenalty(actor, paths) - a2Impairment(actor, paths)
  if (extra <= 0) return
  t.baseDicePool = a2Int(t.baseDicePool) - extra
  t.dicePool = Math.max(0, a2Int(t.dicePool) - extra)
  const st = a2xImpairment(actor)
  const names = paths.map(a2xKey).filter((k) => st.manual.has(k) && !st.auto.has(k)).map((k) => a2TraitLabel('Attributes', k))
  t.a2.notes.push(`Impaired ${names.join(', ')}: −${extra} dice (PG p.105).`)
  const pool = t.a2.cap !== null && t.a2.cap !== undefined ? Math.min(t.dicePool, a2Int(t.a2.cap)) : t.dicePool
  t.dicePoolText = a2PoolText(a2PlanDice(pool, t.a2.hunger, t.a2.takeHalf), {
    cap: t.a2.cap,
    difficulty: t.difficulty,
    rolling: (s) => game.i18n.format('WOD6E.ROLL.RollingString', { string: s })
  })
}

async function a2xSetImpaired (actorLike, keyOrMap, on = true) {
  const actor = a2xActor(actorLike)
  if (!actor) { ui.notifications.warn('No actor to impair: select a token.'); return null }
  const defs = a2xAttrDefs()
  const map = typeof keyOrMap === 'string' ? { [keyOrMap]: on } : (keyOrMap ?? {})
  const upd = {}
  for (const [k, v] of Object.entries(map)) {
    const key = a2xKey(k)
    if (!(key in defs)) { ui.notifications.warn(`Unknown Attribute "${k}".`); continue }
    upd[`flags.world.a2.impaired.${key}`] = Boolean(v)
  }
  if (!Object.keys(upd).length) return null
  await actor.update(upd)
  return a2xImpairment(actor)
}

// Impair with the repeated-impairment rule (PG p.105).
async function a2xImpair (actorLike, key) {
  const actor = a2xActor(actorLike)
  if (!actor) return null
  const groups = Object.fromEntries(Object.entries(a2xAttrDefs()).map(([k, d]) => [k, d.type]))
  const c = a2xCascadeTarget(a2xKey(key), a2xImpairment(actor).all, groups)
  if (c.willpower) {
    const wp = a2Int(actor.system?.willpower?.value)
    await actor.update({ 'system.willpower.value': Math.max(0, wp - 1) })
    await a2Note(actor, `${actor.name}: impairment`, ['All nine Attributes are impaired: lose 1 Willpower instead (PG p.105).'])
    return { key: null, willpower: 1 }
  }
  await a2xSetImpaired(actor, c.key, true)
  if (c.moved) ui.notifications.info(`${a2TraitLabel('Attributes', a2xKey(key))} is already impaired, so ${a2TraitLabel('Attributes', c.key)} is impaired instead; the Storyteller may pick another (PG p.105).`)
  return { key: c.key, moved: c.moved }
}

// An action and 2 Vitae end one impairment at once (PG p.105).
async function a2xRecoverImpairment (actorLike, key, { vitae = false } = {}) {
  const actor = a2xActor(actorLike)
  if (!actor) return null
  key = a2xKey(key)
  if (!a2xImpairment(actor).manual.has(key)) return null
  const upd = { [`flags.world.a2.impaired.${key}`]: false }
  if (vitae) {
    const cur = a2Int(actor.system?.health?.value)
    if (!a2Rules(actor)?.vitae || cur < 2) { ui.notifications.warn(`${actor.name} needs 2 Vitae to end an impairment (PG p.105).`); return null }
    upd['system.health.value'] = cur - 2
  }
  await actor.update(upd)
  return { key, vitae: vitae ? 2 : 0 }
}

// Long-term impairments heal one at a time: a vampire one each night on rising,
// a ghoul one per 3 days, a mortal one per 7 (PG p.105). Called by New Night.
// flags.world.a2.impairedNight = the night the current wait started.
function a2xRecoveryInterval (creature) { return creature === 'vampire' ? 1 : creature === 'ghoul' ? 3 : 7 }
function a2xRecoveryDue ({ creature = 'vampire', night = 1, since = null, count = 0 } = {}) {
  if (count <= 0) return { recover: false, since: null }
  const every = a2xRecoveryInterval(creature)
  const start = since === null || since === undefined ? (every === 1 ? night - 1 : night) : a2Int(since)
  return night - start >= every ? { recover: true, since: night } : { recover: false, since: start }
}
async function a2xNightlyRecovery (actorLike, night = 1, { rose = true } = {}) {
  const actor = a2xActor(actorLike)
  if (!actor || actor.type !== 'vampire') return null
  const manual = [...a2xImpairment(actor).manual]
  const since = actor.flags?.world?.a2?.impairedNight ?? null
  if (!manual.length) { if (since !== null) await actor.update(a2Unset({}, 'flags.world.a2.impairedNight')); return null }
  const creature = a2Creature(actor)
  if (creature === 'vampire' && !rose) return null // heals on rising
  const due = a2xRecoveryDue({ creature, night, since, count: manual.length })
  if (!due.recover) { if (since === null) await actor.update({ 'flags.world.a2.impairedNight': due.since }); return null }
  const key = manual[0]
  const upd = { [`flags.world.a2.impaired.${key}`]: false }
  if (manual.length > 1) upd['flags.world.a2.impairedNight'] = night
  else a2Unset(upd, 'flags.world.a2.impairedNight')
  await actor.update(upd)
  return { key, label: a2TraitLabel('Attributes', key), left: manual.length - 1 }
}

// ---- chat cards -------------------------------------------------------------------
function a2xRenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root || message?.isContentVisible === false || !a2Enabled()) return
  try { if (message.flags?.world?.a2?.note) a2xDecorateNote(message, root) } catch (e) { console.error('V6 Alpha 2 | note card', e) }
  if (!(message.rolls ?? []).some((r) => r?.options?.a2?.built)) return
  const run = () => { try { a2xDecorateCard(message, root) } catch (e) { console.error('V6 Alpha 2 | card actions', e) } }
  // alpha2-core's hook draws the .a2-result blocks; it is registered first, but don't rely on it.
  if (root.querySelector('.a2-result')) run()
  else queueMicrotask(run)
}

function a2xDecorateCard (message, root) {
  root.querySelectorAll('.a2x-actions, .a2x-line').forEach((e) => e.remove())
  const blocks = [...root.querySelectorAll('.a2-result')]
  const rollEls = root.querySelectorAll('.dice-roll')
  let b = 0
  ;(message.rolls ?? []).forEach((roll, i) => {
    if (!roll?.options?.a2?.built) return
    const block = blocks[b++]
    if (!block) return
    a2xFixTooltip(rollEls[i], roll)
    a2xDecorateBlock(message, roll, i, block)
  })
}

// Rerolled dice stay in Foundry's tooltip, struck through; don't count them.
function a2xFixTooltip (el) {
  el?.querySelectorAll?.('.dice-tooltip .tooltip-part').forEach((part) => {
    if (!part.querySelector('li.rerolled, li.discarded')) return
    const vals = [...part.querySelectorAll('li')].filter((li) => !li.classList.contains('rerolled') && !li.classList.contains('discarded')).map((li) => parseInt(li.textContent, 10)).filter(Number.isFinite)
    const tot = part.querySelector('.part-total')
    if (tot) tot.textContent = String(a2CountSuccesses(vals))
  })
}

function a2xVerdict (message, roll) {
  const opp = a2FindOpponent(message, roll)
  return { opp, v: a2RollVerdict(roll, opp ? { successes: opp.successes, tieWin: opp.compare.win } : null) }
}

function a2xDecorateBlock (message, roll, i, block) {
  const a2 = roll.options.a2
  const act = a2xAct(message, i)
  const actor = a2xSpeaker(message)
  const { opp, v } = a2xVerdict(message, roll)
  const lines = []
  if (act.reroll) lines.push(`Willpower reroll${act.reroll.name ? ` by ${act.reroll.name}` : ''}: ${(act.reroll.from ?? []).join(', ')} → ${(act.reroll.to ?? []).join(', ')}; 1 Willpower spent (PG p.104).`)
  if (act.bargain) {
    a2xShowBargain(block, v, act.bargain)
    const label = A2X_BARGAIN.find((c) => c[0] === act.bargain.complication)?.[1] ?? 'complication'
    lines.push(`Beast's Bargain: ${label}${act.bargain.text ? `: ${act.bargain.text}` : ''} (PG p.98).`)
  }
  if (opp) {
    const oi = (opp.message.rolls ?? []).indexOf(opp.roll)
    if (a2xAct(opp.message, oi).bargain) lines.push(`${opp.name} struck a Beast's Bargain: that failure became a basic win, margin 0 (PG p.98).`)
  }
  if (a2.frenzyTest) lines.push(a2xFrenzyLine(a2.frenzyTest, v, Boolean(act.bargain), actor))
  for (const d of act.damage ?? []) lines.push(`Damage applied: ${d.text}.`)
  if (lines.length) {
    let ul = block.querySelector('.a2-notes')
    if (!ul) {
      ul = document.createElement('ul')
      ul.className = 'a2-notes'
      const bar = block.querySelector('.a2-actions')
      if (bar) bar.before(ul)
      else block.append(ul)
    }
    for (const l of lines) {
      const li = document.createElement('li')
      li.className = 'a2x-line'
      li.textContent = l
      ul.append(li)
    }
  }

  const bar = document.createElement('div')
  bar.className = 'a2-actions a2x-actions'
  const btn = (icon, label, title, fn, disabled = false) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'a2x-btn'
    el.innerHTML = `<i class="${icon}"></i> ${a2Esc(label)}`
    el.title = title
    el.disabled = Boolean(disabled)
    el.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(ev) })
    bar.append(el)
    return el
  }
  const owner = Boolean(actor?.isOwner)
  const rules = a2Rules(actor)
  if (owner && actor.system?.willpower) {
    const r = a2xRerollCheck({ a2, act, willpower: actor.system.willpower.value, dice: a2DieValues(roll).normal.length, hasWillpower: true })
    if (r.show) btn('fa-solid fa-rotate', 'Reroll (1 WP)', r.ok ? 'Push Yourself: spend 1 Willpower to reroll up to 3 standard dice; never Hunger dice (PG p.104).' : r.reason, () => a2xRerollWillpower(message, { rollIndex: i }), !r.ok).dataset.a2x = 'reroll'
  }
  if (owner && rules?.humanity && a2xBargainCheck(v, { act, automaticFailure: roll.options.automaticFailure }).ok) {
    btn('fa-solid fa-handshake', "Beast's Bargain", 'Let the Beast in: a Beast complication for a basic win (PG p.98).', () => a2xBeastsBargain(message, { rollIndex: i })).dataset.a2x = 'bargain'
  }
  if (owner && rules?.humanity && v.bestial && !a2.frenzyTest) {
    btn('fa-solid fa-face-angry', 'Clan frenzy test', 'A bestial failure can risk a frenzy; clan frenzy Difficulty 3 + generation modifier (PG p.103, p.147).', () => a2xFrenzyTest(actor, { type: 'clan' })).dataset.a2x = 'frenzy'
  }
  const info = a2xAttackInfo(message, roll)
  // A power whose own card deals its damage gets no second button here (Draining Darkness).
  const byPowerCard = info?.item?.type === 'discipline' && typeof a2pHandlesDamage === 'function' && a2pHandlesDamage(info.item) // eslint-disable-line no-undef
  // a wrestling move, a feed or a trick resolves on its own card: no weapon damage to apply here
  const moveKind = message.flags?.world?.a2def?.move?.effect?.kind
  const byMove = Boolean(moveKind) && !['stake', 'behead'].includes(moveKind)
  if (info && !byPowerCard && !byMove && (game.user.isGM || owner) && (v.win !== false || act.bargain)) {
    btn('fa-solid fa-burst', 'Apply damage', `Weapon damage + margin to the targeted tokens, or the selected ones (PG p.116). ${info.label}.`, () => a2xPromptCardDamage(message, i)).dataset.a2x = 'damage'
  }
  if (bar.childElementCount) block.append(bar)
}

// The card of a bargained test reads as the basic win it now is (PG p.19, p.98).
function a2xShowBargain (block, v) {
  block.classList.remove('a2-fail', 'a2-painful', 'a2-tie', 'a2-open')
  block.classList.add('a2-win', 'a2x-bargained')
  const strong = block.querySelector('.a2-verdict strong')
  if (strong) strong.textContent = "Basic win (Beast's Bargain)"
  const span = block.querySelector('.a2-verdict span')
  if (span) span.textContent = `${a2Plural(a2Int(v.successes), 'success', 'successes')}${v.difficulty ? ` vs Difficulty ${v.difficulty}` : v.opponent !== null && v.opponent !== undefined ? ` vs ${v.opponent}` : ''} · margin 0`
  block.querySelectorAll('.a2-notes li:not(.a2x-line)').forEach((li) => { if (/^Beast's Bargain possible/.test(li.textContent)) li.remove() })
}

function a2xFrenzyLine (ft, v, bargained, actor) {
  const info = A2X_FRENZY[ft.type] ?? A2X_FRENZY.rage
  const out = a2xFrenzyOutcome(v, bargained)
  if (out === 'resisted') return `${info.label} resisted for the scene; it can come back next scene if the cause remains (PG p.144).`
  const clan = ft.type === 'clan' ? a2xClanFrenzyText(actor) : ''
  return `${info.label}! ${a2xFrenzyEffects(ft.type)}${clan ? ` ${clan}` : ''}${out === 'frenzy-painful' ? ' Painful failure: you also do something you will regret (PG p.144).' : ''}`
}

function a2xFrenzyEffects (type) {
  const f = A2X_FRENZY[type] ?? A2X_FRENZY.rage
  if (type === 'clan') return "You act out your clan's frenzy for one scene (PG p.147)."
  return `No Mental or Social Discipline powers; −2 × generation modifier dice on tests not about ${f.aim}, + generation modifier on tests about it, including resisting attempts to calm you${type === 'rage' ? '; +1 damage with melee attacks' : ''} (${f.page}). It ends ${f.ends}, or at the end of the scene once the cause is gone (PG p.144).`
}

function a2xClanFrenzyText (actor) {
  const clan = (actor?.items ?? []).find((i) => i.type === 'clan')
  const f = clan?.system?.frenzy
  if (!f) return ''
  const text = String(f.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const name = String(f.name ?? '').trim()
  if (!text && !name) return ''
  return `${clan.name}${name ? ` (${name})` : ''}: ${text.length > 220 ? `${text.slice(0, 217)}…` : text}`
}

// Buttons on our own note cards (a bargain that risks a frenzy).
function a2xDecorateNote (message, root) {
  const note = message.flags.world.a2.note
  const actor = a2FromUuid(note.actorUuid)
  root.querySelectorAll('[data-a2x="note-frenzy"]').forEach((b) => {
    if (!actor?.isOwner) { b.remove(); return }
    b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); a2xFrenzyTest(actor, { type: b.dataset.type || 'rage' }) })
  })
}

async function a2xPostNote (actor, title, lines, { note = {}, buttons = '', whisper = false } = {}) {
  const data = {
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="wod6e chat-card a2-note a2x-note"><h4 class="chat-card-name">${a2Esc(title)}</h4><ul>${lines.filter(Boolean).map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul>${buttons}</div>`,
    flags: { world: { a2: { note: { actorUuid: actor?.uuid ?? null, ...note } } } }
  }
  if (whisper) data.whisper = game.users.filter((u) => u.isGM || actor?.testUserPermission?.(u, 'OWNER')).map((u) => u.id)
  return ChatMessage.create(data)
}

// Re-render cards compared with one that changed (reroll, bargain).
function a2xOnUpdateMessage (message, changes) {
  if (!changes?.rolls && !foundry.utils.hasProperty(changes ?? {}, 'flags.world.a2.act')) return
  const mine = new Set([message.flags?.world?.a2vs, a2State.localVs.get(message.id), ...(message.rolls ?? []).map((r) => r?.options?.a2?.vsMessage)].filter(Boolean))
  for (const m of (game.messages?.contents ?? []).slice(-80)) {
    if (m.id === message.id) continue
    if (mine.has(m.id) || m.flags?.world?.a2vs === message.id || a2State.localVs.get(m.id) === message.id || (m.rolls ?? []).some((r) => r?.options?.a2?.vsMessage === message.id)) a2Rerender(m)
  }
}

// ---- writes that may need the GM -----------------------------------------------------
function a2xCanWrite (message) {
  try { return Boolean(game.user.isGM || message.canUserModify?.(game.user, 'update') || message.isOwner) } catch (e) { return false }
}
async function a2xWriteMessage (message, update) {
  if (a2xCanWrite(message)) return message.update(update)
  if (!a2xGMActive()) { ui.notifications.warn('This needs the GM online: the chat card belongs to another user.'); return null }
  a2xRelay('message', { id: message.id, update })
  return null
}
function a2xRelay (op, payload = {}) {
  const ch = game.modules?.get?.('v6-automation')?.active ? A2X_SOCKETS[0] : A2X_SOCKETS[1]
  game.socket?.emit?.(ch, { a2x: 1, op, user: game.user.id, ...payload })
  return true
}
// Only rolls, content and our flags may be written for another user.
function a2xSafeMessageUpdate (update = {}) {
  const out = {}
  for (const [k, v] of Object.entries(update ?? {})) {
    if (k === 'rolls' || k === 'content' || k.startsWith('flags.world.a2.act.')) out[k] = v
  }
  return Object.keys(out).length ? out : null
}
function a2xUserOwnsSpeaker (user, message) {
  const actor = a2xSpeaker(message)
  try { return Boolean(user?.isGM || actor?.testUserPermission?.(user, 'OWNER')) } catch (e) { return false }
}

async function a2xOnSocket (data, senderId) {
  try {
    if (!data || data.a2x !== 1 || !a2xIsGM()) return
    const user = game.users.get(data.user ?? senderId)
    if (!user) return
    if (data.op === 'damage') {
      const src = data.opts?.messageId ? game.messages.get(data.opts.messageId) : null
      if (src && !a2xUserOwnsSpeaker(user, src) && src.author?.id !== user.id) { console.warn('V6 Alpha 2 | damage request refused for', user.name); return }
      await a2xApplyDamage(data.targets, { ...(data.opts ?? {}), requester: user.id })
    } else if (data.op === 'message') {
      const m = game.messages.get(data.id)
      const upd = a2xSafeMessageUpdate(data.update)
      if (!m || !upd || !a2xUserOwnsSpeaker(user, m)) { console.warn('V6 Alpha 2 | card update refused for', user.name); return }
      await m.update(upd)
      await a2xSyncFrenzy(m)
    }
  } catch (e) { console.error('V6 Alpha 2 | socket', e) }
}

// ---- 2. Willpower reroll ------------------------------------------------------------
async function a2xRerollWillpower (messageOrId, { dice = null, rollIndex = null } = {}) {
  if (!a2Enabled()) return null
  const message = a2xMessage(messageOrId)
  const i = rollIndex ?? a2xFirstA2Roll(message)
  const roll = message?.rolls?.[i]
  if (!roll?.options?.a2?.built) { ui.notifications.warn('No Alpha 2 test on that card.'); return null }
  const actor = a2xSpeaker(message)
  if (!actor?.isOwner) { ui.notifications.warn("Only the rolling character's owner can spend its Willpower."); return null }
  const json = roll.toJSON()
  const list = a2xRerollable(json.terms)
  const check = a2xRerollCheck({ a2: roll.options.a2, act: a2xAct(message, i), willpower: actor.system?.willpower?.value, dice: list.length, hasWillpower: Boolean(actor.system?.willpower) })
  if (!check.ok) { ui.notifications.warn(check.reason); return null }
  let picks = Array.isArray(dice) ? dice : await a2xPromptReroll(list, a2xHungerValues(json.terms))
  if (!Array.isArray(picks)) return null
  picks = [...new Set(picks.map(Number))].filter((p) => list[p]).slice(0, A2X_MAX_REROLL)
  if (!picks.length) return null
  if (!a2xCanWrite(message) && !a2xGMActive()) { ui.notifications.warn('This needs the GM online: the chat card belongs to another user.'); return null }
  const fresh = await new foundry.dice.Roll(`${picks.length}d10cs>=6`).evaluate()
  const values = (fresh.dice ?? []).flatMap((d) => (d.results ?? []).map((r) => r.result))
  try { await game.dice3d?.showForRoll?.(fresh, game.user, true) } catch (e) { /* Dice So Nice is optional */ }
  const res = a2xApplyReroll(json, picks, values)
  // Pushing yourself costs Willpower but isn't Willpower damage (PG p.104).
  await actor.update({ 'system.willpower.value': Math.max(0, a2Int(actor.system.willpower.value) - 1) })
  const update = {
    rolls: message.rolls.map((r, j) => (j === i ? res.json : r.toJSON())),
    [`flags.world.a2.act.roll${i}.reroll`]: { user: game.user.id, name: game.user.name, at: Date.now(), from: res.from, to: res.to }
  }
  if (message.rolls.length === 1 && /^\s*\d+\s*$/.test(String(message.content ?? ''))) update.content = String(res.json.total)
  await a2xWriteMessage(message, update)
  if (a2xCanWrite(message)) await a2xSyncFrenzy(message)
  return { from: res.from, to: res.to, total: res.json.total }
}

async function a2xPromptReroll (list, hunger = []) {
  const pre = new Set(a2xDefaultPicks(list))
  const chips = list.map((d, k) => `<label class="a2x-pick"><input type="checkbox" name="pick" value="${k}"${pre.has(k) ? ' checked' : ''}><span class="a2-die${d.value >= 6 ? ' a2-succ' : ''}${d.value === 10 ? ' a2-crit' : ''}">${d.value}</span></label>`).join('')
  const hchips = hunger.map((x) => `<span class="a2-die a2-h${x >= 6 ? ' a2-succ' : ''}" title="Hunger die: can't be rerolled">${x}</span>`).join('')
  return foundry.applications.api.DialogV2.prompt({
    window: { title: 'Willpower reroll (1 Willpower)' },
    content: `<div class="a2x-dialog"><p>Pick up to ${A2X_MAX_REROLL} standard dice to reroll. Hunger dice can't be rerolled (PG p.103-104).</p><div class="a2x-picks">${chips}</div>${hchips ? `<div class="a2x-picks a2x-hunger">${hchips}</div>` : ''}</div>`,
    ok: { label: 'Reroll', icon: 'fa-solid fa-rotate', callback: (ev, button) => [...button.form.querySelectorAll('input[name="pick"]:checked')].map((e) => Number(e.value)).slice(0, A2X_MAX_REROLL) },
    render: (ev, dialog) => {
      dialog?.element?.addEventListener?.('change', (e) => {
        if (e.target?.name !== 'pick') return
        if (dialog.element.querySelectorAll('input[name="pick"]:checked').length > A2X_MAX_REROLL) e.target.checked = false
      })
    },
    rejectClose: false
  })
}

// ---- 3. Beast's Bargain ---------------------------------------------------------------
async function a2xBeastsBargain (messageOrId, { rollIndex = null, complication = null, text = '', violations = 0, masquerade = 1 } = {}) {
  if (!a2Enabled()) return null
  const message = a2xMessage(messageOrId)
  const i = rollIndex ?? a2xFirstA2Roll(message)
  const roll = message?.rolls?.[i]
  if (!roll?.options?.a2?.built) { ui.notifications.warn('No Alpha 2 test on that card.'); return null }
  const actor = a2xSpeaker(message)
  if (!actor?.isOwner) { ui.notifications.warn("Only the rolling character's owner can strike a Beast's Bargain."); return null }
  if (!a2Rules(actor)?.humanity) { ui.notifications.warn(`${actor.name} has no Beast to bargain with (${a2Creature(actor)}).`); return null }
  const { v } = a2xVerdict(message, roll)
  const check = a2xBargainCheck(v, { act: a2xAct(message, i), automaticFailure: roll.options.automaticFailure })
  if (!check.ok) { ui.notifications.warn(check.reason); return null }
  const hunger = a2Int(roll.options.a2.hungerAvailable ?? a2ActorHunger(actor))
  let o = { complication, text, violations, masquerade }
  if (!complication) {
    o = await a2xPromptBargain(actor, v, hunger)
    if (!o) return null
  }
  if (!A2X_BARGAIN.some((c) => c[0] === o.complication)) o.complication = 'collateral'
  if (o.complication === 'frenzy-hunger' && hunger < 3) { ui.notifications.warn('A hunger frenzy risk needs 3 or more Hunger dice (PG p.98).'); return null }
  if (!a2xCanWrite(message) && !a2xGMActive()) { ui.notifications.warn('This needs the GM online: the chat card belongs to another user.'); return null }
  const label = A2X_BARGAIN.find((c) => c[0] === o.complication)[1]
  const n = o.complication === 'feed' ? Math.max(0, a2Int(o.violations)) : 0
  const boxes = o.complication === 'masquerade' ? Math.max(1, a2Int(o.masquerade, 1)) : 0
  const flag = { user: game.user.id, name: game.user.name, at: Date.now(), complication: o.complication, text: String(o.text ?? '').trim(), marginOfFailure: Math.abs(a2Int(v.margin)), violations: n, masquerade: boxes }
  await a2xWriteMessage(message, { [`flags.world.a2.act.roll${i}.bargain`]: flag })
  const lines = [`The failure becomes a basic win, margin 0 (PG p.98).`, `Complication: ${label}${flag.text ? `: ${flag.text}` : ''}.`]
  if (n) {
    const r = await a2Violate(actor, n)
    lines.push(`Feed the Beast: ${a2Plural(n, 'violation', 'violations')} marked on ${a2PathInfo(actor).name}${r?.lost ? `; rank drops to ${r.rank}` : ''} (PG p.98, p.127).`)
  }
  if (boxes) {
    const m = globalThis.V6Alpha2?.masquerade
    const fn = typeof m?.mark === 'function' ? m.mark : typeof m?.add === 'function' ? m.add : null
    if (fn) { await fn.call(m, boxes); lines.push(`Masquerade Tracker +${boxes} (ST p.34).`) } else lines.push(`Mark ${boxes} on the Masquerade Tracker (ST p.34).`)
  }
  const frenzy = o.complication.startsWith('frenzy-') ? o.complication.slice(7) : null
  if (frenzy) lines.push(`${A2X_FRENZY[frenzy].label} risk once the test is won: make a frenzy test (PG p.98, ${A2X_FRENZY[frenzy].page}).`)
  const buttons = frenzy ? `<div class="a2-actions"><button type="button" data-a2x="note-frenzy" data-type="${frenzy}"><i class="fa-solid fa-face-angry"></i> Frenzy test (${frenzy})</button></div>` : ''
  await a2xPostNote(actor, `${actor.name}: Beast's Bargain`, lines, { note: { kind: 'bargain', frenzy, messageId: message.id }, buttons })
  if (a2xCanWrite(message)) await a2xSyncFrenzy(message)
  return flag
}

async function a2xPromptBargain (actor, v, hunger) {
  const mof = Math.abs(a2Int(v.margin))
  const opts = A2X_BARGAIN.map(([k, label, hint], n) => {
    const dis = k === 'frenzy-hunger' && hunger < 3
    return `<label class="a2x-choice" title="${a2Esc(hint)}"><input type="radio" name="complication" value="${k}"${n === 0 ? ' checked' : ''}${dis ? ' disabled' : ''}> ${a2Esc(label)}${dis ? ' (needs 3+ Hunger dice)' : ''}</label>`
  }).join('')
  return foundry.applications.api.DialogV2.prompt({
    window: { title: "Beast's Bargain" },
    content: `<div class="a2x-dialog"><p>Turn this failure into a basic win (margin 0) by letting the Beast in (PG p.98). The Storyteller sets the complication, weighted by the margin of failure (${mof}): a small miss costs a moment of visible menace, a big one an ally's trust or a Masquerade box (ST p.14).</p>
      <div class="a2x-choices">${opts}</div>
      <div class="form-group"><label>What happens</label><input type="text" name="text" placeholder="She slams the table and bares her fangs"></div>
      <div class="form-group"><label><input type="checkbox" name="violate"> Feed the Beast: mark 1 violation on ${a2Esc(a2PathInfo(actor).name)} (Storyteller's call)</label></div>
      <div class="form-group"><label>Masquerade Breach: boxes</label><input type="number" name="masquerade" value="1" min="1" max="10" step="1"></div></div>`,
    ok: {
      label: 'Strike the bargain',
      icon: 'fa-solid fa-handshake',
      callback: (ev, button) => {
        const f = button.form
        return {
          complication: f.querySelector('input[name="complication"]:checked')?.value ?? 'collateral',
          text: String(f.querySelector('[name="text"]')?.value ?? '').trim(),
          violations: f.querySelector('[name="violate"]')?.checked ? 1 : 0,
          masquerade: Math.max(1, a2Int(f.querySelector('[name="masquerade"]')?.value, 1))
        }
      }
    },
    rejectClose: false
  })
}

// ---- 4. frenzy ------------------------------------------------------------------------
async function a2xFrenzyTest (actorLike, opts = {}) {
  if (!a2Enabled()) { ui.notifications.warn('The Alpha 2 rules are off.'); return null }
  const actor = a2xActor(actorLike)
  if (!actor) { ui.notifications.warn('Select a token (or give an actor) for the frenzy test.'); return null }
  if (!a2Rules(actor)?.humanity) { ui.notifications.warn(`${actor.name} has no Beast and doesn't frenzy (${a2Creature(actor) ?? actor.type}).`); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  let o = { type: A2X_FRENZY[opts.type] ? opts.type : 'rage', difficulty: opts.difficulty ?? null, modifier: a2Int(opts.modifier), hunger: opts.hunger !== false, fear: a2Int(opts.fear, 5), rage: opts.rage ?? [], ride: Boolean(opts.ride) }
  if (opts.dialog !== false) {
    o = await a2xPromptFrenzy(actor, o)
    if (!o) return null
  }
  if (o.difficulty === null || o.difficulty === undefined || o.difficulty === '') o.difficulty = a2xFrenzyDifficulty(o.type, { hunger: a2ActorHunger(actor), genMod: a2ActorGenMod(actor), fear: o.fear, rage: o.rage })
  if (o.ride) return a2xRideTheWave(actor, o.type)
  return a2xRollFrenzy(actor, o)
}

function a2xFrenzyPoolFor (actor, modifier = 0) {
  const val = (k) => a2Int(actor.system?.attributes?.[k]?.effective ?? actor.system?.attributes?.[k]?.value)
  const hum = a2ActorHumanity(actor)
  const path = a2PathInfo(actor)
  // Path of Caine teachings include resisting the Beast: its rank modifier
  // applies, before the cap (PG p.130, TR25).
  const teaching = /resist(?:ing)? the beast/i.test(path.teachings ?? '') ? (a2RankBand(hum.rank, path.bands)?.modifier ?? 0) : 0
  const defs = a2xAttrDefs()
  const paths = ['composure', 'resolve'].map((k) => defs[k]?.path ?? `system.attributes.${k}`)
  const impairment = a2xImpairmentPenalty(actor, paths)
  return { ...a2xFrenzyPool({ composure: val('composure'), resolve: val('resolve'), modifier, teachings: teaching, impairment, rank: hum.rank }), composure: val('composure'), resolve: val('resolve'), teaching, impairment, paths, rank: hum.rank, pathName: path.name }
}

async function a2xRollFrenzy (actor, o) {
  if (typeof a2uHint === 'function') a2uHint(actor, { frenzy: o.type }) // eslint-disable-line no-undef
  const info = A2X_FRENZY[o.type]
  const p = a2xFrenzyPoolFor(actor, o.modifier)
  const difficulty = Math.max(0, a2Int(o.difficulty))
  if (difficulty <= 0) {
    // Difficulty 0 isn't rolled: it simply succeeds (TR1).
    await a2xPostNote(actor, `${actor.name}: ${info.label}`, [`Difficulty 0: resisted without a roll (TR1, ${info.page}).`], { note: { kind: 'frenzy' } })
    return { outcome: 'resisted', difficulty, roll: null, message: null }
  }
  const hunger = o.hunger === false ? 0 : a2ActorHunger(actor)
  const notes = [`${info.label}: Difficulty ${difficulty} (${info.page}).`]
  if (p.teaching) notes.push(`${p.pathName} teachings, resisting the Beast: ${a2Signed(p.teaching)} dice before the cap (PG p.130, TR25).`)
  if (p.impairment) notes.push(`Impaired: −${p.impairment} dice (PG p.105).`)
  const testText = `Self-Control (Composure ${p.composure} + Resolve ${p.resolve}${o.modifier ? ` ${a2Signed(o.modifier)}` : ''}) · ${info.label} vs Difficulty ${difficulty}`
  const context = {
    attributes: p.paths, skills: [], disciplines: [], action: null, category: null,
    quickeningSpent: 0, baseDicePool: p.raw, dicePool: p.raw, difficulty, testText,
    a2: {
      v: 2, hunger, hungerAvailable: a2ActorHunger(actor), takeHalf: false, contested: false, opponent: null,
      cap: p.rank, frenzy: true, attr: Math.max(p.composure, p.resolve), notes, oppose: null, vsMessage: null,
      itemUuid: null, creature: a2Creature(actor), npc: Boolean(a2NpcInfo(actor)), trueFaith: 0,
      frenzyTest: { type: o.type, difficulty, label: info.label }
    }
  }
  const Test = a2xState.Test ?? (await import(a2SystemUrl('core/scripts/wod6e-test.js'))).WOD6eTest
  const roll = await Test.executeTest({ actor, context, flavor: testText, createMessage: false })
  let messageMode
  for (const k of ['messageMode', 'rollMode']) {
    try { if (game.settings.settings.has(`core.${k}`)) { messageMode = game.settings.get('core', k); break } } catch (e) { /* not in this version */ }
  }
  const message = await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: testText }, messageMode ? { messageMode } : {})
  if (message) await a2xSyncFrenzy(message)
  return { outcome: a2xFrenzyOutcome(roll.a2Verdict ?? {}), difficulty, roll, message }
}

// Keep the actor's frenzy flag in step with its frenzy test card.
async function a2xSyncFrenzy (message) {
  const i = (message?.rolls ?? []).findIndex((r) => r?.options?.a2?.frenzyTest)
  if (i < 0) return
  const roll = message.rolls[i]
  const actor = a2xSpeaker(message)
  if (!actor?.isOwner) return
  const out = a2xFrenzyOutcome(a2RollVerdict(roll), Boolean(a2xAct(message, i).bargain))
  const cur = a2xFrenzyState(actor)
  if (out === 'resisted' && cur?.messageId === message.id) await actor.update({ 'flags.world.a2.frenzy': null })
  else if (out !== 'resisted' && !cur) await actor.update({ 'flags.world.a2.frenzy': { type: roll.options.a2.frenzyTest.type, rode: false, since: Date.now(), messageId: message.id } })
}

// Ride the Wave (PG p.145): no test, frenzy for the scene, +1 Willpower when it ends.
async function a2xRideTheWave (actorLike, type = 'rage') {
  const actor = a2xActor(actorLike)
  if (!actor) return null
  if (!A2X_FRENZY[type]) type = 'rage'
  const path = a2PathInfo(actor)
  const viol = a2xRideViolation(path.item?.flags?.world?.a2?.violations, type)
  await actor.update({ 'flags.world.a2.frenzy': { type, rode: true, since: Date.now(), messageId: null } })
  const lines = [
    `${actor.name} rides the wave of a ${A2X_FRENZY[type].label.toLowerCase()}: no test; the frenzy lasts for the scene or until it ends (PG p.145).`,
    a2xFrenzyEffects(type),
    'Regain 1 Willpower when the frenzy ends: click "end" on the Humanity tracker (PG p.145).'
  ]
  let res = null
  if (viol) {
    res = await a2Violate(actor, 1)
    lines.push(`${path.name}: "${viol}" 1 violation marked${res?.lost ? `; rank drops to ${res.rank}` : ''} (PG p.130, p.127).`)
  }
  await a2xPostNote(actor, `${actor.name}: Ride the Wave`, lines, { note: { kind: 'ride', frenzy: type } })
  return { type, rode: true, violation: viol ? 1 : 0, rankLost: Boolean(res?.lost) }
}

async function a2xEndFrenzy (actorLike, { reason = '' } = {}) {
  const actor = a2xActor(actorLike)
  const f = a2xFrenzyState(actor)
  if (!f) return null
  const upd = { 'flags.world.a2.frenzy': null }
  const lines = [`The ${A2X_FRENZY[f.type].label.toLowerCase()} ends${reason === 'hunger' ? ': 1 or fewer Hunger dice left (PG p.145)' : ''}.`]
  if (f.rode) {
    const wp = a2Int(actor.system?.willpower?.value)
    const max = a2Int(actor.system?.willpower?.max) - a2Int(actor.system?.willpower?.disabled)
    if (wp < max) { upd['system.willpower.value'] = wp + 1; lines.push('Rode the wave: regain 1 Willpower (PG p.145).') } else lines.push('Rode the wave: Willpower is already full (PG p.145).')
  }
  await actor.update(upd)
  await a2xPostNote(actor, `${actor.name}: frenzy ends`, lines, { note: { kind: 'frenzy-end' } })
  return { type: f.type, willpower: upd['system.willpower.value'] !== undefined ? 1 : 0 }
}

async function a2xPromptFrenzy (actor, o) {
  const hunger = a2ActorHunger(actor)
  const g = a2ActorGenMod(actor)
  const typeOpts = Object.entries(A2X_FRENZY).map(([k, f]) => `<option value="${k}"${k === o.type ? ' selected' : ''}>${f.label}</option>`).join('')
  const fearOpts = A2X_FEAR.map(([d, t]) => `<option value="${d}"${d === o.fear ? ' selected' : ''}>${d}: ${a2Esc(t)}</option>`).join('')
  const rage = A2X_RAGE.map(([k, m, t]) => `<label><input type="checkbox" name="rage" value="${k}"${(o.rage ?? []).includes(k) ? ' checked' : ''}> ${a2Esc(t)} (${a2Signed(m)})</label>`).join('')
  const content = `<div class="a2x-dialog a2x-frenzy">
    <div class="form-group"><label>Frenzy</label><select name="type">${typeOpts}</select></div>
    <div class="form-group" data-show="fear"><label>Exposure</label><select name="fear">${fearOpts}</select></div>
    <fieldset class="a2x-rage" data-show="rage"><legend>Rage modifiers (PG p.146)</legend>${rage}</fieldset>
    <div class="form-group"><label>Difficulty</label><input type="number" name="difficulty" min="0" step="1" value="${o.difficulty ?? ''}"></div>
    <div class="form-group"><label>Extra dice</label><input type="number" name="modifier" step="1" value="${a2Int(o.modifier)}"></div>
    ${hunger > 0 ? `<div class="form-group"><label><input type="checkbox" name="hunger"${o.hunger === false ? '' : ' checked'}> Hunger dice (${hunger})</label></div>` : ''}
    <p class="hint" data-a2x="pool"></p><p class="hint" data-a2x="about"></p></div>`
  const read = (form) => {
    const q = (n) => form.querySelector(`[name="${n}"]`)
    const d = q('difficulty')?.value
    return {
      type: A2X_FRENZY[q('type')?.value] ? q('type').value : 'rage',
      fear: a2Int(q('fear')?.value, 5),
      rage: [...form.querySelectorAll('input[name="rage"]:checked')].map((e) => e.value),
      difficulty: d === '' || d === undefined || d === null ? null : Math.max(0, a2Int(d)),
      modifier: a2Int(q('modifier')?.value),
      hunger: q('hunger') ? Boolean(q('hunger').checked) : false
    }
  }
  const wire = (el) => {
    if (!el) return
    const diff = el.querySelector('[name="difficulty"]')
    if (diff && o.difficulty !== null && o.difficulty !== undefined) diff.dataset.touched = '1'
    const refresh = () => {
      const r = read(el)
      el.querySelectorAll('[data-show]').forEach((s) => { s.style.display = s.dataset.show === r.type ? '' : 'none' })
      if (diff && !diff.dataset.touched) diff.value = String(a2xFrenzyDifficulty(r.type, { hunger, genMod: g, fear: r.fear, rage: r.rage }))
      const p = a2xFrenzyPoolFor(actor, r.modifier)
      const pool = el.querySelector('[data-a2x="pool"]')
      if (pool) pool.textContent = `Self-Control: Composure ${p.composure} + Resolve ${p.resolve}${r.modifier ? ` ${a2Signed(r.modifier)}` : ''}${p.teaching ? ` ${a2Signed(p.teaching)} teachings` : ''}${p.impairment ? ` −${p.impairment} impaired` : ''} = ${p.raw} dice${p.raw > p.rank ? `, capped at rank ${p.rank}` : ''} (PG p.126)${r.hunger && hunger ? `; ${Math.min(hunger, p.dice)} Hunger dice` : ''}.`
      const about = el.querySelector('[data-a2x="about"]')
      if (about) about.textContent = a2xFrenzyEffects(r.type)
    }
    el.addEventListener('change', (ev) => { if (ev.target === diff) diff.dataset.touched = '1'; refresh() })
    refresh()
  }
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: `Frenzy: ${actor.name}` },
    content,
    buttons: [
      { action: 'resist', label: 'Resist (roll)', icon: 'fa-solid fa-dice-d10', default: true, callback: (ev, button) => ({ ...read(button.form), ride: false }) },
      { action: 'ride', label: 'Ride the Wave', icon: 'fa-solid fa-water', callback: (ev, button) => ({ ...read(button.form), ride: true }) },
      { action: 'cancel', label: 'Cancel', icon: 'fa-solid fa-xmark' }
    ],
    render: (ev, dialog) => wire(dialog?.element),
    rejectClose: false
  })
  return r && typeof r === 'object' ? r : null
}

// ---- 5. damage --------------------------------------------------------------------------
function a2xAttackInfo (message, roll) {
  const a2 = roll?.options?.a2
  if (!a2?.built) return null
  const item = a2FromUuid(a2.itemUuid)
  const dmg = item?.system?.activation?.damage
  const kind = a2xAttackKind({ itemType: item?.type ?? null, dealsDamage: Boolean(dmg?.dealsDamage), itemSkills: [...(item?.system?.test?.skills ?? [])], skills: roll.options.skills ?? [], attributes: roll.options.attributes ?? [] })
  if (!kind) return null
  const attacker = a2xSpeaker(message)
  const str = a2Int(attacker?.system?.attributes?.strength?.effective ?? attacker?.system?.attributes?.strength?.value)
  const vars = typeof a2pVars === 'function' ? a2pVars(attacker, item) : null // eslint-disable-line no-undef
  const evaluate = typeof a2pEval === 'function' ? a2pEval : null // eslint-disable-line no-undef
  const parsed = a2xParseDamage(dmg?.dealsDamage ? dmg.formula : '', { strength: str, discipline: item?.system?.disciplineType ?? null, vars, evaluate })
  // A power that adds to an attack (Powerful Strike rolls Strength + Potence, with no Fighting) is a melee attack.
  if (parsed.rider) kind.melee = true
  const mods = a2xAttackMods(attacker, item, kind, parsed, str)
  let base = parsed.rider ? null : parsed.base
  let baseNote = parsed.expr && base !== null && !/^\d+$/.test(parsed.text) ? `${parsed.text} = ${base}${parsed.usesMargin ? ' before the margin' : ''}.` : ''
  if (mods.weapons.length) {
    base = mods.weapons[0].damage
    baseNote = ''
  } else if (base === null && kind.melee) {
    base = attacker?.type === 'npc' ? 2 : a2Half(str)
    baseNote = attacker?.type === 'npc' ? 'NPC unarmed attack: 1 minor, 2 standard, ½ Strength major (ST p.43).' : `Unarmed: ½ Strength (${str}), rounded up (PG p.55).`
  } else if (base === null) {
    base = 0
    baseNote = 'Enter the weapon damage: light 2, medium 3, heavy 4; improvised −1 (PG p.55).'
  }
  return {
    ...kind,
    item,
    attacker,
    base,
    baseNote,
    addMargin: dmg?.dealsDamage ? Boolean(dmg.extraSuccesses) : true,
    baneful: parsed.baneful,
    ignoreEndurance: parsed.ignoreEndurance,
    resource: dmg?.resource === 'willpower' ? 'willpower' : 'health',
    rage: a2xFrenzyState(attacker)?.type === 'rage' && kind.melee ? 1 : 0, // PG p.146
    weapons: mods.weapons,
    riders: [...mods.riders, ...(typeof a2zDamageRiders === 'function' ? a2zDamageRiders() : [])], // eslint-disable-line no-undef
    calc: parsed.rider || mods.weapons.length ? null : parsed.calc,
    formula: parsed.text,
    label: item?.name ?? (kind.kind === 'unarmed' ? 'Unarmed attack' : 'Ranged attack')
  }
}

// What the attacker's own powers and gear add to this attack.
//  weapons: choices for the base damage, best guess first. Offered for unarmed
//    attacks and for powers that ride on an attack (Powerful Strike): unarmed,
//    natural weapons from active powers (Feral Claws), and carried weapons.
//  riders: extra damage on top, each a tick box (Powerful Strike, Might of the Heroes).
function a2xAttackMods (attacker, item, kind, parsed, strength) {
  const out = { weapons: [], riders: [] }
  if (!attacker || !kind) return out
  const groups = typeof a2pList === 'function' ? a2pList(attacker).filter((g) => g.side !== 'target') : [] // eslint-disable-line no-undef
  if (parsed?.rider && parsed.base !== null) out.riders.push({ label: `${item?.name ?? 'Power'}: ${parsed.text}`, amount: parsed.base, baneful: parsed.baneful, own: true })
  if (kind.melee) {
    for (const g of groups) {
      if (item && g.ap?.itemUuid === item.uuid) continue
      for (const r of g.ap?.riders ?? []) out.riders.push({ label: `${g.power}${r.text ? `: ${r.text}` : ''}`, amount: a2Int(r.amount), baneful: Boolean(r.baneful) })
    }
  }
  const pick = kind.kind === 'unarmed' || (kind.melee && parsed?.rider) || (kind.kind === 'power' && kind.melee && parsed?.base === null)
  if (!pick) return out
  const unarmed = attacker.type === 'npc' ? 2 : a2Half(strength)
  const list = [{ label: `Unarmed: ½ Strength (PG p.55)`, damage: unarmed, baneful: false }]
  for (const g of groups) {
    const w = g.ap?.weapon
    if (w && a2Int(w.damage) > 0) list.push({ label: `${g.power} (active)`, damage: a2Int(w.damage), baneful: Boolean(w.baneful), natural: true })
  }
  if (kind.kind !== 'unarmed') {
    for (const i of attacker.items ?? []) {
      const d = i.system?.activation?.damage
      if (i.type !== 'equipment' || !d?.dealsDamage) continue
      const skills = [...(i.system?.test?.skills ?? [])].map(a2xKey)
      if (skills.length && !skills.includes('fighting')) continue
      const p = a2xParseDamage(d.formula, { strength })
      if (p.base !== null) list.push({ label: i.name, damage: p.base, baneful: p.baneful })
    }
  }
  // A natural weapon beats bare hands; a carried weapon is the player's call.
  const natural = list.filter((w) => w.natural).sort((a, b) => b.damage - a.damage)[0]
  out.weapons = natural ? [natural, ...list.filter((w) => w !== natural)] : list
  if (out.weapons.length === 1 && kind.kind === 'unarmed') out.weapons = [] // plain unarmed: the old path already explains it
  return out
}

// [{ actor, name, uuid, ref }] from Tokens, TokenDocuments, Actors or uuids.
function a2xResolveTargets (targets) {
  let list = targets === null || targets === undefined ? null : (Array.isArray(targets) || targets instanceof Set ? [...targets] : [targets])
  if (!list || !list.length) list = [...(game.user?.targets ?? [])]
  if (!list.length) list = [...(globalThis.canvas?.tokens?.controlled ?? [])]
  const out = []
  const seen = new Set()
  for (let t of list) {
    if (typeof t === 'string') t = a2FromUuid(t)
    if (!t) continue
    const actor = t.actor ?? t
    if (!actor || typeof actor.update !== 'function' || !actor.type) continue
    const uuid = t.document?.uuid ?? t.uuid ?? actor.uuid
    if (seen.has(uuid)) continue
    seen.add(uuid)
    out.push({ actor, name: t.name ?? actor.name, uuid, ref: t })
  }
  return out
}

// Targeted tokens; else the linked defence roll's actor, the power's target or
// the selected tokens (never the attacker itself).
function a2xCardTargets (message, roll, attacker) {
  const targeted = [...(game.user?.targets ?? [])]
  if (targeted.length) return { list: targeted, from: 'targeted' }
  const opp = a2FindOpponent(message, roll)
  const oa = opp ? a2xSpeaker(opp.message) : null
  if (oa) return { list: [oa], from: 'the defence roll' }
  const ot = a2FromUuid(roll.options.a2.oppose?.target?.uuid)
  if (ot) return { list: [ot], from: "the power's target" }
  const sel = (globalThis.canvas?.tokens?.controlled ?? []).filter((t) => t.actor && t.actor !== attacker && t.actor.uuid !== attacker?.uuid)
  return { list: sel, from: 'selected' }
}

function a2xDamageOpts (opts = {}) {
  return {
    amount: Math.max(0, a2Int(opts.amount)),
    margin: Math.max(0, a2Int(opts.margin)),
    baneful: Boolean(opts.baneful),
    armour: opts.armour === undefined || opts.armour === null || opts.armour === true ? true : opts.armour === false ? false : Math.max(0, a2Int(opts.armour)),
    piercing: Boolean(opts.piercing),
    ignoreEndurance: Boolean(opts.ignoreEndurance),
    resource: opts.resource === 'willpower' ? 'willpower' : 'health',
    overflow: Boolean(opts.overflow),
    attackerUuid: opts.attackerUuid ?? null,
    bodyAttack: Boolean(opts.bodyAttack),
    reflected: Boolean(opts.reflected),
    source: String(opts.source ?? ''),
    chat: opts.chat !== false,
    messageId: opts.messageId ?? null,
    rollIndex: a2Int(opts.rollIndex, 0),
    requester: opts.requester ?? null
  }
}

// Public: V6Alpha2.actions.applyDamage(targets, { amount, baneful, armour, source, margin, ... })
async function a2xApplyDamage (targets, opts = {}) {
  if (!a2Enabled()) { ui.notifications.warn('The Alpha 2 rules are off.'); return [] }
  const list = a2xResolveTargets(targets)
  if (!list.length) { ui.notifications.warn('No target: target a token (T) or select one.'); return [] }
  const o = a2xDamageOpts(opts)
  if (typeof a2zDamageApplied === 'function') a2zDamageApplied(list.map((t) => t.actor), o) // eslint-disable-line no-undef
  if (!game.user.isGM && !list.every((t) => t.actor.isOwner)) {
    if (!a2xGMActive()) { ui.notifications.warn('Damage to a token you don\'t own needs the GM online.'); return [] }
    a2xRelay('damage', { targets: list.map((t) => t.uuid), opts: o })
    ui.notifications.info(`Damage sent to the GM for ${list.map((t) => t.name).join(', ')}.`)
    return list.map((t) => ({ name: t.name, uuid: t.uuid, relayed: true }))
  }
  const results = []
  for (const t of list) {
    try { results.push(await a2xDamageOne(t, o)) } catch (e) {
      console.error('V6 Alpha 2 | damage', t.name, e)
      results.push({ name: t.name, uuid: t.uuid, amount: 0, taken: 0, line: `${t.name}: damage failed (see console).`, extra: [] })
    }
  }
  if (o.chat) await a2xPostDamage(results, o, list)
  if (o.messageId) await a2xMarkDamage(o, results)
  return results
}

async function a2xDamageOne ({ actor, name, uuid }, o) {
  let total = o.amount + o.margin
  const out = { name, uuid, amount: total, taken: 0, line: '', extra: [] }
  if (!total) return { ...out, line: `${name}: no damage.` }
  if (o.resource === 'willpower') {
    // Willpower damage: armour and Endurance never apply (CG §12).
    const cur = a2Int(actor.system?.willpower?.value)
    const lose = Math.min(cur, total)
    await actor.update({ 'system.willpower.value': cur - lose })
    const extra = cur - lose === 0 ? ['0 Willpower: Social and Mental Attributes impaired (PG p.104).'] : []
    if (o.overflow && total > lose) {
      // What Willpower can't soak goes to Health, with no margin added twice and no armour.
      const rest = await a2xDamageOne({ actor, name, uuid }, { ...o, resource: 'health', amount: total - lose, margin: 0, armour: false, overflow: false })
      extra.push(`Overflow: ${rest.line}`, ...(rest.extra ?? []))
    }
    return { ...out, taken: lose, line: `Applied ${total} Willpower damage to ${name}: Willpower ${cur - lose}.`, extra }
  }
  if (actor.type === 'npc') {
    const cur = a2Int(actor.system?.health?.value)
    const lose = Math.min(cur, total)
    await actor.update({ 'system.health.value': cur - lose })
    return { ...out, taken: lose, line: `Applied ${total} to ${name} (the system's npc type has no Alpha 2 Health): Health ${cur - lose}.` }
  }
  const rules = a2Rules(actor)
  if (actor.type !== 'vampire' || !rules) return { ...out, line: `${name}: no Health track to damage.` }
  // Blood Aegis: ranged damage comes off the barrier first (alpha2-track)
  let aegis = null
  try { aegis = typeof a2rAegis === 'function' ? await a2rAegis(actor, total, o) : null } catch (e) { console.error('V6 Automation | Blood Aegis', e) } // eslint-disable-line no-undef
  if (aegis) {
    total -= aegis.absorbed
    if (total <= 0) return { ...out, line: `${name}: ${aegis.note}. No damage gets through.` }
  }
  const g = rules.endurance ? a2ActorGenMod(actor) : 0
  const rating = o.armour === false ? 0 : o.armour === true ? a2xArmourRating(actor) : o.armour
  const plan = a2xArmourPlan({ amount: total, baneful: o.baneful, rating, piercing: o.piercing, endurance: Boolean(rules.endurance), genMod: g, toughSkin: Boolean(rules.endurance) && a2xToughSkin(actor), ignoreEndurance: o.ignoreEndurance })
  const damage = typeof globalThis.V6Alpha2?.damage === 'function' ? globalThis.V6Alpha2.damage : a2DamageActor
  const res = await damage(actor, plan.send, { baneful: o.baneful, note: false })
  if (!res) return { ...out, line: `${name}: no damage applied.` }
  const parts = []
  const cut = total - res.taken
  if (o.baneful) parts.push(rules.baneful ? 'baneful' : 'fire and sunlight are normal damage for mortals and ghouls, PG p.100')
  else if (plan.ignored) parts.push('ignores Vampiric Endurance')
  else if (rules.endurance && cut > 0) parts.push(`Endurance −${cut}${plan.raise ? `, with ${plan.raisedBy} +1` : ''}`)
  else if (plan.armour && cut > 0) parts.push(`armour −${cut}`)
  if (!o.baneful && rating && o.piercing) parts.push('armour-piercing')
  const track = `Health ${res.value}/${res.max - res.baneful}${res.baneful ? `, ${res.baneful} baneful` : ''}`
  const extra = []
  if (aegis) extra.push(`${name}: ${aegis.note}.`)
  if (res.toBaneful) extra.push(`${name}: ${res.toBaneful} damage past an empty track became baneful (PG p.100).`)
  if (res.vitaeLoss) extra.push(`${name}: ${res.vitaeLoss} damage past a fully baneful track${rules.vitae ? ' came off Vitae' : ''} (PG p.100).`)
  if (res.massive) extra.push(`${name}: massive damage, twice the maximum Health in one blow: Final Death in almost all cases (PG p.101).`)
  for (const l of a2ZeroHealthLines(actor, res)) extra.push(`${name}: ${l}`)
  // every box baneful with Vitae left is torpor (PG p.100): mark it, so the token shows it and New Night knows
  if (a2Creature(actor) === 'vampire' && res.max > 0 && res.baneful >= res.max && a2Int(actor.system?.health?.value) > 0 && !actor.flags?.world?.a2?.torpor) {
    let night = 1
    try { night = a2Int(a2tClock().night, 1) } catch (e) { /* no clock */ } // eslint-disable-line no-undef
    try { await actor.update({ 'flags.world.a2.torpor': { reason: 'baneful', since: night } }) } catch (e) { console.error('V6 Automation | torpor', e) }
  }
  // Retributive Hide and the like: a creature that hit with its own body takes
  // half the damage that got through (PG, Fortitude). Never bounces twice.
  if (res.taken > 0 && o.bodyAttack && o.attackerUuid && !o.reflected && typeof a2pList === 'function') { // eslint-disable-line no-undef
    const hide = a2pList(actor).find((g) => g.side !== 'target' && g.ap?.reflect) // eslint-disable-line no-undef
    const attacker = hide ? a2FromUuid(o.attackerUuid) : null
    if (attacker && attacker.uuid !== actor.uuid) {
      const back = hide.ap.reflect === 'full' ? res.taken : a2Half(res.taken)
      const r = await a2xDamageOne({ actor: attacker, name: attacker.name, uuid: attacker.uuid }, { ...o, amount: back, margin: 0, armour: false, baneful: false, ignoreEndurance: false, resource: 'health', reflected: true })
      extra.push(`${hide.power}: ${r.line}`, ...(r.extra ?? []))
    }
  }
  return { ...out, taken: res.taken, health: { value: res.value, baneful: res.baneful, max: res.max }, line: `Applied ${total} → ${res.taken} to ${name}${parts.length ? ` (${parts.join(', ')})` : ''}: ${track}.`, extra }
}

async function a2xPostDamage (results, o, list) {
  const src = o.messageId ? game.messages?.get(o.messageId) : null
  const ids = new Set(game.users.filter((u) => u.isGM).map((u) => u.id))
  ids.add(game.user.id)
  if (o.requester) ids.add(o.requester)
  if (src?.author?.id) ids.add(src.author.id)
  for (const t of list) for (const u of game.users) { try { if (t.actor.testUserPermission?.(u, 'OWNER')) ids.add(u.id) } catch (e) { /* ignore */ } }
  const lines = results.flatMap((r) => [r.line, ...(r.extra ?? [])]).filter(Boolean)
  return ChatMessage.create({
    speaker: src?.speaker ?? ChatMessage.getSpeaker(),
    whisper: [...ids],
    content: `<div class="wod6e chat-card a2-note a2x-note"><h4 class="chat-card-name">${a2Esc(o.source ? `Damage: ${o.source}` : 'Damage')}</h4><ul>${lines.map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul></div>`,
    flags: { world: { a2: { note: { kind: 'damage', messageId: o.messageId } } } }
  })
}

async function a2xMarkDamage (o, results) {
  const m = game.messages?.get(o.messageId)
  if (!m) return
  const prev = a2xAct(m, o.rollIndex).damage ?? []
  const text = results.filter((r) => !r.relayed).map((r) => `${r.name} ${r.amount} → ${r.taken}`).join(', ')
  if (!text) return
  await a2xWriteMessage(m, { [`flags.world.a2.act.roll${o.rollIndex}.damage`]: [...prev, { at: Date.now(), user: game.user.id, text }] })
}

// The damage dialog for a card (or, without one, for a macro).
async function a2xDamageDialog ({ title = 'Apply damage', source = '', formula = '', base = 0, baseNote = '', margin = 0, marginNote = '', addMargin = true, rage = 0, baneful = false, ignoreEndurance = false, willpower = false, targets = [], from = '', weapons = [], riders = [], calc = null } = {}) {
  const names = targets.map((t) => {
    const rules = a2Rules(t.actor)
    const rating = a2xArmourRating(t.actor)
    const tag = t.actor.type !== 'vampire' ? '' : rules?.endurance ? ` (Endurance ${a2ActorGenMod(t.actor)}${rating ? ', armour' : ''})` : rating ? ` (armour ${rating})` : ''
    return `${a2Esc(t.name)}${a2Esc(tag)}`
  }).join(', ')
  const cb = (n, on, label) => `<div class="form-group a2x-check"><label><input type="checkbox" name="${n}"${on ? ' checked' : ''}> ${label}</label></div>`
  const content = `<div class="a2x-dialog a2x-damage">
    ${source ? `<p><strong>${a2Esc(source)}</strong>${formula ? `: ${a2Esc(formula)}` : ''}</p>` : ''}
    <p>Targets${from ? ` (${a2Esc(from)})` : ''}: ${names}</p>
    ${weapons.length ? `<div class="form-group"><label>Weapon</label><select name="weapon">${weapons.map((w, i) => `<option value="${i}">${a2Esc(w.label)}: ${a2Int(w.damage)}${w.baneful ? ' baneful' : ''}</option>`).join('')}</select></div>` : ''}
    <div class="form-group"><label>Damage</label><input type="number" name="base" value="${a2Int(calc ? calc(margin) : base)}" min="0" step="1"></div>
    ${baseNote ? `<p class="hint">${a2Esc(baseNote)}</p>` : ''}
    <div class="form-group"><label>Margin</label><input type="number" name="margin" value="${a2Int(margin)}" min="0" step="1"></div>
    ${marginNote ? `<p class="hint">${a2Esc(marginNote)}</p>` : ''}
    ${calc ? '<p class="hint">The formula already counts the margin: change the margin and the damage follows.</p>' : cb('addMargin', addMargin, 'Add the margin of success (PG p.116)')}
    ${riders.map((r, i) => cb(`rider${i}`, true, `${a2Esc(r.label)}: +${a2Int(r.amount)}${r.baneful ? ' baneful' : ''}`)).join('')}
    ${cb('calledShot', false, 'Called shot: no margin added; the margin sets the injury (PG p.117)')}
    ${rage ? cb('rage', true, 'Rage frenzy: +1 melee damage (PG p.146)') : ''}
    ${cb('baneful', baneful, 'Baneful (fire, sunlight, True Faith): no Endurance or armour (PG p.100)')}
    ${cb('armour', true, 'Armour (house rule: its rating for mortals and ghouls, +1 Endurance for vampires; minimum 1)')}
    ${cb('piercing', false, 'Armour-piercing: ignores 1 point of armour')}
    ${cb('ignoreEndurance', ignoreEndurance, 'Ignores Vampiric Endurance')}
    ${cb('willpower', willpower, 'Willpower damage instead of Health')}
    <p class="hint" data-a2x="total"></p></div>`
  const read = (form) => {
    const q = (n) => form.querySelector(`[name="${n}"]`)
    const c = (n) => Boolean(q(n)?.checked)
    const extra = riders.reduce((t, r, i) => t + (c(`rider${i}`) ? a2Int(r.amount) : 0), 0)
    return { weapon: q('weapon') ? a2Int(q('weapon').value) : null, base: Math.max(0, a2Int(q('base')?.value)), margin: Math.max(0, a2Int(q('margin')?.value)), addMargin: calc ? false : c('addMargin'), calledShot: c('calledShot'), rage: (c('rage') ? 1 : 0) + extra, baneful: c('baneful'), armour: c('armour'), piercing: c('piercing'), ignoreEndurance: c('ignoreEndurance'), willpower: c('willpower') }
  }
  return foundry.applications.api.DialogV2.prompt({
    window: { title },
    content,
    ok: { label: 'Apply', icon: 'fa-solid fa-burst', callback: (ev, button) => read(button.form) },
    render: (ev, dialog) => {
      const el = dialog?.element
      if (!el) return
      const refresh = () => {
        const r = read(el)
        const out = el.querySelector('[data-a2x="total"]')
        if (out) out.textContent = `Incoming damage: ${a2xDamageTotal({ base: r.base, margin: r.margin, addMargin: r.addMargin, calledShot: r.calledShot, bonus: r.rage })}, before Endurance and armour.`
        const arm = el.querySelector('[name="armour"]')
        if (arm && !arm.dataset.a2xSet) { arm.dataset.a2xSet = '1'; arm.checked = targets.some((t) => a2xArmourRating(t.actor) > 0 || a2xToughSkin(t.actor)) }
      }
      // The weapon choice and a margin-driven formula fill the Damage box until it is typed in.
      let typed = false
      el.querySelector('[name="base"]')?.addEventListener('input', () => { typed = true })
      el.querySelector('[name="weapon"]')?.addEventListener('change', (ev) => {
        const w = weapons[a2Int(ev.target.value)]
        if (!w) return
        el.querySelector('[name="base"]').value = a2Int(w.damage)
        const b = el.querySelector('[name="baneful"]')
        if (b) b.checked = Boolean(w.baneful) || riders.some((r) => r.baneful)
        typed = false
      })
      if (calc) {
        el.querySelector('[name="margin"]')?.addEventListener('input', (ev) => {
          if (typed) return
          el.querySelector('[name="base"]').value = calc(Math.max(0, a2Int(ev.target.value)))
        })
      }
      el.addEventListener('change', refresh)
      el.addEventListener('input', refresh)
      refresh()
    },
    rejectClose: false
  })
}

async function a2xPromptCardDamage (message, i) {
  const roll = message?.rolls?.[i]
  const info = a2xAttackInfo(message, roll)
  if (!info) return null
  const act = a2xAct(message, i)
  const { v } = a2xVerdict(message, roll)
  if (v.win === false && !act.bargain) { ui.notifications.info('The attack failed: no damage (PG p.116).'); return null }
  const margin = act.bargain ? 0 : v.win === true ? Math.max(0, a2Int(v.margin)) : a2Int(v.successes)
  const marginNote = act.bargain ? "Beast's Bargain: a basic win has no margin (PG p.19)." : v.win === true ? '' : 'No defence roll is linked, so the margin is all your successes. If the target defended, use Compare first (PG p.116, p.120).'
  const tg = a2xCardTargets(message, roll, info.attacker)
  const targets = a2xResolveTargets(tg.list)
  if (!targets.length) { ui.notifications.warn('Target a token (T), or select one, to apply the damage to.'); return null }
  const r = await a2xDamageDialog({ title: `Apply damage: ${info.label}`, source: info.label, formula: info.formula, base: info.base, baseNote: info.baseNote, margin, marginNote, addMargin: info.riders.some((x) => x.own) ? true : info.addMargin, rage: info.rage, baneful: info.baneful || Boolean(info.weapons[0]?.baneful), ignoreEndurance: info.ignoreEndurance, willpower: info.resource === 'willpower', targets, from: tg.from, weapons: info.weapons, riders: info.riders, calc: info.calc })
  if (!r) return null
  return a2xApplyDamage(targets.map((t) => t.ref), {
    amount: r.base + r.rage,
    margin: r.addMargin && !r.calledShot ? r.margin : 0,
    baneful: r.baneful,
    armour: r.armour,
    piercing: r.piercing,
    ignoreEndurance: r.ignoreEndurance,
    resource: r.willpower ? 'willpower' : 'health',
    source: info.label,
    attackerUuid: info.attacker?.uuid ?? null,
    // fists, claws and other natural weapons are part of the attacker
    bodyAttack: info.kind === 'unarmed' || (r.weapon !== null && Boolean(info.weapons[r.weapon]) && (r.weapon === info.weapons.findIndex((w) => /^Unarmed/.test(w.label)) || Boolean(info.weapons[r.weapon].natural))),
    messageId: message.id,
    rollIndex: i
  })
}

// Macro: damage the targeted (or selected) tokens without a card.
async function a2xPromptDamage (targets = null, defaults = {}) {
  const list = a2xResolveTargets(targets)
  if (!list.length) { ui.notifications.warn('Target a token (T), or select one, to apply the damage to.'); return null }
  const r = await a2xDamageDialog({ base: a2Int(defaults.amount, 1), margin: 0, addMargin: false, baneful: Boolean(defaults.baneful), targets: list, from: game.user?.targets?.size ? 'targeted' : 'selected', source: defaults.source ?? '' })
  if (!r) return null
  return a2xApplyDamage(list.map((t) => t.ref), { amount: r.base + r.rage, margin: r.addMargin && !r.calledShot ? r.margin : 0, baneful: r.baneful, armour: r.armour, piercing: r.piercing, ignoreEndurance: r.ignoreEndurance, resource: r.willpower ? 'willpower' : 'health', source: defaults.source ?? '' })
}

// ---- sheets ------------------------------------------------------------------------------
function a2xRenderSheet (app, element) {
  if (!a2Enabled()) return
  const actor = app?.actor ?? app?.document
  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app?.element)
  if (!actor || !root || actor.type !== 'vampire') return
  const editable = Boolean(app?.isEditable ?? actor.isOwner)
  const run = () => {
    try { a2xDecorateAttributes(root, actor, editable); a2xDecorateFrenzy(root, actor, editable) } catch (e) { console.error('V6 Alpha 2 | actions sheet', actor.name, e) }
  }
  if (root.querySelector('.a2-humanity') || !root.querySelector('[data-actor-section="humanityScale"]')) run()
  else queueMicrotask(run)
}

function a2xDecorateAttributes (root, actor, editable) {
  const sec = root.querySelector('[data-actor-section="attributes"]')
  if (!sec) return
  sec.querySelectorAll('.a2x-imp, .a2x-imp-note').forEach((e) => e.remove())
  const st = a2xImpairment(actor)
  sec.querySelectorAll('.attribute-field[data-attribute]').forEach((label) => {
    const key = label.dataset.attribute
    const manual = st.manual.has(key)
    const auto = st.auto.get(key)
    const box = document.createElement('a')
    box.className = `a2x-imp${manual ? ' on' : ''}${auto ? ' auto' : ''}`
    box.dataset.key = key
    box.title = manual
      ? `Impaired: −2 dice to pools using it (PG p.105).${editable ? ' Click: clear. Shift-click: an action and 2 Vitae end it now (PG p.105).' : ''}`
      : auto
        ? `Impaired by ${auto} until the track is above 0 (PG p.101, p.104).${editable ? ' Click to mark it as well.' : ''}`
        : `Not impaired.${editable ? ' Click (or right-click the Attribute): mark it impaired, −2 dice to pools using it (PG p.105).' : ''}`
    label.append(box)
    if (!editable) return
    a2On(box, 'click', (ev) => {
      if (ev.shiftKey && manual) a2xRecoverImpairment(actor, key, { vitae: true })
      else a2xSetImpaired(actor, key, !manual)
    })
    const name = label.querySelector('.attribute-label')
    if (name) a2On(name, 'contextmenu', () => a2xSetImpaired(actor, key, !manual))
  })
  if (!st.all.size) return
  const note = document.createElement('div')
  note.className = 'a2-subnote a2x-imp-note'
  const parts = [...st.all].map((k) => `${a2TraitLabel('Attributes', k)}${st.auto.has(k) ? ` (${st.auto.get(k)})` : ''}`)
  note.textContent = `Impaired: ${parts.join(', ')}. −2 dice for each one in a pool (PG p.105).`
  sec.append(note)
}

function a2xDecorateFrenzy (root, actor, editable) {
  const hum = root.querySelector('.a2-humanity')
  if (!hum || hum.classList.contains('a2-na') || !a2Rules(actor)?.humanity) return
  hum.querySelectorAll('.a2x-frenzy-tools').forEach((e) => e.remove())
  const header = hum.querySelector('.resource-tracker-header') ?? hum
  const f = a2xFrenzyState(actor)
  const span = document.createElement('span')
  span.className = 'a2x-frenzy-tools'
  span.innerHTML = (f ? `<span class="a2x-frenzy-chip" title="${a2Esc(a2xFrenzyEffects(f.type))}">In ${a2Esc(A2X_FRENZY[f.type].label.toLowerCase())}${f.rode ? ' (riding the wave)' : ''}${editable ? ' <a data-a2x="end-frenzy" title="End the frenzy">end</a>' : ''}</span>` : '') +
    (editable ? '<a class="a2x-act" data-a2x="frenzy-test" title="Frenzy test: resist or ride the wave (PG p.144-147)"><i class="fa-solid fa-face-angry"></i></a>' : '')
  header.append(span)
  a2On(span.querySelector('[data-a2x="end-frenzy"]'), 'click', () => a2xEndFrenzy(actor))
  a2On(span.querySelector('[data-a2x="frenzy-test"]'), 'click', () => a2xFrenzyTest(actor))
}

// A hunger frenzy ends at 1 or fewer Hunger dice (PG p.145).
function a2xOnUpdateActor (actor, changes, options, userId) {
  if (!a2Enabled() || game.user.id !== userId) return
  const f = a2xFrenzyState(actor)
  if (f?.type === 'hunger' && foundry.utils.hasProperty(changes ?? {}, 'system.health') && a2ActorHunger(actor) <= 1) a2xEndFrenzy(actor, { reason: 'hunger' })
}

// ---- styles, hooks and boot ------------------------------------------------------------
function a2xInjectStyles () {
  document.getElementById('v6a-alpha2-actions-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-alpha2-actions-style'
  style.textContent = `
.chat-message .a2x-actions { flex-wrap: wrap; }
.chat-message .a2x-actions button { flex: 1 1 45%; }
.chat-message .a2-result.a2x-bargained { border-left-color: #6a1b9a; }
.chat-message .a2-notes li.a2x-line { font-style: italic; }
.chat-message .a2x-note .a2-actions button { flex: 1; line-height: 22px; font-size: 12px; }
.a2x-dialog .a2x-picks { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; }
.a2x-dialog .a2x-pick { display: inline-flex; align-items: center; gap: 2px; }
.a2x-dialog .a2-die { min-width: 22px; height: 22px; line-height: 20px; text-align: center; border: 1px solid #555; border-radius: 3px; font-weight: bold; background: #f2f2f2; color: #222; }
.a2x-dialog .a2-die.a2-succ { background: #d5ead6; }
.a2x-dialog .a2-die.a2-crit { box-shadow: inset 0 0 0 2px #c9a400; }
.a2x-dialog .a2-die.a2-h { background: #7a0000; color: #fff; opacity: 0.7; }
.a2x-dialog .a2x-choices { display: flex; flex-direction: column; gap: 2px; margin: 6px 0; }
.a2x-dialog .a2x-rage { display: flex; flex-direction: column; gap: 1px; font-size: 12px; }
.a2x-dialog .a2x-check label { flex: 1; }
.a2x-dialog .hint { font-size: 12px; opacity: 0.85; margin: 2px 0 6px; }
.actor.sheet .attribute-field .a2x-imp { display: inline-block; width: 11px; height: 11px; margin-left: 4px; border: 1px solid currentColor; border-radius: 2px; cursor: pointer; vertical-align: middle; opacity: 0.55; flex: 0 0 auto; }
.actor.sheet .attribute-field .a2x-imp.on { background: #b31b1b; border-color: #b31b1b; opacity: 1; }
.actor.sheet .attribute-field .a2x-imp.auto { background: repeating-linear-gradient(45deg, #b31b1b 0 2px, transparent 2px 4px); opacity: 1; }
.actor.sheet .attribute-field .a2x-imp.on.auto { background: #b31b1b; }
.actor.sheet .a2x-imp-note { padding: 4px 16px 0; }
.actor.sheet .a2x-frenzy-tools { display: inline-flex; gap: 8px; align-items: center; margin-left: 8px; font-size: 13px; text-transform: none; font-weight: normal; }
.actor.sheet .a2x-frenzy-chip { padding: 0 6px; border-radius: 3px; background: #7a0000; color: #fff; }
.actor.sheet .a2x-frenzy-chip a { color: #fff; text-decoration: underline; cursor: pointer; }
.actor.sheet .a2x-act { cursor: pointer; }
`
  document.head.append(style)
}

function a2xHooks (api) {
  if (api.hooked) return
  Hooks.on('renderChatMessageHTML', a2xRenderChat)
  Hooks.on('renderActorSheetV2', a2xRenderSheet)
  Hooks.on('updateChatMessage', a2xOnUpdateMessage)
  Hooks.on('updateActor', a2xOnUpdateActor)
  document.addEventListener('pointerdown', a2xTrackMods, true)
  document.addEventListener('click', a2xTrackMods, true)
  for (const ch of A2X_SOCKETS) { try { game.socket?.on?.(ch, a2xOnSocket) } catch (e) { console.warn('V6 Alpha 2 | socket', ch, e) } }
  api.hooked = true
}

async function a2ActionsBoot () {
  globalThis.V6Alpha2 ??= {}
  const root = globalThis.V6Alpha2
  root.actions ??= {}
  const api = root.actions
  if (api.booted) return true
  if (a2xState.booting) return a2xState.booting
  a2xState.booting = (async () => {
    a2xInjectStyles()
    const [{ WOD6eTest }, { RollDialog }] = await Promise.all([
      import(a2SystemUrl('core/scripts/wod6e-test.js')),
      a2State.RollDialog ? { RollDialog: a2State.RollDialog } : import(a2SystemUrl('core/dialogs/roll-dialog.js'))
    ])
    a2xState.Test = WOD6eTest
    a2xState.RD = RollDialog
    if (!Object.prototype.hasOwnProperty.call(RollDialog, '__a2')) console.warn('V6 Alpha 2 | actions booted before the core roll-dialog patch; impairment marks may be overwritten')
    a2xPatchRollDialog(RollDialog)
    a2xHooks(api)
    Object.assign(api, {
      rerollWillpower: a2xRerollWillpower,
      beastsBargain: a2xBeastsBargain,
      frenzyTest: a2xFrenzyTest,
      rideTheWave: a2xRideTheWave,
      endFrenzy: a2xEndFrenzy,
      frenzy: a2xFrenzyState,
      applyDamage: a2xApplyDamage,
      promptDamage: a2xPromptDamage,
      attackInfo: (message, rollIndex = null) => { const m = a2xMessage(message); return a2xAttackInfo(m, m?.rolls?.[rollIndex ?? a2xFirstA2Roll(m)]) },
      armour: a2xArmourRating,
      setImpaired: a2xSetImpaired,
      impair: a2xImpair,
      recoverImpairment: a2xRecoverImpairment,
      nightlyRecovery: a2xNightlyRecovery,
      impaired: (actor) => { const s = a2xImpairment(a2xActor(actor)); return { manual: [...s.manual], auto: Object.fromEntries(s.auto), all: [...s.all] } },
      impairmentPenalty: a2xImpairmentPenalty,
      costs: (item) => a2xItemCosts(item?.system, item?.flags),
      canActivate: (item, actor = null, { override = false } = {}) => a2xActivationGuard(item, actor ?? item?.actor, { override }),
      rules: { itemCosts: a2xItemCosts, costShortfall: a2xCostShortfall, applyReroll: a2xApplyReroll, rerollCheck: a2xRerollCheck, bargainCheck: a2xBargainCheck, frenzyDifficulty: a2xFrenzyDifficulty, frenzyPool: a2xFrenzyPool, rideViolation: a2xRideViolation, parseDamage: a2xParseDamage, formulaExpr: a2xFormulaExpr, recoveryDue: a2xRecoveryDue, attackKind: a2xAttackKind, damageTotal: a2xDamageTotal, armourPlan: a2xArmourPlan, armourFromText: a2xArmourFromText, cascade: a2xCascadeTarget }
    })
    api.booted = true
    console.log('V6 Automation | Alpha 2 actions loaded')
    return true
  })()
  try {
    return await a2xState.booting
  } catch (e) {
    a2xState.booting = null
    console.error('V6 Automation | Alpha 2 actions failed to load', e)
    return false
  }
}

// ---------------------------------------------------------------------------
// Alpha 2.0 table tools for V6 Automation (alpha2-tools.js). build_automation.py
// appends this file after alpha2-core.js, so it shares that scope and uses its
// a2* helpers (a2Int, a2Creature, a2ActorHunger, a2Note, a2Violate, a2State...).
// a2Boot() calls a2ToolsBoot(). Everything here is prefixed a2t / A2T_.
//
//  - New Night (GM): daysleep and rising for vampires, ghouls and mortals
//    (PG p.99-104, p.140, p.147), ends Blood Surges and one-scene / one-night
//    conditions, resets per-scene and per-night uses, posts one GM card and
//    fires the hooks 'v6a2EndScene' and 'v6a2NewNight'.
//  - End Scene (GM): ends Blood Surges and one-scene effects, 'v6a2EndScene'.
//  - Feeding helper: hunting approaches and Herd (PG p.141-144, ST p.21), feed
//    attacks (PG p.102, p.118), Vitae gained, violations (PG p.144; TR30,
//    TR31), Willpower for a kill (PG p.104).
//  - Blood Surge: the sheet button follows Alpha 2 (PG p.137, p.114, p.22;
//    decisions-a2 TR41, TR42, D7).
//  - Masquerade Tracker (ST p.33-37): world setting, GM window, threat test.
//  - End-of-session XP award (PG p.64) and the XP spend helper (PG p.64-65).
// Page numbers: PG = Alpha 2.0 Player Guide, ST = Alpha 2.0 Storyteller Packet.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry, ChatMessage, CONFIG, canvas, WOD6E, Roll */

const A2T_MODULE = 'v6-automation'
const A2T_LOG_MAX = 60
const a2tState = { MasqApp: null, masqApp: null, socket: null, surgeWraps: new Map() }

// ---- tiers (pure) -----------------------------------------------------------
// Creatures of the Night (PG p.22) and Tiers of Play (PG p.114). null = no cap.
// Duskborn: Discipline maximum 3, Blood Surge not capped (PG p.22; TR41, TR42).
// Methuselah row is ours (decisions-a2 D7, D39, TR41): dots 10, Surge +8.
// Ghouls: Discipline maximum 3 (D8); mortals and ghouls: dots 5 (D6).
const A2T_TIERS = {
  duskborn: { label: 'Duskborn', maxDots: 5, maxDiscipline: 3, surgeAttr: null, surgeDisc: null },
  neonate: { label: 'Neonate', maxDots: 5, maxDiscipline: 5, surgeAttr: 2, surgeDisc: 5 },
  ancilla: { label: 'Ancilla', maxDots: 7, maxDiscipline: 7, surgeAttr: 4, surgeDisc: 7 },
  elder: { label: 'Elder', maxDots: 8, maxDiscipline: 8, surgeAttr: 6, surgeDisc: 8 },
  methuselah: { label: 'Methuselah (house)', maxDots: 10, maxDiscipline: 10, surgeAttr: 8, surgeDisc: 10 },
  ghoul: { label: 'Ghoul', maxDots: 5, maxDiscipline: 3, surgeAttr: 0, surgeDisc: 0 },
  mortal: { label: 'Mortal', maxDots: 5, maxDiscipline: 0, surgeAttr: 0, surgeDisc: 0 }
}

// Generation categories, PG p.28: 14-16 Duskborn, 11-13 neonate, 9-10 ancilla,
// 6-8 elder, 4-5 Methuselah.
function a2tTierKey (creature, generation) {
  if (creature === 'ghoul') return 'ghoul'
  if (creature !== 'vampire') return 'mortal'
  const g = a2Int(generation, 13)
  if (g >= 14) return 'duskborn'
  if (g >= 11) return 'neonate'
  if (g >= 9) return 'ancilla'
  if (g >= 6) return 'elder'
  return 'methuselah'
}
function a2tTier (creature, generation) {
  const key = a2tTierKey(creature, generation)
  return { key, ...A2T_TIERS[key] }
}

// ---- Blood Surge (pure) -----------------------------------------------------
// PG p.137: an Attribute gains 1 dot per Vitae, a Discipline 1 dot per 2 Vitae
// and needs at least 1 dot. The total Attribute increase is capped by tier
// (PG p.114: +2 / +4 / +6, Methuselah +8 by D7); a surged Discipline can't go
// above the tier's Discipline maximum (PG p.22, TR41). cap null = no cap.
function a2tSurgeCheck ({ kind = 'attribute', base = 0, effective = 0, existing = 0, vitae = 0, available = 0, cap = 2 } = {}) {
  const v = Number(vitae)
  if (!Number.isInteger(v) || v < 1) return { ok: false, reason: 'Spend at least 1 Vitae.' }
  if (v > a2Int(available)) return { ok: false, reason: `Only ${a2Int(available)} Vitae left.` }
  if (kind === 'discipline') {
    if (a2Int(base) < 1) return { ok: false, reason: 'You need at least 1 dot in a Discipline to Blood Surge it (PG p.137).' }
    if (v % 2) return { ok: false, reason: 'A Discipline costs 2 Vitae per dot (PG p.137).' }
    const bonus = v / 2
    if (cap !== null && cap !== undefined && a2Int(effective) + bonus > cap) return { ok: false, reason: `A surged Discipline can't go above ${cap} dots at this tier (PG p.22, p.137).` }
    return { ok: true, bonus }
  }
  if (cap !== null && cap !== undefined && a2Int(existing) + v > cap) {
    return { ok: false, reason: `Blood Surge can raise an Attribute by at most +${cap} in total at this tier (PG p.114)${a2Int(existing) ? `; +${a2Int(existing)} is already active` : ''}.` }
  }
  return { ok: true, bonus: v }
}

// ---- hunting and feeding (pure) ---------------------------------------------
// Hunting approaches and their example tests, PG p.142.
const A2T_APPROACHES = {
  alleycat: {
    label: 'Alleycat',
    hint: 'Hunt in dark alleys with strength, fear or stealth (PG p.142).',
    tests: [['dexterity', 'subterfuge', 'stalk and ambush your prey'], ['strength', 'fighting', 'overpower your prey with violence'], ['strength', 'persuasion', 'intimidate your prey into submission']]
  },
  bagger: {
    label: 'Bagger',
    hint: 'Blood bags through subterfuge or contacts: extra bags equal to your margin (PG p.142).',
    tests: [['charisma', 'subterfuge', 'get bags from a fencer'], ['manipulation', 'subterfuge', 'pose as a medical worker and steal bags'], ['wits', 'sabotage', 'break into a blood bank']]
  },
  consensualist: {
    label: 'Consensualist',
    hint: 'Never against the victim\'s will; telling the truth puts the Masquerade at risk (PG p.142).',
    tests: [['manipulation', 'persuasion', 'a "real vampire community" act'], ['manipulation', 'subterfuge', 'pose as a medical worker collecting blood'], ['charisma', 'persuasion', 'tell the truth and reassure them']]
  },
  siren: {
    label: 'Siren',
    hint: 'Feed on admirers you seduce or win over (PG p.142).',
    tests: [['charisma', 'persuasion', 'charm someone into following you'], ['manipulation', 'awareness', 'spot who in a crowd is drawn to you'], ['wits', 'persuasion', 'say the right thing to win trust']]
  },
  reaper: {
    label: 'Reaper',
    hint: 'Feed on the sleeping and the bedridden (PG p.142).',
    tests: [['manipulation', 'subterfuge', 'pose as night staff, feed on sleeping patients'], ['wits', 'awareness', 'find a severely sick or dying person'], ['wits', 'subterfuge', 'break into a hospice']]
  },
  other: { label: 'Other (the Storyteller picks the test)', hint: 'Describe your approach; the Storyteller picks Attribute + Skill (PG p.142).', tests: [] }
}

// Hunting Circumstances, ST p.21. Difficulty 2 plus or minus these.
const A2T_HUNT_CIRCUMSTANCES = [
  { key: 'lightlyGuarded', label: 'Lightly guarded', mod: 1 },
  { key: 'heavilyGuarded', label: 'Heavily guarded', mod: 2 },
  { key: 'darkness', label: 'Darkness', mod: -1 },
  { key: 'loud', label: 'Loud noises', mod: -1 },
  { key: 'crowded', label: 'Crowded', mod: 1 },
  { key: 'tooCrowded', label: 'Too crowded', mod: -1 },
  { key: 'illumination', label: 'Illumination', mod: 1 },
  { key: 'distractions', label: 'Distractions', mod: -1 }
]
function a2tHuntDifficulty (keys = [], extra = 0) {
  const sum = A2T_HUNT_CIRCUMSTANCES.filter((c) => keys.includes(c.key)).reduce((t, c) => t + c.mod, 0)
  return Math.max(0, 2 + sum + a2Int(extra))
}

// Animal Vitae, PG p.143.
const A2T_ANIMALS = {
  tiny: { label: 'Tiny (bat, rat, small bird)', vitae: 1 },
  small: { label: 'Small (cat, large bird, small dog)', vitae: 2 },
  medium: { label: 'Medium (goat, large cat, large dog, pony)', vitae: 3 },
  large: { label: 'Large (camel, giraffe, horse)', vitae: 5 }
}

// Feed attack damage, PG p.118: half Strength (rounded up, as other halves in
// our automation); Gentle Feed lowers it by up to the margin (minimum 1), Tear
// Throat adds the margin; a willing target still takes 1.
function a2tFeedAttackDamage (strength = 0, margin = 0, option = 'none', willing = false) {
  if (willing) return 1
  const base = Math.max(1, a2Half(strength))
  const m = Math.max(0, a2Int(margin))
  if (option === 'gentle') return Math.max(1, base - m)
  if (option === 'tear') return base + m
  return base
}

// What one feeding gives and costs (PG p.102, p.118, p.141-144).
// source: human | animal | bag | stored | vampire | other.
// drink: Vitae the feeder takes from the source; gained = what fits.
function a2tFeedPlan ({
  source = 'human', drink = 0, available = null, missing = 0, g = 1, size = 'medium',
  path = false, pathViolation = false, pathSlashes = 1, attack = null
} = {}) {
  const out = { source, drink: 0, gained: 0, wasted: 0, available: 0, left: null, killed: false, endangered: false, violations: 0, willpower: 0, blocked: null, notes: [] }
  missing = Math.max(0, a2Int(missing))
  if (source === 'animal' && a2Int(g) >= 3) {
    out.blocked = 'Vampires with a generation modifier of 3 or more can\'t feed on animals (PG p.143).'
    return out
  }
  let avail
  if (source === 'animal') avail = available === null || available === undefined ? (A2T_ANIMALS[size]?.vitae ?? 3) : a2Int(available)
  else if (source === 'human') avail = available === null || available === undefined ? 10 : a2Int(available)
  else if (source === 'other') avail = available === null || available === undefined ? 99 : a2Int(available)
  else avail = a2Int(available)
  avail = Math.max(0, avail)
  out.available = avail
  let d = a2Clamp(a2Int(drink), 0, avail)
  if (attack) {
    // Feed attack: up to Strength or Stamina per won attack, never more than
    // you are missing (PG p.102, p.118).
    d = Math.min(d, Math.max(0, a2Int(attack.perAttack)), missing)
    out.notes.push('No Kiss in physical conflict: the victim stays alert (PG p.118).')
  }
  out.drink = d
  out.gained = Math.min(d, missing)
  out.wasted = d - out.gained
  out.left = avail - d
  if (out.wasted) out.notes.push(`${out.wasted} Vitae more than you can hold is lost.`)
  const slashes = a2Clamp(a2Int(pathSlashes, 1), 1, 3)
  if (source === 'human') {
    if (d > 0 && out.left === 0) {
      out.killed = true
      out.willpower = 1 // PG p.104, p.144
      out.notes.push('Drained to death: the victim dies. +1 Willpower as the Beast is sated (PG p.104, p.144). A conspicuous kill risks the Masquerade (PG p.142).')
    } else if (d > 0 && out.left < 4) {
      out.endangered = true
      out.notes.push(`Left at ${out.left} Vitae: it dies within a couple of hours without a hospital (PG p.143).`)
    } else if (d > 0 && out.left < 7) {
      out.endangered = true
      out.notes.push(`Left at ${out.left} Vitae: its life is at risk; untreated it dies within a couple of days (PG p.143).`)
    } else if (d > 0 && out.left < 9) {
      out.notes.push(`Left at ${out.left} Vitae: weakened and looking sick, but not in danger (PG p.143).`)
    }
    // Humanity: below 7 is 1 violation, a kill 2 in total (PG p.144, TR30).
    // Path walkers: only when the act matches one of their Path's violations (TR31).
    if (path) out.violations = pathViolation ? slashes : 0
    else out.violations = out.killed ? 2 : out.endangered ? 1 : 0
    if (!attack && d > 0 && !out.killed) out.notes.push('The Kiss: a calm victim takes −2 dice to Awareness and Investigation for the scene; resisting it is Composure + Resolve vs 2 + your generation modifier (PG p.141).')
    return out
  }
  if (path && pathViolation) out.violations = slashes
  if (source === 'animal' && d * 2 > avail) out.notes.push('More than half its blood: the animal dies within a few hours unless treated (PG p.143).')
  if (source === 'bag' || source === 'stored') out.notes.push('Blood bags give 1 Vitae each if no more than a couple of days old and not separated (PG p.143).')
  if (source === 'vampire') {
    out.notes.push('Vampire blood: this drink counts toward a Blood Bond (3 drinks on different nights, PG p.135-136).')
    if (d > 0 && out.left === 0) out.notes.push('Drained of all Vitae: it enters torpor at the start of the next night (PG p.144). A scene with the empty victim opens diablerie (PG p.65-66).')
  }
  return out
}

// Herd, PG p.143: one safe feeding per dot per session, as a won hunt; taxing
// the herd costs 1 dot for good and gives one extra feeding that session.
// flag = flags.world.a2.herd = { session, base, used, taxed }.
function a2tHerdState (flag = {}, session = 1, dots = 0) {
  if (!flag || a2Int(flag.session) !== a2Int(session)) return { session: a2Int(session), base: Math.max(0, a2Int(dots)), used: 0, taxed: 0, left: Math.max(0, a2Int(dots)) }
  const base = Math.max(0, a2Int(flag.base ?? dots))
  const used = Math.max(0, a2Int(flag.used))
  const taxed = Math.max(0, a2Int(flag.taxed))
  return { session: a2Int(session), base, used, taxed, left: Math.max(0, base + taxed - used) }
}

// ---- daysleep and rising (pure) ---------------------------------------------
// One actor's night (PG p.99-104, p.140, p.147; TR36, TR37).
//  vampire: rising costs 1 Vitae; at 0 Vitae it can't rise and falls into
//    torpor; fully baneful with Vitae: the Beast mends 1 box for 5 Vitae and it
//    rises if Vitae is left; Refocus: Willpower + the higher of Composure or
//    Resolve, 1 if the daysleep wasn't safe; optional baneful mending on rising
//    (5 Vitae + 1 Willpower, once per night, PG p.100).
//  ghoul / mortal / animal: rest cycle: Health + half Stamina (rounded up) if
//    safe, else 1 (PG p.99); Willpower Refocus as above (house: their rest);
//    a fed-on mortal's blood refills at the same rate (PG p.143).
function a2tRise (s = {}) {
  const creature = s.creature ?? 'vampire'
  const max = Math.max(0, a2Int(s.health?.max))
  let baneful = a2Clamp(a2Int(s.health?.baneful), 0, max)
  let hp = s.health?.value === undefined || s.health?.value === null ? max - baneful : a2Clamp(a2Int(s.health.value), 0, max - baneful)
  let vitae = Math.max(0, a2Int(s.vitae))
  const wpMax = Math.max(0, a2Int(s.willpower?.max) - a2Int(s.willpower?.disabled))
  let wp = a2Clamp(a2Int(s.willpower?.value), 0, wpMax)
  let torpor = s.torpor ? { reason: s.torpor.reason ?? 'manual' } : null
  let bloodLeft = s.bloodLeft === null || s.bloodLeft === undefined ? null : a2Clamp(a2Int(s.bloodLeft), 0, 10)
  const safe = s.safe !== false
  const lines = []
  const spent = { rise: 0, beast: 0, mend: 0 }
  let rose = false
  let wpGain = 0
  let healed = 0
  let finalDeath = false
  const refocus = () => {
    const gain = safe ? Math.max(a2Int(s.composure), a2Int(s.resolve)) : 1
    const next = Math.min(wpMax, wp + Math.max(0, gain))
    wpGain = next - wp
    wp = next
  }
  if (creature === 'vampire') {
    const allBaneful = max > 0 && baneful >= max
    if (allBaneful && vitae === 0) {
      finalDeath = true
      torpor = torpor ?? { reason: 'baneful' }
      lines.push('All Health baneful and no Vitae left: Final Death (PG p.101).')
    } else if (allBaneful) {
      spent.beast = Math.min(5, vitae)
      vitae -= spent.beast
      baneful -= 1
      hp = Math.max(hp, 1)
      lines.push(`In torpor, the Beast mended 1 baneful box (${spent.beast} Vitae, PG p.140, TR37).`)
      if (vitae > 0) {
        torpor = torpor && !['vitae', 'baneful'].includes(torpor.reason) ? torpor : null
      } else {
        torpor = { reason: 'vitae' }
        lines.push('That used up its Vitae: it stays in torpor with 1 Health (PG p.140).')
      }
    } else if (torpor) {
      if (torpor.reason === 'vitae' && vitae > 0) lines.push('Fed while in torpor: Stamina + Resolve vs 2 + generation modifier to rise (PG p.140). Untick Torpor once it has risen.')
      else lines.push(`In torpor (${torpor.reason}): it doesn't rise.`)
    }
    if (!torpor && !finalDeath) {
      if (vitae >= 1) {
        vitae -= 1
        spent.rise = 1
        rose = true
        if (vitae === 0) lines.push('Rising used its last Vitae: unless it feeds tonight, it falls into torpor at the end of the next daysleep (PG p.147).')
      } else {
        torpor = { reason: 'vitae' }
        lines.push('0 Vitae: it can\'t pay the 1 Vitae to rise and falls into torpor (PG p.103, p.140).')
      }
    }
    if (rose) {
      refocus()
      if (s.mendBaneful) {
        if (baneful > 0 && vitae >= 5 && wp >= 1) {
          vitae -= 5
          wp -= 1
          baneful -= 1
          spent.mend = 5
          lines.push('Mended 1 baneful box on rising: 5 Vitae and 1 Willpower (PG p.100).')
        } else {
          lines.push('No baneful mending: it needs a crossed box, 5 Vitae and 1 Willpower (PG p.100).')
        }
      }
    }
  } else if (['ghoul', 'mortal', 'animal'].includes(creature)) {
    rose = true
    const gain = safe ? a2Half(s.stamina) : 1
    const next = Math.min(max - baneful, hp + gain)
    healed = Math.max(0, next - hp)
    hp = Math.max(hp, next)
    refocus()
    if (bloodLeft !== null && bloodLeft < 10) bloodLeft = Math.min(10, bloodLeft + gain)
  }
  return { creature, vitae, health: { value: Math.min(hp, max - baneful), baneful, max }, willpower: wp, torpor, bloodLeft, rose, wpGain, healed, spent, lines, finalDeath }
}

// Items with limited uses: the system's npcAbility system.uses
// { enabled, value, max, period } and our flags.world.a2.uses { value, max, period }.
function a2tUsesUpdates (items = [], periods = []) {
  const byId = new Map()
  for (const item of items) {
    const u = item?.system?.uses
    if (u && u.enabled && periods.includes(u.period) && a2Int(u.value) < a2Int(u.max)) {
      byId.set(item.id, { ...(byId.get(item.id) ?? { _id: item.id }), 'system.uses.value': a2Int(u.max) })
    }
    const f = item?.flags?.world?.a2?.uses
    if (f && periods.includes(f.period) && a2Int(f.value) < a2Int(f.max)) {
      byId.set(item.id, { ...(byId.get(item.id) ?? { _id: item.id }), 'flags.world.a2.uses.value': a2Int(f.max) })
    }
  }
  return [...byId.values()]
}

// Conditions that end with the scene or the night. Blood Surge always does
// (PG p.137); other conditions only when nothing in the world manages them
// (no flags.world), so V6 Automation's own conditions and other tools' effects
// are left to their owners.
function a2tExpires (item, durations = ['scene']) {
  if (item?.type !== 'condition') return false
  if (item.flags?.wod6e?.bloodSurge) return true
  if (!durations.includes(item.system?.condition?.duration)) return false
  return !Object.keys(item.flags?.world ?? {}).length
}

// ---- Masquerade Tracker (pure) ----------------------------------------------
// Masquerade Tracker Effects, ST p.35.
const A2T_MASQ_LEVELS = [
  { min: 0, max: 0, name: 'Superstition', effect: 'Vampires are pure fantasy or superstition. Anyone who believes in them is not taken seriously.' },
  { min: 1, max: 2, name: 'Disbelief', effect: 'Even shown evidence, most mortals assume special effects or an AI trick. Vampires can\'t be real.' },
  { min: 3, max: 4, name: 'Skepticism', effect: 'Some people start to believe in monsters; most still look for a reasonable explanation. Vampires start to feel threatened.' },
  { min: 5, max: 6, name: 'Concern', effect: 'Even vampires worry. Hunters come to town, and the vampire authorities crack down on any Kindred showing fangs.' },
  { min: 7, max: 8, name: 'Certainty', effect: 'Most mortals know something terrible is happening and avoid danger. Vampires turn wary and reclusive; some hunt the culprits. Hunting is harder and opposition is everywhere.' },
  { min: 9, max: 10, name: 'Open War', effect: 'Mortals panic and hide; the authorities act. Hunters and possibly armed forces are summoned. Vampires flee or hunt whoever is responsible.' }
]
function a2tMasqLevel (rank) {
  const r = a2Clamp(a2Int(rank), 0, 10)
  return A2T_MASQ_LEVELS.find((l) => r >= l.min && r <= l.max)
}
// Threat Test Reactions, ST p.37 (optional rule).
const A2T_THREAT = [
  'Calm Before the Storm: nothing happens tonight.',
  'Rumors and Omens: rumors spread and worry mortals and vampires. One more threat and things go south fast.',
  'Vigilance: more police patrols, hunters look harder at strange events; careless PCs turn vigilance into aggression.',
  'Minor Threat: a reaction is inevitable: a small hunter cell, a group of Hounds or another group acts against whoever threatens the Masquerade.',
  'Medium Threat: special forces, a larger or better-prepared hunter cell, even the city\'s vampire authorities.',
  'Greater Threat: armed forces and hunter organizations are out, most mortals stay in at night, and the PCs may face a Blood Hunt.',
  'Overwhelming Threat: an inquisition. Mortals flee, the city is a battleground at night, and vampires who blame the PCs punish them.'
]
function a2tThreatReaction (successes) { return A2T_THREAT[a2Clamp(a2Int(successes), 0, 6)] }

function a2tMasqNormalize (s = {}) {
  return {
    rank: a2Clamp(a2Int(s?.rank, 3), 0, 10),
    log: Array.isArray(s?.log) ? s.log.slice(-A2T_LOG_MAX) : [],
    triggers: Array.isArray(s?.triggers) ? s.triggers.filter((t) => t && Number.isFinite(Number(t.rank))) : []
  }
}
function a2tMasqApply (state, rank, reason = '', user = '', at = '') {
  const s = a2tMasqNormalize(state)
  const to = a2Clamp(a2Int(rank), 0, 10)
  const log = [...s.log, { at, from: s.rank, to, reason: String(reason ?? '').slice(0, 300), user }].slice(-A2T_LOG_MAX)
  return { ...s, rank: to, log }
}
// Story triggers (ST p.35), one per line: "4: Hunting tests: Difficulty +2".
// A line that mentions hunting and "Difficulty +N" also feeds the hunting dialog.
function a2tParseTriggers (text = '') {
  return String(text).split(/\r?\n/).map((line) => line.match(/^\s*(\d{1,2})\s*[:.)-]\s*(.+?)\s*$/)).filter(Boolean).map(([, r, t]) => {
    const m = /hunt/i.test(t) ? t.match(/difficulty\s*([+\-−])\s*(\d+)/i) : null
    return { rank: a2Clamp(a2Int(r), 1, 10), text: t, hunt: m ? (m[1] === '+' ? 1 : -1) * a2Int(m[2]) : 0 }
  }).sort((a, b) => a.rank - b.rank)
}
function a2tActiveTriggers (triggers = [], rank = 0) { return triggers.filter((t) => a2Int(rank) >= a2Int(t.rank)) }
function a2tHuntTriggerMod (triggers = [], rank = 0) { return a2tActiveTriggers(triggers, rank).reduce((t, x) => t + a2Int(x.hunt), 0) }

// ---- experience (pure) ------------------------------------------------------
// PG p.64: 1 XP for each condition, at most 5 a session whatever else applies;
// diablerie XP is the only exception (PG p.64-66).
const A2T_XP_CONDITIONS = [
  ['beast', 'Facing the Beast', 'faced the Beast and engaged with your Humanity or Path, win or lose'],
  ['ambition', 'Ambition', 'pursued a personal ambition, succeeded or not'],
  ['flaw', 'Flaw', 'faced a flaw in a way that complicated your situation (1 XP at most, PG p.57)'],
  ['loss', 'Loss', 'suffered a loss or sacrificed something of value'],
  ['survival', 'Survival', 'survived the session or story']
]
const A2T_XP_CAP = 5
function a2tXpAward ({ checks = [], same = null, already = 0, diablerie = 0 } = {}) {
  const keys = new Set(A2T_XP_CONDITIONS.map(([k]) => k))
  const base = same !== null && same !== undefined && same !== '' ? a2Clamp(a2Int(same), 0, A2T_XP_CAP) : new Set((checks ?? []).filter((k) => keys.has(k))).size
  const room = Math.max(0, A2T_XP_CAP - Math.max(0, a2Int(already)))
  const award = Math.min(base, room)
  const d = Math.max(0, a2Int(diablerie))
  return { base, award, capped: base > award, diablerie: d, total: award + d }
}
function a2tXpNormalize (x = {}) {
  const earned = Math.max(0, a2Int(x?.earned))
  const spent = Math.max(0, a2Int(x?.spent))
  return { earned, spent, available: earned - spent, log: Array.isArray(x?.log) ? x.log.slice(-A2T_LOG_MAX) : [], session: { n: a2Int(x?.session?.n), awarded: Math.max(0, a2Int(x?.session?.awarded)) } }
}
function a2tXpSave (x) { return { earned: x.earned, spent: x.spent, log: x.log.slice(-A2T_LOG_MAX), session: x.session } }

// Experience Costs, PG p.65; rituals and ceremonies a flat 8 (house D22, TR52).
const A2T_XP_COSTS = { attribute: 20, skill: 10, specialty: 5, merit: 8, clanTrait: 10, clanTraitOther: 15, discipline: 15, disciplineOther: 20, power: 8, ritual: 8, humanity: 20 }
const A2T_BUY_KINDS = {
  attribute: 'Attribute dot (20)',
  skill: 'Skill dot (10)',
  specialty: 'Skill specialty (5)',
  merit: 'Merit (8)',
  clanTrait: 'Clan trait (10, other clan 15)',
  discipline: 'Discipline dot (15, other clan 20)',
  power: 'Discipline power (8)',
  ritual: 'Ritual or ceremony (8, house)',
  humanity: 'Humanity / Path rank (20)'
}
function a2tPurchaseCheck (p = {}) {
  const errors = []
  const warnings = []
  const cur = Math.max(0, a2Int(p.current))
  const vampire = p.creature === 'vampire'
  let cost = 0
  switch (p.kind) {
    case 'attribute':
    case 'skill':
      cost = p.kind === 'attribute' ? A2T_XP_COSTS.attribute : A2T_XP_COSTS.skill
      if (cur + 1 > a2Int(p.maxDots, 5)) errors.push(`${cur + 1} dots is above the tier maximum of ${a2Int(p.maxDots, 5)} (PG p.22).`)
      break
    case 'specialty':
      cost = A2T_XP_COSTS.specialty
      if (!String(p.text ?? '').trim()) errors.push('Name the specialty.')
      if (p.duplicate) errors.push('The Skill already has that specialty.')
      if (cur < 1) warnings.push('A specialty for a Skill without dots: check with the Storyteller (PG p.39).')
      break
    case 'merit':
      cost = p.itemCost ?? A2T_XP_COSTS.merit
      if (p.owned) errors.push('Already on the sheet.')
      break
    case 'clanTrait':
      cost = p.inClan ? (p.itemCost ?? A2T_XP_COSTS.clanTrait) : (p.itemCostOther ?? A2T_XP_COSTS.clanTraitOther)
      if (!vampire) errors.push('Only Duskborn and vampires can gain clan traits (PG p.64).')
      if (p.owned) errors.push('Already on the sheet.')
      if (!p.inClan) warnings.push('Another clan\'s trait: drink at least 1 Vitae, less than one night old, from a Duskborn or vampire who has it (PG p.65).')
      break
    case 'discipline':
      cost = p.inClan ? A2T_XP_COSTS.discipline : A2T_XP_COSTS.disciplineOther
      if (!['vampire', 'ghoul'].includes(p.creature)) errors.push('Only ghouls, Duskborn and vampires can gain Discipline dots (PG p.65).')
      if (cur + 1 > a2Int(p.maxDiscipline, 5)) errors.push(`${cur + 1} dots is above the tier's Discipline maximum of ${a2Int(p.maxDiscipline, 5)} (PG p.22).`)
      if (!p.inClan && cur === 0) warnings.push('First dot of another clan\'s Discipline: drink at least 1 Vitae, less than one night old, from someone with a dot in it (PG p.65).')
      warnings.push(`The new dot brings one free power of rank ${cur + 1} or lower (PG p.65).`)
      break
    case 'power':
    case 'ritual':
      cost = p.itemCost ?? A2T_XP_COSTS[p.kind]
      if (p.owned) errors.push('Already on the sheet.')
      if (a2Int(p.disciplineDots) < 1) errors.push('It must come from a Discipline you know (PG p.64).')
      else if (a2Int(p.powerRank) > a2Int(p.disciplineDots)) errors.push(`Rank ${a2Int(p.powerRank)} is above your ${a2Int(p.disciplineDots)} dots in that Discipline (PG p.64).`)
      break
    case 'humanity':
      cost = A2T_XP_COSTS.humanity
      if (!vampire) errors.push('Only vampires have a Humanity or Path rank.')
      if (a2Int(p.violations) > 0) errors.push('You can\'t raise your rank while you have violations (PG p.127).')
      if (cur >= 10) errors.push('Rank 10 is the top.')
      warnings.push('XP alone never raises the rank: it takes an act that follows your precepts at real risk (PG p.65, p.127).')
      break
    default:
      errors.push('Pick something to buy.')
  }
  if (p.costOverride !== null && p.costOverride !== undefined && p.costOverride !== '' && Number.isFinite(Number(p.costOverride))) cost = Math.max(0, a2Int(p.costOverride))
  for (const e of p.prereqErrors ?? []) errors.push(e)
  if (cost > a2Int(p.available)) errors.push(`Not enough XP: ${cost} needed, ${a2Int(p.available)} available.`)
  return { ok: errors.length === 0, cost, errors, warnings }
}

// ---- small helpers ------------------------------------------------------------
function a2tClone (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)) }
function a2tIsActiveGM () { return typeof v6aIsGM === 'function' ? v6aIsGM() : Boolean(game.user?.isGM) } // eslint-disable-line no-undef
function a2tGMs () { return (game.users ?? []).filter((u) => u.isGM).map((u) => u.id) }
function a2tWhisper (actor) { return [...new Set((game.users ?? []).filter((u) => u.isGM || actor?.testUserPermission?.(u, 'OWNER')).map((u) => u.id))] }
function a2tTrait (cfg, key) { return WOD6E?.configs?.[cfg]?.getList?.({})?.[key]?.displayName ?? (key ? key[0].toUpperCase() + key.slice(1) : '') }
function a2tReady (gmOnly = false) {
  if (!a2Enabled()) { ui.notifications?.warn('The Alpha 2 rules are switched off.'); return false }
  if (gmOnly && !game.user?.isGM) { ui.notifications?.warn('Only the GM can do that.'); return false }
  return true
}
function a2tPickActor (actor) {
  if (actor) return actor
  return globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user?.character ?? null
}
function a2tActorTier (actor) { return a2tTier(a2Creature(actor), actor?.system?.vampire?.generation?.value) }
function a2tCard (title, lines = [], extra = '') {
  return `<div class="wod6e chat-card a2t-card"><h4 class="chat-card-name">${a2Esc(title)}</h4>${lines.length ? `<ul>${lines.map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul>` : ''}${extra}</div>`
}
function a2tOpt (value, label, selected = false) { return `<option value="${a2Esc(value)}"${selected ? ' selected' : ''}>${a2Esc(label)}</option>` }
function a2tShow (root, sel, show) {
  root?.querySelectorAll?.(sel).forEach((e) => { if (show) e.removeAttribute('hidden'); else e.setAttribute('hidden', '') })
}
// Reads every named control: checkboxes with data-multi collect checked
// values into an array, other checkboxes give booleans, numbers give numbers.
function a2tFormData (root) {
  const out = {}
  for (const el of root?.querySelectorAll?.('[name]') ?? []) {
    const name = el.getAttribute('name')
    const type = String(el.getAttribute('type') ?? '').toLowerCase()
    const val = el.value ?? el.getAttribute('value') ?? ''
    if (type === 'checkbox') {
      if (el.hasAttribute('data-multi')) { out[name] ??= []; if (el.checked) out[name].push(val) } else out[name] = Boolean(el.checked)
    } else if (type === 'radio') {
      if (el.checked) out[name] = val
      else if (!(name in out)) out[name] = null
    } else if (type === 'number') {
      out[name] = val === '' || val === null ? null : Number(val)
    } else out[name] = val
  }
  return out
}
function a2tDialog () { return foundry.applications.api.DialogV2 }
function a2tDialogRoot (dialog) { return dialog?.element ?? null }
function a2tAllActors () {
  const list = [...(game.actors ?? [])].filter((a) => a.type !== 'group')
  for (const t of globalThis.canvas?.tokens?.placeables ?? []) {
    if (t.document && !t.document.actorLink && t.actor && t.actor.type !== 'group') list.push(t.actor)
  }
  return list
}

// ---- settings -----------------------------------------------------------------
// Module: v6-automation.a2tMasquerade / a2tMasqueradePlayers / a2tClock.
// Macro / World Scripter: wod6e.v6A2tMasquerade / v6A2tMasqueradePlayers / v6A2tClock.
const A2T_SETTINGS = {
  masquerade: { key: 'a2tMasquerade', scope: 'world', config: false, type: Object, default: { rank: 3, log: [], triggers: [] } }, // a strained city (ST p.33); set it per chronicle
  masqueradePlayers: {
    key: 'a2tMasqueradePlayers',
    name: 'Players see the Masquerade level (V6 Automation)',
    hint: 'The Masquerade Tracker informs both the Storyteller and the players (ST p.35). On: players get a read-only view of the rank and its effect. Off: GM only.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  },
  clock: { key: 'a2tClock', scope: 'world', config: false, type: Object, default: { night: 1, session: 1 } }
}
function a2tNs () { return game.modules?.get?.(A2T_MODULE)?.active ? A2T_MODULE : 'wod6e' }
function a2tSettingId (name) {
  const d = A2T_SETTINGS[name]
  const ns = a2tNs()
  return [ns, ns === A2T_MODULE ? d.key : `v6${d.key[0].toUpperCase()}${d.key.slice(1)}`]
}
function a2tRegisterSettings () {
  for (const name of Object.keys(A2T_SETTINGS)) {
    const [ns, key] = a2tSettingId(name)
    if (game.settings.settings.has(`${ns}.${key}`)) continue
    const { key: _k, default: def, ...rest } = A2T_SETTINGS[name]
    game.settings.register(ns, key, {
      ...rest,
      default: a2tClone(def),
      onChange: () => {
        if (name === 'masquerade' && a2tState.masqApp?.rendered) a2tState.masqApp.render()
        if (name === 'masqueradePlayers') { try { ui.controls?.render?.({ reset: true }) } catch (e) { /* no controls */ } }
      }
    })
  }
}
function a2tGet (name) {
  try {
    const [ns, key] = a2tSettingId(name)
    if (game.settings.settings.has(`${ns}.${key}`)) return a2tClone(game.settings.get(ns, key))
  } catch (e) { /* not ready */ }
  return a2tClone(A2T_SETTINGS[name].default)
}
async function a2tSet (name, value) {
  const [ns, key] = a2tSettingId(name)
  return game.settings.set(ns, key, value)
}
function a2tClock () {
  const c = a2tGet('clock') ?? {}
  return { night: Math.max(1, a2Int(c.night, 1)), session: Math.max(1, a2Int(c.session, 1)) }
}

// ---- GM relay -------------------------------------------------------------------
// Writes to actors the user doesn't own (a victim's Vitae or Health) go to the
// active GM. Channel: module.v6-automation when the module manifest has
// "socket": true, otherwise system.wod6e (the system's manifest has it).
function a2tSocketName () {
  const m = game.modules?.get?.(A2T_MODULE)
  return m?.active && m.socket ? `module.${A2T_MODULE}` : 'system.wod6e'
}
function a2tSocketInit () {
  const api = globalThis.V6Alpha2
  if (api.toolsSocket || !game.socket?.on) return
  a2tState.socket = a2tSocketName()
  game.socket.on(a2tState.socket, (msg) => { a2tOnSocket(msg).catch((e) => console.error('V6 Alpha 2 tools | socket', e)) })
  api.toolsSocket = a2tState.socket
}
async function a2tOnSocket (msg) {
  if (!msg || msg.a2t !== 1 || !a2tIsActiveGM()) return
  const user = game.users?.get?.(msg.user)
  if (!user) return
  if (msg.op === 'victim') await a2tVictimLocal(msg.data ?? {})
}
async function a2tVictimUpdate (data) {
  const victim = a2FromUuid(data.uuid)
  if (!victim) return false
  if (victim.isOwner) { await a2tVictimLocal(data); return true }
  if (!game.users?.activeGM) {
    ui.notifications.warn(`No GM is connected: apply the changes to ${victim.name} by hand.`)
    return false
  }
  game.socket.emit(globalThis.V6Alpha2?.toolsSocket ?? a2tSocketName(), { a2t: 1, op: 'victim', data, user: game.user.id })
  return true
}
// data = { uuid, vitaeLoss, bloodLeft, damage }
async function a2tVictimLocal ({ uuid, vitaeLoss = 0, bloodLeft = null, damage = 0 } = {}) {
  const victim = a2FromUuid(uuid)
  if (!victim) return
  const upd = {}
  if (a2Int(vitaeLoss) > 0 && a2Rules(victim)?.vitae) upd['system.health.value'] = Math.max(0, a2Int(victim.system.health?.value) - a2Int(vitaeLoss))
  if (bloodLeft !== null && bloodLeft !== undefined) upd['flags.world.a2.bloodLeft'] = a2Clamp(a2Int(bloodLeft), 0, 10)
  if (Object.keys(upd).length) await victim.update(upd)
  if (a2Int(damage) > 0) await a2DamageActor(victim, a2Int(damage))
}

// ---- system tier maxima ------------------------------------------------------------
// generations-categories.js still has Alpha 1 placeholders: non-clan Disciplines
// 3 / 5 / 7 and a Methuselah Blood Surge of 10. Alpha 2 has one Discipline
// maximum per tier (PG p.22; Duskborn 3; Methuselah 10 by D39) and our Methuselah
// Surge is +8 (D7). The sheet reads these for its dot rows. Getters keep the
// Alpha 2 switch live; off gives the system's numbers back.
const A2T_GEN_A2 = { duskborn: { surge: 99, disc: 3 }, neonate: { surge: 2, disc: 5 }, ancilla: { surge: 4, disc: 7 }, elder: { surge: 6, disc: 8 }, methuselah: { surge: 8, disc: 10 } }
function a2tPatchGenerationConfig () {
  const cats = globalThis.WOD6E?.configs?.GenerationCategories
  if (!cats) return
  for (const [key, a2] of Object.entries(A2T_GEN_A2)) {
    const cat = cats[key]
    const mv = cat?.maximumValues
    if (!mv || mv.__a2t) continue
    const orig = { surge: mv.bloodSurge, inClan: mv.disciplines?.inClan, nonClan: mv.disciplines?.nonClan }
    const disciplines = {}
    Object.defineProperties(disciplines, {
      inClan: { enumerable: true, get: () => (a2Enabled() ? a2.disc : orig.inClan) },
      nonClan: { enumerable: true, get: () => (a2Enabled() ? a2.disc : orig.nonClan) }
    })
    const next = {}
    Object.defineProperties(next, {
      bloodSurge: { enumerable: true, get: () => (a2Enabled() ? a2.surge : orig.surge) },
      disciplines: { enumerable: true, value: disciplines },
      __a2t: { value: orig }
    })
    try { cat.maximumValues = next } catch (e) { console.warn('V6 Alpha 2 tools | tier maxima not patched', key, e) }
  }
}

// ---- Blood Surge ------------------------------------------------------------------
// The sheet's [data-action="bloodSurge"] runs the system's _onBloodSurge, which
// gets three things wrong under Alpha 2: non-clan Disciplines stop at the
// Alpha 1 non-clan maximum, Duskborn and Methuselahs use placeholder caps, and a
// visible Discipline with 0 dots can be surged (PG p.137 needs 1 dot). Cost (1 /
// 2 Vitae per dot), the scene duration and the condition it creates are right,
// so the replacement makes the same condition (flags.wod6e.bloodSurge), which
// the system and core count as before. Hunger follows from the Vitae spent.
function a2tPatchBloodSurge () {
  const sheets = Object.values(CONFIG.Actor?.sheetClasses ?? {}).flatMap((t) => Object.values(t ?? {})).map((s) => s?.cls).filter(Boolean)
  for (const cls of new Set(sheets)) {
    const opts = Object.prototype.hasOwnProperty.call(cls, 'DEFAULT_OPTIONS') ? cls.DEFAULT_OPTIONS : null
    const orig = opts?.actions?.bloodSurge
    if (typeof orig !== 'function' || orig.__a2t) continue
    const wrapped = function (event, target) {
      if (!a2Enabled()) return orig.call(this, event, target)
      event?.preventDefault?.()
      return a2tBloodSurge(this.actor ?? this.document)
    }
    Object.defineProperty(wrapped, '__a2t', { value: true })
    a2tState.surgeWraps.set(orig, wrapped)
    opts.actions.bloodSurge = wrapped
  }
  for (const app of foundry.applications?.instances?.values?.() ?? []) a2tPatchSheetInstance(app)
}
// Sheets built before the patch keep their own options.actions copy.
function a2tPatchSheetInstance (app) {
  const actions = app?.options?.actions
  const cur = actions?.bloodSurge
  if (typeof cur !== 'function') return true
  if (cur.__a2t) return true
  const wrapped = a2tState.surgeWraps.get(cur)
  if (!wrapped) return false
  try { actions.bloodSurge = wrapped } catch (e) { return false }
  return actions.bloodSurge === wrapped
}
// Last resort for a sheet whose options can't be patched: catch the click on
// the button itself, before it bubbles to the application.
function a2tSurgeFallback (root, actor) {
  root.querySelectorAll('[data-action="bloodSurge"]').forEach((btn) => {
    if (btn.dataset.a2t) return
    btn.dataset.a2t = '1'
    btn.addEventListener('click', (ev) => {
      if (!a2Enabled()) return
      ev.preventDefault()
      ev.stopPropagation()
      a2tBloodSurge(actor)
    })
  })
}

function a2tExistingSurge (actor, type, key) {
  return (actor.items ?? []).filter((i) => i.type === 'condition').map((i) => i.flags?.wod6e?.bloodSurge)
    .filter((s) => s?.targetType === type && s.target === key).reduce((t, s) => t + (Number(s.bonus) || 0), 0)
}
function a2tSurgeTargets (actor, tier) {
  const out = []
  for (const [key, def] of Object.entries(WOD6E.configs.Attributes.getList({}))) {
    const t = actor.system?.attributes?.[key]
    if (!t) continue
    const existing = a2tExistingSurge(actor, 'attribute', key)
    const cap = tier.surgeAttr
    if (cap !== null && cap - existing < 1) continue
    out.push({ type: 'attribute', key, path: `system.attributes.${key}`, label: def.displayName ?? a2tTrait('Attributes', key), base: a2Int(t.value), effective: a2Int(t.effective ?? t.value), existing, cap, vitaePerDot: 1 })
  }
  for (const [key, def] of Object.entries(WOD6E.configs.Disciplines.getList({}))) {
    const t = actor.system?.vampire?.disciplines?.[key]
    if (!t || a2Int(t.value) < 1) continue // PG p.137: at least 1 dot
    const eff = a2Int(t.effective ?? t.value)
    const cap = tier.surgeDisc
    if (cap !== null && eff >= cap) continue
    out.push({ type: 'discipline', key, path: `system.vampire.disciplines.${key}`, label: def.displayName ?? a2tTrait('Disciplines', key), base: a2Int(t.value), effective: eff, existing: 0, cap, vitaePerDot: 2 })
  }
  return out
}

async function a2tBloodSurge (actor) {
  if (!actor?.isOwner) return null
  if (!a2Rules(actor)?.surge || !actor.system?.canBloodSurge) { ui.notifications.warn(`${actor.name} can't use Blood Surge (PG p.137: vampires and Duskborn).`); return null }
  const vitae = a2Int(actor.system.health?.value)
  if (vitae < 1) { ui.notifications.warn(`${actor.name} has no Vitae for a Blood Surge.`); return null }
  const tier = a2tActorTier(actor)
  const targets = a2tSurgeTargets(actor, tier)
  if (!targets.length) { ui.notifications.warn('Nothing left that Blood Surge can raise at this tier.'); return null }
  const capText = (t) => (t.cap === null ? 'no cap' : t.type === 'attribute' ? `up to +${t.cap - t.existing} more` : `up to ${t.cap} dots`)
  const group = (type, label) => {
    const list = targets.filter((t) => t.type === type)
    return list.length ? `<optgroup label="${label}">${list.map((t) => a2tOpt(`${t.type}:${t.key}`, `${t.label} (${t.effective}, ${capText(t)})`)).join('')}</optgroup>` : ''
  }
  const caps = tier.surgeAttr === null ? 'Duskborn: no Blood Surge cap (PG p.22, TR42)' : `${tier.label}: Attributes up to +${tier.surgeAttr} in total, Disciplines up to ${tier.surgeDisc} dots (PG p.114, p.22)`
  const content = `<div class="a2t-dialog">
    <div class="form-group"><label>Attribute or Discipline</label><select name="target">${group('attribute', 'Attributes')}${group('discipline', 'Disciplines')}</select></div>
    <div class="form-group"><label>Vitae to spend</label><input type="number" name="vitae" value="1" min="1" max="${vitae}" step="1"></div>
    <p class="hint">Attributes: +1 dot per Vitae. Disciplines: +1 dot per 2 Vitae, at least 1 dot already. Lasts for the scene; several surges add up. Surged Stamina, Composure or Resolve don't raise Health or Willpower (PG p.137). ${a2Esc(caps)}. You have ${vitae} Vitae (Hunger ${a2ActorHunger(actor)}).</p></div>`
  const res = await a2tDialog().prompt({
    window: { title: `Blood Surge: ${actor.name}` },
    classes: ['wod6e', 'dialog', 'blood-surge-dialog'],
    content,
    ok: { icon: 'fa-solid fa-droplet', label: 'Blood Surge', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false
  })
  if (!res?.target) return null
  return a2tBloodSurgeApply(actor, res.target, res.vitae)
}

async function a2tBloodSurgeApply (actor, targetId, vitaeSpent) {
  const tier = a2tActorTier(actor)
  const target = a2tSurgeTargets(actor, tier).find((t) => `${t.type}:${t.key}` === targetId)
  const vitae = a2Int(actor.system.health?.value)
  if (!target) { ui.notifications.warn('Choose a valid Blood Surge target.'); return null }
  const check = a2tSurgeCheck({ kind: target.type, base: target.base, effective: target.effective, existing: target.existing, vitae: Number(vitaeSpent), available: vitae, cap: target.cap })
  if (!check.ok) { ui.notifications.warn(check.reason); return null }
  const spend = a2Int(vitaeSpent)
  const hungerBefore = a2ActorHunger(actor)
  await actor.update({ 'system.health.value': vitae - spend })
  try {
    await actor.createEmbeddedDocuments('Item', [{
      name: `Blood Surge: ${target.label}`,
      type: 'condition',
      img: 'systems/wod6e/assets/actors/VampireSymbol.webp',
      system: {
        description: `<p>Spent ${spend} Vitae to raise ${a2Esc(target.label)} by ${check.bonus} for the scene (Alpha 2, PG p.137).</p>`,
        condition: { duration: 'scene' },
        effects: [{ type: 'actorTrait', targets: [target.path], mode: 'add', value: check.bonus, valueSource: 'flat' }]
      },
      flags: {
        wod6e: { bloodSurge: { targetType: target.type, target: target.key, vitae: spend, bonus: check.bonus } },
        world: { a2: { surge: { night: a2tClock().night, at: new Date().toISOString() } } }
      }
    }])
  } catch (e) {
    await actor.update({ 'system.health.value': vitae })
    throw e
  }
  const hungerAfter = a2ActorHunger(actor)
  await a2Note(actor, `${actor.name}: Blood Surge`, [
    `+${check.bonus} ${target.label} for the scene (${spend} Vitae). Vitae ${vitae} → ${vitae - spend}, Hunger ${hungerBefore} → ${hungerAfter}.`,
    ...(target.type === 'discipline' ? ['A surged Discipline unlocks Maturing of powers you know and adds Power test dice, never new powers (PG p.137).'] : [])
  ])
  return { target: target.key, bonus: check.bonus, vitae: spend }
}

// ---- End Scene and New Night ----------------------------------------------------------
async function a2tEndScene () {
  if (!a2tReady(true)) return null
  const res = await a2tDialog().prompt({
    window: { title: 'End the scene' },
    content: `<div class="a2t-dialog">
      <label class="a2t-row"><input type="checkbox" name="surges" checked> End every Blood Surge (they last for the scene, PG p.137)</label>
      <label class="a2t-row"><input type="checkbox" name="conditions" checked> End other one-scene conditions (not those managed by V6 Automation)</label>
      <label class="a2t-row"><input type="checkbox" name="uses" checked> Reset per-scene uses</label>
      <p class="hint">Also tells the other Alpha 2 tools that the scene is over (hook v6a2EndScene).</p></div>`,
    ok: { icon: 'fa-solid fa-clapperboard', label: 'End scene', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false
  })
  if (!res) return null
  return a2tEndSceneApply(res)
}

async function a2tEndSceneApply ({ surges = true, conditions = true, uses = true, actors = null, card = true } = {}) {
  if (!game.user?.isGM) return null
  const list = actors ?? a2tAllActors()
  const lines = []
  if (typeof a2zSceneEnd === 'function') await a2zSceneEnd(list) // eslint-disable-line no-undef
  for (const actor of list) {
    const ended = (actor.items ?? []).filter((i) => (i.flags?.wod6e?.bloodSurge ? surges : conditions && a2tExpires(i, ['scene'])))
    if (ended.length) await actor.deleteEmbeddedDocuments('Item', ended.map((i) => i.id))
    const upd = uses ? a2tUsesUpdates(actor.items ?? [], ['scene']) : []
    if (upd.length) await actor.updateEmbeddedDocuments('Item', upd)
    if (ended.length || upd.length) lines.push(`${actor.name}: ${[ended.length ? `ended ${ended.map((i) => i.name).join(', ')}` : '', upd.length ? `${a2Plural(upd.length, 'use', 'uses')} reset` : ''].filter(Boolean).join('; ')}.`)
  }
  if (card) await ChatMessage.create({ whisper: a2tGMs(), content: a2tCard('Scene ends', lines.length ? lines : ['Nothing to end.']), flags: { world: { a2t: { kind: 'endScene' } } } })
  Hooks.callAll('v6a2EndScene', { actors: list, reason: 'endScene' })
  return lines
}

// Who can rise: vampire-type actors (vampires, ghouls, mortals, animals) and the
// system's npc type (uses only). Ticked by default: player-owned characters and
// actors with a token in the current scene.
function a2tNightCandidates () {
  const onScene = new Set()
  const out = []
  for (const t of globalThis.canvas?.tokens?.placeables ?? []) {
    if (!t.actor) continue
    if (t.document?.actorLink === false) out.push({ actor: t.actor, ticked: true, token: true })
    else onScene.add(t.actor.id)
  }
  for (const a of game.actors ?? []) if (['vampire', 'npc'].includes(a.type)) out.push({ actor: a, ticked: Boolean(a.hasPlayerOwner) || onScene.has(a.id), token: false })
  return out.sort((a, b) => (b.ticked - a.ticked) || String(a.actor.name).localeCompare(String(b.actor.name)))
}

async function a2tNewNight (opts = {}) {
  if (!a2tReady(true)) return null
  const list = a2tNightCandidates()
  if (!list.length) { ui.notifications.info('No actors to wake.'); return null }
  const clock = a2tClock()
  const row = (c, i) => {
    const a = c.actor
    const creature = a2Creature(a)
    const vit = a2Rules(a)?.vitae ? ` · Vitae ${a2Int(a.system?.health?.value)}/${a2ActorVitaeTotal(a)}` : ''
    const torpor = Boolean(a.flags?.world?.a2?.torpor)
    const h = creature === 'vampire' ? a2ActorHealth(a) : null
    return `<tr><td class="c"><input type="checkbox" name="on" data-multi value="${i}"${c.ticked ? ' checked' : ''}></td>
      <td>${a2Esc(a.name)}${c.token ? ' <span class="a2t-sub">(token)</span>' : ''}<br><span class="a2t-sub">${a2Esc(creature)}${vit}</span></td>
      <td class="c">${creature === 'npc' ? '' : `<input type="checkbox" name="safe" data-multi value="${i}" checked>`}</td>
      <td class="c">${creature === 'vampire' ? `<input type="checkbox" name="torpor" data-multi value="${i}"${torpor ? ' checked' : ''}>` : ''}</td>
      <td class="c">${h && h.baneful > 0 ? `<input type="checkbox" name="mend" data-multi value="${i}">` : ''}</td></tr>`
  }
  const head = '<thead><tr><th class="c"></th><th>Actor</th><th class="c" title="Safe daysleep: Willpower + the higher of Composure or Resolve; unsafe: 1 (PG p.104). Mortals and ghouls: Health + half Stamina, else 1 (PG p.99).">Safe</th><th class="c" title="Ticked: stays in torpor (PG p.140). Untick when it has woken.">Torpor</th><th class="c" title="Spend 5 Vitae and 1 Willpower to clear 1 baneful box on rising, once per night, not on the night the damage was taken (PG p.100).">Mend baneful</th></tr></thead>'
  const main = list.map((c, i) => (c.ticked ? row(c, i) : '')).join('')
  const rest = list.map((c, i) => (c.ticked ? '' : row(c, i))).join('')
  const restCount = list.filter((c) => !c.ticked).length
  const content = `<div class="a2t-dialog a2t-night">
    <p>Night ${clock.night + 1} begins. Each vampire pays 1 Vitae to rise (PG p.102, p.147) and refocuses its Willpower (PG p.104).</p>
    <div class="a2t-scroll"><table class="a2t-table">${head}<tbody>${main || '<tr><td></td><td colspan="4"><em>No player characters or scene actors.</em></td></tr>'}</tbody></table>
    ${restCount ? `<details><summary>Other actors (${restCount})</summary><table class="a2t-table">${head}<tbody>${rest}</tbody></table></details>` : ''}</div>
    <label class="a2t-row"><input type="checkbox" name="expire" checked> End Blood Surges and one-scene and one-night conditions</label>
    <label class="a2t-row"><input type="checkbox" name="uses" checked> Reset per-scene and per-night uses</label>
    <label class="a2t-row"><input type="checkbox" name="threat"> Roll the Masquerade threat test (optional, ST p.37)</label></div>`
  const res = await a2tDialog().prompt({
    window: { title: 'New Night' },
    position: { width: 560 },
    content,
    ok: { icon: 'fa-solid fa-moon', label: 'Begin the night', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false
  })
  if (!res) return null
  const has = (k, i) => (res[k] ?? []).includes(String(i))
  const entries = list.map((c, i) => ({ actor: c.actor, on: has('on', i), safe: has('safe', i), torpor: has('torpor', i), mendBaneful: has('mend', i) })).filter((e) => e.on)
  return a2tNewNightApply(entries, { expire: res.expire, uses: res.uses, threat: res.threat, ...opts })
}

// entries: [{ actor, safe, torpor, mendBaneful }]. Returns the card lines.
async function a2tNewNightApply (entries = [], { expire = true, uses = true, threat = false, card = true } = {}) {
  if (!game.user?.isGM) return null
  const clock = a2tClock()
  const night = clock.night + 1
  await a2tSet('clock', { ...clock, night })
  const lines = []
  const actors = []
  if (typeof a2zNightEnd === 'function') await a2zNightEnd(entries.map((e) => e.actor).filter(Boolean)) // eslint-disable-line no-undef
  for (const e of entries) {
    const actor = e.actor
    if (!actor) continue
    actors.push(actor)
    try { lines.push(await a2tNightActor(actor, e, night, { expire, uses })) } catch (err) {
      console.error('V6 Alpha 2 tools | new night', actor.name, err)
      lines.push(`${actor.name}: error, see the console.`)
    }
  }
  const foot = typeof a2xNightlyRecovery === 'function' ? [] : ['Impairment: a vampire clears one impaired Attribute each night on rising, a ghoul every three days, a mortal every seven (PG p.105).'] // eslint-disable-line no-undef
  if (card) await ChatMessage.create({ whisper: a2tGMs(), content: a2tCard(`Night ${night} begins`, [...lines, ...foot]), flags: { world: { a2t: { kind: 'newNight', night } } } })
  if (threat) await a2tThreatTest()
  // A new night ends every scene first; then night-long effects expire.
  Hooks.callAll('v6a2EndScene', { actors, reason: 'newNight' })
  Hooks.callAll('v6a2NewNight', { actors, night })
  return lines
}

async function a2tNightActor (actor, e, night, { expire, uses }) {
  const creature = a2Creature(actor)
  const rules = a2Rules(actor)
  const parts = []
  if (creature !== 'npc') {
    const s = actor.system ?? {}
    const health = a2ActorHealth(actor)
    const prevTorpor = actor.flags?.world?.a2?.torpor ?? null
    const vitae = a2Int(s.health?.value)
    const hungerBefore = a2ActorHunger(actor)
    const wpBefore = a2Int(s.willpower?.value)
    const res = a2tRise({
      creature: creature === 'other' ? 'none' : creature,
      vitae,
      health,
      willpower: s.willpower,
      composure: s.attributes?.composure?.value,
      resolve: s.attributes?.resolve?.value,
      stamina: s.attributes?.stamina?.value,
      safe: e.safe !== false,
      torpor: e.torpor ? (prevTorpor ?? { reason: 'manual' }) : null,
      mendBaneful: e.mendBaneful,
      bloodLeft: actor.flags?.world?.a2?.bloodLeft ?? null
    })
    const upd = {}
    if (rules?.vitae && res.vitae !== vitae) upd['system.health.value'] = res.vitae
    if (s.willpower && res.willpower !== wpBefore) upd['system.willpower.value'] = res.willpower
    if (res.health.value !== health.value || res.health.baneful !== health.baneful) upd['flags.world.a2.health'] = { value: res.health.value, baneful: res.health.baneful }
    if (res.torpor && (!prevTorpor || prevTorpor.reason !== res.torpor.reason)) upd['flags.world.a2.torpor'] = { reason: res.torpor.reason, since: night }
    if (!res.torpor && prevTorpor) a2Unset(upd, 'flags.world.a2.torpor')
    if (res.bloodLeft !== null && res.bloodLeft !== (actor.flags?.world?.a2?.bloodLeft ?? null)) {
      if (res.bloodLeft >= 10) a2Unset(upd, 'flags.world.a2.bloodLeft')
      else upd['flags.world.a2.bloodLeft'] = res.bloodLeft
    }
    const bags = actor.flags?.world?.a2?.bloodBags
    if (Array.isArray(bags) && bags.length) {
      const fresh = bags.filter((b) => night - a2Int(b.night) <= 2) // "a couple of days old" (PG p.143)
      if (fresh.length !== bags.length) { upd['flags.world.a2.bloodBags'] = fresh; parts.push(`${a2Plural(bags.length - fresh.length, 'stored blood bag batch', 'stored blood bag batches')} went stale`) }
    }
    if (Object.keys(upd).length) await actor.update(upd, { a2Damage: true, a2tNewNight: true })
    if (creature === 'vampire') {
      const total = a2ActorVitaeTotal(actor)
      const override = actor.flags?.world?.a2?.hungerOverride
      const hungerAfter = override !== null && override !== undefined && Number.isFinite(Number(override)) ? a2Clamp(a2Int(override), 0, 5) : a2HungerFromVitae(res.vitae, total)
      if (res.rose) parts.push(`rose: Vitae ${vitae} → ${res.vitae}, Hunger ${hungerBefore} → ${hungerAfter}`)
      else if (res.finalDeath) parts.push('Final Death')
      else parts.push(`in torpor${res.vitae !== vitae ? `, Vitae ${vitae} → ${res.vitae}` : ''}`)
      if (res.rose && res.vitae * 2 < total) parts.push('below half Vitae: helpless prey in sight can set off a hunger frenzy (PG p.145)')
    } else if (res.healed) parts.push(`Health ${health.value} → ${res.health.value} (rest)`)
    if (res.wpGain) parts.push(`Willpower ${wpBefore} → ${res.willpower}${e.safe === false ? ' (unsafe rest)' : ''}`)
    // One long-term impairment heals: nightly for a vampire, every 3 or 7 days otherwise (PG p.105).
    if (typeof a2xNightlyRecovery === 'function' && !res.finalDeath) { // eslint-disable-line no-undef
      const rec = await a2xNightlyRecovery(actor, night, { rose: creature !== 'vampire' || Boolean(res.rose) }) // eslint-disable-line no-undef
      if (rec) parts.push(`${rec.label} no longer impaired${rec.left ? ` (${rec.left} still impaired)` : ''}`)
    }
    if (res.health.baneful !== health.baneful) parts.push(`baneful ${health.baneful} → ${res.health.baneful}`)
    parts.push(...res.lines)
  }
  const durations = ['scene', 'night']
  const ended = expire ? (actor.items ?? []).filter((i) => a2tExpires(i, durations)) : []
  if (ended.length) {
    await actor.deleteEmbeddedDocuments('Item', ended.map((i) => i.id))
    parts.push(`ended: ${ended.map((i) => i.name).join(', ')}`)
  }
  const upd = uses ? a2tUsesUpdates(actor.items ?? [], durations) : []
  if (upd.length) { await actor.updateEmbeddedDocuments('Item', upd); parts.push(`${a2Plural(upd.length, 'use', 'uses')} reset`) }
  return `${actor.name}: ${parts.length ? parts.map((x) => String(x).replace(/[.\s]+$/, '')).join('; ') : 'nothing to do'}.`
}

// ---- feeding ------------------------------------------------------------------------
function a2tHerdItems (actor) { return (actor.items ?? []).filter((i) => i.type === 'resource' && /^herd\b/i.test(String(i.name ?? ''))) }
function a2tHerdInfo (actor) {
  const items = a2tHerdItems(actor)
  const dots = items.reduce((t, i) => t + a2Int(i.system?.dots?.value), 0)
  return { items, dots, ...a2tHerdState(actor.flags?.world?.a2?.herd, a2tClock().session, dots) }
}
function a2tStoredBags (actor) {
  const night = a2tClock().night
  return (actor.flags?.world?.a2?.bloodBags ?? []).filter((b) => night - a2Int(b.night) <= 2).reduce((t, b) => t + a2Int(b.count), 0)
}
// The first targeted token, as a feeding source.
function a2tVictim () {
  const token = [...(game.user?.targets ?? [])][0]
  const actor = token?.actor
  if (!actor) return null
  const c = a2Creature(actor)
  const base = { uuid: actor.uuid, name: token.name ?? actor.name, actor }
  if (c === 'vampire') return { ...base, source: 'vampire', available: a2Int(actor.system?.health?.value) }
  if (c === 'animal') return { ...base, source: 'animal', available: null }
  return { ...base, source: 'human', available: a2Int(actor.flags?.world?.a2?.bloodLeft ?? 10) }
}

async function a2tFeed (actorArg = null) {
  if (!a2tReady()) return null
  const actor = a2tPickActor(actorArg)
  if (!actor || actor.type !== 'vampire') { ui.notifications.warn('Select your vampire\'s token, or open the helper from its sheet.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  if (a2Creature(actor) !== 'vampire') { ui.notifications.warn('Only vampires and Duskborn hunt for blood. A ghoul drinks Vitae from its domitor (PG p.102, p.136).'); return null }
  const start = await a2tFeedStartDialog(actor)
  if (!start) return null
  const outcome = await a2tFeedTest(actor, start)
  if (!outcome) return null
  const plan = await a2tFeedApplyDialog(actor, start, outcome)
  if (!plan) return null
  return a2tFeedApply(actor, plan)
}

function a2tFeedStartDialog (actor) {
  const herd = a2tHerdInfo(actor)
  const victim = a2tVictim()
  const masq = a2tMasqNormalize(a2tGet('masquerade'))
  const trigger = a2tHuntTriggerMod(masq.triggers, masq.rank)
  const stored = a2tStoredBags(actor)
  const attrs = Object.keys(WOD6E.configs.Attributes.getList({}))
  const skills = Object.keys(WOD6E.configs.Skills.getList({}))
  const testOpts = (key) => {
    const tests = A2T_APPROACHES[key]?.tests ?? []
    return tests.map(([a, s, why], i) => a2tOpt(String(i), `${a2tTrait('Attributes', a)} + ${a2tTrait('Skills', s)}: ${why}`)).join('') + a2tOpt('custom', 'Another Attribute + Skill (pick below)', !tests.length)
  }
  const content = `<div class="a2t-dialog a2t-feed">
    <p><strong>${a2Esc(actor.name)}</strong>: Vitae ${a2Int(actor.system.health?.value)}/${a2ActorVitaeTotal(actor)}, Hunger ${a2ActorHunger(actor)}.${victim ? ` Target: <strong>${a2Esc(victim.name)}</strong> (${a2Esc(victim.source)}).` : ''}</p>
    <div class="form-group"><label>How</label><select name="method">
      ${a2tOpt('hunt', 'Hunt: roll the hunting test (PG p.142)', true)}
      ${a2tOpt('herd', `Herd: ${herd.dots ? `${herd.left} of ${herd.base + herd.taxed} feedings left this session` : 'no Herd Resource'} (PG p.143)`)}
      ${a2tOpt('attack', 'Feed attack in a physical conflict (PG p.118)')}
      ${a2tOpt('direct', `Feed without a test (roleplayed, willing, animal${stored ? `, ${stored} stored bags` : ''})`)}
    </select></div>
    <div data-a2t-sec="hunt">
      <div class="form-group"><label>Approach</label><select name="approach">${Object.entries(A2T_APPROACHES).map(([k, a]) => a2tOpt(k, a.label, k === 'alleycat')).join('')}</select></div>
      <p class="hint" data-a2t="approachHint">${a2Esc(A2T_APPROACHES.alleycat.hint)}</p>
      <div class="form-group"><label>Test</label><select name="test">${testOpts('alleycat')}</select></div>
      <div class="form-group" data-a2t-sec="custom" hidden><label>Attribute + Skill</label><select name="attr">${attrs.map((k) => a2tOpt(k, a2tTrait('Attributes', k))).join('')}</select><select name="skill">${skills.map((k) => a2tOpt(k, a2tTrait('Skills', k))).join('')}</select></div>
      <fieldset class="a2t-circ"><legend>Hunting circumstances (ST p.21)</legend>${A2T_HUNT_CIRCUMSTANCES.map((c) => `<label><input type="checkbox" name="circ" data-multi value="${c.key}"> ${a2Esc(c.label)} (${a2Signed(c.mod)})</label>`).join('')}</fieldset>
      <div class="form-group"><label>Other modifier</label><input type="number" name="extra" value="${trigger}" step="1"></div>
      ${trigger ? `<p class="hint">Masquerade Tracker story trigger: ${a2Signed(trigger)} included above (ST p.35).</p>` : ''}
      <p class="a2t-preview" data-a2t="diff"></p>
    </div>
    <div data-a2t-sec="herd" hidden>
      <label class="a2t-row"><input type="checkbox" name="tax"> Tax the herd: lose 1 Herd dot for good, feed one more time this session (PG p.143)</label>
    </div>
    <div data-a2t-sec="attack" hidden>
      <label class="a2t-row"><input type="checkbox" name="helpless"> The victim is helpless or willing: no test (PG p.118)</label>
      <p class="hint">Otherwise roll Strength + Fighting with +2 dice against the victim's Strength + Stamina; type its successes into "vs successes" in the roll dialog.</p>
    </div></div>`
  const update = (root) => {
    const d = a2tFormData(root)
    a2tShow(root, '[data-a2t-sec="hunt"]', d.method === 'hunt')
    a2tShow(root, '[data-a2t-sec="herd"]', d.method === 'herd')
    a2tShow(root, '[data-a2t-sec="attack"]', d.method === 'attack')
    a2tShow(root, '[data-a2t-sec="custom"]', d.test === 'custom')
    const diff = a2tHuntDifficulty(d.circ ?? [], d.extra)
    const p = root.querySelector('[data-a2t="diff"]')
    if (p) p.textContent = `Difficulty ${diff}${diff === 0 ? ': no test needed, a basic win (TR1)' : ''}`
  }
  return a2tDialog().prompt({
    window: { title: `Feeding: ${actor.name}` },
    position: { width: 520 },
    content,
    ok: { icon: 'fa-solid fa-droplet', label: 'Continue', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = a2tDialogRoot(dialog)
      if (!root) return
      root.querySelector('[name="approach"]')?.addEventListener('change', (e) => {
        const key = e.target.value
        const sel = root.querySelector('[name="test"]')
        if (sel) sel.innerHTML = testOpts(key)
        const hint = root.querySelector('[data-a2t="approachHint"]')
        if (hint) hint.textContent = A2T_APPROACHES[key]?.hint ?? ''
        update(root)
      })
      root.addEventListener('change', () => update(root))
      update(root)
    }
  })
}

// Rolls (or skips) the test; returns { win, margin, painful, bestial, label, rolled }.
async function a2tFeedTest (actor, start) {
  const auto = (label) => ({ win: true, margin: 0, painful: false, bestial: false, label, rolled: false })
  if (start.method === 'herd') {
    const herd = a2tHerdInfo(actor)
    if (!herd.dots && !start.tax) { ui.notifications.warn(`${actor.name} has no Herd Resource.`); return null }
    if (herd.left < 1 && !start.tax) { ui.notifications.warn('No Herd feedings left this session. Tick "Tax the herd" for one more (PG p.143).'); return null }
    return auto('Herd: a safe feeding, as a won hunt (PG p.143)')
  }
  if (start.method === 'direct') return auto('No test')
  if (start.method === 'attack' && start.helpless) return auto('Helpless or willing victim: automatic win (PG p.118)')
  const RD = a2State.RollDialog
  if (!RD) { ui.notifications.error('The roll dialog is not available.'); return null }
  let test
  let difficulty = 0
  if (start.method === 'attack') {
    test = { attributes: ['strength'], skills: ['fighting'], modifier: { valueSource: 'flat', value: 2, mode: 'add' } }
  } else {
    const tests = A2T_APPROACHES[start.approach]?.tests ?? []
    const pick = start.test === 'custom' || !tests[a2Int(start.test)] ? [start.attr, start.skill] : tests[a2Int(start.test)]
    difficulty = a2tHuntDifficulty(start.circ ?? [], start.extra)
    if (difficulty === 0) return auto('Difficulty 0: a basic win without a test (TR1)')
    test = { attributes: [pick[0]], skills: [pick[1]], difficulty }
  }
  if (typeof a2uHint === 'function') a2uHint(actor, { hunt: true }) // eslint-disable-line no-undef
  const roll = await RD.open({ actor, test })
  if (!roll) return null
  const v = roll.a2Verdict ?? roll.result?.a2 ?? null
  const successes = a2Int(v?.successes ?? roll.total)
  return {
    win: v ? v.win : successes > 0,
    margin: v?.margin ?? null,
    successes,
    painful: Boolean(v?.painful),
    bestial: Boolean(v?.bestial),
    label: v?.label ?? `${successes} successes`,
    difficulty,
    rolled: true
  }
}

function a2tFeedApplyDialog (actor, start, outcome) {
  const missing = Math.max(0, a2ActorVitaeTotal(actor) - a2Int(actor.system.health?.value))
  const g = a2ActorGenMod(actor)
  const path = a2PathInfo(actor)
  const onPath = path.kind === 'path'
  const pathViolations = onPath ? (path.item?.flags?.world?.a2?.violations ?? []).map((v) => v.text).filter(Boolean) : []
  const victim = a2tVictim()
  const stored = a2tStoredBags(actor)
  const attack = start.method === 'attack'
  const s = actor.system?.attributes ?? {}
  const str = a2Int(s.strength?.effective ?? s.strength?.value)
  const sta = a2Int(s.stamina?.effective ?? s.stamina?.value)
  const failed = outcome.win === false
  let source = victim?.source ?? 'human'
  if (!attack && start.method === 'hunt' && start.approach === 'bagger') source = 'bag'
  if (start.method === 'herd') source = 'human'
  const bagsDefault = source === 'bag' ? 1 + Math.max(0, a2Int(outcome.margin)) : 1
  const avail = victim && victim.source === source ? victim.available : null
  const sources = [['human', 'Human (10 Vitae when healthy)'], ['animal', 'Animal'], ['bag', 'Blood bags (1 Vitae each)'], ['vampire', 'Vampire'], ['other', 'Other (Storyteller\'s amount)']]
  if (stored) sources.splice(3, 0, ['stored', `Stored blood bags (${stored})`])
  const outcomeText = outcome.rolled ? `${outcome.label}${outcome.margin !== null && outcome.margin !== undefined ? `, margin ${a2Signed(outcome.margin)}` : ''}` : outcome.label
  const content = `<div class="a2t-dialog a2t-feed2">
    <p><strong>${a2Esc(outcomeText)}</strong>. ${a2Esc(actor.name)} is missing ${missing} Vitae.</p>
    ${outcome.painful ? '<p class="a2t-warn">Painful failure: no feeding, you draw attention to yourself, and a complication follows (PG p.142).</p>' : ''}
    ${failed && !outcome.painful ? `<div class="form-group"><label>Failed hunt</label><select name="choice">${a2tOpt('without', 'Go without', true)}${a2tOpt('feed', 'Feed anyway and accept a Storyteller complication (PG p.142)')}</select></div>` : ''}
    ${attack && outcome.rolled ? `<label class="a2t-row"><input type="checkbox" name="won"${outcome.win !== false ? ' checked' : ''}> The feed attack won</label>
      <div class="form-group"><label>Margin</label><input type="number" name="margin" value="${Math.max(0, a2Int(outcome.margin ?? outcome.successes))}" min="0" step="1"></div>` : ''}
    <div class="form-group"><label>Source</label><select name="source">${sources.map(([k, l]) => a2tOpt(k, l, k === source)).join('')}</select></div>
    <div class="form-group" data-a2t-src="animal"><label>Animal size</label><select name="size">${Object.entries(A2T_ANIMALS).map(([k, a]) => a2tOpt(k, `${a.label}: ${a.vitae}`, k === 'medium')).join('')}</select></div>
    <div class="form-group" data-a2t-src="human vampire other"><label>Its Vitae now</label><input type="number" name="available" value="${avail ?? (source === 'vampire' ? 0 : 10)}" min="0" step="1"></div>
    <div class="form-group" data-a2t-src="bag stored"><label>Bags</label><input type="number" name="bags" value="${source === 'stored' ? stored : bagsDefault}" min="0" step="1"></div>
    <div class="form-group"><label>Vitae to drink</label><input type="number" name="drink" value="0" min="0" step="1"></div>
    <label class="a2t-row" data-a2t-src="bag"><input type="checkbox" name="keepBags" checked> Keep the bags you can't drink now (fresh for a couple of nights)</label>
    ${attack ? `<div class="form-group"><label>Bite</label><select name="option">${a2tOpt('none', 'Normal: half Strength damage', true)}${a2tOpt('gentle', 'Gentle Feed: less damage, by up to the margin')}${a2tOpt('tear', 'Tear Throat: + margin damage')}</select></div>
      <label class="a2t-row"><input type="checkbox" name="willing"${start.helpless ? ' checked' : ''}> Willing victim (1 damage)</label>` : ''}
    ${onPath ? `<div class="form-group"><label>${a2Esc(path.name)} violation</label><select name="pathViolation">${a2tOpt('', 'None: this act breaks none of the Path\'s violations (TR31)', true)}${pathViolations.map((t) => a2tOpt(t, t)).join('')}</select></div>
      <div class="form-group"><label>Slashes</label><input type="number" name="pathSlashes" value="1" min="1" max="3" step="1"></div>` : ''}
    <div class="form-group"><label>Violations to mark</label><input type="number" name="violations" value="0" min="0" max="3" step="1"></div>
    <div class="a2t-preview" data-a2t="preview"></div></div>`
  const read = (root) => {
    const d = a2tFormData(root)
    const feeding = !outcome.painful && (!failed || d.choice === 'feed') && (!attack || !outcome.rolled || d.won)
    const src = d.source
    const plan = a2tFeedPlan({
      source: src,
      drink: src === 'bag' || src === 'stored' ? Math.min(a2Int(d.bags), d.drink === null ? a2Int(d.bags) : a2Int(d.drink)) : d.drink,
      available: src === 'bag' || src === 'stored' ? a2Int(d.bags) : src === 'animal' ? A2T_ANIMALS[d.size]?.vitae : d.available,
      missing,
      g,
      size: d.size,
      path: onPath,
      pathViolation: Boolean(d.pathViolation),
      pathSlashes: d.pathSlashes ?? 1,
      attack: attack ? { perAttack: Math.max(str, sta) } : null
    })
    return { d, feeding, plan }
  }
  let touched = false
  const update = (root, setDrink = false) => {
    const { d, feeding } = read(root)
    root.querySelectorAll('[data-a2t-src]').forEach((el) => { if (el.dataset.a2tSrc.split(' ').includes(d.source)) el.removeAttribute('hidden'); else el.setAttribute('hidden', '') })
    const drinkEl = root.querySelector('[name="drink"]')
    if (setDrink && drinkEl && !touched) {
      let def = 0
      if (feeding) {
        if (d.source === 'human') def = attack ? Math.min(missing, Math.max(str, sta)) : Math.min(missing, Math.max(0, a2Int(d.available) - 7))
        else if (d.source === 'animal') def = Math.min(missing, Math.floor((A2T_ANIMALS[d.size]?.vitae ?? 3) / 2))
        else if (d.source === 'bag' || d.source === 'stored') def = Math.min(missing, a2Int(d.bags))
        else def = Math.min(missing, a2Int(d.available))
        if (attack) def = Math.min(def, Math.max(str, sta))
      }
      drinkEl.value = String(def)
      drinkEl.setAttribute('value', String(def))
    }
    const { plan: p2 } = read(root)
    const vEl = root.querySelector('[name="violations"]')
    if (vEl && !vEl.dataset.touched) { vEl.value = String(feeding ? p2.violations : 0); vEl.setAttribute('value', vEl.value) }
    const out = root.querySelector('[data-a2t="preview"]')
    if (!out) return
    if (!feeding) { out.textContent = 'No feeding.'; return }
    if (p2.blocked) { out.innerHTML = `<span class="a2t-err">${a2Esc(p2.blocked)}</span>`; return }
    const vit = a2Int(actor.system.health?.value)
    const after = vit + p2.gained
    const dmg = attack ? a2tFeedAttackDamage(str, d.margin, d.option, d.willing) : 0
    out.innerHTML = `Gain ${p2.gained} Vitae: ${vit} → ${after}, Hunger ${a2ActorHunger(actor)} → ${a2HungerFromVitae(after, a2ActorVitaeTotal(actor))}.` +
      (p2.left !== null && d.source !== 'other' ? ` The source is left with ${p2.left}.` : '') +
      (dmg ? ` The bite deals ${dmg} damage.` : '') +
      (p2.violations ? ` ${a2Plural(p2.violations, 'violation', 'violations')} suggested.` : '') +
      (p2.willpower ? ' +1 Willpower.' : '')
  }
  return a2tDialog().prompt({
    window: { title: `Feeding: ${actor.name}` },
    position: { width: 520 },
    content,
    ok: {
      icon: 'fa-solid fa-droplet',
      label: 'Apply',
      callback: (ev, button) => {
        const { d, feeding, plan } = read(button.form)
        return { start, outcome, d, feeding, plan, missing, attack, str, victim, onPath, path: path.name }
      }
    },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = a2tDialogRoot(dialog)
      if (!root) return
      root.querySelector('[name="drink"]')?.addEventListener('input', () => { touched = true })
      root.querySelector('[name="violations"]')?.addEventListener('input', (e) => { e.target.dataset.touched = '1' })
      root.addEventListener('change', (e) => {
        const reset = ['source', 'size', 'available', 'bags', 'choice', 'won'].includes(e.target?.getAttribute?.('name'))
        if (reset) touched = false
        update(root, reset)
      })
      update(root, true)
    }
  })
}

// res: what a2tFeedApplyDialog returned.
async function a2tFeedApply (actor, res) {
  const { start, outcome, d, feeding, plan, attack, victim } = res
  if (feeding && plan.blocked) { ui.notifications.warn(plan.blocked); return null }
  const lines = []
  const vitae = a2Int(actor.system.health?.value)
  const hungerBefore = a2ActorHunger(actor)
  const wp = a2Int(actor.system.willpower?.value)
  const upd = {}
  const how = start.method === 'hunt' ? `Hunt (${A2T_APPROACHES[start.approach]?.label ?? start.approach})` : start.method === 'herd' ? 'Herd' : start.method === 'attack' ? 'Feed attack' : 'Feeding'
  lines.push(`${how}: ${outcome.rolled ? `${outcome.label}${outcome.margin !== null && outcome.margin !== undefined ? `, margin ${a2Signed(outcome.margin)}` : ''}` : outcome.label}.`)
  let masq = null
  if (outcome.painful) { lines.push('Painful failure: no feeding, you draw attention to yourself, and a complication follows (PG p.142).'); masq = 'painful failure while hunting' }
  if (outcome.bestial) { lines.push('Bestial failure: the Storyteller may pick a Masquerade breach (PG p.103).'); masq ??= 'bestial failure while hunting' }
  if (attack && outcome.rolled && !d.won) lines.push('The feed attack lost: no bite, no Vitae (PG p.118).')
  else if (outcome.win === false && !outcome.painful) lines.push(feeding ? 'Failed hunt: fed anyway, the Storyteller adds a complication (PG p.142).' : 'Failed hunt: went without (PG p.142).')
  if (start.method === 'herd') {
    const herd = a2tHerdInfo(actor)
    const next = { session: herd.session, base: herd.base, used: herd.used + 1, taxed: herd.taxed + (start.tax ? 1 : 0) }
    upd['flags.world.a2.herd'] = next
    if (start.tax) {
      const item = [...herd.items].sort((a, b) => a2Int(b.system?.dots?.value) - a2Int(a.system?.dots?.value))[0]
      if (item && a2Int(item.system?.dots?.value) > 0) {
        await item.update({ 'system.dots.value': a2Int(item.system.dots.value) - 1 })
        lines.push(`Taxed the herd: ${item.name} drops to ${a2Int(item.system.dots.value)} dots for good (PG p.143).`)
      }
    }
    lines.push(`Herd: ${Math.max(0, next.base + next.taxed - next.used)} feedings left this session.`)
  }
  let gained = 0
  if (feeding) {
    gained = plan.gained
    const after = Math.min(a2ActorVitaeTotal(actor), vitae + gained)
    if (after !== vitae) upd['system.health.value'] = after
    if (plan.willpower) upd['system.willpower.value'] = Math.min(a2Int(actor.system.willpower?.max), wp + plan.willpower)
    const srcLabel = plan.source === 'animal' ? `an animal (${A2T_ANIMALS[d.size]?.label ?? d.size})` : plan.source === 'bag' ? 'blood bags' : plan.source === 'stored' ? 'stored blood bags' : plan.source === 'vampire' ? (victim?.name ?? 'a vampire') : plan.source === 'other' ? 'another source' : (victim?.name ?? 'a human')
    lines.push(`Drank ${plan.drink} Vitae from ${srcLabel}: Vitae ${vitae} → ${after}, Hunger ${hungerBefore} → ${a2HungerFromVitae(after, a2ActorVitaeTotal(actor))}.`)
    if (plan.willpower) lines.push(`Willpower ${wp} → ${upd['system.willpower.value']}.`)
    if (a2HungerFromVitae(after, a2ActorVitaeTotal(actor)) <= 1 && hungerBefore > 1) lines.push('Down to 1 Hunger die or fewer: a hunger frenzy, if any, ends (PG p.145).')
    lines.push(...plan.notes)
    if (plan.killed) masq ??= 'a kill while feeding'
    if (start.method === 'hunt' && start.approach === 'consensualist' && start.test === '2') lines.push('Telling the truth puts the Masquerade at risk (PG p.142).')
    // Bags
    if (plan.source === 'stored') upd['flags.world.a2.bloodBags'] = a2tTakeBags(actor, plan.drink)
    else if (plan.source === 'bag' && d.keepBags && plan.left > 0) {
      upd['flags.world.a2.bloodBags'] = [...(actor.flags?.world?.a2?.bloodBags ?? []), { count: plan.left, night: a2tClock().night }]
      lines.push(`Kept ${a2Plural(plan.left, 'blood bag', 'blood bags')} for later.`)
    }
    if (actor.flags?.world?.a2?.torpor && gained > 0) lines.push('Fed in torpor: Stamina + Resolve vs 2 + generation modifier to rise (PG p.140).')
    if ((actor.items ?? []).some((i) => i.type === 'clan' && /ventrue/i.test(i.name ?? ''))) lines.push('Ventrue: Rarefied Palate limits which blood nourishes you; no animal blood (PG p.90-91).')
  }
  if (Object.keys(upd).length) await actor.update(upd)
  // Victim
  if (feeding && victim?.uuid) {
    const data = { uuid: victim.uuid }
    if (plan.source === 'vampire') data.vitaeLoss = plan.drink
    else if (plan.source === 'human') data.bloodLeft = plan.left
    if (attack) {
      data.damage = a2tFeedAttackDamage(res.str, d.margin, d.option, d.willing)
      lines.push(`The bite deals ${data.damage} damage to ${victim.name} (PG p.118).`)
    }
    if (data.vitaeLoss || data.damage || (data.bloodLeft !== undefined && data.bloodLeft !== null)) await a2tVictimUpdate(data)
  }
  // Violations: Humanity per PG p.144 / TR30; Path walkers only on a match (TR31).
  const n = feeding ? a2Clamp(a2Int(d.violations), 0, 3) : 0
  if (n && a2Rules(actor)?.humanity) {
    const before = a2ActorHumanity(actor)
    const r = await a2Violate(actor, n)
    lines.push(`${res.path}: ${a2Plural(n, 'violation', 'violations')}${d.pathViolation ? ` (${d.pathViolation})` : ''}, rank ${before.rank} → ${r?.rank ?? before.rank}.`)
  } else if (feeding && res.onPath && plan.source === 'human' && (plan.killed || plan.endangered) && !n) {
    lines.push(`${res.path}: no violation unless the act matches one of the Path's own violations (TR31).`)
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: a2tWhisper(actor),
    content: a2tCard(`${actor.name}: feeding`, lines),
    flags: { world: { a2t: { kind: 'feed', masq } } }
  })
  return { gained, violations: n, lines }
}
function a2tTakeBags (actor, n) {
  const night = a2tClock().night
  let left = a2Int(n)
  const out = []
  for (const b of (actor.flags?.world?.a2?.bloodBags ?? []).filter((x) => night - a2Int(x.night) <= 2).sort((a, b) => a2Int(a.night) - a2Int(b.night))) {
    const take = Math.min(left, a2Int(b.count))
    left -= take
    if (a2Int(b.count) - take > 0) out.push({ ...b, count: a2Int(b.count) - take })
  }
  return out
}

// ---- Masquerade Tracker ------------------------------------------------------------
function a2tMasqState () { return a2tMasqNormalize(a2tGet('masquerade')) }
async function a2tMasqChange (delta = 0, reason = '', { set = null } = {}) {
  if (!a2tReady(true)) return null
  const before = a2tMasqState()
  const to = set === null || set === undefined ? a2Clamp(before.rank + a2Int(delta), 0, 10) : a2Clamp(a2Int(set), 0, 10)
  if (to === before.rank) { ui.notifications.info(`The Masquerade Tracker stays at ${to}.`); return to }
  await a2tSet('masquerade', a2tMasqApply(before, to, reason, game.user.name, new Date().toISOString()))
  const lvA = a2tMasqLevel(before.rank)
  const lvB = a2tMasqLevel(to)
  const lines = [`${before.rank} → ${to} (${a2Signed(to - before.rank)})${reason ? `: ${reason}` : ''}.`, `${lvB.name}${lvA.name !== lvB.name ? ' (new level)' : ''}: ${lvB.effect} (ST p.35)`]
  const fresh = before.triggers.filter((t) => a2Int(t.rank) > Math.min(before.rank, to) && a2Int(t.rank) <= Math.max(before.rank, to))
  for (const t of fresh) lines.push(`Story trigger at ${t.rank} ${to > before.rank ? 'now active' : 'no longer active'}: ${t.text}`)
  await ChatMessage.create({ whisper: a2tGMs(), content: a2tCard('Masquerade Tracker', lines), flags: { world: { a2t: { kind: 'masquerade' } } } })
  return to
}

async function a2tMasqPrompt (dir = 1, setTo = null) {
  if (!a2tReady(true)) return null
  const s = a2tMasqState()
  const marking = setTo === null ? dir > 0 : setTo > s.rank
  const reasons = marking
    ? ['A vampire threatened the Masquerade and someone witnessed or recorded it (ST p.34)', 'A bestial failure or Beast\'s Bargain (PG p.98, p.103)', 'Greater exposure (ST p.34)', 'Looking undead without Blush of Life (ST p.34)']
    : ['Letting the dust settle: lying low while something distracted mortals (ST p.34)', 'Cover-up in play (ST p.34)', 'Erasing tracks: downtime, 3 dots of one Resource or 4 from several per box (PG p.113, TR47)', 'Time has passed (ST p.34)']
  const content = `<div class="a2t-dialog">
    ${setTo === null ? `<div class="form-group"><label>${marking ? 'Mark' : 'Erase'} boxes</label><input type="number" name="n" value="1" min="1" max="10" step="1"></div>` : `<p>Set the tracker from ${s.rank} to <strong>${setTo}</strong>.</p>`}
    <div class="form-group"><label>Why</label><select name="why">${reasons.map((r, i) => a2tOpt(r, r, i === 0)).join('')}${a2tOpt('', 'Other (write it below)')}</select></div>
    <div class="form-group"><label>Details</label><input type="text" name="reason" value="" placeholder="What happened"></div></div>`
  const r = await a2tDialog().prompt({
    window: { title: 'Masquerade Tracker' },
    content,
    ok: { label: setTo === null ? (marking ? 'Mark' : 'Erase') : 'Set', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false
  })
  if (!r) return null
  const reason = [r.why, r.reason].filter((x) => String(x ?? '').trim()).join(': ')
  if (setTo !== null) return a2tMasqChange(0, reason, { set: setTo })
  return a2tMasqChange((marking ? 1 : -1) * Math.max(1, a2Int(r.n, 1)), reason)
}

async function a2tMasqEditTriggers () {
  if (!a2tReady(true)) return null
  const s = a2tMasqState()
  const text = s.triggers.map((t) => `${t.rank}: ${t.text}`).join('\n')
  const r = await a2tDialog().prompt({
    window: { title: 'Masquerade story triggers' },
    content: `<div class="a2t-dialog"><p class="hint">One per line, "rank: what happens", for example "4: Hunting tests: Difficulty +2" or "6: A hunter patrol every night" (ST p.35). Hunting lines with "Difficulty +N" go into the feeding helper.</p><textarea name="triggers" rows="8">${a2Esc(text)}</textarea></div>`,
    ok: { label: 'Save', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false
  })
  if (!r) return null
  const next = { ...a2tMasqState(), triggers: a2tParseTriggers(r.triggers) }
  await a2tSet('masquerade', next)
  return next.triggers
}

// Optional Masquerade threat test, ST p.37: a pool of the marked boxes, 6+ succeeds, 10 counts 2.
async function a2tThreatTest () {
  if (!a2tReady(true)) return null
  const rank = a2tMasqState().rank
  let roll = null
  let successes = 0
  if (rank > 0) {
    roll = await new Roll(`${rank}d10`).evaluate()
    successes = a2CountSuccesses((roll.dice ?? []).flatMap((d) => (d.results ?? []).filter((x) => x.active !== false).map((x) => x.result)))
  }
  await ChatMessage.create({
    whisper: a2tGMs(),
    rolls: roll ? [roll] : [],
    content: a2tCard('Masquerade threat test', [`Pool ${rank} (the tracker rank): ${a2Plural(successes, 'success', 'successes')}.`, a2tThreatReaction(successes) + ' (ST p.37)']),
    flags: { world: { a2t: { kind: 'threat' } } }
  })
  return successes
}

function a2tMasqHTML () {
  const s = a2tMasqState()
  const lv = a2tMasqLevel(s.rank)
  const gm = Boolean(game.user?.isGM)
  const boxes = Array.from({ length: 10 }, (_, i) => `<button type="button" class="a2t-masq-box${i < s.rank ? ' on' : ''}"${gm ? ` data-action="a2tSet" data-rank="${i + 1 === s.rank ? i : i + 1}" title="Set the tracker to ${i + 1 === s.rank ? i : i + 1}"` : ' disabled'}></button>`).join('')
  const active = a2tActiveTriggers(s.triggers, s.rank)
  let html = `<div class="a2t-masq-boxes">${boxes}</div>
    <div class="a2t-masq-level"><strong>${s.rank} · ${a2Esc(lv.name)}</strong></div>
    <p class="a2t-masq-effect">${a2Esc(lv.effect)}</p>`
  if (!gm) return html
  html += `<div class="a2t-masq-buttons">
      <button type="button" data-action="a2tMark"><i class="fa-solid fa-plus"></i> Mark</button>
      <button type="button" data-action="a2tClear"><i class="fa-solid fa-minus"></i> Erase</button>
      <button type="button" data-action="a2tThreat" title="Optional rule: roll a pool equal to the rank (ST p.37)"><i class="fa-solid fa-dice-d10"></i> Threat test</button>
      <button type="button" data-action="a2tTriggers" title="Story triggers per rank (ST p.35)"><i class="fa-solid fa-list"></i> Triggers</button></div>
    ${active.length ? `<div class="a2t-masq-trig"><strong>Active story triggers</strong><ul>${active.map((t) => `<li>${t.rank}: ${a2Esc(t.text)}</li>`).join('')}</ul></div>` : ''}
    <details><summary>Marking and clearing (ST p.34)</summary><ul class="a2t-masq-help">
      <li>Mark a box each time a vampire threatens the Masquerade and it is witnessed or recorded; more for greater exposure.</li>
      <li>Letting the dust settle: at the start of a session in which the PCs lie low, −1 if something distracted mortals.</li>
      <li>Cover-ups: −1 or more for effective, risky work in play.</li>
      <li>Erasing tracks: a downtime action, 3 dots of one Resource or 4 from several per box (PG p.113, TR47).</li></ul></details>
    ${s.log.length ? `<ol class="a2t-masq-log" reversed>${s.log.slice(-10).reverse().map((l) => `<li>${a2Esc(`${l.from} → ${l.to}${l.reason ? `: ${l.reason}` : ''}`)} <span class="a2t-sub">${a2Esc(l.at ? new Date(l.at).toLocaleString() : '')}</span></li>`).join('')}</ol>` : ''}`
  return html
}

function a2tMasqAppClass () {
  if (a2tState.MasqApp) return a2tState.MasqApp
  const { ApplicationV2 } = foundry.applications.api
  class A2tMasqueradeTracker extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: 'v6a2-masquerade-tracker',
      classes: ['wod6e', 'a2t-masq-app'],
      window: { title: 'Masquerade Tracker', icon: 'fa-solid fa-mask', resizable: true },
      position: { width: 380, height: 'auto' },
      actions: {
        a2tMark: function () { a2tMasqPrompt(1) },
        a2tClear: function () { a2tMasqPrompt(-1) },
        a2tSet: function (event, target) { a2tMasqPrompt(0, a2Int(target?.dataset?.rank)) },
        a2tThreat: function () { a2tThreatTest() },
        a2tTriggers: function () { a2tMasqEditTriggers() }
      }
    }

    async _renderHTML () {
      const el = document.createElement('div')
      el.className = 'a2t-masq'
      el.innerHTML = a2tMasqHTML()
      return el
    }

    _replaceHTML (result, content) { content.replaceChildren(result) }
  }
  a2tState.MasqApp = A2tMasqueradeTracker
  return A2tMasqueradeTracker
}
function a2tMasqOpen () {
  if (!a2tReady()) return null
  if (!game.user?.isGM && !a2tGet('masqueradePlayers')) { ui.notifications.warn('The Masquerade Tracker is for the Storyteller.'); return null }
  const Cls = a2tMasqAppClass()
  a2tState.masqApp ??= new Cls()
  a2tState.masqApp.render({ force: true })
  return a2tState.masqApp
}

// ---- XP award ---------------------------------------------------------------------------
function a2tXp (actor) { return a2tXpNormalize(actor?.flags?.world?.a2?.xp) }
function a2tAwardCandidates () { return [...(game.actors ?? [])].filter((a) => a.type === 'vampire' && a.hasPlayerOwner).sort((a, b) => String(a.name).localeCompare(String(b.name))) }

async function a2tAwardXP () {
  if (!a2tReady(true)) return null
  const list = a2tAwardCandidates()
  if (!list.length) { ui.notifications.info('No player characters to award.'); return null }
  const clock = a2tClock()
  const head = `<tr><th>Character</th>${A2T_XP_CONDITIONS.map(([k, l, h]) => `<th class="c" title="${a2Esc(h)} (PG p.64)">${a2Esc(l)}</th>`).join('')}<th class="c" title="Diablerie: 10 × the victim's generation modifier, outside the 5 XP cap (PG p.64-66)">Diablerie</th></tr>`
  const rows = list.map((a, i) => {
    const x = a2tXp(a)
    const already = x.session.n === clock.session ? x.session.awarded : 0
    return `<tr><td>${a2Esc(a.name)}<br><span class="a2t-sub">${x.available} XP${already ? `, ${already} already this session` : ''}</span></td>${A2T_XP_CONDITIONS.map(([k]) => `<td class="c"><input type="checkbox" name="c${i}" data-multi value="${k}"${k === 'survival' ? ' checked' : ''}></td>`).join('')}<td class="c"><input type="number" name="d${i}" value="0" min="0" step="1" class="a2t-num"></td></tr>`
  }).join('')
  const content = `<div class="a2t-dialog a2t-xp">
    <p>End of session ${clock.session}: 1 XP per condition, at most ${A2T_XP_CAP} per session; diablerie XP is the only exception (PG p.64).</p>
    <div class="form-group"><label>Mode</label><select name="mode">${a2tOpt('each', 'Per character', true)}${a2tOpt('same', 'Same XP for everyone (PG p.64)')}</select><input type="number" name="same" value="3" min="1" max="5" step="1" class="a2t-num" data-a2t-sec="same" hidden></div>
    <div class="a2t-scroll"><table class="a2t-table">${head}${rows}</table></div>
    <label class="a2t-row"><input type="checkbox" name="close" checked> Close session ${clock.session}: Herd feedings and per-session uses start again</label></div>`
  const r = await a2tDialog().prompt({
    window: { title: 'Award XP' },
    position: { width: 640 },
    content,
    ok: { icon: 'fa-solid fa-star', label: 'Award', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = a2tDialogRoot(dialog)
      root?.addEventListener('change', () => a2tShow(root, '[data-a2t-sec="same"]', a2tFormData(root).mode === 'same'))
    }
  })
  if (!r) return null
  const same = r.mode === 'same' ? r.same : null
  const rows2 = list.map((actor, i) => ({ actor, checks: r[`c${i}`] ?? [], same, diablerie: r[`d${i}`] ?? 0 }))
  return a2tAwardApply(rows2, { close: r.close })
}

async function a2tAwardApply (rows = [], { close = true } = {}) {
  if (!game.user?.isGM) return null
  const clock = a2tClock()
  const lines = []
  const at = new Date().toISOString()
  for (const row of rows) {
    const actor = row.actor
    const x = a2tXp(actor)
    const already = x.session.n === clock.session ? x.session.awarded : 0
    const res = a2tXpAward({ checks: row.checks, same: row.same, already, diablerie: row.diablerie })
    if (!res.total) { lines.push(`${actor.name}: no XP${res.capped ? ' (already at the 5 XP cap this session)' : ''}.`); continue }
    x.earned += res.total
    x.session = { n: clock.session, awarded: already + res.award }
    const why = row.same !== null && row.same !== undefined ? ['group award'] : A2T_XP_CONDITIONS.filter(([k]) => (row.checks ?? []).includes(k)).map(([, l]) => l)
    x.log.push({ at, type: 'award', session: clock.session, xp: res.award, diablerie: res.diablerie, why, by: game.user.name })
    await actor.update({ 'flags.world.a2.xp': a2tXpSave(x) })
    lines.push(`${actor.name}: +${res.award}${why.length && res.award ? ` (${why.join(', ')})` : ''}${res.diablerie ? `, +${res.diablerie} for diablerie` : ''}${res.capped ? ', capped at 5' : ''}. Now ${x.earned - x.spent} XP to spend.`)
  }
  await ChatMessage.create({ content: a2tCard(`Experience, session ${clock.session}`, [...lines, 'Spend XP between sessions, never mid-session (PG p.64).']), flags: { world: { a2t: { kind: 'xp', session: clock.session } } } })
  if (close) await a2tCloseSession()
  return lines
}

async function a2tCloseSession () {
  if (!game.user?.isGM) return null
  const clock = a2tClock()
  await a2tSet('clock', { ...clock, session: clock.session + 1 })
  for (const actor of a2tAllActors()) {
    const upd = a2tUsesUpdates(actor.items ?? [], ['session'])
    if (upd.length) await actor.updateEmbeddedDocuments('Item', upd)
  }
  Hooks.callAll('v6a2EndSession', { session: clock.session })
  return clock.session + 1
}

// ---- XP spend ------------------------------------------------------------------------
function a2tWorldItems (types) {
  const t = Array.isArray(types) ? types : [types]
  const byName = new Map()
  const inRules = (item) => { let f = item.folder; for (let i = 0; f && i < 8; i++) { if (/v6 rules/i.test(f.name ?? '')) return true; f = f.folder } return false }
  for (const item of game.items ?? []) {
    if (!t.includes(item.type)) continue
    const prev = byName.get(item.name)
    if (!prev || (!inRules(prev) && inRules(item))) byName.set(item.name, item)
  }
  return [...byName.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)))
}
function a2tIsRitual (item) {
  if (item?.flags?.world?.a2?.ritual) return true
  let f = item?.folder
  for (let i = 0; f && i < 8; i++) { if (/ritual|ceremon/i.test(f.name ?? '')) return true; f = f.folder }
  return false
}
function a2tClanName (actor) { return actor.items?.find?.((i) => i.type === 'clan')?.name ?? actor.system?.vampire?.clan?.name ?? '' }
function a2tClanDisciplines (actor) { return new Set([...(actor.items?.find?.((i) => i.type === 'clan')?.system?.disciplines ?? [])]) }
function a2tOwnsNamed (actor, item) { return (actor.items ?? []).some((i) => i.type === item.type && i.name === item.name) }
function a2tItemPrereqErrors (actor, item) {
  const errors = []
  const pre = item?.system?.prerequisites
  const discs = actor.system?.vampire?.disciplines ?? {}
  for (const req of pre?.disciplineRequirements ?? []) {
    const opts = (req.options ?? []).filter((o) => o.discipline)
    if (opts.length && !opts.some((o) => a2Int(discs[o.discipline]?.value) >= a2Int(o.dots, 1))) {
      errors.push(`Needs ${opts.map((o) => `${a2tTrait('Disciplines', o.discipline)} ${a2Int(o.dots, 1)}`).join(' or ')}.`)
    }
  }
  const tier = a2tActorTier(actor)
  if (pre?.generationTier === 'duskborn' && a2Creature(actor) !== 'vampire') errors.push('Needs a Duskborn or vampire.')
  if (pre?.generationTier === 'neonate' && (a2Creature(actor) !== 'vampire' || tier.key === 'duskborn')) errors.push('Needs a vampire (not Duskborn).')
  return errors
}

// Options for the "What" list of each kind.
function a2tSpendOptions (actor, kind) {
  const s = actor.system ?? {}
  const clanDiscs = a2tClanDisciplines(actor)
  const clan = a2tClanName(actor).toLowerCase()
  switch (kind) {
    case 'attribute': return Object.keys(WOD6E.configs.Attributes.getList({})).map((k) => ({ value: k, label: `${a2tTrait('Attributes', k)} ${a2Int(s.attributes?.[k]?.value)} → ${a2Int(s.attributes?.[k]?.value) + 1}` }))
    case 'skill':
    case 'specialty': return Object.keys(WOD6E.configs.Skills.getList({})).map((k) => ({ value: k, label: kind === 'skill' ? `${a2tTrait('Skills', k)} ${a2Int(s.skills?.[k]?.value)} → ${a2Int(s.skills?.[k]?.value) + 1}` : `${a2tTrait('Skills', k)} (${a2Int(s.skills?.[k]?.value)})${(s.skills?.[k]?.focuses ?? []).length ? `: ${s.skills[k].focuses.join(', ')}` : ''}` }))
    case 'discipline': return Object.keys(WOD6E.configs.Disciplines.getList({})).map((k) => {
      const v = a2Int(s.vampire?.disciplines?.[k]?.value)
      return { value: k, label: `${a2tTrait('Disciplines', k)} ${v} → ${v + 1}${clanDiscs.has(k) ? ' (clan)' : ''}` }
    })
    case 'merit': return a2tWorldItems('merit').filter((i) => !a2tOwnsNamed(actor, i)).map((i) => ({ value: i.id, label: i.name }))
    case 'clanTrait': return a2tWorldItems('clanTrait').filter((i) => !a2tOwnsNamed(actor, i)).map((i) => ({ value: i.id, label: `${i.name}${String(i.flags?.world?.a2?.clan ?? '').toLowerCase() === clan && clan ? ' (clan)' : i.flags?.world?.a2?.clan ? ` (${i.flags.world.a2.clan})` : ''}` }))
    case 'power':
    case 'ritual': return a2tWorldItems('discipline').filter((i) => a2tIsRitual(i) === (kind === 'ritual') && !a2tOwnsNamed(actor, i)).filter((i) => a2Int(s.vampire?.disciplines?.[i.system?.disciplineType]?.value) >= 1)
      .map((i) => ({ value: i.id, label: `${i.name} (${a2tTrait('Disciplines', i.system?.disciplineType)} ${a2Int(i.system?.level)})` }))
    case 'humanity': { const h = a2ActorHumanity(actor); return [{ value: 'rank', label: `${a2PathInfo(actor).name} ${h.rank} → ${h.rank + 1}` }] }
  }
  return []
}

// Everything a purchase needs, checked; p = { kind, target, text, freePower, costOverride, override }.
function a2tSpendEvaluate (actor, p = {}) {
  const s = actor.system ?? {}
  const tier = a2tActorTier(actor)
  const x = a2tXp(actor)
  const base = { kind: p.kind, creature: a2Creature(actor), maxDots: tier.maxDots, maxDiscipline: tier.maxDiscipline, available: x.available, costOverride: game.user?.isGM ? p.costOverride : null }
  let check
  let item = null
  let label = ''
  switch (p.kind) {
    case 'attribute':
      check = a2tPurchaseCheck({ ...base, current: s.attributes?.[p.target]?.value })
      label = `${a2tTrait('Attributes', p.target)} ${a2Int(s.attributes?.[p.target]?.value) + 1}`
      break
    case 'skill':
      check = a2tPurchaseCheck({ ...base, current: s.skills?.[p.target]?.value })
      label = `${a2tTrait('Skills', p.target)} ${a2Int(s.skills?.[p.target]?.value) + 1}`
      break
    case 'specialty': {
      const list = s.skills?.[p.target]?.focuses ?? []
      const text = String(p.text ?? '').trim()
      check = a2tPurchaseCheck({ ...base, current: s.skills?.[p.target]?.value, text, duplicate: list.some((f) => f.toLowerCase() === text.toLowerCase()) })
      label = `${a2tTrait('Skills', p.target)} specialty: ${text}`
      break
    }
    case 'discipline': {
      const inClan = a2tClanDisciplines(actor).has(p.target)
      check = a2tPurchaseCheck({ ...base, current: s.vampire?.disciplines?.[p.target]?.value, inClan })
      label = `${a2tTrait('Disciplines', p.target)} ${a2Int(s.vampire?.disciplines?.[p.target]?.value) + 1}${inClan ? '' : ' (other clan)'}`
      if (p.freePower) {
        const fp = game.items?.get?.(p.freePower)
        if (fp && a2Int(fp.system?.level) > a2Int(s.vampire?.disciplines?.[p.target]?.value) + 1) check.errors.push(`The free power must be rank ${a2Int(s.vampire?.disciplines?.[p.target]?.value) + 1} or lower (PG p.65).`)
      }
      break
    }
    case 'merit':
    case 'clanTrait':
    case 'power':
    case 'ritual': {
      item = game.items?.get?.(p.target) ?? null
      if (!item) { check = { ok: false, cost: 0, errors: ['Pick an item from the world\'s items.'], warnings: [] }; break }
      const f = item.flags?.world?.a2 ?? {}
      const inClan = p.kind === 'clanTrait' ? String(f.clan ?? '').toLowerCase() === a2tClanName(actor).toLowerCase() && Boolean(f.clan) : false
      check = a2tPurchaseCheck({
        ...base,
        itemCost: Number.isFinite(Number(f.xpCost)) ? Number(f.xpCost) : undefined,
        itemCostOther: Number.isFinite(Number(f.xpCostOtherClan)) ? Number(f.xpCostOtherClan) : undefined,
        inClan,
        owned: a2tOwnsNamed(actor, item),
        disciplineDots: s.vampire?.disciplines?.[item.system?.disciplineType]?.value,
        powerRank: item.system?.level,
        prereqErrors: a2tItemPrereqErrors(actor, item)
      })
      if (f.prerequisiteText) check.warnings.push(`Prerequisites: ${f.prerequisiteText}`)
      label = item.name
      break
    }
    case 'humanity': {
      const h = a2ActorHumanity(actor)
      check = a2tPurchaseCheck({ ...base, current: h.rank, violations: h.violations })
      label = `${a2PathInfo(actor).name} rank ${h.rank + 1}`
      break
    }
    default:
      check = a2tPurchaseCheck(base)
  }
  check.ok = check.errors.length === 0
  return { ...check, item, label, xp: x }
}

async function a2tSpendXP (actorArg = null) {
  if (!a2tReady()) return null
  const actor = a2tPickActor(actorArg)
  if (!actor || actor.type !== 'vampire') { ui.notifications.warn('Select a character token, or open the helper from the sheet.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  const x = a2tXp(actor)
  const gm = Boolean(game.user?.isGM)
  const content = `<div class="a2t-dialog a2t-spend">
    <p><strong>${a2Esc(actor.name)}</strong>: ${x.available} XP to spend (${x.earned} earned, ${x.spent} spent). Tier: ${a2Esc(a2tActorTier(actor).label)}.</p>
    <div class="form-group"><label>Buy</label><select name="kind">${Object.entries(A2T_BUY_KINDS).map(([k, l]) => a2tOpt(k, l, k === 'skill')).join('')}</select></div>
    <div class="form-group"><label>What</label><select name="target"></select></div>
    <div class="form-group" data-a2t-sec="specialty" hidden><label>Specialty</label><input type="text" name="text" value="" placeholder="e.g. Knives"></div>
    <div class="form-group" data-a2t-sec="discipline" hidden><label>Free power</label><select name="freePower"></select></div>
    ${gm ? '<div class="form-group"><label>Cost (GM)</label><input type="number" name="costOverride" value="" min="0" step="1" placeholder="table price"></div><label class="a2t-row"><input type="checkbox" name="override"> Storyteller override: ignore prerequisites and the XP balance</label>' : ''}
    <div class="a2t-preview" data-a2t="check"></div>
    <p class="hint">XP is spent between sessions, never mid-session; dots are bought one at a time (PG p.64).</p></div>`
  const fill = (root) => {
    const d = a2tFormData(root)
    const sel = root.querySelector('[name="target"]')
    const opts = a2tSpendOptions(actor, d.kind)
    if (sel) sel.innerHTML = opts.map((o, i) => a2tOpt(o.value, o.label, i === 0)).join('') || a2tOpt('', 'Nothing to buy here')
  }
  const fillFree = (root) => {
    const d = a2tFormData(root)
    const sel = root.querySelector('[name="freePower"]')
    if (!sel || d.kind !== 'discipline') return
    const next = a2Int(actor.system?.vampire?.disciplines?.[d.target]?.value) + 1
    const list = a2tWorldItems('discipline').filter((i) => i.system?.disciplineType === d.target && a2Int(i.system?.level) <= next && !a2tOwnsNamed(actor, i) && !a2tIsRitual(i))
    sel.innerHTML = a2tOpt('', 'None now (pick it later)', true) + list.map((i) => a2tOpt(i.id, `${i.name} (${a2Int(i.system?.level)})`)).join('')
  }
  const check = (root) => {
    const d = a2tFormData(root)
    a2tShow(root, '[data-a2t-sec="specialty"]', d.kind === 'specialty')
    a2tShow(root, '[data-a2t-sec="discipline"]', d.kind === 'discipline')
    const ev = a2tSpendEvaluate(actor, d)
    const out = root.querySelector('[data-a2t="check"]')
    if (out) out.innerHTML = `<strong>${a2Esc(ev.label || '—')}</strong>: ${ev.cost} XP.` + ev.errors.map((e) => `<br><span class="a2t-err">${a2Esc(e)}</span>`).join('') + ev.warnings.map((w) => `<br><span class="a2t-sub">${a2Esc(w)}</span>`).join('')
  }
  const r = await a2tDialog().prompt({
    window: { title: `Spend XP: ${actor.name}` },
    position: { width: 520 },
    content,
    ok: { icon: 'fa-solid fa-graduation-cap', label: 'Buy', callback: (ev, button) => a2tFormData(button.form) },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = a2tDialogRoot(dialog)
      if (!root) return
      root.querySelector('[name="kind"]')?.addEventListener('change', () => { fill(root); fillFree(root) })
      root.querySelector('[name="target"]')?.addEventListener('change', () => fillFree(root))
      root.addEventListener('change', () => check(root))
      root.addEventListener('input', () => check(root))
      fill(root)
      fillFree(root)
      check(root)
    }
  })
  if (!r) return null
  return a2tSpendApply(actor, r)
}

async function a2tSpendApply (actor, p = {}) {
  if (!actor?.isOwner) return null
  const ev = a2tSpendEvaluate(actor, p)
  const override = Boolean(p.override) && game.user?.isGM
  if (!ev.ok && !override) { ui.notifications.warn(ev.errors.join(' ')); return null }
  const s = actor.system ?? {}
  const tier = a2tActorTier(actor)
  const upd = {}
  const created = []
  switch (p.kind) {
    case 'attribute': {
      const v = a2Int(s.attributes?.[p.target]?.value) + 1
      upd[`system.attributes.${p.target}.value`] = v
      if (v > a2Int(s.attributes?.[p.target]?.max, 5)) upd[`system.attributes.${p.target}.max`] = Math.max(v, tier.maxDots)
      break
    }
    case 'skill': {
      const v = a2Int(s.skills?.[p.target]?.value) + 1
      upd[`system.skills.${p.target}.value`] = v
      if (v > a2Int(s.skills?.[p.target]?.max, 5)) upd[`system.skills.${p.target}.max`] = Math.max(v, tier.maxDots)
      break
    }
    case 'specialty':
      upd[`system.skills.${p.target}.focuses`] = [...(s.skills?.[p.target]?.focuses ?? []), String(p.text).trim()]
      break
    case 'discipline': {
      const v = a2Int(s.vampire?.disciplines?.[p.target]?.value) + 1
      upd[`system.vampire.disciplines.${p.target}.value`] = v
      upd[`system.vampire.disciplines.${p.target}.visible`] = true
      if (v > a2Int(s.vampire?.disciplines?.[p.target]?.max, 5)) upd[`system.vampire.disciplines.${p.target}.max`] = Math.max(v, tier.maxDiscipline)
      const fp = p.freePower ? game.items?.get?.(p.freePower) : null
      if (fp) created.push(a2tItemData(fp, 0, 'free power with a new dot (PG p.65)'))
      break
    }
    case 'merit':
    case 'clanTrait':
    case 'power':
    case 'ritual':
      if (ev.item) created.push(a2tItemData(ev.item, ev.cost))
      break
    case 'humanity': {
      const h = a2ActorHumanity(actor)
      await a2WriteHumanity(actor, a2HumanitySetRank(h, h.rank + 1))
      break
    }
  }
  const x = ev.xp
  x.spent += ev.cost
  x.log.push({ at: new Date().toISOString(), type: 'spend', kind: p.kind, what: ev.label, xp: ev.cost, by: game.user?.name ?? '' })
  upd['flags.world.a2.xp'] = a2tXpSave(x)
  await actor.update(upd)
  if (created.length) await actor.createEmbeddedDocuments('Item', created)
  const lines = [`Bought ${ev.label} for ${ev.cost} XP. ${x.earned - x.spent} XP left.`, ...ev.warnings]
  if (!ev.ok) lines.push(`Storyteller override: ${ev.errors.join(' ')}`)
  if (created.length > (p.kind === 'discipline' ? 0 : 1)) lines.push(`Free power: ${created[created.length - 1].name}.`)
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), whisper: a2tWhisper(actor), content: a2tCard(`${actor.name}: experience spent`, lines), flags: { world: { a2t: { kind: 'spend' } } } })
  return { cost: ev.cost, label: ev.label, left: x.earned - x.spent }
}
function a2tItemData (item, cost, note = '') {
  const data = typeof item.toObject === 'function' ? item.toObject() : a2tClone(item)
  delete data._id
  delete data.folder
  delete data.sort
  data.flags ??= {}
  data.flags.world ??= {}
  data.flags.world.a2 = { ...(data.flags.world.a2 ?? {}), bought: { xp: cost, at: new Date().toISOString(), ...(note ? { note } : {}) } }
  return data
}

// ---- sheet, chat cards, scene controls ------------------------------------------------
function a2tRenderSheet (app, element) {
  if (!a2Enabled()) return
  const actor = app?.actor ?? app?.document
  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app?.element)
  if (!actor || !root || actor.type !== 'vampire') return
  try {
    if (!a2tPatchSheetInstance(app)) a2tSurgeFallback(root, actor)
    const side = root.querySelector('.a2-health-row .a2-side')
    if (!side || !actor.isOwner) return
    side.querySelectorAll('.a2t-sheet-line').forEach((e) => e.remove())
    const x = a2tXp(actor)
    const line = document.createElement('div')
    line.className = 'a2t-sheet-line'
    line.innerHTML = `<span title="Experience (flags.world.a2.xp): ${x.earned} earned, ${x.spent} spent">XP ${x.available}</span>` +
      '<a data-a2t="spend" title="Spend XP (PG p.65)"><i class="fa-solid fa-graduation-cap"></i> Spend</a>' +
      (a2Creature(actor) === 'vampire' ? '<a data-a2t="feed" title="Hunt or feed (PG p.141-144)"><i class="fa-solid fa-droplet"></i> Feed</a>' : '')
    line.querySelector('[data-a2t="spend"]')?.addEventListener('click', (ev) => { ev.preventDefault(); a2tSpendXP(actor) })
    line.querySelector('[data-a2t="feed"]')?.addEventListener('click', (ev) => { ev.preventDefault(); a2tFeed(actor) })
    side.append(line)
  } catch (e) { console.error('V6 Alpha 2 tools | sheet', actor.name, e) }
}

function a2tRenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  const f = message?.flags?.world?.a2t
  if (!root || !f?.masq || !game.user?.isGM || !a2Enabled()) return
  root.querySelectorAll('.a2t-actions').forEach((e) => e.remove())
  const box = document.createElement('div')
  box.className = 'a2t-actions'
  const b = document.createElement('button')
  b.type = 'button'
  b.disabled = Boolean(f.masqDone)
  b.innerHTML = `<i class="fa-solid fa-mask"></i> ${f.masqDone ? 'Masquerade marked' : 'Mark the Masquerade +1'}`
  b.title = `Storyteller: ${f.masq} (ST p.34)`
  b.addEventListener('click', async (ev) => {
    ev.preventDefault()
    b.disabled = true
    const r = await a2tMasqChange(1, `${message.speaker?.alias ?? message.alias ?? ''}: ${f.masq}`.replace(/^: /, ''))
    if (r !== null) await message.setFlag?.('world', 'a2t.masqDone', true)
  })
  box.append(b)
  ;(root.querySelector('.a2t-card') ?? root.querySelector('.message-content') ?? root).append(box)
}

function a2tSceneControls (controls) {
  if (!a2Enabled()) return
  const tools = controls?.tokens?.tools
  if (!tools) return
  const gm = Boolean(game.user?.isGM)
  if (gm || a2tGet('masqueradePlayers')) {
    tools['v6a2-masquerade'] = { name: 'v6a2-masquerade', title: 'Masquerade Tracker', icon: 'fa-solid fa-mask', order: 101, button: true, onChange: () => a2tMasqOpen() }
  }
  if (!gm) return
  tools['v6a2-end-scene'] = { name: 'v6a2-end-scene', title: 'End the scene (Alpha 2)', icon: 'fa-solid fa-clapperboard', order: 102, button: true, onChange: () => a2tEndScene() }
  tools['v6a2-new-night'] = { name: 'v6a2-new-night', title: 'New Night (Alpha 2)', icon: 'fa-solid fa-moon', order: 103, button: true, onChange: () => a2tNewNight() }
}

// ---- styles, API, boot -----------------------------------------------------------------
function a2tInjectStyles () {
  document.getElementById('v6a-alpha2-tools-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-alpha2-tools-style'
  style.textContent = `
.a2t-dialog { font-size: 13px; }
.a2t-dialog [hidden] { display: none !important; }
.a2t-dialog .a2t-row { display: flex; gap: 6px; align-items: center; margin: 3px 0; }
.a2t-dialog .a2t-scroll { max-height: 340px; overflow-y: auto; margin: 4px 0; }
.a2t-dialog .a2t-table { width: 100%; border-collapse: collapse; }
.a2t-dialog .a2t-table th, .a2t-dialog .a2t-table td { padding: 2px 4px; text-align: left; vertical-align: middle; }
.a2t-dialog .a2t-table .c { text-align: center; }
.a2t-dialog .a2t-num { width: 4em; }
.a2t-dialog .a2t-circ { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; margin: 4px 0; }
.a2t-dialog .a2t-circ label { display: flex; gap: 4px; align-items: center; }
.a2t-dialog textarea { width: 100%; font-family: inherit; }
.a2t-sub { opacity: 0.75; font-size: 12px; }
.a2t-preview { margin: 6px 0; padding: 4px 8px; border-left: 3px solid #7a0000; background: rgba(0,0,0,0.05); }
.a2t-err, .a2t-warn { color: #b00000; }
.a2t-masq { padding: 6px 8px; font-size: 13px; }
.a2t-masq-boxes { display: flex; gap: 4px; justify-content: center; margin: 4px 0 8px; }
.a2t-masq-box { width: 24px; height: 24px; min-height: 0; padding: 0; border: 2px solid currentColor; border-radius: 3px; background: transparent; cursor: pointer; }
.a2t-masq-box.on { background: #7a0000; border-color: #7a0000; }
.a2t-masq-box[disabled] { cursor: default; }
.a2t-masq-level { text-align: center; font-size: 15px; }
.a2t-masq-effect { margin: 4px 0 8px; }
.a2t-masq-buttons { display: flex; gap: 4px; margin: 6px 0; }
.a2t-masq-buttons button { flex: 1; font-size: 12px; }
.a2t-masq-log, .a2t-masq-help, .a2t-masq-trig ul { font-size: 12px; padding-left: 18px; margin: 4px 0; }
.a2t-masq-log { max-height: 160px; overflow-y: auto; }
.actor.sheet .a2t-sheet-line { display: flex; gap: 10px; align-items: center; justify-content: flex-end; font-size: 12px; }
.actor.sheet .a2t-sheet-line a { cursor: pointer; }
.chat-message .a2t-card .a2t-actions { display: flex; gap: 4px; margin-top: 4px; }
.chat-message .a2t-card .a2t-actions button { flex: 1; line-height: 22px; font-size: 12px; }
`
  document.head.append(style)
}

function a2tApi () {
  const masquerade = (...a) => a2tMasqOpen(...a)
  Object.assign(masquerade, {
    open: a2tMasqOpen,
    prompt: (dir = 1) => a2tMasqPrompt(dir >= 0 ? 1 : -1),
    mark: (n = 1, reason = '') => a2tMasqChange(Math.abs(a2Int(n, 1)), reason),
    clear: (n = 1, reason = '') => a2tMasqChange(-Math.abs(a2Int(n, 1)), reason),
    set: (rank, reason = '') => a2tMasqChange(0, reason, { set: rank }),
    rank: () => a2tMasqState().rank,
    level: () => a2tMasqLevel(a2tMasqState().rank),
    state: a2tMasqState,
    threatTest: a2tThreatTest,
    triggers: a2tMasqEditTriggers
  })
  const newNight = (opts) => a2tNewNight(opts)
  newNight.apply = a2tNewNightApply
  const feed = (actor) => a2tFeed(actor)
  feed.apply = a2tFeedApply
  const awardXP = () => a2tAwardXP()
  awardXP.apply = a2tAwardApply
  const spendXP = (actor) => a2tSpendXP(actor)
  spendXP.apply = a2tSpendApply
  const endScene = () => a2tEndScene()
  endScene.apply = a2tEndSceneApply
  return {
    newNight,
    feed,
    masquerade,
    awardXP,
    spendXP,
    endScene,
    bloodSurge: (actor) => a2tBloodSurge(a2tPickActor(actor)),
    closeSession: a2tCloseSession,
    clock: a2tClock,
    xp: a2tXp,
    tier: a2tActorTier,
    herd: a2tHerdInfo,
    rules: {
      tierKey: a2tTierKey,
      surgeCheck: a2tSurgeCheck,
      huntDifficulty: a2tHuntDifficulty,
      feedPlan: a2tFeedPlan,
      feedAttackDamage: a2tFeedAttackDamage,
      herdState: a2tHerdState,
      rise: a2tRise,
      masqLevel: a2tMasqLevel,
      threatReaction: a2tThreatReaction,
      xpAward: a2tXpAward,
      purchaseCheck: a2tPurchaseCheck,
      approaches: A2T_APPROACHES,
      circumstances: A2T_HUNT_CIRCUMSTANCES,
      tiers: A2T_TIERS,
      xpCosts: A2T_XP_COSTS
    }
  }
}

// Called from a2Boot(). Idempotent: global markers on V6Alpha2 guard the
// hooks and the socket, the Blood Surge wrapper is marked on the function,
// the tier maxima on the config objects.
async function a2ToolsBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.toolsBooted) return true
  try {
    a2tRegisterSettings()
    a2tInjectStyles()
    a2tPatchGenerationConfig()
    a2tPatchBloodSurge()
    if (!api.toolsHooked) {
      Hooks.on('renderActorSheetV2', a2tRenderSheet)
      Hooks.on('renderChatMessageHTML', (message, html) => { try { a2tRenderChat(message, html) } catch (e) { console.error('V6 Alpha 2 tools | chat', e) } })
      Hooks.on('getSceneControlButtons', a2tSceneControls)
      api.toolsHooked = true
    }
    a2tSocketInit()
    api.tools = a2tApi()
    api.toolsBooted = true
    try { ui.controls?.render?.({ reset: true }) } catch (e) { /* controls not drawn yet */ }
    console.log('V6 Automation | Alpha 2 tools loaded')
    return true
  } catch (e) {
    console.error('V6 Automation | Alpha 2 tools failed to load', e)
    ui.notifications?.error('V6 Automation: the Alpha 2 tools failed to load (see console).')
    return false
  }
}

// ---------------------------------------------------------------------------
// Alpha 2.0 roll-dialog bonuses ("bonuses"). Part of V6 Automation: the build
// appends this file after alpha2-core.js (same scope) and a2Boot() calls
// a2BonusesBoot(). Everything checks a2Enabled() at call time.
//
// Items carry flags.world.v6auto = { label, effects, v: 2 } from
// out-a2/auto/effects.json (a2_attach_effects.py). automation-core's v6aSync
// turns every effect into a managed condition the roll dialog lists as a toggle.
// This file resolves the Alpha 2 parts the system's effect model can't hold,
// through a2bEffect(), which v6aEffect() calls before building an effect
// (see alpha2/bonuses-notes.md for the two-line change in automation-core.js):
//  - effect.a2.value: a value worked out from the actor at sync time, the max of
//    '|'-separated terms: 'rank' (the Humanity or Path rank-band modifier, PG
//    p.126, bands from the nature item's flags.world.a2.tracker.rankBands),
//    'hunger' (Hunger dice, PG p.103), 'dmg2' (1 per 2 damage on the Health
//    track, Prowess from Pain), 'half:<path>' (half a trait, rounded up, PG
//    p.93) or a trait path. 0 drops the toggle; a negative value subtracts.
//  - effect.a2.when.hungerMin: the toggle exists only at that many Hunger dice
//    or more, and then applies by default (Hunger Strength, PG p.49).
//  - effect.a2.active: a Discipline power's lasting bonus while it is active.
//    When alpha2-powers.js automates that power with its own selfBonus, the
//    standing toggle is dropped so the bonus isn't offered twice.
// It also re-syncs actors whose Alpha 2 state changed outside system data
// (Health and Hunger flags), syncs actors created with items already embedded
// (imported NPCs fire no createItem), and offers relink() to bring Alpha 1 item
// flags on existing characters up to the Alpha 2 library.
// Page numbers: PG = Alpha 2.0 Player Guide.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry */

const A2B_RANK_BANDS = [ // PG p.126 Humanity Ranks table; nature items' own bands win
  { ranks: [10, 10], modifier: 2 }, { ranks: [8, 9], modifier: 1 }, { ranks: [4, 7], modifier: 0 },
  { ranks: [2, 3], modifier: -1 }, { ranks: [1, 1], modifier: -2 }
]
const a2bState = { hooked: false, resyncTimer: null }

// ---- pure helpers (unit-tested in test/bonuses.test.mjs) ----------------------
function a2bInt (v, d = 0) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : d }

function a2bRankModifier (rank, bands = null) {
  const r = a2bInt(rank)
  const list = Array.isArray(bands) && bands.length ? bands : A2B_RANK_BANDS
  const b = list.find((x) => Array.isArray(x?.ranks) && r >= x.ranks[0] && r <= x.ranks[1])
  return b ? a2bInt(b.modifier) : 0
}

// One term of an a2.value expression. ctx: { rank, bands, hunger, health: { value, max }, trait(path) }
function a2bTerm (term, ctx = {}) {
  const t = String(term ?? '').trim()
  if (!t) return 0
  if (t === 'rank') return ctx.rank === null || ctx.rank === undefined ? 0 : a2bRankModifier(ctx.rank, ctx.bands)
  if (t === 'hunger') return Math.max(0, a2bInt(ctx.hunger))
  if (t === 'dmg2') { const h = ctx.health ?? {}; return Math.max(0, Math.floor((a2bInt(h.max) - a2bInt(h.value)) / 2)) }
  if (t.startsWith('half:')) return Math.max(0, Math.ceil(a2bInt(ctx.trait?.(t.slice(5))) / 2))
  return a2bInt(ctx.trait?.(t))
}
function a2bValue (expr, ctx = {}) {
  const vals = String(expr ?? '').split('|').map((t) => a2bTerm(t, ctx))
  if (!vals.length) return 0
  // max for bonuses; a lone negative term (a low rank) stays negative
  return vals.length === 1 ? vals[0] : Math.max(...vals)
}

// The effect as v6aEffect should build it: unchanged when it has no Alpha 2
// part, null when no toggle should exist, or a resolved copy.
// ctx: { alpha2, rank, bands, hunger, health, trait(path), powersOwn }
function a2bResolve (e, ctx = {}) {
  if (!e || typeof e !== 'object') return e
  const a2 = e.a2
  if (!a2 || typeof a2 !== 'object') return e
  if (!ctx.alpha2) return null // Alpha 2 numbers mean nothing under the Alpha 1 rules
  if (a2.active && ctx.powersOwn) return null
  const out = { ...e }
  delete out.a2
  if (a2.when && typeof a2.when === 'object') {
    if (a2.when.hungerMin !== undefined && a2bInt(ctx.hunger) < a2bInt(a2.when.hungerMin)) return null
    out.predicates = [...(e.predicates ?? [])].filter((p) => p !== 'situational')
  }
  if (a2.value) {
    if (String(a2.value).split('|').includes('rank') && (ctx.rank === null || ctx.rank === undefined)) return null
    const signed = a2bValue(a2.value, ctx) * (e.mode === 'subtract' ? -1 : 1)
    if (!signed) return null
    out.mode = signed < 0 ? 'subtract' : 'add'
    out.value = Math.abs(signed)
    out.valueSource = 'flat'
    out.valueTrait = ''
  }
  return out
}

// ---- runtime -------------------------------------------------------------------
function a2bOn () { return typeof a2Enabled === 'function' ? a2Enabled() : false } // eslint-disable-line no-undef

// Does alpha2-powers.js automate this power's dice bonus itself?
function a2bPowersOwn (item) {
  if (item?.type !== 'discipline') return false
  try {
    /* eslint-disable no-undef */
    if (typeof a2pOn !== 'function' || !a2pOn()) return false
    const data = typeof a2pState !== 'undefined' ? a2pState.data : null
    if (!data || typeof a2pFindSpec !== 'function') return true // still loading: assume it does; re-synced on load
    const spec = a2pFindSpec(item, data)
    /* eslint-enable no-undef */
    return Boolean(spec?.fx?.some?.((f) => f?.kind === 'selfBonus'))
  } catch (err) { return false }
}

function a2bContext (actor, item) {
  const alpha2 = a2bOn()
  const ctx = { alpha2, rank: null, bands: null, hunger: 0, health: { value: 0, max: 0 }, powersOwn: false }
  ctx.trait = (path) => {
    const v = foundry.utils.getProperty(actor, path)
    return v && typeof v === 'object' ? (v.effective ?? v.value ?? 0) : v
  }
  if (!alpha2 || !actor) return ctx
  /* eslint-disable no-undef */
  try { ctx.hunger = typeof a2ActorHunger === 'function' ? a2ActorHunger(actor) : 0 } catch (err) { /* keep 0 */ }
  try { if (typeof a2ActorHealth === 'function') ctx.health = a2ActorHealth(actor) } catch (err) { /* keep */ }
  try {
    if (typeof a2Rules === 'function' && a2Rules(actor)?.humanity && typeof a2ActorHumanity === 'function') {
      ctx.rank = a2ActorHumanity(actor).rank
      ctx.bands = typeof a2PathInfo === 'function' ? a2PathInfo(actor).bands : null
    }
  } catch (err) { ctx.rank = null }
  /* eslint-enable no-undef */
  ctx.powersOwn = a2bPowersOwn(item)
  return ctx
}

// Called by v6aEffect(e, actor, item) in automation-core.js.
function a2bEffect (e, actor, item = null) {
  if (!e?.a2) return e
  try { return a2bResolve(e, a2bContext(actor, item)) } catch (err) {
    console.error('V6 Automation | bonuses', item?.name, err)
    return null
  }
}

function a2bQueue (actor) {
  // eslint-disable-next-line no-undef
  if (actor && typeof v6aQueueSync === 'function') v6aQueueSync(actor)
}

// Actors with a toggle that depends on Alpha 2 state held in flags.
function a2bHasA2Effects (actor, test = () => true) {
  return (actor?.items ?? []).some((i) => i.type !== 'condition' && (i.flags?.world?.v6auto?.effects ?? []).some((e) => e?.a2 && test(e, i)))
}

function a2bHooks () {
  if (a2bState.hooked) return
  a2bState.hooked = true
  // Imported NPCs arrive with their items embedded: no createItem fires for them.
  Hooks.on('createActor', (actor) => {
    if (a2bOn() && (actor.items?.size ?? actor.items?.length) && actor.type !== 'group') a2bQueue(actor)
  })
  // Hunger (Vitae) and rank are system fields v6aHooks already watches; Health,
  // the Hunger override and the creature type live in flags.
  // The Alpha 2 switch changes what every a2 effect resolves to.
  Hooks.on('updateSetting', (setting) => {
    if (!/(^|\.)(alpha2|v6aAlpha2)$/.test(String(setting?.key ?? ''))) return
    for (const actor of game.actors ?? []) if (a2bHasA2Effects(actor)) a2bQueue(actor)
  })
  Hooks.on('updateActor', (actor, changes) => {
    if (!a2bOn()) return
    const has = (p) => foundry.utils.hasProperty(changes, p)
    if ((has('flags.world.a2.health') || has('flags.world.a2.hungerOverride') || has('flags.world.a2.creature') || has('flags.world.a2.npc')) && a2bHasA2Effects(actor)) a2bQueue(actor)
  })
}

// Once alpha2-powers has its table, re-sync actors whose active-power toggles
// were decided while it was still loading.
function a2bResyncWhenPowersLoad (tries = 0) {
  clearTimeout(a2bState.resyncTimer)
  /* eslint-disable no-undef */
  if (typeof a2pOn !== 'function' || typeof a2pState === 'undefined') return
  if (!a2pState.data) {
    if (tries < 60) a2bState.resyncTimer = setTimeout(() => a2bResyncWhenPowersLoad(tries + 1), 1000)
    return
  }
  /* eslint-enable no-undef */
  for (const actor of game.actors ?? []) {
    if (a2bHasA2Effects(actor, (e, i) => e.a2?.active && i.type === 'discipline')) a2bQueue(actor)
  }
}

// relink(): copy the Alpha 2 flags.world.v6auto from the library (world items,
// then the items inside the "V6 Conversion" Adventures) onto actors' embedded
// items with the same type and name. dropAlpha1 removes Alpha 1 entries (no v: 2)
// that have no Alpha 2 counterpart. GM only; dryRun reports without writing.
async function a2bLibraryIndex ({ compendium = true } = {}) {
  const index = new Map()
  const add = (type, name, auto) => {
    if (!auto?.effects?.length || auto.v !== 2) return
    const k = `${type}::${name}`
    if (!index.has(k)) index.set(k, auto)
  }
  for (const i of game.items ?? []) add(i.type, i.name, i.flags?.world?.v6auto)
  if (compendium) {
    for (const pack of game.packs ?? []) {
      if (pack.documentName !== 'Adventure' || !/v6/i.test(`${pack.collection} ${pack.title ?? pack.metadata?.label ?? ''}`)) continue
      let docs = []
      try { docs = await pack.getDocuments() } catch (err) { continue }
      for (const adv of docs) for (const i of adv.items ?? []) add(i.type, i.name, i.flags?.world?.v6auto)
    }
  }
  return index
}

async function a2bRelink ({ actors = null, dryRun = true, dropAlpha1 = true, compendium = true } = {}) {
  const report = { updated: [], removed: [], unchanged: 0, actors: 0, dryRun }
  if (!game.user?.isGM) { ui.notifications?.warn('Only the GM can relink bonuses.'); return report }
  const index = await a2bLibraryIndex({ compendium })
  for (const actor of actors ?? game.actors ?? []) {
    if (actor.type === 'group') continue
    const upd = []
    for (const item of actor.items ?? []) {
      if (item.type === 'condition') continue
      const have = item.flags?.world?.v6auto
      const want = index.get(`${item.type}::${item.name}`)
      if (want) {
        if (JSON.stringify(have ?? null) === JSON.stringify(want)) { report.unchanged++; continue }
        upd.push({ _id: item.id, 'flags.world.v6auto': want })
        report.updated.push(`${actor.name}: ${item.name}`)
      } else if (have && have.v !== 2 && dropAlpha1 && have.effects) {
        upd.push(typeof a2Unset === 'function' ? a2Unset({ _id: item.id }, 'flags.world.v6auto') : { _id: item.id, 'flags.world.-=v6auto': null })
        report.removed.push(`${actor.name}: ${item.name}`)
      }
    }
    if (upd.length) {
      report.actors++
      if (!dryRun) await actor.updateEmbeddedDocuments('Item', upd)
    }
  }
  const verb = dryRun ? 'would update' : 'updated'
  ui.notifications?.info(`Bonuses relink: ${verb} ${report.updated.length} items and ${dryRun ? 'would remove' : 'removed'} ${report.removed.length} Alpha 1 entries on ${report.actors} actors.`)
  return report
}

// What a sync would make for this actor right now (for checking by hand).
function a2bPreview (actor) {
  const out = []
  for (const item of actor?.items ?? []) {
    if (item.type === 'condition') continue
    const auto = item.flags?.world?.v6auto
    for (const [i, e] of (auto?.effects ?? []).entries()) {
      const r = a2bEffect(e, actor, item)
      out.push({ item: item.name, name: auto.effects.length > 1 && e.note ? `${auto.label ?? item.name} (${e.note})` : (auto.label ?? item.name), index: i, effect: r })
    }
  }
  return out
}

async function a2BonusesBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.bonuses?.booted) return true
  a2bHooks()
  api.bonuses = {
    booted: true,
    resolve: (e, actor, item = null) => a2bEffect(e, actor, item),
    preview: a2bPreview,
    relink: a2bRelink,
    rules: { rankModifier: a2bRankModifier, value: a2bValue, resolve: a2bResolve }
  }
  // alpha2-powers boots after this file; give it time to load its table.
  setTimeout(() => a2bResyncWhenPowersLoad(0), 1000)
  console.log('V6 Automation | Alpha 2 bonuses loaded')
  return true
}
globalThis.a2BonusesBoot ??= a2BonusesBoot

// ---------------------------------------------------------------------------
// Alpha 2.0 Discipline power automation ("powers"). Part of V6 Automation:
// the build appends this file after alpha2-core.js (same scope) and a2Boot()
// calls a2PowersBoot(). Every hook checks a2Enabled() and the "Automate
// Discipline powers" setting at call time, so switching either off stops it.
//
// When a Discipline power is activated (its roll through the roll dialog, or
// the bolt button for an activation without a roll), the power is looked up
// in power-effects.json (built from the power items by gen_power_effects.py)
// and what can be mechanised is applied and tracked:
//  - selfBonus / targetPenalty: managed condition items whose dice effects the
//    system's own roll dialog offers as toggles (situational ones start off);
//    "impair" adds the Alpha 2 -2 dice per impaired Attribute (PG p.105);
//  - damage / heal / resource: Health, Willpower or Vitae change at once, or
//    each turn for damage over time;
//  - damageReduction: subtracted before alpha2-core's damage code runs;
//  - extraAction / upkeep: paid at the start of the holder's turn, the power
//    ends when it isn't (PG p.149);
//  - status: a token status icon;
//  - narrativeOnly: an "active power" marker with its duration.
// Contested powers wait for the opposing roll (alpha2-core's "Roll for target"
// or Compare) before target effects land. Durations follow PG p.149: one turn
// ends at the start of your next turn, one scene at the end of the scene, one
// night at sunrise (the New Night tool calls Hooks.callAll('v6a2NewNight')).
// Maturing aspects apply automatically from the actor's dots, Blood Surge
// included (PG p.150), at the rank the creator had when activating (PG p.149).
// Page numbers: PG = Alpha 2.0 Player Guide, ST = Alpha 2.0 Storyteller Packet.
// ---------------------------------------------------------------------------
/* global game, Hooks, ui, foundry, ChatMessage, Item, Roll, CONFIG, canvas, fromUuidSync */

const A2P_MODULE = 'v6-automation'
const A2P_SOCKET = `module.${A2P_MODULE}`
const A2P_DATA_PATHS = [`modules/${A2P_MODULE}/data/power-effects.json`, `modules/${A2P_MODULE}/power-effects.json`]
// A predicate no roll context carries: the roll dialog lists the toggle, unticked.
const A2P_SITUATIONAL = 'a2p-situational'
const A2P_SYS_DURATION = { turn: 'turn', scene: 'scene', night: 'night', maintained: 'maintained', instant: 'instantaneous' }
// Item durations (system keys) to ours. Permanent effects happen at once and
// their results stay in the fiction (PG p.149), so nothing is tracked.
const A2P_FROM_ITEM_DURATION = { turn: 'turn', scene: 'scene', night: 'night', maintained: 'maintained', special: 'maintained', instantaneous: 'instant', permanent: 'instant', none: 'instant' }
const A2P_STATUSES = {
  power: ['Discipline power active', 'icons/svg/aura.svg'],
  weakened: ['Under a hostile power', 'icons/svg/downgrade.svg'],
  aided: ['Aided by a power', 'icons/svg/upgrade.svg'],
  hidden: ['Hidden by a power', 'icons/svg/invisible.svg'],
  shape: ['Changed shape', 'icons/svg/wing.svg'],
  shield: ['Damage reduced by a power', 'icons/svg/mage-shield.svg'],
  speed: ['Supernatural speed', 'icons/svg/lightning.svg'],
  senses: ['Heightened senses', 'icons/svg/eye.svg'],
  fear: ['Afraid', 'icons/svg/terror.svg'],
  held: ['Held', 'icons/svg/net.svg'],
  entranced: ['Entranced or commanded', 'icons/svg/paralysis.svg'],
  confused: ['Confused', 'icons/svg/daze.svg'],
  silenced: ['Silenced', 'icons/svg/silenced.svg'],
  burning: ['Taking damage each turn', 'icons/svg/degen.svg']
}
const A2P_ATTRS = ['strength', 'dexterity', 'stamina', 'charisma', 'manipulation', 'composure', 'intelligence', 'wits', 'resolve']
const A2P_SKILLS = ['athletics', 'awareness', 'craft', 'expression', 'fighting', 'investigation', 'knowledge', 'medicine', 'persuasion', 'shooting', 'sabotage', 'subterfuge', 'survival']
const A2P_DISCS = ['animalism', 'auspex', 'bloodSorcery', 'celerity', 'corruption', 'dominate', 'fortitude', 'necromancy', 'obfuscate', 'oblivion', 'potence', 'presence', 'tellurgy', 'vicissitude']
const A2P_VARS = ['dots', 'margin', 'successes', 'genMod', 'level', 'extra', ...A2P_ATTRS, ...A2P_SKILLS, ...A2P_DISCS]
// key: [module setting key, macro (system namespace) key, name, hint, default]
const A2P_SETTINGS = {
  auto: ['powersAuto', 'v6aPowersAuto', 'Automate Discipline powers (Alpha 2)', 'Apply and track what a Discipline power does when it is rolled or activated: bonuses and penalties as roll-dialog toggles, damage, Willpower and Vitae changes, damage reduction, upkeep, token icons, and an active-power marker with its duration.', true],
  autoDamage: ['powersAutoDamage', 'v6aPowersAutoDamage', 'Powers: apply damage automatically', 'Damage from a won power test goes straight onto the target. Off: the power card offers an Apply button instead.', true],
  npcHalf: ['powersNpcHalf', 'v6aPowersNpcHalf', 'Powers: resolve against simple NPCs by Taking Half', 'A contested power used on an actor of the system\'s "npc" type wins at once when your successes reach half its pool, rounded up (ST p.42). Off: roll for the NPC.', true],
  sceneChange: ['powersSceneChange', 'v6aPowersSceneChange', 'Powers: activating another scene ends the scene', 'Switching the active Foundry scene ends every power that lasts one scene or one turn.', true],
  statusIcons: ['powersStatusIcons', 'v6aPowersStatusIcons', 'Powers: token status icons', 'Mark actors under an active power with a token status icon.', true]
}
const a2pState = { data: null, loading: null, lastRoll: new Map(), hooked: false, socket: false, ns: null, parsed: new Map(), prompting: new Set() }

// ---- pure helpers (no Foundry globals; unit-tested in test/powers.test.mjs) ----
// nothing there (null, undefined, an empty field) is the default, not 0
function a2pInt (v, d = 0) { if (v === null || v === undefined || v === '') return d; const n = Math.floor(Number(v)); return Number.isFinite(n) ? n : d }
function a2pEsc (s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
function a2pSigned (n) { return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0' }
function a2pPlural (n, one, many) { return `${n} ${n === 1 ? one : many}` }
function a2pCap (s) { s = String(s ?? ''); return s ? s[0].toUpperCase() + s.slice(1) : s }
function a2pId () { return (globalThis.foundry?.utils?.randomID?.(16)) ?? Math.random().toString(36).slice(2, 18) }

// Value expressions in power-effects.json: whole numbers, + - * /, brackets,
// the variables in A2P_VARS, and the functions below. half() rounds up, as
// all halves do (PG p.93). band(x, t1, v1, t2, v2, ...) gives the value of the
// highest threshold that x reaches (0 below the first), for margin tables.
const A2P_FUNCS = {
  half: (x) => Math.ceil(x / 2),
  twice: (x) => 2 * x,
  max: (...a) => Math.max(...a),
  min: (...a) => Math.min(...a),
  band: (x, ...tv) => { let out = 0; for (let i = 0; i + 1 < tv.length; i += 2) if (x >= tv[i]) out = tv[i + 1]; return out }
}
function a2pTokens (src) {
  const s = String(src ?? '')
  const out = []
  let i = 0
  while (i < s.length) {
    const rest = s.slice(i)
    let m
    if ((m = /^\s+/.exec(rest))) { i += m[0].length; continue }
    if ((m = /^\d+(?:\.\d+)?/.exec(rest))) { out.push({ t: 'n', v: Number(m[0]) }); i += m[0].length; continue }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) { out.push({ t: 'id', v: m[0] }); i += m[0].length; continue }
    if ('+-*/(),'.includes(s[i])) { out.push({ t: s[i] }); i++; continue }
    throw new Error(`bad character "${s[i]}" in "${s}"`)
  }
  return out
}
function a2pParse (src) {
  const key = String(src)
  if (a2pState.parsed.has(key)) return a2pState.parsed.get(key)
  const toks = a2pTokens(key)
  let p = 0
  const peek = () => toks[p]
  const take = (t) => { if (toks[p]?.t !== t) throw new Error(`expected "${t}" in "${key}"`); return toks[p++] }
  const expr = () => {
    let n = term()
    while (peek()?.t === '+' || peek()?.t === '-') { const op = toks[p++].t; n = { op, a: n, b: term() } }
    return n
  }
  const term = () => {
    let n = unary()
    while (peek()?.t === '*' || peek()?.t === '/') { const op = toks[p++].t; n = { op, a: n, b: unary() } }
    return n
  }
  const unary = () => {
    if (peek()?.t === '-') { p++; return { op: 'neg', a: unary() } }
    if (peek()?.t === '+') { p++; return unary() }
    return atom()
  }
  const atom = () => {
    const t = toks[p++]
    if (!t) throw new Error(`unexpected end of "${key}"`)
    if (t.t === 'n') return { num: t.v }
    if (t.t === '(') { const n = expr(); take(')'); return n }
    if (t.t === 'id' && peek()?.t === '(') {
      if (!A2P_FUNCS[t.v]) throw new Error(`unknown function "${t.v}" in "${key}"`)
      p++
      const args = []
      if (peek()?.t !== ')') { args.push(expr()); while (peek()?.t === ',') { p++; args.push(expr()) } }
      take(')')
      return { fn: t.v, args }
    }
    if (t.t === 'id') {
      if (!A2P_VARS.includes(t.v)) throw new Error(`unknown variable "${t.v}" in "${key}"`)
      return { id: t.v }
    }
    throw new Error(`unexpected "${t.t}" in "${key}"`)
  }
  const tree = expr()
  if (p < toks.length) throw new Error(`unexpected "${toks[p].t}" in "${key}"`)
  a2pState.parsed.set(key, tree)
  return tree
}
function a2pEval (src, vars = {}) {
  if (src === null || src === undefined || src === '') return 0
  if (typeof src === 'number') return Math.floor(src)
  const ev = (n) => {
    if ('num' in n) return n.num
    if ('id' in n) { const v = Number(vars[n.id]); return Number.isFinite(v) ? v : 0 }
    if (n.fn) return A2P_FUNCS[n.fn](...n.args.map(ev))
    if (n.op === 'neg') return -ev(n.a)
    const a = ev(n.a)
    const b = ev(n.b)
    if (n.op === '+') return a + b
    if (n.op === '-') return a - b
    if (n.op === '*') return a * b
    return b ? a / b : 0
  }
  return Math.floor(ev(a2pParse(src)))
}

// Maturing (PG p.150): every step whose level the actor's dots reach applies,
// lowest first, so a later step overrides an earlier one. Steps are partial
// specs: { level, value: ..., duration: ..., note: ... }.
function a2pApplySteps (base = {}, dots = 0) {
  const steps = (base.steps ?? []).filter((s) => a2pInt(s.level) <= a2pInt(dots)).sort((a, b) => a2pInt(a.level) - a2pInt(b.level))
  const out = { ...base }
  delete out.steps
  for (const s of steps) {
    const { level, ...rest } = s
    Object.assign(out, rest)
  }
  out.step = steps.length ? a2pInt(steps[steps.length - 1].level) : null
  return out
}

// The effect specs that apply at these dots and with this choice.
function a2pActiveFx (spec = {}, dots = 0, choice = null) {
  return (spec.fx ?? []).map((f) => a2pApplySteps(f, dots))
    .filter((f) => !f.min || a2pInt(dots) >= a2pInt(f.min))
    .filter((f) => !f.if || f.if === choice)
}

// Where an effect lands. Penalties, damage and the like go on the target.
function a2pSide (fx = {}) {
  if (fx.on === 'self' || fx.on === 'target') return fx.on
  return ['targetPenalty', 'damage'].includes(fx.kind) ? 'target' : 'self'
}
// When it lands: 'activate' (unless the test was lost), 'win' (needs a won
// test; contested powers wait for the opposing roll), 'manual' (a card button),
// 'always'. Target effects of contested powers default to 'win' (PG p.149).
function a2pWhen (fx = {}, contested = false) {
  if (fx.when) return fx.when
  return a2pSide(fx) === 'target' && contested ? 'win' : 'activate'
}

const a2pTraitPath = (t) => {
  t = String(t)
  if (t.startsWith('system.') || t.includes(':')) return t
  if (A2P_ATTRS.includes(t)) return `system.attributes.${t}`
  if (A2P_SKILLS.includes(t)) return `system.skills.${t}`
  if (A2P_DISCS.includes(t)) return `system.vampire.disciplines.${t}`
  return t
}
const A2P_GROUPS = { physical: ['strength', 'dexterity', 'stamina'], social: ['charisma', 'manipulation', 'composure'], mental: ['intelligence', 'wits', 'resolve'] }
function a2pTargets (list = [], choice = null) {
  const out = []
  for (let t of list ?? []) {
    if (t === '$choice') t = choice
    if (!t) continue
    if (A2P_GROUPS[t]) out.push(...A2P_GROUPS[t].map(a2pTraitPath))
    else out.push(a2pTraitPath(t))
  }
  return [...new Set(out)]
}
function a2pTraitLabel (path) {
  const k = String(path).split('.').pop()
  return k === 'bloodSorcery' ? 'Blood Sorcery' : a2pCap(k)
}

// The roll-dialog effects of one bonus or penalty spec, with its numbers
// worked out. Returns [] when it has no dice part.
function a2pDiceEffects (fx = {}, vars = {}, choice = null) {
  const pred = fx.situational ? [A2P_SITUATIONAL] : []
  if (fx.kind !== 'selfBonus' && fx.kind !== 'targetPenalty') return []
  if (fx.impair) {
    // Impairment: -2 dice per impaired Attribute in the pool (PG p.105), so
    // one effect per Attribute; a pool with two of them takes -4.
    const attrs = a2pTargets(Array.isArray(fx.impair) ? fx.impair : [fx.impair], choice)
    return attrs.map((path) => ({ type: 'dice', targets: [path], mode: 'subtract', value: 2, valueSource: 'flat', valueTrait: '', predicates: [], exclusions: [] }))
  }
  if (fx.trait) {
    const value = a2pEval(fx.value ?? 1, vars)
    const neg = fx.kind === 'targetPenalty' || value < 0
    return a2pTargets([fx.trait], choice).map((path) => ({ type: 'actorTrait', targets: [path], mode: neg ? 'subtract' : 'add', value: Math.abs(value), valueSource: 'flat', valueTrait: '', predicates: [], exclusions: [] }))
  }
  let value = a2pEval(fx.value ?? 0, vars)
  if (fx.kind === 'targetPenalty') value = -Math.abs(value)
  if (!value) return []
  return [{ type: 'dice', targets: a2pTargets(fx.targets, choice), mode: value < 0 ? 'subtract' : 'add', value: Math.abs(value), valueSource: 'flat', valueTrait: '', predicates: pred, exclusions: [] }]
}

// Short text for a bonus or penalty, used in condition names and the card.
// A label may hold {v} (the signed dice) and $choice.
function a2pFxLabel (fx = {}, vars = {}, choice = null) {
  if (fx.label) {
    const n = fx.kind === 'targetPenalty' ? -Math.abs(a2pEval(fx.value ?? 0, vars)) : a2pEval(fx.value ?? 0, vars)
    return fx.label.replace('{v}', a2pSigned(n)).replace('$choice', a2pCap(choice ?? ''))
  }
  if (fx.kind !== 'selfBonus' && fx.kind !== 'targetPenalty') return fx.note ?? fx.kind ?? ''
  if (fx.impair) return `${a2pTargets(Array.isArray(fx.impair) ? fx.impair : [fx.impair], choice).map(a2pTraitLabel).join(', ')} impaired`
  const v = fx.kind === 'targetPenalty' ? -Math.abs(a2pEval(fx.value ?? 0, vars)) : a2pEval(fx.value ?? 0, vars)
  if (fx.trait) return `${a2pTraitLabel(a2pTargets([fx.trait], choice)[0] ?? '')} ${a2pSigned(fx.kind === 'targetPenalty' ? -Math.abs(a2pEval(fx.value ?? 1, vars)) : a2pEval(fx.value ?? 1, vars))}`
  const tg = (fx.targets ?? []).length ? a2pTargets(fx.targets, choice).map(a2pTraitLabel).join(', ') : 'all tests'
  return `${a2pSigned(v)} ${fx.note ? fx.note.replace('$choice', a2pCap(choice ?? '')) : tg}`
}

// One-turn effects end at the start of the creator's next turn (PG p.149);
// "N turns" count the creator's turn starts. ev = { combatId, combatantId }.
function a2pTurnTick (expires = {}, ev = {}) {
  if (expires.type !== 'turn' || !expires.combatId || expires.combatId !== ev.combatId || !expires.combatantId || expires.combatantId !== ev.combatantId) return { end: false, expires }
  const left = Math.max(1, a2pInt(expires.turnsLeft, 1)) - 1
  return { end: left <= 0, expires: { ...expires, turnsLeft: left } }
}

// Which durations end on a world event (PG p.149; a new night also ends the scene).
function a2pEndsOn (ap = {}, event) {
  const type = ap.expires?.type
  if (event === 'sceneEnd') return type === 'turn' || type === 'scene'
  if (event === 'newNight') return (type === 'turn' || type === 'scene' || type === 'night') && ap.upkeep?.per !== 'night'
  if (event === 'incapacitated') return type === 'turn' || type === 'scene' // PG p.149: torpor ends scene-or-less powers
  return false
}

// Damage reduction from active powers, applied before Vampiric Endurance in
// a2ApplyDamage. drs = [{ name, amount, min1, notBaneful, noEndurance }].
// noEndurance (Shared Resilience) puts the generation modifier back, which
// cancels Vampiric Endurance exactly: max(1, d + g - g) = d for d >= 1.
function a2pReduce (amount, { baneful = false, genMod = 0 } = {}, drs = []) {
  const start = Math.max(0, a2pInt(amount))
  let a = start
  const notes = []
  if (!a) return { amount: 0, reduced: 0, notes }
  let min1 = false
  let reduced = 0
  for (const dr of drs ?? []) {
    if (dr.noEndurance) {
      if (!baneful && genMod > 0) { a += genMod; notes.push(`${dr.name}: your Vampiric Endurance doesn't apply`) }
      continue
    }
    if (baneful && dr.notBaneful) continue
    const r = Math.min(Math.max(0, a2pInt(dr.amount)), a)
    if (!r) continue
    a -= r
    reduced += r
    if (dr.min1) min1 = true
    notes.push(`${dr.name} −${r}`)
  }
  if (min1 && a < 1) { reduced -= 1 - a; a = 1 }
  return { amount: a, reduced, notes }
}

// Which table entry an item uses: an override on the item, a stamped key,
// then disciplineType::name (book variants for the few name collisions).
function a2pFindSpec (item, data = {}) {
  const own = item?.flags?.world?.a2?.powerFx
  if (own && typeof own === 'object' && Array.isArray(own.fx)) return { ...own, src: own.src ?? 'item', key: 'item' }
  const powers = data?.powers ?? {}
  const stamped = item?.flags?.world?.a2?.powerFxKey
  if (stamped && powers[stamped]) return { ...powers[stamped], key: stamped }
  const key = `${item?.system?.disciplineType ?? ''}::${item?.name ?? ''}`
  const variants = data?.variants?.[key]
  if (Array.isArray(variants) && variants.length) {
    const book = item?.system?.source?.book ?? ''
    const level = a2pInt(item?.system?.level)
    const len = String(item?.system?.description ?? '').length
    const score = (k) => {
      const m = powers[k]?.match ?? {}
      return (m.book === book ? 4 : 0) + (a2pInt(m.level) === level ? 2 : 0) - Math.abs(a2pInt(m.descLen) - len) / 10000
    }
    const best = [...variants].filter((k) => powers[k]).sort((a, b) => score(b) - score(a))[0]
    if (best) return { ...powers[best], key: best }
  }
  return powers[key] ? { ...powers[key], key } : null
}

// No table entry (a power made after the build): track it by its own duration
// and offer its printed damage as a card button.
// Does this power's own card deal its damage (automatically or by its Apply
// button)? Then the roll card needs no "Apply damage" of its own. Attack riders
// (Powerful Strike) don't count: they ride on the attack card's damage dialog.
function a2pHandlesDamage (item) {
  if (!a2pOn() || !a2pState.data || item?.type !== 'discipline') return false
  const spec = a2pFindSpec(item, a2pState.data) ?? a2pFallbackSpec(item)
  const all = [...(spec?.fx ?? []), ...(spec?.repeat?.fx ?? [])]
  return all.some((f) => f.kind === 'damage' && !f.rider)
}
function a2pFallbackSpec (item) {
  const a = item?.system?.activation ?? {}
  const duration = A2P_FROM_ITEM_DURATION[a.duration] ?? 'scene'
  const fx = [{ kind: 'narrativeOnly', why: 'not in power-effects.json: tracked by its printed duration only' }]
  if (a.damage?.dealsDamage) {
    // A power made after the build: read its damage text; anything unclear stays a card button.
    const f = typeof a2xFormulaExpr === 'function' ? a2xFormulaExpr(a.damage.formula, { discipline: item?.system?.disciplineType ?? null }) : { expr: null } // eslint-disable-line no-undef
    let ok = Boolean(f.expr)
    if (ok) { try { a2pParse(f.expr) } catch (e) { ok = false } }
    fx.push({ kind: 'damage', ...(ok && f.clean && !f.rider ? {} : { when: 'manual' }), ...(ok && f.rider ? { rider: true, on: 'self' } : {}), amount: ok ? f.expr : 'margin', baneful: Boolean(f.baneful), perTurn: ok && f.clean && Boolean(f.perTurn), text: a.damage.formula || 'see the power', track: a.damage.resource === 'willpower' ? 'willpower' : 'health' })
  }
  return { auto: 'fallback', key: null, duration, kinds: fx.map((f) => f.kind), fx }
}

// A power is contested when it lists an Oppose pool or a Difficulty (PG p.149).
function a2pIsContested (item) {
  const o = item?.flags?.world?.a2?.oppose
  const pools = o && ['attributes', 'skills', 'disciplines'].some((k) => Array.isArray(o[k]) && o[k].length)
  const d = item?.system?.difficulty ?? {}
  const diff = d.type && d.type !== 'none' && !(d.type === 'fixed' && !a2pInt(d.fixed))
  return Boolean(pools || diff)
}

// How each target stands right after the roll. v = the roll's Alpha 2 verdict.
function a2pInitialStatus ({ contested, v = null, index = 0, npcHalf = null }) {
  if (!contested) return { status: 'won', margin: v ? Math.max(0, a2pInt(v.margin ?? v.successes)) : 0, how: 'not resisted' }
  if (v?.mode === 'difficulty') return v.win ? { status: 'won', margin: Math.max(0, a2pInt(v.margin)), how: `vs Difficulty ${v.difficulty}` } : { status: 'lost', margin: 0, how: `vs Difficulty ${v.difficulty}` }
  if (v && v.opponent !== null && v.opponent !== undefined && index === 0 && v.win !== null) return v.win ? { status: 'won', margin: Math.max(0, a2pInt(v.margin)), how: `vs ${v.opponent} successes` } : { status: 'lost', margin: 0, how: `vs ${v.opponent} successes` }
  if (npcHalf && v) {
    // ST p.42: a simple NPC resists with half its pool, rounded up.
    const diff = Math.ceil(a2pInt(npcHalf.pool) / 2)
    const s = a2pInt(v.successes)
    return s >= diff ? { status: 'won', margin: s - diff, how: `Taking Half: ${npcHalf.label} ${npcHalf.pool} → Difficulty ${diff}` } : { status: 'lost', margin: 0, how: `Taking Half: Difficulty ${diff}` }
  }
  return { status: 'pending', margin: 0, how: 'waiting for the opposing roll' }
}

function a2pDurationText (ap = {}) {
  const e = ap.expires ?? {}
  let t
  if (e.type === 'turn') t = e.combatId ? a2pPlural(Math.max(1, a2pInt(e.turnsLeft, 1)), 'turn', 'turns') : 'one turn (no combat)'
  else if (e.type === 'scene') t = 'this scene'
  else if (e.type === 'night') t = 'until sunrise'
  else if (e.type === 'maintained') t = 'until ended'
  else t = 'instant'
  if (ap.upkeep?.amount) t += ` · upkeep ${ap.upkeep.amount} ${ap.upkeep.resource === 'vitae' ? 'Vitae' : 'Willpower'}${ap.upkeep.per === 'night' ? ' per night' : ' per turn'}`
  if (ap.uses) t += ` · ${a2pPlural(a2pInt(ap.uses), 'test', 'tests')} left`
  return t
}

// ---- data ------------------------------------------------------------------
async function a2pLoadData (force = false) {
  if (a2pState.data && !force) return a2pState.data
  if (a2pState.loading && !force) return a2pState.loading
  a2pState.loading = (async () => {
    // The build can inline the table as A2P_POWER_EFFECTS (or set globalThis.V6A2_POWER_EFFECTS).
    // eslint-disable-next-line no-undef
    const inline = (typeof A2P_POWER_EFFECTS !== 'undefined' && A2P_POWER_EFFECTS) || globalThis.V6A2_POWER_EFFECTS
    if (inline?.powers) return inline
    const urls = [...A2P_DATA_PATHS]
    const custom = a2pSetting('dataUrl')
    if (custom) urls.unshift(custom)
    for (const path of urls) {
      try {
        const url = globalThis.foundry?.utils?.getRoute ? foundry.utils.getRoute(path) : path
        const r = await fetch(url)
        if (r.ok) { const j = await r.json(); if (j?.powers) return j }
      } catch (e) { /* try the next one */ }
    }
    console.warn('V6 Automation | powers: power-effects.json not found; powers are tracked by their printed duration only.')
    return { version: 0, powers: {}, variants: {} }
  })()
  a2pState.data = await a2pState.loading
  a2pState.loading = null
  return a2pState.data
}

// ---- settings ----------------------------------------------------------------
function a2pNamespace () {
  if (a2pState.ns) return a2pState.ns
  if (!globalThis.game?.settings) return A2P_MODULE
  const mod = game.settings?.settings?.has?.(`${A2P_MODULE}.alpha2`) || game.modules?.get?.(A2P_MODULE)?.active
  return (a2pState.ns = mod ? A2P_MODULE : 'wod6e')
}
function a2pRegisterSettings () {
  const ns = a2pNamespace()
  for (const [, [mk, sk, name, hint, def]] of Object.entries(A2P_SETTINGS)) {
    const key = ns === A2P_MODULE ? mk : sk
    if (game.settings.settings.has(`${ns}.${key}`)) continue
    game.settings.register(ns, key, { name, hint, scope: 'world', config: true, type: Boolean, default: def })
  }
  const dk = ns === A2P_MODULE ? 'powersDataUrl' : 'v6aPowersDataUrl'
  if (!game.settings.settings.has(`${ns}.${dk}`)) {
    game.settings.register(ns, dk, { name: 'Powers: power-effects.json path', hint: 'Leave empty to load it from the module folder. A path relative to the Foundry data folder, e.g. worlds/my-world/power-effects.json.', scope: 'world', config: true, type: String, default: '' })
  }
}
function a2pSetting (key) {
  const ns = a2pNamespace()
  const def = A2P_SETTINGS[key]
  const k = key === 'dataUrl' ? (ns === A2P_MODULE ? 'powersDataUrl' : 'v6aPowersDataUrl') : (ns === A2P_MODULE ? def?.[0] : def?.[1])
  try { if (game.settings.settings.has(`${ns}.${k}`)) return game.settings.get(ns, k) } catch (e) { /* not ready */ }
  return key === 'dataUrl' ? '' : def?.[4]
}
function a2pOn () {
  const alpha2 = typeof a2Enabled === 'function' ? a2Enabled() : true // eslint-disable-line no-undef
  return Boolean(alpha2 && a2pSetting('auto'))
}
const a2pIsActiveGM = () => game.user === game.users?.activeGM
const a2pHasGM = () => Boolean(game.users?.activeGM)

// ---- actors -------------------------------------------------------------------
function a2pFrom (uuid) {
  try {
    const d = uuid ? fromUuidSync(uuid) : null
    return d?.actor && d.documentName === 'Token' ? d.actor : d
  } catch (e) { return null }
}
function a2pVars (actor, item, extra = {}) {
  const v = { dots: 0, margin: 0, successes: 0, genMod: 0, level: a2pInt(item?.system?.level), extra: 0 }
  const read = (o) => a2pInt(o?.effective ?? o?.value)
  for (const k of A2P_ATTRS) v[k] = read(actor?.system?.attributes?.[k])
  for (const k of A2P_SKILLS) v[k] = read(actor?.system?.skills?.[k])
  for (const k of A2P_DISCS) v[k] = read(actor?.system?.vampire?.disciplines?.[k])
  v.dots = v[item?.system?.disciplineType] ?? 0 // effective: Blood Surge unlocks Maturing (PG p.150)
  // eslint-disable-next-line no-undef
  v.genMod = typeof a2ActorGenMod === 'function' ? a2ActorGenMod(actor) : 0
  return Object.assign(v, extra)
}
function a2pAllActors () {
  const out = new Map()
  for (const a of game.actors ?? []) out.set(a.uuid, a)
  for (const s of game.scenes ?? []) {
    for (const t of s.tokens ?? []) { if (!t.actorLink && t.actor) out.set(t.actor.uuid, t.actor) }
  }
  return [...out.values()]
}
function a2pConds (actor) { return (actor?.items ?? []).filter((i) => i.type === 'condition' && i.flags?.world?.a2?.activePower) }
function a2pAP (cond) { return cond?.flags?.world?.a2?.activePower ?? null }
// Active powers on an actor, grouped by activation.
function a2pList (actor) {
  const groups = new Map()
  for (const c of a2pConds(actor)) {
    const ap = a2pAP(c)
    if (!groups.has(ap.id)) groups.set(ap.id, { id: ap.id, power: ap.power, side: ap.side, source: ap.source, sourceName: ap.sourceName, img: c.img, ap, conditions: [] })
    const g = groups.get(ap.id)
    g.conditions.push(c)
    if (ap.main) g.ap = ap
  }
  return [...groups.values()]
}
function a2pCombatantOf (combat, actor) {
  if (!combat || !actor) return null
  return combat.combatants?.find?.((c) => c.actor?.uuid === actor.uuid) ?? combat.combatants?.find?.((c) => c.actorId === actor.id) ?? null
}
function a2pCurrentTargets () {
  return [...(game.user?.targets ?? [])].map((t) => ({ uuid: t.actor?.uuid, name: t.name ?? t.actor?.name, actor: t.actor })).filter((t) => t.uuid)
}
function a2pOwners (actor) {
  return (game.users ?? []).filter((u) => u.isGM || actor?.testUserPermission?.(u, 'OWNER')).map((u) => u.id)
}
// Who answers an upkeep prompt: the player whose character it is, another
// active player owner, else the active GM. Every client works out the same user.
function a2pPayer (actor) {
  const users = [...(game.users ?? [])].filter((u) => u.active && !u.isGM && actor?.testUserPermission?.(u, 'OWNER'))
  return users.find((u) => u.character?.id === actor?.id) ?? users[0] ?? game.users?.activeGM ?? null
}

// ---- status icons -------------------------------------------------------------
function a2pRegisterStatuses () {
  if (!Array.isArray(CONFIG?.statusEffects)) return
  for (const [k, [name, img]] of Object.entries(A2P_STATUSES)) {
    const id = `v6a2-${k}`
    if (!CONFIG.statusEffects.some((s) => s.id === id)) CONFIG.statusEffects.push({ id, name, img })
  }
}
async function a2pSetStatus (actor, key, active) {
  if (!key || !a2pSetting('statusIcons') || typeof actor?.toggleStatusEffect !== 'function') return
  const id = `v6a2-${key}`
  try {
    const has = actor.statuses?.has?.(id) ?? false
    if (has !== active) await actor.toggleStatusEffect(id, { active })
  } catch (e) { console.warn('V6 Automation | powers: status icon', e) }
}

// ---- building what an activation applies -----------------------------------------
// One holder's share: condition items to create, instant changes, icons, card lines.
function a2pBuildPart (act, fxList, { side, holder, vars, choice, autoDamage = true }) {
  const conditions = []
  const instant = []
  const statuses = new Set()
  const lines = []
  const main = { dr: [], dot: [], upkeep: null, notes: [], extraActions: 0, uses: null, weapon: null, riders: [] }
  const expires = { ...act.expires }
  // An effect can outlast the power itself (a mangled limb lasts until mended).
  const lasts = fxList.find((f) => f.lasts && A2P_SYS_DURATION[f.lasts])?.lasts
  if (lasts) expires.type = lasts
  const duration = lasts ?? act.duration
  const sysDur = A2P_SYS_DURATION[expires.type] ?? 'scene'
  const base = {
    id: act.id, power: act.power, itemUuid: act.itemUuid, key: act.key, side, holder: holder.uuid,
    source: act.casterUuid, sourceName: act.casterName, expires, at: Date.now()
  }
  const desc = (extra) => `<p><strong>${a2pEsc(act.power)}</strong>${side === 'target' ? ` from ${a2pEsc(act.casterName)}` : ''}${act.step ? ` (Maturing ${'●'.repeat(act.step)})` : ''}. ${a2pEsc(extra)}</p><p>Managed by V6 Automation: ends with the power (${a2pEsc(a2pDurationText({ expires }))}). Delete it to end it early.</p>`
  for (const fx of fxList) {
    const kind = fx.kind
    if (kind === 'selfBonus' || kind === 'targetPenalty') {
      const effects = a2pDiceEffects(fx, vars, choice)
      if (!effects.length) continue
      const label = a2pFxLabel(fx, vars, choice)
      conditions.push({ label, effects, uses: fx.uses ? a2pEval(fx.uses, vars) : null, situational: Boolean(fx.situational) })
      lines.push(`${label}${fx.situational ? ' (toggle in the roll dialog)' : ''}`)
      if (fx.status) statuses.add(fx.status)
    } else if (kind === 'damage') {
      const amount = Math.max(0, a2pEval(fx.amount ?? 'margin', vars))
      const track = fx.track === 'willpower' ? 'willpower' : 'health'
      const what = `${amount}${fx.baneful ? ' baneful' : ''} ${track === 'willpower' ? 'Willpower damage' : 'damage'}`
      if (fx.rider) {
        // Extra damage on the creator's own unarmed and melee attacks: the damage dialog adds it.
        if (side === 'self' || fx.on === 'self' || !fx.on) main.riders.push({ amount, baneful: Boolean(fx.baneful), text: fx.text ?? '' })
        lines.push(`+${amount}${fx.baneful ? ' baneful' : ''} damage on unarmed and melee attacks (added in the damage dialog)`)
      } else if (fx.perTurn) {
        main.dot.push({ amount, baneful: Boolean(fx.baneful), track, onlyMortal: Boolean(fx.onlyMortal), name: act.power })
        lines.push(`${what} at the start of each of its turns${fx.onlyMortal ? ' (mortals only)' : ''}`)
        statuses.add(fx.status ?? 'burning')
      } else if (fx.when === 'manual' || !autoDamage) {
        main.notes.push(`${what}: use the card's Apply button${fx.text ? ` (${fx.text})` : ''}`)
        instant.push({ type: 'damage', amount, baneful: Boolean(fx.baneful), track, onlyMortal: Boolean(fx.onlyMortal), ...(fx.overflow ? { overflow: true } : {}), manual: true, label: `${what}${fx.text ? ` (${fx.text})` : ''}`, note: fx.note ?? '' })
        lines.push(`${what}${fx.text ? ` (${fx.text})` : ''}: Apply button`)
      } else {
        instant.push({ type: 'damage', amount, baneful: Boolean(fx.baneful), track, onlyMortal: Boolean(fx.onlyMortal), ...(fx.overflow ? { overflow: true } : {}), note: fx.note ?? '' })
        lines.push(what + (fx.note ? ` (${fx.note})` : ''))
      }
    } else if (kind === 'heal') {
      const amount = Math.max(0, a2pEval(fx.amount ?? 1, vars))
      instant.push({ type: 'heal', track: fx.track ?? 'health', amount })
      lines.push(fx.track === 'baneful' ? `mends ${amount} baneful damage` : fx.track === 'impairment' ? 'ends one impairment' : `mends ${amount} Health`)
    } else if (kind === 'resource') {
      const amount = a2pEval(fx.amount ?? 0, vars)
      if (!amount) continue
      instant.push({ type: 'resource', resource: fx.resource ?? 'willpower', amount, cap: fx.cap ?? null })
      lines.push(`${a2pSigned(amount)} ${fx.resource === 'vitae' ? 'Vitae' : fx.resource === 'health' ? 'Health' : 'Willpower'}`)
    } else if (kind === 'damageReduction') {
      const amount = fx.noEndurance ? 0 : Math.max(0, a2pEval(fx.amount ?? 0, vars))
      main.dr.push({ name: act.power, amount, min1: Boolean(fx.min1), notBaneful: fx.notBaneful !== false, noEndurance: Boolean(fx.noEndurance) })
      lines.push(fx.noEndurance ? 'no Vampiric Endurance while it lasts' : amount >= 50 ? (fx.notBaneful !== false ? 'normal damage does nothing (baneful damage still lands)' : 'no damage gets through') : `damage −${amount}${fx.min1 ? ' (never below 1)' : ''}${fx.notBaneful !== false ? ', not baneful' : ''}`)
      statuses.add(fx.status ?? 'shield')
    } else if (kind === 'extraAction') {
      main.extraActions = Math.max(1, a2pEval(fx.actions ?? 1, vars))
      lines.push(`${a2pPlural(main.extraActions, 'extra action', 'extra actions')} a turn${fx.note ? ` (${fx.note})` : ''}`)
      statuses.add(fx.status ?? 'speed')
    } else if (kind === 'upkeep') {
      main.upkeep = { amount: Math.max(1, a2pEval(fx.amount ?? 1, vars)), resource: fx.resource === 'vitae' ? 'vitae' : 'willpower', per: fx.per ?? 'turnStart', effect: fx.effect ?? (fx.per === 'turnEnd' ? 'extend' : 'keep'), note: fx.note ?? '' }
      lines.push(`upkeep: ${main.upkeep.amount} ${main.upkeep.resource === 'vitae' ? 'Vitae' : 'Willpower'} ${main.upkeep.per === 'night' ? 'each night' : main.upkeep.per === 'turnEnd' ? 'at the end of the turn to extend it' : 'at the start of each turn'}`)
    } else if (kind === 'status') {
      statuses.add(fx.status ?? 'power')
      if (fx.reflect) main.reflect = fx.reflect
      if (fx.weapon) main.weapon = { damage: a2pEval(fx.weapon, vars), baneful: Boolean(fx.baneful), text: fx.note ?? '' }
      lines.push(fx.label ?? fx.note ?? A2P_STATUSES[fx.status]?.[0] ?? 'active')
      if (fx.note) main.notes.push(fx.note)
    } else if (kind === 'narrativeOnly') {
      if (fx.note) main.notes.push(fx.note)
    }
  }
  if (main.extraActions && main.upkeep) main.upkeep.amount = Math.max(main.upkeep.amount, main.extraActions) // 1 per extra action
  const lasting = conditions.length || statuses.size || main.dot.length || main.dr.length || main.upkeep || main.extraActions || main.weapon || main.riders.length
  // The creator always gets a marker while the power lasts; a target only when something stays on it.
  const wantsMarker = duration !== 'instant' && (side === 'self' || lasting)
  if (wantsMarker && side === 'self') statuses.add('power')
  if (wantsMarker && side === 'target') {
    if (conditions.some((c) => c.effects.some((e) => e.mode === 'subtract')) || main.dot.length) statuses.add('weakened')
    else if (conditions.length) statuses.add('aided')
  }
  const out = []
  const img = act.img || 'icons/svg/aura.svg'
  const prefix = `${act.power}${side === 'target' ? ` (${act.casterName})` : ''}`
  if (wantsMarker) {
    if (!conditions.length) conditions.push({ label: '', effects: [], marker: true })
    conditions.forEach((c, i) => {
      const ap = { ...base, main: i === 0, label: c.label, statuses: i === 0 ? [...statuses] : [] }
      if (i === 0) Object.assign(ap, { dr: main.dr, dot: main.dot, upkeep: main.upkeep, notes: main.notes, extraActions: main.extraActions, weapon: main.weapon, riders: main.riders, reflect: main.reflect ?? null, lines, choice: act.choice ?? null, extra: act.extra ?? 0 })
      if (c.uses) ap.uses = c.uses
      out.push({
        // The roll dialog lists each toggle under its condition's name.
        name: c.label ? `${prefix}: ${c.label}` : prefix,
        type: 'condition',
        img,
        system: { description: desc(lines.join('; ') || (main.notes[0] ?? 'Active.')), condition: { duration: sysDur, sourceUuid: act.casterUuid, targetUuid: holder.uuid }, effects: c.effects },
        flags: { world: { a2: { activePower: ap } } }
      })
    })
  }
  return { holderUuid: holder.uuid, holderName: holder.name, conditions: out, instant, statuses: wantsMarker ? [...statuses] : [], lines, notes: main.notes }
}

// ---- applying -------------------------------------------------------------------
async function a2pDoApply (actor, payload = {}) {
  if (!actor) return
  const instant = (payload.instant ?? []).filter((x) => !x.manual)
  if (payload.replace) await a2pRemoveWhere(actor, (ap) => ap.id === payload.replace.id && ap.side === payload.replace.side)
  if (payload.conditions?.length) await actor.createEmbeddedDocuments('Item', payload.conditions)
  for (const s of payload.statuses ?? []) await a2pSetStatus(actor, s, true)
  for (const x of instant) await a2pInstant(actor, x, payload.power)
}

function a2pIsMortal (actor) {
  // eslint-disable-next-line no-undef
  const c = typeof a2Creature === 'function' ? a2Creature(actor) : actor?.flags?.world?.a2?.creature
  return ['mortal', 'animal', 'ghoul'].includes(c) || (actor?.type === 'npc' && !/vampire|kindred|ghost|wraith|spirit/i.test(`${actor.system?.creatureType ?? ''} ${actor.system?.subtype ?? ''}`))
}

async function a2pInstant (actor, x, power = 'Power') {
  const api = globalThis.V6Alpha2 ?? {}
  if (x.type === 'damage') {
    if (x.onlyMortal && !a2pIsMortal(actor)) return
    if (x.track === 'willpower') {
      const cur = a2pInt(actor.system?.willpower?.value)
      await actor.update({ 'system.willpower.value': Math.max(0, cur - x.amount) })
      // Psychic Assault and the like: what Willpower can't soak goes to Health.
      if (x.overflow && x.amount > cur) return a2pInstant(actor, { type: 'damage', amount: x.amount - cur, track: 'health', armour: false }, power)
      return
    }
    // alpha2-actions' Apply damage first (signature (targets, { amount, baneful, armour, source, margin })), then alpha2-core.
    const viaActions = api.actions?.applyDamage
    if (typeof viaActions === 'function') { await viaActions(actor, { amount: x.amount, baneful: x.baneful, source: power, margin: 0, ...(x.armour === false ? { armour: false } : {}) }); return }
    const res = typeof api.damage === 'function' ? await api.damage(actor, x.amount, { baneful: x.baneful }) : null
    if (res === null && actor.system?.health && actor.type === 'npc') {
      await actor.update({ 'system.health.value': Math.max(0, a2pInt(actor.system.health.value) - x.amount) })
    }
    return
  }
  if (x.type === 'heal') {
    const h = typeof api.health === 'function' ? api.health(actor) : null
    if (x.track === 'impairment') {
      // Restore Limb, Purification: end one marked impairment (the first; change it on the sheet if another was meant).
      const key = (api.actions?.impaired?.(actor)?.manual ?? [])[0]
      if (key) await api.actions.recoverImpairment(actor, key)
      return
    }
    if (!h) return
    if (x.track === 'baneful') {
      const ban = Math.max(0, h.baneful - x.amount)
      await actor.update({ 'flags.world.a2.health': { value: Math.min(h.value, h.max - ban), baneful: ban } })
    } else {
      await actor.update({ 'flags.world.a2.health': { value: Math.min(h.max - h.baneful, h.value + x.amount), baneful: h.baneful } })
    }
    return
  }
  if (x.type === 'resource') {
    if (x.resource === 'health') return a2pInstant(actor, x.amount >= 0 ? { type: 'heal', track: 'health', amount: x.amount } : { type: 'damage', amount: -x.amount, track: 'health' }, power)
    const path = x.resource === 'vitae' ? 'system.health' : 'system.willpower'
    const res = foundry.utils.getProperty(actor, path)
    if (!res) return
    const max = a2pInt(res.max) - a2pInt(res.disabled)
    await actor.update({ [`${path}.value`]: Math.min(Math.max(0, a2pInt(res.value) + x.amount), Math.max(0, max)) })
  }
}

// Writes to an actor this user may not own go to the active GM over the
// module socket. Without a socket or a GM they wait on the card: the caller
// adds the returned entry to card.queue and the GM gets an Apply button.
async function a2pRoute (holder, payload) {
  if (!holder) return { how: 'none' }
  if (holder.isOwner) { await a2pDoApply(holder, payload); return { how: 'done' } }
  if (a2pState.socket && a2pHasGM()) { game.socket.emit(A2P_SOCKET, { a2p: 'apply', holderUuid: holder.uuid, payload }); return { how: 'sent' } }
  return { how: 'queued', entry: { holderUuid: holder.uuid, payload } }
}
async function a2pGm (op, data) {
  if (game.user.isGM) return a2pSocketOps[op]?.(data)
  if (a2pState.socket && a2pHasGM()) { game.socket.emit(A2P_SOCKET, { a2p: op, ...data }); return 'sent' }
  ui.notifications.warn('V6 Automation: this needs the GM (no GM connected, or no module socket in the macro version).')
  return null
}

// ---- activation ---------------------------------------------------------------------
async function a2pAsk (spec, actor, vars) {
  const ask = spec.ask ?? {}
  if (!ask.choose && !ask.extra) return {}
  const parts = []
  if (ask.choose) parts.push(`<div class="form-group"><label>${a2pEsc(ask.choose.label ?? 'Choose')}</label><select name="choice">${(ask.choose.options ?? []).map((o) => `<option value="${a2pEsc(o.value ?? o)}">${a2pEsc(o.label ?? a2pCap(o.value ?? o))}</option>`).join('')}</select></div>`)
  let max = 0
  if (ask.extra) {
    max = Math.max(0, a2pEval(ask.extra.max ?? 0, vars))
    if (max > 0) parts.push(`<div class="form-group"><label>${a2pEsc(ask.extra.label ?? 'Extra')}</label><input type="number" name="extra" value="${a2pInt(ask.extra.default)}" min="0" max="${max}" step="1"></div>${ask.extra.hint ? `<p class="hint">${a2pEsc(ask.extra.hint)}</p>` : ''}`)
  }
  if (!parts.length) return {}
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${spec.name ?? 'Power'}: ${actor.name}` },
    content: parts.join(''),
    ok: { label: 'Apply', callback: (ev, button) => ({ choice: button.form.elements.choice?.value ?? null, extra: button.form.elements.extra ? a2pInt(button.form.elements.extra.value) : 0 }) },
    rejectClose: false
  }).catch(() => null)
  const out = { choice: r?.choice ?? ask.choose?.options?.[0]?.value ?? ask.choose?.options?.[0] ?? null, extra: Math.min(max, Math.max(0, a2pInt(r?.extra))) }
  // Extra costs are paid at activation (PG p.149).
  if (out.extra && ask.extra?.cost) {
    const each = Math.max(1, a2pInt(ask.extra.cost.each, 1))
    const path = ask.extra.cost.resource === 'willpower' ? 'system.willpower.value' : 'system.health.value'
    const cur = a2pInt(foundry.utils.getProperty(actor, path))
    const afford = Math.floor(cur / each)
    if (afford < out.extra) { ui.notifications.warn(`${actor.name} can only pay for ${afford} extra.`); out.extra = afford }
    if (out.extra) await actor.update({ [path]: cur - out.extra * each })
  }
  return out
}

function a2pFindActiveFor (item) {
  const actor = item?.actor
  if (!actor) return null
  return a2pList(actor).find((g) => g.side === 'self' && g.ap?.itemUuid === item.uuid) ?? null
}

// A power that is already running: a new test on the same activation (no new
// cost: Draining Darkness, Grasping Shadows, more targets) or a fresh one.
async function a2pAskRepeat (item, prior, spec) {
  const same = Boolean(spec?.repeat)
  const r = await foundry.applications.api.DialogV2.wait({
    window: { title: `${item.name} is active` },
    content: `<p>${a2pEsc(item.name)} is already active for ${a2pEsc(item.actor.name)} (${a2pEsc(a2pDurationText(prior.ap))}).</p><p>${a2pEsc(spec?.repeat?.note ?? 'A new test on the same activation costs nothing more. A new activation ends the old one.')}</p>`,
    buttons: [
      { action: 'same', label: 'Same activation (no cost)', default: same },
      { action: 'new', label: 'New activation', default: !same }
    ],
    rejectClose: false
  }).catch(() => null)
  return r ?? (same ? 'same' : 'new')
}

// Give back what the roll's cost payment took (before = the resource before the roll).
async function a2pRefund (item, before = null) {
  const cost = item?.system?.activation?.cost
  const actor = item?.actor
  if (!actor || !a2pInt(cost?.amount) || !['health', 'willpower'].includes(cost?.type)) return
  const res = actor.system?.[cost.type]
  const paid = before === null ? 0 : Math.min(a2pInt(cost.amount), Math.max(0, a2pInt(before) - a2pInt(res?.value)))
  if (!paid) return
  await actor.update({ [`system.${cost.type}.value`]: Math.min(a2pInt(res?.value) + paid, a2pInt(res?.max)) })
  ui.notifications.info(`${item.name}: same activation, ${paid} ${cost.type === 'health' ? 'Vitae' : 'Willpower'} refunded.`)
}

async function a2pPayNoRoll (item, { force = false } = {}) {
  const actor = item.actor
  const cost = item.system?.activation?.cost
  const amount = a2pInt(cost?.amount)
  if (!amount || !['health', 'willpower'].includes(cost?.type)) return true
  const label = cost.type === 'health' ? 'Vitae' : 'Willpower'
  const cur = a2pInt(actor.system?.[cost.type]?.value)
  if (cur < amount && !force) {
    if (!game.user.isGM) { ui.notifications.warn(`${actor.name} has only ${cur} ${label}; ${item.name} costs ${amount}.`); return false }
    const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: item.name }, content: `<p>${a2pEsc(actor.name)} has only ${cur} ${label}; ${a2pEsc(item.name)} costs ${amount}. Activate anyway?</p>`, rejectClose: false }).catch(() => false)
    if (!ok) return false
  }
  // eslint-disable-next-line no-undef
  if (typeof v6aPayCost === 'function') { await v6aPayCost(item); return true }
  await actor.update({ [`system.${cost.type}.value`]: Math.max(0, cur - amount) })
  return true
}

// item: the power; roll: the evaluated WOD6eRoll (null for no-roll activation).
async function a2pActivate (item, { roll = null, messageId = null, targets = null, mode = 'new', prior = null } = {}) {
  const actor = item?.actor
  if (!actor || item.type !== 'discipline') return null
  const data = await a2pLoadData()
  const raw = a2pFindSpec(item, data) ?? a2pFallbackSpec(item)
  const vars0 = a2pVars(actor, item)
  const spec = a2pApplySteps({ ...raw, name: item.name }, vars0.dots)
  const v = roll?.a2Verdict ?? null
  const contested = a2pIsContested(item)
  const repeat = mode === 'same' && prior
  if (mode === 'new' && prior) await a2pEnd(prior.id, { quiet: true })
  const answers = repeat ? { choice: prior.ap.choice ?? null, extra: a2pInt(prior.ap.extra) } : await a2pAsk(spec, actor, vars0)
  const successes = v ? a2pInt(v.successes) : 0
  const margin = v ? Math.max(0, a2pInt(v.margin ?? v.successes)) : 0
  const vars = { ...vars0, successes, margin, extra: a2pInt(answers.extra) }
  const combat = game.combat ?? null
  const cbt = a2pCombatantOf(combat, actor)
  const duration = A2P_SYS_DURATION[spec.duration] ? spec.duration : (A2P_FROM_ITEM_DURATION[item.system?.activation?.duration] ?? 'scene')
  const turns = duration === 'turn' ? Math.max(1, a2pEval(spec.turns ?? 1, vars)) : null
  const act = {
    id: repeat ? prior.id : a2pId(),
    key: raw.key ?? null,
    power: item.name,
    img: item.img,
    itemUuid: item.uuid,
    casterUuid: actor.uuid,
    casterName: actor.name,
    duration,
    step: spec.step,
    choice: answers.choice ?? null,
    extra: a2pInt(answers.extra),
    expires: { type: duration, combatId: combat?.id ?? null, combatantId: cbt?.id ?? null, round: combat?.round ?? null, turnsLeft: turns, sceneId: game.scenes?.active?.id ?? null }
  }
  let fx = a2pActiveFx(spec, vars0.dots, act.choice)
  if (repeat) fx = spec.repeat?.fx ? a2pActiveFx({ fx: spec.repeat.fx }, vars0.dots, act.choice) : fx.filter((f) => a2pSide(f) === 'target')
  const selfNow = []
  const selfOnWin = []
  const targetFx = []
  const manual = []
  // The power is active once paid for, whatever its test shows, unless an
  // effect needs a won test (PG p.149: the cost is part of activating it).
  for (const f of fx) {
    const when = a2pWhen(f, contested)
    if (when === 'manual' && f.kind !== 'damage') { manual.push(f); continue }
    if (a2pSide(f) === 'target') targetFx.push(f)
    else if (when === 'win' && contested) selfOnWin.push(f)
    else if (when === 'win' && v?.win === false) continue
    else selfNow.push(f)
  }
  // Targets: the user's targeted tokens, without the caster.
  const tlist = (targets ?? a2pCurrentTargets()).filter((t) => t.uuid && t.uuid !== actor.uuid)
  const oppose = item.flags?.world?.a2?.oppose ?? null
  const card = {
    v: 1,
    act: act.id,
    repeat: Boolean(repeat),
    power: item.name,
    key: act.key,
    auto: raw.auto ?? null,
    itemUuid: item.uuid,
    casterUuid: actor.uuid,
    casterName: actor.name,
    rollMessageId: messageId,
    noRoll: !roll,
    successes,
    attr: a2pInt(roll?.options?.a2?.attr),
    margin,
    win: v ? v.win : null,
    dots: vars0.dots,
    step: spec.step,
    choice: act.choice,
    extra: act.extra,
    duration,
    durationText: a2pDurationText({ expires: act.expires }),
    contested,
    opposeText: oppose?.text ?? '',
    summary: spec.summary ?? '',
    why: (spec.fx ?? []).find((f) => f.kind === 'narrativeOnly')?.why ?? '',
    self: [],
    targets: [],
    manual: [],
    queue: [],
    ended: false
  }
  // Self part.
  if (!repeat || selfNow.length) {
    const part = a2pBuildPart(act, selfNow, { side: 'self', holder: actor, vars, choice: act.choice, autoDamage: a2pSetting('autoDamage') })
    if (part.conditions.length || part.instant.length || part.statuses.length) await a2pDoApply(actor, { ...part, power: item.name })
    card.self = part.lines
    card.selfNotes = part.notes
    card.manual.push(...part.instant.filter((x) => x.manual).map((x) => ({ ...x, holderUuid: actor.uuid, holderName: actor.name })))
  }
  // Target parts: stored on the card so later resolution can build them.
  card.fxTarget = targetFx
  card.fxSelfWin = selfOnWin
  card.vars = vars
  card.actData = act
  for (const [i, t] of tlist.entries()) {
    let npcHalf = null
    if (contested && a2pSetting('npcHalf') && t.actor?.type === 'npc' && typeof a2NpcBestLevel === 'function') { // eslint-disable-line no-undef
      const best = a2NpcBestLevel(t.actor, (oppose?.attributes ?? []).map((k) => String(k).split('.').pop())) // eslint-disable-line no-undef
      npcHalf = { pool: best.value, label: best.label }
    }
    const st = (targetFx.length || selfOnWin.length) ? a2pInitialStatus({ contested, v: roll ? v : null, index: i, npcHalf: roll ? npcHalf : null }) : { status: 'none', margin: 0, how: '' }
    card.targets.push({ uuid: t.uuid, name: t.name, status: st.status, margin: st.margin, how: st.how, lines: [] })
  }
  for (const f of manual) card.manual.push({ type: 'fx', label: `Apply ${a2pFxLabel(f, vars, act.choice)}`, fx: f })
  const msg = await a2pCreateCard(actor, card)
  // Resolve what is known already (needs the card id for queued GM writes).
  for (const t of card.targets) if (t.status === 'won') await a2pApplyTarget(msg, t.uuid, t.margin, { initial: true })
  return { act, card: msg }
}

// Apply the stored target effects to one target after a win.
async function a2pApplyTarget (msg, targetUuid, margin, { initial = false } = {}) {
  const card = foundry.utils.deepClone(msg?.flags?.world?.a2p ?? null)
  if (!card) return
  const t = card.targets.find((x) => x.uuid === targetUuid)
  if (!t || t.status === 'applied') return
  const holder = a2pFrom(targetUuid)
  const vars = { ...card.vars, margin: Math.max(0, a2pInt(margin)) }
  const act = { ...card.actData }
  const part = a2pBuildPart(act, card.fxTarget ?? [], { side: 'target', holder: holder ?? { uuid: targetUuid, name: t.name }, vars, choice: card.choice, autoDamage: a2pSetting('autoDamage') })
  const replace = card.repeat && (card.fxTarget ?? []).some((f) => f.replace) ? { id: act.id, side: 'target' } : null
  card.queue ??= []
  if (holder && (part.conditions.length || part.instant.some((x) => !x.manual) || part.statuses.length || replace)) {
    const r = await a2pRoute(holder, { ...part, power: card.power, replace })
    if (r.entry) { card.queue.push(r.entry); t.queued = true }
  }
  t.status = 'applied'
  t.margin = vars.margin
  t.lines = part.lines.length ? part.lines : ['no lasting effect']
  card.manual.push(...part.instant.filter((x) => x.manual).map((x) => ({ ...x, holderUuid: targetUuid, holderName: t.name })))
  // Self effects that need a won test (Fool the Heart's Eye, Theft of Vitae) land with the first win.
  if (card.fxSelfWin?.length && !card.selfWinDone) {
    const caster = a2pFrom(card.casterUuid)
    if (caster) {
      const sp = a2pBuildPart(act, card.fxSelfWin, { side: 'self', holder: caster, vars, choice: card.choice, autoDamage: a2pSetting('autoDamage') })
      // The marker came with the activation: these are extra parts, without another 'power' icon.
      const conditions = sp.conditions.filter((c) => c.system.effects.length).map((c) => { c.flags.world.a2.activePower.main = false; c.flags.world.a2.activePower.statuses = []; return c })
      const r = await a2pRoute(caster, { ...sp, statuses: [], conditions, power: card.power })
      if (r.entry) card.queue.push(r.entry)
      card.self = [...(card.self ?? []), ...sp.lines]
    }
    card.selfWinDone = true
  }
  await a2pUpdateCard(msg, card)
}

// ---- the power card -----------------------------------------------------------------
async function a2pCreateCard (actor, card) {
  const head = `${card.repeat ? 'Again: ' : ''}${card.power}`
  const content = `<div class="wod6e chat-card a2p-card" data-a2p-act="${a2pEsc(card.act)}"><h4 class="chat-card-name">${a2pEsc(head)}</h4><div class="a2p-body"></div></div>`
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: a2pOwners(actor),
    content,
    flags: { world: { a2p: card } }
  })
}
async function a2pUpdateCard (msg, card) {
  if (!msg) return
  if (msg.isOwner) { await msg.update({ 'flags.world.a2p': card }); return }
  await a2pGm('card', { messageId: msg.id, card })
}

function a2pCardBody (message) {
  const c = message.flags?.world?.a2p ?? {}
  const rows = []
  const res = c.noRoll ? 'Activated without a roll' : `${a2pPlural(c.successes, 'success', 'successes')}${c.win === true ? ' · won' : c.win === false ? ' · lost' : ''}${c.margin && c.win !== false && !c.contested ? ` · margin ${c.margin}` : ''}`
  rows.push(`<div class="a2p-line"><strong>${a2pEsc(res)}</strong> · ${a2pEsc(c.durationText ?? '')}${c.step ? ` · Maturing ${'●'.repeat(c.step)}` : ''}${c.choice ? ` · ${a2pEsc(a2pCap(c.choice))}` : ''}${c.extra ? ` · extra ${c.extra}` : ''}</div>`)
  if (c.summary) rows.push(`<div class="a2p-line a2p-summary">${a2pEsc(c.summary)}</div>`)
  if (c.self?.length) rows.push(`<div class="a2p-line"><em>${a2pEsc(c.casterName)}</em>: ${a2pEsc(c.self.join('; '))}</div>`)
  for (const n of c.selfNotes ?? []) rows.push(`<div class="a2p-line a2p-note">${a2pEsc(n)}</div>`)
  if (!c.self?.length && c.why) rows.push(`<div class="a2p-line a2p-note">Not automated: ${a2pEsc(c.why)}.</div>`)
  const hasTargetFx = (c.fxTarget ?? []).length || (c.fxSelfWin ?? []).length
  if (hasTargetFx && !c.targets?.length) rows.push('<div class="a2p-line a2p-note">No token targeted: target effects not applied. Target tokens and use "Apply to targets".</div>')
  for (const t of c.targets ?? []) {
    let txt
    if (t.status === 'pending') txt = `pending: ${c.opposeText ? `opposed by ${c.opposeText}, ` : ''}${t.how}`
    else if (t.status === 'lost') txt = `resisted (${t.how}): no effect`
    else if (t.status === 'applied') txt = `${t.margin ? `margin ${t.margin}: ` : ''}${(t.lines ?? []).join('; ')}${t.queued ? ' (waiting for the GM)' : ''}`
    else if (t.status === 'none') txt = 'no effect on targets'
    else txt = t.status
    rows.push(`<div class="a2p-line a2p-target" data-uuid="${a2pEsc(t.uuid)}"><em>${a2pEsc(t.name)}</em>: ${a2pEsc(txt)}</div>`)
  }
  if (c.ended) rows.push('<div class="a2p-line a2p-note">Ended.</div>')
  return rows.join('')
}

function a2pRenderCard (message, root) {
  const c = message.flags?.world?.a2p
  const box = root.querySelector('.a2p-card .a2p-body')
  if (!c || !box) return
  box.innerHTML = a2pCardBody(message)
  const caster = a2pFrom(c.casterUuid)
  const actions = document.createElement('div')
  actions.className = 'a2p-actions'
  const btn = (label, icon, title, fn) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = `<i class="fa-solid ${icon}"></i> ${a2pEsc(label)}`
    b.title = title
    b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); Promise.resolve(fn(ev)).catch((e) => console.error('V6 Automation | powers', e)) })
    actions.append(b)
  }
  const gm = game.user.isGM
  for (const t of c.targets ?? []) {
    if (t.status !== 'pending') continue
    const target = a2pFrom(t.uuid)
    const rollMsg = c.rollMessageId ? game.messages?.get(c.rollMessageId) : null
    const roll = rollMsg?.rolls?.find((r) => r?.options?.a2?.built)
    if (target?.isOwner && roll && typeof a2RollForTarget === 'function' && roll.options.a2.oppose) { // eslint-disable-line no-undef
      // alpha2-core opens the target's dialog with the Oppose pool, linked to the power roll.
      btn(`Roll for ${t.name}`, 'fa-dice-d10', `Roll ${c.opposeText} for ${t.name} against this power`, () => a2RollForTarget(rollMsg, roll, target)) // eslint-disable-line no-undef
    }
    if (gm) {
      btn(`Affects ${t.name}`, 'fa-check', 'The power beat this target: apply its effects (asks for the margin)', () => a2pResolveByHand(message, t))
      btn(`${t.name} resisted`, 'fa-xmark', 'The target resisted: no effect', () => a2pResolve(message, t.uuid, false, 0))
    }
  }
  if (((c.fxTarget ?? []).length || (c.fxSelfWin ?? []).length) && !c.ended && (gm || caster?.isOwner)) {
    btn('Apply to targets', 'fa-crosshairs', 'Apply the target effects to the tokens you target now (asks for the margin)', () => a2pApplyToCurrent(message))
  }
  for (const [i, m] of (c.manual ?? []).entries()) {
    if (m.done) continue
    const holder = a2pFrom(m.holderUuid)
    if (!(gm || holder?.isOwner || (m.type === 'fx' && caster?.isOwner))) continue
    btn(`${m.label ?? 'Apply'}${m.holderName ? ` → ${m.holderName}` : ''}`, 'fa-burst', 'Apply this now (you can change the amount)', () => a2pApplyManual(message, i))
  }
  if (gm) {
    for (const [i, q] of (c.queue ?? []).entries()) {
      if (q.done) continue
      btn(`GM: apply to ${a2pFrom(q.holderUuid)?.name ?? 'target'}`, 'fa-user-shield', 'A player activated this without a GM connected: apply it now', () => a2pApplyQueued(message, i))
    }
  }
  if (!c.ended && c.duration !== 'instant' && (gm || caster?.isOwner)) btn('End effect', 'fa-power-off', 'End this power now (PG p.149: no action needed)', () => a2pEnd(c.act))
  if (actions.childElementCount) box.append(actions)
}

async function a2pResolveByHand (message, t) {
  const m = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${message.flags.world.a2p.power}: ${t.name}` },
    content: '<div class="form-group"><label>Margin of success</label><input type="number" name="margin" value="0" min="0" step="1" autofocus></div>',
    ok: { label: 'Apply', callback: (ev, button) => a2pInt(button.form.elements.margin.value) },
    rejectClose: false
  }).catch(() => null)
  if (m === null || m === undefined) return
  await a2pResolve(message, t.uuid, true, m)
}
async function a2pResolve (message, targetUuid, win, margin) {
  if (!message) return
  if (!game.user.isGM && !message.isOwner) return a2pGm('resolve', { messageId: message.id, targetUuid, win, margin })
  const card = foundry.utils.deepClone(message.flags?.world?.a2p ?? {})
  const t = card.targets?.find((x) => x.uuid === targetUuid)
  if (!t || (t.status !== 'pending' && t.status !== 'won')) return
  if (!win) { t.status = 'lost'; t.how = t.how === 'waiting for the opposing roll' ? 'by hand' : t.how; await a2pUpdateCard(message, card); return }
  await a2pApplyTarget(message, targetUuid, margin)
}
async function a2pApplyToCurrent (message) {
  const c = message.flags?.world?.a2p ?? {}
  const tlist = a2pCurrentTargets().filter((t) => t.uuid !== c.casterUuid)
  if (!tlist.length) { ui.notifications.info('Target one or more tokens first.'); return }
  const m = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${c.power}: apply to ${tlist.map((t) => t.name).join(', ')}` },
    content: `<div class="form-group"><label>Margin of success</label><input type="number" name="margin" value="${a2pInt(c.margin)}" min="0" step="1" autofocus></div>`,
    ok: { label: 'Apply', callback: (ev, button) => a2pInt(button.form.elements.margin.value) },
    rejectClose: false
  }).catch(() => null)
  if (m === null || m === undefined) return
  const card = foundry.utils.deepClone(c)
  for (const t of tlist) {
    const ex = card.targets.find((x) => x.uuid === t.uuid)
    if (ex) ex.status = 'won'
    else card.targets.push({ uuid: t.uuid, name: t.name, status: 'won', margin: m, how: 'by hand', lines: [] })
  }
  await a2pUpdateCard(message, card)
  const fresh = game.messages?.get(message.id) ?? message
  for (const t of tlist) await a2pApplyTarget(fresh, t.uuid, m)
}
async function a2pApplyManual (message, index) {
  const card = foundry.utils.deepClone(message.flags?.world?.a2p ?? {})
  const m = card.manual?.[index]
  if (!m || m.done) return
  const holder = a2pFrom(m.holderUuid)
  if (m.type === 'fx') {
    // An effect that waits on a test made elsewhere (Bone Breaker's attack): onto the
    // current targets, or onto the creator for its own effects.
    const self = a2pSide(m.fx) === 'self'
    const holders = self ? [a2pFrom(card.casterUuid)].filter(Boolean) : a2pCurrentTargets().map((t) => t.actor).filter(Boolean)
    if (!holders.length) { ui.notifications.info('Target the token(s) first.'); return }
    for (const h of holders) {
      const part = a2pBuildPart(card.actData, [m.fx], { side: self ? 'self' : 'target', holder: h, vars: card.vars, choice: card.choice, autoDamage: true })
      const r = await a2pRoute(h, { ...part, power: card.power })
      if (r.entry) card.queue = [...(card.queue ?? []), r.entry]
    }
  } else if (holder) {
    const amount = await foundry.applications.api.DialogV2.prompt({
      window: { title: `${card.power}: ${m.label}` },
      content: `<div class="form-group"><label>Amount</label><input type="number" name="amount" value="${a2pInt(m.amount)}" min="0" step="1" autofocus></div>${m.note ? `<p class="hint">${a2pEsc(m.note)}</p>` : ''}`,
      ok: { label: 'Apply', callback: (ev, button) => a2pInt(button.form.elements.amount.value) },
      rejectClose: false
    }).catch(() => null)
    if (amount === null || amount === undefined) return
    const r = await a2pRoute(holder, { conditions: [], statuses: [], instant: [{ ...m, manual: false, amount }], power: card.power })
    if (r.entry) card.queue = [...(card.queue ?? []), r.entry]
  }
  m.done = true
  await a2pUpdateCard(message, card)
}
async function a2pApplyQueued (message, index) {
  const card = foundry.utils.deepClone(message.flags?.world?.a2p ?? {})
  const q = card.queue?.[index]
  if (!q || q.done) return
  await a2pDoApply(a2pFrom(q.holderUuid), q.payload)
  q.done = true
  for (const t of card.targets ?? []) if (t.uuid === q.holderUuid) t.queued = false
  await message.update({ 'flags.world.a2p': card })
}

// ---- ending --------------------------------------------------------------------------
async function a2pRemoveWhere (actor, test) {
  const conds = a2pConds(actor).filter((c) => test(a2pAP(c), c))
  if (!conds.length) return 0
  const gone = new Set(conds.map((c) => c.id))
  const keep = new Set(a2pConds(actor).filter((c) => !gone.has(c.id)).flatMap((c) => a2pAP(c).statuses ?? []))
  const drop = new Set(conds.flatMap((c) => a2pAP(c).statuses ?? []))
  if (actor.isOwner) {
    await actor.deleteEmbeddedDocuments('Item', [...gone])
    for (const s of drop) if (!keep.has(s)) await a2pSetStatus(actor, s, false)
  } else {
    await a2pGm('remove', { holderUuid: actor.uuid, ids: [...gone], statuses: [...drop].filter((s) => !keep.has(s)) })
  }
  return conds.length
}
async function a2pEnd (idOrItem, { quiet = false, reason = '' } = {}) {
  let id = idOrItem
  if (idOrItem && typeof idOrItem === 'object') id = idOrItem.id && idOrItem.documentName !== 'Item' ? idOrItem.id : a2pFindActiveFor(idOrItem)?.id
  if (!id) return 0
  let n = 0
  for (const actor of a2pAllActors()) n += await a2pRemoveWhere(actor, (ap) => ap.id === id)
  const msg = (game.messages?.contents ?? []).slice(-200).reverse().find((m) => m.flags?.world?.a2p?.act === id && !m.flags.world.a2p.repeat)
  if (msg && !msg.flags.world.a2p.ended && (msg.isOwner || game.user.isGM)) await msg.update({ 'flags.world.a2p.ended': true, 'flags.world.a2p.endReason': reason }).catch(() => null)
  if (n && !quiet && reason) console.log(`V6 Automation | powers: ended ${id} (${reason})`)
  return n
}
// End every activation one of whose parts matches (GM: scene end, new night, torpor).
async function a2pEndWhere (test, reason) {
  const ids = new Set()
  for (const actor of a2pAllActors()) for (const c of a2pConds(actor)) { const ap = a2pAP(c); if (test(ap)) ids.add(ap.id) }
  for (const id of ids) await a2pEnd(id, { reason })
  return ids.size
}
async function a2pEndScene () {
  if (!game.user.isGM) return a2pGm('endScene', {})
  const n = await a2pEndWhere((ap) => a2pEndsOn(ap, 'sceneEnd'), 'end of scene')
  ui.notifications.info(`End of scene: ${a2pPlural(n, 'power', 'powers')} ended.`)
  return n
}
// Called by the New Night tool: Hooks.callAll('v6a2NewNight'). One night ends
// at sunrise (PG p.149); a power with a nightly upkeep (Twist Flesh) asks to be
// paid instead, and ends if it wasn't paid last time.
async function a2pNewNight () {
  if (!game.user.isGM) return a2pGm('newNight', {})
  const n = await a2pEndWhere((ap) => a2pEndsOn(ap, 'newNight'), 'new night')
  for (const actor of a2pAllActors()) {
    for (const c of a2pConds(actor)) {
      const ap = a2pAP(c)
      if (!ap.main || ap.upkeep?.per !== 'night') continue
      if (ap.upkeep.due && !ap.upkeep.paid) { await a2pEnd(ap.id, { reason: 'upkeep not paid' }); continue }
      await a2pMarkDue(c, `night:${Date.now()}`)
    }
  }
  return n
}
async function a2pEndAll () {
  if (!game.user.isGM) return 0
  return a2pEndWhere(() => true, 'ended by the GM')
}

// ---- combat: turn expiry, damage over time, upkeep ------------------------------------
// The active GM does the bookkeeping; the payer's client answers the upkeep
// prompt when the GM marks it due (updateItem hook, a2pOnUpdateItem).
async function a2pOnCombat (combat, changes) {
  if (!a2pOn() || !combat || !a2pIsActiveGM() || !('turn' in (changes ?? {}) || 'round' in (changes ?? {}))) return
  const current = combat.combatant
  for (const actor of a2pAllActors()) {
    for (const c of a2pConds(actor)) {
      const ap = a2pAP(c)
      const tick = a2pTurnTick(ap.expires, { combatId: combat.id, combatantId: current?.id })
      if (tick.end) { await a2pEnd(ap.id, { reason: 'one turn is over' }); continue }
      if (tick.expires !== ap.expires) await c.update({ 'flags.world.a2.activePower.expires': tick.expires })
    }
  }
  const holder = current?.actor
  // Damage over time at the start of the holder's own turn.
  for (const c of a2pConds(holder)) {
    for (const d of a2pAP(c).dot ?? []) await a2pInstant(holder, { type: 'damage', amount: d.amount, baneful: d.baneful, track: d.track, onlyMortal: d.onlyMortal }, d.name)
  }
  // Upkeep is paid at the start of your turn or the power ends (PG p.149).
  for (const c of a2pConds(holder)) {
    const ap = a2pAP(c)
    if (!ap.main || ap.upkeep?.per !== 'turnStart') continue
    if (ap.upkeep.due && !ap.upkeep.paid) { await a2pEnd(ap.id, { reason: 'upkeep not paid' }); continue }
    if (ap.expires?.combatId !== combat.id || combat.round > a2pInt(ap.expires?.round)) await a2pMarkDue(c, `turn:${combat.id}:${combat.round}`)
  }
  // "At the end of your turn you can pay to extend it" (Blurred Passage).
  const prev = combat.previous?.combatantId ? combat.combatants?.get?.(combat.previous.combatantId)?.actor : null
  for (const c of a2pConds(prev)) {
    const ap = a2pAP(c)
    if (ap.main && ap.upkeep?.per === 'turnEnd') await a2pMarkDue(c, `end:${combat.id}:${combat.round}:${combat.turn}`)
  }
}
async function a2pMarkDue (cond, due) {
  await cond.update({ 'flags.world.a2.activePower.upkeep.due': due, 'flags.world.a2.activePower.upkeep.paid': false })
}
function a2pOnUpdateItem (item, changes) {
  if (!a2pOn() || item?.type !== 'condition') return
  const due = changes?.flags?.world?.a2?.activePower?.upkeep?.due
  const ap = a2pAP(item)
  if (!due || !ap?.upkeep || ap.upkeep.paid || !item.parent) return
  if (a2pPayer(item.parent) !== game.user) return
  setTimeout(() => a2pUpkeepDue(item.parent, item).catch((e) => console.error('V6 Automation | powers upkeep', e)), 50)
}
async function a2pUpkeepDue (actor, cond) {
  const ap = a2pAP(cond)
  const u = ap?.upkeep
  if (!u || u.paid || a2pState.prompting.has(cond.uuid)) return
  a2pState.prompting.add(cond.uuid)
  try {
    const label = u.resource === 'vitae' ? 'Vitae' : 'Willpower'
    const path = u.resource === 'vitae' ? 'system.health.value' : 'system.willpower.value'
    const cur = a2pInt(foundry.utils.getProperty(actor, path))
    const extend = u.per === 'turnEnd'
    const night = u.per === 'night'
    const verb = extend ? 'extend it to the end of your next turn' : night ? 'keep it for another night' : 'keep it this turn'
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${ap.power}: upkeep` },
      content: `<p>${a2pEsc(actor.name)}: pay ${u.amount} ${label} to ${verb}? You have ${cur}.</p>${u.note ? `<p class="hint">${a2pEsc(u.note)}</p>` : ''}<p class="hint">PG p.149: upkeep is paid at the start of your turn, or the power ends.</p>`,
      rejectClose: false
    }).catch(() => null)
    const fresh = actor.items.get(cond.id)
    if (!fresh) return
    if (ok && cur >= u.amount) {
      await actor.update({ [path]: cur - u.amount })
      const upd = { 'flags.world.a2.activePower.upkeep.paid': true }
      if (extend) upd['flags.world.a2.activePower.expires.turnsLeft'] = a2pInt(ap.expires?.turnsLeft, 1) + 1
      await fresh.update(upd)
      ui.notifications.info(`${ap.power}: paid ${u.amount} ${label}.`)
    } else if (ok === false || ok) {
      // Declined, or not enough to pay: it ends (an extension simply lapses).
      if (ok) ui.notifications.warn(`${actor.name} has only ${cur} ${label}: ${ap.power} ends.`)
      if (!extend) await a2pEnd(ap.id, { reason: 'upkeep not paid' })
    }
    // Closed without an answer: still due; unpaid at the next turn start (or night), it ends.
  } finally { a2pState.prompting.delete(cond.uuid) }
}

// ---- damage reduction hook --------------------------------------------------------------
function a2pReduceFor (actor, amount, opts = {}) {
  const drs = a2pConds(actor).flatMap((c) => a2pAP(c).dr ?? [])
  // eslint-disable-next-line no-undef
  const genMod = typeof a2ActorGenMod === 'function' ? a2ActorGenMod(actor) : 0
  return a2pReduce(amount, { baneful: Boolean(opts?.baneful), genMod }, drs)
}
function a2pWrapDamage (fn) {
  if (typeof fn !== 'function' || fn.__a2p) return fn
  const wrapped = async function (actor, amount, opts = {}) {
    let n = amount
    try {
      if (a2pOn() && actor && !opts?.a2pNoReduce) {
        const r = a2pReduceFor(actor, amount, opts)
        if (r.notes.length) {
          n = r.amount
          // eslint-disable-next-line no-undef
          if (opts?.note !== false && typeof a2Note === 'function') await a2Note(actor, `${actor.name}: damage reduced`, [`${a2pInt(amount)} → ${n} before Vampiric Endurance: ${r.notes.join(', ')}.`])
        }
      }
    } catch (e) { console.error('V6 Automation | powers: damage reduction', e) }
    return fn.call(this, actor, n, opts)
  }
  wrapped.__a2p = true
  return wrapped
}
function a2pPatchDamage () {
  // alpha2-core's sheet prompt calls a2DamageActor by name; in the shared
  // build scope that binding can be wrapped in place. The API entry too.
  try {
    // eslint-disable-next-line no-undef, no-func-assign
    if (typeof a2DamageActor === 'function' && !a2DamageActor.__a2p) a2DamageActor = a2pWrapDamage(a2DamageActor)
  } catch (e) { /* separate module scope: the API wrapper below still works */ }
  const api = globalThis.V6Alpha2
  if (api && typeof api.damage === 'function' && !api.damage.__a2p) api.damage = a2pWrapDamage(api.damage)
}

// ---- roll dialog: activation after the roll ------------------------------------------------
async function a2pPatchOpen () {
  // eslint-disable-next-line no-undef
  let RD = typeof a2State !== 'undefined' ? a2State.RollDialog : null
  if (!RD) {
    try {
      // eslint-disable-next-line no-undef
      const url = typeof a2SystemUrl === 'function' ? a2SystemUrl('core/dialogs/roll-dialog.js') : foundry.utils.getRoute('systems/wod6e/system/core/dialogs/roll-dialog.js')
      RD = (await import(url)).RollDialog
    } catch (e) { console.error('V6 Automation | powers: roll dialog not found', e); return }
  }
  if (!RD || Object.prototype.hasOwnProperty.call(RD, '__a2p')) return
  const open = RD.open
  RD.open = async function (input = {}) {
    const item = input instanceof Item ? input : (input?.item ?? null)
    const isPower = a2pOn() && item?.type === 'discipline' && item.actor
    let mode = 'new'
    let prior = null
    if (isPower) {
      prior = a2pFindActiveFor(item)
      if (prior) mode = await a2pAskRepeat(item, prior, a2pFindSpec(item, await a2pLoadData()))
    }
    const targets = isPower ? a2pCurrentTargets() : null
    const costType = item?.system?.activation?.cost?.type
    const before = isPower && ['health', 'willpower'].includes(costType) ? a2pInt(item.actor.system?.[costType]?.value) : null
    const result = await open.call(this, input)
    if (isPower && result instanceof Roll) {
      try {
        if (mode === 'same') await a2pRefund(item, before)
        const rec = a2pState.lastRoll.get(item.uuid)
        const messageId = rec && Date.now() - rec.at < 20000 ? rec.id : null
        await a2pActivate(item, { roll: result, messageId, targets, mode, prior })
      } catch (e) { console.error('V6 Automation | powers: activation failed', e) }
    }
    return result
  }
  Object.defineProperty(RD, '__a2p', { value: true })
}

// The bolt button: activation without a roll (pays the cost, PG p.149).
async function a2pActivateNoRoll (item, ev = null) {
  if (!item?.actor?.isOwner) return
  const prior = a2pFindActiveFor(item)
  let mode = 'new'
  if (prior) mode = await a2pAskRepeat(item, prior, a2pFindSpec(item, await a2pLoadData()))
  if (mode === 'new' && !(await a2pPayNoRoll(item, { force: Boolean(ev?.shiftKey && game.user.isGM) }))) return
  return a2pActivate(item, { roll: null, mode, prior })
}

// ---- chat hooks -----------------------------------------------------------------------------
function a2pOnCreateMessage (message) {
  if (!a2pOn()) return
  const rolls = message.rolls ?? []
  const author = (message.author ?? message.user)?.id
  const itemUuid = rolls.find((r) => r?.options?.a2?.itemUuid)?.options.a2.itemUuid
  if (itemUuid && author === game.user.id) a2pState.lastRoll.set(itemUuid, { id: message.id, at: Date.now() })
  // An opposing roll linked to a power roll ("Roll for target").
  const vs = rolls.find((r) => r?.options?.a2?.vsMessage)?.options.a2.vsMessage
  if (vs) a2pResolveFromRolls(vs, message).catch((e) => console.error('V6 Automation | powers', e))
  // Tests that used a limited-use penalty (Gaze of Misfortune).
  const ids = rolls.flatMap((r) => r?.options?.conditionEffectIds ?? [])
  if (ids.length && a2pIsActiveGM()) a2pCountUses(message, ids).catch((e) => console.error('V6 Automation | powers', e))
}
function a2pOnUpdateMessage (message, changes) {
  if (!a2pOn()) return
  const other = changes?.flags?.world?.a2vs
  if (other) a2pResolveFromRolls(other, message).catch((e) => console.error('V6 Automation | powers', e))
}
// The card whose power roll is `powerMsgId` meets the opposing roll in `oppMsg`.
async function a2pResolveFromRolls (powerMsgId, oppMsg) {
  const cards = (game.messages?.contents ?? []).slice(-120).filter((m) => m.flags?.world?.a2p?.rollMessageId === powerMsgId || (m.flags?.world?.a2p?.rollMessageId === oppMsg.id))
  for (const card of cards) {
    const c = card.flags.world.a2p
    const processor = game.users?.activeGM ? a2pIsActiveGM() : (card.author ?? card.user)?.id === game.user.id
    if (!processor) continue
    const powerMsg = game.messages.get(c.rollMessageId)
    const opp = c.rollMessageId === oppMsg.id ? game.messages.get(powerMsgId) : oppMsg
    const pr = powerMsg?.rolls?.find((r) => r?.options?.a2?.built)
    const or = opp?.rolls?.find((r) => r?.options?.a2?.built)
    if (!pr || !or) continue
    const speaker = ChatMessage.getSpeakerActor?.(opp.speaker)
    const pending = c.targets.filter((t) => t.status === 'pending')
    const t = pending.find((x) => x.uuid === speaker?.uuid) ?? pending.find((x) => a2pFrom(x.uuid)?.id === speaker?.id) ?? (pending.length === 1 ? pending[0] : null)
    if (!t) continue
    // eslint-disable-next-line no-undef
    const cmp = typeof a2Compare === 'function' ? a2Compare({ successes: pr.total, attr: pr.options.a2.attr }, { successes: or.total, attr: or.options.a2.attr }, true) : { margin: a2pInt(pr.total) - a2pInt(or.total), win: a2pInt(pr.total) > a2pInt(or.total) }
    await a2pResolve(card, t.uuid, cmp.win, Math.max(0, cmp.margin))
  }
}
async function a2pCountUses (message, ids) {
  const actor = ChatMessage.getSpeakerActor?.(message.speaker)
  if (!actor) return
  for (const c of a2pConds(actor)) {
    const ap = a2pAP(c)
    if (!ap.uses || !ids.some((id) => String(id).startsWith(`${c.id}:`))) continue
    const left = a2pInt(ap.uses) - 1
    if (left <= 0) await actor.deleteEmbeddedDocuments('Item', [c.id])
    else await c.update({ 'flags.world.a2.activePower.uses': left })
  }
}

function a2pRenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root) return
  try {
    if (message.flags?.world?.a2p) a2pRenderCard(message, root)
    // Item cards of powers: an "Activate without a roll" button.
    const card = root.querySelector('.item-card[data-item-uuid]')
    if (card && !card.querySelector('.a2p-activate-btn')) {
      const item = a2pFrom(card.dataset.itemUuid)
      if (item?.type === 'discipline' && item.actor?.isOwner) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'a2p-activate-btn'
        b.innerHTML = '<i class="fa-solid fa-bolt"></i> Activate without a roll'
        b.title = 'Pay the cost and apply the power without a test (powers that need no test, or a test made elsewhere)'
        b.addEventListener('click', (ev) => { ev.preventDefault(); a2pActivateNoRoll(item, ev) })
        ;(card.querySelector('.item-card-test') ?? card).append(b)
      }
    }
  } catch (e) { console.error('V6 Automation | powers: chat card', e) }
}

// ---- sheet -----------------------------------------------------------------------------------
function a2pRenderSheet (app, element) {
  if (!a2pOn()) return
  const actor = app?.actor ?? app?.document
  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app?.element)
  if (!actor || !root || !actor.items) return
  try {
    root.querySelectorAll('.a2p-active').forEach((e) => e.remove())
    const groups = a2pList(actor)
    const editable = Boolean(app?.isEditable ?? actor.isOwner)
    if (groups.length) {
      const row = document.createElement('section')
      row.className = 'a2p-active'
      const chips = groups.map((g) => {
        const tip = [...(g.ap.lines ?? []), ...(g.ap.notes ?? [])].join(' · ')
        return `<span class="a2p-chip${g.side === 'target' ? ' a2p-hostile' : ''}" title="${a2pEsc(tip)}"><img src="${a2pEsc(g.img)}" alt=""> ${a2pEsc(g.power)}${g.side === 'target' ? ` <em>(${a2pEsc(g.sourceName)})</em>` : ''} · ${a2pEsc(a2pDurationText(g.ap))}${editable || game.user.isGM ? ` <a class="a2p-end" data-a2p-id="${a2pEsc(g.id)}" title="End this power"><i class="fa-solid fa-xmark"></i></a>` : ''}</span>`
      }).join('')
      row.innerHTML = `<span class="a2p-label" title="Active Discipline powers (V6 Automation)">Active powers</span>${chips}${game.user.isGM ? '<a class="a2p-endscene" title="End of scene: end every power that lasts one scene or one turn (PG p.149)"><i class="fa-solid fa-clapperboard"></i> End scene</a>' : ''}`
      row.querySelectorAll('.a2p-end').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); a2pEnd(a.dataset.a2pId, { reason: 'ended by hand' }) }))
      row.querySelector('.a2p-endscene')?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); a2pEndScene() })
      const hw = root.querySelector('[data-actor-section="healthWillpower"]')
      if (hw) hw.append(row)
      else (root.querySelector('.window-content') ?? root).prepend(row)
    }
    // Bolt buttons on the power rows.
    if (actor.isOwner) {
      root.querySelectorAll('.discipline-power-row[data-item-id]').forEach((r) => {
        if (r.querySelector('.a2p-bolt')) return
        const item = actor.items.get(r.dataset.itemId)
        if (!item) return
        const active = a2pFindActiveFor(item)
        if (active) r.classList.add('a2p-row-active')
        const a = document.createElement('a')
        a.className = 'a2p-bolt'
        a.title = active ? `Active (${a2pDurationText(active.ap)}). Click: activate again without a roll` : 'Activate without a roll (pays the cost)'
        a.innerHTML = '<i class="fa-solid fa-bolt"></i>'
        a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); a2pActivateNoRoll(item, ev) })
        ;(r.querySelector('.resource-name') ?? r).append(a)
      })
    }
  } catch (e) { console.error('V6 Automation | powers: sheet', actor.name, e) }
}
// ---- socket (module "v6-automation" needs "socket": true in module.json) -----------------
const a2pSocketOps = {
  apply: async ({ holderUuid, payload }) => a2pDoApply(a2pFrom(holderUuid), payload),
  remove: async ({ holderUuid, ids, statuses }) => {
    const actor = a2pFrom(holderUuid)
    if (!actor) return
    const have = ids.filter((id) => actor.items.get(id))
    if (have.length) await actor.deleteEmbeddedDocuments('Item', have)
    for (const s of statuses ?? []) await a2pSetStatus(actor, s, false)
  },
  end: async ({ id }) => a2pEnd(id),
  resolve: async ({ messageId, targetUuid, win, margin }) => a2pResolve(game.messages.get(messageId), targetUuid, win, margin),
  card: async ({ messageId, card }) => game.messages.get(messageId)?.update({ 'flags.world.a2p': card }),
  endScene: async () => a2pEndScene(),
  newNight: async () => a2pNewNight()
}
function a2pSocket () {
  if (a2pState.socket || !game.socket?.on || !game.modules?.get?.(A2P_MODULE)?.active) return
  game.socket.on(A2P_SOCKET, (data) => {
    if (!data?.a2p || !a2pIsActiveGM()) return
    Promise.resolve(a2pSocketOps[data.a2p]?.(data)).catch((e) => console.error('V6 Automation | powers socket', e))
  })
  a2pState.socket = true
}

// ---- hooks, styles, boot ---------------------------------------------------------------------
function a2pHooks () {
  if (a2pState.hooked) return
  Hooks.on('renderChatMessageHTML', a2pRenderChat)
  Hooks.on('createChatMessage', a2pOnCreateMessage)
  Hooks.on('updateChatMessage', a2pOnUpdateMessage)
  Hooks.on('renderActorSheetV2', a2pRenderSheet)
  Hooks.on('updateCombat', (combat, changes) => { a2pOnCombat(combat, changes).catch((e) => console.error('V6 Automation | powers combat', e)) })
  Hooks.on('deleteCombat', (combat) => {
    if (!a2pOn() || !a2pIsActiveGM()) return
    a2pEndWhere((ap) => ap.expires?.combatId === combat.id && (ap.expires.type === 'turn' || ap.upkeep?.per === 'turnStart' || ap.upkeep?.per === 'turnEnd'), 'combat ended').catch((e) => console.error(e))
  })
  Hooks.on('updateItem', a2pOnUpdateItem)
  Hooks.on('updateScene', (scene, changes) => {
    if (!a2pOn() || !a2pIsActiveGM() || changes?.active !== true || !a2pSetting('sceneChange')) return
    a2pEndScene().catch((e) => console.error(e))
  })
  Hooks.on('v6a2NewNight', () => { if (a2pOn()) a2pNewNight().catch((e) => console.error(e)) })
  Hooks.on('v6a2EndScene', () => { if (a2pOn()) a2pEndScene().catch((e) => console.error(e)) })
  // Torpor (all Health baneful) ends the creator's powers of one scene or less (PG p.149).
  Hooks.on('updateActor', (actor, changes) => {
    if (!a2pOn() || !a2pIsActiveGM() || !foundry.utils.hasProperty(changes ?? {}, 'flags.world.a2.health')) return
    const h = globalThis.V6Alpha2?.health?.(actor)
    if (h && h.max > 0 && h.baneful >= h.max) a2pEndWhere((ap) => ap.source === actor.uuid && a2pEndsOn(ap, 'incapacitated'), 'creator in torpor').catch((e) => console.error(e))
  })
  a2pState.hooked = true
}

function a2pInjectStyles () {
  document.getElementById('v6a-a2p-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-a2p-style'
  style.textContent = `
.actor.sheet .a2p-active { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; padding: 4px 0 2px; font-size: 12px; }
.actor.sheet .a2p-active .a2p-label { font-weight: bold; text-transform: uppercase; font-size: 11px; opacity: 0.8; }
.actor.sheet .a2p-chip { display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border: 1px solid currentColor; border-radius: 10px; white-space: nowrap; }
.actor.sheet .a2p-chip img { width: 14px; height: 14px; border: 0; }
.actor.sheet .a2p-chip.a2p-hostile { border-color: #b31b1b; }
.actor.sheet .a2p-chip .a2p-end, .actor.sheet .a2p-endscene, .actor.sheet .a2p-bolt { cursor: pointer; }
.actor.sheet .a2p-endscene { margin-left: auto; }
.actor.sheet .a2p-none { opacity: 0.6; }
.actor.sheet .a2p-bolt { margin-left: 6px; opacity: 0.55; }
.actor.sheet .a2p-bolt:hover, .actor.sheet .a2p-row-active .a2p-bolt { opacity: 1; }
.actor.sheet .a2p-row-active .resource-name { font-style: italic; }
.chat-message .a2p-card .a2p-line { font-size: 13px; margin: 2px 0; }
.chat-message .a2p-card .a2p-note { opacity: 0.85; font-style: italic; }
.chat-message .a2p-card .a2p-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.chat-message .a2p-card .a2p-actions button { flex: 1 1 45%; line-height: 22px; font-size: 12px; }
.chat-message .a2p-activate-btn { margin-top: 4px; }
`
  document.head.append(style)
}

async function a2PowersBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.powers?.booted) return true
  a2pRegisterSettings()
  a2pInjectStyles()
  a2pRegisterStatuses()
  await a2pPatchOpen()
  a2pPatchDamage()
  a2pHooks()
  a2pSocket()
  api.powers = {
    booted: true,
    activate: (item, opts = {}) => (opts.roll ? a2pActivate(item, opts) : a2pActivateNoRoll(item)),
    end: (idOrItem) => a2pEnd(idOrItem, { reason: 'ended by hand' }),
    list: (actor) => a2pList(actor).map((g) => ({ id: g.id, power: g.power, side: g.side, source: g.sourceName, duration: a2pDurationText(g.ap), lines: g.ap.lines ?? [] })),
    endScene: a2pEndScene,
    newNight: a2pNewNight,
    endAll: a2pEndAll,
    spec: async (item) => a2pFindSpec(item, await a2pLoadData()) ?? a2pFallbackSpec(item),
    reduceDamage: (actor, amount, opts = {}) => a2pReduceFor(actor, amount, opts),
    reload: () => a2pLoadData(true),
    data: () => a2pState.data,
    rules: { eval: a2pEval, applySteps: a2pApplySteps, activeFx: a2pActiveFx, diceEffects: a2pDiceEffects, reduce: a2pReduce, turnTick: a2pTurnTick, endsOn: a2pEndsOn, initialStatus: a2pInitialStatus }
  }
  a2pLoadData().catch((e) => console.warn('V6 Automation | powers: data', e))
  console.log('V6 Automation | Alpha 2 powers loaded')
  return true
}
globalThis.a2PowersBoot ??= a2PowersBoot

// ---- V6 journal look ---------------------------------------------------------------
// Tidies and styles the journal pages the V6 importer made, at render time, so
// nothing in the stored text changes:
//  - hides a first heading that only repeats the page title Foundry already shows;
//  - evens out heading levels (the page title is the top; the text starts one below);
//  - marks "V6 note", "Homebrew" and "For our chronicle" paragraphs as call-outs;
//  - gives tables, lists and headings one consistent look in both colour themes.
// Client setting "journalStyle": off | v6 (imported V6 journals, default) | all.

const A2S_NOTE = /^(?:V6\b|V5\s*(?:→|->|to)\s*V6|Homebrew\b|House rule|For our (?:chronicle|table)|Conversion note|Storyteller note)/i
const A2S_META = /^(?:Prerequisites?|Focus|Cost|Duration|Test|Dice pool|Attitude|Horrors|Level|Source)\s*:/i

function a2sNorm (s) {
  return String(s ?? '').toLowerCase().replace(/^\s*(?:\d+[.)]|[ivxlc]+[.)]|chapter\s+\w+\s*[:.-])\s*/i, '').replace(/\s*\(v6\)\s*$/i, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
// Does a first heading only repeat the page's name? Pure.
function a2sSameTitle (heading, pageName) {
  const h = a2sNorm(heading)
  const n = a2sNorm(pageName)
  if (!h || !n) return false
  if (h === n) return true
  const [short, long] = h.length <= n.length ? [h, n] : [n, h]
  // "Sunset of Flames" vs "Chapter 3: Sunset of Flames", but not "Rules" vs "House Rules for Hunting".
  return long.includes(short) && short.length >= Math.max(4, long.length * 0.6)
}
// What a heading says beyond the page's name, when one contains the other:
// '' = nothing more, null = neither contains the other. Pure.
function a2sTitleExtra (heading, pageName) {
  const h = String(heading ?? '').replace(/\s+/g, ' ').trim()
  const n = String(pageName ?? '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  if (!h || !n) return null
  const at = h.toLowerCase().indexOf(n.toLowerCase())
  if (at > 0 && at + n.length < h.length) return null // the name sits mid-sentence: a heading of its own
  if (at >= 0) {
    const extra = (h.slice(0, at) + ' ' + h.slice(at + n.length)).replace(/^[\s:–—-]+|[\s:–—-]+$/g, '').replace(/\s+/g, ' ')
    // "Kinds of" (from "Kinds of Frenzy") says nothing by itself.
    return extra.length < 4 || /\b(?:of|the|a|an|and|to|for|in|on)$/i.test(extra) ? '' : extra
  }
  return n.toLowerCase().includes(h.toLowerCase()) ? '' : null
}
// Display levels for headings: the shallowest one in the text becomes level 2. Pure.
function a2sLevels (levels) {
  if (!levels.length) return []
  const min = Math.min(...levels)
  return levels.map((l) => Math.min(5, l - min + 2))
}

function a2sMode () {
  try {
    const ns = typeof a2tNs === 'function' ? a2tNs() : 'wod6e'
    return game.settings.get(ns, ns === 'wod6e' ? 'v6A2JournalStyle' : 'journalStyle') || 'v6'
  } catch (e) { return 'v6' }
}
function a2sWanted (entry) {
  const mode = a2sMode()
  if (mode === 'off') return false
  if (mode === 'all') return true
  return Boolean(entry?.flags?.world?.v6key || entry?.flags?.world?.alpha1Key)
}

// Dress one page's text. `root` holds the page's own HTML.
// Rows that follow each other with the same first cell ("Powerful Strike" at 6 dots, then
// at 8) are one entry: the name is shown once, spanning its rows.
function a2sMergeRows (table) {
  let n = 0
  const bodies = [...table.children].filter((c) => c.tagName === 'TBODY')
  for (const body of bodies.length ? bodies : [table]) {
    let head = null
    let key = ''
    for (const row of [...body.children].filter((c) => c.tagName === 'TR')) {
      const cells = [...row.children]
      const c = cells[0]
      if (!c || cells.length < 2 || c.tagName !== 'TD' || c.hasAttribute('colspan') || c.hasAttribute('rowspan')) { head = null; key = ''; continue }
      const k = String(c.textContent ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
      if (head && k && k === key) {
        c.classList.add('v6-merged')
        row.classList.add('v6-cont')
        head.dataset.v6Span = String((Number(head.dataset.v6Span) || 1) + 1)
        n++
      } else { if (head?.dataset.v6Span) { head.setAttribute('rowspan', head.dataset.v6Span); head.classList.add('v6-span') } head = c; key = k }
    }
    if (head?.dataset.v6Span) { head.setAttribute('rowspan', head.dataset.v6Span); head.classList.add('v6-span') }
  }
  return n
}
function a2sDecorate (root, pageName) {
  if (!root || root.dataset?.v6Styled === '1') return
  if (root.dataset) root.dataset.v6Styled = '1'
  root.classList.add('v6-doc')
  const heads = [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  const first = root.firstElementChild
  let dup = null
  if (first && /^H[1-6]$/.test(first.tagName)) {
    const extra = a2sTitleExtra(first.textContent, pageName)
    if (a2sSameTitle(first.textContent, pageName)) {
      dup = first
      dup.classList.add('v6-dup')
    } else if (extra !== null) {
      // "Welcome to the Night: The Lasombra Defection" under the title "Welcome to the Night":
      // keep only what the heading adds, as a subtitle.
      dup = first
      dup.classList.add('v6-dup')
      if (extra) {
        const sub = root.ownerDocument.createElement('p')
        sub.className = 'v6-subtitle'
        sub.textContent = extra
        dup.after(sub)
      }
    } else if (first.tagName === 'H1') {
      // A second, differently worded title: show it as a subtitle, never as another headline.
      dup = first
      dup.classList.add('v6-subtitle')
    }
  }
  const rest = heads.filter((h) => h !== dup)
  const shown = a2sLevels(rest.map((h) => Number(h.tagName[1])))
  rest.forEach((h, i) => { h.dataset.v6Level = String(shown[i]) })
  for (const p of root.querySelectorAll('p')) {
    const lead = p.firstElementChild
    if (!lead || p.firstChild !== lead) continue
    const text = lead.textContent.trim()
    if (lead.tagName === 'STRONG' && A2S_NOTE.test(text)) p.classList.add('v6-note')
    else if (lead.tagName === 'EM' && (A2S_META.test(text) || A2S_NOTE.test(text))) p.classList.add(A2S_NOTE.test(text) ? 'v6-note' : 'v6-meta')
  }
  for (const t of root.querySelectorAll('table')) {
    if (t.parentElement?.classList.contains('v6-table-wrap')) continue
    a2sMergeRows(t)
    const wrap = root.ownerDocument.createElement('div')
    wrap.className = 'v6-table-wrap'
    t.replaceWith(wrap)
    wrap.appendChild(t)
  }
}

// Find the page articles inside a rendered journal window and dress them.
function a2sScan (element, entry) {
  if (!element) return
  const styled = a2sWanted(entry)
  const linked = typeof a2lEnhance === 'function' // eslint-disable-line no-undef
  if (!styled && !linked) return
  const pages = element.matches?.('[data-page-id]') ? [element] : [...(element.querySelectorAll?.('[data-page-id]') ?? [])]
  for (const art of pages) {
    const page = entry?.pages?.get?.(art.dataset.pageId)
    if (!page || (page.type && page.type !== 'text')) continue
    if (art.tagName === 'LI' || art.closest?.('nav, aside, .sidebar, .toc, ol.directory-list')) continue // the table of contents, not a page
    const body = art.querySelector('.journal-page-content') ?? art.querySelector('section') ?? art
    if (body.querySelector?.('prose-mirror, .editor.prosemirror, .editor-container')) continue // being edited
    if (styled) {
      art.classList.add('v6-doc-page')
      a2sDecorate(body, page.name)
    }
    if (linked) { try { a2lEnhance(body, entry, page) } catch (e) { console.error('V6 Automation | journal links', e) } } // eslint-disable-line no-undef
  }
}

const a2sState = { hooked: false, observers: new WeakMap() }
function a2sOnRender (app, element) {
  try {
    const doc = app?.document
    const el = element instanceof HTMLElement ? element : element?.[0] ?? app?.element
    if (!doc || !el) return
    if (doc.documentName === 'JournalEntryPage') {
      if (doc.type && doc.type !== 'text') return
      const host = el.closest?.('[data-page-id]') ?? el
      if (!host.dataset.pageId) host.dataset.pageId = doc.id
      a2sScan(host, doc.parent)
      return
    }
    if (doc.documentName !== 'JournalEntry') return
    a2sScan(el, doc)
    // Pages are drawn into the window after it opens, and again on every page turn.
    if (!a2sState.observers.has(el) && typeof MutationObserver === 'function') {
      const obs = new MutationObserver(() => { try { a2sScan(el, doc) } catch (e) { /* cosmetic only */ } })
      obs.observe(el, { childList: true, subtree: true })
      a2sState.observers.set(el, obs)
    }
  } catch (e) { console.error('V6 Automation | journal styling', e) }
}

function a2sInjectStyles () {
  document.getElementById('v6a-journal-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-journal-style'
  style.textContent = `
.v6-doc { --v6-accent: color-mix(in srgb, #b3261e 82%, currentColor); --v6-line: color-mix(in srgb, currentColor 22%, transparent); --v6-tint: color-mix(in srgb, currentColor 6%, transparent); line-height: 1.6; }
.v6-doc .v6-dup { display: none; }
.v6-doc-page .journal-page-header h1, .v6-doc-page > header h1 { border-bottom: 3px solid color-mix(in srgb, #b3261e 82%, currentColor); padding-bottom: 0.25em; margin-bottom: 0.6em; letter-spacing: 0.02em; }
.v6-doc h1, .v6-doc h2, .v6-doc h3, .v6-doc h4, .v6-doc h5, .v6-doc h6 { font-family: inherit; line-height: 1.25; border: 0; text-shadow: none; }
.v6-doc [data-v6-level="2"] { font-size: 1.5em; font-weight: 600; margin: 1.5em 0 0.5em; padding-bottom: 0.2em; border-bottom: 1px solid var(--v6-accent); }
.v6-doc [data-v6-level="3"] { font-size: 1.22em; font-weight: 600; margin: 1.3em 0 0.4em; color: var(--v6-accent); }
.v6-doc [data-v6-level="4"] { font-size: 1em; font-weight: 700; margin: 1.1em 0 0.3em; text-transform: uppercase; letter-spacing: 0.07em; }
.v6-doc [data-v6-level="5"] { font-size: 1em; font-weight: 700; font-style: italic; margin: 1em 0 0.3em; }
.v6-doc > .v6-dup + [data-v6-level], .v6-doc > [data-v6-level]:first-child { margin-top: 0.4em; }
.v6-doc .v6-subtitle, .v6-doc h1.v6-subtitle { margin: -0.2em 0 1em; font-size: 1.1em; font-weight: 400; font-style: italic; opacity: 0.8; border: 0; }
.v6-doc p { margin: 0.55em 0; text-align: start; }
.v6-doc ul, .v6-doc ol { margin: 0.4em 0 0.8em; padding-inline-start: 1.5em; }
.v6-doc li { margin: 0.2em 0; }
.v6-doc li > p { margin: 0.1em 0; }
.v6-doc .v6-note { margin: 0.9em 0; padding: 0.6em 0.9em; border-inline-start: 4px solid var(--v6-accent); background: color-mix(in srgb, #b3261e 9%, transparent); border-radius: 0 5px 5px 0; }
.v6-doc .v6-meta { margin: 0.2em 0 0.7em; opacity: 0.85; font-size: 0.95em; }
.v6-doc blockquote { margin: 0.9em 0; padding: 0.5em 1em; border-inline-start: 3px solid var(--v6-line); background: var(--v6-tint); border-radius: 0 5px 5px 0; font-style: normal; }
.v6-doc blockquote p { margin: 0.3em 0; }
.v6-doc .v6-table-wrap { margin: 1em 0; overflow-x: auto; border: 1px solid var(--v6-line); border-radius: 6px; }
.v6-doc table { width: 100%; margin: 0; border-collapse: collapse; border: 0; background: transparent; font-size: 0.95em; }
.v6-doc th { padding: 0.5em 0.7em; text-align: start; vertical-align: bottom; font-weight: 700; background: color-mix(in srgb, #b3261e 16%, transparent); border: 0; border-bottom: 2px solid var(--v6-accent); text-shadow: none; }
.v6-doc td { padding: 0.45em 0.7em; vertical-align: top; border: 0; border-top: 1px solid var(--v6-line); }
.v6-doc tbody tr:nth-child(even) { background: var(--v6-tint); }
.v6-doc tbody tr:first-child td { border-top: 0; }
.v6-doc td.v6-merged { display: none; }
.v6-doc td.v6-span { vertical-align: top; border-inline-end: 1px solid var(--v6-line); }
.v6-doc tbody tr.v6-cont td { border-top-style: dashed; }
.v6-doc td:first-child { font-weight: 600; }
.v6-doc img { max-width: 100%; height: auto; border-radius: 5px; border: 0; }
.v6-doc hr { border: 0; border-top: 1px solid var(--v6-line); margin: 1.4em 0; }
`
  document.head.appendChild(style)
}

async function a2StyleBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.style?.booted) return true
  try {
    const ns = typeof a2tNs === 'function' ? a2tNs() : 'wod6e'
    const key = ns === 'wod6e' ? 'v6A2JournalStyle' : 'journalStyle'
    if (!game.settings.settings.has(`${ns}.${key}`)) {
      game.settings.register(ns, key, {
        name: 'V6 journal styling',
        hint: 'Hides headings that repeat the page title and gives journal pages one look. "V6 journals" covers everything the V6 importer made.',
        scope: 'client',
        config: true,
        type: String,
        choices: { v6: 'V6 journals', all: 'All journals', off: 'Off' },
        default: 'v6',
        requiresReload: true
      })
    }
  } catch (e) { console.error('V6 Automation | journal styling setting', e) }
  a2sInjectStyles()
  if (!a2sState.hooked) {
    a2sState.hooked = true
    Hooks.on('renderApplicationV2', a2sOnRender)
    Hooks.on('renderJournalSheet', (app, html) => a2sOnRender(app, html)) // older journal windows
    Hooks.on('renderJournalPageSheet', (app, html) => a2sOnRender(app, html))
  }
  // Journals that are already open.
  for (const app of foundry.applications?.instances?.values?.() ?? []) { if (app.rendered) a2sOnRender(app, app.element) }
  api.style = { booted: true, decorate: a2sDecorate, rules: { sameTitle: a2sSameTitle, levels: a2sLevels, mergeRows: a2sMergeRows } }
  console.log('V6 Automation | journal styling loaded')
  return true
}
globalThis.a2StyleBoot ??= a2StyleBoot

// ---- self-running opposed tests (attacks) ----------------------------------------------
// PG p.116, p.120: an attack is the attacker's test against the target's defence
// test. Defending costs no action: Dodge is Dexterity + Athletics, Parry is
// Dexterity + Fighting (melee only).
//
// When someone rolls an attack with a token targeted and no flat Difficulty:
//  1. the attack card remembers its targets (flags.world.a2def);
//  2. a target nobody but the Storyteller owns defends by itself, with its better pool;
//  3. a player's character gets Dodge / Parry buttons on the attack card and a notice;
//  4. the defence roll is linked to the attack, so the card shows win and margin and
//     "Apply damage" already knows the target and the margin;
//  5. with the "apply at once" setting the damage is applied without a click, when
//     nothing about it needs choosing.
// Powers with their own opposing pool keep their "Roll for target" flow.
//
// Settings (world): oppose (on), opposeNpcAuto (on), opposeDamage ('button' | 'auto').

// ---- shared helpers for the extras (settings in the module's namespace) ----
function a2eNs () { return typeof a2tNs === 'function' ? a2tNs() : 'wod6e' }
function a2eKey (key) { return a2eNs() === 'wod6e' ? `v6A2${key[0].toUpperCase()}${key.slice(1)}` : key }
function a2eReg (key, data) {
  try {
    const ns = a2eNs()
    if (!game.settings.settings.has(`${ns}.${a2eKey(key)}`)) game.settings.register(ns, a2eKey(key), data)
  } catch (e) { console.error('V6 Automation | setting', key, e) }
}
function a2eGet (key, fallback = null) {
  try { return game.settings.get(a2eNs(), a2eKey(key)) } catch (e) { return fallback }
}
const a2eSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
// Open the system's roll dialog with a pool ready. test: { attributes, skills, disciplines, difficulty }.
// auto = press Roll for the user (the dialog shows for a moment).
async function a2eOpenRoll (actor, test, { auto = false, vs = null } = {}) {
  const RD = typeof a2State !== 'undefined' ? a2State.RollDialog : null
  if (!RD || !actor) { ui.notifications?.error('The roll dialog is not available.'); return null }
  if (vs) a2State.pendingVs.set(actor.uuid, vs)
  const before = new Set(foundry.applications.instances.keys())
  const pending = RD.open({ actor, test })
  if (auto) {
    for (let i = 0; i < 30; i++) {
      await a2eSleep(100)
      const dlg = [...foundry.applications.instances.entries()].find(([id, app]) => !before.has(id) && app.rendered && app.element?.querySelector?.('button[data-action="roll"]'))
      if (dlg) { dlg[1].element.querySelector('button[data-action="roll"]').click(); break }
    }
  }
  return pending
}

// ---- pure rules ----
// Which defences fit this attack, best pool first. pools: { dodge, parry }. Pure.
function a2oDefences ({ melee = true, pools = {} } = {}) {
  const out = [{ key: 'dodge', label: 'Dodge', test: { attributes: ['dexterity'], skills: ['athletics'] }, pool: a2Int(pools.dodge), text: 'Dexterity + Athletics' }]
  if (melee) out.push({ key: 'parry', label: 'Parry', test: { attributes: ['dexterity'], skills: ['fighting'] }, pool: a2Int(pools.parry), text: 'Dexterity + Fighting' })
  return out.sort((a, b) => b.pool - a.pool)
}
// Should this roll start a defence? Pure.
function a2oWants ({ built = false, isDefence = false, frenzy = false, difficulty = 0, opponent = null, kind = null, hasOppose = false, targets = 0 } = {}) {
  if (!built || isDefence || frenzy || hasOppose || !kind || targets < 1) return false
  if (a2Int(difficulty) > 0 || (opponent !== null && opponent !== undefined)) return false // flat Difficulty, or already typed in
  return true
}

function a2oPools (actor) {
  const eff = (path) => a2Int(foundry.utils.getProperty(actor, `${path}.effective`) ?? foundry.utils.getProperty(actor, `${path}.value`))
  const dex = eff('system.attributes.dexterity')
  return { dodge: dex + eff('system.skills.athletics'), parry: dex + eff('system.skills.fighting') }
}
// The defences open to this target: Dodge and Parry for an attack, or the pools the
// move names (alpha2-moves: a grab is avoided with Strength or Dexterity + Athletics).
function a2oOptions (def, actor) {
  if (!def?.move?.defences?.length) return a2oDefences({ melee: def?.melee, pools: a2oPools(actor) })
  const eff = (path) => a2Int(foundry.utils.getProperty(actor, `${path}.effective`) ?? foundry.utils.getProperty(actor, `${path}.value`))
  return def.move.defences.map((d) => ({ key: d.key, label: d.label, text: d.text, test: { attributes: d.attributes ?? [], skills: d.skills ?? [], disciplines: [] }, pool: (d.attributes ?? []).reduce((t, k) => t + eff(`system.attributes.${k}`), 0) + (d.skills ?? []).reduce((t, k) => t + eff(`system.skills.${k}`), 0) })).sort((a, b) => b.pool - a.pool)
}
// alpha2-moves: the next roll of this actor is this move.
function a2oSetMove (actor, move) {
  if (!actor?.uuid) return null
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  a2oState.moves.set(actor.uuid, { ...move, at: Date.now(), token })
  return token
}
// Something noted for "the next roll" belongs to the roll dialog that was just opened: when that
// dialog goes away, drop() runs a few seconds later, after a roll made from it has reached the chat.
// So a cancelled dialog leaves nothing behind for the next, unrelated roll. before: the open apps' ids.
async function a2eDialogGuard (before, drop) {
  let app = null
  for (let i = 0; i < 40 && !app; i++) {
    await a2eSleep(100)
    app = [...foundry.applications.instances.entries()].find(([id, x]) => !before.has(id) && x.rendered && x.element?.querySelector?.('button[data-action="roll"]'))?.[1] ?? null
  }
  if (!app) { drop(); return }
  for (let i = 0; i < 3600 && app.rendered; i++) await a2eSleep(250)
  await a2eSleep(6000)
  drop()
}
// The next roll of this actor is no attack, whatever its pool (a Parry rolled with nothing to parry).
function a2oPlainNext (actor) {
  if (!actor?.uuid) return
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  a2oState.plain.set(actor.uuid, token)
  a2eDialogGuard(new Set(foundry.applications.instances.keys()), () => { if (a2oState.plain.get(actor.uuid) === token) a2oState.plain.delete(actor.uuid) }).catch(() => {})
}
// The newest attack on this actor that still waits for its defence, if any.
function a2oPendingAttack (actor) {
  if (!actor?.uuid) return null
  const now = Date.now()
  return game.messages.contents.slice(-40).reverse().find((m) => {
    const def = m.flags?.world?.a2def
    if (!def || now - a2Int(m.timestamp) > 600000) return false
    const t = (def.targets ?? []).find((x) => x.uuid === actor.uuid)
    return Boolean(t) && !t.helpless && !a2oDefenceOf(m.id, actor.uuid)
  }) ?? null
}
function a2oMoveGuard (actor, token, before) {
  return a2eDialogGuard(before, () => { if (a2oState.moves.get(actor.uuid)?.token === token) a2oState.moves.delete(actor.uuid) })
}
function a2oOn () { return a2Enabled() && a2eGet('oppose', true) !== false }
function a2oRoll (message) {
  const i = (message?.rolls ?? []).findIndex((r) => r?.options?.a2?.built)
  return i < 0 ? null : { roll: message.rolls[i], index: i }
}
function a2oDefenceOf (attackId, actorUuid) {
  return game.messages.contents.slice(-120).find((m) => m.rolls?.some((r) => r?.options?.a2?.vsMessage === attackId) && a2xSpeaker(m)?.uuid === actorUuid) ?? null
}
function a2oPlayerOwned (actor) {
  return Boolean(actor?.hasPlayerOwner) && game.users.some((u) => u.active && !u.isGM && actor.testUserPermission(u, 'OWNER'))
}

// 1. The attacker's own client notes the targets on the card.
async function a2oOnCreate (message, options, userId) {
  try {
    if (!a2oOn()) return
    const r = a2oRoll(message)
    if (!r) return
    const a2 = r.roll.options.a2
    if (userId === game.user.id && !message.flags?.world?.a2def) {
      const attacker = a2xSpeaker(message)
      const info = a2xAttackInfo(message, r.roll)
      const targets = [...(game.user.targets ?? [])].map((t) => t.actor).filter((a) => a && a.uuid !== attacker?.uuid)
      let move = attacker ? a2oState.moves.get(attacker.uuid) : null
      if (move) { a2oState.moves.delete(attacker.uuid); if (Date.now() - move.at > 180000 || a2.vsMessage) move = null }
      const plain = attacker ? a2oState.plain.delete(attacker.uuid) : false
      const wants = plain
        ? false
        : move
        ? targets.length > 0 && !(a2Int(r.roll.options.difficulty) > 0)
        : a2oWants({ built: true, isDefence: Boolean(a2.vsMessage), frenzy: Boolean(a2.frenzyTest), difficulty: r.roll.options.difficulty, opponent: a2.opponent, kind: info?.kind ?? null, hasOppose: Boolean(a2.oppose), targets: targets.length })
      if (wants) {
        const list = targets.slice(0, move ? 1 : 6)
        // a target that can't act (tied up, staked, in torpor) doesn't defend
        const helpless = (a) => typeof a2zHas === 'function' && ['tied', 'staked', 'torpor'].some((id) => a2zHas(a, id)) // eslint-disable-line no-undef
        await message.update({ 'flags.world.a2def': { v: 1, melee: move ? Boolean(move.melee) : Boolean(info.melee), successes: a2Int(r.roll.total), attacker: attacker?.name ?? message.alias ?? 'Attacker', attackerUuid: attacker?.uuid ?? null,
          targets: list.map((a) => ({ uuid: a.uuid, name: a.name, helpless: helpless(a) })),
          move: move ? { id: move.id, label: move.label, defences: move.defences ?? null, effect: move.effect ?? null } : null } })
      }
    }
    // 5. A defence roll arrived: apply the damage at once, if set so.
    if (a2.vsMessage && a2xIsGM()) {
      const attack = game.messages.get(a2.vsMessage)
      if (attack?.flags?.world?.a2def?.move?.effect && typeof a2vResolve === 'function') await a2vResolve(attack, a2xSpeaker(message)) // eslint-disable-line no-undef
      else if (a2eGet('opposeDamage', 'button') === 'auto') await a2oAutoDamage(attack, a2xSpeaker(message))
    }
  } catch (e) { console.error('V6 Automation | opposed test', e) }
}

// 2 and 3. Everyone sees the flag arrive: the GM rolls for its NPCs, players are told.
const a2oState = { hooked: false, seen: new Set(), queue: Promise.resolve(), moves: new Map(), plain: new Map() }
function a2oOnUpdate (message, change) {
  try {
    if (!a2oOn() || !change?.flags?.world?.a2def) return
    const def = message.flags?.world?.a2def
    if (!def || a2oState.seen.has(message.id)) return
    a2oState.seen.add(message.id)
    const gm = a2xIsGM()
    for (const t of def.targets ?? []) {
      const actor = a2FromUuid(t.uuid)
      if (!actor) continue
      if (t.helpless) {
        if (gm && def.move?.effect && typeof a2vResolve === 'function') a2oState.queue = a2oState.queue.then(() => a2vResolve(message, actor)).catch((e) => console.error('V6 Automation | move', e)) // eslint-disable-line no-undef
        continue
      }
      if (gm && !a2oPlayerOwned(actor)) {
        if (a2eGet('opposeNpcAuto', true) !== false) a2oState.queue = a2oState.queue.then(() => a2oDefend(message, actor, null, { auto: true })).catch((e) => console.error('V6 Automation | auto defence', e))
      } else if (!game.user.isGM && actor.isOwner) {
        ui.notifications?.info(`${def.attacker} attacks ${actor.name}: defend from the chat card (it costs no action, PG p.120).`)
      }
    }
  } catch (e) { console.error('V6 Automation | opposed test', e) }
}

async function a2oDefend (message, actor, key = null, { auto = false } = {}) {
  const def = message?.flags?.world?.a2def
  const r = a2oRoll(message)
  if (!def || !r || !actor?.isOwner) return null
  if (a2oDefenceOf(message.id, actor.uuid)) { if (!auto) ui.notifications?.info(`${actor.name} has already defended against this attack.`); return null }
  const list = a2oOptions(def, actor)
  const pick = list.find((d) => d.key === key) ?? list[0]
  // the simple npc sheet has no Dexterity: it defends with its Physical level
  if (actor.type === 'npc' && typeof a2NpcBestLevel === 'function') a2State.pendingPreset.set(actor.uuid, { level: a2NpcBestLevel(actor, pick.test.attributes).key })
  if (typeof a2uHint === 'function') a2uHint(actor, { against: def.attackerUuid ?? null, defence: pick.key, vsRanged: !def.melee && !def.move }) // eslint-disable-line no-undef
  return a2eOpenRoll(actor, pick.test, { auto, vs: { messageId: message.id, successes: a2Int(r.roll.total), name: def.attacker } })
}

async function a2oAutoDamage (attack, defender) {
  const r = a2oRoll(attack)
  if (!attack?.flags?.world?.a2def || attack.flags.world.a2def.move?.effect || !r || !defender) return
  if (a2xAct(attack, r.index).damage?.length) return // already applied
  const { v } = a2xVerdict(attack, r.roll)
  if (v.win !== true) return
  const info = a2xAttackInfo(attack, r.roll)
  if (!info || info.base === null || info.weapons.length || /^Enter /.test(info.baseNote ?? '')) return // a weapon to pick or a number to type: leave the button
  const margin = Math.max(0, a2Int(v.margin))
  const extra = info.riders.reduce((t, x) => t + a2Int(x.amount), 0) + a2Int(info.rage)
  await a2xApplyDamage([defender], {
    amount: (info.calc ? info.calc(margin) : info.base) + extra,
    margin: info.calc ? 0 : (info.addMargin || info.riders.some((x) => x.own) ? margin : 0),
    baneful: info.baneful,
    ignoreEndurance: info.ignoreEndurance,
    resource: info.resource === 'willpower' ? 'willpower' : 'health',
    source: info.label,
    attackerUuid: info.attacker?.uuid ?? null,
    bodyAttack: info.kind === 'unarmed',
    messageId: attack.id,
    rollIndex: r.index
  })
}

// 3 and 4. The attack card: who still has to defend, with buttons for their owners.
function a2oRenderChat (message, html) {
  const def = message.flags?.world?.a2def
  if (!def || !a2oOn()) return
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root || root.querySelector('.a2o-defence')) return
  const block = document.createElement('div')
  block.className = 'a2o-defence'
  for (const t of def.targets ?? []) {
    const actor = a2FromUuid(t.uuid)
    const done = a2oDefenceOf(message.id, t.uuid)
    const row = document.createElement('div')
    row.className = 'a2o-row'
    const label = document.createElement('span')
    label.textContent = t.helpless ? `${t.name} can't defend.` : done ? `${t.name} ${def.move?.defences ? 'resisted' : 'defended'}.` : `${t.name}: ${def.move?.defences ? 'resistance' : 'defence'} pending.`
    row.append(label)
    if (!done && !t.helpless && actor?.isOwner) {
      for (const d of a2oOptions(def, actor)) {
        const b = document.createElement('button')
        b.type = 'button'
        b.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${a2Esc(d.label)} (${d.pool})`
        b.title = `${d.text}, against ${def.successes} successes`
        b.addEventListener('click', (ev) => { ev.preventDefault(); a2oDefend(message, actor, d.key) })
        row.append(b)
      }
    }
    block.append(row)
  }
  const anchor = root.querySelector('.a2-result') ?? root.querySelector('.message-content') ?? root
  anchor.append(block)
}

function a2oInjectStyles () {
  document.getElementById('v6a-oppose-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-oppose-style'
  style.textContent = `
.a2o-defence { margin-top: 6px; padding-top: 6px; border-top: 1px dashed color-mix(in srgb, currentColor 30%, transparent); display: flex; flex-direction: column; gap: 4px; }
.a2o-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 0.92em; }
.a2o-row span { flex: 1 1 100%; }
.a2o-row button { flex: 1 1 0; min-width: 6.5em; line-height: 1.6; }
`
  document.head.appendChild(style)
}

async function a2OpposeBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.oppose?.booted) return true
  a2eReg('oppose', { name: 'Attacks: defence prompts', hint: 'An attack on a targeted token asks the target to defend, and links the two rolls (PG p.116, p.120).', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('opposeNpcAuto', { name: 'Attacks: Storyteller characters defend by themselves', hint: 'A target no player owns rolls its better defence at once. Off: the Storyteller uses the buttons on the card.', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('opposeDamage', { name: 'Attacks: damage after the defence', hint: '"Button" leaves Apply damage on the card. "At once" applies it when nothing needs choosing.', scope: 'world', config: true, type: String, choices: { button: 'Button on the card', auto: 'At once' }, default: 'button' })
  a2oInjectStyles()
  if (!a2oState.hooked) {
    a2oState.hooked = true
    Hooks.on('createChatMessage', a2oOnCreate)
    Hooks.on('updateChatMessage', a2oOnUpdate)
    Hooks.on('renderChatMessageHTML', (message, html) => { try { a2oRenderChat(message, html) } catch (e) { console.error('V6 Automation | defence card', e) } })
  }
  api.oppose = { booted: true, defend: a2oDefend, setMove: a2oSetMove, openRoll: a2eOpenRoll, rules: { defences: a2oDefences, wants: a2oWants } }
  console.log('V6 Automation | opposed tests loaded')
  return true
}
globalThis.a2OpposeBoot ??= a2OpposeBoot

// ---- bonuses that tick themselves --------------------------------------------------
// Situational bonuses (merits, flaws, clan traits, loresheets, gear) are toggles in the
// roll dialog. Most depend on the story ("when your sire is watching") and stay yours to
// tick. The ones whose condition the table can see are ticked when the dialog opens:
//   - "vs frenzy", "vs fear frenzy": a frenzy test of that kind (Frenzy test tool)
//   - "resist Dominate/Presence": the defence roll against a power of that Discipline
//   - "vs vampires", "intimidate mortals", "Social with Hecata": the targeted token
//   - "in combat" / "outside conflict": whether a fight is running with you in it
//   - "hunt …": the test made from the Feed tool
// A ticked toggle shows why ("auto: target is a mortal") and can be unticked. A bonus
// with a further condition in brackets is only marked "may apply", never ticked.
// Once you change any toggle yourself, your choice stands for that roll.
//
// Setting (client): autoBonuses (on).

const A2U_DISC = ['animalism', 'auspex', 'blood sorcery', 'celerity', 'corruption', 'dominate', 'fortitude', 'necromancy', 'obfuscate', 'oblivion', 'potence', 'presence', 'tellurgy', 'vicissitude']
const A2U_CREATURE_WORDS = [
  [/\b(?:mortals?|humans?|kine)\b/, 'mortal'],
  [/\b(?:vampires?|kindred|cainites?|licks?)\b/, 'vampire'],
  [/\bghouls?\b/, 'ghoul'],
  [/\b(?:animals?|beasts)\b/, 'animal']
]
const A2U_CLANS = ['banu haqim', 'brujah', 'gangrel', 'hecata', 'lasombra', 'malkavian', 'ministry', 'nosferatu', 'ravnos', 'salubri', 'toreador', 'tremere', 'tzimisce', 'ventrue', 'caitiff', 'thin-blood', 'duskborn']
// Words that introduce who the bonus is about.
const A2U_VERSUS = '(?:vs\\.?|versus|against|with|to sway|sway|intimidate|intimidating|charm|charming|seduce|deceive|deceiving|fool|command|dealing with|hunting|feeding (?:on|from)|by nearby|among)'

// Words that mean "there is more to it than the table can see".
const A2U_SOFT = /\b(?:who|whom|whose|while|when|if|after|unless|except|your|you|their|its|his|her|first|next|new|own|aboard|declared|called|once per|per two|three nights|this story)\b/
// One clause of a bonus text. Pure. → { triggers, soft }
function a2uClause (text) {
  const triggers = []
  let soft = A2U_SOFT.test(text) || /\([^)]{3,}\)/.test(text)
  // frenzy tests
  const fz = text.match(/(?:vs\.?|versus|against|resist\w*|self-control[^,;]*?)\s+(?:a |an |the |any )?(?:(fear|hunger|rage|clan)\s+)?frenzy/)
  if (fz) triggers.push({ kind: 'frenzy', sub: fz[1] ?? null, fire: /frenzy from fire|fear of fire/.test(text) })
  // resisting a Discipline
  const rs = text.match(new RegExp(`resist\\w*\\s+((?:${A2U_DISC.join('|')})(?:\\s*(?:/|,|or|and)\\s*(?:${A2U_DISC.join('|')}))*)`))
  if (rs) {
    triggers.push({ kind: 'resist', disciplines: A2U_DISC.filter((d) => rs[1].includes(d)).map((d) => d.replace(/ (\w)/, (m, c) => c.toUpperCase())) })
    if (/\b(?:of|from)\s+\w+/.test(text.slice(rs.index + rs[0].length))) soft = true // "…of younger blood"
  }
  // who it is about
  const vs = text.match(new RegExp(`\\b${A2U_VERSUS}\\s+(?:the |a |an |other |nearby |fellow )?([a-z' ,/-]{3,60})`))
  if (vs) {
    const who = vs[1]
    const types = A2U_CREATURE_WORDS.filter(([re]) => re.test(who)).map(([, t]) => t)
    const clans = A2U_CLANS.filter((c) => new RegExp(`\\b${c}\\b`).test(who))
    if (types.length) triggers.push({ kind: 'creature', types })
    if (clans.length) triggers.push({ kind: 'clan', clans, any: types.length > 0 })
    if (types.length || clans.length) {
      // anything besides the creatures themselves is a further condition
      let rest = who
      for (const [re] of A2U_CREATURE_WORDS) rest = rest.replace(new RegExp(re.source, 'g'), ' ')
      for (const c of A2U_CLANS) rest = rest.replace(new RegExp(`\\b${c}\\b`, 'g'), ' ')
      if (/[a-z]{3,}/.test(rest.replace(/\b(?:and|or|the|other)\b/g, ' '))) soft = true
    }
  }
  // fights: only a bare "+1 Composure in combat" is plain enough to tick
  if (/\boutside (?:of )?(?:combat|conflict|a fight)\b/.test(text)) triggers.push({ kind: 'combat', on: false })
  else {
    const cb = text.match(/^(.*?)\b(?:in|during) (?:combat|a fight|conflict|a conflict|battle)\b/)
    if (cb) { triggers.push({ kind: 'combat', on: true }); if (cb[1].replace(/[+−-]\s?\d+|gen\. mod\./g, ' ').trim().split(/\s+/).filter(Boolean).length > 1) soft = true }
  }
  // the hunt
  if (/\bhunt(?:ing)?\b/.test(text) && !/blood hunt|wild hunt/.test(text)) triggers.push({ kind: 'hunt' })
  return { triggers, soft }
}
// What a toggle's name says about when it applies. Pure.
//  → { alts: [{ triggers, soft }], triggers (all of them), soft } ; the alternatives are
//  the ";"-separated cases of one bonus: any one of them is enough.
function a2uTriggers (name) {
  let text = String(name ?? '').replace(/\(active\)/gi, ' ').replace(/\([−-]\d+\)/g, ' ').replace(/\s·\s(?:auto|may apply):.*$/i, '')
  // "Label (+2 resist Presence)" and "(rank modifier: …)": the bracket is the bonus itself
  text = text.replace(/\(([^()]*(?:[+−-]\s?\d|gen\. mod\.|dots|rank modifier)[^()]*)\)\s*$/, ': $1')
  // a specialty in brackets, "Persuasion (Intimidation)", is no condition
  text = text.replace(/\((?:[A-Z][a-z]+(?: [A-Z][a-z]+)?)\)/g, ' ')
  // the bonus text is what follows the item's label
  const cut = text.indexOf(':')
  const bonus = (cut >= 0 ? text.slice(cut + 1) : text).toLowerCase()
  const alts = bonus.split(';').map((c) => a2uClause(c.trim())).filter((c) => c.triggers.length)
  // a Path's rank modifier covers a whole way of acting: point it out, never tick it
  if (/rank modifier/.test(bonus)) for (const c of alts) c.soft = true
  return { alts, triggers: alts.flatMap((c) => c.triggers), soft: alts.length > 0 && alts.every((c) => c.soft) }
}

// Does the roll's situation meet the triggers? All of them must hold. Pure.
// ctx: { frenzy: type|null, resist: [discipline keys], target: { creature, clan }|null, inCombat, hunt }
//  → { state: 'tick' | 'maybe' | 'no', reason }
function a2uDecide (parsed, ctx = {}) {
  const order = { tick: 2, maybe: 1, no: 0 }
  let best = { state: 'no', reason: '' }
  for (const alt of parsed?.alts ?? []) {
    const d = a2uDecideOne(alt, ctx)
    if (order[d.state] > order[best.state]) best = d
  }
  return best
}
function a2uDecideOne ({ triggers = [], soft = false } = {}, ctx = {}) {
  if (!triggers.length) return { state: 'no', reason: '' }
  const reasons = []
  let targetOk = null
  for (const t of triggers) {
    if (t.kind === 'frenzy') {
      if (!ctx.frenzy) return { state: 'no', reason: '' }
      if (t.sub && t.sub !== ctx.frenzy) return { state: 'no', reason: '' }
      reasons.push(`${ctx.frenzy} frenzy test`)
      if (t.fire) soft = true
    } else if (t.kind === 'resist') {
      const hit = (ctx.resist ?? []).find((d) => t.disciplines.includes(d))
      if (!hit) return { state: 'no', reason: '' }
      reasons.push(`resisting ${hit[0].toUpperCase()}${hit.slice(1).replace(/([A-Z])/g, ' $1')}`)
    } else if (t.kind === 'creature') {
      // "Hecata, their ghouls": the creature list and the clan list are either-or
      const hit = Boolean(ctx.target?.creature) && t.types.includes(ctx.target.creature)
      targetOk = targetOk || hit
      if (hit) reasons.push(`target is ${/^[aeiou]/.test(ctx.target.creature) ? 'an' : 'a'} ${ctx.target.creature}`)
    } else if (t.kind === 'clan') {
      const clan = String(ctx.target?.clan ?? '').toLowerCase()
      const hit = Boolean(clan) && t.clans.some((c) => clan.includes(c))
      targetOk = targetOk || hit
      if (hit) reasons.push(`target is ${ctx.target.clan}`)
    } else if (t.kind === 'combat') {
      if (Boolean(ctx.inCombat) !== t.on) return { state: 'no', reason: '' }
      reasons.push(t.on ? 'in a fight' : 'no fight running')
    } else if (t.kind === 'hunt') {
      if (!ctx.hunt) return { state: 'no', reason: '' }
      reasons.push('hunting')
    }
  }
  if (targetOk === false) return { state: 'no', reason: '' }
  // "outside conflict" alone says too little to tick a bonus by itself.
  const onlyCalm = triggers.every((t) => t.kind === 'combat' && t.on === false)
  return { state: soft || onlyCalm ? 'maybe' : 'tick', reason: reasons.join(', ') }
}

const a2uState = { hints: new Map(), patched: false }
function a2uOn () { return a2Enabled() && a2eGet('autoBonuses', true) !== false }
// Other parts tell us what the next roll of this actor is about (kept two minutes).
function a2uHint (actor, hint) {
  if (!actor?.uuid) return
  a2uState.hints.set(actor.uuid, { ...hint, at: Date.now() })
}
// A hint is for one roll dialog: the first dialog opened for the actor after the hint claims it,
// and once that dialog is gone the hint no longer counts (a Dodge must not colour the next attack).
function a2uClaim (actor, appId) {
  const h = actor?.uuid ? a2uState.hints.get(actor.uuid) : null
  if (!h || !appId) return
  if (!h.app) h.app = appId
  else if (h.app !== appId) a2uState.hints.delete(actor.uuid)
}
function a2uFresh (actor) {
  const h = actor?.uuid ? a2uState.hints.get(actor.uuid) : null
  if (!h || Date.now() - h.at > 120000) return null
  if (h.app) { const app = globalThis.foundry?.applications?.instances?.get?.(h.app); if (!app || app.rendered === false) return null }
  return h
}
function a2uContext (actor) {
  const hint = a2uFresh(actor) ?? {}
  const ctx = { frenzy: hint.frenzy ?? null, resist: hint.resist ?? [], hunt: Boolean(hint.hunt), target: null, inCombat: false }
  try {
    // whoever this roll was named against comes first: the roller's own targets may be someone else
    const t = (hint.against ? a2FromUuid(hint.against) : null) ?? [...(game.user?.targets ?? [])].map((x) => x.actor).find((a) => a && a.uuid !== actor.uuid)
    if (t) {
      const c = a2Creature(t)
      ctx.target = { creature: c === 'npc' ? 'mortal' : c, clan: t.items?.find?.((i) => i.type === 'clan')?.name ?? t.system?.vampire?.clan?.name ?? '' }
    }
    const combat = game.combat
    ctx.inCombat = Boolean(combat?.started && combat.combatants?.some?.((c) => c.actor?.uuid === actor.uuid || c.actorId === actor.id))
  } catch (e) { /* keep what we have */ }
  return ctx
}
function a2uPatch () {
  const RD = a2State.RollDialog
  if (!RD || a2uState.patched || typeof RD._prepareConditionEffects !== 'function') return false
  a2uState.patched = true
  const prep = RD._prepareConditionEffects
  RD._prepareConditionEffects = function (actor, test, data) {
    const list = prep.call(this, actor, test, data)
    try {
      if (!a2uOn() || !actor) return list
      const chosen = Array.isArray(data?.conditionEffectIds) // the user has touched the toggles
      const ctx = a2uContext(actor)
      const ours = new Map((actor.preparedEffects?.effects ?? []).map((e) => [e.effectId, e.sourceId]))
      for (const e of list) {
        if (e.normallyApplies) continue
        if (!actor.items.get(ours.get(e.id))?.getFlag?.('world', 'v6auto')) continue
        const d = a2uDecide(a2uTriggers(e.name), ctx)
        if (d.state === 'no') continue
        if (d.state === 'tick' && !chosen) e.enabled = true
        e.name = `${e.name} · ${d.state === 'tick' ? 'auto' : 'may apply'}: ${d.reason}`
      }
    } catch (err) { console.error('V6 Automation | auto bonuses', err) }
    return list
  }
  return true
}

async function a2AutoBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.auto?.booted) return true
  a2eReg('autoBonuses', { name: 'Tick bonuses that plainly apply', hint: 'Situational bonuses whose condition the table can see (a frenzy test, the kind of target, resisting a Discipline, a running fight, a hunt) are ticked when the roll dialog opens. You can untick them.', scope: 'client', config: true, type: Boolean, default: true })
  for (let i = 0; i < 40 && !a2uPatch(); i++) await a2eSleep(250)
  api.auto = { booted: true, hint: a2uHint, context: a2uContext, rules: { triggers: a2uTriggers, decide: a2uDecide } }
  console.log('V6 Automation | self-ticking bonuses loaded')
  return true
}
globalThis.a2AutoBoot ??= a2AutoBoot

// ---- clickable journals and roll requests ---------------------------------------------
// In journal pages the V6 importer made:
//  - a test written out, "Wits + Awareness" or "Strength + Athletics, Difficulty 3",
//    becomes a chip. Click: the roll dialog opens for your character with that pool
//    and Difficulty. Shift-click (Storyteller): ask players for that roll instead.
//  - the name of a character from the same book becomes a link to its sheet. If the
//    character is still in the book compendium, the Storyteller's click imports it first.
// Roll requests: the Storyteller picks a pool, a Difficulty and who rolls; each of them
// gets a button on a chat card, and the card collects the results.
//
// Settings: journalLinks (client, on). Data: flags.world.a2req on the request card,
// flags.world.a2reqOf on an answering roll.

const A2L_ATTRS = ['strength', 'dexterity', 'stamina', 'charisma', 'manipulation', 'composure', 'intelligence', 'wits', 'resolve']
const A2L_SKILLS = ['athletics', 'awareness', 'craft', 'expression', 'fighting', 'investigation', 'knowledge', 'medicine', 'persuasion', 'shooting', 'sabotage', 'subterfuge', 'survival']
const A2L_DISCS = { animalism: 'animalism', auspex: 'auspex', 'blood sorcery': 'bloodSorcery', celerity: 'celerity', corruption: 'corruption', dominate: 'dominate', fortitude: 'fortitude', necromancy: 'necromancy', obfuscate: 'obfuscate', oblivion: 'oblivion', potence: 'potence', presence: 'presence', tellurgy: 'tellurgy', vicissitude: 'vicissitude' }
const A2L_SECOND = [...A2L_ATTRS, ...A2L_SKILLS, ...Object.keys(A2L_DISCS)].sort((a, b) => b.length - a.length)
// "Wits + Awareness", optionally followed closely by a Difficulty.
const A2L_TEST = new RegExp(`\\b(${A2L_ATTRS.join('|')})\\s*\\+\\s*(${A2L_SECOND.join('|')})\\b(?:\\s*\\([A-Za-z ,'-]{2,24}\\))?((?:\\s*,|\\s+at|\\s+against|\\s+vs\\.?|\\s*\\(|\\s*:)?\\s*Difficulty\\s+(\\d{1,2})\\)?)?`, 'gi')

// Every test mentioned in a text. Pure.
//  → [{ index, length, text, test: { attributes, skills, disciplines, difficulty }, label }]
function a2lFindTests (text) {
  const out = []
  const s = String(text ?? '')
  A2L_TEST.lastIndex = 0
  let m
  while ((m = A2L_TEST.exec(s))) {
    const first = m[1].toLowerCase()
    const second = m[2].toLowerCase()
    const test = { attributes: [first], skills: [], disciplines: [] }
    if (A2L_ATTRS.includes(second)) test.attributes.push(second)
    else if (A2L_SKILLS.includes(second)) test.skills.push(second)
    else test.disciplines.push(A2L_DISCS[second])
    if (m[4] !== undefined) test.difficulty = Math.max(0, parseInt(m[4], 10))
    const cap = (w) => w.replace(/\b[a-z]/g, (c) => c.toUpperCase())
    out.push({ index: m.index, length: m[0].length, text: m[0], test, label: `${cap(first)} + ${cap(second)}${test.difficulty !== undefined ? `, Difficulty ${test.difficulty}` : ''}` })
  }
  return out
}

// Names worth linking: long enough not to hit ordinary words. Pure.
function a2lLinkable (name) {
  const n = String(name ?? '').trim()
  if (n.length < 4) return false
  if (/^(?:the|a|an)\s/i.test(n) && n.split(/\s+/).length < 3) return false
  return /^[A-ZÀ-Þ"“'(]/.test(n)
}
function a2lNameRegex (names) {
  const list = [...new Set(names.filter(a2lLinkable))].sort((a, b) => b.length - a.length).slice(0, 1500)
  if (!list.length) return null
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}])(${list.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'gu')
}

const a2lState = { hooked: false, index: null, loading: null, items: null, pendingReq: new Map() }
function a2lOn () { return a2eGet('journalLinks', true) !== false }

// Which book does a journal belong to, and who is in that book?
//  index: { byEntry: Map(entryId → bookKey), books: Map(bookKey → { names: Map(name → { pack, adventure, id }), regex }) }
async function a2lLoadIndex () {
  if (a2lState.index) return a2lState.index
  if (a2lState.loading) return a2lState.loading
  a2lState.loading = (async () => {
    const index = { byEntry: new Map(), books: new Map() }
    try {
      for (const pack of game.packs ?? []) {
        if (pack.documentName !== 'Adventure' || !/v6-conversion/.test(pack.collection)) continue
        for (const adv of await pack.getDocuments()) {
          const names = new Map()
          for (const a of adv.actors ?? []) names.set(a.name, { pack: pack.collection, adventure: adv.id, id: a.id })
          for (const j of adv.journal ?? []) index.byEntry.set(j.id, adv.id)
          index.books.set(adv.id, { names, regex: a2lNameRegex([...names.keys()]) })
        }
      }
    } catch (e) { console.error('V6 Automation | journal links index', e) }
    a2lState.index = index
    return index
  })()
  return a2lState.loading
}

// Walk the text nodes under root, outside links, buttons and headings.
function a2lTextNodes (root) {
  const out = []
  const skip = /^(?:A|BUTTON|H1|H2|H3|H4|H5|H6|SCRIPT|STYLE|CODE|PRE|TEXTAREA|SELECT)$/
  const walk = (node) => {
    for (const c of [...node.childNodes]) {
      if (c.nodeType === 3) { if (c.nodeValue && c.nodeValue.trim().length > 3) out.push(c) } else if (c.nodeType === 1 && !skip.test(c.tagName) && !c.classList?.contains('v6-roll') && !c.classList?.contains('v6-actor')) walk(c)
    }
  }
  walk(root)
  return out
}
// Replace matches inside one text node with elements. finds: [{ index, length, make(textNode's doc) }]
function a2lSplice (node, finds) {
  if (!finds.length) return
  const doc = node.ownerDocument
  const text = node.nodeValue
  const frag = doc.createDocumentFragment()
  let at = 0
  for (const f of finds.sort((a, b) => a.index - b.index)) {
    if (f.index < at) continue
    if (f.index > at) frag.appendChild(doc.createTextNode(text.slice(at, f.index)))
    frag.appendChild(f.make(doc, text.slice(f.index, f.index + f.length)))
    at = f.index + f.length
  }
  if (at < text.length) frag.appendChild(doc.createTextNode(text.slice(at)))
  node.parentNode.replaceChild(frag, node)
}

function a2lEnhance (root, entry, page) {
  if (!root || !a2lOn() || !(entry?.flags?.world?.v6key || entry?.flags?.world?.alpha1Key || entry?.pack)) return
  if (root.dataset.v6Rolls !== '1') {
    root.dataset.v6Rolls = '1'
    for (const node of a2lTextNodes(root)) {
      a2lSplice(node, a2lFindTests(node.nodeValue).map((t) => ({
        index: t.index,
        length: t.length,
        make: (doc, shown) => {
          const a = doc.createElement('a')
          a.className = 'v6-roll'
          a.dataset.v6Test = JSON.stringify(t.test)
          a.dataset.v6Label = t.label
          a.title = `Roll ${t.label} for your character. Shift-click: ask the players for it.`
          a.innerHTML = '<i class="fa-solid fa-dice-d10"></i>'
          a.appendChild(doc.createTextNode(shown))
          return a
        }
      })))
    }
  }
  try { if (a2eGet('journalItems', true) !== false) a2lLinkItems(root) } catch (e) { console.error('V6 Automation | item links', e) }
  if (root.dataset.v6Names === '1') return
  const link = (index) => {
    if (root.dataset.v6Names === '1' || !root.isConnected) return
    const book = index.books.get(index.byEntry.get(entry.id))
    if (!book?.regex) return
    root.dataset.v6Names = '1'
    const seen = new Set()
    let made = 0
    for (const node of a2lTextNodes(root)) {
      if (made >= 60) break
      const finds = []
      book.regex.lastIndex = 0
      let m
      while ((m = book.regex.exec(node.nodeValue))) {
        const name = m[1]
        if (seen.has(name)) continue // first mention on the page only
        seen.add(name)
        const ref = book.names.get(name)
        finds.push({ index: m.index, length: m[0].length, make: (doc, shown) => { const a = doc.createElement('a'); a.className = 'v6-actor content-link'; a.dataset.v6Actor = name; a.dataset.v6Ref = JSON.stringify(ref); a.title = `Open ${name}'s sheet`; a.innerHTML = '<i class="fa-solid fa-user"></i>'; a.appendChild(doc.createTextNode(shown)); return a } })
        made++
      }
      a2lSplice(node, finds)
    }
  }
  if (a2lState.index) link(a2lState.index)
  else a2lLoadIndex().then(link).catch(() => {})
}

// ---- items: every power, clan trait, merit and flaw named on a page links to its item ----
const A2L_ITEM_TYPES = ['discipline', 'clanTrait', 'merit', 'flaw', 'lifepath', 'clan', 'nature']
const A2L_ITEM_ICON = { discipline: 'fa-bolt', clanTrait: 'fa-dna', merit: 'fa-star', flaw: 'fa-heart-crack', lifepath: 'fa-road', clan: 'fa-users', nature: 'fa-scale-balanced' }
// A name as it stands in a cell or in bold: without dots, a trailing colon or full stop. Pure.
function a2lItemKey (text) { return String(text ?? '').replace(/[●○•]+/g, ' ').replace(/\s+/g, ' ').replace(/^[\s"“”']+|[\s"“”':.,;]+$/g, '').toLowerCase() }
// Is a name distinctive enough to link in running text? Two words, or one long one. Pure.
function a2lProseName (name) { const n = String(name ?? '').trim(); return /^[A-ZÀ-Þ]/.test(n) && /\s/.test(n) && n.length >= 7 }
// A one-word name ("Command", "Routine", "Sheriff") is also an ordinary word: it links only in a
// table whose header says the column holds powers, merits and the like. Pure.
function a2lPlainWord (name) { return !/\s/.test(String(name ?? '').trim()) }
const A2L_ITEM_HEAD = /power|merit|flaw|trait|ritual|ceremon|advantage|loresheet|clan\b|path\b|item|name/i
function a2lItemIndex () {
  if (a2lState.items) return a2lState.items
  const byKey = new Map()
  const archived = (i) => { for (let f = i.folder, n = 0; f && n < 6; f = f.folder, n++) if (/archive/i.test(f.name ?? '')) return true; return false }
  const rank = (i) => A2L_ITEM_TYPES.indexOf(i.type) * 10 + (/^(?:ported|elder)/i.test(i.folder?.name ?? '') ? 1 : 0)
  for (const i of game.items ?? []) {
    if (!A2L_ITEM_TYPES.includes(i.type) || archived(i)) continue
    const key = a2lItemKey(i.name)
    if (key.length < 3) continue
    const cur = byKey.get(key)
    if (!cur || rank(i) < cur.rank) byKey.set(key, { uuid: i.uuid, id: i.id, name: i.name, type: i.type, rank: rank(i) })
  }
  const prose = [...byKey.values()].filter((x) => ['discipline', 'clanTrait', 'merit', 'flaw'].includes(x.type) && a2lProseName(x.name)).map((x) => x.name)
  a2lState.items = { byKey, regex: a2lNameRegex(prose) }
  return a2lState.items
}
function a2lItemLink (doc, ref, shown, { iconOnly = false } = {}) {
  const a = doc.createElement('a')
  a.className = `content-link v6-item${iconOnly ? ' v6-item-icon' : ''}`
  a.setAttribute('draggable', 'true')
  a.setAttribute('data-link', '')
  a.dataset.uuid = ref.uuid
  a.dataset.id = ref.id
  a.dataset.type = 'Item'
  a.dataset.tooltip = `Open ${ref.name}`
  a.innerHTML = `<i class="fa-solid ${A2L_ITEM_ICON[ref.type] ?? 'fa-suitcase'}"></i>`
  if (!iconOnly) a.appendChild(doc.createTextNode(shown))
  return a
}
function a2lLinkItems (root) {
  if (root.dataset.v6Items === '1') return
  root.dataset.v6Items = '1'
  const idx = a2lItemIndex()
  if (!idx.byKey.size) return
  const doc = root.ownerDocument
  let made = 0
  // 1. a whole cell, a bold or italic run, or a list term that is exactly an item's name
  for (const el of root.querySelectorAll('td, th, strong, b, em, dt')) {
    if (made >= 400) break
    if (el.closest('a, h1, h2, h3, h4, h5, h6, thead') || el.querySelector('a, table, p, ul, ol')) continue
    const text = el.textContent ?? ''
    if (text.length < 3 || text.length > 60) continue
    const ref = idx.byKey.get(a2lItemKey(text))
    if (!ref) continue
    if (a2lPlainWord(ref.name)) {
      const cell = el.closest('td')
      const table = cell?.closest('table')
      const col = cell ? [...cell.parentElement.children].indexOf(cell) : -1
      const head = table?.querySelector('thead tr, tr')?.children?.[col]?.textContent ?? ''
      if (!cell || !A2L_ITEM_HEAD.test(head)) continue
    }
    // keep the element, wrap what is in it
    const a = a2lItemLink(doc, ref, '')
    while (el.firstChild) a.appendChild(el.firstChild)
    el.appendChild(a)
    made++
  }
  // 2. a heading that is an item's name gets a small link after it
  for (const h of root.querySelectorAll('h2, h3, h4, h5')) {
    if (h.querySelector('a.v6-item') || h.classList.contains('v6-dup')) continue
    const ref = idx.byKey.get(a2lItemKey(h.textContent))
    if (ref && !(a2lPlainWord(ref.name) && ['lifepath', 'clan', 'nature'].includes(ref.type))) { h.appendChild(doc.createTextNode(' ')); h.appendChild(a2lItemLink(doc, ref, '', { iconOnly: true })); made++ }
  }
  // 3. distinctive names in running text, first mention on the page
  if (idx.regex) {
    const seen = new Set()
    for (const node of a2lTextNodes(root)) {
      if (made >= 500) break
      if (node.parentElement?.closest?.('a')) continue
      const finds = []
      idx.regex.lastIndex = 0
      let m
      while ((m = idx.regex.exec(node.nodeValue))) {
        const ref = idx.byKey.get(a2lItemKey(m[1]))
        if (!ref || seen.has(ref.uuid)) continue
        seen.add(ref.uuid)
        finds.push({ index: m.index, length: m[0].length, make: (d, shown) => a2lItemLink(d, ref, shown) })
        made++
      }
      a2lSplice(node, finds)
    }
  }
}

// Who rolls when a chip is clicked: the selected token, your character, or your only character.
function a2lMyActor () {
  const tok = globalThis.canvas?.tokens?.controlled?.[0]?.actor
  if (tok?.isOwner) return tok
  if (game.user.character) return game.user.character
  if (game.user.isGM) return null
  const mine = game.actors.filter((a) => a.type === 'vampire' && a.isOwner)
  return mine.length === 1 ? mine[0] : null
}
async function a2lRollTest (test, { actor = null, label = '', request = null } = {}) {
  actor ??= a2lMyActor()
  if (!actor) { ui.notifications.warn(game.user.isGM ? 'Select the token that rolls first. Shift-click asks the players instead.' : 'Select your token first, or have the Storyteller assign your character.'); return null }
  if (request) {
    const at = Date.now()
    a2lState.pendingReq.set(actor.uuid, { id: request, at })
    a2eDialogGuard(new Set(foundry.applications.instances.keys()), () => { if (a2lState.pendingReq.get(actor.uuid)?.at === at) a2lState.pendingReq.delete(actor.uuid) }).catch(() => {})
  }
  const t = { attributes: test.attributes ?? [], skills: test.skills ?? [], disciplines: test.disciplines ?? [] }
  if (test.difficulty !== undefined && test.difficulty !== null) t.difficulty = a2Int(test.difficulty)
  return a2eOpenRoll(actor, t)
}
async function a2lOpenActor (name, ref) {
  let actor = game.actors.getName(name)
  if (!actor && ref?.pack) {
    if (!game.user.isGM) { ui.notifications.info(`${name} isn't in the world yet. Ask the Storyteller to open it once.`); return null }
    const adv = await game.packs.get(ref.pack)?.getDocument(ref.adventure)
    const src = adv?.actors?.get(ref.id)
    if (!src) { ui.notifications.warn(`${name} was not found in the book compendium.`); return null }
    const data = src.toObject()
    let folder = game.folders.find((f) => f.type === 'Actor' && f.name === 'Imported NPCs (V6)')
    folder ??= await Folder.create({ name: 'Imported NPCs (V6)', type: 'Actor' })
    data.folder = folder.id
    actor = await Actor.create(data, { keepId: !game.actors.get(data._id) })
    ui.notifications.info(`${name} was imported from the book compendium.`)
  }
  actor?.sheet?.render(true)
  return actor ?? null
}

function a2lOnClick (ev) {
  const roll = ev.target?.closest?.('a.v6-roll')
  const who = roll ? null : ev.target?.closest?.('a.v6-actor')
  if (!roll && !who) return
  ev.preventDefault()
  ev.stopPropagation()
  try {
    if (who) { a2lOpenActor(who.dataset.v6Actor, JSON.parse(who.dataset.v6Ref || 'null')); return }
    const test = JSON.parse(roll.dataset.v6Test)
    if (ev.shiftKey && game.user.isGM) a2lRequestDialog({ test, label: roll.dataset.v6Label })
    else a2lRollTest(test, { label: roll.dataset.v6Label })
  } catch (e) { console.error('V6 Automation | journal link', e) }
}

// ---- roll requests ----
function a2lTestLabel (test) {
  const name = (cfg, k) => (typeof a2TraitLabel === 'function' ? a2TraitLabel(cfg, k) : k)
  const parts = [...(test.attributes ?? []).map((k) => name('Attributes', k)), ...(test.skills ?? []).map((k) => name('Skills', k)), ...(test.disciplines ?? []).map((k) => name('Disciplines', k))]
  return parts.join(' + ') + (test.difficulty ? `, Difficulty ${test.difficulty}` : '')
}
function a2lCandidates () {
  const out = new Map()
  for (const a of game.actors) if (a.type === 'vampire' && a.hasPlayerOwner) out.set(a.uuid, { actor: a, on: true })
  for (const t of globalThis.canvas?.tokens?.controlled ?? []) if (t.actor) out.set(t.actor.uuid, { actor: t.actor, on: true })
  return [...out.values()]
}
async function a2lRequestDialog ({ test = null, label = '' } = {}) {
  if (!game.user.isGM) { ui.notifications.warn('Only the Storyteller asks for rolls.'); return null }
  const cands = a2lCandidates()
  if (!cands.length) { ui.notifications.warn('No player characters yet, and no token selected, to ask for a roll.'); return null }
  const opt = (list, cur, cfg, none) => (none ? `<option value="">${none}</option>` : '') + list.map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${a2Esc(typeof a2TraitLabel === 'function' ? a2TraitLabel(cfg, k) : k)}</option>`).join('')
  const second = test ? (test.skills?.[0] ? `s:${test.skills[0]}` : test.disciplines?.[0] ? `d:${test.disciplines[0]}` : test.attributes?.[1] ? `a:${test.attributes[1]}` : '') : 's:awareness'
  const secondOpts = `<option value="">nothing</option><optgroup label="Skills">${A2L_SKILLS.map((k) => `<option value="s:${k}" ${second === `s:${k}` ? 'selected' : ''}>${a2Esc(a2TraitLabel('Skills', k))}</option>`).join('')}</optgroup><optgroup label="Attributes">${A2L_ATTRS.map((k) => `<option value="a:${k}" ${second === `a:${k}` ? 'selected' : ''}>${a2Esc(a2TraitLabel('Attributes', k))}</option>`).join('')}</optgroup><optgroup label="Disciplines">${Object.values(A2L_DISCS).map((k) => `<option value="d:${k}" ${second === `d:${k}` ? 'selected' : ''}>${a2Esc(a2TraitLabel('Disciplines', k))}</option>`).join('')}</optgroup>`
  const content = `<div class="a2l-dialog">
    <div class="form-group"><label>What for</label><input type="text" name="label" value="${a2Esc(label && !/\+/.test(label) ? label : '')}" placeholder="Notice the tail, hold your nerve…"></div>
    <div class="form-group"><label>Pool</label><select name="attr">${opt(A2L_ATTRS, test?.attributes?.[0] ?? 'wits', 'Attributes')}</select><span>+</span><select name="second">${secondOpts}</select></div>
    <div class="form-group"><label>Difficulty</label><input type="number" name="difficulty" value="${a2Int(test?.difficulty ?? 2)}" min="0" max="12" step="1"></div>
    <fieldset><legend>Who rolls</legend>${cands.map((c, i) => `<label class="checkbox"><input type="checkbox" name="who${i}" ${c.on ? 'checked' : ''}> ${a2Esc(c.actor.name)}</label>`).join('')}</fieldset>
    <label class="checkbox"><input type="checkbox" name="secret"> Only they and the Storyteller see the request</label>
    <label class="checkbox"><input type="checkbox" name="hideDiff"> Don't show the Difficulty</label>
  </div>`
  const r = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Ask for a roll' },
    content,
    ok: { label: 'Ask', icon: 'fa-solid fa-bullhorn', callback: (ev, button) => {
      const f = button.form
      const sec = f.elements.second.value
      const t = { attributes: [f.elements.attr.value], skills: [], disciplines: [], difficulty: Math.max(0, a2Int(f.elements.difficulty.value)) }
      if (sec.startsWith('s:')) t.skills.push(sec.slice(2)); else if (sec.startsWith('d:')) t.disciplines.push(sec.slice(2)); else if (sec.startsWith('a:')) t.attributes.push(sec.slice(2))
      return { test: t, label: f.elements.label.value.trim(), who: cands.filter((c, i) => f.elements[`who${i}`]?.checked).map((c) => c.actor), secret: f.elements.secret.checked, hideDiff: f.elements.hideDiff.checked }
    } },
    rejectClose: false
  }).catch(() => null)
  if (!r || !r.who.length) return null
  return a2lRequest(r)
}
// Post the request card. who: actors.
async function a2lRequest ({ test, label = '', who = [], secret = false, hideDiff = false } = {}) {
  if (!game.user.isGM || !who.length) return null
  const targets = who.map((a) => ({ uuid: a.uuid, name: a.name }))
  const whisper = secret ? [...new Set([...game.users.filter((u) => u.isGM).map((u) => u.id), ...who.flatMap((a) => game.users.filter((u) => !u.isGM && a.testUserPermission(u, 'OWNER')).map((u) => u.id))])] : []
  const shown = { ...test }
  const title = label || 'A test'
  return ChatMessage.create({
    content: `<div class="a2l-request"><h4>${a2Esc(title)}</h4><p>${a2Esc(a2lTestLabel(hideDiff ? { ...shown, difficulty: 0 } : shown))}${hideDiff ? ', against a hidden Difficulty' : ''}</p></div>`,
    speaker: { alias: 'Storyteller' },
    whisper,
    flags: { world: { a2req: { v: 1, test, label: title, hideDiff, targets, results: {} } } }
  })
}
function a2lRenderChat (message, html) {
  const req = message.flags?.world?.a2req
  if (!req) return
  const root = html instanceof HTMLElement ? html : html?.[0]
  const box = root?.querySelector('.a2l-request')
  if (!box || box.querySelector('.a2l-rows')) return
  const rows = document.createElement('div')
  rows.className = 'a2l-rows'
  for (const t of req.targets ?? []) {
    const actor = a2FromUuid(t.uuid)
    const res = req.results?.[a2lKey(t.uuid)]
    const row = document.createElement('div')
    row.className = 'a2l-row'
    const span = document.createElement('span')
    span.textContent = res ? `${t.name}: ${res.text}` : `${t.name}: not rolled yet`
    row.append(span)
    if (!res && actor?.isOwner) {
      const b = document.createElement('button')
      b.type = 'button'
      b.innerHTML = '<i class="fa-solid fa-dice-d10"></i> Roll'
      b.addEventListener('click', (ev) => { ev.preventDefault(); a2lRollTest(req.hideDiff && !game.user.isGM ? { ...req.test, difficulty: undefined } : req.test, { actor, request: message.id }) })
      row.append(b)
    }
    rows.append(row)
  }
  box.append(rows)
}
function a2lKey (uuid) { return String(uuid).replace(/\./g, '_') }
// A roll made from a request: tag it (roller's client), then the GM notes the result on the card.
async function a2lOnCreate (message, options, userId) {
  try {
    const roll = message.rolls?.find((r) => r?.options?.a2?.built)
    if (!roll) return
    const actor = a2xSpeaker(message)
    if (userId === game.user.id && actor) {
      const pend = a2lState.pendingReq.get(actor.uuid)
      if (pend && Date.now() - pend.at < 180000) {
        a2lState.pendingReq.delete(actor.uuid)
        await message.update({ 'flags.world.a2reqOf': pend.id })
      }
    }
  } catch (e) { console.error('V6 Automation | roll request', e) }
}
async function a2lOnUpdate (message, change) {
  try {
    // the tag arriving, or the tagged roll changing afterwards (a reroll, a Beast's Bargain)
    const id = change?.flags?.world?.a2reqOf ?? ((change?.rolls || change?.flags?.world?.a2) ? message.flags?.world?.a2reqOf : null)
    if (!id || !a2xIsGM()) return
    const card = game.messages.get(id)
    const req = card?.flags?.world?.a2req
    const roll = message.rolls?.find((r) => r?.options?.a2?.built)
    const actor = a2xSpeaker(message)
    if (!req || !roll || !actor) return
    let v = a2RollVerdict(roll)
    // The player rolled without the hidden Difficulty: judge it here.
    const diff = a2Int(req.test.difficulty)
    const successes = a2Int(v.successes ?? roll.total)
    let bargain = false
    try { bargain = Boolean(a2xAct(message, message.rolls.indexOf(roll)).bargain) } catch (e) { /* no actions on this roll */ }
    const win = bargain || (req.hideDiff ? (diff <= 0 ? successes > 0 : successes >= diff) : v.win !== false)
    const margin = bargain ? 0 : diff > 0 ? successes - diff : null
    const text = `${successes} ${successes === 1 ? 'success' : 'successes'}: ${win ? 'win' : 'failure'}${margin !== null ? `, margin ${margin > 0 ? '+' : ''}${margin}` : ''}${bargain ? ", by a Beast's Bargain" : ''}${v.critical ? ', critical' : ''}${v.painful && !bargain ? ', painful' : ''}${v.bestial && !bargain ? ', bestial' : ''}`
    await card.update({ [`flags.world.a2req.results.${a2lKey(actor.uuid)}`]: { text, win, successes, messageId: message.id } })
  } catch (e) { console.error('V6 Automation | roll request', e) }
}

function a2lInjectStyles () {
  document.getElementById('v6a-links-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-links-style'
  style.textContent = `
a.v6-roll { display: inline; padding: 0.05em 0.4em; border-radius: 4px; border: 1px solid color-mix(in srgb, #b3261e 55%, transparent); background: color-mix(in srgb, #b3261e 9%, transparent); color: inherit; font-weight: 600; white-space: nowrap; cursor: pointer; text-decoration: none; }
a.v6-roll:hover { background: color-mix(in srgb, #b3261e 22%, transparent); text-shadow: none; }
a.v6-roll i { font-size: 0.85em; opacity: 0.8; margin-right: 0.3em; }
a.v6-actor { cursor: pointer; white-space: nowrap; }
a.v6-item i { font-size: 0.8em; opacity: 0.75; margin-right: 0.3em; }
a.v6-item.v6-item-icon { padding: 0 4px; font-size: 0.6em; vertical-align: middle; }
a.v6-item.v6-item-icon i { margin: 0; }
a.v6-item { word-break: normal !important; overflow-wrap: normal; white-space: normal; }
td a.v6-item, th a.v6-item, body.v6-theme .application.journal-sheet .journal-page-content td a.v6-item { background: none; border: 0; padding: 0; box-shadow: none; }
td a.v6-item:hover { text-decoration: underline; text-shadow: none; }
.v6-doc td.v6-span { min-width: 7.5em; }
a.v6-actor i { font-size: 0.8em; opacity: 0.7; margin-right: 0.25em; }
.a2l-request h4 { margin: 0 0 2px; font-weight: 700; }
.a2l-request p { margin: 0 0 6px; }
.a2l-rows { display: flex; flex-direction: column; gap: 4px; }
.a2l-row { display: flex; align-items: center; gap: 8px; }
.a2l-row span { flex: 1; }
.a2l-row button { flex: 0 0 auto; width: auto; line-height: 1.6; padding: 0 10px; }
.a2l-dialog .form-group span { flex: 0 0 auto; padding: 0 6px; }
.a2l-dialog fieldset { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px; margin: 6px 0; }
`
  document.head.appendChild(style)
}

async function a2LinksBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.links?.booted) return true
  a2eReg('journalLinks', { name: 'Clickable journals', hint: 'Tests written in V6 journal pages become roll buttons, and character names become links to their sheets.', scope: 'client', config: true, type: Boolean, default: true, requiresReload: true })
  a2eReg('journalItems', { name: 'Journals: link powers, traits, merits and flaws', hint: 'Every power, clan trait, merit or flaw named in a V6 journal page links to its item: click to open it, drag it onto a sheet.', scope: 'client', config: true, type: Boolean, default: true, requiresReload: true })
  a2lInjectStyles()
  if (!a2lState.hooked) {
    a2lState.hooked = true
    document.addEventListener('click', a2lOnClick, true)
    Hooks.on('renderChatMessageHTML', (message, html) => { try { a2lRenderChat(message, html) } catch (e) { console.error('V6 Automation | request card', e) } })
    for (const h of ['createItem', 'deleteItem', 'updateItem']) Hooks.on(h, (i, ch) => { if (!i.parent && (h !== 'updateItem' || 'name' in (ch ?? {}) || 'folder' in (ch ?? {}))) a2lState.items = null })
    Hooks.on('createChatMessage', a2lOnCreate)
    Hooks.on('updateChatMessage', a2lOnUpdate)
    Hooks.on('getSceneControlButtons', (controls) => {
      const tools = controls?.tokens?.tools
      if (!tools || !game.user?.isGM || !a2Enabled()) return
      tools['v6a2-request'] = { name: 'v6a2-request', title: 'Ask for a roll', icon: 'fa-solid fa-bullhorn', order: 104, button: true, onChange: () => a2lRequestDialog() }
    })
    try { ui.controls?.render?.({ reset: true }) } catch (e) { /* controls not drawn yet */ }
  }
  api.links = { booted: true, rollTest: a2lRollTest, openActor: a2lOpenActor, rules: { findTests: a2lFindTests, linkable: a2lLinkable, itemKey: a2lItemKey, proseName: a2lProseName } }
  api.request = Object.assign((opts) => (opts?.test ? a2lRequest(opts) : a2lRequestDialog(opts ?? {})), { dialog: a2lRequestDialog, post: a2lRequest })
  console.log('V6 Automation | journal links and roll requests loaded')
  return true
}
globalThis.a2LinksBoot ??= a2LinksBoot

// ---- combat flow (PG p.110, p.115) ----------------------------------------------------
// Turn order: highest Wits first. A Storyteller character with no Wits of its own (the
// simple "npc" sheet) uses half its Physical pool, rounded up. Storyteller characters act
// after player characters on a tie. Nobody rolls: the tracker fills in the number when a
// combatant joins, and "Roll initiative" sets the same number again.
// Turn start: a card for whoever's turn it is, whispered to its owners and the
// Storyteller: movement + 1 action + 1 minor action, reactions refreshed to Wits, and
// what is weighing on the character (impairment, frenzy, low Health). The card counts
// reactions: "Use a reaction" ticks one off until the next turn.
//
// Settings (world): initiative (on), turnCards (on).

// Initiative number. Pure. Storyteller characters sit a hair below so ties go to players.
function a2kInitiative ({ wits = null, physical = null, player = false } = {}) {
  const base = wits !== null && wits !== undefined ? Math.max(0, a2Int(wits)) : Math.ceil(Math.max(0, a2Int(physical)) / 2)
  return player ? base : Math.max(0, base - 0.01)
}
// Reactions between turns = Wits (PG p.110); the simple npc sheet uses the same stand-in. Pure.
function a2kReactions ({ wits = null, physical = null } = {}) {
  return wits !== null && wits !== undefined ? Math.max(0, a2Int(wits)) : Math.ceil(Math.max(0, a2Int(physical)) / 2)
}
// The reminder lines for a turn. Pure.
function a2kTurnLines ({ reactions = 0, health = null, impaired = [], frenzy = null, torpor = false, surprised = false } = {}) {
  const lines = ['Movement within Short, 1 action and 1 minor action. Give up the action to move within Medium (PG p.109, p.115).']
  lines.push(`Reactions until your next turn: ${reactions} (PG p.110). Defending costs none (PG p.120).`)
  if (surprised) lines.push('Surprised: −2 on every test, and no reactions before this turn (PG p.115).')
  if (frenzy) lines.push(`In a ${frenzy} frenzy: it sets what you can do this turn (PG p.144).`)
  if (impaired.length) lines.push(`Impaired: ${impaired.join(', ')}.`)
  if (health && health.max > 0 && health.value <= 0) lines.push('At 0 Health.')
  else if (health && health.max > 0 && health.value * 2 <= health.max) lines.push(`Health ${health.value} of ${health.max}.`)
  if (torpor) lines.push('In torpor: no turn.')
  return lines
}

const a2kState = { hooked: false, patched: false }
function a2kOn (key) { return a2Enabled() && a2eGet(key, true) !== false }
function a2kStats (actor) {
  if (!actor) return { wits: 0, physical: null }
  if (actor.type === 'npc') {
    const levels = typeof a2NpcLevels === 'function' ? a2NpcLevels(actor) : []
    const phys = levels.find((l) => l.key === 'physical') ?? levels.sort((a, b) => b.value - a.value)[0]
    return { wits: null, physical: a2Int(phys?.value) }
  }
  const w = actor.system?.attributes?.wits
  return { wits: a2Int(w?.effective ?? w?.value), physical: null }
}
function a2kInitFor (actor) {
  return a2kInitiative({ ...a2kStats(actor), player: Boolean(actor?.hasPlayerOwner) })
}
function a2kPatch () {
  if (a2kState.patched) return
  const proto = CONFIG.Combat?.documentClass?.prototype
  if (!proto?.rollInitiative) return
  a2kState.patched = true
  const orig = proto.rollInitiative
  proto.rollInitiative = async function (ids, options = {}) {
    if (!a2kOn('initiative')) return orig.call(this, ids, options)
    const list = (typeof ids === 'string' ? [ids] : [...(ids ?? [])]).map((id) => this.combatants.get(id)).filter((c) => c?.isOwner)
    const updates = list.map((c) => ({ _id: c.id, initiative: a2kInitFor(c.actor) }))
    if (updates.length) await this.updateEmbeddedDocuments('Combatant', updates)
    return this
  }
}

async function a2kTurnCard (combat) {
  const c = combat?.combatant
  const actor = c?.actor
  if (!actor || c.defeated) return
  const st = a2kStats(actor)
  const reactions = a2kReactions(st)
  let health = null
  let impaired = []
  let frenzy = null
  let torpor = false
  try {
    if (a2Rules(actor) || actor.type === 'npc') health = a2ActorHealth(actor)
    const f = actor.flags?.world?.a2 ?? {}
    frenzy = f.frenzy?.type ?? null
    torpor = Boolean(f.torpor)
    if (typeof a2xImpairment === 'function' && actor.type === 'vampire') impaired = [...a2xImpairment(actor).all].map((k) => a2Cap(String(k)))
  } catch (e) { /* the reminder still goes out */ }
  const lines = a2kTurnLines({ reactions, health, impaired, frenzy, torpor })
  const owners = game.users.filter((u) => u.isGM || actor.testUserPermission(u, 'OWNER')).map((u) => u.id)
  const hidden = c.hidden || c.token?.hidden
  await ChatMessage.create({
    content: `<div class="a2k-turn"><h4>${a2Esc(c.name ?? actor.name)}: your turn</h4><ul>${lines.map((l) => `<li>${a2Esc(l)}</li>`).join('')}</ul></div>`,
    speaker: { alias: `Round ${combat.round}` },
    whisper: hidden ? game.users.filter((u) => u.isGM).map((u) => u.id) : owners,
    flags: { world: { a2turn: { v: 1, combatId: combat.id, combatantId: c.id, round: combat.round, reactions } } }
  })
}
function a2kRenderChat (message, html) {
  const t = message.flags?.world?.a2turn
  if (!t) return
  const root = html instanceof HTMLElement ? html : html?.[0]
  const box = root?.querySelector('.a2k-turn')
  if (!box || box.querySelector('.a2k-react')) return
  const combat = game.combats?.get(t.combatId)
  const c = combat?.combatants?.get(t.combatantId)
  const row = document.createElement('div')
  row.className = 'a2k-react'
  // live while it is this combatant's newest turn card
  const newest = game.messages.contents.findLast((m) => m.flags?.world?.a2turn?.combatantId === t.combatantId && m.flags.world.a2turn.combatId === t.combatId)
  const live = Boolean(c) && newest?.id === message.id
  const used = live ? Math.min(a2Int(c.flags?.world?.a2k?.card === message.id ? c.flags.world.a2k.used : 0), t.reactions) : null
  const pips = used === null ? '' : '●'.repeat(Math.max(0, t.reactions - used)) + '○'.repeat(used)
  row.innerHTML = used === null ? '<span>This turn is over.</span>' : `<span title="Reactions left until your next turn">Reactions ${pips || '–'}</span>`
  if (used !== null && c?.isOwner) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = 'Use a reaction'
    b.disabled = used >= t.reactions
    b.addEventListener('click', async (ev) => {
      ev.preventDefault()
      // what the reaction is (alpha2-table); cancelled means nothing is ticked
      if (typeof a2wReaction === 'function' && !(await a2wReaction(c.actor))) return // eslint-disable-line no-undef
      await c.update({ 'flags.world.a2k': { card: message.id, used: used + 1 } })
    })
    row.append(b)
    if (used > 0) {
      const u = document.createElement('a')
      u.textContent = 'undo'
      u.addEventListener('click', async (ev) => { ev.preventDefault(); await c.update({ 'flags.world.a2k': { card: message.id, used: used - 1 } }) })
      row.append(u)
    }
  }
  if (used !== null && c?.isOwner && typeof a2vOpen === 'function') { // eslint-disable-line no-undef
    const act = document.createElement('button')
    act.type = 'button'
    act.innerHTML = '<i class="fa-solid fa-hand-fist"></i> Actions'
    act.addEventListener('click', (ev) => { ev.preventDefault(); a2vOpen(c.actor) }) // eslint-disable-line no-undef
    row.append(act)
  }
  box.append(row)
}

function a2kHooks () {
  if (a2kState.hooked) return
  a2kState.hooked = true
  Hooks.on('preCreateCombatant', (combatant, data) => {
    try {
      if (!a2kOn('initiative') || (data?.initiative !== undefined && data.initiative !== null)) return
      const actor = combatant.actor
      if (actor) combatant.updateSource({ initiative: a2kInitFor(actor) })
    } catch (e) { console.error('V6 Automation | initiative', e) }
  })
  Hooks.on('updateCombat', (combat, changes) => {
    try {
      if (!a2kOn('turnCards') || !a2xIsGM() || !combat?.started) return
      if (!('turn' in (changes ?? {})) && !('round' in (changes ?? {}))) return
      a2kTurnCard(combat).catch((e) => console.error('V6 Automation | turn card', e))
    } catch (e) { console.error('V6 Automation | turn card', e) }
  })
  Hooks.on('createChatMessage', (m) => {
    const t = m.flags?.world?.a2turn
    if (!t) return
    const prev = game.messages.contents.filter((x) => x.id !== m.id && x.flags?.world?.a2turn?.combatantId === t.combatantId).pop()
    if (prev) ui.chat?.updateMessage?.(prev)
  })
  Hooks.on('renderChatMessageHTML', (message, html) => { try { a2kRenderChat(message, html) } catch (e) { console.error('V6 Automation | turn card', e) } })
  // a reaction ticked off: redraw that card for everyone who sees it
  Hooks.on('updateCombatant', (c, changes) => {
    // the change only lists what differs (often just "used"), so take the card from the combatant
    const id = changes?.flags?.world?.a2k ? c.flags?.world?.a2k?.card : null
    const m = id ? game.messages.get(id) : null
    if (m) ui.chat?.updateMessage?.(m)
  })
}

function a2kInjectStyles () {
  document.getElementById('v6a-combat-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-combat-style'
  style.textContent = `
.a2k-turn h4 { margin: 0 0 2px; font-weight: 700; }
.a2k-turn ul { margin: 2px 0 6px; padding-left: 18px; font-size: 12px; }
.a2k-react { display: flex; align-items: center; gap: 8px; }
.a2k-react span { flex: 1; letter-spacing: 1px; }
.a2k-react button { flex: 0 0 auto; width: auto; line-height: 1.6; padding: 0 10px; }
.a2k-react a { font-size: 12px; cursor: pointer; }
`
  document.head.appendChild(style)
}

async function a2CombatBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.combat?.booted) return true
  a2eReg('initiative', { name: 'Turn order by Wits', hint: 'Combatants get their place in the turn order without a roll: Wits, or half the Physical pool for simple NPC sheets; players win ties (PG p.115).', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('turnCards', { name: 'Turn reminders', hint: 'At the start of each turn, whisper a card to that character\'s players: movement, action, minor action, reactions, and what weighs on the character.', scope: 'world', config: true, type: Boolean, default: true })
  a2kInjectStyles()
  a2kPatch()
  a2kHooks()
  try { if (a2kOn('initiative') && CONFIG.Combat?.initiative) CONFIG.Combat.initiative.decimals = 0 } catch (e) { /* display only */ }
  api.combat = { booted: true, initiativeFor: a2kInitFor, rules: { initiative: a2kInitiative, reactions: a2kReactions, turnLines: a2kTurnLines } }
  console.log('V6 Automation | combat flow loaded')
  return true
}
globalThis.a2CombatBoot ??= a2CombatBoot

// ---- character creation (PG p.22-63) ---------------------------------------------------
// One window that walks through the Player Guide's steps and counts the dots:
//  1 What are you: vampire, Duskborn or ghoul; generation (it sets the tier, the
//    generation modifier, Vitae, the dot budget and the number of flaws); ages; sire.
//  2 Clan.  3 Lifepaths (5 Skill and 3 Resource dots each).  4 Attributes.  5 Skills
//  and specialties.  6 Disciplines and powers.  7 Clan traits, merits, flaws.
//  8 Resources.  9 Review: every rule is a line that is met or not; the Storyteller may
//  apply anyway.
// "Create" writes it all to the sheet: dots, items from the world's V6 library (or the
// V6 Rules compendium), Humanity 6, full Health, Vitae and Willpower.
// Open it from the sheet (wand in the XP line), or V6Alpha2.create(actor).
// House rules, marked in the window: ghouls use the Duskborn row without clan traits
// (the PG prints no ghoul row); Methuselahs use the elder row.

const A2C_ATTR_CATS = { physical: ['strength', 'dexterity', 'stamina'], social: ['charisma', 'manipulation', 'composure'], mental: ['intelligence', 'wits', 'resolve'] }
const A2C_SKILLS = ['athletics', 'awareness', 'craft', 'expression', 'fighting', 'investigation', 'knowledge', 'medicine', 'persuasion', 'sabotage', 'shooting', 'subterfuge', 'survival']
const A2C_DISCS = ['animalism', 'auspex', 'bloodSorcery', 'celerity', 'corruption', 'dominate', 'fortitude', 'necromancy', 'obfuscate', 'oblivion', 'potence', 'presence', 'tellurgy', 'vicissitude']
const A2C_TIER_ORDER = ['mortal', 'ghoul', 'duskborn', 'neonate', 'ancilla', 'elder', 'methuselah']
// PG p.22 and p.36 (Dot Distribution), p.44 (starting Discipline limit), p.36 (starting Skill limit).
const A2C_BUDGET = {
  ghoul: { label: 'Ghoul', house: 'The Player Guide prints no ghoul row: this uses the Duskborn row, mortal lifepaths, no clan traits.', lifepaths: 2, attrs: [6, 4, 3], disc: 2, sire: 1, extra: 0, powers: 3, merits: 1, traits: 0, skills: 8, resources: 2, startDisc: 2, startSkill: 3, maxDots: 5, paths: ['mortal'] },
  duskborn: { label: 'Duskborn', lifepaths: 2, attrs: [6, 4, 3], disc: 2, sire: 1, extra: 0, powers: 3, merits: 1, traits: 1, skills: 8, resources: 2, startDisc: 2, startSkill: 3, maxDots: 5, paths: ['mortal', 'neonate'] },
  neonate: { label: 'Neonate', lifepaths: 2, attrs: [7, 5, 3], disc: 3, sire: 1, extra: 0, powers: 4, merits: 1, traits: 2, skills: 8, resources: 3, startDisc: 3, startSkill: 3, maxDots: 5, paths: ['mortal', 'neonate'] },
  ancilla: { label: 'Ancilla', lifepaths: 3, attrs: [8, 6, 4], disc: 5, sire: 1, extra: 1, powers: 7, merits: 2, traits: 3, skills: 8, resources: 5, startDisc: 4, startSkill: 4, maxDots: 7, paths: ['mortal', 'neonate', 'ancilla'] },
  elder: { label: 'Elder', lifepaths: 4, attrs: [9, 7, 5], disc: 7, sire: 1, extra: 2, powers: 10, merits: 3, traits: 4, skills: 8, resources: 7, startDisc: 6, startSkill: 5, maxDots: 8, paths: ['mortal', 'neonate', 'ancilla'] },
  methuselah: { label: 'Methuselah', house: 'The Player Guide has no Methuselah row: this uses the elder row.', lifepaths: 4, attrs: [9, 7, 5], disc: 7, sire: 1, extra: 2, powers: 10, merits: 3, traits: 4, skills: 8, resources: 7, startDisc: 6, startSkill: 5, maxDots: 10, paths: ['mortal', 'neonate', 'ancilla'] }
}
// PG p.26 (Feral: the table says Potence, the text Fortitude; both offered).
const A2C_SIRES = {
  'Brood Child': null,
  Caring: ['fortitude', 'potence', 'presence'],
  Cruel: ['dominate', 'fortitude', 'obfuscate'],
  Distant: ['celerity', 'fortitude', 'obfuscate'],
  Feral: ['animalism', 'celerity', 'potence', 'fortitude'],
  Manipulative: ['dominate', 'potence', 'presence'],
  Secretive: ['auspex', 'celerity', 'obfuscate'],
  Uncaring: ['auspex', 'fortitude', 'potence'],
  Unknown: ['celerity', 'fortitude', 'potence'],
  Vigilant: ['auspex', 'dominate', 'fortitude']
}

// ---- pure rules ----
function a2cTierKey (creature, generation) {
  if (creature === 'ghoul') return 'ghoul'
  const g = a2Int(generation, 13)
  if (creature === 'duskborn' || g >= 14) return 'duskborn'
  if (g >= 11) return 'neonate'
  if (g >= 9) return 'ancilla'
  if (g >= 6) return 'elder'
  return 'methuselah'
}
// Everything the generation decides. Pure.
function a2cFrame (creature, generation) {
  const key = a2cTierKey(creature, generation)
  const gen = creature === 'ghoul' ? null : a2Clamp(a2Int(generation, 13), 4, 16)
  const genMod = creature === 'ghoul' ? 0 : a2GenModifier(gen)
  return { key, generation: gen, genMod, budget: A2C_BUDGET[key], vitae: creature === 'ghoul' ? 5 : 5 + 5 * genMod, flaws: Math.max(1, genMod) }
}
function a2cTierAllows (need, have) {
  if (!need) return true
  return A2C_TIER_ORDER.indexOf(have) >= A2C_TIER_ORDER.indexOf(need)
}
// How many specialties a Skill's dots give (PG p.39: at 1, 3 and 5 dots). Pure.
function a2cSpecialties (dots) { const d = a2Int(dots); return d >= 5 ? 3 : d >= 3 ? 2 : d >= 1 ? 1 : 0 }
// Final dots from a state. Pure.
// state: { creature, generation, clanDiscs:[keys], attrs:{k:total}, lifepaths:[{name, skills:{k:dots}, resources:[dots]}],
//          skills:{k:free dots}, disc:{k:clan dots}, sireDisc, extraDiscs:[k], powers:[{disc, level}], traits, merits, flaws, resourcesExtra }
function a2cTotals (state) {
  const skills = Object.fromEntries(A2C_SKILLS.map((k) => [k, a2Int(state.skills?.[k])]))
  for (const lp of state.lifepaths ?? []) for (const [k, v] of Object.entries(lp.skills ?? {})) if (k in skills) skills[k] += a2Int(v)
  const disc = Object.fromEntries(A2C_DISCS.map((k) => [k, a2Int(state.disc?.[k])]))
  if (state.sireDisc && state.sireDisc in disc) disc[state.sireDisc] += 1
  for (const k of state.extraDiscs ?? []) if (k && k in disc) disc[k] += 1
  return { skills, disc }
}
// The checklist. Pure. → [{ ok, text, step }]
function a2cCheck (state) {
  const f = a2cFrame(state.creature, state.generation)
  const b = f.budget
  const out = []
  const add = (step, ok, text) => out.push({ step, ok: Boolean(ok), text })
  const t = a2cTotals(state)
  add(2, state.creature === 'ghoul' || Boolean(state.clan), state.creature === 'ghoul' ? 'Ghouls have no clan of their own' : `Clan: ${state.clan || 'not chosen'}`)
  // lifepaths
  const lps = (state.lifepaths ?? []).filter((l) => l.name)
  add(3, lps.length === b.lifepaths, `Lifepaths: ${lps.length} of ${b.lifepaths}`)
  for (const lp of lps) {
    const s = Object.values(lp.skills ?? {}).reduce((x, y) => x + a2Int(y), 0)
    const r = (lp.resources ?? []).reduce((x, y) => x + a2Int(y), 0)
    add(3, s === 5 && r === 3, `${lp.name}: ${s} of 5 Skill dots, ${r} of 3 Resource dots`)
  }
  if (new Set(lps.map((l) => l.name)).size !== lps.length) add(3, false, 'The same lifepath is chosen twice')
  // attributes
  const sums = Object.values(A2C_ATTR_CATS).map((keys) => keys.reduce((x, k) => x + Math.max(0, a2Int(state.attrs?.[k], 1) - 1), 0)).sort((x, y) => y - x)
  add(4, sums.every((v, i) => v === b.attrs[i]), `Attributes: ${sums.join(' / ')} added, should be ${b.attrs.join(' / ')} (each starts at 1)`)
  const overAttr = Object.entries(state.attrs ?? {}).filter(([, v]) => a2Int(v) > b.maxDots).map(([k]) => k)
  if (overAttr.length) add(4, false, `Above the maximum of ${b.maxDots}: ${overAttr.join(', ')}`)
  // skills
  const free = A2C_SKILLS.reduce((x, k) => x + a2Int(state.skills?.[k]), 0)
  add(5, free === b.skills, `Skills: ${free} of ${b.skills} free dots (lifepath dots come on top)`)
  const overSkill = A2C_SKILLS.filter((k) => t.skills[k] > b.startSkill)
  add(5, !overSkill.length, overSkill.length ? `Above the starting limit of ${b.startSkill}: ${overSkill.join(', ')}` : `No Skill above the starting limit of ${b.startSkill}`)
  const spec = A2C_SKILLS.filter((k) => (state.specialties?.[k] ?? []).length > a2cSpecialties(t.skills[k]))
  if (spec.length) add(5, false, `More specialties than the dots give (1 at 1, 3 and 5 dots): ${spec.join(', ')}`)
  // disciplines
  const clanDiscs = state.clanDiscs ?? []
  const clanDots = A2C_DISCS.reduce((x, k) => x + a2Int(state.disc?.[k]), 0)
  add(6, clanDots === b.disc, `Disciplines: ${clanDots} of ${b.disc} dots in ${state.creature === 'ghoul' ? "your master's" : 'clan'} Disciplines`)
  const stray = A2C_DISCS.filter((k) => a2Int(state.disc?.[k]) > 0 && clanDiscs.length && !clanDiscs.includes(k))
  if (stray.length) add(6, false, `Not a clan Discipline: ${stray.join(', ')}`)
  add(6, Boolean(state.sireDisc), `${state.creature === 'ghoul' ? 'Master' : 'Sire'} dot: ${state.sireDisc || 'not chosen'}`)
  if (b.extra) {
    const ex = (state.extraDiscs ?? []).filter(Boolean)
    add(6, ex.length === b.extra && ex.every((k) => !clanDiscs.includes(k)), `Out-of-clan dots: ${ex.length} of ${b.extra}${ex.some((k) => clanDiscs.includes(k)) ? ' (one is a clan Discipline)' : ''}`)
  }
  const overDisc = A2C_DISCS.filter((k) => t.disc[k] > b.startDisc)
  add(6, !overDisc.length, overDisc.length ? `Above the starting limit of ${b.startDisc}: ${overDisc.join(', ')}` : `No Discipline above the starting limit of ${b.startDisc}`)
  const powers = state.powers ?? []
  add(6, powers.length === b.powers, `Powers: ${powers.length} of ${b.powers}`)
  const bad = powers.filter((p) => a2Int(p.level) > a2Int(t.disc[p.disc]))
  if (bad.length) add(6, false, `Power rank above your dots: ${bad.map((p) => p.name).join(', ')}`)
  // traits, merits, flaws
  if (b.traits || (state.traits ?? []).length) add(7, (state.traits ?? []).length === b.traits, `Clan traits: ${(state.traits ?? []).length} of ${b.traits}`)
  add(7, (state.merits ?? []).length === b.merits, `Merits: ${(state.merits ?? []).length} of ${b.merits}`)
  add(7, (state.flaws ?? []).length >= f.flaws, `Flaws: ${(state.flaws ?? []).length}, at least ${f.flaws}`)
  for (const u of state.unmet ?? []) add(7, false, u)
  // resources
  const rx = (state.resourcesExtra ?? []).reduce((x, r) => x + a2Int(r.dots), 0)
  add(8, rx === b.resources, `Resources: ${rx} of ${b.resources} extra dots (lifepath dots come on top)`)
  return out
}
// Does an item's prerequisite block hold? Pure. → '' or the reason.
function a2cPrereq (item, { tier, disc }) {
  const p = item?.system?.prerequisites ?? {}
  if (p.generationTier && !a2cTierAllows(p.generationTier, tier)) return `${item.name} needs ${p.generationTier} or stronger`
  for (const req of p.disciplineRequirements ?? []) {
    const opts = req?.options ?? []
    if (opts.length && !opts.some((o) => a2Int(disc?.[o.discipline]) >= a2Int(o.dots))) return `${item.name} needs ${opts.map((o) => `${o.discipline} ${o.dots}`).join(' or ')}`
  }
  return ''
}

// ---- library ----
const a2cState = { lib: null, hooked: false }
async function a2cLibrary () {
  if (a2cState.lib) return a2cState.lib
  const lib = { clan: new Map(), lifepath: new Map(), merit: new Map(), flaw: new Map(), clanTrait: new Map(), discipline: new Map(), nature: new Map() }
  // superseded material kept for reference (the "Alpha 1 (archive)" folder) is not offered
  const archived = (i) => { for (let f = i.folder, n = 0; f && n < 6; f = f.folder, n++) if (/archive/i.test(f.name ?? '')) return true; return false }
  const add = (i) => { const m = lib[i.type]; if (m && !m.has(i.name) && !archived(i)) m.set(i.name, i) }
  for (const i of game.items ?? []) add(i)
  if (!lib.clan.size || !lib.lifepath.size || !lib.discipline.size) {
    for (const pack of game.packs ?? []) {
      if (pack.documentName !== 'Adventure' || !/v6/i.test(`${pack.collection} ${pack.title ?? ''}`)) continue
      try { for (const adv of await pack.getDocuments()) for (const i of adv.items ?? []) add(i) } catch (e) { /* skip the pack */ }
    }
  }
  if (lib.clan.size) a2cState.lib = lib
  return lib
}

// ---- the window ----
function a2cLabel (cfg, k) { return typeof a2TraitLabel === 'function' ? a2TraitLabel(cfg, k) : k }
function a2cNum (name, value, min, max, extra = '') { return `<input type="number" name="${name}" value="${value}" min="${min}" max="${max}" step="1" class="a2c-num" ${extra}>` }
// A short tag saying where an item comes from: its folder, without the type prefix.
function a2cGroup (i) {
  const f = String(i.folder?.name ?? '')
  if (i.type === 'discipline') return /^Ported/i.test(f) ? 'ported' : /^Elder/i.test(f) ? 'elder' : /Ritual|Ceremon/i.test(f) ? 'ritual' : ''
  if (i.type === 'clanTrait') return ''
  return f.replace(/^(?:Merits|Flaws)\s*[—-]\s*/i, '').replace(/^General$/i, '')
}
function a2cItemList (kind, items, attrs = () => '') {
  return `<input type="search" class="a2c-filter" data-list="${kind}" placeholder="Filter…"><div class="a2c-list" data-kind="${kind}">${items.map((i) => `<label class="a2c-item" ${attrs(i)} data-name="${a2Esc(i.name.toLowerCase())}" title="${a2Esc(String(i.system?.description ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 420))}"><input type="checkbox" name="${kind}" value="${a2Esc(i.name)}"> ${a2Esc(i.name)} <small>${a2Esc(a2cGroup(i))}</small></label>`).join('')}</div>`
}
function a2cContent (actor, lib) {
  const byName = (m) => [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
  const gen = a2Clamp(a2Int(actor.system?.vampire?.generation?.value, 13), 4, 16)
  const steps = ['What are you', 'Clan', 'Lifepaths', 'Attributes', 'Skills', 'Disciplines', 'Traits, merits, flaws', 'Resources', 'Review']
  const discOpts = (list) => `<option value="">choose…</option>${list.map((k) => `<option value="${k}">${a2Esc(a2cLabel('Disciplines', k))}</option>`).join('')}`
  const attrs = Object.entries(A2C_ATTR_CATS).map(([cat, keys]) => `<fieldset><legend>${cat[0].toUpperCase()}${cat.slice(1)} <span data-a2c="cat-${cat}"></span></legend>${keys.map((k) => `<label class="a2c-row">${a2Esc(a2cLabel('Attributes', k))} ${a2cNum(`attr.${k}`, 1, 1, 10)}</label>`).join('')}</fieldset>`).join('')
  const skills = A2C_SKILLS.map((k) => `<tr><td>${a2Esc(a2cLabel('Skills', k))}</td><td class="c" data-a2c="lp-${k}">0</td><td class="c">${a2cNum(`skill.${k}`, 0, 0, 10)}</td><td class="c" data-a2c="tot-${k}">0</td><td><input type="text" name="spec.${k}" placeholder="specialties, comma-separated"></td></tr>`).join('')
  const powers = byName(lib.discipline).sort((a, b) => String(a.system.disciplineType).localeCompare(String(b.system.disciplineType)) || a2Int(a.system.level) - a2Int(b.system.level) || a.name.localeCompare(b.name))
  return `<div class="a2c">
  <nav class="a2c-nav">${steps.map((s, i) => `<a data-step="${i + 1}" class="${i ? '' : 'on'}"><b>${i + 1}</b> ${s}</a>`).join('')}</nav>
  <div class="a2c-body">
  <section data-step="1">
    <div class="a2c-grid">
      <label>Name <input type="text" name="name" value="${a2Esc(actor.name)}"></label>
      <label>Concept or archetype <input type="text" name="concept" placeholder="Burned-out paramedic, turned on shift"></label>
      <label>You are a <select name="creature"><option value="vampire">Vampire</option><option value="duskborn">Duskborn</option><option value="ghoul">Ghoul</option></select></label>
      <label title="Normally set by the Storyteller (PG p.26-28). It decides the tier.">Generation <select name="generation">${[16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4].map((g) => `<option value="${g}" ${g === gen ? 'selected' : ''}>${g}th</option>`).join('')}</select></label>
      <label>Actual age <input type="number" name="born" min="0" step="1" placeholder="76"></label>
      <label>Date of Embrace <input type="text" name="embraced" placeholder="Autumn 1979"></label>
      <label>Apparent age <input type="number" name="apparentAge" min="0" step="1" placeholder="31"></label>
      <label title="The decade you still feel at home in (PG p.56-59).">Nostalgic decade <input type="text" name="decade" placeholder="1990s"></label>
      <label><span><span data-a2c="sire-word">Sire</span>'s name</span> <input type="text" name="sireName"></label>
      <label title="The kind of sire gives 1 dot in one of three Disciplines (PG p.26)."><span><span data-a2c="sire-word2">Sire</span> was</span> <select name="sireType">${Object.keys(A2C_SIRES).map((s) => `<option value="${s}" ${s === 'Unknown' ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    </div>
    <p class="a2c-frame" data-a2c="frame"></p>
  </section>
  <section data-step="2" hidden>
    <label>Clan <select name="clan"><option value="">choose…</option>${byName(lib.clan).map((c) => `<option value="${a2Esc(c.name)}">${a2Esc(c.name)}</option>`).join('')}</select></label>
    <div data-a2c="clan-info" class="a2c-info"></div>
    <div data-a2c="caitiff" hidden><p>Pick this character's three Disciplines:</p>${[0, 1, 2].map((i) => `<select name="caitiff${i}">${discOpts(A2C_DISCS)}</select>`).join(' ')}</div>
  </section>
  <section data-step="3" hidden>
    <p class="a2c-hint">Each lifepath gives 5 Skill dots and 3 Resource dots, spread over its lists (PG p.29).</p>
    ${[0, 1, 2, 3].map((i) => `<fieldset data-lp="${i}"><legend>Lifepath ${i + 1} <select name="lp${i}"><option value="">choose…</option>${byName(lib.lifepath).map((l) => `<option value="${a2Esc(l.name)}" data-cat="${a2Esc(l.flags?.world?.a2?.category ?? 'mortal')}">${a2Esc(l.name)} (${a2Esc(l.flags?.world?.a2?.category ?? 'mortal')})</option>`).join('')}</select></legend><div data-a2c="lp-body-${i}"></div></fieldset>`).join('')}
  </section>
  <section data-step="4" hidden>
    <p class="a2c-hint" data-a2c="attr-hint"></p>
    <div class="a2c-cols">${attrs}</div>
  </section>
  <section data-step="5" hidden>
    <p class="a2c-hint" data-a2c="skill-hint"></p>
    <table class="a2c-table"><tr><th>Skill</th><th class="c">Lifepaths</th><th class="c">Free dots</th><th class="c">Total</th><th>Specialties (1 at 1, 3 and 5 dots)</th></tr>${skills}</table>
  </section>
  <section data-step="6" hidden>
    <p class="a2c-hint" data-a2c="disc-hint"></p>
    <div class="a2c-cols">
      <fieldset><legend>Clan Disciplines</legend>${A2C_DISCS.map((k) => `<label class="a2c-row" data-disc-row="${k}">${a2Esc(a2cLabel('Disciplines', k))} ${a2cNum(`disc.${k}`, 0, 0, 10)}</label>`).join('')}</fieldset>
      <fieldset><legend>Extra dots</legend>
        <label class="a2c-row"><span data-a2c="sire-word3">Sire</span> dot <select name="sireDisc"></select></label>
        ${[0, 1].map((i) => `<label class="a2c-row" data-extra="${i}">Out of clan <select name="extra${i}">${discOpts(A2C_DISCS)}</select></label>`).join('')}
        <p data-a2c="disc-total" class="a2c-info"></p>
      </fieldset>
    </div>
    <h4>Powers <span data-a2c="power-count"></span></h4>
    <p class="a2c-hint">Only powers whose rank your dots reach are listed (PG p.44).</p>
    ${a2cItemList('power', powers, (i) => `data-disc="${a2Esc(i.system.disciplineType)}" data-level="${a2Int(i.system.level)}"`)}
  </section>
  <section data-step="7" hidden>
    <h4>Clan traits <span data-a2c="trait-count"></span> <label class="a2c-inline"><input type="checkbox" name="otherClans"> show other clans</label></h4>
    ${a2cItemList('trait', byName(lib.clanTrait), (i) => `data-clan="${a2Esc(i.flags?.world?.a2?.clan ?? '')}" data-tier="${a2Esc(i.system?.prerequisites?.generationTier ?? '')}"`)}
    <h4>Merits <span data-a2c="merit-count"></span> <label class="a2c-inline"><input type="checkbox" name="otherMerits"> show loresheets and Path advantages</label></h4>
    ${a2cItemList('merit', byName(lib.merit), (i) => `data-tier="${a2Esc(i.system?.prerequisites?.generationTier ?? '')}" data-special="${/loresheet|path advantage/i.test(i.folder?.name ?? '') ? '1' : ''}"`)}
    <h4>Flaws <span data-a2c="flaw-count"></span></h4>
    ${a2cItemList('flaw', byName(lib.flaw))}
    <label>Your own flaw <input type="text" name="ownFlaw" placeholder="Name of a free-form flaw (−2 when it complicates things)"></label>
  </section>
  <section data-step="8" hidden>
    <p class="a2c-hint" data-a2c="res-hint"></p>
    <div data-a2c="lp-res"></div>
    <table class="a2c-table"><tr><th>Extra Resource</th><th>Kind</th><th class="c">Dots</th></tr>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<tr><td><input type="text" name="res${i}.name" placeholder="Haven: flat above the laundrette"></td><td><select name="res${i}.type"><option value="physicalAssets">Physical asset</option><option value="socialAssets">Social asset</option><option value="wealth">Wealth</option></select></td><td class="c">${a2cNum(`res${i}.dots`, 0, 0, 5)}</td></tr>`).join('')}</table>
  </section>
  <section data-step="9" hidden>
    <p class="a2c-hint">Humanity starts at rank 6 (PG p.50). Health, Vitae and Willpower are filled. Clan, lifepath, power, trait, merit, flaw and Resource items already on the sheet are replaced.</p>
    <label>Humanity or Path rank ${a2cNum('humanity', 6, 1, 10)}</label>
    <div data-a2c="review"></div>
  </section>
  </div>
  <aside class="a2c-side"><h4>Checklist</h4><div data-a2c="checks"></div><div class="a2c-steps"><button type="button" data-a2c="prev">Back</button><button type="button" data-a2c="next">Next</button></div></aside>
</div>`
}

function a2cRead (root, lib) {
  const q = (n) => root.querySelector(`[name="${n}"]`)
  const val = (n) => q(n)?.value ?? ''
  const creature = val('creature') || 'vampire'
  const generation = a2Int(val('generation'), 13)
  const clan = creature === 'ghoul' ? '' : val('clan')
  const clanItem = lib.clan.get(clan)
  let clanDiscs = [...(clanItem?.system?.disciplines ?? [])]
  if (clan && !clanDiscs.length) clanDiscs = [0, 1, 2].map((i) => val(`caitiff${i}`)).filter(Boolean)
  const state = { creature, generation, clan, clanDiscs, name: val('name').trim(), concept: val('concept').trim(), born: val('born'), embraced: val('embraced'), apparentAge: val('apparentAge'), decade: val('decade').trim(), sireName: val('sireName').trim(), sireType: val('sireType'), sireDisc: val('sireDisc'), humanity: a2Clamp(a2Int(val('humanity'), 6), 1, 10) }
  const f = a2cFrame(creature, generation)
  state.attrs = Object.fromEntries(Object.values(A2C_ATTR_CATS).flat().map((k) => [k, Math.max(1, a2Int(val(`attr.${k}`), 1))]))
  state.skills = Object.fromEntries(A2C_SKILLS.map((k) => [k, Math.max(0, a2Int(val(`skill.${k}`)))]))
  state.specialties = Object.fromEntries(A2C_SKILLS.map((k) => [k, val(`spec.${k}`).split(',').map((s) => s.trim()).filter(Boolean)]))
  state.disc = Object.fromEntries(A2C_DISCS.map((k) => [k, Math.max(0, a2Int(val(`disc.${k}`)))]))
  state.extraDiscs = [0, 1].slice(0, f.budget.extra).map((i) => val(`extra${i}`))
  state.lifepaths = []
  for (let i = 0; i < f.budget.lifepaths; i++) {
    const name = val(`lp${i}`)
    const item = lib.lifepath.get(name)
    if (!item) { state.lifepaths.push({ name: '' }); continue }
    const a2 = item.flags?.world?.a2 ?? {}
    const sk = {}
    const specs = {}
    ;(a2.skills ?? []).forEach((s, j) => { sk[s.skill] = (sk[s.skill] ?? 0) + Math.max(0, a2Int(val(`lp${i}.s${j}`))); if (s.specialty) specs[s.skill] = s.specialty })
    state.lifepaths.push({ name, skills: sk, specs, resources: (a2.resources ?? []).map((r, j) => Math.max(0, a2Int(val(`lp${i}.r${j}`)))), resourceNames: a2.resources ?? [] })
  }
  const checked = (kind) => [...root.querySelectorAll(`input[name="${kind}"]:checked`)].map((e) => e.value)
  state.powers = checked('power').map((n) => { const it = lib.discipline.get(n); return { name: n, disc: it?.system?.disciplineType, level: a2Int(it?.system?.level) } })
  state.traits = checked('trait')
  state.merits = checked('merit')
  state.flaws = [...checked('flaw'), ...(val('ownFlaw').trim() ? [val('ownFlaw').trim()] : [])]
  state.ownFlaw = val('ownFlaw').trim()
  state.resourcesExtra = [0, 1, 2, 3, 4, 5].map((i) => ({ name: val(`res${i}.name`).trim(), type: val(`res${i}.type`), dots: Math.max(0, a2Int(val(`res${i}.dots`))) })).filter((r) => r.dots > 0)
  const t = a2cTotals(state)
  state.unmet = [...state.traits.map((n) => lib.clanTrait.get(n)), ...state.merits.map((n) => lib.merit.get(n))].filter(Boolean).map((it) => a2cPrereq(it, { tier: f.key, disc: t.disc })).filter(Boolean)
  return state
}

function a2cUpdate (root, lib, ui2) {
  // first the parts of the form that other fields depend on
  const creature0 = root.querySelector('[name="creature"]')?.value || 'vampire'
  const genSel = root.querySelector('[name="generation"]')
  if (genSel) {
    genSel.disabled = creature0 === 'ghoul'
    if (creature0 === 'duskborn' && a2Int(genSel.value) < 14) genSel.value = '14'
    if (creature0 === 'vampire' && a2Int(genSel.value) > 13) genSel.value = '13'
  }
  const b0 = a2cFrame(creature0, genSel?.value).budget
  root.querySelectorAll('fieldset[data-lp]').forEach((fs) => {
    const i = a2Int(fs.dataset.lp)
    fs.hidden = i >= b0.lifepaths
    const sel = fs.querySelector('select')
    fs.querySelectorAll('option[data-cat]').forEach((o) => { o.hidden = !b0.paths.includes(o.dataset.cat); o.disabled = o.hidden })
    if (sel?.selectedOptions?.[0]?.disabled) sel.value = ''
    const name = sel?.value ?? ''
    const body = fs.querySelector(`[data-a2c="lp-body-${i}"]`)
    if (body && body.dataset.for !== name) {
      body.dataset.for = name
      const a2 = lib.lifepath.get(name)?.flags?.world?.a2
      body.innerHTML = a2 ? `<div class="a2c-lp"><div><em>Skills (5)</em>${(a2.skills ?? []).map((s, j) => `<label class="a2c-row">${a2Esc(a2cLabel('Skills', s.skill))}${s.specialty ? ` <small>(${a2Esc(s.specialty)})</small>` : ''} ${a2cNum(`lp${i}.s${j}`, 1, 0, 5)}</label>`).join('')}</div><div><em>Resources (3)</em>${(a2.resources ?? []).map((r, j) => `<label class="a2c-row">${a2Esc(r)} ${a2cNum(`lp${i}.r${j}`, 1, 0, 3)}</label>`).join('')}</div></div>` : ''
    }
  })
  const state = a2cRead(root, lib)
  const f = a2cFrame(state.creature, state.generation)
  const b = f.budget
  const set = (key, html) => { const e = root.querySelector(`[data-a2c="${key}"]`); if (e) e.innerHTML = html }
  const ghoul = state.creature === 'ghoul'
  for (const k of ['sire-word', 'sire-word2', 'sire-word3']) set(k, ghoul ? 'Master' : 'Sire')
  set('frame', `<strong>${b.label}</strong>${ghoul ? '' : `, ${f.generation}th generation: generation modifier ${f.genMod}`}. Vitae ${f.vitae}. Traits up to ${b.maxDots} dots. Lifepaths ${b.lifepaths}, Attributes ${b.attrs.join('/')}, Disciplines ${b.disc}+${b.sire + b.extra}, powers ${b.powers}, merits ${b.merits}, clan traits ${b.traits}, free Skill dots ${b.skills}, extra Resource dots ${b.resources}, at least ${f.flaws} ${f.flaws === 1 ? 'flaw' : 'flaws'}.${b.house ? ` <em>House rule: ${b.house}</em>` : ''}`)
  // clan
  const clanItem = lib.clan.get(state.clan)
  const clanRow = root.querySelector('[name="clan"]')?.closest('label')
  if (clanRow) clanRow.hidden = ghoul
  set('clan-info', ghoul ? "A ghoul learns its master's Disciplines: put the dots where the Storyteller agrees." : clanItem ? `<p><strong>Disciplines:</strong> ${state.clanDiscs.map((k) => a2Esc(a2cLabel('Disciplines', k))).join(', ') || 'your choice'}</p>${clanItem.system?.curse?.name ? `<p><strong>Curse:</strong> ${a2Esc(clanItem.system.curse.name)}</p>` : ''}${clanItem.system?.frenzy?.name ? `<p><strong>Clan frenzy:</strong> ${a2Esc(clanItem.system.frenzy.name)}</p>` : ''}${state.clanDiscs.length > 3 ? '<p>This clan offers a choice: put dots in three of them only.</p>' : ''}` : '')
  const cait = root.querySelector('[data-a2c="caitiff"]')
  if (cait) cait.hidden = !(clanItem && !(clanItem.system?.disciplines ?? []).length)
  // attributes and skills
  for (const [cat, keys] of Object.entries(A2C_ATTR_CATS)) set(`cat-${cat}`, `(+${keys.reduce((x, k) => x + state.attrs[k] - 1, 0)})`)
  set('attr-hint', `Every Attribute starts at 1. Add ${b.attrs.join(', ')} dots to your primary, secondary and tertiary group. Maximum ${b.maxDots}.`)
  const t = a2cTotals(state)
  for (const k of A2C_SKILLS) { set(`lp-${k}`, String(t.skills[k] - state.skills[k])); set(`tot-${k}`, t.skills[k] > b.startSkill ? `<b class="a2c-bad">${t.skills[k]}</b>` : String(t.skills[k])) }
  set('skill-hint', `${b.skills} free dots on top of your lifepaths. No Skill above ${b.startSkill} at the start (PG p.36).`)
  // disciplines
  root.querySelectorAll('[data-disc-row]').forEach((row) => { row.hidden = Boolean(state.clanDiscs.length) && !state.clanDiscs.includes(row.dataset.discRow); if (row.hidden) { const inp = row.querySelector('input'); if (inp && inp.value !== '0') inp.value = '0' } })
  const sireSel = root.querySelector('[name="sireDisc"]')
  if (sireSel && sireSel.dataset.for !== state.sireType) {
    sireSel.dataset.for = state.sireType
    const opts = A2C_SIRES[state.sireType] ?? A2C_DISCS
    sireSel.innerHTML = `<option value="">choose…</option>${opts.map((k) => `<option value="${k}">${a2Esc(a2cLabel('Disciplines', k))}</option>`).join('')}`
  }
  root.querySelectorAll('[data-extra]').forEach((row) => { row.hidden = a2Int(row.dataset.extra) >= b.extra })
  set('disc-hint', `${b.disc} dots among your clan Disciplines, 1 from your ${ghoul ? 'master' : 'sire'}${b.extra ? `, ${b.extra} out of clan (agree it with the Storyteller)` : ''}. No Discipline above ${b.startDisc} at the start (PG p.36, p.44).`)
  set('disc-total', A2C_DISCS.filter((k) => t.disc[k] > 0).map((k) => `${a2Esc(a2cLabel('Disciplines', k))} ${t.disc[k]}`).join(' · ') || 'No dots yet')
  root.querySelectorAll('.a2c-list[data-kind="power"] .a2c-item').forEach((row) => {
    const ok = a2Int(t.disc[row.dataset.disc]) >= a2Int(row.dataset.level) && a2Int(row.dataset.level) > 0
    row.dataset.off = ok ? '' : '1'
    if (!ok) { const cb = row.querySelector('input'); if (cb.checked) cb.checked = false }
  })
  const other = root.querySelector('[name="otherClans"]')?.checked
  root.querySelectorAll('.a2c-list[data-kind="trait"] .a2c-item').forEach((row) => { row.dataset.off = (other || row.dataset.clan === state.clan) && a2cTierAllows(row.dataset.tier, f.key) ? '' : '1' })
  const otherMerits = root.querySelector('[name="otherMerits"]')?.checked
  root.querySelectorAll('.a2c-list[data-kind="merit"] .a2c-item').forEach((row) => { row.dataset.off = a2cTierAllows(row.dataset.tier, f.key) && (otherMerits || row.dataset.special !== '1' || row.querySelector('input')?.checked) ? '' : '1' })
  const s2 = a2cRead(root, lib)
  set('power-count', `${s2.powers.length} of ${b.powers}`)
  set('trait-count', `${s2.traits.length} of ${b.traits}`)
  set('merit-count', `${s2.merits.length} of ${b.merits}`)
  set('flaw-count', `${s2.flaws.length}, at least ${f.flaws}`)
  set('res-hint', `${b.resources} extra Resource dots on top of your lifepaths (PG p.53). Resources can't be bought with XP later.`)
  set('lp-res', s2.lifepaths.filter((l) => l.name).map((l) => `<p><strong>${a2Esc(l.name)}:</strong> ${l.resourceNames.map((r, j) => `${a2Esc(r)} ${'●'.repeat(l.resources[j]) || '–'}`).join(', ')}</p>`).join(''))
  // checklist
  const checks = a2cCheck(s2)
  const step = ui2.step
  set('checks', checks.map((c) => `<div class="a2c-check ${c.ok ? 'ok' : 'no'} ${c.step === step ? 'here' : ''}" data-goto="${c.step}"><i class="fa-solid ${c.ok ? 'fa-check' : 'fa-xmark'}"></i> ${a2Esc(c.text)}</div>`).join(''))
  const open = checks.filter((c) => !c.ok).length
  set('review', `<p>${open ? `<b class="a2c-bad">${open} ${open === 1 ? 'line is' : 'lines are'} not met.</b> The Storyteller can still let it stand.` : '<b>Everything adds up.</b>'}</p><p>${a2Esc(s2.name || 'Unnamed')}: ${a2Esc(b.label)}${s2.clan ? `, ${a2Esc(s2.clan)}` : ''}. Health ${a2Int(s2.attrs.stamina) + 5}, Vitae ${f.vitae}, Willpower ${s2.attrs.composure + s2.attrs.resolve}.</p>`)
  root.querySelectorAll('.a2c-nav a').forEach((a) => { const n = a2Int(a.dataset.step); a.classList.toggle('on', n === step); a.classList.toggle('bad', checks.some((c) => c.step === n && !c.ok)) })
  root.querySelectorAll('.a2c-body > section').forEach((sec) => { sec.hidden = a2Int(sec.dataset.step) !== step })
  return s2
}

// What "Create" writes. Pure apart from reading library items. → { update, items, removeTypes }
function a2cBuild (state, lib) {
  const f = a2cFrame(state.creature, state.generation)
  const b = f.budget
  const t = a2cTotals(state)
  const max = b.maxDots
  const update = { name: state.name || 'Unnamed', 'flags.world.a2.creature': state.creature === 'ghoul' ? 'ghoul' : 'vampire', 'flags.world.a2.tier': f.key }
  for (const [k, v] of Object.entries(state.attrs)) { update[`system.attributes.${k}.value`] = v; update[`system.attributes.${k}.max`] = max }
  for (const k of A2C_SKILLS) {
    const specs = [...new Set([...(state.specialties[k] ?? []), ...state.lifepaths.filter((l) => l.name && a2Int(l.skills?.[k]) > 0 && l.specs?.[k]).map((l) => l.specs[k])])].slice(0, Math.max(a2cSpecialties(t.skills[k]), (state.specialties[k] ?? []).length))
    update[`system.skills.${k}.value`] = t.skills[k]
    update[`system.skills.${k}.max`] = max
    update[`system.skills.${k}.focuses`] = t.skills[k] > 0 ? specs : []
  }
  for (const k of A2C_DISCS) { update[`system.vampire.disciplines.${k}.value`] = t.disc[k]; update[`system.vampire.disciplines.${k}.visible`] = t.disc[k] > 0 || state.clanDiscs.includes(k) }
  if (f.generation) update['system.vampire.generation.value'] = f.generation
  update['system.vampire.clan.name'] = state.clan
  update['system.vampire.humanity.value'] = state.humanity
  update['system.vampire.nature.value'] = 0
  const wp = state.attrs.composure + state.attrs.resolve
  update['system.willpower.value'] = wp
  update['system.willpower.max'] = wp
  update['system.health.value'] = f.vitae
  update['system.health.max'] = f.vitae
  const hp = state.attrs.stamina + 5
  update['flags.world.a2.health'] = { value: hp, max: hp }
  update['flags.world.a2.creation'] = { v: 1, concept: state.concept, born: state.born || null, embraced: state.embraced || null, apparentAge: state.apparentAge || null, decade: state.decade, sireName: state.sireName, sireType: state.sireType, sireDisc: state.sireDisc, extraDiscs: state.extraDiscs.filter(Boolean), tier: f.key }
  // the sheet's own header fields
  if (a2Int(state.apparentAge) > 0) update['system.age.apparent'] = a2Int(state.apparentAge)
  if (a2Int(state.born) > 0) update['system.age.actual'] = a2Int(state.born)
  update['system.archetype'] = state.concept ?? ''
  if (state.creature !== 'ghoul') {
    update['system.vampire.date.embrace'] = String(state.embraced ?? '')
    update['system.vampire.date.nostalgic'] = state.decade ?? ''
    update['system.vampire.sire.character.name'] = state.sireName ?? ''
  }
  const facts = [(state.sireName || state.sireType) && `<strong>${state.creature === 'ghoul' ? 'Master' : 'Sire'}:</strong> ${a2Esc(state.sireName || 'unnamed')} (${a2Esc(String(state.sireType).toLowerCase())})`, state.creature === 'ghoul' && state.embraced && `<strong>First fed:</strong> ${a2Esc(String(state.embraced))}`].filter(Boolean)
  update.biographyFacts = facts.length ? `<p>${facts.join(' · ')}</p>` : ''
  const items = []
  const take = (map, name) => { const it = map.get(name); if (!it) return; const o = typeof it.toObject === 'function' ? it.toObject() : foundry.utils.deepClone(it); delete o._id; delete o.folder; delete o.ownership; delete o.sort; items.push(o) }
  if (state.clan) take(lib.clan, state.clan)
  for (const l of state.lifepaths) if (l.name) take(lib.lifepath, l.name)
  for (const p of state.powers) take(lib.discipline, p.name)
  for (const n of state.traits) take(lib.clanTrait, n)
  for (const n of state.merits) take(lib.merit, n)
  for (const n of state.flaws) { if (n === state.ownFlaw) items.push({ name: n, type: 'flaw', img: 'icons/svg/downgrade.svg', system: { description: '<p>Flaw dice penalty: −2 on a test this flaw makes harder (PG p.56).</p>' } }); else take(lib.flaw, n) }
  if (state.creature !== 'ghoul') take(lib.nature, 'Humanity')
  const kind = (text) => (/^wealth/i.test(text) ? 'wealth' : /^social/i.test(text) ? 'socialAssets' : 'physicalAssets')
  const clean = (text) => String(text).replace(/^(?:Physical|Social) Asset\s*\(([^]*)\)\s*$/i, '$1').trim()
  for (const l of state.lifepaths) (l.resourceNames ?? []).forEach((r, j) => { if (a2Int(l.resources[j]) > 0) items.push({ name: clean(r), type: 'resource', img: 'icons/svg/coins.svg', system: { description: `<p>From the ${a2Esc(l.name)} lifepath.</p>`, dots: { value: a2Int(l.resources[j]), max: 5 }, resourceType: kind(r) } }) })
  for (const r of state.resourcesExtra) items.push({ name: r.name || 'Resource', type: 'resource', img: 'icons/svg/coins.svg', system: { description: '', dots: { value: r.dots, max: 5 }, resourceType: r.type || 'physicalAssets' } })
  // the same Resource from two sources is one Resource with the dots added (5 at most)
  const seenRes = new Map()
  for (let i = items.length - 1; i >= 0; i--) if (items[i].type === 'resource') seenRes.set(`${items[i].name.toLowerCase()}|${items[i].system.resourceType}`, null)
  const merged = []
  for (const it of items) {
    if (it.type !== 'resource') { merged.push(it); continue }
    const key = `${it.name.toLowerCase()}|${it.system.resourceType}`
    const first = seenRes.get(key)
    if (first) { first.system.dots.value = Math.min(5, first.system.dots.value + it.system.dots.value); if (!/lifepath/.test(it.system.description)) continue; first.system.description += it.system.description } else { seenRes.set(key, it); merged.push(it) }
  }
  items.length = 0
  items.push(...merged)
  return { update, items, removeTypes: ['clan', 'lifepath', 'discipline', 'clanTrait', 'merit', 'flaw', 'resource', 'nature'] }
}

async function a2cApply (actor, state, lib) {
  const plan = a2cBuild(state, lib)
  const facts = plan.update.biographyFacts
  delete plan.update.biographyFacts
  if (facts) {
    const bio = String(actor.system?.core?.biography ?? '').replace(/<p data-a2c="facts">[^]*?<\/p>/, '')
    plan.update['system.core.biography'] = facts.replace('<p>', '<p data-a2c="facts">') + bio
  }
  const old = actor.items.filter((i) => plan.removeTypes.includes(i.type)).map((i) => i.id)
  if (old.length) await actor.deleteEmbeddedDocuments('Item', old)
  await actor.update(plan.update)
  if (plan.items.length) await actor.createEmbeddedDocuments('Item', plan.items)
  if (actor.prototypeToken && plan.update.name) { try { await actor.update({ 'prototypeToken.name': plan.update.name }) } catch (e) { /* not ours to rename */ } }
  ui.notifications.info(`${plan.update.name} is ready: ${plan.items.length} items added.`)
  return plan
}

async function a2cOpen (actorLike = null) {
  if (!a2Enabled()) { ui.notifications.warn('The Alpha 2 rules are off.'); return null }
  let actor = actorLike?.documentName === 'Actor' ? actorLike : (typeof actorLike === 'string' ? (game.actors.get(actorLike) ?? game.actors.getName(actorLike)) : null)
  actor ??= globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character
  if (!actor) {
    if (!game.user.can?.('ACTOR_CREATE')) { ui.notifications.warn('Open your character sheet first, or ask the Storyteller to make you a blank character.'); return null }
    actor = await Actor.create({ name: 'New character', type: 'vampire' })
  }
  if (actor.type !== 'vampire') { ui.notifications.warn('Character creation is for player-type characters.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  const lib = await a2cLibrary()
  if (!lib.clan.size || !lib.lifepath.size) { ui.notifications.error('The V6 library (clans, lifepaths, powers) is not in this world. Import the V6 Rules bundle first.'); return null }
  const ui2 = { step: 1 }
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Character creation: ${actor.name}`, resizable: true },
    position: { width: 940 },
    classes: ['a2c-window'],
    content: a2cContent(actor, lib),
    ok: { icon: 'fa-solid fa-wand-magic-sparkles', label: 'Create', callback: (ev, button) => a2cRead(button.form, lib) },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = dialog?.element
      if (!root) return
      const go = (n) => { ui2.step = a2Clamp(n, 1, 9); a2cUpdate(root, lib, ui2) }
      root.addEventListener('change', () => a2cUpdate(root, lib, ui2))
      root.addEventListener('input', (e) => {
        if (!e.target?.classList?.contains('a2c-filter')) return
        const needle = e.target.value.trim().toLowerCase()
        root.querySelectorAll(`.a2c-list[data-kind="${e.target.dataset.list}"] .a2c-item`).forEach((row) => { row.dataset.hide = needle && !row.dataset.name.includes(needle) ? '1' : '' })
      })
      root.addEventListener('click', (e) => {
        const nav = e.target?.closest?.('.a2c-nav a, .a2c-check')
        if (nav) { e.preventDefault(); go(a2Int(nav.dataset.step ?? nav.dataset.goto)); return }
        const b = e.target?.closest?.('[data-a2c="prev"], [data-a2c="next"]')
        if (b) { e.preventDefault(); go(ui2.step + (b.dataset.a2c === 'next' ? 1 : -1)) }
      })
      root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target?.tagName === 'INPUT') e.preventDefault() })
      a2cUpdate(root, lib, ui2)
    }
  }).catch((e) => { console.error('V6 Automation | character creation', e); return null })
  if (!res) return null
  const open = a2cCheck(res).filter((c) => !c.ok)
  if (open.length) {
    const sure = await foundry.applications.api.DialogV2.confirm({ window: { title: 'Not everything adds up' }, content: `<p>${open.length} ${open.length === 1 ? 'line is' : 'lines are'} not met:</p><ul>${open.slice(0, 12).map((c) => `<li>${a2Esc(c.text)}</li>`).join('')}</ul><p>Create the character anyway?</p>`, rejectClose: false }).catch(() => false)
    if (!sure) return a2cOpen(actor)
  }
  try { await a2cApply(actor, res, lib) } catch (e) { console.error('V6 Automation | character creation', e); ui.notifications.error('Character creation could not write the sheet. See the console (F12).'); return null }
  actor.sheet?.render(true)
  return actor
}

function a2cRenderSheet (app, element) {
  if (!a2Enabled() || a2eGet('creator', true) === false) return
  const actor = app?.actor ?? app?.document
  const root = element instanceof HTMLElement ? element : (element?.[0] ?? app?.element)
  if (!actor || !root || actor.type !== 'vampire' || !actor.isOwner || actor.flags?.world?.a2?.npc) return
  // offered until the character has dots; afterwards only the Storyteller sees it
  const blank = !actor.items.some((i) => i.type === 'lifepath') && Object.values(actor.system?.skills ?? {}).every((s) => a2Int(s?.value) === 0)
  if (!blank && !game.user.isGM) return
  const add = () => {
    const line = root.querySelector('.a2t-sheet-line')
    if (!line || line.querySelector('[data-a2c="open"]')) return Boolean(line)
    const a = document.createElement('a')
    a.dataset.a2c = 'open'
    a.title = 'Character creation, step by step (PG p.22-63)'
    a.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${blank ? 'Create character' : 'Creation'}`
    a.addEventListener('click', (ev) => { ev.preventDefault(); a2cOpen(actor) })
    line.prepend(a)
    return true
  }
  if (!add()) setTimeout(add, 50)
}

function a2cInjectStyles () {
  document.getElementById('v6a-create-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-create-style'
  style.textContent = `
.a2c { display: grid; grid-template-columns: 1fr 250px; grid-template-rows: auto 1fr; gap: 8px 12px; font-size: 13px; min-height: 520px; }
.a2c [hidden] { display: none !important; }
.a2c-nav { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px; }
.a2c-nav a { padding: 3px 8px; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); border-radius: 12px; cursor: pointer; opacity: 0.75; }
.a2c-nav a.on { opacity: 1; background: #7a0000; border-color: #7a0000; color: #fff; }
.a2c-nav a.bad:not(.on) { border-color: #b3261e; }
.a2c-body { max-height: 62vh; overflow-y: auto; padding-right: 6px; }
.a2c-side { border-left: 1px solid color-mix(in srgb, currentColor 20%, transparent); padding-left: 10px; max-height: 62vh; overflow-y: auto; }
.a2c-side h4, .a2c-body h4 { margin: 8px 0 4px; font-weight: 700; }
.a2c-check { padding: 1px 0; cursor: pointer; font-size: 12px; opacity: 0.6; }
.a2c-check.here { opacity: 1; }
.a2c-check.ok i { color: #2e7d32; }
.a2c-check.no i, .a2c-bad { color: #c62828; }
.a2c-steps { display: flex; gap: 6px; margin-top: 10px; }
.a2c-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
.a2c-grid label, .a2c-body > section > label { display: flex; flex-direction: column; gap: 2px; margin: 4px 0; }
.a2c-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
.a2c-row { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin: 2px 0; }
.a2c input.a2c-num { width: 3.6em; flex: 0 0 auto; text-align: center; }
.a2c-lp { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.a2c-table { width: 100%; border-collapse: collapse; }
.a2c-table td, .a2c-table th { padding: 2px 4px; text-align: left; }
.a2c-table .c { text-align: center; }
.a2c-list { max-height: 190px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; border: 1px solid color-mix(in srgb, currentColor 20%, transparent); border-radius: 4px; padding: 4px 6px; }
.a2c-item { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.a2c-item[data-off="1"], .a2c-item[data-hide="1"] { display: none; }
.a2c-item small { opacity: 0.6; }
.a2c-hint, .a2c-info, .a2c-frame { margin: 4px 0; padding: 4px 8px; border-left: 3px solid #7a0000; background: color-mix(in srgb, currentColor 6%, transparent); }
.a2c-inline { font-weight: 400; font-size: 12px; margin-left: 10px; }
.a2c fieldset { margin: 4px 0; }
`
  document.head.appendChild(style)
}

async function a2CreateBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.creator?.booted) return true
  a2eReg('creator', { name: 'Character creation window', hint: 'Blank characters get a "Create character" link on their sheet that walks through the Player Guide\'s steps and counts the dots.', scope: 'world', config: true, type: Boolean, default: true })
  a2cInjectStyles()
  if (!a2cState.hooked) {
    a2cState.hooked = true
    Hooks.on('renderActorSheetV2', (app, el) => { try { a2cRenderSheet(app, el) } catch (e) { console.error('V6 Automation | creation link', e) } })
    Hooks.on('createItem', (i) => { if (!i.parent) a2cState.lib = null })
  }
  api.creator = { booted: true, open: a2cOpen, rules: { frame: a2cFrame, check: a2cCheck, totals: a2cTotals, build: a2cBuild, prereq: a2cPrereq, specialties: a2cSpecialties, budget: A2C_BUDGET } }
  api.create = a2cOpen
  console.log('V6 Automation | character creation loaded')
  return true
}
globalThis.a2CreateBoot ??= a2CreateBoot

// ---- states that work by themselves (PG p.105-120, p.139-147) --------------------------
// The rules name a handful of states. Here each is a token status (token HUD, or the
// States window) that changes rolls without anyone remembering it:
//   surprised        −2 on every test; ends at the start of its turn in the next round
//   on the ground    melee attacks against it +2, ranged attacks −2 (beyond Close)
//   held, tied up    a note on its rolls; the action menu offers Escape
//   staked, torpor   can't act; attackers are told the target can't defend
//   burning (1-4)    baneful damage at the start of its turn, rising every second turn;
//                    a card with Put out (Dexterity + Athletics) and the fear frenzy test
//   in sunlight (1-2) baneful damage at the start of its turn, fear frenzy test
//   awake by day     −2 × generation modifier on every test
//   in cover (1-3)   + dice on Dodge against ranged attacks; partial/superior cover takes
//                    1/2 dice from its own ranged attacks
//   hurt limb (1-3)  − dice on Strength and Dexterity tests (those that use the limb)
//   blissful         −2 on Awareness and Investigation, until End Scene
//   failed Justify   −2 on every test, until New Night
// One-off edges from actions (Distract, Demoralize, Find Flaw, Coordinate, Assist, a
// strong parry, Expose Vulnerability) are kept on the character as "edges": they add or
// take dice on the next roll they fit, show why, and are used up by that roll.
//
// Settings (world): states (on), stateTurns (fire and sunlight tick at turn start, on).
// Data: actor.statuses (v6-…), flags.world.a2.states.<id>.level, flags.world.a2.edges[].

const A2Z_STATES = [
  { id: 'surprised', name: 'Surprised', img: 'icons/svg/daze.svg', page: 'PG p.115' },
  { id: 'prone', name: 'On the ground', img: 'icons/svg/falling.svg', page: 'PG p.109' },
  { id: 'held', name: 'Held (wrestled)', img: 'icons/svg/net.svg', page: 'PG p.118' },
  { id: 'tied', name: 'Tied up', img: 'icons/svg/anchor.svg', page: 'PG p.119' },
  { id: 'staked', name: 'Staked', img: 'icons/svg/paralysis.svg', page: 'PG p.139' },
  { id: 'torpor', name: 'Torpor', img: 'icons/svg/sleep.svg', page: 'PG p.140' },
  { id: 'burning', name: 'Burning', img: 'icons/svg/fire.svg', page: 'PG p.139', levels: [1, 2, 3, 4], levelNames: { 1: 'small flame', 2: 'a third of the body', 3: 'half the body', 4: 'engulfed' }, start: 1 },
  { id: 'sunlight', name: 'In sunlight', img: 'icons/svg/sun.svg', page: 'PG p.139', levels: [1, 2], levelNames: { 1: 'obscured or indirect', 2: 'direct' }, start: 2 },
  { id: 'day', name: 'Awake by day', img: 'icons/svg/eye.svg', page: 'PG p.147' },
  { id: 'cover', name: 'In cover', img: 'icons/svg/shield.svg', page: 'PG p.120', levels: [1, 2, 3], levelNames: { 1: 'light', 2: 'partial', 3: 'superior' }, start: 1 },
  { id: 'limb', name: 'Hurt limb', img: 'icons/svg/bones.svg', page: 'PG p.117', levels: [1, 2, 3], levelNames: { 1: '−1', 2: 'mangled −2', 3: 'mangled −3' }, start: 1 },
  { id: 'blissful', name: 'Blissful (the Kiss)', img: 'icons/svg/heal.svg', page: 'PG p.141' },
  { id: 'justify', name: 'Failed Justify', img: 'icons/svg/downgrade.svg', page: 'PG p.127' }
]
const A2Z_BY_ID = Object.fromEntries(A2Z_STATES.map((s) => [s.id, s]))
const a2zSid = (id) => `v6-${id}`
// Fear frenzy Difficulty for the exposure (PG p.146).
const A2Z_FEAR = { burning: { 1: 2, 2: 2, 3: 3, 4: 4 }, sunlight: { 1: 1, 2: 5 } }

// What the states do to one roll. Pure.
//  self / foe: { states: { id: level|true }, genMod, edges: [{ id, label, dice, when, from }] }
//  roll: { attributes:[keys], skills:[keys], attack: 'melee'|'ranged'|null, defence: bool, vsRanged: bool, contested: bool, selfUuid, foeUuid }
//  → { dice, notes: [text], used: [{ who: 'self'|'foe', id }] }
function a2zCompute ({ self = {}, foe = null, roll = {} } = {}) {
  const out = { dice: 0, notes: [], used: [] }
  const add = (n, text) => { if (n) out.dice += n; out.notes.push(n ? `${text}: ${n > 0 ? '+' : '−'}${Math.abs(n)} ${Math.abs(n) === 1 ? 'die' : 'dice'}.` : `${text}.`) }
  const st = self.states ?? {}
  const has = (arr, k) => (arr ?? []).includes(k)
  if (st.torpor || st.staked) add(0, `${st.staked ? 'Staked' : 'In torpor'}: can't act (PG p.140)`)
  if (st.tied) add(0, 'Tied up: no movement or attacks; break out with Strength + Stamina (PG p.119)')
  if (st.held) add(0, 'Held: unarmed or light weapons only; escape with Strength or Dexterity + Athletics (PG p.118)')
  if (st.surprised) add(-2, 'Surprised (PG p.115)')
  if (st.day) add(-2 * Math.max(1, a2Int(self.genMod, 1)), 'Awake by day (PG p.147)')
  if (st.justify) add(-2, 'Failed Justify, until the next night (PG p.127)')
  if (st.blissful && (has(roll.skills, 'awareness') || has(roll.skills, 'investigation'))) add(-2, 'Blissful from the Kiss (PG p.141)')
  if (st.limb && (has(roll.attributes, 'strength') || has(roll.attributes, 'dexterity'))) add(-a2Clamp(a2Int(st.limb, 1), 1, 3), 'Hurt limb, if this test uses it (PG p.117)')
  if (st.cover) {
    const lvl = a2Clamp(a2Int(st.cover, 1), 1, 3)
    if (roll.defence && roll.vsRanged && has(roll.skills, 'athletics')) add(lvl, `${['Light', 'Partial', 'Superior'][lvl - 1]} cover against a ranged attack (PG p.120)`)
    if (roll.attack === 'ranged' && lvl > 1) add(-(lvl - 1), `Shooting from ${lvl === 2 ? 'partial' : 'superior'} cover (PG p.120)`)
  }
  const fits = (e, side) => {
    if (e.only && e.only !== (side === 'self' ? roll.foeUuid : roll.selfUuid)) return false
    if (side === 'self') return e.when === 'own-test' || (e.when === 'own-contested' && roll.contested) || (e.when === 'own-attack' && roll.attack) || (e.when === 'own-ranged' && roll.attack === 'ranged')
    return (e.when === 'foe-any' && roll.contested) || (e.when === 'foe-attack' && roll.attack) || (e.when === 'foe-defence' && roll.defence)
  }
  for (const e of self.edges ?? []) if (fits(e, 'self')) { add(a2Int(e.dice), e.label); out.used.push({ who: 'self', id: e.id }) }
  if (foe) {
    const fs = foe.states ?? {}
    if (roll.attack) {
      if (fs.prone) add(roll.attack === 'melee' ? 2 : -2, roll.attack === 'melee' ? 'Target on the ground (PG p.109)' : 'Target on the ground, shot from beyond Close (PG p.109)')
      if (fs.torpor || fs.staked || fs.tied) add(0, `Target ${fs.tied ? 'tied up' : fs.staked ? 'staked' : 'in torpor'}: it can't defend; outside a fight it can be staked or beheaded with the right tool (PG p.139)`)
    }
    for (const e of foe.edges ?? []) if (fits(e, 'foe')) { add(a2Int(e.dice), e.label); out.used.push({ who: 'foe', id: e.id }) }
  }
  return out
}
// Fire grows: every second turn +1, up to 4 a turn (PG p.139). Pure. → { damage, next: { level, turns } }
function a2zBurn ({ level = 1, turns = 0 } = {}) {
  const lvl = a2Clamp(a2Int(level, 1), 1, 5)
  const t = a2Int(turns) + 1
  return { damage: lvl, next: { level: t % 2 === 0 ? Math.min(Math.max(lvl, 4), lvl + 1) : lvl, turns: t } }
}

const a2zState = { hooked: false, last: new Map(), seen: new Set() }
function a2zOn () { return a2Enabled() && a2eGet('states', true) !== false }
function a2zHas (actor, id) { return Boolean(actor?.statuses?.has?.(a2zSid(id))) }
function a2zLevel (actor, id) { const d = A2Z_BY_ID[id]; return d?.levels ? a2Clamp(a2Int(actor?.flags?.world?.a2?.states?.[id]?.level, d.start), d.levels[0], d.levels.at(-1)) : true }
function a2zEdges (actor) { const e = actor?.flags?.world?.a2?.edges; return Array.isArray(e) ? e : [] }
function a2zSide (actor) {
  if (!actor) return null
  const states = {}
  for (const s of A2Z_STATES) if (a2zHas(actor, s.id)) states[s.id] = a2zLevel(actor, s.id)
  let genMod = 1
  try { genMod = a2Creature(actor) === 'vampire' ? a2GenModifier(a2Int(actor.system?.vampire?.generation?.value, 13)) : 1 } catch (e) { /* 1 */ }
  return { states, genMod, edges: a2zEdges(actor) }
}
// Called from the roll dialog's pool building (alpha2-core). → { dice, notes } or null
function a2zMods (actor, t) {
  if (!a2zOn() || !actor) return null
  const key = (p) => String(p).split('.').pop()
  const attributes = (t?.attributes ?? []).map(key)
  const skills = (t?.skills ?? []).map(key)
  const ctx = typeof a2uContext === 'function' ? a2uContext(actor) : {}
  const hint = (typeof a2uFresh === 'function' && a2uFresh(actor)) || {}
  const fresh = Boolean(hint.at)
  const defence = Boolean(fresh && hint.defence)
  const foeActor = (fresh && hint.against ? a2FromUuid(hint.against) : null) ?? [...(game.user?.targets ?? [])].map((x) => x.actor).find((a) => a && a.uuid !== actor.uuid) ?? null
  const attack = defence ? null : skills.includes('shooting') ? 'ranged' : skills.includes('fighting') ? 'melee' : null
  const res = a2zCompute({
    self: a2zSide(actor),
    foe: a2zSide(foeActor),
    roll: { attributes, skills, attack, defence, vsRanged: Boolean(fresh && hint.vsRanged), contested: Boolean(foeActor) || Boolean(ctx.target), selfUuid: actor.uuid, foeUuid: foeActor?.uuid ?? null }
  })
  // a Blood Bond between the two (alpha2-story)
  const bond = typeof a2yBondMods === 'function' ? a2yBondMods(actor, foeActor, { attributes, skills, disciplines: (t?.disciplines ?? []).map(key), attack, contested: Boolean(foeActor) }) : null // eslint-disable-line no-undef
  if (bond) { res.dice += bond.dice; res.notes.push(bond.note) }
  const vinc = typeof a2wVinculumMods === 'function' ? a2wVinculumMods(actor, foeActor, { attack, contested: Boolean(foeActor) }) : null // eslint-disable-line no-undef
  if (vinc) { res.dice += vinc.dice; res.notes.push(vinc.note) }
  a2zState.last.set(actor.uuid, { at: Date.now(), used: res.used.map((u) => ({ uuid: u.who === 'self' ? actor.uuid : foeActor?.uuid, id: u.id })).filter((u) => u.uuid) })
  return res.dice || res.notes.length ? res : null
}
// Extra damage waiting on a target (Find Flaw). → riders for the damage window
function a2zDamageRiders () {
  if (!a2zOn()) return []
  const out = []
  for (const t of game.user?.targets ?? []) for (const e of a2zEdges(t.actor)) if (e.when === 'foe-damage') out.push({ label: `${e.label} (${t.actor.name})`, amount: a2Int(e.dice), baneful: false, edge: { uuid: t.actor.uuid, id: e.id } })
  return out
}

// Damage went in: a Find Flaw waiting on the target is used up (PG p.111).
function a2zDamageApplied (actors, o) {
  if (!a2zOn() || /^(?:Fire|Sunlight)$/.test(o?.source ?? '')) return
  for (const a of actors ?? []) {
    const ids = a2zEdges(a).filter((e) => e.when === 'foe-damage').map((e) => e.id)
    if (ids.length && a.isOwner) a2zDropEdges(a, ids).catch(() => {})
  }
}

// ---- setting and clearing ----
async function a2zSet (actorLike, id, on = true, { level = null } = {}) {
  const actor = actorLike?.documentName === 'Actor' ? actorLike : a2FromUuid(actorLike)
  const def = A2Z_BY_ID[id]
  if (!actor || !def) return false
  if (!actor.isOwner) { ui.notifications?.warn(`You can't change ${actor.name}.`); return false }
  if (def.levels && on) await actor.update({ [`flags.world.a2.states.${id}`]: { level: a2Clamp(a2Int(level, def.start), def.levels[0], def.levels.at(-1)), turns: 0, round: game.combat?.round ?? null } })
  else if (id === 'surprised' && on) await actor.update({ 'flags.world.a2.states.surprised': { round: game.combat?.round ?? null } })
  if (a2zHas(actor, id) !== Boolean(on)) await actor.toggleStatusEffect(a2zSid(id), { active: Boolean(on) })
  // a stake means torpor (PG p.139)
  if (id === 'staked' && on && !a2zHas(actor, 'torpor')) await actor.toggleStatusEffect(a2zSid('torpor'), { active: true })
  return true
}
// kind: { label, dice, when, only?, from?, combatantId? }
async function a2zAddEdge (actorLike, edge) {
  const actor = actorLike?.documentName === 'Actor' ? actorLike : a2FromUuid(actorLike)
  if (!actor) return null
  const c = game.combat?.started ? game.combat : null
  const e = { id: foundry.utils.randomID(8), label: String(edge.label ?? 'Edge'), dice: a2Int(edge.dice), when: edge.when ?? 'own-test', only: edge.only ?? null, from: edge.from ?? null, combat: c?.id ?? null, until: edge.combatantId ?? null, round: c?.round ?? null }
  await actor.update({ 'flags.world.a2.edges': [...a2zEdges(actor), e] })
  return e
}
async function a2zDropEdges (actor, ids) {
  const keep = a2zEdges(actor).filter((e) => !ids.includes(e.id))
  if (keep.length !== a2zEdges(actor).length) await actor.update({ 'flags.world.a2.edges': keep })
}

// ---- the turn ----
async function a2zTurnStart (combat) {
  const c = combat?.combatant
  const actor = c?.actor
  if (!actor) return
  // edges given "until your next turn" by this combatant end now
  for (const other of combat.combatants) {
    const a = other.actor
    const gone = a2zEdges(a).filter((e) => e.combat === combat.id && e.until === c.id && e.round !== combat.round).map((e) => e.id)
    if (a && gone.length) await a2zDropEdges(a, gone)
  }
  if (a2zHas(actor, 'surprised')) {
    const r = actor.flags?.world?.a2?.states?.surprised?.round
    // surprised before the fight began: it lasts through this first turn
    if (r === null || r === undefined) await actor.update({ 'flags.world.a2.states.surprised': { round: combat.round } })
    else if (combat.round > r) { await a2zSet(actor, 'surprised', false); await ChatMessage.create({ content: `<p><strong>${a2Esc(c.name)}</strong> is no longer surprised.</p>`, speaker: { alias: `Round ${combat.round}` }, whisper: game.users.filter((u) => u.isGM).map((u) => u.id) }) }
  }
  if (a2eGet('stateTurns', true) === false) return
  for (const id of ['burning', 'sunlight']) {
    if (!a2zHas(actor, id)) continue
    if (id === 'sunlight' && typeof a2rHasPact === 'function' && a2rHasPact(actor)) continue // eslint-disable-line no-undef
    const st = actor.flags?.world?.a2?.states?.[id] ?? {}
    const level = a2zLevel(actor, id)
    const burn = id === 'burning' ? a2zBurn({ level, turns: st.turns }) : { damage: level, next: { level, turns: a2Int(st.turns) + 1 } }
    let line = ''
    try {
      const res = await a2xApplyDamage([actor], { amount: burn.damage, margin: 0, baneful: true, source: id === 'burning' ? 'Fire' : 'Sunlight', chat: false })
      const h = a2ActorHealth(actor)
      line = res?.length ? `: Health ${h.value} of ${h.max}` : ' (not applied: apply it by hand)'
    } catch (e) { console.error('V6 Automation | exposure damage', e); line = ' (not applied: apply it by hand)' }
    await actor.update({ [`flags.world.a2.states.${id}`]: { ...st, ...burn.next } })
    const vamp = a2Creature(actor) === 'vampire'
    const fear = A2Z_FEAR[id][Math.min(level, id === 'burning' ? 4 : 2)]
    await ChatMessage.create({
      content: `<div class="a2z-card"><h4>${a2Esc(c.name)}: ${id === 'burning' ? 'burning' : 'in sunlight'}</h4><p>${burn.damage} ${vamp ? 'baneful ' : ''}damage at the start of the turn${line} (PG p.139).${id === 'burning' && burn.next.level > level ? ` The fire grows to ${burn.next.level} a turn.` : ''}</p></div>`,
      speaker: { alias: `Round ${combat.round}` },
      flags: { world: { a2zcard: { v: 1, actor: actor.uuid, id, level, fear: vamp ? fear : 0 } } }
    })
  }
}
function a2zRenderChat (message, html) {
  const d = message.flags?.world?.a2zcard
  if (!d) return
  const root = html instanceof HTMLElement ? html : html?.[0]
  const box = root?.querySelector('.a2z-card')
  const actor = a2FromUuid(d.actor)
  if (!box || box.querySelector('.a2z-row') || !actor?.isOwner) return
  const row = document.createElement('div')
  row.className = 'a2z-row'
  const btn = (label, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = label; b.title = title; b.addEventListener('click', (ev) => { ev.preventDefault(); fn() }); row.append(b) }
  if (d.id === 'burning' && a2zHas(actor, 'burning')) {
    btn('<i class="fa-solid fa-fire-extinguisher"></i> Put out', `Roll on the ground: Dexterity + Athletics, Difficulty ${a2zLevel(actor, 'burning')} (PG p.139)`, async () => {
      const roll = await a2eOpenRoll(actor, { attributes: ['dexterity'], skills: ['athletics'], disciplines: [], difficulty: a2zLevel(actor, 'burning') })
      const v = roll?.a2Verdict ?? (roll ? a2RollVerdict(roll) : null)
      if (v?.win) { await a2zSet(actor, 'burning', false); await a2zSet(actor, 'prone', true); ui.notifications.info(`${actor.name} is out, and on the ground.`) }
    })
  }
  if (d.fear > 0 && typeof a2xFrenzyTest === 'function') btn('<i class="fa-solid fa-ghost"></i> Fear frenzy', `Fear frenzy test, Difficulty ${d.fear} (PG p.146)`, () => a2xFrenzyTest(actor, { type: 'fear', difficulty: d.fear }))
  if (a2zHas(actor, d.id)) btn('Out of it', `${actor.name} is no longer ${d.id === 'burning' ? 'burning' : 'in sunlight'}`, async () => { await a2zSet(actor, d.id, false); ui.chat?.updateMessage?.(message) })
  if (row.children.length) box.append(row)
}

// ---- the States window ----
async function a2zOpen (actorLike = null) {
  const actor = actorLike?.documentName === 'Actor' ? actorLike : (globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character)
  if (!actor) { ui.notifications.warn('Select a token first.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You can't change ${actor.name}.`); return null }
  const rows = A2Z_STATES.map((s) => {
    const on = a2zHas(actor, s.id)
    const lvl = s.levels ? `<select name="lvl.${s.id}">${s.levels.map((l) => `<option value="${l}" ${a2zLevel(actor, s.id) === l ? 'selected' : ''}>${l}: ${a2Esc(s.levelNames[l])}</option>`).join('')}</select>` : ''
    return `<label class="a2z-state"><input type="checkbox" name="st.${s.id}" ${on ? 'checked' : ''}> <img src="${s.img}" width="18" height="18" alt=""> <span>${a2Esc(s.name)} <small>${s.page}</small></span> ${lvl}</label>`
  }).join('')
  const edges = a2zEdges(actor)
  const edgeRows = edges.length ? `<fieldset><legend>Edges waiting for a roll</legend>${edges.map((e) => `<label class="a2z-state"><input type="checkbox" name="edge.${e.id}" checked> <span>${a2Esc(e.label)} (${e.dice > 0 ? '+' : ''}${e.dice})</span></label>`).join('')}</fieldset>` : ''
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: `States: ${actor.name}` },
    position: { width: 600 },
    content: `<div class="a2z-window">${rows}${edgeRows}</div>`,
    ok: { label: 'Apply', callback: (ev, button) => {
      const f = button.form
      return { states: Object.fromEntries(A2Z_STATES.map((s) => [s.id, { on: f.elements[`st.${s.id}`].checked, level: s.levels ? a2Int(f.elements[`lvl.${s.id}`].value) : null }])), drop: edges.filter((e) => !f.elements[`edge.${e.id}`]?.checked).map((e) => e.id) }
    } },
    rejectClose: false
  }).catch(() => null)
  if (!res) return null
  for (const [id, v] of Object.entries(res.states)) {
    const d = A2Z_BY_ID[id]
    if (v.on !== a2zHas(actor, id) || (v.on && d.levels && v.level !== a2zLevel(actor, id))) await a2zSet(actor, id, v.on, { level: v.level })
  }
  if (res.drop.length) await a2zDropEdges(actor, res.drop)
  return res
}

// Called by End Scene and New Night (alpha2-tools).
async function a2zSceneEnd (actors) {
  for (const a of actors ?? []) {
    try {
      for (const id of ['blissful', 'surprised', 'cover', 'prone']) if (a2zHas(a, id)) await a2zSet(a, id, false)
      if (a2zEdges(a).length) await a.update({ 'flags.world.a2.edges': [] })
    } catch (e) { console.error('V6 Automation | states at End Scene', e) }
  }
}
async function a2zNightEnd (actors) {
  for (const a of actors ?? []) { try { for (const id of ['justify', 'day', 'sunlight']) if (a2zHas(a, id)) await a2zSet(a, id, false) } catch (e) { console.error('V6 Automation | states at New Night', e) } }
}

function a2zHooks () {
  if (a2zState.hooked) return
  a2zState.hooked = true
  // a level state switched on from the token HUD gets its starting level
  Hooks.on('createActiveEffect', (effect, options, userId) => {
    try {
      if (userId !== game.user.id) return
      const actor = effect.parent
      for (const s of effect.statuses ?? []) {
        const id = String(s).replace(/^v6-/, '')
        const d = A2Z_BY_ID[id]
        if (!String(s).startsWith('v6-') || !d || actor?.documentName !== 'Actor') continue
        if (d.levels && !actor.flags?.world?.a2?.states?.[id]?.level) actor.update({ [`flags.world.a2.states.${id}`]: { level: d.start, turns: 0, round: game.combat?.round ?? null } })
        if (id === 'surprised' && !actor.flags?.world?.a2?.states?.surprised) actor.update({ 'flags.world.a2.states.surprised': { round: game.combat?.round ?? null } })
        if (id === 'staked' && !a2zHas(actor, 'torpor')) actor.toggleStatusEffect(a2zSid('torpor'), { active: true })
      }
    } catch (e) { console.error('V6 Automation | state', e) }
  })
  Hooks.on('deleteActiveEffect', (effect, options, userId) => {
    try {
      if (userId !== game.user.id) return
      const actor = effect.parent
      for (const s of effect.statuses ?? []) {
        const id = String(s).replace(/^v6-/, '')
        if (String(s).startsWith('v6-') && A2Z_BY_ID[id] && actor?.documentName === 'Actor' && actor.flags?.world?.a2?.states?.[id]) actor.update({ [`flags.world.a2.states.${id}`]: null })
      }
    } catch (e) { /* nothing to clear */ }
  })
  Hooks.on('updateCombat', (combat, changes) => {
    if (!a2zOn() || !a2xIsGM() || !combat?.started) return
    if (!('turn' in (changes ?? {})) && !('round' in (changes ?? {}))) return
    a2zTurnStart(combat).catch((e) => console.error('V6 Automation | states at turn start', e))
  })
  // the roller's client names the edges its roll used; the Storyteller's client spends them
  Hooks.on('createChatMessage', (message, options, userId) => {
    try {
      if (userId !== game.user.id || !message.rolls?.some((r) => r?.options?.a2?.built)) return
      const actor = a2xSpeaker(message)
      const last = actor ? a2zState.last.get(actor.uuid) : null
      if (!last?.used?.length || Date.now() - last.at > 120000) return
      a2zState.last.delete(actor.uuid)
      message.update({ 'flags.world.a2used': last.used })
    } catch (e) { console.error('V6 Automation | edges', e) }
  })
  Hooks.on('updateChatMessage', (message, change) => {
    try {
      const used = change?.flags?.world?.a2used
      if (!Array.isArray(used) || !a2xIsGM() || a2zState.seen.has(message.id)) return
      a2zState.seen.add(message.id)
      const by = new Map()
      for (const u of used) by.set(u.uuid, [...(by.get(u.uuid) ?? []), u.id])
      for (const [uuid, ids] of by) { const a = a2FromUuid(uuid); if (a) a2zDropEdges(a, ids) }
    } catch (e) { console.error('V6 Automation | edges', e) }
  })
  Hooks.on('renderChatMessageHTML', (message, html) => { try { a2zRenderChat(message, html) } catch (e) { console.error('V6 Automation | state card', e) } })
}

function a2zInjectStyles () {
  document.getElementById('v6a-states-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-states-style'
  style.textContent = `
.a2z-card h4 { margin: 0 0 2px; font-weight: 700; }
.a2z-card p { margin: 0 0 6px; }
.a2z-row { display: flex; gap: 6px; flex-wrap: wrap; }
.a2z-row button { flex: 1 1 0; line-height: 1.6; min-width: 7em; }
.a2z-window { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
.a2z-window fieldset { grid-column: 1 / -1; }
.a2z-state { display: flex; align-items: center; gap: 6px; min-height: 28px; }
.a2z-state span { flex: 1; }
.a2z-state small { opacity: 0.6; }
.a2z-state select { flex: 0 0 9.5em; }
.a2z-state img { border: 0; filter: drop-shadow(0 0 1px #000); }
`
  document.head.appendChild(style)
}

async function a2StatesBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.states?.booted) return true
  a2eReg('states', { name: 'States change rolls', hint: 'Token states from the rules (surprised, on the ground, cover, awake by day, a hurt limb and so on) add or take dice by themselves, and one-off edges from actions are used up by the roll they fit.', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('stateTurns', { name: 'Fire and sunlight tick each turn', hint: 'A burning or sunlit combatant takes its damage at the start of its turn and gets a card with Put out and the fear frenzy test.', scope: 'world', config: true, type: Boolean, default: true })
  if (Array.isArray(CONFIG?.statusEffects)) for (const s of A2Z_STATES) if (!CONFIG.statusEffects.some((x) => x.id === a2zSid(s.id))) CONFIG.statusEffects.push({ id: a2zSid(s.id), name: `V6: ${s.name}`, img: s.img })
  a2zInjectStyles()
  a2zHooks()
  api.states = { booted: true, open: a2zOpen, set: a2zSet, has: a2zHas, level: a2zLevel, addEdge: a2zAddEdge, edges: a2zEdges, list: A2Z_STATES, rules: { compute: a2zCompute, burn: a2zBurn } }
  console.log('V6 Automation | states loaded')
  return true
}
globalThis.a2StatesBoot ??= a2StatesBoot

// ---- the action menu and chat commands (PG p.110-120) ----------------------------------
// One window with everything a character can do in a fight. Pick an action; it rolls the
// right pool, asks the target for the right resistance (the Storyteller's characters
// answer by themselves), and applies what the rules say on a win:
//   attacks        unarmed, melee, shoot, throw, called shot (−2)
//   stake (−2)     margin 3+: staked and in torpor.  behead (−2): margin 4+
//   wrestle        grab → held; crush → ½ Strength + margin; tie up → tied; escape
//   feed attack    +2 dice vs Strength + Stamina; gentle or tear; Vitae to the attacker
//   coordinate     margin + 1 dice shared among allies' next actions
//   demoralize     the defender of the target's next attack gets margin + 1
//   distract       the target's next contested test takes −(margin + 1)
//   find flaw      the next damage to the target gets +(margin + 1)
//   assist, steady aim, drop/stand, take cover, put out a fire
// Open it: the fist tool in the token controls, the Actions button on a turn card, or
// /act in chat. Chat commands: /v6 help lists them.
//
// Setting (world): moves (on).

const A2V_ATT = { key: 'strength+fighting', test: { attributes: ['strength'], skills: ['fighting'] } }
const A2V_GRAB_DEF = [
  { key: 'str', label: 'Strength', text: 'Strength + Athletics', attributes: ['strength'], skills: ['athletics'] },
  { key: 'dex', label: 'Dexterity', text: 'Dexterity + Athletics', attributes: ['dexterity'], skills: ['athletics'] }
]
const A2V_MOVES = [
  { id: 'unarmed', group: 'Attack', label: 'Unarmed attack', icon: 'fa-hand-fist', pool: 'Strength + Fighting', test: A2V_ATT.test, target: true, hint: 'Damage ½ Strength + margin.' },
  { id: 'melee', group: 'Attack', label: 'Melee weapon', icon: 'fa-gavel', pool: 'Strength + Fighting', test: A2V_ATT.test, target: true, hint: 'Pick the weapon when you apply damage.' },
  { id: 'shoot', group: 'Attack', label: 'Shoot', icon: 'fa-gun', pool: 'Dexterity + Shooting', test: { attributes: ['dexterity'], skills: ['shooting'] }, target: true, hint: 'Point-blank −1, one band beyond range −2: use the modifier field.' },
  { id: 'throw', group: 'Attack', label: 'Throw', icon: 'fa-baseball', pool: 'Strength + Shooting', test: { attributes: ['strength'], skills: ['shooting'] }, target: true, hint: 'Short range.' },
  { id: 'called', group: 'Attack', label: 'Called shot', icon: 'fa-crosshairs', pool: 'Strength + Fighting −2', test: A2V_ATT.test, modifier: -2, target: true, hint: 'No margin on the damage; the margin sets the injury. Tick "Called shot" when you apply damage.' },
  { id: 'calledR', group: 'Attack', label: 'Called shot (ranged)', icon: 'fa-crosshairs', pool: 'Dexterity + Shooting −2', test: { attributes: ['dexterity'], skills: ['shooting'] }, modifier: -2, target: true, hint: 'No margin on the damage; the margin sets the injury.' },
  { id: 'stake', group: 'Attack', label: 'Stake', icon: 'fa-location-pin', pool: 'Strength + Fighting −2', test: A2V_ATT.test, modifier: -2, target: true, melee: true, effect: { kind: 'stake' }, hint: 'Sharpened wood. Margin 3+: paralysed, in torpor.' },
  { id: 'behead', group: 'Attack', label: 'Decapitate', icon: 'fa-skull', pool: 'Strength + Fighting −2', test: A2V_ATT.test, modifier: -2, target: true, melee: true, effect: { kind: 'behead' }, hint: 'Medium or heavy edged weapon. Margin 4+.' },
  { id: 'grab', group: 'Wrestle', label: 'Grab', icon: 'fa-hands-holding', pool: 'Strength + Fighting', test: A2V_ATT.test, target: true, melee: true, defences: A2V_GRAB_DEF, effect: { kind: 'state', state: 'held' }, hint: 'Within Close. On a win you hold the target; keeping hold is a minor action each turn.' },
  { id: 'crush', group: 'Wrestle', label: 'Crush', icon: 'fa-compress', pool: 'Strength + Fighting', test: A2V_ATT.test, target: true, melee: true, needs: 'held', defences: [{ key: 'sta', label: 'Resist', text: 'Strength + Stamina', attributes: ['strength', 'stamina'], skills: [] }], effect: { kind: 'crush' }, hint: 'Against someone you hold: ½ Strength + margin. A miss doesn\'t end the hold.' },
  { id: 'tie', group: 'Wrestle', label: 'Tie up', icon: 'fa-link', pool: 'Strength + Fighting', test: A2V_ATT.test, target: true, melee: true, needs: 'held', defences: A2V_GRAB_DEF, effect: { kind: 'tie' }, hint: 'Rope or cuffs needed. On a win the target is bound and the wrestle ends.' },
  { id: 'escapeS', group: 'Wrestle', label: 'Escape (Strength)', icon: 'fa-person-running', pool: 'Strength + Athletics', test: { attributes: ['strength'], skills: ['athletics'] }, target: true, self: 'held', defences: [{ key: 'hold', label: 'Keep hold', text: 'Strength + Fighting', attributes: ['strength'], skills: ['fighting'] }], effect: { kind: 'escape' }, hint: 'Target whoever holds you.' },
  { id: 'escapeD', group: 'Wrestle', label: 'Escape (Dexterity)', icon: 'fa-person-running', pool: 'Dexterity + Athletics', test: { attributes: ['dexterity'], skills: ['athletics'] }, target: true, self: 'held', defences: [{ key: 'hold', label: 'Keep hold', text: 'Strength + Fighting', attributes: ['strength'], skills: ['fighting'] }], effect: { kind: 'escape' }, hint: 'Target whoever holds you.' },
  { id: 'feedG', group: 'Wrestle', label: 'Feed: gentle', icon: 'fa-droplet', pool: 'Strength + Fighting +2', test: A2V_ATT.test, modifier: 2, target: true, melee: true, vampire: true, defences: [{ key: 'sta', label: 'Resist', text: 'Strength + Stamina', attributes: ['strength', 'stamina'], skills: [] }], effect: { kind: 'feed', mode: 'gentle' }, hint: 'Target held, tied or helpless. Damage ½ Strength less your margin (at least 1); you drink.' },
  { id: 'feedT', group: 'Wrestle', label: 'Feed: tear throat', icon: 'fa-droplet', pool: 'Strength + Fighting +2', test: A2V_ATT.test, modifier: 2, target: true, melee: true, vampire: true, defences: [{ key: 'sta', label: 'Resist', text: 'Strength + Stamina', attributes: ['strength', 'stamina'], skills: [] }], effect: { kind: 'feed', mode: 'tear' }, hint: 'Target held, tied or helpless. Damage ½ Strength + margin; you drink.' },
  { id: 'coordinate', group: 'Team and tricks', label: 'Coordinate', icon: 'fa-people-group', pool: 'Intelligence + Awareness', test: { attributes: ['intelligence'], skills: ['awareness'] }, target: true, defences: [{ key: 'wits', label: 'Outthink', text: 'Intelligence + Wits', attributes: ['intelligence', 'wits'], skills: [] }], effect: { kind: 'coordinate' }, hint: 'Target the most cunning foe within Short. Margin + 1 dice shared among your allies\' next actions.' },
  { id: 'demoralize', group: 'Team and tricks', label: 'Demoralize', icon: 'fa-face-frown', pool: 'Charisma + Persuasion', test: { attributes: ['charisma'], skills: ['persuasion'] }, target: true, defences: [{ key: 'nerve', label: 'Hold your nerve', text: 'Composure + Resolve', attributes: ['composure', 'resolve'], skills: [] }], effect: { kind: 'edge', when: 'foe-defence', sign: 1, label: 'Demoralized attacker' }, hint: 'When the target next attacks, its defender gets margin + 1 dice.' },
  { id: 'distract', group: 'Team and tricks', label: 'Distract', icon: 'fa-wand-sparkles', pool: 'Manipulation + Subterfuge', test: { attributes: ['manipulation'], skills: ['subterfuge'] }, target: true, defences: [{ key: 'focus', label: 'Stay focused', text: 'Composure + Wits', attributes: ['composure', 'wits'], skills: [] }], effect: { kind: 'edge', when: 'own-contested', sign: -1, label: 'Distracted' }, hint: 'The target\'s next contested test takes −(margin + 1).' },
  { id: 'findflaw', group: 'Team and tricks', label: 'Find flaw', icon: 'fa-magnifying-glass', pool: 'Wits + Awareness', test: { attributes: ['wits'], skills: ['awareness'] }, target: true, defences: [{ key: 'guard', label: 'Guard', text: 'Dexterity + Wits', attributes: ['dexterity', 'wits'], skills: [] }], effect: { kind: 'edge', when: 'foe-damage', sign: 1, label: 'Flaw found' }, hint: 'Within Medium, in sight. The next damage to the target gets +(margin + 1).' },
  { id: 'assist', group: 'Team and tricks', label: 'Assist', icon: 'fa-handshake-angle', pool: 'no roll', target: true, instant: 'assist', hint: 'The targeted ally gets +1 die on its next test (at most 3 helpers).' },
  { id: 'aim', group: 'Yourself', label: 'Steady aim', icon: 'fa-bullseye', pool: 'your movement', instant: 'aim', hint: '+1 die on your next ranged attack.' },
  { id: 'prone', group: 'Yourself', label: 'Drop or stand up', icon: 'fa-person-falling', pool: 'your movement', instant: 'prone', hint: 'On the ground: melee attacks against you +2, ranged −2.' },
  { id: 'cover', group: 'Yourself', label: 'Take cover', icon: 'fa-shield-halved', pool: 'movement', instant: 'cover', hint: 'Light +1, partial +2, superior +3 on Dodge against ranged attacks.' },
  { id: 'putout', group: 'Yourself', label: 'Put out the fire', icon: 'fa-fire-extinguisher', pool: 'Dexterity + Athletics', self: 'burning', instant: 'putout', hint: 'Difficulty = the fire\'s damage per turn.' },
  { id: 'states', group: 'Yourself', label: 'States…', icon: 'fa-list-check', pool: '', instant: 'states', hint: 'Set or clear this character\'s states.' }
]
const A2V_BY_ID = Object.fromEntries(A2V_MOVES.map((m) => [m.id, m]))

// ---- pure rules ----
// What a won or lost move does. Pure. → { text, set: [{ who: 'target'|'self', state, on }], edge: {...}|null, damage: n|null, vitae: n }
function a2vOutcome (effect, { win = false, margin = 0, attacker = {}, target = {} } = {}) {
  const m = Math.max(0, a2Int(margin))
  const out = { text: '', set: [], edge: null, damage: null, vitae: 0, button: false }
  const A = attacker.name ?? 'The attacker'
  const T = target.name ?? 'the target'
  const half = Math.max(0, Math.ceil(a2Int(attacker.strength) / 2))
  switch (effect?.kind) {
    case 'state':
      if (win) { out.set.push({ who: 'target', state: effect.state, on: true }); out.text = `${A} holds ${T}. Keeping hold costs a minor action each turn (PG p.118).` } else out.text = `${T} slips the grab.`
      break
    case 'tie':
      if (win) { out.set.push({ who: 'target', state: 'tied', on: true }, { who: 'target', state: 'held', on: false }); out.text = `${T} is tied up; the wrestle ends (PG p.119).` } else out.text = `${T} isn't bound. The hold stays.`
      break
    case 'escape':
      if (win) { out.set.push({ who: 'self', state: 'held', on: false }); out.text = `${A} breaks free of ${T}.` } else out.text = `${A} stays held.`
      break
    case 'crush':
      if (win) { out.damage = half + m; out.text = `${A} crushes ${T}: ½ Strength (${half}) + margin ${m} = ${out.damage} damage (PG p.119).` } else out.text = `${T} resists the crush. The hold stays.`
      break
    case 'stake':
      if (win && m >= 3) { out.set.push({ who: 'target', state: 'staked', on: true }); out.text = `Margin ${m}: the stake finds the heart. ${T} is paralysed, in torpor until it is removed (PG p.117).` } else if (win) { out.button = true; out.text = `Margin ${m}: a hit, but not the heart (it needs 3). Apply the weapon's damage.` } else out.text = `${A} misses with the stake.`
      break
    case 'behead':
      if (win && m >= 4) out.text = `Margin ${m}: ${T} is decapitated (PG p.117). A vampire is destroyed.`
      else if (win) { out.button = true; out.text = `Margin ${m}: a hit, but the head stays on (it needs 4). Apply the weapon's damage.` } else out.text = `${A} misses.`
      break
    case 'feed':
      if (win) {
        out.damage = effect.mode === 'gentle' ? Math.max(1, half - m) : half + m
        const want = Math.max(a2Int(attacker.strength), a2Int(attacker.stamina))
        out.vitae = Math.max(0, Math.min(want, a2Int(attacker.missing, want), target.blood === null || target.blood === undefined ? want : a2Int(target.blood)))
        out.text = `${A} feeds on ${T}: ${out.damage} damage (${effect.mode === 'gentle' ? `gentle, ½ Strength ${half} − margin ${m}, at least 1` : `tear throat, ½ Strength ${half} + margin ${m}`}), ${out.vitae} Vitae taken (PG p.118).${target.vampire ? ' Vampire blood: this counts toward a Blood Bond.' : ''}`
      } else out.text = `${T} keeps ${A}'s fangs off.`
      break
    case 'edge':
      if (win) { out.edge = { when: effect.when, dice: effect.sign * (m + 1), label: effect.label }; out.text = effect.when === 'foe-defence' ? `${T} is demoralized: whoever defends against its next attack gets +${m + 1} (PG p.111).` : effect.when === 'own-contested' ? `${T} is distracted: −${m + 1} on its next contested test (PG p.111).` : `${A} finds a flaw: the next damage to ${T} gets +${m + 1} (PG p.111).` } else out.text = `${T} isn't fooled.`
      break
    case 'coordinate':
      if (win) out.text = `${A} coordinates: ${m + 1} ${m + 1 === 1 ? 'die' : 'dice'} for the allies' next actions (PG p.110).`
      else out.text = `${A}'s plan is read.`
      break
    default: out.text = ''
  }
  return out
}
// Share n dice among allies: nobody gets a second die before everyone has one. Pure. → [count per ally]
function a2vShare (n, allies) {
  const out = new Array(Math.max(0, allies)).fill(0)
  for (let i = 0; i < Math.max(0, a2Int(n)) && allies > 0; i++) out[i % allies]++
  return out
}
// "/test wits+awareness 3" → { attributes, skills, disciplines, difficulty }. Pure.
function a2vParsePool (text) {
  const m = String(text ?? '').trim().match(/^([a-z ]+?)(?:\s*\+\s*([a-z ]+?))?(?:\s+(?:vs\.?\s*|diff(?:iculty)?\s*)?(\d{1,2}))?$/i)
  if (!m) return null
  const attrs = ['strength', 'dexterity', 'stamina', 'charisma', 'manipulation', 'composure', 'intelligence', 'wits', 'resolve']
  const skills = ['athletics', 'awareness', 'craft', 'expression', 'fighting', 'investigation', 'knowledge', 'medicine', 'persuasion', 'sabotage', 'shooting', 'subterfuge', 'survival']
  const discs = { animalism: 'animalism', auspex: 'auspex', 'blood sorcery': 'bloodSorcery', celerity: 'celerity', corruption: 'corruption', dominate: 'dominate', fortitude: 'fortitude', necromancy: 'necromancy', obfuscate: 'obfuscate', oblivion: 'oblivion', potence: 'potence', presence: 'presence', tellurgy: 'tellurgy', vicissitude: 'vicissitude' }
  const find = (w) => { const k = String(w ?? '').trim().toLowerCase(); if (!k) return null; const hit = (list) => list.find((x) => x === k) ?? (k.length >= 3 ? list.find((x) => x.startsWith(k)) : null); const a = hit(attrs); if (a) return ['attributes', a]; const s = hit(skills); if (s) return ['skills', s]; const d = hit(Object.keys(discs)); return d ? ['disciplines', discs[d]] : null }
  const test = { attributes: [], skills: [], disciplines: [] }
  const a = find(m[1])
  const b = m[2] ? find(m[2]) : null
  if (!a || (m[2] && !b)) return null
  test[a[0]].push(a[1])
  if (b) test[b[0]].push(b[1])
  if (m[3] !== undefined) test.difficulty = a2Int(m[3])
  return test
}

const a2vState = { hooked: false }
function a2vOn () { return a2Enabled() && a2eGet('moves', true) !== false }
function a2vTarget (actor) { return [...(game.user?.targets ?? [])].map((t) => t.actor).find((a) => a && a.uuid !== actor?.uuid) ?? null }
function a2vEff (actor, key) { const a = actor?.system?.attributes?.[key]; return a2Int(a?.effective ?? a?.value) }
function a2vCombatantId (actor) { const c = game.combat?.started ? game.combat.combatants.find((x) => x.actor?.uuid === actor?.uuid) : null; return c?.id ?? null }
async function a2vSay (html, actor = null) { return ChatMessage.create({ content: `<div class="a2v-result">${html}</div>`, speaker: actor ? ChatMessage.getSpeaker({ actor }) : { alias: 'Storyteller' } }) }

async function a2vRun (actor, id) {
  const move = A2V_BY_ID[id]
  if (!move || !actor) return null
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  const target = a2vTarget(actor)
  if (move.target && !target) { ui.notifications.warn(`${move.label}: target a token first (T).`); return null }
  if (move.needs && target && !a2zHas(target, move.needs)) ui.notifications.info(`${move.label} is for a target you hold. Rolling anyway.`)
  if (move.instant) return a2vInstant(actor, move, target)
  const before = new Set(foundry.applications.instances.keys())
  const token = move.effect || move.defences ? a2oSetMove(actor, { id: move.id, label: move.label, melee: Boolean(move.melee), defences: move.defences ?? null, effect: move.effect ?? null }) : null
  if (token) a2oMoveGuard(actor, token, before).catch(() => {})
  else a2oState.moves.delete(actor.uuid)
  const test = { attributes: [...move.test.attributes], skills: [...move.test.skills], disciplines: [] }
  if (move.modifier) test.modifier = { valueSource: 'flat', value: Math.abs(move.modifier), mode: move.modifier < 0 ? 'subtract' : 'add' }
  if (typeof a2uHint === 'function' && target) a2uHint(actor, { against: target.uuid })
  const res = a2eOpenRoll(actor, test)
  // closed without a roll: the move is off at once
  if (token) Promise.resolve(res).then((r) => { if (!r && a2oState.moves.get(actor.uuid)?.token === token) a2oState.moves.delete(actor.uuid) }).catch(() => {})
  return res
}
async function a2vInstant (actor, move, target) {
  switch (move.instant) {
    case 'assist': {
      const helpers = a2zEdges(target).filter((e) => e.label.startsWith('Assisted'))
      if (helpers.length >= 3) { ui.notifications.warn(`${target.name} already has 3 helpers (PG p.110).`); return null }
      if (!target.isOwner && !a2xIsGM()) { await a2vSay(`<p><strong>${a2Esc(actor.name)}</strong> assists <strong>${a2Esc(target.name)}</strong>: +1 die on its next test (PG p.110). <em>Storyteller: add the edge in States.</em></p>`, actor); return null }
      await a2zAddEdge(target, { label: `Assisted by ${actor.name}`, dice: 1, when: 'own-test', from: actor.uuid, combatantId: a2vCombatantId(actor) })
      return a2vSay(`<p><strong>${a2Esc(actor.name)}</strong> assists <strong>${a2Esc(target.name)}</strong>: +1 die on its next test (PG p.110).</p>`, actor)
    }
    case 'aim':
      await a2zAddEdge(actor, { label: 'Steady aim', dice: 1, when: 'own-ranged', from: actor.uuid, combatantId: null })
      return a2vSay(`<p><strong>${a2Esc(actor.name)}</strong> steadies the aim: +1 die on the next ranged attack, for the movement (PG p.109).</p>`, actor)
    case 'prone': {
      const on = !a2zHas(actor, 'prone')
      await a2zSet(actor, 'prone', on)
      return a2vSay(`<p><strong>${a2Esc(actor.name)}</strong> ${on ? 'drops to the ground' : 'stands up'} (the movement, PG p.109).</p>`, actor)
    }
    case 'cover': {
      const lvl = await foundry.applications.api.DialogV2.wait({ window: { title: 'Take cover' }, content: '<p>How good is the cover? (PG p.120)</p>', buttons: [{ action: '1', label: 'Light +1' }, { action: '2', label: 'Partial +2' }, { action: '3', label: 'Superior +3' }, { action: '0', label: 'Leave cover' }], rejectClose: false }).catch(() => null)
      if (lvl === null || lvl === undefined) return null
      await a2zSet(actor, 'cover', a2Int(lvl) > 0, { level: a2Int(lvl) })
      return null
    }
    case 'putout': {
      if (!a2zHas(actor, 'burning')) { ui.notifications.info(`${actor.name} isn't burning.`); return null }
      const roll = await a2eOpenRoll(actor, { attributes: ['dexterity'], skills: ['athletics'], disciplines: [], difficulty: a2zLevel(actor, 'burning') })
      const v = roll?.a2Verdict ?? (roll ? a2RollVerdict(roll) : null)
      if (v?.win) { await a2zSet(actor, 'burning', false); await a2zSet(actor, 'prone', true) }
      return roll
    }
    case 'states': return a2zOpen(actor)
  }
  return null
}

// The Storyteller's client settles a move once the resistance is in (or the target can't resist).
async function a2vResolve (attack, defender) {
  const def = attack?.flags?.world?.a2def
  const effect = def?.move?.effect
  const r = a2oRoll(attack)
  if (!effect || !r || !defender || def.resolved) return null
  const attacker = a2FromUuid(def.attackerUuid)
  const helpless = (def.targets ?? []).find((t) => t.uuid === defender.uuid)?.helpless
  let win, margin
  if (helpless) { win = a2Int(r.roll.total) > 0 || effect.kind === 'feed'; margin = a2Int(r.roll.total) } else {
    const { v } = a2xVerdict(attack, r.roll)
    win = v.win === true
    margin = Math.max(0, a2Int(v.margin))
  }
  const vit = attacker?.system?.health
  const out = a2vOutcome(effect, { win, margin, attacker: { name: attacker?.name, strength: a2vEff(attacker, 'strength'), stamina: a2vEff(attacker, 'stamina'), missing: vit ? a2Int(vit.max) - a2Int(vit.value) : 0 }, target: { name: defender.name, vampire: a2Creature(defender) === 'vampire', blood: a2Creature(defender) === 'vampire' ? a2Int(defender.system?.health?.value) : null } })
  await attack.update({ 'flags.world.a2def.resolved': true })
  try {
    for (const s of out.set) await a2zSet(s.who === 'self' ? attacker : defender, s.state, s.on)
    if (out.edge) await a2zAddEdge(defender, { ...out.edge, from: attacker?.uuid ?? null, combatantId: a2vCombatantId(attacker) })
    if (out.damage) {
      // a flaw found on the target adds to this damage too (PG p.111)
      const flaw = a2zEdges(defender).filter((e) => e.when === 'foe-damage').reduce((t, e) => t + a2Int(e.dice), 0)
      if (flaw) { out.damage += flaw; out.text += ` Flaw found: +${flaw}.` }
    }
    if (out.damage) await a2xApplyDamage([defender], { amount: out.damage, margin: 0, source: def.move.label, attackerUuid: attacker?.uuid ?? null, bodyAttack: true, messageId: attack.id, rollIndex: r.index })
    if (out.vitae && attacker) {
      await attacker.update({ 'system.health.value': Math.min(a2Int(vit.max), a2Int(vit.value) + out.vitae) })
      if (a2Creature(defender) === 'vampire') {
        await defender.update({ 'system.health.value': Math.max(0, a2Int(defender.system.health.value) - out.vitae) })
        if (typeof a2yDrink === 'function') await a2yDrink(attacker, defender) // eslint-disable-line no-undef
      }
    }
    if (effect.kind === 'coordinate' && win && attacker) {
      const mine = game.combat?.started ? game.combat.combatants.filter((c) => c.actor && c.actor.uuid !== attacker.uuid && c.token?.disposition === game.combat.combatants.find((x) => x.actor?.uuid === attacker.uuid)?.token?.disposition).map((c) => c.actor) : []
      const share = a2vShare(margin + 1, mine.length)
      for (let i = 0; i < mine.length; i++) if (share[i]) await a2zAddEdge(mine[i], { label: `Coordinated by ${attacker.name}`, dice: share[i], when: 'own-test', from: attacker.uuid, combatantId: a2vCombatantId(attacker) })
      out.text += mine.length ? ` ${mine.map((a, i) => (share[i] ? `${a.name} +${share[i]}` : '')).filter(Boolean).join(', ')}.` : ' No allies in the fight to give them to: hand them out by hand.'
    }
  } catch (e) { console.error('V6 Automation | move', e); out.text += ' (Part of this could not be applied: see the console.)' }
  if (out.text) await a2vSay(`<p><strong>${a2Esc(def.move.label)}:</strong> ${a2Esc(out.text)}</p>`, attacker)
  return out
}

// ---- the window ----
async function a2vOpen (actorLike = null) {
  if (!a2vOn()) return null
  const actor = actorLike?.documentName === 'Actor' ? actorLike : (globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character)
  if (!actor) { ui.notifications.warn('Select your token first.'); return null }
  const target = a2vTarget(actor)
  const vamp = a2Creature(actor) === 'vampire'
  const groups = [...new Set(A2V_MOVES.map((m) => m.group))]
  const usable = (m) => (!m.vampire || vamp) && (!m.self || a2zHas(actor, m.self))
  const content = `<div class="a2v-window"><p class="a2v-who"><strong>${a2Esc(actor.name)}</strong> ${target ? `→ <strong>${a2Esc(target.name)}</strong>` : '<em>(no target: press T on a token for actions against someone)</em>'}</p>
    ${groups.map((g) => `<fieldset><legend>${g}</legend><div class="a2v-grid">${A2V_MOVES.filter((m) => m.group === g && usable(m)).map((m) => `<button type="button" data-move="${m.id}" title="${a2Esc(m.hint)}" ${m.target && !target ? 'disabled' : ''}><i class="fa-solid ${m.icon}"></i> <span>${a2Esc(m.label)}</span><small>${a2Esc(m.pool)}</small></button>`).join('')}</div></fieldset>`).join('')}</div>`
  let picked = null
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Actions', resizable: true },
    position: { width: 620 },
    content,
    buttons: [{ action: 'close', label: 'Close' }],
    rejectClose: false,
    render: (ev, dialog) => {
      dialog.element?.querySelectorAll('button[data-move]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); picked = b.dataset.move; dialog.close() }))
    }
  }).catch(() => null)
  return picked ? a2vRun(actor, picked) : null
}

// ---- chat commands ----
const A2V_HELP = [
  ['/test wits+awareness 3', 'open the roll for your character (Difficulty optional)'],
  ['/req wits+awareness 3', 'Storyteller: ask the players for that roll'],
  ['/act', 'the action menu for the selected token'],
  ['/states', 'set or clear states on the selected token'],
  ['/feed, /surge, /frenzy [fear|rage|hunger], /xp', 'the matching tool for the selected token'],
  ['/night, /scene, /award, /masquerade', 'Storyteller: New Night, End Scene, Award XP, Masquerade Tracker'],
  ['/create', 'character creation for the selected or assigned character'],
  ['/social, /task', 'Storyteller: start a social conflict or a prolonged task'],
  ['/bonds, /downtime', 'Blood Bonds and downtime actions for the selected token (/v6 downtime reset: Storyteller)'],
  ['/coterie', 'the coterie page: domain, haven, shared Resources, members'],
  ['/dash, /npc, /hunt, /vaulderie, /recap', 'Storyteller: dashboard, NPC maker, group hunt, Vaulderie, session recap'],
  ['/v6 guide', 'the how-to-play journal: player quick-start and Storyteller cheat sheet']
]
function a2vCommand (text) {
  // typed into Foundry's chat box, the text arrives as HTML: "<p>/test wits+awareness 3</p>"
  const plain = String(text ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#43;|&plus;/g, '+').replace(/\s+/g, ' ').trim()
  const m = plain.match(/^\/(v6\s+)?([a-z]+)\b\s*(.*)$/i)
  if (!m) return null
  const cmd = m[2].toLowerCase()
  const arg = m[3].trim()
  const known = ['test', 'req', 'act', 'states', 'feed', 'surge', 'frenzy', 'xp', 'night', 'scene', 'award', 'masquerade', 'create', 'help', 'social', 'task', 'bonds', 'downtime', 'dash', 'coterie', 'npc', 'hunt', 'vaulderie', 'recap', 'guide']
  if (!known.includes(cmd)) return null
  // without the "/v6" prefix only the unambiguous ones are ours
  if (!m[1] && !['test', 'req', 'act', 'states', 'feed', 'surge', 'frenzy', 'night', 'masquerade', 'social', 'task', 'bonds', 'downtime', 'dash', 'coterie', 'npc', 'hunt', 'vaulderie', 'recap'].includes(cmd)) return null
  return { cmd, arg }
}
function a2vChat (text) {
  if (!a2vOn()) return true
  const c = a2vCommand(text)
  if (!c) return true
  const A = globalThis.V6Alpha2 ?? {}
  const actor = globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null
  const gm = () => { if (!game.user.isGM) { ui.notifications.warn('That one is for the Storyteller.'); return false } return true }
  try {
    switch (c.cmd) {
      case 'help': ChatMessage.create({ content: `<div class="a2v-result"><p><strong>V6 chat commands</strong> (with or without "/v6 " in front)</p><ul>${A2V_HELP.map(([a, b]) => `<li><code>${a}</code>: ${b}</li>`).join('')}</ul></div>`, whisper: [game.user.id] }); break
      case 'test': { const t = a2vParsePool(c.arg); if (!t) ui.notifications.warn('Use it like: /test wits+awareness 3'); else a2lRollTest(t, {}) ; break }
      case 'req': { if (!gm()) break; const t = a2vParsePool(c.arg); a2lRequestDialog(t ? { test: t } : {}); break }
      case 'act': a2vOpen(actor); break
      case 'states': a2zOpen(actor); break
      case 'feed': A.tools?.feed?.(actor); break
      case 'surge': A.tools?.bloodSurge?.(actor); break
      case 'xp': A.tools?.spendXP?.(actor); break
      case 'frenzy': if (typeof a2xFrenzyTest === 'function') a2xFrenzyTest(actor, ['fear', 'rage', 'hunger', 'clan'].includes(c.arg.toLowerCase()) ? { type: c.arg.toLowerCase() } : {}); break
      case 'night': if (gm()) A.tools?.newNight?.(); break
      case 'scene': if (gm()) A.tools?.endScene?.(); break
      case 'award': if (gm()) A.tools?.awardXP?.(); break
      case 'masquerade': if (gm()) A.tools?.masquerade?.(); break
      case 'create': A.create?.(actor); break
      case 'social': if (gm()) A.story?.social?.(); break
      case 'task': if (gm()) A.story?.task?.(); break
      case 'bonds': A.story?.bonds?.(actor); break
      case 'dash': if (gm()) A.table?.dashboard?.(); break
      case 'coterie': A.table?.coterie?.(); break
      case 'npc': if (gm()) A.table?.npc?.(); break
      case 'hunt': if (gm()) A.table?.hunt?.(); break
      case 'vaulderie': if (gm()) A.table?.vaulderie?.(); break
      case 'recap': if (gm()) A.table?.recap?.(); break
      case 'guide': A.guide?.open?.(); break
      case 'downtime': if (c.arg.toLowerCase() === 'reset') { if (gm()) A.story?.downtimeReset?.() } else A.story?.downtime?.(actor); break
    }
  } catch (e) { console.error('V6 Automation | chat command', e) }
  return false
}

function a2vInjectStyles () {
  document.getElementById('v6a-moves-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-moves-style'
  style.textContent = `
.a2v-window fieldset { margin: 4px 0; }
.a2v-who { margin: 0 0 4px; }
.a2v-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.a2v-grid button { display: grid; grid-template-columns: 1.4em 1fr; grid-template-rows: auto auto; align-items: center; column-gap: 4px; text-align: left; line-height: 1.25; padding: 4px 8px; height: auto; min-height: 40px; }
.a2v-grid button i { grid-row: 1 / 3; }
.a2v-grid button small { grid-column: 2; opacity: 0.65; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.a2v-grid button:disabled { opacity: 0.45; }
.a2v-result p { margin: 0 0 2px; }
.a2v-sheet { grid-column: 1 / -1; width: 100%; margin: 0 0 10px; padding: 6px 8px 8px; border: 1px solid var(--v6-line, rgba(200,170,110,0.35)); border-radius: 6px; background: rgba(0,0,0,0.18); }
.a2v-sheet header { display: flex; justify-content: space-between; align-items: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--v6-gold, #c9a45c); border-bottom: 1px solid rgba(200,170,110,0.3); margin-bottom: 4px; padding-bottom: 2px; }
.a2v-sheet header a { cursor: pointer; }
.a2v-sheet-hint { margin: 0 0 4px; font-size: 11px; opacity: 0.7; }
.a2v-sheet-row { display: grid; grid-template-columns: 78px 1fr; gap: 6px; align-items: start; margin: 3px 0; }
.a2v-sheet-row label { font-size: 11px; text-transform: uppercase; opacity: 0.75; padding-top: 5px; }
.a2v-sheet-row > div { display: flex; flex-wrap: wrap; gap: 4px; }
.a2v-sheet-track span { font-size: 12px; padding: 1px 8px; border: 1px solid rgba(200,170,110,0.35); border-radius: 10px; }
.a2v-sheet-row button { width: auto; flex: 0 0 auto; height: auto; min-height: 0; line-height: 1.5; padding: 1px 8px; font-size: 12px; }
.a2v-result ul { margin: 2px 0; padding-left: 18px; }
`
  document.head.appendChild(style)
}

// What the module is keeping count of for a character, as short labels.
function a2vTracking (actor) {
  const out = []
  const f = actor?.flags?.world?.a2 ?? {}
  try { for (const d of A2Z_STATES) if (a2zHas(actor, d.id)) { const lv = d.levels ? a2zLevel(actor, d.id) : null; out.push(lv && d.levelNames?.[lv] ? `${d.name} (${d.levelNames[lv]})` : d.name) } } catch (e) { /* states are off */ }
  if (f.frenzy?.type) out.push(`${a2Cap(String(f.frenzy.type))} frenzy`)
  if (f.aegis?.points) out.push(`Blood Aegis ${f.aegis.points}`)
  if (f.haruspex?.uses) out.push(`Haruspex rerolls ${f.haruspex.uses}`)
  if (f.pactRa) out.push('Pact with Ra')
  for (const b of (Array.isArray(f.bonds) ? f.bonds : [])) if (a2Int(b?.stage) > 0) out.push(`Bond to ${b.name}: stage ${a2Int(b.stage)}`)
  try { const n = a2tClock().night; if (n) out.push(`Night ${n}`) } catch (e) { /* no clock */ }
  try { const m = a2tMasqState(); const lv = a2tMasqLevel(m.rank); if (lv?.name ?? lv?.label) out.push(`Masquerade: ${lv.name ?? lv.label}`) } catch (e) { /* no tracker */ }
  return out
}
// The action menu inside the sheet's own Actions tab: one block above the system's groups.
function a2vRenderSheet (app, element) {
  try {
    const actor = app?.document ?? app?.actor
    if (!a2vOn() || actor?.documentName !== 'Actor' || !actor.isOwner || !(a2Rules(actor) || actor.type === 'npc')) return
    const root = element instanceof HTMLElement ? element : element?.[0]
    const tab = root?.querySelector('section.actions-section, section.tab[data-tab="actions"]')
    if (!tab || tab.querySelector('.a2v-sheet')) return
    const vamp = a2Creature(actor) === 'vampire'
    const usable = (m) => (!m.vampire || vamp) && (!m.self || a2zHas(actor, m.self))
    const groups = [...new Set(A2V_MOVES.map((m) => m.group))]
    const box = document.createElement('section')
    box.className = 'a2v-sheet'
    box.innerHTML = '<header><span>V6 tools</span><a data-a2v-menu title="Open the action menu as a window"><i class="fa-solid fa-up-right-from-square"></i></a></header>'
    // without the filled lists below (alpha2-acts), the actions sit here as buttons
    if (!(typeof a2qOn === 'function' && a2qOn() && actor.items.some((i) => i.type === 'action' && i.flags?.world?.a2act))) { // eslint-disable-line no-undef
      box.insertAdjacentHTML('beforeend', `<p class="a2v-sheet-hint">Target a token first (hover it, press T) for anything aimed at someone.</p>${groups.map((g) => { const list = A2V_MOVES.filter((m) => m.group === g && usable(m)); return list.length ? `<div class="a2v-sheet-row"><label>${g}</label><div>${list.map((m) => `<button type="button" data-a2v-move="${m.id}" title="${a2Esc(`${m.pool ? m.pool + '. ' : ''}${m.hint ?? ''}`)}"><i class="fa-solid ${m.icon}"></i> ${a2Esc(m.label)}</button>`).join('')}</div></div>` : '' }).join('')}`)
    }
    // the tools from the token controls, and what the module is tracking for this character
    const A = globalThis.V6Alpha2 ?? {}
    const tools = [
      ['States', 'fa-person-falling', () => a2zOpen(actor), true],
      ['Feed', 'fa-droplet', () => A.tools?.feed?.(actor), vamp],
      ['Blood Surge', 'fa-bolt', () => A.tools?.bloodSurge?.(actor), vamp],
      ['Frenzy test', 'fa-face-angry', () => a2xFrenzyTest(actor, {}), vamp],
      ['Spend XP', 'fa-star', () => A.tools?.spendXP?.(actor), true],
      ['Blood Bonds', 'fa-link', () => A.story?.bonds?.(actor), true],
      ['Downtime', 'fa-moon', () => A.story?.downtime?.(actor), true],
      ['Coterie', 'fa-people-roof', () => A.table?.coterie?.(), true],
      ['Creation', 'fa-wand-magic-sparkles', () => A.create?.(actor), true],
      ['How to play', 'fa-book', () => A.guide?.open?.(), true]
    ].filter((t) => t[3])
    const row = document.createElement('div')
    row.className = 'a2v-sheet-row'
    row.innerHTML = `<label>Tools</label><div>${tools.map((t, i) => `<button type="button" data-a2v-tool="${i}"><i class="fa-solid ${t[1]}"></i> ${t[0]}</button>`).join('')}</div>`
    row.querySelectorAll('button[data-a2v-tool]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); try { tools[a2Int(b.dataset.a2vTool)][2]() } catch (e) { console.error('V6 Automation | sheet tool', e) } }))
    box.append(row)
    const track = a2vTracking(actor)
    if (track.length) { const t = document.createElement('div'); t.className = 'a2v-sheet-row a2v-sheet-track'; t.innerHTML = `<label>Tracking</label><div>${track.map((x) => `<span>${a2Esc(x)}</span>`).join('')}</div>`; box.append(t) }
    box.querySelector('[data-a2v-menu]')?.addEventListener('click', (ev) => { ev.preventDefault(); a2vOpen(actor) })
    box.querySelectorAll('button[data-a2v-move]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.preventDefault(); ev.stopPropagation()
      const m = A2V_MOVES.find((x) => x.id === b.dataset.a2vMove)
      if (m?.target && !a2vTarget(actor)) { ui.notifications.warn('Target a token first: hover it and press T.'); return }
      a2vRun(actor, b.dataset.a2vMove)
    }))
    tab.prepend(box)
  } catch (e) { console.error('V6 Automation | sheet actions', e) }
}

async function a2MovesBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.moves?.booted) return true
  a2eReg('moves', { name: 'Action menu and chat commands', hint: 'The fist tool in the token controls opens every combat action (attacks, wrestling, feeding, team actions); /v6 help lists the chat commands.', scope: 'world', config: true, type: Boolean, default: true })
  a2vInjectStyles()
  if (!a2vState.hooked) {
    a2vState.hooked = true
    Hooks.on('chatMessage', (log, text) => a2vChat(text))
    Hooks.on('renderActorSheetV2', a2vRenderSheet)
    Hooks.on('getSceneControlButtons', (controls) => {
      const tools = controls?.tokens?.tools
      if (!tools || !a2vOn()) return
      tools['v6a2-actions'] = { name: 'v6a2-actions', title: 'Actions (attacks, wrestling, team actions)', icon: 'fa-solid fa-hand-fist', order: 105, button: true, onChange: () => a2vOpen() }
      tools['v6a2-states'] = { name: 'v6a2-states', title: 'States (surprised, on the ground, burning, cover…)', icon: 'fa-solid fa-list-check', order: 106, button: true, onChange: () => a2zOpen() }
    })
    try { ui.controls?.render?.({ reset: true }) } catch (e) { /* controls not drawn yet */ }
  }
  api.moves = { booted: true, open: a2vOpen, run: a2vRun, list: A2V_MOVES, rules: { outcome: a2vOutcome, share: a2vShare, parsePool: a2vParsePool, command: a2vCommand } }
  api.act = a2vOpen
  console.log('V6 Automation | action menu and chat commands loaded')
  return true
}
globalThis.a2MovesBoot ??= a2MovesBoot

// ---- the Nightfall look -----------------------------------------------------------------
// One look for the chat log and the module's windows: dark panels, a blood-red edge, gold
// display headings, dice as tiles (successes gold, tens red), verdicts as banners.
// Setting (client): theme = nightfall | off. Generated from alpha2-theme.css.
const A2H_CSS = "/* V6 Automation: the Nightfall look for chat cards and the module's windows. */\nbody.v6-theme {\n  --v6-ink: #e9e0d2;\n  --v6-dim: #a3978a;\n  --v6-gold: #d2aa5a;\n  --v6-blood: #a31621;\n  --v6-blood-hi: #d0303c;\n  --v6-panel: #171113;\n  --v6-panel-2: #21171a;\n  --v6-line: #43292e;\n  --v6-display: \"Modesto Condensed\", \"Palatino Linotype\", \"Book Antiqua\", Georgia, serif;\n}\n\n/* ---- chat cards ---- */\nbody.v6-theme .chat-log li.chat-message,\nbody.v6-theme #chat-notifications li.chat-message {\n  background: linear-gradient(165deg, var(--v6-panel-2) 0%, var(--v6-panel) 70%);\n  border: 1px solid var(--v6-line);\n  border-left: 3px solid var(--v6-blood);\n  border-radius: 6px;\n  color: var(--v6-ink);\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.55), inset 0 0 32px rgba(163, 22, 33, 0.07);\n  padding: 8px 10px 9px;\n}\nbody.v6-theme .chat-log li.chat-message.whisper { border-left-color: #6b4fa0; background: linear-gradient(165deg, #1d1826 0%, #131018 70%); }\nbody.v6-theme .chat-log li.chat-message.blind { border-left-color: #4a6d8c; }\nbody.v6-theme li.chat-message .message-header { color: var(--v6-dim); border-bottom: 1px solid var(--v6-line); padding-bottom: 4px; margin-bottom: 6px; }\nbody.v6-theme li.chat-message .message-header .message-sender { font-family: var(--v6-display); font-size: 17px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--v6-gold); text-shadow: 0 1px 0 #000; }\nbody.v6-theme li.chat-message .message-header .message-metadata,\nbody.v6-theme li.chat-message .message-header .message-metadata a,\nbody.v6-theme li.chat-message .message-header .whisper-to { color: var(--v6-dim); font-size: 11px; }\nbody.v6-theme li.chat-message .message-header .flavor-text { color: #cfc3b3; font-style: italic; font-size: 13px; }\nbody.v6-theme li.chat-message .message-content { color: var(--v6-ink); }\nbody.v6-theme li.chat-message .message-content a:not(.v6-roll):not(.content-link):not(.inline-roll) { color: var(--v6-gold); }\nbody.v6-theme li.chat-message .message-content h1,\nbody.v6-theme li.chat-message .message-content h2,\nbody.v6-theme li.chat-message .message-content h3,\nbody.v6-theme li.chat-message .message-content h4:not(.dice-total) {\n  font-family: var(--v6-display); font-size: 18px; line-height: 1.2; font-weight: 400; letter-spacing: 0.03em; color: var(--v6-gold);\n  border: 0; border-bottom: 1px solid var(--v6-blood); margin: 0 0 6px; padding: 0 0 3px;\n}\nbody.v6-theme li.chat-message .message-content p { margin: 0 0 4px; }\nbody.v6-theme li.chat-message .message-content ul { margin: 2px 0 6px; padding-left: 16px; }\nbody.v6-theme li.chat-message .message-content li { color: #d6ccbd; }\nbody.v6-theme li.chat-message .message-content code { background: #0c090a; color: var(--v6-gold); border: 1px solid var(--v6-line); border-radius: 3px; padding: 0 4px; }\nbody.v6-theme li.chat-message .content-link,\nbody.v6-theme li.chat-message .inline-roll { background: #0f0b0c; border: 1px solid var(--v6-line); color: var(--v6-ink); }\n\n/* the roll itself */\nbody.v6-theme li.chat-message .dice-roll .dice-formula { background: #0f0b0c; border: 1px solid var(--v6-line); border-radius: 4px; color: var(--v6-dim); font-size: 12px; box-shadow: none; }\nbody.v6-theme li.chat-message .dice-roll .dice-tooltip { color: var(--v6-ink); }\nbody.v6-theme li.chat-message .dice-roll .dice-tooltip .dice-rolls .roll { color: #111; }\nbody.v6-theme li.chat-message .dice-roll .dice-total {\n  background: radial-gradient(ellipse at center, rgba(163, 22, 33, 0.28) 0%, rgba(15, 11, 12, 0.9) 75%);\n  border: 1px solid var(--v6-blood); border-radius: 4px; color: #fff3da;\n  font-family: var(--v6-display); font-size: 28px; line-height: 1.35; font-weight: 400; text-shadow: 0 0 10px rgba(208, 48, 60, 0.7); box-shadow: none; margin: 4px 0;\n}\nbody.v6-theme li.chat-message .a2-dice { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }\nbody.v6-theme li.chat-message .a2-die {\n  display: inline-flex; align-items: center; justify-content: center; min-width: 24px; height: 24px; padding: 0 4px;\n  background: #0f0b0c; border: 1px solid #4b3a3d; border-radius: 4px; color: #8f8379; font-weight: 600; font-size: 12px;\n}\nbody.v6-theme li.chat-message .a2-die.a2-succ { background: #1d1a12; border-color: var(--v6-gold); color: #f3dca6; }\nbody.v6-theme li.chat-message .a2-die.a2-crit { background: var(--v6-blood); border-color: #f0c9a0; color: #fff; box-shadow: 0 0 8px rgba(208, 48, 60, 0.8); }\nbody.v6-theme li.chat-message .a2-die.a2-hunger { border-style: double; border-width: 3px; border-color: var(--v6-blood-hi); }\nbody.v6-theme li.chat-message .a2-die.a2-hunger.a2-one,\nbody.v6-theme li.chat-message .a2-die.a2-beast { background: #2a0508; border-color: var(--v6-blood-hi); color: #ff8d95; }\nbody.v6-theme li.chat-message .a2-result { background: none; border: 0; padding: 0; }\nbody.v6-theme li.chat-message .a2-verdict { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin: 4px 0; padding: 4px 8px; border-radius: 4px; background: #0f0b0c; border-left: 3px solid var(--v6-dim); }\nbody.v6-theme li.chat-message .a2-verdict strong { font-family: var(--v6-display); font-size: 18px; font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase; color: var(--v6-ink); }\nbody.v6-theme li.chat-message .a2-verdict span { color: var(--v6-dim); font-size: 12px; }\nbody.v6-theme li.chat-message .a2-win .a2-verdict { border-left-color: var(--v6-gold); }\nbody.v6-theme li.chat-message .a2-win .a2-verdict strong { color: var(--v6-gold); }\nbody.v6-theme li.chat-message .a2-critical .a2-verdict { border-left-color: #f3dca6; box-shadow: inset 0 0 14px rgba(210, 170, 90, 0.18); }\nbody.v6-theme li.chat-message .a2-critical .a2-verdict strong { color: #ffe9b0; text-shadow: 0 0 8px rgba(210, 170, 90, 0.6); }\nbody.v6-theme li.chat-message .a2-fail .a2-verdict strong,\nbody.v6-theme li.chat-message .a2-tie .a2-verdict strong { color: #b9ada0; }\nbody.v6-theme li.chat-message .a2-painful .a2-verdict,\nbody.v6-theme li.chat-message .a2-bestial .a2-verdict { border-left-color: var(--v6-blood-hi); background: #1f0a0c; }\nbody.v6-theme li.chat-message .a2-painful .a2-verdict strong,\nbody.v6-theme li.chat-message .a2-bestial .a2-verdict strong { color: #ff6b76; text-shadow: 0 0 8px rgba(208, 48, 60, 0.6); }\nbody.v6-theme li.chat-message .a2-notes,\nbody.v6-theme li.chat-message .a2x-note,\nbody.v6-theme li.chat-message .a2-note { list-style: none; margin: 4px 0; padding: 0 0 0 8px; border-left: 1px solid var(--v6-line); color: var(--v6-dim); font-size: 12px; background: none; }\nbody.v6-theme li.chat-message .a2-notes li { color: var(--v6-dim); margin: 1px 0; }\nbody.v6-theme li.chat-message .a2x-line { color: #d6ccbd; font-size: 12.5px; border-top: 1px dashed var(--v6-line); padding-top: 4px; margin-top: 4px; }\nbody.v6-theme li.chat-message .a2o-defence { border-top: 1px dashed var(--v6-line); }\n\n/* buttons on cards */\nbody.v6-theme li.chat-message .message-content button {\n  background: linear-gradient(180deg, #33201f 0%, #24171a 100%); border: 1px solid #6b3a3c; border-radius: 4px; color: var(--v6-ink);\n  font-size: 12.5px; min-height: 26px; cursor: pointer; transition: background 0.12s, box-shadow 0.12s, border-color 0.12s;\n}\nbody.v6-theme li.chat-message .message-content button:hover:not(:disabled) { background: linear-gradient(180deg, #b01c28 0%, #7c121b 100%); border-color: #f0c9a0; color: #fff; box-shadow: 0 0 8px rgba(208, 48, 60, 0.6); }\nbody.v6-theme li.chat-message .message-content button:disabled { opacity: 0.4; cursor: default; }\nbody.v6-theme li.chat-message .message-content button i { color: var(--v6-gold); margin-right: 3px; }\nbody.v6-theme li.chat-message .message-content button:hover:not(:disabled) i { color: #fff; }\nbody.v6-theme li.chat-message .a2-actions, body.v6-theme li.chat-message .a2x-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }\nbody.v6-theme li.chat-message .a2-actions button, body.v6-theme li.chat-message .a2x-actions button { flex: 1 1 auto; }\n\n/* the module's own cards */\nbody.v6-theme li.chat-message .a2k-react span { color: var(--v6-gold); letter-spacing: 2px; }\nbody.v6-theme li.chat-message .a2k-react a { color: var(--v6-dim); }\nbody.v6-theme li.chat-message .a2l-row span { color: #d6ccbd; }\nbody.v6-theme li.chat-message a.v6-roll { border-color: var(--v6-blood); background: rgba(163, 22, 33, 0.18); color: var(--v6-ink); }\n\n/* ---- the module's windows ---- */\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]),\nbody.v6-theme .application.v6-window {\n  background: linear-gradient(170deg, #1e1518 0%, #110d0e 100%);\n  border: 1px solid var(--v6-line); border-top: 2px solid var(--v6-blood); border-radius: 8px;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px #000;\n  color: var(--v6-ink);\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) .window-header {\n  background: linear-gradient(90deg, rgba(163, 22, 33, 0.55) 0%, rgba(20, 14, 15, 0.2) 70%); border-bottom: 1px solid var(--v6-line);\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) .window-title {\n  font-family: var(--v6-display); font-size: 19px; letter-spacing: 0.05em; text-transform: uppercase; color: #f1e3c4; text-shadow: 0 1px 0 #000;\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) fieldset { border: 1px solid var(--v6-line); border-radius: 6px; background: rgba(0, 0, 0, 0.22); }\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) legend,\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) h4 {\n  font-family: var(--v6-display); font-size: 17px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: var(--v6-gold); border: 0;\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) button {\n  background: linear-gradient(180deg, #2c1d1f 0%, #1f1517 100%); border: 1px solid #5d3437; color: var(--v6-ink); transition: background 0.12s, box-shadow 0.12s, border-color 0.12s;\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) button:hover:not(:disabled) {\n  background: linear-gradient(180deg, #b01c28 0%, #7c121b 100%); border-color: #f0c9a0; color: #fff; box-shadow: 0 0 10px rgba(208, 48, 60, 0.55);\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) .form-footer button[data-action=\"ok\"],\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) .form-footer button.default {\n  border-color: var(--v6-gold); font-family: var(--v6-display); font-size: 17px; letter-spacing: 0.08em; text-transform: uppercase;\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) input[type=\"text\"],\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) input[type=\"number\"],\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) input[type=\"search\"],\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) select {\n  background: #0d0a0b; border: 1px solid var(--v6-line); color: var(--v6-ink); border-radius: 4px;\n}\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) input:focus,\nbody.v6-theme .application.dialog:has(.a2v-window, .a2z-window, .a2c, .a2l-dialog, [class*=\"a2t-\"], [class*=\"a2x-\"], [class*=\"a2-dialog\"]) select:focus { border-color: var(--v6-gold); box-shadow: 0 0 6px rgba(210, 170, 90, 0.4); outline: 0; }\nbody.v6-theme .a2v-grid button i { color: var(--v6-gold); font-size: 15px; }\nbody.v6-theme .a2v-grid button:hover:not(:disabled) i { color: #fff; }\nbody.v6-theme .a2v-grid button span { font-weight: 600; }\nbody.v6-theme .a2c-nav a.on { background: linear-gradient(180deg, #b01c28 0%, #7c121b 100%); border-color: #f0c9a0; }\nbody.v6-theme .a2c-nav a b { color: var(--v6-gold); }\nbody.v6-theme .a2c-nav a.on b { color: #fff; }\nbody.v6-theme .a2c-hint, body.v6-theme .a2c-info, body.v6-theme .a2c-frame { border-left-color: var(--v6-blood); background: rgba(163, 22, 33, 0.08); }\n\nbody.v6-theme li.chat-message .a2k-react { flex-wrap: wrap; }\nbody.v6-theme li.chat-message .a2k-react span { white-space: nowrap; flex: 1 1 100%; }\nbody.v6-theme li.chat-message .a2k-react button { flex: 1 1 0; }\nbody.v6-theme .a2z-state small { color: var(--v6-dim); }\n\n/* the Masquerade Tracker and other module windows that are not dialogs */\nbody.v6-theme .application.a2t-masq-app { background: linear-gradient(170deg, #1e1518 0%, #110d0e 100%); border: 1px solid var(--v6-line); border-top: 2px solid var(--v6-blood); border-radius: 8px; color: var(--v6-ink); }\nbody.v6-theme .application.a2t-masq-app .window-header { background: linear-gradient(90deg, rgba(163, 22, 33, 0.55) 0%, rgba(20, 14, 15, 0.2) 70%); border-bottom: 1px solid var(--v6-line); }\nbody.v6-theme .application.a2t-masq-app .window-title { font-family: var(--v6-display); font-size: 19px; letter-spacing: 0.05em; text-transform: uppercase; color: #f1e3c4; }\n\n/* ---- journals ---- */\nbody.v6-theme .application.journal-sheet {\n  background: linear-gradient(170deg, #1e1518 0%, #0f0b0c 100%);\n  border: 1px solid var(--v6-line); border-top: 2px solid var(--v6-blood); border-radius: 8px;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px #000; color: var(--v6-ink);\n}\nbody.v6-theme .application.journal-sheet > .window-header { background: linear-gradient(90deg, rgba(163, 22, 33, 0.55) 0%, rgba(20, 14, 15, 0.2) 70%); border-bottom: 1px solid var(--v6-line); }\nbody.v6-theme .application.journal-sheet > .window-header .window-title { font-family: var(--v6-display); font-size: 19px; letter-spacing: 0.05em; text-transform: uppercase; color: #f1e3c4; text-shadow: 0 1px 0 #000; }\nbody.v6-theme .application.journal-sheet .journal-sidebar { background: #0e0a0b; border-right: 1px solid var(--v6-line); color: var(--v6-dim); }\nbody.v6-theme .application.journal-sheet .journal-sidebar search input { background: #171113; border: 1px solid var(--v6-line); color: var(--v6-ink); }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc li.page > .page-heading { color: #c3b7a8; border: 0; border-left: 2px solid transparent; padding-left: 8px; transition: color 0.12s, border-color 0.12s, background 0.12s; }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc li.page > .page-heading:hover { color: #fff3da; background: rgba(163, 22, 33, 0.14); border-left-color: var(--v6-blood); text-shadow: none; }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc li.page.active > .page-heading { color: var(--v6-gold); background: rgba(163, 22, 33, 0.2); border-left-color: var(--v6-blood-hi); font-weight: 600; }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc li.page > .page-heading .page-number { color: var(--v6-blood-hi); }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc ol.headings li { color: var(--v6-dim); font-size: 12px; }\nbody.v6-theme .application.journal-sheet .journal-sidebar .toc ol.headings li:hover { color: var(--v6-ink); }\nbody.v6-theme .application.journal-sheet .journal-sidebar .action-buttons button { background: #1f1517; border: 1px solid #5d3437; color: var(--v6-ink); }\nbody.v6-theme .application.journal-sheet .journal-sidebar .action-buttons button:hover { background: linear-gradient(180deg, #b01c28 0%, #7c121b 100%); border-color: #f0c9a0; color: #fff; }\nbody.v6-theme .application.journal-sheet .journal-entry-content { background: radial-gradient(ellipse at 50% 0%, #241a1d 0%, #151012 55%, #100c0d 100%); color: var(--v6-ink); }\nbody.v6-theme .application.journal-sheet .journal-header { border-bottom: 0; }\nbody.v6-theme .application.journal-sheet .journal-header input.title {\n  font-family: var(--v6-display); font-size: 24px; height: auto; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; text-overflow: ellipsis; color: #f6e7c3;\n  background: linear-gradient(90deg, transparent 0%, rgba(163, 22, 33, 0.45) 20%, rgba(163, 22, 33, 0.45) 80%, transparent 100%);\n  border: 0; border-top: 1px solid rgba(210, 170, 90, 0.5); border-bottom: 1px solid rgba(210, 170, 90, 0.5); border-radius: 0; text-shadow: 0 2px 6px #000; padding: 6px 12px;\n}\nbody.v6-theme .application.journal-sheet .journal-entry-page { color: var(--v6-ink); }\nbody.v6-theme .application.journal-sheet .journal-page-header h1,\nbody.v6-theme .application.journal-sheet .journal-page-header h2,\nbody.v6-theme .application.journal-sheet .journal-page-header h3 {\n  font-family: var(--v6-display); font-weight: 400; font-size: 32px; letter-spacing: 0.04em; color: var(--v6-gold); text-shadow: 0 2px 4px #000;\n  border: 0; border-bottom: 3px double var(--v6-blood); padding-bottom: 6px; margin-bottom: 14px;\n}\nbody.v6-theme .application.journal-sheet .journal-page-content { color: #ddd3c4; font-size: 14.5px; line-height: 1.65; }\nbody.v6-theme .application.journal-sheet .journal-page-content h1,\nbody.v6-theme .application.journal-sheet .journal-page-content h2,\nbody.v6-theme .application.journal-sheet .journal-page-content [data-v6-level=\"2\"] {\n  font-family: var(--v6-display); font-weight: 400; font-size: 25px; letter-spacing: 0.04em; color: #ecd096; text-shadow: 0 1px 3px #000;\n  border: 0; border-bottom: 1px solid var(--v6-blood); padding-bottom: 3px; margin: 1.4em 0 0.5em;\n}\nbody.v6-theme .application.journal-sheet .journal-page-content h3,\nbody.v6-theme .application.journal-sheet .journal-page-content [data-v6-level=\"3\"] { font-family: var(--v6-display); font-weight: 400; font-size: 20px; letter-spacing: 0.04em; color: #d98a8f; border: 0; margin: 1.2em 0 0.35em; }\nbody.v6-theme .application.journal-sheet .journal-page-content h4,\nbody.v6-theme .application.journal-sheet .journal-page-content [data-v6-level=\"4\"] { font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--v6-gold); border: 0; margin: 1.1em 0 0.3em; }\nbody.v6-theme .application.journal-sheet .journal-page-content .v6-subtitle { color: var(--v6-dim); font-family: inherit; font-size: 15px; font-style: italic; text-transform: none; letter-spacing: 0; border: 0; text-shadow: none; }\nbody.v6-theme .application.journal-sheet .journal-page-content strong { color: #f6ecd8; }\nbody.v6-theme .application.journal-sheet .journal-page-content em { color: #e2d6c4; }\nbody.v6-theme .application.journal-sheet .journal-page-content a:not(.v6-roll):not(.content-link):not(.inline-roll) { color: var(--v6-gold); }\nbody.v6-theme .application.journal-sheet .journal-page-content a.content-link,\nbody.v6-theme .application.journal-sheet .journal-page-content a.inline-roll { background: #0f0b0c; border: 1px solid #5d3437; color: #f1e3c4; border-radius: 4px; padding: 0 5px; }\nbody.v6-theme .application.journal-sheet .journal-page-content a.content-link:hover { border-color: var(--v6-gold); text-shadow: none; box-shadow: 0 0 6px rgba(210, 170, 90, 0.4); }\nbody.v6-theme .application.journal-sheet .journal-page-content a.content-link i { color: var(--v6-gold); }\nbody.v6-theme .application.journal-sheet .journal-page-content a.v6-roll { border: 1px solid var(--v6-blood); background: rgba(163, 22, 33, 0.22); color: #fff3da; border-radius: 4px; }\nbody.v6-theme .application.journal-sheet .journal-page-content a.v6-roll:hover { background: var(--v6-blood); box-shadow: 0 0 8px rgba(208, 48, 60, 0.6); }\nbody.v6-theme .application.journal-sheet .journal-page-content a.v6-roll i { color: var(--v6-gold); }\nbody.v6-theme .application.journal-sheet .journal-page-content .v6-table-wrap { border: 1px solid var(--v6-line); border-radius: 6px; background: rgba(0, 0, 0, 0.25); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4); }\nbody.v6-theme .application.journal-sheet .journal-page-content table { border: 0; background: transparent; color: inherit; }\nbody.v6-theme .application.journal-sheet .journal-page-content th { background: linear-gradient(180deg, #6d141c 0%, #4a0e14 100%); color: #f6e7c3; border: 0; border-bottom: 1px solid var(--v6-gold); font-family: var(--v6-display); font-weight: 400; font-size: 16px; letter-spacing: 0.05em; text-shadow: 0 1px 0 #000; }\nbody.v6-theme .application.journal-sheet .journal-page-content td { border: 0; border-top: 1px solid #2e1f22; color: #ddd3c4; }\nbody.v6-theme .application.journal-sheet .journal-page-content tbody tr:nth-child(even) { background: rgba(255, 255, 255, 0.03); }\nbody.v6-theme .application.journal-sheet .journal-page-content tbody tr:hover { background: rgba(163, 22, 33, 0.14); }\nbody.v6-theme .application.journal-sheet .journal-page-content td:first-child { color: #f1e3c4; }\nbody.v6-theme .application.journal-sheet .journal-page-content .v6-note { background: linear-gradient(90deg, rgba(163, 22, 33, 0.2) 0%, rgba(163, 22, 33, 0.05) 100%); border: 0; border-left: 3px solid var(--v6-blood-hi); border-radius: 0 6px 6px 0; color: #e6dccd; }\nbody.v6-theme .application.journal-sheet .journal-page-content blockquote { background: rgba(0, 0, 0, 0.3); border: 0; border-left: 3px solid var(--v6-gold); border-radius: 0 6px 6px 0; color: #cfc3b3; font-style: italic; }\nbody.v6-theme .application.journal-sheet .journal-page-content hr { border: 0; height: 1px; margin: 1.6em 15%; background: linear-gradient(90deg, transparent, var(--v6-blood), var(--v6-gold), var(--v6-blood), transparent); }\nbody.v6-theme .application.journal-sheet .journal-page-content img { border: 1px solid var(--v6-line); border-radius: 6px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6); }\nbody.v6-theme .application.journal-sheet .journal-page-content code { background: #0c090a; color: var(--v6-gold); border: 1px solid var(--v6-line); border-radius: 3px; padding: 0 4px; }\nbody.v6-theme .application.journal-sheet .journal-page-content li::marker { color: var(--v6-blood-hi); }\nbody.v6-theme .application.journal-sheet .journal-entry-pages { scrollbar-color: #5d3437 transparent; }\n/* image pages (handouts, maps) */\nbody.v6-theme .application.journal-sheet .journal-entry-page.image figure img { border: 1px solid var(--v6-line); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.7); }\nbody.v6-theme .application.journal-sheet .journal-entry-page.image figcaption { color: var(--v6-dim); font-style: italic; }\n\n/* ---- character and item sheets ---- */\nbody.v6-theme .application.sheet.wod6e { background: linear-gradient(170deg, #1e1518 0%, #0f0b0c 100%); border: 1px solid var(--v6-line); border-top: 2px solid var(--v6-blood); border-radius: 8px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 0 1px #000; color: var(--v6-ink); }\nbody.v6-theme .application.sheet.wod6e > .window-header { background: linear-gradient(90deg, rgba(163, 22, 33, 0.55) 0%, rgba(20, 14, 15, 0.2) 70%); border-bottom: 1px solid var(--v6-line); }\nbody.v6-theme .application.sheet.wod6e > .window-header .window-title { font-family: var(--v6-display); font-size: 19px; letter-spacing: 0.05em; text-transform: uppercase; color: #f1e3c4; text-shadow: 0 1px 0 #000; }\nbody.v6-theme .application.sheet.wod6e > .window-header .window-icon { color: var(--v6-gold); }\nbody.v6-theme .application.sheet.wod6e nav.sheet-tabs { border-bottom: 1px solid var(--v6-line); background: rgba(0, 0, 0, 0.25); }\nbody.v6-theme .application.sheet.wod6e nav.sheet-tabs a { color: #c3b7a8; border-bottom: 2px solid transparent; transition: color 0.12s, border-color 0.12s, background 0.12s; }\nbody.v6-theme .application.sheet.wod6e nav.sheet-tabs a:hover { color: #fff3da; background: rgba(163, 22, 33, 0.14); text-shadow: none; }\nbody.v6-theme .application.sheet.wod6e nav.sheet-tabs a.active { color: var(--v6-gold); border-bottom-color: var(--v6-blood-hi); background: rgba(163, 22, 33, 0.2); text-shadow: none; }\nbody.v6-theme .application.sheet.wod6e nav.sheet-tabs a i { color: var(--v6-blood-hi); }\nbody.v6-theme .application.sheet.wod6e h2, body.v6-theme .application.sheet.wod6e .sheet-section-header { font-family: var(--v6-display); letter-spacing: 0.06em; color: var(--v6-gold); text-shadow: 0 1px 2px #000; }\nbody.v6-theme .application.sheet.wod6e h2 { border-bottom: 1px solid var(--v6-blood); }\nbody.v6-theme .application.sheet.wod6e .sheet-section-header { border-bottom: 1px solid var(--v6-line); }\nbody.v6-theme .application.sheet.wod6e .sheet-section-header a, body.v6-theme .application.sheet.wod6e .sheet-section-header i { color: var(--v6-gold); }\nbody.v6-theme .application.sheet.wod6e input[type=\"text\"], body.v6-theme .application.sheet.wod6e input[type=\"number\"], body.v6-theme .application.sheet.wod6e select { background: #0d0a0b; border: 1px solid var(--v6-line); color: var(--v6-ink); border-radius: 4px; }\nbody.v6-theme .application.sheet.wod6e input:focus, body.v6-theme .application.sheet.wod6e select:focus { border-color: var(--v6-gold); box-shadow: 0 0 6px rgba(210, 170, 90, 0.4); outline: 0; }\nbody.v6-theme .application.sheet.wod6e .a2t-sheet-line a { color: var(--v6-gold); }\nbody.v6-theme .application.sheet.wod6e .a2t-sheet-line a:hover { color: #fff3da; text-shadow: 0 0 6px rgba(210, 170, 90, 0.5); }\nbody.v6-theme .application.sheet.wod6e .sheet-section-list > * { border-bottom: 1px solid rgba(67, 41, 46, 0.6); }\nbody.v6-theme .application.sheet.wod6e .sheet-section-list > *:hover { background: rgba(163, 22, 33, 0.1); }\n/* the module's windows that are not dialogs with a known class */\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) { background: linear-gradient(170deg, #1e1518 0%, #110d0e 100%); border: 1px solid var(--v6-line); border-top: 2px solid var(--v6-blood); border-radius: 8px; color: var(--v6-ink); }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) .window-header { background: linear-gradient(90deg, rgba(163, 22, 33, 0.55) 0%, rgba(20, 14, 15, 0.2) 70%); border-bottom: 1px solid var(--v6-line); }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) .window-title { font-family: var(--v6-display); font-size: 19px; letter-spacing: 0.05em; text-transform: uppercase; color: #f1e3c4; }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) legend, body.v6-theme .a2w-table th { font-family: var(--v6-display); font-weight: 400; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--v6-gold); }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) button { background: linear-gradient(180deg, #2c1d1f 0%, #1f1517 100%); border: 1px solid #5d3437; color: var(--v6-ink); }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) button:hover:not(:disabled) { background: linear-gradient(180deg, #b01c28 0%, #7c121b 100%); border-color: #f0c9a0; color: #fff; }\nbody.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) input[type=\"text\"], body.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) input[type=\"number\"], body.v6-theme .application.dialog:has(.a2w-dash, .a2w-coterie, .a2w-npc, .a2y-dialog) select { background: #0d0a0b; border: 1px solid var(--v6-line); color: var(--v6-ink); border-radius: 4px; }\n"
function a2hApply () {
  const on = a2eGet('theme', 'nightfall') !== 'off'
  document.body.classList.toggle('v6-theme', on)
  let st = document.getElementById('v6a-theme-style')
  if (on && !st) { st = document.createElement('style'); st.id = 'v6a-theme-style'; st.textContent = A2H_CSS; document.head.appendChild(st) }
  if (!on && st) st.remove()
}
async function a2ThemeBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.theme?.booted) return true
  a2eReg('theme', { name: 'Look of chat cards and windows', hint: 'Nightfall: dark cards with a red edge, gold headings and dice tiles, for the chat log, journals and this module\'s windows. Off: Foundry\'s own look.', scope: 'client', config: true, type: String, choices: { nightfall: 'Nightfall', off: 'Off' }, default: 'nightfall', onChange: () => a2hApply() })
  a2hApply()
  api.theme = { booted: true, apply: a2hApply }
  console.log('V6 Automation | theme loaded')
  return true
}
globalThis.a2ThemeBoot ??= a2ThemeBoot

// ---- beyond the fight: social conflict, prolonged tasks, Blood Bonds, downtime, complications
// Social conflict (PG p.121-124): the Storyteller names two sides, their goals and 3, 5
//   or 7 rounds. Each round is a card: anyone speaks for a side by picking an approach
//   (the pool is set for them), the card adds up each side's successes, the Storyteller
//   closes the round, and after the last one the outcome is named for both sides.
// Prolonged task (PG p.112): a success target (3/5/7/10) and a test limit (3/5/7) on a
//   card with a progress bar. Successes add up; a painful or bestial failure ends it.
// Blood Bonds (PG p.135-136): each drink of a vampire's Vitae is logged on the drinker.
//   Three drinks on different nights inside the donor's interval make stages 1 to 3; a
//   gap longer than the interval drops a stage at New Night. The stage comes off the
//   thrall's rolls against the master and is added to the master's Social rolls and
//   Dominate/Presence against the thrall. Feed attacks and the Bonds window log drinks.
// Downtime (PG p.112-113): 2 actions between stories; the Resource ones move the dots.
// Complications (PG p.97): a painful failure's card gets a Complication button with the
//   four kinds; Expose Vulnerability and Suffer Harm are applied.
//
// Settings (world): story (on). Data: world setting social; flags.world.a2task on a task
// card; flags.world.a2.bonds on the thrall; flags.world.a2.downtime on a character.

const A2Y_APPROACHES = [
  { id: 'blather', label: 'Blather', pools: [['wits', 'subterfuge']] },
  { id: 'contradict', label: 'Contradict', pools: [['wits', 'subterfuge']] },
  { id: 'deceive', label: 'Deceive', pools: [['manipulation', 'subterfuge']] },
  { id: 'deflect', label: 'Deflect', pools: [['wits', 'knowledge'], ['wits', 'persuasion']] },
  { id: 'deny', label: 'Deny', pools: [['manipulation', 'persuasion']] },
  { id: 'factcheck', label: 'Fact check', pools: [['intelligence', 'knowledge']] },
  { id: 'gossip', label: 'Gossip', pools: [['manipulation', 'investigation']] },
  { id: 'intimidate', label: 'Intimidate', pools: [['strength', 'persuasion'], ['charisma', 'persuasion'], ['intelligence', 'persuasion']], note: 'A failure can escalate to a fight.' },
  { id: 'justify', label: 'Justify', pools: [['intelligence', 'investigation']] },
  { id: 'keepcool', label: 'Keep cool', pools: [['composure', 'expression'], ['composure', 'persuasion']] },
  { id: 'seduce', label: 'Seduce', pools: [['charisma', 'persuasion']] }
]
const A2Y_INTERVAL = { duskborn: 30, neonate: 30, ancilla: 180, elder: 365, methuselah: 36500 } // nights (PG p.135)
const A2Y_DOWNTIME = [
  { id: 'info', label: 'Acquire information', text: 'One piece of sensitive information; it may become a Story Asset.' },
  { id: 'acquire', label: 'Acquire Resources', text: '+1 dot in a Resource, or a new Resource at 1 dot.', res: 'gain' },
  { id: 'ritual', label: 'Perform a ritual', text: 'A negotiated ritual effect (needs the right Disciplines).' },
  { id: 'reallocate', label: 'Reallocate Resources', text: 'Move up to 3 dots between Resources you have.', res: 'move' },
  { id: 'recover', label: 'Recover Resources', text: 'Restore up to 2 spent dots in one Resource, or 1 in each of two.', res: 'recover' },
  { id: 'masquerade', label: 'Repair the Masquerade', text: 'Spend 3 dots of one Resource (4 if from several) to lower the Masquerade Tracker by 1.', res: 'spend' },
  { id: 'project', label: 'Work on a project', text: 'Story progress; long projects take several actions.' }
]
const A2Y_COMPLICATIONS = [
  { id: 'lose', label: 'Damage or lose something valuable', icon: 'fa-heart-crack' },
  { id: 'attention', label: 'Draw attention', icon: 'fa-eye' },
  { id: 'expose', label: 'Expose vulnerability', icon: 'fa-crosshairs' },
  { id: 'harm', label: 'Suffer harm', icon: 'fa-droplet' }
]

// ---- pure rules ----
// Who took the round. totals: [a, b]. Ties go to the initiator (side 0) unless told otherwise. Pure.
function a2yRoundWinner (totals, tieTo = 0) { const [a, b] = [a2Int(totals?.[0]), a2Int(totals?.[1])]; return a > b ? 0 : b > a ? 1 : tieTo }
// The outcome for a side that won `wins` of `rounds` (PG p.123). Pure.
function a2ySocialOutcome (wins, rounds) {
  const w = a2Int(wins); const r = Math.max(1, a2Int(rounds))
  if (w >= r) return { key: 'total', label: 'Total success', text: 'You get everything you wanted.' }
  if (w * 2 > r) return { key: 'partial', label: 'Partial success', text: 'You get much of it, with a cost or a condition.' }
  if (w > 0) return { key: 'partialDefeat', label: 'Partial defeat', text: 'You lose, with some mitigation.' }
  return { key: 'defeat', label: 'Total defeat', text: 'A serious setback: humiliation, lost standing, 1 Willpower, Social Asset dots or the like. It never dictates what your character feels.' }
}
// Where a prolonged task stands. rolls: [{ successes, ended }]. Pure.
function a2yTaskState ({ target = 5, limit = 5, rolls = [] } = {}) {
  const total = rolls.reduce((t, r) => t + Math.max(0, a2Int(r.successes)), 0)
  const used = rolls.length
  const broken = rolls.some((r) => r.ended)
  const state = broken ? 'ended' : total >= a2Int(target) ? 'done' : used >= a2Int(limit) ? 'failed' : 'open'
  return { total, used, left: Math.max(0, a2Int(limit) - used), need: Math.max(0, a2Int(target) - total), state }
}
// A drink of Vitae on a night. bond: { stage, drinks: [nights], last } → the bond after it. Pure.
//  interval in nights; ghoul: any drink gives at least stage 1; other3: another bond is already at stage 3.
function a2yBondDrink (bond, { night = 1, interval = 30, ghoul = false, other3 = false } = {}) {
  let b = a2yBondDecay(bond ?? { stage: 0, drinks: [], last: null }, night, interval)
  const drinks = [...(b.drinks ?? [])]
  const sameNight = drinks.includes(night)
  if (!sameNight) drinks.push(night)
  let stage = sameNight ? a2Int(b.stage) : Math.min(3, a2Int(b.stage) + 1)
  if (ghoul) stage = Math.max(1, stage)
  let note = sameNight ? 'A second drink in the same night doesn\'t deepen the bond.' : ''
  if (stage === 3 && other3) { stage = 2; note = 'Stage 3 is possible with only one vampire at a time: it stays at 2.' }
  return { ...b, stage, drinks: drinks.slice(-3), last: night, note }
}
// A gap longer than the interval drops a stage, once per interval missed (PG p.136). Pure.
function a2yBondDecay (bond, night, interval = 30) {
  const b = { stage: a2Int(bond?.stage), drinks: [...(bond?.drinks ?? [])], last: bond?.last ?? null }
  if (b.last === null || b.last === undefined || b.stage <= 0) return b
  const gaps = Math.floor(Math.max(0, a2Int(night) - a2Int(b.last) - 1) / Math.max(1, a2Int(interval)))
  if (gaps > 0) { b.stage = Math.max(0, b.stage - gaps); b.last = a2Int(b.last) + gaps * Math.max(1, a2Int(interval)); if (b.stage === 0) b.drinks = [] }
  return b
}
// Dice from a bond on one roll. Pure. role: 'thrall' (rolling against the master) | 'master' (rolling on the thrall).
function a2yBondDice (stage, role, { social = false, contested = false, attack = false } = {}) {
  const s = a2Clamp(a2Int(stage), 0, 3)
  if (!s) return 0
  if (role === 'thrall') return contested || attack ? -s : 0
  return social ? s : 0
}

const a2yState = { hooked: false, pending: new Map(), seen: new Set() }
function a2yOn () { return a2Enabled() && a2eGet('story', true) !== false }
function a2yActor () { return globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null }
function a2yEff (actor, kind, key) { const v = actor?.system?.[kind]?.[key]; return a2Int(v?.effective ?? v?.value) }
function a2yBestPool (actor, pools) { return [...pools].sort((x, y) => (a2yEff(actor, 'attributes', y[0]) + a2yEff(actor, 'skills', y[1])) - (a2yEff(actor, 'attributes', x[0]) + a2yEff(actor, 'skills', x[1])))[0] }
function a2yNight () { try { return a2Int(a2tClock().night, 1) } catch (e) { return 1 } }
function a2yTier (actor) { try { return a2Creature(actor) === 'vampire' ? a2cTierKey('vampire', actor.system?.vampire?.generation?.value) : 'neonate' } catch (e) { return 'neonate' } }

// ---- social conflict ----
function a2ySocial () { const s = a2eGet('social', null); return s && s.id ? s : null }
async function a2ySocialSave (s) { return game.settings.set(a2eNs(), a2eKey('social'), s) }
async function a2ySocialStart () {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller starts a social conflict.'); return null }
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Social conflict' },
    position: { width: 520 },
    content: `<div class="a2y-dialog"><p class="a2y-hint">For high-stakes debates only: standing, reputation or judgment on the line (PG p.121).</p>
      <div class="form-group"><label>What is argued</label><input type="text" name="title" placeholder="Before the Sheriff: who answers for the breach?"></div>
      <fieldset><legend>Side A (speaks first; wins ties)</legend><div class="form-group"><label>Who</label><input type="text" name="a" value="The coterie"></div><div class="form-group"><label>Goal</label><input type="text" name="ag"></div></fieldset>
      <fieldset><legend>Side B</legend><div class="form-group"><label>Who</label><input type="text" name="b" value="The opposition"></div><div class="form-group"><label>Goal</label><input type="text" name="bg"></div></fieldset>
      <div class="form-group"><label>Rounds</label><select name="rounds"><option value="3">3: quick, one scene</option><option value="5">5: a complex debate</option><option value="7">7: large or formal (Elysium, Conclave)</option></select></div></div>`,
    ok: { label: 'Begin', callback: (ev, button) => { const f = button.form.elements; return { title: f.title.value.trim() || 'Social conflict', sides: [{ name: f.a.value.trim() || 'Side A', goal: f.ag.value.trim() }, { name: f.b.value.trim() || 'Side B', goal: f.bg.value.trim() }], rounds: a2Int(f.rounds.value, 3) } } },
    rejectClose: false
  }).catch(() => null)
  if (!res) return null
  const s = { id: foundry.utils.randomID(8), ...res, round: 1, log: [], done: false }
  await a2ySocialSave(s)
  await a2ySocialCard(s)
  return s
}
async function a2ySocialCard (s) {
  return ChatMessage.create({ content: `<div class="a2y-social" data-id="${s.id}" data-round="${s.round}"><h4>${a2Esc(s.title)}</h4></div>`, speaker: { alias: 'Storyteller' }, flags: { world: { a2soc: { id: s.id, round: s.round } } } })
}
function a2ySocialTotals (s, round) { const out = [0, 0]; for (const r of s.log.filter((x) => x.round === round)) out[r.side] += a2Int(r.successes); return out }
async function a2ySocialSpeak (side, approachId, cardRound) {
  const s = a2ySocial()
  const actor = a2yActor()
  if (!s || s.done || s.round !== cardRound) { ui.notifications.info('That round is over.'); return null }
  if (!actor) { ui.notifications.warn('Select the token that speaks.'); return null }
  const ap = A2Y_APPROACHES.find((x) => x.id === approachId) ?? A2Y_APPROACHES[0]
  const pool = a2yBestPool(actor, ap.pools)
  a2yState.pending.set(actor.uuid, { kind: 'social', id: s.id, round: s.round, side, approach: ap.label, at: Date.now() })
  return a2eOpenRoll(actor, { attributes: [pool[0]], skills: [pool[1]], disciplines: [] })
}
async function a2ySocialClose () {
  const s = a2ySocial()
  if (!s || s.done || !game.user.isGM) return null
  const totals = a2ySocialTotals(s, s.round)
  let tieTo = 0
  if (totals[0] === totals[1]) {
    const pick = await foundry.applications.api.DialogV2.wait({ window: { title: 'A tie' }, content: `<p>Both sides have ${totals[0]}. Ties go to the higher Attribute or to the initiator, at your choice (PG p.122).</p>`, buttons: [{ action: '0', label: a2Esc(s.sides[0].name) }, { action: '1', label: a2Esc(s.sides[1].name) }], rejectClose: false }).catch(() => null)
    if (pick === null || pick === undefined) return null
    tieTo = a2Int(pick)
  }
  const winner = a2yRoundWinner(totals, tieTo)
  s.wins = [...(s.wins ?? []), winner]
  if (s.round >= s.rounds) {
    s.done = true
    await a2ySocialSave(s)
    const w = [s.wins.filter((x) => x === 0).length, s.wins.filter((x) => x === 1).length]
    const o = [a2ySocialOutcome(w[0], s.rounds), a2ySocialOutcome(w[1], s.rounds)]
    const losers = o.map((x, i) => (x.key === 'defeat' ? [...new Set(s.log.filter((r) => r.side === i).map((r) => r.uuid))] : []))
    await ChatMessage.create({ content: `<div class="a2y-outcome"><h4>${a2Esc(s.title)}: decided</h4>${[0, 1].map((i) => `<p><strong>${a2Esc(s.sides[i].name)}</strong> won ${w[i]} of ${s.rounds}: <em>${o[i].label}</em>. ${a2Esc(o[i].text)}${s.sides[i].goal ? ` <small>Goal: ${a2Esc(s.sides[i].goal)}</small>` : ''}</p>`).join('')}</div>`, speaker: { alias: 'Storyteller' }, flags: { world: { a2socEnd: { losers: losers.flat() } } } })
  } else {
    s.round += 1
    await a2ySocialSave(s)
    await a2ySocialCard(s)
  }
  return s
}
function a2ySocialRender (message, root) {
  const f = message.flags?.world?.a2soc
  const box = root.querySelector('.a2y-social')
  if (!f || !box || box.querySelector('.a2y-sides')) return
  const s = a2ySocial()
  if (!s || s.id !== f.id) { box.insertAdjacentHTML('beforeend', '<p class="a2y-dim">This conflict is over.</p>'); return }
  const live = !s.done && s.round === f.round
  const totals = a2ySocialTotals(s, f.round)
  const won = s.wins?.[f.round - 1]
  const wrap = document.createElement('div')
  wrap.className = 'a2y-sides'
  wrap.innerHTML = `<p class="a2y-round">Round ${f.round} of ${s.rounds}${won !== undefined ? `: <strong>${a2Esc(s.sides[won].name)}</strong> takes it` : ''}</p>` + [0, 1].map((i) => {
    const rolls = s.log.filter((r) => r.round === f.round && r.side === i)
    return `<div class="a2y-side ${won === i ? 'won' : ''}"><div class="a2y-side-head"><strong>${a2Esc(s.sides[i].name)}</strong><span class="a2y-total">${totals[i]}</span></div>${s.sides[i].goal ? `<small>${a2Esc(s.sides[i].goal)}</small>` : ''}${rolls.map((r) => `<div class="a2y-roll">${a2Esc(r.name)}: ${a2Esc(r.approach)}, ${r.successes}</div>`).join('')}${live ? `<div class="a2y-speak"><select data-side="${i}">${A2Y_APPROACHES.map((a) => `<option value="${a.id}">${a.label}</option>`).join('')}</select><button type="button" data-speak="${i}"><i class="fa-solid fa-comment"></i> Speak</button></div>` : ''}</div>`
  }).join('') + (live && game.user.isGM ? `<button type="button" data-close="1" ${totals[0] + totals[1] === 0 && !s.log.some((r) => r.round === f.round) ? 'disabled' : ''}><i class="fa-solid fa-gavel"></i> Close the round</button>` : '')
  wrap.querySelectorAll('button[data-speak]').forEach((b) => b.addEventListener('click', (ev) => { ev.preventDefault(); const i = a2Int(b.dataset.speak); a2ySocialSpeak(i, wrap.querySelector(`select[data-side="${i}"]`).value, f.round) }))
  wrap.querySelector('button[data-close]')?.addEventListener('click', (ev) => { ev.preventDefault(); a2ySocialClose() })
  box.append(wrap)
}

// ---- prolonged tasks ----
async function a2yTaskStart (preset = {}) {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller sets up a prolonged task.'); return null }
  const attrs = typeof A2L_ATTRS !== 'undefined' ? A2L_ATTRS : []
  const skills = typeof A2L_SKILLS !== 'undefined' ? A2L_SKILLS : []
  const opt = (list, cfg, cur) => list.map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${a2Esc(a2TraitLabel(cfg, k))}</option>`).join('')
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Prolonged task' },
    position: { width: 480 },
    content: `<div class="a2y-dialog"><div class="form-group"><label>The task</label><input type="text" name="title" placeholder="Crack the ledger's cipher" value="${a2Esc(preset.title ?? '')}"></div>
      <div class="form-group"><label>Pool</label><select name="attr">${opt(attrs, 'Attributes', preset.test?.attributes?.[0] ?? 'intelligence')}</select><span>+</span><select name="skill">${opt(skills, 'Skills', preset.test?.skills?.[0] ?? 'investigation')}</select></div>
      <div class="form-group"><label>Successes needed</label><select name="target"><option value="3">3: mildly complex</option><option value="5" selected>5: relatively complex</option><option value="7">7: very complex</option><option value="10">10: extremely complex</option></select></div>
      <div class="form-group"><label>Tests allowed</label><select name="limit"><option value="3">3: heavy pressure</option><option value="5" selected>5: urgent</option><option value="7">7: time is limited, pressure low</option></select></div>
      <p class="a2y-hint">Successes add up. A painful or bestial failure ends the task at once (PG p.112).</p></div>`,
    ok: { label: 'Start', callback: (ev, button) => { const f = button.form.elements; return { title: f.title.value.trim() || 'Prolonged task', test: { attributes: [f.attr.value], skills: [f.skill.value], disciplines: [] }, target: a2Int(f.target.value, 5), limit: a2Int(f.limit.value, 5) } } },
    rejectClose: false
  }).catch(() => null)
  if (!res) return null
  return ChatMessage.create({ content: `<div class="a2y-task"><h4>${a2Esc(res.title)}</h4></div>`, speaker: { alias: 'Storyteller' }, flags: { world: { a2task: { v: 1, ...res, rolls: [] } } } })
}
function a2yTaskRender (message, root) {
  const t = message.flags?.world?.a2task
  const box = root.querySelector('.a2y-task')
  if (!t || !box || box.querySelector('.a2y-bar')) return
  const st = a2yTaskState(t)
  const pct = Math.min(100, Math.round((st.total / Math.max(1, t.target)) * 100))
  const label = { open: `${st.need} more needed, ${st.left} ${st.left === 1 ? 'test' : 'tests'} left`, done: 'Done.', failed: 'Out of tests: the task fails. The Storyteller decides whether the progress is kept.', ended: 'A painful or bestial failure ends the task.' }[st.state]
  const pool = [...(t.test.attributes ?? []).map((k) => a2TraitLabel('Attributes', k)), ...(t.test.skills ?? []).map((k) => a2TraitLabel('Skills', k))].join(' + ')
  box.insertAdjacentHTML('beforeend', `<p class="a2y-dim">${a2Esc(pool)} · ${t.target} successes within ${t.limit} tests</p><div class="a2y-bar ${st.state}"><div style="width:${pct}%"></div><span>${st.total} / ${t.target}</span></div>${t.rolls.map((r, i) => `<div class="a2y-roll">${i + 1}. ${a2Esc(r.name)}: ${r.successes}${r.ended ? ' (ends the task)' : ''}</div>`).join('')}<p class="a2y-state">${label}</p>`)
  if (st.state === 'open') {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = '<i class="fa-solid fa-dice-d10"></i> Work on it'
    b.addEventListener('click', (ev) => {
      ev.preventDefault()
      const actor = a2yActor()
      if (!actor) { ui.notifications.warn('Select the token that works on it.'); return }
      a2yState.pending.set(actor.uuid, { kind: 'task', id: message.id, at: Date.now() })
      a2eOpenRoll(actor, { attributes: [...t.test.attributes], skills: [...t.test.skills], disciplines: [] })
    })
    box.append(b)
  }
}

// ---- rolls made from those cards ----
function a2yOnCreate (message, options, userId) {
  try {
    if (userId !== game.user.id) return
    const roll = message.rolls?.find((r) => r?.options?.a2?.built)
    const actor = roll ? a2xSpeaker(message) : null
    const p = actor ? a2yState.pending.get(actor.uuid) : null
    if (!p || Date.now() - p.at > 180000) return
    a2yState.pending.delete(actor.uuid)
    message.update({ 'flags.world.a2yOf': { ...p, uuid: actor.uuid, name: actor.name } })
  } catch (e) { console.error('V6 Automation | story roll', e) }
}
async function a2yOnUpdate (message, change) {
  try {
    const p = change?.flags?.world?.a2yOf
    if (!p || !a2xIsGM() || a2yState.seen.has(message.id)) return
    a2yState.seen.add(message.id)
    const roll = message.rolls?.find((r) => r?.options?.a2?.built)
    if (!roll) return
    const v = a2RollVerdict(roll)
    const successes = a2Int(v.successes ?? roll.total)
    if (p.kind === 'social') {
      const s = a2ySocial()
      if (!s || s.id !== p.id || s.done || s.round !== p.round) return
      s.log.push({ round: p.round, side: p.side, uuid: p.uuid, name: p.name, approach: p.approach, successes })
      await a2ySocialSave(s)
    } else if (p.kind === 'task') {
      const card = game.messages.get(p.id)
      const t = card?.flags?.world?.a2task
      if (!t || a2yTaskState(t).state !== 'open') return
      await card.update({ 'flags.world.a2task.rolls': [...t.rolls, { uuid: p.uuid, name: p.name, successes, ended: Boolean(v.painful || v.bestial) }] })
    }
  } catch (e) { console.error('V6 Automation | story roll', e) }
}

// ---- Blood Bonds ----
function a2yBonds (actor) { const b = actor?.flags?.world?.a2?.bonds; return Array.isArray(b) ? b : [] }
// thrall drinks from master (an actor, or just a name).
async function a2yDrink (thrall, master, { night = null, quiet = false } = {}) {
  if (!thrall || !master) return null
  if (typeof a2wVinculum === 'function' && a2wVinculum(thrall)) { if (!quiet) ui.notifications.info(`${thrall.name} is in a vinculum: no Blood Bond can form (PG p.135).`); return null } // eslint-disable-line no-undef
  const name = typeof master === 'string' ? master : master.name
  const uuid = typeof master === 'string' ? null : master.uuid
  const tier = typeof master === 'string' ? 'neonate' : a2yTier(master)
  // Duskborn blood can't bond Kindred (PG p.135)
  if (tier === 'duskborn' && a2Creature(thrall) === 'vampire' && a2yTier(thrall) !== 'duskborn') { if (!quiet) ui.notifications.info('Duskborn blood can\'t bond Kindred (PG p.135).'); return null }
  const list = a2yBonds(thrall).map((b) => ({ ...b }))
  let bond = list.find((b) => (uuid && b.uuid === uuid) || b.name === name)
  if (!bond) { bond = { id: foundry.utils.randomID(8), name, uuid, tier, stage: 0, drinks: [], last: null }; list.push(bond) }
  const n = night ?? a2yNight()
  const next = a2yBondDrink(bond, { night: n, interval: A2Y_INTERVAL[bond.tier] ?? 30, ghoul: a2Creature(thrall) === 'ghoul', other3: list.some((b) => b !== bond && a2Int(b.stage) >= 3) })
  const before = a2Int(bond.stage)
  Object.assign(bond, { stage: next.stage, drinks: next.drinks, last: next.last })
  await thrall.update({ 'flags.world.a2.bonds': list })
  if (!quiet) {
    const names = ['', 'Fascination', 'Devotion', 'Obsession']
    await ChatMessage.create({ content: `<div class="a2y-bond"><p><strong>${a2Esc(thrall.name)}</strong> drinks from <strong>${a2Esc(name)}</strong>: ${next.stage > before ? `Blood Bond stage ${next.stage}, ${names[next.stage]} (−${next.stage} against the master's will; PG p.136).` : next.stage ? `the bond stays at stage ${next.stage}.` : `drink ${next.drinks.length} of 3 toward a Blood Bond.`}${next.note ? ` ${a2Esc(next.note)}` : ''}</p></div>`, speaker: { alias: 'Storyteller' }, whisper: game.users.filter((u) => u.isGM || thrall.testUserPermission(u, 'OWNER')).map((u) => u.id) })
  }
  return bond
}
// Dice for the roll dialog (alpha2-states calls this). → { dice, note } or null
function a2yBondMods (actor, foe, roll) {
  if (!a2yOn() || !actor || !foe) return null
  const mine = a2yBonds(actor).find((b) => (b.uuid && b.uuid === foe.uuid) || b.name === foe.name)
  if (mine?.stage) { const d = a2yBondDice(mine.stage, 'thrall', { contested: roll.contested, attack: Boolean(roll.attack) }); if (d) return { dice: d, note: `Blood Bond to ${foe.name}, stage ${mine.stage}: ${d} acting against the master's will (PG p.136).` } }
  const theirs = a2yBonds(foe).find((b) => (b.uuid && b.uuid === actor.uuid) || b.name === actor.name)
  if (theirs?.stage) { const social = (roll.attributes ?? []).some((k) => ['charisma', 'manipulation'].includes(k)) || (roll.disciplines ?? []).some((k) => ['dominate', 'presence'].includes(k)); const d = a2yBondDice(theirs.stage, 'master', { social }); if (d) return { dice: d, note: `${foe.name} is your thrall, stage ${theirs.stage}: +${d} to command or influence it (PG p.136).` } }
  return null
}
async function a2yBondsOpen (actorLike = null) {
  const actor = actorLike?.documentName === 'Actor' ? actorLike : a2yActor()
  if (!actor) { ui.notifications.warn('Select a token first.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You can't change ${actor.name}.`); return null }
  const bonds = a2yBonds(actor)
  const target = [...(game.user?.targets ?? [])].map((t) => t.actor).find((a) => a && a.uuid !== actor.uuid)
  const names = ['none yet', '1 Fascination', '2 Devotion', '3 Obsession']
  const rows = bonds.length ? bonds.map((b, i) => `<tr><td>${a2Esc(b.name)}</td><td><select name="stage${i}">${[0, 1, 2, 3].map((s) => `<option value="${s}" ${a2Int(b.stage) === s ? 'selected' : ''}>${names[s]}</option>`).join('')}</select></td><td class="c">${(b.drinks ?? []).length}/3</td><td class="c">${b.last ?? '–'}</td><td class="c"><input type="checkbox" name="drop${i}" title="Remove this bond"></td></tr>`).join('') : '<tr><td colspan="5"><em>No bonds.</em></td></tr>'
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Blood Bonds: ${actor.name}` },
    position: { width: 560 },
    content: `<div class="a2y-dialog"><table class="a2y-table"><tr><th>Bound to</th><th>Stage</th><th class="c">Drinks</th><th class="c">Last night</th><th class="c">Drop</th></tr>${rows}</table>
      <fieldset><legend>A drink tonight (night ${a2yNight()})</legend><div class="form-group"><label>From</label><input type="text" name="from" value="${a2Esc(target?.name ?? '')}" placeholder="${target ? '' : 'Target the donor, or type a name'}"></div><p class="a2y-hint">At least 1 Vitae, no more than an hour old. Three drinks on different nights within the donor's interval (a month for a neonate, six for an ancilla, a year for an elder) make stages 1 to 3 (PG p.135).</p></fieldset></div>`,
    ok: { label: 'Apply', callback: (ev, button) => { const f = button.form.elements; return { from: f.from.value.trim(), stages: bonds.map((b, i) => a2Int(f[`stage${i}`].value)), drop: bonds.map((b, i) => f[`drop${i}`].checked) } } },
    rejectClose: false
  }).catch(() => null)
  if (!res) return null
  const list = bonds.map((b, i) => ({ ...b, stage: res.stages[i] })).filter((b, i) => !res.drop[i])
  if (JSON.stringify(list) !== JSON.stringify(bonds)) await actor.update({ 'flags.world.a2.bonds': list })
  if (res.from) await a2yDrink(actor, target && target.name === res.from ? target : res.from)
  return res
}
// New Night (alpha2-tools calls this): bonds left alone too long weaken.
async function a2yNightBonds (actors, night) {
  const lines = []
  for (const a of actors ?? []) {
    const bonds = a2yBonds(a)
    if (!bonds.length) continue
    const next = bonds.map((b) => ({ ...b, ...a2yBondDecay(b, night, A2Y_INTERVAL[b.tier] ?? 30) }))
    next.forEach((b, i) => { if (b.stage < a2Int(bonds[i].stage)) lines.push(`${a.name}'s bond to ${b.name} weakens to ${b.stage ? `stage ${b.stage}` : 'nothing'}.`) })
    const kept = next.filter((b) => b.stage > 0 || (b.drinks ?? []).length)
    if (JSON.stringify(kept) !== JSON.stringify(bonds)) { try { await a.update({ 'flags.world.a2.bonds': kept }) } catch (e) { console.error('V6 Automation | bonds at New Night', e) } }
  }
  if (lines.length) await ChatMessage.create({ content: `<div class="a2y-bond"><h4>Blood Bonds</h4>${lines.map((l) => `<p>${a2Esc(l)}</p>`).join('')}</div>`, speaker: { alias: 'Storyteller' }, whisper: game.users.filter((u) => u.isGM).map((u) => u.id) })
  return lines
}

// ---- downtime ----
async function a2yDowntime (actorLike = null) {
  const actor = actorLike?.documentName === 'Actor' ? actorLike : a2yActor()
  if (!actor) { ui.notifications.warn('Select your token first.'); return null }
  if (!actor.isOwner) { ui.notifications.warn(`You don't own ${actor.name}.`); return null }
  const used = a2Int(actor.flags?.world?.a2?.downtime?.used)
  const resources = actor.items.filter((i) => i.type === 'resource')
  const resOpts = resources.map((r) => `<option value="${r.id}">${a2Esc(r.name)} (${a2Int(r.system?.dots?.value)})</option>`).join('')
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Downtime: ${actor.name}` },
    position: { width: 560 },
    content: `<div class="a2y-dialog"><p class="a2y-hint">Normally 2 actions between stories; ${used} used so far (PG p.112). The Storyteller resets the count with /v6 downtime reset.</p>
      ${A2Y_DOWNTIME.map((d, i) => `<label class="a2y-pick"><input type="radio" name="action" value="${d.id}" ${i === 0 ? 'checked' : ''}> <span><strong>${d.label}</strong><br><small>${d.text}</small></span></label>`).join('')}
      <fieldset><legend>Resources (for the four Resource actions)</legend>
        <div class="form-group"><label>Resource</label><select name="res"><option value="">a new one</option>${resOpts}</select><input type="text" name="newName" placeholder="Name of the new Resource"></div>
        <div class="form-group"><label>Dots</label><input type="number" name="dots" value="1" min="1" max="4"><label>Move them to</label><select name="to"><option value="">–</option>${resOpts}</select></div>
      </fieldset>
      <div class="form-group"><label>What you do</label><input type="text" name="note" placeholder="Two weeks leaning on the dockers' union"></div></div>`,
    ok: { label: 'Take the action', callback: (ev, button) => { const f = button.form.elements; return { action: f.action.value, res: f.res.value, newName: f.newName.value.trim(), dots: Math.max(1, a2Int(f.dots.value, 1)), to: f.to.value, note: f.note.value.trim() } } },
    rejectClose: false
  }).catch(() => null)
  if (!res) return null
  const def = A2Y_DOWNTIME.find((d) => d.id === res.action)
  const item = actor.items.get(res.res)
  const dotsOf = (i) => a2Int(i?.system?.dots?.value)
  let line = def.text
  try {
    if (def.res === 'gain') {
      if (item) { if (dotsOf(item) >= 5) { ui.notifications.warn(`${item.name} is already at 5 dots.`); return null } await item.update({ 'system.dots.value': dotsOf(item) + 1 }); line = `${item.name} rises to ${dotsOf(item)} dots.` } else { const made = await actor.createEmbeddedDocuments('Item', [{ name: res.newName || 'New Resource', type: 'resource', img: 'icons/svg/coins.svg', system: { description: '', dots: { value: 1, max: 5 }, resourceType: 'physicalAssets' } }]); line = `New Resource: ${made[0].name}, 1 dot.` }
    } else if (def.res === 'move') {
      const to = actor.items.get(res.to)
      const n = Math.min(3, res.dots, dotsOf(item), 5 - dotsOf(to))
      if (!item || !to || item.id === to.id || n < 1) { ui.notifications.warn('Pick the Resource to take dots from and the one to move them to.'); return null }
      await item.update({ 'system.dots.value': dotsOf(item) - n }); await to.update({ 'system.dots.value': dotsOf(to) + n }); line = `${n} ${n === 1 ? 'dot' : 'dots'} moved from ${item.name} to ${to.name}.`
    } else if (def.res === 'recover') {
      if (!item) { ui.notifications.warn('Pick the Resource to restore.'); return null }
      const n = Math.min(2, res.dots, 5 - dotsOf(item)); await item.update({ 'system.dots.value': dotsOf(item) + n }); line = `${item.name}: ${n} spent ${n === 1 ? 'dot' : 'dots'} restored (now ${dotsOf(item)}).`
    } else if (def.res === 'spend') {
      if (!item || dotsOf(item) < 3) { ui.notifications.warn('Repairing the Masquerade costs 3 dots of one Resource. For several Resources (4 dots), lower them by hand.'); return null }
      await item.update({ 'system.dots.value': dotsOf(item) - 3 }); line = `${item.name} spends 3 dots (now ${dotsOf(item)}): the Masquerade Tracker goes down by 1.`
      const masq = globalThis.V6Alpha2?.tools?.masquerade
      if (game.user.isGM && masq?.clear) await masq.clear(1, `${actor.name} repairs the Masquerade`); else line += ' Storyteller: lower the tracker.'
    }
    await actor.update({ 'flags.world.a2.downtime': { used: used + 1 } })
  } catch (e) { console.error('V6 Automation | downtime', e); ui.notifications.error('The downtime action could not be applied. See the console (F12).'); return null }
  await ChatMessage.create({ content: `<div class="a2y-downtime"><h4>Downtime: ${a2Esc(def.label)}</h4>${res.note ? `<p><em>${a2Esc(res.note)}</em></p>` : ''}<p>${a2Esc(line)}</p><p class="a2y-dim">Action ${used + 1}${used + 1 > 2 ? ' (more than the usual 2: the Storyteller allows it)' : ' of 2'}.</p></div>`, speaker: ChatMessage.getSpeaker({ actor }) })
  return res
}
async function a2yDowntimeReset () {
  if (!game.user.isGM) return
  let n = 0
  for (const a of game.actors) if (a.flags?.world?.a2?.downtime?.used) { await a.update({ 'flags.world.a2.downtime': { used: 0 } }); n++ }
  ui.notifications.info(`Downtime actions reset for ${n} ${n === 1 ? 'character' : 'characters'}.`)
}

// ---- complications on a painful failure ----
async function a2yComplication (message) {
  const actor = a2xSpeaker(message)
  if (!actor) return null
  const pick = await foundry.applications.api.DialogV2.wait({
    window: { title: 'Complication' },
    position: { width: 440 },
    content: `<div class="a2y-dialog"><p class="a2y-hint">A painful failure brings a complication; player and Storyteller tell it together (PG p.97).</p><div class="form-group"><label>What happens</label><input type="text" name="text" placeholder="The lock-pick snaps off in the door"></div><div class="form-group"><label>How much</label><select name="n"><option value="1">1</option><option value="2">2</option><option value="3">3</option></select><select name="track"><option value="health">Health</option><option value="willpower">Willpower</option></select></div><p class="a2y-dim">"How much" is the dice for Expose Vulnerability (1 or 2) or the points for Suffer Harm (1 to 3).</p></div>`,
    buttons: A2Y_COMPLICATIONS.map((c) => ({ action: c.id, label: c.label, icon: `fa-solid ${c.icon}`, callback: (ev, button) => ({ kind: c.id, text: button.form.elements.text.value.trim(), n: a2Int(button.form.elements.n.value, 1), track: button.form.elements.track.value }) })),
    rejectClose: false
  }).catch(() => null)
  if (!pick || typeof pick !== 'object') return null
  const def = A2Y_COMPLICATIONS.find((c) => c.id === pick.kind)
  let line = def.label
  try {
    if (pick.kind === 'expose') { const n = Math.min(2, pick.n); await a2zAddEdge(actor, { label: 'Exposed vulnerability', dice: n, when: 'foe-any' }); line = `Expose vulnerability: an opponent gets +${n} on its next test against ${actor.name}.` } else if (pick.kind === 'harm') {
      if (pick.track === 'willpower') { const wp = a2Int(actor.system?.willpower?.value); await actor.update({ 'system.willpower.value': Math.max(0, wp - pick.n) }); line = `Suffer harm: ${actor.name} loses ${Math.min(wp, pick.n)} Willpower.` } else { await a2xApplyDamage([actor], { amount: pick.n, margin: 0, ignoreEndurance: true, armour: false, source: 'Complication', chat: false }); line = `Suffer harm: ${actor.name} loses ${pick.n} Health.` }
    } else if (pick.kind === 'attention') line = 'Draw attention. Storyteller: mark the Masquerade Tracker if mortals noticed.'
  } catch (e) { console.error('V6 Automation | complication', e) }
  await message.update({ 'flags.world.a2comp': { kind: pick.kind, line, text: pick.text, by: game.user.name } })
  return pick
}
function a2yComplicationRender (message, root) {
  const roll = message.rolls?.find((r) => r?.options?.a2?.built)
  if (!roll || root.querySelector('.a2y-comp')) return
  const done = message.flags?.world?.a2comp
  const anchor = root.querySelector('.a2-result') ?? root.querySelector('.message-content')
  if (done) { anchor?.insertAdjacentHTML('beforeend', `<div class="a2y-comp a2x-line"><strong>Complication:</strong> ${a2Esc(done.line)}${done.text ? ` <em>${a2Esc(done.text)}</em>` : ''}</div>`); return }
  let v = null
  try { v = a2RollVerdict(roll) } catch (e) { return }
  const actor = a2xSpeaker(message)
  if (!v?.painful || roll.options.a2.frenzyTest || !(actor?.isOwner || game.user.isGM)) return
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'a2y-comp a2x-btn'
  b.innerHTML = '<i class="fa-solid fa-burst"></i> Complication'
  b.title = 'Pick the complication this painful failure brings (PG p.97)'
  b.addEventListener('click', (ev) => { ev.preventDefault(); a2yComplication(message) })
  ;(root.querySelector('.a2-actions') ?? anchor)?.append(b)
}

function a2yRenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root || !a2yOn()) return
  a2ySocialRender(message, root)
  a2yTaskRender(message, root)
  a2yComplicationRender(message, root)
  const end = message.flags?.world?.a2socEnd
  const box = root.querySelector('.a2y-outcome')
  if (end?.losers?.length && box && !box.querySelector('button') && game.user.isGM && !message.flags.world.a2socEnd.paid) {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = '<i class="fa-solid fa-brain"></i> Total defeat: −1 Willpower for its speakers'
    b.addEventListener('click', async (ev) => { ev.preventDefault(); for (const u of end.losers) { const a = a2FromUuid(u); if (a) await a.update({ 'system.willpower.value': Math.max(0, a2Int(a.system?.willpower?.value) - 1) }) } await message.update({ 'flags.world.a2socEnd.paid': true }) })
    box.append(b)
  }
}

function a2yInjectStyles () {
  document.getElementById('v6a-story-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-story-style'
  style.textContent = `
.a2y-social h4, .a2y-task h4, .a2y-outcome h4, .a2y-downtime h4, .a2y-bond h4 { margin: 0 0 4px; font-weight: 700; }
.a2y-round { margin: 0 0 6px; }
.a2y-sides { display: flex; flex-direction: column; gap: 6px; }
.a2y-side { border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 5px; padding: 5px 8px; }
.a2y-side.won { border-color: #d2aa5a; box-shadow: inset 0 0 12px rgba(210, 170, 90, 0.18); }
.a2y-side-head { display: flex; justify-content: space-between; align-items: baseline; }
.a2y-total { font-size: 20px; font-weight: 700; }
.a2y-side small, .a2y-dim { opacity: 0.7; font-size: 12px; }
.a2y-roll { font-size: 12.5px; }
.a2y-speak { display: flex; gap: 6px; margin-top: 4px; }
.a2y-speak select { flex: 1; }
.a2y-speak button { flex: 0 0 auto; width: auto; padding: 0 10px; line-height: 1.6; }
.a2y-bar { position: relative; height: 20px; border-radius: 10px; overflow: hidden; background: color-mix(in srgb, currentColor 14%, transparent); margin: 4px 0; }
.a2y-bar div { height: 100%; background: linear-gradient(90deg, #7c121b, #d0303c); transition: width 0.3s; }
.a2y-bar.done div { background: linear-gradient(90deg, #8a6a24, #d2aa5a); }
.a2y-bar.failed div, .a2y-bar.ended div { background: #555; }
.a2y-bar span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px #000; }
.a2y-state { margin: 4px 0; }
.a2y-dialog .form-group span { flex: 0 0 auto; padding: 0 6px; }
.a2y-hint { margin: 4px 0; padding: 4px 8px; border-left: 3px solid #7a0000; background: color-mix(in srgb, currentColor 6%, transparent); font-size: 12.5px; }
.a2y-pick { display: flex; align-items: flex-start; gap: 8px; margin: 3px 0; }
.a2y-pick small { opacity: 0.7; }
.a2y-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
.a2y-table td, .a2y-table th { padding: 3px 5px; text-align: left; }
.a2y-table .c { text-align: center; }
`
  document.head.appendChild(style)
}

async function a2StoryBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.story?.booted) return true
  a2eReg('story', { name: 'Social conflict, tasks, bonds, downtime, complications', hint: 'Round cards for social conflict, progress cards for prolonged tasks, Blood Bond tracking with its dice, the downtime actions, and a Complication button on painful failures.', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('social', { scope: 'world', config: false, type: Object, default: {} })
  a2yInjectStyles()
  if (!a2yState.hooked) {
    a2yState.hooked = true
    Hooks.on('createChatMessage', a2yOnCreate)
    Hooks.on('updateChatMessage', a2yOnUpdate)
    Hooks.on('renderChatMessageHTML', (message, html) => { try { a2yRenderChat(message, html) } catch (e) { console.error('V6 Automation | story card', e) } })
    // the conflict's state changed: redraw its round cards for everyone
    Hooks.on('updateSetting', (setting) => { if (setting?.key === `${a2eNs()}.${a2eKey('social')}`) for (const m of game.messages.contents.slice(-40)) if (m.flags?.world?.a2soc) ui.chat?.updateMessage?.(m) })
    Hooks.on('createSetting', (setting) => { if (setting?.key === `${a2eNs()}.${a2eKey('social')}`) for (const m of game.messages.contents.slice(-40)) if (m.flags?.world?.a2soc) ui.chat?.updateMessage?.(m) })
    Hooks.on('v6a2NewNight', ({ actors, night } = {}) => { if (a2yOn() && game.user.isGM) a2yNightBonds(actors, night).catch((e) => console.error('V6 Automation | bonds', e)) })
    Hooks.on('getSceneControlButtons', (controls) => {
      const tools = controls?.tokens?.tools
      if (!tools || !a2yOn()) return
      if (game.user?.isGM) {
        tools['v6a2-social'] = { name: 'v6a2-social', title: 'Social conflict', icon: 'fa-solid fa-comments', order: 107, button: true, onChange: () => a2ySocialStart() }
        tools['v6a2-task'] = { name: 'v6a2-task', title: 'Prolonged task', icon: 'fa-solid fa-bars-progress', order: 108, button: true, onChange: () => a2yTaskStart() }
      }
      tools['v6a2-bonds'] = { name: 'v6a2-bonds', title: 'Blood Bonds', icon: 'fa-solid fa-heart-crack', order: 109, button: true, onChange: () => a2yBondsOpen() }
      tools['v6a2-downtime'] = { name: 'v6a2-downtime', title: 'Downtime action', icon: 'fa-solid fa-hourglass-half', order: 110, button: true, onChange: () => a2yDowntime() }
    })
    try { ui.controls?.render?.({ reset: true }) } catch (e) { /* controls not drawn yet */ }
  }
  api.story = { booted: true, social: a2ySocialStart, closeRound: a2ySocialClose, task: a2yTaskStart, bonds: a2yBondsOpen, drink: a2yDrink, downtime: a2yDowntime, downtimeReset: a2yDowntimeReset, complication: a2yComplication, rules: { roundWinner: a2yRoundWinner, socialOutcome: a2ySocialOutcome, taskState: a2yTaskState, bondDrink: a2yBondDrink, bondDecay: a2yBondDecay, bondDice: a2yBondDice } }
  console.log('V6 Automation | social conflict, tasks, bonds and downtime loaded')
  return true
}
globalThis.a2StoryBoot ??= a2StoryBoot

// ---- the Storyteller's table: dashboard, tokens, coterie, NPC maker, hunts, vinculum, recap, reactions
// Dashboard   one window with every player character (and the tokens on the scene):
//             Health, Vitae, Hunger, Willpower, Humanity, states, bonds, XP; the night
//             clock and the Masquerade Tracker on top. It updates as things change.
// Tokens      new tokens get a Health bar and a Vitae bar; a mortal at 0 Health is
//             marked defeated; torpor set by the tools shows as the Torpor state.
// Coterie     a shared page: name, domain, haven, notes, shared Resources (the
//             Storyteller edits them), and each member's own Resources and herd.
// NPC maker   kind, category and three pools make a full sheet by the Storyteller
//             Packet's rules (ST p.40-51): Attributes at half the pool, Skills to fill
//             it, Health and Willpower from the table, a token ready to drop.
// Group hunt  a card with each character's Hunger and a Hunt button for its player.
// Vaulderie   binds the chosen characters in a vinculum: their Blood Bonds end, new
//             ones are blocked, and −2 comes off tests against a packmate (PG p.135).
// Recap       /recap writes what happened since the last one into a journal page.
// Reactions   "Use a reaction" on a turn card offers the character's reaction powers
//             and Blood Surge, then ticks the counter.
//
// Settings (world): tokenSetup (on), tableTools (on). Data: world settings coterie,
// recapAt; flags.world.a2.vinculum on a character; flags.world.a2.npc on a made NPC.

const A2W_COMPETENCE = [[2, 'Weak'], [4, 'Average'], [6, 'Good'], [8, 'Expert'], [10, 'Extraordinary']] // ST p.50
// Starting points only: the pools are the Storyteller's to set.
const A2W_ROLES = [
  { id: 'custom', label: 'Custom', p: 4, s: 4, m: 4 },
  { id: 'bystander', label: 'Bystander', p: 2, s: 3, m: 3 },
  { id: 'thug', label: 'Thug', p: 5, s: 3, m: 2 },
  { id: 'officer', label: 'Police officer', p: 5, s: 4, m: 4 },
  { id: 'detective', label: 'Detective', p: 4, s: 5, m: 6 },
  { id: 'hunter', label: 'Hunter', p: 6, s: 4, m: 5 },
  { id: 'socialite', label: 'Socialite', p: 2, s: 7, m: 4 },
  { id: 'scholar', label: 'Scholar', p: 2, s: 4, m: 7 },
  { id: 'soldier', label: 'Soldier', p: 7, s: 3, m: 4 },
  { id: 'animal', label: 'Guard animal', p: 5, s: 2, m: 2 },
  { id: 'neonate', label: 'Neonate', p: 5, s: 5, m: 4 },
  { id: 'hound', label: 'Hound or enforcer', p: 7, s: 5, m: 5 },
  { id: 'primogen', label: 'Elder schemer', p: 6, s: 9, m: 8 }
]
const A2W_SKILL_CATS = { physical: ['athletics', 'fighting', 'shooting', 'survival'], social: ['expression', 'persuasion', 'subterfuge'], mental: ['awareness', 'craft', 'investigation', 'knowledge', 'medicine', 'sabotage'] }
const A2W_ATTR_CATS = { physical: ['strength', 'dexterity', 'stamina'], social: ['charisma', 'manipulation', 'composure'], mental: ['intelligence', 'wits', 'resolve'] }

// ---- pure rules ----
// The sheet numbers for an NPC built from pools (ST p.42-43, p.50). Pure.
//  kind: human | ghoul | vampire | animal ; category: minion | minor | standard | major
function a2wNpcStats ({ kind = 'human', category = 'minor', physical = 4, social = 4, mental = 4 } = {}) {
  const pools = { physical: a2Clamp(a2Int(physical), 1, 12), social: a2Clamp(a2Int(social), 1, 12), mental: a2Clamp(a2Int(mental), 1, 12) }
  const attr = {}
  const skill = {}
  for (const cat of ['physical', 'social', 'mental']) { attr[cat] = Math.ceil(pools[cat] / 2); skill[cat] = pools[cat] - attr[cat] } // an Attribute is half the pool; the Skill fills it
  const half = Math.ceil(pools.physical / 2)
  const health = category === 'minion' ? 1 : kind === 'vampire' ? 5 + half : kind === 'animal' ? pools.physical : 2 + half
  const willpower = Math.max(pools.social, pools.mental)
  const competence = (n) => (A2W_COMPETENCE.find(([max]) => n <= max) ?? A2W_COMPETENCE.at(-1))[1]
  return { pools, attr, skill, health, willpower, discipline: kind === 'vampire' ? ({ minion: 1, minor: 1, standard: 2, major: 3 }[category] ?? 1) : 0, competence: { physical: competence(pools.physical), social: competence(pools.social), mental: competence(pools.mental) } }
}
// Default Humanity of a vampire NPC by tier (ST p.41). Pure.
function a2wNpcHumanity (tier) { return { duskborn: 6, neonate: 6, ancilla: 5, elder: 4, methuselah: 4 }[tier] ?? 6 }
// How long a vinculum lasts: twice the bond interval of the lowest-generation participant (PG p.136). Pure.
function a2wVinculumNights (tiers) {
  const order = ['duskborn', 'neonate', 'ancilla', 'elder', 'methuselah']
  const top = [...(tiers ?? [])].sort((a, b) => order.indexOf(b) - order.indexOf(a))[0] ?? 'neonate'
  return 2 * ({ duskborn: 30, neonate: 30, ancilla: 180, elder: 365, methuselah: 36500 }[top] ?? 30)
}
// The recap's roll table from verdicts. rows: [{ name, win, critical, painful, bestial }]. Pure.
function a2wRecapRolls (rows) {
  const by = new Map()
  for (const r of rows ?? []) {
    const x = by.get(r.name) ?? { name: r.name, rolls: 0, wins: 0, criticals: 0, painful: 0, bestial: 0 }
    x.rolls++; if (r.win) x.wins++; if (r.critical) x.criticals++; if (r.painful) x.painful++; if (r.bestial) x.bestial++
    by.set(r.name, x)
  }
  return [...by.values()].sort((a, b) => b.rolls - a.rolls)
}

const a2wState = { hooked: false, dash: null, patched: false }
function a2wOn () { return a2Enabled() && a2eGet('tableTools', true) !== false }
function a2wPCs () { return [...(game.actors ?? [])].filter((a) => a.type === 'vampire' && a.hasPlayerOwner).sort((a, b) => a.name.localeCompare(b.name)) }

// ---- dashboard ----
function a2wDashRows () {
  const seen = new Set()
  const rows = []
  const add = (actor, group) => { if (!actor || seen.has(actor.uuid)) return; seen.add(actor.uuid); rows.push({ actor, group }) }
  for (const a of a2wPCs()) add(a, 'Player characters')
  for (const t of globalThis.canvas?.scene?.tokens ?? []) add(t.actor, 'On this scene')
  return rows
}
function a2wDashHtml () {
  const A = globalThis.V6Alpha2 ?? {}
  let clock = { night: 1, session: 1 }
  let masq = null
  try { clock = a2tClock() } catch (e) { /* tools off */ }
  try { const r = a2tMasqState().rank; masq = { rank: r, level: a2tMasqLevel(r)?.name ?? '' } } catch (e) { /* tools off */ }
  const pips = (v, max, cls = '') => `<span class="a2w-pips ${cls}" title="${v} of ${max}">${'●'.repeat(Math.max(0, v))}${'○'.repeat(Math.max(0, max - v))}</span>`
  let last = ''
  const body = a2wDashRows().map(({ actor, group }) => {
    const c = a2Creature(actor)
    const rules = a2Rules(actor) ?? {}
    const h = a2ActorHealth(actor)
    const vit = actor.system?.health ?? {}
    const wp = actor.system?.willpower ?? {}
    const hum = rules.humanity ? a2ActorHumanity(actor) : null
    const hunger = rules.hunger ? a2ActorHunger(actor) : null
    const states = (A.states?.list ?? []).filter((s) => A.states.has(actor, s.id)).map((s) => `<img src="${s.img}" title="${a2Esc(s.name)}" width="16" height="16">`).join('')
    const fz = typeof a2xFrenzyState === 'function' ? a2xFrenzyState(actor) : null
    const bonds = (actor.flags?.world?.a2?.bonds ?? []).filter((b) => a2Int(b.stage) > 0).map((b) => `${a2Esc(b.name)} ${b.stage}`).join(', ')
    const vinc = actor.flags?.world?.a2?.vinculum?.mates?.length ? 'vinculum' : ''
    const xp = actor.hasPlayerOwner && typeof a2tXp === 'function' ? a2tXp(actor).available : null
    const head = group !== last ? `<tr class="a2w-group"><td colspan="9">${group}</td></tr>` : ''
    last = group
    return `${head}<tr data-uuid="${actor.uuid}">
      <td><a data-open="${actor.uuid}"><strong>${a2Esc(actor.name)}</strong></a><br><small>${a2Esc(c)}${actor.system?.vampire?.clan?.name && c === 'vampire' ? `, ${a2Esc(actor.system.vampire.clan.name)}` : ''}</small></td>
      <td class="${h.value === 0 ? 'bad' : h.value * 2 <= h.max ? 'warn' : ''}">${h.value}/${h.max}${h.baneful ? ` <small title="baneful">(${h.baneful}b)</small>` : ''}</td>
      <td>${rules.vitae ? `${a2Int(vit.value)}/${a2Int(vit.max)}` : '–'}</td>
      <td class="${hunger >= 4 ? 'bad' : hunger >= 3 ? 'warn' : ''}">${hunger === null ? '–' : pips(hunger, 5, 'hunger')}</td>
      <td class="${a2Int(wp.value) === 0 && a2Int(wp.max) ? 'bad' : ''}">${a2Int(wp.max) ? `${a2Int(wp.value)}/${a2Int(wp.max)}` : '–'}</td>
      <td>${hum ? `${hum.rank}${hum.violations ? ` <small title="violations">+${hum.violations}v</small>` : ''}` : '–'}</td>
      <td class="a2w-states">${states}${fz ? `<span class="bad" title="in a frenzy">${a2Esc(fz.type)} frenzy</span>` : ''}${actor.flags?.world?.a2?.torpor ? '<span class="warn">torpor</span>' : ''}</td>
      <td><small>${bonds}${bonds && vinc ? '; ' : ''}${vinc}</small></td>
      <td>${xp === null ? '' : xp}</td></tr>`
  }).join('')
  return `<div class="a2w-dash"><div class="a2w-top"><span><i class="fa-solid fa-moon"></i> Night ${clock.night}, session ${clock.session}</span>${masq ? `<span><i class="fa-solid fa-masks-theater"></i> Masquerade ${masq.rank}/10: ${a2Esc(masq.level)}</span>` : ''}<span>${game.combat?.started ? `<i class="fa-solid fa-swords"></i> Round ${game.combat.round}: ${a2Esc(game.combat.combatant?.name ?? '')}` : ''}</span></div>
    <table class="a2w-table"><thead><tr><th>Character</th><th>Health</th><th>Vitae</th><th>Hunger</th><th>Willpower</th><th>Humanity</th><th>States</th><th>Bonds</th><th>XP</th></tr></thead><tbody>${body || '<tr><td colspan="9"><em>No player characters yet, and no tokens on this scene.</em></td></tr>'}</tbody></table></div>`
}
function a2wDashRefresh () {
  const app = a2wState.dash
  const box = app?.element?.querySelector?.('.a2w-dash')
  if (!app?.rendered || !box) { a2wState.dash = null; return }
  box.outerHTML = a2wDashHtml()
}
async function a2wDashboard () {
  if (!game.user.isGM) { ui.notifications.warn('The dashboard is the Storyteller\'s.'); return null }
  if (a2wState.dash?.rendered) { a2wState.dash.bringToFront?.(); a2wDashRefresh(); return a2wState.dash }
  foundry.applications.api.DialogV2.wait({
    window: { title: 'Storyteller dashboard', resizable: true },
    position: { width: 860 },
    content: a2wDashHtml(),
    buttons: [{ action: 'close', label: 'Close' }],
    modal: false,
    rejectClose: false,
    render: (ev, dialog) => {
      a2wState.dash = dialog
      dialog.element.addEventListener('click', (e) => { const a = e.target?.closest?.('a[data-open]'); if (a) { e.preventDefault(); a2FromUuid(a.dataset.open)?.sheet?.render(true) } })
    }
  }).catch(() => null).finally(() => { a2wState.dash = null })
  return true
}

// ---- tokens ----
function a2wPatchBars () {
  if (a2wState.patched) return
  const proto = CONFIG.Token?.documentClass?.prototype
  if (!proto?.getBarAttribute) return
  a2wState.patched = true
  const orig = proto.getBarAttribute
  // "a2health" is the Alpha 2 Health track, which lives outside the system's own data
  proto.getBarAttribute = function (barName, opts = {}) {
    const attr = opts.alternative ?? this[barName]?.attribute
    if (attr === 'a2health' && this.actor) { const h = a2ActorHealth(this.actor); return { type: 'bar', attribute: 'a2health', value: h.value, max: h.max, editable: false } }
    return orig.call(this, barName, opts)
  }
}
function a2wTokenHooks () {
  Hooks.on('preCreateToken', (doc) => {
    try {
      if (a2eGet('tokenSetup', true) === false || !a2Enabled() || !doc.actor || doc.actor.type !== 'vampire') return
      const rules = a2Rules(doc.actor) ?? {}
      const upd = { displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER, bar1: { attribute: 'a2health' } }
      upd.bar2 = { attribute: rules.vitae ? 'health' : 'willpower' }
      doc.updateSource(upd)
    } catch (e) { console.error('V6 Automation | token setup', e) }
  })
  Hooks.on('updateActor', (actor, changes) => {
    try {
      const a2 = changes?.flags?.world?.a2
      if (a2 && ('health' in a2)) for (const t of actor.getActiveTokens?.() ?? []) { t.renderFlags?.set?.({ refreshBars: true }); if (!t.renderFlags) t.drawBars?.() }
      if (a2wState.dash) a2wDashRefresh()
      if (!a2xIsGM() || !a2Enabled() || a2eGet('tokenSetup', true) === false) return
      // torpor from the tools shows as the Torpor state
      if (a2 && 'torpor' in a2 && typeof a2zSet === 'function' && typeof a2zHas === 'function') { const on = Boolean(actor.flags?.world?.a2?.torpor); if (a2zHas(actor, 'torpor') !== on) a2zSet(actor, 'torpor', on) }
      // a mortal, ghoul or animal at 0 Health is down (ST p.42)
      if (a2 && 'health' in a2 && actor.type === 'vampire') {
        const c = a2Creature(actor)
        if (c !== 'vampire') {
          const dead = a2ActorHealth(actor).value === 0
          const id = CONFIG.specialStatusEffects?.DEFEATED ?? 'dead'
          if (Boolean(actor.statuses?.has?.(id)) !== dead) actor.toggleStatusEffect(id, { active: dead, overlay: true })
          const cb = game.combat?.combatants?.find?.((x) => x.actor?.uuid === actor.uuid)
          if (cb && cb.defeated !== dead) cb.update({ defeated: dead })
        }
      }
    } catch (e) { console.error('V6 Automation | token state', e) }
  })
  for (const h of ['updateItem', 'createItem', 'deleteItem', 'createActiveEffect', 'deleteActiveEffect', 'updateCombat', 'deleteCombat', 'createToken', 'deleteToken', 'canvasReady']) Hooks.on(h, () => { if (a2wState.dash) setTimeout(a2wDashRefresh, 50) })
  Hooks.on('updateSetting', () => { if (a2wState.dash) setTimeout(a2wDashRefresh, 50) })
}

// ---- coterie ----
function a2wCoterie () { const c = a2eGet('coterie', null); return { name: '', domain: '', haven: '', notes: '', resources: [], ...(c && typeof c === 'object' ? c : {}) } }
// What kind of shared Resource a dropped item is. Pure.
function a2wResourceKind (item) {
  const t = String(item?.system?.resourceType ?? item?.system?.type ?? '')
  if (['physicalAssets', 'socialAssets', 'wealth'].includes(t)) return t
  const n = String(item?.name ?? '')
  if (/wealth|money|fortune/i.test(n)) return 'wealth'
  if (/haven|domain|repository|equipment|armou?ry|vehicle|library|property|estate/i.test(n)) return 'physicalAssets'
  return item?.type === 'resource' ? 'socialAssets' : 'physicalAssets'
}
// Items dropped on the coterie window: onto the Haven field they name the haven, anywhere else they fill a free Resource row.
function a2wCoterieDrop (root) {
  const box = root?.querySelector('.a2w-coterie')
  if (!box || box.dataset.a2wDrop) return
  box.dataset.a2wDrop = '1'
  box.addEventListener('dragover', (ev) => { ev.preventDefault() })
  box.addEventListener('drop', async (ev) => {
    let data = null
    try { data = JSON.parse(ev.dataTransfer?.getData('text/plain') ?? '') } catch (e) { return }
    if (data?.type !== 'Item' || !data.uuid) return
    ev.preventDefault(); ev.stopPropagation()
    const item = await fromUuid(data.uuid)
    if (!item) return
    const form = box.closest('form') ?? root.querySelector('form')
    const f = form?.elements
    if (!f) return
    if (ev.target?.closest?.('label')?.querySelector('input[name="haven"]')) { f.haven.value = item.name; return }
    for (let i = 0; f[`r${i}.name`]; i++) {
      if (f[`r${i}.name`].value.trim()) continue
      f[`r${i}.name`].value = item.name
      f[`r${i}.type`].value = a2wResourceKind(item)
      f[`r${i}.dots`].value = a2Clamp(a2Int(item.system?.dots?.value ?? item.system?.level, 1) || 1, 1, 5)
      f[`r${i}.uuid`].value = item.uuid
      ui.notifications.info(`${item.name} added. Save to keep it.`)
      return
    }
    ui.notifications.warn('No free row: save, reopen, and drop it again.')
  })
}
async function a2wCoterieOpen () {
  const c = a2wCoterie()
  const gm = game.user.isGM
  const ro = gm ? '' : 'disabled'
  const types = { physicalAssets: 'Physical asset', socialAssets: 'Social asset', wealth: 'Wealth' }
  const rows = [...c.resources, ...(gm ? [{}, {}] : [])].map((r, i) => `<tr><td class="a2w-rname"><input type="text" name="r${i}.name" value="${a2Esc(r.name ?? '')}" ${ro} placeholder="${gm ? 'Shared Resource, or drop an item here' : ''}"><input type="hidden" name="r${i}.uuid" value="${a2Esc(r.uuid ?? '')}">${r.uuid ? `<a class="content-link" data-link data-uuid="${a2Esc(r.uuid)}" data-tooltip="Open the item" draggable="true"><i class="fa-solid fa-suitcase"></i></a>` : ''}</td><td><select name="r${i}.type" ${ro}>${Object.entries(types).map(([k, l]) => `<option value="${k}" ${r.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td class="c"><input type="number" name="r${i}.dots" value="${a2Int(r.dots)}" min="0" max="5" ${ro}></td></tr>`).join('')
  const members = a2wPCs().map((a) => {
    const res = a.items.filter((i) => i.type === 'resource').sort((x, y) => a2Int(y.system?.dots?.value) - a2Int(x.system?.dots?.value))
    let herd = ''
    try { const h = a2tHerdInfo(a); if (h.dots) herd = ` · herd ${h.dots}` } catch (e) { /* no herd */ }
    return `<div class="a2w-member"><strong>${a2Esc(a.name)}</strong> <small>${a2Esc(a.system?.vampire?.clan?.name ?? '')}${herd}</small><br><small>${res.map((r) => `${a2Esc(r.name)} ${'●'.repeat(a2Int(r.system?.dots?.value))}`).join(' · ') || 'no Resources'}</small></div>`
  }).join('') || '<p><em>No player characters yet.</em></p>'
  const res = await foundry.applications.api.DialogV2.wait({
    window: { title: c.name ? `Coterie: ${c.name}` : 'Coterie', resizable: true },
    position: { width: 640 },
    content: `<div class="a2w-coterie"><div class="a2w-grid2"><label>Name <input type="text" name="name" value="${a2Esc(c.name)}" ${ro}></label><label>Domain <input type="text" name="domain" value="${a2Esc(c.domain)}" ${ro} placeholder="Hackney, east of the canal"></label><label>Haven <input type="text" name="haven" value="${a2Esc(c.haven)}" ${ro}></label><label>Notes <input type="text" name="notes" value="${a2Esc(c.notes)}" ${ro}></label></div>
      <fieldset><legend>Shared Resources</legend><table class="a2w-table"><tr><th>Resource</th><th>Kind</th><th class="c">Dots</th></tr>${rows || '<tr><td colspan="3"><em>None yet.</em></td></tr>'}</table><p class="a2w-dim">Downtime's Acquire Resources can add a dot to a shared Resource (PG p.113). The Storyteller keeps this list: type a row, or drag an item (a Haven, a Resource, anything) from the sidebar, a compendium or a sheet onto this window. Dropped on the Haven field, it names the haven.</p></fieldset>
      <fieldset><legend>Members</legend>${members}</fieldset></div>`,
    buttons: gm ? [{ action: 'save', label: 'Save', icon: 'fa-solid fa-floppy-disk', default: true, callback: (ev, button) => { const f = button.form.elements; const out = { name: f.name.value.trim(), domain: f.domain.value.trim(), haven: f.haven.value.trim(), notes: f.notes.value.trim(), resources: [] }; for (let i = 0; f[`r${i}.name`]; i++) { const n = f[`r${i}.name`].value.trim(); const d = a2Clamp(a2Int(f[`r${i}.dots`].value), 0, 5); if (n && d > 0) { const row = { name: n, type: f[`r${i}.type`].value, dots: d }; const u = f[`r${i}.uuid`]?.value; if (u) row.uuid = u; out.resources.push(row) } } return out } }, { action: 'close', label: 'Close' }] : [{ action: 'close', label: 'Close' }],
    rejectClose: false,
    render: (ev, dialog) => { if (gm) a2wCoterieDrop(dialog.element) }
  }).catch(() => null)
  if (gm && res && typeof res === 'object') { await game.settings.set(a2eNs(), a2eKey('coterie'), res); ui.notifications.info('Coterie saved.') }
  return res
}

// ---- NPC maker ----
async function a2wNpcMaker () {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller makes NPCs.'); return null }
  const clans = [...(game.items ?? [])].filter((i) => i.type === 'clan' && !/archive/i.test(i.folder?.name ?? '')).sort((a, b) => a.name.localeCompare(b.name))
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'NPC maker' },
    position: { width: 560 },
    content: `<div class="a2w-npc"><p class="a2w-hint">Pools by competence (ST p.50): 1–2 weak, 3–4 average, 5–6 good, 7–8 expert, 9–10 extraordinary. An Attribute is half its pool; the Skills fill the rest (ST p.42).</p>
      <div class="a2w-grid2"><label>Name <input type="text" name="name" placeholder="Night-shift security guard"></label>
      <label>Starting point <select name="role">${A2W_ROLES.map((r) => `<option value="${r.id}" data-p="${r.p}" data-s="${r.s}" data-m="${r.m}">${r.label}</option>`).join('')}</select></label>
      <label>Kind <select name="kind"><option value="human">Human</option><option value="ghoul">Ghoul</option><option value="vampire">Vampire</option><option value="animal">Animal</option></select></label>
      <label>Category <select name="category"><option value="minion">Minion (Health 1)</option><option value="minor" selected>Minor</option><option value="standard">Standard</option><option value="major">Major</option></select></label>
      <label>Physical pool <input type="number" name="p" value="4" min="1" max="12"></label><label>Social pool <input type="number" name="s" value="4" min="1" max="12"></label><label>Mental pool <input type="number" name="m" value="4" min="1" max="12"></label>
      <label>Clan (vampires) <select name="clan"><option value="">none</option>${clans.map((c) => `<option value="${a2Esc(c.name)}">${a2Esc(c.name)}</option>`).join('')}</select></label>
      <label>Generation (vampires) <select name="gen">${[14, 13, 12, 11, 10, 9, 8, 7, 6].map((g) => `<option value="${g}" ${g === 12 ? 'selected' : ''}>${g}th</option>`).join('')}</select></label>
      <label>How many <input type="number" name="count" value="1" min="1" max="12"></label></div>
      <p class="a2w-preview" data-a2w="preview"></p></div>`,
    ok: { label: 'Make', icon: 'fa-solid fa-user-plus', callback: (ev, button) => { const f = button.form.elements; return { name: f.name.value.trim(), kind: f.kind.value, category: f.category.value, physical: a2Int(f.p.value, 4), social: a2Int(f.s.value, 4), mental: a2Int(f.m.value, 4), clan: f.clan.value, gen: a2Int(f.gen.value, 12), count: a2Clamp(a2Int(f.count.value, 1), 1, 12), role: f.role.selectedOptions?.[0]?.textContent ?? '' } } },
    rejectClose: false,
    render: (ev, dialog) => {
      const root = dialog.element
      const f = (n) => root.querySelector(`[name="${n}"]`)
      const show = () => { const st = a2wNpcStats({ kind: f('kind').value, category: f('category').value, physical: f('p').value, social: f('s').value, mental: f('m').value }); root.querySelector('[data-a2w="preview"]').innerHTML = `<strong>Health ${st.health}</strong>, <strong>Willpower ${st.willpower}</strong>. Physical ${st.pools.physical} (${st.competence.physical.toLowerCase()}): Attributes ${st.attr.physical}, Skills ${st.skill.physical}. Social ${st.pools.social} (${st.competence.social.toLowerCase()}): ${st.attr.social} + ${st.skill.social}. Mental ${st.pools.mental} (${st.competence.mental.toLowerCase()}): ${st.attr.mental} + ${st.skill.mental}.${st.discipline ? ` Clan Disciplines at ${st.discipline}.` : ''}` }
      f('role').addEventListener('change', () => { const o = f('role').selectedOptions[0]; f('p').value = o.dataset.p; f('s').value = o.dataset.s; f('m').value = o.dataset.m; if (o.value === 'animal') f('kind').value = 'animal'; if (['neonate', 'hound', 'primogen'].includes(o.value)) f('kind').value = 'vampire'; show() })
      root.addEventListener('change', show)
      root.addEventListener('input', show)
      show()
    }
  }).catch(() => null)
  if (!res) return null
  return a2wNpcCreate(res)
}
async function a2wNpcCreate (o) {
  const st = a2wNpcStats(o)
  const creature = { human: 'mortal', ghoul: 'ghoul', vampire: 'vampire', animal: 'animal' }[o.kind] ?? 'mortal'
  const system = { attributes: {}, skills: {} }
  for (const [cat, keys] of Object.entries(A2W_ATTR_CATS)) for (const k of keys) system.attributes[k] = { value: st.attr[cat], max: Math.max(5, st.attr[cat]) }
  for (const [cat, keys] of Object.entries(A2W_SKILL_CATS)) for (const k of keys) system.skills[k] = { value: st.skill[cat], max: Math.max(5, st.skill[cat]) }
  system.willpower = { value: st.willpower, max: st.willpower }
  const items = []
  let tier = 'neonate'
  if (creature === 'vampire') {
    const genMod = a2GenModifier(o.gen)
    try { tier = a2cTierKey('vampire', o.gen) } catch (e) { /* neonate */ }
    system.vampire = { generation: { value: o.gen }, humanity: { value: a2wNpcHumanity(tier), max: 10 }, nature: { value: 0 }, clan: { name: o.clan ?? '' }, disciplines: {} }
    system.health = { value: 5 + 5 * genMod, max: 5 + 5 * genMod }
    const clan = o.clan ? game.items.find((i) => i.type === 'clan' && i.name === o.clan) : null
    if (clan) { const d = clan.toObject(); delete d._id; delete d.folder; items.push(d); for (const k of clan.system?.disciplines ?? []) system.vampire.disciplines[k] = { value: st.discipline, visible: true } }
  } else if (creature === 'ghoul') system.health = { value: 5, max: 5 }
  let folder = game.folders.find((f) => f.type === 'Actor' && f.name === 'Made NPCs (V6)')
  folder ??= await Folder.create({ name: 'Made NPCs (V6)', type: 'Actor' })
  const made = []
  for (let n = 1; n <= o.count; n++) {
    const name = `${o.name || o.role || 'NPC'}${o.count > 1 ? ` ${n}` : ''}`
    const actor = await Actor.create({
      name, type: 'vampire', folder: folder.id, system,
      flags: { world: { a2: { creature, tier: creature === 'vampire' ? tier : null, health: { value: st.health, max: st.health, baneful: 0 }, npc: { v: 1, made: true, category: o.category, minion: o.category === 'minion', healthMax: st.health, pools: st.pools } } } },
      prototypeToken: { name, actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE, displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER },
      items
    })
    made.push(actor)
  }
  ui.notifications.info(`${made.length === 1 ? made[0].name : `${made.length} NPCs`} made: in the folder "Made NPCs (V6)". Drag onto the scene.`)
  if (made.length === 1) made[0].sheet?.render(true)
  return made
}

// ---- group hunt ----
async function a2wGroupHunt () {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller calls the hunt.'); return null }
  const pcs = a2wPCs().filter((a) => a2Rules(a)?.hunger)
  if (!pcs.length) { ui.notifications.info('No vampire player characters to hunt.'); return null }
  return ChatMessage.create({ content: '<div class="a2w-hunt"><h4>The hunt</h4><p>Each of you: how do you feed tonight?</p></div>', speaker: { alias: 'Storyteller' }, flags: { world: { a2hunt: { v: 1, actors: pcs.map((a) => a.uuid) } } } })
}
function a2wHuntRender (message, root) {
  const h = message.flags?.world?.a2hunt
  const box = root.querySelector('.a2w-hunt')
  if (!h || !box || box.querySelector('.a2w-hunt-row')) return
  for (const uuid of h.actors ?? []) {
    const actor = a2FromUuid(uuid)
    if (!actor) continue
    const hunger = a2ActorHunger(actor)
    const row = document.createElement('div')
    row.className = 'a2w-hunt-row'
    row.innerHTML = `<span><strong>${a2Esc(actor.name)}</strong> Hunger ${'●'.repeat(hunger)}${'○'.repeat(Math.max(0, 5 - hunger))} <small>Vitae ${a2Int(actor.system?.health?.value)}/${a2Int(actor.system?.health?.max)}</small></span>`
    if (actor.isOwner) { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<i class="fa-solid fa-droplet"></i> Hunt'; b.addEventListener('click', (ev) => { ev.preventDefault(); globalThis.V6Alpha2?.tools?.feed?.(actor) }); row.append(b) }
    box.append(row)
  }
}

// ---- vinculum ----
function a2wVinculum (actor) { const v = actor?.flags?.world?.a2?.vinculum; let night = 1; try { night = a2tClock().night } catch (e) { /* 1 */ } return v && Array.isArray(v.mates) && v.mates.length && (v.until === null || v.until === undefined || night <= a2Int(v.until)) ? v : null }
async function a2wVaulderie () {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller records a Vaulderie.'); return null }
  const cands = new Map()
  for (const t of globalThis.canvas?.tokens?.controlled ?? []) if (t.actor && a2Creature(t.actor) === 'vampire') cands.set(t.actor.uuid, { actor: t.actor, on: true })
  for (const a of a2wPCs()) if (a2Creature(a) === 'vampire' && !cands.has(a.uuid)) cands.set(a.uuid, { actor: a, on: cands.size === 0 })
  const list = [...cands.values()]
  if (list.length < 2) { ui.notifications.warn('A Vaulderie needs at least two vampires: select their tokens.'); return null }
  const res = await foundry.applications.api.DialogV2.prompt({
    window: { title: 'Vaulderie' },
    content: `<div class="a2w-npc"><p class="a2w-hint">The vinculum ends every Blood Bond of those who share the cup, blocks new ones, and takes 2 dice from tests against a packmate. It lasts twice the bond interval of the oldest blood among them (PG p.135-136).</p>${list.map((c, i) => `<label class="checkbox"><input type="checkbox" name="v${i}" ${c.on ? 'checked' : ''}> ${a2Esc(c.actor.name)}</label>`).join('<br>')}</div>`,
    ok: { label: 'Share the cup', callback: (ev, button) => list.filter((c, i) => button.form.elements[`v${i}`].checked).map((c) => c.actor) },
    rejectClose: false
  }).catch(() => null)
  if (!res || res.length < 2) return null
  let night = 1
  try { night = a2tClock().night } catch (e) { /* 1 */ }
  const nights = a2wVinculumNights(res.map((a) => { try { return a2cTierKey('vampire', a.system?.vampire?.generation?.value) } catch (e) { return 'neonate' } }))
  for (const a of res) await a.update({ 'flags.world.a2.vinculum': { mates: res.filter((x) => x.uuid !== a.uuid).map((x) => ({ uuid: x.uuid, name: x.name })), since: night, until: night + nights }, 'flags.world.a2.bonds': [] })
  await ChatMessage.create({ content: `<div class="a2y-bond"><h4>Vaulderie</h4><p>${res.map((a) => a2Esc(a.name)).join(', ')} share the cup. Their Blood Bonds are broken; the vinculum holds for ${nights} nights (until night ${night + nights}).</p></div>`, speaker: { alias: 'Storyteller' } })
  return res
}
// Dice for the roll dialog (alpha2-states calls this through the bond check). → { dice, note } or null
function a2wVinculumMods (actor, foe, roll) {
  if (!a2wOn() || !actor || !foe) return null
  const v = a2wVinculum(actor)
  if (!v || !v.mates.some((m) => m.uuid === foe.uuid || m.name === foe.name)) return null
  return roll.attack || roll.contested ? { dice: -2, note: `Vinculum with ${foe.name}: −2 acting against a packmate (PG p.135).` } : null
}

// ---- recap ----
async function a2wRecap () {
  if (!game.user.isGM) { ui.notifications.warn('The Storyteller writes the recap.'); return null }
  const since = a2Int(a2eGet('recapAt', 0))
  const msgs = game.messages.contents.filter((m) => a2Int(m.timestamp) > since)
  if (!msgs.length) { ui.notifications.info('Nothing in the chat log since the last recap.'); return null }
  const strip = (h) => String(h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const rows = []
  const notable = []
  for (const m of msgs) {
    const roll = m.rolls?.find((r) => r?.options?.a2?.built)
    if (roll) {
      let v = {}
      try { v = a2RollVerdict(roll) } catch (e) { /* skip */ }
      const name = m.speaker?.alias ?? a2xSpeaker(m)?.name ?? 'Someone'
      rows.push({ name, win: v.win === true, critical: Boolean(v.critical), painful: Boolean(v.painful), bestial: Boolean(v.bestial) })
      if (v.bestial || v.critical) notable.push(`${name}: ${v.bestial ? 'bestial failure' : 'critical win'}${m.flavor ? ` (${strip(m.flavor)})` : ''}`)
      if (m.flags?.world?.a2comp) notable.push(`${name}: ${m.flags.world.a2comp.line}`)
      continue
    }
    const w = m.flags?.world ?? {}
    if (w.a2t || w.a2socEnd || w.a2zcard || /a2y-bond|a2v-result|a2y-downtime/.test(m.content ?? '')) notable.push(strip(m.content).slice(0, 260))
    else if (w.a2task && a2yTaskState(w.a2task).state !== 'open') notable.push(`Task "${strip(m.content)}": ${a2yTaskState(w.a2task).state} at ${a2yTaskState(w.a2task).total}/${w.a2task.target}.`)
  }
  let clock = { night: 1, session: 1 }
  try { clock = a2tClock() } catch (e) { /* tools off */ }
  const table = a2wRecapRolls(rows)
  const html = `<p><em>Written ${new Date().toLocaleDateString()} from ${msgs.length} chat messages. Night ${clock.night}.</em></p>
<h2>What happened</h2>${notable.length ? `<ul>${notable.slice(0, 80).map((n) => `<li>${a2Esc(n)}</li>`).join('')}</ul>` : '<p>Nothing the tools recorded.</p>'}
<h2>Rolls</h2>${table.length ? `<table><thead><tr><th>Character</th><th>Rolls</th><th>Wins</th><th>Critical wins</th><th>Painful failures</th><th>Bestial failures</th></tr></thead><tbody>${table.map((r) => `<tr><td>${a2Esc(r.name)}</td><td>${r.rolls}</td><td>${r.wins}</td><td>${r.criticals}</td><td>${r.painful}</td><td>${r.bestial}</td></tr>`).join('')}</tbody></table>` : '<p>No rolls.</p>'}
<h2>Storyteller's notes</h2><p></p>`
  let journal = game.journal.find((j) => j.flags?.world?.a2recap)
  journal ??= await JournalEntry.create({ name: 'Session Recaps', flags: { world: { a2recap: true, v6key: 'local:recaps' } } })
  const name = `Session ${clock.session}`
  const dupes = journal.pages.filter((p) => p.name === name || p.name.startsWith(`${name} (`)).length
  const [page] = await journal.createEmbeddedDocuments('JournalEntryPage', [{ name: dupes ? `${name} (${dupes + 1})` : name, type: 'text', text: { content: html, format: 1 }, sort: (journal.pages.size + 1) * 100000 }])
  await game.settings.set(a2eNs(), a2eKey('recapAt'), Date.now())
  journal.sheet?.render(true, { pageId: page.id })
  ui.notifications.info(`Recap written: ${journal.name}, ${page.name}.`)
  return page
}

// ---- reactions ----
// Called by the turn card's "Use a reaction" (alpha2-combat). Resolves true to tick the counter.
async function a2wReaction (actor) {
  if (!a2wOn() || !actor) return true
  const powers = actor.items.filter((i) => i.type === 'discipline' && i.system?.activation?.activationType === 'reaction')
  const canSurge = a2Creature(actor) === 'vampire' || a2Creature(actor) === 'ghoul'
  if (!powers.length && !canSurge) return true
  const buttons = [
    ...(canSurge ? [{ action: 'surge', label: 'Blood Surge', icon: 'fa-solid fa-droplet' }] : []),
    ...powers.slice(0, 12).map((p) => ({ action: `p:${p.id}`, label: p.name, icon: 'fa-solid fa-bolt' })),
    { action: 'other', label: 'Something else', icon: 'fa-solid fa-check' }
  ]
  const pick = await foundry.applications.api.DialogV2.wait({ window: { title: `Reaction: ${actor.name}` }, position: { width: 420 }, content: '<div class="a2w-npc"><p class="a2w-hint">A reaction is a power that says so, or a Blood Surge before a test (PG p.110). Defending costs none.</p></div>', buttons, rejectClose: false }).catch(() => null)
  if (!pick) return false
  try {
    if (pick === 'surge') globalThis.V6Alpha2?.tools?.bloodSurge?.(actor)
    else if (String(pick).startsWith('p:')) { const item = actor.items.get(String(pick).slice(2)); if (item) { if (a2State.RollDialog?.open) a2State.RollDialog.open({ actor, item }); else item.sheet?.render(true) } }
  } catch (e) { console.error('V6 Automation | reaction', e) }
  return true
}

function a2wInjectStyles () {
  document.getElementById('v6a-table-style')?.remove()
  const style = document.createElement('style')
  style.id = 'v6a-table-style'
  style.textContent = `
.a2w-top { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-bottom: 6px; font-weight: 600; }
.a2w-top i { opacity: 0.8; margin-right: 4px; }
.a2w-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.a2w-table th, .a2w-table td { padding: 3px 6px; text-align: left; vertical-align: middle; border-bottom: 1px solid color-mix(in srgb, currentColor 14%, transparent); }
.a2w-table .c { text-align: center; }
.a2w-table input[type="number"] { width: 4em; text-align: center; }
.a2w-group td { font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; opacity: 0.75; border-bottom: 1px solid #a31621; padding-top: 8px; }
.a2w-dash { max-height: 70vh; overflow-y: auto; }
.a2w-dash td.warn, .a2w-dash span.warn { color: #e0a13a; font-weight: 600; }
.a2w-dash td.bad, .a2w-dash span.bad { color: #ff6b76; font-weight: 700; }
.a2w-dash a[data-open] { cursor: pointer; }
.a2w-dash small { opacity: 0.7; }
.a2w-pips { letter-spacing: 1px; }
.a2w-pips.hunger { color: #d0303c; }
.a2w-states { white-space: nowrap; }
.a2w-states img { border: 0; vertical-align: middle; margin-right: 2px; filter: drop-shadow(0 0 1px #000); }
.a2w-states span { margin-left: 4px; font-size: 12px; }
.a2w-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
.a2w-grid2 label { display: flex; flex-direction: column; gap: 2px; }
.a2w-hint, .a2w-preview { margin: 6px 0; padding: 4px 8px; border-left: 3px solid #7a0000; background: color-mix(in srgb, currentColor 6%, transparent); font-size: 12.5px; }
.a2w-dim { opacity: 0.7; font-size: 12px; margin: 4px 0 0; }
.a2w-member { padding: 4px 0; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.a2w-hunt h4 { margin: 0 0 2px; font-weight: 700; }
.a2w-hunt-row { display: flex; align-items: center; gap: 8px; margin: 3px 0; }
.a2w-hunt-row span { flex: 1; }
.a2w-hunt-row button { flex: 0 0 auto; width: auto; padding: 0 10px; line-height: 1.6; }
`
  document.head.appendChild(style)
}

async function a2TableBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.table?.booted) return true
  a2eReg('tableTools', { name: 'Dashboard, coterie, NPC maker, hunts, Vaulderie, recap, reaction menu', hint: 'The Storyteller\'s table tools in the token controls and as chat commands (/dash, /coterie, /npc, /hunt, /vaulderie, /recap).', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('tokenSetup', { name: 'Tokens: bars and markers', hint: 'New tokens get a Health bar and a Vitae bar. A mortal at 0 Health is marked defeated; torpor shows as a state.', scope: 'world', config: true, type: Boolean, default: true })
  a2eReg('coterie', { scope: 'world', config: false, type: Object, default: {} })
  a2eReg('recapAt', { scope: 'world', config: false, type: Number, default: 0 })
  a2wInjectStyles()
  a2wPatchBars()
  if (!a2wState.hooked) {
    a2wState.hooked = true
    a2wTokenHooks()
    Hooks.on('renderChatMessageHTML', (message, html) => { try { const root = html instanceof HTMLElement ? html : html?.[0]; if (root && a2wOn()) a2wHuntRender(message, root) } catch (e) { console.error('V6 Automation | hunt card', e) } })
    Hooks.on('v6a2NewNight', ({ actors, night } = {}) => {
      if (!a2wOn() || !game.user.isGM) return
      for (const a of actors ?? []) { const v = a.flags?.world?.a2?.vinculum; if (v && v.until !== null && v.until !== undefined && a2Int(night) > a2Int(v.until)) a.update({ 'flags.world.a2.vinculum': null }) }
    })
    Hooks.on('getSceneControlButtons', (controls) => {
      const tools = controls?.tokens?.tools
      if (!tools || !a2wOn()) return
      tools['v6a2-coterie'] = { name: 'v6a2-coterie', title: 'Coterie', icon: 'fa-solid fa-people-roof', order: 111, button: true, onChange: () => a2wCoterieOpen() }
      if (!game.user?.isGM) return
      tools['v6a2-dash'] = { name: 'v6a2-dash', title: 'Storyteller dashboard', icon: 'fa-solid fa-table-list', order: 100, button: true, onChange: () => a2wDashboard() }
      tools['v6a2-npc'] = { name: 'v6a2-npc', title: 'NPC maker', icon: 'fa-solid fa-user-plus', order: 112, button: true, onChange: () => a2wNpcMaker() }
      tools['v6a2-hunt'] = { name: 'v6a2-hunt', title: 'Group hunt', icon: 'fa-solid fa-paw', order: 113, button: true, onChange: () => a2wGroupHunt() }
    })
    try { ui.controls?.render?.({ reset: true }) } catch (e) { /* controls not drawn yet */ }
  }
  api.table = { booted: true, resourceKind: a2wResourceKind, dashboard: a2wDashboard, coterie: a2wCoterieOpen, npc: a2wNpcMaker, makeNpc: a2wNpcCreate, hunt: a2wGroupHunt, vaulderie: a2wVaulderie, recap: a2wRecap, reaction: a2wReaction, rules: { npcStats: a2wNpcStats, npcHumanity: a2wNpcHumanity, vinculumNights: a2wVinculumNights, recapRolls: a2wRecapRolls } }
  console.log('V6 Automation | table tools loaded')
  return true
}
globalThis.a2TableBoot ??= a2TableBoot

// ---- the guide: a journal with a player quick-start and a Storyteller cheat sheet -------
// Made in the world the first time the Storyteller loads this version, and rewritten when
// the module's guide changes. /v6 guide opens it. Setting (world): guide (on).

const A2G_VERSION = 1
const A2G_PLAYER = `
<p>Everything here is done for you by the V6 Automation module. You never need to count dice or look up a modifier: open the right thing and it does the sums.</p>
<h2>Rolling</h2>
<ul>
<li><strong>From your sheet:</strong> click an Attribute, a Skill or a power. The roll window shows your pool and why it is what it is.</li>
<li><strong>From chat:</strong> type <code>/test wits+awareness 3</code>. The number is the Difficulty; leave it out if there is none. Short forms work: <code>/test str+fight</code>.</li>
<li><strong>From a journal:</strong> a red button such as <em>Wits + Awareness, Difficulty 3</em> rolls exactly that.</li>
<li><strong>When the Storyteller asks:</strong> a card appears with your name and a <strong>Roll</strong> button.</li>
</ul>
<p>A die showing 6 or more is a success; a 10 counts as two. Tick boxes in the roll window are bonuses and penalties that may apply. Some are ticked for you, with the reason written next to them. Untick anything that doesn't fit.</p>
<h2>Reading a roll card</h2>
<table>
<thead><tr><th>You see</th><th>It means</th></tr></thead>
<tbody>
<tr><td>Gold tiles</td><td>Successes. A red tile is a 10.</td></tr>
<tr><td>Win, with a margin</td><td>You beat the Difficulty or your opponent; the margin is by how much.</td></tr>
<tr><td>Painful failure</td><td>No successes at all. A <strong>Complication</strong> button appears: pick what goes wrong with the Storyteller.</td></tr>
<tr><td>Bestial failure</td><td>You failed and a Hunger die shows a 1. The Beast gets a say.</td></tr>
<tr><td>Reroll (1 WP)</td><td>Spend 1 Willpower to reroll up to three normal dice.</td></tr>
<tr><td>Beast's Bargain</td><td>Turn a failure into a win, at the Beast's price.</td></tr>
<tr><td>Apply damage</td><td>After a hit: opens the damage window with your target filled in.</td></tr>
</tbody>
</table>
<h2>In a fight</h2>
<ul>
<li>Nobody rolls for turn order. Highest Wits goes first.</li>
<li>On your turn you get a card: movement, one action, one minor action, and a row of dots for your <strong>reactions</strong>.</li>
<li><strong>To attack or do anything else:</strong> select your token, target your opponent (hover it and press <strong>T</strong>), then press <strong>Actions</strong> on your turn card, or the fist tool on the left, or type <code>/act</code>. Pick from the menu: attacks, called shot, stake, grab, feed, distract and the rest.</li>
<li><strong>When you are attacked:</strong> the attacker's card shows <strong>Dodge</strong> and <strong>Parry</strong> buttons for you. Click one. Defending costs nothing.</li>
<li><strong>Use a reaction</strong> on your turn card offers Blood Surge and your reaction powers, and ticks off a dot.</li>
<li>States such as <em>on the ground</em>, <em>held</em>, <em>in cover</em> or <em>burning</em> show as icons on your token and change your dice by themselves.</li>
</ul>
<h2>Your sheet</h2>
<ul>
<li>The line under your Willpower has <strong>Spend</strong> (XP), <strong>Feed</strong> and, on a blank character, <strong>Create character</strong>.</li>
<li>Click the Health, Vitae, Willpower and Humanity boxes to change them by hand.</li>
<li>Using a power pays its Vitae and Willpower for you and keeps track of how long it lasts.</li>
<li>In journals, the name of a power, merit or flaw is a link: click it to read the item, or drag it onto your sheet once the Storyteller agrees.</li>
</ul>
<h2>Chat commands</h2>
<table>
<thead><tr><th>Type</th><th>It does</th></tr></thead>
<tbody>
<tr><td><code>/test wits+awareness 3</code></td><td>Opens that roll for your character.</td></tr>
<tr><td><code>/act</code></td><td>The action menu.</td></tr>
<tr><td><code>/states</code></td><td>Set or clear states on your character.</td></tr>
<tr><td><code>/feed</code></td><td>Feed or hunt.</td></tr>
<tr><td><code>/surge</code></td><td>Blood Surge.</td></tr>
<tr><td><code>/frenzy fear</code></td><td>A frenzy test (fear, rage or hunger).</td></tr>
<tr><td><code>/bonds</code></td><td>Your Blood Bonds.</td></tr>
<tr><td><code>/downtime</code></td><td>Take a downtime action between stories.</td></tr>
<tr><td><code>/coterie</code></td><td>The coterie page: domain, haven, shared Resources.</td></tr>
<tr><td><code>/v6 xp</code></td><td>Spend XP.</td></tr>
<tr><td><code>/v6 help</code></td><td>This list, in chat.</td></tr>
</tbody>
</table>
<h2>If something looks wrong</h2>
<p>You can always change a number on your sheet by hand, untick a bonus, or add or take dice in the roll window's modifier field. Tell the Storyteller what the module got wrong so it can be fixed.</p>
<p>Don't like the dark look? <em>Configure Settings → V6 Automation → Look of chat cards and windows</em> switches it off for you alone.</p>
`
const A2G_ST = `
<p>Your tools are in the token controls on the left (the first tool group) and as chat commands. Players can't use the ones marked as yours.</p>
<h2>Running the night</h2>
<table>
<thead><tr><th>Tool</th><th>Command</th><th>What it does</th></tr></thead>
<tbody>
<tr><td>Dashboard</td><td><code>/dash</code></td><td>Every player character and scene token: Health, Vitae, Hunger, Willpower, Humanity, states, bonds, XP. Updates by itself.</td></tr>
<tr><td>New Night</td><td><code>/night</code></td><td>Everyone rises: 1 Vitae to rise, Willpower back, torpor, baneful mending, impairments and Blood Bonds checked. Advances the night clock.</td></tr>
<tr><td>End Scene</td><td><code>/v6 scene</code></td><td>Ends Blood Surges, one-scene powers and states, and resets per-scene uses.</td></tr>
<tr><td>Masquerade Tracker</td><td><code>/masquerade</code></td><td>The 0 to 10 track with its levels; breaches raise it, downtime can lower it.</td></tr>
<tr><td>Award XP</td><td><code>/v6 award</code></td><td>The end-of-session questions for every character.</td></tr>
<tr><td>Recap</td><td><code>/recap</code></td><td>Writes a journal page from the chat log since the last recap.</td></tr>
</tbody>
</table>
<h2>Asking for rolls</h2>
<ul>
<li><strong>Megaphone tool</strong> or <code>/req wits+awareness 3</code>: pick the pool, the Difficulty (shown or hidden) and who rolls. Results collect on the card.</li>
<li><strong>Shift-click</strong> a red roll button in a journal to ask the players for that roll instead of rolling it yourself.</li>
<li><code>/task</code>: a prolonged task with a success target and a test limit.</li>
<li><code>/social</code>: a social conflict over 3, 5 or 7 rounds. You close each round; you pick the winner of a tie.</li>
<li><code>/hunt</code>: a card with each vampire's Hunger and a Hunt button for its player.</li>
</ul>
<h2>Fights</h2>
<ul>
<li>Add tokens to the combat tracker and start it. Turn order is set by Wits; your characters go after players on a tie.</li>
<li>Your characters <strong>defend by themselves</strong> when a player attacks them, and resist grabs, distractions and the like the same way.</li>
<li>For your own characters, select the token and use the <strong>fist tool</strong> or <code>/act</code>. A player whose character you attack gets Dodge and Parry buttons; if that player is offline, the defence is rolled for them.</li>
<li><strong>States</strong> (<code>/states</code> or the token HUD): surprised, on the ground, held, tied up, staked, torpor, burning, in sunlight, awake by day, cover, hurt limb. Fire and sunlight deal their damage at the start of the turn.</li>
<li>A mortal at 0 Health is marked defeated. A decapitation is announced but the token is left for you to remove.</li>
</ul>
<h2>Characters and NPCs</h2>
<ul>
<li><strong>Player characters:</strong> make a blank character, give the player ownership, and they press <strong>Create character</strong> on the sheet. You can open "Creation" on any character later.</li>
<li><strong>NPC maker</strong> (<code>/npc</code>): kind, category and three pools make a full sheet with a token. The starting points (Thug, Detective and so on) are suggestions, not from the books.</li>
<li><strong>Journals:</strong> a character's name in a book's journal opens its sheet, importing it from the compendium the first time.</li>
<li><strong>Creature type</strong> (vampire, ghoul, mortal, animal) is set on the sheet and only you can change it.</li>
</ul>
<h2>Blood</h2>
<ul>
<li><code>/bonds</code> on a selected token: log a drink, set a stage, drop a bond. Feed attacks on a vampire log the drink themselves.</li>
<li><code>/vaulderie</code>: bind the selected vampires in a vinculum. It ends their Blood Bonds and blocks new ones.</li>
<li><code>/v6 downtime reset</code>: start a new downtime, so everyone has their two actions again.</li>
</ul>
<h2>When the module is wrong</h2>
<ul>
<li>Every part has its own switch under <em>Configure Settings → V6 Automation</em>. Switch off the part that misbehaves and carry on by hand.</li>
<li>Any roll can be corrected with the modifier field; any track can be clicked on the sheet.</li>
<li>Where the Alpha 2 rules were unclear or silent, the module follows a ruling. These are marked "house rule" where they appear: ghoul creation, the Methuselah tier, armour for vampires, and Blood Bond penalties on any attack or contest against the master.</li>
<li>Powers that only describe what happens (what you learn, a mind you control, a summoned animal) pay their cost and show their text. The rest is yours to play.</li>
</ul>
`

function a2gPages () {
  return [
    { key: 'player', name: 'Player quick-start', content: A2G_PLAYER, gmOnly: false },
    { key: 'st', name: 'Storyteller cheat sheet', content: A2G_ST, gmOnly: true }
  ]
}
async function a2gInstall ({ force = false } = {}) {
  if (!game.user.isGM) return null
  let journal = game.journal.find((j) => j.flags?.world?.a2guide)
  if (journal && !force && a2Int(journal.flags.world.a2guide) >= A2G_VERSION) return journal
  const OWN = CONST.DOCUMENT_OWNERSHIP_LEVELS
  journal ??= await JournalEntry.create({ name: 'V6 Automation: how to play', ownership: { default: OWN.OBSERVER }, flags: { world: { a2guide: A2G_VERSION, v6key: 'local:guide' } } })
  const pages = a2gPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const data = { name: p.name, type: 'text', text: { content: p.content.trim(), format: 1 }, sort: (i + 1) * 100000, ownership: { default: p.gmOnly ? OWN.NONE : OWN.INHERIT }, flags: { world: { a2guide: p.key } } }
    const old = journal.pages.find((x) => x.flags?.world?.a2guide === p.key)
    if (old) await old.update(data)
    else await journal.createEmbeddedDocuments('JournalEntryPage', [data])
  }
  await journal.update({ 'flags.world.a2guide': A2G_VERSION })
  return journal
}
async function a2gOpen () {
  let journal = game.journal.find((j) => j.flags?.world?.a2guide)
  if (!journal && game.user.isGM) journal = await a2gInstall()
  if (!journal) { ui.notifications.info('The guide isn\'t in this world yet: the Storyteller makes it with /v6 guide.'); return null }
  journal.sheet?.render(true)
  return journal
}

async function a2GuideBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.guide?.booted) return true
  a2eReg('guide', { name: 'Keep the how-to-play journal', hint: 'A journal with a player quick-start and a Storyteller cheat sheet, made in the world and kept up to date with the module. /v6 guide opens it.', scope: 'world', config: true, type: Boolean, default: true })
  api.guide = { booted: true, open: a2gOpen, install: a2gInstall, version: A2G_VERSION }
  try { if (game.user.isGM && a2Enabled() && a2eGet('guide', true) !== false) await a2gInstall() } catch (e) { console.error('V6 Automation | guide', e) }
  console.log('V6 Automation | guide loaded')
  return true
}
globalThis.a2GuideBoot ??= a2GuideBoot

// ---- three powers the module now keeps count of ------------------------------------------
// Blood Aegis   the barrier's points (2 × Blood Sorcery dots; "Feed the barrier" on the
//               power's card adds 2 for 1 Vitae, up to half your dots). Ranged damage
//               comes off the barrier first, before Endurance. Ends with the scene.
// Haruspex      a win gives one free reroll before sunrise, a critical win three. Roll
//               cards of that character get a "Haruspex reroll" button: all standard
//               dice are rerolled and the better result is kept.
// Pact with Ra  sunlight does no damage and prompts no fear frenzy while it holds. At
//               the next New Night half the current Vitae, rounded up, is lost.
// Data: flags.world.a2.aegis, flags.world.a2.haruspex, flags.world.a2.pactRa.

// ---- pure rules ----
function a2rAegisStart (dots) { const d = Math.max(0, a2Int(dots)); return { points: 2 * d, fed: 0, maxFed: Math.floor(d / 2) } }
function a2rAegisSoak (points, damage) { const soak = Math.max(0, Math.min(a2Int(points), a2Int(damage))); return { soak, left: a2Int(points) - soak, through: a2Int(damage) - soak } }
function a2rRaLoss (vitae) { return Math.ceil(Math.max(0, a2Int(vitae)) / 2) }
function a2rHaruspexUses ({ win = false, critical = false } = {}) { return win ? (critical ? 3 : 1) : 0 }
// Reroll every standard die of a roll's JSON with the given values. Pure. → { json, n }
function a2rRerollAll (json, values) {
  const out = JSON.parse(JSON.stringify(json))
  const dice = a2xRerollable(out.terms)
  dice.forEach((d, k) => {
    const term = out.terms[d.term]
    const v = a2Clamp(a2Int(values[k], 1), 1, 10)
    term.results[d.result] = { ...term.results[d.result], active: false, rerolled: true }
    term.results.push({ result: v, active: true, success: v >= 6, count: v >= 6 ? 1 : 0 })
  })
  out.total = a2xRollSuccesses(out)
  return { json: out, n: dice.length }
}

const a2rState = { hooked: false, seen: new Set() }
function a2rNight () { try { return a2Int(a2tClock().night, 1) } catch (e) { return 1 } }

// Called from the damage pipeline (alpha2-actions) before Endurance. → { absorbed, note } or null
async function a2rAegis (actor, total, o) {
  const ae = actor?.flags?.world?.a2?.aegis
  if (!ae || a2Int(ae.points) <= 0 || o?.baneful || !o?.messageId) return null
  const message = game.messages.get(o.messageId)
  const roll = message?.rolls?.[a2Int(o.rollIndex)]
  let ranged = false
  try { ranged = a2xAttackInfo(message, roll)?.kind === 'ranged' } catch (e) { /* not an attack card */ }
  if (!ranged) return null
  const s = a2rAegisSoak(ae.points, total)
  if (!s.soak) return null
  await actor.update({ 'flags.world.a2.aegis': s.left > 0 ? { ...ae, points: s.left } : null })
  return { absorbed: s.soak, note: `Blood Aegis soaks ${s.soak}${s.left > 0 ? ` (${s.left} left)` : ': the barrier is spent'}` }
}
function a2rHasPact (actor) { return Boolean(actor?.flags?.world?.a2?.pactRa) }

async function a2rOnPower (message) {
  const c = message.flags?.world?.a2p
  if (!c || c.repeat || !a2xIsGM() || a2rState.seen.has(message.id)) return
  const name = String(c.power ?? '')
  if (!/^(?:Blood Aegis|Haruspex|Pact with Ra)$/.test(name)) return
  a2rState.seen.add(message.id)
  const actor = a2FromUuid(c.casterUuid)
  if (!actor) return
  if (name === 'Blood Aegis') {
    const st = a2rAegisStart(c.dots)
    await actor.update({ 'flags.world.a2.aegis': { ...st, card: message.id } })
    await ChatMessage.create({ content: `<div class="a2r-line"><p><strong>Blood Aegis:</strong> ${a2Esc(actor.name)}'s barrier holds ${st.points} points against ranged damage.</p></div>`, speaker: ChatMessage.getSpeaker({ actor }), flags: { world: { a2aegis: { actor: actor.uuid } } } })
  } else if (name === 'Haruspex') {
    let crit = false
    try { const r = game.messages.get(c.rollMessageId)?.rolls?.find((x) => x?.options?.a2?.built); crit = Boolean(r && a2RollVerdict(r).critical) } catch (e) { /* no roll */ }
    const uses = a2rHaruspexUses({ win: c.win === true, critical: crit })
    if (!uses) return
    await actor.update({ 'flags.world.a2.haruspex': { uses, night: a2rNight() } })
    await ChatMessage.create({ content: `<div class="a2r-line"><p><strong>Haruspex:</strong> ${a2Esc(actor.name)} holds ${uses} free ${uses === 1 ? 'reroll' : 'rerolls'} until sunrise. The button is on its roll cards.</p></div>`, speaker: ChatMessage.getSpeaker({ actor }) })
  } else if (name === 'Pact with Ra') {
    await actor.update({ 'flags.world.a2.pactRa': { night: a2rNight() } })
    await ChatMessage.create({ content: `<div class="a2r-line"><p><strong>Pact with Ra:</strong> sunlight does ${a2Esc(actor.name)} no harm today. At sunset half its Vitae is lost (applied at New Night).</p></div>`, speaker: ChatMessage.getSpeaker({ actor }) })
  }
}
async function a2rFeedAegis (actor) {
  const ae = actor?.flags?.world?.a2?.aegis
  if (!ae) { ui.notifications.info('No Blood Aegis is up.'); return }
  if (a2Int(ae.fed) >= a2Int(ae.maxFed)) { ui.notifications.warn(`The barrier has taken all the extra Vitae it can (${ae.maxFed}).`); return }
  const vit = a2Int(actor.system?.health?.value)
  if (vit < 1) { ui.notifications.warn('No Vitae to feed it.'); return }
  await actor.update({ 'system.health.value': vit - 1, 'flags.world.a2.aegis': { ...ae, points: a2Int(ae.points) + 2, fed: a2Int(ae.fed) + 1 } })
}
async function a2rHaruspexReroll (message) {
  const actor = a2xSpeaker(message)
  const h = actor?.flags?.world?.a2?.haruspex
  const i = a2xFirstA2Roll(message)
  const roll = message?.rolls?.[i]
  if (!actor?.isOwner || !h?.uses || !roll?.options?.a2?.built) return null
  if (!a2xCanWrite(message) && !a2xGMActive()) { ui.notifications.warn('This needs the GM online: the chat card belongs to another user.'); return null }
  const json = roll.toJSON()
  const n = a2xRerollable(json.terms).length
  if (!n) { ui.notifications.info('No standard dice to reroll on that test.'); return null }
  const fresh = await new foundry.dice.Roll(`${n}d10cs>=6`).evaluate()
  const values = (fresh.dice ?? []).flatMap((d) => (d.results ?? []).map((r) => r.result))
  try { await game.dice3d?.showForRoll?.(fresh, game.user, true) } catch (e) { /* Dice So Nice is optional */ }
  const res = a2rRerollAll(json, values)
  const before = a2Int(json.total ?? roll.total)
  const better = res.json.total > before
  await actor.update({ 'flags.world.a2.haruspex': h.uses > 1 ? { ...h, uses: h.uses - 1 } : null })
  const update = { 'flags.world.a2haruspex': { from: before, to: res.json.total, kept: better ? 'new' : 'first', by: game.user.name } }
  if (better) {
    update.rolls = message.rolls.map((r, j) => (j === i ? res.json : r.toJSON()))
    if (message.rolls.length === 1 && /^\s*\d+\s*$/.test(String(message.content ?? ''))) update.content = String(res.json.total)
  }
  await a2xWriteMessage(message, update)
  if (better && a2xCanWrite(message)) await a2xSyncFrenzy(message)
  return { from: before, to: res.json.total, better }
}

function a2rRenderChat (message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0]
  if (!root) return
  // the barrier's card: points left, and feeding it
  const ag = message.flags?.world?.a2aegis
  const box = root.querySelector('.a2r-line')
  if (ag && box && !box.querySelector('button, .a2r-now')) {
    const actor = a2FromUuid(ag.actor)
    const ae = actor?.flags?.world?.a2?.aegis
    const now = document.createElement('p')
    now.className = 'a2r-now'
    now.textContent = ae ? `Now: ${ae.points} points. Extra Vitae fed: ${a2Int(ae.fed)} of ${a2Int(ae.maxFed)}.` : 'The barrier is gone.'
    box.append(now)
    if (ae && actor?.isOwner && a2Int(ae.fed) < a2Int(ae.maxFed)) { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<i class="fa-solid fa-droplet"></i> Feed the barrier (+2 for 1 Vitae)'; b.addEventListener('click', (ev) => { ev.preventDefault(); a2rFeedAegis(actor) }); box.append(b) }
  }
  // a roll of someone holding a Haruspex reroll
  const roll = message.rolls?.find((r) => r?.options?.a2?.built)
  if (!roll || root.querySelector('.a2r-haruspex')) return
  const done = message.flags?.world?.a2haruspex
  const anchor = root.querySelector('.a2-result') ?? root.querySelector('.message-content')
  if (done) { anchor?.insertAdjacentHTML('beforeend', `<div class="a2r-haruspex a2x-line"><strong>Haruspex:</strong> rerolled every standard die, ${done.from} → ${done.to}; ${done.kept === 'new' ? 'the new roll stands' : 'the first roll was better and stands'}.</div>`); return }
  const actor = a2xSpeaker(message)
  const h = actor?.flags?.world?.a2?.haruspex
  if (!h?.uses || !actor.isOwner || roll.options.a2.frenzyTest) return
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'a2r-haruspex a2x-btn'
  b.innerHTML = `<i class="fa-solid fa-eye"></i> Haruspex reroll (${h.uses})`
  b.title = 'Reroll all standard dice and keep the better result. Never Hunger dice.'
  b.addEventListener('click', (ev) => { ev.preventDefault(); a2rHaruspexReroll(message) })
  ;(root.querySelector('.a2-actions') ?? anchor)?.append(b)
}

async function a2TrackBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.track?.booted) return true
  if (!a2rState.hooked) {
    a2rState.hooked = true
    Hooks.on('createChatMessage', (m) => { a2rOnPower(m).catch((e) => console.error('V6 Automation | tracked power', e)) })
    Hooks.on('renderChatMessageHTML', (message, html) => { try { a2rRenderChat(message, html) } catch (e) { console.error('V6 Automation | tracked power card', e) } })
    Hooks.on('updateActor', (actor, changes) => {
      const a2 = changes?.flags?.world?.a2
      if (!a2 || !('aegis' in a2 || 'haruspex' in a2)) return
      for (const m of game.messages.contents.slice(-30)) if (m.flags?.world?.a2aegis?.actor === actor.uuid || ('haruspex' in a2 && m.rolls?.length && a2xSpeaker(m)?.uuid === actor.uuid)) ui.chat?.updateMessage?.(m)
    })
    Hooks.on('v6a2EndScene', ({ actors } = {}) => { if (game.user.isGM) for (const a of actors ?? []) if (a.flags?.world?.a2?.aegis) a.update({ 'flags.world.a2.aegis': null }) })
    Hooks.on('v6a2NewNight', async ({ actors } = {}) => {
      if (!game.user.isGM) return
      const lines = []
      for (const a of actors ?? []) {
        const f = a.flags?.world?.a2 ?? {}
        const upd = {}
        if (f.haruspex) upd['flags.world.a2.haruspex'] = null
        if (f.pactRa) { const v = a2Int(a.system?.health?.value); const loss = a2rRaLoss(v); upd['flags.world.a2.pactRa'] = null; upd['system.health.value'] = v - loss; lines.push(`${a.name}: the Pact with Ra ends at sunset, ${loss} Vitae lost (${v} → ${v - loss}).`) }
        if (Object.keys(upd).length) { try { await a.update(upd) } catch (e) { console.error('V6 Automation | tracked power at New Night', e) } }
      }
      if (lines.length) await ChatMessage.create({ content: `<div class="a2r-line">${lines.map((l) => `<p>${a2Esc(l)}</p>`).join('')}</div>`, speaker: { alias: 'Storyteller' } })
    })
  }
  api.track = { booted: true, feedAegis: a2rFeedAegis, haruspexReroll: a2rHaruspexReroll, rules: { aegisStart: a2rAegisStart, aegisSoak: a2rAegisSoak, raLoss: a2rRaLoss, haruspexUses: a2rHaruspexUses, rerollAll: a2rRerollAll } }
  console.log('V6 Automation | tracked powers loaded')
  return true
}
globalThis.a2TrackBoot ??= a2TrackBoot

// ---- the sheet's own Actions tab, filled and clickable -----------------------------------
// The system's Actions tab has six lists (General, Physical, Social, Exploration, Downtime,
// Humanity) of "action" items. This part puts the Alpha 2 actions into them as real items
// and makes a click on one do it: an attack opens the roll against your target, a social
// approach rolls your best pool, a downtime action opens the downtime window.
// Shift-click still posts the item to chat, the book icon still opens it.
// A new character gets them when it is made, any other when its sheet is first opened.
// Any other action item with an Attribute in its test becomes clickable the same way.
// The actions also live in the world compendium "V6 Actions (Alpha 2)", which the magnifying
// glass on each list searches.
// Items carry flags.world.a2act { v, kind, ref }. Setting (world): sheetActions (on).

const A2Q_VERSION = 1
const A2Q_GROUP = { Attack: 'physical', Wrestle: 'physical', 'Team and tricks': 'general', Yourself: 'general' }
const A2Q_EXTRA = [
  { ref: 'dodge', kind: 'test', group: 'physical', name: 'Dodge', role: 'defense', act: 'reaction', test: { attributes: ['dexterity'], skills: ['athletics'] }, text: 'Defend against any attack. Costs no reaction (PG p.120).' },
  { ref: 'parry', kind: 'test', group: 'physical', name: 'Parry', role: 'defense', act: 'reaction', test: { attributes: ['dexterity'], skills: ['fighting'] }, text: 'Defend against a melee attack. Costs no reaction (PG p.120).' },
  { ref: 'surge', kind: 'tool', group: 'general', name: 'Blood Surge', role: 'utility', act: 'free', vampire: true, text: 'Spend Vitae for extra dice on one test.' },
  { ref: 'feed', kind: 'tool', group: 'humanity', name: 'Feed', role: 'utility', act: 'action', vampire: true, text: 'Hunt or drink: the feeding window, with Herd and the Masquerade risk.' },
  { ref: 'frenzy', kind: 'tool', group: 'humanity', name: 'Resist frenzy', role: 'defense', act: 'reaction', vampire: true, text: 'The frenzy test: fear, rage or hunger.' },
  { ref: 'bonds', kind: 'tool', group: 'humanity', name: 'Blood Bonds', role: 'utility', act: 'none', text: 'Whose blood binds this character, and how strongly.' }
]
const A2Q_PACK = ['Investigate', 'Track', 'Follow'] // exploration, taken from the system's own actions

// Every action the module puts on a sheet. Pure. → [{ ref, kind, group, name, role, act, test, text, vampire }]
function a2qCatalog () {
  const out = []
  for (const m of A2V_MOVES) {
    if (m.id === 'states' || m.id === 'putout') continue
    out.push({ ref: m.id, kind: 'move', group: A2Q_GROUP[m.group] ?? 'general', name: m.label, role: m.group === 'Attack' || m.group === 'Wrestle' ? 'attack' : 'utility', act: m.instant ? 'minor' : 'action', test: m.test ? { attributes: [...m.test.attributes], skills: [...m.test.skills], modifier: a2Int(m.modifier) } : null, text: `${m.pool ? m.pool + '. ' : ''}${m.hint ?? ''}`, vampire: Boolean(m.vampire) })
  }
  for (const s of A2Y_APPROACHES) out.push({ ref: `soc-${s.id}`, kind: 'social', group: 'social', name: s.label, role: s.id === 'keepcool' ? 'defense' : 'attack', act: 'action', pools: s.pools, text: `${s.pools.map((p) => `${a2Cap(p[0])} + ${a2Cap(p[1])}`).join(' or ')}.${s.note ? ' ' + s.note : ''} The best pool is rolled.` })
  for (const d of A2Y_DOWNTIME) out.push({ ref: `dt-${d.id}`, kind: 'downtime', group: 'downtime', name: d.label, role: 'utility', act: 'downtime', text: d.text })
  out.push(...A2Q_EXTRA.map((x) => ({ ...x })))
  return out
}
// The item to create for one catalogue entry. Pure.
function a2qItemData (c) {
  const first = c.test ?? (c.pools ? { attributes: [...new Set(c.pools.map((p) => p[0]))], skills: [...new Set(c.pools.map((p) => p[1]))] } : { attributes: [], skills: [] })
  const mod = a2Int(c.test?.modifier)
  return {
    name: c.name,
    type: 'action',
    system: {
      description: `<p>${a2Esc(c.text ?? '')}</p>`,
      source: { book: 'V6 Alpha 2', page: '' },
      group: c.group,
      role: c.role ?? 'utility',
      actionType: c.group === 'social' ? 'social' : c.group === 'physical' ? 'physical' : 'mental',
      activation: { activationType: ['action', 'reaction', 'downtime'].includes(c.act) ? c.act : 'action' },
      test: { description: c.pools?.length > 1 ? c.pools.map((p) => `${a2Cap(p[0])} + ${a2Cap(p[1])}`).join(' or ') : '', attributes: first.attributes ?? [], skills: first.skills ?? [], disciplines: [], modifier: { valueSource: 'flat', value: Math.abs(mod), valueTrait: '', mode: mod < 0 ? 'subtract' : 'add' } }
    },
    flags: { world: { a2act: { v: A2Q_VERSION, kind: c.kind, ref: c.ref } } }
  }
}
// Which catalogue entries an actor still lacks. Pure. have: refs already on the sheet.
function a2qMissing (catalog, have, { vampire = true } = {}) {
  const set = new Set(have)
  return catalog.filter((c) => !set.has(c.ref) && (vampire || !c.vampire))
}

const a2qState = { hooked: false, busy: new Set(), filled: new Set() }
function a2qOn () { return a2Enabled() && a2eGet('sheetActions', true) !== false }
function a2qHave (actor) { return actor.items.filter((i) => i.type === 'action' && i.flags?.world?.a2act?.ref).map((i) => i.flags.world.a2act.ref) }
function a2qFits (actor) { return actor?.documentName === 'Actor' && actor.type !== 'npc' && Boolean(a2Rules(actor)) }
async function a2qPackItems () {
  const out = []
  try {
    const pack = game.packs.get('wod6e.actions')
    const docs = pack ? await pack.getDocuments() : []
    for (const n of A2Q_PACK) {
      const d = docs.find((x) => x.name === n)
      if (!d) continue
      const o = d.toObject()
      delete o._id
      o.flags = { ...(o.flags ?? {}), world: { ...(o.flags?.world ?? {}), a2act: { v: A2Q_VERSION, kind: 'test', ref: `x-${n.toLowerCase()}` } } }
      out.push(o)
    }
  } catch (e) { console.error('V6 Automation | system actions', e) }
  return out
}
async function a2qSync (actor, { quiet = true } = {}) {
  if (!a2qFits(actor) || !actor.isOwner || a2qState.busy.has(actor.id)) return 0
  a2qState.busy.add(actor.id)
  try {
    const have = a2qHave(actor)
    const vampire = a2Creature(actor) === 'vampire'
    const data = a2qMissing(a2qCatalog(), have, { vampire }).map(a2qItemData)
    for (const p of await a2qPackItems()) if (!have.includes(p.flags.world.a2act.ref)) data.push(p)
    if (data.length) await actor.createEmbeddedDocuments('Item', data)
    if (!quiet) ui.notifications.info(data.length ? `${actor.name}: ${data.length} actions added to the Actions tab.` : `${actor.name} already has every action.`)
    return data.length
  } finally { a2qState.busy.delete(actor.id) }
}
// the system keeps a test's traits in Sets
function a2qTest (item) { const t = item?.system?.test ?? {}; return { attributes: [...(t.attributes ?? [])], skills: [...(t.skills ?? [])], disciplines: [...(t.disciplines ?? [])], modifier: t.modifier ?? null } }
function a2qBest (actor, keys, kind) {
  const val = (k) => { const t = actor.system?.[kind]?.[k]; return a2Int(t?.effective ?? t?.value) }
  return [...(keys ?? [])].sort((x, y) => val(y) - val(x))[0]
}
// Do what an action item stands for. → true when the module handled it.
async function a2qRun (actor, item) {
  const f = item?.flags?.world?.a2act
  const A = globalThis.V6Alpha2 ?? {}
  if (!actor?.isOwner) { ui.notifications.warn(`You don't own ${actor?.name}.`); return true }
  if (f?.kind === 'move') { await a2vRun(actor, f.ref); return true }
  if (f?.kind === 'downtime') { await A.story?.downtime?.(actor); return true }
  if (f?.kind === 'tool') {
    if (f.ref === 'surge') await A.tools?.bloodSurge?.(actor)
    else if (f.ref === 'feed') await A.tools?.feed?.(actor)
    else if (f.ref === 'frenzy') await a2xFrenzyTest(actor, {})
    else if (f.ref === 'bonds') await A.story?.bonds?.(actor)
    return true
  }
  if (f?.ref === 'dodge' || f?.ref === 'parry') {
    // answer the attack that is waiting, with everything a defence gets; without one it is a plain roll
    const attack = a2oPendingAttack(actor)
    if (attack) { await a2oDefend(attack, actor, f.ref); return true }
    ui.notifications.info(`No attack on ${actor.name} is waiting for a defence: rolling ${f.ref === 'parry' ? 'Dexterity + Fighting' : 'Dexterity + Athletics'} as a plain test.`)
    a2oPlainNext(actor)
  }
  const t = a2qTest(item)
  if (f?.kind === 'social') {
    const s = A2Y_APPROACHES.find((x) => `soc-${x.id}` === f.ref)
    const p = s ? a2yBestPool(actor, s.pools) : null
    if (p) { await a2eOpenRoll(actor, { attributes: [p[0]], skills: [p[1]], disciplines: [] }); return true }
  }
  if (!(t.attributes?.length || t.skills?.length || t.disciplines?.length)) return false
  // alternatives are listed side by side: roll the best Attribute with the best Skill
  const test = { attributes: t.attributes?.length ? [a2qBest(actor, t.attributes, 'attributes')] : [], skills: t.skills?.length ? [a2qBest(actor, t.skills, 'skills')] : [], disciplines: [...(t.disciplines ?? [])] }
  const mv = a2Int(t.modifier?.value)
  if (mv && (t.modifier?.valueSource ?? 'flat') === 'flat') test.modifier = { valueSource: 'flat', value: mv, mode: t.modifier.mode === 'subtract' ? 'subtract' : 'add' }
  await a2eOpenRoll(actor, test)
  return true
}
function a2qPoolText (actor, item) {
  const f = item.flags?.world?.a2act
  if (f?.kind === 'downtime') return 'downtime'
  if (f?.kind === 'tool') return ''
  if (f?.kind === 'move') { const m = A2V_MOVES.find((x) => x.id === f.ref); return m?.pool ?? '' }
  const t = a2qTest(item)
  let a = t.attributes
  let s = t.skills
  if (f?.kind === 'social') { const ap = A2Y_APPROACHES.find((x) => `soc-${x.id}` === f.ref); const p = ap ? a2yBestPool(actor, ap.pools) : null; if (p) { a = [p[0]]; s = [p[1]] } }
  const parts = [a.length ? a2Cap(a2qBest(actor, a, 'attributes')) : null, s.length ? a2Cap(a2qBest(actor, s, 'skills')) : null].filter(Boolean)
  const mv = a2Int(t.modifier?.value)
  return parts.join(' + ') + (mv ? ` ${t.modifier.mode === 'subtract' ? '−' : '+'}${mv}` : '')
}
function a2qRenderSheet (app, element) {
  try {
    const actor = app?.document ?? app?.actor
    if (!a2qOn() || actor?.documentName !== 'Actor') return
    const root = element instanceof HTMLElement ? element : element?.[0]
    const tab = root?.querySelector('section.actions-section, section.tab[data-tab="actions"]')
    if (!tab) return
    for (const row of tab.querySelectorAll('.action-row[data-item-id]')) {
      if (row.dataset.a2q) continue
      const item = actor.items.get(row.dataset.itemId)
      const t = a2qTest(item)
      if (!item || !(item.flags?.world?.a2act || t.attributes?.length || t.skills?.length)) continue
      row.dataset.a2q = '1'
      row.classList.add('a2q-row')
      const label = row.querySelector('button.sheet-section-label, .sheet-section-label')
      if (!label) continue
      label.title = 'Click: do it. Shift-click: post to chat.'
      const pool = a2qPoolText(actor, item)
      if (pool) { const s = document.createElement('span'); s.className = 'a2q-pool'; s.textContent = pool; row.append(s) }
      label.addEventListener('click', (ev) => {
        if (ev.shiftKey || !actor.isOwner) return
        ev.preventDefault(); ev.stopImmediatePropagation()
        a2qRun(actor, item).catch((e) => console.error('V6 Automation | sheet action', e))
      }, true)
    }
    // any sheet that is opened gets the base actions it lacks, once per session
    // one client does it: the Storyteller when one is online, otherwise whoever opened the sheet
    const mine = game.users?.activeGM ? game.users.activeGM.isSelf : true
    if (mine && a2qFits(actor) && actor.isOwner && !actor.pack && !a2qState.filled.has(actor.id)) {
      a2qState.filled.add(actor.id)
      if (a2qMissing(a2qCatalog(), a2qHave(actor), { vampire: a2Creature(actor) === 'vampire' }).length) a2qSync(actor).catch((e) => console.error('V6 Automation | action lists', e))
    }
  } catch (e) { console.error('V6 Automation | sheet actions', e) }
}
async function a2qSyncAll () {
  if (!game.user.isGM || !a2qOn()) return 0
  let n = 0
  for (const a of game.actors) { if (a2qFits(a) && a.hasPlayerOwner) { try { n += await a2qSync(a) } catch (e) { console.error('V6 Automation | action lists', a.name, e) } } }
  return n
}

// The same actions as a world compendium, so the magnifying glass on each list (the system's
// compendium browser) offers the Alpha 2 actions next to the system's own.
async function a2qCompendium () {
  if (!game.user.isGM || !a2qOn()) return null
  const CC = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection
  let pack = game.packs.get('world.v6-actions')
  if (!pack && CC?.createCompendium) pack = await CC.createCompendium({ name: 'v6-actions', label: 'V6 Actions (Alpha 2)', type: 'Item' })
  if (!pack) return null
  const docs = await pack.getDocuments()
  const have = docs.map((d) => d.flags?.world?.a2act?.ref).filter(Boolean)
  const data = a2qMissing(a2qCatalog(), have).map(a2qItemData)
  for (const p of await a2qPackItems()) if (!have.includes(p.flags.world.a2act.ref)) data.push(p)
  if (!data.length) return pack
  const locked = pack.locked
  if (locked) await pack.configure({ locked: false })
  await Item.implementation.createDocuments(data, { pack: pack.collection })
  if (locked) await pack.configure({ locked: true })
  return pack
}

async function a2ActsBoot () {
  globalThis.V6Alpha2 ??= {}
  const api = globalThis.V6Alpha2
  if (api.acts?.booted) return true
  a2eReg('sheetActions', { name: 'Actions on the character sheet', hint: 'Fill the six lists of the sheet\'s Actions tab with the Alpha 2 actions for every player character, and make a click on an action do it (Shift-click posts it to chat).', scope: 'world', config: true, type: Boolean, default: true })
  if (!a2qState.hooked) {
    a2qState.hooked = true
    Hooks.on('renderActorSheetV2', a2qRenderSheet)
    Hooks.on('createActor', (actor, options, userId) => { if ((game.users?.activeGM ? game.users.activeGM.isSelf : userId === game.user.id) && a2qOn() && a2qFits(actor) && !actor.pack) a2qSync(actor).catch(() => {}) })
    Hooks.on('updateActor', (actor, changes) => { if (changes?.ownership && game.users?.activeGM?.isSelf && a2qOn() && a2qFits(actor) && actor.hasPlayerOwner) a2qSync(actor).catch(() => {}) })
    const style = document.createElement('style')
    style.id = 'v6a-acts-style'
    style.textContent = `
.a2q-row { display: flex; align-items: center; gap: 6px; }
.a2q-row .sheet-section-label { flex: 1; text-align: left; cursor: pointer; }
.a2q-row .sheet-section-label:hover .item-name { color: var(--v6-gold, #d2aa5a); }
.a2q-pool { flex: 0 0 auto; font-size: 11px; opacity: 0.65; white-space: nowrap; padding-right: 4px; }
.a2v-sheet header a[data-a2q-fill] { font-size: 11px; text-transform: none; letter-spacing: 0; margin-left: auto; margin-right: 10px; }
`
    document.getElementById('v6a-acts-style')?.remove()
    document.head.appendChild(style)
  }
  api.acts = { booted: true, compendium: a2qCompendium, sync: a2qSync, syncAll: a2qSyncAll, run: a2qRun, catalog: a2qCatalog }
  const packUp = () => a2qCompendium().catch((e) => console.error('V6 Automation | action compendium', e))
  if (game.ready) packUp(); else Hooks.once('ready', packUp)
  if (game.ready) a2qSyncAll().catch((e) => console.error('V6 Automation | action lists', e))
  else Hooks.once('ready', () => a2qSyncAll().catch((e) => console.error('V6 Automation | action lists', e)))
  console.log('V6 Automation | sheet actions loaded')
  return true
}
globalThis.a2ActsBoot ??= a2ActsBoot

if (game.ready) v6aBoot(); else Hooks.once('ready', v6aBoot)
