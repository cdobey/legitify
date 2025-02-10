import { Request, RequestHandler, Response } from "express";
import admin from "../config/firebase";
import prisma from "../prisma/client";
import { enrollUser } from "../utils/fabric-helpers";

export const register: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, username, role, orgName } = req.body;

    // Validate input
    if (!email || !password || !username || !role || !orgName) {
      res.status(400).json({
        error: "email, password, username, role, and orgName are required",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({
        error:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
      return;
    }

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: username,
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, orgName });

    // Wait a moment for claims to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify claims were set
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    if (!updatedUser.customClaims?.role || !updatedUser.customClaims?.orgName) {
      throw new Error("Failed to set custom claims");
    }

    // Enroll user with Hyperledger Fabric
    await enrollUser(userRecord.uid, orgName);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: userRecord.uid,
        username,
        role,
        orgName,
        email,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      uid: userRecord.uid,
      customClaims: updatedUser.customClaims,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // If Firebase user was created but database creation failed
    if (error.code === "P2002" && error.meta?.target) {
      // Prisma unique constraint error
      try {
        // Clean up Firebase user
        const existingFirebaseUser = await admin
          .auth()
          .getUserByEmail(req.body.email);
        await admin.auth().deleteUser(existingFirebaseUser.uid);
      } catch (cleanupError) {
        console.error("Failed to cleanup Firebase user:", cleanupError);
      }
      res.status(400).json({
        error: `${error.meta.target.join(", ")} already exists`,
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Delete from Firebase
    await admin.auth().deleteUser(uid);

    // Delete from database
    await prisma.user.delete({
      where: { id: uid },
    });

    res.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
