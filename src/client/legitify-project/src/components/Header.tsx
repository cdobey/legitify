import {
  AppShell,
  Button,
  Container,
  Group,
  Menu,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconLogout, IconUser } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <AppShell.Header style={{ height: 60 }}>
      <Container size="lg" style={{ height: "100%" }}>
        <Group justify="space-between" style={{ height: "100%" }}>
          <Text
            fw={700}
            size="lg"
            component={Link}
            to="/"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            LegitifyDegree
          </Text>

          <Group>
            {user ? (
              <Menu position="bottom-end">
                <Menu.Target>
                  <UnstyledButton>
                    <Group gap={8}>
                      <IconUser size={20} />
                      <Text size="sm">{user.username || user.email}</Text>
                      <IconChevronDown size={16} />
                    </Group>
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item fw={500}>
                    Role:{" "}
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLogout size={14} />}
                    onClick={handleLogout}
                    color="red"
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            ) : (
              <Group>
                <Button variant="outline" component={Link} to="/login">
                  Login
                </Button>
                <Button component={Link} to="/register">
                  Register
                </Button>
              </Group>
            )}
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
};

export default Header;
