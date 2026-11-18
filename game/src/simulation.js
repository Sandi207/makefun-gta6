import * as THREE from 'three';
import { CITY, PLAYER, VEHICLES, PAINTS, TRAFFIC_COUNT, PED_COUNT, districtAt } from './config.js';
import { createCar, createCharacter, animateCharacter } from './models.js';
import { createGameplay } from './gameplay.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const dirs=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}];

export function createSimulation(scene, city, random) {
  const player={x:75,z:26,y:0.16,vy:0,yaw:Math.PI,phase:0,health:100,armor:40,cash:1250,wanted:0,vehicle:null};
  player.mesh=createCharacter(random,true); player.mesh.position.set(player.x,player.y,player.z);player.mesh.rotation.y=player.yaw;scene.add(player.mesh);
  const state={player,cars:[],peds:[],elapsed:0,clock:16*60+42,mode:'title',waypoint:{x:366,z:-150,label:'PLAYA DEL SOL'},district:districtAt(player.x,player.z),events:[],frames:0,trafficDistance:0};
  let nextId=0,nearCar=null;
  function toast(message,type='info') { state.events.push({message,type,time:state.elapsed}); }
  function floorAt(x,z) {
    if(x>382&&x<398) return 0.26;
    const nx=Math.abs(x-Math.round(x/64)*64), nz=Math.abs(z-Math.round(z/64)*64);
    return ((nx>=9&&nx<13.6&&nz>=9)||(nz>=9&&nz<13.6&&nx>=9)||x>340&&x<384)?0.17:0;
  }
  function overlaps(x,z,hx,hz,height=0) {
    return city.colliders.some(b=>b.height>height&&x+hx>b.minX&&x-hx<b.maxX&&z+hz>b.minZ&&z-hz<b.maxZ);
  }
  function within(x,z,r=0) {
    const b=city.bounds; return x>b.minX+r&&x<b.maxX-r&&z>b.minZ+r&&z<b.maxZ-r;
  }
  function freeFoot(x,z) {
    return within(x,z,0.5)&&!overlaps(x,z,PLAYER.radius,PLAYER.radius)&&!state.cars.some(c=>(!c.police||c.active)&&distance(c,{x,z})<1.55);
  }
  function makeCar(type,x,z,yaw=0,traffic=false,paint) {
    const spec=VEHICLES[type],mesh=createCar(spec,paint||spec.color);
    const car={id:nextId++,spec,mesh,x,z,yaw,speed:0,steer:0,health:100,traffic,parked:!traffic,cooldown:0,odometer:0,stolen:false};
    scene.add(mesh); state.cars.push(car); syncCar(car); return car;
  }
  function syncCar(car,dt=0) {
    car.mesh.position.set(car.x,floorAt(car.x,car.z),car.z); car.mesh.rotation.y=car.yaw;
    car.mesh.userData.wheels.forEach(w=>{w.rotation.x+=car.speed*dt/0.39;});
    car.mesh.userData.fronts.forEach(w=>{w.rotation.y=car.steer*0.48;});
    car.mesh.userData.smoke.visible=car.health<45;
    if(car.health<45) car.mesh.userData.smoke.rotation.y=state.elapsed*0.32;
  }
  // A reachable coupe beside the arrival point, plus parked vehicles throughout town.
  const starter=makeCar(1,71.4,27,Math.PI,false,'#ed6c43');
  for(let i=0;i<34;i++) {
    const gx=Math.floor(random()*9)-4,gz=Math.floor(random()*9)-4;
    const x=gx*64+(i%2?7.2:-7.2),z=gz*64+22+random()*18;
    if(distance({x,z},starter)<12||state.cars.some(c=>distance(c,{x,z})<7)) continue;
    makeCar(i%5,x,z,i%2?Math.PI:0,false,i%5===2?undefined:PAINTS[i%PAINTS.length]);
  }
  function spawnTraffic(car,near=true) {
    const px=Math.round(player.x/64),pz=Math.round(player.z/64);
    const ix=clamp(px+Math.floor(random()*5)-2,-4,4),iz=clamp(pz+Math.floor(random()*5)-2,-4,4);
    const di=Math.floor(random()*4),dir=dirs[di];
    const nx=clamp(ix+dir.x,-5,5),nz=clamp(iz+dir.z,-5,5);
    car.node={x:nx,z:nz}; car.dir=di;
    const along=16+random()*31;
    car.x=ix*64+dir.x*along-dir.z*4.3; car.z=iz*64+dir.z*along+dir.x*4.3;
    car.yaw=Math.atan2(dir.x,dir.z); car.speed=8+random()*4; car.cruise=10+random()*4; car.wait=0;
    car.traffic=true; car.parked=false; car.health=100; syncCar(car);
  }
  for(let i=0;i<TRAFFIC_COUNT;i++) {
    const car=makeCar(i%5,0,0,0,true,i%5===2?undefined:PAINTS[(i+3)%PAINTS.length]); spawnTraffic(car);
  }
  function spawnPed(ped) {
    const axis=random()>0.5?0:1,side=random()>0.5?1:-1;
    const road=clamp(Math.round((axis?player.z:player.x)/64)+Math.floor(random()*3)-1,-5,5)*64;
    const along=(axis?player.x:player.z)+(random()-0.5)*130;
    ped.health=60;ped.active=true;ped.role='ped';ped.mesh.visible=true;ped.mesh.rotation.z=0;ped.downUntil=0;
    ped.axis=axis; ped.road=road; ped.side=side; ped.dir=random()>0.5?1:-1;
    ped.x=axis?clamp(along,-328,328):road+side*11.3;
    ped.z=axis?road+side*11.3:clamp(along,-328,328);
    ped.speed=0.8+random()*0.65; ped.flee=0; ped.phase=random()*6.28; ped.crossing=false;
    ped.nextCross=state.elapsed+5+random()*15;
  }
  for(let i=0;i<PED_COUNT;i++) {
    const mesh=createCharacter(random),ped={id:i,mesh}; scene.add(mesh); spawnPed(ped); state.peds.push(ped);
  }
  function enterExit() {
    if(player.vehicle) {
      const car=player.vehicle;
      if(Math.abs(car.speed)>5) {toast('Slow down before stepping out.');return;}
      const candidates=[[-2,0],[2,0],[0,-3.6],[0,3.6]];
      let point=null;
      for(const [dx,dz] of candidates) {
        const x=car.x+Math.cos(car.yaw)*dx+Math.sin(car.yaw)*dz,z=car.z-Math.sin(car.yaw)*dx+Math.cos(car.yaw)*dz;
        if(freeFoot(x,z)) {point={x,z};break;}
      }
      if(!point) {toast('Both doors are blocked. Move the car first.');return;}
      player.x=point.x;player.z=point.z;player.y=floorAt(point.x,point.z);player.yaw=car.yaw;player.vehicle=null;player.mesh.visible=true;
      car.speed=0;car.parked=true;toast('Back on the streets.');
    } else {
      const car=state.cars.filter(c=>(!c.police||c.active)&&distance(c,player)<4.2&&Math.abs(c.speed)<7).sort((a,b)=>distance(a,player)-distance(b,player))[0];
      if(!car) {toast('Get closer to a stopped car.');return;}
      if(car.health<=0) {toast('This vehicle is wrecked. Find another ride.');return;}
      if(!car.stolen)gameplay.raiseWanted(1,'Vehicle theft');
      car.traffic=false;car.parked=false;car.stolen=true;player.vehicle=car;player.mesh.visible=false;
      player.x=car.x;player.z=car.z;player.yaw=car.yaw;toast(`${car.spec.name} — yours for the taking.`);
      // Replace the stolen traffic slot; parked cars do not count toward traffic population.
      if(state.cars.filter(c=>c.traffic).length<TRAFFIC_COUNT) {
        const replacement=makeCar(Math.floor(random()*5),0,0,0,true);spawnTraffic(replacement);
      }
    }
  }
  function stepFoot(dt,input) {
    const forward=(input.down('KeyW','ArrowUp')?1:0)-(input.down('KeyS','ArrowDown')?1:0);
    const right=(input.down('KeyD','ArrowRight')?1:0)-(input.down('KeyA','ArrowLeft')?1:0);
    const running=input.down('ShiftLeft','ShiftRight'),yaw=input.orbit.yaw;
    let dx=Math.sin(yaw)*forward-Math.cos(yaw)*right,dz=Math.cos(yaw)*forward+Math.sin(yaw)*right;
    const norm=Math.hypot(dx,dz),moving=norm>0;
    if(moving) {
      const amount=(running?PLAYER.sprint:PLAYER.walk)*dt/norm; dx*=amount;dz*=amount;
      const x=player.x+dx,z=player.z+dz;
      if(within(x,player.z,PLAYER.radius)&&!overlaps(x,player.z,PLAYER.radius,PLAYER.radius,player.y)&&!state.cars.some(c=>(!c.police||c.active)&&distance(c,{x,z:player.z})<1.3)) player.x=x;
      if(within(player.x,z,PLAYER.radius)&&!overlaps(player.x,z,PLAYER.radius,PLAYER.radius,player.y)&&!state.cars.some(c=>(!c.police||c.active)&&distance(c,{x:player.x,z})<1.3)) player.z=z;
      const target=Math.atan2(dx,dz);player.yaw+=angleDelta(target,player.yaw)*Math.min(1,dt*14);
      player.phase+=dt*(running?13:8);
    }
    const ground=floorAt(player.x,player.z);
    if(input.take('Space')&&player.y<=ground+0.03) player.vy=PLAYER.jump;
    player.vy-=PLAYER.gravity*dt;player.y+=player.vy*dt;
    if(player.y<ground) {if(player.vy<-11)gameplay.damagePlayer((-player.vy-11)*5);player.y=ground;player.vy=0;}
    player.mesh.position.set(player.x,player.y+(moving?Math.abs(Math.sin(player.phase))*0.025:0),player.z);
    player.mesh.rotation.y=player.yaw;animateCharacter(player.mesh,player.phase,moving,running);
  }
  function damage(car,force) {
    if(car.cooldown>0||force<2) return;
    car.health=Math.max(0,car.health-force*1.4);car.cooldown=0.7;
    if(car===player.vehicle) {
      if(force>14) gameplay.damagePlayer((force-14)*0.7);
      toast(car.health<45?'Engine damaged. Find another ride.':'Watch the paintwork.','damage');
    }
  }
  function stepDrive(dt,input) {
    const car=player.vehicle;input.take('Space');
    const forward=input.down('KeyW','ArrowUp'),back=input.down('KeyS','ArrowDown'),handbrake=input.down('Space');
    const steer=(input.down('KeyA','ArrowLeft')?1:0)-(input.down('KeyD','ArrowRight')?1:0);
    if(car.health>0) {
      if(forward) car.speed+=car.spec.accel*dt*(car.speed<0?2:1);
      if(back) car.speed-=dt*(car.speed>1?22:car.spec.accel*0.6);
    }
    car.speed*=Math.exp(-dt*(handbrake?3.8:forward||back?0.10:0.5));
    const max=car.spec.maxSpeed*(car.health<45?0.65:1);
    car.speed=clamp(car.speed,-11,max); if(Math.abs(car.speed)<0.04) car.speed=0;
    car.steer+=(steer-car.steer)*Math.min(1,dt*7);
    const oldYaw=car.yaw;
    car.yaw+=car.steer*dt*(handbrake?2.1:1.25)*clamp(Math.abs(car.speed)/6,0,1)/(1+Math.abs(car.speed)*0.025)*Math.sign(car.speed);
    const x=car.x+Math.sin(car.yaw)*car.speed*dt,z=car.z+Math.cos(car.yaw)*car.speed*dt;
    const hx=Math.abs(Math.cos(car.yaw))*car.spec.width/2+Math.abs(Math.sin(car.yaw))*car.spec.length/2;
    const hz=Math.abs(Math.sin(car.yaw))*car.spec.width/2+Math.abs(Math.cos(car.yaw))*car.spec.length/2;
    if(!within(x,z,2)||overlaps(x,z,hx,hz)) {
      damage(car,Math.abs(car.speed));car.speed*=-0.25;car.yaw=oldYaw;
    } else {car.x=x;car.z=z;}
    for(const other of state.cars) {
      if(other===car||(other.police&&!other.active)||distance(other,car)>3.35) continue;
      const force=Math.abs(car.speed-other.speed)+2;if(other.police&&car.cooldown<=0&&force>3)gameplay.raiseWanted(2,'Hit an MBPD car');damage(car,force);damage(other,force*0.6);
      const dx=car.x-other.x,dz=car.z-other.z,len=Math.hypot(dx,dz)||1;
      car.x=other.x+dx/len*3.4;car.z=other.z+dz/len*3.4;car.speed*=-0.22;other.speed*=0.3;other.wait=1.3;
      if(overlaps(car.x,car.z,hx,hz)) {car.x-=dx/len*1.2;car.z-=dz/len*1.2;}
    }
    car.odometer+=Math.abs(car.speed)*dt;
    player.x=car.x;player.z=car.z;player.yaw=car.yaw;
    syncCar(car,dt);
  }
  function nextTrafficNode(car) {
    let d=car.dir;
    if(random()<0.34) d=(d+(random()>0.5?1:3))%4;
    for(let attempt=0;attempt<4;attempt++) {
      const dir=dirs[d],x=car.node.x+dir.x,z=car.node.z+dir.z;
      if(Math.abs(x)<=5&&Math.abs(z)<=5) {car.dir=d;car.node={x,z};return;}
      d=(d+1)%4;
    }
  }
  function stepTraffic(car,dt) {
    if(distance(car,player)>195) {spawnTraffic(car);return;}
    const dir=dirs[car.dir],target={x:car.node.x*64-dir.z*4.3,z:car.node.z*64+dir.x*4.3};
    const dx=target.x-car.x,dz=target.z-car.z,dist=Math.hypot(dx,dz);
    if(dist<1.7) {nextTrafficNode(car);return;}
    car.wait=Math.max(0,(car.wait||0)-dt);
    let speed=car.health>0?car.cruise:0;
    const phase=Math.floor(state.elapsed/9)%2,axis=dir.x?1:0;
    if(dist<16&&dist>9&&phase!==axis) speed=0;
    if(car.wait>0) speed=0;
    const fx=Math.sin(car.yaw),fz=Math.cos(car.yaw);
    for(const other of state.cars) {
      if(other===car||(!other.traffic&&other!==player.vehicle)) continue;
      const ox=other.x-car.x,oz=other.z-car.z,dot=ox*fx+oz*fz,cross=Math.abs(ox*fz-oz*fx);
      if(dot>0&&dot<8&&cross<2.5) speed=Math.min(speed,Math.max(0,other.speed-1));
    }
    for(const ped of state.peds) if(ped.crossing&&distance(ped,car)<9) speed=0;
    car.speed+=(speed-car.speed)*Math.min(1,dt*(speed===0?5:1.6));
    const yaw=Math.atan2(dx,dz);car.steer=clamp(angleDelta(yaw,car.yaw),-1,1);
    car.yaw+=angleDelta(yaw,car.yaw)*Math.min(1,dt*4.2);
    const amount=Math.min(dist,car.speed*dt);car.x+=dx/dist*amount;car.z+=dz/dist*amount;
    state.trafficDistance+=amount;syncCar(car,dt);
  }
  function stepPed(ped,dt) {
    if(!ped.active){if(state.elapsed>ped.downUntil)spawnPed(ped);else return;}
    if(!player.vehicle&&ped.active&&state.mode==='play'){const impact=state.cars.find(c=>(!c.police||c.active)&&Math.abs(c.speed)>7&&distance(c,player)<1.6);if(impact&&(player.impactAt??-100)<state.elapsed-1){player.impactAt=state.elapsed;gameplay.damagePlayer(Math.abs(impact.speed)*1.2);}}
    if(distance(ped,player)>125) {spawnPed(ped);}
    const fast=state.cars.find(c=>Math.abs(c.speed)>8&&distance(c,ped)<11);
    if(fast) {ped.flee=2.1;ped.awayX=ped.x-fast.x;ped.awayZ=ped.z-fast.z;ped.crossing=false;}
    let dx=0,dz=0;
    if(ped.flee>0) {
      ped.flee-=dt; const n=Math.hypot(ped.awayX,ped.awayZ)||1;
      dx=ped.awayX/n*4.6*dt;dz=ped.awayZ/n*4.6*dt;
    } else if(ped.crossing) {
      if(ped.axis===0) dx=ped.crossDir*ped.speed*1.6*dt;else dz=ped.crossDir*ped.speed*1.6*dt;
      const cross=ped.axis===0?ped.x:ped.z;
      if(Math.abs(cross-(ped.road-ped.side*11.3))<0.4) {ped.side*=-1;ped.crossing=false;ped.nextCross=state.elapsed+12+random()*15;}
    } else {
      const along=ped.axis===0?ped.z:ped.x;
      if(Math.abs(along)>326) ped.dir*=-1;
      if(ped.axis===0) dz=ped.dir*ped.speed*dt; else dx=ped.dir*ped.speed*dt;
      // Cross at marked intersections after looking for approaching vehicles.
      const junction=Math.round(along/64)*64;
      if(state.elapsed>ped.nextCross&&Math.abs(along-junction)<13&&Math.abs(along-junction)>10&&!state.cars.some(c=>distance(c,ped)<15)) {
        ped.crossing=true;ped.crossDir=-ped.side;
      }
      // Recover the sidewalk after fleeing without snapping through props.
      if(ped.axis===0) dx+=(ped.road+ped.side*11.3-ped.x)*Math.min(1,dt*0.7);
      else dz+=(ped.road+ped.side*11.3-ped.z)*Math.min(1,dt*0.7);
    }
    const x=ped.x+dx,z=ped.z+dz;
    if(within(x,z,0.5)&&!overlaps(x,z,0.28,0.28)) {ped.x=x;ped.z=z;}
    else {ped.dir*=-1;if(ped.flee<=0) ped.nextCross=state.elapsed+5;}
    if(Math.abs(dx)+Math.abs(dz)>0.001) ped.mesh.rotation.y=Math.atan2(dx,dz);
    ped.phase+=dt*(ped.flee>0?13:7);
    ped.mesh.position.set(ped.x,floorAt(ped.x,ped.z),ped.z);animateCharacter(ped.mesh,ped.phase,true,ped.flee>0);
  }
  function updateEnvironment(dt) {
    state.clock=(state.clock+dt*0.5)%(24*60);
    const phase=Math.floor(state.elapsed/9)%2;
    city.signals.forEach(s=>{s.mesh.material=s.axis===phase?city.greens:city.reds;});
    city.waves.forEach((w,i)=>{w.position.x=458+i*11+Math.sin(state.elapsed*0.25+i)*2;});
  }
  function step(dt,input,ambient=false) {
    if(['pause','briefing','mission-menu','result','busted','wasted'].includes(state.mode))return;
    state.elapsed+=dt;state.frames++;
    state.cars.forEach(c=>{c.cooldown=Math.max(0,c.cooldown-dt);c.mesh.userData.smoke.visible=c.health<45;if(c.health<45)c.mesh.userData.smoke.rotation.y=state.elapsed*.32;});
    if(!ambient) {
      if(input.take('KeyE')) enterExit();
      if(player.vehicle) stepDrive(dt,input);else stepFoot(dt,input);
    }
    state.cars.filter(c=>c.traffic).forEach(c=>stepTraffic(c,dt));state.peds.forEach(p=>stepPed(p,dt));updateEnvironment(dt);
    if(!ambient)gameplay.step(dt,input);
    const district=districtAt(player.x,player.z);
    if(district!==state.district) {state.district=district;if(!ambient) toast(`Entering ${district}.`);}
    nearCar=player.vehicle?null:state.cars.filter(c=>(!c.police||c.active)&&Math.abs(c.speed)<7&&distance(c,player)<4.2).sort((a,b)=>distance(a,player)-distance(b,player))[0]||null;
  }
  function start() {state.mode='play';toast('Welcome to Marisol Bay, Dario. Your coupe is by the curb.');toast('M opens Mama Rosa’s story jobs. F for fists, click to shoot, T for taxi fares.');}
  function snapshot() {
    return {mode:state.mode,elapsed:+state.elapsed.toFixed(2),frames:state.frames,player:{x:+player.x.toFixed(3),z:+player.z.toFixed(3),y:+player.y.toFixed(3),health:player.health,armor:player.armor,cash:player.cash,wanted:player.wanted,weapon:state.weapon,ammo:{...state.ammo},tokens:state.foundTokens.length,vehicle:player.vehicle?.spec.id||null},
      missions:[...state.completed],mission:state.mission?{...state.mission}:null,police:state.police.filter(c=>c.active).length,unseen:state.unseen,arrest:state.arrest,cars:state.cars.length,traffic:state.cars.filter(c=>c.traffic).map(c=>({id:c.id,x:+c.x.toFixed(2),z:+c.z.toFixed(2),speed:+c.speed.toFixed(2)})),pedestrians:state.peds.length,trafficDistance:+state.trafficDistance.toFixed(2),speed:player.vehicle?.speed||0};
  }
  const api={state,step,start,toast,enterExit,makeCar,spawnTraffic,spawnPed,snapshot,syncCar,overlaps,floorAt,damage,bounds:city.bounds,get nearCar(){return nearCar;},starter};
  const gameplay=createGameplay(api,scene,city,random);api.gameplay=gameplay;return api;
}
