import * as THREE from 'three';
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
const sphereGeo = new THREE.SphereGeometry(1, 8, 6);
const materialCache = new Map();
export function mat(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materialCache.has(key)) materialCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options }));
  return materialCache.get(key);
}
export function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function cylinder(parent, material, x, y, z, r, h) {
  const mesh = new THREE.Mesh(cylinderGeo, material);
  mesh.position.set(x, y, z); mesh.scale.set(r, h, r);
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
export function sphere(parent, material, x, y, z, sx, sy, sz) {
  const mesh = new THREE.Mesh(sphereGeo, material);
  mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
}
export function canvasTexture(w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}
export function sign(parent, text, sub, x, y, z, w = 8, h = 3, bg = '#203e49', fg = '#f1e7c7', angle = 0) {
  const texture = canvasTexture(512, 192, ctx => {
    ctx.fillStyle = bg; ctx.fillRect(0,0,512,192); ctx.fillStyle = fg; ctx.fillRect(16,16,5,160);
    ctx.font = 'bold 49px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text,268,88);
    ctx.font = '19px monospace'; ctx.fillText(sub,268,139);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({map:texture,roughness:0.85,side:THREE.DoubleSide}));
  board.position.set(x,y,z); board.rotation.y = angle; parent.add(board); return board;
}
export function createCharacter(random, hero = false) {
  const group = new THREE.Group();
  const skin = mat(hero ? '#bc8062' : ['#cf9b7c','#8e5e44','#e5b994','#ad7555'][Math.floor(random()*4)]);
  const shirt = mat(hero ? '#e37962' : ['#f1ce65','#469b9e','#dd7969','#65758d','#e5dbc6','#ab6aa1'][Math.floor(random()*6)]);
  const pants = mat(hero ? '#283743' : ['#36424e','#928d79','#4d6774'][Math.floor(random()*3)]);
  box(group,pants,0,0.78,0,0.48,0.24,0.3); box(group,shirt,0,1.13,0,0.56,0.58,0.34);
  if(hero) { box(group,mat('#f4d9bf'),0,1.28,0.181,0.16,0.24,0.012); box(group,mat('#b85948'),-0.2,1.2,0.182,0.045,0.46,0.015); }
  cylinder(group,skin,0,1.48,0,0.12,0.16); box(group,skin,0,1.66,0,0.34,0.36,0.32);
  box(group,mat('#292528'),0,1.835,-0.015,0.355,0.11,0.34); box(group,mat('#1d2429'),0,1.70,0.167,0.28,0.065,0.023);
  const limbs = [];
  for (let side of [-1,1]) {
    const arm = new THREE.Group(); arm.position.set(side*0.37,1.37,0); group.add(arm);
    box(arm,shirt,0,-0.15,0,0.17,0.29,0.21); box(arm,skin,0,-0.38,0,0.145,0.26,0.17); limbs.push(arm);
    const leg = new THREE.Group(); leg.position.set(side*0.145,0.75,0); group.add(leg);
    box(leg,pants,0,-0.32,0,0.20,0.65,0.23); box(leg,mat(hero?'#f0e8d7':'#30323b'),0,-0.68,0.045,0.23,0.15,0.35); limbs.push(leg);
  }
  group.userData.limbs = limbs; compact(group); return group;
}
export function animateCharacter(mesh, phase, moving, sprint = false) {
  const limbs = mesh.userData.limbs, swing = Math.sin(phase) * (moving ? sprint ? 0.85 : 0.48 : 0);
  limbs[0].rotation.x = swing; limbs[1].rotation.x = -swing; limbs[2].rotation.x = -swing; limbs[3].rotation.x = swing;
}
export function createCar(spec, paint = spec.color) {
  const group = new THREE.Group();
  const body = mat(paint,{metalness:0.3,roughness:0.35}), trim = mat('#263139',{metalness:0.25,roughness:0.45});
  const glass = mat('#365563',{metalness:0.5,roughness:0.15}), chrome = mat('#b6c5c9',{metalness:0.7,roughness:0.25});
  const w = spec.width, l = spec.length;
  box(group,trim,0,0.41,0,w*0.96,0.28,l*0.96); box(group,body,0,0.75,0,w,0.56,l);
  box(group,body,0,1.02,l*0.30,w*0.94,0.10,l*0.30); box(group,trim,0,0.53,l*0.505,w*0.84,0.15,0.08);
  box(group,chrome,0,0.53,-l*0.505,w*0.84,0.12,0.07);
  const sports = spec.id === 'sports', van = spec.id === 'van';
  if(van) {
    box(group,body,0,1.5,-0.25,w*0.95,1.28,l*0.69); box(group,glass,0,1.55,l*0.302,w*0.84,0.66,0.04);
    for(let side of [-1,1]) { box(group,glass,side*w*0.48,1.58,l*0.14,0.03,0.55,0.77); box(group,mat('#e4e7db'),side*w*0.48,1.5,-0.8,0.03,0.5,1.35); }
  } else if(spec.id === 'convertible') {
    box(group,trim,0,1.06,-0.3,w*0.74,0.18,1.6);
    for(let side of [-1,1]) box(group,mat('#d4b788'),side*0.43,1.23,-0.5,0.59,0.55,0.42);
    box(group,glass,0,1.33,0.65,w*0.84,0.55,0.065).rotation.x=-0.32;
    for(let side of [-1,1]) box(group,chrome,side*w*0.43,1.33,0.65,0.055,0.61,0.08).rotation.x=-0.32;
  } else {
    box(group,glass,0,1.25,-0.23,w*0.83,sports?0.45:0.60,l*0.46); box(group,body,0,sports?1.50:1.59,-0.28,w*0.88,0.13,l*0.34);
    for(let side of [-1,1]) { box(group,body,side*w*0.428,1.29,-0.22,0.055,0.54,0.09); box(group,body,side*w*0.428,1.29,-1.08,0.05,0.54,0.1); }
    if(sports) { box(group,trim,0,1.23,-l*0.44,w*1.04,0.12,0.30); for(let side of [-1,1]) box(group,trim,side*0.62,1.06,-l*0.44,0.08,0.30,0.08); }
  }
  const lights = [];
  for(let side of [-1,1]) {
    lights.push(box(group,mat('#ffe8b5',{emissive:'#fff0ba',emissiveIntensity:0.45}),side*w*0.34,0.83,l*0.506,w*0.21,0.17,0.035));
    box(group,mat('#da5147',{emissive:'#e33426',emissiveIntensity:0.3}),side*w*0.34,0.85,-l*0.506,w*0.22,0.16,0.035);
    box(group,body,side*w*0.56,1.18,0.53,0.25,0.14,0.24); box(group,chrome,side*w*0.503,0.97,-0.32,0.02,0.065,0.25);
  }
  const wheels = [], fronts = [];
  for(let side of [-1,1]) for(let end of [-1,1]) {
    const pivot = new THREE.Group(); pivot.position.set(side*w*0.51,0.44,end*l*0.30); group.add(pivot);
    const wheel = new THREE.Group(); pivot.add(wheel);
    cylinder(wheel,mat('#20292d'),0,0,0,0.39,0.27).rotation.z=Math.PI/2; cylinder(wheel,chrome,side*0.15,0,0,0.24,0.015).rotation.z=Math.PI/2;
    for(let spoke=0;spoke<5;spoke++) box(wheel,trim,side*0.165,0,0,0.018,0.042,0.4).rotation.x=spoke*Math.PI/5;
    compact(wheel); wheels.push(wheel); if(end===1) fronts.push(pivot);
  }
  if(spec.id==='taxi') {
    box(group,trim,0,1.75,-0.3,0.73,0.10,0.36); box(group,mat('#f4df85',{emissive:'#efd986',emissiveIntensity:0.25}),0,1.89,-0.3,0.69,0.21,0.32);
    sign(group,'TAXI','MARISOL',0,1.89,-0.132,0.62,0.18,'#f4df85','#23333b');
  }
  box(group,mat('#eee8d4'),0,0.56,-l*0.513,0.55,0.14,0.01);
  const smoke = new THREE.Group(); group.add(smoke); smoke.visible=false;
  for(let i=0;i<7;i++) sphere(smoke,mat('#64747a',{transparent:true,opacity:0.25,depthWrite:false}),Math.sin(i*2)*0.32,1.4+i*0.42,l*0.26,0.28+i*0.1,0.32+i*0.1,0.28+i*0.1);
  group.userData = {wheels,fronts,smoke,lights}; compact(group); return group;
}
// Static scenery is instanced by geometry/material to keep the complete city inexpensive.
export class Scenery {
  constructor(scene) { this.scene=scene; this.batches=new Map(); this.temp=new THREE.Object3D(); }
  add(shape,material,x,y,z,w,h,d,rx=0,ry=0,rz=0) {
    const key=shape+material.uuid;
    if(!this.batches.has(key)) this.batches.set(key,{geometry:shape==='cylinder'?cylinderGeo:shape==='sphere'?sphereGeo:boxGeo,material,items:[]});
    this.temp.position.set(x,y,z); this.temp.scale.set(w,h,d); this.temp.rotation.set(rx,ry,rz); this.temp.updateMatrix();
    this.batches.get(key).items.push(this.temp.matrix.clone());
  }
  box(m,x,y,z,w,h,d,ry=0) { this.add('box',m,x,y,z,w,h,d,0,ry,0); }
  cylinder(m,x,y,z,r,h,rx=0,ry=0,rz=0) { this.add('cylinder',m,x,y,z,r,h,r,rx,ry,rz); }
  finish() {
    for(const batch of this.batches.values()) {
      const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.items.length);
      batch.items.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix)); mesh.castShadow=true; mesh.receiveShadow=true; mesh.computeBoundingSphere(); this.scene.add(mesh);
    }
  }
}

// Merge direct static mesh parts by material; articulated groups remain independent.
function compact(group) {
  const batches=new Map();
  for(const child of [...group.children]) {
    if(!child.isMesh||Array.isArray(child.material)) continue;
    child.updateMatrix();
    const geometry=(child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone()).applyMatrix4(child.matrix);
    const key=child.material.uuid;
    if(!batches.has(key)) batches.set(key,{material:child.material,parts:[]});
    batches.get(key).parts.push(geometry); group.remove(child);
  }
  for(const batch of batches.values()) {
    const geometry=new THREE.BufferGeometry();
    for(const name of ['position','normal','uv']) {
      if(!batch.parts.every(g=>g.getAttribute(name))) continue;
      const arrays=batch.parts.map(g=>g.getAttribute(name).array),size=arrays.reduce((sum,a)=>sum+a.length,0),joined=new Float32Array(size);
      let offset=0;for(const a of arrays){joined.set(a,offset);offset+=a.length;}
      geometry.setAttribute(name,new THREE.BufferAttribute(joined,batch.parts[0].getAttribute(name).itemSize));
    }
    geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,batch.material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    batch.parts.forEach(g=>g.dispose());
  }
}
