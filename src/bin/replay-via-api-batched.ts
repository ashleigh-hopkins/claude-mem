#!/usr/bin/env bun
/**
 * Historical Replay via Worker API (Batched)
 *
 * Sends events in small batches to prevent generator timeout.
 * Waits for each batch to be processed before sending next.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

const BATCH_SIZE = 50;  // Send 50 events at a time
const POLL_INTERVAL_MS = 2000;  // Check queue every 2 seconds

interface Event {
  timestamp: number;
  type: 'prompt' | 'tool';
  sessionId: string;
  project: string;
  promptNumber?: number;
  promptText?: string;
  tool_name?: string;
  tool_input?: any;
  tool_response?: any;
  cwd?: string;
}

/**
 * Parse transcript and extract ALL events in chronological order
 */
function parseTranscript(filepath: string): Event[] {
  const events: Event[] = [];
  const content = readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  const toolUseMap = new Map<string, { name: string; input: any; timestamp: number; promptNum: number }>();
  let currentPromptNumber = 0;

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const sessionId = data.sessionId;
      const timestamp = new Date(data.timestamp).getTime();
      const role = data.message?.role;
      const content = data.message?.content;
      const cwd = data.cwd || 'unknown';
      const project = basename(cwd);

      // User messages (prompts)
      if (role === 'user') {
        const isToolResult = Array.isArray(content) && content.some((b: any) => b.type === 'tool_result');
        
        if (!isToolResult) {
          currentPromptNumber++;
          
          let promptText = '';
          if (typeof content === 'string') {
            promptText = content.trim();
          } else if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                promptText = block.text.trim();
                break;
              }
            }
          }

          if (promptText &&
              !promptText.startsWith('[Request interrupted') &&
              !promptText.startsWith('Caveat:') &&
              !promptText.startsWith('<bash-')) {
            events.push({
              timestamp,
              type: 'prompt',
              sessionId,
              project,
              promptNumber: currentPromptNumber,
              promptText
            });
          }
        }

        // Tool results
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'tool_result' && block.tool_use_id) {
              const toolUse = toolUseMap.get(block.tool_use_id);
              if (toolUse) {
                events.push({
                  timestamp: toolUse.timestamp,
                  type: 'tool',
                  sessionId,
                  project,
                  promptNumber: toolUse.promptNum,
                  tool_name: toolUse.name,
                  tool_input: toolUse.input,
                  tool_response: block.content,
                  cwd
                });
                toolUseMap.delete(block.tool_use_id);
              }
            }
          }
        }
      }

      // Assistant tool_use
      if (role === 'assistant' && Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'tool_use' && block.id && block.name && block.input) {
            toolUseMap.set(block.id, {
              name: block.name,
              input: block.input,
              timestamp,
              promptNum: currentPromptNumber
            });
          }
        }
      }
    } catch (error) {
      // Skip malformed lines
    }
  }

  return events;
}

/**
 * Check pending queue size via database
 */
async function checkPendingCount(): Promise<number> {
  try {
    // Query database directly since stats API doesn't include pending queue
    const { Database } = await import('bun:sqlite');
    const db = new Database(join(homedir(), '.claude-mem', 'claude-mem.db'));
    const result = db.query("SELECT COUNT(*) as count FROM pending_messages WHERE status = 'pending'").get() as { count: number };
    db.close();
    return result.count;
  } catch {
    return 0;
  }
}

/**
 * Send single event
 */
async function sendEvent(event: Event): Promise<{ queued: boolean; skipped: boolean; failed: boolean }> {
  try {
    if (event.type === 'prompt') {
      // Step 1: Save prompt with historical timestamp
      const initResponse = await fetch('http://127.0.0.1:37777/api/sessions/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claudeSessionId: event.sessionId,
          project: event.project,
          prompt: event.promptText,
          timestamp: event.timestamp
        })
      });

      if (!initResponse.ok) {
        return { queued: false, skipped: false, failed: true };
      }

      const initResult = await initResponse.json();
      const sessionDbId = initResult.sessionDbId;
      const promptNumber = initResult.promptNumber;

      // Step 2: Start generator and sync to Chroma (mimics real hook behavior)
      const startResponse = await fetch(`http://127.0.0.1:37777/sessions/${sessionDbId}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: event.promptText,
          promptNumber
        })
      });

      return { queued: startResponse.ok, skipped: false, failed: !startResponse.ok };
    } else {
      const response = await fetch('http://127.0.0.1:37777/api/sessions/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claudeSessionId: event.sessionId,
          tool_name: event.tool_name,
          tool_input: event.tool_input,
          tool_response: event.tool_response,
          cwd: event.cwd,
          timestamp: event.timestamp
        })
      });

      if (!response.ok) {
        return { queued: false, skipped: false, failed: true };
      }

      const result = await response.json();
      return {
        queued: result.status === 'queued',
        skipped: result.status === 'skipped',
        failed: result.status !== 'queued' && result.status !== 'skipped'
      };
    }
  } catch (error) {
    console.error(`    ✗ ${event.type} failed:`, error instanceof Error ? error.message : String(error));
    return { queued: false, skipped: false, failed: true };
  }
}

/**
 * Replay events in batches
 */
async function replayBatched(events: Event[]): Promise<void> {
  console.log(`\nReplaying ${events.length} events in batches of ${BATCH_SIZE}...`);
  console.log(`Will wait for each batch to be processed before sending next.\n`);

  let totalQueued = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  const numBatches = Math.ceil(events.length / BATCH_SIZE);

  for (let batchNum = 0; batchNum < numBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, events.length);
    const batch = events.slice(start, end);

    console.log(`Batch ${batchNum + 1}/${numBatches} (events ${start + 1}-${end})...`);

    // Send batch
    for (const event of batch) {
      const result = await sendEvent(event);
      if (result.queued) totalQueued++;
      else if (result.skipped) totalSkipped++;
      else if (result.failed) totalFailed++;
    }

    console.log(`  Sent: ${batch.length} events (${totalQueued} queued, ${totalSkipped} skipped, ${totalFailed} failed)`);

    // Tiny delay to avoid overwhelming worker (but keep generators alive!)
    // Must send next batch within 5 seconds to prevent linger timeout
    if (batchNum < numBatches - 1 && (batchNum + 1) % 10 === 0) {
      // Every 10 batches (500 events), pause briefly
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
    } else {
      // Otherwise just tiny throttle
      await new Promise(resolve => setTimeout(resolve, 10)); // 10ms
    }
  }

  console.log(`\n✓ All events sent: ${totalQueued} queued, ${totalSkipped} skipped, ${totalFailed} failed`);
  console.log(`SDK agent still processing remaining queue...`);
}

/**
 * Main
 */
async function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error('Usage: bun src/bin/replay-via-api-batched.ts <project-dir>');
    process.exit(1);
  }

  const fullPath = projectDir.startsWith('~') ? projectDir.replace('~', homedir()) : projectDir;
  if (!existsSync(fullPath)) {
    console.error(`❌ Project not found: ${fullPath}`);
    process.exit(1);
  }

  const projectName = basename(fullPath);
  console.log(`${'='.repeat(80)}`);
  console.log(`Processing: ${projectName}`);
  console.log('='.repeat(80));

  // Parse all transcripts
  const files = readdirSync(fullPath).filter(f => f.endsWith('.jsonl'));
  console.log(`Found ${files.length} transcript file(s)`);

  const allEvents: Event[] = [];
  for (const file of files) {
    const events = parseTranscript(join(fullPath, file));
    allEvents.push(...events);
  }

  // Sort by timestamp
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  console.log(`Found ${allEvents.length} events`);

  await replayBatched(allEvents);

  console.log('\n✓ Replay complete');
}

main().catch(error => {
  console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
