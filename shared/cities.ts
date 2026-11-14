/**
 * Major metro areas, used to place simulated signals where people actually
 * are and to light the night side of the globe.
 *
 * `pop` is an approximate metro population in millions. Coordinates are
 * city centres rounded to ~0.1 degree; that's well below what the globe can
 * resolve at orbital distance.
 */
export interface City {
  name: string;
  lat: number;
  lon: number;
  pop: number;
}

export const CITIES: readonly City[] = [
  // East Asia
  { name: "Tokyo", lat: 35.7, lon: 139.7, pop: 37.4 },
  { name: "Osaka", lat: 34.7, lon: 135.5, pop: 19.0 },
  { name: "Nagoya", lat: 35.2, lon: 136.9, pop: 9.5 },
  { name: "Seoul", lat: 37.6, lon: 127.0, pop: 25.5 },
  { name: "Busan", lat: 35.2, lon: 129.1, pop: 3.4 },
  { name: "Shanghai", lat: 31.2, lon: 121.5, pop: 28.5 },
  { name: "Beijing", lat: 39.9, lon: 116.4, pop: 21.3 },
  { name: "Guangzhou", lat: 23.1, lon: 113.3, pop: 18.7 },
  { name: "Shenzhen", lat: 22.5, lon: 114.1, pop: 17.6 },
  { name: "Chongqing", lat: 29.6, lon: 106.5, pop: 16.9 },
  { name: "Chengdu", lat: 30.7, lon: 104.1, pop: 16.0 },
  { name: "Tianjin", lat: 39.1, lon: 117.2, pop: 13.9 },
  { name: "Wuhan", lat: 30.6, lon: 114.3, pop: 12.3 },
  { name: "Xi'an", lat: 34.3, lon: 108.9, pop: 12.9 },
  { name: "Hangzhou", lat: 30.3, lon: 120.2, pop: 12.2 },
  { name: "Nanjing", lat: 32.1, lon: 118.8, pop: 9.4 },
  { name: "Shenyang", lat: 41.8, lon: 123.4, pop: 9.1 },
  { name: "Harbin", lat: 45.8, lon: 126.6, pop: 6.4 },
  { name: "Hong Kong", lat: 22.3, lon: 114.2, pop: 7.5 },
  { name: "Taipei", lat: 25.0, lon: 121.6, pop: 7.0 },
  { name: "Ulaanbaatar", lat: 47.9, lon: 106.9, pop: 1.6 },

  // Southeast Asia and Oceania
  { name: "Manila", lat: 14.6, lon: 121.0, pop: 14.4 },
  { name: "Cebu", lat: 10.3, lon: 123.9, pop: 3.0 },
  { name: "Cagayan de Oro", lat: 8.5, lon: 124.6, pop: 0.9 },
  { name: "Davao", lat: 7.1, lon: 125.6, pop: 1.8 },
  { name: "Jakarta", lat: -6.2, lon: 106.8, pop: 34.5 },
  { name: "Surabaya", lat: -7.3, lon: 112.7, pop: 9.9 },
  { name: "Bangkok", lat: 13.8, lon: 100.5, pop: 17.1 },
  { name: "Ho Chi Minh City", lat: 10.8, lon: 106.7, pop: 9.3 },
  { name: "Hanoi", lat: 21.0, lon: 105.8, pop: 8.4 },
  { name: "Kuala Lumpur", lat: 3.1, lon: 101.7, pop: 8.4 },
  { name: "Singapore", lat: 1.35, lon: 103.8, pop: 6.0 },
  { name: "Yangon", lat: 16.8, lon: 96.2, pop: 5.6 },
  { name: "Phnom Penh", lat: 11.6, lon: 104.9, pop: 2.3 },
  { name: "Sydney", lat: -33.9, lon: 151.2, pop: 5.3 },
  { name: "Melbourne", lat: -37.8, lon: 145.0, pop: 5.2 },
  { name: "Brisbane", lat: -27.5, lon: 153.0, pop: 2.6 },
  { name: "Perth", lat: -31.95, lon: 115.9, pop: 2.2 },
  { name: "Auckland", lat: -36.85, lon: 174.8, pop: 1.7 },
  { name: "Adelaide", lat: -34.9, lon: 138.6, pop: 1.4 },
  { name: "Darwin", lat: -12.45, lon: 130.8, pop: 0.15 },
  { name: "Port Moresby", lat: -9.45, lon: 147.2, pop: 0.4 },

  // South Asia
  { name: "Delhi", lat: 28.6, lon: 77.2, pop: 32.9 },
  { name: "Mumbai", lat: 19.1, lon: 72.9, pop: 21.3 },
  { name: "Kolkata", lat: 22.6, lon: 88.4, pop: 15.3 },
  { name: "Bangalore", lat: 12.97, lon: 77.6, pop: 13.6 },
  { name: "Chennai", lat: 13.1, lon: 80.3, pop: 11.8 },
  { name: "Hyderabad", lat: 17.4, lon: 78.5, pop: 10.8 },
  { name: "Ahmedabad", lat: 23.0, lon: 72.6, pop: 8.6 },
  { name: "Pune", lat: 18.5, lon: 73.9, pop: 7.2 },
  { name: "Dhaka", lat: 23.8, lon: 90.4, pop: 23.2 },
  { name: "Karachi", lat: 24.9, lon: 67.0, pop: 17.2 },
  { name: "Lahore", lat: 31.5, lon: 74.3, pop: 13.5 },
  { name: "Kathmandu", lat: 27.7, lon: 85.3, pop: 1.6 },
  { name: "Colombo", lat: 6.9, lon: 79.9, pop: 2.4 },

  // Middle East and Central Asia
  { name: "Istanbul", lat: 41.0, lon: 29.0, pop: 15.8 },
  { name: "Tehran", lat: 35.7, lon: 51.4, pop: 9.5 },
  { name: "Baghdad", lat: 33.3, lon: 44.4, pop: 7.5 },
  { name: "Riyadh", lat: 24.7, lon: 46.7, pop: 7.7 },
  { name: "Jeddah", lat: 21.5, lon: 39.2, pop: 4.8 },
  { name: "Dubai", lat: 25.2, lon: 55.3, pop: 3.6 },
  { name: "Ankara", lat: 39.9, lon: 32.9, pop: 5.3 },
  { name: "Tel Aviv", lat: 32.1, lon: 34.8, pop: 4.3 },
  { name: "Tashkent", lat: 41.3, lon: 69.3, pop: 2.6 },
  { name: "Almaty", lat: 43.2, lon: 76.9, pop: 2.2 },
  { name: "Kabul", lat: 34.5, lon: 69.2, pop: 4.6 },

  // Africa
  { name: "Lagos", lat: 6.5, lon: 3.4, pop: 15.9 },
  { name: "Cairo", lat: 30.0, lon: 31.2, pop: 22.2 },
  { name: "Kinshasa", lat: -4.3, lon: 15.3, pop: 16.3 },
  { name: "Johannesburg", lat: -26.2, lon: 28.0, pop: 10.0 },
  { name: "Luanda", lat: -8.8, lon: 13.2, pop: 9.3 },
  { name: "Dar es Salaam", lat: -6.8, lon: 39.3, pop: 7.9 },
  { name: "Khartoum", lat: 15.6, lon: 32.5, pop: 6.3 },
  { name: "Nairobi", lat: -1.3, lon: 36.8, pop: 5.3 },
  { name: "Abidjan", lat: 5.35, lon: -4.0, pop: 5.9 },
  { name: "Addis Ababa", lat: 9.0, lon: 38.7, pop: 5.5 },
  { name: "Accra", lat: 5.6, lon: -0.2, pop: 2.7 },
  { name: "Casablanca", lat: 33.6, lon: -7.6, pop: 3.9 },
  { name: "Algiers", lat: 36.75, lon: 3.06, pop: 2.9 },
  { name: "Dakar", lat: 14.7, lon: -17.5, pop: 3.4 },
  { name: "Cape Town", lat: -33.9, lon: 18.4, pop: 4.8 },
  { name: "Kampala", lat: 0.35, lon: 32.6, pop: 3.8 },
  { name: "Kano", lat: 12.0, lon: 8.5, pop: 4.4 },
  { name: "Abuja", lat: 9.06, lon: 7.5, pop: 3.8 },
  { name: "Lusaka", lat: -15.4, lon: 28.3, pop: 3.0 },
  { name: "Harare", lat: -17.8, lon: 31.05, pop: 2.2 },
  { name: "Antananarivo", lat: -18.9, lon: 47.5, pop: 3.7 },
  { name: "Tunis", lat: 36.8, lon: 10.2, pop: 2.4 },
  { name: "Mogadishu", lat: 2.05, lon: 45.3, pop: 2.6 },
  { name: "Bamako", lat: 12.6, lon: -8.0, pop: 2.8 },

  // Europe
  { name: "Moscow", lat: 55.75, lon: 37.6, pop: 12.6 },
  { name: "London", lat: 51.5, lon: -0.1, pop: 9.6 },
  { name: "Paris", lat: 48.9, lon: 2.35, pop: 11.2 },
  { name: "Madrid", lat: 40.4, lon: -3.7, pop: 6.8 },
  { name: "Barcelona", lat: 41.4, lon: 2.2, pop: 5.6 },
  { name: "Berlin", lat: 52.5, lon: 13.4, pop: 4.6 },
  { name: "Rhine-Ruhr", lat: 51.4, lon: 7.0, pop: 10.0 },
  { name: "Milan", lat: 45.5, lon: 9.2, pop: 4.3 },
  { name: "Rome", lat: 41.9, lon: 12.5, pop: 4.3 },
  { name: "Saint Petersburg", lat: 59.9, lon: 30.3, pop: 5.5 },
  { name: "Athens", lat: 37.98, lon: 23.7, pop: 3.6 },
  { name: "Kyiv", lat: 50.45, lon: 30.5, pop: 3.0 },
  { name: "Warsaw", lat: 52.2, lon: 21.0, pop: 3.1 },
  { name: "Lisbon", lat: 38.7, lon: -9.1, pop: 2.9 },
  { name: "Amsterdam", lat: 52.4, lon: 4.9, pop: 2.5 },
  { name: "Brussels", lat: 50.85, lon: 4.35, pop: 2.1 },
  { name: "Munich", lat: 48.1, lon: 11.6, pop: 2.9 },
  { name: "Vienna", lat: 48.2, lon: 16.4, pop: 2.9 },
  { name: "Stockholm", lat: 59.3, lon: 18.1, pop: 2.4 },
  { name: "Bucharest", lat: 44.4, lon: 26.1, pop: 2.3 },
  { name: "Budapest", lat: 47.5, lon: 19.0, pop: 3.0 },
  { name: "Manchester", lat: 53.5, lon: -2.2, pop: 2.8 },
  { name: "Dublin", lat: 53.35, lon: -6.3, pop: 2.0 },
  { name: "Copenhagen", lat: 55.7, lon: 12.6, pop: 2.1 },
  { name: "Helsinki", lat: 60.2, lon: 24.9, pop: 1.5 },
  { name: "Oslo", lat: 59.9, lon: 10.75, pop: 1.6 },
  { name: "Novosibirsk", lat: 55.0, lon: 82.9, pop: 1.6 },
  { name: "Yekaterinburg", lat: 56.8, lon: 60.6, pop: 1.5 },
  { name: "Omsk", lat: 55.0, lon: 73.4, pop: 1.1 },
  { name: "Krasnoyarsk", lat: 56.0, lon: 92.9, pop: 1.2 },
  { name: "Irkutsk", lat: 52.3, lon: 104.3, pop: 0.6 },
  { name: "Vladivostok", lat: 43.1, lon: 131.9, pop: 0.6 },
  { name: "Reykjavik", lat: 64.15, lon: -21.9, pop: 0.2 },

  // North America
  { name: "New York", lat: 40.7, lon: -74.0, pop: 19.8 },
  { name: "Los Angeles", lat: 34.05, lon: -118.25, pop: 12.9 },
  { name: "Chicago", lat: 41.9, lon: -87.6, pop: 9.4 },
  { name: "Dallas", lat: 32.8, lon: -96.8, pop: 7.9 },
  { name: "Houston", lat: 29.8, lon: -95.4, pop: 7.3 },
  { name: "Washington", lat: 38.9, lon: -77.0, pop: 6.3 },
  { name: "Philadelphia", lat: 39.95, lon: -75.2, pop: 6.2 },
  { name: "Miami", lat: 25.8, lon: -80.2, pop: 6.1 },
  { name: "Atlanta", lat: 33.75, lon: -84.4, pop: 6.2 },
  { name: "Boston", lat: 42.4, lon: -71.1, pop: 4.9 },
  { name: "San Francisco", lat: 37.8, lon: -122.4, pop: 4.6 },
  { name: "San Jose", lat: 37.3, lon: -121.9, pop: 2.0 },
  { name: "Phoenix", lat: 33.45, lon: -112.1, pop: 5.0 },
  { name: "Seattle", lat: 47.6, lon: -122.3, pop: 4.0 },
  { name: "Detroit", lat: 42.3, lon: -83.0, pop: 4.3 },
  { name: "Minneapolis", lat: 44.98, lon: -93.3, pop: 3.7 },
  { name: "San Diego", lat: 32.7, lon: -117.2, pop: 3.3 },
  { name: "Denver", lat: 39.7, lon: -105.0, pop: 3.0 },
  { name: "Austin", lat: 30.3, lon: -97.7, pop: 2.4 },
  { name: "Toronto", lat: 43.7, lon: -79.4, pop: 6.7 },
  { name: "Montreal", lat: 45.5, lon: -73.6, pop: 4.3 },
  { name: "Vancouver", lat: 49.3, lon: -123.1, pop: 2.7 },
  { name: "Mexico City", lat: 19.4, lon: -99.1, pop: 22.3 },
  { name: "Guadalajara", lat: 20.7, lon: -103.35, pop: 5.3 },
  { name: "Monterrey", lat: 25.7, lon: -100.3, pop: 5.3 },
  { name: "Havana", lat: 23.1, lon: -82.4, pop: 2.1 },
  { name: "Guatemala City", lat: 14.6, lon: -90.5, pop: 3.0 },
  { name: "Anchorage", lat: 61.2, lon: -149.9, pop: 0.4 },
  { name: "Calgary", lat: 51.05, lon: -114.1, pop: 1.5 },
  { name: "Edmonton", lat: 53.55, lon: -113.5, pop: 1.4 },
  { name: "Winnipeg", lat: 49.9, lon: -97.1, pop: 0.8 },
  { name: "Honolulu", lat: 21.3, lon: -157.85, pop: 1.0 },

  // South America
  { name: "Sao Paulo", lat: -23.55, lon: -46.6, pop: 22.4 },
  { name: "Buenos Aires", lat: -34.6, lon: -58.4, pop: 15.5 },
  { name: "Rio de Janeiro", lat: -22.9, lon: -43.2, pop: 13.6 },
  { name: "Bogota", lat: 4.7, lon: -74.1, pop: 11.3 },
  { name: "Lima", lat: -12.05, lon: -77.0, pop: 11.0 },
  { name: "Santiago", lat: -33.45, lon: -70.65, pop: 6.9 },
  { name: "Belo Horizonte", lat: -19.9, lon: -43.9, pop: 6.2 },
  { name: "Caracas", lat: 10.5, lon: -66.9, pop: 2.9 },
  { name: "Medellin", lat: 6.25, lon: -75.6, pop: 4.1 },
  { name: "Brasilia", lat: -15.8, lon: -47.9, pop: 4.8 },
  { name: "Recife", lat: -8.05, lon: -34.9, pop: 4.2 },
  { name: "Fortaleza", lat: -3.7, lon: -38.5, pop: 4.1 },
  { name: "Quito", lat: -0.2, lon: -78.5, pop: 2.0 },
  { name: "Montevideo", lat: -34.9, lon: -56.2, pop: 1.8 },
  { name: "Manaus", lat: -3.1, lon: -60.0, pop: 2.3 },
  { name: "Belem", lat: -1.45, lon: -48.5, pop: 2.5 },
  { name: "Salvador", lat: -12.97, lon: -38.5, pop: 3.9 },
  { name: "Porto Alegre", lat: -30.0, lon: -51.2, pop: 4.3 },
  { name: "Curitiba", lat: -25.4, lon: -49.3, pop: 3.7 },
  { name: "Cordoba", lat: -31.4, lon: -64.2, pop: 1.6 },
  { name: "La Paz", lat: -16.5, lon: -68.15, pop: 1.9 },
  { name: "Asuncion", lat: -25.3, lon: -57.6, pop: 2.4 },
  { name: "Guayaquil", lat: -2.2, lon: -79.9, pop: 3.1 },
];

/**
 * Weighted city picker. Weight grows sub-linearly with population (pop^0.6)
 * so megacities lead without drowning out everyone else: online activity is
 * spread more evenly than raw headcount.
 */
const WEIGHTS = CITIES.map((c) => Math.pow(c.pop, 0.6));
const TOTAL_WEIGHT = WEIGHTS.reduce((s, w) => s + w, 0);

export function pickCity(rand: () => number = Math.random): City {
  let r = rand() * TOTAL_WEIGHT;
  for (let i = 0; i < CITIES.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return CITIES[i];
  }
  return CITIES[CITIES.length - 1];
}

/**
 * A point near a weighted-random city, jittered by up to `spreadDeg` so a
 * busy metro produces a cloud of signals rather than one hot pixel.
 */
export function pointNearCity(
  spreadDeg = 1.6,
  rand: () => number = Math.random,
): { lat: number; lon: number; city: City } {
  const city = pickCity(rand);
  // Gaussian-ish jitter (sum of two uniforms) concentrates near the centre.
  const j = () => (rand() + rand() - 1) * spreadDeg;
  const lat = Math.max(-85, Math.min(85, city.lat + j()));
  let lon = city.lon + j() / Math.max(0.25, Math.cos((city.lat * Math.PI) / 180));
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lat, lon, city };
}
