git add -A .
git commit -m .

branch=$(git rev-parse --abbrev-ref HEAD)

# Check if upstream is set
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  git push --set-upstream origin "$branch"
else
  git push
fi