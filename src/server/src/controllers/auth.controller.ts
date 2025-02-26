import { Request, RequestHandler, Response } from "express";
import supabase from "../config/supabase";
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          username,
          role,
          orgName,
        },
        email_confirm: true, // Auto-confirm the email
      });

    if (authError || !authData.user) {
      throw authError || new Error("Failed to create user in Supabase");
    }

    const userId = authData.user.id;

    // Enroll user with Hyperledger Fabric
    await enrollUser(userId, orgName);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: userId,
        username,
        role,
        orgName,
        email,
      },
    });

    res.status(201).json({
      message: "User created successfully",
      uid: userId,
      metadata: authData.user.user_metadata,
    });
  } catch (error: any) {
    console.error("Registration error:", error);

    // If Supabase user was created but database creation failed
    if (error.code === "P2002" && error.meta?.target) {
      // Prisma unique constraint error
      try {
        // Since we can't directly filter users in Supabase admin API,
        // we'll need to search for the user in our database first
        const userEmail = req.body.email;
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (dbUser?.id) {
          // Now delete the user from Supabase
          await supabase.auth.admin.deleteUser(dbUser.id);
        }
      } catch (cleanupError) {
        console.error("Failed to cleanup Supabase user:", cleanupError);
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

    // Delete from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) throw error;

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
