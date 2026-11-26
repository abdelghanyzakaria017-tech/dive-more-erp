// Create a Dive More ERP user from the command line (PHASE41 style).
//
// Usage:
//   npm run create-user -- person@divemore.com 'A-Long-Unique-Password1' sales 'Person Name'
//
// Roles: owner, admin, finance, accountant, accounting_manager, operations, sales
// Uses the same database settings as the server (DATABASE_URL or SQLite file).

import bcrypt from 'bcryptjs';

import { ROLES, createUser, getUserByEmail, initDb } from './db.js';

const [emailRaw, password, role = 'sales', ...nameParts] = process.argv.slice(2);
const email = String(emailRaw ?? '').trim().toLowerCase();
const name = nameParts.join(' ').trim();

function fail(message) {
  console.error(`Error: ${message}`);
  console.error("Usage: npm run create-user -- person@divemore.com 'A-Long-Unique-Password1' sales 'Person Name'");
  process.exit(1);
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('a valid email is required');
if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
  fail('password must be 8+ characters with at least one letter and one digit');
}
if (!ROLES.includes(role)) fail(`role must be one of: ${ROLES.join(', ')}`);

await initDb();
if (await getUserByEmail(email)) fail(`a user with email ${email} already exists`);

const created = await createUser({
  email,
  passwordHash: await bcrypt.hash(password, 12),
  role,
  name,
});
console.log(`Created user ${created.email} (role: ${created.role}${created.name ? `, name: ${created.name}` : ''})`);
process.exit(0);
