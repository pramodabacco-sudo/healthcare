// server/src/auth/auth.routes.js
import { Router } from "express";
import { register, login, me } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, me); // handy for "am I still logged in?" checks on app load

export default router;