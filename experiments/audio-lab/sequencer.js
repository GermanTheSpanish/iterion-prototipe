// Pure, deterministic event mapping; never affects gameplay.
export const PIP_NOTES = Object.freeze([261.63,311.13,349.23,392,466.16,523.25,622.25]);
export function cascadeEvents(pips, mode = 'forward', step = 0.22) {
  if (!Array.isArray(pips) || !pips.every(n => Number.isInteger(n) && n >= 0 && n <= 6)) throw new RangeError('Pips must be integers from 0 to 6');
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('Step must be positive');
  if (!['forward','reverse','branch'].includes(mode)) throw new RangeError('Unknown mode');
  const primary = mode === 'reverse' ? [...pips].reverse() : [...pips];
  const events = primary.map((pip,i)=>({pip,time:i*step,branch:'A'}));
  if (mode === 'branch') {
    const secondary = [...pips].reverse();
    secondary.forEach((pip,i)=>events.push({pip,time:i*step,branch:'B'}));
  }
  return events.sort((a,b)=>a.time-b.time || a.branch.localeCompare(b.branch));
}
