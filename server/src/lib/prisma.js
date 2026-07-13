// server/src/lib/prisma.js
// Single shared PrismaClient instance — reuse this everywhere instead of
// creating a new PrismaClient() in every file (avoids exhausting DB connections).
//
// Prisma 7 removed the built-in query engine: PrismaClient now REQUIRES a
// driver adapter to be passed in explicitly (no more "just works" from a URL).
//
// We load dotenv right here, at the top of this file, rather than relying on
// server.js's dotenv.config() call. In ESM, all `import` statements are
// resolved and evaluated BEFORE the importing file's own top-level code runs
// — so by the time server.js reaches its dotenv.config() line, this file (a
// dependency of a dependency of server.js) has already executed and already
// needed process.env.DATABASE_URL. Loading dotenv here guarantees the env
// var exists before we try to use it.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — check your server/.env file.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;