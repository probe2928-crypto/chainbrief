---
title: 新元换欧元先验证再交收 新加坡与德国央行连通两本账
date: 2026-11-18T09:33:00+09:00
category: 技术
author: Scott Park
region: 新加坡
summary: 新加坡金管局和德国联邦银行11月16日公布Project Simbolon测试结果：星展银行和德意志银行在两家央行各自的测试环境里，用批发型央行数字货币完成欧元兑新元的“款对款”交收，两本账之间没有直接技术对接，靠零知识证明互相核验条件。
---

一家新加坡银行卖出新元、买入欧元，新元记在新加坡的账本上，欧元记在法兰克福的账本上。两边的系统从来没有接在一起。按新加坡金融管理局（MAS）11月16日公布的测试结果，这笔交易照样可以做到两种货币同时到账，任何一边条件不满足，整笔都不动。

这个项目叫Project Simbolon，是MAS和德国联邦银行（德国央行）的合作。参与的商业银行是星展银行和德意志银行，技术提供方是总部在新加坡的Partior。双方测试的是欧元兑新元外汇交易的“款对款”交收（PvP），也就是一种货币付出的同时，另一种货币必须到账，否则两笔都不生效。结算用的钱是两家央行各自测试环境里的批发型央行数字货币，即只供金融机构之间使用、由央行直接发行的数字货币。

MAS和德国央行在2025年11月签了合作备忘录，Simbolon是备忘录签署后交出的首个重要成果。

## 不对接，怎么核对

这次和以往跨境测试最大的不同，在于两家央行的账本之间没有直接的技术集成。按MAS新闻稿的说法，每个环境借助零知识证明，自己就能核实交收条件是否已经满足。

零知识证明是一种密码学方法：一方可以向另一方证明某件事是真的，却不必交出背后的数据。打个比方，A银行要让对方相信自己账上已经冻结了足够的欧元，可以只给出一份可验证的证明，而不必把余额和交易记录摊给对方看。

放到央行身上，这件事更敏感。央行账本记录的是全国大额支付，没有哪家央行愿意把系统直接开放给外国机构。用证明代替对接，各自的账本保留在自己手里，跨境交收需要确认的事项却可以核实。

测试还看了另一件事：机构在新加坡和德国两个市场、两个时区之间怎样调度资金和流动性，场景包括证券交易和日内流动性管理。冬季的新加坡下午四点，法兰克福才早上九点。两地营业时间只重叠几个小时，银行在这段时间里能不能把头寸调过来，是跨时区结算绕不开的问题。

## 三天里两场外汇测试

几天之内，MAS公布的跨境外汇交收测试不止这一场。11月13日，英伦银行、MAS和泰国央行公布了Meridian FX APAC的结果，在三套技术各异的模拟系统之间做同步交收，Partior开发了居中协调的“同步运营方”原型。

两场测试的路数不同。Meridian要接的是老式实时全额结算系统、代币化账本和批发型数字货币三类系统，由一个运营方居中协调。Simbolon两头都是批发型央行数字货币，重点放在不直接对接也能互相核验。两场测试都没有公布交易笔数或金额。

欧洲那头也在搭自己的基础设施。欧元体系9月21日推出Pontes，用央行货币结算代币化资产的批发交易。Cointelegraph在报道Simbolon时提到了Pontes，并写明Simbolon的目标包括为与代币化资产相关的跨境支付、外汇和证券交易建立共同标准，降低跨境转账的成本和耗时。

德国央行第一副行长萨比娜·毛德雷尔（Sabine Mauderer）在新闻稿中的说法是，这个项目为消除全球外汇交易的结算风险开了路。MAS副局长Leong Sing Chiong则把它定位为探索更高效跨境结算的未来路径。

## 新加坡和香港各走一段

新加坡在本地已经把批发型央行数字货币用到了真实交易上。据移动支付网2025年11月的报道，MAS当时在新元测试网络上首次实际发行批发型央行数字货币，星展、华侨和大华三家银行用它结算了银行间隔夜借款。今年MAS又试发了三期代币化MAS票据，规模从100万新元放大到1亿新元，同样用批发型数字货币结算。Simbolon等于把这套新元工具往欧洲延伸了一段。

香港选的是另一条线。金管局11月2日宣布，Ensemble项目的试行阶段升级为以代币化央行货币做全天候结算。11月16日，也就是Simbolon公布同一天，金管局又宣布与Swift扩大合作，研究把Ensemble接到Swift的区块链账本上，用多币种代币化存款处理跨境银行支付，中银香港、渣打银行（香港）和汇丰参与。香港的跨境方案更多押在银行发行的代币化存款上，新加坡这次用的则是央行直接发行的数字货币。

## 测试之外还缺什么

MAS同日发布了一份简要的《洞察报告》，完整报告题为《Project Simbolon：独立数字基础设施之间的跨境外汇结算连通》，新闻稿只说会“适时”发布，没有给日期。

两家央行列出的后续工作有两类：一是和业界一起优化结算性能，二是研究更大范围使用时涉及的法律、监管、运营和治理问题。新闻稿没有提到上线时间，也没有说会接入哪些币种。

到目前为止，这仍是测试环境里的结果，没有真实客户的钱经过。

本周三到周五（11月18日至20日），新加坡金融科技节在新加坡博览中心举行，代币化和数字货币都在议程上。

*本文仅供参考，不构成投资建议。*

**参考来源**
- [新加坡金融管理局 · MAS and Deutsche Bundesbank Advance Cross-Border Digital Asset Settlement Connectivity](https://www.mas.gov.sg/news/media-releases/2026/mas-and-deutsche-bundesbank-advance-cross-border-digital-asset-settlement-connectivity)
- [Cointelegraph · Singapore, German central banks advance cross-border settlement via CBDCs](https://cointelegraph.com/news/singapore-german-central-banks-settlement-cbdcs)
- [Cointelegraph · HKMA, Swift explore tokenized deposits for cross-border payments](https://cointelegraph.com/news/hkma-swift-tokenized-deposits-cross-border-payments)
- [欧洲央行 · Eurosystem brings central bank money to tokenised finance](https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr260921~e754847a7b.en.html)
- [香港金融管理局 · HKMA advances Project Ensemble pilot phase to 24/7 settlement in tokenised Central Bank Money](https://www.hkma.gov.hk/eng/news-and-media/press-releases/2026/11/20261102-5/)
- [澎湃新闻（移动支付网）· 新加坡金管局成功完成批发CBDC结算银行间隔夜借款试验](https://m.thepaper.cn/newsDetail_forward_32014509)
