import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# .env ファイルから APIキーを読み込む
load_dotenv()
api_key = os.getenv("ELEVENLABS_API_KEY")

# ElevenLabs APIの準備
client = ElevenLabs(api_key=api_key)

# 音声保存用のフォルダ（assets/audio）を自動作成
os.makedirs("assets/audio", exist_ok=True)

print("🎵 ホラーゲーム用の効果音を生成中...")

try:
    # 最新版SDKの書き方：text_to_sound_effects.convert を使用
    result = client.text_to_sound_effects.convert(
        text="Creaky old wooden door opening slowly in an empty room, eerie horror atmosphere",
        duration_seconds=3.0,
        prompt_influence=0.5
    )

    # 生成された音声データをファイルとして保存
    output_path = "assets/audio/test_door.mp3"
    with open(output_path, "wb") as f:
        for chunk in result:
            f.write(chunk)

    print(f"✨ 成功！ '{output_path}' に効果音が保存されました！")

except Exception as e:
    print(f"❌ エラーが発生しました: {e}")
