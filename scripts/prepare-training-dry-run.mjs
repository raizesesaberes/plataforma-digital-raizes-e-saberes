import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
const file = readdirSync('supabase/migrations').find(name => name.endsWith('_teacher_training_protected_delivery.sql'));
if (!file) throw Error('training_migration_missing');
const stripTransaction = sql => {
  if ((sql.match(/^begin;$/gm) || []).length !== 1 || (sql.match(/^commit;$/gm) || []).length !== 1) throw Error('unexpected_transaction_boundary');
  return sql.replace(/^begin;$/m, '').replace(/^commit;$/m, '');
};
const migration = stripTransaction(readFileSync(`supabase/migrations/${file}`, 'utf8'));
const activation = stripTransaction(readFileSync('supabase/review/teacher_training_activate_verified_assets.sql', 'utf8'));
const assertions = readFileSync('supabase/review/teacher_training_assertions.sql', 'utf8');
if (/^commit;$/im.test(assertions)) throw Error('assertions_must_not_commit');
const sql = `-- TEST ONLY. Temporary schema, lesson, readiness and license fixtures roll back.\n-- Do not replace the final ROLLBACK with COMMIT. No auth.users changes.\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='90s';\n${migration}\n${activation}\n${assertions}\nrollback;\n`;
mkdirSync('qa/teacher-training', { recursive: true });
writeFileSync('qa/teacher-training/dry-run.sql', sql);
console.log(`Prepared ${Buffer.byteLength(sql)} bytes: qa/teacher-training/dry-run.sql (one BEGIN, zero COMMIT, final ROLLBACK).`);
