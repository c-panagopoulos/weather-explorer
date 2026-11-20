// WMO weather interpretation codes, as returned by Open-Meteo in `weather_code`.
// `effect` drives the animated scene on top of the city photo.
const CODES = {
  0: { label: 'Clear sky', day: '☀️', night: '🌙', effect: 'clear' },
  1: { label: 'Mainly clear', day: '🌤️', night: '🌙', effect: 'clear' },
  2: { label: 'Partly cloudy', day: '⛅', night: '☁️', effect: 'cloudy' },
  3: { label: 'Overcast', day: '☁️', night: '☁️', effect: 'cloudy' },
  45: { label: 'Fog', day: '🌫️', night: '🌫️', effect: 'fog' },
  48: { label: 'Freezing fog', day: '🌫️', night: '🌫️', effect: 'fog' },
  51: { label: 'Light drizzle', day: '🌦️', night: '🌧️', effect: 'drizzle' },
  53: { label: 'Drizzle', day: '🌦️', night: '🌧️', effect: 'drizzle' },
  55: { label: 'Heavy drizzle', day: '🌧️', night: '🌧️', effect: 'drizzle' },
  56: { label: 'Freezing drizzle', day: '🌧️', night: '🌧️', effect: 'drizzle' },
  57: { label: 'Heavy freezing drizzle', day: '🌧️', night: '🌧️', effect: 'drizzle' },
  61: { label: 'Light rain', day: '🌦️', night: '🌧️', effect: 'rain' },
  63: { label: 'Rain', day: '🌧️', night: '🌧️', effect: 'rain' },
  65: { label: 'Heavy rain', day: '🌧️', night: '🌧️', effect: 'rain' },
  66: { label: 'Freezing rain', day: '🌧️', night: '🌧️', effect: 'rain' },
  67: { label: 'Heavy freezing rain', day: '🌧️', night: '🌧️', effect: 'rain' },
  71: { label: 'Light snow', day: '🌨️', night: '🌨️', effect: 'snow' },
  73: { label: 'Snow', day: '🌨️', night: '🌨️', effect: 'snow' },
  75: { label: 'Heavy snow', day: '❄️', night: '❄️', effect: 'snow' },
  77: { label: 'Snow grains', day: '🌨️', night: '🌨️', effect: 'snow' },
  80: { label: 'Light showers', day: '🌦️', night: '🌧️', effect: 'rain' },
  81: { label: 'Showers', day: '🌧️', night: '🌧️', effect: 'rain' },
  82: { label: 'Violent showers', day: '⛈️', night: '⛈️', effect: 'rain' },
  85: { label: 'Snow showers', day: '🌨️', night: '🌨️', effect: 'snow' },
  86: { label: 'Heavy snow showers', day: '❄️', night: '❄️', effect: 'snow' },
  95: { label: 'Thunderstorm', day: '⛈️', night: '⛈️', effect: 'thunder' },
  96: { label: 'Thunderstorm with hail', day: '⛈️', night: '⛈️', effect: 'thunder' },
  99: { label: 'Thunderstorm with heavy hail', day: '⛈️', night: '⛈️', effect: 'thunder' },
}

const UNKNOWN = { label: 'Unknown', day: '❔', night: '❔', effect: 'clear' }

export function describeWeather(code, isDay = true) {
  const info = CODES[code] ?? UNKNOWN
  return { label: info.label, icon: isDay ? info.day : info.night, effect: info.effect }
}
