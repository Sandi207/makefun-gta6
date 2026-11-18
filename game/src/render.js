import * as THREE from 'three';
export function createRenderer(canvas,scene) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
  const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,1800);
  scene.fog=new THREE.FogExp2('#c5d5cd',0.0018);
  const hemi=new THREE.HemisphereLight('#c4e9f0','#b59a78',2.0);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffe0ab',2.9);sun.position.set(-100,165,-90);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-100;sun.shadow.camera.right=100;sun.shadow.camera.top=100;sun.shadow.camera.bottom=-100;
  sun.shadow.camera.near=1;sun.shadow.camera.far=450;sun.shadow.bias=-0.0005;sun.shadow.normalBias=0.08;scene.add(sun);scene.add(sun.target);
  const uniforms={top:{value:new THREE.Color('#5cabbf')},horizon:{value:new THREE.Color('#f2daba')},sunDir:{value:new THREE.Vector3(-0.65,0.52,-0.6).normalize()},night:{value:0}};
  const sky=new THREE.Mesh(new THREE.SphereGeometry(900,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
    vertexShader:'varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 direction; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform float night; void main(){ vec3 d=normalize(direction); float t=smoothstep(-0.1,0.8,d.y); vec3 c=mix(horizon,top,t); float s=dot(d,sunDir); c+=vec3(1.0,.76,.4)*pow(max(s,0.0),40.0)*.13*(1.0-night); c=mix(c,vec3(1.0,.9,.65),smoothstep(.9992,.9995,s)*(1.0-night)); gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
  sky.frustumCulled=false;scene.add(sky);
  let cameraReady=false, lowTime=0, highTime=0, ratio=Math.min(devicePixelRatio,1.25);
  const aimRay=new THREE.Raycaster(),cameraBoxes=new WeakMap();
  const wanted=new THREE.Vector3(),target=new THREE.Vector3(),look=new THREE.Vector3();
  // Camera collision uses city AABBs analytically, so orbit never sits inside a tower.
  function cameraCollision(position,aim,city) {
    const direction=position.clone().sub(aim),distance=direction.length();direction.normalize();
    let nearest=distance;
    const ray=new THREE.Ray(aim,direction),hit=new THREE.Vector3();
    for(const b of city.colliders) {
      if(aim.x+distance<b.minX||aim.x-distance>b.maxX||aim.z+distance<b.minZ||aim.z-distance>b.maxZ)continue;
      let box=cameraBoxes.get(b);if(!box){box=new THREE.Box3(new THREE.Vector3(b.minX-0.2,0,b.minZ-0.2),new THREE.Vector3(b.maxX+0.2,b.height+0.5,b.maxZ+0.2));cameraBoxes.set(b,box);}
      if(ray.intersectBox(box,hit)) {const d=hit.distanceTo(aim);if(d>0.6&&d<nearest)nearest=Math.max(0.7,d-0.35);}
    }
    position.copy(aim).addScaledVector(direction,nearest);
  }
  function update(state,input,city,dt=1/60,instant=false) {
    const p=state.player,car=p.vehicle;
    if(!instant) {
      lowTime=dt>1/24?lowTime+dt:Math.max(0,lowTime-dt);
      highTime=dt<1/45?highTime+dt:0;
      if(lowTime>1.5) {
        if(ratio>1) {ratio=1;renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);}
        if(renderer.shadowMap.enabled) {renderer.shadowMap.enabled=false;scene.traverse(o=>{if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.needsUpdate=true;}});}
      }
      if(highTime>20&&ratio<Math.min(devicePixelRatio,1.25)) {ratio=Math.min(devicePixelRatio,1.25);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);highTime=0;}
    }
    if(state.mode==='title') {
      const a=state.shot?0:Math.sin(state.elapsed*0.018)*0.06;
      wanted.set(262+Math.sin(a)*30,126,244);target.set(18,24,-25);
      camera.fov=55;
    } else {
      camera.fov=car?60+Math.min(9,Math.abs(car.speed)*0.13):58;
      let yaw=input.orbit.yaw;
      if(car&&!input.orbit.dragging&&!instant) {
        const delta=Math.atan2(Math.sin(car.yaw-yaw),Math.cos(car.yaw-yaw));
        input.orbit.yaw+=delta*Math.min(1,dt*2.6);yaw=input.orbit.yaw;
      }
      const distance=car?10.4+Math.min(3,Math.abs(car.speed)*0.05):6.5;
      const height=car?4.5:1.7+Math.sin(input.orbit.pitch)*distance;
      const shoulder=car?0.75:0.55;
      wanted.set(p.x-Math.sin(yaw)*distance-Math.cos(yaw)*shoulder,(car?0:p.y)+height,p.z-Math.cos(yaw)*distance+Math.sin(yaw)*shoulder);
      target.set(p.x,(car?1.1:p.y+1.22),p.z);
      cameraCollision(wanted,target,city);
    }
    if(!cameraReady||instant) {camera.position.copy(wanted);look.copy(target);cameraReady=true;}
    else {camera.position.lerp(wanted,1-Math.exp(-dt*7));look.lerp(target,1-Math.exp(-dt*10));}
    camera.lookAt(look);camera.updateProjectionMatrix();sky.position.copy(camera.position);
    for(const c of state.cars)c.mesh.visible=(!c.police||c.active||c===p.vehicle)&&c.mesh.position.distanceTo(camera.position)<(state.mode==='title'?550:155);
    for(const [kind,mesh] of Object.entries(state.weaponMeshes))mesh.visible=!car&&state.weapon===kind;
    if(!car&&state.weapon!=='fists')p.mesh.userData.limbs[0].rotation.x=-1.25;
    for(const a of [...state.peds,...state.gangs,...state.officers])a.mesh.visible=(a.role!=='police'||a.active)&&a.mesh.position.distanceTo(camera.position)<110;
    sun.position.set(p.x-100,165,p.z-90);sun.target.position.set(p.x,0,p.z);
    // A long cycle preserves the afternoon feel while the city gradually turns to evening.
    const hour=state.clock/60,daylight=Math.max(0,Math.sin((hour-6)/24*Math.PI*2));
    const night=1-Math.min(1,daylight*3.0);uniforms.night.value=night;
    uniforms.top.value.set('#5cabbf').lerp(new THREE.Color('#17253e'),night);
    uniforms.horizon.value.set('#f2daba').lerp(new THREE.Color('#695871'),night);
    sun.intensity=2.9*(1-night)+0.15;hemi.intensity=2*(1-night)+0.6;
    scene.fog.color.set('#c5d5cd').lerp(new THREE.Color('#38445b'),night);
  }
  function aim(input) {aimRay.setFromCamera(input.pointer,camera);input.aimRay={origin:aimRay.ray.origin.clone(),direction:aimRay.ray.direction.clone()};}
  function draw() {renderer.render(scene,camera);}
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  return {renderer,camera,update,draw,aim,get stats(){return {...renderer.info.render,pixelRatio:ratio,shadows:renderer.shadowMap.enabled};}};
}
