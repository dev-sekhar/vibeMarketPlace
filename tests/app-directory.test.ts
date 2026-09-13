import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterApps } from '../src/lib/appDirectory';
import type { VibeApp } from '../src/types/app';
const fixture = (id: string, changes: Partial<VibeApp> = {}): VibeApp => ({
  id, name: id, author_id: '', slug: id, shortDescription: 'A useful project', longDescription: '', thumbnail: '',
  category: 'Developer Tool', tags: ['automation'], techStack: ['Python'], author: { name: 'Sam', avatarInitials: 'S', avatarColor: '' },
  upvotes: 0, demoUrl: '', repoUrl: '', featured: false, createdAt: '2026-09-01T00:00:00Z', ...changes,
});
test('directory combines filters and finds creators, tags, and technologies case-insensitively', () => {
  const apps = [fixture('one', { projectStatus: 'usable', demoUrl: 'https://example.com' }), fixture('two'), fixture('three', { category: 'Game', projectStatus: 'usable' })];
  const params = new URLSearchParams('status=usable&demo=yes');
  for (const term of [' PYTHON ', 'sam', 'AUTOMATION']) assert.deepEqual(filterApps(apps, term, 'Developer Tool', true, params).map(a => a.id), ['one']);
  assert.deepEqual(filterApps(apps, '', null, true, new URLSearchParams('status=unspecified')).map(a => a.id), ['two']);
  assert.equal(filterApps(apps, 'missing', null, true, new URLSearchParams()).length, 0);
});
test('directory sorting is deterministic and does not mutate loaded data; home stays newest first', () => {
  const apps = [fixture('alpha', { upvotes: 10 }), fixture('beta', { createdAt: '2026-09-12T00:00:00Z' })];
  assert.deepEqual(filterApps(apps, '', null, true, new URLSearchParams('sort=votes')).map(a => a.id), ['alpha', 'beta']);
  assert.deepEqual(filterApps(apps, '', null, true, new URLSearchParams('sort=name')).map(a => a.id), ['alpha', 'beta']);
  assert.deepEqual(filterApps(apps, '', null, false, new URLSearchParams('sort=votes')).map(a => a.id), ['beta', 'alpha']);
  assert.deepEqual(apps.map(a => a.id), ['alpha', 'beta']);
});
