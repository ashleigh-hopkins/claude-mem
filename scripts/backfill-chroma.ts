#!/usr/bin/env bun
/**
 * Backfill Chroma Vector Database
 *
 * Syncs existing observations from SQLite to Chroma that were added via:
 * - Historical imports (replay-history.ts)
 * - Manual database insertions
 * - Any observations missing from Chroma
 *
 * Usage:
 *   bun scripts/backfill-chroma.ts
 *   bun scripts/backfill-chroma.ts --project sam-api
 *   bun scripts/backfill-chroma.ts --project sam-api,ums-api
 *   bun scripts/backfill-chroma.ts --dry-run
 *   bun scripts/backfill-chroma.ts --since 2025-10-01
 */

import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import path from 'path';
import { ChromaSync } from '../src/services/sync/ChromaSync.js';
import { SessionStore } from '../src/services/sqlite/SessionStore.js';

interface CliArgs {
  project?: string[];
  since?: string;
  dryRun: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    dryRun: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        parsed.help = true;
        break;
      case '--dry-run':
        parsed.dryRun = true;
        break;
      case '-v':
      case '--verbose':
        parsed.verbose = true;
        break;
      case '-p':
      case '--project':
        parsed.project = args[++i].split(',').map(p => p.trim());
        break;
      case '--since':
        parsed.since = args[++i];
        break;
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
Backfill Chroma Vector Database

Syncs observations from SQLite to Chroma that are missing from the vector database.
Useful after historical imports or to fix missing embeddings.

USAGE:
  backfill-chroma [options]

OPTIONS:
  -p, --project <names>  Comma-separated project names to backfill
  --since <date>         Only backfill observations created after date (YYYY-MM-DD)
  --dry-run              Show what would be synced without syncing
  -v, --verbose          Show detailed progress
  -h, --help             Show this help message

EXAMPLES:
  # Backfill all projects
  bun scripts/backfill-chroma.ts

  # Backfill specific projects
  bun scripts/backfill-chroma.ts --project sam-api,ums-api

  # Backfill observations since October 2025
  bun scripts/backfill-chroma.ts --since 2025-10-01

  # Dry run to see what would be synced
  bun scripts/backfill-chroma.ts --project sam-api --dry-run
`);
}

interface ObservationRow {
  id: number;
  sdk_session_id: string;
  project: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  facts: string | null;
  narrative: string | null;
  concepts: string | null;
  files_read: string | null;
  files_modified: string | null;
  prompt_number: number | null;
  discovery_tokens: number;
  created_at: string;
  created_at_epoch: number;
}

/**
 * Check if observation exists in Chroma
 */
function isInChroma(chromaDb: Database, obsId: number): boolean {
  const result = chromaDb.query(`
    SELECT COUNT(*) as count
    FROM embeddings
    WHERE embedding_id LIKE ?
  `).get(`obs_${obsId}_%`) as { count: number };

  return result.count > 0;
}

/**
 * Get observations that need backfilling
 */
function getObservationsToBackfill(
  db: Database,
  chromaDb: Database,
  projects?: string[],
  since?: string
): ObservationRow[] {
  let query = `
    SELECT id, sdk_session_id, project, type, title, subtitle, facts, narrative,
           concepts, files_read, files_modified, prompt_number, discovery_tokens,
           created_at, created_at_epoch
    FROM observations
    WHERE 1=1
  `;

  const params: any[] = [];

  if (projects && projects.length > 0) {
    const placeholders = projects.map(() => '?').join(',');
    query += ` AND project IN (${placeholders})`;
    params.push(...projects);
  }

  if (since) {
    const sinceDate = new Date(since);
    const sinceEpoch = sinceDate.getTime();
    query += ` AND created_at_epoch >= ?`;
    params.push(sinceEpoch);
  }

  query += ` ORDER BY created_at_epoch ASC`;

  const allObs = db.query(query).all(...params) as ObservationRow[];

  console.log(`  Found ${allObs.length} observations in SQLite`);

  // Filter out those already in Chroma
  const missing: ObservationRow[] = [];
  for (const obs of allObs) {
    const inChroma = isInChroma(chromaDb, obs.id);
    if (!inChroma) {
      missing.push(obs);
    }
  }

  console.log(`  ${missing.length} missing from Chroma`);

  return missing;
}

/**
 * Backfill a single observation to Chroma
 */
async function backfillObservation(
  chromaSync: ChromaSync,
  obs: ObservationRow,
  verbose: boolean
): Promise<void> {
  // Parse JSON fields
  const facts = obs.facts ? JSON.parse(obs.facts) : [];
  const concepts = obs.concepts ? JSON.parse(obs.concepts) : [];
  const files_read = obs.files_read ? JSON.parse(obs.files_read) : [];
  const files_modified = obs.files_modified ? JSON.parse(obs.files_modified) : [];

  // Convert to ParsedObservation format
  const parsedObs = {
    type: obs.type,
    title: obs.title,
    subtitle: obs.subtitle,
    facts,
    narrative: obs.narrative,
    concepts,
    files_read,
    files_modified
  };

  // Sync to Chroma (same method used by worker)
  await chromaSync.syncObservation(
    obs.id,
    obs.sdk_session_id,
    obs.project,
    parsedObs,
    obs.prompt_number || 0,
    obs.created_at_epoch,
    obs.discovery_tokens
  );

  if (verbose) {
    console.log(`  ✓ #${obs.id}: ${obs.title || 'Untitled'}`);
  }
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  console.log('🔍 Chroma Backfill Tool\n');

  // Open databases
  const dbPath = path.join(homedir(), '.claude-mem', 'claude-mem.db');
  const chromaDbPath = path.join(homedir(), '.claude-mem', 'vector-db', 'chroma.sqlite3');

  const db = new Database(dbPath, { readonly: true });
  const chromaDb = new Database(chromaDbPath, { readonly: true });

  // Get observations to backfill
  console.log('Scanning for missing observations...');
  const missing = getObservationsToBackfill(db, chromaDb, args.project, args.since);

  if (missing.length === 0) {
    console.log('✓ All observations are already in Chroma!');
    db.close();
    chromaDb.close();
    return;
  }

  // Group by project
  const byProject = new Map<string, ObservationRow[]>();
  for (const obs of missing) {
    if (!byProject.has(obs.project)) {
      byProject.set(obs.project, []);
    }
    byProject.get(obs.project)!.push(obs);
  }

  console.log(`\nFound ${missing.length} observations missing from Chroma:\n`);
  for (const [project, observations] of byProject) {
    console.log(`  ${project}: ${observations.length} observations`);
  }
  console.log();

  if (args.dryRun) {
    console.log('🔍 DRY RUN - No changes will be made\n');
    console.log('Sample observations to backfill:');
    for (let i = 0; i < Math.min(5, missing.length); i++) {
      const obs = missing[i];
      console.log(`  #${obs.id} [${obs.type}] ${obs.title || 'Untitled'}`);
      console.log(`    Project: ${obs.project}`);
      console.log(`    Date: ${new Date(obs.created_at_epoch).toLocaleString()}`);
    }
    db.close();
    chromaDb.close();
    return;
  }

  // Backfill observations
  console.log('Starting backfill...\n');

  let completed = 0;
  let failed = 0;

  // Create single ChromaSync instance for 'claude-mem' collection (all projects share this)
  const chromaSync = new ChromaSync('claude-mem');

  // Backfill all observations (grouped by project for display only)
  for (const [project, observations] of byProject) {
    console.log(`📦 Backfilling ${project} (${observations.length} observations)...`);

    for (const obs of observations) {
      try {
        await backfillObservation(chromaSync, obs, args.verbose);
        completed++;

        // Progress indicator
        if (!args.verbose && completed % 10 === 0) {
          process.stdout.write(`  Progress: ${completed}/${missing.length}\r`);
        }
      } catch (error) {
        failed++;
        console.error(`  ✗ #${obs.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (!args.verbose) {
      console.log(`  ✓ Completed: ${observations.length} observations`);
    }
    console.log();
  }

  db.close();
  chromaDb.close();

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n✅ Backfill complete!\n`);
  console.log(`  Synced: ${completed} observations`);
  if (failed > 0) {
    console.log(`  Failed: ${failed} observations`);
  }
  console.log();
}

main().catch(error => {
  console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
