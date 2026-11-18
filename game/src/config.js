export const CITY = { spacing: 64, half: 320, road: 18, sidewalk: 4.4, bound: 437, ocean: 457 };
export const STEP = 1 / 60;
export const PLAYER = { walk: 4.3, sprint: 8.0, radius: 0.42, jump: 6.2, gravity: 18 };
export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 24;
export const VEHICLES = [
  { id: 'sedan', name: 'CAVALIER · SEDAN', width: 1.9, length: 4.6, maxSpeed: 36, accel: 9, color: '#cbd9d5' },
  { id: 'sports', name: 'SOLERO · GT', width: 1.95, length: 4.3, maxSpeed: 53, accel: 14, color: '#ed6c43' },
  { id: 'taxi', name: 'CAVALIER · CITY CAB', width: 1.9, length: 4.6, maxSpeed: 34, accel: 8, color: '#f7bc3c' },
  { id: 'van', name: 'PORTER · VAN', width: 2.1, length: 5.1, maxSpeed: 29, accel: 7, color: '#70a7a4' },
  { id: 'convertible', name: 'BRISA · ROADSTER', width: 1.85, length: 4.2, maxSpeed: 44, accel: 11, color: '#74bec1' },
];
export const PAINTS = ['#df694f', '#e5dfcb', '#416679', '#78a699', '#d6ac59', '#796478', '#a9b7bf', '#252e3b'];
export function districtAt(x, z) {
  if (z > 185) return 'PORT MARISOL';
  if (x > 192) return 'PLAYA DEL SOL';
  if (x < -128 || z < -160) return 'LAS PALMAS';
  return 'CENTRO';
}
