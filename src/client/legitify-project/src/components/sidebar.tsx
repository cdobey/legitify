"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  GraduationCap,
  FileText,
  CheckCircle,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Settings,
  User,
} from "@tabler/icons";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/services/authService";
import {
  NavLink,
  Group,
  UnstyledButton,
  Tooltip,
  MediaQuery,
  useMantineTheme,
  Button,
  Menu as MantineMenu,
} from "@mantine/core";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/issue", label: "Issue Degree", icon: GraduationCap },
  { href: "/request", label: "Request Access", icon: FileText },
  { href: "/verify", label: "Verify Degree", icon: CheckCircle },
  { href: "/my-documents", label: "My Documents", icon: FileText },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, isAuthenticated } = useAuth();
  const theme = useMantineTheme();

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push("/login");
  };

  return (
    <NavLink
      p="md"
      width={{ base: isCollapsed ? 80 : 300 }}
      height="100vh"
      style={{ backgroundColor: theme.colors.dark[8] }}
    >
      <Group position="apart" mb="xl">
        {!isCollapsed && <h1 className="text-2xl font-bold text-white">DegreeVerify</h1>}
        <Button
          variant="subtle"
          size="xs"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ color: theme.colors.gray[0] }}
        >
          {isCollapsed ? <Menu size={20} /> : <X size={20} />}
        </Button>
      </Group>
      <NavLink.Section grow>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} passHref>
            <UnstyledButton
              component="a"
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: theme.spacing.sm,
                color: pathname === item.href ? theme.colors.blue[4] : theme.colors.gray[0],
                backgroundColor: pathname === item.href ? theme.colors.dark[5] : "transparent",
                borderRadius: theme.radius.sm,
                padding: theme.spacing.xs,
              }}
            >
              <item.icon size={20} style={{ marginRight: theme.spacing.sm }} />
              {!isCollapsed && item.label}
            </UnstyledButton>
          </Link>
        ))}
      </NavLink.Section>
      <NavLink.Section>
        {isAuthenticated ? (
          <MantineMenu
            shadow="md"
            width={200}
            withArrow
            position="right"
            style={{ width: "100%" }}
          >
            <MantineMenu.Target>
              <UnstyledButton
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: theme.spacing.xs,
                  color: theme.colors.gray[0],
                }}
              >
                <Group>
                  <User size={20} />
                  {!isCollapsed && (
                    <div>
                      <div>{user?.username}</div>
                      <div style={{ fontSize: theme.fontSizes.xs, color: theme.colors.gray[4] }}>
                        {user?.role}
                      </div>
                    </div>
                  )}
                </Group>
              </UnstyledButton>
            </MantineMenu.Target>
            <MantineMenu.Dropdown>
              <MantineMenu.Label>My Account</MantineMenu.Label>
              <MantineMenu.Item icon={<Settings size={20} />} onClick={() => router.push("/settings")}>
                Settings
              </MantineMenu.Item>
              <MantineMenu.Item icon={<LogOut size={20} />} onClick={handleLogout}>
                Log out
              </MantineMenu.Item>
            </MantineMenu.Dropdown>
          </MantineMenu>
        ) : (
          <Group direction="column" spacing="xs" grow>
            <Button
              variant="outline"
              onClick={() => router.push("/login")}
              style={{ width: "100%", justifyContent: "flex-start", color: theme.colors.gray[0] }}
            >
              <LogIn size={20} style={{ marginRight: theme.spacing.sm }} />
              {!isCollapsed && "Login"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/register")}
              style={{ width: "100%", justifyContent: "flex-start", color: theme.colors.gray[0] }}
            >
              <UserPlus size={20} style={{ marginRight: theme.spacing.sm }} />
              {!isCollapsed && "Register"}
            </Button>
          </Group>
        )}
      </NavLink.Section>
    </NavLink>
  );
}
