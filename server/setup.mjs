import { openDb, passwordHash } from './db.mjs';
import { createInterface } from 'node:readline/promises';
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  const db = openDb();
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n)
    throw Error('Já existe um usuário. Gerencie a equipe pelo painel.');
  const name = process.env.SCAR_ADMIN_NAME || (await rl.question('Seu nome: '));
  const email = process.env.SCAR_ADMIN_EMAIL || (await rl.question('E-mail do administrador: '));
  let password = process.env.SCAR_ADMIN_PASSWORD;
  if (!password) {
    rl.close();
    if (!process.stdin.isTTY)
      throw Error('Defina SCAR_ADMIN_PASSWORD com pelo menos 12 caracteres.');
    process.stdout.write('Senha (mínimo 12 caracteres; entrada oculta): ');
    password = await new Promise((resolve, reject) => {
      let value = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      const handler = (s) => {
        if (s === '\u0003') {
          process.stdin.setRawMode(false);
          reject(Error('Cancelado'));
          return;
        }
        if (s === '\r' || s === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.off('data', handler);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(value);
        } else if (s === '\u007f') {
          value = value.slice(0, -1);
        } else if (!s.startsWith('\u001b')) value += s;
      };
      process.stdin.on('data', handler);
    });
  }
  if (!name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12)
    throw Error('Informe nome, e-mail válido e senha com pelo menos 12 caracteres.');
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run(
    name.trim(),
    email.trim().toLowerCase(),
    passwordHash(password),
    'admin',
  );
  db.close();
  console.log('Administrador criado. Execute npm start.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
