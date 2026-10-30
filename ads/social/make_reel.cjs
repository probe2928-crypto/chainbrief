// usage: node make_reel.cjs input.json out.mp4 [cover.jpg]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
const [inp, out, cover] = process.argv.slice(2);
const FPS = 30;
(async () => {
  const data = JSON.parse(fs.readFileSync(inp, 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(__dirname, 'reel.html'));
  await p.evaluate(() => document.fonts.ready);
  const dur = await p.evaluate((d) => setup(d), data);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-shortest', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(dur * FPS);
  for (let f = 0; f < N; f++) {
    await p.evaluate((t) => render(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (cover && f === Math.round((1.8 + 1.6) * FPS)) fs.writeFileSync(cover, buf);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await b.close(); console.log('ok', out, dur.toFixed(1) + 's');
})();
