---
title: 新加坡两宗Ledger钱包被篡改案 损失约350万新元
date: 2026-10-29T09:20:00+09:00
category: 技术
author: Scott Park
region: 新加坡
summary: 新加坡警方10月28日发布警示，确认自9月以来接获至少两宗报案，受害人使用在本地零售店购入、内藏恶意硬件的Ledger钱包，合计损失约350万新元。这让本月从马来西亚经销商CryptoBilis爆出的供应链攻击，首次在新加坡有了官方数字，也把硬件钱包的销售渠道推到监管视野里。
---

本月在东南亚发酵的Ledger硬件钱包篡改事件，有了新加坡警方的正式说法。新加坡警察部队10月28日发出公众警示称，自9月10日以来至少接获两宗相关报案，两名用户合计损失约350万新元的加密资产。警方初步调查发现，涉案钱包购自新加坡部分零售店，设备内部被加装恶意硬件，可截取用户的助记词或私钥，令第三方在机主不知情的情况下转走资产。

## 发生了什么

事件最早在10月9日浮出水面。当天Ledger客服账号在社交平台X上表示，正调查东南亚多名用户的资金损失，这些用户的设备都购自经销商CryptoBilis；Ledger已要求该经销商暂停所有销售和发货，并建议过去90天内从该渠道购机的用户，若尚未初始化就不要启用，已启用的则应把资产转到用新助记词生成的新设备上。

10月10日，Ledger确认至少一台设备被植入未经授权的硬件。据其安全团队Donjon的分析，这块附加电路由一枚微控制器和支持eSIM的蜂窝模块组成，在用户初始化时读取屏幕上显示的24个助记词，再经LTE网络发送出去。它不破解设备的安全芯片，也不篡改交易内容，而是在源头拿走恢复钱包所需的全部信息。由于植入物位于主芯片之外，官方的设备真伪检测也无法发现。

10月13日，Ledger把范围扩大到七个市场，要求印尼、新加坡、泰国、菲律宾、越南、马来西亚和香港的经销商与分销商暂停销售Ledger设备，并把产品从货架撤下，直到调查结束。

损失规模至今没有官方数字。链上调查人员Specter追踪到的可疑被盗金额超过8600万美元，彭博社的报道则称约9300万美元，被盗资产分布在比特币、以太坊和波场等网络。Ledger表示无法确认受影响人数和总损失，只称受影响设备数量有限。新加坡警方这次公布的两宗个案、约350万新元，是目前少数经执法部门确认的数据。

警方表示已与Ledger保持联系，后者正在审查相关个案，调查仍在进行。警方建议用户遵循钱包厂商发布的安全指引，不要在怀疑被动过手脚的设备上存放资产；若担心助记词或私钥已外泄，应使用未受影响的设备生成全新助记词，把剩余资产转入新钱包。

## 争议焦点

第一个问题是责任归属。Ledger强调，其固件、内部系统和官网直销渠道都没有被攻破，确认的个案都与CryptoBilis售出的设备有关。CryptoBilis在印尼、马来西亚和菲律宾都被列为授权经销商，事发后已暂停销售所有品牌的硬件钱包，并临时关闭门店，称正与独立专家检视流程。但设备究竟在哪个环节被拆开改装、由谁所为，Ledger表示仍在查明。对受害者而言，"授权经销商"这层身份本来就是信任的来源，厂商与渠道之间的责任如何划分，可能决定赔偿能否落实。

第二个问题是事件是否只限于东南亚。德国一名顾客声称在MediaMarkt门店买到的Ledger设备也有植入物，MediaMarkt Saturn随即在欧洲多个市场下架Ledger产品，但该案没有资金损失报告，Ledger也未确认与CryptoBilis案有关。乐观的看法是，这是一次针对单一渠道的定向攻击；谨慎的看法则认为，只要第三方零售渠道存在，同类手法就可能在别处复制。

第三个问题关乎整个行业的销售模式。同业的反应比Ledger更激进：Trezor称没有发现自家设备受影响，但已把CryptoBilis移出授权名单，并宣布2027年1月1日起终止所有经销商授权；OneKey同样终止与CryptoBilis的合作，暂停接纳新经销商，并为2026年3月1日至10月12日期间经该渠道购机的用户免费换机，申请截至12月31日。Ledger则表示正检讨销售政策和防篡改措施，包括收紧供应商追踪要求、限定货源渠道，以及禁止把退货设备重新上架。收缩渠道能降低风险，却也会推高价格、拉长到货时间，对习惯在实体店即买即用的亚洲用户影响更直接。

这类风险也不是孤例。本月比利时钱包厂商NGRAVE的配套应用因第三方推送服务被劫持，至少约70个钱包被盗走256万美元以上；另一家厂商Keystone则披露网店客户资料外泄。三起事件的手法各不相同，但都发生在芯片之外的环节：配件、应用推送和零售渠道。

## 影响与展望

对新加坡和香港的用户来说，最直接的影响是购买渠道。两地都在Ledger暂停销售的七个市场之列，在调查结束前，本地实体店基本买不到新机。已持有设备的用户，需要先确认购买来源；若来自受影响渠道，按厂商和警方的建议更换助记词，比等待调查结论更稳妥。

从监管角度看，新加坡金管局和香港证监会的牌照框架主要覆盖交易平台、托管等服务机构，硬件钱包作为消费电子产品，其零售环节一般不在这些牌照的直接规管范围内。这次新加坡由警方而非金融监管机构出面发布警示，本身就说明了这一点。随着越来越多散户把资产从交易所转到自托管钱包，设备在出厂到用户手中这段路上由谁把关，可能成为监管讨论的新议题。

接下来值得关注的有三点：Ledger何时公布调查结论和确认的损失数字，以及是否提出赔偿方案；东南亚和香港的销售暂停何时解除、恢复后渠道会否收窄；以及新加坡警方的调查会否涉及更多个案或追查到篡改者。

*本文仅供参考，不构成投资建议。*

**参考来源**
- [AsiaOne · Compromised Ledger crypto wallets lead to 2 Singapore users losing $3.5m](https://www.asiaone.com/singapore/ledger-crypto-wallet-funds-compromised-singapore-police)
- [The Straits Times（Yahoo新加坡）· About $3.5 million lost in S'pore due to tampered Ledger crypto hardware wallets](https://sg.news.yahoo.com/3-5-million-lost-pore-082300572.html)
- [Cointelegraph · Ledger says LTE implants copied CryptoBilis wallet recovery phrases](https://cointelegraph.com/news/ledger-cellular-implants-wallets-sold-cryptobilis)
- [Decrypt · Ledger asks resellers in seven Asian markets to pull devices](https://decrypt.co/380940/ledger-asks-resellers-in-seven-asian-markets-to-pull-devices-after-suspected-86m-drain)
- [Tom's Hardware · Ledger to review sales and anti-tamper policies](https://www.tomshardware.com/tech-industry/cryptocurrency/ledger-to-review-sales-and-anti-tamper-policies-after-usd93-million-hardware-wallet-supply-chain-attack-rogue-lte-implants-reportedly-stole-users-recovery-phrases)
- [5news · Ledger硬件钱包东南亚及香港暂停销售](https://www.5news.com.hk/ledger-suspends-sales-southeast-asia-hong-kong-tampered-devices/)
