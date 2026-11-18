// Original synthesized soundscape. No files, network, or sound before a gesture.
export function createAudio(state) {
  let context,master,engine,engineGain,siren,sirenGain,nextBeat=0,beat=0;
  function oscillator(type,freq,gain,when,duration,slide) {
    const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.setValueAtTime(freq,when);if(slide)o.frequency.exponentialRampToValueAtTime(slide,when+duration);
    g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),when+.015);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    o.connect(g);g.connect(master);o.start(when);o.stop(when+duration+.03);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function unlock() {
    if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      context=new Audio();master=context.createGain();master.gain.value=state.muted?0:.55;master.connect(context.destination);
      engine=context.createOscillator();engine.type='sawtooth';engineGain=context.createGain();engineGain.gain.value=0;
      const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=350;engine.connect(filter);filter.connect(engineGain);engineGain.connect(master);engine.start();
      siren=context.createOscillator();siren.type='sine';sirenGain=context.createGain();sirenGain.gain.value=0;siren.connect(sirenGain);sirenGain.connect(master);siren.start();nextBeat=context.currentTime+.1;
    }
    if(context.state==='suspended')context.resume().catch(()=>{});
  }
  function effect(name) {
    if(!context||state.muted)return;const t=context.currentTime;
    const tones={gunshot:['square',180,.19,.085,45],'enemy-shot':['triangle',150,.06,.08,55],punch:['sine',115,.18,.12,35],damage:['triangle',95,.16,.2,30],pickup:['sine',523,.12,.28,1046],ui:['sine',750,.04,.07,500]};
    if(tones[name]){const [type,freq,gain,duration,slide]=tones[name];oscillator(type,freq,gain,t,duration,slide);}
  }
  function update() {
    const queued=state.sounds.splice(0);if(!context)return;
    const t=context.currentTime,playing=state.mode==='play';master.gain.setTargetAtTime(state.muted?0:.55,t,.04);
    const car=state.player.vehicle;engineGain.gain.setTargetAtTime(playing&&car?.health>0 ? .035 : 0,t,.12);engine.frequency.setTargetAtTime(40+(car?Math.abs(car.speed)*3.7:0),t,.08);
    sirenGain.gain.setTargetAtTime(playing&&state.player.wanted>0 ? .035 : 0,t,.15);siren.frequency.setTargetAtTime(650+Math.sin(t*5)*240,t,.03);
    for(const name of queued)effect(name);
    // An original four-chord pad with a sparse bassline, scheduled on the audio clock.
    if(!playing||state.muted){nextBeat=t+.15;return;}
    const chords=[[130.81,164.81,196],[110,130.81,164.81],[87.31,110,130.81],[98,123.47,146.83]];
    let count=0;
    while(nextBeat<t+.6&&count++<3){const chord=chords[Math.floor(beat/8)%4];if(beat%8===0)for(const f of chord)oscillator('sine',f,.013,nextBeat,3.8);
      oscillator('triangle',chord[beat%2===0?0:2]/2,.025,nextBeat,.34);beat++;nextBeat+=.5;
    }
  }
  function toggle(){state.muted=!state.muted;effect('ui');}
  return {unlock,update,toggle,get started(){return Boolean(context);}};
}
