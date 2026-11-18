import * as THREE from 'three';
import { createCharacter, animateCharacter, box, cylinder, sign, mat } from './models.js';
import { MISSIONS, TAXI_STOPS } from './missions.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function createGameplay(sim,scene,city,random) {
  const s=sim.state,p=s.player;
  Object.assign(s,{police:[],officers:[],gangs:[],pickups:[],tokens:[],foundTokens:[],completed:[],mission:null,missionResult:null,taxi:null,
    unseen:0,lastCrime:-100,arrest:0,weapon:'fists',ammo:{pistol:0,smg:0},sounds:[],effects:[],muted:false,death:null});
  const weapons={};
  for(const kind of ['pistol','smg']){const mesh=new THREE.Group();box(mesh,mat('#263740'),0,-.43,.25,.15,.16,kind==='smg'?.7:.4);box(mesh,mat('#182832'),0,-.54,.16,.12,.23,.12);p.mesh.userData.limbs[0].add(mesh);mesh.visible=false;weapons[kind]=mesh;}
  s.weaponMeshes=weapons;
  let shotCooldown=0,punchCooldown=0,recklessCooldown=0,spawnCooldown=0;
  const ray=new THREE.Ray(),hit=new THREE.Vector3();
  const station={x:-11.3,z:-256},hospital={x:203.3,z:-64};
  function sound(name) {s.sounds.push(name);if(s.sounds.length>30)s.sounds.shift();}
  function raiseWanted(amount,reason) {
    p.wanted=clamp(p.wanted+amount,0,5);s.lastCrime=s.elapsed;s.unseen=0;
    if(reason)sim.toast(`${reason} · MBPD ${p.wanted} star${p.wanted===1?'':'s'}`,'damage');
  }
  function damagePlayer(amount) {
    if(s.mode!=='play'||s.death)return;
    const absorbed=Math.min(p.armor,amount*.7);p.armor-=absorbed;p.health=Math.max(0,p.health-(amount-absorbed));
    if(p.health<=0) defeat('wasted');
  }
  function clearPolice() {
    for(const c of s.police){if(c===p.vehicle)continue;c.active=false;c.speed=0;c.mesh.visible=false;}
    for(const cop of s.officers){cop.active=false;cop.mesh.visible=false;}
    s.arrest=0;s.unseen=0;
  }
  function defeat(type) {
    if(s.death)return;
    s.death={type,fine:Math.min(p.cash,type==='busted'?250+100*p.wanted:200),at:s.elapsed};
    p.cash-=s.death.fine;p.wanted=0;clearPolice();
    if(s.mission)failMission(type==='busted'?'MBPD caught Dario.':'Dario fell in the streets.',false);
    s.taxi=null;s.mode=type;sound('damage');
  }
  function respawn() {
    if(!s.death)return;
    const destination=s.death.type==='busted'?station:hospital;
    if(p.vehicle){p.vehicle.speed=0;p.vehicle.parked=true;}
    p.vehicle=null;p.mesh.visible=true;p.x=destination.x;p.z=destination.z;p.y=sim.floorAt(p.x,p.z);p.vy=0;p.health=100;p.armor=0;
    p.mesh.position.set(p.x,p.y,p.z);s.death=null;s.mode='play';s.arrest=0;s.lastCrime=-100;
    s.waypoint={x:11.3,z:26,label:'MAMA ROSA / M for jobs'};
    sim.toast('Back on your feet. Mama Rosa still has work for you.');sound('ui');
  }
  function policeCar(x,z,yaw=0) {
    const car=sim.makeCar(0,x,z,yaw,false,'#172332');car.police=true;car.active=true;car.parked=false;
    // White door panels, an original department name, and emissive red/blue light bar.
    box(car.mesh,mat('#f0eee1'),0,.78,0,1.94,.51,2.15);
    box(car.mesh,mat('#111d2b'),0,1.76,-.24,1.3,.12,.32);
    car.beacons=[box(car.mesh,mat('#ff6256',{emissive:'#ff342a',emissiveIntensity:1.8}),-.4,1.89,-.24,.5,.16,.3),box(car.mesh,mat('#74c5ff',{emissive:'#327eff',emissiveIntensity:1.8}),.4,1.89,-.24,.5,.16,.3)];
    for(const side of [-1,1])sign(car.mesh,'MBPD','MARISOL BAY POLICE',side*.98,.86,0,1.95,.42,'#f0eee1','#192d42',side*Math.PI/2);
    s.police.push(car);return car;
  }
  policeCar(132.3,-4,Math.PI);
  sign(scene,'MBPD','MARISOL BAY POLICE DEPT',station.x,4.2,station.z,8,2.1,'#18334f');
  sign(scene,'MARISOL GENERAL','HOSPITAL / EMERGENCY',hospital.x,4.2,hospital.z,8,2.1,'#306a65');
  function officer(car) {
    let cop=s.officers.find(c=>!c.active);
    if(!cop){const mesh=createCharacter(random);box(mesh,mat('#1e3658'),0,1.18,.18,.58,.48,.025);box(mesh,mat('#e4cc8a'),.13,1.34,.205,.10,.13,.02);box(mesh,mat('#1e3658'),0,1.9,0,.39,.12,.37);scene.add(mesh);cop={mesh,role:'police'};s.officers.push(cop);}
    Object.assign(cop,{x:car.x+2.1,z:car.z,health:90,active:true,hostile:true,attack:1,hit:0,phase:0});cop.mesh.visible=true;return cop;
  }
  function spawnPolice() {
    let car=s.police.find(c=>!c.active&&c!==p.vehicle);
    const road=clamp(Math.round(p.x/64),-5,5)*64+4.3;
    const roadZ=clamp(Math.round(p.z/64),-5,5)*64-4.3;
    const candidates=[{x:road,z:-330,yaw:0},{x:road,z:330,yaw:Math.PI},{x:-330,z:roadZ,yaw:Math.PI/2},{x:330,z:roadZ,yaw:-Math.PI/2}];
    candidates.sort((a,b)=>dist(a,p)-dist(b,p));const point=candidates[0];
    if(!car)car=policeCar(point.x,point.z,point.yaw);
    Object.assign(car,point,{health:100,speed:20,active:true,deployed:false,route:null,stuck:0,ram:0});car.mesh.visible=true;sim.syncCar(car);
    return car;
  }
  function sight(a,b,radius) {
    if(dist(a,b)>radius)return false;
    const origin=new THREE.Vector3(a.x,1.4,a.z),direction=new THREE.Vector3(b.x-a.x,0,b.z-a.z);const length=direction.length();if(length<.01)return true;
    ray.set(origin,direction.normalize());
    for(const c of city.colliders)if(c.height>1.4&&ray.intersectBox(new THREE.Box3(new THREE.Vector3(c.minX,0,c.minZ),new THREE.Vector3(c.maxX,c.height,c.maxZ)),hit)&&hit.distanceTo(origin)<length)return false;
    return true;
  }
  function moveActor(a,dt,speed,target=p) {
    const dx=target.x-a.x,dz=target.z-a.z,n=Math.hypot(dx,dz)||1,amount=Math.min(n,speed*dt);
    const nx=a.x+dx/n*amount,nz=a.z+dz/n*amount;
    if(!sim.overlaps(nx,a.z,.32,.32)&&nx>city.bounds.minX+.5&&nx<city.bounds.maxX-.5)a.x=nx;
    if(!sim.overlaps(a.x,nz,.32,.32)&&nz>city.bounds.minZ+.5&&nz<city.bounds.maxZ-.5)a.z=nz;
    a.phase+=dt*11;a.mesh.rotation.y=Math.atan2(dx,dz);a.mesh.position.set(a.x,sim.floorAt(a.x,a.z),a.z);
    a.mesh.rotation.z=a.hit>0?Math.sin(a.hit*25)*.13:0;animateCharacter(a.mesh,a.phase,n>1.5,true);
  }
  function stepPolice(dt) {
    spawnCooldown-=dt;recklessCooldown-=dt;
    if(p.wanted>0) {
      const desired=Math.min(6,1+p.wanted);
      if(s.police.filter(c=>c.active&&c.health>0&&c!==p.vehicle).length<desired&&spawnCooldown<=0){spawnPolice();spawnCooldown=3;}
    }
    let seen=false;
    for(const car of s.police) {
      if(car.health<=0&&car!==p.vehicle){car.active=false;car.mesh.visible=false;}
      if(!car.active||car===p.vehicle||car.health<=0)continue;
      car.mesh.visible=true;car.ram=Math.max(0,(car.ram||0)-dt);
      car.beacons.forEach((b,i)=>{b.visible=p.wanted>0?(Math.floor(s.elapsed*8)%2===i):true;});
      if(sight(car,p,110))seen=true;
      if(p.vehicle&&Math.abs(p.vehicle.speed)>29&&sight(car,p,60)&&recklessCooldown<=0){raiseWanted(1,'Reckless driving near MBPD');recklessCooldown=10;}
      if(!p.wanted){car.speed=0;continue;}
      const d=dist(car,p);
      // Follow the connected road grid, then approach directly with collider checks.
      if(!car.route||dist(car,car.route)<5||car.stuck>2) {
        const gx=Math.round(car.x/64)*64,gz=Math.round(car.z/64)*64,tx=clamp(Math.round(p.x/64),-5,5)*64,tz=clamp(Math.round(p.z/64),-5,5)*64;
        if(d<32&&sight(car,p,40))car.route={x:p.x,z:p.z};
        else if(Math.abs(car.x-gx)>8)car.route={x:gx,z:gz-4.3};
        else if(Math.abs(car.z-gz)>8)car.route={x:gx+4.3,z:gz};
        else if(Math.abs(tx-gx)>1)car.route={x:gx+Math.sign(tx-gx)*64,z:gz-4.3};
        else if(Math.abs(tz-gz)>1)car.route={x:gx+4.3,z:gz+Math.sign(tz-gz)*64};
        else car.route={x:p.x,z:p.z};
        car.stuck=0;
      }
      const dx=car.route.x-car.x,dz=car.route.z-car.z,n=Math.hypot(dx,dz)||1,targetYaw=Math.atan2(dx,dz);
      car.yaw+=delta(targetYaw,car.yaw)*Math.min(1,dt*4);car.speed+=(Math.min(35,18+p.wanted*3,d*2)-car.speed)*Math.min(1,dt*2);
      const amount=Math.min(n,car.speed*dt),nx=car.x+dx/n*amount,nz=car.z+dz/n*amount;
      if(!sim.overlaps(nx,nz,1.05,1.05)){car.x=nx;car.z=nz;}else {car.stuck+=dt;car.speed*=.9;}
      if(p.vehicle&&d<3.8&&car.ram<=0){sim.damage(p.vehicle,12+p.wanted*2);damagePlayer(5+p.wanted);p.vehicle.speed*=.65;car.speed*=-.2;car.ram=1.2;sound('damage');}
      if(!car.deployed&&d<36&&s.officers.filter(c=>c.active).length<8){officer(car);car.deployed=true;}
      sim.syncCar(car,dt);
    }
    let close=false;
    for(const cop of s.officers) {
      if(!cop.active||cop.health<=0)continue;
      cop.attack-=dt;cop.hit=Math.max(0,cop.hit-dt);
      if(!p.wanted){cop.active=false;cop.mesh.visible=false;continue;}
      if(sight(cop,p,85))seen=true;
      if(dist(cop,p)>230){cop.active=false;cop.mesh.visible=false;continue;}
      moveActor(cop,dt,5.8);
      if(dist(cop,p)<2.1&&(!p.vehicle||Math.abs(p.vehicle.speed)<3)){close=true;if(cop.attack<=0){damagePlayer(6);cop.attack=1.2;}}
      else if(p.wanted>=3&&sight(cop,p,30)&&cop.attack<=0){damagePlayer(4);cop.attack=1.8;sound('enemy-shot');}
    }
    s.arrest=close?s.arrest+dt:Math.max(0,s.arrest-dt*2);
    if(s.arrest>=2.2)defeat('busted');
    if(p.wanted>0){s.unseen=seen?0:s.unseen+dt;if(s.elapsed-s.lastCrime>10&&s.unseen>12){p.wanted--;s.unseen=0;sim.toast(p.wanted?'Search cooling down. Keep out of sight.':'You lost MBPD. Back to business.');if(!p.wanted)clearPolice();}}
  }
  function gang(x,z,hostile=false,mission=false) {
    const mesh=createCharacter(random);box(mesh,mat('#6d457d'),0,1.22,.19,.58,.46,.025);box(mesh,mat('#cfddce'),0,1.84,.17,.36,.055,.04);scene.add(mesh);
    const a={x,z,home:{x,z},mesh,role:'gang',health:70,active:true,hostile,mission,attack:1,hit:0,phase:random()*6};s.gangs.push(a);mesh.position.set(x,sim.floorAt(x,z),z);return a;
  }
  for(const [x,z] of [[339,61],[339,68],[331.5,64],[-203.3,-130],[-203.3,-124],[203.3,292],[203.3,304]])gang(x,z);
  sign(scene,'LOS TIBURONES','THE TIDE BELONGS TO US',339,3.8,72,7,1.6,'#553863');
  function pickup(kind,x,z,amount,id) {
    const mesh=new THREE.Group(),color={pistol:'#f5dca5',smg:'#e5a6d4',health:'#9be9a3',armor:'#8dcafa',token:'#ffbe65'}[kind];
    cylinder(mesh,mat(color,{emissive:color,emissiveIntensity:.3}),0,.4,0,.27,.12);
    if(kind==='health'){box(mesh,mat('#dffbe0'),0,.8,0,.18,.65,.15);box(mesh,mat('#dffbe0'),0,.8,0,.52,.18,.15);}
    else if(kind==='pistol'||kind==='smg'){box(mesh,mat('#263b46'),0,.85,0,kind==='smg'?.7:.45,.15,.15);box(mesh,mat('#263b46'),-.13,.68,0,.14,.28,.13);}
    else if(kind==='armor')box(mesh,mat(color),0,.8,0,.47,.54,.22);
    else {const disc=cylinder(mesh,mat('#ffd16e',{emissive:'#ff9b45',emissiveIntensity:.5}),0,.92,0,.3,.09);disc.rotation.z=Math.PI/2;}
    mesh.position.set(x,sim.floorAt(x,z),z);scene.add(mesh);
    const item={id:id??s.pickups.length,kind,x,z,amount,mesh,active:true};(kind==='token'?s.tokens:s.pickups).push(item);return item;
  }
  for(const [kind,x,z,amount] of [['pistol',75.3,13,42],['armor',75.3,10,60],['health',11.3,32,40],['smg',203.3,280,100],['health',339,55,50],['armor',339,82,65],['pistol',-139.3,-75,36],['smg',-267.3,-196,90],['health',203.3,-60,50],['health',-11.3,-250,50]])pickup(kind,x,z,amount);
  for(let i=0;i<20;i++){const gx=(i*3)%10-5,gz=Math.floor(i/2)-5;pickup('token',gx*64+11.3,gz*64+20,50,i);}
  for(const item of s.pickups.filter(i=>i.kind==='pistol'||i.kind==='smg'))sign(scene,item.kind.toUpperCase(),'WALK INTO PICKUP',item.x,2.6,item.z,2.8,.7,'#243d46');
  function hitActor(actor,amount) {
    if(!actor.active||actor.health<=0)return;
    actor.health=Math.max(0,actor.health-amount);actor.hit=.4;actor.hostile=true;
    if(actor.role==='gang')for(const other of s.gangs)if(dist(actor,other)<45)other.hostile=true;
    if(actor.role==='ped'){actor.flee=8;actor.awayX=actor.x-p.x;actor.awayZ=actor.z-p.z;}
    if(actor.health<=0){actor.active=false;actor.mesh.rotation.z=Math.PI/2;actor.mesh.position.y=.3;
      if(actor.role==='gang'){pickup(random()>.5?'pistol':'smg',actor.x,actor.z,24);p.cash+=35;}
      if(actor.role==='ped')actor.downUntil=s.elapsed+25;
    }
  }
  function punch() {
    if(p.vehicle||punchCooldown>0)return false;
    punchCooldown=.55;sound('punch');p.mesh.userData.limbs[0].rotation.x=-1.7;
    const candidates=[...s.peds,...s.gangs,...s.officers].filter(a=>a.active!==false&&a.health>0&&dist(a,p)<2.5);
    candidates.sort((a,b)=>dist(a,p)-dist(b,p));const a=candidates[0];
    if(a){raiseWanted(a.role==='police'?2:1,a.role==='police'?'Assault on an officer':'Street assault');hitActor(a,28);return true;}return false;
  }
  function actorBox(a) {return new THREE.Box3(new THREE.Vector3(a.x-.44,sim.floorAt(a.x,a.z),a.z-.44),new THREE.Vector3(a.x+.44,sim.floorAt(a.x,a.z)+1.95,a.z+.44));}
  function rayHit(origin,direction,maxDistance=110) {
    ray.set(origin,direction);let nearest=maxDistance,target=null,point=origin.clone().addScaledVector(direction,maxDistance);
    function check(bounds,entity){if(ray.intersectBox(bounds,hit)){const d=hit.distanceTo(origin);if(d<nearest){nearest=d;target=entity;point.copy(hit);}}}
    for(const b of city.colliders)check(new THREE.Box3(new THREE.Vector3(b.minX,0,b.minZ),new THREE.Vector3(b.maxX,b.height,b.maxZ)),null);
    for(const a of [...s.peds,...s.gangs,...s.officers])if(a.active!==false&&a.health>0)check(actorBox(a),a);
    for(const c of s.cars)if(c!==p.vehicle&&(!c.police||c.active))check(new THREE.Box3(new THREE.Vector3(c.x-1,0,c.z-2),new THREE.Vector3(c.x+1,1.75,c.z+2)),c);
    return {target,point,distance:nearest};
  }
  function tracer(from,to,color='#ffdf93') {
    const geometry=new THREE.BufferGeometry().setFromPoints([from,to]),material=new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}),mesh=new THREE.Line(geometry,material);scene.add(mesh);s.effects.push({mesh,life:.24});
    const flash=new THREE.Mesh(new THREE.SphereGeometry(.15,5,4),mat('#ffe4a0',{emissive:'#ffbe60',emissiveIntensity:2}));flash.position.copy(from);scene.add(flash);s.effects.push({mesh:flash,life:.20});
  }
  function shoot(aim) {
    if(p.vehicle||s.weapon==='fists'||shotCooldown>0||s.mode!=='play')return false;
    if(s.ammo[s.weapon]<=0){sim.toast('Empty magazine. Find a marked weapon pickup.');shotCooldown=.4;return false;}
    s.ammo[s.weapon]--;shotCooldown=s.weapon==='smg'?.12:.32;raiseWanted(1);sound('gunshot');
    const from=new THREE.Vector3(p.x,p.y+1.35,p.z),forward=new THREE.Vector3(Math.sin(p.yaw),0,Math.cos(p.yaw));
    let direction=forward;
    if(aim?.origin&&aim?.direction){const cameraHit=rayHit(new THREE.Vector3().copy(aim.origin),new THREE.Vector3().copy(aim.direction).normalize());direction=cameraHit.point.clone().sub(from).normalize();}
    const result=rayHit(from,direction);tracer(from,result.point);const target=result.target;
    if(target?.spec){target.health=Math.max(0,target.health-(s.weapon==='smg'?8:15));if(target.police)raiseWanted(2,'Shot an MBPD vehicle');}
    else if(target){if(target.role==='police')raiseWanted(2,'Shot an officer');hitActor(target,s.weapon==='smg'?23:42);}
    p.yaw=Math.atan2(direction.x,direction.z);p.mesh.rotation.y=p.yaw;return true;
  }
  function stepCombat(dt,input) {
    shotCooldown=Math.max(0,shotCooldown-dt);punchCooldown=Math.max(0,punchCooldown-dt);
    if(input.take('Digit1'))s.weapon='fists';if(input.take('Digit2')&&s.ammo.pistol>0)s.weapon='pistol';if(input.take('Digit3')&&s.ammo.smg>0)s.weapon='smg';
    if(input.take('KeyF'))punch();if(input.take('Mouse0')||(s.weapon==='smg'&&input.down('Mouse0')))shoot(input.aimRay);
    for(const a of s.gangs) {
      if(!a.active)continue;a.hit=Math.max(0,a.hit-dt);a.attack-=dt;
      if(a.hostile&&dist(a,p)<100){moveActor(a,dt,dist(a,p)>12?3.8:0);if(a.attack<=0&&sight(a,p,38)){damagePlayer(dist(a,p)<2.4?12:7);a.attack=1.1;tracer(new THREE.Vector3(a.x,1.3,a.z),new THREE.Vector3(p.x,p.y+1.1,p.z),'#e491c5');sound('enemy-shot');}}
      else {a.mesh.rotation.z=a.hit>0?.15:0;animateCharacter(a.mesh,a.phase,false);}
    }
    for(const actor of [...s.peds,...s.gangs,...s.officers]) {
      if(actor.active===false||actor.health<=0)continue;
      const car=p.vehicle;
      if(car&&Math.abs(car.speed)>5&&dist(car,actor)<1.9&&(actor.impactAt??-100)<s.elapsed-.8){actor.impactAt=s.elapsed;raiseWanted(actor.role==='police'?2:1,actor.role==='police'?'Hit an officer':actor.role==='gang'?'Hit a rival crew member':'Hit a pedestrian');hitActor(actor,Math.abs(car.speed)*4);car.speed*=.88;sound('damage');}
    }
    for(const item of [...s.pickups,...s.tokens]) {
      if(!item.active)continue;item.mesh.rotation.y=s.elapsed*1.2;item.mesh.position.y=sim.floorAt(item.x,item.z)+Math.sin(s.elapsed*2+item.id)*.09;
      if(dist(item,p)<1.7&&(!p.vehicle||item.kind==='token')) {
        item.active=false;item.mesh.visible=false;
        if(item.kind==='health')p.health=Math.min(100,p.health+item.amount);
        else if(item.kind==='armor')p.armor=Math.min(100,p.armor+item.amount);
        else if(item.kind==='token'){s.foundTokens.push(item.id);p.cash+=50;sim.toast(`Sunset token ${s.foundTokens.length}/20 · +$50`);}
        else {s.ammo[item.kind]+=item.amount;s.weapon=item.kind;sim.toast(`${item.kind.toUpperCase()} collected · ${item.amount} rounds · click to fire`);}
        sound('pickup');
      }
    }
    s.effects=s.effects.filter(e=>{e.life-=dt;if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();if(e.mesh.isLine)e.mesh.material.dispose();return false;}return true;});
  }
  const waypointMesh=new THREE.Group();
  cylinder(waypointMesh,mat('#ddec9a',{transparent:true,opacity:.23,depthWrite:false,emissive:'#ceda7b',emissiveIntensity:.2}),0,2.5,0,2.0,5);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2,.075,5,24),mat('#edfab1',{emissive:'#e0efa4',emissiveIntensity:.5}));ring.rotation.x=Math.PI/2;ring.position.y=.2;waypointMesh.add(ring);scene.add(waypointMesh);s.waypointMesh=waypointMesh;
  function currentStage(){return s.mission?MISSIONS[s.mission.id].stages[s.mission.stage]:null;}
  function updateWaypoint() {
    const stage=currentStage();
    if(stage)s.waypoint={x:stage.x,z:stage.z,label:stage.label};
    else if(s.taxi){const point=TAXI_STOPS[s.taxi.phase==='pickup'?s.taxi.from:s.taxi.to];s.waypoint={...point,label:s.taxi.phase==='pickup'?'Taxi / collect passenger':'Taxi / drop off passenger'};}
    waypointMesh.position.set(s.waypoint.x,sim.floorAt(s.waypoint.x,s.waypoint.z),s.waypoint.z);
  }
  function prepareMission(id) {
    if(id<0||id>=MISSIONS.length||s.completed.includes(id)||id>0&&!s.completed.includes(id-1))return false;
    if(s.mission)return false;
    s.taxi=null;s.mission={id,stage:0,remaining:MISSIONS[id].time,started:false,repoId:null,fightIds:[]};s.missionResult=null;s.mode='briefing';updateWaypoint();sound('ui');return true;
  }
  function beginMission() {
    if(!s.mission)return;s.mode='play';s.mission.started=true;
    const id=s.mission.id;
    if(id===2){let repo=s.cars.find(c=>c.repo);if(!repo){repo=sim.makeCar(3,135.2,-102,Math.PI,false);repo.repo=true;}repo.health=100;repo.x=135.2;repo.z=-102;repo.speed=0;sim.syncCar(repo);s.mission.repoId=repo.id;}
    if(id===3){for(const a of s.gangs.filter(a=>dist(a,{x:339,z:64})<25)){a.active=true;a.health=70;a.hostile=false;a.mesh.visible=true;a.mesh.rotation.z=0;a.mesh.position.set(a.home.x,sim.floorAt(a.home.x,a.home.z),a.home.z);a.x=a.home.x;a.z=a.home.z;s.mission.fightIds.push(s.gangs.indexOf(a));}if(!s.mission.fightIds.length){for(let i=0;i<3;i++){const a=gang(339,60+i*4,false,true);s.mission.fightIds.push(s.gangs.indexOf(a));}}}
    updateWaypoint();sim.toast(MISSIONS[id].stages[0].label);sound('ui');
  }
  function failMission(reason,show=true) {
    if(!s.mission)return;
    s.missionResult={passed:false,id:s.mission.id,title:MISSIONS[s.mission.id].title,reason};s.mission=null;
    if(show)s.mode='result';s.waypoint={x:11.3,z:26,label:'MAMA ROSA / M for jobs'};sim.toast('Mission failed / '+reason,'damage');
  }
  function passMission() {
    const id=s.mission.id,mission=MISSIONS[id];if(!s.completed.includes(id)){s.completed.push(id);p.cash+=mission.reward;}
    s.missionResult={passed:true,id,title:mission.title,reward:mission.reward,reason:id===5?'Rosa is safe. Marisol Bay is yours.':'Mama Rosa will be in touch.'};s.mission=null;s.mode='result';
    s.waypoint={x:11.3,z:26,label:id===5?'STORY COMPLETE / Explore Marisol':'MAMA ROSA / M for next job'};sound('pickup');
  }
  function retryMission() {
    const id=s.missionResult?.id;if(id===undefined||s.missionResult.passed)return;
    p.wanted=0;clearPolice();s.missionResult=null;prepareMission(id);
  }
  function taxiStart() {
    if(p.vehicle?.spec.id!=='taxi'){sim.toast('Find a yellow City Cab, then press T for a fare.');return false;}
    if(s.mission){sim.toast('Finish your story job before taking a fare.');return false;}
    if(s.taxi){sim.toast('Taxi fare cancelled.');s.taxi=null;s.waypoint={x:11.3,z:26,label:'MAMA ROSA'};return false;}
    const from=TAXI_STOPS.map((a,i)=>({i,d:dist(a,p)})).sort((a,b)=>a.d-b.d)[0].i;
    s.taxi={from,to:(from+1+Math.floor(random()*3))%4,phase:'pickup',remaining:180};updateWaypoint();sim.toast('Taxi dispatch / stop at the passenger marker.');return true;
  }
  function stepMissions(dt,input) {
    if(input.take('KeyT'))taxiStart();
    if(s.mission?.started){
      const m=s.mission,stage=currentStage();m.remaining-=dt;
      if(m.remaining<=0){failMission('Time ran out.');return;}
      if(p.vehicle&&p.vehicle.health<=0){failMission('Your ride was wrecked.');return;}
      let ready=dist(p,stage)<8&&(!stage.vehicle||p.vehicle)&&(!stage.repo||p.vehicle?.id===m.repoId)&&(!p.vehicle||Math.abs(p.vehicle.speed)<5);
      if(stage.fight){const enemies=m.fightIds.map(i=>s.gangs[i]);if(dist(p,stage)<30)for(const a of enemies)a.hostile=true;ready=enemies.every(a=>a.health<=0);}
      if(stage.clean&&p.wanted>0)ready=false;
      if(ready){if(stage.heat)raiseWanted(Math.max(0,stage.heat-p.wanted),'MBPD dragnet');m.stage++;if(m.stage>=MISSIONS[m.id].stages.length){passMission();return;}updateWaypoint();sim.toast(currentStage().label);sound('pickup');}
    }
    if(s.taxi){const fare=s.taxi;fare.remaining-=dt;if(fare.remaining<=0||p.vehicle?.spec.id!=='taxi'){s.taxi=null;sim.toast('Taxi fare lost.');s.waypoint={x:11.3,z:26,label:'MAMA ROSA'};}
      else if(dist(p,TAXI_STOPS[fare.phase==='pickup'?fare.from:fare.to])<8&&Math.abs(p.vehicle.speed)<2){if(fare.phase==='pickup'){fare.phase='dropoff';sim.toast('Passenger aboard. Drive to the destination.');}else {const reward=150+Math.round(dist(TAXI_STOPS[fare.from],TAXI_STOPS[fare.to])*.7);p.cash+=reward;sim.toast(`Fare complete · +$${reward}`);s.taxi=null;s.waypoint={x:11.3,z:26,label:'MAMA ROSA'};sound('pickup');}}}
    updateWaypoint();
  }
  function step(dt,input) {
    if(s.mode!=='play')return;
    stepCombat(dt,input);if(s.mode!=='play')return;stepPolice(dt);if(s.mode!=='play')return;stepMissions(dt,input);
  }
  s.waypoint={x:11.3,z:26,label:'MAMA ROSA / M for jobs'};updateWaypoint();
  return {step,sound,raiseWanted,damagePlayer,defeat,respawn,clearPolice,policeCar,spawnPolice,officer,sight,gang,pickup,hitActor,punch,shoot,rayHit,prepareMission,beginMission,failMission,passMission,retryMission,taxiStart,currentStage,updateWaypoint,station,hospital};
}
