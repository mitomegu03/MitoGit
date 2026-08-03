# 開発環境前提

## メイン端末
- Galaxy Tab S9（タブレット完結重視・軽量動作前提）

## 開発環境
- GitHub Codespaces（VS Code + Continue）

## ゲームエンジン
- Godot Engine（GDScript ベース）

## ゲームエンジン連携フロー
1. Continue を使ってコード生成・編集
2. GitHub リポジトリ経由でゲームエンジンプロジェクトへ同期
3. Godot 上で動作テスト

## Continueで扱う主な処理
- 2D クォータービュー移動
- 1人称調査画面への視点切り替え処理
- 2D ライト / 懐中電灯の照射
- オブジェクト調査ギミック

---

## アセット自動生成スクリプト実行フロー

### 使用技術
- 言語: Python 3
- 画像API: Pollinations API（登録・キー不要）
- 音声API: ElevenLabs API（Sound Effects機能 / 要APIキー）
- ライブラリ: `requests`, `Pillow`, `elevenlabs`, `python-dotenv`

### 実行フロー
```
[スクリプト実行]
  ├─ scripts/test_imagen.py  (画像生成)
  └─ scripts/test_audio.py   (音声生成)
       ↓
[各 API へリクエスト / 生成]
       ↓
[レスポンスを保存]
  ├─ assets/images/
  └─ assets/audio/
       ↓
[Godot プロジェクトから参照・インポート]
```

### スクリプト配置場所
```
projects/01_horror-game/
└── scripts/
    ├── test_imagen.py       ← 動作テスト用・単体画像生成
    └── generate_assets.py   ← （将来）バッチ生成用
```

### Godot へのアセット読み込み規則
- `assets/images/` に保存された PNG ファイルは Godot の `res://assets/images/` として参照する
- Godot エディタ起動時に自動インポートされる（import設定は `godot/resources/` で管理）
- ファイル名は `snake_case.png` で統一する
- 解像度は 2 のべき乗（128, 256, 512）を推奨

---

## VS Code / Godot 連携設定

- LSP ポート: **6005**（Godot 4 デフォルト）
- 設定ファイル: `.vscode/settings.json` / `.vscode/launch.json`
- GDScript 補完: Godot Tools 拡張（VS Code）で有効化
- Python 実行: Codespaces 標準 Python インタープリタを使用
