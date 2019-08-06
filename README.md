# Simple FiatDex Gateway
This is a simple browser-based interface to interact with the FiatDex protocol. All code is client based via javascript and it does not connect to any centralized server. FiatDex is a trustless fiat to crypto swap process. It uses game theory to incentivise each trader to complete a swap, otherwise face punishment for misbehaving. There are no arbitrators required or verification needed. There are no trade limits but as this is new software, trade responsibly.

Contract source: https://etherscan.io/address/0x2c110867ca90e43d372c1c2e92990b00ea32818b (Same on Rinkeby testnet)

## Learn More
Read the whitepaper to learn more about the process and how to trade.

## How to run
This is a browser based application and is mobile ready. You need to follow these steps to start running the application:
* Download entire git onto your computer
* Setup a localhost server which has access to the downloaded index.html file
* Open file in browser via localhost server

## Requirements
* MetaMask (https://metamask.io) installed into browser
* Ethereum (ETH) for collateral (for both buyer and seller of Ethereum, 150% of trade amount)

## Disclaimer
The FiatDex protocol is based on audited smart contract code but in itself is **not audited.** Keep this in mind when trading and do not trade with more funds then you are willing to lose. The code has been tested but please look at the smart contract itself and learn it before sending ETH to it. The code is provided as is without warranty. Use at your own risk.
