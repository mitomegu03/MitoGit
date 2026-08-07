# 横スクロール奥行きシステム 技術仕様書
## REPLACED / ANNO: Mutationem スタイル

---

## 1. 推奨ノードツリー構造

```
SideTestRoom (Node2D)
│
├── Background (Parallax2D)          ← 奥レイヤー
│   ├── scroll_scale = Vector2(0.8, 0.8)
│   ├── BGRect (ColorRect)           ← 背景の壁
│   └── BGWindow (ColorRect)         ← 窓のシルエット
│
├── GameArea (Node2D)                ← メインプレイエリア
│   ├── y_sort_enabled = true        ← Y軸ソートで奥行き表現
│   │
│   ├── Player (CharacterBody2D)     ← プレイヤー
│   │   ├── Sprite2D                 ← トレンチコートキャラ
│   │   └── CollisionShape2D
│   │
│   ├── Desk (StaticBody2D)          ← 家具（Y-Sort対象）
│   │   └── DeskSprite
│   │
│   └── [その他の家具・NPCなど]
│
├── CanvasModulate                   ← 全体の暗闇
│   └── color = #0b0c16
│
└── Foreground (Parallax2D)          ← 手前レイヤー
    ├── scroll_scale = Vector2(1.2, 1.2)
    ├── material = ShaderMaterial (foreground_blur.gdshader)
    ├── PillarLeft / PillarRight     ← 柱
    └── CurtainLeft / CurtainRight   ← カーテン
```

---

## 2. Player.gd（横スクロール + 奥行き移動）

```gdscript
extends CharacterBody2D

const SPEED_X    := 200.0
const SPEED_Y    := 120.0
const Y_MIN      := 120.0   # 奥（画面上）の限界
const Y_MAX      := 320.0   # 手前（画面下）の限界
const SCALE_FAR  := 0.75    # 最奥スケール
const SCALE_NEAR := 1.0     # 最手前スケール

var is_inspecting := false

func _ready() -> void:
	add_to_group("player")

func _physics_process(_delta: float) -> void:
	if is_inspecting:
		velocity = Vector2.ZERO
		return

	var input_x := Input.get_axis("move_left", "move_right")
	var input_y := Input.get_axis("move_up",   "move_down")

	velocity.x = input_x * SPEED_X
	velocity.y = input_y * SPEED_Y
	move_and_slide()

	# Y軸クランプ（奥行き範囲制限）
	position.y = clamp(position.y, Y_MIN, Y_MAX)

	# 奥行きスケール自動演出
	var depth_ratio := (position.y - Y_MIN) / (Y_MAX - Y_MIN)
	var target_scale := lerp(SCALE_FAR, SCALE_NEAR, depth_ratio)
	scale = Vector2(target_scale, target_scale)

	# 左右スプライト反転
	if input_x != 0:
		$Sprite2D.flip_h = input_x < 0
```

### Godotエディタ - Input Map 設定
プロジェクト設定 → Input Map に以下を追加：

| アクション名   | キー           |
|------------|--------------|
| move_left  | ← / A        |
| move_right | → / D        |
| move_up    | ↑ / W        |
| move_down  | ↓ / S        |

---

## 3. 前景ボケシェーダー（foreground_blur.gdshader）

```glsl
shader_type canvas_item;

uniform float blur_amount : hint_range(0.0, 10.0) = 3.0;
uniform float opacity     : hint_range(0.0, 1.0)  = 0.85;

void fragment() {
    vec2 pixel_size = TEXTURE_PIXEL_SIZE;
    vec4 color = vec4(0.0);

    float kernel[25] = float[](
        1.0,  4.0,  7.0,  4.0, 1.0,
        4.0, 16.0, 26.0, 16.0, 4.0,
        7.0, 26.0, 41.0, 26.0, 7.0,
        4.0, 16.0, 26.0, 16.0, 4.0,
        1.0,  4.0,  7.0,  4.0, 1.0
    );
    float kernel_sum = 273.0;

    for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
            vec2 offset = vec2(float(x), float(y)) * pixel_size * blur_amount;
            int idx = (x + 2) * 5 + (y + 2);
            color += texture(TEXTURE, UV + offset) * (kernel[idx] / kernel_sum);
        }
    }

    color.a *= opacity;
    COLOR = color;
}
```

### シェーダー適用手順
1. `Foreground（Parallax2D）` を選択
2. インスペクター → `Material` → 新規 `ShaderMaterial`
3. `Shader` → 新規 `Shader` → `foreground_blur.gdshader` の内容を貼り付け
4. パラメータ：`blur_amount = 3.5`, `opacity = 0.85`

---

## 4. 画像生成AI プロンプト集（英語）

### ① プレイヤー（探偵キャラクター）
```
2D pixel art sprite sheet, noir detective character, side view,
trench coat and fedora hat, walking animation frames (idle, walk left, walk right),
dark muted color palette, transparent background PNG,
16-bit retro game style, detailed shading, 64x64 pixels per frame,
dark gothic atmosphere, mysterious
```

### ② 背景（探偵事務所の壁・窓）
```
2D pixel art background, dark noir detective office interior,
aged brick wall with large rain-streaked window,
city lights visible through window at night, dim lamp glow,
moody dark color palette (deep navy, charcoal, muted amber),
horizontal scrolling game background, 640x360 resolution,
detailed pixel art, atmospheric fog, 16-bit style
```

### ③ 中景（レトロな木製デスクとライト）
```
2D pixel art furniture asset, vintage wooden office desk with green banker lamp,
top-down perspective slightly angled, dark wood texture,
scattered papers and manila folders on desk surface,
transparent background PNG, isolated asset,
noir mystery style, 16-bit pixel art, warm amber lamp glow,
128x80 pixels
```

### ④ 前景（柱・カーテンのシルエット）
```
2D pixel art foreground silhouette, dark room pillar and heavy curtain,
black and dark charcoal tones, slight texture detail,
transparent background PNG, blurred soft edges,
used as parallax foreground layer in side-scrolling game,
gothic noir atmosphere, tall vertical composition,
minimal detail, 80x360 pixels
```

---

## 5. 視差・奥行きパラメータ一覧

| レイヤー     | Parallax2D scroll_scale | 用途                    |
|----------|------------------------|-------------------------|
| 背景（遠景）   | Vector2(0.8, 0.8)      | 壁・窓（ゆっくりスクロール）       |
| ゲームエリア   | 1.0（標準）              | プレイヤー・家具（Y-Sort有効）  |
| 前景（手前）   | Vector2(1.2, 1.2)      | 柱・カーテン（速くスクロール+ボケ） |

| プレイヤーY座標 | スケール | 見え方    |
|-----------|------|---------|
| Y_MIN=120 | 0.75 | 奥にいる   |
| Y_MAX=320 | 1.0  | 手前にいる  |
