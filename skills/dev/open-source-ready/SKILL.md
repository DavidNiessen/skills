---
name: open-source-ready
description: Make a GitHub repository a fully fleshed-out open-source project. Covers the licence, a README that answers what/why/install/use, a CONTRIBUTING guide written for this codebase, code of conduct, security policy, support page, issue forms, PR template, Dependabot, CODEOWNERS, generated-file attributes, package metadata, CI on pull requests and a release process. Ends with the settings only the owner can change. Use when someone wants to open-source, publish or "clean up for contributors" a repository, or asks what a project is missing. Not for choosing a business licence strategy or writing legal advice.
metadata:
  display-name: Open-source ready
---

# Open-source ready

Make the repository easy to **understand, use, trust and contribute to**. Every file you add must be specific to this project: real commands that work, real directory names, real risks. A generic CONTRIBUTING.md copied from elsewhere is worse than none: it teaches contributors that the docs can't be trusted.

## 1. Audit what exists

Read before writing:
- **Files:** README, LICENSE and every community file: `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `SUPPORT`, `.github/ISSUE_TEMPLATE/*`, `PULL_REQUEST_TEMPLATE`, `dependabot.yml`, `CODEOWNERS`, `FUNDING.yml`, `.gitattributes`, `.editorconfig`.
- **How it builds:** package manifests, workflows, scripts, the test setup.
- **History:** `git log` for the commit style, and existing tags and releases.
- **Project type:** library, CLI, app, action, website or a mix, which decides the README sections and the security focus.

Run the documented setup and test commands yourself. Note every one that fails or is missing: fixing or documenting those comes first. Produce a short gap list (present / missing / wrong) and work through it. Keep what is good; edit rather than replace.

## 2. Licence (ask, don't decide)

- If there is no LICENSE, ask the owner. Offer **MIT** (simple, permissive), **Apache-2.0** (permissive plus a patent grant, the common choice for companies) or **GPL-3.0/AGPL-3.0** (copyleft). Add the canonical text with the right year and holder, and set the `license` field in the package manifest.
- **Third-party assets:** fonts, icons, models and vendored code need their own licences. Keep their notices (e.g. a `LICENSES.md` or `NOTICE`), and flag anything whose licence is unclear.

## 3. README

A visitor should know within one screen what it is, whether it is for them, and how to try it:
1. **Title and one-sentence purpose**, then badges that carry information: CI status, latest release, licence, package version or downloads, and a live demo link. No vanity badges.
2. **What it does / why**, with a screenshot or GIF for anything visual.
3. **Install and quick start:** copy-pasteable, tested commands, plus the minimum supported runtime versions.
4. **Usage / configuration reference**, or a link to the docs.
5. **Development:** a short summary that links to CONTRIBUTING.
6. **Contributing, Security, Licence** sections that link to their files.

For an animated, self-updating README, the `readme-studio` skill can design one; keep the real documentation as Markdown.

## 4. Community files

Start from `templates/` and rewrite every placeholder for the project.

- **`CONTRIBUTING.md`** (`templates/CONTRIBUTING.md`):
  - before you start: open an issue first for bugs and bigger changes; security problems go elsewhere;
  - setup with real prerequisites and commands;
  - a table of how the code fits together, using real directories;
  - the exact checks CI runs;
  - a walkthrough for the most common contribution (a new widget, rule, plugin, endpoint…);
  - style, commit convention (match the history; Conventional Commits if none) and pull request steps;
  - releases, and the licence line ("contributions are licensed under the same terms").
- **`CODE_OF_CONDUCT.md`**: Contributor Covenant 2.1, by link with a short summary, or the full text if the owner prefers. Reporting goes to a private channel that **actually exists**: ask for it. Never invent an email address.
- **`SECURITY.md`**:
  - private reporting through GitHub's **Security → Report a vulnerability** (the owner must enable it);
  - the supported versions;
  - a "what matters most" list written for this project: secrets and tokens, untrusted input it parses or renders, update and signing paths, privacy guarantees, permissions it requests.
- **`SUPPORT.md`**: where questions go (docs and FAQ, Discussions if enabled, issue forms) and an honest response expectation.
- **Issue forms** (`templates/ISSUE_TEMPLATE/`), YAML forms rather than Markdown templates:
  - a bug report that asks for exactly what you need to reproduce: where it happened, version, steps, config or logs;
  - a feature form, plus a form for the project's typical request (a new integration or widget);
  - `config.yml` with `blank_issues_enabled: false` and contact links to the docs/FAQ and private security reporting.
- **`.github/PULL_REQUEST_TEMPLATE.md`**: What changes, Why, How I checked it, and a checklist with the real check commands.
- **`.github/dependabot.yml`**: weekly, one **grouped** PR per ecosystem (npm, cargo, pip, github-actions, docker…). Add `ignore` entries with a reason comment for dependencies known to break.
- **`.github/CODEOWNERS`**: `* @owner`, so every pull request requests a review.
- **`.gitattributes`**: `* text=auto eol=lf`, `binary` for fonts, WASM and images, and `linguist-generated=true` for bundles, generated data and lockfile-like outputs. Diffs and language statistics stay honest.
- **`FUNDING.yml`**: only if the owner actually has GitHub Sponsors, Ko-fi or similar. Ask.

## 5. Automation and metadata

- **CI** runs on every pull request: install from the lockfile, typecheck/lint, test, build. If a release or deploy needs the same checks, make CI reusable (`workflow_call`). The `release-pipeline` skill sets up automatic pre-releases and manual full releases.
- **Committed build output** (e.g. a GitHub Action's `dist/`) needs a CI check that fails when it is stale.
- **Package metadata:** `description`, `keywords`, `homepage`, `repository`, `bugs`, `author`, `license` and `engines`. In Python and Rust manifests, the equivalent fields.
- **`.editorconfig`**, if formatting isn't already enforced.

## 6. Verify

- Every command in README and CONTRIBUTING runs as written from a fresh clone (`git clone` into a temp dir, follow the docs literally).
- All YAML parses (`actionlint` for workflows if available; issue forms are checked by GitHub when you open the new-issue page).
- Relative links in Markdown resolve: list them and check that the files and anchors exist.
- The test suite and build still pass.

## 7. What only the owner can do

End with this checklist for the user; you cannot do these from the repository:
- **About:** description, website and topics (5–10 relevant ones).
- **Settings → General:** enable **Discussions** if SUPPORT.md points there. Under **Social preview**, upload a 1280×640 image.
- **Settings → Code security:** enable **Private vulnerability reporting**, **Dependabot alerts** and security updates.
- **Settings → Branches / Rulesets:** require pull requests and status checks on `main`. Allow the release bot if a release workflow pushes to `main`.
- **Labels:** make sure `bug`, `enhancement` and the issue forms' other labels exist, plus `good first issue` and `help wanted` with a few starter issues.
- **First release:** cut a tagged release so the badges and install instructions have something to point at.
