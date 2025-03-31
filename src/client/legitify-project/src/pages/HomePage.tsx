import {
  Accordion,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Grid,
  Group,
  Image,
  List,
  Stack,
  Text,
  ThemeIcon,
  Title,
  useMantineTheme,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCertificate,
  IconCheck,
  IconFileCheck,
  IconLock,
  IconReceipt,
  IconShield,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const theme = useMantineTheme();

  const renderHeroSection = () => (
    <Box
      py={80}
      style={{
        background: `linear-gradient(120deg, ${theme.colors.primaryBlue[6]} 0%, ${theme.colors.accentTeal[5]} 100%)`,
        borderRadius: '0', // Remove border radius from top
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration elements */}
      <Box
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 1,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          zIndex: 1,
        }}
      />

      <Container size="xl" style={{ position: 'relative', zIndex: 2 }}>
        <Grid gutter={50}>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="xl" style={{ color: 'white' }}>
              <Title
                order={1}
                size={56}
                fw={800}
                style={{ lineHeight: 1.2, letterSpacing: '-1px' }}
              >
                Secure Degree Verification{' '}
                <Text
                  span
                  inherit
                  variant="gradient"
                  gradient={{ from: theme.colors.accentAmber[5], to: 'white' }}
                >
                  Using Blockchain
                </Text>
              </Title>
              <Text
                size="xl"
                style={{ maxWidth: 600, fontSize: '1.25rem', lineHeight: 1.6, opacity: 0.9 }}
              >
                LegiTify transforms how academic credentials are issued, shared, and verified with
                our cutting-edge blockchain solution.
              </Text>
              <Group mt="xl">
                {!user ? (
                  <>
                    <Button
                      component={Link}
                      to="/register"
                      size="lg"
                      variant="white"
                      color="primaryBlue"
                      rightSection={<IconArrowRight size={18} />}
                      radius="xl"
                      px="xl"
                      style={{ boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' }}
                    >
                      Get Started
                    </Button>
                    <Button
                      component={Link}
                      to="/login"
                      size="lg"
                      variant="outline"
                      color="white"
                      radius="xl"
                      px="xl"
                      style={{ backdropFilter: 'blur(8px)' }}
                    >
                      Log In
                    </Button>
                  </>
                ) : (
                  <>
                    {user.role === 'university' && (
                      <Button
                        component={Link}
                        to="/degree/issue"
                        size="lg"
                        variant="white"
                        color="primaryBlue"
                        radius="xl"
                        px="xl"
                        rightSection={<IconArrowRight size={18} />}
                        style={{ boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' }}
                      >
                        Issue New Degree
                      </Button>
                    )}
                    {user.role === 'individual' && (
                      <>
                        <Button
                          component={Link}
                          to="/degree/manage"
                          size="lg"
                          variant="white"
                          color="primaryBlue"
                          radius="xl"
                          px="xl"
                          rightSection={<IconArrowRight size={18} />}
                          style={{ boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' }}
                        >
                          Manage Degrees
                        </Button>
                        <Button
                          component={Link}
                          to="/degree/requests"
                          size="lg"
                          variant="outline"
                          color="white"
                          radius="xl"
                          px="xl"
                          style={{ backdropFilter: 'blur(8px)' }}
                        >
                          View Access Requests
                        </Button>
                      </>
                    )}
                    {user.role === 'employer' && (
                      <Button
                        component={Link}
                        to="/degree/verify"
                        size="lg"
                        variant="white"
                        color="primaryBlue"
                        radius="xl"
                        px="xl"
                        rightSection={<IconArrowRight size={18} />}
                        style={{ boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' }}
                      >
                        Verify Degrees
                      </Button>
                    )}
                  </>
                )}
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }} style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="../public/online-certificate.jpg"
              alt="Digital Degree Certification"
              radius="lg"
              style={{
                maxWidth: '100%',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                border: '4px solid rgba(255, 255, 255, 0.2)',
              }}
            />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );

  const renderFeatures = () => (
    <Container size="xl" py={80}>
      <Title order={2} ta="center" mb={20} c="primaryBlue" size={36} fw={700}>
        How LegiTify Works
      </Title>
      <Text ta="center" size="lg" c="dimmed" maw={700} mx="auto" mb={50}>
        Our platform simplifies credential verification through blockchain technology, creating a
        secure and transparent ecosystem for all stakeholders.
      </Text>

      <Grid gutter={30}>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            shadow="md"
            p="xl"
            radius="lg"
            withBorder
            h="100%"
            style={{
              borderTop: `4px solid ${theme.colors.primaryBlue[6]}`,
            }}
          >
            <ThemeIcon size={70} radius="md" variant="light" color="primaryBlue" mb="md">
              <IconCertificate size={36} />
            </ThemeIcon>
            <Title order={3} mb="sm" fw={600} c="primaryBlue">
              Issue Degrees
            </Title>
            <Text c="dimmed" size="md" lh={1.6}>
              Universities can securely issue digital degrees that are tamper-proof and easily
              verifiable on the blockchain, eliminating the risk of fraud.
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            shadow="md"
            p="xl"
            radius="lg"
            withBorder
            h="100%"
            style={{
              borderTop: `4px solid ${theme.colors.accentTeal[6]}`,
            }}
          >
            <ThemeIcon size={70} radius="md" variant="light" color="accentTeal" mb="md">
              <IconFileCheck size={36} />
            </ThemeIcon>
            <Title order={3} mb="sm" fw={600} c={theme.colors.accentTeal[7]}>
              Request Access
            </Title>
            <Text c="dimmed" size="md" lh={1.6}>
              Graduates can securely access and share their digital degrees with potential employers
              through our platform, maintaining full control over their credentials.
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card
            shadow="md"
            p="xl"
            radius="lg"
            withBorder
            h="100%"
            style={{
              borderTop: `4px solid ${theme.colors.accentAmber[6]}`,
            }}
          >
            <ThemeIcon size={70} radius="md" variant="light" color="accentAmber" mb="md">
              <IconCheck size={36} />
            </ThemeIcon>
            <Title order={3} mb="sm" fw={600} c={theme.colors.accentAmber[7]}>
              Verify Degrees
            </Title>
            <Text c="dimmed" size="md" lh={1.6}>
              Employers can instantly verify the authenticity of degrees using our blockchain-based
              verification system, saving time and ensuring credential integrity.
            </Text>
          </Card>
        </Grid.Col>
      </Grid>
    </Container>
  );

  const renderBenefits = () => (
    <Box
      py={80}
      style={{
        backgroundColor: 'rgb(236, 242, 250)',
        borderRadius: '30px',
        margin: '0 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Add subtle pattern */}
      <div
        className="pattern-diagonal"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          zIndex: 1,
        }}
      />

      <Container size="xl" style={{ position: 'relative', zIndex: 2 }}>
        <Grid gutter={60} align="center">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Title order={2} mb={30} c="primaryBlue" size={36} fw={700}>
              Why Choose LegiTify?
            </Title>

            <List
              spacing="lg"
              size="lg"
              center
              icon={
                <ThemeIcon
                  color="primaryBlue"
                  radius="xl"
                  size={30}
                  style={{ boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                >
                  <IconCheck size={18} />
                </ThemeIcon>
              }
              styles={{
                item: {
                  marginBottom: 20,
                },
              }}
            >
              <List.Item>
                <Text fw={600} size="lg" mb={5} c={theme.colors.primaryBlue[7]}>
                  Secure & Tamper-Proof
                </Text>
                <Text size="md" c="dimmed" lh={1.6}>
                  Credentials are securely stored on the blockchain, making them impossible to forge
                  or tamper with, ensuring lifelong validity.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="lg" mb={5} c={theme.colors.primaryBlue[7]}>
                  Instant Verification
                </Text>
                <Text size="md" c="dimmed" lh={1.6}>
                  Employers can verify credentials in seconds, not days or weeks, streamlining the
                  hiring process and reducing administrative overhead.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="lg" mb={5} c={theme.colors.primaryBlue[7]}>
                  User Control
                </Text>
                <Text size="md" c="dimmed" lh={1.6}>
                  Graduates maintain full control over who can access their credentials, with
                  detailed permissions and revocation capabilities.
                </Text>
              </List.Item>
              <List.Item>
                <Text fw={600} size="lg" mb={5} c={theme.colors.primaryBlue[7]}>
                  Trusted Network
                </Text>
                <Text size="md" c="dimmed" lh={1.6}>
                  Our platform connects legitimate educational institutions, graduates, and
                  employers in a secure, transparent ecosystem.
                </Text>
              </List.Item>
            </List>

            <Button
              component={Link}
              to={
                user
                  ? `/${
                      user.role === 'university'
                        ? 'degree/issue'
                        : user.role === 'individual'
                        ? 'degree/manage'
                        : 'degree/verify'
                    }`
                  : '/register'
              }
              mt="xl"
              size="lg"
              radius="xl"
              color="primaryBlue"
              rightSection={<IconArrowRight size={18} />}
              style={{ paddingLeft: 25, paddingRight: 25 }}
            >
              {user ? 'Go to Dashboard' : 'Get Started Now'}
            </Button>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Flex gap="md" direction="column">
              <Card
                shadow="md"
                p="lg"
                radius="lg"
                withBorder
                style={{
                  transform: 'translateY(-10px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                <Group>
                  <ThemeIcon size={56} radius="xl" color="primaryBlue" variant="light">
                    <IconShield size={28} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="lg" c={theme.colors.primaryBlue[7]}>
                      Enhanced Security
                    </Text>
                    <Text size="md" c="dimmed" lh={1.6}>
                      Military-grade encryption and blockchain verification protect your credentials
                      from unauthorized access
                    </Text>
                  </Box>
                </Group>
              </Card>

              <Card
                shadow="md"
                p="lg"
                radius="lg"
                withBorder
                style={{
                  transform: 'translateY(0px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                <Group>
                  <ThemeIcon size={56} radius="xl" color="accentTeal" variant="light">
                    <IconReceipt size={28} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="lg" c={theme.colors.accentTeal[7]}>
                      Transparent Process
                    </Text>
                    <Text size="md" c="dimmed" lh={1.6}>
                      Full auditability of credential issuance and verification with comprehensive
                      activity logs
                    </Text>
                  </Box>
                </Group>
              </Card>

              <Card
                shadow="md"
                p="lg"
                radius="lg"
                withBorder
                style={{
                  transform: 'translateY(10px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                <Group>
                  <ThemeIcon size={56} radius="xl" color="accentAmber" variant="light">
                    <IconLock size={28} />
                  </ThemeIcon>
                  <Box>
                    <Text fw={600} size="lg" c={theme.colors.accentAmber[7]}>
                      Privacy First
                    </Text>
                    <Text size="md" c="dimmed" lh={1.6}>
                      Your data belongs to you, with granular control over what you share and with
                      whom
                    </Text>
                  </Box>
                </Group>
              </Card>
            </Flex>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );

  const renderFAQ = () => (
    <Container size="xl" py={80}>
      {/* Add subtle background pattern */}
      <Box style={{ position: 'relative' }}>
        <div
          className="pattern-dots"
          style={{
            position: 'absolute',
            top: 0,
            left: -30,
            width: 180,
            height: 180,
            opacity: 0.2,
            borderRadius: '50%',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Title order={2} ta="center" mb={20} c="primaryBlue" size={36} fw={700}>
            Frequently Asked Questions
          </Title>
          <Text ta="center" size="lg" c="dimmed" maw={700} mx="auto" mb={50}>
            Find answers to common questions about our blockchain-powered degree verification
            platform
          </Text>
        </div>
      </Box>

      <Accordion
        variant="separated"
        radius="md"
        styles={{
          item: {
            marginBottom: 16,
            borderRadius: 12,
            border: `1px solid ${theme.colors.gray[2]}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.03)',
          },
          control: {
            padding: '16px 20px',
          },
          content: {
            padding: '0 20px 20px',
          },
        }}
      >
        <Accordion.Item value="what-is-legitify">
          <Accordion.Control>
            <Text fw={600} size="lg">
              What is LegiTify?
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="md" c="dimmed" lh={1.6}>
              LegiTify is a blockchain-based degree verification system that allows universities to
              issue digital degrees, graduates to manage and share them, and employers to instantly
              verify their authenticity. Our platform eliminates credential fraud and streamlines
              the verification process using secure, tamper-proof blockchain technology.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="how-secure">
          <Accordion.Control>
            <Text fw={600} size="lg">
              How secure are the digital credentials?
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="md" c="dimmed" lh={1.6}>
              Our system uses blockchain technology to create tamper-proof records of credentials.
              Once a degree is issued, it cannot be altered, providing the highest level of security
              and trust for all parties involved. We employ multiple layers of encryption and secure
              access controls to ensure your credentials remain protected at all times.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="who-can-use">
          <Accordion.Control>
            <Text fw={600} size="lg">
              Who can use LegiTify?
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="md" c="dimmed" lh={1.6}>
              LegiTify serves three main user types: universities that issue degrees, individuals
              who receive and manage their credentials, and employers who need to verify the
              authenticity of applicants' degrees. Each user type has a dedicated interface designed
              to address their specific needs, creating a seamless experience across the credential
              ecosystem.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="how-verify">
          <Accordion.Control>
            <Text fw={600} size="lg">
              How does degree verification work?
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Text size="md" c="dimmed" lh={1.6}>
              Employers can request access to a candidate's degree. Once granted, they can view the
              degree details and verify its authenticity through our blockchain verification system,
              which confirms the credential was legitimately issued by the university. The entire
              process takes seconds rather than days or weeks required by traditional verification
              methods.
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Container>
  );

  const renderCTA = () => (
    <Box
      py={80}
      style={{
        background: `linear-gradient(120deg, ${theme.colors.primaryBlue[6]} 0%, ${theme.colors.accentTeal[5]} 100%)`,
        borderRadius: '30px 30px 0 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background elements */}
      <Box
        style={{
          position: 'absolute',
          top: '20%',
          right: '5%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          zIndex: 1,
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          zIndex: 1,
        }}
      />

      <Container size="xl" ta="center" style={{ position: 'relative', zIndex: 2 }}>
        <Title order={2} c="white" mb={20} size={40} fw={800}>
          Ready to transform credential verification?
        </Title>
        <Text c="white" size="xl" maw={700} mx="auto" mb={40} opacity={0.9} lh={1.6}>
          Join LegiTify today and be part of the future of secure, efficient credential management.
        </Text>

        <Group justify="center" gap="md">
          <Button
            component={Link}
            to="/register"
            size="lg"
            variant="white"
            color="primaryBlue"
            radius="xl"
            px="xl"
            style={{ boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' }}
            rightSection={<IconArrowRight size={18} />}
          >
            Create an Account
          </Button>
          <Button
            component={Link}
            to="/about"
            size="lg"
            variant="outline"
            color="white"
            radius="xl"
            px="xl"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            Learn More
          </Button>
        </Group>
      </Container>
    </Box>
  );

  return (
    <Box style={{ overflow: 'hidden', margin: 0, padding: 0 }}>
      {renderHeroSection()}
      {renderFeatures()}
      <Divider my={0} variant="dashed" style={{ opacity: 0.3 }} />
      {renderBenefits()}
      <Divider my={0} variant="dashed" style={{ opacity: 0.3 }} />
      {renderFAQ()}
      {!user && renderCTA()}
    </Box>
  );
}
