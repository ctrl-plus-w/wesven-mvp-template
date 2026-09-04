# design.md

Guidance for any agent building an interface for the Wesven Orchestrator.

Read this before writing a screen. It carries the judgment — who reads this
product, what a screen owes them, and the failure patterns we keep having to
correct. It does not carry the token values; those live in the design system,
and the section "Reaching the system" says how to get them without spending
context on them.

This file is young. It was written against one built surface (the Runs
console) and will be corrected as generated pages come back wrong. When a
correction lands, it goes in the narrowest place that can enforce it — a rule
here if it needs judgment, a token or a kit component if it can be made
deterministic. Prefer the deterministic place.

---

## The product

A single-user daemon that runs Claude Code agents through a
`dev → (refactor →) validate → summarize → (judge →) PR` pipeline against
YAML-described DAGs. The output is a stack of green pull requests.

It has been driven from a terminal its whole life. The UI is not a friendlier
front door for a beginner — it is a better instrument for someone who already
knows the CLI and is tired of holding twelve run ids in their head.

## The reader

One person. Technical, the author of the specs being run, usually returning to
a screen mid-incident to answer one of four questions:

1. **Is anything broken right now?** — the daemon is down, a run is blocked, a
   judge came back `revise`, a PR failed to open.
2. **What is this run actually doing?** — which task, which stage, how long,
   and is it moving or parked on a rate-limit wait.
3. **Why did that fail?** — the transcript, the validate output, the diff
   between generations.
4. **What do I press to fix it?** — retry, fix with feedback, open-pr,
   push-retry, resume, cancel.

Design for the returning reader, not the first-time one. They do not need the
pipeline explained; they need to see where it stopped. A screen that takes
more than a few seconds to answer its question has failed, however handsome.

**Both reads at once.** Every screen is scanned before it is read. The scan
answers "is this fine?" from status and shape alone — colored dots, progress,
counts. The read answers "what exactly happened?" from ids, shas, timestamps
and transcripts. Serve the scan with position and color; serve the read with
monospace detail below it. Never make the reader parse text to learn something
a dot could have told them.

---

## Reaching the system

The design system is **Astryx**, and the project's theme is its **neutral**
theme, checked in as editable source at `design/astryx/neutralTheme.ts`.

You do not need to read the system's CSS, and should not — it compiles to
StyleX atomic classes (`.x10a8y8t`) that carry no meaning in context. Ask the
CLI instead. It is installed as a project dependency:

```
astryx build "<what you are making>"   # start here: closest page + blocks + components
astryx component <Name>                # props, examples, theming targets
astryx docs layout                     # the frame-first method — read before any screen
astryx docs tokens                     # the full token reference
astryx search "<thing>"                # find a component when you don't know its name
```

There are 163 components. Almost everything this product needs already exists:
`AppShell`, `Layout`/`LayoutPanel`, `SideNav`, `Table`, `List`/`ListItem`,
`StatusDot`, `Token`, `Badge`, `Stepper`/`Step`, `CommandPalette`, `CodeBlock`,
`Banner`, `EmptyState`, `Timestamp`, `TreeList`, `SegmentedControl`,
`Collapsible`, `AlertDialog`, `MoreMenu`, `Toolbar`, `Kbd`. Look before you
build. A hand-rolled version of a component that exists is a defect, not a
shortcut — it will drift on the next theme change.

**Semantic tokens only.** Every color, space and radius is a token named by
purpose. No hex, no rgb, no px for interior spacing. `var(--color-text-secondary)`,
not `#a3a3a3` — the second one is correct today and wrong the moment the theme
moves, and it silently breaks light mode, which the theme fully supports via
`light-dark()`.

**When the target cannot import React.** Mockups and design canvases can't
mount Astryx components. Then, and only then, copy the component's anatomy —
its real metrics, read from source — into markup and inline styles, and keep
the copies in one kit module so they stay consistent. `design/canvas/kit.mjs`
is that module for the design canvas, and `design/canvas/tokens.css` is the
theme compiled to plain custom properties by `astryx theme build`. Copying
anatomy is a fallback. Importing the component is the default.

---

## Frame first

Settle the shell and its region budgets before a single row of content exists.
Content-first drifts into a padded column of cards, each section inventing its
own container.

- `AppShell` with a `SideNav`. The nav absorbs destinations we have not planned
  yet, groups them, and collapses. This product's nav is already three groups
  deep (Operate / Library / System) and will grow.
- **SideNav: 240px.** These are budgets, not suggestions; structural widths
  are the one place raw px belongs.
- The content region **fills**. Runs, tasks, logs and transcripts are tabular
  or streaming; they get the whole region. Do not cap them to a reading column.
  Only prose and forms cap, via `Layout contentWidth` — 640 for a settings
  form, 960 for mixed content.
- Master-detail is the house pattern: a table that fills, and a detail surface
  for the selected record. Selecting a row must not navigate away — the
  operator is comparing rows.
- Pin the region header and footer as `Layout` slots so they survive scrolling.
  Padding set once on `Layout` reaches all three slots and keeps one content
  line.
- Give the detail surface an `EmptyState` for the nothing-selected case so the
  region never collapses.

### Peek panel or working sheet

There are two detail surfaces and they are not interchangeable. Choose by what
the reader has to do next, not by how much room is going spare.

- **Peek panel — `LayoutPanel`, 380px, in the `end` slot.** For identifying and
  comparing: which run is this, what is its status, what are its tasks. It sits
  beside the table so the reader keeps the list in view and can arrow down it.
  Summary and links only.
- **Working sheet — an overlay at ~60% of the viewport (about 860px at 1440).**
  For the work itself. The moment a reader needs the transcript, the validate
  output, or the diagnose triage, they are no longer comparing rows — they are
  reading one record in depth, and 380px is too narrow for a log line or a
  stack trace.

The sheet carries the record's full working set inline, under tabs — Overview,
Tasks, Logs, Diagnose — so investigating a failure never bounces the reader
through three screens and loses their place in the list. Logs and diagnose
belong **in** the sheet, not behind a link out of it. Keep the sheet dismissible
back to the list with the list's scroll position intact.

### Peek, sheet, or split

A third frame joins the two above, and the difference is how long the reader
stays.

- A **peek panel** (380px) is for a glance that does not lose the list.
- A **working sheet** (~60%) is for inspecting one record: read it, act, close.
- A **persistent split** — a rail beside a working pane — is for a surface the
  reader *works in*, for minutes, moving between records without losing their
  place. The intake grill is the case: answer, read the next question, answer
  again. Putting that in a sheet would mean an overlay that never closes, which
  is a split wearing the wrong clothes.

Ask how long the reader stays. Seconds is a peek, a minute is a sheet, and
anything sustained is a split.

## Containers

Use the weakest container that reads as a group, and escalate only when it
fails. In order: **spacing → Divider → Section → Card**.

- Records are **rows**. `Table` when there are columns to align, `List`/`Item`
  when each record is one line. Never one `Card` per record.
- `Section` is the default page-structure unit. It has no border and needs
  none.
- `Card` is for a self-contained widget or a hard boundary — a stat tile, a
  chart, a settings group. Not for page structure, and never nested.

## Collections

Runs, tasks, intakes and scaffolds are collections, and every collection screen
ships the same four pieces of furniture. A list with none of them is unfinished,
however good the rows look.

**Scope, not filters.** The reader almost never wants everything. They arrive
with a project in mind and a working state in mind. So the screen opens
**already scoped** — active runs, current project — and the scope is the most
prominent control on it.

- **Saved views** as a `SegmentedControl` or `TabList` across the top of the
  region: `Active` · `In progress` · `Blocked` · `Scheduled` · `All`. These are
  named states of the reader's work, not raw enum filters — one view may cover
  several statuses, and `Blocked` deserves its own view because it is the one
  that needs a human. Show the count on each view so the reader can see where
  the problems are without switching.
- **Project is a scope, not a filter chip.** It sits apart from the other
  controls, and it persists across screens. A reader working in one repo should
  not have to reselect it on every list.
- Everything else — status, stage, caller type, date — is a secondary filter,
  and secondary filters are additive on top of the view.
- Make the active scope legible in one glance, and make clearing it one click.
  A reader who cannot tell they are looking at a filtered list will file a bug
  about missing data.

**Search.** Every collection is searchable, over the fields the reader actually
holds in their head: slug, id (short or full), branch name, project. Searching
widens the scope to all statuses by default — someone typing an id is looking
for that record, not for records matching their current view.

**Sort.** Columns that carry an ordering — started, duration, generation,
progress — sort from their header. Default to most-recent-first. Keep the sorted
column marked; an unmarked sort is a bug report waiting to happen.

**Pagination.** Bound the list and say how many there are. `runs prune` exists
because this table grows without limit; the UI must not pretend otherwise.
Prefer a page size that fills the region once, and put the total next to the
control so the reader knows whether their search worked.

### A rail is a collection too

A 320px rail holding a list is a collection, and it earns everything the
*Collections* rules give a full-width table: scope, search, sort, pagination,
counts, and an empty state that names what was searched.

**Its controls do not live inside it.** Scope selects, view tabs, search and
the primary action go in the page toolbar above the split, spanning the full
width, exactly where they sit on a table screen. Crammed into the rail they
overflow at the first long project name — and a rail that scrolls forever with
no page footer hides how much there is.

## Density

Compact. This is a monitoring surface: high-volume, fast scan.

- `Table density="compact"`, paired with `size="sm"` controls. One control size
  per row.
- **A row may carry two lines when the collection is small and searched.** The
  reader's identifier is rarely one field: a run is its slug *and* its short id
  *and* its status. Stacking those into one identity cell — the name and its
  status chip on the first line, the id and its metadata on the second, in
  monospace and secondary — is denser than spreading them across three columns,
  and it frees the remaining columns for information that is currently missing:
  duration, current stage, PR count, base sha, who is waiting on what. Two lines
  in one cell beats three half-empty columns.
- This trade only works because these lists are short and scoped. A collection
  the reader scrolls through in the hundreds goes back to single-line rows.
- Contrast tight and generous gaps so grouping does work — 4–8px binds inside
  an item, 16–24px separates sections. One repeated gap everywhere means
  proximity is telling the reader nothing.
- The container owns padding; children carry zero margins. Where a component
  has its own inset (`List` ~8px, table cells 12–16px), the container gives up
  its padding and the component owns the content line. Draw one vertical line
  down the left edge: every label should touch it, and only hover and selected
  backgrounds should cross it.

---

## Status is the whole product

This is the rule most worth getting right, and the first one this file got
wrong.

**Status is a chip — `Token`, with a color variant and a leading icon.**
Not a bare dot. The design system is explicit about why: `StatusDot` ships five
variants and its own guidance says to *"avoid encoding many distinct states in a
single dot, since color and size alone cannot reliably distinguish them."* A run
has eleven statuses and a task has nine. A dot cannot carry them, and a reader
should never have to learn a color key to use this product.

So the three components divide like this, and the division is load-bearing:

- **`Token`** — status. Eleven color variants, a leading icon, optional trailing
  content. The icon matters: it carries the status as a *shape*, so the meaning
  survives for a colorblind reader and in a grayscale export. Use a different
  icon per status, never the same icon in nine colors.
- **`StatusDot`** — binary presence only. Is the daemon up. Is the log stream
  live. Pair it with a visible label; it is not accessible alone. Its pulse is
  reserved for states that need attention now, never for decoration.
- **`Badge`** — counts and quantities. A count on a nav item, a task total, a
  page count. Never a status.

**Do not flatten the state space.** The distinctions are load-bearing:

- `complete_succeeded` is green.
- `complete_succeeded_with_warnings` and
  `complete_succeeded_with_failures` are **not** green. Rendering them green is
  the single most damaging thing this UI can do — it tells the operator to stop
  looking at a run that still needs them. Warnings read yellow; partial
  failures read orange.
- `complete_dev_passed_refactor_failed` is its own outcome. Say what it is.
- `blocked` is not `failed`. It is waiting on a human, and it is the state most
  worth surfacing on the home screen — and the one that earns its own saved
  view.
- `queued`, `scheduled` and `cancelled` are neutral-grey and quiet. They are
  not problems.

**Qualifiers are not statuses, and must not be spelled as prose.**
`waitingForRateLimit` means every in-flight agent call is parked on a
rate-limit reset — the run is running, not stuck, and the reader needs to know
not to intervene. Give it its own mark next to the status chip, not a chip of
its own. Same for the stale advisory: a non-null `staleSinceGeneration` means
this task is built on a parent a fix has moved. It is a warning about
correctness, not a failure, and it names the parent.

**`prStatus` is independent of task status.** A task can succeed and its PR
still fail to open. Never merge the two into one indicator.

**The pipeline is a `Stepper`.** Six stages is inside its 3–7 range, and its
anatomy is doing real work: a progress segment above each step, a 16px
indicator that reads as a check when done and a ring when current, and labels
on one baseline. Use it rather than a hand-drawn row of dots — a hand-drawn one
loses the progress track, which is the part that shows how far along the run is
at a glance.

Its `status` axis is deliberately separate from its progress axis: **a completed
step can still carry a warning.** That is exactly `complete_dev_passed_refactor_failed`
— refactor ran to completion and failed — and it is why the pipeline must not be
modelled as a single done/not-done sequence.

**`generation`** increments when a task is retried or fixed. Show it when it is
greater than 1 — it is the operator's only clue that what they are looking at
is not the first attempt — and keep it quiet when it is 1.

## Cost and time are status too

An agent pipeline fails in ways a status enum never captures. A run is
technically `running` while a stage burns four times its usual tokens, retries
three times, or sits silent against its budget. The reader needs to see that
without opening a transcript, so a detail surface carries the numbers, not just
the state.

Every record's overview shows:

- **Timestamps, absolute and relative, together.** `14:22:06 · 12m ago`. The
  relative form answers "is this recent"; the absolute form is what gets
  correlated against a log line or a trace, and it is monospace because it gets
  copied.
- **Elapsed, per stage.** A total tells the reader a run is slow; a per-stage
  breakdown tells them which stage to look at.
- **Token usage, in and out, per stage,** with the run's cost. This is the
  product's real unit of expense and its most sensitive anomaly signal — a
  prompt that has started looping shows up as a token spike long before it
  shows up as a failure.
- **Attempts.** A stage that succeeded on attempt 3 of 3 is not the same as one
  that passed first time, and the difference predicts the next failure.
- **The qualifiers that explain a stall:** rate-limit waits, and elapsed
  against the silence budget.

**Show the comparison, not just the number.** `48.2k tokens` means nothing on
its own; `48.2k · 3.1× this run's average` means something immediately. Compare
against the previous generation where there is one, since a retry that costs
triple is the thing worth catching. A number the reader cannot judge is
decoration — see *Dashboard slop*.

## History is navigation, not a log

When the system walks the reader through a sequence — a grill's branches, a
run's generations, a task's attempts — the record of what already happened is
not an archive at the bottom of the page. It is how the reader moves.

- **Everything asked stays reachable.** Every branch the grill has put to the
  reader remains selectable, in ask order, numbered.
- **Selecting a past item opens it in the same frame the live one uses**, in
  review: the same question, the same options, the chosen one marked, the
  recommendation still marked so the reader can see whether it was taken. A
  separate read-only rendering would make them re-learn the layout.
- **Give it a position and a step control.** "Branch 5 of 9" with previous and
  next. The reader should never have to hunt the list to move one step.
- **Navigation reaches what has happened, never what has not.** Stepping
  forward stops at the open item; unasked questions are not spoilers to browse.
- **Filter the history by who or what**, and make the filter carry counts —
  `All 5 · You 3 · Agent 1 · Parked 1 · Blocking 3`. "Show me only what the
  agent decided" is the single most valuable thing the reader can ask of this
  list, and it should be one click.
- **Getting back is explicit.** A "back to the open question" control, always
  visible while reviewing, so the reader never feels stranded in the past.

## Type and color

- Two text colors: `--color-text-primary` and `--color-text-secondary`.
  Nothing dimmer. `--color-text-disabled` is for disabled controls, not for
  content; it fails contrast.
- Rank with **weight and color, not size**. One lead per region. Demote by
  stepping to secondary, never by shrinking.
- Body copy takes no props. If every value on a screen has been styled, nothing
  is emphasized.
- Color means status, and nothing else. The theme's nine categorical hues exist
  for data series and for tagging kinds — not for decorating sections.
- **Monospace is semantic.** Ids, shas, branch names, paths, durations,
  counts and log output are `--font-family-code`. Prose is not. The reader uses
  the font switch to know what is copy-pasteable.

## Copy

- Use the product's nouns exactly as the CLI and the PRD use them: run, task,
  stage, attempt, generation, scaffold, intake, starter, agent bundle, forge.
  Never invent a synonym — "job", "build", "workflow" all mean something else
  here.
- **Capitalize what we write; keep verbatim what the system owns.** A status
  chip reads `Blocked`, a column header reads `Duration`, a view reads
  `In progress`. The CLI's lowercase enum spelling is an implementation detail
  and should not leak into a label — `complete_succeeded_with_failures` is
  data, "Succeeded · 1 failed" is the label for it. What stays exactly as the
  system spells it: ids, shas, branch names, task ids (`t-3`), file paths, RPC
  method names, stage names inside a log line, and anything the reader might
  paste back into a terminal. Those are monospace, and monospace is the signal
  that a value is literal. A screen that lowercases its prose to look
  terminal-native is doing the opposite of helping.
- Prefer the concrete claim to the reassuring one. "3 of 8 tasks, t-3 running
  12m" beats "In progress".
- Say what failed and what to press. An error that names a `failure_category`
  and offers the retry is worth more than a well-composed apology.
- Timestamps: relative for recency (`12m ago`), absolute and monospace when the
  reader may need to correlate with a log or a trace.
- Never fabricate a value to fill a layout. If a field is unknown, render it as
  unknown.

## Every action, in two places

The UI has to reach the whole CLI. That means every action lives in **both**:

1. **In context** — on the record it acts on. A run's verbs on the run, a
   task's on the task, an intake's answer controls on the open question.
2. **In the command palette** — `⌘K`, reaching every method including the rare
   administrative ones (`prune`, `diagnose`, `doctor`, `install`).

An action that exists only in the palette is undiscoverable. An action that
exists only in a buried menu is unreachable at speed. Neither is a fallback for
the other.

Destructive and irreversible actions confirm, and the confirmation states what
will be destroyed in the reader's terms — "deletes 4 local branches and 12
`refs/wesven/*` refs", not "This cannot be undone." Anything the CLI gates
behind `-y/--yes` gates here.

Long-running actions report progress and stay cancellable. Streaming log views
say plainly whether they are live or detached.

---

## The keyboard is a first-class surface

The reader is a developer who came here from a terminal. Reaching for the mouse
to do a thing they did forty times yesterday is the regression. So the two
places every action must live — in context, and in the palette — get a third
for the ones done repeatedly: **a key.**

**Show the key on the control it drives.** A `Kbd` chip on the button, the tab,
the nav row, the option. The helper is a reference, not the only place a
shortcut exists — see *Hidden key*. A dim chip on an inactive control and a
solid one on the active control keeps this from becoming noise.

**`?` opens the helper from anywhere,** and it is **grouped by surface**, not
one flat alphabetical list. The same key legitimately means different things in
different contexts, and a flat list hides exactly that.

**One key, one meaning per screen.** When two surfaces are on screen at once,
the digits belong to the one the reader is working in, and the other gets a
cycle key. On Runs the list owns `1`–`5` for saved views; on Intake the grill
owns `1`–`3` for options, so the intake list cycles its views with `V`. Never
let one key mean two things at the same moment — see *Key roulette*.

**A chord shows that it is waiting.** `G` then `R` is a good idiom only if a
half-typed `G` puts something on screen saying so. Silence after the first key
reads as a dropped keystroke.

**Escape peels one layer, in a fixed order:** helper, pending chord, focused
text field, open sheet, active search. One press, one layer, always the
frontmost. Never close two things at once.

**Typing wins.** While a text field has focus, letters are letters — the
handler returns immediately. Only `Escape` and the field's own commit key are
intercepted, and the commit key is the one the field is for: `↵` in the
*because* field answers the question, because that is what the reader came to
that field to do.

**Focus is visible, and separate from selection.** `J` / `K` move a focus ring;
`↵` acts on it. A reader who cannot see where they are cannot use the keyboard,
and a focus that moves off-screen without the viewport following is the same
bug — move focus, then scroll it into view.

**Leave the browser's keys alone.** No overriding find, refresh, or tab
switching. `⌘K` is ours by convention; `⌘F` is not.

## Verification instead of review

Parts of this system exist so a person does not have to read the output. The
scaffolder decomposes a PRD into tasks; the gates check that every acceptance
anchor is cited by some task and that no task cites an anchor the PRD does not
have. `gates.ts` says what that is for outright: it is "how 'no scaffold review'
is earned: verifiability instead of trust."

**A screen that fronts a mechanical check leads with the check, not the
output.** The generated YAML is not the centrepiece of the scaffold screen —
`14/14 anchors covered, 0 uncited criteria` is. The spec is one tab over, for
when the reader wants it. Put it first and the reader starts proof-reading a
decomposition the machine already proved, which is exactly the work the gate was
built to delete.

**Name the gate and say whether it is hard.** Coverage and traceability are two
gates, not one number. Each gets its own tile with its own verdict, its own
count, and one line saying what it enforces. A reader who fails a gate needs to
know which rule they are arguing with.

**A failure is a list of violations in the system's own words.** Not "gates
failed" — `uncovered anchor A7 — "A voided invoice keeps its number"`,
`task t-5 cites A19, which is not a PRD anchor`. Those strings already exist in
`describeGateViolation`; the UI's job is to rank them, not to rewrite them.
Coverage violations sort above citation violations, because a dropped
requirement is worse than a bad reference.

**Show the traceability, not just its verdict.** The count `12/14` is the
summary; the thing that lets a person act is the matrix — every anchor, its
criterion text, and the tasks citing it, with the uncovered rows marked. That
turns "two anchors are uncovered" into "*these* two requirements were dropped",
which is a fixable statement.

**A gate that did not run did not pass.** A source with no anchors is not
`0/0 covered` and not green. It is **Not anchored**, in the neutral hue, saying
the gates do not apply and this one needs reading. `anchors.ts` distinguishes
"not anchored" from "zero anchors, all covered" deliberately; the UI must
preserve that distinction or it converts an unchecked artifact into a checked
one.

**Attempts are the record of the argument.** When generation retries, each
attempt shows its own gate report and the feedback that was fed back. A reader
seeing `9/14 → 10/14 → 12/14` learns something a single final verdict hides: the
retries were working, and the budget ran out before the gate did.

## Destructive actions confirm in place

The CLI puts `-y/--yes` in front of `runs.cancel`, `runs.prune`, `tasks.retry`,
`projects.remove`, `scaffolds.prune` and the rest. The UI owes the same gate,
and owes it in the same frame — a destructive confirm is not a modal that
replaces the context the reader is using to decide.

**The confirm replaces the action row, in place.** The record stays on screen
behind it. The reader decides while still looking at the thing they are about to
destroy.

**Name the record and the consequence, not the verb.** Not "Are you sure?" —
"Prune `billing-rework`? Removes the scaffold row from the database and its
directory from disk. This cannot be undone." Say what survives, too: an active
scaffold is skipped rather than pruned, and a reader who does not know that will
assume the worst.

**Escalations are opt-in checkboxes on the confirm, never the default.**
`--include-branches` and `--include-db` widen the blast radius, so they are
choices made at the moment of confirming, each labelled with the flag it maps
to.

**Show the command the confirm is about to run.** One monospace line —
`scaffolds prune --ids sc4c11e9 --include-branches -y` — that updates as the
escalations are ticked. It is the honest description of the effect, it teaches
the CLI, and it makes a wrong choice visible before it is made.

**Confirming is a keyboard layer with exactly two exits.** `↵` goes ahead, `Esc`
backs out, digits toggle the escalations, and nothing behind the confirm
responds while it is up. A destructive action must never be reachable by a
single keystroke: the key that asks (`X`) and the key that does (`↵`) are
different keys, in different layers.

**Destructive is a colour, not a shout.** The button carries `error`; the strip
carries `error-muted`. One red button, no red page.

## A dialog composes; it never confirms

A confirm and a dialog are not two sizes of the same thing. **A confirm is about
a record that already exists, so it happens in that record's row** — the rule
above. **A dialog is for composing something that does not exist yet**: a run,
a project, an intake, a scaffold, a PRD. Nothing in the dialog family can delete
anything, and nothing destructive is allowed to migrate into one.

**The primary either fires, or says on its own face what is stopping it.** A
blocked primary wears the blocking check as its label — not "Submit", greyed
out, with the reason three sections up. The sentence beside it repeats the why
and, where there is one, the fix. There is no disabled button on these surfaces
whose reason lives somewhere else.

**Everything the dialog will do is a gate list, and the soft failures are in
it.** Each check is pass, warn or fail, with a line of why underneath. A warning
never blocks — it changes what the primary says and stays visible while you
decide. A dialog that shows only the blockers is teaching that a warning does
not matter.

**What it costs is always stated, including when it is nothing.** Every dialog
carries the same spend strip in the same place. "Costs nothing — this reads what
is already on disk. No agent runs." is a claim being made, not an element left
out. A dialog that spends says the range and the unit of work: "Roughly $1 to
$3, and two to six minutes. One planner session."

**A dry run is a mode of the same dialog, not a second one.** `--dry-run` flips
the cost line to nothing, adds the flag to the command, and changes the primary
from "Submit 6 tasks" to "Validate only". Two buttons that quietly do different
things is how a preflight becomes a surprise.

**The mono line is the command this dialog is the UI for.** It updates as every
switch moves, so a wrong choice is visible before it is made and the dialog
teaches the CLI it wraps. The same line is one click from the clipboard.

**One dialog, many openers.** "Submit a run" is opened from Runs with nothing
picked and from Scaffolds with that scaffold's spec already picked; "Synthesize
the PRD" is opened from the finished state and from the footer's stop-early
button, where one soft check and one `--force` are the only difference. Seeding
state is allowed; a second implementation is not.

**Its rows are aliased off the dialog, so a catalogue can hold them all.** Every
`sc-for` inside a dialog derives its row name from the dialog's alias. That is
what lets all of them sit on one reference sheet, which is the only way anyone
notices the day two of them grow different Cancel buttons.

## A DAG is drawn as a DAG

Tasks depend on tasks. That is not metadata about the list — it is the thing the
reader came to see. `Waits on t-3` in a table cell is a graph flattened into
prose, and it cannot answer the questions people actually bring: what can run at
once, what is one stall costing, where in the decomposition is the bad part.

**Layer by the scheduler's rule, not by taste.** A task is ready when every
dependency is done, so a node's column is `1 + max(column of its dependencies)`
— the earliest wave it can run in. That makes the columns a true statement about
execution rather than a drawing convention, which is why they can be labelled:
`Wave 2 · 3 in parallel`.

**Left to right**, the same direction the pipeline stepper runs. One direction
for "time moves this way" across the whole product.

**A node is a row, not a card** — 208×56, one line of identity (dot, id, short
name) and one line of the answer. The full objective belongs in the detail
strip, not wrapped inside a box.

**Colour the node with the question the surface is asking.** The same graph
carries run status on the Runs screen and citation health on Scaffolds. One
axis, chosen deliberately — a node coloured by two things at once is coloured by
neither.

**Blame travels along the edges.** Everything downstream of a blocked or failed
task is drawn held — dashed edge, warning hue — and the count is stated in
words: `t-5 is blocked, holding 2 tasks downstream`. `dependency_blocked` is a
fact about the graph, so the graph is where it should be legible without opening
Diagnose.

**Mark the edges that skip a layer.** They are the ones that bow out of the band
and the ones a reader misreads; dash them and let the shape admit it.

**A graph you cannot select in is a picture.** Clicking a node selects it;
selection names its dependencies, its dependents, and its wave; the arrow keys
walk the graph — left and right along dependency order, up and down within a
wave — and moving between columns lands on the nearest row so the cursor tracks
the edge being read. Neighbours of the selection stay at full strength and the
rest drop back, so one node's context reads without hiding the whole.

**Order within a layer by barycentre**, a couple of sweeps, so edges stop
crossing for no reason. And when the graph is wider than its frame, let it
scroll. Shrinking nodes until the labels die is not fitting the graph on screen,
it is deleting it.

## A system page is a preflight, not a dashboard

Before drawing a screen, write down why someone opens it. For the daemon the
honest list is short and none of it is admiration: *something stopped working
and I need to know if this is why*, *I upgraded and have to restart*, *is my
config and are my credentials actually right*, *why did it die*. Counts of what
the process is currently holding answer none of those, and Runs answers them
better — putting them here is the same Dashboard slop by a system-sounding name.

So the page is a **checklist of what must be true**, in the order that matters:
each check states its verdict, its evidence, and the command that fixes it.
Failures sort to the top. The reader's next action is on the screen, not in a
doc.

**A passing check still shows its evidence.** `Config file · parsed, 2 keys set,
the rest defaulted` — otherwise a reader cannot tell "checked and fine" from
"never checked", and a green tick becomes worthless.

**A check that could not run is skipped, not passed.** With the daemon down
there is nothing to compare the CLI's version against, so that row is neutral
and reads *not checked*. Counting it as a pass is the Vacuous pass in a new
costume, and it is the exact moment a reader most needs the distinction.

**Name every state the thing can actually be in.** Up and down is a false
binary: a daemon can be running and refusing every command because the package
was upgraded underneath it. That third state has its own cause, its own copy,
and a different fix from either neighbour — and it is the single most likely
reason someone opened the page. A binary UI would file it under "up" and be
useless.

**Design the down state first.** It is the state that gets drawn last and tested
never, and the one where the screen matters most. Write stopped first, then
running.

**When the source of truth is down, say the rest of the app is stale.** Every
other screen is a view of what that process holds. If it is gone they are
showing the last thing they saw, and continuing to render them as current is
lying by omission. Say it in words: *nothing else in this app is live*.

**Show configuration with its provenance.** Config resolves env-first, then the
file, then a default. Which layer won is the whole question when a value
surprises someone, so the source rides next to the value as a chip. A settings
list without provenance sends the reader to go and diff three places by hand.

**When the thing is down, the log is the answer — so put it on the page.** Not
behind a button. The stopped screen's log section is titled for the question
being asked (*how it went*) and carries the last lines before the exit.

**Never read a secret back.** Show that a key is set and which layer set it.
The value is not diagnostic information, and a screen that prints it becomes a
screen nobody can screen-share.

## Numbers have to say what they count

**A rate whose definition is hidden is a lying number.** The success rate the
daemon computes counts `succeeded-with-failures` as success. Print `88%` alone
and the reader concludes something false. Print it with *counts
succeeded-with-failures as success — 81% finished clean* and both numbers become
usable. Any derived figure — a rate, an average, a total — carries the sentence
that defines it.

**Reconcile the parts against the reported total.** When a breakdown and a total
come from different folds, the UI adds them up and checks. Silence is the bug
here: a fold that drops a kind it does not recognise under-reports forever, and
a total assembled by summing the parts is wrong rather than loud. When they
disagree, say which one to trust — *trust the total, not the parts* — and why.

**Chart only what the data can support.** Run outcomes can be bucketed from the
terminal runs in the window, so they get a chart. Token counts arrive as a
window total with no timestamps, so they get numbers. Interpolating a series the
API never returned invents a trend, and a reader cannot tell an invented trend
from a real one.

**Compare against the window before, and recompute it when the window
changes.** A delta pinned to a constant is decoration that survives every period
switch unchanged — worse than no delta, because it looks like evidence. A
comparison that comes out flat is a fine answer; render it flat rather than
nudging it into a direction.

**A degraded stack is not a running one.** Three states, not two: the container
being alive is what makes `degraded` dangerous — the supervisor answers, so a
container check says healthy, while the panels behind the dead subcomponent stay
empty. Name the trap in the copy, and say what was lost rather than delayed.

## Authority is a property, not a tone

Several agents run on every task and exactly three of them can stop it. That
asymmetry is invisible in the data and catastrophic to get wrong, so the surface
that lists them has to carry it.

**Say who can block.** The judge writes a verdict; the verdict cannot fail a
task. Validate commands are the contract. A screen that lists both under a
column called "status", with the same chips, has taught the reader that a
`warn` is a kind of failure — and the next thing they do is treat a passing
task as broken. Give authority its own column, and let the values be plain:
blocking, advisory, machine-checked.

**Put the constraint above the list, not in a tooltip.** One sentence naming
which agents can stop a task, before the first row. It is the frame the rest of
the page is read through; a reader who scrolls past it has already mis-read
every row.

**Show configuration as a diff against what ships.** When the shipped defaults
reproduce the runtime byte for byte, "what is configured here" is only
interesting where it differs. Lead with the count that differs, offer a filter
for it, and mark the changed lines inside the prompt rather than presenting an
overridden prompt as if it were written from scratch. The reader is asking "what
did we change?", not "what does the tool do?".

**Capability is worth a whole tab.** What an agent can reach — its tools, its
environment — is the difference between a bug and an incident, and it is not
derivable from a description. List the refusals next to the grants: a tool it
does not have and an env key that is absent are as load-bearing as the ones it
does. Say *absent*, not *unset*.

**Distinguish "cannot" from "did not".** A tool an agent is denied and a tool it
happens not to use look identical in a list of what it used. Only the first is a
guarantee.

## A name that resolves must show what it beat

Anywhere a name is looked up through an ordered set of scopes — starters,
prompts, configuration — the same word can mean two different things, and the
loser is invisible everywhere except the screen that draws the chain.

**Draw the whole chain, winner first, with the losers still on it.** Not a
badge saying which scope won: the list of every definition that carries the
name, numbered in resolution order, with the one that resolves marked and the
rest marked shadowed. The reader's question is "am I getting the documented
one?", and only the chain answers it.

**Shadowing is a warning, not a detail.** When a user-authored definition
shadows a shipped one, say so above the list, name the definitions, and say what
happens as a result — projects registered from now on get the other tree. A
shadowed entry is still worth listing, dimmed and labelled, because "why does
nothing use the built-in python starter?" is exactly the question the screen
exists to answer.

**Say what can still shadow this.** For a name with one definition, the useful
sentence is about the future: a directory that does not exist yet would take
precedence silently. Branch that copy on the scope the entry actually lives in —
a path is resolved last and cannot be shadowed at all, and telling someone they
could shadow it is worse than saying nothing.

**Say when a copy is a copy.** A template applied at registration is a snapshot:
editing it later changes nothing that already exists. A template read by path is
a live dependency: move the directory and the command stops working. Both facts
belong on the screen, because both surprise people.

## A stream that dropped lines says so, in the stream

Log delivery is allowed to fail: when a subscription's queue saturates the bus
drops the subscription rather than buffer without bound, and reconnecting
restarts the tail without replaying what was missed. A viewer that renders the
surviving lines as one continuous scroll is lying by omission.

**The gap is a line.** Render it inline, at the position where the lines were
lost, with the count and the time span. Not a toast, not a footer note, not a
banner at the top: the reader's eye is at the point of the drop, and that is
where the missing time is.

**A gap survives every filter.** Levels and text filters remove lines by
predicate. Nobody knows what was in a gap, so no predicate can say whether it
matched — the gap stays visible under every filter, and the tally says so
explicitly. When a filter finds nothing and the stream has a hole, the empty
state says the missing lines might have matched.

**Derive completeness from the gaps, not from the state.** A finished run's log
file is not "complete" because the run ended; it is complete because nothing is
missing from it. Read the connection label off the presence of gaps in both
directions: live with a hole behind you is *lagged*, finished with a hole in it
is *truncated*.

**Being dropped is a different state from being paused.** Paused means you
stopped reading. Dropped means the daemon stopped writing to you. The recovery
differs, so the label, the colour and the offered action all differ — and the
copy has to say plainly that reconnecting will not fill the hole.

**Follow is inert where there is nothing to follow.** On a finished file the
toggle reads "nothing to follow" and does not arm. A control that pretends to
subscribe to a file nobody is writing is a lie the reader only catches minutes
later.

## The palette shows what it refuses

The command palette is the only surface that spans every other one, which makes
it the best place in the product to learn what the system will not currently do.

**A command that cannot run is listed, dimmed, with its reason.** Hiding it
teaches nothing and invites the same search tomorrow. "Stop the daemon — 4 tasks
running" answers the question in the list; the reader never opens the page to
find out.

**Inert means inert on every input.** A blocked row does not fire on `↵`, does
not fire on click, and does not advertise a shortcut it will not honour. A row
that highlights on focus but silently does nothing when pressed is worse than a
disabled one.

**The footer says what the focused key will do.** Not "Enter to select" —
*run it*, *go there*, *opens the confirm*, or *cannot run — 4 tasks running*.
This is where the destructive rule and the palette meet: `↵` on a destructive
command opens the confirm, and the footer says so before the finger moves.

**Do not claim health you did not check.** "Everything listed can run right now"
is false when nothing is listed. An empty result set gets an empty footer.

## Everything is doable from the UI, including the files

A tool whose configuration can only be changed by opening an editor has two
products in it, and the second one has no design. Every file the system reads is
reachable, readable and editable here — as a form, and as itself.

**A file tree, not a settings page.** Configuration is not a flat list of
switches: it is a set of files in two scopes, and their layout is the mental
model people already have. Put the real tree on screen — the user home and the
project's `.wesven/orchestrator/`, one row per file, unsaved work marked where
the file lives. The tree is how you say "there are eleven of these and you have
edited two", which no settings page manages.

**Both representations, one document.** Offer *Form* and *File* on the same
document with a segmented control, not two features in different places. Some
people know the YAML and want to type it; some do not know the schema exists.
Neither should have to learn the other's tool to make one change.

**Not every file gets a form.** A prose prompt has no schema to lay a form over,
so it opens in the file view and says why. Faking a form there — a textarea
wearing a label — teaches that the form is decoration.

**A form over a sparse overlay must show three states, not two.** These files
name only what they override; everything else resolves from the shipped default.
So a key is *inherited*, *set in this file*, or *edited and unsaved* — and
"inherited" is not the same as "set to the same value the default has". The
second pins the key: the default can move underneath the first and never the
second. Say which one each field is, and keep the shipped default visible next
to any field that has left it.

**Reset means unset.** The action on an overridden field removes the key from the
file, and its label says so. A button that types the default value back into the
field looks identical and does the opposite — it writes a line where there was
none.

**Show what saving writes, before it writes.** Not a diff of the whole file: the
lines this save adds, changes or removes, each with why — new key, replaces what
was there, unset and falling back, or pinned to a value that happens to equal the
default. Then say plainly that nothing else is touched.

**A strict schema is a hard failure, and the screen says so.** When an unknown
key means the daemon refuses to start, that is not a warning: name the key, name
the line, guess the typo, and refuse to open the form over a file nobody could
parse. A form rendered from a half-parsed document invents state.

**List the secrets file; refuse to open it.** A keyring that is absent from the
tree reads as one that does not exist. Show it, mark it locked, and never render
a value.

## Finding is not filtering

In a log, in a table, in any long list, "find this" and "show me only this" are
different requests, and answering the first with the second destroys the context
that made the hit worth finding.

**Search highlights and navigates. It never removes a row.** Paint every hit in
place, count them, and give the reader next/previous. An error line means
nothing without the three lines that led to it, and a search that deletes them
has answered a question nobody asked.

**Highlight everything you counted.** If the query matches the scope column, the
scope column lights up. A count that includes matches the reader cannot see on
screen is a lying number, and the unit has to match what the navigation walks —
if `N` jumps between lines, the counter counts lines.

**Hiding is a separate, visible, reversible act.** A control that hides says so
by name, says how much it is holding back, and leaves an expandable marker where
the hidden lines were. Hidden lines are still in the file; the tally says that in
those words, because the reader has just been told elsewhere that some lines are
gone forever, and confusing the two is the whole risk.

**Keep context around whatever survives a filter.** A problems-only view that
shows bare errors is a worse artifact than the log. Keep a line either side and
say you did.

**The filters people want come off the data, not off the schema.** Nobody thinks
in log levels; they think "show me validate" and "show me what broke". Make the
values in the rows clickable so a filter is something you point at, and let the
resulting filter live as one removable chip — not as a row of chips competing
for the header before anyone has asked for them.

**A header is a place to ask one question.** Which file am I reading is asked
once, so it is a picker, not four buttons. What am I looking for is asked
constantly, so it gets the width. If the toolbar has more than about four
controls, one of them is answering a question nobody asked here.

## One vocabulary, one implementation

Consistency is not a review pass. Anything three screens do by hand, the fourth
does differently, and the difference is never a decision anybody made — so the
rule is structural, not editorial.

**If three screens do it the same way, it lives in one place.** The header, the
help block, the go-to map, the find model, the elision marker, the tally, the
config form, the save preview, the terminal palette: each is written once and
imported. A screen that needs it differently either changes the shared one for
everybody or explains, in a comment, why this surface is the exception.

**A key means one thing everywhere.** `N` walks matches on every list, so the
primary create action is `C` — not because `C` is better, but because a key
whose meaning depends on the screen is a key nobody learns. When a shortcut
collides with the shared vocabulary, the shared one wins and the local one
moves.

**A chord that arms has to go somewhere.** `G` puts "go to…" in the header, so
the next key must land: a mapped letter goes, anything else drops the chord.
Swallowing the key and doing nothing is a promise the header already made and
the handler quietly broke.

**Every screen says what it amounts to.** The header carries one line —
how many records, how many are working, how many need a person; or which file
this reads and where it came from. A screen with a blank note is a screen that
has not decided what it is about.

**One alias, one row shape.** Two loops on a screen called `l` are two different
records under one name; the hole resolves against whichever is nearest and the
next edit moves it. Name the scope after the rows it carries.

**Some lists cannot be pruned.** A tree hidden down to matches misdescribes
where a file lives; a log hidden down to matches confuses "filtered out" with
"never arrived". Those surfaces take the find without the hide — and then the
hide control is absent, not inert.

## Configuration belongs where the question is asked

A screen that shows a setting and sends you elsewhere to change it has taught
you where the file is, not answered the question.

**The file is edited on the screen that owns it.** The starter's defaults are
edited in the starter, the agent's prompt and tools in the agent, the project's
overrides in the project, the daemon's config in the preflight. The same
three-state form, the same save preview, the same words — a reader who learns
"Pinned to the default" once does not relearn it per screen.

**Say when a saved value takes effect.** Some files are reread at every attempt;
the daemon's config is resolved once, at startup. Save and effect are two
different acts there, and the save bar has to say so, because the screen will
keep showing the old values in between and that looks like a failed write.

**Not every resolved value is a file key.** `WESVEN_HOME` and
`WESVEN_CONFIG_PATH` resolve the file itself; a strict schema refuses them by
name. Show them, label them as coming from outside the file, and do not offer a
form field that would write something the loader rejects.

## Patterns we do not want

Named, because a pattern with a name is one an agent can notice itself making.

**Card soup** — every record in its own card. Records are rows.

**Chip everything** — every cell in every column wearing a colored chip, so
nothing stands out and the eye has nowhere to land. One chip per row carries
status; the rest of the row is text. A `Badge` used as a status chip is the same
mistake with the wrong component.

**Color-only status** — a status chip or dot carrying its meaning in hue alone,
with no icon and no word. It fails for a colorblind reader, in grayscale, and
for anyone who has not memorized the key.

**Sunken tile** — a `Card` placed on an elevated surface. In dark mode
`--color-background-card` is darker than `--color-background-surface`; the theme
lifts cards off the **body** with a shadow and a rim highlight, so a card
dropped on a panel, sheet or nav reads as a hole with a bezel around it. On an
elevated surface, group with rows, a divider, or a plain metadata grid — and
keep `Card` for widgets sitting on the page body.

**Symptom soup** — rendering every `dependency_blocked` task as its own red
failure. The core already told you which one broke; repeating its downstream
effects as peers buries it.

**Silent proxy** — the system decided something on the reader's behalf and the
surface shows it identically to what the reader decided. See *Say who decided*.

**Schema dump** — putting a field on screen because the record has one. An
intake header does not need its `sourceKind` when the source is the default
prompt, and never needs its turn counter — that is the system's bookkeeping,
not the reader's. Show a field when it can differ in a way the reader acts on:
a tracker reference earns its place because it is a link out; `prompt` does
not, because it is what every other intake also says.

**Hidden key** — a shortcut that exists only inside the `?` helper. If the
control is on screen, its key goes on it; the helper is for recall, not
discovery.

**Key roulette** — one key bound to two things on the same screen at the same
time, disambiguated by something invisible like which pane was clicked last.
Scope keys to a context the reader can *see* they are in.

**Chrome nugget** — a bordered mini-card in the nav, header or footer wrapped
around a single line of status, restating what a dot and a word already said.
Chrome status is a row: a mark, a label, a number, and the action that follows
from it. If it needs a border to look intentional, it is not carrying enough.

**The lying green** — a success color on `complete_succeeded_with_warnings` or
`complete_succeeded_with_failures`. See "Status is the whole product".

**Flat status** — eleven run statuses collapsed to running / done / failed
because it was easier to pick three colors.

**The dimmed page** — body copy shrunk and greyed until the whole region reads
as metadata and nothing leads.

**Mystery id** — a raw UUID rendered in full in a table cell. Ids display in
their 12-character short form, with the full value available on the record.

**Dashboard slop** — a row of stat tiles that exist because the top of the page
looked empty. Every number earns its place by changing a decision. If a section
feels empty, that is a composition problem, not a content shortage.

**Progress theatre** — a spinner where a state belongs. If the system knows the
stage, the attempt and the elapsed time, show them.

**Terminal cosplay** — scanlines, ASCII box-drawing, fake CRT glow, a green-on-
black palette. The audience is terminal-native and does not need to be told the
product is a daemon. Monospace where monospace is meaningful; nowhere else.

**Invented token** — a raw hex, rgb, or px interior value. It is wrong in the
other color scheme and it will not survive a theme change.

**Double padding** — a component's own inset stacked on a container's padding,
so one region's content line sits 12px right of every other.

**The uniform gap** — the same spacing between everything, so grouping conveys
nothing.

**The bare rate** — a percentage, average or total printed without the sentence
that says what it counts.

**Silent under-report** — showing a breakdown that does not sum to the total,
and letting the reader assume it does.

**Invented trend** — a chart drawn through data the API never returned.

**Frozen delta** — a comparison that does not change when the thing being
compared does.

**The blank corpse** — a status screen that renders empty when the thing it
reports on is down, rather than at its most useful.

**Vanity vitals** — a system page built from counters that read well and answer
nothing anyone came to ask.

**Diagnosis without a fix** — a failing check that names the problem and leaves
the reader to search for the command.

**The false binary** — up or down, on a thing that has a third state with a
different cause and a different fix.

**Flattened DAG** — a dependency graph served as a list, with the edges
demoted to a text cell (`Waits on t-6, t-7`).

**Hairball** — nodes placed by a force simulation or by source order, so the
picture changes every render and the columns mean nothing.

**Decorative graph** — one you can look at but not act from: nothing selectable,
no dependents named, no keyboard.

**Vacuous pass** — reporting `0/0` as a pass when the check never ran. A gate
that did not apply says so; it does not borrow the green.

**Schema first** — leading a verified artifact with its raw output, so the
reader proof-reads what the machine already proved. Lead with the verdict.

**Naked destructive** — a destructive action that fires from one click or one
keystroke, or that confirms without naming the record and what it removes.

**The tidy modal** — a confirm dialog that covers the record the reader needs
in order to decide.

**Emoji as iconography** — icons are stroke SVG on a 16/20/24px grid, from the
theme's icon set. Emoji do not scale, recolor, or match.

**Flat authority** — every agent in one column called "status", so an advisory
`warn` and a blocking failure look like the same event.

**Config without a baseline** — a screen full of settings with no indication of
which ones differ from what ships, so the reader has to know the defaults by
heart to find what someone changed.

**Unset, not absent** — describing a key an agent will never receive as merely
missing. A fixed allowlist is a guarantee; "unset" sounds like an oversight
someone could fix.

**The winning badge** — a resolved name wearing a scope chip and nothing else,
with no way to see the definition it beat. The chip says which one won; the
reader asked what lost.

**Universal shadow copy** — the same "something could shadow this" sentence on
every row, including ones nothing can shadow. Copy that does not branch on the
case is copy nobody trusts on the case that matters.

**Seamless scroll** — a log stream with a hole in it rendered as one continuous
list, the drop mentioned once in a toast that has since disappeared.

**Filtered-away gap** — a gap that a level or text filter removes, because it
was treated as a line. Nobody knows whether the missing lines matched.

**Complete by fiat** — calling a log file complete because the run finished,
while a rotation gap sits in the middle of it.

**The hidden command** — a palette that omits what cannot run, so the reader
searches for it again tomorrow and learns nothing either time.

**Dead highlight** — a disabled row that still takes focus and still looks
pressable, and silently does nothing when pressed.

**The second product** — settings that can only really be changed by leaving the
app and opening an editor, with the UI showing a read-only copy.

**Two-state override** — a config form that knows "default" and "custom" but not
"pinned to a value that equals the default", so it silently unpins keys on save.

**Reset that writes** — a reset button that types the default value into the
field instead of removing the key.

**Blind save** — a save button on a config form with no preview of the lines it
is about to write.

**Form over a parse error** — rendering fields from a document that failed
validation, inventing values for the keys it could not read.

**Search-as-filter** — answering "find this" by deleting every line that does not
match, so the hit arrives without the context that made it worth finding.

**Uncounted highlight** — a match count that includes hits in columns the screen
never paints.

**Hidden and gone, alike** — a filter's elision and a real gap in the data drawn
the same way, so the reader cannot tell what they can get back.

**Chip wall** — every filterable dimension rendered as a row of header chips
before anyone has filtered by anything.

---

## Before you call a screen done

- Squint at it. Can you read lead, then support, then groups, in that order? If
  everything arrives at once, raise contrast with weight and color — not with
  borders, and not by shrinking text.
- Cover the labels. Can you still tell a healthy run from a blocked one?
- Find the four reader questions. Can each be answered in a few seconds?
- Check every status against the real state space, including the mixed-outcome
  ones.
- Search the file for a hex, an `rgb(`, and a hardcoded px that is not a
  structural width. Replace each with a token.
- Search for a raw `<div>` doing a component's job, and for any component you
  hand-rolled that Astryx already ships.
- Check both color schemes. The theme defines every token as a `light-dark()`
  pair; a value that only works in one is a bug.
- Desaturate the screen. Every status must still be readable from its icon and
  its label alone.
- On a collection screen, confirm all four: scope, search, sort, pagination —
  and that the screen opened already scoped rather than showing everything.
- Ask what the reader does next after selecting a record. If the answer is
  "read a log or a trace", it needed the working sheet, not the peek panel.
- If the screen fronts a mechanical check, confirm the verdict is the first
  thing read and the raw output is one tab away — and that a check which did not
  run reads as "not applicable", never as a pass.
- Trace every destructive action: it names the record, states what is removed
  and what survives, shows its command, and takes two different keys to fire.
- Anywhere tasks appear, check whether their dependencies do. If the edges are
  living in a text cell, it wanted the graph.
- Read every number on the screen out loud with the question "counting what?".
  If the screen does not answer, it is not finished.
- Turn the thing off. If the screen goes blank instead of becoming more useful,
  the down state was designed last.
- Write down the four reasons someone opens this page. If the screen's biggest
  region answers none of them, it is a dashboard wearing the page's name.
- For every failing state on screen, check the fix is on screen too.
- Wherever more than one actor appears, ask which of them can stop the work.
  If the screen does not say, it is teaching the wrong hierarchy.
- On a configuration screen, ask what ships by default. If the screen cannot
  show the difference, it is documentation, not configuration.
- Wherever a name is resolved through scopes, draw the losers. A chip naming
  the winner does not answer "am I getting the documented one?".
- On any streamed surface, ask what happens when delivery fails. If the answer
  is "the lines just are not there", the gap needed to be a row.
- Check that every filter leaves the gaps alone, and that the tally says so.
- In the palette, find something that cannot run right now. If it is missing
  rather than dimmed with a reason, the palette is hiding the diagnosis.
- Ask what this screen cannot do that the CLI can. If the answer is "change the
  configuration", the UI is a viewer.
- On a config form, find a key the file does not name. Can you tell it apart
  from one the file pins to the default value? Can you unset it?
- Press save with something changed. If you cannot see the lines it will write
  before you commit, the button is asking for trust it has not earned.
- Type a query into any long list. Count the rows before and after. If the
  number dropped, the screen answered a question you did not ask.
- Turn on a filter. Can you see where the hidden rows were, how many there are,
  and get them back? Can you tell them apart from data that is genuinely gone?
- Count the controls in the toolbar. Past about four, ask which of them answers
  a question the reader asks once — and move it out of the row.
- Take any behaviour on the screen and grep for a second copy of it. If two
  screens spell the same idea, the third will spell it a third way.
- Press every letter the help promises. A chord that arms and then eats the key,
  a shortcut that two things claim, a `/` that focuses nothing — each is a lie
  the help is telling on the screen's behalf.
- Read the header note. If it is blank, or it is a label rather than a count,
  the screen has not said what it is about.
- Find the setting the screen displays. Can you change it here? If it sends you
  to a different screen, it is a viewer with a link.
- After a save, ask when the value takes effect. If it is not immediately, the
  save bar has to say so.
- Open every dialog and read only its primary. Does it say what will happen, or
  what is stopping it? A greyed-out button with no sentence on its face is a
  dead end wearing a control's clothes.
- Find the cost line in every dialog. If one is missing it, the dialog is
  claiming nothing rather than claiming free.
- Toggle every switch in a dialog and watch the mono line. If a flag can be set
  without the command changing, the line is decoration.
- Ask of every button on the screen: what happens when it is pressed? If the
  answer is "nothing yet", it is a dead end, and a dead end is a lie about what
  the product does.
