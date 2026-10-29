---
title: DTCC switches on tokenized stocks and Treasuries with 20 banks and brokers signed up
date: 2026-10-29T21:40:00+09:00
category: Industry
author: Scott Park
region: US
summary: The firm that sits under almost every U.S. securities trade has opened a live service that turns stock, ETF and Treasury positions into blockchain tokens. The launch is narrow by design, and that is exactly what supporters and crypto-native critics are arguing about.
---

The Depository Trust & Clearing Corporation, the post-trade utility behind most American stock and bond settlement, put its tokenization service into production on Oct. 28. Twenty firms, among them J.P. Morgan, Citi, Bank of America, Morgan Stanley, Fidelity and Citadel Securities, have signed up to convert holdings at DTCC's depository into tokens that can move between approved wallets at any hour. It is the first time the core of U.S. market plumbing has offered on-chain versions of mainstream securities as a running product rather than a test.

## What happened

The service is run by the Depository Trust Company, the DTCC unit that holds more than $114 trillion of securities in custody. A participant asks DTC to convert part of an existing position, DTC mints a matching token on a supported blockchain, and the token is sent to a wallet the participant has registered in advance. The process runs in both directions, so a token can be turned back into a normal book-entry position. CoinDesk reported that conversions happen during business hours with a target of 15 minutes or less, while transfers between registered wallets can continue around the clock.

What can be tokenized is set by a no-action letter that staff at the Securities and Exchange Commission issued on Dec. 11, 2025. It covers stocks in the Russell 1000 index, ETFs that track major benchmarks such as the S&P 500 and Nasdaq-100, and Treasury bills, notes and bonds. CoinDesk counted 34 eligible securities on DTCC's website at launch, with a combined market value of about $30 trillion. That figure describes the size of the underlying issues, not the amount actually converted so far, which DTCC has not disclosed.

Two networks are connected on day one. One is the Canton Network, a blockchain built for regulated finance where validators are vetted. The other is a private network DTCC runs on Besu, an Ethereum-compatible client. DTCC says more networks will follow in 2027, and reporting by Genfinity and CoinDesk points to Stellar in the first half of that year and Circle's Arc chain among the additions. DTCC also plans to add more corporate-action handling, settlement against digital cash, and the use of tokenized positions as collateral.

The other signers are Alpaca, Apex Clearing, Barclays, BNP Paribas, Brown Brothers Harriman, Clear Street, DriveWealth, Edward Jones, Interchange Clearing, Marex, Mirae Asset Securities (USA), State Street, UBS and Velocity Capital. More will be added on a rolling basis. The launch follows live production trades in July involving more than 30 firms, which tested collateral pledges, securities lending, Treasury repo and margin flows. More than 150 firms sat on the industry working group that shaped the design, and vendors including BitGo, Fireblocks, Taurus, Broadridge, Ondo, Tradeweb and Virtu helped with the rollout.

The tokens are not new shares. Legal ownership stays with Cede & Co., DTC's nominee, and the token represents the participant's entitlement on DTC's books, carrying the same dividends and corporate-action entitlements as the traditional position. The SEC letter adds several guardrails. Tokens may only move between wallets that DTC has approved, DTC keeps the ability to reverse transfers without the holder's private keys, and DTC gives tokenized entitlements no value in its own collateral and settlement risk calculations. It must also send the SEC quarterly figures on participants, volumes, wallet counts and the chains in use. The relief runs for three years from launch.

## The debate

Supporters see this as the piece that has been missing. Tokenized stocks have existed for years, but most were synthetic products issued offshore that tracked a price without giving the holder a claim on the share. Here the token sits on top of the same custody record that already backs the U.S. market, so a bank's risk and legal teams are dealing with a familiar asset. That matters for the use cases DTCC is pitching first, such as moving collateral at night or on weekends when traditional systems are shut. Franklin Templeton's Roger Bayston argued earlier this year that securities are a permissioned business by nature, and that a closed design is a feature for this market rather than a flaw.

Critics from the crypto side see the same features differently. When DTCC picked Canton last December, developers including Status Network's Cyprien Grau objected that the network's validator set is gated and its state cannot be audited end to end by outsiders, according to The Coin Republic. Lawyer Gabe Shapiro of MetaLeX has argued that a DTC token is a claim on DTC's own claim to a security, which leaves the existing intermediary chain untouched. The reversibility clause and the registered-wallet rule mean these tokens cannot circulate in open DeFi markets the way stablecoins do. DTCC's digital-assets head, Nadine Chakar, has rejected the walled-garden label, telling a January forum: "We're not building walled gardens." Her case is that chains can be added as they meet DTCC's standards for resilience and security.

There is also a quieter commercial question. Exchanges are building their own tokenized routes. The SEC approved a Nasdaq proposal in March that lets brokers flag orders for tokenized settlement, with DTC doing the conversion in the background. In September the SEC published a five-year innovation exemption for venues trading tokenized U.S. stocks, and OKXICE, a joint venture between OKX and NYSE owner Intercontinental Exchange, filed in early October to run a permissioned on-chain venue for more than 60 U.S.-listed names. Whether these routes end up feeding DTC's tokens or competing with them is still open.

## What it means

For the U.S., the launch moves tokenization from a regulatory permission to an operating system that large banks are already connected to. The immediate effect is likely to be felt in collateral and financing desks rather than in retail apps, since only DTC participants can request tokens and transfers are limited to approved wallets. Brokers such as Alpaca and DriveWealth on the participant list suggest that retail-facing products could follow, but nothing in the launch materials sets a date.

For Europe and Singapore, the comparison is with models that issue securities natively on a ledger, such as projects under the EU's DLT Pilot Regime and Singapore's Project Guardian. DTCC has taken the opposite route, wrapping the existing record instead of replacing it. If that proves cheaper and faster to adopt, it could shape how other market infrastructures approach the same problem.

The checkpoints are concrete. DTC's quarterly reports to the SEC will show for the first time how much is actually tokenized and how often it moves. The 2027 additions of Stellar and Arc will test how open the system becomes in practice. And the progress of the Nasdaq and OKXICE venues will show whether on-chain trading of U.S. stocks grows inside DTC's framework or alongside it.

*This article is for information only and is not investment advice.*

**Sources**
- [DTCC · DTCC Tokenization Service Goes Live](https://www.dtcc.com/press-releases/2026/dtcc-tokenization-service-goes-live)
- [CoinDesk · Wall Street giant DTCC launches tokenization for $30T stocks, ETFs and U.S. Treasuries](https://www.coindesk.com/business/2026/10/28/wall-street-backbone-dtcc-brings-usd30-trillion-securities-closer-to-blockchain-with-major-banks)
- [Genfinity · DTCC Tokenization Service goes live for securities in $114 trillion of DTC custody](https://genfinity.io/2026/10/28/dtcc-tokenization-service-goes-live-114-trillion/)
- [Dechert · SEC greenlights DTC's tokenization pilot program](https://www.dechert.com/knowledge/onpoint/2025/12/sec-greenlights-dtc-s-tokenization-pilot-program.html)
- [Decrypt · DTCC "not building walled gardens" for tokenization, says digital assets head](https://decrypt.co/354791/dtcc-walled-gardens-tokenization-digital-assets-head)
- [The Block · OKX, NYSE parent ICE joint venture seeks to launch tokenized US stock trading venue](https://theblock.co/news/business/2026-10-05-okx-ice-joint-venture-tokenized-stock-trading-417613)
