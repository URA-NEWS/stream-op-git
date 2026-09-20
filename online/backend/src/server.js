import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

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
    twitcasting: Boolean(process.env.TWITCASTING_CLIENT_ID && process.env.TWITCASTING_CLIENT_SECRET),
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
  if (streamId) {
    query = query.eq('stream_id', streamId);
  }
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
