#!/bin/bash
# PostToolUse hook: commit the single file that Claude just edited or wrote.
# Only that path is committed, so other staged or unstaged work is left alone.
f=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
[ -z "$f" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$PWD}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
# Never commit secrets or env files, even if git would allow it
case "$f" in *.env*|*.pem|*.key|*secret*|*credential*) exit 0 ;; esac
rel=$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1], os.getcwd()))' "$f")
git add -- "$rel" 2>/dev/null || exit 0
git diff --cached --quiet -- "$rel" && exit 0
git commit -q -m "chore: update $rel

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>" -- "$rel" || true
exit 0
