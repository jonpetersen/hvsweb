// Parses .github/workflows/deploy.yml as plain text (no YAML dependency —
// see CLAUDE.md) and checks the deploy job cannot run without the test job
// having passed first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = path.join(here, '..', '.github', 'workflows', 'deploy.yml');
const workflow = readFileSync(workflowPath, 'utf8');

/**
 * Extract the text of one top-level job block from the workflow YAML by
 * name, e.g. "deploy:" up to (but not including) the next job at the same
 * two-space indent, or end of file.
 * @param {string} yaml
 * @param {string} jobName
 * @returns {string}
 */
function getJobBlock(yaml, jobName) {
  const lines = yaml.split('\n');
  const jobsIndex = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  assert.ok(jobsIndex !== -1, 'workflow has a top-level jobs: key');

  const startIndex = lines.findIndex(
    (l, i) => i > jobsIndex && new RegExp(`^  ${jobName}:\\s*$`).test(l)
  );
  assert.ok(startIndex !== -1, `workflow defines a "${jobName}" job`);

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^  [A-Za-z0-9_-]+:\s*$/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join('\n');
}

test('the workflow defines a job named "test" that runs npm test', () => {
  const testJob = getJobBlock(workflow, 'test');
  assert.match(testJob, /run:\s*npm test\b/);
});

test('the deploy job declares needs: on the test job', () => {
  const deployJob = getJobBlock(workflow, 'deploy');
  assert.match(
    deployJob,
    /needs:\s*(\[?\s*test\s*\]?|\n(\s*-\s*test\s*\n?)+)/,
    'deploy job should have a needs: dependency on the test job'
  );
});

test('the deploy job is restricted to main and not pull_request events', () => {
  const deployJob = getJobBlock(workflow, 'deploy');
  assert.match(deployJob, /if:.*pull_request/s);
  assert.match(deployJob, /if:.*main/s);
});

test('the workflow triggers on push to main, pull_request, and workflow_dispatch', () => {
  assert.match(workflow, /on:/);
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\[main\]/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /workflow_dispatch:/);
});
