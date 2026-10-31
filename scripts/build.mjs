import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills, escapeHTML as e } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = process.env.GITHUB_REPOSITORY || 'DavidNiessen/skills';
const skills = await discoverSkills(path.join(root, 'skills'), repository);
const repositoryURL = `https://github.com/${repository}`;
const command = `npx skills add ${repository}`;
const categories = [...new Map(skills.map(skill => [skill.category, skill.categoryLabel])).entries()];
const rows = skills.map(skill => `<article class="skill" data-name="${e(skill.name)}" data-category="${e(skill.category)}" data-search="${e([skill.name, skill.title, skill.description, skill.categoryLabel].join(' ').toLowerCase())}">
  <div class="skill-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/></svg></div>
  <div class="skill-body"><div class="skill-heading"><h3><a href="${e(skill.sourceURL)}">${e(skill.title)}</a></h3><span class="category-tag">${e(skill.categoryLabel)}</span></div>
  <p>${e(skill.description)}</p>
  <details><summary>Install this skill <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></summary>
    <div class="skill-install"><code>${e(skill.command)}</code><button class="icon-button" data-copy="${e(skill.command)}" aria-label="Copy install command for ${e(skill.title)}">${copyIcon()}</button></div>
    <a class="text-link" href="${e(skill.sourceURL)}">Read SKILL.md <span aria-hidden="true">↗</span></a>
  </details></div>
  <a class="source-link" href="${e(skill.sourceURL)}" aria-label="View ${e(skill.title)} on GitHub"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M7 7h10v10"/></svg></a>
</article>`).join('\n');
function copyIcon() { return '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'; }
const replacements = {
  REPOSITORY: e(repository), REPOSITORY_URL: e(repositoryURL), OWNER: e(repository.split('/')[0]),
  COMMAND: e(command), COUNT: String(skills.length), SKILL_WORD: skills.length === 1 ? 'skill' : 'skills',
  SKILLS: rows,
  FILTERS: categories.map(([value, label]) => `<button type="button" class="filter" data-category-filter="${e(value)}" aria-pressed="false">${e(label)}</button>`).join(''),
  COPY_ICON: copyIcon()
};
let html = await readFile(path.join(root, 'site/index.html'), 'utf8');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => { if (!(key in replacements)) throw new Error(`Unknown token ${key}`); return replacements[key]; });
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'fonts'), { recursive: true });
await cp(path.join(root, 'site'), dist, { recursive: true });
await cp(path.join(root, 'node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'), path.join(dist, 'fonts/manrope-latin.woff2'));
await cp(path.join(root, 'node_modules/@fontsource-variable/manrope/LICENSE'), path.join(dist, 'fonts/OFL.txt'));
await writeFile(path.join(dist, 'index.html'), html);
await writeFile(path.join(dist, 'skills.json'), JSON.stringify({ repository, skills }, null, 2) + '\n');
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built ${skills.length} skills in ${categories.length} categories → dist/`);
