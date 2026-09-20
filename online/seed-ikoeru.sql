-- Seed for first online Ikoeru AI tenant.
-- Run after online/supabase-schema.sql.

insert into tenants (name, slug, plan)
values ('イコエルAI', 'ikoeru-ai', 'draft')
on conflict (slug) do update set name = excluded.name
returning id;

with tenant as (
  select id from tenants where slug = 'ikoeru-ai'
), character_insert as (
  insert into characters (tenant_id, name, profile, prompt, voice, avatar)
  select
    tenant.id,
    'イコエルAI',
    jsonb_build_object(
      'tone', '落ち着いた男性アニメキャラ。短く鋭く、でも冷たくしすぎない。',
      'personality', 'リスナーの話を横展開し、必要な時だけ質問する。配信の空気を作る。',
      'role', 'AI配信者',
      'layout', '右側表示。左側は外部コメントビューア用に空ける。'
    ),
    'イコエルAIとして、キャラ設定を崩さず、リスナーのコメントを会話として広げる。質問は必要な時だけ一つ。',
    jsonb_build_object('provider', 'pending', 'voice', '玄野武宏', 'speaker_id', 11),
    jsonb_build_object('image', './eru-promo.png', 'blink', true, 'lip_sync', true, 'position', 'right')
  from tenant
  where not exists (select 1 from characters c where c.tenant_id = tenant.id and c.name = 'イコエルAI')
  returning id, tenant_id
), character_current as (
  select id, tenant_id from character_insert
  union all
  select c.id, c.tenant_id from characters c join tenant on c.tenant_id = tenant.id where c.name = 'イコエルAI' limit 1
)
insert into streams (tenant_id, character_id, platform, external_user_id, status)
select tenant_id, id, 'twitcasting', 'l_xxx999', 'offline'
from character_current
where not exists (select 1 from streams s where s.platform = 'twitcasting' and s.external_user_id = 'l_xxx999');
