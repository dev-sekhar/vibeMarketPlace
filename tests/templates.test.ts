import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TEMPLATES } from '../src/lib/templates.ts';
import { TEMPLATES as compatibilityTemplates } from '../src/data/templates.ts';
import { inspectSnapshot, type Snapshot } from '../server/repoValidator.ts';

const get = (id: string) => {
    const template = TEMPLATES.find(item => item.id === id);
    assert.ok(template, `Missing template: ${id}`);
    return template;
};
const sha = 'a'.repeat(40);
function snapshot(report: string, readme: string): Snapshot {
    return {
        repoUrl: 'https://github.com/example/focus', repositoryId: 1,
        commit: sha, license: 'MIT', readme, report,
        licenseText: get('license-mit').content,
        gitignore: get('gitignore-node').content,
        files: ['README.md', 'LICENSE', '.gitignore', 'TEST_REPORT.json', 'main.py'].map(path => ({ path, type: 'blob', mode: '100644', sha })),
    };
}

test('unfilled report cannot qualify as evidence; an honestly completed manual report can', () => {
    const report = get('test-report').content;
    const draft = inspectSnapshot(snapshot(report, get('readme-vibe-app').content));
    assert.equal(draft.pass, false);
    assert.ok(draft.errors.some(error => error.includes('testedCommit')));
    assert.ok(draft.errors.some(error => error.includes('passing functional test')));
    const filled = JSON.parse(report);
    filled.testedCommit = sha;
    filled.testedAt = '2026-09-13T09:00:00Z';
    filled.environment = 'Windows 11, Chrome, local app with disposable sample data.';
    filled.command = '1. Open the app. 2. Enter a 25-minute session. 3. Save. 4. Reload.';
    filled.results = [
        { name: 'Save a focus session', expected: 'The session remains visible after reloading.', actual: 'The 25-minute session was visible after reload.', status: 'passed' },
        { name: 'Offline session editing', expected: 'Offline changes persist after reconnection.', actual: 'Not checked because offline support is not implemented.', status: 'skipped' },
    ];
    filled.limitations = 'Checked session creation and reload only; offline support was not tested.';
    for (const template of TEMPLATES.filter(item => item.category === 'readme')) {
        // Fill all prompts as a submitter would; preserve the template headings.
        const readme = template.content.replace(/\[[^\]]+\]/g, 'Focus helps students save study sessions. Run the documented local script and save a session; offline editing is not supported.');
        const result = inspectSnapshot(snapshot(JSON.stringify(filled), readme), Date.parse('2026-09-13T10:00:00Z'));
        assert.equal(result.pass, true, `${template.id}: ${result.errors.join('; ')}`);
        assert.ok(result.warnings.some(warning => warning.includes('Failed/skipped')));
    }
});

test('license downloads include full terms rather than application notices alone', () => {
    const apache = get('license-apache').content;
    assert.ok(apache.includes('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION'));
    assert.ok(apache.includes('9. Accepting Warranty or Additional Liability.'));
    assert.ok(apache.length > 10000);
    const gpl = get('license-gpl3').content;
    assert.ok(gpl.includes('6. Conveying Non-Source Forms.'));
    assert.ok(gpl.includes('17. Interpretation of Sections 15 and 16.'));
    assert.ok(gpl.length > 30000);
});

test('browser configuration has no private credential assignments and both imports share one catalog', () => {
    assert.equal(compatibilityTemplates, TEMPLATES);
    const browser = get('env-supabase-react').content;
    assert.doesNotMatch(browser, /^\s*VITE_.*(?:OPENAI|ANTHROPIC|SERVICE_ROLE|SECRET).*=/mi);
    assert.match(browser, /VITE_SUPABASE_ANON_KEY=/);
    assert.ok(TEMPLATES.every(template => template.guidance.length > 20));
    assert.equal(new Set(TEMPLATES.map(template => template.id)).size, TEMPLATES.length);
    assert.equal(get('sharing-start-here').content, readFileSync(new URL('../docs/SHARING_GUIDE.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
});
