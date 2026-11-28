# Skills

Reusable AI skills by [David Niessen](https://github.com/DavidNiessen).

**[Browse the collection →](https://davidniessen.github.io/skills/)**

## Install

### Claude Code plugin marketplace

Add the marketplace, then install the plugin for the category you want:

```text
/plugin marketplace add DavidNiessen/skills
/plugin install dev@davidniessen-skills
/plugin install dj@davidniessen-skills
```

On Claude Code 2.1.275 or later, one line does both:

```text
/plugin install dev --marketplace DavidNiessen/skills
```

| Plugin | Skills |
| --- | --- |
| `dev` | `name-finder`, `open-source-ready`, `readme-studio`, `release-pipeline` |
| `dj` | `lexicon-beatgrid-repair`, `lexicon-cuepoints`, `lexicon-library-cleanup` |

Plugin skills are namespaced, for example `/dev:release-pipeline`. Update with `/plugin marketplace update davidniessen-skills`. Plugins carry no fixed version, so every new commit on `main` is an update.

### skills CLI (any agent)

```sh
npx skills add DavidNiessen/skills
```

Choose the skills and agents in the installer. To install the Lexicon skill directly:

```sh
npx skills add DavidNiessen/skills --skill lexicon-beatgrid-repair
```

List available skills without installing:

```sh
npx skills add DavidNiessen/skills --list
```

Requires Node.js and npm. The [skills CLI documentation](https://github.com/vercel-labs/skills) covers supported agents, global installs, updates, and other options. Individual skills may have their own requirements; read their `SKILL.md` before use.

## Organization

```text
skills/
  dev/
    name-finder/
      SKILL.md
      scripts/
    open-source-ready/
      SKILL.md
      templates/
    readme-studio/
      SKILL.md
    release-pipeline/
      SKILL.md
      templates/
  dj/
    lexicon-beatgrid-repair/
      SKILL.md
```

The CLI supports category folders under `skills/`, up to three directory levels: `skills/<name>/`, `skills/<category>/<name>/`, or `skills/<category>/<subcategory>/<name>/`. Install by the frontmatter `name`, regardless of category. Do not place a `SKILL.md` at a category root: it would shadow its child skills.

## Adding a skill

1. Create `skills/<category>/<skill-name>/SKILL.md` (for example `skills/dev/code-review/SKILL.md`).
2. Add valid YAML frontmatter with a unique lowercase hyphenated `name` and a `description`:

   ```yaml
   ---
   name: your-skill-name
   description: What this skill does and when an agent should use it.
   ---
   ```

3. Write the skill's instructions below the frontmatter. Keep supporting scripts and references in the skill's folder.
4. Add the skill folder to its category's plugin in `.claude-plugin/marketplace.json` (`skills/dev/code-review` goes into the `dev` plugin's `skills` list). A new category needs a new plugin entry with `"source": "./"` and `"strict": false`. `npm test` fails when the manifest and the skills folder disagree.
5. Run `npm ci`, `npm test`, `npm run build`, and optionally `npx skills add . --list` and `claude plugin validate .`.
6. Push to `main`. GitHub Actions rebuilds and deploys the catalog automatically.

No website catalog entries need editing. The build reads every discoverable `SKILL.md`, validates YAML and unique names, and derives categories, descriptions, source links, counts, filters, and install commands. Optional `metadata.display-name` overrides the automatically formatted title. Internal skills (`metadata.internal: true`) are excluded from the public catalog, following the CLI's default discovery behavior; their files remain public in this repository.

## Website

A small static site with a colorful hand-drawn paper look in light and dark mode: self-hosted Kalam and Patrick Hand typography, a spiral-notebook install panel with Claude Code and skills CLI tabs, pastel skill cards, a pencil mascot, accessible search, category filters, and clipboard controls with confetti. The full catalog is rendered into HTML, so content and installation instructions remain readable without JavaScript. Search and copy controls are progressive enhancements. No GitHub API token, runtime API calls, or manually maintained skill list is needed.

```sh
npm ci
npm run build
npm run preview
# http://localhost:4173
```

`dist/skills.json` provides the generated machine-readable catalog, including each skill's Claude Code plugin and the marketplace's install commands. Plugin assignments come from `.claude-plugin/marketplace.json`, and the build fails if a public skill is missing from it. The `GITHUB_REPOSITORY` environment variable supplies the repository identity in Actions. When reusing this project in a different repository, update the local fallback in `scripts/build.mjs` and README links. The workflow deploys pushes to `main`; pull requests run tests and a build without publishing.

For a fork or fresh repository, enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## License

[MIT](LICENSE). Kalam and Patrick Hand are distributed under the SIL Open Font License; copies are included with the deployed fonts.
