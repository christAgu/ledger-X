# Ledger X - Custom Cosmos SDK App-Chain

Ledger X est une infrastructure DLT (Distributed Ledger Technology) souveraine, optimisée pour l'inclusion financière dans les marchés émergents. Elle connecte nativement les rails de paiement Web2 locaux (Mobile Money : Orange, MTN, Wave, M-Pesa) à la liquidité Web3 globale sans intermédiaires crypto tiers (Type Mercuryo/MoonPay).

Le protocole utilise un modèle synthétique sur-collatéralisé garanti par une réserve initiale de **1 000 000 \$ USDC** pour émettre des devises locales stables et programmables (`aXOF`, `aKES`, `aNGN`).

## 🚀 Architecture Technique

- **Framework Core :** Cosmos SDK (Langage Go)
- **Moteur de Consensus :** CometBFT (Finalité instantanée en 1-2 secondes pour la synchronisation Mobile Money)
- **Logique Applicative & AMM :** CosmWasm (Smart Contracts hautement sécurisés en Rust)
- **Interopérabilité de Réserve :** Protocole IBC (Liaison sécurisée à la réserve de 1 000 000 \$ USDC)
- **Onboarding & Authentification :** Module MPC (Multi-Party Computation) intégré via l'adresse du wallet, permettant une connexion par numéro de téléphone / SMS OTP ou Passkeys (Sans phrase de récupération de 12 mots).

## 🛠️ Modules Cosmos Spécifiques Activés

1. `x/auth` : Gestion des comptes mappés de manière invisible aux identifiants Web2.
2. `x/bank` : Contrôle strict de la Supply. Seule la clé d'infrastructure du Trésor a les droits exclusifs de `MsgMint` et `MsgBurn` sur les devises `a[DEVISE]`.
3. `x/feegrant` : Subvention totale des frais de calcul réseau par le Trésor. Expérience utilisateur 100% **Gasless** (gratuite).

## 📦 Flux de Fonctionnement (Minting)

1. L'utilisateur initie un dépôt de monnaie locale depuis l'application Ledger X.
2. Un agrégateur partenaire agréé (ex: Yellow Card, Flutterwave) encaisse le Mobile Money réel sur son compte marchand réglementé.
3. Le partenaire déduit l'équivalent en USDC du fonds de roulement déposé chez lui et envoie un Webhook sécurisé et signé à notre infrastructure.
4. Le nœud relais intercepte le Webhook, vérifie la signature, et déclenche une transaction `MsgMint` native sur la chaîne Cosmos vers le smart account non-custodial de l'utilisateur.

## Wallet mobile (`apps/wallet`)

L'application mobile Ledger X est construite avec Expo et Expo Router.

```sh
cd apps/wallet
npm install
npx expo start
```

Scannez le QR code avec Expo Go pour lancer l'application sur votre appareil.
