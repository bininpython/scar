import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  return timingSafeEqual(Buffer.from(key, 'hex'), scryptSync(password, salt, 64));
}
export function openDb(path = process.env.SCAR_DB || 'data/scar.db') {
  const absolute = resolve(path);
  mkdirSync(dirname(absolute), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(absolute);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','reception','trainer')), active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), name TEXT NOT NULL DEFAULT 'Minha academia', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '');
 INSERT OR IGNORE INTO settings(id) VALUES(1);
 CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>=0), description TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS members (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', birth_date TEXT NOT NULL DEFAULT '', plan_id INTEGER NOT NULL REFERENCES plans(id), status TEXT NOT NULL CHECK(status IN ('active','paused','cancelled')) DEFAULT 'active', due_day INTEGER NOT NULL DEFAULT 10 CHECK(due_day BETWEEN 1 AND 28), joined_at TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members(id), period TEXT NOT NULL, due_date TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>=0), status TEXT NOT NULL CHECK(status IN ('open','paid','cancelled')) DEFAULT 'open', paid_at TEXT, method TEXT, UNIQUE(member_id,period));
 CREATE TABLE IF NOT EXISTS workouts (id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members(id), title TEXT NOT NULL, goal TEXT NOT NULL DEFAULT '', valid_until TEXT NOT NULL, exercises TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS assessments (id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members(id), date TEXT NOT NULL, weight REAL NOT NULL CHECK(weight>0), height REAL NOT NULL CHECK(height>0), waist REAL, body_fat REAL, notes TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS checkins (id INTEGER PRIMARY KEY, member_id INTEGER NOT NULL REFERENCES members(id), date TEXT NOT NULL, time TEXT NOT NULL, UNIQUE(member_id,date));
 CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, title TEXT NOT NULL, instructor TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity>0), duration INTEGER NOT NULL CHECK(duration>0));
 CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE, member_id INTEGER NOT NULL REFERENCES members(id), UNIQUE(class_id,member_id));
 CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 `);
  return db;
}
export function seedDemo(db) {
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n) return;
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(
    'Alex • Gestor',
    'demo@scar.local',
    passwordHash('Demo@Scar2026'),
    'admin',
  );
  db.prepare('UPDATE settings SET name=? WHERE id=1').run('Studio Movimento');
  const plans = [
    ['Essencial', 9900, 'Musculação • acesso livre'],
    ['Performance', 14900, 'Musculação + aulas coletivas'],
    ['Premium', 21900, 'Acompanhamento individual + avaliação'],
  ];
  for (const p of plans)
    db.prepare('INSERT INTO plans(name,price,description) VALUES(?,?,?)').run(...p);
  const names = [
    'Marina Oliveira',
    'Lucas Almeida',
    'Camila Santos',
    'Pedro Costa',
    'Isabela Martins',
    'Rafael Lima',
    'Beatriz Souza',
    'Gabriel Ferreira',
    'Juliana Rocha',
    'Felipe Ribeiro',
    'Ana Paula Dias',
    'Thiago Mendes',
  ];
  const now = today(),
    period = now.slice(0, 7);
  names.forEach((name, i) => {
    const id = Number(
      db
        .prepare(
          'INSERT INTO members(name,email,phone,birth_date,plan_id,status,due_day,joined_at) VALUES(?,?,?,?,?,?,?,?)',
        )
        .run(
          name,
          `aluno${i + 1}@example.com`,
          '',
          '1995-06-15',
          (i % 3) + 1,
          i === 10 ? 'paused' : 'active',
          10,
          `${period}-01`,
        ).lastInsertRowid,
    );
    db.prepare(
      'INSERT INTO invoices(member_id,period,due_date,amount,status,paid_at,method) VALUES(?,?,?,?,?,?,?)',
    ).run(
      id,
      period,
      `${period}-10`,
      plans[i % 3][1],
      i < 8 ? 'paid' : 'open',
      i < 8 ? `${period}-05` : null,
      i < 8 ? 'pix' : null,
    );
    if (i < 7)
      db.prepare('INSERT INTO checkins(member_id,date,time) VALUES(?,?,?)').run(
        id,
        now,
        `07:${String(i * 7).padStart(2, '0')}`,
      );
  });
  db.prepare(
    'INSERT INTO workouts(member_id,title,goal,valid_until,exercises,notes) VALUES(?,?,?,?,?,?)',
  ).run(
    1,
    'Treino A • membros inferiores',
    'Hipertrofia',
    `${Number(now.slice(0, 4)) + 1}-01-01`,
    JSON.stringify([
      { name: 'Agachamento livre', sets: 3, reps: '10–12', load: '20 kg', rest: '60 s' },
      { name: 'Leg press', sets: 3, reps: '12', load: '80 kg', rest: '60 s' },
      { name: 'Mesa flexora', sets: 3, reps: '12', load: '25 kg', rest: '60 s' },
    ]),
    'Ficha demonstrativa. Prescrição deve ser revisada pelo profissional responsável.',
  );
  db.prepare(
    'INSERT INTO assessments(member_id,date,weight,height,waist,body_fat,notes) VALUES(?,?,?,?,?,?,?)',
  ).run(1, now, 65, 168, 73, 25, 'Dados fictícios para demonstração.');
  for (const [title, time, instructor, capacity] of [
    ['Funcional', '08:00', 'Carolina Alves', 16],
    ['Mobilidade', '10:00', 'André Silva', 12],
    ['Spinning', '18:30', 'Carolina Alves', 20],
  ])
    db.prepare(
      'INSERT INTO classes(title,instructor,date,time,capacity,duration) VALUES(?,?,?,?,?,?)',
    ).run(title, instructor, now, time, capacity, 50);
  db.prepare('INSERT INTO bookings(class_id,member_id) VALUES(1,1)').run();
}
