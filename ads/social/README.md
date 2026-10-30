# CHAINBRIEF social kit (Facebook · X · Reels)

- `reel.html` + `make_reel.cjs` — daily news reel, 1080x1920, ~25s (intro 1.8s + 5s per item + outro 3s), ivory editorial style.
  `node make_reel.cjs input.json out.mp4 cover.jpg` — input format: `example_en.json` / `example_zh.json` (4 items recommended).
- `kit.html` + `kit.cjs` — profile 1080, Facebook cover 1640x624, X header 1500x500 (writes to `./out/`).
- Fonts are loaded from `/tmp/gf` (google/fonts sparse checkout):
  `git clone -q --depth 1 --filter=blob:none --sparse https://github.com/google/fonts /tmp/gf && git -C /tmp/gf sparse-checkout set ofl/bodonimoda ofl/jost ofl/newsreader ofl/notoserifsc ofl/notosanssc`
- Rendering needs Playwright (Chromium) and ffmpeg.
