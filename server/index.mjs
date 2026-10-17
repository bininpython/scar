import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { openDb, passwordHash, verifyPassword, seedDemo, today } from './db.mjs';
const demo = process.argv.includes('--demo');
const db = openDb(demo ? 'data/demo.db' : undefined);
if (demo) seedDemo(db);
const port = Number(process.env.PORT || 3000),
  host = process.env.HOST || '127.0.0.1';
const dist = resolve('dist');
const throttle = new Map();
const json = (res, status, data) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
};
const fail = (message, status = 400) => {
  throw Object.assign(Error(message), { status });
};
const digest = (t) => createHash('sha256').update(t).digest('hex');
const all = (table) => db.prepare(`SELECT * FROM ${table} ORDER BY id DESC`).all();
function str(v, name, max = 300, required = true) {
  if (typeof v !== 'string' || (required && !v.trim()) || v.length > max)
    fail(`${name}: valor inválido.`);
  return v.trim();
}
function num(v, name, min = 0, max = 1000000, int = false) {
  if (
    typeof v !== 'number' ||
    !Number.isFinite(v) ||
    v < min ||
    v > max ||
    (int && !Number.isInteger(v))
  )
    fail(`${name}: valor inválido.`);
  return v;
}
function date(v, name, optional = false) {
  if (optional && v === '') return '';
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) !== v
  )
    fail(`${name}: data inválida.`);
  return v;
}
function id(v) {
  return num(v, 'Identificador', 1, Number.MAX_SAFE_INTEGER, true);
}
function member(v) {
  id(v);
  const m = db.prepare('SELECT * FROM members WHERE id=?').get(v);
  if (!m) fail('Aluno não encontrado.', 404);
  return m;
}
function choice(v, values, name) {
  if (!values.includes(v)) fail(`${name}: opção inválida.`);
  return v;
}
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    db.exec('COMMIT');
    return value;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
function audit(user, action, entity, entityId) {
  db.prepare('INSERT INTO audit(user_id,action,entity,entity_id) VALUES(?,?,?,?)').run(
    user.id,
    action,
    entity,
    entityId ?? null,
  );
}
async function body(req) {
  let size = 0,
    buf = '';
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) fail('Requisição muito grande.', 413);
    buf += chunk;
  }
  try {
    return JSON.parse(buf || '{}');
  } catch {
    fail('JSON inválido.');
  }
}
const roles = {
  members: ['admin', 'reception'],
  plans: ['admin'],
  invoices: ['admin', 'reception'],
  workouts: ['admin', 'trainer'],
  assessments: ['admin', 'trainer'],
  checkins: ['admin', 'reception'],
  classes: ['admin', 'reception', 'trainer'],
  bookings: ['admin', 'reception', 'trainer'],
  users: ['admin'],
  settings: ['admin'],
};
function permit(user, entity) {
  if (!roles[entity]?.includes(user.role)) fail('Seu perfil não permite esta ação.', 403);
}
function validate(entity, b) {
  switch (entity) {
    case 'plans':
      return {
        name: str(b.name, 'Nome', 80),
        price: num(b.price, 'Preço', 0, 100000000, true),
        description: str(b.description ?? '', 'Descrição', 500, false),
      };
    case 'members': {
      if (!db.prepare('SELECT id FROM plans WHERE id=?').get(id(b.plan_id)))
        fail('Plano não encontrado.');
      const email = str(b.email ?? '', 'E-mail', 200, false);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('E-mail inválido.');
      const birth = date(b.birth_date ?? '', 'Nascimento', true);
      if (birth && birth > today()) fail('Nascimento não pode ser futuro.');
      return {
        name: str(b.name, 'Nome', 120),
        email,
        phone: str(b.phone ?? '', 'Telefone', 30, false),
        birth_date: birth,
        plan_id: b.plan_id,
        status: choice(b.status, ['active', 'paused', 'cancelled'], 'Situação'),
        due_day: num(b.due_day, 'Vencimento', 1, 28, true),
        joined_at: date(b.joined_at, 'Matrícula'),
        notes: str(b.notes ?? '', 'Observações', 2000, false),
      };
    }
    case 'workouts': {
      member(b.member_id);
      if (!Array.isArray(b.exercises) || !b.exercises.length || b.exercises.length > 40)
        fail('Adicione de 1 a 40 exercícios.');
      const exercises = b.exercises.map((e) => ({
        name: str(e.name, 'Exercício', 120),
        sets: num(e.sets, 'Séries', 1, 20, true),
        reps: str(e.reps, 'Repetições', 40),
        load: str(e.load ?? '', 'Carga', 40, false),
        rest: str(e.rest ?? '', 'Intervalo', 40, false),
      }));
      return {
        member_id: b.member_id,
        title: str(b.title, 'Título', 120),
        goal: str(b.goal ?? '', 'Objetivo', 200, false),
        valid_until: date(b.valid_until, 'Validade'),
        exercises: JSON.stringify(exercises),
        notes: str(b.notes ?? '', 'Observações', 2000, false),
      };
    }
    case 'assessments':
      member(b.member_id);
      return {
        member_id: b.member_id,
        date: date(b.date, 'Avaliação'),
        weight: num(b.weight, 'Peso', 1, 500),
        height: num(b.height, 'Altura', 30, 250),
        waist: b.waist === null ? null : num(b.waist, 'Cintura', 1, 300),
        body_fat: b.body_fat === null ? null : num(b.body_fat, 'Gordura', 0, 80),
        notes: str(b.notes ?? '', 'Observações', 2000, false),
      };
    case 'classes':
      return {
        title: str(b.title, 'Aula', 100),
        instructor: str(b.instructor, 'Professor', 120),
        date: date(b.date, 'Data'),
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time) ? b.time : fail('Horário inválido.'),
        capacity: num(b.capacity, 'Vagas', 1, 500, true),
        duration: num(b.duration, 'Duração', 5, 480, true),
      };
    default:
      fail('Operação não encontrada.', 404);
  }
}
function snapshot(user) {
  const data = {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    settings: db.prepare('SELECT * FROM settings WHERE id=1').get(),
    today: today(),
    demo,
    plans: all('plans'),
    members: all('members'),
    classes: all('classes'),
    bookings: all('bookings'),
    checkins: all('checkins'),
  };
  if (user.role !== 'trainer') data.invoices = all('invoices');
  if (user.role !== 'reception') {
    data.workouts = all('workouts').map((w) => ({ ...w, exercises: JSON.parse(w.exercises) }));
    data.assessments = all('assessments');
  }
  if (user.role === 'admin')
    data.users = db.prepare('SELECT id,name,email,role,active FROM users ORDER BY id').all();
  return data;
}
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (!path.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD')
        return json(res, 405, { error: 'Método não permitido.' });
      let file = resolve(dist, '.' + decodeURIComponent(path));
      if (!file.startsWith(dist + sep) && file !== dist) fail('Caminho inválido.', 400);
      if (!existsSync(file) || !statSync(file).isFile()) file = resolve(dist, 'index.html');
      if (!existsSync(file))
        return json(res, 503, { error: 'Execute npm run build antes de iniciar o servidor.' });
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      };
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.setHeader(
        'Cache-Control',
        file.includes('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache',
      );
      return res.end(req.method === 'HEAD' ? undefined : readFileSync(file));
    }
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
      const origin = req.headers.origin;
      if (
        origin &&
        origin !== `http://${req.headers.host}` &&
        origin !== `https://${req.headers.host}` &&
        origin !== process.env.SCAR_ORIGIN
      )
        fail('Origem não permitida.', 403);
      if (!req.headers['content-type']?.startsWith('application/json'))
        fail('Use application/json.', 415);
    }
    if (path === '/api/health' && req.method === 'GET')
      return json(res, 200, {
        ok: true,
        demo,
        initialized: !!db.prepare('SELECT id FROM users LIMIT 1').get(),
      });
    if (path === '/api/login' && req.method === 'POST') {
      const key = req.socket.remoteAddress;
      const attempt = throttle.get(key);
      const now = Date.now();
      if (attempt && attempt.until > now && attempt.count >= 10)
        fail('Muitas tentativas. Tente novamente em 15 minutos.', 429);
      const b = await body(req);
      const email = str(b.email, 'E-mail', 200).toLowerCase(),
        password = b.password;
      if (typeof password !== 'string' || password.length > 200) fail('Senha inválida.');
      const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        if (throttle.size > 10000)
          for (const [k, v] of throttle) if (v.until < now) throttle.delete(k);
        throttle.set(key, {
          count: attempt && attempt.until > now ? attempt.count + 1 : 1,
          until: attempt && attempt.until > now ? attempt.until : now + 900000,
        });
        fail('E-mail ou senha incorretos.', 401);
      }
      throttle.delete(key);
      db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
      const token = randomBytes(32).toString('hex'),
        csrf = randomBytes(24).toString('hex');
      db.prepare('INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)').run(
        digest(token),
        user.id,
        csrf,
        now + 28800000,
      );
      res.setHeader(
        'Set-Cookie',
        `scar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.SCAR_SECURE_COOKIE === '1' ? '; Secure' : ''}`,
      );
      return json(res, 200, { ...snapshot(user), csrf });
    }
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('scar_session='))
      ?.slice(13);
    const session =
      token &&
      db
        .prepare(
          'SELECT s.csrf,s.token,u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1',
        )
        .get(digest(token), Date.now());
    if (!session) fail('Entre na sua conta para continuar.', 401);
    if (req.method !== 'GET' && req.headers['x-csrf-token'] !== session.csrf)
      fail('Sessão inválida. Atualize a página.', 403);
    if (path === '/api/state' && req.method === 'GET')
      return json(res, 200, { ...snapshot(session), csrf: session.csrf });
    if (path === '/api/logout' && req.method === 'POST') {
      db.prepare('DELETE FROM sessions WHERE token=?').run(session.token);
      res.setHeader('Set-Cookie', 'scar_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return json(res, 200, { ok: true });
    }
    if (path === '/api/export' && req.method === 'GET') {
      permit(session, 'settings');
      return json(res, 200, {
        schema_version: 1,
        exported_at: new Date().toISOString(),
        settings: db.prepare('SELECT * FROM settings').all(),
        ...Object.fromEntries(
          [
            'plans',
            'members',
            'invoices',
            'workouts',
            'assessments',
            'classes',
            'bookings',
            'checkins',
          ].map((t) => [t, all(t)]),
        ),
      });
    }
    const parts = path.split('/').filter(Boolean);
    const entity = parts[1],
      entityId = parts[2] ? Number(parts[2]) : undefined;
    const b = await body(req);
    if (entity === 'password' && req.method === 'POST') {
      if (
        typeof b.currentPassword !== 'string' ||
        !verifyPassword(b.currentPassword, session.password_hash)
      )
        fail('Senha atual incorreta.', 400);
      if (
        typeof b.newPassword !== 'string' ||
        b.newPassword.length < 12 ||
        b.newPassword.length > 200
      )
        fail('A nova senha deve ter entre 12 e 200 caracteres.');
      transaction(() => {
        db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(
          passwordHash(b.newPassword),
          session.id,
        );
        db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(
          session.id,
          session.token,
        );
        audit(session, 'password', 'users', session.id);
      });
      return json(res, 200, { ok: true });
    }
    permit(session, entity);
    if (entity === 'settings' && req.method === 'PATCH') {
      const name = str(b.name, 'Academia', 120),
        phone = str(b.phone ?? '', 'Telefone', 40, false),
        email = str(b.email ?? '', 'E-mail', 200, false);
      db.prepare('UPDATE settings SET name=?,phone=?,email=? WHERE id=1').run(name, phone, email);
      audit(session, 'update', 'settings', 1);
      return json(res, 200, { ok: true });
    }
    if (entity === 'users' && req.method === 'POST') {
      const name = str(b.name, 'Nome', 120),
        email = str(b.email, 'E-mail', 200).toLowerCase(),
        password = str(b.password, 'Senha', 200),
        role = choice(b.role, ['admin', 'reception', 'trainer'], 'Perfil');
      if (password.length < 12 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail('E-mail válido e senha de pelo menos 12 caracteres são obrigatórios.');
      const result = db
        .prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)')
        .run(name, email, passwordHash(password), role);
      audit(session, 'create', entity, Number(result.lastInsertRowid));
      return json(res, 201, { ok: true });
    }
    if (entity === 'users' && entityId && req.method === 'PATCH') {
      if (entityId === session.id) fail('Você não pode desativar seu próprio acesso.');
      if (!db.prepare('SELECT id FROM users WHERE id=?').get(entityId))
        fail('Usuário não encontrado.', 404);
      const active = choice(b.active, [0, 1], 'Acesso');
      transaction(() => {
        db.prepare('UPDATE users SET active=? WHERE id=?').run(active, entityId);
        db.prepare('DELETE FROM sessions WHERE user_id=?').run(entityId);
        audit(session, 'access', entity, entityId);
      });
      return json(res, 200, { ok: true });
    }
    if (entity === 'invoices' && parts[2] === 'generate' && req.method === 'POST') {
      const period = str(b.period, 'Competência', 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) fail('Competência inválida.');
      let count = 0;
      transaction(() => {
        for (const m of db
          .prepare(
            "SELECT m.*,p.price FROM members m JOIN plans p ON p.id=m.plan_id WHERE m.status='active' AND substr(m.joined_at,1,7)<=?",
          )
          .all(period)) {
          count += db
            .prepare(
              'INSERT OR IGNORE INTO invoices(member_id,period,due_date,amount) VALUES(?,?,?,?)',
            )
            .run(m.id, period, `${period}-${String(m.due_day).padStart(2, '0')}`, m.price).changes;
        }
        audit(session, 'generate', 'invoices', null);
      });
      return json(res, 201, { count });
    }
    if (entity === 'invoices' && entityId && req.method === 'PATCH') {
      const inv = db.prepare('SELECT * FROM invoices WHERE id=?').get(entityId);
      if (!inv) fail('Mensalidade não encontrada.', 404);
      if (inv.status !== 'open') fail('Esta mensalidade já foi finalizada.');
      const status = choice(b.status, ['paid', 'cancelled'], 'Situação');
      let method = null,
        paidAt = null;
      if (status === 'paid') {
        method = choice(b.method, ['pix', 'cash', 'card', 'transfer'], 'Pagamento');
        paidAt = date(b.paid_at, 'Pagamento');
        if (paidAt > today()) fail('Pagamento não pode ter data futura.');
      }
      transaction(() => {
        db.prepare('UPDATE invoices SET status=?,method=?,paid_at=? WHERE id=?').run(
          status,
          method,
          paidAt,
          entityId,
        );
        audit(session, status, 'invoices', entityId);
      });
      return json(res, 200, { ok: true });
    }
    if (entity === 'checkins' && req.method === 'POST') {
      const m = member(b.member_id);
      if (m.status !== 'active') fail('Aluno com matrícula pausada ou cancelada.');
      if (
        db
          .prepare(
            "SELECT id FROM invoices WHERE member_id=? AND status='open' AND due_date<? LIMIT 1",
          )
          .get(m.id, today())
      )
        fail('Check-in bloqueado: há mensalidades vencidas. Regularize no financeiro.');
      db.prepare('INSERT INTO checkins(member_id,date,time) VALUES(?,?,?)').run(
        m.id,
        today(),
        new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
      audit(session, 'create', entity, m.id);
      return json(res, 201, { ok: true });
    }
    if (entity === 'bookings' && req.method === 'POST') {
      const m = member(b.member_id),
        classId = id(b.class_id);
      if (m.status !== 'active') fail('Apenas alunos ativos podem reservar.');
      transaction(() => {
        const c = db.prepare('SELECT * FROM classes WHERE id=?').get(classId);
        if (!c) fail('Aula não encontrada.', 404);
        if (c.date < today()) fail('Esta aula já aconteceu.');
        const count = db
          .prepare('SELECT COUNT(*) AS n FROM bookings WHERE class_id=?')
          .get(classId).n;
        if (count >= c.capacity) fail('Aula lotada.');
        db.prepare('INSERT INTO bookings(class_id,member_id) VALUES(?,?)').run(classId, m.id);
        audit(session, 'create', entity, classId);
      });
      return json(res, 201, { ok: true });
    }
    if (
      ['plans', 'members', 'workouts', 'assessments', 'classes'].includes(entity) &&
      ['POST', 'PATCH'].includes(req.method)
    ) {
      const values = validate(entity, b);
      let newId = entityId;
      transaction(() => {
        if (req.method === 'PATCH') {
          id(entityId);
          if (!db.prepare(`SELECT id FROM ${entity} WHERE id=?`).get(entityId))
            fail('Registro não encontrado.', 404);
          if (
            entity === 'classes' &&
            db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE class_id=?').get(entityId).n >
              values.capacity
          )
            fail('A capacidade não pode ser menor que as reservas existentes.');
          db.prepare(
            `UPDATE ${entity} SET ${Object.keys(values)
              .map((k) => `${k}=?`)
              .join(',')} WHERE id=?`,
          ).run(...Object.values(values), entityId);
        } else {
          newId = Number(
            db
              .prepare(
                `INSERT INTO ${entity}(${Object.keys(values).join(',')}) VALUES(${Object.keys(
                  values,
                )
                  .map(() => '?')
                  .join(',')})`,
              )
              .run(...Object.values(values)).lastInsertRowid,
          );
        }
        audit(session, req.method === 'POST' ? 'create' : 'update', entity, newId);
      });
      return json(res, req.method === 'POST' ? 201 : 200, { id: newId });
    }
    if (
      ['plans', 'workouts', 'assessments', 'classes', 'bookings'].includes(entity) &&
      entityId &&
      req.method === 'DELETE'
    ) {
      id(entityId);
      transaction(() => {
        const result = db.prepare(`DELETE FROM ${entity} WHERE id=?`).run(entityId);
        if (!result.changes) fail('Registro não encontrado.', 404);
        audit(session, 'delete', entity, entityId);
      });
      return json(res, 200, { ok: true });
    }
    fail('Operação não encontrada.', 404);
  } catch (e) {
    if (e.code?.startsWith('ERR_SQLITE')) {
      const duplicate = e.message.includes('UNIQUE');
      return json(res, 409, {
        error: duplicate
          ? 'Este registro já existe (e-mail, reserva, mensalidade ou check-in do dia).'
          : 'Registro vinculado a outros dados. Revise os campos ou preserve o histórico.',
      });
    }
    if (!e.status) console.error(e);
    json(res, e.status || 500, {
      error: e.status ? e.message : 'Não foi possível concluir a operação.',
    });
  }
});
server.listen(port, host, () => {
  console.log(`SCAR em http://${host}:${server.address().port}`);
  if (demo)
    console.log('DEMONSTRAÇÃO: demo@scar.local / Demo@Scar2026 — dados fictícios, banco separado.');
});
const close = () =>
  server.close(() => {
    db.close();
    process.exit(0);
  });
process.on('SIGTERM', close);
process.on('SIGINT', close);
