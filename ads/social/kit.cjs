const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 1200 } });
  const dir = __dirname; await p.goto('file://' + path.join(dir, 'kit.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  for (const [id, name] of [['p', 'chainbrief_profile_1080.png'], ['fb', 'chainbrief_facebook_cover_1640x624.png'], ['x', 'chainbrief_x_header_1500x500.png']])
    await (await p.$('#' + id)).screenshot({ path: path.join(dir, 'out', name) });
  await b.close();
})();
