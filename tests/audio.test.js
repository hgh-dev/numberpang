import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function unlockAudio('),app.indexOf('function updateBest('));
function harness({enabled=true,rejectResume=false}={}){
  const notes=[],contexts=[];
  class AudioContext{
    constructor(){this.state='suspended';this.currentTime=1;this.destination={};contexts.push(this);}
    resume(){this.resumed=true;if(rejectResume)return Promise.reject(new Error('unavailable'));this.state='running';return Promise.resolve();}
    createOscillator(){
      const note={};notes.push(note);
      return {frequency:{setValueAtTime(hz){note.hz=hz;}},connect(){},disconnect(){},start(at){note.start=at;},stop(at){note.stop=at;},set type(value){note.type=value;}};
    }
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  }
  const context={prefs:{sound:enabled},audio:null,window:{AudioContext}};
  runInNewContext(source,context);
  return {context,notes,contexts};
}
test('정답 소리와 별도 콤보 멜로디를 순서대로 재생',()=>{
  const regular=harness();regular.context.sound(true,1);
  assert.equal(regular.notes.length,3);assert.equal(regular.contexts[0].resumed,true);
  const combo=harness();combo.context.sound(true,2);
  assert.equal(combo.notes.length,7);
  assert.ok(combo.notes[3].start>combo.notes[2].start);
  assert.equal(combo.notes[3].type,'triangle');
  const higher=harness();higher.context.sound(true,3);
  assert.ok(higher.notes[3].hz>combo.notes[3].hz);
});
test('음소거는 오디오 생성과 정답·콤보 소리를 모두 차단',()=>{
  const {context,notes,contexts}=harness({enabled:false});
  context.unlockAudio();context.sound(true,5);context.sound(false);
  assert.equal(notes.length,0);assert.equal(contexts.length,0);
});
test('오답에서는 콤보 소리를 재생하지 않음',()=>{
  const {context,notes}=harness();context.sound(false,5);assert.equal(notes.length,2);
});
test('오디오 활성화 실패도 처리해 게임 입력을 막지 않음',async()=>{
  const {context}=harness({rejectResume:true});
  assert.doesNotThrow(()=>context.sound(true,2));
  await new Promise(resolve=>setImmediate(resolve));
});
