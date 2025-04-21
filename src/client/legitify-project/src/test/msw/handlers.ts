import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/issuer/my', () => {
    return HttpResponse.json([{ id: 'uni-1', name: 'Test Issuer', displayName: 'Test Issuer' }], {
      status: 200,
    });
  }),
  // Example: Mock dashboard data endpoint
  http.get('/api/dashboard', () => {
    return HttpResponse.json(
      {
        stats: { credentialsIssued: 5, pendingRequests: 2 },
        myCredentials: [{ id: 1, title: 'BSc Computer Science' }],
        accessRequests: [],
      },
      { status: 200 },
    );
  }),

  // Example: Mock login endpoint
  http.post('/api/auth/login', () => {
    return HttpResponse.json({ user: { username: 'testuser', role: 'holder' } }, { status: 200 });
  }),
];
