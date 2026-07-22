/**
 * weatherService.ts  v3
 * Uses Open-Meteo (free, no API key) + Nominatim search geocoding (free, no key)
 */

/* ── Types ─────────────────────────────────────────────── */
export interface WeatherData {
  city: string
  country: string
  temperature: number   // °C
  humidity: number      // %
  precipitation: number // mm (last hour)
  windSpeed: number     // km/h
  weatherCode: number
  description: string
  emoji: string
  isDay: boolean
  
  // Detailed weather variables
  dewPoint: number      // °C
  pressure: number      // hPa
  uvIndex: number
  aqi: number           // US AQI index
  pm25: number          // PM2.5 (ug/m3)
  pm10: number          // PM10 (ug/m3)
  latitude: number
  longitude: number
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export interface DiseaseRisk {
  id: string
  disease: string
  crops: string[]
  risk: RiskLevel
  reason: string         // why this risk exists
  prevention: string     // short actionable tip
  emoji: string
}

export interface WeatherRiskReport {
  weather: WeatherData
  risks: DiseaseRisk[]
  overallRisk: RiskLevel
  summary: string        // one-line headline
  fetchedAt: Date
}

/* ── WMO Weather Code → description & emoji ─────────────── */
function interpretWeatherCode(code: number, isDay: boolean): { description: string; emoji: string } {
  if (code === 0)          return { description: 'Clear Sky',          emoji: isDay ? '☀️' : '🌙' }
  if (code <= 2)           return { description: 'Partly Cloudy',      emoji: '⛅' }
  if (code === 3)          return { description: 'Overcast',            emoji: '☁️' }
  if (code <= 48)          return { description: 'Foggy',               emoji: '🌫️' }
  if (code <= 57)          return { description: 'Drizzle',             emoji: '🌦️' }
  if (code <= 67)          return { description: 'Rainy',               emoji: '🌧️' }
  if (code <= 77)          return { description: 'Snowy',               emoji: '❄️' }
  if (code <= 82)          return { description: 'Rain Showers',        emoji: '🌨️' }
  if (code <= 86)          return { description: 'Snow Showers',        emoji: '🌨️' }
  if (code <= 99)          return { description: 'Thunderstorm',        emoji: '⛈️' }
  return { description: 'Unknown', emoji: '🌡️' }
}

/* ── Reverse geocode lat/lon → city name ────────────────── */
export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AgroAI-App' } }
    )
    const data = await res.json()
    const addr = data.address || {}
    const city =
      addr.city || addr.town || addr.village || addr.county || addr.state_district || 'Your Location'
    const country = addr.country_code?.toUpperCase() || ''
    return { city, country }
  } catch {
    return { city: 'Your Location', country: '' }
  }
}

function calculateAQI(pm25: number): number {
  if (pm25 <= 0) return 0;
  if (pm25 <= 12.0) return Math.round((50 / 12.0) * pm25);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
  return 300;
}

/* ── Fetch weather and AQI from Open-Meteo ───────────────── */
async function fetchWeatherDataAndAQI(lat: number, lon: number, cityName?: string): Promise<WeatherData> {
  const weatherUrl = 
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code,is_day,dew_point_2m,surface_pressure,uv_index` +
    `&timezone=auto`

  const aqUrl = 
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=us_aqi,pm2_5,pm10`

  const [wRes, aqRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(aqUrl).catch(() => null)
  ])

  const wData = await wRes.json()
  const cur = wData.current

  let aqiVal = 0
  let pm25Val = 0
  let pm10Val = 0

  if (aqRes && aqRes.ok) {
    try {
      const aqData = await aqRes.json()
      const aqCur = aqData.current || {}
      pm25Val = aqCur.pm2_5 || 0
      pm10Val = aqCur.pm10 || 0
      aqiVal = aqCur.us_aqi || calculateAQI(pm25Val)
    } catch (e) {
      console.error("Failed to parse AQI:", e)
    }
  }

  // Fallback to average safe values if API fails to provide data
  if (aqiVal === 0 && pm25Val === 0) {
    pm25Val = 10.5
    pm10Val = 18.5
    aqiVal = 42
  }

  const isDay = cur.is_day === 1
  const { description, emoji } = interpretWeatherCode(cur.weather_code, isDay)

  // Determine city / country names
  let city = cityName || 'Your Location'
  let country = ''
  if (!cityName) {
    const geo = await reverseGeocode(lat, lon)
    city = geo.city
    country = geo.country
  }

  return {
    city,
    country,
    temperature:   Math.round(cur.temperature_2m),
    humidity:      cur.relative_humidity_2m,
    precipitation: cur.precipitation || 0,
    windSpeed:     Math.round(cur.wind_speed_10m),
    weatherCode:   cur.weather_code,
    description,
    emoji,
    isDay,
    dewPoint:      Math.round(cur.dew_point_2m * 10) / 10,
    pressure:      Math.round(cur.surface_pressure),
    uvIndex:       Math.round(cur.uv_index * 10) / 10,
    aqi:           aqiVal,
    pm25:          pm25Val,
    pm10:          pm10Val,
    latitude:      lat,
    longitude:     lon,
  }
}

/* ── Disease Risk Engine ─────────────────────────────────── */
function computeDiseaseRisks(w: WeatherData): DiseaseRisk[] {
  const risks: DiseaseRisk[] = []
  const { temperature: T, humidity: H, precipitation: P, windSpeed: W } = w
  const isRainy = P > 0.5 || (w.weatherCode >= 51 && w.weatherCode <= 99)
  const isThunder = w.weatherCode >= 95

  /* ─── FUNGAL ─── */

  // Late Blight — Phytophthora infestans — thrives in cool humid conditions
  if (H >= 80 && T >= 10 && T <= 25) {
    risks.push({
      id: 'late-blight',
      disease: 'Late Blight',
      crops: ['Tomato', 'Potato'],
      risk: H >= 90 ? 'CRITICAL' : 'HIGH',
      reason: `Humidity ${H}% + Temperature ${T}°C — perfect conditions for Phytophthora infestans`,
      prevention: 'Apply copper-based fungicide now. Avoid overhead watering.',
      emoji: '🍅',
    })
  }

  // Early Blight — Alternaria — warm & humid
  if (H >= 75 && T >= 24 && T <= 32 && isRainy) {
    risks.push({
      id: 'early-blight',
      disease: 'Early Blight',
      crops: ['Tomato', 'Eggplant'],
      risk: 'HIGH',
      reason: `Warm temperature ${T}°C with rain — favours Alternaria solani spread`,
      prevention: 'Remove infected lower leaves. Apply Mancozeb or Chlorothalonil.',
      emoji: '🍆',
    })
  }

  // Powdery Mildew — dry & warm with moderate humidity
  if (H >= 60 && H <= 80 && T >= 20 && T <= 30) {
    risks.push({
      id: 'powdery-mildew',
      disease: 'Powdery Mildew',
      crops: ['Wheat', 'Cucumber', 'Grapes', 'Pea'],
      risk: H >= 72 ? 'HIGH' : 'MODERATE',
      reason: `Moderate humidity ${H}% and warm days — ideal for powdery mildew fungus`,
      prevention: 'Spray neem oil or potassium bicarbonate solution weekly.',
      emoji: '🌾',
    })
  }

  // Downy Mildew — high humidity with cool nights
  if (H >= 85 && T >= 10 && T <= 22) {
    risks.push({
      id: 'downy-mildew',
      disease: 'Downy Mildew',
      crops: ['Onion', 'Grapes', 'Spinach', 'Basil'],
      risk: 'HIGH',
      reason: `Very high humidity ${H}% with cool weather — Peronospora risk is elevated`,
      prevention: 'Increase plant spacing for airflow. Apply Metalaxyl fungicide.',
      emoji: '🧅',
    })
  }

  // Botrytis (Gray Mold) — overcast, cool, wet
  if (H >= 85 && T >= 12 && T <= 20 && isRainy) {
    risks.push({
      id: 'botrytis',
      disease: 'Botrytis (Gray Mold)',
      crops: ['Strawberry', 'Rose', 'Grapes', 'Bean'],
      risk: 'HIGH',
      reason: `Wet and cool conditions ${T}°C, ${H}% — Botrytis cinerea thrives`,
      prevention: 'Remove dead plant tissue immediately. Apply Iprodione or Fenhexamid.',
      emoji: '🍓',
    })
  }

  // Anthracnose — warm, wet, rainy
  if (isRainy && T >= 25 && T <= 35) {
    risks.push({
      id: 'anthracnose',
      disease: 'Anthracnose',
      crops: ['Mango', 'Bean', 'Chilli', 'Avocado'],
      risk: 'HIGH',
      reason: `Rain + warm temperature ${T}°C — Colletotrichum spores spread rapidly in wet weather`,
      prevention: 'Apply Carbendazim after rains. Avoid fruit injury during harvest.',
      emoji: '🥭',
    })
  }

  // Fusarium Wilt — warm soil, moderate humidity
  if (T >= 25 && T <= 35 && H >= 60) {
    risks.push({
      id: 'fusarium-wilt',
      disease: 'Fusarium Wilt',
      crops: ['Tomato', 'Banana', 'Cotton', 'Watermelon'],
      risk: 'MODERATE',
      reason: `Warm temperature ${T}°C with adequate soil moisture — Fusarium oxysporum active`,
      prevention: 'Use resistant varieties. Apply Trichoderma to soil before planting.',
      emoji: '🍌',
    })
  }

  // Root Rot — waterlogged conditions
  if (P >= 5 || (isRainy && H >= 90)) {
    risks.push({
      id: 'root-rot',
      disease: 'Root Rot / Damping Off',
      crops: ['All Crops', 'Seedlings', 'Chilli', 'Ginger'],
      risk: isThunder ? 'CRITICAL' : 'HIGH',
      reason: `Heavy rain ${P.toFixed(1)} mm — waterlogging causes Pythium & Phytophthora root damage`,
      prevention: 'Ensure field drainage. Avoid irrigation for 3-4 days after rain.',
      emoji: '🌱',
    })
  }

  /* ─── BACTERIAL ─── */

  // Bacterial Wilt — hot & humid
  if (T >= 28 && T <= 35 && H >= 70) {
    risks.push({
      id: 'bacterial-wilt',
      disease: 'Bacterial Wilt',
      crops: ['Tomato', 'Potato', 'Brinjal', 'Pepper'],
      risk: T >= 32 ? 'HIGH' : 'MODERATE',
      reason: `Hot (${T}°C) and humid (${H}%) — Ralstonia solanacearum spreads through soil water`,
      prevention: 'Avoid wounding roots. Use clean tools. Apply copper oxychloride.',
      emoji: '🫑',
    })
  }

  // Fire Blight — spring warmth after rain
  if (T >= 18 && T <= 28 && isRainy && H >= 75) {
    risks.push({
      id: 'fire-blight',
      disease: 'Fire Blight',
      crops: ['Apple', 'Pear', 'Guava'],
      risk: 'MODERATE',
      reason: `Warm and wet — Erwinia amylovora spreads rapidly during flowering season`,
      prevention: 'Prune infected twigs 30cm below disease. Spray streptomycin.',
      emoji: '🍎',
    })
  }

  /* ─── PEST RISK ─── */

  // Spider Mites — hot and dry
  if (T >= 32 && H < 50) {
    risks.push({
      id: 'spider-mites',
      disease: 'Spider Mites',
      crops: ['Cotton', 'Tomato', 'Beans', 'Maize'],
      risk: T >= 38 ? 'HIGH' : 'MODERATE',
      reason: `Hot (${T}°C) and dry (${H}%) — spider mite populations explode in heat`,
      prevention: 'Spray water on leaf undersides. Use Abamectin or neem oil.',
      emoji: '🕷️',
    })
  }

  // Aphids — mild spring/monsoon
  if (T >= 15 && T <= 25 && H >= 60) {
    risks.push({
      id: 'aphids',
      disease: 'Aphid Infestation',
      crops: ['Wheat', 'Mustard', 'Potato', 'Citrus'],
      risk: 'MODERATE',
      reason: `Mild weather ${T}°C — favourable for aphid colony growth and virus spread`,
      prevention: 'Spray neem oil (5ml/L) or Imidacloprid. Encourage ladybird beetles.',
      emoji: '🐛',
    })
  }

  // Thrips — dry hot weather
  if (T >= 28 && H < 60) {
    risks.push({
      id: 'thrips',
      disease: 'Thrips & Leaf Curl Virus',
      crops: ['Chilli', 'Tomato', 'Onion', 'Cotton'],
      risk: H < 45 ? 'HIGH' : 'MODERATE',
      reason: `Dry and warm conditions — thrips populations surge and spread viruses`,
      prevention: 'Install blue sticky traps. Apply Spinosad or Fipronil.',
      emoji: '🌶️',
    })
  }

  // Spore spread
  if (W >= 20 && H >= 65) {
    risks.push({
      id: 'spore-spread',
      disease: 'Fungal Spore Dispersal',
      crops: ['All Crops'],
      risk: 'MODERATE',
      reason: `Wind ${W} km/h disperses fungal spores across large areas`,
      prevention: 'Inspect crops downwind of any diseased fields. Apply preventive fungicide.',
      emoji: '💨',
    })
  }

  /* ─── If no risk factors ─── */
  if (risks.length === 0) {
    risks.push({
      id: 'no-risk',
      disease: 'No Significant Disease Risk',
      crops: ['All Crops'],
      risk: 'LOW',
      reason: `Current weather conditions (${T}°C, ${H}% humidity) are not favourable for major crop diseases`,
      prevention: 'Continue regular monitoring. Maintain proper crop nutrition.',
      emoji: '✅',
    })
  }

  return risks
}

function computeOverallRisk(risks: DiseaseRisk[]): RiskLevel {
  if (risks.some(r => r.risk === 'CRITICAL')) return 'CRITICAL'
  if (risks.some(r => r.risk === 'HIGH'))     return 'HIGH'
  if (risks.some(r => r.risk === 'MODERATE')) return 'MODERATE'
  return 'LOW'
}

function buildSummary(w: WeatherData, overall: RiskLevel, risks: DiseaseRisk[]): string {
  if (overall === 'CRITICAL') return `⚠️ CRITICAL: Heavy rain & extreme conditions — immediate field action required!`
  if (overall === 'HIGH') {
    const top = risks.find(r => r.risk === 'HIGH')!
    return `⚠️ High ${top.disease} risk today — ${w.humidity}% humidity favours disease spread`
  }
  if (overall === 'MODERATE') return `🟡 Moderate disease risk — monitor crops closely this week`
  return `✅ Low disease risk today — ideal conditions for healthy crop growth`
}

/* ── Main public function ────────────────────────────────── */
export async function fetchWeatherRiskReport(locationQuery?: string): Promise<WeatherRiskReport> {
  let lat = 18.5204 // Pune default
  let lon = 73.8567
  let displayName = 'Pune, India'

  if (locationQuery && locationQuery.trim()) {
    const coordsMatch = locationQuery.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (coordsMatch) {
      lat = parseFloat(coordsMatch[1]);
      lon = parseFloat(coordsMatch[2]);
      try {
        const geo = await reverseGeocode(lat, lon);
        displayName = geo.city;
        if (geo.country) {
          displayName += `, ${geo.country}`;
        }
      } catch {
        displayName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
    } else {
      try {
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1`
        const res = await fetch(searchUrl, { headers: { 'User-Agent': 'AgroAI-App' } })
        const data = await res.json()
        
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat)
          lon = parseFloat(data[0].lon)
          const parts = data[0].display_name.split(',')
          displayName = parts[0].trim()
          if (parts.length > 1) {
            displayName += `, ${parts[parts.length - 1].trim()}`
          }
        } else {
          throw new Error('Location not found')
        }
      } catch (e: any) {
        throw new Error(e.message || 'Geocoding failed')
      }
    }
  }

  // Fetch weather and AQI
  const weather = await fetchWeatherDataAndAQI(lat, lon, displayName)

  // Compute risks
  const risks       = computeDiseaseRisks(weather)
  const overallRisk = computeOverallRisk(risks)
  const summary     = buildSummary(weather, overallRisk, risks)

  return { weather, risks, overallRisk, summary, fetchedAt: new Date() }
}
