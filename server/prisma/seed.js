// server/prisma/seed.js
// Run with: node prisma/seed.js
// Creates one real DB user per role so you can log in against real data
// instead of the old hardcoded USERS object.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_USERS = [
  {
    fullName: "Dr. Ashwin Menon",
    email: "doctor@gmail.com",
    password: "123456",
    role: "DOCTOR",
    modules: ["OPD", "IPD"], // this doctor handles both
  },
  {
    fullName: "Reception Desk",
    email: "reciption@gmail.com",
    password: "123456",
    role: "RECEPTIONIST",
    modules: ["OPD", "IPD"],
  },
  {
    fullName: "Pharmacy Desk",
    email: "pharmacy@gmail.com",
    password: "123456",
    role: "PHARMACY",
    modules: ["PHARMACY"],
  },
  // Example of a specialist doctor who ONLY does IPD (uncomment/edit to add more):
  // {
  //   fullName: "Dr. Kavya Iyer",
  //   email: "ipd.doctor@gmail.com",
  //   password: "123456",
  //   role: "DOCTOR",
  //   modules: ["IPD"],
  // },
];

async function main() {
  for (const u of SEED_USERS) {
    const hashed = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        password: hashed,
        role: u.role,
        modules: u.modules,
      },
      create: {
        fullName: u.fullName,
        email: u.email,
        password: hashed,
        role: u.role,
        modules: u.modules,
      },
    });

    console.log(`✅ ${user.role} ready: ${user.email} (password: ${u.password})`);
  }
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  