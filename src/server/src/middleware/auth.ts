import { NextFunction, Request, Response } from "express";
import admin from "../config/firebase";

// Define the shape of the Firebase auth payload
interface AuthUser {
  uid: string;
  role?: string;
  orgName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    // Get fresh user record to ensure we have latest claims
    const userRecord = await admin.auth().getUser(decodedToken.uid);

    if (!userRecord.customClaims?.role || !userRecord.customClaims?.orgName) {
      console.error("Missing claims for user:", userRecord.uid);
      res.status(403).json({ error: "User missing required claims" });
      return;
    }

    req.user = {
      uid: decodedToken.uid,
      role: userRecord.customClaims.role,
      orgName: userRecord.customClaims.orgName,
    };

    console.log("Authenticated user:", {
      uid: req.user.uid,
      role: req.user.role,
      orgName: req.user.orgName,
      tokenIssued: new Date(decodedToken.iat * 1000).toISOString(),
      tokenExpires: new Date(decodedToken.exp * 1000).toISOString(),
    });

    next();
  } catch (error: any) {
    console.error("Auth middleware error:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    res.status(401).json({
      error: "Authentication failed",
      message: error.message,
      code: error.code,
    });
  }
};
