"use client";

import React, { useId } from "react";

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
}

function TextShimmer({ children, className = "" }: TextShimmerProps) {
  const id = useId();

  return (
    <>
      <style>{`@keyframes text-shimmer-${id} { 0%,100% { background-position: 200% center } 50% { background-position: -200% center } }`}</style>
      <span
        className={`inline-block bg-clip-text text-transparent ${className}`}
        style={{
          backgroundImage: "linear-gradient(90deg, #a1a1aa 0%, #18181b 40%, #a1a1aa 80%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          animation: `text-shimmer-${id} 4s ease-in-out infinite`,
        }}
      >
        {children}
      </span>
    </>
  );
}

export { TextShimmer };
