#!/usr/bin/env bash
# Checks a React component folder against the react-component skill's hard rules.
# Usage: check.sh <component-folder> [main-max-lines] [sub-max-lines]
set -uo pipefail

root="${1:?usage: check.sh <component-folder> [main-max-lines] [sub-max-lines]}"
root="${root%/}"
main_max="${2:-250}"
sub_max="${3:-120}"
fail=0

[ -d "$root" ] || { echo "not a folder: $root"; exit 2; }

report() { echo "FAIL $1"; fail=1; }

# Component .tsx files directly in a folder (not tests, stories or contexts)
components_in() {
  find "$1" -maxdepth 1 -name '*.tsx' -not -name '*.test.tsx' -not -name '*.stories.tsx' -not -name '*Context.tsx'
}

# 1. No useEffect / useLayoutEffect
while IFS= read -r hit; do
  report "effect: $hit"
done < <(grep -rnE '\buse(Layout)?Effect\b' "$root" --include='*.ts' --include='*.tsx' 2>/dev/null)

# 2. Line limits: main component vs subcomponents
while IFS= read -r f; do
  n=$(wc -l < "$f")
  if [ "$(dirname "$f")" = "$root" ]; then max=$main_max; else max=$sub_max; fi
  [ "$n" -gt "$max" ] && report "too long: $f ($n lines, max $max)"
done < <(find "$root" -name '*.tsx' -not -name '*.test.tsx' -not -name '*.stories.tsx')

# 3. No nesting: nothing deeper than root/Sub/ may hold component files
while IFS= read -r dir; do
  [ -n "$(components_in "$dir" | head -1)" ] &&
    report "nested component $dir: flatten it into a sibling of $(dirname "$dir") or promote it to its own top-level folder"
done < <(find "$root" -mindepth 2 -type d)

# 4. Each component folder has Name.tsx + Name.module.css matching the folder, and nothing stray
while IFS= read -r dir; do
  name=$(basename "$dir")
  [ -z "$(components_in "$dir" | head -1)" ] && continue
  [ -f "$dir/$name.tsx" ] || report "missing $dir/$name.tsx (component file must match folder name)"
  [ -f "$dir/$name.module.css" ] || report "missing $dir/$name.module.css"
  while IFS= read -r f; do
    base=$(basename "$f" .tsx)
    [ "$base" = "$name" ] || report "stray component $f: move it to $root/$base/$base.tsx"
  done < <(components_in "$dir")
  while IFS= read -r f; do
    base=$(basename "$f" .module.css)
    [ "$base" = "$name" ] || report "stray stylesheet $f: each folder has only $name.module.css"
  done < <(find "$dir" -maxdepth 1 -name '*.module.css')
done < <(find "$root" -maxdepth 1 -type d)

# 5. Boolean props in *Props types must start with is/are
while IFS= read -r hit; do
  report "$hit"
done < <(find "$root" -name '*.tsx' -not -name '*.test.tsx' -not -name '*.stories.tsx' -exec awk '
  /^[[:space:]]*(export[[:space:]]+)?(type|interface)[[:space:]]+[A-Za-z0-9_]*Props([^A-Za-z0-9_]|$)/ { inprops = 1 }
  inprops && match($0, /^[[:space:]]*(readonly[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*\??:[[:space:]]*boolean([^A-Za-z0-9_]|$)/) {
    name = $0; sub(/^[[:space:]]*(readonly[[:space:]]+)?/, "", name); sub(/\??:.*/, "", name)
    if (name !~ /^(is|are)[A-Z]/) printf "boolean prop %s:%d: %s must start with is/are\n", FILENAME, FNR, name
  }
  inprops && /^[[:space:]]*}/ { inprops = 0 }
' {} +)

if [ "$fail" -eq 0 ]; then
  echo "OK $root"
  find "$root" -name '*.tsx' -exec wc -l {} + | sort -n
fi
exit "$fail"
