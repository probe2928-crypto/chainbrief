---
title: 英新泰央行试通跨系统外汇同步结算 英伦银行2028年上线接口
date: 2026-11-14T09:20:00+09:00
category: 技术
author: Scott Park
region: 新加坡
summary: 英伦银行、新加坡金管局和泰国央行11月13日公布Meridian FX APAC试验结果，在传统RTGS、代币化账本和批发型央行数字货币三套模拟环境之间做到外汇“同步交收”；英伦银行计划2028年推出正式的同步接口，但法律、托管和营业时间等问题仍待解决。
---

一笔英镑换新加坡元的交易，钱要在伦敦和新加坡两套系统里各走一遍。英镑先付出去、新元晚几个小时才到，中间这段空档，就是外汇市场说了几十年的“结算风险”。国际清算银行（BIS）2025年三年一度的调查估算，2025年4月平均每天仍有超过1.4万亿美元的外汇结算完全暴露在这种风险下，约占当日结算量的一成，折合约10.9万亿港元。

11月13日，英伦银行、新加坡金融管理局（MAS）和泰国银行（泰国央行）联合公布了Meridian FX APAC项目的试验结果。三家央行的结论是：即便各自的支付系统用的是完全不同的技术，两种货币也可以做到“同时交、同时收”，要么两边一起完成，要么一起作废。

这个项目2025年11月宣布，由新加坡的Partior开发并测试一个叫“同步运营方”（Synchronisation Operator）的原型。澳洲储备银行和菲律宾中央银行以观察员身份参与。它接续的是BIS创新中心伦敦中心此前牵头的Meridian FX，那一轮的合作方是英伦银行、法兰西银行、德国央行、意大利央行和欧洲央行，范围限于欧洲。

## 三套系统，三种做法

这次试验的难点不在“快”，而在“不一样”。按英伦银行发布的技术报告，参与测试的是三套模拟环境：英伦银行的“同步实验室”模拟传统的实时全额结算系统（RTGS），带有预留资金的功能；泰国央行的Project SAN是一套代币化原型系统，由中央统一管理代币账本；新加坡的SGD Testnet则是批发型新元央行数字货币的共享账本，报告注明这是非生产、非上线的配置。

换句话说，一边是记账式的老系统，一边是代币，一边是央行数字货币。三家要证明的是，不必先把系统改成同一种技术，也能让外汇两条腿同时落地。

测试分两类。一类是单笔的“款对款”（PvP），即一种货币的付款只有在另一种货币同时付出时才生效；另一类是三套及以上系统之间的多边净额PvP，把多笔交易轧差后一起结算，用来省流动性。报告把能否“预留资金”（earmarking）列为关键：结算前先把钱冻在账上，各方才能确认这一组交易能一起走完。

报告还专门做了出错测试：余额不足、账号无效、央行系统中断，以及在多边结算里同时出现账号无效和余额不足。按报告的描述，同步运营方在每种情况下要么完成交易，要么把整组交易完整撤回，没有出现一边付了、另一边没收到的半截状态。

## 为什么新加坡的角色不小

Partior由摩根大通、星展银行和淡马锡联合创立，渣打银行2022年入股成为创始合作伙伴，总部就在新加坡。MAS这几年一直在推批发型数字货币和代币化，这次放进试验的正是新元的批发型测试网。

MAS首席金融科技官Kenneth Gay在联合新闻稿中表示，同步机制可以让不同系统之间实现PvP，降低结算风险，同时保留各系统之间的互通。英伦银行负责支付、创新与金融科技的执行董事Tom Mutton说，结果提供了实证，说明同步结算有望让跨境外汇更安全、更有效率。泰国央行支付系统与金融科技政策部主任Pucktada Treeratpituk的说法相近，并强调要维持市场对央行货币的信任。

报告列明的测试币种包括英镑和新元。商业银行在试验中只以“模拟参与方”出现，三家央行没有公布任何一家真实银行的名字，也没有给出交易笔数或节省了多少流动性。

## 谁来保管这笔钱，还没定

技术上走通了，但运营方该扮演什么角色仍有争议。三家央行的设想是同步运营方不碰客户资金，只负责协调。试验里却出现了例外。据Ledger Insights的报道和技术报告的描述，在SGD Testnet环境中，资金放进了由Partior管理的专用托管账户，运营方在结算过程中短暂持有资金；Project SAN则是在系统内部完成资金托管，不经运营方之手。

一旦运营方替别人拿着钱，或者替各方计算净额头寸，它要承担的监管责任就会变。The Block援引政策报告称，三家央行列出的待解问题包括运营韧性、结算终局性、治理、责任归属和跨境数据共享。

报告也承认这次试验的边界：环境是模拟的，没有覆盖商业银行货币的完整交易流程，并且假设各系统的营业时间有重叠。伦敦、新加坡和曼谷的RTGS开关门时间并不一致，资金预留能不能过夜、要不要设共同结算窗口，报告都列为未决问题。是否应由央行自己来做多边净额，也还没有答案。

## 下一步是2028年

外汇结算风险常被叫作“赫斯塔特风险”，名字来自1974年倒闭的德国赫斯塔特银行，当时对手方已经付出马克，却没收到美元。五十多年后，主要货币之间已有CLS这类集中结算机构提供PvP，但BIS的数字说明，每天仍有约一成的结算没有这层保护。三家央行想试的，是不靠一家集中机构、而是把各国现有系统直接“对表”的另一条路。

MAS在新闻稿中说，后续工作可能扩展到更多司法辖区、更多行业参与者、更多币种和交易场景，并处理技术、法律、运营和治理安排。英伦银行的时间表更具体：它计划在2028年推出一个正式上线的同步接口，与英伦银行和英国金融行为监管局（FCA）就代币化前景发出的征询相衔接。

那会是这套机制第一次碰到真钱。

*本文仅供参考，不构成投资建议。*

**参考来源**

- [新加坡金融管理局 · BoE, MAS and BOT Complete Trial of Synchronised FX Settlement](https://www.mas.gov.sg/news/media-releases/2026/boe-mas-and-bot-complete-trial-of-synchronised-fx-settlement-across-different-currencies-and-systems)
- [英伦银行 · Project Meridian FX APAC media release](https://www.bankofengland.co.uk/news/2026/november/the-boe-monetary-authority-of-singapore-and-bank-of-thailand-media-release)
- [英伦银行 · Project Meridian FX APAC: Technical Report](https://www.bankofengland.co.uk/payments/payments-innovation/wholesale-experiments-programme/project-meridian-fx-apac-technical-report)
- [The Block · UK, Singapore and Thailand central banks complete FX settlement trial](https://www.theblock.co/news/regulation/2026-11-13-uk-singapore-and-thailand-central-banks-complete-foreign-exchange-settlement-trial-linking-traditional-and-tokenized-systems-439692)
- [Ledger Insights · Bank of England, MAS, Bank of Thailand complete DLT synchronization trials](https://www.ledgerinsights.com/bank-of-england-mas-bank-of-thailand-complete-dlt-synchronization-trials/)
- [吴说区块链 · 英国、新加坡及泰国央行完成跨境外汇同步结算实验](https://www.wublock123.com/news/uk-singapore-thailand-central-banks-cross-border-forex-sync-settlement-dlt-interoperability-71911)
