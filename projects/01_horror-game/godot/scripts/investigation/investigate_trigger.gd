extends Area2D

# ─────────────────────────────────────────────
# 調査トリガー（テーブル等のオブジェクトに付与）
# ─────────────────────────────────────────────

## 調査UIノードへのパス（インスペクターで設定）
@export var investigation_ui_path: NodePath = ""

@onready var hint_label: Label = $HintLabel
var _ui: CanvasLayer
var _player_inside := false

func _ready() -> void:
	# 調査UIへの参照を取得
	if not investigation_ui_path.is_empty():
		_ui = get_node(investigation_ui_path)

	# シグナルを接続
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

	# ヒントラベルは最初非表示
	hint_label.visible = false

func _process(_delta: float) -> void:
	# プレイヤーが範囲内にいる＆決定キーで調査開始
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
