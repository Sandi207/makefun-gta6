export function createInput(canvas) {
  const held = new Set(), pressed = new Set();
  const pointer={x:0,y:0};
  const orbit = { yaw: Math.PI, pitch: 0.24, dragged: false, dragging: false };
  const handled = /^(Key[WASDEPHFMT]|ShiftLeft|ShiftRight|Digit[0123]|Space|Escape|Enter|Arrow(Up|Down|Left|Right))$/;
  window.addEventListener('keydown', e => {
    if (!handled.test(e.code)) return;
    e.preventDefault(); if (!e.repeat) pressed.add(e.code); held.add(e.code);
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); pressed.clear(); orbit.dragging = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => { const rect=canvas.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=1-(e.clientY-rect.top)/rect.height*2;if(e.button===0){held.add('Mouse0');pressed.add('Mouse0');}else{orbit.dragging=true;canvas.setPointerCapture(e.pointerId);} });
  window.addEventListener('pointerup', () => { held.delete('Mouse0');orbit.dragging = false; });
  canvas.addEventListener('pointermove', e => {
    const rect=canvas.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=1-(e.clientY-rect.top)/rect.height*2;
    if (!orbit.dragging) return;
    orbit.yaw -= e.movementX * 0.005;
    orbit.pitch = Math.max(0.08, Math.min(0.95, orbit.pitch + e.movementY * 0.003)); orbit.dragged = true;
  });
  return {
    held, orbit, pointer, aimRay:null, down: (...codes) => codes.some(code => held.has(code)),
    take(code) { const yes = pressed.has(code); pressed.delete(code); return yes; },
    clear() { held.clear(); pressed.clear(); },
  };
}
