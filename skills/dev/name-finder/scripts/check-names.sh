#!/usr/bin/env bash
# Check whether candidate names are free on package registries, domains and GitHub.
#
# Usage: check-names.sh [--registries npm,crates,pypi,brew] [--tlds com,dev,app,io] [--no-github] NAME...
#
# Prints one tab-separated row per name. Each cell is `free`, `taken` or `unknown(<HTTP code>)`.
# Domains are looked up over RDAP. A TLD without RDAP (such as .io) falls back to DNS and
# reports `free?` when the name does not resolve: it may still be registered without DNS.
# `free` means the registry has no record of the name, not that it is legally clear.
# Needs bash and curl. GITHUB_TOKEN (or GH_TOKEN) raises the GitHub rate limit when set.

set -u

registries="npm,crates,pypi,brew"
tlds="com,dev,app,io"
github=1
names=()

while [ $# -gt 0 ]; do
  case "$1" in
    --registries) registries="$2"; shift 2 ;;
    --tlds) tlds="$2"; shift 2 ;;
    --no-github) github=0; shift ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) names+=("$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"); shift ;;
  esac
done

if [ ${#names[@]} -eq 0 ]; then
  echo "usage: $0 [--registries LIST] [--tlds LIST] [--no-github] NAME..." >&2
  exit 2
fi

ua="name-check-script"
token="${GITHUB_TOKEN:-${GH_TOKEN:-}}"

# HTTP status of a URL, retrying rate limits (429) and network errors with backoff.
status() {
  local url="$1" code attempt
  shift
  for attempt in 1 2 3 4; do
    code=$(curl -s -L -o /dev/null -w '%{http_code}' -A "$ua" --max-time 20 "$@" "$url")
    case "$code" in
      429|000|5??) sleep $((attempt * 3)) ;;
      *) printf '%s' "$code"; return ;;
    esac
  done
  printf '%s' "$code"
}

# 404 means nothing is registered under the name; 200 means something is.
verdict() {
  case "$1" in
    404) printf 'free' ;;
    200) printf 'taken' ;;
    *) printf 'unknown(%s)' "$1" ;;
  esac
}

registry_url() {
  case "$1" in
    npm) printf 'https://registry.npmjs.org/%s' "$2" ;;
    crates) printf 'https://crates.io/api/v1/crates/%s' "$2" ;;
    pypi) printf 'https://pypi.org/pypi/%s/json' "$2" ;;
    gems) printf 'https://rubygems.org/api/v1/gems/%s.json' "$2" ;;
    brew) printf 'https://formulae.brew.sh/api/formula/%s.json' "$2" ;;
    cask) printf 'https://formulae.brew.sh/api/cask/%s.json' "$2" ;;
    *) return 1 ;;
  esac
}

# TLDs whose registry publishes RDAP, from IANA's bootstrap file.
rdap_tlds=$(curl -s --max-time 20 https://data.iana.org/rdap/dns.json | grep -o '"[a-z0-9-]*"' | tr -d '"')

# `taken` when the domain has name servers, `free?` on NXDOMAIN (DNS over HTTPS).
dns_verdict() {
  local body
  body=$(curl -s --max-time 20 -H 'accept: application/dns-json' "https://dns.google/resolve?name=$1&type=NS")
  case "$body" in
    *'"Status":0'*'"Answer"'*) printf 'taken' ;;
    *'"Status":0'*|*'"Status":3'*) printf 'free?' ;;
    *) printf 'unknown(dns)' ;;
  esac
}

domain_verdict() {
  local domain="$1" tld="$2" code result
  if ! printf '%s\n' "$rdap_tlds" | grep -qx "$tld"; then
    dns_verdict "$domain"
    return
  fi
  code=$(status "https://rdap.org/domain/$domain")
  result=$(verdict "$code")
  case "$result" in
    taken) printf 'taken' ;;
    # Trust a registered-but-unlisted signal from DNS over a missing RDAP record.
    free) [ "$(dns_verdict "$domain")" = taken ] && printf 'taken' || printf 'free' ;;
    *) result=$(dns_verdict "$domain"); [ "$result" = taken ] && printf 'taken' || printf 'unknown(%s)' "$code" ;;
  esac
}

github_args=()
[ -n "$token" ] && github_args=(-H "Authorization: Bearer $token")

check() {
  local name="$1" row="$1" reg tld code body count
  IFS=',' read -r -a regs <<< "$registries"
  for reg in "${regs[@]}"; do
    [ -z "$reg" ] && continue
    if url=$(registry_url "$reg" "$name"); then
      row="$row	$reg:$(verdict "$(status "$url")")"
    else
      row="$row	$reg:unsupported"
    fi
  done
  IFS=',' read -r -a ts <<< "$tlds"
  for tld in "${ts[@]}"; do
    [ -z "$tld" ] && continue
    row="$row	.$tld:$(domain_verdict "$name.$tld" "$tld")"
  done
  if [ "$github" -eq 1 ]; then
    row="$row	gh-account:$(verdict "$(status "https://api.github.com/users/$name" ${github_args[@]+"${github_args[@]}"})")"
    body=$(curl -s -A "$ua" --max-time 20 ${github_args[@]+"${github_args[@]}"} \
      "https://api.github.com/search/repositories?q=$name+in:name&per_page=1")
    count=$(printf '%s' "$body" | grep -o '"total_count": *[0-9]*' | grep -o '[0-9]*$')
    row="$row	gh-repos:${count:-unknown}"
  fi
  printf '%s\n' "$row"
}

# A few names at a time: RDAP and GitHub rate-limit bursts.
running=0
for name in "${names[@]}"; do
  check "$name" &
  running=$((running + 1))
  if [ "$running" -ge 3 ]; then
    wait
    running=0
  fi
done
wait
