import supabase from '@/config/supabase'; // Import supabase client
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { Role } from '@prisma/client';
import { RequestHandler, Response } from 'express';

/**
 * Retrieves user profile information.
 */
export const getProfile: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        role: true,
        orgName: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('getProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Updates the current user's profile information (username, email, firstName, lastName, country).
 */
export const updateProfile: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { username, email, firstName, lastName, country } = req.body;

    // Validate input: at least one field must be provided
    if (!username && !email && !firstName && !lastName && !country) {
      res.status(400).json({ error: 'At least one profile field must be provided for update' });
      return;
    }

    const updateData: {
      username?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      country?: string;
    } = {};
    let updateSupabaseEmail = false;

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Validate and prepare username update
    if (username && username !== currentUser.username) {
      // Check if username is already taken
      const existingUserByUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUserByUsername && existingUserByUsername.id !== userId) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
      updateData.username = username;
    }

    // Validate and prepare email update
    if (email && email !== currentUser.email) {
      // Basic email format validation
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }
      // Check if email is already taken
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUserByEmail && existingUserByEmail.id !== userId) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }
      updateData.email = email;
      updateSupabaseEmail = true;
    }

    // Add firstName, lastName, and country to updateData if provided
    if (firstName !== undefined) {
      updateData.firstName = firstName;
    }

    if (lastName !== undefined) {
      updateData.lastName = lastName;
    }

    if (country !== undefined) {
      updateData.country = country;
    }

    // Update Supabase Auth email if necessary
    if (updateSupabaseEmail && updateData.email) {
      const { error: supabaseError } = await supabase.auth.admin.updateUserById(userId, {
        email: updateData.email,
        // Consider email_confirm: true if you want users to re-verify
      });

      if (supabaseError) {
        console.error('Supabase email update error:', supabaseError);
        // Check for specific Supabase errors if needed
        if (supabaseError.message.includes('duplicate key value violates unique constraint')) {
          res.status(400).json({ error: 'Email already registered in authentication system.' });
        } else {
          res.status(500).json({ error: 'Failed to update email in authentication system' });
        }
        return;
      }
    }

    // Update user in Prisma database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        role: true,
        orgName: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('updateProfile error:', error);
    // Handle potential Prisma unique constraint errors explicitly if needed
    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      let field = error.meta?.target?.[0];
      res.status(400).json({ error: `The ${field} is already taken.` });
    } else {
      res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
  }
};

/**
 * Changes the current user's password.
 */
export const changePassword: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    // Fetch user email from DB to verify current password with Supabase
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      // Check if it's specifically an invalid login credentials error
      if (signInError.message.includes('Invalid login credentials')) {
        res.status(400).json({ error: 'Incorrect current password' });
      } else {
        console.error('Supabase sign-in error during password check:', signInError);
        res.status(500).json({ error: 'Failed to verify current password' });
      }
      return;
    }

    // If sign-in was successful, update the password in Supabase Auth
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error('Supabase password update error:', updateError);
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('changePassword error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message });
  }
};

export const searchUsers: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.query;
    if (!email) {
      res.status(400).json({ error: 'Email query parameter is required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.toString(),
        role: Role.holder, // Changed from holder to holder
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      uid: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (error: any) {
    console.error('searchUsers error:', error);
    res.status(500).json({ error: error.message });
  }
};
