"""
仮素材生成スクリプト
実行: python3 create_assets.py  (godotフォルダ内で)
"""
from PIL import Image, ImageDraw
import os

base = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(f"{base}/images", exist_ok=True)
os.makedirs(f"{base}/audio", exist_ok=True)

# ── floor.png ── タイル床 64x64
img = Image.new("RGB", (64, 64), (40, 35, 30))
draw = ImageDraw.Draw(img)
draw.rectangle([0, 0, 31, 31], fill=(45, 40, 34))
draw.rectangle([32, 32, 63, 63], fill=(45, 40, 34))
draw.line([32, 0, 32, 63], fill=(25, 22, 18), width=1)
draw.line([0, 32, 63, 32], fill=(25, 22, 18), width=1)
# img.save(f"{base}/images/floor.png")
print("✓ floor.png")

# ── center_obj.png ── 机オブジェクト 256x256 (RGBA)
img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.rectangle([20,  60, 236, 196], fill=(90,  65, 40, 255))
draw.rectangle([30,  70, 226, 186], fill=(110, 80, 50, 255))
draw.rectangle([40, 196,  80, 240], fill=(70,  50, 30, 255))
draw.rectangle([176,196, 216, 240], fill=(70,  50, 30, 255))
img.save(f"{base}/images/center_obj.png")
print("✓ center_obj.png")

# ── desk_fps.png ── 一人称視点机 520x200
img = Image.new("RGB", (520, 200), (30, 25, 20))
draw = ImageDraw.Draw(img)
draw.rectangle([0,  100, 520, 200], fill=(90, 65, 40))
draw.rectangle([0,   95, 520, 105], fill=(60, 45, 28))
draw.rectangle([30, 115, 160, 175], fill=(200, 195, 180))
draw.rectangle([35, 120, 155, 170], fill=(220, 215, 200))
for i in range(5):
    draw.line([35, 125 + i * 8, 155, 125 + i * 8], fill=(150, 145, 130), width=1)
img.save(f"{base}/images/desk_fps.png")
print("✓ desk_fps.png")

# ── light_mask.png ── 懐中電灯マスク 256x256 (RGBA 放射グラデーション)
size = 256
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
cx = cy = size // 2
for r in range(cx, 0, -1):
    alpha = int(255 * (1 - r / cx) ** 1.5)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, alpha))
img.save(f"{base}/images/light_mask.png")
print("✓ light_mask.png")

# ── ambient.mp3 ── 無音の最小 MP3 (44バイトの有効なMP3フレーム)
# ID3v2ヘッダーなし、無音フレーム1枚だけの最小構成
silent_mp3 = bytes([
    0xFF, 0xFB, 0x90, 0x00,   # MPEG1, Layer3, 128kbps, 44100Hz, Stereo
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]) * 100  # 100フレーム分繰り返して最低限の長さを確保
with open(f"{base}/audio/ambient.mp3", "wb") as f:
    f.write(silent_mp3)
print("✓ ambient.mp3")

print("\n全アセット配置完了！ Godot を再起動してください。")
