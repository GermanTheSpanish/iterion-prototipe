// Matches presentation.js CASCADE timing for operation steps in build v0.73.0.
export const CASCADE_TIMING = Object.freeze({intro:[600,600,560,520,480,440],tail:320,decay:0.70,min:60});
export function operationDelay(index) {
  if (!Number.isInteger(index) || index < 0) throw new RangeError('Invalid operation index');
  return index < CASCADE_TIMING.intro.length ? CASCADE_TIMING.intro[index]
    : Math.max(CASCADE_TIMING.min, Math.round(CASCADE_TIMING.tail * CASCADE_TIMING.decay ** (index - CASCADE_TIMING.intro.length)));
}
export function replayEvents(fixture, speed = 1) {
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('Invalid speed');
  if (!fixture || !Array.isArray(fixture.events)) throw new TypeError('Missing events');
  let elapsed = 0, operation = 0, arm = null;
  const events = [];
  for (const event of fixture.events) {
    if (event.type === 'op') {
      if (!Number.isInteger(event.pip) || event.pip < 0 || event.pip > 6) throw new RangeError('Invalid pip');
      events.push({type:'note',pip:event.pip,reverse:!!event.reverse,arm,mod:!!event.mod,mint:!!event.mint,coins:Number(event.coins)||0,time:elapsed / 1000 / speed});
      elapsed += operationDelay(operation++);
    } else if (event.type === 'rebound' || event.type === 'split') {
      events.push({type:event.type,kind:event.kind || null,time:elapsed / 1000 / speed});
    } else if (event.type === 'arm') {
      arm = event.arm;
      events.push({type:'arm',arm,time:elapsed / 1000 / speed});
    } else if (event.type === 'arm-end') {
      arm = null;
    } else throw new RangeError('Unknown replay event');
  }
  return {events,duration:elapsed / 1000 / speed,operations:operation};
}
