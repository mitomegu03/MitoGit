extends CharacterBody2D

# ─────────────────────────────────────────────
# プレイヤー設定
# ─────────────────────────────────────────────

## 移動速度
const SPEED := 150.0

@onready var flashlight: PointLight2D = $FlashLight
@onready var body_polygon: Polygon2D = $BodyPolygon

func _ready() -> void:
	# プレイヤーグループに追加（調査トリガー判定に使用）
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	# 8方向移動入力を取得
	var direction := Vector2(
		Input.get_axis("ui_left", "ui_right"),
		Input.get_axis("ui_up", "ui_down")
	)

	if direction != Vector2.ZERO:
		velocity = direction.normalized() * SPEED
	else:
		velocity = Vector2.ZERO

	move_and_slide()

	# 懐中電灯をマウスカーソルの方向へ向ける
	var mouse_dir := get_global_mouse_position() - global_position
	flashlight.rotation = mouse_dir.angle()
