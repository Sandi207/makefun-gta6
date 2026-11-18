import { animateCharacter } from './models.js';
// Deterministic arrangements of actual world entities, no substitute screenshot artwork.
export function stageShot(name,simulation,input,random) {
  const state=simulation.state,p=state.player;
  state.shot=name;state.hasSave=false;state.clock=16*60+42;
  for(let i=0;i<180;i++)simulation.step(1/60,input,true);
  input.orbit.yaw=Math.PI;input.orbit.pitch=0.29;
  state.mode=name==='start'?'title':'play';
  const traffic=state.cars.filter(c=>c.traffic);
  const poses=[
    [59.7,5,0],[68.3,-22,Math.PI],[59.7,-41,0],[68.3,-77,Math.PI],
    [90,4.3,Math.PI/2],[25,-4.3,-Math.PI/2],[59.7,83,0],
    [132.3,10,Math.PI],[123.7,-52,0],[4.3,28,Math.PI],
    [68.3,-115,Math.PI],[155,4.3,Math.PI/2],[59.7,150,0],[196.3,31,Math.PI],
  ];
  traffic.forEach((car,i)=>{
    const [x,z,yaw]=poses[i%poses.length];car.x=x;car.z=z;car.yaw=yaw;car.speed=11+i%4;simulation.syncCar(car);
    const dir=yaw===0?0:yaw===Math.PI?2:yaw===Math.PI/2?1:3;
    car.dir=dir;car.node={x:Math.round(x/64)+(dir===1?1:dir===3?-1:0),z:Math.round(z/64)+(dir===0?1:dir===2?-1:0)};
  });
  state.peds.forEach((ped,i)=>{
    ped.x=i<14?(i%2?75.3:52.7):11.3+(i%3)*64;
    ped.z=i<14?-58+Math.floor(i/2)*19+random()*2:-90+(i-14)*18;
    ped.axis=0;ped.road=Math.round(ped.x/64)*64;ped.side=ped.x>ped.road?1:-1;ped.dir=i%2?1:-1;
    ped.mesh.position.set(ped.x,0.17,ped.z);ped.mesh.rotation.y=i%2?Math.PI:0;animateCharacter(ped.mesh,i*1.6,true);
  });
  p.x=75;p.z=26;p.y=0.17;p.yaw=Math.PI;
  p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=p.yaw;animateCharacter(p.mesh,1.4,true);
  if(name==='drive'||name==='chase') {
    const car=simulation.starter;car.x=68.3;car.z=104;car.yaw=Math.PI;car.speed=23.1;car.parked=false;
    p.vehicle=car;p.x=car.x;p.z=car.z;p.yaw=car.yaw;p.mesh.visible=false;simulation.syncCar(car);
    simulation.toast(name==='chase'?'MBPD on your tail. Break line of sight and lose the stars.':'Palma Avenue. Take the long way home.');
    if(name==='chase') {
      simulation.gameplay.clearPolice();
      const a=state.police[0];a.active=true;a.x=68.3;a.z=119;a.yaw=Math.PI;a.speed=26;simulation.syncCar(a);
      const b=simulation.gameplay.policeCar(59.7,133,Math.PI);b.speed=27;simulation.syncCar(b);
      p.wanted=3;state.lastCrime=state.elapsed;state.unseen=0;
      input.orbit.yaw=.55;input.orbit.pitch=.32;
    }
  } else if(name==='street') simulation.toast('Your Solero GT is by the curb. Press E to take the wheel.');
  if(name==='mission') {
    state.completed=[0,1,2];simulation.gameplay.prepareMission(3);simulation.gameplay.beginMission();state.mode='play';
    p.vehicle=null;p.mesh.visible=true;p.x=339;p.z=74;p.y=simulation.floorAt(p.x,p.z);p.yaw=Math.PI;
    p.mesh.position.set(p.x,p.y,p.z);p.mesh.rotation.y=p.yaw;animateCharacter(p.mesh,1.3,false);
    state.weapon='pistol';state.ammo.pistol=36;p.armor=65;
    const gang=state.gangs.slice(0,3);
    gang.forEach((a,i)=>{a.x=[339,333,344][i];a.z=[62,63,60][i];a.health=70;a.active=true;a.hostile=true;a.mesh.position.set(a.x,simulation.floorAt(a.x,a.z),a.z);a.mesh.rotation.y=Math.atan2(p.x-a.x,p.z-a.z);animateCharacter(a.mesh,i*1.3,true);});
    simulation.toast('Los Tiburones hold this corner. Clear the crew for Mama Rosa.','damage');
    input.orbit.yaw=Math.PI+.22;input.orbit.pitch=.25;
  }
  state.clock=16*60+42;state.elapsed=4;simulation.gameplay.updateWaypoint();
}
