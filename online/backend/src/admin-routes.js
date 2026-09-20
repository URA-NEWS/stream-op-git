import { z } from 'zod';
import { requireBearer } from './auth.js';

const kitSchema = z.object({
  tenant_name: z.string().min(1).max(120),
  tenant_slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  character_name: z.string().min(1).max(80).default('イコエルAI'),
  platform: z.string().min(1).max(40).default('twitcasting'),
  external_user_id: z.string().min(1).max(120),
  prompt: z.string().max(8000).optional(),
  profile: z.record(z.any()).optional(),
  voice: z.record(z.any()).optional(),
  avatar: z.record(z.any()).optional(),
});

const proposalSchema = z.object({
  instruction: z.string().min(1).max(4000),
});

const applySchema = z.object({
  expected_version: z.number().int().min(1),
  prompt: z.string().max(12000).optional(),
  profile: z.record(z.any()).optional(),
  voice: z.record(z.any()).optional(),
  avatar: z.record(z.any()).optional(),
  reason: z.string().max(1000).optional(),
});

const rollbackSchema = z.object({
  version: z.number().int().min(1),
  reason: z.string().max(1000).optional(),
});

const permissionSchema = z.object({
  tenant_id: z.string().uuid(),
  purpose: z.enum(['service_improvement', 'external_data_sales', 'model_training']),
  allowed: z.boolean(),
  evidence: z.string().max(2000).optional(),
  expires_at: z.string().datetime().optional(),
});

function publicBase() {
  return (process.env.PUBLIC_CONTROL_BASE_URL || 'https://ura-news.github.io/stream-op-git/online').replace(/\/$/, '');
}

function defaultPrompt(name) {
  return `${name}として、リスナーのコメントを拾うだけで終わらせず、話を横展開し、短く質問し、配信として面白い余白を作る。決まったキャラ設定は守り、会話で得た有益な学びは次の返答品質に反映する。`;
}

export function configureAdminRoutes(app, supabase, requireSupabase) {
  app.get('/api/streams/:id/status', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const { data, error } = await supabase.from('streams').select('*, characters(name, version)').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ ok: false, error: 'stream_not_found' });
    const [{ count: comments }, { count: replies }] = await Promise.all([
      supabase.from('comments').select('id', { count: 'exact', head: true }).eq('stream_id', req.params.id),
      supabase.from('replies').select('id', { count: 'exact', head: true }).eq('stream_id', req.params.id),
    ]);
    res.json({ ok: true, stream: data, counts: { comments: comments || 0, replies: replies || 0 } });
  });

  app.post('/api/admin/kits', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const parsed = kitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_kit_request', details: parsed.error.flatten() });
    const kit = parsed.data;
    const tenantResult = await supabase.from('tenants').insert({ name: kit.tenant_name, slug: kit.tenant_slug, plan: 'draft' }).select('*').single();
    if (tenantResult.error) return res.status(409).json({ ok: false, error: 'tenant_create_failed', details: tenantResult.error.message });
    const characterResult = await supabase.from('characters').insert({
      tenant_id: tenantResult.data.id,
      name: kit.character_name,
      profile: kit.profile || { concept: 'online ai streamer', growth_mode: true },
      prompt: kit.prompt || defaultPrompt(kit.character_name),
      voice: kit.voice || { provider: process.env.TTS_PROVIDER || 'none', name: process.env.TTS_VOICE || '玄野武宏' },
      avatar: kit.avatar || { url: `${publicBase()}/../eru-promo.png`, layout: 'right-side' },
    }).select('*').single();
    if (characterResult.error) return res.status(500).json({ ok: false, error: 'character_create_failed', details: characterResult.error.message });
    const streamResult = await supabase.from('streams').insert({
      tenant_id: tenantResult.data.id,
      character_id: characterResult.data.id,
      platform: kit.platform,
      external_user_id: kit.external_user_id,
      status: 'offline',
    }).select('*').single();
    if (streamResult.error) return res.status(500).json({ ok: false, error: 'stream_create_failed', details: streamResult.error.message });
    await supabase.from('character_versions').insert({ character_id: characterResult.data.id, version: 1, snapshot: characterResult.data, reason: 'kit_created' });
    await supabase.from('audit_logs').insert({ tenant_id: tenantResult.data.id, action: 'kit_created', target_type: 'tenant', target_id: tenantResult.data.id, metadata: { platform: kit.platform } });
    res.json({
      ok: true,
      kit: {
        tenant: tenantResult.data,
        character: characterResult.data,
        stream: streamResult.data,
        customer_url: `${publicBase()}/customer.html?character_id=${characterResult.data.id}&stream_id=${streamResult.data.id}`,
        obs_url: `${publicBase()}/scene.html?api=${encodeURIComponent(process.env.APP_BASE_URL || '')}&stream_id=${streamResult.data.id}`,
      },
    });
  });

  app.post('/api/characters/:id/propose', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const parsed = proposalSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_instruction' });
    const { data: character, error } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ ok: false, error: 'character_not_found' });
    const instruction = parsed.data.instruction.trim();
    res.json({
      ok: true,
      current_version: character.version,
      proposal: {
        prompt: `${character.prompt}\n\n運営からの軌道修正: ${instruction}`,
        profile: { ...character.profile, latest_direction: instruction, growth_mode: true },
        reason: instruction,
      },
    });
  });

  app.post('/api/characters/:id/apply', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_character_update', details: parsed.error.flatten() });
    const { data: current, error } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ ok: false, error: 'character_not_found' });
    if (current.version !== parsed.data.expected_version) return res.status(409).json({ ok: false, error: 'version_conflict', current_version: current.version });
    await supabase.from('character_versions').insert({ character_id: current.id, version: current.version, snapshot: current, reason: parsed.data.reason || 'before_update' });
    const patch = { updated_at: new Date().toISOString(), version: current.version + 1 };
    for (const key of ['prompt', 'profile', 'voice', 'avatar']) if (parsed.data[key] !== undefined) patch[key] = parsed.data[key];
    const { data: updated, error: updateError } = await supabase.from('characters').update(patch).eq('id', current.id).select('*').single();
    if (updateError) return res.status(500).json({ ok: false, error: 'character_update_failed' });
    await supabase.from('audit_logs').insert({ tenant_id: updated.tenant_id, action: 'character_updated', target_type: 'character', target_id: updated.id, metadata: { version: updated.version, reason: parsed.data.reason || null } });
    res.json({ ok: true, character: updated });
  });

  app.post('/api/characters/:id/rollback', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const parsed = rollbackSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_rollback' });
    const { data: version, error } = await supabase.from('character_versions').select('*').eq('character_id', req.params.id).eq('version', parsed.data.version).single();
    if (error) return res.status(404).json({ ok: false, error: 'version_not_found' });
    const snapshot = version.snapshot || {};
    const { data: current } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
    const nextVersion = Math.max(Number(current?.version || 1) + 1, parsed.data.version + 1);
    const { data: updated, error: updateError } = await supabase.from('characters').update({
      profile: snapshot.profile || {},
      prompt: snapshot.prompt || '',
      voice: snapshot.voice || {},
      avatar: snapshot.avatar || {},
      version: nextVersion,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).select('*').single();
    if (updateError) return res.status(500).json({ ok: false, error: 'rollback_failed' });
    await supabase.from('audit_logs').insert({ tenant_id: updated.tenant_id, action: 'character_rollback', target_type: 'character', target_id: updated.id, metadata: { restored_version: parsed.data.version, reason: parsed.data.reason || null } });
    res.json({ ok: true, character: updated });
  });

  app.post('/api/training/permissions', async (req, res) => {
    if (!requireBearer(req, res, 'ADMIN_API_TOKEN')) return;
    if (!requireSupabase(res)) return;
    const parsed = permissionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ ok: false, error: 'invalid_permission', details: parsed.error.flatten() });
    const { data, error } = await supabase.from('training_permissions').insert(parsed.data).select('*').single();
    if (error) return res.status(500).json({ ok: false, error: 'permission_save_failed' });
    await supabase.from('audit_logs').insert({ tenant_id: data.tenant_id, action: 'training_permission_set', target_type: 'training_permission', target_id: data.id, metadata: { purpose: data.purpose, allowed: data.allowed } });
    res.json({ ok: true, permission: data });
  });
}
