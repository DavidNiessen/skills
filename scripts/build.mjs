import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { attachPlugins, discoverSkills, escapeHTML as e } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = process.env.GITHUB_REPOSITORY || 'DavidNiessen/skills';
const marketplace = JSON.parse(await readFile(path.join(root, '.claude-plugin/marketplace.json'), 'utf8'));
const skills = attachPlugins(await discoverSkills(path.join(root, 'skills'), repository), marketplace);
const repositoryURL = `https://github.com/${repository}`;
const command = `npx skills add ${repository}`;
const marketplaceCommand = `/plugin marketplace add ${repository}`;
const plugins = marketplace.plugins.map(plugin => ({ name: plugin.name, description: plugin.description, command: `/plugin install ${plugin.name}@${marketplace.name}`, skills: skills.filter(skill => skill.plugin === plugin.name).map(skill => skill.name) }));
const categories = [...new Map(skills.map(skill => [skill.category, skill.categoryLabel])).entries()];
const tones = new Map(categories.map(([value], index) => [value, index % 4]));
const rows = skills.map((skill, index) => `<article class="skill" data-reveal data-color="${index % 5}" data-tone="${tones.get(skill.category)}" data-name="${e(skill.name)}" data-category="${e(skill.category)}" data-search="${e([skill.name, skill.title, skill.description, skill.categoryLabel].join(' ').toLowerCase())}">
  <span class="tape" aria-hidden="true"></span>
  <div class="skill-heading"><span class="stamp">${e(skill.categoryLabel)}</span></div>
  <h3><a href="${e(skill.sourceURL)}">${titleWithArrow(skill.title)}</a></h3>
  <p>${e(skill.description)}</p>
  <details><summary>Install this skill <svg aria-hidden="true" viewBox="0 0 16 16"><path d="m3.5 6 4.5 4.5L12.5 6"/></svg></summary>
    <div class="details-body">
    <p class="install-label">Claude Code <span>· installs the ${e(pluginLabel(skill.plugin))} plugin, after adding the marketplace</span></p>
    <div class="skill-install"><code>${e(skill.claudeCommand)}</code><button class="icon-button" data-copy="${e(skill.claudeCommand)}" aria-label="Copy Claude Code install command for ${e(skill.title)}">${copyIcon()}</button></div>
    <p class="install-label">skills CLI</p>
    <div class="skill-install"><code>${e(skill.command)}</code><button class="icon-button" data-copy="${e(skill.command)}" aria-label="Copy skills CLI install command for ${e(skill.title)}">${copyIcon()}</button></div>
    <a class="text-link" href="${e(skill.sourceURL)}">Read SKILL.md <span aria-hidden="true">↗</span></a>
    </div>
  </details>
</article>`).join('\n');
function titleWithArrow(title) {
  const words = title.split(' ');
  const last = words.pop();
  return `${words.length ? e(words.join(' ')) + ' ' : ''}<span class="nowrap">${e(last)}<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></span>`;
}
function pluginLabel(name) { return categories.find(([value]) => value === name)?.[1] ?? name; }
function copyIcon() { return '<svg class="copy-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M9 8.5c3.6-.4 7.4-.3 11 .2.4 3.8.3 7.6-.2 11.4-3.7.3-7.4.4-11 0-.4-3.9-.3-7.8.2-11.6Z"/><path d="M15.5 5.5c0-.6-.1-1.2-.3-1.7-3.5-.3-7-.2-10.6.2-.4 3.6-.4 7.2 0 10.8.6.2 1.3.3 2 .3"/></svg><svg class="check-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M4.5 12.5c2 1.6 3.6 3.5 5 5.5 3-5.3 6.3-9.7 10-13"/></svg>'; }
const replacements = {
  REPOSITORY: e(repository), REPOSITORY_URL: e(repositoryURL), OWNER: e(repository.split('/')[0]),
  COMMAND: e(command), COUNT: String(skills.length), SKILL_WORD: skills.length === 1 ? 'skill' : 'skills',
  SKILLS: rows,
  FILTERS: categories.map(([value, label]) => `<button type="button" class="filter" data-tone="${tones.get(value)}" data-category-filter="${e(value)}" aria-pressed="false">${e(label)}</button>`).join(''),
  MARKETPLACE_COMMAND: e(marketplaceCommand),
  PLUGIN_COMMANDS: plugins.map(plugin => `<div class="command-line"><span aria-hidden="true" class="prompt">&gt;</span><code>${e(plugin.command)}</code><button class="icon-button" data-copy="${e(plugin.command)}" aria-label="Copy command that installs the ${e(pluginLabel(plugin.name))} plugin">${copyIcon()}</button></div>`).join('\n          '),
  COPY_ICON: copyIcon()
};
let html = await readFile(path.join(root, 'site/index.html'), 'utf8');
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => { if (!(key in replacements)) throw new Error(`Unknown token ${key}`); return replacements[key]; });
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'fonts'), { recursive: true });
await cp(path.join(root, 'site'), dist, { recursive: true });
const fonts = [['kalam', 'kalam-latin-400-normal.woff2', 'kalam-400.woff2'], ['kalam', 'kalam-latin-700-normal.woff2', 'kalam-700.woff2'], ['patrick-hand', 'patrick-hand-latin-400-normal.woff2', 'patrick-hand-400.woff2']];
for (const [family, file, target] of fonts) await cp(path.join(root, 'node_modules/@fontsource', family, 'files', file), path.join(dist, 'fonts', target));
for (const family of new Set(fonts.map(([family]) => family))) await cp(path.join(root, 'node_modules/@fontsource', family, 'LICENSE'), path.join(dist, 'fonts', `${family}-OFL.txt`));
await writeFile(path.join(dist, 'index.html'), html);
await writeFile(path.join(dist, 'skills.json'), JSON.stringify({ repository, marketplace: { name: marketplace.name, command: marketplaceCommand, plugins }, skills }, null, 2) + '\n');
await writeFile(path.join(dist, '.nojekyll'), '');
console.log(`Built ${skills.length} skills in ${categories.length} categories → dist/`);
