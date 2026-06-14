"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/*
  Page Transition Logic:
  1. A global click interceptor catches ALL internal <a> link clicks — website-wide.
  2. "covering": orange blob radially expands to fill screen with "Loading" text.
  3. After blob fills (700ms) → router.push() fires actual navigation.
  4. pathname changes → "washing": wavy SVG clip sweeps the orange block downward and
     OUT the bottom of the screen (wave edge travels past viewport bottom so it
     physically slides away instead of snapping).
*/

// ─── Wave geometry ────────────────────────────────────────────────────────────
// The viewBox is 1440 × 1100 (taller than typical screens) so the wave can
// travel completely out the bottom without a visual snap.
const VW = 1440;
const VH = 1100; // taller than viewport so wave exits cleanly
const AMPLITUDE = 70;
const SEGMENTS = 5;

/**
 * Generates the SVG clip path for the orange block.
 *
 * At progress=0 the block covers the whole viewBox (topY = 0).
 * At progress=1 the top edge + wave has exited past the bottom (topY = VH + AMPLITUDE + 20).
 * The block is always a rectangle from topY to VH, with a curvy top edge.
 */
function generateWavePath(progress: number): string {
  // topY travels from 0 → VH + AMPLITUDE + 20 (past the bottom)
  const topY = progress * (VH + AMPLITUDE + 20);

  const segW = VW / SEGMENTS;

  // Bottom-anchored rectangle with wavy top edge
  let path = `M 0 ${VH} L ${VW} ${VH} L ${VW} ${topY}`;
  for (let i = SEGMENTS; i >= 0; i--) {
    const cx1 = i * segW + segW * 0.75;
    const cy1 = topY + (i % 2 === 0 ? -AMPLITUDE : AMPLITUDE);
    const cx2 = i * segW + segW * 0.25;
    const cy2 = topY + (i % 2 === 0 ? -AMPLITUDE * 0.45 : AMPLITUDE * 0.45);
    const ex = i * segW;
    path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${topY}`;
  }
  path += ` L 0 ${VH} Z`;
  return path;
}

/** Normalize paths so `/`, `/login`, and `/login/` compare equal for transition logic. */
function normalizePath(path: string): string {
  if (!path) return "/";
  const base = path.split("?")[0].split("#")[0] || "/";
  if (base === "/") return "/";
  return base.endsWith("/") ? base : `${base}/`;
}

function pathsEqual(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function triggerPageTransition(href: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("page-transition-start", { detail: { href } })
    );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [phase, setPhase] = useState<"idle" | "covering" | "washing">("idle");
  const [washProgress, setWashProgress] = useState(0);

  const pendingHref = useRef<string | null>(null);
  const phaseRef = useRef<"idle" | "covering" | "washing">("idle");
  const rafRef = useRef<number | null>(null);
  const washStartRef = useRef<number | null>(null);
  const prevPathRef = useRef(pathname);
  const pathnameRef = useRef(pathname);

  // Keep phaseRef in sync for use inside non-reactive callbacks
  useEffect(() => { 
    phaseRef.current = phase; 
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__next_transitioning = phase !== "idle";
    }
  }, [phase]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const WASH_DURATION = 1300;

  const beginWash = () => {
    setTimeout(() => {
      setPhase("washing");
      washStartRef.current = null;
    }, 80);
  };

  // ── 1. Trigger: custom event (from triggerPageTransition or global interceptor)
  useEffect(() => {
    const handler = (e: CustomEvent<{ href: string }>) => {
      if (phaseRef.current !== "idle") return;
      pendingHref.current = e.detail.href;
      setWashProgress(0);
      setPhase("covering");
    };
    window.addEventListener("page-transition-start", handler as EventListener);
    return () => window.removeEventListener("page-transition-start", handler as EventListener);
  }, []);

  // ── 2. Global click interceptor — catches ALL internal <a> tags (incl. Next.js <Link>)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Walk up from the clicked element to find an <a> tag
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== "A") {
        target = target.parentElement;
      }
      if (!target) return;

      const anchor = target as HTMLAnchorElement;
      const href = anchor.getAttribute("href");

      if (
        !href ||                          // no href
        href.startsWith("http") ||        // external URL
        href.startsWith("//") ||          // protocol-relative external
        href.startsWith("mailto:") ||     // mailto
        href.startsWith("tel:") ||        // tel
        href.startsWith("#") ||           // same-page hash
        anchor.target === "_blank" ||     // new tab
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey // modifier keys
      ) return;

      if (phaseRef.current !== "idle") return;
      if (href === pathname) return; // already on this page

      // Intercept: prevent the default navigation, fire our animation instead
      e.preventDefault();
      pendingHref.current = href;
      setWashProgress(0);
      setPhase("covering");
      window.dispatchEvent(new CustomEvent("page-transition-start", { detail: { href } }));
    };

    document.addEventListener("click", handleClick, true); // capture phase
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // ── 3. After blob covers screen, actually navigate
  useEffect(() => {
    if (phase !== "covering") return;
    const timer = setTimeout(() => {
      const href = pendingHref.current;
      pendingHref.current = null;
      if (!href) return;

      if (pathsEqual(href, pathnameRef.current)) {
        // Same route (e.g. logout on home) — pathname won't change, so wash manually.
        beginWash();
      } else {
        router.push(href);
      }
    }, 700); // matches blob animation duration
    return () => clearTimeout(timer);
  }, [phase, router]);

  // ── 4. When pathname changes (new page rendered), begin the wash-away
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (phaseRef.current === "covering") {
      // Brief settle so the new page content is painted before we reveal it
      const timer = setTimeout(() => {
        setPhase("washing");
        washStartRef.current = null;
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  // ── 5. rAF loop for the wash-away
  useEffect(() => {
    if (phase !== "washing") return;

    const animate = (ts: number) => {
      if (washStartRef.current === null) washStartRef.current = ts;
      const t = Math.min((ts - washStartRef.current) / WASH_DURATION, 1);
      // Ease-in-out cubic — starts slow for impact, ends smooth
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      setWashProgress(eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setPhase("idle");
        setWashProgress(0);
        window.dispatchEvent(new CustomEvent("page-transition-complete"));
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [phase]);



  const visible = phase === "covering" || phase === "washing";

  return (
    <>
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            key="page-transition-overlay"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              pointerEvents: "auto",
              overflow: "hidden",
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            {/* ── Covering phase: radial blob expand ── */}
            {phase === "covering" && (
              <motion.div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "auto",
                  background:
                    "linear-gradient(135deg, #fb923c 0%, #f97316 45%, #ea580c 100%)",
                }}
                initial={{ clipPath: "circle(0% at 50% 50%)" }}
                animate={{ clipPath: "circle(150% at 50% 50%)" }}
                transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
              >
                <motion.div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22, duration: 0.35 }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      letterSpacing: "0.38em",
                      fontSize: "14px",
                      textTransform: "uppercase",
                      userSelect: "none",
                      fontFamily: "var(--font-questrial), sans-serif",
                      color: "#ffffff",
                      textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                    }}
                  >
                    Loading
                  </span>
                  <DashedCircleLoader />
                </motion.div>
              </motion.div>
            )}

            {/* ── Washing phase: wavy block sweeps downward & exits ── */}
            {phase === "washing" && (
              <svg
                viewBox={`0 0 ${VW} ${VH}`}
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "block"
                }}
              >
                <defs>
                  <linearGradient
                    id="atal-pg-grad"
                    x1="0" y1="0" x2="0.7" y2="1"
                    gradientUnits="objectBoundingBox"
                  >
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="55%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                  <clipPath id="atal-wave-clip">
                    <path d={generateWavePath(washProgress)} />
                  </clipPath>
                </defs>
                <rect
                  x="0" y="0"
                  width={VW} height={VH}
                  fill="url(#atal-pg-grad)"
                  clipPath="url(#atal-wave-clip)"
                />
              </svg>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Radiating tick loader (ClickSpark-style) ────────────────────────────────
function DashedCircleLoader() {
  const size = 64;
  const cx = size / 2;
  const cy = size / 2;
  const tickCount = 8;
  const innerR = 16; // where the tick starts (away from center)
  const outerR = 28; // where the tick ends

  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = (i / tickCount) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    // Trailing fade: head tick is brightest, tail fades out
    const opacity = 0.18 + (i / (tickCount - 1)) * 0.82;
    return { x1, y1, x2, y2, opacity };
  });

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.0, repeat: Infinity, ease: "linear" }}
      style={{ display: "block" }}
    >
      {ticks.map(({ x1, y1, x2, y2, opacity }, i) => (
        <line
          key={i}
          x1={x1} y1={y1}
          x2={x2} y2={y2}
          stroke="white"
          strokeWidth={2.8}
          strokeLinecap="round"
          opacity={opacity}
        />
      ))}
    </motion.svg>
  );
}
