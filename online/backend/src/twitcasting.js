const API_BASE = 'https://apiv2.twitcasting.tv';

function authHeader() {
  if (process.env.TWITCASTING_ACCESS_TOKEN) return `Bearer ${process.env.TWITCASTING_ACCESS_TOKEN}`;
  const id = process.env.TWITCASTING_CLIENT_ID || '';
  const secret = process.env.TWITCASTING_CLIENT_SECRET || '';
  if (!id || !secret) return null;
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

export function twitcastingConfigured() {
  return Boolean(process.env.TWITCASTING_USER_ID && authHeader());
}

export async function twitcastingRequest(path, params = {}) {
  const authorization = authHeader();
  if (!authorization) throw new Error('twitcasting_not_configured');
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers: { Accept: 'application/json', 'X-Api-Version': '2.0', Authorization: authorization } });
  if (!response.ok) {
    const error = new Error(`twitcasting_http_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function getCurrentLive() {
  const userId = encodeURIComponent(process.env.TWITCASTING_USER_ID || '');
  if (!userId) throw new Error('twitcasting_user_not_configured');
  return twitcastingRequest(`/users/${userId}/current_live`);
}

export async function getComments(movieId, sliceId) {
  return twitcastingRequest(`/movies/${encodeURIComponent(movieId)}/comments`, { limit: 50, slice_id: sliceId });
}
