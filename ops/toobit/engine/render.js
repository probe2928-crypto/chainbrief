// usage: node render.js <html> <seconds> <outdir> [hash] [transparent]
const puppeteer = require('puppeteer-core');
const path = require('path'); const fs = require('fs');
(async () => {
  const [html, secs, outdir, hash = '', transp = ''] = process.argv.slice(2);
  fs.mkdirSync(outdir, { recursive: true });
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--force-color-profile=srgb'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1080, height: 1920 });
  await pg.goto('file://' + path.resolve(html) + hash);
  await pg.evaluate(() => document.fonts.ready);
  const fps = +(process.env.FPS||30), n = Math.round(secs * fps);
  for (let i = +(process.env.START||0); i < +(process.env.END||n); i++) {
    await pg.evaluate(t => window.seek(t), i / fps);
    await pg.screenshot(transp ? { path: `${outdir}/f${String(i).padStart(4, '0')}.png`, omitBackground: true } : { path: `${outdir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  await b.close();
})();
