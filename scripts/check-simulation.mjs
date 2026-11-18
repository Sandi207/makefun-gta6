// Exercises the real game and three.js geometry without a WebGL context.
// The canvas stub lets procedural texture creation run; this does not certify browser rendering.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(specifier,context,next){
  return next(specifier==='three'?new URL('../game/vendor/three/three.module.min.js',import.meta.url).href:specifier,context);
}});
const noop=()=>{};
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({}, {
  get:(target,key)=>target[key]??noop,set:(target,key,value)=>(target[key]=value,true),
})})};
const THREE=await import('three');
const {createRandom}=await import('../game/src/random.js');
const {createCity}=await import('../game/src/world.js');
const {createSimulation}=await import('../game/src/simulation.js');
const {stageShot}=await import('../game/src/shots.js');
const {STEP}=await import('../game/src/config.js');
function game(seed=6) {
  const rng=createRandom(seed),scene=new THREE.Scene(),city=createCity(scene,rng),sim=createSimulation(scene,city,rng);
  const held=new Set(),pressed=new Set(),input={held,pressed,orbit:{yaw:Math.PI,pitch:.29},down:(...keys)=>keys.some(k=>held.has(k)),take:code=>{const yes=pressed.has(code);pressed.delete(code);return yes;}};
  const step=count=>{for(let i=0;i<count;i++)sim.step(STEP,input);};
  return {rng,scene,city,sim,input,step};
}
assert.equal(THREE.REVISION,'187');
const g=game(),{sim,input,step,city}=g,p=sim.state.player;
assert.equal(sim.snapshot().traffic.length,14);assert.equal(sim.state.peds.length,24);
assert.ok(city.blocks.length>=100);assert.ok(city.colliders.length>600);
const initial=sim.snapshot();sim.start();
input.held.add('KeyW');step(60);input.held.clear();assert.ok(p.z<initial.player.z-3,'camera-relative walking');
const walkDistance=initial.player.z-p.z;
p.x=75;p.z=26;input.held.add('KeyW');input.held.add('ShiftLeft');step(60);input.held.clear();assert.ok(26-p.z>walkDistance*1.5,'sprint is faster');
p.x=75;p.z=26;p.y=.17;p.vy=0;input.pressed.add('Space');step(20);assert.ok(p.y>.6,'jump leaves ground');step(90);assert.ok(Math.abs(p.y-.17)<.02,'jump lands');
// Walk across into a nearby building; the character must stay outside its AABB.
p.x=75;p.z=-32;p.y=.17;input.orbit.yaw=Math.PI/2;input.held.add('KeyW');step(300);input.held.clear();assert.ok(p.x<81.5,'building blocks movement');
assert.equal(sim.overlaps(p.x,p.z,.42,.42,p.y),false);
// Take the starter car through the actual E action and accelerate in a clear lane.
p.x=75;p.z=26;p.y=.17;input.orbit.yaw=Math.PI;input.pressed.add('KeyE');step(1);assert.equal(p.vehicle?.spec.id,'sports');
const car=p.vehicle;car.x=68.3;car.z=110;car.yaw=Math.PI;car.speed=0;p.x=car.x;p.z=car.z;
// Keep this physics test clear of NPC impacts; their movement is verified separately below.
sim.state.cars.filter(c=>c!==car).forEach(c=>{c.traffic=false;c.x=-315;c.z=-310-c.id*8;});
input.held.add('KeyW');step(90);input.held.clear();assert.ok(car.speed>15&&car.z<100,'acceleration and car movement');
const speed=car.speed;input.held.add('Space');step(30);input.held.clear();assert.ok(car.speed<speed*.25,'handbrake slows vehicle');
car.speed=0;input.held.add('KeyS');step(90);input.held.clear();assert.ok(car.speed<-3,'reverse');
const yaw=car.yaw;car.speed=10;input.held.add('KeyA');step(25);input.held.clear();assert.ok(Math.abs(car.yaw-yaw)>.2,'speed-scaled steering');
// Controlled impact into a building must damage the engine and prevent penetration.
car.x=75;car.z=-32;car.yaw=Math.PI/2;car.speed=30;car.cooldown=0;const health=car.health;step(20);assert.ok(car.health<health,'building collision damages car');
car.x=68.3;car.z=110;car.speed=0;car.yaw=Math.PI;p.x=car.x;p.z=car.z;sim.enterExit();assert.equal(p.vehicle,null);assert.equal(p.mesh.visible,true);
// Verify world bounds with a sustained outward movement.
p.x=-341;p.z=20;p.y=0;input.orbit.yaw=-Math.PI/2;input.held.add('KeyW');step(120);input.held.clear();assert.ok(p.x>=city.bounds.minX+.4,'city bounds');
const live=game(),liveBefore=live.sim.snapshot();live.step(300);const liveAfter=live.sim.snapshot();
assert.ok(liveAfter.frames>liveBefore.frames);assert.ok(liveAfter.trafficDistance>100,'traffic advances');
assert.ok(liveAfter.traffic.some((c,i)=>Math.hypot(c.x-liveBefore.traffic[i].x,c.z-liveBefore.traffic[i].z)>5),'traffic positions change');
assert.ok(live.sim.state.peds.some(ped=>Math.abs(ped.mesh.position.x)+Math.abs(ped.mesh.position.z)>0));
// Steal a traffic car and verify that the active population replenishes.
const stolen=live.sim.state.cars.find(c=>c.traffic);stolen.speed=0;stolen.x=68.3;stolen.z=110;live.sim.state.player.x=71;live.sim.state.player.z=110;live.sim.enterExit();
assert.equal(live.sim.state.player.vehicle,stolen);assert.equal(live.sim.state.cars.filter(c=>c.traffic).length,14);
const a=game(11),b=game(11);stageShot('drive',a.sim,a.input,a.rng);stageShot('drive',b.sim,b.input,b.rng);assert.deepEqual(a.sim.snapshot(),b.sim.snapshot(),'seeded staging is repeatable');
// Session 2: timing, real browser input sequence, crimes, police, combat, missions and persistence.
const {advanceClock}=await import('../game/src/timing.js');
const {createSave,SAVE_KEY}=await import('../game/src/save.js');
const {MISSIONS,TAXI_STOPS}=await import('../game/src/missions.js');
const timing=game();timing.sim.start();let backlog=0;
timing.input.held.add('KeyW');for(let i=0;i<9;i++)backlog=advanceClock(backlog,1/6,dt=>timing.sim.step(dt,timing.input));timing.input.held.clear();
assert.ok(Math.abs(timing.sim.state.elapsed-1.5)<1e-6,'6 fps tracks real time');
assert.ok(26-timing.sim.state.player.z>6,'6 fps keyboard movement');
backlog=advanceClock(backlog,.75,dt=>timing.sim.step(dt,timing.input));assert.ok(backlog>.24,'long stalls retain bounded backlog');
const timeline=game(),tp=timeline.sim.state.player;timeline.sim.start();timeline.input.held.add('KeyW');timeline.step(90);timeline.input.held.clear();
tp.x=75;tp.z=26;tp.y=.17;timeline.input.pressed.add('KeyE');timeline.step(1);assert.equal(tp.vehicle?.spec.id,'sports');assert.equal(tp.wanted,1);
timeline.input.held.add('KeyW');timeline.step(90);timeline.input.held.clear();assert.ok(tp.vehicle.speed>5,'live starter drive clears browser speed assertion');
const systems=game(),ss=systems.sim.state,sp=ss.player,actions=systems.sim.gameplay;systems.sim.start();
// A fresh theft raises wanted once; re-entering the same stolen car adds no crime.
systems.sim.enterExit();assert.equal(sp.wanted,1);systems.sim.enterExit();systems.sim.enterExit();assert.equal(sp.wanted,1);
actions.raiseWanted(20);assert.equal(sp.wanted,5);actions.raiseWanted(2);assert.equal(sp.wanted,5);
sp.wanted=2;actions.clearPolice();const edge=actions.spawnPolice(),edgeBefore=Math.hypot(edge.x-sp.x,edge.z-sp.z);
assert.ok(Math.abs(edge.x)>=329||Math.abs(edge.z)>=329,'police dispatch at city edge');systems.step(180);
assert.ok(Math.hypot(edge.x-sp.x,edge.z-sp.z)<edgeBefore-20,'dispatched police pursue');
assert.equal(actions.sight({x:75,z:-32},{x:110,z:-32},100),false,'buildings block police sight');
// Police ram a car, then a nearby officer arrests a slow on-foot player.
actions.clearPolice();sp.health=100;sp.armor=0;sp.wanted=2;const ride=sp.vehicle;ride.x=68.3;ride.z=110;ride.health=100;ride.cooldown=0;sp.x=ride.x;sp.z=ride.z;
edge.active=true;edge.x=68.3;edge.z=113;edge.health=100;edge.route=null;edge.ram=0;actions.step(STEP,systems.input);assert.ok(ride.health<100&&sp.health<100,'police ramming hurts vehicle and Dario');
sp.vehicle=null;sp.mesh.visible=true;ride.x=128;ride.z=128;edge.x=128;edge.z=128;const cop=actions.officer(edge);cop.x=sp.x;cop.z=sp.z+1;
const cashBeforeArrest=sp.cash;systems.step(155);assert.equal(ss.mode,'busted');assert.ok(sp.cash<cashBeforeArrest);actions.respawn();assert.equal(ss.mode,'play');assert.equal(sp.x,actions.station.x);assert.equal(sp.wanted,0);
actions.damagePlayer(500);assert.equal(ss.mode,'wasted');assert.equal(sp.health,0);actions.respawn();assert.equal(sp.x,actions.hospital.x);assert.equal(sp.health,100);
// No passive health regeneration; packs and armor provide explicit recovery.
sp.health=45;sp.armor=0;systems.step(60);assert.equal(sp.health,45);
const pack=ss.pickups.find(i=>i.kind==='health'&&i.active);sp.x=pack.x;sp.z=pack.z;systems.step(1);assert.ok(sp.health>45&&!pack.active);
const armor=ss.pickups.find(i=>i.kind==='armor'&&i.active);sp.x=armor.x;sp.z=armor.z;systems.step(1);assert.ok(sp.armor>0);
const pistol=ss.pickups.find(i=>i.kind==='pistol'&&i.active);sp.x=pistol.x;sp.z=pistol.z;systems.step(1);assert.equal(ss.weapon,'pistol');assert.ok(ss.ammo.pistol>0);
// An aimed shot consumes ammo, raises wanted and raycasts against a real gang member.
sp.x=339;sp.z=90;sp.y=0;sp.wanted=0;const target=ss.gangs[0];target.x=339;target.z=84;target.health=70;target.active=true;
const ammoBefore=ss.ammo.pistol,rayAim={origin:{x:339,y:1.3,z:89},direction:{x:0,y:0,z:-1}};
assert.equal(actions.shoot(rayAim),true);assert.equal(ss.ammo.pistol,ammoBefore-1);assert.equal(sp.wanted,1);assert.ok(target.health<70&&target.hostile);assert.ok(ss.effects.length>=2,'tracer and flash');
const healthBeforeFight=sp.health;systems.step(75);assert.ok(sp.health<healthBeforeFight,'provoked gang returns fire');
// Occluding buildings intercept bullets; fists hit nearby targets and loot is real.
const obstruction=actions.rayHit(new THREE.Vector3(75,1.3,-32),new THREE.Vector3(1,0,0));assert.ok(obstruction.distance<30&&obstruction.target===null);
sp.x=339;sp.z=86;target.x=339;target.z=84;target.health=70;target.active=true;assert.equal(actions.punch(),true);assert.ok(target.health<70);
const drops=ss.pickups.length;actions.hitActor(target,200);assert.equal(target.active,false);assert.ok(ss.pickups.length>drops);
// Every token is a reachable sidewalk pickup and gives its bonus only once.
const tokens=game(),ts=tokens.sim.state;tokens.sim.start();const tokenCash=ts.player.cash;
for(const token of ts.tokens){assert.equal(tokens.sim.overlaps(token.x,token.z,.3,.3),false,'token outside scenery');ts.player.x=token.x;ts.player.z=token.z;tokens.step(1);}
assert.equal(ts.foundTokens.length,20);assert.equal(ts.player.cash,tokenCash+1000);tokens.step(1);assert.equal(ts.foundTokens.length,20);
// Finish the full chain through the actual mission objective state machine.
const story=game(),st=story.sim.state,hero=st.player,storyActions=story.sim.gameplay;story.sim.start();
assert.equal(storyActions.prepareMission(1),false,'story progression locks later jobs');
for(let id=0;id<6;id++){
  assert.equal(storyActions.prepareMission(id),true);assert.equal(st.mode,'briefing');storyActions.beginMission();
  for(const stage of MISSIONS[id].stages){
    assert.equal(story.sim.overlaps(stage.x,stage.z,.5,.5),false,'mission destination outside buildings');
    if(stage.vehicle){hero.vehicle=story.sim.starter;hero.vehicle.health=100;}
    if(stage.repo)hero.vehicle=st.cars.find(c=>c.id===st.mission.repoId);
    hero.x=stage.x;hero.z=stage.z;if(hero.vehicle){hero.vehicle.x=hero.x;hero.vehicle.z=hero.z;hero.vehicle.speed=0;}
    if(stage.clean){hero.wanted=2;storyActions.step(STEP,story.input);assert.ok(st.mission,'clean escape cannot pass while wanted');hero.wanted=0;storyActions.clearPolice();}
    if(stage.fight){for(const i of st.mission.fightIds)storyActions.hitActor(st.gangs[i],1000);}
    storyActions.step(STEP,story.input);
  }
  assert.equal(st.mode,'result');assert.equal(st.missionResult.passed,true);assert.ok(st.completed.includes(id));st.mode='play';hero.wanted=0;storyActions.clearPolice();
}
assert.equal(st.completed.length,6);assert.ok(hero.cash>=1250+9450,'story cash rewards');
// Failure freezes the job, and retry restores a valid briefing with its full time limit.
st.completed=[];hero.vehicle=null;storyActions.prepareMission(0);storyActions.beginMission();st.mission.remaining=.001;storyActions.step(STEP,story.input);assert.equal(st.missionResult.passed,false);assert.equal(st.mode,'result');storyActions.retryMission();assert.equal(st.mode,'briefing');assert.equal(st.mission.remaining,210);st.mission=null;st.mode='play';
// Taxi fares require a cab, collect a passenger and pay at the marked destination.
assert.equal(storyActions.taxiStart(),false);hero.vehicle=st.cars.find(c=>c.spec.id==='taxi');hero.vehicle.speed=0;assert.equal(storyActions.taxiStart(),true);
const fare=st.taxi;Object.assign(hero,TAXI_STOPS[fare.from]);storyActions.step(STEP,story.input);assert.equal(st.taxi.phase,'dropoff');const fareCash=hero.cash;Object.assign(hero,TAXI_STOPS[fare.to]);storyActions.step(STEP,story.input);assert.equal(st.taxi,null);assert.ok(hero.cash>fareCash);
// Save/Continue round-trips required data; damaged or unavailable storage fails quietly.
const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const resetCash=hero.cash,persistence=createSave(story.sim,storage);hero.cash=4567;hero.health=63;hero.armor=22;hero.wanted=3;hero.vehicle=story.sim.starter;hero.vehicle.x=68.3;hero.vehicle.z=110;hero.vehicle.health=61;st.completed=[0,1];st.foundTokens=[2,8];st.weapon='smg';st.ammo.smg=77;
assert.equal(persistence.write(),true);assert.equal(persistence.hasSave(),true);const saved=persistence.read();persistence.reset();assert.equal(hero.cash,resetCash);assert.equal(persistence.restore(saved),true);
assert.equal(hero.cash,4567);assert.equal(hero.health,63);assert.equal(hero.armor,22);assert.equal(hero.wanted,3);assert.equal(hero.vehicle.spec.id,'sports');assert.equal(hero.vehicle.health,61);assert.equal(hero.z,110);assert.deepEqual(st.completed,[0,1]);assert.deepEqual(st.foundTokens,[2,8]);assert.equal(st.tokens[2].active,false);assert.equal(st.ammo.smg,77);
memory.set(SAVE_KEY,'broken json');assert.equal(persistence.hasSave(),false);assert.equal(createSave(story.sim,null).write(),false);
// Losing the cops reduces each star after staying beyond their sight radius.
const escape=game(),es=escape.sim.state,ea=escape.sim.gameplay;escape.sim.start();es.player.x=400;es.player.z=-300;es.player.wanted=2;es.lastCrime=-100;
while(es.police.length<6)ea.policeCar(-330,330);for(const c of es.police){c.active=true;c.x=-330;c.z=330;}
escape.step(1500);assert.equal(es.player.wanted,0,'out-of-sight wanted decay');
for(const name of ['start','drive','chase','mission']){const left=game(6),right=game(6);stageShot(name,left.sim,left.input,left.rng);stageShot(name,right.sim,right.input,right.rng);assert.deepEqual(left.sim.snapshot(),right.sim.snapshot(),name+' screenshot staging repeatable');if(name==='chase'){assert.equal(left.sim.state.player.wanted,3);assert.equal(left.sim.state.police.filter(c=>c.active).length,2);}if(name==='mission')assert.ok(left.sim.state.mission&&left.sim.state.gangs.some(a=>a.hostile));}
const session2Checks=['6 fps real-time movement','browser starter drive sequence','crime escalation','edge police pursuit','sight obstruction','ramming','arrest and hospital respawn','no regen','health/armor/weapons','raycast, melee and gang retaliation','20 tokens','all 6 mission rewards','failure/retry','taxi fare','save/continue','wanted decay','4 deterministic shots'];
// Exercise HUD/menu code against all states and verify every DOM target exists in the page.
const {readFile}=await import('node:fs/promises');
const {createUI}=await import('../game/src/ui.js');
const html=await readFile(new URL('../game/index.html',import.meta.url),'utf8');
const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]));
const elements=new Map();
function element(){return {textContent:'',innerHTML:'',style:{},hidden:false,children:[],setAttribute:noop,addEventListener:noop,remove:noop,append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},querySelector(){return element();},getContext:()=>new Proxy({}, {get:(target,key)=>target[key]??(key==='createRadialGradient'?()=>({addColorStop:noop}):noop),set:(target,key,value)=>(target[key]=value,true)})};}
document.getElementById=id=>{assert.ok(ids.has(id),'UI target exists: '+id);if(!elements.has(id))elements.set(id,element());return elements.get(id);};
document.createElement=()=>element();document.body={classList:{toggle:noop}};globalThis.innerWidth=1280;globalThis.innerHeight=720;
const ui=createUI(story.sim,story.city),uiCamera=new THREE.PerspectiveCamera(58,1280/720,.1,1800),uiInput={pointer:{x:0,y:0}};uiCamera.position.set(75,4,32);uiCamera.lookAt(75,1.3,26);uiCamera.updateMatrixWorld();
for(const mode of ['title','play','pause','mission-menu','briefing','result','busted','wasted']){st.mode=mode;ui.update(uiCamera,uiInput);assert.equal(elements.get('title').hidden,mode!=='title');assert.equal(elements.get('pause').hidden,mode!=='pause');}
// Verify gesture gating and synthesizer operation without an audio device.
const {createAudio}=await import('../game/src/audio.js');let contexts=0,tones=0;
class AudioStub {constructor(){contexts++;this.currentTime=0;this.state='running';this.destination={};}createGain(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){tones++;return this.node();}node(){const parameter={value:0,setValueAtTime:noop,exponentialRampToValueAtTime:noop,setTargetAtTime:noop};return {gain:{...parameter},frequency:{...parameter},connect:noop,disconnect:noop,start:noop,stop:noop};}}
globalThis.window={AudioContext:AudioStub};st.mode='play';st.muted=false;const synth=createAudio(st);synth.update();assert.equal(contexts,0,'audio waits for gesture');synth.unlock();assert.equal(contexts,1);st.sounds.push('gunshot','punch','pickup','ui');synth.update();assert.ok(tones>4,'music and effects are synthesized');synth.toggle();assert.equal(st.muted,true);synth.update();
session2Checks.push('HUD/menu DOM wiring','gesture-gated synthesized audio');
let meshCount=0;g.scene.traverse(obj=>{if(obj.isMesh){meshCount++;for(const name of ['position','normal','uv']){const attr=obj.geometry.getAttribute(name);if(attr)assert.ok(Array.from(attr.array).every(Number.isFinite),'finite geometry');}}});
console.log(JSON.stringify({result:'PASS',three:THREE.REVISION,blocks:city.blocks.length,colliders:city.colliders.length,meshes:meshCount,walkDistance,session2Checks,liveTrafficDistance:liveAfter.trafficDistance},null,2));
