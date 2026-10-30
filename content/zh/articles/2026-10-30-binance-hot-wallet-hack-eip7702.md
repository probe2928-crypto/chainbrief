---
title: 币安热钱包遭盗 多方冻结逾25亿美元
date: 2026-10-30T09:18:00+09:00
category: 交易所
author: Scott Park
region: 海外
summary: 全球最大加密交易所币安的热钱包在香港时间10月30日凌晨遭攻击，链上估算流出金额介于24亿至58亿美元之间。币安称已核实冻结25.4亿美元，将承担全部损失，充值和提现暂时暂停。事件可能刷新加密行业单笔被盗纪录，也把热钱包管理和稳定币"冻结权"同时推到台前。
---

全球交易量最大的加密货币交易所币安（Binance），在香港时间10月30日凌晨遭遇一场规模空前的热钱包攻击。链上分析机构对流出金额的估算从24亿美元到58亿美元不等，币安尚未公布确切损失。截至早上，币安表示经核实已冻结的资产合计25.4亿美元，联合创始人何一则称平台将承担全部被盗损失，充值与提现暂停，调查结束后会发布完整复盘。

## 发生了什么

据CryptoTicker整理的链上时间线，异常始于协调世界时10月29日20时20分左右，即香港时间30日凌晨4时20分。一个被标记为"Binance 14"的热钱包通过以太坊的EIP-7702机制，被授权委托给外部智能合约。几分钟后，约16.7万枚ETH连同数十种代币在一笔交易中转入新地址，随后又有约19.5万枚ETH和约7.8亿枚USDC陆续流出。安全公司Blockaid分析称，攻击者似乎无法确定该钱包当前的交易序号，于是在一笔交易里塞进50个EIP-7702授权，其中恰好有一个与钱包仍在发送的交易序号吻合并生效。Blockaid追踪到的可疑转出约33亿美元，分布在以太坊、Arbitrum和Avalanche三条链上。

损失口径至今不一。链上分析平台Arkham给相关钱包贴上了黑客标签，其显示的持仓一度接近58亿美元；Coinbase一名高管在社交平台上也提到最高58亿美元。但多家媒体指出，这些数字反映的是地址余额，不等于已确认的被盗金额。CoinDesk引述DefiLlama数据称，攻击前币安地址上的客户资产约1,440亿美元，按较高估算，流出部分约占4%。

拦截行动几乎与攻击同步展开。Tether首席执行官Paolo Ardoino表示已冻结逾15.67亿枚USDT；Circle首席执行官Jeremy Allaire称冻结了约8亿多美元USDC，并与执法部门合作。World Liberty Financial冻结了约2,700万美元USD1，Paxos也冻结了价值逾800万美元的PAXG。币安随后在X上发文，称外界流传的冻结数字不一，经其核实的冻结总额为25.4亿美元，并预计还会增加。

攻击者也在设法把可被冻结的稳定币换成发行方无法管控的资产。CoinDesk报道，黑客以盗得的USDT作抵押，在借贷协议Aave上借出至少2万枚WETH，并经去中心化交易所Uniswap兑换。Aave随即冻结V3和V4所有由DAO运营的市场，暂停新增存款和借款，但保留取款与还款功能，并表示合约本身未受影响。

市场反应迅速。CoinDesk数据显示，比特币一度跌约3%至78,800美元附近，ETH跌约4%，BNB跌近7%。币安前首席执行官赵长鹏在X上表示，此事看起来是一次黑客攻击，并称作为股东，他预期用户资金会得到全额保障。何一在香港时间早上8时左右发声，确认平台承担损失。另据报道，美国分支Binance.US未受影响。

## 争议焦点

第一，损失到底有多大、币安能否兜底。若确认为数十亿美元级别，这将超过2025年Bybit约14亿美元的被盗案，成为行业史上最大单笔失窃。CoinDesk指出，币安"用户安全资产基金"（SAFU）规模约10亿美元，不足以单独覆盖；但做市商Wintermute首席执行官Evgeny Gaevoy认为，币安的财力足以承受数倍于此的冲击。币安目前只公布已核实的冻结额，强调不会引用未经确认的数字。在正式复盘公布前，外界对净损失的判断仍有很大落差。

第二，稳定币发行方与DeFi协议的"冻结权"。这次能在数小时内拦下逾25亿美元，靠的正是Tether、Circle等中心化发行方的冻结功能，以及Aave的治理干预。支持者认为，这证明合规稳定币和可治理协议能在危机中保护用户；批评者则提醒，同样的权力也意味着链上资产随时可能被单方面锁定，所谓"去中心化"在关键时刻仍取决于少数机构的判断。

第三，EIP-7702带来的新攻击面。该机制在以太坊Pectra升级中引入，让普通地址可临时获得智能合约功能，原意是改善钱包体验。此次攻击显示，若交易所热钱包的签名流程被渗透，一笔授权就足以把整个钱包的控制权交出去。安全业界接下来会关注，交易所是否需要对热钱包禁用或严格限制这类授权。

## 影响与展望

对香港用户来说，这次事件凸显了持牌与否的差别。币安并不在香港证监会的持牌虚拟资产交易平台名单上。按证监会对持牌平台的指引，客户虚拟资产原则上须有98%存放于冷钱包，热钱包敞口受到严格限制。香港正在推进虚拟资产交易、托管等新牌照立法，托管标准很可能成为讨论重点。

接下来值得关注的有四点：币安何时恢复充值和提现，以及先开放哪些网络；复盘报告能否说明签名系统在哪个环节失守；冻结资产能追回多少、净损失最终是多少；以及执法部门是否会公布攻击者身份。冻结的稳定币如何返还、需经过什么法律程序，也将考验发行方与交易所之间的协作。

*本文仅供参考，不构成投资建议。*

**参考来源**
- [The Block · Binance investigating hack as suspicious outflows reach up to $5.8 billion](https://www.theblock.co/news/markets/2026-10-29-binance-investigating-hack-suspicious-outflows-5-billion-432171)
- [CoinDesk · Potential multi-billion Binance hack hitting crypto markets](https://www.coindesk.com/business/2026/10/29/potential-multi-billion-binance-hack-hitting-crypto-markets)
- [TechCrunch · Binance pauses withdrawals as hackers suspected of stealing billions](https://techcrunch.com/2026/10/29/binance-pauses-withdrawals-as-hackers-suspected-of-stealing-billions-in-crypto/)
- [PANews · 何一：用户资金安全，币安将承担全部损失](https://panews.io/articles/01a18a25-7497-7267-8392-e759e18b2783)
- [CryptoSlate · Stablecoin freeze tops $2.6 billion](https://cryptoslate.com/trumps-crypto-firm-joins-tether-circle-and-ripple-in-2-6-billion-stablecoin-freeze-as-binance-hack-outflows-near-6-billion/)
- [Binance · X上关于冻结金额的说明](https://x.com/binance/status/2115947325617299903)
