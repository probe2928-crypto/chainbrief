const puppeteer=require('puppeteer-core');const path=require('path');
(async()=>{const [html,hash,...ts]=process.argv.slice(2);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const pg=await b.newPage();await pg.setViewport({width:1080,height:1920});
await pg.goto('file://'+path.resolve(html)+(hash||''));await pg.evaluate(()=>document.fonts.ready);
pg.on('pageerror',e=>console.log('ERR',e.message));
for(const t of ts){await pg.evaluate(t=>seek(t),+t);await pg.screenshot({path:`snap_${path.basename(html,'.html')}_${t}.png`});}
await b.close();})();
