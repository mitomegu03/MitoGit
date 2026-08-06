# クォータービュー型ホラー探偵ゲーム - 最小プロトタイプ仕様書

## 1. ノード構成図

```
Root (Node2D: TestRoom)
│
├── Floor (TextureRect)
│   └── [床の2D背景]
│
├── CanvasModulate
│   └── [画面全体を暗闇 #0b0c16 で覆う]
│
├── AmbientPlayer (AudioStreamPlayer)
│   └── [環境音（無音デフォルト）]
│
├── WallN / WallS / WallW / WallE (StaticBody2D × 4)
│   └── CollisionShape2D × 各1
│   └── LightOccluder2D × 各1 [シャドウ壁]
│
├── CenterObstacle (StaticBody2D)
│   ├── Sprite2D
│   ├── CollisionShape2D
│   └── LightOccluder2D [シャドウ生成]
│
├── InvestigateTable (Area2D) ← 調査可能オブジェクト
│   ├── Sprite2D [机の見た目]
│   ├── CollisionShape2D (CircleShape2D)
│   └── HintLabel [[ Space ] Investigate]
│   └── Script: investigate_trigger.gd
│
├── Player (CharacterBody2D) ← プレイヤー
│   ├── BodyPolygon (Polygon2D) [三角形プレイヤー表示]
│   ├── CollisionShape2D (CircleShape2D)
│   ├── FlashLight (PointLight2D)
│   │   ├── Energy: 1.8
│   │   ├── Shadow enabled: ON
│   │   ├── Texture: light_mask.tres (放射グラデーション)
│   │   └── TextureScale: 3.0
│   └── Script: player.gd
│
└── InvestigationUI (CanvasLayer)
    └── layer: 10 [常に最前面]
    ├── Panel
    │   ├── DeskImage (TextureRect) [1人称画像]
    │   ├── TitleLabel [「Old Table」等]
    │   ├── ContentLabel [説明文]
    │   └── HintLabel [[ ESC ] Close]
    └── Script: investigation_ui.gd
```

---

## 2. Player.gd
**役割**: プレイヤー移動＋マウス向き懐中電灯制御

```gdscript
extends CharacterBody2D

const SPEED := 150.0

@onready var flashlight: PointLight2D = $FlashLight
@onready var body_polygon: Polygon2D = $BodyPolygon

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	# 8方向移動
	var direction := Vector2(
		Input.get_axis("ui_left", "ui_right"),
		Input.get_axis("ui_up", "ui_down")
	)
	
	if direction != Vector2.ZERO:
		velocity = direction.normalized() * SPEED
	else:
		velocity = Vector2.ZERO
	
	move_and_slide()
	
	# 懐中電灯をマウスカーソル方向へ向ける
	var mouse_dir := get_global_mouse_position() - global_position
	flashlight.rotation = mouse_dir.angle()
```

---

## 3. investigate_trigger.gd
**役割**: 調査可能オブジェクト（Area2D）のトリガー管理

```gdscript
extends Area2D

@export var investigation_ui_path: NodePath = ""

@onready var hint_label: Label = $HintLabel
var _ui: CanvasLayer
var _player_inside := false

func _ready() -> void:
	if not investigation_ui_path.is_empty():
		_ui = get_node(investigation_ui_path)
	
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)
	hint_label.visible = false

func _process(_delta: float) -> void:
	# プレイヤーが範囲内 & 決定キー押下
	if _player_inside and Input.is_action_just_pressed("ui_accept"):
		if _ui:
			_ui.open()

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		_player_inside = true
		hint_label.visible = true

func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		_player_inside = false
		hint_label.visible = false
```

---

## 4. investigation_ui.gd
**役割**: 1人称カットインUI表示・閉鎖

```gdscript
extends CanvasLayer

@onready var title_label: Label    = $Panel/TitleLabel
@onready var content_label: Label  = $Panel/ContentLabel
@onready var hint_label: Label     = $Panel/HintLabel

func _ready() -> void:
	layer = 10
	visible = false

func open() -> void:
	visible = true

func close() -> void:
	visible = false

func _input(event: InputEvent) -> void:
	if not visible:
		return
	# ESC / B ボタンで閉じる
	if event.is_action_just_pressed("ui_cancel"):
		close()
```

---

## 5. 実装チェックリスト

- [x] 2Dクォータービュー（CharacterBody2D）
- [x] 8方向移動（velocity + move_and_slide）
- [x] マウスカーソル向きPointLight2D（懐中電灯）
- [x] PointLight2D Shadow 有効化
- [x] CanvasModulate 暗闇設定
- [x] Area2D 調査トリガー
- [x] 決定キー→UI表示
- [x] キャンセルキー→UI非表示

---

## 6. 今後の拡張案

1. **プレイヤー移動停止フラグ**
   ```gdscript
   # Player.gd に以下を追加
   var is_inspecting := false
   
   func _physics_process(_delta: float) -> void:
       if is_inspecting:
           return
       # ... 移動処理
   ```
   
   ```gdscript
   # investigation_ui.gd
   func open() -> void:
       get_tree().root.get_node("TestRoom/Player").is_inspecting = true
       visible = true
   
   func close() -> void:
       get_tree().root.get_node("TestRoom/Player").is_inspecting = false
       visible = false
   ```

2. **複数の調査対象オブジェクト**
   - InvestigateTable を複製
   - 各オブジェクトで異なるテキスト＆画像を設定

3. **効果音・BGM**
   - AudioStreamPlayer ノードを追加
   - investigation_ui.gd で `play()` / `stop()`

4. **謎解きロジック**
   - 調査データをDictionary で管理
   - フラグシステムで進行管理

---

## 7. セットアップ手順

1. **シーン** `test_room.tscn` を開く
2. **InvestigateTable** の Inspector で
   - `Investigation Ui Path`: `../InvestigationUI` を指定
3. **Player → FlashLight** で Texture に `light_mask.tres` を割り当て
4. **実行** (F5) で動作確認

以上！
