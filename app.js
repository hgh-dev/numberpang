import {Game,adjacent,findMatchingTiles,chooseGameSettings} from './engine.js';
const $=s=>document.querySelector(s);
let mode='manual',op='+',fixedOp='+',randomTarget=false,game=null,paused=false,phase='setup',busy=false,selected=null,pointer=null,serial=0,lastFrame=performance.now(),audio=null,installPrompt=null,resultChoiceMade=false;
const storage={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* 저장이 차단되어도 게임은 계속됩니다. */}}};
let prefs=storage.get('np-prefs',{sound:true,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches});
let history=storage.get('np-time-records',[]);if(!Array.isArray(history))history=[];
const formatTime=ms=>{const seconds=Math.floor(ms/1000);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
function applyPrefs(){document.body.classList.toggle('reduce-motion',prefs.reduce);$('#reduce').checked=prefs.reduce;$('#sound').textContent=prefs.sound?'♫':'♪';$('#sound').setAttribute('aria-label',prefs.sound?'효과음 끄기':'효과음 켜기');$('#sound').setAttribute('aria-pressed',String(prefs.sound));storage.set('np-prefs',prefs);}
function sound(correct=true){if(!prefs.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();const now=audio.currentTime;const notes=correct?[523,659,784]:[294,262];notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hz+(correct?Math.min(game?.combo||0,9)*12:0);g.gain.setValueAtTime(0,now+i*.07);g.gain.linearRampToValueAtTime(.07,now+i*.07+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.07+.16);o.connect(g);g.connect(audio.destination);o.start(now+i*.07);o.stop(now+i*.07+.17);});}catch{}}
function updateBest(){const fastest=history.filter(r=>Number.isFinite(r.elapsed)).reduce((best,r)=>Math.min(best,r.elapsed),Infinity);$('#home-best').textContent=Number.isFinite(fastest)?formatTime(fastest):'—';}
applyPrefs();updateBest();
$('#sound').onclick=()=>{prefs.sound=!prefs.sound;applyPrefs();if(prefs.sound)sound();};$('#reduce').onchange=e=>{prefs.reduce=e.target.checked;applyPrefs();};
for(const button of document.querySelectorAll('[data-mode]'))button.onclick=()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===button));$('#manual').hidden=mode==='random';$('#random-info').hidden=mode!=='random';};
function bounds(){return op==='+'?[0,18]:op==='-'?[-9,9]:[0,9];}
function updateSetupChoices(){const [min,max]=bounds(),randomOp=op==='random';document.querySelectorAll('[data-op]').forEach(button=>{const active=button.dataset.op===op;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});$('#op-random').classList.toggle('active',randomOp);$('#op-random').setAttribute('aria-pressed',String(randomOp));$('#operations').hidden=randomOp;$('#op-random-info').hidden=!randomOp;$('#target-random').classList.toggle('active',randomTarget);$('#target-random').setAttribute('aria-pressed',String(randomTarget));$('#target-controls').hidden=randomTarget;$('#target-random-info').hidden=!randomTarget;$('#target').min=min;$('#target').max=max;if($('#target').value.trim()!=='')$('#target').value=Math.min(max,Math.max(min,Number($('#target').value)));$('#range').textContent=randomTarget?'선택한 부호에 맞는 숫자를 골라요':`${min}부터 ${max}까지 고를 수 있어요`;$('#target').inputMode=op==='-'?'text':'numeric';}
for(const button of document.querySelectorAll('[data-op]'))button.onclick=()=>{fixedOp=button.dataset.op;op=fixedOp;updateSetupChoices();};
$('#op-random').onclick=()=>{op=op==='random'?fixedOp:'random';updateSetupChoices();};
$('#target-random').onclick=()=>{randomTarget=!randomTarget;updateSetupChoices();};
for(const [id,delta] of [['minus',-1],['plus',1]])$('#'+id).onclick=()=>{const [min,max]=bounds();$('#target').value=Math.min(max,Math.max(min,Number($('#target').value)+delta));};
$('#start').onclick=()=>{let choice;try{if(mode==='random')choice=chooseGameSettings('random','random');else{if(!randomTarget&&$('#target').value.trim()==='')throw new RangeError();choice=chooseGameSettings(op,randomTarget?'random':Number($('#target').value));}}catch{const [min,max]=bounds();$('#validation').textContent=`${min}부터 ${max}까지의 정수를 골라줘!`;return;}$('#validation').textContent='';sound();start(choice.op,choice.target,mode);};
function modal(html){$('#modal-content').innerHTML=html;if(!$('#modal').open)$('#modal').showModal();document.dispatchEvent(new Event('numberpang-modal-open'));}
function closeModal(){if($('#modal').open)$('#modal').close();}
// 세대 번호로 재시작 이전의 비동기 애니메이션이 새 게임에 영향을 주지 않게 합니다.
async function wait(ms,token){let prev=performance.now(),left=ms;while(left>0){await new Promise(resolve=>setTimeout(resolve,16));if(token!==serial)return false;const now=performance.now();if(!paused)left-=now-prev;prev=now;}return token===serial;}
async function start(chosenOp,target,chosenMode){const token=++serial;game=new Game(chosenOp,target,chosenMode);resultChoiceMade=false;paused=false;phase='countdown';busy=true;selected=null;pointer=null;closeModal();$('#setup').hidden=true;$('#play').hidden=false;document.body.classList.add('play-active');$('#goal').textContent=target;$('#operation-word').textContent=chosenOp==='+'?'더해서':'빼서';$('#order-help').textContent=chosenOp==='+'?'옆에 있는 숫자 두 개를 골라봐':'먼저 고른 숫자 − 다음 숫자, 순서가 중요해!';$('#equation').textContent='준비됐지?';$('#reward').textContent='';render();hud();$('#board-message').hidden=false;for(const n of ['3','2','1']){$('#board-message').innerHTML=`<span class="countdown">${n}</span>`;if(!await wait(1000,token))return;}$('#board-message').hidden=true;phase='playing';busy=false;lastFrame=performance.now();}
function render(){const frag=document.createDocumentFragment();game.board.forEach((number,i)=>{const b=document.createElement('button');b.className='tile'+(number==null?' empty':'');b.dataset.index=i;b.dataset.number=number==null?'':String(number);b.textContent=number??'';b.disabled=number==null;b.setAttribute('aria-label',number==null?`${Math.floor(i/10)+1}행 ${i%10+1}열 빈칸`:`${Math.floor(i/10)+1}행 ${i%10+1}열 숫자 ${number}`);frag.append(b);});$('#board').replaceChildren(frag);clearSelection();}
function hud() {if(!game)return;$('#time').textContent=formatTime(game.elapsed);$('#score').textContent=game.score.toLocaleString('ko-KR');$('#combo').textContent=game.combo>=2?`${game.combo} COMBO! ✦`:'차근차근, 하나씩!';}
function tick(now){const dt=now-lastFrame;lastFrame=now;if(phase==='playing'&&!paused){game.tick(dt);hud();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
function syncTime(){if(phase==='playing'&&!paused){const now=performance.now();game.tick(now-lastFrame);lastFrame=now;}}
function canInput(){syncTime();return phase==='playing'&&!paused&&!busy&&!game.ended;}
function tile(i){return $('#board').children[i];}
function clearSelection(){selected=null;$('#connector').style.visibility='hidden';document.querySelectorAll('.selected').forEach(b=>b.classList.remove('selected'));$('#connector line').setAttribute('x1',0);$('#connector line').setAttribute('x2',0);$('#connector line').setAttribute('y1',0);$('#connector line').setAttribute('y2',0);}
function highlight(a,b=null){$('#connector').style.visibility='visible';document.querySelectorAll('.selected').forEach(t=>t.classList.remove('selected'));tile(a)?.classList.add('selected');if(b!=null)tile(b)?.classList.add('selected');const line=$('#connector line');const base=$('#board-wrap').getBoundingClientRect();const ra=tile(a).getBoundingClientRect(),rb=tile(b??a).getBoundingClientRect();line.setAttribute('x1',ra.left+ra.width/2-base.left);line.setAttribute('y1',ra.top+ra.height/2-base.top);line.setAttribute('x2',rb.left+rb.width/2-base.left);line.setAttribute('y2',rb.top+rb.height/2-base.top);}
function indexAt(x,y){const el=document.elementFromPoint(x,y)?.closest('.tile');return el&&!el.disabled?Number(el.dataset.index):null;}
$('#board').addEventListener('pointerdown',e=>{if(pointer||!canInput()||e.button!==0)return;const i=indexAt(e.clientX,e.clientY);if(i==null)return;e.preventDefault();pointer={id:e.pointerId,start:i,end:i,prior:selected,moved:false};$('#board').setPointerCapture(e.pointerId);highlight(i);});
$('#board').addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const i=indexAt(e.clientX,e.clientY);if(i!==pointer.start)pointer.moved=true;pointer.end=i;if(i!=null&&adjacent(pointer.start,i))highlight(pointer.start,i);else highlight(pointer.start);});
$('#board').addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(!canInput()){clearSelection();return;}const end=indexAt(e.clientX,e.clientY);if(p.moved){if(end!=null&&adjacent(p.start,end))attempt(p.start,end);else clearSelection();}else choose(p.start,p.prior);});
$('#board').addEventListener('pointercancel',()=>{pointer=null;clearSelection();});
$('#board').addEventListener('click',e=>{if(e.detail===0&&canInput()){const t=e.target.closest('.tile');if(t&&!t.disabled)choose(Number(t.dataset.index),selected);}});
function choose(i,prior){if(prior!=null&&prior!==i&&adjacent(prior,i)){attempt(prior,i);return;}if(prior===i){clearSelection();return;}selected=i;highlight(i);$('#equation').textContent=`${game.board[i]} ${game.op==='+'?'+':'−'} ? = ${game.target}`;}
async function attempt(a,b){if(!canInput())return;busy=true;const token=serial;const x=game.board[a],y=game.board[b],result=game.attempt(a,b);clearSelection();if(!result.valid){busy=false;return;}$('#equation').textContent=`${x} ${game.op==='+'?'+':'−'} ${y} = ${game.op==='+'?x+y:x-y}`;sound(result.correct);if(!result.correct){tile(a).classList.add('wrong');tile(b).classList.add('wrong');$('#reward').textContent='괜찮아, 다시 해보자!';if(!await wait(prefs.reduce?30:320,token))return;tile(a).classList.remove('wrong');tile(b).classList.remove('wrong');busy=false;return;}
 hud();if(!prefs.reduce){$('#reward').animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:240});if(game.combo>=2)$('#combo').animate([{transform:'scale(1)'},{transform:`scale(${1+Math.min(game.combo,9)*.025})`},{transform:'scale(1)'}],{duration:300});}tile(a).classList.add('pop');tile(b).classList.add('pop');$('#reward').textContent=`잘했어! +${result.points}점 ✦`;if(game.ended){render();finish();return;}if(!await wait(prefs.reduce?30:230,token))return;
 const moves=game.settle();render();const animations=[];if(!prefs.reduce){const step=tile(10).getBoundingClientRect().top-tile(0).getBoundingClientRect().top;for(const m of moves)animations.push(tile(m.to).animate([{transform:`translateY(${(m.from-m.to)/10*step}px)`},{transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.3,.1,.4,1)'}));}
 if(!await wait(prefs.reduce?30:290,token))return;animations.forEach(a=>a.cancel());if(game.refreshIfNeeded()){$('#board-message').textContent='남은 블록 다시 섞기!';$('#board-message').hidden=false;if(!await wait(650,token))return;render();$('#board').classList.add('refreshing');$('#board-message').hidden=true;if(!await wait(350,token))return;$('#board').classList.remove('refreshing');}busy=false;
}
$('#hint').onclick=async()=>{if(!canInput())return;const indices=findMatchingTiles(game.board,game.op,game.target);if(!indices.length)return;busy=true;const token=serial;clearSelection();for(let n=0;n<3;n++){for(const i of indices)tile(i)?.classList.add('hint');if(!await wait(300,token))return;for(const i of indices)tile(i)?.classList.remove('hint');if(!await wait(180,token))return;}busy=false;};
function pause(){if(!['playing','countdown'].includes(phase)||paused)return;syncTime();if(phase==='ended')return;paused=true;pointer=null;clearSelection();modal('<span class="eyebrow">잠깐 쉬어 가요</span><h2>잘하고 있어!</h2><p>준비되면 계속 이어서 해보자.</p><button class="primary" id="resume">계속하기 →</button><button class="secondary" id="restart">처음부터 다시</button><button class="secondary" id="home">설정으로 돌아가기</button><div class="modal-options"><label><input type="checkbox" id="pause-sound"> 효과음 켜기</label><label><input type="checkbox" id="pause-reduce"> 움직임 줄이기</label></div>');$('#resume').onclick=resume;$('#restart').onclick=()=>start(game.op,game.target,game.mode);$('#home').onclick=home;$('#pause-sound').checked=prefs.sound;$('#pause-reduce').checked=prefs.reduce;$('#pause-sound').onchange=e=>{prefs.sound=e.target.checked;applyPrefs();};$('#pause-reduce').onchange=e=>{prefs.reduce=e.target.checked;applyPrefs();};}
function resume(){closeModal();paused=false;lastFrame=performance.now();}
$('#pause').onclick=pause;document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('pagehide',pause);window.addEventListener('blur',pause);window.addEventListener('resize',()=>{pointer=null;clearSelection();});
$('#modal').addEventListener('cancel',e=>{e.preventDefault();if(paused)resume();else if(phase==='setup')closeModal();});
function home(){serial++;phase='setup';paused=false;busy=false;pointer=null;closeModal();$('#play').hidden=true;$('#setup').hidden=false;document.body.classList.remove('play-active');updateBest();$('#start').focus();}
function finish(){if(phase==='ended')return;phase='ended';serial++;busy=true;pointer=null;clearSelection();modal(`<div class="confetti">✦ ♕ ✦</div><h2>모든 블록을 없앴어!</h2><p>걸린 시간 <strong>${formatTime(game.elapsed)}</strong><br>기록으로 남기겠습니까?</p><button class="primary" id="save-yes">예, 기록할래요</button><button class="secondary" id="save-no">아니요</button>`);$('#save-yes').onclick=askName;$('#save-no').onclick=showResult;}
function askName(){modal(`<h2>이름을 적어 주세요</h2><p>순위에 표시할 이름이에요.</p><form id="name-form"><input id="player-name" class="name-input" type="text" maxlength="20" required placeholder="이름" autocomplete="nickname"><button class="primary" type="submit">기록 저장</button></form><button class="secondary" id="save-back">돌아가기</button>`);$('#player-name').focus();$('#save-back').onclick=finishPrompt;$('#name-form').onsubmit=e=>{e.preventDefault();const name=$('#player-name').value.trim();if(!name){$('#player-name').focus();return;}history.push({name,date:Date.now(),op:game.op,target:game.target,mode:game.mode,elapsed:Math.round(game.elapsed),score:game.score});history.sort((a,b)=>a.elapsed-b.elapsed||a.date-b.date);storage.set('np-time-records',history);showResult();};}
function finishPrompt(){modal(`<h2>기록으로 남기겠습니까?</h2><p>걸린 시간 ${formatTime(game.elapsed)}</p><button class="primary" id="save-yes">예, 기록할래요</button><button class="secondary" id="save-no">아니요</button>`);$('#save-yes').onclick=askName;$('#save-no').onclick=showResult;}
function showResult(){resultChoiceMade=true;modal(`<div class="confetti">✦ ♕ ✦</div><h2>게임 완료!</h2><p>블록을 모두 없앴어요.</p><div class="big">${formatTime(game.elapsed)}</div><div class="result-grid"><div>걸린 시간<b>${formatTime(game.elapsed)}</b></div><div>점수<b>${game.score.toLocaleString('ko-KR')}점</b></div><div>정답 횟수<b>${game.correct}번</b></div><div>최대 콤보<b>${game.maxCombo}</b></div></div><button class="primary" id="again">한 번 더 놀자 →</button><button class="secondary" id="show-records">기록 보기</button><button class="secondary" id="home">설정으로 돌아가기</button>`);$('#again').onclick=()=>start(game.op,game.target,game.mode);$('#show-records').onclick=showRecords;$('#home').onclick=home;}
function showRecords(){modal('<h2>완료 시간 순위</h2><p>빠른 시간 순 · 이 기기에 저장돼요</p><div id="records"></div><button class="secondary" id="close-records">닫기</button>');const list=$('#records');if(!history.length)list.textContent='아직 저장된 기록이 없어요.';history.forEach((r,index)=>{const row=document.createElement('div');row.className='record-row';const info=document.createElement('span'),time=document.createElement('b'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=`${index+1}위 · ${r.name}`;detail.textContent=`${new Date(r.date).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${r.op==='+'?'더하기':'빼기'} ${r.target}`;time.textContent=formatTime(r.elapsed);info.append(name,detail);row.append(info,time);list.append(row);});$('#close-records').onclick=()=>{if(phase==='ended')showResult();else closeModal();};}
$('#records-button').onclick=showRecords;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#install').hidden=false;});$('#install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('#install').hidden=true;}};window.addEventListener('appinstalled',()=>{$('#install').hidden=true;});
const UPDATE_STATE='np-update-state';
function restoreAfterUpdate(){
  let saved;
  try{saved=JSON.parse(sessionStorage.getItem(UPDATE_STATE));sessionStorage.removeItem(UPDATE_STATE);}catch{return;}
  if(!saved?.game)return;
  const state=saved.game;
  if(!['+','-'].includes(state.op)||!Number.isInteger(state.target)||!Array.isArray(state.board)||state.board.length!==100)return;
  if(saved.phase==='countdown'){start(state.op,state.target,state.mode);return;}
  if(!['playing','ended'].includes(saved.phase))return;
  game=Object.assign(new Game(state.op,state.target,state.mode),state);
  if(!game.ended){game.settle();game.refreshIfNeeded();}
  $('#setup').hidden=true;$('#play').hidden=false;document.body.classList.add('play-active');
  $('#goal').textContent=game.target;$('#operation-word').textContent=game.op==='+'?'더해서':'빼서';
  $('#order-help').textContent=game.op==='+'?'옆에 있는 숫자 두 개를 골라봐':'먼저 고른 숫자 − 다음 숫자, 순서가 중요해!';
  $('#board-message').hidden=true;render();hud();lastFrame=performance.now();
  if(saved.phase==='ended'||game.ended){phase='playing';finish();if(saved.resultChoiceMade)showResult();else if(saved.pendingName!=null){askName();$('#player-name').value=saved.pendingName;}}
  else{phase='playing';pause();}
}
restoreAfterUpdate();

if('serviceWorker' in navigator){
  let registration,refreshing=false,checking=false,applying=false;
  const showWaiting=()=>{
    const waiting=Boolean(registration?.waiting&&navigator.serviceWorker.controller);
    $('#update-banner').hidden=!waiting;
    $('#modal-update')?.remove();
    if(waiting&&$('#modal').open){
      const button=document.createElement('button');button.id='modal-update';button.className='secondary';button.textContent='새 버전 저장 후 업데이트';
      button.onclick=()=>$('#update-action').click();$('#modal-content').append(button);
    }
  };
  const checkUpdate=async()=>{if(!registration||checking)return;checking=true;try{await registration.update();showWaiting();}catch{}finally{checking=false;}};
  const saveUpdateState=()=>{
    if(!game||!['playing','countdown','ended'].includes(phase))return true;
    syncTime();
    try{sessionStorage.setItem(UPDATE_STATE,JSON.stringify({phase,game,resultChoiceMade,pendingName:$('#player-name')?.value??null}));return true;}
    catch{return false;}
  };
  navigator.serviceWorker.addEventListener('message',event=>{
    if(event.data?.type!=='numberpang-update')return;
    if(refreshing)return;
    refreshing=true;
    saveUpdateState();
    event.ports[0]?.postMessage('ready');
    location.reload();
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(applying&&!refreshing){refreshing=true;location.reload();}});
  document.addEventListener('numberpang-modal-open',showWaiting);
  $('#update-action').onclick=()=>{
    const waiting=registration?.waiting;
    if(!waiting||applying)return;
    const wasPaused=paused,wasBusy=busy;
    if(phase==='playing'){syncTime();paused=true;busy=true;pointer=null;clearSelection();}
    if(!saveUpdateState()){
      paused=wasPaused;busy=wasBusy;lastFrame=performance.now();
      $('#update-status').textContent='게임 저장에 실패했습니다. 다시 눌러 주세요.';
      return;
    }
    applying=true;$('#update-action').disabled=true;$('#update-action').textContent='적용 중…';
    waiting.postMessage({type:'numberpang-apply-update'});
    setTimeout(()=>{if(refreshing||!applying)return;applying=false;paused=wasPaused;busy=wasBusy;lastFrame=performance.now();try{sessionStorage.removeItem(UPDATE_STATE);}catch{}$('#update-status').textContent='업데이트 적용이 지연됩니다. 다시 시도해 주세요.';$('#update-action').disabled=false;$('#update-action').textContent='저장 후 업데이트';},8000);
  };
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(async registered=>{
    registration=registered;showWaiting();
    registration.addEventListener('updatefound',()=>{
      const installing=registration.installing;
      installing?.addEventListener('statechange',()=>{if(installing.state==='installed')showWaiting();});
    });
    await checkUpdate();
  }).catch(()=>{});
  window.addEventListener('focus',checkUpdate);
  window.addEventListener('online',checkUpdate);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});
  setInterval(()=>{if(!document.hidden)checkUpdate();},10000);
}
