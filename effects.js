const q = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function animatedRecommendationText(value,kind) {
 let letter=0;
 const words=String(value).split(' ').map((word,index,all)=>'<span class="recommendation-word">'+Array.from(word).map(char=>'<span class="recommendation-letter" style="--letter-delay:'+(letter++*3)+'ms">'+esc(char)+'</span>').join('')+(index<all.length-1?'<span class="recommendation-letter" style="--letter-delay:'+(letter++*3)+'ms">&nbsp;</span>':'')+'</span>').join('');
 return '<span class="'+(kind === 'label' ? 'recommendation-title' : 'recommendation-message')+' recommendation-animated"><span class="sr-only">'+esc(value)+'</span><span class="recommendation-animated-visual" aria-hidden="true">'+words+'</span></span>';
}

// Rising dust adapted from mishanaer/joipro (MIT); see THIRD_PARTY_NOTICES.md.
const RECOMMENDATION_DUST={life:.7,peak:.55,inset:16,speedMin:3,speedRange:7.8,radiusMin:.45,radiusRange:.7,count:32};
let recommendationDustStrength=.9,recommendationDustSize=1.4,recommendationDustColor='#baa8ff';
function setRecommendationDustStrength(value) {
 const percentage=Math.max(0,Math.min(100,Number(value)||0));recommendationDustStrength=percentage/100;return percentage;
}
function setRecommendationDustSize(value) {
 const number=Number(value),percentage=Number.isFinite(number)?Math.max(50,Math.min(200,number)):recommendationDustSize*100;recommendationDustSize=percentage/100;return percentage;
}
function setRecommendationDustColor(value) {
 const color=String(value);if(/^#[0-9a-f]{6}$/i.test(color))recommendationDustColor=color.toLowerCase();return recommendationDustColor;
}
function recommendationDustHash(index,channel) {
 let value=Math.imul(index^0x9e3779b9,0x85ebca6b)^Math.imul(channel+1,0xc2b2ae35);
 value=Math.imul(value^(value>>>15),0x2c1b3c6d);value=Math.imul(value^(value>>>12),0x297a2d39);
 return ((value^(value>>>15))>>>0)/4294967296;
}
function recommendationParticlesAt(time,width,height) {
 const d=RECOMMENDATION_DUST,spanX=width-d.inset*2,spanY=height-d.inset*2;if(spanX<=0||spanY<=0)return [];
 const rate=d.count/d.life,particles=[],first=Math.floor((time-d.life)*rate)-1,last=Math.floor(time*rate);
 for(let index=first;index<=last;index++){
  const age=time-(index+recommendationDustHash(index,0))/rate;if(age<0||age>=d.life)continue;
  const progress=age/d.life;
  particles.push({x:d.inset+recommendationDustHash(index,1)*spanX,y:d.inset+recommendationDustHash(index,2)*spanY-(d.speedMin+recommendationDustHash(index,3)*d.speedRange)*age,radius:(d.radiusMin+recommendationDustHash(index,4)*d.radiusRange)*(1-progress/2),alpha:progress<d.peak?progress/d.peak:(1-progress)/(1-d.peak)});
 }
 return particles;
}
function initRecommendationDust() {
 const canvas=q('.recommendation-dust');if(!canvas||typeof ResizeObserver==='undefined')return;
 const card=canvas.parentElement,context=canvas.getContext('2d');if(!context)return;
 let width=0,height=0,ratio=1,frame=0,clock=0,previous=performance.now();
 const draw=()=>{context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);context.fillStyle=recommendationDustColor;for(const particle of recommendationParticlesAt(clock,width,height)){context.globalAlpha=particle.alpha*recommendationDustStrength;context.beginPath();context.arc(particle.x,particle.y,particle.radius*recommendationDustSize,0,Math.PI*2);context.fill();}context.globalAlpha=1;};
 const measure=()=>{width=card.offsetWidth;height=card.offsetHeight;ratio=devicePixelRatio||1;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);draw();};
 measure();const observer=new ResizeObserver(measure);observer.observe(card);
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const tick=now=>{clock+=Math.min(.1,(now-previous)/1000);previous=now;draw();frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}
 return ()=>{cancelAnimationFrame(frame);observer.disconnect();};
}

const recommendation = 'Добавьте свежие фотографии, чтобы гостям было проще выбрать жильё.';
const longRecommendation = 'Добавьте свежие фотографии, укажите время заезда и проверьте описание. Так гостям будет проще выбрать жильё и спланировать поездку.';
let currentText = recommendation;
let stopDust;
let skeletonTimer;

function drawBanner(isLoading) {
  const mount = q('#demo');
  const mark = isLoading
    ? '<span class="skeleton-block skeleton-icon" style="width:40px;height:40px"></span>'
    : '<canvas class="recommendation-dust" aria-hidden="true"></canvas><span class="demo-mark" aria-hidden="true">✦</span>';
  const placeholders = isLoading
    ? '<div class="skeleton-copy" aria-hidden="true"><span class="skeleton-block" style="width:98px;height:14px"></span><span class="skeleton-block" style="width:100%;height:14px"></span><span class="skeleton-block" style="width:72%;height:14px"></span></div>'
    : '';

  mount.setAttribute('aria-busy', String(isLoading));
  mount.innerHTML = '<section class="recommendation-card' + (isLoading ? ' skeleton-recommendation' : '') + '" role="note">'
    + mark + '<div class="recommendation-copy">'
    + animatedRecommendationText('Рекомендация', 'label')
    + animatedRecommendationText(currentText, 'small')
    + placeholders + '</div></section>';
}

function replay() {
  clearTimeout(skeletonTimer);
  stopDust?.();
  drawBanner(true);
  skeletonTimer = setTimeout(() => {
    drawBanner(false);
    stopDust = initRecommendationDust();
  }, 800);
}

q('#replay').addEventListener('click', replay);
q('#length').addEventListener('click', event => {
  const long = currentText === recommendation;
  currentText = long ? longRecommendation : recommendation;
  event.currentTarget.textContent = long ? 'Короткий текст' : 'Длинный текст';
  replay();
});
replay();
