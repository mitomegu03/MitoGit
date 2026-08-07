extends CharacterBody2D

# ─────────────────────────────────────────────
# player_side.gd
# 横スクロール + Y軸奥行き移動 プレイヤー
# ─────────────────────────────────────────────

## 左右移動速度
const SPEED_X    := 200.0
## 上下移動速度（奥行き方向）
const SPEED_Y    := 120.0

## Y軸の移動範囲（画面上方向が奥）
const Y_MIN      := 120.0   # 奥（画面上）の限界
const Y_MAX      := 320.0   # 手前（画面下）の限界

## 奥行きに応じたスケール範囲
const SCALE_FAR  := 0.75    # 最奥でのスケール
const SCALE_NEAR := 1.0     # 最手前でのスケール

## 調査中フラグ（true だと移動不可）
var is_inspecting := false

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	if is_inspecting:
		velocity = Vector2.ZERO
		return

	# ── 入力取得 ──────────────────────────────
	var input_x := Input.get_axis("ui_left", "ui_right")
	var input_y := Input.get_axis("ui_up",   "ui_down")

	# ── 移動 ──────────────────────────────────
	velocity.x = input_x * SPEED_X
	velocity.y = input_y * SPEED_Y
	move_and_slide()

	# ── Y軸クランプ（奥行き範囲制限）──────────
	position.y = clamp(position.y, Y_MIN, Y_MAX)

	# ── 奥行きスケール自動演出 ─────────────────
	# Y座標が小さい（奥）ほど縮小、大きい（手前）ほど等倍
	var depth_ratio: float = (position.y - Y_MIN) / (Y_MAX - Y_MIN)  # 0.0(奥) ~ 1.0(手前)
	var target_scale: float = lerpf(SCALE_FAR, SCALE_NEAR, depth_ratio)
	scale = Vector2(target_scale, target_scale)

	# ── 左右スプライト反転 ─────────────────────
	if input_x != 0:
		if has_node("Sprite2D"):
			var spr = get_node("Sprite2D")
			if "flip_h" in spr:
				spr.flip_h = input_x < 0
			elif spr is Polygon2D:
				spr.scale.x = -1 if input_x < 0 else 1
