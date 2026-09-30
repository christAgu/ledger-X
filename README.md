# Ledger X - Custom Cosmos SDK App-Chain

Ledger X est une infrastructure DLT (Distributed Ledger Technology) souveraine, optimisée pour l'inclusion financière dans les marchés émergents. Elle connecte nativement les rails de paiement Web2 locaux (Mobile Money : Orange, MTN, Wave, M-Pesa) à la liquidité Web3 globale sans intermédiaires crypto tiers (Type Mercuryo/MoonPay).

Le solde on-chain des utilisateurs est exclusivement en EURC. Les recharges en XOF sont converties au taux fixe de **655,957 XOF = 1 EUR**, puis créditées en EURC ; les transferts Ledger X déplacent l’EURC et les retraits le reconvertissent en XOF.

Sur le devnet, `ueurc` (6 décimales) est un substitut de test que le trésor peut émettre et brûler. En production, Circle émet l’EURC : le trésor devra transférer les fonds depuis une réserve d’EURC, par exemple via IBC depuis Noble, au lieu de les émettre lui-même.

## 🚀 Architecture Technique

- **Framework Core :** Cosmos SDK (Langage Go)
- **Moteur de Consensus :** CometBFT (Finalité instantanée en 1-2 secondes pour la synchronisation Mobile Money)
- **Logique Applicative & AMM :** CosmWasm (Smart Contracts hautement sécurisés en Rust)
- **Interopérabilité de Réserve :** Protocole IBC pour transférer l’EURC depuis une réserve, par exemple Noble.
- **Onboarding & Authentification :** Module MPC (Multi-Party Computation) intégré via l'adresse du wallet, permettant une connexion par numéro de téléphone / SMS OTP ou Passkeys (Sans phrase de récupération de 12 mots).

## 🛠️ Modules Cosmos Spécifiques Activés

1. `x/auth` : Gestion des comptes mappés de manière invisible aux identifiants Web2.
2. `x/bank` : Contrôle strict de la supply. Sur le devnet, seul le trésor peut émettre ou brûler le substitut `ueurc`.
3. `x/feegrant` : Subvention totale des frais de calcul réseau par le Trésor. Expérience utilisateur 100% **Gasless** (gratuite).

## 📦 Flux de fonctionnement (dépôt)

1. L'utilisateur initie un dépôt de monnaie locale depuis l'application Ledger X.
2. Un agrégateur partenaire agréé (ex: Yellow Card, Flutterwave) encaisse le Mobile Money réel sur son compte marchand réglementé.
3. Le partenaire envoie un Webhook sécurisé et signé à notre infrastructure avec le montant en XOF.
4. Le relayer convertit les XOF au taux fixe CFA/EUR, puis crédite le smart account de l'utilisateur en EURC. L’émission de `ueurc` est réservée au devnet ; en production, le trésor transfère de l’EURC depuis sa réserve.

## Wallet mobile (`apps/wallet`)

L'application mobile Ledger X est construite avec Expo et Expo Router.

```sh
cd apps/wallet
npm install
npx expo start
```

Scannez le QR code avec Expo Go pour lancer l'application sur votre appareil.

## Chain devnet

La chaîne Cosmos SDK locale et le service relayer sont documentés dans
[`services/relayer/README.md`](services/relayer/README.md). Pour démarrer le
validateur de développement (clés explicitement non sécurisées) :

```sh
./chain/scripts/devnet.sh
```

Le script imprime les adresses du trésor, d’Amina et de Koffi. Les endpoints
locaux sont CometBFT RPC `http://localhost:26657`, REST `http://localhost:1317`
et relayer `http://localhost:8787`.
