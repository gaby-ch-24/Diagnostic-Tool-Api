import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../lib/auth.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export default async function (fastify: FastifyInstance) {
  // Change password (protected)
  fastify.post('/change-password', { preHandler: requireAuth() }, async (req, reply) => {
    const userId = (req as any).user.id;
    const { password, password2 } = req.body as any;
    if (!password || !password2) return reply.code(400).send({ error: 'Missing fields' });
    if (password !== password2) return reply.code(400).send({ error: 'Passwords do not match' });
    const hash = await bcrypt.hash(password, 6);
    await prisma.user.update({ where: { id: userId }, data: { password: hash } });
    reply.send({ success: true });
  });

  // Change avatar (protected)
  fastify.post('/change-avatar', { preHandler: requireAuth() }, async (req, reply) => {
    const userId = (req as any).user.id;
    const { avatar } = req.body as any;
    if (!avatar) return reply.code(400).send({ error: 'Missing avatar' });
    await prisma.user.update({ where: { id: userId }, data: { avatar } });
    reply.send({ success: true });
  });
  // Fixed admin credentials
  const ADMIN_EMAIL = 'admin@diagnostic.com';
  const ADMIN_PASSWORD = 'admin123';
  const ADMIN_NAME = 'Admin';

  fastify.post('/register', async (req, reply) => {
    const { name, email, password } = req.body as any;
    if (!name || !email || !password) return reply.code(400).send({ error: 'Missing fields' });
    // Only allow one admin user with fixed credentials
    if (email === ADMIN_EMAIL) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return reply.code(400).send({ error: 'Admin already exists' });
      if (password !== ADMIN_PASSWORD || name !== ADMIN_NAME) {
        return reply.code(400).send({ error: 'Invalid admin credentials' });
      }
      const hash = await bcrypt.hash(password, 6);
      const user = await prisma.user.create({ data: { name, email, password: hash, role: 'Admin' } });
      return reply.send({ id: user.id, name: user.name, email: user.email, role: user.role });
    }
    // Regular user registration
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return reply.code(400).send({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 6);
    const user = await prisma.user.create({ data: { name, email, password: hash, role: 'User' } });
    reply.send({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  fastify.post('/login', async (req, reply) => {
    const { email, password } = req.body as any;
    // Fixed admin login
    if (email === ADMIN_EMAIL) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return reply.code(401).send({ error: 'Admin not found' });
      if (password !== ADMIN_PASSWORD) return reply.code(401).send({ error: 'Invalid admin credentials' });
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    // Regular user login
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return reply.code(401).send({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    reply.send({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
  // Get current user info (protected)
  fastify.get('/me', { preHandler: requireAuth() }, async (req, reply) => {
    const userId = (req as any).user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    reply.send({ id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar });
  });

  // List all users (admin only)
  fastify.get('/users', { preHandler: requireAuth('Admin') }, async (req, reply) => {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, avatar: true } });
    reply.send(users);
  });

  // Update user (admin only)
  fastify.put('/users/:id', { preHandler: requireAuth('Admin') }, async (req, reply) => {
    const { id } = req.params as any;
    const { name, email, role } = req.body as any;
    try {
      const user = await prisma.user.update({
        where: { id },
        data: { name, email, role }
      });
      reply.send({ success: true, user });
    } catch (err) {
      reply.code(400).send({ error: 'Failed to update user' });
    }
  });

  // Delete user (admin only)
  fastify.delete('/users/:id', { preHandler: requireAuth('Admin') }, async (req, reply) => {
    const { id } = req.params as any;
    try {
      await prisma.user.delete({ where: { id } });
      reply.send({ success: true });
    } catch (err) {
      reply.code(400).send({ error: 'Failed to delete user' });
    }
  });
}
