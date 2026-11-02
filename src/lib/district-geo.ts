/**
 * Districts (Metropolitan/Municipal/District Assemblies) the map can place, with approximate coordinates of each
 * assembly's capital (public geography). Article backfill only sets a district when the article text names the
 * assembly itself (e.g. "Techiman Municipal", "Ga East Municipal Assembly"), never from a town name alone.
 */
export const DISTRICTS: { name: string; region: string; latlng: [number, number]; match: string[] }[] = [
  { name: 'Accra Metropolitan', region: 'Greater Accra', latlng: [5.556, -0.197], match: ['Accra Metropolitan'] },
  { name: 'Tema Metropolitan', region: 'Greater Accra', latlng: [5.669, -0.017], match: ['Tema Metropolitan'] },
  { name: 'Ga East Municipal', region: 'Greater Accra', latlng: [5.73, -0.19], match: ['Ga East Municipal'] },
  { name: 'Ga West Municipal', region: 'Greater Accra', latlng: [5.70, -0.30], match: ['Ga West Municipal'] },
  { name: 'Adentan Municipal', region: 'Greater Accra', latlng: [5.71, -0.15], match: ['Adentan Municipal'] },
  { name: 'Ashaiman Municipal', region: 'Greater Accra', latlng: [5.69, -0.03], match: ['Ashaiman Municipal'] },
  { name: 'Kpone-Katamanso Municipal', region: 'Greater Accra', latlng: [5.70, 0.04], match: ['Kpone-Katamanso Municipal', 'Kpone Katamanso Municipal'] },
  { name: 'La Nkwantanang-Madina Municipal', region: 'Greater Accra', latlng: [5.68, -0.17], match: ['La Nkwantanang-Madina Municipal', 'La Nkwantanang Madina Municipal'] },
  { name: 'Ledzokuku Municipal', region: 'Greater Accra', latlng: [5.58, -0.10], match: ['Ledzokuku Municipal'] },
  { name: 'Kumasi Metropolitan', region: 'Ashanti', latlng: [6.688, -1.624], match: ['Kumasi Metropolitan'] },
  { name: 'Obuasi Municipal', region: 'Ashanti', latlng: [6.206, -1.668], match: ['Obuasi Municipal'] },
  { name: 'Ejisu Municipal', region: 'Ashanti', latlng: [6.72, -1.47], match: ['Ejisu Municipal'] },
  { name: 'Sekondi-Takoradi Metropolitan', region: 'Western', latlng: [4.934, -1.714], match: ['Sekondi-Takoradi Metropolitan', 'Sekondi Takoradi Metropolitan'] },
  { name: 'Tarkwa-Nsuaem Municipal', region: 'Western', latlng: [5.30, -1.99], match: ['Tarkwa-Nsuaem Municipal', 'Tarkwa Nsuaem Municipal'] },
  { name: 'Cape Coast Metropolitan', region: 'Central', latlng: [5.105, -1.247], match: ['Cape Coast Metropolitan'] },
  { name: 'Awutu Senya East Municipal', region: 'Central', latlng: [5.534, -0.425], match: ['Awutu Senya East Municipal'] },
  { name: 'Effutu Municipal', region: 'Central', latlng: [5.35, -0.62], match: ['Effutu Municipal'] },
  { name: 'New Juaben South Municipal', region: 'Eastern', latlng: [6.094, -0.259], match: ['New Juaben South Municipal'] },
  { name: 'Kwahu West Municipal', region: 'Eastern', latlng: [6.55, -0.77], match: ['Kwahu West Municipal'] },
  { name: 'Ho Municipal', region: 'Volta', latlng: [6.601, 0.471], match: ['Ho Municipal'] },
  { name: 'Tamale Metropolitan', region: 'Northern', latlng: [9.401, -0.839], match: ['Tamale Metropolitan'] },
  { name: 'Yendi Municipal', region: 'Northern', latlng: [9.44, -0.01], match: ['Yendi Municipal'] },
  { name: 'Bolgatanga Municipal', region: 'Upper East', latlng: [10.786, -0.851], match: ['Bolgatanga Municipal'] },
  { name: 'Bawku Municipal', region: 'Upper East', latlng: [11.06, -0.24], match: ['Bawku Municipal'] },
  { name: 'Wa Municipal', region: 'Upper West', latlng: [10.060, -2.510], match: ['Wa Municipal'] },
  { name: 'Sunyani Municipal', region: 'Bono', latlng: [7.339, -2.327], match: ['Sunyani Municipal'] },
  { name: 'Techiman Municipal', region: 'Bono East', latlng: [7.586, -1.938], match: ['Techiman Municipal'] },
];
export const DISTRICT_LATLNG: Record<string, [number, number]> = Object.fromEntries(DISTRICTS.map((d) => [d.name, d.latlng]));
