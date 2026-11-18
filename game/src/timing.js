import { STEP } from './config.js';
// At 6 fps a frame needs ten fixed steps. Retain bounded backlog after a long stall.
export function advanceClock(accumulator, elapsed, step) {
  accumulator = Math.min(1.5, accumulator + Math.max(0, Math.min(0.75, elapsed)));
  let steps = 0;
  while (accumulator + 1e-9 >= STEP && steps < 30) {
    step(STEP); accumulator -= STEP; steps++;
  }
  return Math.max(0, accumulator);
}
