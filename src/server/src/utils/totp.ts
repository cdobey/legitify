import { authenticator } from 'otplib';
import qrcode from 'qrcode';

/**
 * Generate a new TOTP secret and QR code
 *
 * @param accountName User identifier (typically email)
 * @param accountLabel Username or display name
 * @param issuer App name
 * @returns Object containing the secret key and QR code as data URL
 */
export const generateTOTP = async (
  accountName: string,
  accountLabel: string,
  issuer: string,
): Promise<{ secret: string; qrCode: string }> => {
  // Generate a random secret
  const secret = authenticator.generateSecret();

  // Generate the otpauth URL
  const otpauthUrl = authenticator.keyuri(accountName, issuer, secret);

  // Generate QR code as data URL
  const qrCode = await qrcode.toDataURL(otpauthUrl);

  return { secret, qrCode };
};

/**
 * Verify a TOTP token against a secret
 *
 * @param secret The TOTP secret key
 * @param token The token to verify
 * @returns Boolean indicating whether the token is valid
 */
export const verifyTOTP = (secret: string, token: string): boolean => {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
};
