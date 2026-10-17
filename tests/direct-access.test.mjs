import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('acesso direto abre banco novo sem setup, permite salvar e mantém CSRF', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'scar-direct-'));
  const env = { ...process.env, SCAR_DB: join(folder, 'fresh.db'), HOST: '127.0.0.1', PORT: '0' };
  delete env.SCAR_REQUIRE_LOGIN;
  const server = spawn(process.execPath, ['server/index.mjs'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const base = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(Error('Servidor não iniciou')), 10000);
      server.stdout.on('data', (chunk) => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });
      server.once('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
    });
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.initialized, false);
    assert.equal(health.requireLogin, false);
    const response = await fetch(base + '/api/state');
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.requireLogin, false);
    assert.equal(state.user.role, 'admin');
    assert.equal(state.users, undefined);
    const payload = JSON.stringify({ name: 'Plano sem login', price: 9900, description: '' });
    const denied = await fetch(base + '/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    assert.equal(denied.status, 403);
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf };
    const created = await fetch(base + '/api/plans', { method: 'POST', headers, body: payload });
    assert.equal(created.status, 201);
    const saved = await (await fetch(base + '/api/state')).json();
    assert.equal(saved.plans[0].name, 'Plano sem login');
    const users = await fetch(base + '/api/users', { method: 'POST', headers, body: '{}' });
    assert.equal(users.status, 409);
    const password = await fetch(base + '/api/password', { method: 'POST', headers, body: '{}' });
    assert.equal(password.status, 409);
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await once(server, 'exit');
    }
    rmSync(folder, { recursive: true, force: true });
  }
});
