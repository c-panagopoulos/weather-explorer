# Weather Explorer

Explore the weather anywhere in the world, like a TV weather forecast where you hold the remote.

**Live demo:** https://c-panagopoulos.github.io/weather-explorer/

- **See the whole picture first.** The map is covered with a grid of colour-coded temperature and condition markers, in the style of a TV forecast. The grid follows you as you pan and zoom, so you can see how the weather changes from place to place. A legend shows the temperature range currently in view.
- **Dive into any place.** Search for a city, or tap anywhere on the map (including the open sea) to see current conditions, feels-like temperature, humidity, wind, sunrise and sunset, a 24-hour chart and a 7-day forecast.
- **See it, don't just read it.** For named places, the details open with a photo of the city from Wikipedia (Athens shows the Acropolis). The current weather is animated on top of the photo: rain, drizzle, snow, fog, drifting clouds, sunshine or lightning. Night darkens the scene.
- **Build your own picture of the world's weather.** Star a place to add it to *My places*. Saved places appear as pins on the map and as cards in a strip you can compare side by side. You can sort the strip by warmest, coldest, A–Z or the order you added them. The list is kept in `localStorage`, so it is still there after a reload.
- **Weather where you are.** *My location* uses the browser's geolocation and puts a city name on the result.
- **°C / °F** toggle, remembered between visits.

## 1. Installation and setup

**Prerequisites:** Node.js **20.19+ or 22.12+** (required by Vite 8) and npm.

```bash
git clone https://github.com/c-panagopoulos/weather-explorer.git
cd weather-explorer
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm test`        | Unit tests (Vitest)                |
| `npm run build`   | Production build into `dist/`      |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | Lint with oxlint                   |

**Environment variables:** none. Open-Meteo, Wikipedia and BigDataCloud's client-side endpoint all work without API keys.

Geolocation only works on `localhost` or over HTTPS, a browser rule. The live demo is served over HTTPS.

## 2. Implementation choices

| Choice | Why |
| --- | --- |
| **React 19 + Vite**, plain **JavaScript** | Fast to build and run with almost no configuration. Plain JS keeps the code easy to follow. |
| **Leaflet + react-leaflet** | A mature, light, free map with no API key. It handles touch, keyboard panning and zoom well. Base map from **OpenStreetMap** tiles. |
| **No UI or chart library** | The 24-hour chart is a small hand-written SVG and all styling is plain CSS. Fewer dependencies, full control over accessibility. |
| **Vitest** | Unit tests for the logic that matters most: grid generation, caching, unit conversion, weather-code mapping and forecast normalisation. |
| **GitHub Actions → GitHub Pages** | Each push to `main` runs the tests, builds and deploys the live demo. |

**Third-party runtime dependencies:** `react`, `react-dom`, `leaflet`, `react-leaflet`. Nothing else.

**External services:**

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) for all weather data.
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) for the search box.
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) (`page/summary`) for city photos. It is optional and falls back to a gradient that matches the weather.
- [BigDataCloud client-side reverse geocoding](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api), used **only** to put a name on the user's own geolocation result. Open-Meteo has no reverse geocoding. If the call fails, the app shows "Your location".

### Staying within Open-Meteo's limits

The brief asks to be careful with requests. All weather calls go through one small cache layer (`src/api/cache.js`):

- **Multi-location batching.** The map overview asks for up to 48 points (28 on phones) in **one** request, using Open-Meteo's comma-separated coordinates. Saved places reuse the same batched call.
- **Snapped grid.** Grid points sit on fixed multiples of the grid step (for example every 5° at world zoom), not on the screen. Small pans therefore land on points that are already cached, and only the new edge is fetched.
- **15-minute TTL cache.** This matches how often Open-Meteo updates current conditions, so cached data is never staler than the source. Forecasts are cached per location, rounded to 2 decimals (about 1 km), so nearby clicks share an entry.
- **In-flight de-duplication.** Two components asking for the same thing at the same moment share one request.
- **Debouncing.** Map moves wait 450 ms after the user stops moving. Search waits 300 ms after typing stops and needs at least 2 characters. Search results are cached for a day.
- **°C/°F is converted on the client**, so switching units never triggers a request.
- Rate-limit responses (HTTP 429) show a clear, friendly message.

### Accessibility and mobile

- **Mobile first.** On phones the map fills the screen and the details open as a bottom sheet. From 900 px wide they become a sidebar. Touch targets are at least 44 px, and the search input uses 16 px text so iOS does not zoom in on focus.
- **Keyboard.** Every feature works without a mouse. The search box follows the WAI-ARIA **combobox** pattern (arrow keys, Enter, Escape). Leaflet supports arrow-key panning and +/− zoom. Saved-place pins are focusable and labelled, and Escape closes the details. A *skip link* jumps to My places, and focus rings are clearly visible.
- **Screen readers.** In the details and My places, weather is never conveyed by an emoji or colour alone: there is always a text label. Live regions announce search results and the loaded weather ("Athens: 22°C, Overcast"). When a place opens, focus moves to its heading. The SVG chart has a summary label plus a hidden data **table** with the same hourly data. The many map grid markers are not tab stops; the overview is summarised in text instead (the temperature range in view).
- **Reduced motion.** With `prefers-reduced-motion`, rain, snow and lightning are removed, other animations stop, and the map jumps instead of flying.
- **Contrast.** Each temperature colour has a text colour chosen for readable contrast. Text over photos sits on a darkening gradient.

### Project structure

```
src/
  api/          cache.js (TTL + de-dup), openMeteo.js (forecast, batch, search), places.js (photos, own-location name)
  components/   SearchBox, WeatherMap (grid overview + pins), DetailPanel, WeatherScene (photo + effects), HourlyChart, PlacesBar
  hooks/        useAsync, useLocalStorage, useReducedMotion
  utils/        grid.js, format.js, weatherCodes.js (+ unit tests)
```

## 3. Incomplete requirements

All requirements in the brief are implemented. Known limitations:

- **Points picked on the map have no place name.** Open-Meteo has no reverse geocoding, and I did not want to send every click to a third-party service. Those points show coordinates and the local timezone, and use the gradient background instead of a photo.
- **City photos** are Wikipedia's lead image for the city. It is usually a landmark or skyline, but not always.
- **Accessibility** has been tested with the keyboard and visually at desktop and phone sizes. It has **not** yet been tested with a real screen reader (NVDA / VoiceOver) or with an automated audit (axe).
- **Weather icons are emoji**, so they look slightly different on each operating system.

## 4. Next steps

- **Time slider on the map:** scrub through the next 24 hours and watch weather systems move across the grid, like a real TV forecast. The hourly data is already available.
- **Map layers:** switch the overview between temperature, rain and wind.
- **A proper comparison view** for saved places: overlay their 24-hour temperature lines in one chart.
- **Shareable URLs:** put the selected place in the URL.
- **Cache in `sessionStorage`**, so a reload does not repeat requests.
- Screen-reader testing, an axe audit, end-to-end tests (Playwright), and component tests for the interactive pieces.
- Dark mode, SVG weather icons, and offline support (PWA).

## 5. Additional notes

- **AI tools.** I built this with **Claude Code** as a pair programmer: architecture discussion, code generation and review. I decided the scope, the features and the trade-offs. I checked the result in the browser at desktop and mobile sizes, and I can walk through any part of the code.
- **Time.** The assignment came with a deadline of about one working day, so I prioritised a complete, polished core experience over extra features. The *Next steps* list is what I would do next, in that order.
- **Attribution.** Map © OpenStreetMap contributors. Weather data by Open-Meteo (CC BY 4.0). City photos via Wikipedia / Wikimedia Commons; each photo links to its source article.
