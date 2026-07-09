# AERA | 3D Luxury Watch Experience

A next-generation, cinematic luxury watch landing page built with HTML5, vanilla CSS, Three.js, and GSAP. 

The website showcases a hyper-realistic, procedurally modeled 3D watch (the AERA "Monolith" Chronograph) floating in space. As the user scrolls, the watch reacts dynamically—translating, rotating, changing camera focus, and exploding along the Z-axis to show its intricate mechanical cogs, tourbillon, hands, crystal, and case.

## ✨ Features

- **Procedural 3D Watch Model**: Modeled entirely in code using Three.js geometries and materials (Grade 5 Titanium, NTPT Carbon Fiber, 18K Rose Gold, Platinum, and Royal Emerald Green).
- **Physical Glass Refraction**: Utilizes Three.js `MeshPhysicalMaterial` to emulate anti-reflective sapphire crystal glass.
- **Real-Time Clock Movement**: The skeleton watch hands rotate in real-time, matching your system's clock.
- **Tourbillon Escapement**: Animated inner gears rotate at variable ratios with a balance wheel that oscillates back and forth.
- **GSAP ScrollTrigger timelines**: Watch movement, exploded Z-axis animations, and text reveals are linked directly to scroll velocity.
- **Lenis Smooth Scroll**: Buttery-smooth, momentum-based scrolling.
- **Responsive matchMedia Support**: 
  - *Desktop*: Renders cinematic horizontal collection sliders and Z-axis exploded HUD lines.
  - *Mobile*: Stacks cards vertically and uses card scroll entry triggers to swap materials in the background. Locks down horizontal bounds to prevent overflows.
- **Magnetic Buttons & Hover Glows**: Micro-interactions that attract buttons to the mouse cursor.

## 🛠️ Tech Stack & Libraries
- [Three.js r128](https://threejs.org/) (Local Library)
- [GSAP 3.12.2](https://greensock.com/gsap/) & [ScrollTrigger](https://greensock.com/scrolltrigger/) (Local Library)
- [Lenis Smooth Scroll 1.0.19](https://github.com/studio-freight/lenis) (Local Library)
- [Lucide Icons](https://lucide.dev/) (SVG Loader)
- Space Grotesk & Syne (Google Fonts)

## 🚀 How to Run Locally

You can serve this project using any local HTTP web server.

### Using Python (Installed by default on most systems):
Open your terminal in the project directory and run:
```bash
python -m http.server 3000
```
Then, open **`http://localhost:3000`** in your browser.

### Using Node/npm:
If you have Node.js installed, you can install the server and run:
```bash
npm install
npm run dev
```
Then, open **`http://localhost:3000`** in your browser.
