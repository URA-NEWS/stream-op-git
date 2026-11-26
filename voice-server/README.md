# 配信用音声AI

固定モデル：gpt-realtime-2.1-mini。声はcoral、可愛い・けだるい毒舌の指示付き。小・中・大で回答の深さを切り替えます。

Renderの専用Web Serviceでroot directoryをvoice-server、buildをnpm ci --ignore-scripts、startをnpm start、Freeプランで起動します。APIキー未設定でもヘルスチェックは通り、/tokenは503で閉じています。

秘密はサービス環境変数OPENAI_API_KEYとBAT_VOICE_TOKENに保存します。どちらもGitにコミットしません。/tokenはBearer接続コード必須で、GitHub Pagesオリジンに限定、開始回数制限付きです。ブラウザへ渡すのは60秒有効の短期キーだけです。

OBSドックにはサーバーURLと接続コードを設定します。Chromeでvoice-helper.htmlを同じOBS接続情報のURLフラグメント付きで開き、マイクを準備。ドックからONにした間だけ音声をOpenAIへ送ります。出力音声はローカルOBS WebSocketを経由し、BAT AI音声ブラウザソースが再生します。OFF、ブラウザ終了、OBS接続切れ、15分経過でマイク・API接続を終了します。

npm test：実APIを呼ばず、認証・オリジン・レート制限・回答深さ・マイク停止・別エンジン宛てコマンドを検証します。課金・APIキー・ブラウザのマイク許可が揃うまでは、実際のAI音声応答は未検証です。
