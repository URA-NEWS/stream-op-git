# イコエルAI Online API Contract

Base URL: production hosting provider URL.

## Auth

- Admin routes require owner authentication.
- Customer routes require tenant-scoped authentication.
- OBS scene routes use signed scene tokens or read-only public scene IDs.
- Write routes reject missing CSRF/origin checks where browser-based.

## Health

`GET /api/health`

Returns service, database, TwitCasting, LLM, TTS, queue, emergency status.

## Character

`GET /api/characters/:id`

Returns current character profile, prompt, voice, avatar, version.

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

Stops comment processing and OBS playback.

`POST /api/streams/:id/resume`

Resumes after operator confirmation.

## TwitCasting

`POST /api/integrations/twitcasting/test`

Tests credentials stored in hosting environment. Never returns secrets.

`POST /api/jobs/twitcasting/poll`

Scheduled/internal route. Reads new comments and stores them.

## Reply Pipeline

`POST /api/jobs/replies/generate`

Scheduled/internal route. Generates reply for queued comments.

`POST /api/jobs/replies/synthesize`

Scheduled/internal route. Generates audio.

`GET /api/scene/:streamId/events?after=cursor`

OBS polling endpoint. Returns ordered speech events.

## Feedback and Learning

`POST /api/replies/:id/feedback`

Stores rating, correction, notes.

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
