# Weather Explorer

Explore the weather anywhere in the world, like a TV weather forecast where you hold the remote.

**Live demo:** https://c-panagopoulos.github.io/weather-explorer/

- **See the whole picture first.** The map is covered with a smooth, colour-coded temperature field, in the style of a TV forecast. It follows you as you pan and zoom, so you can see how the weather changes from place to place. Your saved places and about 30 major cities show their values, placed so labels never overlap each other or sit under a panel. The *In view* chip shows the coldest and warmest spot on screen; tap either to open it.
- **Dive into any place.** Search for a city, or tap anywhere on the map (including the open sea) to see current conditions, feels-like temperature, humidity, wind, sunrise and sunset, a 24-hour chart and a 7-day forecast with low–high range bars. A line compares it with your saved places ("6° warmer than Lisbon · 7° colder than Cairo"), and *Share link* copies a URL that reopens the same place and unit.
- **See it, don't just read it.** For named places, the details open with a photo of the city from Wikipedia (Athens shows the Acropolis). The current weather is animated on top of the photo: rain, drizzle, snow, fog, drifting clouds, sunshine or lightning. Night darkens the scene.
- **Build your own picture of the world's weather.** Save a place to add it to *My places*. Each place shows its temperature now, today's low and high on one shared scale, and the chance of rain. You can sort by warmest, coldest, A–Z or the order you added them, and removing a place can be undone. The list is kept in `localStorage`, so it is still there after a reload.
- **Read the weather anywhere.** A probe follows the mouse and shows the interpolated temperature, the condition and the nearest place ("Near Ioannina, Greece"), named from a bundled list of about 300 cities with no network calls. With the keyboard, focus the map: a crosshair appears, the arrow keys pan, Enter opens the forecast and a live region reads the value out. On phones the ring stays in the centre and you drag the map under it; it snaps to nearby cities.
- **Look ahead.** A 24-hour time slider (with Play) moves My places and the open place through the forecast; *My places* also has a **Chart** view with every place's next 24 hours in one chart.
- **Weather where you are.** *My location* uses the browser's geolocation and puts a city name on the result.
- **°C / °F** toggle, remembered between visits. **Dark by default**, with a light theme that follows the system setting.

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
| **Leaflet + react-leaflet** | A mature, light, free map with no API key. It handles touch, keyboard panning and zoom well. Base map: **Esri Canvas Dark / Light Gray** tiles, which keep the colour field readable. |
| **Canvas temperature field** | The grid values are interpolated with inverse distance weighting on a coarse canvas, then upscaled with a blur and blended over the tiles. The canvas sits in Leaflet's overlay pane, so it pans with the map at no cost and is redrawn only when movement ends. |
| **No UI or chart library** | The 24-hour chart is a small hand-written SVG (a Catmull-Rom curve with HTML labels laid over it) and all styling is plain CSS with theme variables. Fewer dependencies, full control over accessibility. Fonts: Hanken Grotesk and IBM Plex Mono from Google Fonts. |
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

- **Multi-location batching.** The map overview asks for up to 60 grid points (30 on phones) **plus the visible cities** in **one** request, using Open-Meteo's comma-separated coordinates. Saved places' current values come from one batched call as well.
- **Snapped grid.** Grid points sit on fixed multiples of the grid step (for example every 2° over a country, 30° over the whole world), not on the screen. Small pans therefore land on points that are already cached, and only the new edge is fetched.
- **15-minute TTL cache.** This matches how often Open-Meteo updates current conditions, so cached data is never staler than the source. Forecasts are cached per location, rounded to 2 decimals (about 1 km), so nearby clicks share an entry.
- **In-flight de-duplication.** Two components asking for the same thing at the same moment share one request.
- **Debouncing.** Map moves wait 450 ms after the user stops moving. Search waits 300 ms after typing stops and needs at least 2 characters. Search results are cached for a day.
- **°C/°F is converted on the client**, so switching units never triggers a request.
- **My places loads forecasts lazily.** Today's low/high and rain chance need each place's forecast, so they are fetched only while the list is open, and go through the same 15-minute cache (opening a place's details later costs nothing).
- **Search results** show a place's weather only when it is already cached. Searching never triggers weather requests.
- Rate-limit responses (HTTP 429) pause only the weather layer, with a clear message. The map and search keep working.

### Accessibility and mobile

- **Mobile first.** On phones the map fills the screen, My places is a peek sheet you can expand ("Compare"), and the details open as a bottom sheet. From 900 px wide they become floating panels. Touch targets are at least 44 px, and the search input uses 16 px text so iOS does not zoom in on focus.
- **Keyboard.** Every feature works without a mouse. The search box follows the WAI-ARIA **combobox** pattern (arrow keys, Enter, Escape). Leaflet supports arrow-key panning and +/− zoom. Saved-place values on the map are focusable and labelled ("Saved place: Lisbon, 17°C, Overcast"); city values are display only, so they are not tab stops. In search, Escape first closes the list, then clears the text. Elsewhere it closes the details. A *skip link* jumps to My places, and focus rings are clearly visible.
- **Screen readers.** In the details and My places, weather is never conveyed by colour alone: there is always a text label. Live regions announce search results and the loaded weather ("Athens: 22°C, Overcast"). When a place opens, focus moves to its heading. The SVG chart has a summary label plus a hidden data **table** with the same hourly data. The colour field is decorative; the range in view is announced in text, and the coldest and warmest spots are real buttons.
- **Reduced motion.** With `prefers-reduced-motion`, rain, snow and lightning are removed, other animations stop, and the map jumps instead of flying.
- **Themes and contrast.** All colours are CSS variables with a dark and a light set. Temperature chips pick dark or white text by luminance. Text over photos sits on a darkening gradient.

### Project structure

```
src/
  api/          cache.js (TTL + de-dup), openMeteo.js (forecast, batch, search), places.js (photos, own-location name)
  components/   SearchBox, WeatherMap (data, colour field, readouts), DetailPanel, WeatherScene (photo + effects), HourlyChart, PlacesBar
  data/         palette.js (temperature colour scale), cities.js (cities shown on the map)
  hooks/        useAsync, useLocalStorage, useReducedMotion
  utils/        grid.js, format.js, weatherCodes.js (+ unit tests)
```

## 3. Incomplete requirements

All requirements in the brief are implemented. Known limitations:

- **The time slider does not move the map's colour field** (see Next steps); it affects My places and the open place, whose hourly forecasts are already cached.

- **Points picked on the map have no place name.** Open-Meteo has no reverse geocoding, and I did not want to send every click to a third-party service. Those points show coordinates and the local timezone, and use the gradient background instead of a photo.
- **City photos** are Wikipedia's lead image for the city. It is usually a landmark or skyline, but not always.
- **Accessibility** has been tested with the keyboard and visually at desktop and phone sizes. It has **not** yet been tested with a real screen reader (NVDA / VoiceOver) or with an automated audit (axe).
- **Esri basemap tiles** are used under Esri's terms for this demo; a production app would need an ArcGIS account or a self-hosted style.

## 4. Next steps

- **Time slider on the map itself:** today the slider moves My places and the open place. Driving the colour field and city values too needs hourly data in the batched grid request (same number of requests, larger response).
- **Map layers:** switch the field between temperature, rain and wind, each with its own palette (same API change).
- **Shareable URLs:** put the selected place in the URL.
- **Cache in `sessionStorage`**, so a reload does not repeat requests.
- Screen-reader testing, an axe audit, end-to-end tests (Playwright), and component tests for the interactive pieces.
- Offline support (PWA).

## 5. Additional notes

- **AI tools.** I built this with **Claude Code** as a pair programmer: architecture discussion, code generation and review. I decided the scope, the features and the trade-offs. I checked the result in the browser at desktop and mobile sizes, and I can walk through any part of the code.
- **Time.** The assignment came with a deadline of about one working day, so I prioritised a complete, polished core experience over extra features. The *Next steps* list is what I would do next, in that order.
- **Attribution.** Map © OpenStreetMap contributors. Weather data by Open-Meteo (CC BY 4.0). City photos via Wikipedia / Wikimedia Commons; each photo links to its source article.
