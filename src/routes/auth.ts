import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../lib/auth.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const router = Router();

// Change password (protected)
router.post(
  "/change-password",
  requireAuth(),
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { password, password2 } = req.body;
    if (!password || !password2)
      return res.status(400).json({ error: "Missing fields" });
    if (password !== password2)
      return res.status(400).json({ error: "Passwords do not match" });
    const hash = await bcrypt.hash(password, 6);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
    res.json({ success: true });
  }
);

// Change avatar (protected)
router.post(
  "/change-avatar",
  requireAuth(),
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: "Missing avatar" });
    await prisma.user.update({ where: { id: userId }, data: { avatar } });
    res.json({ success: true });
  }
);

// Fixed admin credentials
const ADMIN_EMAIL = "admin@diagnostic.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";

router.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Missing fields" });
  // Only allow one admin user with fixed credentials
  if (email === ADMIN_EMAIL) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: "Admin already exists" });
    if (password !== ADMIN_PASSWORD || name !== ADMIN_NAME) {
      return res.status(400).json({ error: "Invalid admin credentials" });
    }
    const hash = await bcrypt.hash(password, 6);
    const user = await prisma.user.create({
      data: { name, email, password: hash, role: "Admin" },
    });
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
  // Regular user registration
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists)
    return res.status(400).json({ error: "Email already registered" });
  const hash = await bcrypt.hash(password, 6);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: "User" },
  });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  // Fixed admin login
  if (email === ADMIN_EMAIL) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Admin not found" });
    if (password !== ADMIN_PASSWORD)
      return res.status(401).json({ error: "Invalid admin credentials" });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }
  // Regular user login
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// Get current user info (protected)
router.get("/me", requireAuth(), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  });
});

// List all users (admin only)
router.get(
  "/users",
  requireAuth("Admin"),
  async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
    res.json(users);
  }
);

// Update user (admin only)
router.put(
  "/users/:id",
  requireAuth("Admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { name, email, role },
      });
      res.json({ success: true, user });
    } catch (err) {
      res.status(400).json({ error: "Failed to update user" });
    }
  }
);

// Delete user (admin only)
router.delete(
  "/users/:id",
  requireAuth("Admin"),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      await prisma.user.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Failed to delete user" });
    }
  }
);

export default router;
