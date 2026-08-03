extends CanvasLayer

# ─────────────────────────────────────────────
# 1人称調査画面UI
# ─────────────────────────────────────────────

@onready var title_label: Label    = $Panel/TitleLabel
@onready var content_label: Label  = $Panel/ContentLabel
@onready var hint_label: Label     = $Panel/HintLabel

func _ready() -> void:
	layer   = 10         # 常に最前面に表示
	visible = false

## 外部から呼び出して調査画面を開く
func open() -> void:
	visible = true

## 調査画面を閉じる
func close() -> void:
	visible = false

func _input(event: InputEvent) -> void:
	if not visible:
		return
	# ESC / B ボタンで閉じる
	if event.is_action_just_pressed("ui_cancel"):
		close()
