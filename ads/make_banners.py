import asyncio, os, sys
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "banners")
os.makedirs(OUT, exist_ok=True)
SIZES = [(728,90),(970,90),(468,60),(320,50),(320,100),(300,250),(336,280),(250,250),(160,600),(300,600)]

THEMES = {
 "paper": dict(bg="#FFFFFF", wash="radial-gradient(120% 140% at 100% 0%, #DDE3F3 0%, rgba(241,243,248,.55) 38%, rgba(255,255,255,0) 70%)",
               ink="#0A0A0A", mute="#55534E", line="#E6E5E2", sig="#A8201A", btnbg="#0A0A0A", btnfg="#FFFFFF", frame="#D9D8D4"),
 "noir":  dict(bg="#0B0B0B", wash="radial-gradient(120% 140% at 100% 0%, #1B2240 0%, rgba(17,19,24,.6) 40%, rgba(11,11,11,0) 72%)",
               ink="#EDEBE6", mute="#A3A09A", line="#262625", sig="#E46B62", btnbg="#EDEBE6", btnfg="#0B0B0B", frame="#262625"),
}

COPY = {
 "en": dict(eye="Blockchain news · 24/7",
            h=["Blockchain news,","<em>briefed.</em>"], h_short=["Blockchain news,","<em>briefed.</em>"],
            h_tall=["Blockchain","news,","<em>briefed.</em>"], h_tall_s=["Blockchain","news,","<em>briefed.</em>"],
            num="24/7", numl="Live wire", r1="News", r2="Analysis", r3="Markets", every="Read in minutes",
            h_line="Blockchain news, <em>briefed.</em>", h_line_s="Blockchain news, <em>briefed.</em>",
            sub="Breaking news, analysis and live markets, 24/7.", sub_s="Breaking news · analysis · markets",
            sub_sq="Breaking news, analysis and live markets, 24/7.",
            free="Free · no sign-up", cta="Read the brief", cta_s="Read",
            hfont="'Newsreader'", hweight=600, hls="-.015em"),
 "zh": dict(eye="24小时快讯 · 区块链新闻",
            h=["区块链新闻，","<em>一报读懂。</em>"], h_short=["区块链新闻，","<em>一报读懂。</em>"],
            h_tall=["区块链新闻，","<em>一报读懂。</em>"], h_tall_s=["区块链新闻，","<em>一报读懂。</em>"],
            num="24<small>小时</small>", numl="加密快讯", r1="快讯", r2="分析", r3="行情", every="每天几分钟，读懂加密市场",
            h_line="区块链新闻，<em>一报读懂。</em>", h_line_s="区块链新闻，<em>一报读懂。</em>",
            sub="24小时加密快讯、深度分析与实时行情。", sub_s="快讯 · 分析 · 实时行情", sub_sq="24小时加密快讯、<br>深度分析与实时行情。",
            free="免费 · 无需注册", cta="阅读链报", cta_s="阅读",
            hfont="'Noto Serif CJK SC'", hweight=700, hls="0"),
}

def L(lines): return ''.join(f'<span class="ln">{x}</span>' for x in lines)

def html(w, h, theme, lang):
    c, t = THEMES[theme], COPY[lang]
    zh = lang == "zh"
    horiz = w / h >= 3
    tall = h / w >= 1.8
    wordmark = "CHAINBRIEF" + ("" if not zh else "")
    eye_style = "letter-spacing:.02em;font-family:'Noto Sans CJK SC'" if zh else "letter-spacing:.16em;text-transform:uppercase"
    btn_style = "letter-spacing:.04em;font-family:'Noto Sans CJK SC';font-weight:500" if zh else "letter-spacing:.18em;text-transform:uppercase;font-weight:500"
    css = f"""<html lang="{'zh-Hans' if zh else 'en'}"><head><meta charset="utf-8"><style>
    *{{box-sizing:border-box;margin:0;padding:0}}
    body{{width:{w}px;height:{h}px;overflow:hidden;position:relative;background:{c['bg']};color:{c['ink']};font-family:'Jost',sans-serif;-webkit-font-smoothing:antialiased}}
    .wash{{position:absolute;inset:0;background:{c['wash']}}}
    .frame{{position:absolute;inset:0;border:1px solid {c['frame']}}}
    .in{{position:relative;height:100%}}
    .wm{{font-family:'Bodoni Moda';font-weight:600;font-variation-settings:'opsz' 11;letter-spacing:.3em;line-height:1;white-space:nowrap}}
    .eye{{font-family:'Jost';font-weight:400;color:{c['mute']};{eye_style};white-space:nowrap;display:flex;align-items:center;gap:.55em}}
    .dot{{width:.55em;height:.55em;border-radius:50%;background:{c['sig']};flex:none;box-shadow:0 0 0 .28em {c['sig']}22}}
    .h{{font-family:{t['hfont']};font-weight:{t['hweight']};letter-spacing:{t['hls']};line-height:{1.22 if zh else 1.06};font-variation-settings:'opsz' 72}}
    .h em{{font-style:{'normal' if zh else 'italic'};color:{c['sig']}}}
    .sub{{color:{c['mute']};font-weight:{400 if zh else 300};line-height:1.45;{"font-family:'Noto Sans CJK SC'" if zh else ''}}}
    .btn{{background:{c['btnbg']};color:{c['btnfg']};{btn_style};display:inline-flex;align-items:center;justify-content:center;gap:.6em;white-space:nowrap}}
    .btn i{{font-style:normal;font-family:'Jost';letter-spacing:0}}
    .rule{{height:1px;background:{c['line']}}}
    .vr{{width:1px;background:{c['line']};align-self:stretch}}
    .free{{color:{c['mute']};{eye_style};white-space:nowrap}}
    .fit{{white-space:nowrap;overflow:hidden}}
    .h .ln{{display:block;white-space:nowrap}}
    .num small{{font-family:'Noto Serif CJK SC';font-weight:600;font-size:.34em;letter-spacing:0;margin-left:.12em}}
    .num{{font-family:'Bodoni Moda';font-weight:500;font-variation-settings:'opsz' 96;line-height:.9;letter-spacing:-.02em;white-space:nowrap}}
    </style></head><body><div class="wash"></div><div class="frame"></div>"""

    if horiz and h <= 60:
        # 320x50 / 468x60 — wordmark + one-line headline + small CTA
        hs = h * (0.36 if w < 400 else 0.34)
        body = f"""<div class="in" style="display:flex;align-items:center;gap:{h*0.2}px;padding:0 {h*0.2}px 0 {h*0.26}px">
          <div style="display:flex;flex-direction:column;gap:{h*0.1}px;flex:1;min-width:0">
            <div class="wm" style="font-size:{max(9.5, h*0.19)}px;letter-spacing:.2em">CHAINBRIEF</div>
            <div class="h fit" style="font-size:{hs}px">{t['h_line_s']}</div>
          </div>
          <div class="btn" style="font-size:{12 if zh else max(9, h*0.16)}px;height:{h*0.6}px;padding:0 {h*0.2}px;flex:none">{t['cta_s'] if w < 400 else t['cta']}<i>→</i></div>
        </div>"""
    elif horiz and h >= 100 and w <= 340:
        # 320x100
        body = f"""<div class="in" style="display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr auto;padding:12px 14px 11px;column-gap:10px;row-gap:5px">
          <div class="wm" style="font-size:10px;grid-column:1/2">CHAINBRIEF</div>
          <div class="eye" style="font-size:{11 if zh else 8.5}px;justify-self:end"><span class="dot"></span>{'快讯' if zh else 'Live'}</div>
          <div class="h fit" style="font-size:{25 if zh else 26}px;grid-column:1/3;align-self:center">{t['h_line_s']}</div>
          <div class="sub fit" style="font-size:{12 if zh else 11.5}px;align-self:center;color:{c['ink']};opacity:.72">{t['sub_s']}</div>
          <div class="btn" style="font-size:{11 if zh else 9}px;height:24px;padding:0 10px">{t['cta']}<i>→</i></div>
        </div>"""
    elif horiz:
        # 728x90 / 970x90
        big = w >= 900
        body = f"""<div class="in" style="display:flex;align-items:center;gap:{22 if big else 18}px;padding:0 {22 if big else 18}px">
          <div style="display:flex;flex-direction:column;gap:9px;flex:none">
            <div class="wm" style="font-size:{15 if big else 13}px">CHAINBRIEF</div>
            <div class="eye" style="font-size:{12 if zh else 9.5}px"><span class="dot"></span>{t['eye']}</div>
          </div>
          <div class="vr" style="margin:18px 0"></div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:5px">
            <div class="h fit" style="font-size:{30 if big else (25 if zh else 27)}px">{t['h_line']}</div>
            {f'<div class="sub fit" style="font-size:{13 if zh else 12.5}px">{t["sub"]}</div>' if big else ''}
          </div>
          {f'<div class="free" style="font-size:{12 if zh else 10}px;flex:none">{t["free"]}</div>' if big else ''}
          <div class="btn" style="font-size:{13 if zh else 10.5}px;height:42px;padding:0 {18 if big else 15}px;flex:none">{t['cta']}<i>→</i></div>
        </div>"""
    elif tall:
        # 160x600 / 300x600
        wide = w >= 300
        pad = 26 if wide else 14
        body = f"""<div class="in" style="display:flex;flex-direction:column;padding:{pad+4}px {pad}px {pad}px">
          <div class="wm" style="font-size:{17 if wide else 11}px;text-align:center;letter-spacing:{'.3em' if wide else '.22em'}">CHAINBRIEF</div>
          <div class="rule" style="margin:{16 if wide else 12}px 0 {16 if wide else 12}px"></div>
          <div class="eye" style="font-size:{13 if zh else (10.5 if wide else 9)}px;justify-content:center"><span class="dot"></span>{t['eye'] if wide else ('区块链新闻' if zh else 'Blockchain news')}</div>
          <div class="h fitw" style="font-size:{(44 if zh else 46) if wide else (30 if zh else 31)}px;margin-top:{30 if wide else 24}px">{L(t['h_tall'] if wide else t['h_tall_s'])}</div>
          <div class="sub" style="font-size:{(16 if zh else 15.5) if wide else (13 if zh else 12.5)}px;margin-top:{16 if wide else 12}px">{t['sub_sq'] if (zh and wide) else t['sub']}</div>
          <div class="sq" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:{8 if wide else 6}px;min-height:0;overflow:hidden;padding-top:{24 if wide else 16}px">
            <div class="num fitw" style="font-size:{86 if wide else 52}px">{t['num']}</div>
            <div class="eye" style="font-size:{13 if zh else (10 if wide else 8.5)}px"><span class="dot"></span>{t['numl']}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:{8 if wide else 6}px">
            <div class="rule"></div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px">
              <span class="wm" style="font-size:{12 if wide else 9}px;letter-spacing:.12em;font-weight:500">{t['r1']}</span>
              <span class="wm" style="font-size:{12 if wide else 9}px;letter-spacing:.12em;font-weight:500">{t['r2']}</span>
              <span class="wm" style="font-size:{12 if wide else 9}px;letter-spacing:.12em;font-weight:500">{t['r3']}</span>
            </div>
            <div class="rule"></div>
            <div class="free" style="font-size:{(12 if zh else 10) if wide else (10.5 if zh else 8.5)}px;text-align:center;margin-top:2px">{t['every']}</div>
          </div>
          <div class="btn" style="font-size:{(15 if zh else 12) if wide else (12 if zh else 9.5)}px;height:{52 if wide else 40}px;margin-top:{18 if wide else 14}px">{t['cta']}<i>→</i></div>
          <div class="free" style="font-size:{(12 if zh else 10) if wide else (11 if zh else 9)}px;text-align:center;margin-top:{10 if wide else 8}px">{t['free']}</div>
        </div>"""
    else:
        # 300x250 / 336x280 / 250x250
        s = min(w, h)
        small = w <= 250
        body = f"""<div class="in" style="display:flex;flex-direction:column;padding:{s*0.08}px {s*0.08}px {s*0.075}px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <div class="wm" style="font-size:{s*0.052}px">CHAINBRIEF</div>
            <div class="eye" style="font-size:{max(10.5, s*0.044) if zh else max(8, s*0.034)}px"><span class="dot"></span>{'快讯' if zh else 'Live'}</div>
          </div>
          <div class="rule" style="margin-top:{s*0.05}px"></div>
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:{s*0.04}px">
            <div class="h fitw" style="font-size:{s*(0.118 if zh else 0.128)}px">{L(t['h_short'] if small else t['h'])}</div>
            <div class="sub" style="font-size:{max(11.5, s*0.047) if zh else max(11, s*0.046)}px">{t['sub_s'] if small else t['sub_sq']}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            {'<div></div>' if (small and not zh) else f'<div class="free" style="font-size:{max(10.5, s*0.04) if zh else max(8, s*0.032)}px">{t["free"]}</div>'}
            <div class="btn" style="font-size:{max(11.5, s*0.048) if zh else max(9, s*0.037)}px;height:{s*0.135}px;padding:0 {s*0.055}px">{t['cta']}<i>→</i></div>
          </div>
        </div>"""
    fit = f"""<script>(function(){{const W={w},H={h};
      const one=[...document.querySelectorAll('.fit')], wrap=[...document.querySelectorAll('.fitw')];
      const over=()=>document.body.scrollHeight>H+1||one.some(d=>d.scrollWidth>d.clientWidth+1)||wrap.some(d=>d.scrollWidth>d.clientWidth+1)||[...document.querySelectorAll('.in > *')].some(e=>e.getBoundingClientRect().bottom>H+0.5)||[...document.querySelectorAll('.sq')].some(e=>e.scrollHeight>e.clientHeight+1);
      for(let i=0;i<60&&over();i++)[...one,...wrap,...document.querySelectorAll('.num')].forEach(d=>d.style.fontSize=(parseFloat(getComputedStyle(d).fontSize)*0.96)+'px');
      document.body.dataset.fitDone='1';}})();</script>"""
    return css + body + fit + "</body></html>"

async def main(only=None):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for lang in COPY:
            for theme in THEMES:
                for w, h in SIZES:
                    if only and f"{w}x{h}" not in only: continue
                    pg = await b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
                    await pg.set_content(html(w, h, theme, lang))
                    await pg.evaluate("document.fonts.ready")
                    await pg.wait_for_timeout(120)
                    # re-run fit after fonts load
                    await pg.evaluate("""()=>{const H=innerHeight;const one=[...document.querySelectorAll('.fit')],wrap=[...document.querySelectorAll('.fitw')];
                      const over=()=>document.body.scrollHeight>H+1||one.some(d=>d.scrollWidth>d.clientWidth+1)||wrap.some(d=>d.scrollWidth>d.clientWidth+1)||[...document.querySelectorAll('.in > *')].some(e=>e.getBoundingClientRect().bottom>H+0.5)||[...document.querySelectorAll('.sq')].some(e=>e.scrollHeight>e.clientHeight+1);
                      for(let i=0;i<60&&over();i++)[...one,...wrap,...document.querySelectorAll('.num')].forEach(d=>d.style.fontSize=(parseFloat(getComputedStyle(d).fontSize)*0.96)+'px');}""")
                    fn = f"{OUT}/chainbrief_{lang}_{theme}_{w}x{h}.png"
                    await pg.screenshot(path=fn)
                    await pg.close()
        await b.close()

asyncio.run(main(sys.argv[1:] or None))
