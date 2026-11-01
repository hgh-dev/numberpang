import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');

function worker(existingCaches=[]){
  const listeners={},calls={skipWaiting:0};
  const self={
    addEventListener(type,listener){listeners[type]=listener;},
    skipWaiting(){calls.skipWaiting++;return Promise.resolve();}
  };
  const caches={open:async()=>({addAll:async()=>{}}),keys:async()=>existingCaches};
  class Request{constructor(path,options){this.path=path;this.cache=options.cache;}}
  runInNewContext(source,{self,caches,Request});
  return {listeners,calls};
}

test('새 버전은 사용자가 선택할 때까지 대기함',async()=>{
  const {listeners,calls}=worker(['numberpang-older']);
  let install;
  listeners.install({waitUntil(promise){install=promise;}});
  await install;
  assert.equal(calls.skipWaiting,0);
  let apply;
  listeners.message({data:{type:'numberpang-apply-update'},waitUntil(promise){apply=promise;}});
  await apply;
  assert.equal(calls.skipWaiting,1);
});

test('이전 자동 갱신 버전에서 선택형 갱신으로 한 번 전환함',async()=>{
  const {listeners,calls}=worker(['numberpang-090ea1dcecb2119d']);
  let install;
  listeners.install({waitUntil(promise){install=promise;}});
  await install;
  assert.equal(calls.skipWaiting,1);
});
