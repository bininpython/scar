import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, setCsrf } from '../src/api.ts';

test('cliente da API distingue página de erro, JSON inválido e respostas reais', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response('The page could not be found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  await assert.rejects(
    api('/health'),
    /API do SCAR não está disponível em \/api\/health \(HTTP 404\)/,
  );
  globalThis.fetch = async () =>
    new Response('<html>Fallback da interface</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  await assert.rejects(api('/state'), /API do SCAR não está disponível/);
  globalThis.fetch = async () =>
    new Response('{incompleto', { headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(api('/state'), /JSON inválido/);
  globalThis.fetch = async () =>
    new Response('null', { headers: { 'Content-Type': 'application/json' } });
  await assert.rejects(api('/state'), /dados inesperados/);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Sessão inválida' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  await assert.rejects(api('/state'), /Sessão inválida/);
  setCsrf('test-csrf');
  globalThis.fetch = async (url, init) => {
    assert.equal(url, '/api/plans');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['X-CSRF-Token'], 'test-csrf');
    assert.equal(JSON.parse(init.body).name, 'Plano');
    return new Response(JSON.stringify({ id: 1 }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  assert.deepEqual(await api('/plans', 'POST', { name: 'Plano' }), { id: 1 });
});
