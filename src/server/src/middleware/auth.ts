import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  sub: string;
  username: string; // Add the username property
  role: string;
  orgName: string;
  iat: number;
  exp: number;
}

// Extend Express's Request type to hold user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  try {
    const token = authHeader.replace(/^Bearer\s+/, "");
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback"
    ) as JwtPayload;

    // Attach the user to req
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
