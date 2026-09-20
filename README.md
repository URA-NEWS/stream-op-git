# Ikoeru AI Online Studio

イコエルAIをオンライン配信システムにするためのリポジトリ。

ローカル運用は対象外。ここから先はオンラインだけで進める。

## 入口URL

- 管理画面: https://ura-news.github.io/stream-op-git/online/index.html?v=4
- ユーザー管理画面: https://ura-news.github.io/stream-op-git/online/customer.html
- 納品キット作成画面: https://ura-news.github.io/stream-op-git/online/kits.html
- OBS画面: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=4
- Supabase安全API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-secure
- Render Blueprint: https://render.com/deploy?repo=https://github.com/URA-NEWS/stream-op-git

## 今の状態

まだ完成品ではない。

画面はオンラインで開ける。SupabaseのDBも作成済み。JWT必須の安全なSupabase Edge Functionも作成済み。

ただし、OBSや外部ジョブが直接呼べる本番APIは未公開。公開APIにするにはJWT検証なしにして、内部トークン `ADMIN_API_TOKEN` / `JOB_TOKEN` / `SCENE_READ_TOKEN` で守る必要がある。この設定は明示承認が必要。

## API URLを作るルート

### Render

1. Render Blueprintを開く。
2. `URA-NEWS/stream-op-git` からWeb Serviceを作る。
3. Renderの環境変数に秘密情報を入れる。
4. Deploy後に発行される `https://...onrender.com` がAPI URL。
5. 管理画面のAPI URL欄へ入れて `/api/health` を確認する。

### Supabase Edge Function

- 安全API `ikoeru-secure` は作成済み。
- OBS/ジョブ用の公開API `ikoeru-api` は、JWT検証なし + 内部トークン認証で作る必要がある。
- 明示承認後に公開可能。

## 完了済み

- 既存Supabaseプロジェクト `Tool` を使用。
- Project ref: `lcnuxfvjownsmqvuagkd`
- イコエルAI用テーブル作成済み。
- tenant `ikoeru-ai` 作成済み。
- character `イコエルAI` 作成済み。
- stream `twitcasting / l_xxx999` 作成済み。
- JWT必須のSupabase Edge Function `ikoeru-secure` 作成済み。
- Node/Express APIコード作成済み。
- TwitCastingコメント取得コード作成済み。
- AI返答生成コード作成済み。
- イコエルAIの会話方針作成済み。
- TTS接続コード作成済み。
- 管理系APIとジョブAPIをトークン保護済み。
- キャラ調整API作成済み。
- 納品キット作成API作成済み。
- 学習・収益化許可API作成済み。
- ユーザー管理画面作成済み。
- 納品キット作成画面作成済み。
- OBS画面は右側キャラ、左側コメビュ空き、瞬き、口パク、音声URL再生に対応。
- Render用ルート設定 `render.yaml` 作成済み。
- Dockerfile作成済み。
- GitHub Actions構文チェック作成済み。

## まだ必要

1. Render/Railwayへデプロイする、またはSupabase公開APIの明示承認を出す。
2. ホスティング環境変数に秘密キーを入れる。
3. `/api/health` を確認する。
4. 管理画面にAPI URLを入れる。
5. TwitCasting接続テストをする。
6. OBSに `online/scene.html` を入れて実配信テストする。
7. 音声生成バックエンドを本番用に接続する。
8. データエクスポートとバックアップを本番用に固める。

## GitHubに入れない秘密情報

Render/Railway/Supabaseなどの環境変数へ入れる。

- `ADMIN_API_TOKEN`
- `JOB_TOKEN`
- `SCENE_READ_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWITCASTING_CLIENT_ID`
- `TWITCASTING_CLIENT_SECRET`
- `LLM_API_KEY`
- `TTS_API_KEY`
- `TTS_BASE_URL`

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
- 学習・外部提供は同意済みデータだけに限定される。
