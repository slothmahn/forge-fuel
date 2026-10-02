(()=>{
 const art=document.querySelector('.hero-art'),svg=art.querySelector('.more-orbit-rings');
 function layout(){
  const w=art.clientWidth,h=art.clientHeight;if(!w||!h)return;
  const cx=w/2,cy=h*.44,rx=Math.min(w*.36,195),ry=rx*.53,gap=w<400?15:21,angle=-25*Math.PI/180;
  const path=(x,y)=>Array.from({length:181},(_,i)=>{const t=i*Math.PI/90,a=x*Math.cos(t),b=y*Math.sin(t);return `${i?'L':'M'}${(cx+a*Math.cos(angle)-b*Math.sin(angle)).toFixed(3)},${(cy+a*Math.sin(angle)+b*Math.cos(angle)).toFixed(3)}`}).join(' ')+' Z';
  const paths=[-1,0,1].map(n=>path(rx+n*gap,ry+n*gap));
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.querySelector('.orbit-lines').innerHTML=paths.map(d=>`<path d="${d}"/>`).join('');
  svg.querySelector('.orbit-embers').innerHTML='';
  art.style.setProperty('--more-orbit-path',`path('${paths[1]}')`);
 }
 const trails=document.createElement('div');trails.className='token-flame-trails';trails.setAttribute('aria-hidden','true');
 trails.innerHTML=[0,1].map(token=>Array.from({length:12},(_,i)=>{
  const size=1-i*.065,delay=.8+i*.28-token*18;
  return `<span class="orbit-flame" style="--trail-size:${size};--trail-opacity:${.9-i*.055};animation-delay:${delay}s"><svg viewBox="0 0 48 24"><path fill="#ff502b" d="M48 12C35 0 25 4 8 1l9 9L0 8l11 8-7 6c18-3 31 6 44-10Z"/><path fill="#ffa52f" d="M46 12C34 6 25 9 15 6l6 7-9 4c16-2 24 4 34-5Z"/><path fill="#ffe58b" d="M47 12c-9-3-15-2-22-3l4 4-6 3c10-2 15 1 24-4Z"/></svg></span>`;
 }).join('')).join('');art.append(trails);
 new ResizeObserver(layout).observe(art);layout();
})();
