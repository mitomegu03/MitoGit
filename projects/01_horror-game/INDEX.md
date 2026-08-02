# 怪異探偵ホラー ── フォルダ目次（INDEX）

> **AI作業時の鉄則**: このファイルを最初に参照し、タスクに必要な最小限のフォルダのみ読み込むこと。

---

## フォルダ構成と内容

```
projects/01_horror-game/
├── INDEX.md                        ← ★ 本ファイル。作業前に必ず確認
│
├── _context/                       ← 【常時参照】プロジェクト前提・AI作業ルール
│   ├── project_overview.md         ← ゲーム概要・ジャンル・ゲームシステム・参考作品
│   │                                  ＋ アセット生成ポリシー（Pollinations API）
│   ├── environment.md              ← 開発環境・エンジン・連携フロー
│   │                                  ＋ Python自動生成フロー・Godot読み込み規則
│   └── ai_rules.md                 ← AI読み込みルール・コード生成規約
│
├── godot/                          ← 【コード作業時】Godotプロジェクト本体
│   ├── project.godot               ← Godot 4 プロジェクト設定ファイル
│   ├── scenes/                     ← シーンファイル (.tscn)
│   │   └── test_room.tscn          ← テスト用1室（移動・ライト・調査確認）
│   ├── scripts/                    ← GDScriptファイル (.gd)
│   │   ├── player/
│   │   │   └── player.gd           ← 移動・懐中電灯回転
│   │   ├── investigation/
│   │   │   └── investigate_trigger.gd ← テーブル接近・調査開始トリガー
│   │   ├── lighting/               ← 懐中電灯・2Dライト処理（将来用）
│   │   └── ui/
│   │       └── investigation_ui.gd ← 1人称調査画面UI制御
│   └── resources/                  ← リソース・設定ファイル
│
├── assets/                         ← 【素材作業時】画像・音声・フォント等
│   ├── images/                     ← 自動生成・手動作成の画像素材 (.png)
│   │   └── test_texture.png        ← Pollinations API 生成テスト画像
│   ├── audio/                      ← 環境音・SE・BGM
│   └── fonts/                      ← レトロ系フォント
│
├── scripts/                        ← 【アセット生成作業時】Python スクリプト群
│   ├── test_imagen.py              ← Pollinations API 画像生成テストスクリプト
│   └── test_audio.py               ← ElevenLabs API 音声生成テストスクリプト
│
├── story/                          ← 【シナリオ作業時】テキスト・ストーリー設計
│   ├── scenario/                   ← シナリオ本文
│   └── world/                      ← 世界観設定・キャラクター設定
│
└── docs/                           ← 【設計・仕様検討時】仕様書・設計メモ
    ├── vscode_settings.json        ← VS Code 設定テンプレート（.vscode/へコピーして使用）
    ├── vscode_launch.json          ← VS Code デバッグ起動設定テンプレート
    ├── design/                     ← ゲームデザイン仕様
    └── progress/                   ← 進捗メモ・TODO
```

---

## クイックリファレンス

| やりたいこと                   | 参照フォルダ                                      |
|--------------------------------|---------------------------------------------------|
| コード生成・実装相談           | `_context/` + `godot/scripts/該当/`              |
| バグ修正                       | `_context/` + 該当ファイルのみ                    |
| 素材・アセット整理             | `_context/` + `assets/`                          |
| アセット自動生成スクリプト作業 | `_context/` + `scripts/`                         |
| ストーリー・シナリオ           | `_context/` + `story/`                           |
| 仕様検討・設計                 | `_context/` + `docs/design/`                     |
| VS Code / Godot 連携設定       | `docs/vscode_settings.json` + `vscode_launch.json` |
| ルール・前提の確認             | `_context/` のみ                                  |

---

## 注意事項

- `docs/vscode_settings.json` / `vscode_launch.json` は **テンプレート** です。
  実際に使用する際は `.vscode/settings.json` / `.vscode/launch.json` へコピーしてください。
- `assets/images/` に保存した PNG は Godot から `res://assets/images/` として参照できます。
- Python スクリプトはリポジトリルートから実行してください。
  例: `python projects/01_horror-game/scripts/test_imagen.py`
