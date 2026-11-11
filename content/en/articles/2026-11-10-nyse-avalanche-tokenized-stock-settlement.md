---
title: NYSE picks Avalanche to settle tokenized stocks, but the matching engine stays its own
date: 2026-11-10T21:36:00+09:00
category: Industry
author: Scott Park
region: US
summary: Ava Labs says Avalanche will be the ledger behind the clearing firm for the NYSE-affiliated tokenized securities venue, after about a year of testing. The venue still needs regulatory approval, and the clearing firm itself has not been named.
image: media/articles/2026-11-10-nyse-avalanche-tokenized-stock-settlement.png
image_alt: Flow of the planned NYSE tokenized venue: broker-dealers, NYSE Pillar matching engine, Avalanche ledger for clearing and settlement (clearing firm not named), stablecoins and tokenized deposits; timeline Jan 19 venue unveiled, March SEC Nasdaq pilot, Sep 17 SEC innovation exemption, Nov 9 Avalanche named, Q4 launch target pending approval
image_note: AI-made graphic (summary of article)
---

For most of this year, people building on public blockchains have asked one question about the New York Stock Exchange: which chain? On Monday, Ava Labs answered it. Avalanche will serve as the core ledger for clearing and settlement at the planned NYSE-affiliated venue for tokenized securities, the company said in a statement on Nov. 9, confirmed in coverage by The Block, crypto.news and Disruption Banking.

That is a narrower job than some early headlines suggested. Orders will still be matched by NYSE's own technology. Avalanche comes in after the match, where the record of who owns what gets written and where cash and shares change hands.

## Behind the trade, not inside it

NYSE first laid out the venue on Jan. 19. Intercontinental Exchange, its parent, described a platform that would pair the NYSE Pillar matching engine with blockchain-based post-trade systems. The pitch was aimed at habits that the regular stock market cannot serve: trading U.S. listed equities and ETFs around the clock, buying fractional shares, placing orders by dollar amount instead of share count, funding trades with stablecoins and settling at once rather than the next business day.

The January release also promised that tokenized shares would be fungible with ordinary ones, meaning a token and a conventional share of the same company would be interchangeable, and that holders would keep dividend and voting rights. Access would run through qualified broker-dealers rather than directly to the public. ICE said at the time that it was working with BNY and Citi on tokenized bank deposits, so clearing members could move money and meet margin calls when banks are closed.

What was missing was the ledger. The design allowed for several blockchains on the custody side, and the venue is expected to support shares issued on more than one chain. The settlement layer for the clearing firm is a different matter: one system has to be the final word on who owns what. That is the role Avalanche now has.

Dennis Lee, NYSE's head of digital issuance, framed the choice around control, including control over which parties are allowed to take part. "Avalanche meets all those needs," he said, according to crypto.news and Disruption Banking. Neither outlet, nor The Block, said whether the ledger will be a dedicated Avalanche network or run on its main public chain, and the clearing firm itself has not been named.

## A year of tests, then a quiet confirmation

None of this came out of nowhere. In September, Ava Labs President Charley Cooper told The Block that NYSE had spent the previous year testing Avalanche and working out how it would fit with the exchange's systems. At the same event, ICE's Michael Blaugrund said the company was "very engaged" with the project. Neither man said a decision had been made, and The Block noted then that NYSE had not picked a chain.

The pieces around the ledger were filled in over the summer and autumn. In August, ICE signed up tZERO as a design partner, a deal that crypto.news says also covered patent licensing and an investment. Securitize was already on board. The week before Monday's news, the venue added Broadridge, Computershare, Equiniti and Superstate to handle issuer-sponsored tokenized shares and transfer-agent work. Transfer agents keep the official register of a company's shareholders. According to crypto.news, the three traditional names among them serve close to 5,000 listed companies, including about 99% of the S&P 500. That makes six transfer-agent partners, the firms that would actually move a company's register onto the new rails.

The Block, citing The Wall Street Journal, reported that the venue is aiming to launch in the fourth quarter. That leaves less than eight weeks, and every source says the launch depends on regulatory approval. None of them said which approval, or from whom.

The token tied to the network moved faster than the paperwork. AVAX rose roughly 8% over 24 hours after the news, by KuCoin's count, while some outlets put the jump closer to 10% depending on when they took the snapshot.

## Two doors the SEC has already opened

NYSE is not walking into an empty room. In March, the Securities and Exchange Commission approved a Nasdaq pilot that lets eligible participants trade certain stocks either in their usual form or as tokens, with the same ticker, the same price and the same order book. The pilot covers Russell 1000 stocks and ETFs tied to the S&P 500 and Nasdaq-100, and it runs through the Depository Trust Company, the plumbing that settles almost all U.S. stock trades today. Finance Magnates reported that the SEC first raised concerns about surveillance and about token prices drifting away from share prices, and approved the plan after Nasdaq filed a more detailed version.

The second door opened on Sept. 17. The SEC issued a five-year "innovation exemption" that lets qualifying tokenized securities venues trade tokenized versions of listed U.S. stocks on-chain without registering as exchanges. The conditions, as summarized by White & Case and The Block, are strict. Venues must be U.S. persons, admit only vetted participants and follow sanctions rules. Lending and credit to buy tokens are banned. Trade data has to be published within ten minutes. Volume is capped as a small slice of each stock's normal daily trading. A company whose stock is tokenized by an unaffiliated party can block it by objecting within 30 days. The exemption runs until Sept. 17, 2031, unless the SEC changes it.

The two routes do different things. Nasdaq's pilot keeps tokenized shares inside the existing market and the existing settlement chain. The exemption creates a separate lane for on-chain trading with tight limits. NYSE's design sits somewhere between them: an exchange-grade matching engine, a blockchain ledger after the trade, and stablecoin money moving through it at hours when the DTC is closed.

Settlement is the part that has kept Wall Street cautious. U.S. stocks moved to settlement one business day after the trade only in 2024. A 24/7 venue that settles immediately removes that buffer, which also removes the time brokers use to net trades against each other and line up cash. That is why the tokenized deposit work with BNY and Citi matters as much as the choice of chain.

## Washington changes hands in January

The politics around all of this shift soon. Democrats won both chambers of Congress in last week's midterm elections, and Sen. Elizabeth Warren, a long-standing critic of the crypto industry, is set to chair the Senate Banking Committee from January. The SEC's exemption is an agency action and does not need Congress, but committee chairs set the hearing agenda, and market structure legislation has already failed once this year: the Senate voted 49-50 against the Clarity Act days before the exemption came out.

For the venue, the open items are concrete. The clearing firm needs a name and a sign-off, the regulators involved have not been identified in public reporting, and the fourth-quarter target expires on Dec. 31.

*This article is for information only and is not investment advice.*

**Sources**
- [The Block · NYSE to settle tokenized stocks on Avalanche in planned 24/7 market](https://www.theblock.co/news/business/2026-11-09-nyse-settle-tokenized-stocks-avalanche-planned-24-7-market-436208)
- [crypto.news · NYSE selects Avalanche to power settlement for tokenized stock platform](https://crypto.news/nyse-selects-avalanche-to-power-settlement-for-tokenized-stock-platform/)
- [Disruption Banking · NYSE to use Avalanche for clearing and settlement on tokenized securities platform](https://www.disruptionbanking.com/2026/11/09/nyse-to-use-avalanche-for-clearing-and-settlement-on-tokenized-securities-platform/)
- [ICE · The New York Stock Exchange Develops Tokenized Securities Platform (Jan. 19)](https://ir.theice.com/press/news-details/2026/The-New-York-Stock-Exchange-Develops-Tokenized-Securities-Platform/)
- [White & Case · SEC creates five-year conditional innovation exemption for onchain trading of tokenized U.S. stocks](https://www.whitecase.com/insight-alert/sec-creates-five-year-conditional-innovation-exemption-onchain-trading-tokenized-us)
- [Finance Magnates · SEC approves Nasdaq pilot allowing investors to trade tokenized stocks](https://www.financemagnates.com/cryptocurrency/sec-approves-nasdaq-pilot-allowing-investors-to-trade-tokenized-stocks/)
