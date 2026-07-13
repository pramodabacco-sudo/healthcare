// server/src/auth/auth.controller.js
import prisma from "../lib/prisma.js";
import { hashPassword, comparePassword } from "./hash.js";
import { signToken } from "./jwt.js";

const VALID_ROLES = ["DOCTOR", "RECEPTIONIST", "PHARMACY"];
const VALID_MODULES = ["OPD", "IPD", "PHARMACY"];

// Strip password before ever sending a user object back to the client.
function toSafeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

export async function register(req, res) {
  try {
    const { fullName, email, phone, password, role, modules } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        message: "fullName, email, password, and role are required.",
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `role must be one of ${VALID_ROLES.join(", ")}` });
    }

    const moduleList = Array.isArray(modules) ? modules : [];
    const invalidModule = moduleList.find((m) => !VALID_MODULES.includes(m));
    if (invalidModule) {
      return res.status(400).json({ message: `Invalid module: ${invalidModule}` });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        password: hashed,
        role,
        modules: moduleList,
      },
    });

    return res.status(201).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Something went wrong during registration." });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken({ id: user.id, role: user.role, modules: user.modules });

    return res.status(200).json({
      token,
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Something went wrong during login." });
  }
}

export async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user: toSafeUser(user) });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Something went wrong." });
  }
}