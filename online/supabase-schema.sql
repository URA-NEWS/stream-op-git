-- Ikoeru AI online-only Supabase schema draft
-- Review before production. Enable RLS before exposing client access.

create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner' check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create index if not exists tenant_users_user_idx on tenant_users(user_id, tenant_id);

create table if not exists characters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null default 'イコエルAI',
  profile jsonb not null default '{}'::jsonb,
  prompt text not null default '',
  voice jsonb not null default '{}'::jsonb,
  avatar jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists character_versions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(character_id, version)
);

create table if not exists streams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  platform text not null default 'twitcasting',
  external_user_id text not null,
  status text not null default 'offline',
  emergency_stop boolean not null default false,
  last_cursor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references streams(id) on delete cascade,
  platform text not null,
  external_comment_id text not null,
  viewer_external_id text,
  viewer_name text,
  body text not null,
  received_at timestamptz not null default now(),
  unique(stream_id, platform, external_comment_id)
);

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references streams(id) on delete cascade,
  comment_id uuid not null references comments(id) on delete cascade,
  character_id uuid not null references characters(id) on delete cascade,
  reply text not null,
  audio_url text,
  model text,
  tts_voice text,
  status text not null default 'queued' check (status in ('queued', 'delivered', 'skipped', 'failed')),
  quality_score integer,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists replies_scene_queue_idx on replies(stream_id, status, created_at);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null references replies(id) on delete cascade,
  rating integer,
  correction text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists training_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  purpose text not null check (purpose in ('service_improvement', 'external_data_sales', 'model_training')),
  allowed boolean not null default false,
  evidence text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists access_tokens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  stream_id uuid references streams(id) on delete cascade,
  name text not null,
  token_hash text not null,
  scope text not null check (scope in ('admin', 'job', 'scene')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists access_tokens_lookup_idx on access_tokens(scope, token_hash) where revoked_at is null;
create index if not exists access_tokens_tenant_idx on access_tokens(tenant_id, scope);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table tenants enable row level security;
alter table tenant_users enable row level security;
alter table characters enable row level security;
alter table character_versions enable row level security;
alter table streams enable row level security;
alter table comments enable row level security;
alter table replies enable row level security;
alter table feedback enable row level security;
alter table training_permissions enable row level security;
alter table access_tokens enable row level security;
alter table audit_logs enable row level security;
