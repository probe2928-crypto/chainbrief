---
title: 비트코인 코어 지갑, 재전송 기능으로 주소·노드 연결 노출
time: 2026-11-27T12:55:00+09:00
category: 해외
region: crypto
important: false
---
비트코인 코어 개발자 아부바카르 사디크 이스마일이 25일(현지시간) 개발자 포럼 '델빙 비트코인'에 올린 실험 결과에 따르면, 코어 내장 지갑이 아직 블록에 담기지 않은 거래를 반복해 퍼뜨리는 과정에서 어느 노드가 어떤 주소를 관리하는지 드러날 수 있음. 테스트넷(regtest) 실험 30번 모두에서 해당 노드를 찾아냈고, 받은 거래와 감시 전용 지갑도 영향을 받음.

재전송 범위를 줄이는 코드 수정안(PR #36482)은 아직 검토 중이라, 당분간은 지갑 재전송을 끄거나 토르·I2P 전용으로 노드를 돌리는 방식이 대안으로 거론됨.

[자료: Delving Bitcoin · 원문 게시글](https://delvingbitcoin.org/t/exploiting-wallet-rebroadcast-to-link-addresses-to-node-ips-and-more/3123)
