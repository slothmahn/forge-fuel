(()=>{
 const art=document.querySelector('.hero-art'),svg=art.querySelector('.more-orbit-rings');
 function layout(){
  const w=art.clientWidth,h=art.clientHeight;if(!w||!h)return;
  const cx=w/2,cy=h*.44,rx=Math.min(w*.36,195),ry=rx*.53,gap=w<400?15:21,angle=-25*Math.PI/180;
  const path=(x,y)=>Array.from({length:181},(_,i)=>{const t=i*Math.PI/90,a=x*Math.cos(t),b=y*Math.sin(t);return `${i?'L':'M'}${(cx+a*Math.cos(angle)-b*Math.sin(angle)).toFixed(3)},${(cy+a*Math.sin(angle)+b*Math.cos(angle)).toFixed(3)}`}).join(' ')+' Z';
  const paths=[-1,0,1].map(n=>path(rx+n*gap,ry+n*gap));
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.querySelector('.orbit-lines').innerHTML=paths.map(d=>`<path d="${d}"/>`).join('');
  svg.querySelector('.orbit-embers').innerHTML=paths.map((d,i)=>`<path d="${d}" pathLength="100" style="animation-delay:-${i*8}s"/>`).join('');
  art.style.setProperty('--more-orbit-path',`path('${paths[1]}')`);
 }
 new ResizeObserver(layout).observe(art);layout();
})();
