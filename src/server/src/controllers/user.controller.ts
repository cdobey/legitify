import { Request, RequestHandler, Response } from "express";

import prisma from "../prisma/client";

/**
 * Retrieves user profile information.
 */
export const getProfile: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        orgName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error("getProfile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
