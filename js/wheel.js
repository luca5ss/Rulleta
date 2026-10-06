import { POCKETS, RED_NUMBERS } from "./physics.js";

const TAU = Math.PI * 2;
const STEP = TAU / POCKETS.length;

export class WheelRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.grain = this.makeGrain();
    this.particles = [];
    this.lastEventTime = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  makeGrain() {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const g = c.getContext("2d");
    g.fillStyle = "#4b2918";
    g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 155; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const length = 14 + Math.random() * 100;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 8, y + length * .3, x - 7, y + length * .7, x + 2, y + length);
      g.strokeStyle = Math.random() > .48 ? "#d0a56b12" : "#0c06052a";
      g.lineWidth = .4 + Math.random() * 2.2;
      g.stroke();
    }
    return c;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * scale);
    this.canvas.height = Math.round(rect.height * scale);
    this.size = rect.width * scale;
  }

  draw(state, now = 0, reducedMotion = false, appearance = { id: "ivory" }) {
    const ctx = this.ctx;
    const size = this.size || this.canvas.width;
    const center = size / 2;
    const scale = size / 720;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.scale(scale, scale);

    this.drawWood(ctx);
    this.drawTrack(ctx, now);
    this.drawRotor(ctx, state.rotor, reducedMotion);
    this.drawBall(ctx, state, now, reducedMotion, appearance);
    this.drawImpacts(ctx, state.events, now, reducedMotion);
    ctx.restore();
  }

  drawWood(ctx) {
    const radial = ctx.createRadialGradient(-125, -155, 25, 0, 0, 355);
    radial.addColorStop(0, "#995d34");
    radial.addColorStop(.34, "#5b351f");
    radial.addColorStop(.7, "#2d190f");
    radial.addColorStop(1, "#120a07");
    ctx.beginPath(); ctx.arc(0, 0, 350, 0, TAU); ctx.fillStyle = radial; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(0,0,343,0,TAU); ctx.clip(); ctx.globalAlpha=.22;
    ctx.drawImage(this.grain, -350, -350, 700, 700); ctx.restore();
    [342, 334, 307, 298, 287].forEach((r, index) => {
      ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.strokeStyle = index % 2 ? "#d7b573" : "#180d08"; ctx.lineWidth = index % 2 ? 2.1 : 5; ctx.stroke();
    });
    const channel = ctx.createRadialGradient(0,0,269,0,0,294);
    channel.addColorStop(0,"#3d2619"); channel.addColorStop(.45,"#94704a"); channel.addColorStop(.5,"#c7a96f"); channel.addColorStop(.59,"#382318"); channel.addColorStop(1,"#20130d");
    ctx.beginPath(); ctx.arc(0,0,291,0,TAU); ctx.arc(0,0,267,0,TAU,true); ctx.fillStyle=channel; ctx.fill("evenodd");
    [292,268].forEach(r=>{ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.strokeStyle="#f0d59a99";ctx.lineWidth=2;ctx.stroke()});
    const apron = ctx.createRadialGradient(-40,-80,20,0,0,270);
    apron.addColorStop(0,"#8a6440");apron.addColorStop(.62,"#50331f");apron.addColorStop(1,"#25160e");
    ctx.beginPath();ctx.arc(0,0,266,0,TAU);ctx.arc(0,0,231,0,TAU,true);ctx.fillStyle=apron;ctx.fill("evenodd");
    ctx.strokeStyle="#d2af70";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,232,0,TAU);ctx.stroke();
    this.drawDeflectors(ctx);
  }

  drawDeflectors(ctx) {
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + Math.PI / 8;
      const x = Math.cos(a) * 248, y = Math.sin(a) * 248;
      ctx.save(); ctx.translate(x,y); ctx.rotate(a + Math.PI/4);
      const metal=ctx.createLinearGradient(-16,-10,16,10);metal.addColorStop(0,"#704d2b");metal.addColorStop(.4,"#f0d08c");metal.addColorStop(.7,"#9f7438");metal.addColorStop(1,"#4e361f");
      ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(12,0);ctx.lineTo(0,15);ctx.lineTo(-12,0);ctx.closePath();ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle="#f2d79b";ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,3.4,0,TAU);ctx.fillStyle="#fff0c6";ctx.fill();ctx.restore();
    }
  }

  drawTrack(ctx, now) {
    const gradient=ctx.createRadialGradient(-30,-30,250,0,0,280);
    gradient.addColorStop(0,"#d4b67a");gradient.addColorStop(.12,"#543923");gradient.addColorStop(.55,"#a78552");gradient.addColorStop(.74,"#4c321e");gradient.addColorStop(1,"#25170e");
    ctx.beginPath();ctx.arc(0,0,266,0,TAU);ctx.arc(0,0,253,0,TAU,true);ctx.fillStyle=gradient;ctx.fill("evenodd");
    ctx.strokeStyle="#ecd19a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,264,0,TAU);ctx.stroke();
    ctx.strokeStyle="#d0ac70";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,255,0,TAU);ctx.stroke();
    ctx.save(); ctx.rotate(now * .00015);
    for (let i = 0; i < 60; i++) {
      const a = i * TAU / 60;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*258,Math.sin(a)*258);ctx.lineTo(Math.cos(a)*261,Math.sin(a)*261);ctx.strokeStyle="#fff0c266";ctx.lineWidth=1;ctx.stroke();
    }
    ctx.restore();
  }

  drawRotor(ctx, angle, reducedMotion) {
    ctx.save(); ctx.rotate(angle);
    const base=ctx.createRadialGradient(-36,-45,15,0,0,231);base.addColorStop(0,"#432719");base.addColorStop(.75,"#1d100b");base.addColorStop(1,"#78502d");
    ctx.beginPath();ctx.arc(0,0,232,0,TAU);ctx.fillStyle=base;ctx.fill();
    ctx.strokeStyle="#dbb874";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,231,0,TAU);ctx.stroke();
    for (let i=0;i<37;i++) {
      const start=-Math.PI/2+i*STEP;
      const number=POCKETS[i];
      ctx.beginPath();ctx.moveTo(Math.cos(start)*225,Math.sin(start)*225);ctx.arc(0,0,225,start,start+STEP);ctx.lineTo(Math.cos(start+STEP)*143,Math.sin(start+STEP)*143);ctx.arc(0,0,143,start+STEP,start,true);ctx.closePath();
      const fill=number===0?"#176447":RED_NUMBERS.has(number)?"#8b2428":"#151614";
      ctx.fillStyle=fill;ctx.fill();
      const sheen=ctx.createLinearGradient(0,-224,0,-143);sheen.addColorStop(0,"#ffffff18");sheen.addColorStop(.48,"transparent");sheen.addColorStop(1,"#00000032");ctx.fillStyle=sheen;ctx.fill();
      ctx.strokeStyle="#b98e4f";ctx.lineWidth=1.4;ctx.stroke();
      ctx.save();ctx.rotate(start+STEP/2+Math.PI/2);ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="600 19px Georgia,serif";ctx.fillStyle="#f1e3c6";ctx.shadowColor="#000";ctx.shadowBlur=2;ctx.fillText(String(number),0,-184);ctx.restore();
    }
    for (let i=0;i<37;i++) {
      const a=-Math.PI/2+i*STEP;
      const metal=ctx.createLinearGradient(-3,-228,3,-143);metal.addColorStop(0,"#f2d18a");metal.addColorStop(.45,"#725027");metal.addColorStop(.72,"#e4bf73");metal.addColorStop(1,"#563b20");
      ctx.beginPath();ctx.moveTo(Math.cos(a)*143,Math.sin(a)*143);ctx.lineTo(Math.cos(a)*228,Math.sin(a)*228);ctx.strokeStyle=metal;ctx.lineWidth=3.1;ctx.stroke();
    }
    [142,229].forEach((r,i)=>{ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.strokeStyle=i?"#eed08d":"#caa562";ctx.lineWidth=i?2:3;ctx.stroke()});
    this.drawCone(ctx, reducedMotion);
    ctx.restore();
  }

  drawCone(ctx, reducedMotion) {
    const cone=ctx.createRadialGradient(-20,-25,4,0,0,139);cone.addColorStop(0,"#9a6336");cone.addColorStop(.45,"#633719");cone.addColorStop(.83,"#382014");cone.addColorStop(1,"#d1a461");
    ctx.beginPath();ctx.arc(0,0,140,0,TAU);ctx.fillStyle=cone;ctx.fill();ctx.strokeStyle="#e4c27d";ctx.lineWidth=3;ctx.stroke();
    for(let i=0;i<28;i++){const a=i*TAU/28;ctx.beginPath();ctx.moveTo(Math.cos(a)*28,Math.sin(a)*28);ctx.lineTo(Math.cos(a)*134,Math.sin(a)*134);ctx.strokeStyle=i%2?"#d0a36425":"#150b0755";ctx.lineWidth=2;ctx.stroke()}
    ctx.beginPath();ctx.arc(0,0,36,0,TAU);ctx.fillStyle="#bb8b4d";ctx.fill();ctx.strokeStyle="#f2d18a";ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,26,0,TAU);ctx.fillStyle="#72502a";ctx.fill();ctx.strokeStyle="#e3bf77";ctx.lineWidth=2;ctx.stroke();
    const glint=ctx.createLinearGradient(-12,-20,12,19);glint.addColorStop(0,"#fff1bd");glint.addColorStop(.3,"#d8ad61");glint.addColorStop(.62,"#795020");glint.addColorStop(1,"#f2d38b");
    ctx.save();ctx.rotate(reducedMotion?0:performance.now()*.0003);ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(9,-4);ctx.lineTo(23,0);ctx.lineTo(9,5);ctx.lineTo(0,23);ctx.lineTo(-8,5);ctx.lineTo(-23,0);ctx.lineTo(-8,-4);ctx.closePath();ctx.fillStyle=glint;ctx.fill();ctx.strokeStyle="#f5de9e";ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    ctx.beginPath();ctx.arc(-5,-8,3,0,TAU);ctx.fillStyle="#fff3cf";ctx.fill();
  }

  drawBall(ctx, state, now, reducedMotion, appearance) {
    const r=state.radius*285;
    const x=Math.cos(state.angle)*r, y=Math.sin(state.angle)*r-state.height*25;
    const ballStyle = {
      ivory: ["#fffced", "#e9d9b5", "#b8a27c", "#776246"],
      gold: ["#fff0a8", "#e0b34f", "#a96b1e", "#694013"],
      diamond: ["#ffffff", "#d8f5ff", "#81b8c4", "#467685"],
      ruby: ["#ffd2bd", "#e2564b", "#971e2e", "#51121d"],
      emerald: ["#e2ffe0", "#5fc37a", "#176542", "#0a362a"],
      sapphire: ["#e2f2ff", "#568fe0", "#214983", "#111e42"],
      obsidian: ["#eee8d9", "#756b5a", "#29231e", "#080808"],
    }[appearance.id] || ["#fffced", "#e9d9b5", "#b8a27c", "#776246"];
    const speed=Math.abs(state.angle-(this.previousAngle??state.angle));
    this.previousAngle=state.angle;
    ctx.save();
    if(!reducedMotion&&speed>.035){ctx.globalAlpha=Math.min(.26,speed*1.3);for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(Math.cos(state.angle-speed*i*1.7)*r,Math.sin(state.angle-speed*i*1.7)*r-state.height*25,10-i*1.5,0,TAU);ctx.fillStyle=ballStyle[1];ctx.fill()}}
    ctx.beginPath();ctx.ellipse(x+4,y+9,12,7,0,0,TAU);ctx.fillStyle="#0009";ctx.fill();
    const shade=ctx.createRadialGradient(x-4,y-5,1,x,y,12);shade.addColorStop(0,ballStyle[0]);shade.addColorStop(.43,ballStyle[1]);shade.addColorStop(.8,ballStyle[2]);shade.addColorStop(1,ballStyle[3]);
    ctx.beginPath();ctx.arc(x,y,11,0,TAU);ctx.fillStyle=shade;ctx.fill();ctx.strokeStyle="#fff0ca";ctx.lineWidth=1.2;ctx.stroke();
    if(appearance.id==="diamond"){
      ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x,y+7);ctx.lineTo(x-6,y);ctx.closePath();ctx.strokeStyle="#fff";ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x-5,y-3);ctx.lineTo(x+5,y+3);ctx.moveTo(x+4,y-5);ctx.lineTo(x-4,y+5);ctx.stroke();
    } else if(appearance.id==="gold") {
      ctx.beginPath();ctx.arc(x,y,5,Math.PI*.15,Math.PI*1.2);ctx.strokeStyle="#fff0af";ctx.lineWidth=1;ctx.stroke();
    } else if(["ruby","emerald","sapphire","obsidian"].includes(appearance.id)) {
      ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+5,y-1);ctx.lineTo(x+2,y+6);ctx.lineTo(x-5,y+3);ctx.lineTo(x-4,y-4);ctx.closePath();ctx.strokeStyle="#ffffff9c";ctx.lineWidth=.9;ctx.stroke();
    }
    ctx.beginPath();ctx.ellipse(x-4,y-5,3.6,2.1,-.5,0,TAU);ctx.fillStyle="#fff";ctx.fill();
    ctx.restore();
  }

  drawImpacts(ctx, events, now, reducedMotion) {
    if (reducedMotion) return;
    for (const event of events) {
      if (event.time <= this.lastEventTime) continue;
      this.lastEventTime=event.time;
      const x=Math.cos(event.angle)*238,y=Math.sin(event.angle)*238;
      for(let i=0;i<9;i++) this.particles.push({x,y,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,life:.45,max:.45});
    }
    const dt=1/60;
    this.particles=this.particles.filter(p=>p.life>0);
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle="#f0c76e";ctx.fillRect(p.x,p.y,2.5,2.5)}
    ctx.globalAlpha=1;
  }
}