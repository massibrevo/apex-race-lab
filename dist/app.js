import * as THREE from './vendor/three.module.js';
import {sample,lapAt,stintAt,formatTime} from './replay.js';
const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
let catalog=[],data,t=60,playing=false,selected='16',view='replay',cameraMode='orbit',last=0,lastUI=0,loadVersion=0;
let renderer,scene,camera,world,cars=new Map(),labels=new Map(),ring,scale=1,cx=0,cy=0,yaw=.15,pitch=.83,zoom=190,dragging=false,prevX,prevY,webgl=true;
const startTarget=new THREE.Vector3(), lookTarget=new THREE.Vector3();
const color=d=>'#'+(d.team_colour||'c3f77b');
const name=n=>data.drivers.find(d=>String(d.driver_number)===String(n));
const num=v=>Number(v).toLocaleString();
function initScene(){try{
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.setClearColor(0x000000,0);scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0d151c,.0028);
 camera=new THREE.PerspectiveCamera(39,1,.1,1200);scene.add(new THREE.AmbientLight(0xa7c2cf,2.1));
 const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(40,100,60);scene.add(key);
 const rim=new THREE.DirectionalLight(0xb9ff7a,1.2);rim.position.set(-60,30,-80);scene.add(rim);
 world=new THREE.Group();scene.add(world);
 const grid=new THREE.GridHelper(400,60,0x304740,0x1b2b30);grid.position.y=-1.2;scene.add(grid);
 $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();enableFallback('3D graphics unavailable. Showing the measured 2D map.');});
 }catch(e){enableFallback('3D graphics unavailable. Showing the measured 2D map.');}}
function enableFallback(message){webgl=false;$('scene').hidden=true;$('scene').style.display='none';$('fallback').hidden=false;$('status').textContent=message;}
const point=p=>new THREE.Vector3((p[0]-cx)*scale,.75,-(p[1]-cy)*scale);
function disposeWorld(){if(!world)return;world.traverse(o=>{o.geometry?.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});world.clear();}
function buildTrack(){
 if(!data.track.length){disposeWorld();cars.clear();labels.clear();$('labels').replaceChildren();renderer?.clear();const fallback=$('fallback').getContext('2d');fallback.clearRect(0,0,$('fallback').width,$('fallback').height);return;}
 const xs=data.track.map(p=>p[0]),ys=data.track.map(p=>p[1]);cx=(Math.max(...xs)+Math.min(...xs))/2;cy=(Math.max(...ys)+Math.min(...ys))/2;scale=145/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 cars.clear();labels.clear();$('labels').replaceChildren();
 if(!webgl)return;disposeWorld();
 const path=new THREE.CatmullRomCurve3(data.track.map(point),true,'centripetal');const pts=path.getPoints(800);
 function ribbon(width,y,mat){const verts=[],ids=[];for(let i=0;i<pts.length;i++){let p=pts[i],n=pts[(i+1)%pts.length].clone().sub(pts[(i+pts.length-1)%pts.length]).normalize(),side=new THREE.Vector3(-n.z,0,n.x).multiplyScalar(width/2);verts.push(p.x+side.x,y,p.z+side.z,p.x-side.x,y,p.z-side.z);if(i<pts.length-1){const k=i*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(ids);g.computeVertexNormals();world.add(new THREE.Mesh(g,mat));}
 ribbon(3.5,-.3,new THREE.MeshStandardMaterial({color:0x142d2b,roughness:.8,side:THREE.DoubleSide}));
 ribbon(2,.05,new THREE.MeshStandardMaterial({color:0x334347,roughness:.9,side:THREE.DoubleSide}));
 ribbon(1.65,.08,new THREE.MeshStandardMaterial({color:0x1b262e,roughness:.8,side:THREE.DoubleSide}));
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>p.clone().setY(.13))),new THREE.LineDashedMaterial({color:0x688e77,dashSize:.7,gapSize:1.5,transparent:true,opacity:.5}));line.computeLineDistances();world.add(line);
 for(let i=0;i<800;i+=5){const p=pts[i],next=pts[i+1],tangent=next.clone().sub(p).normalize(),side=new THREE.Vector3(-tangent.z,0,tangent.x);[-1,1].forEach(sign=>{const curb=new THREE.Mesh(new THREE.BoxGeometry(.22,.14,.7),new THREE.MeshStandardMaterial({color:(i/5)%2?0x98ae9e:0x7f3e44}));curb.position.copy(p).addScaledVector(side,sign*1.03);curb.position.y=.1;curb.rotation.y=Math.atan2(tangent.x,tangent.z);world.add(curb);});}
 // Architectural forms are illustrative context around the measured racing line.
 for(let i=15;i<pts.length;i+=115){const p=pts[i];const block=new THREE.Mesh(new THREE.BoxGeometry(6,1.5,2),new THREE.MeshStandardMaterial({color:0x1d3037,metalness:.4,roughness:.5}));block.position.set(p.x+7,0,p.z+4);block.rotation.y=-.3;world.add(block);}
 const start=pts[0],gate=new THREE.Mesh(new THREE.BoxGeometry(3,.15,.6),new THREE.MeshStandardMaterial({color:0xb9e1bf}));gate.position.copy(start).setY(.1);gate.rotation.y=Math.atan2(pts[1].x-start.x,pts[1].z-start.z);world.add(gate);
 for(const d of data.drivers){const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:color(d),metalness:.55,roughness:.35,emissive:color(d),emissiveIntensity:.35});
 const body=new THREE.Mesh(new THREE.BoxGeometry(.58,.25,1.25),material);body.position.y=.23;group.add(body);
 const nose=new THREE.Mesh(new THREE.BoxGeometry(.25,.2,.7),material);nose.position.set(0,.18,.7);group.add(nose);
 const cockpit=new THREE.Mesh(new THREE.BoxGeometry(.32,.2,.4),new THREE.MeshStandardMaterial({color:0x0a1017}));cockpit.position.set(0,.4,.05);group.add(cockpit);
 for(const z of [-.55,.6]){const wing=new THREE.Mesh(new THREE.BoxGeometry(1.15,.08,.22),material);wing.position.set(0,.2,z);group.add(wing);for(const x of [-.48,.48]){const wheel=new THREE.Mesh(new THREE.BoxGeometry(.26,.3,.32),new THREE.MeshStandardMaterial({color:0x05090c}));wheel.position.set(x,.16,z*.7);group.add(wheel);}}
 world.add(group);cars.set(String(d.driver_number),group);
 const label=document.createElement('span');label.className='car-label';label.textContent=d.name_acronym;label.style.borderColor=color(d);$('labels').append(label);labels.set(String(d.driver_number),label);}
 ring=new THREE.Mesh(new THREE.RingGeometry(1.2,1.45,48),new THREE.MeshBasicMaterial({color:0xc3f77b,side:THREE.DoubleSide,transparent:true,opacity:.8}));ring.rotation.x=-Math.PI/2;world.add(ring);resetCamera();
}
function resetCamera(){
 if(data?.track.length){const points=data.track,mx=points.reduce((v,p)=>v+p[0],0)/points.length,my=points.reduce((v,p)=>v+p[1],0)/points.length;
 const xx=points.reduce((v,p)=>v+(p[0]-mx)**2,0),yy=points.reduce((v,p)=>v+(p[1]-my)**2,0),xy=points.reduce((v,p)=>v+(p[0]-mx)*(p[1]-my),0);yaw=.5*Math.atan2(2*xy,xx-yy);}
 pitch=.83;zoom=160;lookTarget.set(0,0,0);
}
function resize(){if(webgl&&renderer){const r=$('stage').getBoundingClientRect();if(r.width&&r.height){renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}}drawSpeed();drawLaps();}
function drawScene(){if(!data?.track.length)return;if(!webgl){drawFallback();return;}
 const primary=sample(data.gps[selected],t,5,true);startTarget.set(0,0,0);if(cameraMode==='follow'&&primary)startTarget.copy(point(primary.slice(1)));lookTarget.lerp(startTarget,.08);
 const p=cameraMode==='top'?1.55:pitch,z=cameraMode==='follow'?35:zoom*Math.max(1,1.8/camera.aspect);camera.position.set(lookTarget.x+Math.sin(yaw)*Math.cos(p)*z,Math.sin(p)*z,lookTarget.z+Math.cos(yaw)*Math.cos(p)*z);camera.lookAt(lookTarget);
 const w=$('stage').clientWidth,h=$('stage').clientHeight;
 for(const [n,car] of cars){const loc=sample(data.gps[n],t,5,true),label=labels.get(n);car.visible=!!loc;if(!loc){label.style.display='none';continue;}
 car.position.copy(point(loc.slice(1)));const next=sample(data.gps[n],Math.min(t+.5,data.session.duration),5,true);if(next)car.rotation.y=Math.atan2(next[1]-loc[1],-(next[2]-loc[2]));
 const projected=car.position.clone().add(new THREE.Vector3(0,2,0)).project(camera);label.style.display=projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1?'none':'block';label.style.transform=`translate(${(projected.x+1)*w/2+4}px,${(-projected.y+1)*h/2-10}px)`;label.classList.toggle('selected',n===selected);label.style.opacity=n===selected?'1':'.66';
 if(n===selected){ring.position.copy(car.position);ring.position.y=.4;ring.scale.setScalar(1+Math.sin(performance.now()/500)*.08);}}
 ring.visible=!!primary;renderer.render(scene,camera);
}
function canvasContext(id){const c=$(id),r=c.getBoundingClientRect();if(!r.width||!r.height)return null;const d=Math.min(devicePixelRatio,2);if(c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);}const ctx=c.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);return {ctx,w:r.width,h:r.height};}
function drawFallback(){const c=canvasContext('fallback');if(!c)return;const {ctx,w,h}=c;const map=p=>[w/2+(p[0]-cx)*scale*Math.min(w/180,h/180),h/2-(p[1]-cy)*scale*Math.min(w/180,h/180)];ctx.strokeStyle='#597d6e';ctx.lineWidth=7;ctx.beginPath();data.track.forEach((p,i)=>{const [x,y]=map(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke();for(const d of data.drivers){const p=sample(data.gps[d.driver_number],t,5,true);if(!p)continue;const [x,y]=map(p.slice(1));ctx.fillStyle=color(d);ctx.beginPath();ctx.arc(x,y,String(d.driver_number)===selected?5:3,0,Math.PI*2);ctx.fill();ctx.font='9px monospace';ctx.fillText(d.name_acronym,x+6,y-4);}}
function selectDriver(n){selected=String(n);updateUI();drawSpeed();}
function setupDrivers(){const list=$('drivers');list.replaceChildren();for(const d of data.drivers){const b=document.createElement('button');b.className='driver-row';b.dataset.number=d.driver_number;b.style.setProperty('--team',color(d));b.setAttribute('aria-label',`Inspect ${d.full_name}`);b.innerHTML=`<span class="pos"></span><i class="team-line"></i><span><strong>${d.name_acronym}</strong><small>${d.team_name}</small></span><span class="tyre"></span><span class="row-lap muted"></span>`;b.onclick=()=>selectDriver(d.driver_number);list.append(b);}
 for(const id of ['compare','analysis-a','analysis-b']){$(id).replaceChildren();if(id==='compare')$(id).add(new Option('None',''));for(const d of data.drivers)$(id).add(new Option(`${d.name_acronym} · ${d.full_name}`,d.driver_number));}
 const other=data.drivers.find(d=>String(d.driver_number)!==selected&&data.telemetry[d.driver_number]?.length)||data.drivers.find(d=>String(d.driver_number)!==selected);$('compare').value=String(other.driver_number);$('analysis-a').value=selected;$('analysis-b').value=String(other.driver_number);}
function updateUI(){if(!data)return;const d=name(selected),lap=lapAt(data,selected,t),stint=stintAt(data,selected,lap?.lap_number),tel=sample(data.telemetry[selected],t,5),pos=sample(data.positions[selected],t,Infinity);
 $('driver-num').textContent=selected;$('driver-num').style.color=color(d);$('driver-name').textContent=d.full_name;$('driver-team').textContent=d.team_name;$('driver-lap').textContent=`LAP ${lap?.lap_number??'—'}`;$('lap-indicator').textContent=`LAP ${lap?.lap_number??'—'} / ${data.session.total_laps}`;$('position').textContent=`P${pos?.[1]??'—'}`;$('compound').textContent=stint?.compound??'UNKNOWN';
 $('speed-value').innerHTML=`${tel?.[1]??'—'}<small>KM/H</small>`;$('gear-value').textContent=tel?.[4]??'—';$('throttle-value').textContent=tel?tel[2]+'%':'—';$('brake-value').textContent=tel?tel[3]+'%':'—';$('throttle-bar').style.width=(tel?.[2]??0)+'%';$('brake-bar').style.width=(tel?.[3]??0)+'%';
 $('clock').innerHTML=`${formatTime(t)} <span>/ ${formatTime(data.session.duration)}</span>`;$('timeline').value=t;$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause replay':'Play replay');$('play-state').textContent=playing?'REPLAY RUNNING':t>=data.session.duration?'REPLAY COMPLETE':'REPLAY PAUSED';
 const ranked=data.drivers.map(d=>({n:String(d.driver_number),p:sample(data.positions[d.driver_number],t,Infinity)?.[1]??99})).sort((a,b)=>a.p-b.p);
 ranked.forEach(({n,p},i)=>{const row=$('drivers').querySelector(`[data-number="${n}"]`),l=lapAt(data,n,t),s=stintAt(data,n,l?.lap_number),compound=s?.compound?.[0]??'?';row.style.order=i;row.querySelector('.pos').textContent=p===99?'—':String(p).padStart(2,'0');row.querySelector('.row-lap').textContent=l?.lap_number??'—';row.querySelector('.tyre').textContent=compound;row.querySelector('.tyre').className='tyre '+compound;row.setAttribute('aria-pressed',String(n===selected));});$('drivers').style.display='flex';$('drivers').style.flexDirection='column';drawSpeed();}
function grid(ctx,w,h,min,max){ctx.font='8px monospace';ctx.lineWidth=1;for(let i=0;i<4;i++){const y=7+(h-17)*i/3;ctx.strokeStyle='#26313b';ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(w,y);ctx.stroke();ctx.fillStyle='#617483';ctx.fillText(Math.round(max-(max-min)*i/3),0,y+3);}}
function line(ctx,rows,x,y,c){ctx.beginPath();let pen=false;for(const r of rows){if(r===null){pen=false;continue;}const xx=x(r[0]),yy=y(r[1]);if(!pen){ctx.moveTo(xx,yy);pen=true;}else ctx.lineTo(xx,yy);}ctx.lineWidth=1.8;ctx.strokeStyle=c;ctx.stroke();}
function drawSpeed(){if(!data)return;const c=canvasContext('speed-chart');if(!c)return;const {ctx,w,h}=c;grid(ctx,w,h,0,360);for(const n of [selected,$('compare').value].filter(Boolean)){const rows=[];for(let s=Math.max(0,t-60);s<=t;s+=.6){const v=sample(data.telemetry[n],s,5);rows.push(v?[s,v[1]]:null);}line(ctx,rows,x=>25+(x-(t-60))/60*(w-27),v=>h-10-v/360*(h-17),color(name(n)));}}
function drawLaps(){if(!data||view!=='telemetry')return;const c=canvasContext('lap-chart');if(!c)return;const {ctx,w,h}=c;const ns=[$('analysis-a').value,$('analysis-b').value],sets=ns.map(n=>data.laps.filter(l=>String(l.driver_number)===n&&l.lap_duration>0&&(!$('clean-laps').checked||!l.is_pit_out_lap)));const values=sets.flat().map(l=>l.lap_duration);const min=values.length?Math.max(0,Math.floor(Math.min(...values)-2)):0,max=values.length?Math.ceil(Math.max(...values)+2):120;grid(ctx,w,h,min,max);sets.forEach((laps,i)=>line(ctx,laps.map(l=>[l.lap_number,l.lap_duration]),x=>28+(x-1)/(data.session.total_laps-1)*(w-35),v=>h-10-(v-min)/(max-min)*(h-17),color(name(ns[i]))));
 const fastest=sets[0].reduce((best,l)=>!best||l.lap_duration<best.lap_duration?l:best,null),average=a=>a.length?a.reduce((s,l)=>s+l.lap_duration,0)/a.length:NaN,delta=average(sets[0])-average(sets[1]);
 const fmt=s=>`${Math.floor(s/60)}:${(s%60).toFixed(3).padStart(6,'0')}`;
 $('insights').innerHTML=`<div class="panel insight"><span class="eyebrow">${name(ns[0]).name_acronym} / FASTEST LAP</span><h3>Peak performance</h3><strong>${fastest?fmt(fastest.lap_duration):'—'}</strong><p>LAP ${fastest?.lap_number??'—'} · MEASURED LAP TIME</p></div><div class="panel insight"><span class="eyebrow">AVERAGE LAP DELTA</span><h3>${name(ns[0]).name_acronym} relative to ${name(ns[1]).name_acronym}</h3><strong>${Number.isFinite(delta)?(delta>=0?'+':'')+delta.toFixed(3)+'s':'—'}</strong><p>ALL INCLUDED LAPS · NEGATIVE IS FASTER</p></div><div class="panel insight"><span class="eyebrow">ANALYSIS COVERAGE</span><h3>Valid laps in this comparison</h3><strong>${sets[0].length} / ${sets[1].length}</strong><p>${$('clean-laps').checked?'PIT OUT LAPS EXCLUDED':'ALL RECORDED LAPS'}</p></div>`;}
function buildLab(){const p=data.provenance,rows=(id,entries)=>$(id).innerHTML=entries.map(([k,v])=>`<div class="data-row"><span>${k}</span><b>${v}</b></div>`).join('');rows('quality',[['Driver coverage',`${p.quality.driver_coverage} / ${data.drivers.length} with GPS`],['Finite GPS coordinates',p.quality.finite_coordinates===null?'N/A':p.quality.finite_coordinates?'PASS ✓':'FAIL'],['Monotonic timestamps',p.quality.monotonic_timestamps===null?'N/A':p.quality.monotonic_timestamps?'PASS ✓':'FAIL'],['GPS samples',num(p.gps_samples)],['Telemetry samples',num(p.telemetry_samples)],['Lap records',num(data.laps.length)],['dbt contract tests',p.warehouse ? p.warehouse.dbt_tests_passed+' passed ✓' : 'Not yet built']]);rows('provenance',[['Provider','OpenF1 / v1'],['GPS / telemetry',data.track.length?'Recorded measurements':'Waiting for source access'],['Session key',data.session.key],['Window start (UTC)',new Date(data.session.start).toISOString().replace('T',' ').slice(0,19)],['Season / round',`${data.session.year} / ${catalog.find(s=>s.key===data.session.key)?.round??'—'}`],['Window duration',`${data.session.duration} seconds`],['Sampling','~1 Hz · interpolated GPS'],['Circuit reference',p.track_driver?`Driver ${p.track_driver} · lap ${p.track_lap}`:'Not downloaded'],['Exported (UTC)',p.generated_at.slice(0,10)]]);}
function showSeason(year,preferred){
 const races=catalog.filter(s=>s.year===Number(year));$('session').replaceChildren();
 for(const race of races)$('session').add(new Option(`R${String(race.round).padStart(2,'0')} · ${race.name}${race.replay_available===false?' · Lap timing':''}`,String(race.key)));
 $('season').value=String(year);$('session').value=String(races.find(s=>s.key===Number(preferred))?.key??races[0].key);
 return $('session').value;
}
async function loadSession(key){
 const version=++loadVersion;playing=false;$('status').textContent='Loading measured race data…';$('session').disabled=true;$('season').disabled=true;
 try{
  const response=await fetch(`data/${key}.json`,{cache:'no-cache'});if(!response.ok)throw Error('Archive could not be loaded');const incoming=await response.json();
  if(incoming.schema_version!==1||!incoming.drivers?.length)throw Error('Invalid archive');if(version!==loadVersion)return;
  data=incoming;t=60;const hasReplay=!!data.track.length;const entry=catalog.find(s=>s.key===data.session.key);
  selected=String(data.drivers.find(d=>d.driver_number===16&&(!hasReplay||data.gps[d.driver_number]?.length))?.driver_number??data.drivers.find(d=>data.gps[d.driver_number]?.length&&data.telemetry[d.driver_number]?.length)?.driver_number??data.drivers[0].driver_number);
  $('replay-unavailable').hidden=hasReplay;
  document.querySelector('.telemetry-strip').hidden=!hasReplay;
  for(const id of ['play','back','forward','timeline','speed'])$(id).disabled=!hasReplay;
  $$('[data-camera]').forEach(b=>b.disabled=!hasReplay);
  setupDrivers();buildTrack();buildLab();const circuit=entry?.circuit||data.session.circuit||'CIRCUIT';
  $('circuit-name').textContent=circuit.toUpperCase();$('circuit-meta').textContent=`${entry?.date??data.session.year} · ${data.session.total_laps} LAPS`;
  $('circuit-title').textContent=circuit+' · '+data.session.name;
  $('track-word').replaceChildren(document.createTextNode(circuit.toUpperCase()));const caption=document.createElement('span');caption.textContent=`${data.session.year} · ROUND ${entry?.round??'—'} · ${data.session.country.toUpperCase()}`;$('track-word').append(caption);
  $('weather').textContent=`TRACK ${data.weather.track_temperature??'—'}°C · AIR ${data.weather.air_temperature??'—'}°C`;
  $('timeline').max=data.session.duration;$('driver-count').textContent=`${data.drivers.length} DRIVERS`;$('last-lap-label').textContent=`LAP ${data.session.total_laps}`;
  const url=new URL(location.href);url.searchParams.set('session',String(key));history.replaceState(null,'',url);
  if(!hasReplay)$$('[data-view]').find(b=>b.dataset.view==='telemetry').click();
  updateUI();resize();if(webgl)$('status').textContent=hasReplay?'':'Recorded lap timing loaded. GPS replay is pending source access.';
 }catch(e){$('status').textContent=`Unable to load this archive. ${e.message}. Select a session to retry.`;}
 finally{if(version===loadVersion){$('session').disabled=false;$('season').disabled=false;}}
}
async function initArchive(){
 try{const response=await fetch('data/session-catalog.json',{cache:'no-store'});if(!response.ok)throw Error('Race calendar unavailable');const archive=await response.json();catalog=archive.sessions;
  if(!Array.isArray(catalog)||!catalog.length)throw Error('Empty race calendar');
  $('archive-count').textContent=`${catalog.length} GRAND PRIX · ${catalog.filter(s=>s.replay_available!==false).length} REPLAYS`;
  const requested=Number(new URL(location.href).searchParams.get('session')),initial=catalog.find(s=>s.key===requested)||catalog.find(s=>s.key===9590)||catalog[0];
  await loadSession(showSeason(initial.year,initial.key));
 }catch(e){$('status').textContent=`Unable to load the race archive. ${e.message}. Reload to retry.`;}
}

function toggle(){if(!data?.track.length)return;if(t>=data.session.duration)t=0;playing=!playing;updateUI();}
function seek(delta){if(!data)return;t=Math.max(0,Math.min(data.session.duration,t+delta));updateUI();}
function download(content,type,file){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=file;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('season').onchange=e=>{const circuit=catalog.find(s=>s.key===data?.session.key)?.circuit;const match=catalog.find(s=>s.year===Number(e.target.value)&&s.circuit===circuit);loadSession(showSeason(Number(e.target.value),match?.key));};$('session').onchange=e=>loadSession(e.target.value);$('play').onclick=toggle;$('back').onclick=()=>seek(-15);$('forward').onclick=()=>seek(15);$('timeline').oninput=e=>{t=Number(e.target.value);updateUI();};$('compare').onchange=drawSpeed;
for(const id of ['analysis-a','analysis-b','clean-laps'])$(id).onchange=drawLaps;
$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;$$('[data-view]').forEach(n=>n.classList.toggle('active',n===b));['replay','telemetry','lab'].forEach(v=>$(v+'-view').hidden=v!==view);resize();});
$$('[data-camera]').forEach(b=>b.onclick=()=>{cameraMode=b.dataset.camera;$$('[data-camera]').forEach(n=>n.classList.toggle('active',n===b));});$('reset-camera').onclick=resetCamera;
$('open-timing').onclick=()=>$$('[data-view]').find(b=>b.dataset.view==='telemetry').click();
$('about').onclick=()=>$('info-dialog').showModal();$('close-dialog').onclick=()=>$('info-dialog').close();$('info-dialog').onclick=e=>{if(e.target===$('info-dialog'))$('info-dialog').close();};
$('download-json').onclick=()=>data&&download(JSON.stringify(data,null,2),'application/json',`apex-${data.session.key}.json`);
$('export-csv').onclick=()=>{if(!data)return;const keys=['driver_number','lap_number','lap_duration','duration_sector_1','duration_sector_2','duration_sector_3','is_pit_out_lap'];download(keys.join(',')+'\n'+data.laps.map(l=>keys.map(k=>l[k]??'').join(',')).join('\n'),'text/csv',`apex-${data.session.key}-laps.csv`);};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||$('info-dialog').open)return;if(e.code==='Space'){e.preventDefault();toggle();}if(e.code==='ArrowLeft')seek(-15);if(e.code==='ArrowRight')seek(15);});
$('scene').addEventListener('pointerdown',e=>{dragging=true;prevX=e.clientX;prevY=e.clientY;$('scene').setPointerCapture(e.pointerId);});$('scene').addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-prevX)*.008;pitch=Math.max(.2,Math.min(1.5,pitch+(e.clientY-prevY)*.005));prevX=e.clientX;prevY=e.clientY;});$('scene').addEventListener('pointerup',()=>dragging=false);$('scene').addEventListener('pointercancel',()=>dragging=false);$('scene').addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(70,Math.min(350,zoom+e.deltaY*.12));},{passive:false});
new ResizeObserver(resize).observe($('stage'));window.addEventListener('resize',resize);
function frame(now){const dt=last?Math.min((now-last)/1000,.25):0;last=now;if(data&&playing){t=Math.min(data.session.duration,t+dt*Number($('speed').value));if(t>=data.session.duration)playing=false;}if(data&&view==='replay'){drawScene();if(now-lastUI>150){updateUI();lastUI=now;}}requestAnimationFrame(frame);}
initScene();initArchive();requestAnimationFrame(frame);
