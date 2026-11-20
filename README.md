# Weather Explorer

Explore the weather anywhere in the world, like a TV weather forecast where you hold the remote.

**Live demo:** https://c-panagopoulos.github.io/weather-explorer/

## What it does

- **See the whole picture.** A smooth colour field covers the map, like a TV forecast, and follows you as you pan and zoom. Switch it between **temperature, chance of rain and wind**. Your saved places and about 30 major cities show their values. The labels are placed so they never overlap each other or sit under a panel. A collapsible legend explains the colours and links to the coldest and warmest spot on screen (or the driest/wettest, calmest/windiest).
- **Look ahead.** A 24-hour timeline (with Play) moves the whole picture through the forecast: map colours, city and place values, the probe and the open place. It shows "+2 h" on the left and the resulting time on your clock (e.g. 17:16) on the right.
- **Read any spot.** A probe follows the mouse and shows the value, the condition and the nearest place ("Near Ioannina, Greece"). The names come from a bundled list of about 300 cities, with no network calls.
  - **Keyboard:** focus the map and a crosshair appears; the arrow keys pan and Enter opens the forecast.
  - **Phones:** a ring stays in the centre while you drag the map under it.
- **Dive into a place.** Search for a city, or click anywhere (even the open sea). The details show:
  - current conditions and a comparison with your places ("6° warmer than Lisbon · 7° colder than Cairo")
  - a 24-hour chart and a 7-day forecast
  - a *Share link* that reopens the same place, unit and hour
- **See it, don't just read it.** The details open on a photo of the place (Athens shows the Acropolis) with the current weather animated on top: rain, snow, fog, clouds, sun or lightning.
  - **At night** there it uses a night photo (Sydney Harbour Bridge lit up), or darkens the day photo when no night photo exists.
  - **Points on the map** borrow the photo of the nearest city or region.
- **Build your own picture.** Save places to *My places* and compare them:
  - now, today's low–high on one shared scale, and chance of rain
  - sorted, as a list or as one 24-hour chart
  - remove with Undo; the list is kept in `localStorage`
- **Weather where you are** with *My location*.
- **°C / °F**, remembered. **Dark by default**, with a light theme that follows the system.

**Layout.** On desktop, search, location, units and a *My places* dropdown sit in the top bar. The legend is at the bottom left, the timeline is centred on the free map area, and the right side belongs to the open place. On phones the controls fit one top row, *My places* is a drawer that slides up (tap or swipe its handle, or use Compare / Hide), and the details open as a bottom sheet.

## 1. Installation and setup

**Prerequisites:** Node.js **20.19+ or 22.12+** (required by Vite 8) and npm.

```bash
git clone https://github.com/c-panagopoulos/weather-explorer.git
cd weather-explorer
npm install
npm run dev        # http://localhost:5173
```

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm test`        | Unit tests (Vitest)                |
| `npm run build`   | Production build into `dist/`      |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | Lint with oxlint                   |

**Environment variables:** none. Every service used works without an API key.

Geolocation only works on `localhost` or over HTTPS (a browser rule). The live demo is served over HTTPS.

## 2. Implementation choices

| Choice | Why |
| --- | --- |
| **React 19 + Vite**, plain **JavaScript** | Fast to build and run with almost no configuration; plain JS keeps the code easy to follow. |
| **Leaflet + react-leaflet** | A mature, light, free map that handles touch, keyboard panning and zoom. Base map: **Esri Canvas Dark / Light Gray** tiles, which keep the colour field readable. |
| **Canvas colour field** | Grid values are interpolated with inverse distance weighting on a coarse canvas, upscaled with a blur and blended over the tiles. It lives in Leaflet's overlay pane, so it pans with the map for free. It is drawn 30% beyond the screen, so a drag shows real colours at once, and repeated on every copy of the world when zoomed out. |
| **No UI or chart library** | The charts are small hand-written SVGs (with HTML labels laid over them) and the styling is plain CSS with theme variables. This means fewer dependencies and full control over accessibility. Fonts: Hanken Grotesk and IBM Plex Mono. |
| **React Bits** (see below) | Three ready-made components for the finishing touches: rolling numbers, an elastic timeline and a subtle glow. |
| **Vitest** | Unit tests for the core logic: grid generation, caching, unit conversion, weather codes and forecast parsing. |
| **GitHub Actions → GitHub Pages** | Each push to `main` runs the tests, builds and deploys the live demo. |

**Runtime dependencies:** `react`, `react-dom`, `leaflet`, `react-leaflet`, and `motion` (used by React Bits' CountUp).

### React Bits components

Copied into `src/components/bits/` under React Bits' **MIT + Commons Clause** licence (© David Haz). The licence allows use inside an application and forbids selling or redistributing the components on their own. The licence text is in `src/components/bits/LICENSE.md`, and each file keeps its copyright notice.

| Component | Where | Notes |
| --- | --- | --- |
| **CountUp** (roll mode) | Big temperature in the details; *Now* chips in My places | The digits roll when a place opens or the hour changes. The animated copy is `aria-hidden`, so screen readers hear only the final value. It skips the animation with reduced motion. |
| **Elastic Slider** | Timeline | `role="slider"` with arrow keys, Page Up/Down, Home/End, `aria-valuetext` ("2 hours from now, 17:16 your time") and a focus ring. My changes: I removed its `@hugeicons` default icons (to avoid an extra dependency), and I fixed an animation-frame id that was not reset on unmount, which froze the fill after a React StrictMode remount. |
| **Spotlight Card** | Legend, My places dropdown, details panel | A small, soft glow in the accent colour. It appears only on pointer devices and is off with reduced motion. |

I did not use **Animated List**. It is a selectable `listbox`, and our rows contain buttons, which would break those semantics. A small FLIP hook of my own (`useFlip.js`) gives the same effect.

### External services

- **[Open-Meteo Forecast](https://open-meteo.com/en/docs) and [Geocoding](https://open-meteo.com/en/docs/geocoding-api) APIs** provide all the weather data and the search.
- **[Wikipedia REST](https://en.wikipedia.org/api/rest_v1/) and [Wikimedia Commons](https://commons.wikimedia.org/w/api.php) APIs** provide the photos. The app uses the Wikipedia lead image, unless that image is a collage, a portrait image or a map. In that case, and for night photos, one Commons search finds a landscape photo instead. Results are cached for a day. When there is no photo, a gradient that matches the weather is shown.
- **[BigDataCloud client-side reverse geocoding](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api)** is used **only** to name the user's own location (Open-Meteo has no reverse geocoding).

### Staying within Open-Meteo's limits

The brief asks to be careful with requests. All weather calls go through one cache layer (`src/api/cache.js`):

- **One batched request per map move.** It covers up to 54 grid points (32 on phones) plus up to 16 visible cities, using comma-separated coordinates. The same request also returns the **next 24 hours of temperature, rain chance and wind** (`forecast_hours=24`), so the timeline and the layer switch never make a request.
- **Snapped grid.** Points sit on fixed multiples of the grid step (e.g. every 2° over a country), so small pans reuse cached points.
- **15-minute cache** (how often Open-Meteo updates current conditions) and **in-flight de-duplication**. Forecasts are cached per location, rounded to about 1 km.
- **Debouncing:** 300 ms after the map stops moving; 300 ms and at least 2 characters for search.
- **No hidden requests:** °C/°F is converted on the client; search results only show weather that is already cached; My places loads today's forecasts only while the list is open.
- **Rate limits (HTTP 429)** pause only the weather layer, with a clear message, and the app **retries by itself after a minute**.

### Accessibility and mobile

- **Mobile first:**
  - one top row of controls on phones
  - bottom sheets and a sliding drawer
  - 44 px touch targets
  - 16 px inputs, so iOS does not zoom in on focus
- **Keyboard:**
  - every feature works without a mouse
  - the search follows the WAI-ARIA **combobox** pattern
  - saved places on the map are focusable and labelled; city values are display only
  - Escape closes things in a sensible order (search list, then the dropdown, then the details)
  - a skip link and clearly visible focus rings
- **Screen readers:**
  - weather is never conveyed by colour alone
  - live regions announce search results, the loaded weather and the map centre
  - focus moves to a place's heading when it opens
  - charts have a text summary, plus a hidden data table
- **Reduced motion:** weather particles, animations, Play, rolling numbers, the glow and map fly-to are all switched off.
- **Contrast:** dark and light themes built from CSS variables. Temperature chips pick dark or white text by luminance.

### Project structure

```
src/
  api/              cache.js (TTL + de-dup), openMeteo.js (forecast, batched current + 24 h, search), places.js (photos, own-location name)
  components/       WeatherMap (data, colour field, readouts, probe), DetailPanel, WeatherScene (photo + effects),
                    HourlyChart, PlacesBar, PlacesChart, Legend, LayersMenu, TimeSlider, SearchBox
  components/bits/  React Bits components (CountUp, ElasticSlider, SpotlightCard) + Glow wrapper, useFlip
  data/             palette.js, layers.js, hourly.js, cities.js (map labels), places.js (~300 cities for names)
  hooks/            useAsync, useLocalStorage, useReducedMotion
  utils/            grid.js, format.js, weatherCodes.js (+ unit tests)
```

## 3. Incomplete requirements

All requirements in the brief are implemented. Known limitations:

- **Points on the map are named after the nearest city** in a bundled list, not by reverse geocoding. Far from those cities the name is approximate ("420 km from Tamanrasset, Algeria"). On the open sea there is no photo.
- **Photos** come from Wikipedia and a Commons search, so they are usually a landmark or skyline, but not always (a night search can return a street scene).
- **Very fast, repeated panning** can still reach the free tier's per-minute limit. The app then pauses the weather layer and retries by itself.
- **Accessibility** was tested with the keyboard and visually at desktop and phone sizes, in both themes. It has **not** been tested with a real screen reader (NVDA / VoiceOver) or an axe audit.
- **Esri basemap tiles** are used under Esri's terms for this demo. A production app would need an ArcGIS account or a self-hosted map style.

## 4. Next steps

1. Screen-reader testing (NVDA, VoiceOver) and an axe audit.
2. End-to-end tests (Playwright) and component tests for the interactive pieces.
3. Keep the cache in `sessionStorage`, so a reload does not repeat requests.
4. More layers (cloud cover, pressure) and a longer timeline (several days), from the same batched request.
5. Offline support (PWA).

## 5. Additional notes

- **AI tools.** I iterated on the visual design with Claude's design tool and built the app with **Claude Code** as a pair programmer, for architecture discussion, code generation and review. I decided the scope, the features and the trade-offs, checked every change in the browser at desktop and phone sizes, and can walk through any part of the code.
- **Time.** The assignment had a deadline of about one working day. I prioritised a complete, polished and accessible core over more features. *Next steps* is what I would do next.
- **Attribution.** Map tiles © Esri; map data © OpenStreetMap contributors. Weather data by Open-Meteo (CC BY 4.0). Photos via Wikipedia / Wikimedia Commons; each photo links to its source. UI components from React Bits (© David Haz).
