import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import app from '../../app';

// Mock the initStorageBuckets function to prevent actual API calls during tests
vi.mock('../../utils/storage/supabase-storage', () => ({
  initStorageBuckets: vi.fn().mockResolvedValue(true),
}));

describe('Health Routes', () => {
  it('should return 200 and online status for backend health check', async () => {
    const response = await request(app).get('/status/backend');

    expect(response.status).toBe(200);
    expect(response.body.online).toBe(true);
    expect(response.body.service).toBe('backend');
  });
});
