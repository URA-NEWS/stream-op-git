# Ikoeru AI Online Studio

イコエルAIをオンライン配信システムにするためのリポジトリ。

ローカル運用は対象外。ここから先はオンラインだけで進める。

## 入口URL

- 管理画面の土台: https://ura-news.github.io/stream-op-git/online/index.html?v=3
- OBS画面の土台: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=3

## 今の状態

まだ完成品ではない。

画面はオンラインで開ける。SupabaseのDBも作成済み。ただし、コメント取得・AI返答・音声生成を動かすAPIサーバーがまだネットにデプロイされていないため、管理画面に実API URLを入れても本番動作はしない。

## 完了済み

- 既存Supabaseプロジェクト `Tool` を使用。
- Project ref: `lcnuxfvjownsmqvuagkd`
- イコエルAI用テーブル作成済み。
- tenant `ikoeru-ai` 作成済み。
- character `イコエルAI` 作成済み。
- stream `twitcasting / l_xxx999` 作成済み。
- Node/Express APIコード作成済み。
- TwitCastingコメント取得コード作成済み。
- AI返答生成コード作成済み。
- イコエルAIの会話方針作成済み。
- TTS接続コード作成済み。
- 管理系APIとジョブAPIをトークン保護済み。
- Render用設定作成済み。
- Dockerfile作成済み。
- GitHub Actions構文チェック作成済み。

## まだ必要

1. RenderまたはRailwayに `online/backend` をデプロイする。
2. ホスティング環境変数に秘密キーを入れる。
3. `/api/health` を確認する。
4. 管理画面にAPI URLを入れる。
5. TwitCasting接続テストをする。
6. OBSに `online/scene.html` を入れて実配信テストする。
7. 顧客用管理画面と納品キット作成フローを実装する。
8. 学習・収益化用データの同意UI、エクスポート、監査ログを完成させる。

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
