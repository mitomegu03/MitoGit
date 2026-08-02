import math
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    import sys
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def generate_light_mask():
    size = 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    center = size // 2
    max_radius = size // 2

    pixels = img.load()
    for y in range(size):
        for x in range(size):
            dist = math.sqrt((x - center)**2 + (y - center)**2)
            if dist <= max_radius:
                # 中心が白（不透明）、外側にいくほど透明になるグラデーション
                ratio = 1.0 - (dist / max_radius)
                alpha = int(255 * (ratio ** 1.5))  # 少しなめらかな減衰
                pixels[x, y] = (255, 255, 255, alpha)

    out_dir = Path(__file__).parent.parent / "assets" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "light_mask.png"
    
    img.save(out_path)
    print(f"Success: Created {out_path}")

if __name__ == "__main__":
    generate_light_mask()
