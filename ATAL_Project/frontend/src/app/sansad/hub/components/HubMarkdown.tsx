"use client";

import { Markdown } from "@/components/ai-components/markdown";

const HUB_PROSE =
  "text-sm text-zinc-700 leading-relaxed " +
  "[&_h1]:text-lg [&_h1]:font-black [&_h1]:text-[#1b253c] [&_h1]:mt-4 [&_h1]:mb-2 " +
  "[&_h2]:text-base [&_h2]:font-black [&_h2]:text-[#1b253c] [&_h2]:mt-3 [&_h2]:mb-2 " +
  "[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-zinc-800 [&_h3]:mt-2 [&_h3]:mb-1 " +
  "[&_p]:my-2 [&_strong]:font-bold " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 " +
  "[&_table]:w-full [&_table]:text-xs [&_table]:my-3 " +
  "[&_th]:text-left [&_th]:font-bold [&_td]:align-top";

export default function HubMarkdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  if (!children?.trim()) return null;
  return <Markdown className={`${HUB_PROSE} ${className}`.trim()}>{children}</Markdown>;
}
