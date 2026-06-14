"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import UserPill from "./UserPill";

export interface PillNavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}

interface PillNavProps {
  logo: string;
  logoAlt?: string;
  items: PillNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
}

export default function PillNav({
  logo,
  logoAlt = "Logo",
  items,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#120F17",
  hoveredPillTextColor = "#120F17",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
}: PillNavProps) {
  const pathname = usePathname();
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<HTMLSpanElement[]>([]);
  const tlRefs = useRef<gsap.core.Timeline[]>([]);
  const activeTweenRefs = useRef<gsap.core.Tween[]>([]);
  const logoImgRef = useRef<HTMLImageElement>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const userPillContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
        const originY = D - delta;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${originY}px`,
        });

        const label = pill.querySelector(".pill-label") as HTMLElement | null;
        const white = pill.querySelector(".pill-label-hover") as HTMLElement | null;

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 12, opacity: 0 });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: "auto" }, 0);

        if (label) {
          tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: "auto" }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
          tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: "auto" }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if ("fonts" in document && document.fonts?.ready) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.set(menu, { visibility: "hidden", opacity: 0, scaleY: 1, y: 0 });
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items, ease]);

    const animateReveal = useCallback(() => {
    const container = containerRef.current;
    const logoEl = logoRef.current;
    const navItems = navItemsRef.current;
    const userEl = userPillContainerRef.current;

    if (container) {
      gsap.set(container, { opacity: 1, visibility: "visible", pointerEvents: "auto" });
    }

    if (logoEl) {
      gsap.set(logoEl, { scale: 0 });
      gsap.to(logoEl, {
        scale: 1,
        duration: 0.7,
        ease,
      });
    }

    if (navItems) {
      gsap.set(navItems, { width: 0, overflow: "hidden" });
      gsap.to(navItems, {
        width: "auto",
        duration: 0.7,
        ease,
      });
    }

    if (userEl) {
      gsap.set(userEl, { scale: 0 });
      gsap.to(userEl, {
        scale: 1,
        duration: 0.7,
        ease,
      });
    }

    if (container) {
      gsap.to(container, {
        opacity: 1,
        duration: 0.01,
        ease,
      });
    }
  }, [ease]);

  const hideNav = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    gsap.set(container, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
  }, []);

  useEffect(() => {
    if (!initialLoadAnimation) return;

    const frame = requestAnimationFrame(() => animateReveal());

    const onTransitionStart = () => hideNav();
    const onTransitionComplete = () => animateReveal();
    window.addEventListener("page-transition-start", onTransitionStart);
    window.addEventListener("page-transition-complete", onTransitionComplete);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("page-transition-start", onTransitionStart);
      window.removeEventListener("page-transition-complete", onTransitionComplete);
    };
  }, [initialLoadAnimation, animateReveal, hideNav]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.3,
      ease,
      overwrite: "auto",
    }) as unknown as gsap.core.Tween;
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.2,
      ease,
      overwrite: "auto",
    }) as unknown as gsap.core.Tween;
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
      overwrite: "auto",
    });
  };

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const hamburger = hamburgerRef.current;
    const menu = mobileMenuRef.current;

    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line");
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease });
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease });
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease });
      }
    }

    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: "visible" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: 10, scaleY: 1 },
          {
            opacity: 1,
            y: 0,
            scaleY: 1,
            duration: 0.3,
            ease,
            transformOrigin: "top center",
          }
        );
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: 10,
          scaleY: 1,
          duration: 0.2,
          ease,
          transformOrigin: "top center",
          onComplete: () => {
            gsap.set(menu, { visibility: "hidden" });
          },
        });
      }
    }

    onMobileMenuClick?.();
  };

  const cssVars = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": resolvedPillTextColor,
    "--nav-h": "52px",
    "--logo": "44px",
    "--pill-pad-x": "18px",
    "--pill-gap": "3px",
  } as React.CSSProperties;

  if (pathname === "/manas/chat" || pathname.startsWith("/sansad/hub")) return null;

  return (
    <>
    <div
      ref={containerRef}
      className="fixed top-[1em] z-[1000] w-full left-0 md:w-auto md:left-1/2 md:-translate-x-1/2"
      style={{ willChange: "transform, opacity" }}
    >
      <nav
        className={`w-full md:w-max flex items-center justify-between md:justify-start box-border px-4 md:px-0 ${className}`}
        aria-label="Primary"
        style={cssVars}
      >
        <div
          ref={logoRef}
          onMouseEnter={handleLogoEnter}
          className="rounded-full p-2 inline-flex items-center justify-center overflow-hidden shadow-sm cursor-default"
          style={{
            width: "var(--nav-h)",
            height: "var(--nav-h)",
            background: "var(--base, #000)",
          }}
        >
          <img src={logo} alt={logoAlt} ref={logoImgRef} className="w-full h-full object-cover block" />
        </div>

        <div
          ref={navItemsRef}
          className="relative items-center rounded-full hidden md:flex ml-2 shadow-sm backdrop-blur-lg"
          style={{
            height: "var(--nav-h)",
            background: "var(--base, #000)",
          }}
        >
          <ul
            role="menubar"
            className="list-none flex items-stretch m-0 p-[3px] h-full"
            style={{ gap: "var(--pill-gap)" }}
          >
            {items.map((item, i) => {
              const isActive = pathname === item.href;

              const pillStyle = {
                background: "var(--pill-bg, #fff)",
                color: "var(--pill-text, var(--base, #000))",
                paddingLeft: "var(--pill-pad-x)",
                paddingRight: "var(--pill-pad-x)",
              } as React.CSSProperties;

              const PillContent = (
                <>
                  <span
                    className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                    style={{
                      background: "var(--base, #000)",
                      willChange: "transform",
                    }}
                    aria-hidden="true"
                    ref={(el) => {
                      if (el) circleRefs.current[i] = el;
                    }}
                  />
                  <span className="label-stack relative inline-block leading-[1] z-[2]">
                    <span
                      className="pill-label relative z-[2] inline-block leading-[1]"
                      style={{ willChange: "transform" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="pill-label-hover absolute left-0 top-0 z-[3] inline-block"
                      style={{
                        color: "var(--hover-text, #fff)",
                        willChange: "transform, opacity",
                        opacity: 0,
                        transform: "translateY(100%)",
                      }}
                      aria-hidden="true"
                    >
                      {item.label}
                    </span>
                  </span>
                  {isActive && (
                    <span
                      className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 w-3 h-3 rounded-full z-[4]"
                      style={{ background: "var(--base, #000)" }}
                      aria-hidden="true"
                    />
                  )}
                </>
              );

              const basePillClasses =
                "relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-semibold text-[16px] leading-[0] uppercase tracking-[0.2px] whitespace-nowrap cursor-pointer";

              return (
                <li key={item.href} role="none" className="flex h-full">
                  <Link
                    role="menuitem"
                    href={item.href}
                    className={basePillClasses}
                    style={pillStyle}
                    aria-label={item.ariaLabel || item.label}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                  >
                    {PillContent}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <button
          ref={hamburgerRef}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          className="md:hidden rounded-full border-0 flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative shadow-sm"
          style={{
            width: "var(--nav-h)",
            height: "var(--nav-h)",
            background: "var(--base, #000)",
          }}
        >
          <span
            className="hamburger-line w-4 h-0.5 rounded origin-center"
            style={{ background: "var(--pill-bg, #fff)" }}
          />
          <span
            className="hamburger-line w-4 h-0.5 rounded origin-center"
            style={{ background: "var(--pill-bg, #fff)" }}
          />
        </button>

        {/* Right User Pill (mimicking Logo Pill) */}
        <UserPill
          containerRef={userPillContainerRef}
          containerClassName="rounded-full p-2 inline-flex items-center justify-center shadow-sm cursor-pointer ml-2 hidden md:flex group relative"
          containerStyle={{
            width: "var(--nav-h)",
            height: "var(--nav-h)",
            background: "var(--base, #000)",
          }}
          className="w-[36px] h-[36px]"
          align="left"
        />
      </nav>

      <div
        ref={mobileMenuRef}
        className="md:hidden absolute top-[3em] left-4 right-4 rounded-[27px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[998] origin-top"
        style={{
          background: "var(--base, #f0f0f0)",
        }}
      >
        <ul className="list-none m-0 p-[3px] flex flex-col gap-[3px]">
          {items.map((item) => {
            const defaultStyle = {
              background: "var(--pill-bg, #fff)",
              color: "var(--pill-text, #fff)",
            } as React.CSSProperties;
            const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = "var(--base)";
              e.currentTarget.style.color = "var(--hover-text, #fff)";
            };
            const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.background = "var(--pill-bg, #fff)";
              e.currentTarget.style.color = "var(--pill-text, #fff)";
            };

            const linkClasses =
              "block py-3 px-4 text-[16px] font-medium rounded-[50px] transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]";

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={linkClasses}
                  style={defaultStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
    <div className="fixed top-[1em] right-4 z-[1000] flex items-center md:hidden" style={{ height: "52px" }}>
      <UserPill />
    </div>
    </>
  );
}
