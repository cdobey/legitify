import { Box } from '@mantine/core';
import { useTheme } from '../contexts/ThemeContext';

interface AuthPageBackgroundProps {
  children?: React.ReactNode;
}

export const AuthPageBackground = ({ children }: AuthPageBackgroundProps) => {
  const { isDarkMode } = useTheme();

  // Page content style - ensures the entire viewport is covered
  const pageStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'auto', // Allow scrolling for taller content
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Box style={pageStyle}>
      {/* Background container */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: -1,
        }}
      >
        {/* Animated gradient background */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: isDarkMode
              ? 'linear-gradient(45deg, #1f2128, #2a2d36, #323642, #1f2128)'
              : 'linear-gradient(45deg, #f4f8fa, #e6f2f9, #e9ecef, #f4f8fa)',
            backgroundSize: '400% 400%',
            animation: 'gradientAnimation 15s ease infinite',
          }}
        />

        {/* Floating shape 1 */}
        <Box
          style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '200px',
            height: '200px',
            borderRadius: '40%',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(44, 166, 211, 0.15), rgba(21, 226, 181, 0.1))'
              : 'linear-gradient(135deg, rgba(34, 145, 214, 0.15), rgba(27, 198, 173, 0.1))',
            animation: 'floatAnimation 8s ease-in-out infinite',
            filter: 'blur(15px)',
          }}
        />

        {/* Floating shape 2 */}
        <Box
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: '250px',
            height: '250px',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(255, 153, 19, 0.15), rgba(255, 71, 87, 0.1))'
              : 'linear-gradient(135deg, rgba(251, 133, 0, 0.15), rgba(255, 71, 87, 0.1))',
            animation: 'floatAnimation 12s ease-in-out infinite reverse',
            filter: 'blur(15px)',
          }}
        />

        {/* Floating shape 3 */}
        <Box
          style={{
            position: 'absolute',
            top: '40%',
            right: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(44, 166, 211, 0.1), rgba(255, 153, 19, 0.1))'
              : 'linear-gradient(135deg, rgba(34, 145, 214, 0.1), rgba(251, 133, 0, 0.1))',
            animation: 'floatAnimation 10s ease-in-out infinite',
            animationDelay: '1s',
            filter: 'blur(15px)',
          }}
        />
      </Box>

      {/* Render children (login/register forms) */}
      {children}
    </Box>
  );
};
