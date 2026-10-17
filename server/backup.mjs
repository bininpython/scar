import { backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { openDb } from './db.mjs';
mkdirSync('backups', { recursive: true, mode: 0o700 });
const destination = `backups/scar-${new Date().toISOString().replaceAll(':', '-')}.db`;
const db = openDb();
try {
  await backup(db, destination);
  chmodSync(destination, 0o600);
  console.log(`Backup consistente criado: ${destination}`);
} finally {
  db.close();
}
