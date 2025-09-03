import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export function requireAuth(role?: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    try {
      const token = auth.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (role && payload.role !== role) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      (req as any).user = payload;
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  };
}
