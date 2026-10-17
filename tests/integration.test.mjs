import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { openDb, passwordHash, today } from '../server/db.mjs';
const folder = mkdtempSync(join(tmpdir(), 'scar-test-'));
const dbPath = join(folder, 'test.db');
const seed = openDb(dbPath);
for (const role of ['admin', 'reception', 'trainer'])
  seed
    .prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
    .run(role, `${role}@test.local`, passwordHash('Test-password-123'), role);
seed.close();
let child, base;
async function start() {
  child = spawn(process.execPath, ['server/index.mjs'], {
    env: { ...process.env, SCAR_DB: dbPath, SCAR_REQUIRE_LOGIN: '1', PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const text = await new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(Error('Server startup timeout')), 10000);
    child.stdout.on('data', (c) => {
      out += c;
      if (out.includes('SCAR em')) {
        clearTimeout(timer);
        resolve(out);
      }
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code) reject(Error(`Server exited ${code}`));
    });
  });
  base = text.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
}
async function stop() {
  if (child?.exitCode === null) {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
}
async function req(path, method = 'GET', body, session = {}, headers = {}) {
  const response = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: session.cookie || '',
      'X-CSRF-Token': session.csrf || '',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    headers: response.headers,
  };
}
async function login(role, password = 'Test-password-123') {
  const r = await req('/login', 'POST', { email: `${role}@test.local`, password });
  assert.equal(r.status, 200);
  return { cookie: r.cookie, csrf: r.data.csrf };
}
const memberData = (planId, name, status = 'active') => ({
  name,
  email: '',
  phone: '',
  birth_date: '1990-01-01',
  plan_id: planId,
  status,
  due_day: 1,
  joined_at: '2025-01-01',
  notes: '',
});
await test('SCAR: integração HTTP, SQLite e regras de negócio', async (t) => {
  await start();
  let admin, trainer, reception, planId, memberId, otherId, classId, invoiceId;
  try {
    await t.test('login obrigatório, cookies seguros e CSRF', async () => {
      assert.equal((await req('/state')).status, 401);
      admin = await login('admin');
      trainer = await login('trainer');
      reception = await login('reception');
      const logged = await req('/login', 'POST', {
        email: 'admin@test.local',
        password: 'Test-password-123',
      });
      assert.match(logged.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
      assert.equal(
        (await req('/plans', 'POST', { name: 'A', price: 9900 }, { cookie: admin.cookie })).status,
        403,
      );
      assert.equal(
        (
          await req('/plans', 'POST', { name: 'A', price: 9900 }, admin, {
            Origin: 'https://attacker.example',
          })
        ).status,
        403,
      );
    });
    await t.test('perfis validados no backend e dados restritos', async () => {
      assert.equal((await req('/plans', 'POST', { name: 'A', price: 9900 }, trainer)).status, 403);
      assert.equal(
        (await req('/plans', 'POST', { name: 'A', price: 9900 }, reception)).status,
        403,
      );
      const tr = await req('/state', 'GET', undefined, trainer);
      assert.equal(tr.data.invoices, undefined);
      assert.equal(tr.data.users, undefined);
      const re = await req('/state', 'GET', undefined, reception);
      assert.equal(re.data.assessments, undefined);
      assert.equal(re.data.workouts, undefined);
      assert.equal((await req('/export', 'GET', undefined, trainer)).status, 403);
    });
    await t.test('planos e alunos com validação e persistência', async () => {
      const p = await req(
        '/plans',
        'POST',
        { name: 'Performance', price: 14990, description: 'Musculação' },
        admin,
      );
      assert.equal(p.status, 201);
      planId = p.data.id;
      assert.equal(
        (await req('/plans', 'POST', { name: 'Negativo', price: -1 }, admin)).status,
        400,
      );
      const m = await req('/members', 'POST', memberData(planId, 'Marina'), reception);
      assert.equal(m.status, 201);
      memberId = m.data.id;
      otherId = (await req('/members', 'POST', memberData(planId, 'Pedro'), admin)).data.id;
      await req('/members', 'POST', memberData(planId, 'Aluno pausado', 'paused'), admin);
      assert.equal(
        (
          await req(
            '/members',
            'POST',
            { ...memberData(planId, 'Data inválida'), birth_date: '2026-02-30' },
            admin,
          )
        ).status,
        400,
      );
      assert.equal((await req(`/plans/${planId}`, 'DELETE', {}, admin)).status, 409);
    });
    await t.test('mensalidades por competência sem duplicação e sem alunos pausados', async () => {
      const first = await req('/invoices/generate', 'POST', { period: '2025-02' }, admin);
      assert.equal(first.status, 201);
      assert.equal(first.data.count, 2);
      assert.equal(
        (await req('/invoices/generate', 'POST', { period: '2025-02' }, admin)).data.count,
        0,
      );
      const state = (await req('/state', 'GET', undefined, admin)).data;
      assert.equal(state.invoices.length, 2);
      assert.equal(state.invoices[0].amount, 14990);
      invoiceId = state.invoices.find((i) => i.member_id === memberId).id;
      assert.equal(
        (await req('/invoices/generate', 'POST', { period: '2026-13' }, admin)).status,
        400,
      );
    });
    await t.test('pendência bloqueia check-in; baixa é imutável e libera acesso', async () => {
      assert.equal(
        (await req('/checkins', 'POST', { member_id: memberId }, reception)).status,
        400,
      );
      assert.equal(
        (
          await req(
            `/invoices/${invoiceId}`,
            'PATCH',
            { status: 'paid', method: 'pix', paid_at: today() },
            reception,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await req(
            `/invoices/${invoiceId}`,
            'PATCH',
            { status: 'paid', method: 'pix', paid_at: today() },
            admin,
          )
        ).status,
        400,
      );
      assert.equal(
        (await req('/checkins', 'POST', { member_id: memberId }, reception)).status,
        201,
      );
      assert.equal(
        (await req('/checkins', 'POST', { member_id: memberId }, reception)).status,
        409,
      );
    });
    await t.test('lotação, reserva única e proteção de capacidade', async () => {
      const c = await req(
        '/classes',
        'POST',
        {
          title: 'Funcional',
          instructor: 'Ana',
          date: today(),
          time: '18:00',
          capacity: 1,
          duration: 45,
        },
        trainer,
      );
      assert.equal(c.status, 201);
      classId = c.data.id;
      assert.equal(
        (await req('/bookings', 'POST', { class_id: classId, member_id: memberId }, reception))
          .status,
        201,
      );
      assert.equal(
        (await req('/bookings', 'POST', { class_id: classId, member_id: otherId }, reception))
          .status,
        400,
      );
      const update = {
        title: 'Funcional',
        instructor: 'Ana',
        date: today(),
        time: '18:00',
        capacity: 2,
        duration: 45,
      };
      assert.equal((await req(`/classes/${classId}`, 'PATCH', update, trainer)).status, 200);
      assert.equal(
        (await req('/bookings', 'POST', { class_id: classId, member_id: memberId }, trainer))
          .status,
        409,
      );
      assert.equal(
        (await req('/bookings', 'POST', { class_id: classId, member_id: otherId }, trainer)).status,
        201,
      );
      assert.equal(
        (await req(`/classes/${classId}`, 'PATCH', { ...update, capacity: 1 }, trainer)).status,
        400,
      );
    });
    await t.test('treinos e avaliações preservados e acesso da recepção negado', async () => {
      const w = {
        member_id: memberId,
        title: 'Treino A',
        goal: 'Força',
        valid_until: '2027-01-01',
        notes: 'Revisão profissional',
        exercises: [{ name: 'Agachamento', sets: 3, reps: '12', load: '20 kg', rest: '60 s' }],
      };
      assert.equal((await req('/workouts', 'POST', w, reception)).status, 403);
      assert.equal((await req('/workouts', 'POST', w, trainer)).status, 201);
      assert.equal((await req('/workouts', 'POST', { ...w, exercises: [] }, trainer)).status, 400);
      const a = {
        member_id: memberId,
        date: today(),
        weight: 65,
        height: 168,
        waist: null,
        body_fat: null,
        notes: 'Registro de avaliação',
      };
      assert.equal((await req('/assessments', 'POST', a, trainer)).status, 201);
      assert.equal((await req('/assessments', 'POST', { ...a, weight: -1 }, trainer)).status, 400);
      const state = (await req('/state', 'GET', undefined, trainer)).data;
      assert.equal(state.workouts[0].exercises[0].load, '20 kg');
      assert.equal(state.assessments[0].weight, 65);
    });
    await t.test('exportação sem credenciais, acesso da equipe e troca de senha', async () => {
      const exported = await req('/export', 'GET', undefined, admin);
      assert.equal(exported.status, 200);
      assert.equal(exported.data.schema_version, 1);
      assert.equal(exported.data.users, undefined);
      assert.equal(exported.data.sessions, undefined);
      assert.ok(!JSON.stringify(exported.data).includes('password_hash'));
      assert.equal(
        (
          await req(
            '/users',
            'POST',
            {
              name: 'João',
              email: 'joao@test.local',
              role: 'trainer',
              password: 'Nova-senha-12345',
            },
            admin,
          )
        ).status,
        201,
      );
      assert.equal((await req('/users/1', 'PATCH', { active: 0 }, admin)).status, 400);
      assert.equal(
        (
          await req(
            '/password',
            'POST',
            { currentPassword: 'Test-password-123', newPassword: 'Changed-password-123' },
            trainer,
          )
        ).status,
        200,
      );
      await login('trainer', 'Changed-password-123');
    });
    await t.test('dados sobrevivem ao reinício do servidor; logout encerra a sessão', async () => {
      await stop();
      await start();
      const state = await req('/state', 'GET', undefined, admin);
      assert.equal(state.status, 200);
      assert.equal(state.data.members.length, 3);
      assert.equal(state.data.workouts.length, 1);
      const root = await fetch(base);
      assert.equal(root.status, 200);
      assert.match(await root.text(), /SCAR/);
      assert.equal((await req('/logout', 'POST', {}, admin)).status, 200);
      assert.equal((await req('/state', 'GET', undefined, admin)).status, 401);
    });
  } finally {
    await stop();
    rmSync(folder, { recursive: true, force: true });
  }
});
