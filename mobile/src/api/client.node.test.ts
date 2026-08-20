import { apiClient } from './client';

test('reaches the backend health endpoint', async () => {
  const response = await apiClient.get('/api/v1/health');

  expect(response.status).toBe(200);
  expect(response.data).toEqual({ status: 'ok' });
});
