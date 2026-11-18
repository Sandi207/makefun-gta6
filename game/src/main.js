import * as THREE from 'three';
import { STEP } from './config.js';
import { advanceClock } from './timing.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createCity } from './world.js';
import { createSimulation } from './simulation.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';
import { createSave } from './save.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
const params=new URLSearchParams(location.search),requested=params.get('shot');
const shot=['start','street','drive','chase','mission'].includes(requested)?requested:null;
const seedValue=Number.parseInt(params.get('seed')??'',10),seed=Number.isInteger(seedValue)?seedValue:2026;
async function boot() {
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const random=createRandom(seed),canvas=document.getElementById('game'),scene=new THREE.Scene();
  const input=createInput(canvas),view=createRenderer(canvas,scene),city=createCity(scene,random);
  const simulation=createSimulation(scene,city,random),state=simulation.state,ui=createUI(simulation,city),audio=createAudio(state);
  let storage;try{storage=window.localStorage;}catch{}
  const save=createSave(simulation,storage);state.hasSave=save.hasSave();
  let frozen=Boolean(shot),last=performance.now(),accumulator=0,painted=0,lastSave=0,lastSavedMode='title',lastSavedProgress='';
  if(shot)stageShot(shot,simulation,input,random);
  function paint(dt=STEP,instant=false){view.update(state,input,city,dt,instant);view.draw();ui.update(view.camera,input);}
  paint(STEP,true);document.getElementById('loading').hidden=true;
  function start(){lastSave=0;save.reset();frozen=false;input.clear();simulation.start();last=performance.now();accumulator=0;paint(STEP,true);}
  function resume(){state.mode='play';frozen=false;input.clear();accumulator=0;last=performance.now();ui.update(view.camera,input);audio.unlock();}
  function togglePause(){if(state.mode==='play'){state.mode='pause';input.clear();}else if(state.mode==='pause')resume();else if(state.mode==='mission-menu'){state.mode='play';input.clear();}ui.update(view.camera,input);}
  function missionMenu(){if(state.mode==='play'){state.mode='mission-menu';input.clear();}else if(state.mode==='mission-menu')resume();ui.update(view.camera,input);}
  const on=(id,fn)=>document.getElementById(id).addEventListener('click',()=>{audio.unlock();simulation.gameplay.sound('ui');fn();paint(STEP,true);});
  on('start-button',start);on('continue-button',()=>{if(save.restore(save.read())){frozen=false;input.clear();last=performance.now();accumulator=0;}});
  on('resume-button',resume);on('title-button',()=>{if(!shot){save.write();state.hasSave=save.hasSave();}state.mode='title';input.clear();});
  on('save-button',()=>{save.write(true);state.hasSave=save.hasSave();});on('mute-button',audio.toggle);
  on('mission-close',resume);on('accept-mission',()=>{simulation.gameplay.beginMission();input.clear();frozen=false;});
  on('decline-mission',()=>{state.mission=null;state.waypoint={x:11.3,z:26,label:'MAMA ROSA / M for jobs'};simulation.gameplay.updateWaypoint();resume();});
  on('retry-mission',simulation.gameplay.retryMission);on('result-close',resume);
  on('respawn-button',()=>{simulation.gameplay.respawn();resume();if(!shot)save.write();});
  window.addEventListener('pointerdown',audio.unlock,{capture:true});
  window.addEventListener('keydown',e=>{
    audio.unlock();
    if(!e.repeat){
      if(e.code==='Enter'&&state.mode==='title')start();
      if(e.code==='Escape'||e.code==='KeyP')togglePause();
      if(e.code==='KeyM')missionMenu();
    }
    if(/^Key[WASDEF]|Space$/.test(e.code)&&state.mode==='play')frozen=false;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='play'&&!shot){save.write();state.mode='pause';input.clear();}});
  window.addEventListener('pagehide',()=>{if(!shot&&state.mode!=='title')save.write();});
  function frame(now) {
    requestAnimationFrame(frame);
    const dt=Math.min(.75,Math.max(0,(now-last)/1000));last=now;
    if(input.take('Digit0'))audio.toggle();
    view.aim(input);
    if(!frozen&&['title','play'].includes(state.mode))accumulator=advanceClock(accumulator,dt,delta=>simulation.step(delta,input,state.mode==='title'));
    else accumulator=0;
    paint(dt||STEP,frozen);audio.update();
    const progress=state.completed.join(',')+'|'+state.foundTokens.join(',');
    if(!shot&&state.mode!=='title'&&(state.mode!==lastSavedMode&&['result','busted','wasted'].includes(state.mode)||progress!==lastSavedProgress||state.mode==='play'&&state.elapsed-lastSave>=5)){
      save.write();state.hasSave=save.hasSave();lastSave=state.elapsed;lastSavedProgress=progress;
    }
    lastSavedMode=state.mode;
    if(++painted===3)window.__shotReady=true;
  }
  window.__game={state,simulation,input,view,city,save,audio,start,snapshot:simulation.snapshot,step:(count=1)=>{for(let i=0;i<count;i++)simulation.step(STEP,input);paint(STEP,true);}};
  console.info('Street Empire ready',JSON.stringify({seed,three:THREE.REVISION,...simulation.snapshot()}));requestAnimationFrame(frame);
}
boot().catch(error=>{console.error(error);document.querySelector('#loading p').textContent='Could not load the city. '+error.message;});
