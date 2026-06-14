"use client";

import React from "react";

interface BrowserPdfViewerProps {
  src: string;
  title?: string;
  className?: string;
}

/** Native browser PDF viewer (zoom, print, page nav via built-in toolbar). */
export function BrowserPdfViewer({ src, title = "PDF preview", className = "" }: BrowserPdfViewerProps) {
  if (!src) return null;

  return (
    <iframe
      src={`${src}#toolbar=1&navpanes=1&scrollbar=1`}
      title={title}
      className={`w-full min-h-[480px] h-[72vh] rounded-lg border border-zinc-200 bg-zinc-100 ${className}`}
    />
  );
}
