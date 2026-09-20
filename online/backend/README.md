# Ikoeru AI Online Backend

Hosted Node/Express API for イコエルAI online operation.

## Runtime

- Node.js 20+
- Supabase service role key
- TwitCasting API credentials
- LLM provider for AI replies
- TTS provider for voice output

## Required environment variables

Use `.env.example` as the provider variable template. Never commit real values.

```text
ADMIN_API_TOKEN=
JOB_TOKEN=
SCENE_READ_TOKEN=
SUPABASE_URL=https://lcnuxfvjownsmqvuagkd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
TWITCASTING_USER_ID=l_xxx999
TWITCASTING_CLIENT_ID=
TWITCASTING_CLIENT_SECRET=
LLM_PROVIDER=openai
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
TTS_PROVIDER=none
TTS_BASE_URL=
TTS_API_KEY=
TTS_VOICE=玄野武宏
TTS_SPEAKER_ID=11
```

## Auth model

- `GET /api/health` is public and returns only configuration booleans.
- Admin operations require `Authorization: Bearer $ADMIN_API_TOKEN`.
- Scheduled jobs require `Authorization: Bearer $JOB_TOKEN`.
- OBS scene events require `SCENE_READ_TOKEN` only when that variable is configured. Pass it as `?token=...` or a Bearer token.

## Endpoints

- `GET /api/health`
- `POST /api/integrations/twitcasting/test`
- `POST /api/jobs/twitcasting/poll`
- `POST /api/jobs/replies/generate`
- `POST /api/jobs/replies/synthesize`
- `GET /api/scene/events?stream_id=...&after=0&token=...`
- `POST /api/streams/:id/emergency-stop`
- `POST /api/streams/:id/resume`
- `POST /api/feedback`

## Railway deployment

1. Create a Railway project from `URA-NEWS/stream-op-git`.
2. Railway reads root `railway.json`.
3. Add variables from `online/backend/.env.example`.
4. Deploy.
5. Open the generated Railway domain and verify `/api/health`.
6. Paste the Railway API URL into the owner dashboard API URL field.
7. For OBS, use `scene.html?api=<Railway URL>&stream_id=<stream UUID>&token=<SCENE_READ_TOKEN>`.

## Render deployment

1. Open the root Render Blueprint URL.
2. Create a new Render Web Service from this GitHub repository.
3. Use root directory `online/backend` when creating manually.
4. Build command: `npm install`.
5. Start command: `npm start`.
6. Add environment variables from `.env.example`.
7. Verify `/api/health`.
8. Paste the Render API URL into the owner dashboard API URL field.

## Docker-capable host

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
