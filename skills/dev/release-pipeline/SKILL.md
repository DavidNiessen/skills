---
name: release-pipeline
description: Set up a GitHub Actions release pipeline with two lanes. Every push to main publishes an automatic pre-release (next patch plus run number, e.g. 1.4.1-57) after CI passes. Full releases only happen through a manual workflow run that bumps the version, tags it, publishes the release and brings main up to it. Covers build artifacts, floating major tags for GitHub Actions and Pages deploys tied to releases. Use when a repository needs versioned releases, pre-releases from main or a manual "cut a release" button. Not for npm/crates publishing setups that use changesets or release-please.
metadata:
  display-name: Release pipeline
---

# Release pipeline

Two lanes, both on GitHub Actions and the `gh` CLI, with no third-party release bots:

| Lane | Trigger | Version | Moves "latest"? | Moves floating tags? |
|---|---|---|---|---|
| **Pre-release** | every push to `main` (code paths only) | next patch + run number: `1.4.1-57` | no | never |
| **Release** | manual: Actions → Release → Run workflow | bump `patch`/`minor`/`major`, or an exact `x.y.z` | yes | yes (e.g. `v1` for an action) |

Both lanes run the same CI first, by calling it as a reusable workflow. A release never publishes code that CI did not pass on.

## Before writing anything, establish

Read the repository: workflows, package manifests, existing tags and releases (`gh release list`), branch protection, and how it is built and deployed. Then decide:

1. **Where the version lives.** Every file that records it: `package.json` + `package-lock.json` (root entries), `Cargo.toml` + `Cargo.lock`, `pyproject.toml`, `tauri.conf.json`, a `VERSION` file. One `scripts/set-version.mjs` updates all of them; both lanes call it.
2. **What a release ships.** Choose one:
   - **Nothing built:** a library or action consumed from the tag, or source-only.
   - **Built artifacts:** binaries or installers per OS, uploaded to the release.
   - **Published to a registry:** npm, crates.io, PyPI, a container registry.
3. **Consumers that pin a moving tag.** A GitHub Action is referenced as `owner/repo@v1`, so a full release must move `v1`, and pre-releases must never touch it.
4. **Website coupling.** Does the site deploy on every push (leave it), or only from releases (move the deploy into the release workflow)?
5. **Branch protection on `main`.** The release workflow pushes the version commit to `main` with `GITHUB_TOKEN`. If rules block that, use a GitHub App token or a ruleset bypass for `github-actions[bot]`, or skip bringing `main` up and keep the version on tags only. Say which one you chose.

Pre-release versions use a **numeric** suffix (`1.4.1-57`, not `1.4.1-pre.57`): it is valid semver, sorts correctly, and Windows MSI installers reject non-numeric pre-release identifiers.

## Build it

Start from the templates in `templates/` and adapt names, build steps and version files. Don't paste them blind.

1. **CI becomes reusable.** Add `workflow_call:` to the CI triggers (keep `pull_request`; add `workflow_dispatch`). Name the concurrency group after the *calling* workflow:
   `group: ci-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}`.
   With a fixed group, a release calling CI can cancel itself or another run's CI. Give CI `permissions: contents: read`; a called workflow can only narrow permissions.
   - Drop CI's own `push: main` trigger: the pre-release lane runs CI on every push to `main`.
2. **`scripts/set-version.mjs`** (`templates/set-version.mjs`): validate `^\d+\.\d+\.\d+(-\d+)?$`, rewrite every version file found in step 1, exit non-zero on anything unexpected (e.g. no version line found in `Cargo.toml`).
3. **`.github/workflows/prerelease.yml`** (`templates/prerelease.yml`):
   - triggers on `push: branches: [main]` with `paths-ignore` for docs, plus `workflow_dispatch`;
   - runs `checks` (the reusable CI), then picks the version: read the current base version, patch + 1, `-${GITHUB_RUN_NUMBER}`;
   - builds (if anything ships) and publishes with `gh release create v$VERSION --prerelease --target $GITHUB_SHA --generate-notes`;
   - a `tidy` job keeps only the newest N pre-releases (`gh release delete --yes --cleanup-tag`);
   - `concurrency: { group: prerelease, cancel-in-progress: true }`: only the newest push matters.
4. **`.github/workflows/release.yml`** (`templates/release.yml`):
   - `workflow_dispatch` with `bump` (choice: patch/minor/major, default minor) and an optional exact `version`;
   - `checks` only on `main` (`if: github.ref == 'refs/heads/main'`);
   - **prepare:** compute and validate the version (`x.y.z`, tag must not exist), run `set-version`, commit `chore(release): vX.Y.Z [skip ci]`, tag, push **only the tag**;
   - **without build artifacts:** `gh release create vX.Y.Z --verify-tag --generate-notes --latest`;
   - **with build artifacts:** create the release as `--draft` in prepare, upload builds to that draft from a matrix job that checks out the tag, then publish with `gh release edit --draft=false --latest`;
   - **publish:** check out `main` with `fetch-depth: 0`, `git merge --ff-only vX.Y.Z || git merge --no-ff …`, push `main`; move floating tags here (`git tag -fa v1 -m … vX.Y.Z^{commit}` + `git push --force origin refs/tags/v1`);
   - **cleanup (artifacts only):** `if: always() && needs.prepare.result == 'success' && needs.build.result != 'success'` → `gh release delete vX.Y.Z --yes --cleanup-tag`. `failure()` alone misses cancelled builds;
   - `concurrency: { group: release, cancel-in-progress: false }`: never cancel a half-done release.
5. **Remove what conflicts:** an old "move the major tag on release published" workflow, CI's push trigger, any job that tags or bumps elsewhere.
6. **Document it** in the README's release section: how to cut a release, what pre-releases are for, and how to pin one (`owner/repo@v1.4.1-57` for actions).

### Why the version goes to the tag first

The version commit lands on a tag, and only reaches `main` after every build has passed. If a build fails, the cleanup job deletes the draft release and its tag, `main` keeps its version, and re-running produces the same version. If `main` moved meanwhile and the fast-forward fails, the job falls back to a merge commit. If that conflicts (someone else edited the version lines), fix `main` and use **Re-run failed jobs**: the tag and builds are kept.

`[skip ci]` in the version commit stops the push to `main` from triggering another pre-release. Pushes made with `GITHUB_TOKEN` don't trigger workflows anyway, but the marker also protects setups that use an App token.

### Pages deployed only from releases (optional)

Move the deploy into `release.yml` as a job after `publish`, with `permissions: pages: write, id-token: write` and `environment: github-pages`. Two gotchas:
- Name the artifact `github-pages-${{ github.run_attempt }}` (and pass `artifact_name` to `deploy-pages`), or **Re-run failed jobs** fails with two artifacts of the same name.
- `deploy-pages` can ask for the artifact before GitHub lists it. Deploy with `continue-on-error: true`, then `sleep 30` and deploy once more if it failed.

The `github-pages` environment only allows the default branch at the time Pages was enabled. If the default branch changed since, add `main` under **Settings → Environments → github-pages**, or the deploy job fails within seconds without logs.

## Verify

- Lint every workflow (`actionlint` if available, at least a YAML parse), and run `set-version.mjs` with a valid and an invalid version, then restore the files.
- **Before merging:** CI must be green on the pull request. The new workflows only exist for `push`/`workflow_dispatch` once they are on `main`.
- **After merging:**
  - check the first pre-release run and `gh release list` (a `vX.Y.(Z+1)-N` pre-release, `isPrerelease: true`, not latest);
  - recommend cutting the first full release with an **exact** version (`1.0.0`) rather than a bump, since the current `package.json` version may never have been released.
- Never test the release lane by running it on `main` without the user's go-ahead: it creates a public release and pushes to `main`.
