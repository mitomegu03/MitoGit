// ─────────────────────────────────────────────
// foreground_blur.gdshader
// 前景レイヤー用 2D ガウスブラー
// CanvasItem > Material > ShaderMaterial に設定
// ─────────────────────────────────────────────
shader_type canvas_item;

// ブラー強度（大きいほどボケる）
uniform float blur_amount : hint_range(0.0, 10.0) = 3.0;
// 不透明度（前景の透け感調整）
uniform float opacity : hint_range(0.0, 1.0) = 0.85;

void fragment() {
	vec2 pixel_size = TEXTURE_PIXEL_SIZE;
	vec4 color = vec4(0.0);

	// 5x5 ガウスカーネル
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
