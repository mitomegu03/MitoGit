# 進捗ログ

---

## [Phase 1] 環境構築・基盤整備 ✅

- `_context/` ── プロジェクト前提・AIルール定義
- `INDEX.md` ── フォルダ目次・クイックリファレンス作成
- `godot/project.godot` ── Godot 4 プロジェクト認識用ファイル配置
- `scripts/test_imagen.py` ── Pollinations API 画像生成スクリプト
- `scripts/test_audio.py` ── ElevenLabs API 音声生成スクリプト
- `.env` ── ElevenLabs API キー設定済み
- `docs/vscode_settings.json` / `vscode_launch.json` ── VS Code 連携設定テンプレート

---

## [Phase 2] テスト部屋（グレーボックス）実装 ✅

### 作成ファイル
| ファイル | 内容 |
|----------|------|
| `godot/scenes/test_room.tscn` | テスト用1室シーン |
| `godot/scripts/player/player.gd` | プレイヤー移動 + 懐中電灯回転 |
| `godot/scripts/investigation/investigate_trigger.gd` | テーブル接近 + 調査開始トリガー |
| `godot/scripts/ui/investigation_ui.gd` | 1人称調査画面UI制御 |

### シーン構成（test_room.tscn）
```
TestRoom (Node2D)
├── Floor (ColorRect) ── 暗い床、画面全体
├── CanvasModulate ── 画面全体を暗くする（懐中電灯効果の土台）
├── WallN/S/W/E (StaticBody2D x4) ── 壁コリジョン
├── CenterObstacle (StaticBody2D) ── 中央オブジェクト（影テスト用・LightOccluder2D付き）
├── InvestigateTable (Area2D) ── 左上コーナーのテーブル（調査トリガー付き）
├── Player (CharacterBody2D) ── プレイヤー（PointLight2D懐中電灯付き）
└── InvestigationUI (CanvasLayer) ── 1人称調査画面オーバーレイ
```

### 操作方法
| 操作 | アクション |
|------|-----------|
| 矢印キー / WASD | プレイヤー移動 |
| マウス移動 | 懐中電灯の向き |
| Space / Enter | テーブルに近づいて調査開始 |
| ESC | 調査画面を閉じる |

### 次のステップ候補
- [ ] 実機動作確認（Godot で test_room.tscn を開いて実行）
- [ ] CanvasModulate の暗さ・PointLight2D の強さ調整
- [ ] プレイヤーの見た目をドット絵スプライトに差し替え
- [ ] 壁にライトが当たったときの見た目調整（Polygon2D追加）
- [ ] 1人称調査画面のデザイン強化
```
