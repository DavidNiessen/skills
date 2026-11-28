---
name: name-finder
description: Find a new name for a project, product, app, library or company and suggest only names that are actually free. Asks for a naming style with examples (short invented words by default), generates a wide candidate pool, then checks every candidate against package registries, domains, GitHub and a web search for existing projects in the same space before showing it. Use when someone wants to name or rename something, asks for name ideas or "something with <word>", or asks whether a name is taken. Not for trademark clearance or legal advice.
metadata:
  display-name: Name finder
---

# Name finder

Suggest names the user could start using today. A name that is already a package, a product or a project in the same space is not a suggestion, however good it sounds: check before you show, and show only what passed.

## 1. Understand what is being named

Read before asking:
- **What it is and does:** the README, the package manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, ...) and the website or tagline.
- **Its space:** the category a user would search in, for example "SSH client", "beatgrid editor", "static site generator". Collisions in this space are what disqualify a name.
- **Its ecosystems:** where it will be published (npm, crates.io, PyPI, Homebrew, RubyGems, app stores). These decide which registries to check.
- **Selling points:** the two or three ideas a name could carry (privacy, speed, offline, ownership...).
- **Constraints the user gave:** a word or prefix to include ("something with term"), a length, languages it must work in, the current name if continuity matters.

Ask only for what you cannot find.

## 2. Ask for a style

Ask which style to use, with examples built from the user's own constraint words, not generic ones. Use the question tool when there is one (for example `AskUserQuestion`), with the recommended option first. If the user does not answer, does not care, or the session is non-interactive, use **short invented words**.

| Style | What it is | Examples (with "term") |
| --- | --- | --- |
| **Short invented words** (default) | Soft, made-up, brandable words of 2 to 3 syllables. Easiest to find free. | Termaya, Termessa, Termova |
| Compound words | The constraint word plus a real word that carries a selling point. | Termwire, Termharbor, Termhop |
| Metaphor and myth | Places, navigation, crafts, mythology, foreign words. | Termheim, Termhelm, Termstead |
| Wordplay and blends | Puns, idioms, or a blend with the current name. | Longterm, Hushterm, Porterm |

The question tool allows four options plus a free-text answer, which covers "mix them" or a style of their own. Once the user has picked, keep that style for "more" requests until they ask for another.

## 3. Generate a wide pool

Write 3 to 4 times more candidates than you will show, for example 30 to 40 for a batch of 10, because most will fail the checks.

- **Fit the brief:** include the constraint word, keep to the chosen style, and tie names to the selling points where the style allows.
- **Say it out loud:** drop names that are hard to spell after hearing them, that mean something unfortunate in a major language, or that read as another word.
- **Drop known clashes before checking:** famous products in the space and names one letter away from them (for SSH clients: Termius, Terminus, Termux, Termix).
- **Track every name across the conversation:** keep a list of names already suggested and names already rejected, and never offer either again. When the user asks for more, generate new names, not variations of the ones they passed over.

## 4. Check every candidate

Run `scripts/check-names.sh` from this skill's folder on the whole pool. It needs bash and curl, and checks a few names at a time to stay under rate limits:

```bash
bash <skill-folder>/scripts/check-names.sh --registries npm,crates,pypi,brew --tlds com,dev,app,io name1 name2 ...
```

- **Choose the registries:** pick them from the project's ecosystems. The script supports `npm`, `crates`, `pypi`, `gems`, `brew` and `cask`.
- **Choose the domains:** default to `.com`, `.dev`, `.app` and `.io`, and add one that fits the project (`.sh` for a CLI, `.ai`, a country code).
- **Read the output:** it is one tab-separated row per name. `taken` means registered and `free` means no record was found. `free?` comes from a TLD without RDAP (such as `.io`), where the name does not resolve in DNS but may still be registered. `unknown(...)` means the check failed: retry it once, and if it fails again, do not count it as free.
- **GitHub:** if the `gh-account` or `gh-repos` columns come back `unknown`, use whatever GitHub access the session has. That can be `gh api users/<name>` and `gh api -X GET search/repositories -f q='<name> in:name'`, or the GitHub tools. Note any account or organisation with that login, and any repository by that name with real activity.

Then search the web for the names that passed, a few at a time, as `"<name>"` plus the project's space (for example `"termaya" ssh OR terminal`). Look for:
- **Exact matches:** products, apps, companies or projects with the same name in the same or a neighbouring space, including app-store listings and scoped npm packages (`@someone/<name>`).
- **Near misses:** names one or two letters away in the same space (Termia and Termial), which users would confuse.

Use the standard search mode first and move to a more thorough mode only when results are thin.

**Disqualify a name when any of these is true:**
- its package name is taken in a registry the project will publish to;
- a product or project with that name or a near miss exists in the same space;
- none of its domains is free, and the user did not say domains don't matter.

A taken `.com` alone does not disqualify a name when `.dev` or `.app` is free. Rank names with a free `.com` higher. A taken name in an unrelated space (a heating app, a town) is fine, but mention it.

If fewer than the batch size pass, generate more in the same style and check again, up to three rounds. Then show what passed and say how many were rejected and why.

## 5. Present only the names that passed

For each name give:
- a one-line rationale tied to the project's selling points;
- how to pronounce it, if that isn't obvious.

Group the names by sub-theme when that helps, and add a compact table of the checks:

| Name | npm | crates | .com | .dev | .app | .io | GitHub | Same-space products |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Termaya | free | free | free | free | free | free? | free | none found |

End with:
- **Your top two or three picks** and why.
- **What was not checked:** trademarks in the user's markets, app-store names, social handles, and registrations that hold a name without RDAP or DNS records. Recommend a trademark search (for example EUIPO, USPTO or WIPO Global Brand Database) before committing to a name.
- **Sources:** links for any web results you relied on.

A rejected name the user asks about directly should be explained, not hidden. When the user asks to check a specific name, run the same checks and report each result, with what disqualifies it if it fails.

## 6. After the user picks one

Offer the next steps, and do not start them without being asked:
- register the free domains and the package names (publishing a placeholder package reserves an npm or crates.io name);
- create the GitHub organisation;
- rename the project across the repository (manifests, package scopes, docs, URLs, app identifiers).

Domain registration and package publishing are outward-facing, so the user does them or explicitly asks you to.
