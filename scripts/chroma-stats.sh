#!/bin/bash
# Quick Chroma Vector Database Stats
# Shows what's stored in the Chroma vector database

CHROMA_DB=~/.claude-mem/vector-db/chroma.sqlite3
CLAUDE_DB=~/.claude-mem/claude-mem.db

echo "📊 Chroma Vector Database Statistics"
echo ""

# Collection info
echo "Collections:"
sqlite3 "$CHROMA_DB" "SELECT name, dimension FROM collections;" | while IFS='|' read -r name dim; do
  echo "  • $name (${dim}D embeddings)"
done
echo ""

# Embedding counts
echo "Embeddings by Type:"
sqlite3 "$CHROMA_DB" "
  SELECT
    CASE
      WHEN embedding_id LIKE 'obs_%' THEN 'Observations'
      WHEN embedding_id LIKE 'summary_%' THEN 'Session Summaries'
      WHEN embedding_id LIKE 'prompt_%' THEN 'User Prompts'
      ELSE 'Unknown'
    END as type,
    COUNT(*) as count
  FROM embeddings
  GROUP BY type
  ORDER BY count DESC;
" | while IFS='|' read -r type count; do
  printf "  %-20s %s\n" "$type:" "$(printf "%'d" $count)"
done
echo ""

# Total count
echo "Total:"
total=$(sqlite3 "$CHROMA_DB" "SELECT COUNT(*) FROM embeddings;")
printf "  %-20s %s\n" "All embeddings:" "$(printf "%'d" $total)"
echo ""

# Recent additions
echo "Recent Activity (last 5 embeddings):"
sqlite3 "$CHROMA_DB" "
  SELECT embedding_id, created_at
  FROM embeddings
  ORDER BY created_at DESC
  LIMIT 5;
" | while IFS='|' read -r id created; do
  # Extract type and ID
  if [[ $id =~ obs_([0-9]+)_ ]]; then
    type="Observation"
    obs_id="${BASH_REMATCH[1]}"
    echo "  $created - $type #$obs_id"
  elif [[ $id =~ summary_([0-9]+)_ ]]; then
    type="Summary"
    sum_id="${BASH_REMATCH[1]}"
    echo "  $created - $type #$sum_id"
  elif [[ $id =~ prompt_([0-9]+) ]]; then
    type="Prompt"
    prompt_id="${BASH_REMATCH[1]}"
    echo "  $created - $type #$prompt_id"
  fi
done
