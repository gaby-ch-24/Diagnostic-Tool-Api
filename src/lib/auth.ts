import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export function requireAuth(role?: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers["authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const token = auth.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as any;
      if (role && payload.role !== role) {
        return res.status(403).json({ error: "Forbidden" });
      }
      (req as any).user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
