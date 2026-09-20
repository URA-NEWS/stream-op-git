import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getComments, getCurrentLive, twitcastingConfigured } from './twitcasting.js';
import { cleanReply, generateText } from './llm.js';
import { buildIkoeruPrompt, fallbackReply } from './reply-policy.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({ ok: false, error: 'supabase_not_configured' });
    return false;
  }
  return true;
}

function publicConfigState() {
  return {
    supabase: Boolean(supabase),
    twitcasting: twitcastingConfigured(),
    llm: Boolean(process.env.LLM_PROVIDER && process.env.LLM_API_KEY),
    tts: Boolean(process.env.TTS_PROVIDER && process.env.TTS_API_KEY),
  };
}

app.get('/api/health', async (_req, res) => {
  const configured = publicConfigState();
  let database = 'not_configured';
  if (supabase) {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    database = error ? 'error' : 'ready';
  }
  res.json({ ok: true, service: 'ikoeru-ai-online', database, configured });
});

app.post('/api/integrations/twitcasting/test', async (_req, res) => {
  if (!twitcastingConfigured()) return res.status(503).json({ ok: false, error: 'twitcasting_not_configured' });
  try {
    const live = await getCurrentLive();
    const movie = live.movie || null;
    res.json({ ok: true, state: movie?.is_live ? 'connected' : 'offline', movie_id: movie?.id || null });
  } catch (error) {
    res.status(error.status === 404 ? 404 : 502).json({ ok: false, error: error.message || 'twitcasting_test_failed' });
  }
});

app.post('/api/jobs/twitcasting/poll', async (_req, res) => {
  if (!requireSupabase(res)) return;
  if (!twitcastingConfigured()) return res.status(503).json({ ok: false, error: 'twitcasting_not_configured' });
  try {
    const live = await getCurrentLive();
    const movie = live.movie || {};
    if (!movie.is_live) return res.json({ ok: true, state: 'offline', inserted: 0 });
    const streamResult = await supabase.from('streams').select('*').eq('platform', 'twitcasting').eq('external_user_id', process.env.TWITCASTING_USER_ID).limit(1).single();
    if (streamResult.error || !streamResult.data) return res.status(404).json({ ok: false, error: 'stream_not_found' });
    const stream = streamResult.data;
    if (stream.emergency_stop) return res.json({ ok: true, state: 'emergency_stop', inserted: 0 });
    const previous = stream.last_cursor?.movie_id === String(movie.id) ? stream.last_cursor?.comment_id : undefined;
    const commentsPayload = await getComments(movie.id, previous);
    const comments = [...(commentsPayload.comments || [])].sort((a, b) => Number(a.id) - Number(b.id));
    if (!previous) {
      const lastId = comments.at(-1)?.id || '0';
      await supabase.from('streams').update({ status: 'connected', last_cursor: { movie_id: String(movie.id), comment_id: String(lastId) }, updated_at: new Date().toISOString() }).eq('id', stream.id);
      return res.json({ ok: true, state: 'baseline', inserted: 0, movie_id: movie.id });
    }
    const rows = comments.filter(item => Number(item.id) > Number(previous)).filter(item => String(item.from_user?.id || '') !== String(movie.user_id)).map(item => ({ stream_id: stream.id, platform: 'twitcasting', external_comment_id: String(item.id), viewer_external_id: String(item.from_user?.id || ''), viewer_name: item.from_user?.screen_id || item.from_user?.name || 'viewer', body: String(item.message || '') }));
    if (rows.length) await supabase.from('comments').upsert(rows, { onConflict: 'stream_id,platform,external_comment_id', ignoreDuplicates: true });
    const lastId = comments.at(-1)?.id || previous;
    await supabase.from('streams').update({ status: 'connected', last_cursor: { movie_id: String(movie.id), comment_id: String(lastId) }, updated_at: new Date().toISOString() }).eq('id', stream.id);
    res.json({ ok: true, state: 'connected', inserted: rows.length, movie_id: movie.id });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message || 'twitcasting_poll_failed' });
  }
});

app.post('/api/jobs/replies/generate', async (_req, res) => {
  if (!requireSupabase(res)) return;
  const { data: comments, error } = await supabase.from('comments').select('*').order('received_at', { ascending: true }).limit(10);
  if (error) return res.status(500).json({ ok: false, error: 'comment_query_failed' });
  let generated = 0;
  for (const comment of comments || []) {
    const existing = await supabase.from('replies').select('id').eq('comment_id', comment.id).limit(1).maybeSingle();
    if (existing.data) continue;
    const streamResult = await supabase.from('streams').select('*').eq('id', comment.stream_id).single();
    const stream = streamResult.data;
    if (!stream || stream.emergency_stop) continue;
    const characterId = stream.character_id;
    const { data: character } = await supabase.from('characters').select('*').eq('id', characterId).single();
    const prompt = buildIkoeruPrompt({ character, comment: comment.body, viewerName: comment.viewer_name });
    let reply = '';
    try {
      reply = cleanReply(await generateText(prompt), Number(process.env.MAX_REPLY_CHARS || 180));
    } catch (_error) {
      reply = fallbackReply(comment.body);
    }
    if (!reply) reply = fallbackReply(comment.body);
    const insert = { stream_id: comment.stream_id, comment_id: comment.id, character_id: characterId, reply, model: process.env.LLM_MODEL || process.env.LLM_PROVIDER || 'fallback', status: 'queued' };
    const result = await supabase.from('replies').insert(insert);
    if (!result.error) generated += 1;
  }
  res.json({ ok: true, generated });
});

app.get('/api/characters/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { data, error } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ ok: false, error: 'character_not_found' });
  res.json({ ok: true, character: data });
});

app.get('/api/scene/events', async (req, res) => {
  if (!requireSupabase(res)) return;
  const after = Number(req.query.after || 0);
  const streamId = String(req.query.stream_id || '');
  if (!Number.isFinite(after) || after < 0) return res.status(400).json({ ok: false, error: 'invalid_cursor' });
  let query = supabase.from('replies').select('id,reply,audio_url,created_at,status').eq('status', 'queued').order('created_at', { ascending: true }).limit(10);
  if (streamId) query = query.eq('stream_id', streamId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ ok: false, error: 'event_query_failed' });
  const events = (data || []).map((item, index) => ({ id: after + index + 1, reply: item.reply, audio_url: item.audio_url, duration_ms: Math.max(2200, Math.min(12000, item.reply.length * 130)) }));
  res.json({ ok: true, cursor: after + events.length, events });
});

app.post('/api/streams/:id/emergency-stop', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from('streams').update({ emergency_stop: true, status: 'emergency_stop', updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: 'emergency_stop_failed' });
  res.json({ ok: true, emergency_stop: true });
});

app.post('/api/streams/:id/resume', async (req, res) => {
  if (!requireSupabase(res)) return;
  const { error } = await supabase.from('streams').update({ emergency_stop: false, status: 'offline', updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: 'resume_failed' });
  res.json({ ok: true, emergency_stop: false });
});

const feedbackSchema = z.object({ reply_id: z.string().uuid(), rating: z.number().int().min(1).max(5).optional(), correction: z.string().max(2000).optional(), notes: z.string().max(2000).optional() });
app.post('/api/feedback', async (req, res) => {
  if (!requireSupabase(res)) return;
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_feedback' });
  const { error } = await supabase.from('feedback').insert(parsed.data);
  if (error) return res.status(500).json({ ok: false, error: 'feedback_insert_failed' });
  res.json({ ok: true });
});

app.use((_req, res) => res.status(404).json({ ok: false, error: 'not_found' }));

app.listen(port, () => {
  console.log(`ikoeru-ai-online listening on ${port}`);
});
