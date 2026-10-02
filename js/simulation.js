(() => {
  const canvas=document.getElementById("simCanvas");
  if(!canvas) return;
  const ctx=canvas.getContext("2d",{alpha:false});
  const root=document.querySelector(".simulation-page");
  const mode=root?.dataset.mode||"projectile";
  const config={
    projectile:{title:"Arjuna's Arrow",formula:"R = u² sin(2θ) / g",note:"Adjust the launch conditions, then press Play.",defaults:{angle:45,speed:18,gravity:9.81},controls:[["angle","Launch angle",10,80,1,"°"],["speed","Launch speed",5,30,.5,"m/s"],["gravity","Gravity",1,20,.01,"m/s²"]]},
    wave:{title:"Flute & Sound",formula:"v = fλ",note:"Frequency and amplitude shape the wave; the wave speed stays fixed.",defaults:{frequency:440,amplitude:1,speed:343},controls:[["frequency","Frequency",100,1000,1,"Hz"],["amplitude","Amplitude",.2,2,.1,"×"],["speed","Wave speed",100,500,1,"m/s"]]},
    rotation:{title:"Sudarshan Chakra",formula:"aᶜ = v² / r",note:"Rotate the disc and observe tangential speed and centripetal acceleration.",defaults:{radius:2,omega:5,mass:2},controls:[["radius","Radius",.5,4,.1,"m"],["omega","Angular speed",.5,12,.1,"rad/s"],["mass","Mass",.5,10,.1,"kg"]]},
    balance:{title:"Govardhan Balance",formula:"τ = rF sinφ",note:"A lever experiment with a load on one side and an applied effort on the other. Change the effort to see the beam respond.",defaults:{mass:80,loadArm:2.2,effortArm:3,effort:650},controls:[["mass","Load mass",10,200,1,"kg"],["loadArm","Load arm",.5,4,.1,"m"],["effortArm","Effort arm",.5,5,.1,"m"],["effort","Effort force",50,1200,10,"N"]]},
    fluid:{title:"Yamuna Pressure",formula:"p = ρgh",note:"Play to animate a visible river current while the floating body drifts, bobs and responds to buoyancy.",defaults:{depth:4,density:1000,volume:.08,flow:1.4},controls:[["depth","Depth",.2,10,.1,"m"],["density","Water density",700,1200,1,"kg/m³"],["volume","Body volume",.02,.2,.01,"m³"],["flow","River flow",.2,4,.1,"m/s"]]},
    orbit:{title:"Kanha Sky",formula:"v = √(GM / r)",note:"Play the stable orbit model. Change radius or speed to explore the relationship.",defaults:{radius:3,mass:120,velocity:6},controls:[["radius","Orbit radius",1,6,.1,"AU"],["mass","Central mass",30,250,1,"M"],["velocity","Orbital speed",2,12,.1,"km/s"]]}
  }[mode];
  let values={...config.defaults},running=false,raf=0,last=0,acc=0,time=0,dpr=1,w=0,h=0;
  let phase=0,balanceAngle=0.05,balanceVelocity=0,fluidX=0;
  const bg=document.createElement("canvas"),bgc=bg.getContext("2d",{alpha:false});
  const controls=document.getElementById("controlsMount"),metrics=document.getElementById("metrics"),title=document.getElementById("labTitle"),formula=document.getElementById("formula"),note=document.getElementById("labNote"),state=document.getElementById("stateHud"),play=document.getElementById("playBtn");
  title.textContent=config.title;formula.textContent=config.formula;note.textContent=config.note;document.getElementById("modeHud").textContent=config.title.toUpperCase();

  function metricsHtml(){
    const m=[];
    if(mode==="projectile"){
      const a=values.angle*Math.PI/180,u=values.speed,g=values.gravity,t=2*u*Math.sin(a)/g,r=u*u*Math.sin(2*a)/g,hm=(u*Math.sin(a))**2/(2*g);
      m.push(["Range",r.toFixed(2)+" m"],["Max height",hm.toFixed(2)+" m"],["Flight time",t.toFixed(2)+" s"],["Vertical speed",(u*Math.sin(a)).toFixed(2)+" m/s"]);
    }else if(mode==="wave"){
      const l=values.speed/values.frequency;m.push(["Wavelength",l.toFixed(3)+" m"],["Frequency",values.frequency.toFixed(0)+" Hz"],["Amplitude",values.amplitude.toFixed(1)+" ×"],["Wave speed",values.speed.toFixed(0)+" m/s"]);
    }else if(mode==="rotation"){
      const v=values.radius*values.omega,ac=v*v/values.radius,ke=.5*values.mass*v*v;m.push(["Tangential speed",v.toFixed(2)+" m/s"],["Centripetal accel.",ac.toFixed(2)+" m/s²"],["Angular speed",values.omega.toFixed(2)+" rad/s"],["Kinetic energy",ke.toFixed(2)+" J"]);
    }else if(mode==="balance"){
      const g=9.81,load=values.mass*g,required=load*values.loadArm/Math.max(.1,values.effortArm),net=values.effort*values.effortArm*Math.cos(balanceAngle)-load*values.loadArm*Math.cos(balanceAngle);
      m.push(["Load force",load.toFixed(1)+" N"],["Effort force",values.effort.toFixed(0)+" N"],["Required effort",required.toFixed(1)+" N"],["Net torque",net.toFixed(1)+" N·m"]);
    }else if(mode==="fluid"){
      const p=values.density*9.81*values.depth,b=values.density*9.81*values.volume;m.push(["Pressure",Math.round(p)+" Pa"],["Buoyant force",b.toFixed(2)+" N"],["Depth",values.depth.toFixed(1)+" m"],["River flow",values.flow.toFixed(1)+" m/s"]);
    }else{
      const ideal=Math.sqrt(values.mass*20/values.radius),ratio=values.velocity/ideal;m.push(["Ideal speed",ideal.toFixed(2)+" km/s"],["Current speed",values.velocity.toFixed(2)+" km/s"],["Speed ratio",ratio.toFixed(2)],["Radius",values.radius.toFixed(1)+" AU"]);
    }
    metrics.innerHTML=m.map(x=>'<div class="metric"><label>'+x[0]+'</label><strong>'+x[1]+'</strong></div>').join("");
  }

  function buildControls(){
    controls.innerHTML="";
    config.controls.forEach(([key,label,min,max,step,unit])=>{
      const g=document.createElement("div");g.className="control-group";
      const id="ctrl-"+key;
      g.innerHTML='<div class="control-row"><label for="'+id+'">'+label+'</label><span class="control-value" id="value-'+key+'"></span></div><input id="'+id+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+values[key]+'">';
      controls.appendChild(g);
      const input=g.querySelector("input"),out=g.querySelector(".control-value");
      const sync=()=>{values[key]=Number(input.value);out.textContent=input.value+" "+unit;metricsHtml();draw();};
      input.addEventListener("input",sync);sync();
    });
  }

  function resize(){
    const r=canvas.getBoundingClientRect();
    dpr=Math.min(devicePixelRatio||1,window.innerWidth<700?1.25:1.5);
    w=Math.max(300,r.width);h=Math.max(300,r.height);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    bg.width=Math.round(w*dpr);bg.height=Math.round(h*dpr);bgc.setTransform(dpr,0,0,dpr,0,0);
    bgc.fillStyle="#071320";bgc.fillRect(0,0,w,h);
    bgc.strokeStyle="rgba(255,255,255,.035)";bgc.lineWidth=1;
    for(let x=0;x<w;x+=48){bgc.beginPath();bgc.moveTo(x,0);bgc.lineTo(x,h);bgc.stroke()}
    for(let y=0;y<h;y+=48){bgc.beginPath();bgc.moveTo(0,y);bgc.lineTo(w,y);bgc.stroke()}
    draw();
  }
  new ResizeObserver(resize).observe(canvas);

  function background(){
    ctx.fillStyle="#071320";ctx.fillRect(0,0,w,h);
    ctx.drawImage(bg,0,0,w,h);
    const g=ctx.createRadialGradient(w*.55,h*.42,10,w*.55,h*.42,Math.min(w,h)*.48);
    g.addColorStop(0,"rgba(29,124,255,.12)");g.addColorStop(1,"rgba(7,19,32,0)");
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  function arrow(x,y,tx,ty,label){
    ctx.strokeStyle="#d4ad63";ctx.fillStyle="#d4ad63";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();
    const a=Math.atan2(ty-y,tx-x);ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-8*Math.cos(a-.4),ty-8*Math.sin(a-.4));ctx.lineTo(tx-8*Math.cos(a+.4),ty-8*Math.sin(a+.4));ctx.closePath();ctx.fill();
    if(label){ctx.fillStyle="#b9cbe0";ctx.font="10px system-ui";ctx.fillText(label,(x+tx)/2+6,(y+ty)/2)}
  }
  function drawProjectile(){
    const ground=h*.78,left=70,scale=Math.min((w-120)/30,h/18),a=values.angle*Math.PI/180,u=values.speed,g=values.gravity,tmax=2*u*Math.sin(a)/g;
    ctx.strokeStyle="rgba(240,246,255,.15)";ctx.beginPath();ctx.moveTo(left,ground);ctx.lineTo(w-40,ground);ctx.stroke();
    ctx.strokeStyle="rgba(125,193,255,.6)";ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<=60;i++){const t=tmax*i/60,x=left+u*Math.cos(a)*t*scale,y=ground-(u*Math.sin(a)*t-.5*g*t*t)*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();
    const t=Math.min(time,tmax),x=left+u*Math.cos(a)*t*scale,y=ground-(u*Math.sin(a)*t-.5*g*t*t)*scale;
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle="#edf5ff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(14,0);ctx.stroke();ctx.fillStyle="#d4ad63";ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(7,-4);ctx.lineTo(7,4);ctx.closePath();ctx.fill();ctx.restore();
    arrow(left+22,ground-20,left+22+u*Math.cos(a)*2.2,ground-20-u*Math.sin(a)*2.2,"v");
  }
  function drawWave(){
    const cy=h*.5,amp=values.amplitude*Math.min(70,h*.12),wl=Math.max(45,(values.speed/values.frequency)*90);
    ctx.strokeStyle="rgba(240,246,255,.16)";ctx.beginPath();ctx.moveTo(45,cy);ctx.lineTo(w-40,cy);ctx.stroke();
    ctx.strokeStyle="#55c1ba";ctx.lineWidth=2.2;ctx.beginPath();
    for(let x=45;x<w-35;x+=4){const y=cy+Math.sin((x/wl)*Math.PI*2-phase)*amp;x===45?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();
    ctx.fillStyle="#edf5ff";ctx.font="12px system-ui";ctx.fillText("Amplitude",58,cy-amp-10);ctx.fillStyle="#8ea2b8";ctx.fillText("Wavelength →",w*.62,cy+amp+26);
  }
  function drawRotation(){
    const cx=w*.53,cy=h*.5,r=Math.min(w,h)*.22;
    ctx.save();ctx.translate(cx,cy);ctx.scale(1,.34);ctx.rotate(phase*.5);ctx.fillStyle="rgba(212,173,99,.08)";ctx.strokeStyle="rgba(212,173,99,.24)";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle="rgba(85,193,186,.82)";ctx.lineWidth=5;for(let i=0;i<12;i++){ctx.rotate(Math.PI/6);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*.92,0);ctx.stroke()}ctx.fillStyle="#d4ad63";ctx.beginPath();ctx.arc(0,0,r*.19,0,Math.PI*2);ctx.fill();ctx.restore();
    arrow(cx,cy-r*.34,cx+r*.7,cy-r*.34,"tangential");
  }
  function drawBalance(){
    const pivotX=w*.52,pivotY=h*.56,scale=Math.min(w*.14,62),left=values.loadArm*scale,right=values.effortArm*scale,a=balanceAngle;
    const loadX=pivotX-left*Math.cos(a),loadY=pivotY-left*Math.sin(a);
    const effortX=pivotX+right*Math.cos(a),effortY=pivotY+right*Math.sin(a);

    // Lever with subtle depth.
    ctx.save();
    ctx.translate(pivotX,pivotY);
    ctx.rotate(a);
    ctx.strokeStyle="rgba(15,26,38,.5)";ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-left,4);ctx.lineTo(right,4);ctx.stroke();
    ctx.strokeStyle="#557088";ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(-left,0);ctx.lineTo(right,0);ctx.stroke();
    ctx.strokeStyle="rgba(212,173,99,.5)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-left,-4);ctx.lineTo(right,-4);ctx.stroke();
    ctx.restore();

    // Pivot/support.
    ctx.fillStyle="#d4ad63";ctx.beginPath();ctx.moveTo(pivotX-18,pivotY+10);ctx.lineTo(pivotX+18,pivotY+10);ctx.lineTo(pivotX,pivotY+76);ctx.closePath();ctx.fill();
    ctx.fillStyle="#091522";ctx.beginPath();ctx.arc(pivotX,pivotY,8,0,Math.PI*2);ctx.fill();

    // Load.
    ctx.fillStyle="#1d7cff";ctx.beginPath();ctx.arc(loadX,loadY,23,0,Math.PI*2);ctx.fill();
    arrow(loadX,loadY,loadX,loadY+86,"load");
    ctx.fillStyle="#b9cbe0";ctx.font="11px system-ui";ctx.fillText(values.mass.toFixed(0)+" kg",loadX-18,loadY-31);

    // Applied effort.
    ctx.fillStyle="#25b8ad";ctx.beginPath();ctx.arc(effortX,effortY,19,0,Math.PI*2);ctx.fill();
    arrow(effortX,effortY,effortX,effortY-86,"effort");
    ctx.fillStyle="#b9cbe0";ctx.fillText(values.effort.toFixed(0)+" N",effortX-19,effortY+37);

    // Support force.
    arrow(pivotX,pivotY+55,pivotX,pivotY-5,"support");
    ctx.fillStyle="#8ea2b8";ctx.fillText("pivot",pivotX+13,pivotY+24);
  }
  function drawFluid(){
    const top=h*.16,bottom=h*.90,level=top+(bottom-top)*.16,waterBottom=bottom;
    ctx.fillStyle="rgba(34,184,173,.14)";ctx.fillRect(0,level,w,waterBottom-level);

    // Moving surface.
    ctx.strokeStyle="rgba(85,193,186,.82)";ctx.lineWidth=2;ctx.beginPath();
    for(let x=0;x<=w;x+=5){
      const y=level+Math.sin(x*.035+phase*1.7)*2.8+Math.sin(x*.014-phase*.8)*1.4;
      x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Lightweight current streaks that visibly travel across the river.
    ctx.strokeStyle="rgba(125,193,255,.23)";ctx.lineWidth=1.2;
    for(let row=0;row<6;row++){
      const y=level+45+row*(waterBottom-level-90)/5;
      const offset=((phase*values.flow*34)+row*80)%(w+120)-60;
      for(let n=0;n<4;n++){
        const x=offset+n*150;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+48,y);ctx.stroke();
      }
    }

    // Floating body moves with the current instead of only bobbing in place.
    const travelWidth=Math.max(160,w*.72);
    const bodyX=w*.14+((fluidX*values.flow*70)%travelWidth);
    const targetDepth=Math.min(.82,.2+values.depth/10*.62);
    const bodyY=level+(waterBottom-level)*targetDepth+Math.sin(phase*2.1)*7;
    const bodyR=26;
    ctx.fillStyle="#d4ad63";ctx.beginPath();ctx.arc(bodyX,bodyY,bodyR,0,Math.PI*2);ctx.fill();

    // Direction of flow.
    arrow(bodyX-70,bodyY-48,bodyX-20,bodyY-48,"current");
    arrow(bodyX,bodyY-43,bodyX,bodyY-74,"buoyancy");
    arrow(bodyX,bodyY+6,bodyX,bodyY+46,"weight");

    ctx.fillStyle="#8ea2b8";ctx.font="11px system-ui";
    ctx.fillText("surface",16,level-10);
    ctx.fillText(values.depth.toFixed(1)+" m depth",16,level+27);
    ctx.fillText("river current →",Math.max(16,w*.62),waterBottom-22);
  }
  function drawOrbit(){
    const cx=w*.53,cy=h*.5,r=Math.min(w,h)*.27,ang=phase*.24;
    ctx.strokeStyle="rgba(125,193,255,.28)";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="rgba(212,173,99,.18)";ctx.beginPath();ctx.arc(cx,cy,r*.72,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#d4ad63";ctx.beginPath();ctx.arc(cx,cy,Math.min(38,w*.06),0,Math.PI*2);ctx.fill();
    const x=cx+r*Math.cos(ang),y=cy+r*.58*Math.sin(ang);ctx.fillStyle="#43b5ff";ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();arrow(x,y,x+28*Math.cos(ang+Math.PI/2),y+17*Math.sin(ang+Math.PI/2),"v");
  }
  function draw(){background();if(mode==="projectile")drawProjectile();else if(mode==="wave")drawWave();else if(mode==="rotation")drawRotation();else if(mode==="balance")drawBalance();else if(mode==="fluid")drawFluid();else drawOrbit()}
  function setRunning(v){running=v;state.textContent=v?"RUNNING":"PAUSED";play.textContent=v?"Pause":"Play";if(v){last=performance.now();if(!raf)raf=requestAnimationFrame(loop)}else{if(raf)cancelAnimationFrame(raf);raf=0;last=0;acc=0}}
  function loop(now){raf=0;if(!running)return;const dt=Math.min(.05,(now-last)/1000);last=now;acc+=dt;while(acc>=1/60){
      phase+=1/60;
      time+=1/60;

      if(mode==="projectile"){
        const tmax=2*values.speed*Math.sin(values.angle*Math.PI/180)/values.gravity;
        if(time>tmax)time=0;
      }

      if(mode==="balance"){
        const g=9.81;
        const load=values.mass*g;
        const netTorque=(values.effort*values.effortArm-load*values.loadArm)*Math.cos(balanceAngle);
        const inertia=Math.max(.5,(values.mass*values.loadArm*values.loadArm+values.effort*values.effortArm*values.effortArm)*.35);
        const angularAcceleration=netTorque/inertia;
        balanceVelocity+=angularAcceleration*(1/60);
        balanceVelocity*=.985;
        balanceAngle+=balanceVelocity*(1/60);
        if(balanceAngle>.48){balanceAngle=.48;balanceVelocity*=-.2}
        if(balanceAngle<-.48){balanceAngle=-.48;balanceVelocity*=-.2}
      }

      if(mode==="fluid"){
        fluidX+=1/60;
      }

      acc-=1/60;
    }draw();raf=requestAnimationFrame(loop)}
  play.addEventListener("click",()=>setRunning(!running));
  document.getElementById("resetBtn").addEventListener("click",()=>{setRunning(false);values={...config.defaults};phase=0;time=0;balanceAngle=0.05;balanceVelocity=0;fluidX=0;buildControls();metricsHtml();draw()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)setRunning(false)});
  window.addEventListener("resize",resize,{passive:true});
  buildControls();metricsHtml();resize();
})();
