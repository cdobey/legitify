import { http, HttpResponse } from 'msw';

// Define base API URL from environment variables or default
const apiUrl = import.meta.env.VITE_API_URL || '/api';
const mockCreds = [{ id: 'cred-1', title: 'Mock Credential' }];

export const handlers = [
  // --- User Handlers ---
  http.patch(`${apiUrl}/user/profile`, async () => {
    return HttpResponse.json({ message: 'Profile updated successfully' });
  }),
  http.patch(`${apiUrl}/user/password`, async () => {
    return HttpResponse.json({ message: 'Password changed successfully' });
  }),
  http.post(`${apiUrl}/user/profile-picture`, async () => {
    return HttpResponse.json({
      message: 'Profile picture uploaded successfully',
      url: '/mock-profile.jpg',
    });
  }),
  http.delete(`${apiUrl}/user/profile-picture`, async () => {
    return HttpResponse.json({ message: 'Profile picture deleted successfully' });
  }),
  http.post(`${apiUrl}/user/2fa/enable`, async () => {
    return HttpResponse.json({
      qrCode: 'data:image/png;base64,mockedQRCode',
      secret: 'MOCKEDSECRET',
    });
  }),
  http.post(`${apiUrl}/user/2fa/verify`, async () => {
    return HttpResponse.json({ message: '2FA verified successfully' });
  }),
  http.post(`${apiUrl}/user/2fa/disable`, async () => {
    return HttpResponse.json({ message: '2FA disabled successfully' });
  }),

  // --- Issuer Handlers ---
  http.get(`${apiUrl}/issuer/all`, async () => {
    return HttpResponse.json([
      { id: 'uni1', name: 'Issuer 1', displayName: 'Issuer One' },
      { id: 'uni2', name: 'Issuer 2', displayName: 'Issuer Two' },
    ]);
  }),
  http.get(`${apiUrl}/issuer/my`, async () => {
    // Return a sample issuer if needed for tests, or empty array
    return HttpResponse.json([
      {
        id: 'issuer-1',
        name: 'Test Issuer Org',
        shorthand: 'Test Issuer',
        displayName: 'Test Issuer Display',
        description: 'Mock description',
        country: 'Mock Country',
        address: 'Mock Address',
        website: 'https://mock.example.com',
        foundedYear: 2000,
        logoUrl: null, // or 'https://example.com/logo.png'
        affiliations: [],
      },
    ]);
  }),
  http.post(`${apiUrl}/issuer/:issuerId/logo`, async () => {
    return HttpResponse.json({ message: 'Logo uploaded successfully', url: '/mock-logo.png' });
  }),
  http.delete(`${apiUrl}/issuer/:issuerId/logo`, async () => {
    return HttpResponse.json({ message: 'Logo deleted successfully' });
  }),

  // --- Credential Handlers ---
  http.get(`${apiUrl}/credential/my`, async () => {
    return HttpResponse.json(mockCreds);
  }),
  http.get(`/credential/my`, async () => {
    return HttpResponse.json(mockCreds);
  }),
  http.get(`${apiUrl}/credential/list`, async () => {
    return HttpResponse.json(mockCreds);
  }),
  http.get(`/credential/list`, async () => {
    return HttpResponse.json(mockCreds);
  }),
  http.get(`${apiUrl}/credential/requests`, async () => {
    return HttpResponse.json([{ id: 'req-1', status: 'pending' }]);
  }),
  http.get(`${apiUrl}/credential/ledger`, async () => {
    return HttpResponse.json([{ id: 'ledger-1', ledgerTimestamp: new Date().toISOString() }]);
  }),
  http.get(`${apiUrl}/credential/accessible`, async () => {
    return HttpResponse.json([{ id: 'acc-cred-1', holder: { email: 'holder@example.com' } }]);
  }),
  http.get(`${apiUrl}/credential/ledger/all`, async () => {
    return HttpResponse.json([]);
  }),
  http.get(`/credential/ledger/all`, async () => {
    return HttpResponse.json([]);
  }),
];
