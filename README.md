# AIルートコンシェルジュ

速さだけでなく、徒歩時間・乗換回数・交通状況から移動の負担を比較するスマートフォン向けWebアプリです。Google Mapsの経路情報を正として時刻を計算し、Geminiは取得済みの候補を分かりやすく説明するためだけに利用します。

## 主な機能

- 公共交通・車・徒歩・自転車の実経路検索
- 最速、乗換少なめ、徒歩少なめ、負担の少なさによる比較
- 到着希望時刻から身支度開始・出発・到着を逆算
- 候補ルートの地図表示
- Geminiによる候補の説明（未設定時はルールベースで動作）
- API未設定でも完成イメージを確認できるデモ表示
- 現在地の天気予報
- お気に入り場所・ルートの安全な端末内保存
- PWAとしてホーム画面へ追加可能

## 必要な環境

- Node.js 20以上
- Google Maps Platformのブラウザー用APIキー
- Gemini APIキー（AI説明を利用する場合のみ）

Google Cloudで次のAPIを有効にしてください。

- Maps JavaScript API
- Places API (New)
- Routes API

Google Mapsのキーはブラウザーに配信されるため、利用するWebサイトのHTTPリファラーと上記APIに必ず制限してください。Geminiキーはサーバー側だけで使用し、Google Maps用キーとは分けてください。

## 起動

```bash
export GOOGLE_MAPS_BROWSER_API_KEY="..."
export GEMINI_API_KEY="..."
npm start
```

PCでは`http://localhost:4173`を開きます。同じWi-Fiの実機では`http://<PCのLAN側IPアドレス>:4173`を開いてください。ローカル実機確認では`APP_ORIGIN`を未設定にするか、実機から開くURLと同じ値にします。ファイアウォールを利用している場合はTCP 4173番の受信を許可してください。

Geminiのモデルを変更する場合は`GEMINI_MODEL`を設定できます。公開環境では`APP_ORIGIN`を実際のHTTPS URLにしてください。リバースプロキシが`X-Forwarded-For`を設定する場合は、そのプロキシのIPだけを`TRUSTED_PROXY_IPS`へ設定します。設定項目は`.env.example`も参照してください。

開発環境では右上の設定画面からAPIキーを一時入力できます。キーはブラウザーには保存されず、サーバーのメモリだけに保持されるため、再起動後は再入力が必要です。公開時は`NODE_ENV=production`または`ALLOW_PERSONAL_API_SETUP=0`で入力機能を無効にしてください。

## テスト

```bash
npm test
```

## 構成

- `public/app.js`: 画面、Google Maps、天気、お気に入り管理
- `public/route-utils.js`: 時刻・負担度の決定的な計算
- `server.js`: 静的配信、API設定、Geminiの安全なプロキシ

## 現在の制限

交通機関の運休・遅延・車内混雑を独自にリアルタイム取得する機能はありません。画面にはGoogle Mapsが返した経路候補だけを表示し、AIに存在しない路線や時刻を生成させない設計です。
