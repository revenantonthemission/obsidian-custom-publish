/** Cached geolocation coordinates. */
export interface GeoCache {
  lat: number;
  lng: number;
  ts: number;
}

/** Cached sunrise/sunset times from API. */
export interface SolarCache {
  sunrise: string;
  sunset: string;
  date: string;
}

const GEO_KEY = "geo";
const SOLAR_KEY = "solar";
const MANUAL_KEY = "theme-manual";
const GEO_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_SUNRISE_HOUR = 6;
const DEFAULT_SUNRISE_MIN = 30;
const DEFAULT_SUNSET_HOUR = 18;
const DEFAULT_SUNSET_MIN = 30;

/** Read cached geo from localStorage, or null if missing/stale. */
export function getCachedGeo(): GeoCache | null {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (!raw) return null;
    const geo: GeoCache = JSON.parse(raw);
    if (Date.now() - geo.ts > GEO_MAX_AGE_MS) return null;
    return geo;
  } catch {
    return null;
  }
}

/** Request geolocation and cache the result. Returns coordinates or null on failure. */
export function requestGeoAndCache(): Promise<GeoCache | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const geo: GeoCache = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
        };
        localStorage.setItem(GEO_KEY, JSON.stringify(geo));
        resolve(geo);
      },
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}

/** Fetch sunrise/sunset from API and cache result. Returns cached data or null. */
export async function fetchAndCacheSolar(lat: number, lng: number): Promise<SolarCache | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0&date=${today}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== "OK") return null;

    const solar: SolarCache = {
      sunrise: json.results.sunrise,
      sunset: json.results.sunset,
      date: today,
    };
    localStorage.setItem(SOLAR_KEY, JSON.stringify(solar));
    return solar;
  } catch {
    return null;
  }
}

/** Read cached solar data from localStorage if it's for today. */
export function getCachedSolar(): SolarCache | null {
  try {
    const raw = localStorage.getItem(SOLAR_KEY);
    if (!raw) return null;
    const solar: SolarCache = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (solar.date !== today) return null;
    return solar;
  } catch {
    return null;
  }
}

/** Build default sunrise/sunset Date objects for today. */
function getDefaultTimes(): { sunrise: Date; sunset: Date } {
  const now = new Date();
  const sunrise = new Date(now);
  sunrise.setHours(DEFAULT_SUNRISE_HOUR, DEFAULT_SUNRISE_MIN, 0, 0);
  const sunset = new Date(now);
  sunset.setHours(DEFAULT_SUNSET_HOUR, DEFAULT_SUNSET_MIN, 0, 0);
  return { sunrise, sunset };
}

/** Determine which theme should be active right now based on solar times. */
export function getSolarTheme(solar: SolarCache | null): "light" | "dark" {
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  return now >= sunrise && now < sunset ? "light" : "dark";
}

/** Milliseconds until the next solar boundary (sunrise or sunset). */
export function msUntilNextBoundary(solar: SolarCache | null): number {
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  if (now < sunrise) return sunrise.getTime() - now.getTime();
  if (now < sunset) return sunset.getTime() - now.getTime();

  const tomorrowSunrise = new Date(sunrise);
  tomorrowSunrise.setDate(tomorrowSunrise.getDate() + 1);
  return tomorrowSunrise.getTime() - now.getTime();
}

/** Check if the manual override is still valid (hasn't crossed a solar boundary). */
export function isManualOverrideActive(solar: SolarCache | null): boolean {
  const raw = localStorage.getItem(MANUAL_KEY);
  if (!raw) return false;

  const manualTime = new Date(raw);
  const now = new Date();
  let sunrise: Date;
  let sunset: Date;

  if (solar) {
    sunrise = new Date(solar.sunrise);
    sunset = new Date(solar.sunset);
  } else {
    ({ sunrise, sunset } = getDefaultTimes());
  }

  if (manualTime < sunrise && now >= sunrise) return false;
  if (manualTime < sunset && now >= sunset) return false;

  return true;
}

/** Set the manual override timestamp. */
export function setManualOverride(): void {
  localStorage.setItem(MANUAL_KEY, new Date().toISOString());
}

/** Clear the manual override. */
export function clearManualOverride(): void {
  localStorage.removeItem(MANUAL_KEY);
}
