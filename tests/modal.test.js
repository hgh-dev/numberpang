import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('let modalScroll='),app.indexOf('// 세대 번호'));
function harness(){
  const classes=new Set(),listeners={},restored=[];
  const dialog={open:false,showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){listeners[name]=fn;}};
  const content={innerHTML:''};
  const context={
    $:selector=>selector==='#modal'?dialog:content,
    window:{scrollX:0,scrollY:340,scrollTo(x,y){restored.push([x,y]);}},
    document:{body:{style:{top:''}},documentElement:{classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},dispatchEvent(){}},
    Event:class{}
  };
  runInNewContext(source,context);
  return {context,dialog,classes,listeners,restored};
}
test('기록 모달을 열면 배경 위치를 고정하고 닫을 때 원래 위치로 복원',()=>{
  const h=harness();h.context.modal('records');
  assert.equal(h.classes.has('modal-open'),true);assert.equal(h.context.document.body.style.top,'-340px');
  h.context.window.scrollY=0;h.context.modal('another view');
  assert.equal(h.context.document.body.style.top,'-340px');
  h.context.closeModal();
  assert.equal(h.classes.has('modal-open'),false);assert.equal(h.context.document.body.style.top,'');
  assert.deepEqual(h.restored,[[0,340]]);
  h.listeners.close();assert.equal(h.restored.length,1);
});
test('이전 close 이벤트가 늦게 와도 다시 열린 모달의 잠금을 해제하지 않음',()=>{
  const h=harness();h.context.modal('first');h.context.closeModal();h.context.modal('second');h.listeners.close();
  assert.equal(h.classes.has('modal-open'),true);assert.equal(h.dialog.open,true);
});
test('직접 닫힌 모달도 배경 잠금을 해제',()=>{
  const h=harness();h.context.modal('records');h.dialog.close();h.listeners.close();
  assert.equal(h.classes.has('modal-open'),false);assert.deepEqual(h.restored,[[0,340]]);
});
