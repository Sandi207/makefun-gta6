import * as THREE from 'three';
import { MISSIONS } from './missions.js';
export function createUI(simulation,city) {
  const el=id=>document.getElementById(id);
  const map=el('minimap'),ctx=map.getContext('2d'),state=simulation.state;
  let lastMode='',lastCar=false,eventIndex=0,toastQueue=[],missionSignature='',lastElapsed=0;
  const set=(id,text)=>{if(el(id).textContent!==text)el(id).textContent=text;};
  function minimap() {
    const p=state.player,scale=1.72,w=map.width,h=map.height;
    const x=v=>w/2+(v-p.x)*scale,z=v=>h/2+(v-p.z)*scale;
    ctx.fillStyle='#33534f';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#889d79';ctx.fillRect(x(-342),z(-342),684*scale,774*scale);
    ctx.fillStyle='#a4a181';ctx.fillRect(x(341),z(-342),116*scale,774*scale);
    ctx.fillStyle='#497e89';ctx.fillRect(x(457),0,w,h);
    for(let i=-5;i<=5;i++) {
      ctx.fillStyle='#243c3c';ctx.fillRect(x(i*64-9),z(-342),18*scale,684*scale);ctx.fillRect(x(-342),z(i*64-9),684*scale,18*scale);
      ctx.strokeStyle='#b5b395';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(x(i*64),z(-342));ctx.lineTo(x(i*64),z(342));ctx.moveTo(x(-342),z(i*64));ctx.lineTo(x(342),z(i*64));ctx.stroke();
    }
    ctx.fillStyle='#617765';
    for(const b of city.blocks) if(Math.abs(b.x-p.x)<160&&Math.abs(b.z-p.z)<130) ctx.fillRect(x(b.x-b.w/2),z(b.z-b.d/2),b.w*scale,b.d*scale);
    ctx.strokeStyle='#d5e894';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.globalAlpha=0.6;ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(x(Math.round(p.x/64)*64),h/2);ctx.lineTo(x(Math.round(p.x/64)*64),z(state.waypoint.z));ctx.lineTo(x(state.waypoint.x),z(state.waypoint.z));ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    for(const car of state.cars) {
      if(car===p.vehicle||(car.police&&!car.active)) continue;
      ctx.fillStyle=car.police?'#79beff':car.repo?'#e0efa4':car.traffic?'#f7c999':'#d0d4b5';ctx.beginPath();ctx.arc(x(car.x),z(car.z),car.traffic?3:2.4,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#afc9c0';for(const ped of state.peds) {ctx.beginPath();ctx.arc(x(ped.x),z(ped.z),1.8,0,Math.PI*2);ctx.fill();}
    for(const actor of [...state.gangs,...state.officers])if(actor.active){ctx.fillStyle=actor.role==='police'?'#79beff':'#df93c0';ctx.beginPath();ctx.arc(x(actor.x),z(actor.z),3.3,0,Math.PI*2);ctx.fill();}
    for(const item of [...state.pickups,...state.tokens])if(item.active){ctx.fillStyle=item.kind==='token'?'#ffc773':item.kind==='health'?'#9be9a3':item.kind==='armor'?'#8dcafa':'#eee4be';ctx.fillRect(x(item.x)-2,z(item.z)-2,4,4);}
    const wp=state.waypoint,wx=Math.max(13,Math.min(w-13,x(wp.x))),wz=Math.max(13,Math.min(h-13,z(wp.z)));
    ctx.save();ctx.translate(wx,wz);ctx.rotate(Math.PI/4);ctx.fillStyle='#e0efa4';ctx.fillRect(-5,-5,10,10);ctx.strokeStyle='#1e4044';ctx.lineWidth=2;ctx.strokeRect(-5,-5,10,10);ctx.restore();
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-p.yaw);ctx.shadowColor='#e0efa4';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(0,12);ctx.lineTo(-7,-8);ctx.lineTo(0,-4);ctx.lineTo(7,-8);ctx.closePath();ctx.fillStyle='#f3f4d8';ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=2;ctx.strokeStyle='#1e4145';ctx.stroke();ctx.restore();
    const grd=ctx.createRadialGradient(w/2,h/2,h/4,w/2,h/2,w/1.4);grd.addColorStop(0,'transparent');grd.addColorStop(1,'rgba(13,35,38,.38)');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
  }
  function update(camera,input) {
    const p=state.player,car=p.vehicle,mode=state.mode;
    if(state.elapsed<lastElapsed){eventIndex=0;for(const t of toastQueue)t.div.remove();toastQueue=[];}lastElapsed=state.elapsed;
    if(mode!==lastMode) {
      el('title').hidden=mode!=='title';el('hud').hidden=mode==='title';el('pause').hidden=mode!=='pause';el('missions').hidden=mode!=='mission-menu';el('briefing').hidden=mode!=='briefing';el('mission-result').hidden=mode!=='result';el('death-screen').hidden=!['busted','wasted'].includes(mode);
      set('status',mode==='title'?'Street Empire: Marisol Bay. Enter Marisol to begin.':mode==='pause'?'Paused.':'Explore Marisol Bay as Dario Fuentes.');lastMode=mode;
    }
    const driving=Boolean(car);
    if(driving!==lastCar) {
      document.body.classList.toggle('driving',driving);el('drive-hud').hidden=!driving;
      el('controls-hint').innerHTML=driving?'<span><kbd>W / S</kbd> ACCEL / BRAKE</span><span><kbd>A / D</kbd> STEER</span><span><kbd>SPACE</kbd> HANDBRAKE</span><span><kbd>E</kbd> EXIT</span><span><kbd>T</kbd> TAXI</span><span><kbd>M</kbd> JOBS</span><span><kbd>ESC</kbd> PAUSE</span>':'<span><kbd>WASD</kbd> MOVE</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>RMB</kbd> LOOK</span><span><kbd>F / CLICK</kbd> FIGHT</span><span><kbd>M</kbd> JOBS</span><span><kbd>ESC</kbd> PAUSE</span>';
      lastCar=driving;
    }
    set('district',state.district);
    const hours=Math.floor(state.clock/60),minutes=Math.floor(state.clock%60);
    const clockHTML=`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')} <i>${hours>6&&hours<19?'☀':'☾'}</i>`;if(el('clock').innerHTML!==clockHTML)el('clock').innerHTML=clockHTML;
    set('cash','$'+Math.floor(p.cash).toLocaleString('en-US'));set('wanted','★'.repeat(p.wanted)+'☆'.repeat(5-p.wanted));
    el('health').style.width=p.health+'%';el('armor').style.width=p.armor+'%';set('health-label',String(Math.ceil(p.health)));set('armor-label',String(Math.ceil(p.armor)));
    el('continue-button').hidden=!state.hasSave;
    set('waypoint-label',state.waypoint.label.length>22?state.waypoint.label.slice(0,21)+'…':state.waypoint.label);
    set('waypoint-distance',Math.round(Math.hypot(p.x-state.waypoint.x,p.z-state.waypoint.z))+' m');
    set('street-name',(Math.abs(p.x-64)<30?'PALMA AVENUE':p.x>330?'OCEAN PROMENADE':p.z>190?'PORT ROAD':'COSTA BOULEVARD')+' / MARISOL BAY');
    const nearby=simulation.nearCar;
    el('context').hidden=(!nearby&&!car)||mode!=='play';
    if(car) {
      set('context-text',Math.abs(car.speed)>5?'Slow down to exit':'Exit vehicle');
      const speed=Math.round(Math.abs(car.speed)*3.6);set('speed',String(speed));
      set('gear',car.speed<-.5?'R':car.speed<.5?'N':String(Math.min(6,1+Math.floor(speed/35))));
      set('vehicle-name',car.spec.name);el('speed-fill').style.width=Math.min(100,speed/190*100)+'%';el('car-health').style.width=car.health+'%';
    } else if(nearby) set('context-text','Enter '+nearby.spec.name.split(' · ')[0]);
    el('intro-card').style.opacity=state.elapsed>28||state.mission||state.shot==='mission'?'0':'1';
    const mission=state.mission,stage=simulation.gameplay.currentStage();
    set('objective-source',mission?`MAMA ROSA / JOB ${mission.id+1} OF 6`:state.taxi?'CITY CAB / FARE IN PROGRESS':`MAMA ROSA / ${state.completed.length}/6 COMPLETE / M`);
    set('objective',stage?.label|| (state.taxi?state.waypoint.label:state.completed.length===6?'The story is yours. Explore Marisol Bay.':'Six jobs. One way to a fresh start.'));
    const remaining=mission?.remaining??state.taxi?.remaining;
    set('objective-timer',remaining===undefined?'T / taxi fares · 20 sunset tokens hidden around town':`TIME ${Math.floor(remaining/60)}:${String(Math.floor(remaining%60)).padStart(2,'0')} · stop at the marker${stage?.clean?' · zero wanted required':''}`);
    set('weapon-label',state.weapon.toUpperCase());set('ammo-label',state.weapon==='fists'?'F / PUNCH':`${state.ammo[state.weapon]} ROUNDS / 1–3 SWITCH`);
    set('token-label',`☀ ${state.foundTokens.length} / 20 SUNSET TOKENS`);
    set('police-status',state.arrest>0?`ARREST ${Math.round(state.arrest/2.2*100)}% / RUN!`:p.wanted?state.unseen>1?`OUT OF SIGHT / ${Math.max(0,Math.ceil(12-state.unseen))}s TO COOL DOWN`:'MBPD PURSUIT / BREAK LINE OF SIGHT': '');
    el('wanted').setAttribute('aria-label',`Wanted level ${p.wanted} of 5`);
    set('mute-button',state.muted?'Audio muted / 0 to unmute':'Audio on / 0 to mute');
    el('crosshair').hidden=mode!=='play'||Boolean(car)||state.weapon==='fists';
    if(input){el('crosshair').style.left=((input.pointer.x+1)*50)+'%';el('crosshair').style.top=((1-input.pointer.y)*50)+'%';}
    if(camera){const point=new THREE.Vector3(state.waypoint.x,3,state.waypoint.z).project(camera),visible=point.z<1&&point.z>-1;
      el('waypoint-hud').hidden=mode!=='play';el('waypoint-hud').style.left=(visible?Math.max(24,Math.min(innerWidth-24,(point.x+1)*innerWidth/2)):innerWidth*.5)+'px';
      el('waypoint-hud').style.top=(visible?Math.max(120,Math.min(innerHeight-90,(1-point.y)*innerHeight/2)):innerHeight-135)+'px';
      el('waypoint-hud').querySelector('span').textContent=(visible?'':'↶ ')+Math.round(Math.hypot(p.x-state.waypoint.x,p.z-state.waypoint.z))+' m';}
    const signature=state.completed.join(',')+':'+(mission?.id??'')+':'+mode;
    if(signature!==missionSignature){missionSignature=signature;el('mission-list').replaceChildren();
      MISSIONS.forEach((m,i)=>{const button=document.createElement('button'),done=state.completed.includes(i),locked=(i>0&&!state.completed.includes(i-1))||Boolean(mission);
        button.textContent=m.title;const pay=document.createElement('span');pay.textContent=done?'PASSED':locked?'LOCKED':'$'+m.reward;button.append(pay);button.disabled=done||locked;
        button.addEventListener('click',()=>{simulation.gameplay.prepareMission(i);update(camera,input);});el('mission-list').append(button);});
    }
    if(mode==='briefing'&&mission){const m=MISSIONS[mission.id];set('briefing-title',m.title);set('briefing-copy',m.briefing);set('briefing-pay',`PAY $${m.reward} / LIMIT ${Math.floor(m.time/60)}:${String(m.time%60).padStart(2,'0')}`);}
    if(state.missionResult){const r=state.missionResult;set('result-label',r.passed?'MISSION PASSED / +$'+r.reward:'MISSION FAILED');set('result-title',r.title);set('result-copy',r.reason);el('retry-mission').hidden=r.passed;}
    if(state.death){const busted=state.death.type==='busted';set('death-title',busted?'BUSTED':'WASTED');set('death-copy',`${busted?'MBPD caught you. Respawn at the police station.':'Marisol General patched you up. Respawn at the hospital.'} $${state.death.fine} ${busted?'fine':'medical bill'} deducted.`);}
    if(eventIndex>state.events.length){eventIndex=0;for(const t of toastQueue)t.div.remove();toastQueue=[];}
    while(eventIndex<state.events.length) {
      const event=state.events[eventIndex++],div=document.createElement('div');div.className='toast '+event.type;div.textContent=event.message;el('toasts').append(div);toastQueue.push({div,time:state.elapsed});
    }
    toastQueue=toastQueue.filter(t=>{if(state.elapsed-t.time>6){t.div.remove();return false;}return true;});
    while(toastQueue.length>3)toastQueue.shift().div.remove();
    minimap();
  }
  return {update};
}
