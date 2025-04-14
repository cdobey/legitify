import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { generateTOTP, verifyTOTP } from '@/utils/totp';
import { Response } from 'express';

/**
 * Generate a new TOTP secret and QR code for the user
 */
export const enableTwoFactor = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;

    // Check if user already has 2FA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, username: true, email: true },
    });

    if (user?.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is already enabled' });
      return;
    }

    // Generate new TOTP secret
    const { secret, qrCode } = await generateTOTP(
      user?.email || userId,
      user?.username || 'user',
      'Legitify',
    );

    // Store the secret temporarily (not enabled yet, will be saved on verification)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
      },
    });

    res.status(200).json({ secret, qrCode });
  } catch (error: any) {
    console.error('enableTwoFactor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify a TOTP token and enable 2FA for the user
 */
export const verifyTwoFactor = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    // Get user's temporary secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (user?.twoFactorEnabled) {
      res.status(400).json({ error: 'Two-factor authentication is already enabled' });
      return;
    }

    if (!user?.twoFactorSecret) {
      res
        .status(400)
        .json({ error: 'No two-factor secret found. Please restart the setup process.' });
      return;
    }

    // Verify the token
    const isValid = verifyTOTP(user.twoFactorSecret, token);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Enable 2FA for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    res.status(200).json({ message: 'Two-factor authentication has been enabled successfully' });
  } catch (error: any) {
    console.error('verifyTwoFactor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Disable 2FA for the user after verifying their token
 */
export const disableTwoFactor = async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    // Get user's 2FA settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
      res.status(400).json({ error: 'Two-factor authentication is not enabled' });
      return;
    }

    // Verify the token
    const isValid = verifyTOTP(user.twoFactorSecret, token);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Disable 2FA for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.status(200).json({ message: 'Two-factor authentication has been disabled successfully' });
  } catch (error: any) {
    console.error('disableTwoFactor error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
