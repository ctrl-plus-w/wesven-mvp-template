# Design

## `design.md`

The judgment layer for this design system: which Astryx component carries which
meaning, how a screen is framed, what a collection owes its reader, how a
destructive action asks for confirmation. It is written as decisions plus named
anti-patterns, so it is usable in review — a disagreement about a component
choice should end by citing a section here.

It arrived from the project it was written for (an operator console for a
CI-style pipeline), and a handful of its examples name entities that do not
exist in this template — runs, tasks, scaffolds, a daemon. **The reasoning
transfers; the nouns do not.** Read a rule about "run status" as a rule about
whatever state your app's central entity carries.

Two things it references are deliberately not vendored here:

- **`design/canvas/`** — the static artboards the rules were derived from. They
  render that project's screens, so they would be dead weight in a starter.
- The RPC surface in its worked examples. Substitute your own.

## The theme

`design.md` describes intent; `src/instances/astryx/theme.ts` implements it. The
theme is a pure grayscale spine with a nine-hue OKLCH categorical palette, every
saturated stop verified at WCAG AA against its own label. `icons.tsx` next to it
maps Astryx's semantic icon names onto Lucide.

Change tokens there, not in `globals.css`, and not inline.
