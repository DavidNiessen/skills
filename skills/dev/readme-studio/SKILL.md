---
name: readme-studio
description: Design and set up an animated, self-updating GitHub README with Readme Studio. Covers profile READMEs (the <login>/<login> repository) and project READMEs (any public repository with stars, contributors, releases, install steps). Writes readme.config.json and the GitHub Actions workflow, validates and renders the design offline, and gives the user a link to fine-tune it in the visual studio. Use when someone wants a profile README, a better-looking or always-current project README, animated stats or badges, or to edit an existing readme.config.json. Not for plain static Markdown READMEs.
metadata:
  display-name: Readme Studio
---

# Readme Studio

[Readme Studio](https://readme.niessen.dev) turns one `readme.config.json` into a README made of animated SVG widgets. A GitHub Action (`DavidNiessen/readme-studio@v1`) re-renders the images on a schedule, pushes them to an asset branch and rewrites `README.md`. You produce the config, check it, and hand over a link the user can open in the studio.

The source of truth for widgets, options, presets and the config format is the tool itself, not this file: read `https://readme.niessen.dev/llms.txt` (or `llms-full.txt` for every option) and query the CLI. Options change between versions.

## Get the CLI

The bundle is self-contained (widgets, fonts, GIF rasteriser), so nothing needs installing:

```bash
git clone --depth 1 https://github.com/DavidNiessen/readme-studio ~/.cache/readme-studio 2>/dev/null || git -C ~/.cache/readme-studio pull --ff-only
rs() { node ~/.cache/readme-studio/packages/engine/dist/cli.mjs "$@"; }
rs --help
```

Needs Node.js 20+. Use `--json` on `widgets`, `presets`, `themes` and `validate` for machine-readable output.

## 1. Profile or project?

- **Profile README:** the repository is named exactly like the owner's login (`mona/mona`), or the user asks for "my GitHub profile". Use `--kind profile` and `--login`.
- **Project README:** any other public repository. Use `--repo owner/name`. Project widgets read that repository (stars, contributors, commit activity, releases, milestones, CI, package downloads). Private repositories are not supported.

## 2. Gather the facts first

Don't invent personal details. Collect them from the repository, the user's GitHub profile and the existing README, and ask only for what is missing and wanted.

- **Profile:** display name, a few role/tagline lines, bio, company, city and IANA time zone (only if the user is happy to show them), links (GitHub, website, LinkedIn, Mastodon/Bluesky…).
- **Project:**
  - tagline: the repository description;
  - homepage;
  - package names from `package.json` (npm), `pyproject.toml` (PyPI) and `Cargo.toml` (crates.io), so install commands and download counts are real;
  - a logo icon id if one fits (`rs widgets --type project-hero` shows the option; icon ids are brand names such as `rust`, `typescript`, `docker`).
- **Existing README content:** for projects, keep the real documentation (install, usage, API, contributing) as `markdown` blocks. The visual widgets frame the docs, they do not replace them.

## 3. Start from a preset

```bash
rs presets --json --kind project      # or --kind profile
rs init --repo owner/name --npm <pkg> --preset <id> --workflow     # project
rs init --login <login> --preset <id> --workflow                   # profile
```

`init` writes `readme.config.json` and `.github/workflows/readme.yml` in the current directory (refuses to overwrite without `--force`). Pick the preset by the repository's character:
- **Projects:** a published library (`oss-library`), a CLI (`cli-tool`), a Python package (`python-package`), a product or app (`product-launch`), a quiet project (`minimal-oss`), or a maintainer's overview (`maintainers-dashboard`).
- **Profiles:** a data-heavy look (`command-center`, `data-nerd`), something calm (`minimal-paper`, `nordic`), a portfolio (`portfolio`) or a writer's profile (`writer`).

Check the generated workflow's `concurrency` block before committing it.
- **The problem:** the template (through v1.2.0) puts every run in one group, `readme-studio`, with `cancel-in-progress: true`. The workflow also runs on pushes to any branch. So a push to another branch (a pull request, Dependabot) cancels the run on the default branch, and the README is never published.
- **The fix:** scope the group per ref with `group: readme-studio-${{ github.ref }}`, and keep `cancel-in-progress: true`.

## 4. Tailor the config

Edit `readme.config.json` directly. The essentials:

- **`layout`**:
  - Layout is rows of `{ align, blocks: [{ id, type, options }] }`, and blocks in one row sit side by side.
  - Pair half-width widgets (`width: "half"` in `rs widgets --json`). Never put a full-width widget beside another one.
  - `id` becomes the image file name: keep it stable, lowercase and hyphenated.
- **Options:** look them up with `rs widgets --type <type>`. It gives every option's type, default and allowed values; omitted options take the default.
- **Remove widgets that would be empty**:
  - downloads without a published package;
  - roadmap without milestones (or switch it to a manual list);
  - posts without a feed;
  - releases/changelog without releases;
  - weather/time widgets when the user doesn't want their location shown.
- **Markdown blocks** (`type: "markdown"`, option `text`) hold real prose. They stay searchable and copyable. Add a `toc` block when there are several sections, and make its entries match the markdown headings.
- **`theme`**:
  - `preset` sets the palette (`rs themes`). Or set `accent` to generate a palette from one colour.
  - `font` / `headingFont` take font ids.
  - `motion: "subtle"` suits serious projects.
- **Free text** accepts placeholders such as `{name}`, `{project}`, `{npm}` and `{version}`. The full list is in llms.txt.
- **`output.branch`** (default `output`) is **force-pushed** as an orphan branch. Check that the branch does not already exist with other content: `git ls-remote --heads origin output`. If it does, pick another name.

## 5. Check it

```bash
rs validate --json          # exit 2 + "warnings" when something was repaired: fix the cause, re-run until valid
rs build --mock --out /tmp/readme-preview
```

`build --mock` renders every image and the README with sample data, offline. It also writes `preview.html` (open it, or screenshot it if you can drive a browser) and reports each file's size. Any `could not be rendered` card or error means a bad option. With network access and `GITHUB_TOKEN` set, a build without `--mock` uses the real numbers.

## 6. Hand it over

1. **Studio link:** run `rs link` and give the user the URL. It opens the design in the visual studio, where they can move widgets, change the theme and export again. Once the config is committed, `https://readme.niessen.dev/#/studio?repo=owner/name` opens it too.
2. **Files to commit:** `readme.config.json` and `.github/workflows/readme.yml`, plus the README:
   - **Profile repositories:** `rs build --mock --out /tmp/rs --readme README.md` writes a README that references the asset branch. Links that depend on data (pinned project cards) point at sample repositories until the first workflow run rewrites the README with real data, and the images appear with that run.
   - **Project repositories:** replacing `README.md` replaces the docs a project lives by. Show the user the diff and get a yes first. Alternatively, let the first workflow run write the README.
   - **Formatter checks:** the bot rewrites `README.md`, and the studio re-exports `readme.config.json`. If CI checks formatting (Prettier, dprint, markdownlint…), add both files to its ignore file (`.prettierignore`…), or the first bot commit fails the check. Format the workflow file like the rest of the repository.
3. **Branch and PR:** commit on a branch and open a pull request unless told otherwise. Only the default branch publishes. Pushes to other branches and pull requests render only, so the live README keeps its images until the merge.
4. **Tell the user what only they can do:**
   - **Settings → Actions → General → Workflow permissions → Read and write permissions.** Without it, the push to the asset branch fails with 403.
   - Run the **readme** workflow once from the Actions tab after merging.
   - Optionally add a `PROFILE_TOKEN` repository secret (a fine-grained, read-only personal access token) for private contribution counts.
   - **Branch protection on the default branch** blocks the bot's README commit. Allow `github-actions[bot]`, or set `commit-readme: false` and commit README changes by hand.

## Editing an existing design

If `readme.config.json` exists:
1. Run `rs validate --json` to see its current state.
2. Edit the config, then run validate and `build --mock` again.
3. Commit. The workflow re-renders on push, because it watches the config file.

Never edit the generated `README.md` by hand: the next run overwrites it.

## Troubleshooting

- **Broken images on GitHub:** the workflow hasn't run yet, or failed. Check the Actions tab and the job summary.
- **Runs on the default branch end as "cancelled" and the README never changes:** the workflow's concurrency group is shared across branches. Scope it per ref (see step 3), then run the workflow once on the default branch.
- **Images don't update:** GitHub's image proxy caches for a few minutes. The schedule also stops after 60 days without repository activity; re-enable it in the Actions tab.
- **Numbers look off without a token:** the public calendar and REST API are used, so some totals (private contributions, exact PR counts) need `PROFILE_TOKEN`.
- **Docs and FAQ:** https://readme.niessen.dev/#/docs
