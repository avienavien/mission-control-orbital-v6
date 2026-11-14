# Mission Control: Orbital

An interactive 3D satellite design and mission simulation built with React, TypeScript, Three.js, and Vite.

## Project layout

```text
MISSION-CONTROL-ORBITAL/
|-- source-code/   Application source and development configuration
|-- build/         Production build output
|-- demo.mp4       Optional project demo (not included yet)
|-- README.md
|-- references.md
```

The production site is generated into `build/` from the app in `source-code/`.

## Run locally

```bash
cd source-code
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:3000`).

## Create a production build

From `source-code/`, run:

```bash
npm run build
```

Vite writes the deployable static site to the root `build/` folder.

See [references.md](references.md) for the frameworks and libraries used.
