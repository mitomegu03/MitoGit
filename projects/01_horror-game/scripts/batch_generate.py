"""
batch_generate.py
──────────────────────────────────────────────────
テスト用1室のアセットを一括生成するスクリプト。

【生成するもの】
  画像（Pollinations API）:
    - floor.png        : 暗い木の床テクスチャ（トップダウン）
    - center_obj.png   : 中央オブジェクト（不気味な石像）
    - desk_fp.png      : 1人称調査画面用（デスク上の書類）
  音声（ElevenLabs API）:
    - ambient.mp3      : 環境音（不気味なドローン）

【使い方】
  python projects/01_horror-game/scripts/batch_generate.py
──────────────────────────────────────────────────
"""

import os
import sys
import requests
from urllib.parse import quote
from pathlib import Path
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# ─────────────────────────────────────────────
# パス設定
# ─────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
PROJECT_DIR  = SCRIPT_DIR.parent
IMAGE_DIR    = PROJECT_DIR / "assets" / "images"
AUDIO_DIR    = PROJECT_DIR / "assets" / "audio"
API_BASE     = "https://image.pollinations.ai/prompt"

IMAGE_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────
# 生成する画像の定義
# ─────────────────────────────────────────────
IMAGES = {
    "floor.png": (
        "pixel art, retro horror, dark dirty wooden floor texture, "
        "seamless tile, top down view, 16-bit style, gloomy, desaturated"
    ),
    "center_obj.png": (
        "pixel art, retro horror, creepy small stone altar with candles "
        "on top, top down view, 16-bit style, dark, shadowy"
    ),
    "desk_fp.png": (
        "pixel art, retro horror, first person POV looking down at an old "
        "wooden desk, scattered papers with strange writing, a flickering "
        "oil lamp, dark room, 16-bit style, eerie atmosphere"
    ),
}

# ─────────────────────────────────────────────
# 画像生成
# ─────────────────────────────────────────────
def generate_images() -> None:
    print("\n[画像生成] Pollinations API")
    print("-" * 40)
    for filename, prompt in IMAGES.items():
        url = f"{API_BASE}/{quote(prompt)}?width=512&height=512&nologo=true"
        print(f"  生成中: {filename}")
        try:
            r = requests.get(url, timeout=60)
            r.raise_for_status()
            out_path = IMAGE_DIR / filename
            with open(out_path, "wb") as f:
                f.write(r.content)
            size_kb = len(r.content) / 1024
            print(f"  -> 保存完了 ({size_kb:.1f} KB): {out_path}")
        except Exception as e:
            print(f"  -> 失敗: {e}")

# ─────────────────────────────────────────────
# 音声生成
# ─────────────────────────────────────────────
def generate_audio(client: ElevenLabs) -> None:
    print("\n[音声生成] ElevenLabs API")
    print("-" * 40)
    try:
        print("  生成中: ambient.mp3")
        result = client.text_to_sound_effects.convert(
            text=(
                "Eerie horror ambience, low rumbling drone, "
                "distant metallic scrape, hollow silence, unsettling"
            ),
            duration_seconds=5.0,
            prompt_influence=0.5,
        )
        out_path = AUDIO_DIR / "ambient.mp3"
        with open(out_path, "wb") as f:
            for chunk in result:
                f.write(chunk)
        print(f"  -> 保存完了: {out_path}")
    except Exception as e:
        print(f"  -> 失敗: {e}")

# ─────────────────────────────────────────────
# メイン
# ─────────────────────────────────────────────
def main() -> None:
    print("=" * 50)
    print("  怪異探偵ホラー ── アセット一括生成")
    print("=" * 50)

    # 画像生成
    generate_images()

    # 音声生成
    load_dotenv()
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("\n[WARN] ELEVENLABS_API_KEY が未設定のため音声生成をスキップ")
    else:
        el_client = ElevenLabs(api_key=api_key)
        generate_audio(el_client)

    print("\n" + "=" * 50)
    print("  完了！Godot から以下で参照できます:")
    print("  res://assets/images/floor.png")
    print("  res://assets/images/center_obj.png")
    print("  res://assets/images/desk_fp.png")
    print("  res://assets/audio/ambient.mp3")
    print("=" * 50)

if __name__ == "__main__":
    main()
