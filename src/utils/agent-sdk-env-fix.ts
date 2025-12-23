/**
 * Agent SDK Environment Variable Fix
 *
 * Unset thinking-related env vars that conflict with Agent SDK observation generation.
 * These vars cause "max_tokens must be greater than thinking.budget_tokens" errors.
 */

if (process.env.MAX_THINKING_TOKENS) {
  console.log(`[ENV-FIX] Removing MAX_THINKING_TOKENS=${process.env.MAX_THINKING_TOKENS}`);
  delete process.env.MAX_THINKING_TOKENS;
}

if (process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) {
  console.log(`[ENV-FIX] Removing CLAUDE_CODE_MAX_OUTPUT_TOKENS=${process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS}`);
  delete process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
}

// Log what env vars remain
const thinkingVars = Object.keys(process.env).filter(k => k.toLowerCase().includes('think') || k.toLowerCase().includes('budget'));
if (thinkingVars.length > 0) {
  console.log(`[ENV-FIX] WARNING: Other thinking-related vars exist:`, thinkingVars);
}

console.log(`[ENV-FIX] Environment sanitized for Agent SDK`);
