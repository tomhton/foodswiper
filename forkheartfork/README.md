# fork♥fork — Capacitor iOS Project

Swipe together, eat together. Decide dinner as a couple.

---

## Quick start (dev)

```bash
npm install
npm run dev        # opens at http://localhost:5173
```

---

## Build IPA for Sideloadly

### Prerequisites
- macOS with Xcode 15+ installed
- Node.js 18+
- A free Apple ID (for sideloading — no paid developer account needed)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the web app
npm run build

# 3. Add iOS platform (first time only)
npx cap add ios

# 4. Sync web assets into the iOS project
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```

### In Xcode:
1. Select the `App` target → **Signing & Capabilities**
2. Set your **Team** to your personal Apple ID (free)
3. Change the **Bundle Identifier** to something unique: e.g. `com.yourname.forkheartfork`
4. Select **Any iOS Device (arm64)** as the build target
5. **Product → Archive**
6. In the Organizer window → **Distribute App → Custom → Direct Distribution**
7. Export the `.ipa` file to your Desktop

### Sideload with Sideloadly:
1. Open Sideloadly
2. Drag the exported `.ipa` into Sideloadly
3. Connect your iPhone
4. Enter your Apple ID when prompted
5. Click **Start**
6. On iPhone: **Settings → General → VPN & Device Management → Trust** your Apple ID

---

## App icons

Place your icon files in `/public/icons/`:

| File | Size | Used for |
|------|------|----------|
| `icon-512.png` | 512×512 | PWA / manifest |
| `icon-192.png` | 192×192 | PWA |
| `icon-180.png` | 180×180 | iPhone home screen (3x) |
| `icon-167.png` | 167×167 | iPad Pro |
| `icon-152.png` | 152×152 | iPad |
| `icon-120.png` | 120×120 | iPhone (2x) |

Xcode also needs icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
Run `npx capacitor-assets generate` after adding a 1024×1024 `icon.png` to auto-generate all sizes.

---

## Google Places API

Add your key in the app settings (⚙️ button), or hardcode it in `App.jsx`:

```js
const [googleApiKey, setGoogleApiKey] = useState('YOUR_KEY_HERE');
```

---

## Multiplayer

Currently uses `BroadcastChannel` (works across tabs in the same browser — great for demos).

For production real-time multiplayer, swap the `mpConnect` / `mpSend` / `mpOnMessage` functions in `App.jsx` to use a WebSocket server:

```js
// Replace mpConnect with:
function mpConnect(code) {
  const ws = new WebSocket(`wss://your-server.com/room/${code}`);
  ws.onmessage = e => mpOnMessage(JSON.parse(e.data));
  mpWsRef.current = ws;
}

function mpSend(msg) {
  mpWsRef.current?.send(JSON.stringify({ ...msg, from: mp.myId, fromName: mp.myName }));
}
```

---

## Project structure

```
forkheartfork/
├── src/
│   ├── App.jsx          ← entire app UI + logic
│   ├── index.jsx        ← React entry point
│   └── index.css        ← global styles + iOS safe area
├── public/
│   ├── index.html       ← HTML shell with iOS meta tags
│   ├── manifest.json    ← PWA manifest
│   └── icons/           ← app icons (add your own)
├── capacitor.config.ts  ← Capacitor iOS settings
├── vite.config.js       ← Vite build config
├── package.json
└── README.md
```
