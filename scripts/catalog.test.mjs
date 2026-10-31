import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { discoverSkills, escapeHTML } from './catalog.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'skills-catalog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    async add(location, content) {
      const directory = path.join(root, location);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'SKILL.md'), content);
    }
  };
}
test('discovers nested categories and folded YAML without a manual manifest', async t => {
  const f = await fixture(t);
  await f.add('dj/repair', '---\nname: beat-repair\ndescription: >-\n  Check audio\n  and repair grids.\n---\n# Repair');
  await f.add('dev/frontend/audit', '---\nname: frontend-audit\ndescription: "Audit <interfaces> & layout"\nmetadata:\n  display-name: Frontend audit\n---\n');
  const skills = await discoverSkills(f.root, 'owner/repo');
  assert.equal(skills.length, 2);
  assert.equal(skills[0].description, 'Check audio and repair grids.');
  assert.equal(skills[0].categoryLabel, 'DJ');
  assert.equal(skills[0].command, 'npx skills add owner/repo --skill beat-repair');
  assert.equal(skills[1].path, 'skills/dev/frontend/audit/SKILL.md');
  assert.equal(skills[1].title, 'Frontend audit');
});
test('rejects duplicate names and invalid or missing metadata', async t => {
  const f = await fixture(t);
  await f.add('one', '---\nname: same\ndescription: First\n---\n');
  await f.add('two', '---\nname: same\ndescription: Second\n---\n');
  await assert.rejects(discoverSkills(f.root, 'owner/repo'), /Duplicate/);
  await f.add('two', '---\nname: other\n---\n');
  await assert.rejects(discoverSkills(f.root, 'owner/repo'), /Missing description/);
  await f.add('two', '---\nname: other\nname: duplicate-key\ndescription: Test\n---\n');
  await assert.rejects(discoverSkills(f.root, 'owner/repo'), /Invalid YAML/);
});
test('hides internal skills and follows CLI nesting and shadowing rules', async t => {
  const f = await fixture(t);
  await f.add('internal', '---\nname: hidden\ndescription: Hidden\nmetadata:\n  internal: true\n---\n');
  await f.add('parent', '---\nname: parent\ndescription: Public\n---\n');
  await f.add('parent/child', '---\nname: child\ndescription: Shadowed\n---\n');
  assert.deepEqual((await discoverSkills(f.root, 'owner/repo')).map(s => s.name), ['parent']);
  await f.add('a/b/c/d', '---\nname: too-deep\ndescription: Invalid\n---\n');
  await assert.rejects(discoverSkills(f.root, 'owner/repo'), /discovery depth/);
});
test('escapes metadata before embedding it in HTML and attributes', () => {
  assert.equal(escapeHTML('<script a="x">&\'</script>'), '&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;');
});
