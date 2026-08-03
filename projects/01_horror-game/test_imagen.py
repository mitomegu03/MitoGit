import os
import urllib.parse
import requests

# 保存先フォルダの作成
output_dir = "assets/images"
os.makedirs(output_dir, exist_ok=True)
output_path = os.path.join(output_dir, "test_texture.png")

# 生成したい画像のプロンプト
prompt = "Pixel art style, retro 3D game texture of an old wooden door, PS1 aesthetics, low poly"

print("画像を生成中...")

try:
    # URLエンコードして画像生成リクエストを送信
    encoded_prompt = urllib.parse.quote(prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"

    response = requests.get(image_url)
    
    if response.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"成功！画像が保存されました: {output_path}")
    else:
        print(f"エラー: ステータスコード {response.status_code}")

except Exception as e:
    print(f"\n[エラー詳細] {e}")
