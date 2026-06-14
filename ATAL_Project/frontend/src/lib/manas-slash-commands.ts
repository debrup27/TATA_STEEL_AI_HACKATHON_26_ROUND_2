export interface ManasSlashCommand {
  name: string;
  label: string;
  description: string;
  hint: string;
  /** Keep the textarea open so the user can supply a draft (e.g. prompt optimizer). */
  requiresInput?: boolean;
}

export const MANAS_SLASH_COMMANDS: ManasSlashCommand[] = [
  {
    name: "prompt-optimizer",
    label: "/prompt-optimizer",
    description: "Sharpen your draft into a focused MANAS maintenance question.",
    hint: "Steel-plant diagnostics · RAG docs · asset telemetry — not code generation",
    requiresInput: true,
  },
  {
    name: "compact",
    label: "/compact",
    description: "Summarise older chat messages into a context summary.",
    hint: "Keeps the last 6 messages · frees context window",
  },
];

/** Returns the filter string after `/`, or null if not in slash-command mode. */
export function getSlashFilter(prompt: string): string | null {
  const trimmed = prompt.trimStart();
  if (!trimmed.startsWith("/")) return null;
  const rest = trimmed.slice(1);
  if (rest.includes(" ") || rest.includes("\n")) return null;
  return rest.toLowerCase();
}

export function filterSlashCommands(filter: string): ManasSlashCommand[] {
  if (!filter) return MANAS_SLASH_COMMANDS;
  return MANAS_SLASH_COMMANDS.filter(
    (cmd) => cmd.name.startsWith(filter) || cmd.label.slice(1).startsWith(filter),
  );
}

export function resolveSlashCommand(prompt: string): ManasSlashCommand | null {
  const normalized = prompt.trim().toLowerCase();
  return MANAS_SLASH_COMMANDS.find((cmd) => normalized === cmd.label) ?? null;
}

/** Match a slash command with optional trailing draft text. */
export function parseSlashCommandInput(
  prompt: string,
): { cmd: ManasSlashCommand; args: string } | null {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  for (const cmd of MANAS_SLASH_COMMANDS) {
    const label = cmd.label.toLowerCase();
    if (lower === label) return { cmd, args: "" };
    if (lower.startsWith(`${label} `)) {
      return { cmd, args: trimmed.slice(cmd.label.length).trim() };
    }
  }
  return null;
}

export function isSlashCommandInput(prompt: string): boolean {
  return resolveSlashCommand(prompt) !== null;
}
