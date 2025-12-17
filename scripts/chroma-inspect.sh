#!/bin/bash
# Inspect specific observation in Chroma
# Usage: ./scripts/chroma-inspect.sh <observation-id>

CHROMA_DB=~/.claude-mem/vector-db/chroma.sqlite3

if [ -z "$1" ]; then
  echo "Usage: $0 <observation-id>"
  echo ""
  echo "Examples:"
  echo "  $0 13615          # Show all chunks for observation #13615"
  echo "  $0 summary_250    # Show all chunks for session summary #250"
  echo "  $0 prompt_1000    # Show chunk for user prompt #1000"
  exit 1
fi

OBS_ID="$1"

echo "🔍 Searching Chroma for: $OBS_ID"
echo ""

# Find all embedding IDs matching this observation
if [[ $OBS_ID =~ ^[0-9]+$ ]]; then
  # Just a number - search for obs_X_*
  pattern="obs_${OBS_ID}_%"
elif [[ $OBS_ID =~ ^summary ]]; then
  pattern="${OBS_ID}_%"
elif [[ $OBS_ID =~ ^prompt ]]; then
  pattern="${OBS_ID}"
else
  pattern="${OBS_ID}%"
fi

echo "Embeddings found:"
sqlite3 "$CHROMA_DB" "
  SELECT embedding_id, created_at
  FROM embeddings
  WHERE embedding_id LIKE '$pattern'
  ORDER BY embedding_id;
" | while IFS='|' read -r id created; do
  echo "  • $id"
  echo "    Created: $created"
done

# Count
count=$(sqlite3 "$CHROMA_DB" "SELECT COUNT(*) FROM embeddings WHERE embedding_id LIKE '$pattern';")
echo ""
echo "Total chunks: $count"

if [ "$count" -eq 0 ]; then
  echo ""
  echo "⚠️  No embeddings found for '$OBS_ID'"
  echo "    Try: ./scripts/chroma-stats.sh to see what's available"
fi
