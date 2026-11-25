# BAT PNGTuber for OBS

表示URL: https://ura-news.github.io/stream-op-git/avatar/overlay.html

操作ドックURL: https://ura-news.github.io/stream-op-git/avatar/

1920×1080・背景透過。OBS内蔵obs-websocket 5へ直接接続し、選択したマイクのInputVolumeMetersで口パクします。音声・OBSパスワードを外部サーバーへ送信しません。常駐ローカルサーバー、画像のローカルパス、veadotubeは不要です。

操作ドックでマイクを選ぶだけ。自動瞬き、呼吸、話す時の小さな弾み。45〜90秒の定期仕草、手動仕草、こたつモード、一服の自動選択オン／オフに対応。口パクと瞬きは独立描画。OBSミュート中は口を閉じます。

初回接続にはOBS WebSocketパスワードを接続設定に入力します。OBSソースとドックに設定したURLのフラグメントでも初期化可能です。フラグメントはHTTPリクエストに含まれません。パスワードをGitに保存しないでください。

背景はOBSでキャラの下、こたつ前面はキャラの上に画像またはブラウザソースとして配置できます。背景・こたつ自体は未制作です。

画像は内蔵image_genで制作。白い仮面の目穴を保ち、内側の黒目と口をユーザー提供の参考画像に合わせています。
