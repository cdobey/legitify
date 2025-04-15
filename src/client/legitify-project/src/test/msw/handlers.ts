import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/university/my', () => {
    return HttpResponse.json(
      [{ id: 'uni-1', name: 'Test University', displayName: 'Test University' }],
      { status: 200 },
    );
  }),
  // Example: Mock dashboard data endpoint
  http.get('/api/dashboard', () => {
    return HttpResponse.json(
      {
        stats: { degreesIssued: 5, pendingRequests: 2 },
        myDegrees: [{ id: 1, title: 'BSc Computer Science' }],
        accessRequests: [],
      },
      { status: 200 },
    );
  }),

  // Example: Mock login endpoint
  http.post('/api/auth/login', () => {
    return HttpResponse.json(
      { user: { username: 'testuser', role: 'individual' } },
      { status: 200 },
    );
  }),
];
