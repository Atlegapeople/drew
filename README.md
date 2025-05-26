# D.R.E.W. Vending Machine UI

This is a touchscreen-optimized [Next.js](https://nextjs.org) project built for the **D.R.E.W.** vending machine system: **Dignity • Respect • Empowerment for Women**.

It provides a secure, clean interface for authenticating via RFID or PIN, selecting feminine hygiene products, and confirming dispense — all built with modular React components and simulated hardware hooks that can be swapped for real GPIO or serial triggers on a Raspberry Pi.

---

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser to see the UI.

---

## 🧱 Project Structure

```
/src/app               # App Router pages for welcome, products, dispense, etc.
/src/components        # UI components split by domain (auth, products, ui)
/src/hooks             # Simulated RFID + dispense logic (hardware-ready)
/public                # Assets (images, logos, icons)
```

---

## 🧪 Simulated Hardware Hooks

This project uses mocked versions of:

* `useRFIDListener()` – Simulates RFID scan
* `useDispenseController()` – Simulates dispense delay and callback

These can later be swapped with real hardware integrations (GPIO, serial, WebUSB).

---

## 🧼 Commands

| Action         | Command              |
| -------------- | -------------------- |
| Run Dev Server | `npm run dev`        |
| Build Prod     | `npm run build`      |
| Start Prod     | `npm start`          |
| Lint Fix       | `npx eslint . --fix` |

---

## 📦 Deployment

Deploy via:

* Local Node.js server on Raspberry Pi
* Static export (`next export`) for kiosk use
* [Vercel](https://vercel.com/) for staging/demo environments

---

## 👷 Project by [Atlega People](https://github.com/Atlegapeople)

Built to provide equitable access to essential hygiene products for women, with empathy, dignity, and technology.

---

## 📚 Learn More

* [Next.js Documentation](https://nextjs.org/docs)
* [Tailwind CSS](https://tailwindcss.com)
* [Deploying to Raspberry Pi](https://www.raspberrypi.com/documentation/computers/getting-started.html)

---

> Version: `v1.0-ui-complete`
