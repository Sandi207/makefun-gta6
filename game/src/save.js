export const SAVE_KEY='street-empire-marisol-v2';
const finite=(v,fallback,min=-Infinity,max=Infinity)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function createSave(sim,storage) {
  const s=sim.state,p=s.player;
  function serialize() {
    const dead=s.death,destination=dead?(dead.type==='busted'?sim.gameplay.station:sim.gameplay.hospital):p,c=dead?null:p.vehicle;
    return {version:2,player:{x:destination.x,z:destination.z,yaw:p.yaw,health:dead?100:p.health,armor:dead?0:p.armor,cash:p.cash,wanted:p.wanted},
      car:c?{id:c.id,type:c.spec.id,x:c.x,z:c.z,yaw:c.yaw,health:c.health,speed:c.speed,stolen:c.stolen,police:Boolean(c.police)}:null,
      completed:[...s.completed],foundTokens:[...s.foundTokens],weapon:s.weapon,ammo:{...s.ammo},muted:s.muted,clock:s.clock,
      mission:s.mission?{...s.mission,fightIds:[...s.mission.fightIds]}:null,consumed:s.pickups.filter(i=>!i.active).map(i=>i.id)};
  }
  function read() {try{const value=JSON.parse(storage?.getItem(SAVE_KEY)||'null');return value?.version===2&&value.player&&Array.isArray(value.completed)&&Array.isArray(value.foundTokens)?value:null;}catch{return null;}}
  function write(announce=false) {
    try {if(!storage)throw Error('storage unavailable');storage.setItem(SAVE_KEY,JSON.stringify(serialize()));if(announce)sim.toast('Saved to this browser.');return true;}
    catch {if(announce)sim.toast('This browser cannot store a save.');return false;}
  }
  function restore(value) {
    if(value?.version!==2||!value.player)return false;
    const data=value.player;
    if(p.vehicle){p.vehicle.speed=0;p.vehicle.parked=true;}p.vehicle=null;
    Object.assign(p,{x:finite(data.x,75,simBounds().minX+2,simBounds().maxX-2),z:finite(data.z,26,simBounds().minZ+2,simBounds().maxZ-2),yaw:finite(data.yaw,Math.PI),health:finite(data.health,100,1,100),armor:finite(data.armor,40,0,100),cash:finite(data.cash,1250,0,1e9),wanted:Math.round(finite(data.wanted,0,0,5)),vy:0});
    p.y=sim.floorAt(p.x,p.z);p.mesh.visible=true;p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=p.yaw;
    sim.gameplay.clearPolice();s.lastCrime=s.elapsed;s.death=null;s.missionResult=null;s.taxi=null;
    s.completed=[...new Set((value.completed||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<6))];
    s.foundTokens=[...new Set((value.foundTokens||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<20))];
    for(const item of s.tokens){item.active=!s.foundTokens.includes(item.id);item.mesh.visible=item.active;}
    for(const item of s.pickups){item.active=!(value.consumed||[]).includes(item.id);item.mesh.visible=item.active;}
    s.ammo={pistol:Math.floor(finite(value.ammo?.pistol,0,0,9999)),smg:Math.floor(finite(value.ammo?.smg,0,0,9999))};
    s.weapon=['fists','pistol','smg'].includes(value.weapon)?value.weapon:'fists';s.muted=Boolean(value.muted);s.clock=finite(value.clock,1002,0,1440);
    const saved=value.car;
    if(saved&&['sedan','sports','taxi','van','convertible'].includes(saved.type)){
      let car=s.cars.find(c=>c.id===saved.id&&c.spec.id===saved.type&&Boolean(c.police)===Boolean(saved.police));
      if(!car){const type=['sedan','sports','taxi','van','convertible'].indexOf(saved.type);car=saved.police?sim.gameplay.policeCar(p.x,p.z):sim.makeCar(type,p.x,p.z);}
      Object.assign(car,{x:finite(saved.x,p.x,simBounds().minX+2,simBounds().maxX-2),z:finite(saved.z,p.z,simBounds().minZ+2,simBounds().maxZ-2),yaw:finite(saved.yaw,p.yaw),health:finite(saved.health,100,0,100),speed:finite(saved.speed,0,-11,53),traffic:false,parked:false,stolen:true,active:true});
      p.vehicle=car;p.x=car.x;p.z=car.z;p.yaw=car.yaw;p.mesh.visible=false;sim.syncCar(car);
    }
    s.mission=null;s.mode='play';s.waypoint={x:11.3,z:26,label:'MAMA ROSA / M for jobs'};
    const m=value.mission;
    if(m&&Number.isInteger(m.id)&&m.id>=0&&m.id<6&&!s.completed.includes(m.id)&&sim.gameplay.prepareMission(m.id)){
      sim.gameplay.beginMission();if(m.id===2&&p.vehicle?.spec.id==='van'){p.vehicle.repo=true;s.mission.repoId=p.vehicle.id;}s.mission.stage=Math.min(m.id===3?0:1,Math.max(0,Math.floor(finite(m.stage,0))));s.mission.remaining=finite(m.remaining,180,1,300);
    }
    sim.gameplay.updateWaypoint();return true;
  }
  function simBounds(){return sim.bounds;}
  const initial=serialize();
  function reset() {
    // Reset the existing real entities; no reload or storage deletion is needed.
    for(const c of s.cars){c.stolen=false;if(!c.police){c.health=100;c.speed=0;}if(c.repo)c.parked=true;}
    sim.starter.x=71.4;sim.starter.z=27;sim.starter.yaw=Math.PI;sim.starter.parked=true;sim.syncCar(sim.starter);
    for(const a of s.gangs){a.active=true;a.health=70;a.hostile=false;a.x=a.home.x;a.z=a.home.z;a.mesh.rotation.z=0;a.mesh.visible=true;a.mesh.position.set(a.x,sim.floorAt(a.x,a.z),a.z);}
    for(const ped of s.peds)sim.spawnPed(ped);
    p.vehicle=null;restore(initial);sim.gameplay.clearPolice();s.elapsed=0;s.frames=0;s.events.length=0;s.sounds.length=0;return true;
  }
  return {serialize,read,write,restore,reset,hasSave:()=>Boolean(read())};
}
