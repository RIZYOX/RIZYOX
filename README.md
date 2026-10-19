<div align="center">

# 🎛️ CYD-Deck Studio
### Next-Gen ESP32 CYD Touchscreen Stream Deck & Electron Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Stack-Electron_·_Node.js_·_C++_ESP32-blue?style=for-the-badge)](https://www.electronjs.org/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32--2432S028R_CYD-orange?style=for-the-badge)](https://github.com/witnessmenow/ESP32-Cheap-Yellow-Display)
[![OBS](https://img.shields.io/badge/OBS-WebSocket_v5-red?style=for-the-badge)](https://obsproject.com)

<p align="center">
  <b>Transformez votre écran tactile ESP32 CYD (Cheap Yellow Display à moins de 15€) en un véritable Elgato Stream Deck professionnel !</b><br/>
  Piloté par une application de bureau <b>Electron</b> moderne, réactive et connectée à OBS Studio, Discord, vos raccourcis multimédias et le monitoring de votre PC en temps réel.
</p>

</div>

---

## 🌟 Points Forts du Projet

- 🖥️ **Simulateur Virtuel Interactif :** Testez et configurez vos touches en direct depuis l'application Electron, même sans votre ESP32 branché !
- 📑 **Système Multi-Profils Avancé :** Basculez en 1 clic entre vos profils dédiés (*🔴 Streaming & Live*, *💻 Dev & Productivité*, *🎮 Gaming & Discord*). Possibilité de créer, dupliquer, et même **changer de profil au doigt directement depuis l'écran tactile CYD** !
- 🎨 **Importateur d'Icônes Personnalisées :** Importez vos propres images, logos et stickers (PNG, JPG, SVG, WebP) en plus du catalogue d'icônes vectorielles intégrées.
- 🎥 **Plugin OBS Studio v5 Natif :** Changement de scène, toggle mute micro, démarrage/arrêt stream et enregistrement avec retour d'état visuel en temps réel sur l'écran.
- 🎧 **Plugin Discord :** Mute / Unmute du microphone, Deafen (rendre sourd) et raccourcis vocaux instantanés.
- ⌨️ **Touches Multimédias & Macros Windows :** Play/Pause Spotify, contrôle du volume (+ / - / mute), lancement d'applications en 1 clic et frappe de raccourcis complexes (`Ctrl+Shift+...`).
- 📊 **Monitoring PC en Direct :** Envoi continu de la charge CPU (%) et RAM (%) affichée dans la barre d'état du CYD.
- 🌙 **Gestion Écologique de la Veille :** Extinction automatique du rétro-éclairage de l'écran (GPIO 21) lorsque votre PC se verrouille ou se met en veille.
- ⚡ **Double Connectivité :** Connexion **USB Série ultra rapide (< 2 ms)** avec auto-détection du port COM, ou **Wi-Fi sans fil via WebSocket**.

---

## 🏗️ Architecture Globale

```text
┌─────────────────────────────────┐           USB Série (115200 / 921600)          ┌───────────────────────────────────┐
│     ESP32 CYD (Hardware)        │ <============================================> │     CYD-Deck Studio (Electron)    │
│  - Écran TFT 2.8" (320x240)     │           ou Wi-Fi WebSocket (Port 8765)       │  - Interface Cyberpunk / Studio   │
│  - Dalle tactile XPT2046        │                                                │  - Simulateur d'écran en direct   │
│  - Rétroéclairage PWM (GPIO 21) │ ◄── [PAGE_SYNC / STATS / SLEEP]                │  - Inspecteur de touches          │
│  - Rendu C++ 60 FPS (TFT_eSPI)  │ ──► [TOUCH {"idx": 0, "type": "click"}] ──────►│  - Moteur de Plugins             │
└─────────────────────────────────┘                                                └─────────────────┬─────────────────┘
                                                                                                     │
                                                       ┌───────────────────────┬─────────────────────┴──────────────────┐
                                                       ▼                       ▼                                        ▼
                                            🔴 Plugin OBS Studio       🎧 Plugin Discord               ⌨️ Contrôleur Système Windows
                                            - obs-websocket-js v5     - Discord RPC & Hotkeys          - Touches Médias (Play/Vol)
                                            - Scènes & Mutes          - Micro & Casque Toggle          - Macros & Lancement d'Apps
```

---

## 📟 Schéma des Broches ESP32 CYD (ESP32-2432S028R)

| Composant | Broche GPIO | Fonction |
| :--- | :--- | :--- |
| **Écran LCD SPI** | `GPIO 13` (MOSI), `GPIO 12` (MISO), `GPIO 14` (SCK), `GPIO 15` (CS), `GPIO 2` (DC) | Affichage couleur 320x240 (ILI9341) |
| **Rétroéclairage LCD** | `GPIO 21` | Contrôle PWM de luminosité & extinction veille |
| **Dalle Tactile** | `GPIO 33` (CS), `GPIO 36` (IRQ), `GPIO 32` (MOSI), `GPIO 39` (MISO), `GPIO 25` (CLK) | Détection tactile XPT2046 |
| **Buzzer / Audio** | `GPIO 26` | Bip haptique lors des clics tactiles |
| **LED RGB Onboard** | `GPIO 4` (R), `GPIO 16` (G), `GPIO 17` (B) | Indicateur d'état (active-low) |
| **Carte MicroSD** | `GPIO 5` (CS), `GPIO 18` (SCK), `GPIO 19` (MISO), `GPIO 23` (MOSI) | Stockage optionnel d'images HD / GIFs |

---

## 🚀 Démarrage Rapide

### 1. Lancer l'application Electron (PC)

```bash
# 1. Cloner ou ouvrir le dossier
git clone https://github.com/RIZYOX/RIZYOX.git
cd RIZYOX

# 2. Installer les dépendances
npm install

# 3. Lancer l'application de bureau en mode dev
npm start

# 4. Compiler l'installateur Windows (.exe) autonome
npm run dist
# L'exécutable est généré dans : dist/CYD-Deck Studio Setup 1.0.0.exe
```

### ⚙️ Paramètres de l'Application
Accédez au menu **⚙️ Paramètres** en haut à droite pour :
- **Mode de lancement :** Normal, **Plein écran** (maximisé automatique) ou **Réduit** (dans la barre d'état/systray).
- **Démarrage automatique :** Option ON/OFF pour lancer l'application avec Windows.


### 2. Flasher l'ESP32 CYD

#### Méthode A — Avec PlatformIO (Recommandé en 1 clic)
Le fichier `firmware/platformio.ini` est déjà configuré avec toutes les broches du CYD :
```bash
cd firmware
pio run --target upload
```

#### Méthode B — Avec l'IDE Arduino
1. Ouvrez `firmware/arduino/cyd_streamdeck.ino` dans l'IDE Arduino.
2. Installez les bibliothèques **TFT_eSPI**, **XPT2046_Touchscreen** et **ArduinoJson** depuis le Gestionnaire de Bibliothèques.
3. Copiez le fichier `firmware/User_Setup.h` dans votre dossier `Documents/Arduino/libraries/TFT_eSPI/User_Setup.h`.
4. Sélectionnez la carte **ESP32 Dev Module**, choisissez votre port COM, et cliquez sur **Téléverser** !

---

## 📁 Structure du Projet

```text
├── package.json                   # Dépendances Node.js & Electron
├── main.js                       # Processus principal Electron & gestion Tray/Veille
├── preload.js                    # Pont IPC sécurisé ContextBridge
├── src/
│   ├── backend/
│   │   ├── config-store.js       # Stockage persistant des pages et profils
│   │   ├── serial-manager.js     # Gestionnaire série USB (Auto-reconnexion)
│   │   ├── websocket-server.js   # Serveur WebSocket sans fil (Port 8765)
│   │   ├── plugin-manager.js     # Orchestrateur des plugins
│   │   ├── system-monitor.js     # Sondes CPU / RAM en temps réel
│   │   └── plugins/
│   │       ├── obs-plugin.js     # Intégration OBS WebSocket v5
│   │       ├── discord-plugin.js # Intégration Discord
│   │       └── system-plugin.js  # Raccourcis clavier & médias Windows
│   └── renderer/
│       ├── index.html            # Interface du studio & simulateur
│       ├── style.css             # Design System Cyberpunk / Studio
│       └── app.js                # Contrôleur d'interface utilisateur
└── firmware/
    ├── platformio.ini            # Configuration PlatformIO automatisée
    ├── User_Setup.h              # Paramétrage broches TFT_eSPI pour le CYD
    ├── src/main.cpp              # Code source C++ du firmware CYD
    └── arduino/                  # Version prête pour l'IDE Arduino
```

---

## 📄 Licence

Ce projet est sous licence **MIT**. Développé avec passion pour la communauté Maker & Homelab par **[RIZYOX](https://github.com/RIZYOX)**.
