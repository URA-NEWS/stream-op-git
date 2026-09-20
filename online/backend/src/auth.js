import { timingSafeEqual } from 'node:crypto';

function constantTimeEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));
  if (!actualBuffer.length || actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function bearerToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function requireBearer(req, res, envName) {
  const expected = process.env[envName] || '';
  if (expected.length < 24) {
    res.status(503).json({ ok: false, error: `${envName.toLowerCase()}_not_configured` });
    return false;
  }
  if (!constantTimeEqual(bearerToken(req), expected)) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

export function requireSceneTokenIfConfigured(req, res) {
  const expected = process.env.SCENE_READ_TOKEN || '';
  if (!expected) return true;
  const token = bearerToken(req) || String(req.query.token || '').trim();
  if (!constantTimeEqual(token, expected)) {
    res.status(401).json({ ok: false, error: 'scene_token_required' });
    return false;
  }
  return true;
}
