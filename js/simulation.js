(() => {
  const canvas=document.getElementById("simCanvas");
  if(!canvas) return;

  const ctx=canvas.getContext("2d",{alpha:false});
  const root=document.querySelector(".simulation-page");
  const mode=root?.dataset.mode||"projectile";

  const config={
    projectile:{
      title:"Arjuna's Arrow",
      formula:"x = u cosθ · t,  y = u sinθ · t − ½gt²",
      note:"A drag-free projectile model. Launch angle, speed and gravity are applied to the moving arrow.",
      defaults:{angle:45,speed:18,gravity:9.81},
      controls:[
        ["angle","Launch angle",10,80,1,"°"],
        ["speed","Launch speed",5,30,.5,"m/s"],
        ["gravity","Gravity",1,20,.01,"m/s²"]
      ]
    },
    wave:{
      title:"Flute & Sound",
      formula:"v = fλ",
      note:"The wave travels at the selected speed while frequency sets wavelength. Amplitude controls displacement.",
      defaults:{frequency:440,amplitude:1,speed:343},
      controls:[
        ["frequency","Frequency",100,1000,1,"Hz"],
        ["amplitude","Amplitude",.2,2,.1,"×"],
        ["speed","Wave speed",100,500,1,"m/s"]
      ]
    },
    rotation:{
      title:"Sudarshan Chakra",
      formula:"v = rω,   aᶜ = v²/r",
      note:"Angular speed drives the disc directly. Radius changes tangential speed and centripetal acceleration.",
      defaults:{radius:2,omega:5,mass:2},
      controls:[
        ["radius","Radius",.5,4,.1,"m"],
        ["omega","Angular speed",.5,12,.1,"rad/s"],
        ["mass","Mass",.5,10,.1,"kg"]
      ]
    },
    balance:{
      title:"Govardhan Balance",
      formula:"Στ = Iα",
      note:"A lever with a real torque balance: load, beam weight and applied effort all contribute to angular acceleration.",
      defaults:{mass:80,loadArm:2.2,effortArm:3,effort:650,beamMass:20},
      controls:[
        ["mass","Load mass",10,200,1,"kg"],
        ["loadArm","Load position",.5,4,.1,"m from pivot"],
        ["effortArm","Effort position",.5,5,.1,"m from pivot"],
        ["effort","Effort force",50,1200,10,"N"],
        ["beamMass","Beam mass",5,60,1,"kg"]
      ]
    },
    fluid:{
      title:"Yamuna Pressure",
      formula:"F = mg",
      note:"A makhan pot sinks under gravity through a water column. Pot volume controls its size, object depth sets its starting position, and river flow controls horizontal motion.",
      defaults:{depth:4,density:1000,volume:.08,mass:100,flow:1.4},
      controls:[
        ["depth","Object depth",.2,9,.1,"m"],
        ["density","Water density",700,1200,1,"kg/m³"],
        ["volume","Pot volume",.02,.2,.01,"m³"],
        ["mass","Pot mass",20,240,1,"kg"],
        ["flow","River flow",0,4,.1,"m/s"]
      ]
    },
    orbit:{
      title:"Kanha Sky",
      formula:"a = −GM r / |r|³",
      note:"A two-body central-gravity model. Initial radius and speed determine whether the orbit is circular, elliptical or escaping.",
      defaults:{radius:3,mass:1,velocity:17.2},
      controls:[
        ["radius","Orbit radius",.5,6,.1,"AU"],
        ["mass","Central mass",.2,3,.1,"M☉"],
        ["velocity","Initial speed",5,50,.1,"km/s"]
      ]
    }
  }[mode];

  if(!config) return;

  let values={...config.defaults};
  let running=false,raf=0,last=0,acc=0,time=0,dpr=1,w=0,h=0;
  let phase=0;

  let projectileX=0,projectileY=0,projectileVX=0,projectileVY=0;
  let rotationAngle=0;
  let balanceAngle=.05,balanceVelocity=0;
  let fluidDepth=config.defaults.depth,fluidVelocity=0,fluidX=0,fluidVelocityX=0;
  let orbitX=config.defaults.radius,orbitY=0,orbitVX=0,orbitVY=0,orbitTrail=[];

  const bg=document.createElement("canvas");
  const bgc=bg.getContext("2d",{alpha:false});
  const potImage=new Image();
  potImage.src="../free-PNG-graphics-indian-food-of-makhan-butter-clay-pot-vector-illustration-th-1101533821-Photoroom.png";
  potImage.decoding="async";
  potImage.addEventListener("load",()=>draw());

  const controls=document.getElementById("controlsMount");
  const metrics=document.getElementById("metrics");
  const title=document.getElementById("labTitle");
  const formula=document.getElementById("formula");
  const note=document.getElementById("labNote");
  const state=document.getElementById("stateHud");
  const play=document.getElementById("playBtn");

  title.textContent=config.title;
  formula.textContent=config.formula;
  note.textContent=config.note;
  document.getElementById("modeHud").textContent=config.title.toUpperCase();

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const TAU=Math.PI*2;
  const G=9.81;
  const AU_KM=149597870.7;
  const SECONDS_PER_YEAR=31557600;
  const ORBIT_G=4*Math.PI*Math.PI;

  function resetProjectile(){
    const a=values.angle*Math.PI/180;
    projectileX=0;
    projectileY=0;
    projectileVX=values.speed*Math.cos(a);
    projectileVY=values.speed*Math.sin(a);
    time=0;
  }

  function resetRotation(){
    rotationAngle=0;
  }

  function resetBalance(){
    balanceAngle=.05;
    balanceVelocity=0;
  }

  function resetFluid(){
    fluidDepth=clamp(values.depth,.2,9.0);
    fluidVelocity=0;
    fluidX=0;
    fluidVelocityX=0;
  }

  function kmpsToAuPerYear(v){
    return v*SECONDS_PER_YEAR/AU_KM;
  }

  function auPerYearToKmps(v){
    return v*AU_KM/SECONDS_PER_YEAR;
  }

  function resetOrbit(){
    orbitX=values.radius;
    orbitY=0;
    orbitVX=0;
    orbitVY=kmpsToAuPerYear(values.velocity);
    orbitTrail=[];
    orbitTrail.push([orbitX,orbitY]);
  }

  function frustumVolume(r1,r2,height){
    return Math.PI*height*(r1*r1+r1*r2+r2*r2)/3;
  }

  function frustumPartialVolume(r1,r2,height,subHeight){
    if(subHeight<=0) return 0;
    if(subHeight>=height) return frustumVolume(r1,r2,height);
    const t=subHeight/height;
    const rAtCut=r1+(r2-r1)*t;
    return frustumVolume(r1,rAtCut,subHeight);
  }

  function potGeometry(volume){
    // The rendered pot is represented as two matching frustum sections.
    // Its external volume is solved so the volume slider remains physically meaningful.
    const shapeFactor=1.69156*Math.PI;
    const radius=Math.cbrt(volume/shapeFactor);
    const height=2.4*radius;
    const midRadius=radius;
    const topRadius=radius*.58;
    const bottomRadius=radius*.75;
    return {radius,height,topRadius,midRadius,bottomRadius};
  }

  function potSubmergedVolume(geom,centerDepth){
    // centerDepth is measured downward from the water surface.
    // The portion below the surface is determined only by the pot position.
    const topDepth=centerDepth-geom.height/2;
    const bottomDepth=centerDepth+geom.height/2;
    const submergedHeight=clamp(bottomDepth,0,geom.height)-clamp(topDepth,0,geom.height);
    if(submergedHeight<=0) return 0;

    const half=geom.height/2;
    if(submergedHeight<=half){
      return frustumPartialVolume(geom.topRadius,geom.midRadius,half,submergedHeight);
    }

    return frustumVolume(geom.topRadius,geom.midRadius,half)+
      frustumPartialVolume(geom.midRadius,geom.bottomRadius,half,submergedHeight-half);
  }

  function fluidState(){
    const geom=potGeometry(values.volume);
    const weightForce=values.mass*G;
    const netVertical=-weightForce;
    const objectDensity=values.mass/Math.max(.0001,values.volume);
    let status="Falling";
    if(fluidDepth>=waterDepthLimit()-geom.height/2-.01 && Math.abs(fluidVelocity)<.03){
      status="At bottom";
    }
    return {
      radius:geom.radius,
      height:geom.height,
      submergedVolume:0,
      weightForce,
      netVertical,
      objectDensity,
      submergedFraction:0,
      status
    };
  }

  function balanceState(){
    const loadForce=values.mass*G;
    const beamLength=values.loadArm+values.effortArm;
    const beamCenterArm=(values.effortArm-values.loadArm)/2;
    const beamWeight=values.beamMass*G;
    const angleFactor=Math.cos(balanceAngle);
    const loadTorque=loadForce*values.loadArm*angleFactor;
    const beamTorque=beamWeight*beamCenterArm*angleFactor;
    const effortTorque=values.effort*values.effortArm*angleFactor;
    const frictionTorque=-balanceVelocity*.8;
    const netTorque=effortTorque-loadTorque-beamTorque+frictionTorque;
    const beamInertia=values.beamMass*beamLength*beamLength/12+values.beamMass*beamCenterArm*beamCenterArm;
    const loadInertia=values.mass*values.loadArm*values.loadArm;
    const inertia=Math.max(.1,beamInertia+loadInertia);
    const requiredEffort=(loadTorque+beamTorque)/Math.max(.1,values.effortArm*angleFactor);
    const supportForce=loadForce+beamWeight-values.effort;
    return {loadForce,beamLength,beamCenterArm,beamWeight,loadTorque,beamTorque,effortTorque,netTorque,inertia,requiredEffort,supportForce};
  }

  function orbitState(){
    const r=Math.max(.05,Math.hypot(orbitX,orbitY));
    const speed=Math.hypot(orbitVX,orbitVY);
    const ideal=29.7847*Math.sqrt(values.mass/r);
    return {r,speed,ideal};
  }

  function metricsHtml(){
    const m=[];

    if(mode==="projectile"){
      const a=values.angle*Math.PI/180;
      const tFlight=2*values.speed*Math.sin(a)/values.gravity;
      const range=(values.speed**2*Math.sin(2*a))/values.gravity;
      const maxHeight=(values.speed*Math.sin(a))**2/(2*values.gravity);
      const currentSpeed=Math.hypot(projectileVX,projectileVY);
      m.push(
        ["Range",range.toFixed(2)+" m"],
        ["Max height",maxHeight.toFixed(2)+" m"],
        ["Flight time",tFlight.toFixed(2)+" s"],
        ["Current speed",currentSpeed.toFixed(2)+" m/s"]
      );
    }else if(mode==="wave"){
      const wavelength=values.speed/values.frequency;
      m.push(
        ["Wavelength",wavelength.toFixed(3)+" m"],
        ["Frequency",values.frequency.toFixed(0)+" Hz"],
        ["Amplitude",values.amplitude.toFixed(1)+" ×"],
        ["Wave speed",values.speed.toFixed(0)+" m/s"]
      );
    }else if(mode==="rotation"){
      const v=values.radius*values.omega;
      const ac=v*v/Math.max(.001,values.radius);
      const ke=.5*values.mass*v*v;
      m.push(
        ["Tangential speed",v.toFixed(2)+" m/s"],
        ["Centripetal accel.",ac.toFixed(2)+" m/s²"],
        ["Angular speed",values.omega.toFixed(2)+" rad/s"],
        ["Kinetic energy",ke.toFixed(2)+" J"]
      );
    }else if(mode==="balance"){
      const b=balanceState();
      m.push(
        ["Load force",b.loadForce.toFixed(1)+" N"],
        ["Beam weight",b.beamWeight.toFixed(1)+" N"],
        ["Required effort",b.requiredEffort.toFixed(1)+" N"],
        ["Net torque",b.netTorque.toFixed(1)+" N·m"],
        ["Support reaction",b.supportForce.toFixed(1)+" N"]
      );
    }else if(mode==="fluid"){
      const s=fluidState();
      const pressure=values.density*G*Math.max(0,fluidDepth);
      m.push(
        ["Pressure",Math.round(pressure)+" Pa"],
        ["Object density",s.objectDensity.toFixed(0)+" kg/m³"],
        ["Weight",s.weightForce.toFixed(2)+" N"],
        ["Vertical force",s.netVertical.toFixed(2)+" N"],
        ["Depth",Math.max(0,fluidDepth).toFixed(2)+" m"],
        ["State",s.status],
        ["River flow",values.flow.toFixed(1)+" m/s"]
      );
    }else{
      const o=orbitState();
      const ratio=o.speed/Math.max(.001,values.radius);
      m.push(
        ["Distance",o.r.toFixed(2)+" AU"],
        ["Current speed",auPerYearToKmps(o.speed).toFixed(2)+" km/s"],
        ["Circular speed",o.ideal.toFixed(2)+" km/s"],
        ["Speed / radius",ratio.toFixed(2)+" AU/y ÷ AU"],
        ["Central mass",values.mass.toFixed(1)+" M☉"]
      );
    }

    metrics.innerHTML=m.map(x=>'<div class="metric"><label>'+x[0]+'</label><strong>'+x[1]+'</strong></div>').join("");
  }

  function buildControls(){
    controls.innerHTML="";
    config.controls.forEach(([key,label,min,max,step,unit])=>{
      const g=document.createElement("div");
      g.className="control-group";
      const id="ctrl-"+key;

      g.innerHTML='<div class="control-row"><label for="'+id+'">'+label+'</label><span class="control-value" id="value-'+key+'"></span></div><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+values[key]+'">';
      controls.appendChild(g);

      const input=g.querySelector("input");
      const out=g.querySelector(".control-value");

      const sync=()=>{
        values[key]=Number(input.value);

        if(mode==="fluid" && key==="depth"){
          fluidDepth=clamp(values.depth,.2,9);
          fluidVelocity=0;
        }

        if(mode==="projectile" && (key==="angle"||key==="speed"||key==="gravity")) resetProjectile();
        if(mode==="rotation" && (key==="radius"||key==="omega")) resetRotation();
        if(mode==="balance" && (key==="mass"||key==="loadArm"||key==="effortArm"||key==="beamMass")) resetBalance();
        if(mode==="orbit" && (key==="radius"||key==="mass"||key==="velocity")) resetOrbit();

        out.textContent=input.value+" "+unit;
        metricsHtml();
        draw();
      };

      input.addEventListener("input",sync);
      input.value=values[key];
      out.textContent=input.value+" "+unit;
      input.addEventListener("input",sync);
    });
  }

  function resize(){
    const r=canvas.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,window.innerWidth<700?1.25:1.5);
    w=Math.max(300,r.width);
    h=Math.max(300,r.height);

    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);

    bg.width=Math.round(w*dpr);
    bg.height=Math.round(h*dpr);
    bgc.setTransform(dpr,0,0,dpr,0,0);
    bgc.fillStyle="#071320";
    bgc.fillRect(0,0,w,h);

    bgc.strokeStyle="rgba(255,255,255,.035)";
    bgc.lineWidth=1;
    for(let x=0;x<w;x+=48){
      bgc.beginPath();
      bgc.moveTo(x,0);
      bgc.lineTo(x,h);
      bgc.stroke();
    }
    for(let y=0;y<h;y+=48){
      bgc.beginPath();
      bgc.moveTo(0,y);
      bgc.lineTo(w,y);
      bgc.stroke();
    }
    draw();
  }

  new ResizeObserver(resize).observe(canvas);

  function background(){
    ctx.fillStyle="#071320";
    ctx.fillRect(0,0,w,h);
    ctx.drawImage(bg,0,0,w,h);
    const g=ctx.createRadialGradient(w*.55,h*.42,10,w*.55,h*.42,Math.min(w,h)*.48);
    g.addColorStop(0,"rgba(29,124,255,.12)");
    g.addColorStop(1,"rgba(7,19,32,0)");
    ctx.fillStyle=g;
    ctx.fillRect(0,0,w,h);
  }

  function arrow(x,y,tx,ty,label){
    ctx.strokeStyle="#d4ad63";
    ctx.fillStyle="#d4ad63";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(tx,ty);
    ctx.stroke();

    const a=Math.atan2(ty-y,tx-x);
    ctx.beginPath();
    ctx.moveTo(tx,ty);
    ctx.lineTo(tx-8*Math.cos(a-.4),ty-8*Math.sin(a-.4));
    ctx.lineTo(tx-8*Math.cos(a+.4),ty-8*Math.sin(a+.4));
    ctx.closePath();
    ctx.fill();

    if(label){
      ctx.fillStyle="#b9cbe0";
      ctx.font="10px system-ui";
      ctx.fillText(label,(x+tx)/2+6,(y+ty)/2);
    }
  }

  function drawProjectile(){
    const ground=h*.78;
    const left=70;
    const scale=Math.min((w-120)/34,h/24);
    const a=values.angle*Math.PI/180;
    const tFlight=2*values.speed*Math.sin(a)/values.gravity;

    ctx.strokeStyle="rgba(240,246,255,.15)";
    ctx.beginPath();
    ctx.moveTo(left,ground);
    ctx.lineTo(w-40,ground);
    ctx.stroke();

    ctx.strokeStyle="rgba(125,193,255,.6)";
    ctx.lineWidth=2;
    ctx.beginPath();
    for(let i=0;i<=72;i++){
      const t=tFlight*i/72;
      const x=left+values.speed*Math.cos(a)*t*scale;
      const y=ground-(values.speed*Math.sin(a)*t-.5*values.gravity*t*t)*scale;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.stroke();

    const x=left+projectileX*scale;
    const y=ground-projectileY*scale;

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(Math.atan2(-projectileVY,projectileVX));
    ctx.strokeStyle="#edf5ff";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(-14,0);
    ctx.lineTo(14,0);
    ctx.stroke();
    ctx.fillStyle="#d4ad63";
    ctx.beginPath();
    ctx.moveTo(14,0);
    ctx.lineTo(7,-4);
    ctx.lineTo(7,4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const arrowScale=Math.min(2.8,Math.max(.8,Math.hypot(projectileVX,projectileVY)/8));
    arrow(left+22,ground-20,left+22+projectileVX*arrowScale,ground-20-projectileVY*arrowScale,"v");
  }

  function drawWave(){
    const cy=h*.5;
    const amp=values.amplitude*Math.min(70,h*.12);
    const pixelsPerMeter=110;
    const wavelengthPx=Math.max(22,(values.speed/values.frequency)*pixelsPerMeter);
    const omega=TAU*values.frequency;
    const spatialK=TAU/wavelengthPx;
    const temporalPhase=omega*time;

    ctx.strokeStyle="rgba(240,246,255,.16)";
    ctx.beginPath();
    ctx.moveTo(45,cy);
    ctx.lineTo(w-40,cy);
    ctx.stroke();

    ctx.strokeStyle="#55c1ba";
    ctx.lineWidth=2.2;
    ctx.beginPath();

    for(let x=45;x<w-35;x+=4){
      const y=cy+Math.sin(spatialK*(x-45)-temporalPhase)*amp;
      x===45?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle="#edf5ff";
    ctx.font="12px system-ui";
    ctx.fillText("Amplitude",58,cy-amp-10);

    ctx.fillStyle="#8ea2b8";
    ctx.fillText("Wavelength →",w*.62,cy+amp+26);
  }

  function drawRotation(){
    const cx=w*.53;
    const cy=h*.5;
    const r=clamp(Math.min(w,h)*.07*values.radius,35,Math.min(w,h)*.3);
    const angle=rotationAngle;

    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(1,.34);
    ctx.rotate(angle);

    ctx.fillStyle="rgba(212,173,99,.08)";
    ctx.strokeStyle="rgba(212,173,99,.28)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(0,0,r,0,TAU);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle="rgba(85,193,186,.82)";
    ctx.lineWidth=5;
    for(let i=0;i<12;i++){
      ctx.rotate(Math.PI/6);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.lineTo(r*.92,0);
      ctx.stroke();
    }

    ctx.fillStyle="#d4ad63";
    ctx.beginPath();
    ctx.arc(0,0,r*.19,0,TAU);
    ctx.fill();
    ctx.restore();

    const v=values.radius*values.omega;
    const tangentX=cx+Math.cos(angle+Math.PI/2)*Math.min(95,18+v*3);
    const tangentY=cy+Math.sin(angle+Math.PI/2)*Math.min(55,12+v*2);
    arrow(cx+r*.45,cy-r*.12,tangentX,tangentY,"tangential");
  }

  function drawBalance(){
    const pivotX=w*.52;
    const pivotY=h*.56;
    const scale=Math.min(w*.14,62);
    const left=values.loadArm*scale;
    const right=values.effortArm*scale;
    const beamCenter=(right-left)/2;
    const a=balanceAngle;

    const loadX=pivotX-left*Math.cos(a);
    const loadY=pivotY-left*Math.sin(a);
    const effortX=pivotX+right*Math.cos(a);
    const effortY=pivotY+right*Math.sin(a);
    const beamCenterX=pivotX+beamCenter*Math.cos(a);
    const beamCenterY=pivotY+beamCenter*Math.sin(a);
    const b=balanceState();

    ctx.save();
    ctx.translate(pivotX,pivotY);
    ctx.rotate(a);

    ctx.strokeStyle="rgba(15,26,38,.5)";
    ctx.lineWidth=13;
    ctx.beginPath();
    ctx.moveTo(-left,4);
    ctx.lineTo(right,4);
    ctx.stroke();

    ctx.strokeStyle="#557088";
    ctx.lineWidth=9;
    ctx.beginPath();
    ctx.moveTo(-left,0);
    ctx.lineTo(right,0);
    ctx.stroke();

    ctx.strokeStyle="rgba(212,173,99,.5)";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(-left,-4);
    ctx.lineTo(right,-4);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle="#d4ad63";
    ctx.beginPath();
    ctx.moveTo(pivotX-18,pivotY+10);
    ctx.lineTo(pivotX+18,pivotY+10);
    ctx.lineTo(pivotX,pivotY+76);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle="#091522";
    ctx.beginPath();
    ctx.arc(pivotX,pivotY,8,0,TAU);
    ctx.fill();

    ctx.fillStyle="#1d7cff";
    ctx.beginPath();
    ctx.arc(loadX,loadY,23,0,TAU);
    ctx.fill();
    arrow(loadX,loadY,loadX,loadY+clamp(35+b.loadForce/7,50,115),"load");
    ctx.fillStyle="#b9cbe0";
    ctx.font="11px system-ui";
    ctx.fillText(values.mass.toFixed(0)+" kg",loadX-18,loadY-31);

    ctx.fillStyle="#25b8ad";
    ctx.beginPath();
    ctx.arc(effortX,effortY,19,0,TAU);
    ctx.fill();
    arrow(effortX,effortY,effortX,effortY-clamp(35+values.effort/10,50,115),"effort");
    ctx.fillStyle="#b9cbe0";
    ctx.fillText(values.effort.toFixed(0)+" N",effortX-19,effortY+37);

    arrow(beamCenterX,beamCenterY,beamCenterX,beamCenterY+clamp(35+b.beamWeight/8,45,95),"beam");
    
    const supportMagnitude=Math.min(95,30+Math.abs(b.supportForce)/10);
    if(Math.abs(b.supportForce)>1){
      const sy=b.supportForce>0?pivotY+50:pivotY-5;
      const ty=b.supportForce>0?sy-supportMagnitude:sy+supportMagnitude;
      arrow(pivotX,sy,pivotX,ty,"support");
    }else{
      arrow(pivotX,pivotY+25,pivotX,pivotY+5,"support");
    }

    ctx.fillStyle="#8ea2b8";
    ctx.fillText("pivot",pivotX+13,pivotY+24);
  }

  function drawFluid(){
    const top=h*.16;
    const bottom=h*.90;
    const waterDepthMeters=10;
    const level=top+(bottom-top)*.16;
    const waterBottom=bottom;
    const pixelsPerMeter=(waterBottom-level)/waterDepthMeters;
    const s=fluidState();
    // Make visual size respond clearly to the physical volume slider.
    const volumeScale=Math.cbrt(values.volume/.02);
    const bodyH=clamp(42*volumeScale,42,105);
    const imageRatio=potImage.naturalWidth>0?potImage.naturalWidth/Math.max(1,potImage.naturalHeight):.9;
    const bodyR=bodyH*imageRatio*.5;
    const travelWidth=Math.max(180,w*.70);

    ctx.fillStyle="rgba(34,184,173,.14)";
    ctx.fillRect(0,level,w,waterBottom-level);

    ctx.strokeStyle="rgba(85,193,186,.82)";
    ctx.lineWidth=2;
    ctx.beginPath();
    for(let x=0;x<=w;x+=5){
      const y=level+Math.sin(x*.035+phase*1.7)*2.8+Math.sin(x*.014-phase*.8)*1.4;
      x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.strokeStyle="rgba(125,193,255,.23)";
    ctx.lineWidth=1.2;
    for(let row=0;row<6;row++){
      const y=level+45+row*(waterBottom-level-90)/5;
      const offset=((phase*values.flow*34)+row*80)%(w+120)-60;
      for(let n=0;n<4;n++){
        const x=offset+n*150;
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.lineTo(x+48,y);
        ctx.stroke();
      }
    }

    const wrappedX=((fluidX*35)%travelWidth+travelWidth)%travelWidth;
    const bodyX=w*.16+wrappedX;
    const bodyY=level+fluidDepth*pixelsPerMeter;

    const topY=bodyY-bodyH/2;
    const bottomY=bodyY+bodyH/2;

    // Use the uploaded makhan-pot artwork as the actual simulation object.
    if(potImage.complete && potImage.naturalWidth>0){
      const imageRatio=potImage.naturalWidth/Math.max(1,potImage.naturalHeight);
      const imageW=bodyH*imageRatio;
      ctx.drawImage(potImage,bodyX-imageW/2,topY,imageW,bodyH);
    }else{
      ctx.fillStyle="#b8784f";
      ctx.beginPath();
      ctx.ellipse(bodyX,bodyY,bodyR,bodyH/2,0,0,TAU);
      ctx.fill();
    }

    // Waterline overlays only the submerged portion.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0,level,w,waterBottom-level);
    ctx.clip();
    ctx.strokeStyle="rgba(85,193,186,.9)";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(bodyX-bodyR*1.05,level);
    ctx.lineTo(bodyX+bodyR*1.05,level);
    ctx.stroke();
    ctx.restore();

    const weightArrow=clamp(25+s.weightForce/12,35,95);
    arrow(bodyX,bodyY+bodyH/2,bodyX,bodyY+bodyH/2+weightArrow,"weight");

    if(values.flow>.05){
      arrow(bodyX-bodyR-62,bodyY-42,bodyX-bodyR-12,bodyY-42,"current");
    }

    ctx.fillStyle="#8ea2b8";
    ctx.font="11px system-ui";
    ctx.fillText("surface",16,level-10);
    ctx.fillText("10 m water column",16,level+27);
    ctx.fillText("gravity only",16,level+45);
    ctx.fillText(s.status,16,level+63);
    ctx.fillText(values.flow>.05?"current →":"no current",Math.max(16,w*.62),waterBottom-22);
  }

  function drawOrbit(){
    const cx=w*.53;
    const cy=h*.5;
    const rState=orbitState();
    const renderRadius=Math.max(values.radius*1.15,rState.r*1.15,1);
    const scale=Math.min(w,h)*.32/renderRadius;

    ctx.strokeStyle="rgba(125,193,255,.22)";
    ctx.beginPath();
    ctx.arc(cx,cy,values.radius*scale,0,TAU);
    ctx.stroke();

    if(orbitTrail.length>1){
      ctx.strokeStyle="rgba(85,193,186,.4)";
      ctx.lineWidth=1.5;
      ctx.beginPath();
      orbitTrail.forEach((p,i)=>{
        const x=cx+p[0]*scale;
        const y=cy-p[1]*scale;
        i?ctx.lineTo(x,y):ctx.moveTo(x,y);
      });
      ctx.stroke();
    }

    ctx.fillStyle="#d4ad63";
    ctx.beginPath();
    ctx.arc(cx,cy,Math.min(38,w*.06),0,TAU);
    ctx.fill();

    const x=cx+orbitX*scale;
    const y=cy-orbitY*scale;

    ctx.fillStyle="#43b5ff";
    ctx.beginPath();
    ctx.arc(x,y,12,0,TAU);
    ctx.fill();

    const tangentAngle=Math.atan2(orbitVY,orbitVX);
    const vLen=clamp(rState.speed*9,22,75);
    arrow(x,y,x+Math.cos(tangentAngle)*vLen,y-Math.sin(tangentAngle)*vLen,"v");

    ctx.fillStyle="#8ea2b8";
    ctx.font="11px system-ui";
    ctx.fillText("central body",cx-31,cy+54);
  }

  function draw(){
    background();
    if(mode==="projectile") drawProjectile();
    else if(mode==="wave") drawWave();
    else if(mode==="rotation") drawRotation();
    else if(mode==="balance") drawBalance();
    else if(mode==="fluid") drawFluid();
    else drawOrbit();
  }

  function setRunning(v){
    running=v;
    state.textContent=v?"RUNNING":"PAUSED";
    play.textContent=v?"Pause":"Play";

    if(v){
      last=performance.now();
      if(!raf) raf=requestAnimationFrame(loop);
    }else{
      if(raf) cancelAnimationFrame(raf);
      raf=0;
      last=0;
      acc=0;
    }
  }

  function stepProjectile(dt){
    projectileX+=projectileVX*dt;
    projectileY+=projectileVY*dt;
    projectileVY-=values.gravity*dt;

    if(projectileY<=0 && time>.05){
      resetProjectile();
    }
  }

  function stepBalance(dt){
    const b=balanceState();
    const angularAcceleration=b.netTorque/b.inertia;
    balanceVelocity+=angularAcceleration*dt;
    balanceAngle+=balanceVelocity*dt;

    if(balanceAngle>.48){
      balanceAngle=.48;
      balanceVelocity=-Math.abs(balanceVelocity)*.18;
    }
    if(balanceAngle<-.48){
      balanceAngle=-.48;
      balanceVelocity=Math.abs(balanceVelocity)*.18;
    }
  }

  function stepFluid(dt){
    const s=fluidState();
    const verticalAcceleration=-G;
    fluidVelocity+=verticalAcceleration*dt;
    fluidVelocity*=Math.pow(.995,dt*60);
    fluidDepth+=fluidVelocity*dt;

    const bottomLimit=waterDepthLimit()-s.height/2;
    const topLimit=-s.height/2;

    if(fluidDepth<topLimit){
      fluidDepth=topLimit;
      if(fluidVelocity<0) fluidVelocity=0;
    }
    if(fluidDepth>bottomLimit){
      fluidDepth=bottomLimit;
      if(fluidVelocity>0) fluidVelocity=0;
    }

    const Cd=.85;
    const area=Math.PI*s.radius*s.radius;
    const relativeFlow=values.flow-fluidVelocityX;
    const dragForce=.5*values.density*Cd*area*relativeFlow*Math.abs(relativeFlow);
    fluidVelocityX+=(dragForce/Math.max(.1,values.mass))*dt;
    fluidVelocityX*=Math.pow(.999,dt*60);
    fluidVelocityX=clamp(fluidVelocityX,-8,8);
    fluidX+=fluidVelocityX*dt;
  }

  function waterDepthLimit(){
    return 10;
  }

  function stepRotation(dt){
    rotationAngle=(rotationAngle+values.omega*dt)%TAU;
  }

  function stepOrbit(dt){
    const substeps=4;
    const subDt=dt/substeps;
    for(let s=0;s<substeps;s++){
      const r2=orbitX*orbitX+orbitY*orbitY;
      const r=Math.max(.08,Math.sqrt(r2));
      const accelFactor=-ORBIT_G*values.mass/(r*r*r);
      const ax=accelFactor*orbitX;
      const ay=accelFactor*orbitY;
      orbitVX+=ax*subDt;
      orbitVY+=ay*subDt;
      orbitX+=orbitVX*subDt;
      orbitY+=orbitVY*subDt;
    }

    if(!Number.isFinite(orbitX)||!Number.isFinite(orbitY)||Math.hypot(orbitX,orbitY)>80){
      resetOrbit();
    }

    if(!orbitTrail.length||Math.hypot(orbitX-orbitTrail[orbitTrail.length-1][0],orbitY-orbitTrail[orbitTrail.length-1][1])>.035){
      orbitTrail.push([orbitX,orbitY]);
      if(orbitTrail.length>220) orbitTrail.shift();
    }
  }

  function loop(now){
    raf=0;
    if(!running) return;

    const dt=Math.min(.05,(now-last)/1000);
    last=now;
    acc+=dt;

    while(acc>=1/60){
      const fixedDt=1/60;
      phase+=fixedDt;
      time+=fixedDt;

      if(mode==="projectile") stepProjectile(fixedDt);
      else if(mode==="balance") stepBalance(fixedDt);
      else if(mode==="fluid") stepFluid(fixedDt);
      else if(mode==="rotation") stepRotation(fixedDt);
      else if(mode==="orbit") stepOrbit(fixedDt);

      acc-=fixedDt;
    }

    draw();
    raf=requestAnimationFrame(loop);
  }

  play.addEventListener("click",()=>setRunning(!running));

  document.getElementById("resetBtn").addEventListener("click",()=>{
    setRunning(false);
    values={...config.defaults};
    time=0;
    phase=0;
    resetProjectile();
    resetRotation();
    resetBalance();
    resetFluid();
    resetOrbit();
    buildControls();
    metricsHtml();
    draw();
  });

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden) setRunning(false);
  });

  window.addEventListener("resize",resize,{passive:true});

  resetProjectile();
  resetRotation();
  resetBalance();
  resetFluid();
  resetOrbit();
  buildControls();
  metricsHtml();
  resize();
})();