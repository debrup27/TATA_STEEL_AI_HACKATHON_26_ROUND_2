# Frontend Audit Report — ATAL Project

**Date:** 2026-06-13  
**Audited by:** opencode  
**Scope:** `ATAL_Project/frontend/` (Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion, GSAP)  
**Excluded from this pass:** Backend integration, mobile responsiveness redesign

---

## 🔴 Critical Issues

### 1. Massive image payload (~31MB in `public/`)
Most PNG assets are 1.5–2.5MB each with no compression or format optimization:
- `left_hand.png` (2.4MB), `right_hand.png` (2.4MB), `bag.png` (2.0MB), `factory.png` (2.2MB)
- `world.png` (2.1MB), `leaf.png` (2.1MB), `brain.png` (2.1MB), `message.png` (2.1MB)
- `long_form_logo.png` (2.2MB), `motif.png` (2.2MB), `pastel.png` (1.9MB), etc.

**Fix:** Convert to WebP/AVIF, lazy-load below-fold images, use `next/image` with `sizes` and `priority` only for above-fold.

### 2. Duplicated `pdfjs-dist` CDN worker fetch
`src/app/manas/chat/page.tsx:260` and `src/components/PromptInputWithActions.tsx:54` both do:
```ts
const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;
```
This downloads a ~2MB worker from CDN at runtime — fragile, slow, duplicated.

**Fix:** Extract into a shared `lib/pdf-renderer.ts`, configure worker via local `next.config.js` or a static copy.

### 3. No backend — fully mocked
- Chat sessions, telemetry, RUL predictions, maintenance logs: all hardcoded arrays.
- Login form calls `triggerPageTransition("/")` with no auth logic.
- Zero API calls (`fetch`/`axios`) anywhere in the codebase.

**Fix:** Abstract mock data behind service/hook interfaces so a real API can be swapped in later.

### 4. `setInterval` telemetry simulation accumulates across components
- `src/app/sansad/page.tsx:57` — 2s interval, never cleaned up on unmount of mobile/desktop branch
- `src/app/sansad/hub/page.tsx:151` — 3.5s interval for vibration/speed/FeO/logs
- `src/components/AtalDisplayModal.tsx:70` — duplicate of `sansad/page.tsx` telemetry loop

**Fix:** Use a shared `useTelemetryStream()` hook with a single `setInterval` and proper cleanup.

### 5. `localStorage` write on every message
`src/app/manas/chat/page.tsx:348` — `useEffect` with `[sessions]` dependency serializes the entire sessions array to `localStorage` on every keystroke (when user types a message).

**Fix:** Debounce writes or use a ref-based approach with a save-only-on-unmount strategy.

### 6. CSS-in-JS via `dangerouslySetInnerHTML` — repeated identically in 8+ pages
Every sub-page under `sansad/hub/*` and `manas/` injects:
```tsx
<style dangerouslySetInnerHTML={{ __html: `
  @keyframes marqueeUp { ... }
  @keyframes marqueeDown { ... }
  .atal-text-filled { ... }
  .animate-marquee-up { ... }
  .animate-marquee-down { ... }
`}} />
```
**Files affected:** `sansad/page.tsx`, `sansad/hub/page.tsx`, `abpred/page.tsx`, `historical-logs/page.tsx`, `logs/page.tsx`, `monitor/page.tsx`, `samvidhaan/page.tsx`, `horizon-foundry/page.tsx`, `zephyr-sinter/page.tsx`, `manas/page.tsx`

**Fix:** Move all shared keyframes and utility classes to `src/app/globals.css`.

### 7. Global click interceptor in `PageTransition.tsx`
`PageTransition.tsx:99` registers a capture-phase document click handler that walks the DOM up from every click target looking for `<a>` tags. This can:
- Interfere with dropdowns, modals, and third-party widgets
- Block pointer events for 700ms during "covering" phase
- Break page navigation flow unpredictably

**Fix:** Replace with Next.js `AppRouter` integration (leveraging `useRouter` and Next.js transition events).

---

## 🟡 Performance Bottlenecks

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | No image optimization — plain `<img>` tags used instead of `next/image` | `page.tsx`, `manas/page.tsx`, `sansad/page.tsx`, `samvidhaan/page.tsx` | LCP degradation, no lazy-loading |
| 2 | `framer-motion` `useTransform` on scroll with large viewport | `sansad/page.tsx`, `manas/page.tsx` — morphing box, parallax hands | Janky scroll on mid-range hardware |
| 3 | `AnimatePresence` + `motion.div` around every message | `chat/page.tsx:928` — each message wrapped in layout animations | Poor performance for long chat histories |
| 4 | Dual animation frameworks: GSAP + Framer Motion | `PillNav.tsx` uses GSAP, everything else uses Framer Motion | ~180KB combined bundle bloat |
| 5 | `LogoLoop` ticker — continuous animation re-renders | Used 12+ times across pages | Unnecessary layout thrashing |
| 6 | No `React.memo` on list items | Session list in `chat/page.tsx`, log list in `logs/page.tsx` | Avoidable re-renders on state change |
| 7 | Deeply nested `motion.div` with `layout` prop | Multiple components (`SansadFactoriesDashboard`, `PromptInputWithActions`) | Forces repeated layout calculations |
| 8 | `ResizeObserver` + `useEffect` + `setTimeout` cascading for canvas sizing | `NodeWorkflow.tsx:508` | Visual flicker on mount |

---

## 🟠 Code Quality / Maintainability

### 9. Monolithic page components
| File | Lines (approx) | Problems |
|------|----------------|----------|
| `manas/chat/page.tsx` | 1000+ (71KB) | Chat state + sidebars + settings + RAG + file upload — all in one file |
| `sansad/hub/page.tsx` | 838 | Hub dashboard + log stream + 6 linked sections |
| `NodeWorkflow.tsx` | 1400+ | 27 data arrays + drag logic + zoom + add/delete/duplicate + anomaly simulation |
| `AtalDisplayModal.tsx` | 613 | Tabs + telemetry + chat demo + grid — duplicated from landing pages |

**Fix:** Extract into smaller components by concern (e.g., chat sidebar, message list, input area, RAG panel).

### 10. Mock logic entangled with UI
- Step counters, "Processing" animations, reply simulation all embedded in `chat/page.tsx` and `manas/page.tsx`.
- Same pattern repeated in `AtalDisplayModal.tsx`.

**Fix:** Extract into a reusable `useMockChatSimulation` hook.

### 11. Hardcoded magic values everywhere
- Timing: `700`, `1200`, `400`, `600`, `600`, `500`, `3150` — scattered across 6+ files with no named constants.
- Colors: `#1b253c`, `#f97316`, `#FAF9F5`, `#4A582E` repeated 50+ times — no theme tokens file.
- Breakpoints: `768`, `1024` hardcoded in resize handlers.

**Fix:** Create `src/lib/constants.ts` for timings, `src/lib/theme.ts` (or use Tailwind config) for colors.

### 12. Inline SVG patterns duplicated
The `gridA` 9×9 matrix and `gridCells` loop appear in both `sansad/page.tsx` and `AtalDisplayModal.tsx`.

**Fix:** Extract into a shared `SansadGrid` component.

### 13. `eslint-disable` comments for side effects in `useEffect`
```
// eslint-disable-next-line react-hooks/set-state-in-effect
```
Lines: `chat/page.tsx:207`, `logs/page.tsx:67`

Setting state unconditionally in `useEffect` body violates React's rules. Move to state initializer, use `useRef`, or restructure logic.

### 14. Loose TypeScript
- `(window as any).__next_transitioning` — type escape
- Empty `catch {}` blocks (`chat/page.tsx:119`, `samvidhaan/page.tsx:127`)
- Many components typed with `any` or missing return types

### 15. Inline `@keyframes` injection via `<style>` uses `dangerouslySetInnerHTML`
Technically not an XSS vector here (static strings), but sets a bad precedent and bypasses React's built-in CSS handling.

---

## 🔵 Responsiveness Quirks (noted for awareness)

| # | Issue | Detail |
|---|-------|--------|
| 1 | 7/9 hub sub-pages block mobile entirely | Shows "Please open on desktop" — ~70% of the app is desktop-only |
| 2 | Font sizes in `vw` units | `useTransform([0,1], ["1.8vw", "3.6vw"])` — breaks zoom, no `clamp()` fallback |
| 3 | Fixed `84vw` + `8vw` gutter layout | No max-width cap — content stretches excessively on >2560px screens |
| 4 | Drag-and-drop uses mouse events only | `samvidhaan/page.tsx` — no `touchstart/touchmove/touchend` — broken on touch devices |
| 5 | Custom scrollbar hide uses WebKit-only selectors | `[&::-webkit-scrollbar]:hidden` — no Firefox `scrollbar-width` fallback in some places |

---

## 🟣 Security Observations (demo-level only)

| # | Issue | Detail |
|---|-------|--------|
| 1 | No auth — login is purely cosmetic | `login/page.tsx` calls `triggerPageTransition("/")` with zero validation |
| 2 | `dangerouslySetInnerHTML` present | Used for CSS, but pattern could be misapplied later |
| 3 | localStorage for all data | No sanitization, no size limits, JSON.parse can throw from corrupted data |
| 4 | `unpkg.com` CDN dependency | Unversioned worker fetch could become a supply-chain vector |

---

## ⚪ Architecture Observations

| Area | Current State |
|------|---------------|
| **State management** | None — all state lives in individual `useState` hooks across components |
| **API layer** | Zero — no `fetch`, `axios`, SWR, or React Query usage |
| **Data fetching** | All data is mocked inline; no loading/error states for real data |
| **Error handling** | No error boundaries, no React `Suspense` boundaries for data |
| **Testing** | No test files exist anywhere in the frontend |
| **Accessibility** | Minimal `aria-*` attributes, keyboard navigation largely broken |
| **next.config.ts** | Empty — no image optimization, rewrites, headers, or compression |
| **Bundle** | Dual animation frameworks (Framer Motion + GSAP) adds ~180KB |

---

## ✅ Completed Fixes

| # | Fix | Files Changed | Status |
|---|-----|---------------|--------|
| 1 | **Move shared CSS from `dangerouslySetInnerHTML` to `globals.css`** | `globals.css` + 10 page files | ✅ Done |
| 2 | **Extract `pdfjs-dist` worker + `fileToBase64` + `formatBytes` into shared modules** | Created `lib/pdf-renderer.ts`, updated `lib/utils.ts`; replaced duplicate code in `chat/page.tsx` and `PromptInputWithActions.tsx` | ✅ Done |
| 3 | **Navbar text color flash on first paint** | `PillNav.tsx` — added `opacity:0; translateY(100%)` to `.pill-label-hover` CSS default | ✅ Done |
| 4 | **Home page jitter on refresh** | `PillNav.tsx` — removed initial `opacity:0` hide, replaced `setTimeout(100ms)` with `rAF`; `AnimatedGradientBackground.tsx` — removed 1.5s motion fade; `page.tsx` — shortened blur reveal, added `initial` to arrow span | ✅ Done |
| 5 | **Samvidhaan marquee hover not working** | Added `pointer-events-auto` to gutter items in `samvidhaan/page.tsx` | ✅ Done |
| 6 | **Rotated text abrupt resize on hover leave** | Added `will-change: transform` to `atal-text-filled`/`manas-text-filled`; narrowed `transition: all` to `transition: color, transform` in `globals.css` | ✅ Done |
| 7 | **localStorage quota exceeded on chat page** | Debounced save (500ms), strip `ragDocs[].pages` (base64 images) before serializing, caught errors gracefully in `chat/page.tsx` | ✅ Done |
| 8 | **New chat auto-opens RAG context panel on file attach** | Removed `setShowRightPanel(true)` from `handleUploadContextDoc` in `chat/page.tsx` | ✅ Done |

## 📍 Affected Pages for Testing

| Route | What Changed |
|-------|-------------|
| `/` | Blur reveal timing (1.0s), gradient no longer fades in, HoverButton arrow doesn't pop on mount |
| All pages (navbar in layout) | Navbar text no longer flashes dark on first paint; navbar appears on next frame instead of 100ms delay; logo/nav animation slowed to 0.7s |
| `/manas` | No more inline `<style>` injection — uses `globals.css` |
| `/sansad` | Same as above |
| `/sansad/hub` | Same + scrollbar class renamed to `sansad-scroll-hide` |
| `/sansad/hub/logs` | Same + scrollbar class renamed to `sansad-scroll-styled` |
| `/sansad/hub/samvidhaan` | No more inline styles — removed `CSS_ANIMATIONS` const entirely |
| `/sansad/hub/abpred` | No more inline `<style>` — uses `globals.css` |
| `/sansad/hub/historical-logs` | Same |
| `/sansad/hub/monitor` | Same |
| `/sansad/hub/horizon-foundry` | Same |
| `/sansad/hub/zephyr-sinter` | Same |

## 📋 Remaining Fix Order

1. ~~**Move shared CSS from `dangerouslySetInnerHTML` to `globals.css`**~~ ✅
2. ~~**Extract `pdfjs-dist` worker logic into `lib/pdf-renderer.ts`**~~ ✅ (also extracted `fileToBase64` + `formatBytes` into `lib/utils.ts`)
3. **Create `useMockTelemetry` and `useMockChatSimulation` hooks** (eliminates duplicated simulation logic across 4+ components)
4. **Convert `<img>` to `next/image` and add WebP pipeline** (fixes largest performance issue)
5. **Create `src/lib/constants.ts` for timing values and `src/lib/theme.ts` for color tokens** (eliminates magic numbers/colors)
6. **Extract `SansadGrid` component** (removes duplicated gridA/gridCells pattern)
7. **Break up monolithic files**: `chat/page.tsx`, `NodeWorkflow.tsx`, `sansad/hub/page.tsx`
8. ~~**Debounce localStorage writes** in the chat session store~~ ✅ (also strips base64 image data to avoid quota)
9. **Add `React.memo` to list item components** (session list, log entries)
10. **Consolidate to one animation framework** (drop GSAP, use Framer Motion everywhere, or vice versa)
