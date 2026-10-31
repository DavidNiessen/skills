# Skills

Reusable AI skills by [David Niessen](https://github.com/DavidNiessen).

**[Browse the collection →](https://davidniessen.github.io/skills/)**

## Install

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
  dj/
    lexicon-beatgrid-repair/
      SKILL.md
  # dev/<skill-name>/SKILL.md can be added later
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
4. Run `npm ci`, `npm test`, `npm run build`, and optionally `npx skills add . --list`.
5. Push to `main`. GitHub Actions rebuilds and deploys the catalog automatically.

No catalog entries need editing. The build reads every discoverable `SKILL.md`, validates YAML and unique names, and derives categories, descriptions, source links, counts, filters, and install commands. Optional `metadata.display-name` overrides the automatically formatted title. Internal skills (`metadata.internal: true`) are excluded from the public catalog, following the CLI's default discovery behavior; their files remain public in this repository.

## Website

A small static site with self-hosted Manrope typography, a dark glass install panel, accessible search, category filters, and clipboard controls. The full catalog is rendered into HTML, so content and installation instructions remain readable without JavaScript. Search and copy controls are progressive enhancements. No GitHub API token, runtime API calls, or manually maintained skill list is needed.

```sh
npm ci
npm run build
npm run preview
# http://localhost:4173
```

`dist/skills.json` provides the generated machine-readable catalog. The `GITHUB_REPOSITORY` environment variable supplies the repository identity in Actions. When reusing this project in a different repository, update the local fallback in `scripts/build.mjs` and README links. The workflow deploys pushes to `main`; pull requests run tests and a build without publishing.

For a fork or fresh repository, enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once. See [GitHub's Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## License

[MIT](LICENSE). Manrope is distributed under the [SIL Open Font License](https://github.com/sharanda/manrope/blob/master/OFL.txt); a copy is included with the deployed font.
