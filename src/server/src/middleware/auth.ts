import { NextFunction, Request, Response } from "express";

import jwt from "jsonwebtoken";

interface AuthPayload {
  userId: string;
  username: string;
  role: string;
  orgName: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "No token provided." });
    return;
  }

  const token = authHeader.replace(/^Bearer\s+/, "");

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallbacksecret"
    ) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
};
