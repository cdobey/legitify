import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import prisma from '../prisma/client';

// Mock external dependencies
vi.mock('@/config/supabase', () => ({
  default: {
    auth: {
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
      signInWithPassword: vi.fn(),
      getUser: vi.fn(),
    },
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [] }),
      getBucket: vi.fn().mockResolvedValue({ data: null }),
      createBucket: vi.fn().mockResolvedValue({ data: { name: 'test-bucket' } }),
      updateBucket: vi.fn().mockResolvedValue({ data: { name: 'test-bucket' } }),
    },
  },
}));

vi.mock('@/utils/fabric-helpers', () => ({
  enrollUser: vi.fn().mockResolvedValue({}),
}));

// Mock storage initialization
vi.mock('@/utils/storage/supabase-storage', () => ({
  initStorageBuckets: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

// TODO: Add a test database or some other common setup stuff
beforeAll(async () => {});

afterAll(async () => {
  await prisma.$disconnect();
});
