#!/usr/bin/env bun
/**
 * Inspect Chroma Vector Database
 *
 * Queries the Chroma vector database to show what's stored.
 * Useful for debugging and understanding the vector search data.
 *
 * Usage:
 *   bun scripts/inspect-chroma.ts
 *   bun scripts/inspect-chroma.ts --query "authentication"
 *   bun scripts/inspect-chroma.ts --stats
 *   bun scripts/inspect-chroma.ts --sample 10
 */

import { ChromaSync } from '../src/services/sync/ChromaSync.js';
import { SessionStore } from '../src/services/sqlite/SessionStore.js';
import { Database } from 'bun:sqlite';
import { homedir } from 'os';
import path from 'path';

interface CliArgs {
  query?: string;
  stats: boolean;
  sample?: number;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = {
    stats: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        parsed.help = true;
        break;
      case '--stats':
        parsed.stats = true;
        break;
      case '-q':
      case '--query':
        parsed.query = args[++i];
        break;
      case '-s':
      case '--sample':
        parsed.sample = parseInt(args[++i], 10);
        break;
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
Chroma Vector Database Inspector

USAGE:
  inspect-chroma [options]

OPTIONS:
  -q, --query <text>    Search Chroma with semantic query
  -s, --sample <n>      Show sample of n random documents
  --stats               Show database statistics
  -h, --help            Show this help message

EXAMPLES:
  # Show database statistics
  bun scripts/inspect-chroma.ts --stats

  # Search for authentication-related observations
  bun scripts/inspect-chroma.ts --query "authentication bug fixes"

  # Show 5 random documents
  bun scripts/inspect-chroma.ts --sample 5
`);
}

async function showStats(): Promise<void> {
  const dbPath = path.join(homedir(), '.claude-mem', 'claude-mem.db');
  const chromaDbPath = path.join(homedir(), '.claude-mem', 'vector-db', 'chroma.sqlite3');

  const db = new Database(dbPath, { readonly: true });
  const chromaDb = new Database(chromaDbPath, { readonly: true });

  console.log('📊 Chroma Vector Database Statistics\n');

  // SQLite stats
  const observations = db.query('SELECT COUNT(*) as count FROM observations').get() as { count: number };
  const sessions = db.query('SELECT COUNT(*) as count FROM session_summaries').get() as { count: number };
  const prompts = db.query('SELECT COUNT(*) as count FROM user_prompts').get() as { count: number };

  console.log('SQLite Database:');
  console.log(`  Observations: ${observations.count.toLocaleString()}`);
  console.log(`  Sessions: ${sessions.count.toLocaleString()}`);
  console.log(`  User Prompts: ${prompts.count.toLocaleString()}`);
  console.log();

  // Chroma stats
  const collections = chromaDb.query('SELECT id, name, dimension FROM collections').all() as Array<{
    id: string;
    name: string;
    dimension: number;
  }>;

  console.log('Chroma Collections:');
  for (const col of collections) {
    const embeddings = chromaDb.query('SELECT COUNT(*) as count FROM embeddings WHERE segment_id IN (SELECT id FROM segments WHERE collection = ?)').get(col.id) as { count: number };
    console.log(`  ${col.name}:`);
    console.log(`    ID: ${col.id}`);
    console.log(`    Dimension: ${col.dimension}`);
    console.log(`    Embeddings: ${embeddings.count.toLocaleString()}`);
  }

  db.close();
  chromaDb.close();
}

async function queryChroma(query: string): Promise<void> {
  console.log(`🔍 Searching Chroma for: "${query}"\n`);

  const chromaSync = new ChromaSync('claude-mem');

  try {
    const results = await chromaSync.queryChroma(query, 10);

    console.log(`Found ${results.ids.length} results:\n`);

    if (results.ids.length === 0) {
      console.log('No results found.');
      return;
    }

    // Fetch full observations from SQLite using Bun
    const dbPath = path.join(homedir(), '.claude-mem', 'claude-mem.db');
    const db = new Database(dbPath, { readonly: true });
    const store = new SessionStore(db as any); // Cast to satisfy SessionStore constructor

    for (let i = 0; i < results.ids.length; i++) {
      const id = results.ids[i];
      const distance = results.distances[i];
      const metadata = results.metadatas[i];

      console.log(`${i + 1}. ID: ${id} (distance: ${distance.toFixed(4)})`);

      // Try to get observation details
      try {
        const obs = store.getObservation(id);
        if (obs) {
          console.log(`   Type: ${obs.type}`);
          console.log(`   Title: ${obs.title || 'Untitled'}`);
          console.log(`   Project: ${obs.project}`);
          console.log(`   Date: ${new Date(obs.created_at).toLocaleString()}`);
        }
      } catch (e) {
        console.log(`   Metadata: ${JSON.stringify(metadata)}`);
      }
      console.log();
    }

    db.close();
  } catch (error) {
    console.error('❌ Error querying Chroma:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function showSample(count: number): Promise<void> {
  console.log(`📋 Random sample of ${count} documents\n`);

  const chromaDbPath = path.join(homedir(), '.claude-mem', 'vector-db', 'chroma.sqlite3');
  const chromaDb = new Database(chromaDbPath, { readonly: true });

  const embeddings = chromaDb.query(`
    SELECT e.embedding_id, e.created_at
    FROM embeddings e
    ORDER BY RANDOM()
    LIMIT ?
  `).all(count) as Array<{ embedding_id: string; created_at: string }>;

  for (const emb of embeddings) {
    console.log(`ID: ${emb.embedding_id}`);
    console.log(`Created: ${emb.created_at}`);

    // Try to parse the ID to get observation/summary/prompt number
    const obsMatch = emb.embedding_id.match(/obs_(\d+)_/);
    const summaryMatch = emb.embedding_id.match(/summary_(\d+)_/);
    const promptMatch = emb.embedding_id.match(/prompt_(\d+)/);

    if (obsMatch) {
      console.log(`Type: Observation #${obsMatch[1]}`);
    } else if (summaryMatch) {
      console.log(`Type: Session Summary #${summaryMatch[1]}`);
    } else if (promptMatch) {
      console.log(`Type: User Prompt #${promptMatch[1]}`);
    }
    console.log();
  }

  chromaDb.close();
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    return;
  }

  if (args.stats) {
    await showStats();
  } else if (args.query) {
    await queryChroma(args.query);
  } else if (args.sample) {
    await showSample(args.sample);
  } else {
    // Default: show stats
    await showStats();
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
