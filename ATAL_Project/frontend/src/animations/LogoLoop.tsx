"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';

export interface LogoItem {
  node?: React.ReactNode;
  src?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  href?: string;
  ariaLabel?: string;
  text?: string;
  isSeparator?: boolean;
}

interface LogoLoopProps {
  logos: LogoItem[];
  speed?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  width?: string | number;
  logoHeight?: number;
  gap?: number;
  pauseOnHover?: boolean;
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  renderItem?: (item: LogoItem, key: string) => React.ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

const toCssLength = (value?: string | number) => 
  (typeof value === 'number' ? `${value}px` : (value ?? undefined));

const useResizeObserver = (
  callback: () => void,
  elements: React.RefObject<HTMLElement | null>[],
  dependencies: unknown[]
) => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.ResizeObserver) {
      const handleResize = () => callback();
      window.addEventListener('resize', handleResize);
      callback();
      return () => window.removeEventListener('resize', handleResize);
    }
    const observers = elements.map(ref => {
      if (!ref.current) return null;
      const observer = new ResizeObserver(callback);
      observer.observe(ref.current);
      return observer;
    });
    callback();
    return () => {
      observers.forEach(observer => observer?.disconnect());
    };
  }, [callback, elements, ...dependencies]);
};

const useImageLoader = (
  seqRef: React.RefObject<HTMLElement | null>,
  onLoad: () => void,
  dependencies: unknown[]
) => {
  useEffect(() => {
    const images = seqRef.current?.querySelectorAll('img') ?? [];
    if (images.length === 0) {
      onLoad();
      return;
    }
    let remainingImages = images.length;
    const handleImageLoad = () => {
      remainingImages -= 1;
      if (remainingImages === 0) onLoad();
    };
    images.forEach(img => {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.complete) {
        handleImageLoad();
      } else {
        htmlImg.addEventListener('load', handleImageLoad, { once: true });
        htmlImg.addEventListener('error', handleImageLoad, { once: true });
      }
    });
    return () => {
      images.forEach(img => {
        img.removeEventListener('load', handleImageLoad);
        img.removeEventListener('error', handleImageLoad);
      });
    };
  }, [onLoad, seqRef, ...dependencies]);
};

const useAnimationLoop = (
  trackRef: React.RefObject<HTMLElement | null>,
  targetVelocity: number,
  seqWidth: number,
  seqHeight: number,
  isHovered: boolean,
  hoverSpeed: number | undefined,
  isVertical: boolean
) => {
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const seqSize = isVertical ? seqHeight : seqWidth;

    if (seqSize > 0) {
      offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize;
      const transformValue = isVertical
        ? `translate3d(0, ${-offsetRef.current}px, 0)`
        : `translate3d(${-offsetRef.current}px, 0, 0)`;
      track.style.transform = transformValue;
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;

      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocityRef.current += (target - velocityRef.current) * easingFactor;

      if (seqSize > 0) {
        let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
        nextOffset = ((nextOffset % seqSize) + seqSize) % seqSize;
        offsetRef.current = nextOffset;

        const transformValue = isVertical
          ? `translate3d(0, ${-offsetRef.current}px, 0)`
          : `translate3d(${-offsetRef.current}px, 0, 0)`;
        track.style.transform = transformValue;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [targetVelocity, seqWidth, seqHeight, isHovered, hoverSpeed, isVertical, trackRef]);
};

export const LogoLoop: React.FC<LogoLoopProps> = memo(
  ({
    logos,
    speed = 120,
    direction = 'left',
    width = '100%',
    logoHeight = 28,
    gap = 32,
    pauseOnHover,
    hoverSpeed,
    fadeOut = false,
    fadeOutColor,
    scaleOnHover = false,
    renderItem,
    ariaLabel = 'Partner logos',
    className,
    style
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const seqRef = useRef<HTMLUListElement>(null);

    const [seqWidth, setSeqWidth] = useState(0);
    const [seqHeight, setSeqHeight] = useState(0);
    const [copyCount, setCopyCount] = useState(ANIMATION_CONFIG.MIN_COPIES);
    const [isHovered, setIsHovered] = useState(false);

    const effectiveHoverSpeed = useMemo(() => {
      if (hoverSpeed !== undefined) return hoverSpeed;
      if (pauseOnHover === true) return 0;
      if (pauseOnHover === false) return undefined;
      return 0;
    }, [hoverSpeed, pauseOnHover]);

    const isVertical = direction === 'up' || direction === 'down';

    const targetVelocity = useMemo(() => {
      const magnitude = Math.abs(speed);
      let directionMultiplier;
      if (isVertical) {
        directionMultiplier = direction === 'up' ? 1 : -1;
      } else {
        directionMultiplier = direction === 'left' ? 1 : -1;
      }
      const speedMultiplier = speed < 0 ? -1 : 1;
      return magnitude * directionMultiplier * speedMultiplier;
    }, [speed, direction, isVertical]);

    const updateDimensions = useCallback(() => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const sequenceRect = seqRef.current?.getBoundingClientRect?.();
      const sequenceWidth = sequenceRect?.width ?? 0;
      const sequenceHeight = sequenceRect?.height ?? 0;
      if (isVertical) {
        const parentHeight = containerRef.current?.parentElement?.clientHeight ?? 0;
        if (containerRef.current && parentHeight > 0) {
          const targetHeight = Math.ceil(parentHeight);
          if (containerRef.current.style.height !== `${targetHeight}px`)
            containerRef.current.style.height = `${targetHeight}px`;
        }
        if (sequenceHeight > 0) {
          setSeqHeight(Math.ceil(sequenceHeight));
          const viewport = containerRef.current?.clientHeight ?? parentHeight ?? sequenceHeight;
          const copiesNeeded = Math.ceil(viewport / sequenceHeight) + ANIMATION_CONFIG.COPY_HEADROOM;
          setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
        }
      } else if (sequenceWidth > 0) {
        setSeqWidth(Math.ceil(sequenceWidth));
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    }, [isVertical]);

    useResizeObserver(updateDimensions, [containerRef, seqRef], [logos, gap, logoHeight, isVertical]);

    useImageLoader(seqRef, updateDimensions, [logos, gap, logoHeight, isVertical]);

    useAnimationLoop(trackRef, targetVelocity, seqWidth, seqHeight, isHovered, effectiveHoverSpeed, isVertical);

    const handleMouseEnter = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(true);
    }, [effectiveHoverSpeed]);
    const handleMouseLeave = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(false);
    }, [effectiveHoverSpeed]);

    const renderLogoItem = useCallback(
      (item: LogoItem, key: string) => {
        if (renderItem) {
          return (
            <li 
              className="flex-none overflow-visible transition-transform duration-300"
              style={{ 
                marginRight: isVertical ? 0 : `${gap}px`,
                marginBottom: isVertical ? `${gap}px` : 0,
                fontSize: `${logoHeight}px`,
                lineHeight: 1
              }} 
              key={key} 
              role="listitem"
            >
              {renderItem(item, key)}
            </li>
          );
        }

        const isNodeItem = 'node' in item;
        const isTextItem = 'text' in item;

        let content: React.ReactNode;
        const isSeparator = item.isSeparator || item.text === '✦';

        if (isTextItem) {
          content = (
            <span 
              style={{ fontFamily: 'var(--font-questrial), sans-serif' }}
              className={isSeparator
                ? "text-base md:text-lg font-bold text-zinc-300 select-none"
                : "text-lg md:text-2xl font-bold tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors duration-300 select-none whitespace-nowrap"
              }
            >
              {item.text}
            </span>
          );
        } else if (isNodeItem) {
          content = (
            <span className="inline-flex items-center transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" aria-hidden={!!item.href && !item.ariaLabel}>
              {item.node}
            </span>
          );
        } else {
          content = (
            <img
              src={item.src}
              srcSet={item.srcSet}
              sizes={item.sizes}
              width={item.width}
              height={item.height}
              alt={item.alt ?? ''}
              title={item.title}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="block object-contain transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{ height: `${logoHeight}px`, width: 'auto', pointerEvents: 'none' }}
            />
          );
        }

        const itemAriaLabel = isTextItem 
          ? item.text 
          : (isNodeItem ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title));

        const isClickableText = isTextItem && !isSeparator;

        const itemContent = isClickableText ? (
          item.href ? (
            <a
              className="inline-flex items-center text-current no-underline rounded cursor-pointer"
              href={item.href}
              aria-label={itemAriaLabel}
            >
              {content}
            </a>
          ) : (
            <a
              className="inline-flex items-center text-current no-underline rounded cursor-pointer"
              href="#"
              onClick={(e) => e.preventDefault()}
              aria-label={itemAriaLabel}
            >
              {content}
            </a>
          )
        ) : item.href ? (
          <a
            className="inline-flex items-center text-current no-underline rounded transition-opacity duration-200 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2"
            href={item.href}
            aria-label={itemAriaLabel || 'logo link'}
            target="_blank"
            rel="noreferrer noopener"
          >
            {content}
          </a>
        ) : (
          content
        );

        const shouldScale = scaleOnHover && !isSeparator;

        return (
          <li 
            className={`flex-none overflow-visible ${shouldScale ? 'hover:scale-[1.15] duration-300 ease-out' : ''} transition-transform`} 
            style={{ 
              marginRight: isVertical ? 0 : `${gap}px`,
              marginBottom: isVertical ? `${gap}px` : 0,
              fontSize: `${logoHeight}px`,
              lineHeight: 1
            }} 
            key={key} 
            role="listitem"
          >
            {itemContent}
          </li>
        );
      },
      [renderItem, gap, logoHeight, isVertical, scaleOnHover]
    );

    const logoLists = useMemo(
      () =>
        Array.from({ length: copyCount }, (_, copyIndex) => (
          <ul
            className={`flex ${isVertical ? 'flex-col' : 'items-center'} list-none p-0 m-0`}
            key={`copy-${copyIndex}`}
            role="list"
            aria-hidden={copyIndex > 0}
            ref={copyIndex === 0 ? seqRef : undefined}
          >
            {logos.map((item, itemIndex) => renderLogoItem(item, `${copyIndex}-${itemIndex}`))}
          </ul>
        )),
      [copyCount, logos, renderLogoItem, isVertical]
    );

    const resolvedFadeColor = fadeOutColor || 'rgba(255, 255, 255, 1)';

    const fadeLeftStyle = {
      background: `linear-gradient(to right, ${resolvedFadeColor} 0%, rgba(0, 0, 0, 0) 100%)`
    };
    const fadeRightStyle = {
      background: `linear-gradient(to left, ${resolvedFadeColor} 0%, rgba(0, 0, 0, 0) 100%)`
    };
    const fadeTopStyle = {
      background: `linear-gradient(to bottom, ${resolvedFadeColor} 0%, rgba(0, 0, 0, 0) 100%)`
    };
    const fadeBottomStyle = {
      background: `linear-gradient(to top, ${resolvedFadeColor} 0%, rgba(0, 0, 0, 0) 100%)`
    };

    const rootStyle = useMemo(
      () => ({
        width: isVertical
          ? toCssLength(width) === '100%'
            ? undefined
            : toCssLength(width)
          : (toCssLength(width) ?? '100%'),
        paddingTop: scaleOnHover ? `${logoHeight * 0.1}px` : undefined,
        paddingBottom: scaleOnHover ? `${logoHeight * 0.1}px` : undefined,
        ...style
      }),
      [width, style, isVertical, scaleOnHover, logoHeight]
    );

    return (
      <div 
        ref={containerRef} 
        className={`relative overflow-hidden select-none ${isVertical ? 'h-full inline-block' : 'w-full'} ${className || ''}`}
        style={rootStyle} 
        role="region" 
        aria-label={ariaLabel}
      >
        {/* Fade Out Overlays */}
        {fadeOut && !isVertical && (
          <>
            <div className="absolute top-0 bottom-0 left-0 z-10 pointer-events-none w-[clamp(24px,8%,120px)]" style={fadeLeftStyle} />
            <div className="absolute top-0 bottom-0 right-0 z-10 pointer-events-none w-[clamp(24px,8%,120px)]" style={fadeRightStyle} />
          </>
        )}
        {fadeOut && isVertical && (
          <>
            <div className="absolute left-0 right-0 top-0 z-10 pointer-events-none h-[clamp(24px,8%,120px)]" style={fadeTopStyle} />
            <div className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none h-[clamp(24px,8%,120px)]" style={fadeBottomStyle} />
          </>
        )}

        {/* Animation Track */}
        <div 
          ref={trackRef} 
          className={`flex will-change-transform relative z-0 ${isVertical ? 'flex-col h-max w-full' : 'w-max'}`}
          onMouseEnter={handleMouseEnter} 
          onMouseLeave={handleMouseLeave}
        >
          {logoLists}
        </div>
      </div>
    );
  }
);

LogoLoop.displayName = 'LogoLoop';

export default LogoLoop;
