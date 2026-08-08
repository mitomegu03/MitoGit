# AGENTS.md

## Cursor Cloud specific instructions

### What this repo actually is

- The runnable product on `main` is a **Godot 4.7 2D horror game** located in `projects/01_horror-game/godot/`. Main scene: `res://scenes/side_test.tscn` (side-scroller with parallax + depth scaling). A second scene `res://scenes/test_room.tscn` (quarter-view) also exists.
- The root `README.md` describes an unrelated Node.js "AIルートコンシェルジュ" web app. That app's source (`server.js`, `public/`, `package.json`) is **not present on `main`** — ignore `README.md` and its `npm start` / `npm test` instructions when working on `main`.
- `projects/01_horror-game/scripts/*.py` and `replace_textures.py` are auxiliary Python asset-generation tools, not the game itself.
- Project docs are in Japanese; see `projects/01_horror-game/INDEX.md`, `_context/`, and the `*_SPEC.md` files at the repo root.

### Godot engine (preinstalled)

- The Godot editor/runtime binary is installed at `/usr/local/bin/godot` (`godot --version` → `4.7.1.stable`). It is baked into the VM image; the startup update script only refreshes the Python venv.
- Godot has **no real rendering in pure `--headless` mode**. To render (run the game, capture screenshots/movies) you MUST use a virtual display plus software OpenGL:
  - Wrap with `xvfb-run -a -s "-screen 0 640x360x24"`.
  - Export `LIBGL_ALWAYS_SOFTWARE=1` and `GALLIUM_DRIVER=llvmpipe` (Mesa llvmpipe provides GL; there is no GPU).
  - Use `--rendering-driver opengl3` (the project uses the `gl_compatibility` renderer).
- Recommended: point Godot's config dirs at a writable temp to avoid polluting `$HOME`: `export XDG_DATA_HOME=/tmp/godot_data XDG_CONFIG_HOME=/tmp/godot_config XDG_CACHE_HOME=/tmp/godot_cache`.

### Running / checking the game

Run these from `projects/01_horror-game/godot/`:

- Import/validate the project (also serves as a scene/resource sanity check): `godot --headless --path . --import`
- Lint / syntax-check a script: `godot --headless --path . --check-only --script res://scripts/player/player_side.gd`
- Record a deterministic demo movie (headless-friendly, no live input needed): `xvfb-run -a -s "-screen 0 640x360x24" godot --path . --rendering-driver opengl3 --write-movie /tmp/demo.avi --fixed-fps 30 --quit-after 240` then transcode with `ffmpeg`.

Gotchas:
- Startup logs `Error opening file 'res://assets/images/icon.png'` — the project references a missing window icon. This is **pre-existing and non-fatal**; the game still runs.
- `godot --headless --path . --import` rewrites the committed `projects/01_horror-game/godot/.godot/` cache. Do **not** commit that churn — `git checkout -- projects/01_horror-game/godot/.godot/` after importing.
- There are no automated test suites in this repo; validate via import, `--check-only`, and a recorded run.

### Python asset scripts

- A virtualenv at `/workspace/.venv` (recreated by the update script) provides `requests`, `Pillow`, `python-dotenv`, `elevenlabs`. Run scripts with `.venv/bin/python`.
- `scripts/generate_light.py` needs only Pillow. `scripts/test_imagen.py` fetches an image from the Pollinations API (needs internet, no key). `scripts/batch_generate.py` audio generation needs `ELEVENLABS_API_KEY` (optional; skipped when unset).
- These scripts write into `projects/01_horror-game/assets/images|audio/`, overwriting tracked files (e.g. `test_texture.png`). Restore with `git checkout --` if you don't intend to commit regenerated assets.

### Security note

- `.envmv` at the repo root contains a hard-coded ElevenLabs API key committed to the repo. It should be rotated and removed from history — do not rely on or propagate it.
