#!/usr/bin/env bash
# PostToolUse hook: format the file Claude just wrote or edited, so diffs stay Prettier-clean.
# Receives the tool call as JSON on stdin. Never blocks the agent: failures are ignored.
file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
[[ -n "$file" && -f "$file" ]] || exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.mjs|*.cjs|*.mts|*.json|*.md|*.css|*.yml|*.yaml)
    cd "${CLAUDE_PROJECT_DIR:-.}" && pnpm exec prettier --write --ignore-unknown --log-level silent "$file" || true ;;
esac
exit 0
