import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkills } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Claude Code marketplace lists every public skill under its top-level category', async () => {
  const marketplace = JSON.parse(await readFile(path.join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const skills = await discoverSkills(path.join(root, 'skills'), 'owner/repo');
  const expected = new Map();
  for (const skill of skills) {
    const segments = skill.path.split('/');
    const plugin = segments.length > 3 ? segments[1] : 'general';
    if (!expected.has(plugin)) expected.set(plugin, []);
    expected.get(plugin).push(`./${segments.slice(0, -1).join('/')}`);
  }
  const actual = new Map(marketplace.plugins.map(plugin => [plugin.name, [...plugin.skills].sort()]));
  for (const plugin of marketplace.plugins) {
    assert.equal(plugin.source, './', `${plugin.name} must use the repository root as its source`);
    assert.equal(plugin.strict, false, `${plugin.name} must set strict: false because it has no plugin.json`);
  }
  assert.deepEqual(
    Object.fromEntries([...actual].sort()),
    Object.fromEntries([...expected].map(([name, paths]) => [name, paths.sort()]).sort()),
    'Update .claude-plugin/marketplace.json: add new skills to their category plugin and remove deleted or internal ones'
  );
});
