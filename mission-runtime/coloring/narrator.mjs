import {commonText} from '../narration/resolve.mjs';
// No voice files are licensed/installed in this preview. These hooks accept only
// reviewed same-origin audio when a later catalog explicitly marks it ready.
export function licensedTrack(narration,stage){if(narration?.status!=='ready'||narration?.licenseStatus!=='confirmed'||!narration?.audio||typeof narration.audio!=='object')return null;const path=narration.audio[stage];if(typeof path!=='string'||!/^audio\/[a-z0-9/_-]+\.(mp3|wav|ogg)$/i.test(path))return null;return path;}
export class Narrator{
 constructor(onStatus=()=>{}){this.onStatus=onStatus;this.audio=null;}
 play(narration,stage){this.stop();const src=licensedTrack(narration,stage);if(!src){this.onStatus('Áudio final ainda em preparação.');return false;}this.audio=new Audio(src);this.audio.onended=()=>this.onStatus('Narração concluída.');this.audio.onerror=()=>this.onStatus(commonText('audio_unavailable'));this.audio.play().then(()=>this.onStatus('Ouvindo a narração.')).catch(()=>this.onStatus('Não foi possível iniciar o áudio. Tente novamente.'));return true;}
 toggle(){if(!this.audio)return;if(this.audio.paused)this.audio.play().catch(()=>this.onStatus('Não foi possível retomar.'));else this.audio.pause();}
 stop(){if(this.audio){this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null;}}
}
