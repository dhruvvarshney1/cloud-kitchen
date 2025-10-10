#!/bin/bash
git add .
git commit -m "Commit at $(date +'%Y-%m-%d %H:%M:%S')"
git push
echo "Changes pushed to remote repository."