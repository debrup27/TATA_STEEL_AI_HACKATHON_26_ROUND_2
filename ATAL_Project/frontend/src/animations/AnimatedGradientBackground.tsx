"use client";

import React, { useEffect, useRef } from "react";

interface AnimatedGradientBackgroundProps {
   /** 
    * Initial size of the radial gradient, defining the starting width. 
    * @default 120
    */
   startingGap?: number;

   /**
    * Enables or disables the breathing animation effect.
    * @default true
    */
   Breathing?: boolean;

   /**
    * Array of colors to use in the radial gradient.
    * Each color corresponds to a stop percentage in `gradientStops`.
    * @default ["#FF5C00", "#FF7A00", "#FFA366", "#a5b4fc", "#e8ebfd", "#ffffff", "#ffffff"]
    */
   gradientColors?: string[];

   /**
    * Array of percentage stops corresponding to each color in `gradientColors`.
    * The values should range between 0 and 100.
    * @default [0, 15, 30, 42, 52, 60, 100]
    */
   gradientStops?: number[];

   /**
    * Speed of the breathing animation. 
    * Lower values result in slower animation.
    * @default 0.02
    */
   animationSpeed?: number;

   /**
    * Maximum range for the breathing animation in percentage points.
    * Determines how much the gradient "breathes" by expanding and contracting.
    * @default 25
    */
   breathingRange?: number;

   /**
    * Additional inline styles for the gradient container.
    * @default {}
    */
   containerStyle?: React.CSSProperties;

   /**
    * Additional class names for the gradient container.
    * @default ""
    */
   containerClassName?: string;

   /**
    * Additional top offset for the gradient container from the top to have a more flexible control over the gradient.
    * @default 0
    */
   topOffset?: number;

   /**
    * Origin position of the radial gradient.
    * @default "50% -15%"
    */
   gradientPosition?: string;
}

/**
 * AnimatedGradientBackground
 *
 * This component renders a customizable animated radial gradient background with a subtle breathing effect.
 * It is optimized for light themes, inverted from the top (similar to sarvam.ai), fading to pure white at the bottom.
 *
 * @param {AnimatedGradientBackgroundProps} props - Props for configuring the gradient animation.
 * @returns JSX.Element
 */
const AnimatedGradientBackground: React.FC<AnimatedGradientBackgroundProps> = ({
   startingGap = 120,
   Breathing = true,
   gradientColors = [
      "#FF5C00", // Rich vibrant orange
      "#FF7A00", // Vibrant orange
      "#FFA366", // Soft orange-peach transition
      "#a5b4fc", // Soft lavender-blue (reduced)
      "#e8ebfd", // Very faint violet-blue transition
      "#ffffff", // White starts at 60%-65% stop (bottom 40% is pure white)
      "#ffffff"  // Fills remaining area with solid white
   ],
   gradientStops = [0, 15, 30, 42, 52, 60, 100],
   animationSpeed = 0.02,
   breathingRange = 25,
   containerStyle = {},
   topOffset = 0,
   containerClassName = "",
   gradientPosition = "50% -15%",
}) => {

   // Validation: Ensure gradientStops and gradientColors lengths match
   if (gradientColors.length !== gradientStops.length) {
      throw new Error(
         `GradientColors and GradientStops must have the same length.
     Received gradientColors length: ${gradientColors.length},
     gradientStops length: ${gradientStops.length}`
      );
   }

   const containerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      let animationFrame: number;
      let width = startingGap;
      let directionWidth = 1;

      const animateGradient = () => {
         if (width >= startingGap + breathingRange) directionWidth = -1;
         if (width <= startingGap - breathingRange) directionWidth = 1;

         if (!Breathing) directionWidth = 0;
         width += directionWidth * animationSpeed;

         const gradientStopsString = gradientStops
            .map((stop, index) => `${gradientColors[index]} ${stop}%`)
            .join(", ");

         // Ellipse positioned at the top (e.g. 50% -15%) to flow downwards, inverted.
         const gradient = `radial-gradient(${width}% ${width + topOffset}% at ${gradientPosition}, ${gradientStopsString})`;

         if (containerRef.current) {
            containerRef.current.style.background = gradient;
         }

         animationFrame = requestAnimationFrame(animateGradient);
      };

      animationFrame = requestAnimationFrame(animateGradient);

      return () => cancelAnimationFrame(animationFrame); // Cleanup animation
   }, [startingGap, Breathing, gradientColors, gradientStops, animationSpeed, breathingRange, topOffset, gradientPosition]);

   return (
      <div
         className={`absolute inset-0 overflow-hidden ${containerClassName}`}
      >
         <div
            ref={containerRef}
            style={containerStyle}
            className="absolute inset-0"
         />
      </div>
   );
};

export default AnimatedGradientBackground;
