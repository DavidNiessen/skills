import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument } from 'yaml';

export const titleCase = (value) => value.split(/[-_\s]+/).map(word => word ? word[0].toUpperCase() + word.slice(1) : '').join(' ');
export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export async function discoverSkills(root, repository) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Repository must be owner/name');
  const skills = [];
  const names = new Set();
  async function walk(directory, segments = []) {
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some(entry => entry.name === 'SKILL.md' && entry.isFile())) {
      if (segments.length < 1 || segments.length > 3) throw new Error(`Unsupported CLI discovery depth: ${directory}`);
      const source = (await readFile(path.join(directory, 'SKILL.md'), 'utf8')).replace(/^\uFEFF/, '');
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!match) throw new Error(`Missing YAML frontmatter: ${directory}`);
      const document = parseDocument(match[1], { uniqueKeys: true });
      if (document.errors.length) throw new Error(`Invalid YAML in ${directory}: ${document.errors[0].message}`);
      const data = document.toJS();
      if (!data || typeof data.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name)) throw new Error(`Invalid skill name: ${directory}`);
      if (typeof data.description !== 'string' || !data.description.trim()) throw new Error(`Missing description: ${directory}`);
      if (names.has(data.name)) throw new Error(`Duplicate skill name: ${data.name}`);
      names.add(data.name);
      if (data.metadata?.internal === true || data.metadata?.internal === 'true') return;
      const relativePath = ['skills', ...segments, 'SKILL.md'].join('/');
      const categoryPath = segments.slice(0, -1).join('/');
      skills.push({
        name: data.name,
        title: typeof data.metadata?.['display-name'] === 'string' && data.metadata['display-name'].trim() ? data.metadata['display-name'].trim() : titleCase(data.name),
        description: data.description.trim().replace(/\s+/g, ' '),
        category: categoryPath || 'general',
        categoryLabel: categoryPath ? categoryPath.split('/').map(part => part.length <= 3 ? part.toUpperCase() : titleCase(part)).join(' / ') : 'General',
        path: relativePath,
        sourceURL: `https://github.com/${repository}/blob/main/${relativePath.split('/').map(encodeURIComponent).join('/')}`,
        command: `npx skills add ${repository} --skill ${data.name}`
      });
      // The CLI stops descending after finding a skill. Match that behavior.
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) await walk(path.join(directory, entry.name), [...segments, entry.name]);
    }
  }
  await walk(root);
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}
