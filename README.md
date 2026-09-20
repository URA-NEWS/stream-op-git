# Ikoeru AI Online Studio

イコエルAIをオンライン配信システムにするための作業場所。

ローカル運用は対象外。ここから先はオンラインだけで進める。

## 今できていること

- 管理画面URLの土台: https://ura-news.github.io/stream-op-git/online/index.html?v=3
- OBS画面URLの土台: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=3
- Node/Express APIコード: `online/backend/`
- TwitCasting取得処理: `online/backend/src/twitcasting.js`
- AI返答生成処理: `online/backend/src/llm.js`
- イコエルAIの会話方針: `online/backend/src/reply-policy.js`
- TTS処理: `online/backend/src/tts.js`
- Supabase DBスキーマ: `online/supabase-schema.sql`
- 初期データSQL: `online/seed-ikoeru.sql`
- Render設定: `online/backend/render.yaml`
- Dockerfile: `online/backend/Dockerfile`
- CI: `.github/workflows/online-backend.yml`

## 実際に完了したオンライン作業

- 既存Supabaseプロジェクト `Tool` を使用。
- Project ref: `lcnuxfvjownsmqvuagkd`
- イコエルAI用テーブル作成済み。
- tenant `ikoeru-ai` 作成済み。
- character `イコエルAI` 作成済み。
- stream `twitcasting / l_xxx999` 作成済み。

## まだ動かない理由

APIサーバーがまだネットにデプロイされていない。

管理画面とOBS画面は表示できるが、裏側のAPI URLが未接続なので、ツイキャスコメント取得、AI返答、音声生成はまだ実行されない。

## 次にやること

1. RenderまたはRailwayに `online/backend` をデプロイする。
2. ホスティング環境変数に秘密キーを入れる。
3. `/api/health` を確認する。
4. 管理画面にAPI URLを入れる。
5. TwitCasting接続テストをする。
6. OBSに `online/scene.html` を入れて実配信テストする。

## 必要な秘密情報

GitHubには入れない。Render/Railway/Supabaseなどの環境変数へ入れる。

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWITCASTING_CLIENT_ID`
- `TWITCASTING_CLIENT_SECRET`
- `LLM_API_KEY`
- `TTS_API_KEY`

## 完成条件

- ネット上のAPI URLが生きている。
- 管理画面がAPIにつながる。
- ツイキャスコメントがSupabaseに保存される。
- AI返答が生成される。
- 音声生成される。
- OBS画面でイコエルAIが右側で喋る。
- 左側は外部コメントビューア用に空いている。
- 緊急停止できる。
- 顧客ごとにキャラとデータを分けられる。
