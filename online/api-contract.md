# イコエルAI Online API Contract

Base URL: production hosting provider URL.

## Auth

- Public health route returns only coarse readiness.
- Admin routes require `Authorization: Bearer $ADMIN_API_TOKEN`.
- Scheduled/internal job routes require `Authorization: Bearer $JOB_TOKEN`.
- OBS scene routes use `SCENE_READ_TOKEN` when configured.
- Browser write routes must not expose service-role keys.

## Health

`GET /api/health`

Returns service, database, TwitCasting, LLM, and TTS readiness booleans.

## Character

`GET /api/characters/:id`

Returns current character profile, prompt, voice, avatar, version. Requires admin token in the current backend.

`POST /api/characters/:id/propose`

Input: natural-language instruction.
Output: proposed diff. Does not apply automatically.

`POST /api/characters/:id/apply`

Applies a reviewed diff with expected version. Reject stale edits.

`POST /api/characters/:id/rollback`

Rolls back to a previous version.

## Stream

`GET /api/streams/:id/status`

Returns platform connection, latest cursor, queue, emergency state.

`POST /api/streams/:id/emergency-stop`

Stops comment processing and OBS playback. Requires admin token.

`POST /api/streams/:id/resume`

Resumes after operator confirmation. Requires admin token.

## TwitCasting

`POST /api/integrations/twitcasting/test`

Tests credentials stored in hosting environment. Never returns secrets. Requires admin token.

`POST /api/jobs/twitcasting/poll`

Scheduled/internal route. Reads new comments and stores them. Requires job token.

## Reply Pipeline

`POST /api/jobs/replies/generate`

Scheduled/internal route. Generates reply for queued comments. Requires job token.

`POST /api/jobs/replies/synthesize`

Scheduled/internal route. Generates audio. Requires job token.

`GET /api/scene/events?stream_id=...&after=0&token=...`

OBS polling endpoint. Returns ordered speech events. Requires scene token when `SCENE_READ_TOKEN` is configured.

## Feedback and Learning

`POST /api/feedback`

Stores rating, correction, notes. Requires admin token in the current backend.

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
- Audit log for all writes.
- Version checks for character updates.
- Emergency stop always available.
- Data sale/model training disabled until explicit permission exists.
