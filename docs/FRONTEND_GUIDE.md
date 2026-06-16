# Frontend Guide

Next.js 16.2 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4. Working dir:
`ATAL_Project/frontend/`.

> This is **not** the Next.js in most training data — APIs differ. Check
> `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands
```bash
npm run dev     # dev server (port 3000)
npm run build   # production build
npm run lint    # ESLint
npm test        # Jest
```

## Routes (`src/app/`)

- `/` landing · `/login` entry (demo auth)
- `/sansad/hub` + sub-routes: `diagnostics`, `risk`, `actions`, `reports`, `monitor`,
  `logs`, `historical-logs`, `abpred`, `horizon-foundry`, `zephyr-sinter`,
  `samvidhaan/*`.
- `/manas/chat/[[...sessionId]]` — the MANAS chat UI (sidebar, sessions, RAG doc selector,
  context panel, streaming).

## Service layer (`src/services/`)

All data access goes through typed async modules calling `/api/v1/...`. Notable ones:
`diagnostics.ts`, `prediction.ts` (risk), `actionPlans.ts`, `reports.ts`,
`costAnalysis.ts`, `plantSnapshot.ts`, `notifications.ts`, `chat.ts`, `sessions.ts`,
`sansadOutputs.ts`, `telemetry.ts`, `factoryWorkflow.ts`. `types.ts` holds shared
interfaces; `mappers.ts` adapts backend shapes to UI shapes (unit-tested).

## Shared shell — `HubShell`

`src/app/sansad/hub/components/HubShell.tsx` renders the consistent SANSAD page chrome:
the `SansadBackButton`, page title/subtitle, anomaly control, MANAS link and marquees.
**Pages render a single `HubShell` and swap only the body** across loading/error/loaded
states (constant title/subtitle) — so the back button and header never flicker on first
load.

## Streaming chat — `useChatStream`

`src/hooks/useChatStream.ts` opens `/ws/chat/<session>/` and dispatches token / think /
phase / citations / compacting / done events. It keeps an **inactivity timer** that is
re-armed by any progress event (phase, compaction, SANSAD sync) — so slow-but-legitimate
steps (RAG, context compaction) never flash a false "no response" error before the answer
streams.

## Markdown / technical rendering

`src/components/ai-components/{markdown,CitedMarkdown}.tsx` render chat/report markdown
with `remark-gfm`, `remark-math` and `rehype-katex`. The normalizer
(`src/lib/markdown-stream.ts`) is **deliberately conservative**:

- Unicode super/subscripts (H₂S, Nm³/h, 10⁶, β₁₀, F₁–F₇) are **left as plain text** — they
  render fine and wrapping them in KaTeX made them italic/detached.
- Only ASCII forms that render badly raw are converted: carets (`x^2`, `m/s^2`), ASCII
  underscore chem (`H_2S`), content already in `$...$`, and ASCII `F1–F7` ranges.
- `Factory F1/F2` (factory labels) stay plain.
- `code` never emits `<pre>` (react-markdown v10 dropped the `inline` prop, which put block
  code inside `<p>` — a hydration error); block `<pre>` is a separate `pre` override.

Don't re-introduce unicode→math wrapping — that's the regression these tests guard.
