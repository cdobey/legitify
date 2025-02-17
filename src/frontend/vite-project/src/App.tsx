//import React from 'react';
import { Button, Container, Text, Title, Grid, Card, ThemeIcon, Center } from '@mantine/core';
import { IconFileText, IconCircle } from '@tabler/icons-react';

export default function App() {
  return (
    <Container>
      <Center>
        <Title order={1} style={{ marginBottom: '1rem', textAlign: 'center' }}>
          Welcome to the Degree Verification System
        </Title>
      </Center>
      <Text size="lg" style={{ marginBottom: '2rem', textAlign: 'center' }}>
        Securely issue, request, and verify university degrees using blockchain technology.
      </Text>

      <Grid gutter="xl" style={{ marginBottom: '2rem' }}>
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Card.Section>
              <ThemeIcon radius="xl" size="lg" variant="light" style={{ margin: '1rem auto' }}>
                {}
              </ThemeIcon>
            </Card.Section>
            <Title order={3} style={{ textAlign: 'center' }}>
              Issue Degrees
            </Title>
            <Text style={{ textAlign: 'center', margin: '1rem' }}>
              Universities can securely issue digital degrees that are tamper-proof and easily verifiable.
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Card.Section>
              <ThemeIcon radius="xl" size="lg" variant="light" style={{ margin: '1rem auto' }}>
                <IconFileText size={24} />
              </ThemeIcon>
            </Card.Section>
            <Title order={3} style={{ textAlign: 'center' }}>
              Request Access
            </Title>
            <Text style={{ textAlign: 'center', margin: '1rem' }}>
              Graduates can request access to their digital degrees and share them with potential employers.
            </Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg">
            <Card.Section>
              <ThemeIcon radius="xl" size="lg" variant="light" style={{ margin: '1rem auto' }}>
                <IconCircle size={24} />
              </ThemeIcon>
            </Card.Section>
            <Title order={3} style={{ textAlign: 'center' }}>
              Verify Degrees
            </Title>
            <Text style={{ textAlign: 'center', margin: '1rem' }}>
              Employers can instantly verify the authenticity of degrees without contacting universities directly.
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Center>
        <Button component="a" href="/register" size="md" style={{ marginRight: '1rem' }}>
          Get Started
        </Button>
        <Button component="a" href="/about" size="md" variant="outline">
          Learn More
        </Button>
      </Center>
    </Container>
  );
}
