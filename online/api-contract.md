# イコエルAI Online API Contract

Base URL: production hosting provider URL or Supabase Edge Function URL.

## Auth

- Public browser clients must never receive service-role keys.
- Customer routes use Supabase Auth JWT and database RLS.
- Admin routes require tenant-scoped admin tokens.
- Scheduled/internal job routes require tenant-scoped job tokens.
- OBS scene routes require tenant-scoped scene tokens.
- Tokens are stored hashed in `access_tokens` and scoped to `tenant_id`, optionally `stream_id`.
- Browser write routes must check tenant and stream scope before reading or mutating data.

## Customer API

Base URL: `https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-customer-api`

All customer routes require `Authorization: Bearer <Supabase JWT>`.

`GET /api/health`

Returns current authenticated user id and tenant memberships visible through RLS.

`GET /api/customer/characters`

Returns characters for tenants where the authenticated user is a member.

`GET /api/customer/streams`

Returns streams for tenants where the authenticated user is a member.

`GET /api/customer/change-requests`

Returns customer-submitted character change requests for the authenticated tenant membership.

`POST /api/customer/change-requests`

Input:

```json
{
  "character_id": "optional-character-uuid",
  "type": "tone | conversation | safety | growth | other",
  "instruction": "natural language change request"
}
```

Stores a pending request. It does not directly rewrite the production character.

`POST /api/customer/training-permissions`

Input:

```json
{
  "purpose": "service_improvement | model_training | external_data_sales",
  "allowed": true,
  "evidence": "customer_console"
}
```

Stores explicit consent for one purpose. Requires tenant role `owner` or `operator`.

## Health

`GET /api/health`

Returns service, database, TwitCasting, LLM, and TTS readiness booleans. Production may require admin token.

## Character

`GET /api/characters/:id`

Returns current character profile, prompt, voice, avatar, version. Requires admin token scoped to the same tenant.

`POST /api/characters/:id/propose`

Input: natural-language instruction.
Output: proposed diff. Does not apply automatically.

`POST /api/characters/:id/apply`

Applies a reviewed diff with expected version. Reject stale edits.

`POST /api/characters/:id/rollback`

Rolls back to a previous version.

## Stream

`GET /api/streams/:id/status`

Returns platform connection, latest cursor, queue, emergency state. Requires admin token scoped to the stream tenant.

`POST /api/streams/:id/emergency-stop`

Stops comment processing and OBS playback. Requires admin token.

`POST /api/streams/:id/resume`

Resumes after operator confirmation. Requires admin token.

## TwitCasting

`POST /api/integrations/twitcasting/test`

Tests credentials stored in hosting environment. Never returns secrets. Requires admin token.

`POST /api/jobs/twitcasting/poll`

Scheduled/internal route. Reads new comments and stores them. Requires job token scoped to the stream.

## Reply Pipeline

`POST /api/jobs/replies/generate`

Scheduled/internal route. Generates reply for queued comments. Requires job token scoped to the tenant or stream.

`POST /api/jobs/replies/synthesize`

Scheduled/internal route. Generates audio. Requires job token scoped to the tenant or stream.

`GET /api/scene/events?stream_id=...&after=0`

OBS polling endpoint. Returns only events for the token-scoped stream. Requires scene token.

## Feedback and Learning

`POST /api/feedback`

Stores rating, correction, notes. Requires admin token scoped to the reply tenant.

`POST /api/training/permissions`

Sets explicit permission per purpose: service improvement, external data sales, model training.

`GET /api/training/export`

Exports only approved and non-expired data.

## Delivery Kits

`POST /api/admin/kits`

Creates tenant, character template, OBS URL, management URL, and onboarding checklist.

## Required safeguards

- No secrets in GitHub.
- Tenant isolation on every route.
- Customer console uses JWT and RLS, not service-role keys.
- Customer edits are stored as pending requests before production character updates.
- Stream tokens can only read that stream.
- Audit log for all writes.
- Version checks for character updates.
- Emergency stop always available.
- Data sale/model training disabled until explicit permission exists.
