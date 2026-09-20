# Ikoeru AI Online Backend

Hosted Node/Express API for イコエルAI online operation.

## Runtime

- Node.js 20+
- Supabase service role key
- TwitCasting API credentials
- Optional LLM provider
- Optional TTS provider

## Required environment variables

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TWITCASTING_USER_ID=l_xxx999
TWITCASTING_CLIENT_ID=
TWITCASTING_CLIENT_SECRET=
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
TTS_PROVIDER=none
TTS_VOICE=玄野武宏
TTS_SPEAKER_ID=11
```

Never commit real values.

## Endpoints

- `GET /api/health`
- `POST /api/integrations/twitcasting/test`
- `POST /api/jobs/twitcasting/poll`
- `POST /api/jobs/replies/generate`
- `POST /api/jobs/replies/synthesize`
- `GET /api/scene/events?stream_id=...&after=0`
- `POST /api/streams/:id/emergency-stop`
- `POST /api/streams/:id/resume`
- `POST /api/feedback`

## Deployment

Render Free prototype:

1. Create a new Render Web Service from this GitHub repository.
2. Use root directory `online/backend`.
3. Build command: `npm install`.
4. Start command: `npm start`.
5. Add environment variables.
6. Verify `/api/health`.

Docker-capable host:

```text
docker build -t ikoeru-ai-online ./online/backend
docker run -p 3000:3000 --env-file .env ikoeru-ai-online
```

## Job schedule

Use provider cron/scheduler or external cron:

- TwitCasting poll: every 5-15 seconds during live, or every minute on free infrastructure.
- Reply generation: every 5-10 seconds.
- Speech synthesis: every 5-10 seconds.

Free hosts may sleep. For production livestreaming, use always-on hosting.
