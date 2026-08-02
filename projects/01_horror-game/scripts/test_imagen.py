"""
test_imagen.py
──────────────────────────────────────────────────
Pollinations API を使って画像を1枚生成し、
assets/images/test_texture.png に保存するテストスクリプト。

【使い方】
  python projects/01_horror-game/scripts/test_imagen.py

【依存ライブラリ】
  pip install requests Pillow
──────────────────────────────────────────────────
"""

import os
import sys
import requests
from urllib.parse import quote
from pathlib import Path


# ─────────────────────────────────────────────
# 設定
# ─────────────────────────────────────────────

# 生成プロンプト（ドット絵ホラー統一スタイル）
PROMPT = (
    "pixel art, retro horror texture, dark stone wall, "
    "dimly lit corridor, mossy surface, eerie atmosphere, "
    "16-bit style, desaturated color palette, no text"
)

# 出力サイズ（2のべき乗推奨・軽量化のため512以下）
WIDTH  = 512
HEIGHT = 512

# 保存先（このスクリプトから見た相対パス）
SCRIPT_DIR  = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR  = PROJECT_DIR / "assets" / "images"
OUTPUT_FILE = OUTPUT_DIR / "test_texture.png"

# Pollinations API エンドポイント
API_BASE = "https://image.pollinations.ai/prompt"


# ─────────────────────────────────────────────
# メイン処理
# ─────────────────────────────────────────────

def generate_image(prompt: str, width: int, height: int, output_path: Path) -> None:
    """Pollinations API から画像を取得して保存する。"""

    # 出力ディレクトリを作成（存在する場合はスキップ）
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # URL 組み立て（プロンプトをURLエンコード）
    encoded_prompt = quote(prompt)
    url = f"{API_BASE}/{encoded_prompt}?width={width}&height={height}&nologo=true"

    print(f"[INFO] プロンプト : {prompt}")
    print(f"[INFO] リクエスト URL : {url}")
    print(f"[INFO] 保存先 : {output_path}")
    print("[INFO] 画像取得中...")

    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        # Content-Type 確認
        content_type = response.headers.get("Content-Type", "")
        if "image" not in content_type:
            print(f"[ERROR] 想定外の Content-Type: {content_type}", file=sys.stderr)
            sys.exit(1)

        # PNG として保存
        with open(output_path, "wb") as f:
            f.write(response.content)

        size_kb = len(response.content) / 1024
        print(f"[OK] 保存完了 ({size_kb:.1f} KB) → {output_path}")

    except requests.exceptions.Timeout:
        print("[ERROR] タイムアウト: APIの応答がありませんでした。", file=sys.stderr)
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] リクエスト失敗: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    print("=" * 50)
    print("  怪異探偵ホラー ── アセット自動生成テスト")
    print("  使用API: Pollinations API")
    print("=" * 50)

    generate_image(
        prompt=PROMPT,
        width=WIDTH,
        height=HEIGHT,
        output_path=OUTPUT_FILE,
    )

    print("\n[完了] Godot プロジェクトから以下のパスで参照できます:")
    print("  res://assets/images/test_texture.png")
    print("=" * 50)


if __name__ == "__main__":
    main()
