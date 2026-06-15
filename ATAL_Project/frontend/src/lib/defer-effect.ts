/** Schedule effect work after the current render (satisfies react-hooks/set-state-in-effect). */
export function deferEffect(fn: () => void): void {
  queueMicrotask(fn);
}
