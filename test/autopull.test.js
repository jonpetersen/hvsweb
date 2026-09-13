// autopull.test.js — exercises scripts/autopull.sh against REAL temporary
// git repos (a bare "origin", a "clone" under test, and an "other" clone
// used to push new commits from), per house rule: test sync pipelines
// against real repos, not mocks.
//
// Run with: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(new URL('../scripts/autopull.sh', import.meta.url));

// A global git config file every test points GIT_CONFIG_GLOBAL at, so tests
// never read or depend on the real developer's ~/.gitconfig, and so commits
// work in CI without any prior git identity setup.
function makeGlobalGitConfig(dir) {
  const configPath = path.join(dir, '.gitconfig');
  fs.writeFileSync(
    configPath,
    '[user]\n\tname = Autopull Test\n\temail = autopull-test@example.com\n[init]\n\tdefaultBranch = main\n'
  );
  return configPath;
}

function baseEnv(tmpRoot) {
  return {
    ...process.env,
    HOME: tmpRoot,
    GIT_CONFIG_GLOBAL: makeGlobalGitConfig(tmpRoot),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Autopull Test',
    GIT_AUTHOR_EMAIL: 'autopull-test@example.com',
    GIT_COMMITTER_NAME: 'Autopull Test',
    GIT_COMMITTER_EMAIL: 'autopull-test@example.com',
  };
}

function git(cwd, args, env) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
}

function headSha(repo, env) {
  return git(repo, ['rev-parse', 'HEAD'], env);
}

function currentBranch(repo, env) {
  return git(repo, ['rev-parse', '--abbrev-ref', 'HEAD'], env);
}

// Sets up a bare "origin", a "clone" (the checkout the script operates on),
// and an "other" clone used to push new commits to origin independently of
// the clone under test. Returns paths plus the shared env.
function setupRepos(tmpRoot, env) {
  const originDir = path.join(tmpRoot, 'origin.git');
  const cloneDir = path.join(tmpRoot, 'clone');
  const otherDir = path.join(tmpRoot, 'other');
  const seedDir = path.join(tmpRoot, 'seed');

  fs.mkdirSync(originDir, { recursive: true });
  execFileSync('git', ['init', '--bare', '-b', 'main', originDir], { env });

  fs.mkdirSync(seedDir, { recursive: true });
  execFileSync('git', ['init', '-b', 'main', seedDir], { env });
  fs.writeFileSync(path.join(seedDir, 'README.md'), 'hello\n');
  git(seedDir, ['add', '.'], env);
  git(seedDir, ['commit', '-m', 'initial'], env);
  git(seedDir, ['remote', 'add', 'origin', originDir], env);
  git(seedDir, ['push', 'origin', 'main'], env);

  execFileSync('git', ['clone', '-q', originDir, cloneDir], { env });
  execFileSync('git', ['clone', '-q', originDir, otherDir], { env });

  return { originDir, cloneDir, otherDir, seedDir };
}

// Pushes a new commit to origin's main via the "other" clone, independent
// of the clone under test.
function pushNewCommitViaOther(otherDir, env, filename = 'other.txt', message = 'new commit from other') {
  git(otherDir, ['fetch', '-q', 'origin'], env);
  git(otherDir, ['checkout', '-q', 'main'], env);
  git(otherDir, ['reset', '-q', '--hard', 'origin/main'], env);
  fs.writeFileSync(path.join(otherDir, filename), `${message}\n`);
  git(otherDir, ['add', '.'], env);
  git(otherDir, ['commit', '-q', '-m', message], env);
  git(otherDir, ['push', '-q', 'origin', 'main'], env);
  return headSha(otherDir, env);
}

function runScript({ repo, home, logFile, branch, env }) {
  const scriptEnv = {
    ...env,
    HOME: home,
    HVSWEB_REPO: repo,
    HVSWEB_AUTOPULL_LOG: logFile,
  };
  if (branch) scriptEnv.HVSWEB_BRANCH = branch;
  try {
    const stdout = execFileSync('bash', [scriptPath], { env: scriptEnv, encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status, stdout: err.stdout, stderr: err.stderr };
  }
}

function readLog(logFile) {
  return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
}

function withTmp(fn) {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'autopull-test-'));
  try {
    return fn(tmpRoot);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

test('origin has a new commit: clone fast-forwards and logs pulled', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir, otherDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');
    const before = headSha(cloneDir, env);

    const newSha = pushNewCommitViaOther(otherDir, env);
    assert.notEqual(newSha, before);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, newSha);
    assert.notEqual(after, before);

    const log = readLog(logFile);
    assert.match(log, /pulled/);
    assert.match(log, new RegExp(before.slice(0, 7)));
    assert.match(log, new RegExp(after.slice(0, 7)));
  });
});

test('up to date: no change, exit 0, quiet log', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');
    const before = headSha(cloneDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, before);

    const log = readLog(logFile);
    assert.doesNotMatch(log, /pulled/);
  });
});

test('dirty tracked file: not pulled, log says skipped, file untouched', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir, otherDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');
    const before = headSha(cloneDir, env);

    // Dirty a tracked file in the clone.
    const readmePath = path.join(cloneDir, 'README.md');
    fs.writeFileSync(readmePath, 'locally modified\n');

    pushNewCommitViaOther(otherDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, before);
    assert.equal(fs.readFileSync(readmePath, 'utf8'), 'locally modified\n');

    const log = readLog(logFile);
    assert.match(log, /uncommitted|dirty|skip/i);
  });
});

test('untracked file only: still pulls', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir, otherDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');
    const before = headSha(cloneDir, env);

    const scratchPath = path.join(cloneDir, 'scratch.txt');
    fs.writeFileSync(scratchPath, 'untracked scratch\n');

    const newSha = pushNewCommitViaOther(otherDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, newSha);
    assert.notEqual(after, before);
    // Untracked file must survive the pull untouched.
    assert.equal(fs.readFileSync(scratchPath, 'utf8'), 'untracked scratch\n');

    const log = readLog(logFile);
    assert.match(log, /pulled/);
  });
});

test('local unpushed commit: untouched, log says ahead', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');

    fs.writeFileSync(path.join(cloneDir, 'local-only.txt'), 'local commit\n');
    git(cloneDir, ['add', '.'], env);
    git(cloneDir, ['commit', '-q', '-m', 'local unpushed commit'], env);
    const before = headSha(cloneDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, before);

    const log = readLog(logFile);
    assert.match(log, /ahead/i);
  });
});

test('diverged: HEAD unchanged, log says DIVERGED', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir, otherDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');

    // Local unpushed commit in the clone.
    fs.writeFileSync(path.join(cloneDir, 'local-only.txt'), 'local divergent commit\n');
    git(cloneDir, ['add', '.'], env);
    git(cloneDir, ['commit', '-q', '-m', 'local divergent commit'], env);
    const before = headSha(cloneDir, env);

    // Meanwhile origin moves on via other.
    pushNewCommitViaOther(otherDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, before);

    const log = readLog(logFile);
    assert.match(log, /DIVERGED/);
  });
});

test('on another branch: skipped', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir, otherDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');

    git(cloneDir, ['checkout', '-q', '-b', 'feature'], env);
    const before = headSha(cloneDir, env);
    assert.equal(currentBranch(cloneDir, env), 'feature');

    pushNewCommitViaOther(otherDir, env);

    const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const after = headSha(cloneDir, env);
    assert.equal(after, before);
    assert.equal(currentBranch(cloneDir, env), 'feature');

    const log = readLog(logFile);
    assert.match(log, /feature/);
  });
});

test('index.lock present: skipped', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const { cloneDir } = setupRepos(tmpRoot, env);
    const logFile = path.join(tmpRoot, 'autopull.log');
    const before = headSha(cloneDir, env);

    const lockPath = path.join(cloneDir, '.git', 'index.lock');
    fs.writeFileSync(lockPath, '');

    try {
      const result = runScript({ repo: cloneDir, home: tmpRoot, logFile, env });
      assert.equal(result.status, 0);

      const after = headSha(cloneDir, env);
      assert.equal(after, before);

      const log = readLog(logFile);
      assert.match(log, /index\.lock/);
    } finally {
      fs.rmSync(lockPath, { force: true });
    }
  });
});

test('REPO missing: exit 0', () => {
  withTmp((tmpRoot) => {
    const env = baseEnv(tmpRoot);
    const missingRepo = path.join(tmpRoot, 'does-not-exist');
    const logFile = path.join(tmpRoot, 'autopull.log');

    const result = runScript({ repo: missingRepo, home: tmpRoot, logFile, env });
    assert.equal(result.status, 0);

    const log = readLog(logFile);
    assert.match(log, /no .*\.git|not.*found|skip/i);
  });
});
