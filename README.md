# Ikoeru AI Online Studio

イコエルAIをオンライン配信システムにするためのリポジトリ。

ローカル運用は対象外。ここから先はオンラインだけで進める。

## 入口URL

- 管理画面: https://ura-news.github.io/stream-op-git/online/index.html?v=5
- ユーザー管理画面: https://ura-news.github.io/stream-op-git/online/customer.html?v=2
- 変更依頼レビュー: https://ura-news.github.io/stream-op-git/online/review.html
- データ収益化管理: https://ura-news.github.io/stream-op-git/online/data.html
- 納品キット作成画面: https://ura-news.github.io/stream-op-git/online/kits.html
- OBS画面: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=5
- Supabase安全API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-secure
- Supabase顧客API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-customer-api
- Render Blueprint: https://render.com/deploy?repo=https://github.com/URA-NEWS/stream-op-git

## 今の状態

まだ完成品ではない。

画面はオンラインで開ける。SupabaseのDBも作成済み。JWT必須の安全APIと顧客管理APIもオンラインに作成済み。

ユーザー管理画面は、顧客がSupabase JWTを入れて、自分に許可されたキャラクターと配信だけを読み込み、キャラの口調・会話設計・成長ルールの変更依頼を送れる形にした。変更依頼は直接本番キャラを書き換えず、`character_change_requests` に蓄積する。レビュー画面で依頼を読み、owner/operator JWTで適用・却下できる。適用時はキャラの旧版スナップショットを `character_versions` に保存してからプロンプトを更新する。

データ収益化管理では、品質改善・AI学習・外部提供の目的別に、同意済みの場合だけ `data_exports` へ輸出リクエストを保存できる。保持期間は `data_retention_policies`、輸出監査は `export_audit_events` に保存する。

OBS画面は左側を外部コメントビューア用に空け、右側にイコエルAI、吹き出し、瞬き、口パクを出す。画像パスはGitHub Pagesの絶対パスとrawフォールバックを持つ。

OBSや外部ジョブが直接呼べる公開APIは、サービスロールを使う実装が安全判定で拒否されたため未公開。代わりに、テナントユーザーRLS、顧客変更依頼、学習許可、データ輸出管理、保持期間、輸出監査、テナント/ストリーム別アクセストークンの土台を入れた。

## API URLを作るルート

### Supabase Edge Function

- `ikoeru-secure`: JWT必須の安全確認API。
- `ikoeru-customer-api`: JWT必須の顧客管理API。
- OBS/ジョブ用の公開APIは、サービスロールなし、または十分に検証済みのスコープ付き実装にする必要がある。

### Render

1. Render Blueprintを開く。
2. `URA-NEWS/stream-op-git` からWeb Serviceを作る。
3. Renderの環境変数に秘密情報を入れる。
4. Deploy後に発行される `https://...onrender.com` がAPI URL。
5. 管理画面のAPI URL欄へ入れて `/api/health` を確認する。

## 完了済み

- 既存Supabaseプロジェクト `Tool` を使用。
- Project ref: `lcnuxfvjownsmqvuagkd`
- イコエルAI用テーブル作成済み。
- tenant `ikoeru-ai` 作成済み。
- character `イコエルAI` 作成済み。
- stream `twitcasting / l_xxx999` 作成済み。
- JWT必須のSupabase Edge Function `ikoeru-secure` 作成済み。
- JWT必須のSupabase Edge Function `ikoeru-customer-api` 作成済み。
- `tenant_users` と顧客管理用RLS作成済み。
- `character_change_requests` と顧客変更依頼API作成済み。
- 変更依頼レビュー画面作成済み。
- 変更依頼の適用・却下API作成済み。
- キャラ適用前スナップショット保存に対応済み。
- 顧客の学習・外部提供許可保存API作成済み。
- `data_exports` と同意ゲート付き輸出リクエストAPI作成済み。
- `data_retention_policies` と保持期間API作成済み。
- `export_audit_events` と輸出監査API作成済み。
- データ収益化管理画面作成済み。
- `access_tokens` とスコープ別トークン土台作成済み。
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

1. OBS/ジョブ用APIを安全に公開する。
2. Supabase Authに顧客ユーザーを紐づける。
3. 秘密キーをSupabase SecretsまたはRender/Railway環境変数に入れる。
4. `/api/health` を実JWTで確認する。
5. TwitCasting接続テストをする。
6. OBSに `online/scene.html` を入れて実配信テストする。
7. 音声生成バックエンドを本番用に接続する。
8. 実ファイル出力先のストレージとバックアップを本番用に固める。

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
- ユーザー管理画面が実JWTで顧客データを読める。
- 顧客の変更依頼と学習許可がSupabaseに保存される。
- 承認済み変更依頼がキャラ設定へ安全に適用される。
- 同意済み目的だけデータ輸出リクエストを作れる。
- 保持期間と輸出監査が顧客ごとに記録される。
- ツイキャスコメントがSupabaseに保存される。
- AI返答が生成される。
- 音声生成される。
- OBS画面でイコエルAIが右側で喋る。
- 左側は外部コメントビューア用に空いている。
- 緊急停止できる。
- 顧客ごとにキャラとデータを分けられる。
- 学習・外部提供は同意済みデータだけに限定される。
