// server/src/auth/hash.js
// Using bcryptjs instead of bcrypt: pure JS, no native compilation needed,
// which avoids install headaches in some environments. Swap to bcrypt if you
// prefer — the API is identical.
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}