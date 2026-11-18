import * as THREE from 'three';
import { CITY, districtAt } from './config.js';
import { Scenery, mat, canvasTexture, sign, box } from './models.js';

export function createCity(scene, random) {
  const scenery = new Scenery(scene), colliders = [], blocks = [], signals = [];
  const asphalt = mat('#414c52'), sidewalk = mat('#d2c4a6'), curb = mat('#e0d6bd');
  const trunk = mat('#88785b'), leaves = [mat('#46846a'), mat('#578d69'), mat('#67976d')];
  const dark = mat('#36454a'), white = mat('#e4dfc6'), grass = mat('#8f9d71');
  const addCollider = (x,z,w,d,h=10) => colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:h});
  const facadeMaterials = [];
  for (const color of ['#e9d5b4','#aac3c0','#b7c4cf','#e3b39a','#9bafa9','#e0d9bd']) {
    for(let tall=0;tall<2;tall++) {
      const texture=canvasTexture(128,tall?512:128,(ctx,w,h)=>{
        ctx.fillStyle=color; ctx.fillRect(0,0,w,h);
        for(let y=8;y<h;y+=24) for(let x=8;x<w;x+=24) {
          ctx.fillStyle=random()<0.14?'#dfbb72':['#3b5964','#4e7179','#69838a'][Math.floor(random()*3)]; ctx.fillRect(x,y,13,15);
          ctx.fillStyle='rgba(238,236,210,.22)'; ctx.fillRect(x,y,13,3);
          ctx.fillStyle='rgba(34,52,60,.15)'; ctx.fillRect(x+13,y+1,2,16);
        }
        ctx.fillStyle='rgba(255,248,218,.3)'; for(let y=29;y<h;y+=24) ctx.fillRect(0,y,w,2);
      });
      facadeMaterials.push(new THREE.MeshStandardMaterial({map:texture,roughness:0.78}));
    }
  }
  scenery.box(mat('#879674'),0,-0.32,0,900,0.5,900);
  // Eleven roads per axis enclose a ten by ten block grid.
  const laneTexture=canvasTexture(256,512,ctx=>{
    ctx.fillStyle='#414c52'; ctx.fillRect(0,0,256,512);
    for(let i=0;i<7000;i++) { const c=Math.floor(60+random()*30); ctx.fillStyle=`rgba(${c},${c+6},${c+8},.16)`; ctx.fillRect(random()*256,random()*512,1,2); }
    ctx.fillStyle='#d8b769'; ctx.fillRect(125,0,2,512); ctx.fillRect(130,0,2,512);
    ctx.fillStyle='#e5dfc8'; for(let y=0;y<512;y+=128) { ctx.fillRect(65,y,2,57); ctx.fillRect(191,y,2,57); }
    ctx.fillStyle='#b8b7a5'; ctx.fillRect(6,0,2,512); ctx.fillRect(248,0,2,512);
  });
  laneTexture.wrapS=laneTexture.wrapT=THREE.RepeatWrapping; laneTexture.repeat.set(1,20);
  const roadMaterial=new THREE.MeshStandardMaterial({map:laneTexture,roughness:1});
  for(let i=-5;i<=5;i++) {
    const p=i*64;
    for(let axis=0;axis<2;axis++) {
      const road=new THREE.Mesh(new THREE.PlaneGeometry(18,684),roadMaterial);
      road.rotation.x=-Math.PI/2; road.rotation.z=axis?Math.PI/2:0;
      road.position.set(axis?0:p,0.01+axis*0.001,axis?p:0); road.receiveShadow=true; scene.add(road);
      for(let side of [-1,1]) for(let segment=0;segment<10;segment++) {
        const along=-288+segment*64;
        scenery.box(sidewalk,axis?along:p+side*11.3,0.08,axis?p+side*11.3:along,axis?46:4.4,0.16,axis?4.4:46);
        scenery.box(curb,axis?along:p+side*9.12,0.14,axis?p+side*9.12:along,axis?46:0.24,0.28,axis?0.24:46);
      }
    }
  }
  // Clear junctions, crosswalks and timed signals.
  const reds=mat('#ee6350',{emissive:'#c93620',emissiveIntensity:0.45});
  const greens=mat('#86b99a',{emissive:'#3ae2a0',emissiveIntensity:0.8});
  for(let gx=-5;gx<=5;gx++) for(let gz=-5;gz<=5;gz++) {
    const x=gx*64,z=gz*64; scenery.box(asphalt,x,0.038,z,18,0.02,18);
    for(let side of [-1,1]) for(let stripe=-3;stripe<=3;stripe++) {
      scenery.box(white,x+stripe*2.15,0.055,z+side*12,1.1,0.01,3.0);
      scenery.box(white,x+side*12,0.055,z+stripe*2.15,3.0,0.01,1.1);
    }
    if(Math.abs(gx)<5&&Math.abs(gz)<5) {
      scenery.cylinder(dark,x+10.4,2.8,z+10.4,0.12,5.6);
      scenery.box(dark,x+6.2,5.5,z+10.4,8.3,0.16,0.16);
      scenery.box(dark,x+3.7,5.0,z+10.4,0.55,1.05,0.48);
      const signal=box(scene,greens,x+3.7,4.74,z+10.66,0.25,0.24,0.035);
      signals.push({mesh:signal,axis:0,x,z});
      scenery.box(reds,x+3.7,5.24,z+10.66,0.25,0.24,0.035);
      scenery.cylinder(dark,x-10.4,2.8,z-10.4,0.12,5.6);
      scenery.box(dark,x-10.4,5.5,z-6.2,0.16,0.16,8.3);
      const signal2=box(scene,reds,x-10.66,4.74,z-3.7,0.035,0.24,0.25);
      signals.push({mesh:signal2,axis:1,x,z});
    }
  }
  function palm(x,z,h=9) {
    addCollider(x,z,0.55,0.55,h);
    scenery.cylinder(trunk,x,h/2,z,0.18,h,0,0,-0.065);
    scenery.add('sphere',leaves[0],x-0.24,h,z,0.65,0.5,0.65);
    for(let i=0;i<7;i++) {
      const a=i*Math.PI*2/7;
      scenery.add('box',leaves[i%3],x+Math.sin(a)*1.5,h+0.2,z+Math.cos(a)*1.5,0.78,0.16,4.1,0.24,a,0);
      scenery.add('box',leaves[(i+1)%3],x+Math.sin(a)*3.0,h-0.28,z+Math.cos(a)*3.0,0.48,0.13,1.6,0.64,a,0);
    }
  }
  function tree(x,z,h=6) {
    addCollider(x,z,0.65,0.65,h*0.7);
    scenery.cylinder(trunk,x,h*0.32,z,0.26,h*0.65);
    scenery.add('sphere',leaves[1],x,h*0.78,z,2.6,2.7,2.6);
    scenery.add('sphere',leaves[2],x+1,h*0.85,z-0.4,1.9,2.1,1.8);
  }
  function lamp(x,z,angle=0) {
    addCollider(x,z,0.3,0.3,7);
    scenery.cylinder(dark,x,3.5,z,0.105,7);
    scenery.box(dark,x+Math.sin(angle)*0.8,6.9,z+Math.cos(angle)*0.8,0.12,0.14,1.8,angle);
    scenery.box(mat('#fae5aa',{emissive:'#ffe4a0',emissiveIntensity:0.7}),x+Math.sin(angle)*1.6,6.86,z+Math.cos(angle)*1.6,0.64,0.12,0.72,angle);
    scenery.box(dark,x,0.22,z,0.4,0.4,0.4);
  }
  function bench(x,z,angle=0) {
    scenery.box(mat('#a88863'),x,0.57,z,2.3,0.15,0.62,angle);
    scenery.box(mat('#a88863'),x-Math.sin(angle)*0.23,0.94,z-Math.cos(angle)*0.23,2.3,0.65,0.12,angle);
    for(let s of [-1,1]) scenery.box(dark,x+Math.cos(angle)*s*0.8,0.27,z-Math.sin(angle)*s*0.8,0.15,0.54,0.45,angle);
    addCollider(x,z,2.2,0.65,1.3);
  }
  function hydrant(x,z) {
    const red=mat('#b95445'); scenery.cylinder(red,x,0.43,z,0.17,0.8);
    scenery.add('sphere',red,x,0.88,z,0.22,0.18,0.22); scenery.box(red,x,0.65,z,0.62,0.16,0.15); addCollider(x,z,0.6,0.5,1);
  }
  function building(x,z,w,d,h,style) {
    const material=facadeMaterials[(style%6)*2+(h>30?1:0)];
    scenery.box(material,x,h/2+0.18,z,w,h,d);
    scenery.box(mat(['#f1dec1','#b6c8c8','#e0d0b6'][style%3]),x,h+0.28,z,w+0.7,0.5,d+0.7);
    scenery.box(dark,x,1.65,z+d/2+0.04,w*0.72,2.6,0.1);
    for(let p=-1;p<=1;p++) scenery.box(mat('#9baaa9'),x+p*w*0.22,1.66,z+d/2+0.105,0.12,2.8,0.09);
    scenery.box(mat('#a2937c'),x,0.25,z,w+0.5,0.45,d+0.5);
    if(h>35) {
      scenery.box(mat('#879999'),x+3,h+1.4,z-2,4,2.2,3);
      scenery.cylinder(dark,x-w*0.32,h+3,z-d*0.28,0.08,6);
    }
    addCollider(x,z,w+0.6,d+0.6,h);
    blocks.push({x,z,w,d,h,district:districtAt(x,z)});
  }
  const shopNames=[['LUNA CAFÉ','COFFEE / EVERY DAY'],['SOL MARKET','GOOD THINGS HERE'],['PALMA CLUB','LATE NIGHTS. EARLY SUN.'],['COSTA AUTO','REPAIRS & CUSTOMS'],['BAHÍA BANK','YOUR NEXT CHAPTER'],['RIO RECORDS','SOUND OF THE COAST']];
  for(let ix=0;ix<10;ix++) for(let iz=0;iz<10;iz++) {
    const x=-288+ix*64,z=-288+iz*64, district=districtAt(x,z);
    scenery.box(grass,x,0.03,z,36,0.05,36);
    if(district==='PORT MARISOL') {
      if(ix%3===0) building(x,z,31,31,11,4);
      else for(let c=0;c<6;c++) {
        const cx=x-12+(c%3)*11,cz=z-9+Math.floor(c/3)*15;
        const container=mat(['#ae594c','#497a80','#d5a35b','#74896b'][c%4]);
        const height=2.9+(c%2)*2.9;
        scenery.box(container,cx,height/2,cz,9,height,5.5); addCollider(cx,cz,9,5.5,height);
        for(let bar=-4;bar<=4;bar++) scenery.box(mat('#46555a'),cx+bar,1.5,cz+2.77,0.09,2.7,0.035);
      }
    } else if(district==='LAS PALMAS') {
      for(let side of [-1,1]) {
        building(x+side*10,z,14,18,5.2+random()*2,Math.floor(random()*6));
        scenery.box(mat('#ba7961'),x+side*10,6.2,z,15.5,0.45,19.8);
        scenery.box(mat('#f0d9b2'),x+side*10,0.15,z+14,11,0.12,7);
        tree(x+side*13,z-15,4.6);
      }
    } else if(district==='PLAYA DEL SOL') {
      building(x,z,28,29,11+random()*16,ix+iz);
      palm(x-18,z-16,9); palm(x+18,z+16,8);
      if(iz%2===0) sign(scene,'HOTEL BRISA','STAY A LITTLE LONGER',x,8,z+14.6,16,3.8,'#376e73');
    } else {
      const isPlaza=ix===5&&iz===5;
      if(isPlaza) {
        scenery.box(sidewalk,x,0.15,z,36,0.25,36);
        scenery.cylinder(mat('#bdb5a0'),x,0.5,z,6.5,0.8);
        scenery.cylinder(mat('#73b5ba',{metalness:0.3,roughness:0.2}),x,0.95,z,5.7,0.18);
        scenery.cylinder(mat('#d3cab3'),x,1.65,z,0.9,2.4); addCollider(x,z,12,12,2.9);
        for(let s of [-1,1]) { palm(x+s*14,z-14,9); palm(x+s*14,z+14,8); bench(x+s*10,z,Math.PI/2); }
        sign(scene,'MARISOL BAY','THE CITY IS YOURS',x,3.6,z+18,14,2.6,'#326b6c');
      } else {
        let h=20+random()*46;
        if(ix===4&&iz===4) h=94;
        if(ix===5&&iz===3) h=82;
        building(x-3,z-3,26+random()*6,25+random()*7,h,ix+iz);
        if(h>52) scenery.box(mat('#cfcec0'),x-3,h*0.64,z-3,28,0.55,28);
        const [name,sub]=shopNames[(ix+iz)%shopNames.length];
        sign(scene,name,sub,x-3,4.0,z+12.8,18,2.1,['#2e666b','#ad6654','#2f424f'][ix%3]);
      }
    }
    // Sidewalks form continuous navigation corridors, with props clear of their middle.
    for(let side of [-1,1]) {
      lamp(x+side*21,z-16,side>0?-Math.PI/2:Math.PI/2);
      if(district!=='PORT MARISOL') palm(x+side*21,z+12,8+random()*2);
      if((ix+iz)%4===0) hydrant(x+side*21,z+2);
    }
    if((ix+iz)%5===0) bench(x,z+21,0);
  }
  // Coastal strip: promenade, wide beach and a layered animated sea.
  scenery.box(sidewalk,360,0.05,0,48,0.15,684);
  scenery.box(mat('#d8bd89'),420,-0.06,0,72,0.13,880);
  scenery.box(mat('#ad9871'),389,0.10,0,15,0.22,700);
  for(let z=-350;z<350;z+=5) scenery.box(mat('#c3a982'),389,0.24,z,15,0.03,0.12);
  for(let z=-330;z<=330;z+=28) { palm(372,z,10); lamp(352,z,-Math.PI/2); bench(380,z,Math.PI/2); }
  const ocean=new THREE.Mesh(new THREE.PlaneGeometry(1700,2200,1,1),mat('#4b9fae',{metalness:0.15,roughness:0.32}));
  ocean.rotation.x=-Math.PI/2; ocean.position.set(1300,-0.16,0); scene.add(ocean);
  const harborWater=new THREE.Mesh(new THREE.PlaneGeometry(650,160),ocean.material);
  harborWater.rotation.x=-Math.PI/2;harborWater.position.set(0,-0.02,452);scene.add(harborWater);
  const waves=[];
  for(let i=0;i<12;i++) {
    const wave=new THREE.Mesh(new THREE.PlaneGeometry(1.2+i*0.38,850),mat(i<3?'#c1d4c2':'#78b6bc',{transparent:true,opacity:i<3?0.64:0.27,depthWrite:false}));
    wave.rotation.x=-Math.PI/2; wave.position.set(458+i*11,-0.12+i*0.002,0); scene.add(wave); waves.push(wave);
  }
  // Umbrellas, loungers, a lifeguard hut and a long timber pier.
  for(let i=0;i<16;i++) {
    const x=414+(i%3)*12,z=-270+i*35;
    scenery.cylinder(white,x,1.25,z,0.045,2.5);
    scenery.add('sphere',mat(['#d98066','#e8cf85','#68a4ad'][i%3]),x,2.45,z,2.0,0.3,2.0);
    scenery.box(white,x+2.8,0.35,z,0.9,0.18,2.5);
  }
  scenery.box(mat('#b58a61'),493,0.55,-128,210,0.4,11);
  for(let x=395;x<600;x+=12) { scenery.cylinder(trunk,x,0.1,-132,0.23,5); scenery.cylinder(trunk,x,0.1,-124,0.23,5); }
  sign(scene,'PLAYA DEL SOL','SLOW DOWN. STAY GOLDEN.',366,4.8,-150,14,3.6,'#ba795d', '#fff0ce', Math.PI/2);
  building(404,170,8,8,4,3);
  // Harbor cranes, warehouses, docks and an original cargo ship.
  for(let x=-240;x<=300;x+=180) {
    scenery.box(mat('#495f65'),x,0.3,352,70,0.6,40);
    const yellow=mat('#dba44f');
    for(let s of [-1,1]) {
      scenery.box(yellow,x+s*10,13,346,1.6,26,1.7);
      scenery.box(yellow,x+s*10,25.5,352,1.6,1.3,28);
    }
    scenery.box(yellow,x,26,355,23,1.6,2);
    scenery.box(yellow,x,26,372,2,1.3,47);
    scenery.cylinder(dark,x,18,386,0.10,15);
    scenery.box(dark,x,10.5,386,4,0.8,1.7);
    addCollider(x-10,346,2,2,26); addCollider(x+10,346,2,2,26);
  }
  scenery.box(mat('#375365'),65,1.5,404,95,7,24);
  scenery.box(mat('#e4ddc3'),28,7.5,404,18,8,19);
  for(let x=49;x<100;x+=13) scenery.box(mat('#a9604d'),x,7.5,404,12,5,13);
  scenery.box(mat('#bbccbe'),27,12.5,404,18,1.4,21);
  // Visible landmarks and fictional advertisements.
  sign(scene,'SOLERO GT','TAKE THE LONG WAY HOME.',40,25,-47,26,8,'#cc735b');
  sign(scene,'ISLA FIZZ','A LITTLE TASTE OF SUMMER',-102,22,82,23,7,'#679995');
  sign(scene,'MARISOL','ARRIVE UNKNOWN. LEAVE A LEGEND.',-37,45,-173,25,6,'#314d5b');
  scenery.finish();
  return { colliders, blocks, signals, waves, ocean, bounds: {minX:-342,maxX:437,minZ:-342,maxZ:369}, greens, reds };
}
