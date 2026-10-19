// Data-only listening map inferred from the user's purchased Space Drift stems.
// Source: spectral peak sampling of D - Pads at 3-second intervals, aggregated
// into 12-second windows across its 432-second seamless loop (80 BPM).
// This is a provisional tonal-center map, NOT a verified chord transcription.
// No copyrighted audio is redistributed with this file.
export const SPACE_DRIFT_LENGTH=432;
export const SPACE_DRIFT_BPM=80;
export const HARMONIC_WINDOW_SECONDS=12;
const CENTER_SERIES=Object.freeze([
 'C','C','C','Bb','C','C','C','Bb','C','C','Eb','Bb',
 'C','C','C','C','C','Bb','C','C','C','Bb','C','C',
 'Eb','Bb','C','C','C','Bb','C','C','Eb','Bb','C','C'
]);
const PALETTES=Object.freeze({
 C:Object.freeze({label:'C / G · open',notes:Object.freeze([60,62,64,67,72]),chord:Object.freeze([60,64,67])}),
 Bb:Object.freeze({label:'Bb / F · warm',notes:Object.freeze([58,60,62,65,70]),chord:Object.freeze([58,62,65])}),
 Eb:Object.freeze({label:'Eb / F · mysterious',notes:Object.freeze([63,65,67,70,75]),chord:Object.freeze([63,67,70])})
});
export function harmonyAt(seconds) {
 if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('Invalid soundtrack time');
 const loopTime=seconds%SPACE_DRIFT_LENGTH;
 const index=Math.floor(loopTime/HARMONIC_WINDOW_SECONDS);
 const center=CENTER_SERIES[index];
 const palette=PALETTES[center];
 return {index,startSeconds:index*HARMONIC_WINDOW_SECONDS,endSeconds:(index+1)*HARMONIC_WINDOW_SECONDS,center,label:palette.label,notes:[...palette.notes],chord:[...palette.chord],bpm:SPACE_DRIFT_BPM,confidence:'provisional spectral inference'};
}
