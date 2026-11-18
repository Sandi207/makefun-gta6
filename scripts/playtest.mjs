// Run after `node serve.ts`. Requires playwright-core only for development automation.
// PLAYWRIGHT_MODULE and CHROME_PATH can point to an existing local installation.
// Does not add dependencies to the static game and never contacts an external origin.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const modulePath=process.env.PLAYWRIGHT_MODULE||'/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright-core/index.mjs';
const {chromium}=await import(pathToFileURL(modulePath).href);
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH||'/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
const page=await context.newPage(),errors=[],messages=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{messages.push({type:m.type(),text:m.text()});if(m.type()==='error')errors.push(m.text());});
page.on('response',response=>{if(response.status()>=400)errors.push(`HTTP ${response.status()} ${response.url()}`);});
page.on('request',request=>assert.ok(new URL(request.url()).protocol==='data:'||new URL(request.url()).hostname==='localhost','game must stay offline'));
try {
  await page.goto('http://localhost:8080/?seed=6');await page.waitForFunction(()=>window.__shotReady,{timeout:60000});
  assert.equal(await page.locator('#title').isVisible(),true);assert.equal(await page.locator('#loading').isVisible(),false);
  const before=await page.evaluate(()=>window.__game.snapshot());
  await page.click('#start-button');await page.keyboard.down('KeyW');
  await page.waitForFunction(before=>window.__game.snapshot().player.z<before.player.z-1,before,{timeout:15000});
  await page.waitForFunction(before=>window.__game.snapshot().trafficDistance>before.trafficDistance+20,before,{timeout:15000});
  await page.keyboard.up('KeyW');
  const moved=await page.evaluate(()=>window.__game.snapshot());
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__game.state.mode==='pause',null,{timeout:10000});assert.equal(await page.locator('#pause').isVisible(),true);
  const paused=await page.evaluate(()=>window.__game.snapshot());await page.waitForTimeout(350);assert.equal((await page.evaluate(()=>window.__game.snapshot())).elapsed,paused.elapsed);
  await page.keyboard.press('KeyP');await page.waitForFunction(()=>window.__game.state.mode==='play',null,{timeout:10000});assert.equal(await page.locator('#pause').isVisible(),false);
  await page.evaluate(()=>{const {state,simulation}=window.__game;state.player.x=75;state.player.z=26;state.player.y=.17;state.player.vehicle=null;simulation.starter.speed=0;});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.__game.state.player.vehicle!==null);
  assert.ok((await page.evaluate(()=>window.__game.snapshot())).player.wanted>=1,'stealing the starter car raises wanted');
  await page.keyboard.down('KeyW');await page.waitForFunction(()=>window.__game.snapshot().speed>5,null,{timeout:15000});await page.keyboard.up('KeyW');
  const drove=await page.evaluate(()=>window.__game.snapshot());assert.equal(drove.player.vehicle,'sports');assert.equal(await page.locator('#drive-hud').isVisible(),true);
  // Write actual Chrome renders only after confirming a working live loop.
  const directory=resolve(new URL('../screenshots/',import.meta.url).pathname);await mkdir(directory,{recursive:true});
  const shots=JSON.parse(await readFile(new URL('../shots.json',import.meta.url),'utf8'));
  for(const shot of shots) {
    await page.goto('http://localhost:8080/'+shot.query);await page.waitForFunction(()=>window.__shotReady,{timeout:60000});
    await page.waitForTimeout(250);
    let jpg;for(const quality of [83,77,70,62]){jpg=await page.screenshot({type:'jpeg',quality,path:resolve(directory,shot.name)});if(jpg.length<=262144)break;}assert.ok(jpg.length<=262144,shot.name+' exceeds size cap');
    console.log('CAPTURED',shot.name,jpg.length,await page.evaluate(()=>({state:window.__game.snapshot(),render:window.__game.view.stats})));
  }
  const names=shots.map(s=>s.name);
  for(const name of await readdir(directory))if(/\.(jpg|jpeg|png)$/i.test(name)&&!names.includes(name))await rm(resolve(directory,name));
  assert.deepEqual(errors,[],'browser must have zero errors');
  console.log('PASS',JSON.stringify({before,moved,drove,errors,console:messages},null,2));
} finally {await browser.close();}
