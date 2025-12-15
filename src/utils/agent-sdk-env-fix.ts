/**
 * Agent SDK Environment Variable Fix
 *
 * Unset thinking-related env vars that conflict with Agent SDK observation generation.
 * These vars cause "max_tokens must be greater than thinking.budget_tokens" errors.
 *
 * Import this module at the top of any entry point that uses the Agent SDK:
 * - src/services/worker-service.ts
 * - src/bin/replay-history.ts
 * - scripts/bug-report/cli.ts
 * - scripts/translate-readme/cli.ts
 *
 * The import must be at the very top (before other imports) to execute before
 * the Agent SDK is loaded.
 */

if (process.env.MAX_THINKING_TOKENS) {
  delete process.env.MAX_THINKING_TOKENS;
}

if (process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) {
  delete process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
}
