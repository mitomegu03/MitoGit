# MitoGit プロジェクト設定・運用ガイド

## 1. プロジェクト環境
- **リポジトリ**: MitoGit
- **Godotプロジェクトルート**: `/workspaces/MitoGit/projects/01_horror-game/godot/`
- **ローカル環境**: PCの `Documents/MitoGit` にクローンしてGodotエディタで実行。
- **リモート環境 (Codespaces)**: VSCodeブラウザ版として起動し、AIエージェントがコードの編集やファイルの追加を実行。

## 2. 連携ワークフロー (Codespaces ↔ Local)
基本的にAIがCodespaces上で編集を行い、それをGit経由でローカルに反映させるフローを取る。

### 【AI側の基本動作】
1. **ファイルの編集/作成**: `default_api:multi_edit` や `default_api:create_new_file` などのツールで直接編集。
2. **自動コミット＆プッシュ**: 編集完了後、AIが以下のコマンドをターミナルで実行し、強制的にリモートへ反映する。
   ```bash
   cd /workspaces/MitoGit
   git add -A
   git commit -m "auto-update: [変更内容]" --no-verify
   git push origin main
   ```
   *(※Codespaces環境ではターミナル出力のキャプチャがAI側に返らないため、AIは「実行した」前提で進行する。必要に応じてユーザーに `git pull` を促す)*

### 【ユーザー(ローカル)側の基本動作】
1. **変更の取り込み**: AIが「プッシュしました」と報告したら、ローカルPCのターミナル (Powershell/コマンドプロンプトなど) で以下を実行。
   ```bash
   cd Documents/MitoGit
   git pull origin main
   ```
2. **Godotエディタの更新**:
   - Godotが起動中の場合、画面外から戻ると自動で再スキャンされる。
   - 反映されない場合は、左下のファイルシステムパネルを右クリック → 「ファイルシステムを再スキャン」。
   - 画像などのリソースエラーが消えない場合は、Godotを再起動する。

## 3. アセット作成時の注意点 (Godot向け)
- GodotはPNGフォーマットのチェックが厳密なため、Python等で画像を自動生成する場合は必ず `Pillow` などのライブラリを用いて標準的なエンコードを行うこと。
- バイナリを直接記述して偽装した画像や音声(MP3)はインポートエラー (❌アイコン) になる可能性が高い。
- Godotエディタが認識するアセットは `godot/` フォルダ配下 (例: `godot/assets/`) に配置しなければならない。

## 4. プロンプト指示時の設定 (自動承認)
- コード修正提案時は、AIは「提案」に留めず可能な限り `default_api:multi_edit` で即座にファイルを書き換える。
- その後、ユーザー側でVSCodeの「Accept」ボタンを押す手間を省くため、基本的には即Gitプッシュまで繋げる運用を想定。
  *(※Cline等の拡張機能の設定で Auto-Accept が有効になっている前提)*
