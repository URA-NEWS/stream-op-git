# Online Deployment Checklist

## Provider decision

Choose one before deployment:

1. Render Free + Supabase Free
   - Lowest cost.
   - May sleep or throttle.
   - Good for prototype and owner testing.

2. Railway
   - Existing workspace is Hobby plan.
   - Do not deploy until owner accepts possible cost and confirms which project to use.

3. VPS
   - Best for VOICEVOX/Ollama always-on.
   - Not free.

## Secrets to configure in hosting provider

- AUTH_SECRET
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- TWITCASTING_CLIENT_ID
- TWITCASTING_CLIENT_SECRET
- LLM_API_KEY
- TTS_API_KEY
- PUBLIC_BASIC_AUTH_PASSWORD
- BACKUP_ENCRYPTION_KEY

## Supabase setup

- [ ] Create project.
- [ ] Run `online/supabase-schema.sql`.
- [ ] Add RLS policies per tenant.
- [ ] Create storage bucket for generated voice audio and avatar assets.
- [ ] Configure backups.

## API deployment

- [ ] Create API server project.
- [ ] Set environment variables.
- [ ] Verify `/api/health`.
- [ ] Verify TwitCasting credential test.
- [ ] Verify comment polling job.
- [ ] Verify reply generation job.
- [ ] Verify TTS synthesis job.

## Frontend deployment

- [ ] Owner admin dashboard URL.
- [ ] Customer dashboard URL.
- [ ] OBS scene URL.
- [ ] Access control verified.
- [ ] Emergency stop verified.

## OBS test

- [ ] Add online scene URL as Browser Source.
- [ ] Confirm left side remains empty for external comment viewer.
- [ ] Confirm イコエルAI appears on the right.
- [ ] Confirm speech bubble appears without covering comment viewer.
- [ ] Confirm blink loop.
- [ ] Confirm lip sync while audio plays.
- [ ] Confirm emergency stop clears speech/audio.

## Live TwitCasting test

- [ ] Start private or test stream.
- [ ] Confirm current live detected.
- [ ] Send new comment.
- [ ] Confirm comment stored.
- [ ] Confirm AI reply generated.
- [ ] Confirm TTS generated.
- [ ] Confirm OBS event delivered.
- [ ] Confirm duplicate comments are ignored.
- [ ] Confirm reconnection does not replay old comments.

## Data monetization readiness

- [ ] Service improvement consent separated from external sale consent.
- [ ] Model training consent separated from both.
- [ ] Retention period visible.
- [ ] Revocation removes future exports.
- [ ] Exports are tenant-scoped.
- [ ] Audit log records export operator, time, purpose.

## Completion definition

Online rollout is complete only when:

- A network URL is live.
- Admin/customer/OBS URLs work.
- TwitCasting live comments create replies.
- Audio and avatar animation work in OBS.
- Secrets are stored only in hosting provider.
- Supabase stores characters, comments, replies, feedback, permissions, audit logs.
- Emergency stop works online.
- A customer kit can be created without touching local files.
