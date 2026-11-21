import test from 'node:test';
import assert from 'node:assert/strict';
import {totalScore,compareRecords,Game,matches,adjacent,gravity,findPair,findMatchingTiles,createBoard,rearrangeRemaining,chooseGameSettings} from '../engine.js';
function board(a,b){const grid=Array(100).fill(null);grid[0]=a;grid[1]=b;return grid;}
test('10 블록과 확장된 목표 숫자 지원',()=>{assert.equal(matches(board(10,10),0,1,'+',20),true);assert.equal(matches(board(0,10),0,1,'-',-10),true);assert.ok(createBoard('+',20,()=>.999).every(n=>n===10));assert.deepEqual(chooseGameSettings('random',10,()=>.999),{op:'-',target:10});});
test('부호와 숫자를 각각 랜덤으로 선택',()=>{assert.deepEqual(chooseGameSettings('+','random',()=>.999),{op:'+',target:20});assert.deepEqual(chooseGameSettings('-','random',()=>0),{op:'-',target:-10});assert.deepEqual(chooseGameSettings('random',7,()=>0),{op:'+',target:7});assert.deepEqual(chooseGameSettings('random',7,()=>.999),{op:'-',target:7});const values=[.999,0];assert.deepEqual(chooseGameSettings('random','random',()=>values.shift()),{op:'-',target:-10});});
test('랜덤 부호와 고정 숫자는 공통 범위만 허용',()=>{assert.deepEqual(chooseGameSettings('random',0,()=>.999),{op:'-',target:0});assert.deepEqual(chooseGameSettings('random',9,()=>0),{op:'+',target:9});assert.throws(()=>chooseGameSettings('random',11),RangeError);assert.throws(()=>chooseGameSettings('random',-1),RangeError);assert.throws(()=>chooseGameSettings('-',11),RangeError);});
for(const [op,target,a,b,expected] of [['+',10,4,6,true],['+',0,0,0,true],['-',-5,2,7,true],['-',-5,7,2,false],['-',0,8,8,true]])test(`${a} ${op} ${b}, 목표 ${target}`,()=>assert.equal(matches(board(a,b),0,1,op,target),expected));
test('인접 보너스는 상하좌우만, 빈칸은 선택 차단',()=>{assert.equal(adjacent(0,11),false);assert.equal(adjacent(9,10),false);assert.equal(matches(board(0,null),0,1,'+',0),false);assert.equal(adjacent(0,10),true);});
test('중력: 순서와 숫자 수 유지',()=>{const b=Array(100).fill(null);[3,7,null,null,2].forEach((n,i)=>b[(i+5)*10]=n);const {board:n,moves}=gravity(b);assert.deepEqual([n[70],n[80],n[90]],[3,7,2]);assert.equal(n.filter(x=>x!=null).length,3);assert.equal(n[60],null);assert.equal(moves.length,2);});
test('모든 목표 및 극단 난수에서도 정답 보장',()=>{for(const op of ['+','-'])for(let t=op==='+'?0:-10;t<=(op==='+'?20:10);t++)for(const random of [()=>0,()=>.999,Math.random])for(let i=0;i<20;i++){const b=createBoard(op,t,random);assert.ok(findPair(b,op,t));assert.equal(b.length,100);assert.ok(b.every(n=>n>=0&&n<=10));}});
test('음수 정답 탐색은 역순도 검사',()=>{const b=board(7,2);assert.deepEqual(findPair(b,'-',-5),[1,0]);});
test('힌트는 남은 모든 정답 쌍의 블록을 찾음',()=>{const b=Array(100).fill(null);[b[0],b[1],b[20],b[21],b[40],b[41]]=[4,6,3,7,1,1];assert.deepEqual(findMatchingTiles(b,'+',10),[0,1,20,21]);});
test('빼기 힌트는 역순 정답도 표시하고 오답은 제외함',()=>{const b=Array(100).fill(null);[b[0],b[1],b[20],b[21],b[40],b[41]]=[2,7,7,2,4,6];assert.deepEqual(findMatchingTiles(b,'-',-5),[0,1,20,21]);});
test('힌트는 한 게임에서 세 번만 사용하고 새 게임에서 초기화됨',()=>{const g=new Game('+',10);g.board=board(4,6);for(let n=1;n<=3;n++){assert.deepEqual(g.useHint(),[0,1]);assert.equal(g.hintsUsed,n);}assert.deepEqual(g.useHint(),[]);assert.equal(g.hintsUsed,3);const fresh=new Game('+',10);fresh.board=board(1,2);assert.deepEqual(fresh.useHint(),[]);assert.equal(fresh.hintsUsed,0);fresh.board=board(4,6);assert.deepEqual(fresh.useHint(),[0,1]);fresh.ended=true;assert.deepEqual(fresh.useHint(),[]);});
test('정답 후에도 시간은 늘지 않고 콤보 점수 상한 유지',()=>{const g=new Game('+',10);for(let n=1;n<=12;n++){g.board=Array(100).fill(5);g.board[0]=4;g.board[1]=6;const old=g.elapsed;assert.equal(g.attempt(0,1).points,Math.min(500,100+(n-1)*50)+100);assert.equal(g.elapsed,old);g.tick(100);}assert.equal(g.maxCombo,12);assert.equal(g.correct,12);});
test('5초 경계, 초과, 오답 시 콤보 초기화',()=>{const g=new Game('+',10);g.board=Array(100).fill(5);g.board[0]=4;g.board[1]=6;g.attempt(0,1);g.tick(5000);g.board[0]=4;g.board[1]=6;assert.equal(g.attempt(0,1).points,250);g.tick(5001);assert.equal(g.combo,0);g.board[0]=4;g.board[1]=6;assert.equal(g.attempt(0,1).points,200);g.board[0]=1;g.board[1]=2;const before=[g.score,g.elapsed];g.attempt(0,1);assert.equal(g.combo,0);assert.deepEqual([g.score,g.elapsed],before);});
test('시간 제한 없이 누적하고 마지막 쌍 제거 시 완료 날짜 고정',()=>{const g=new Game('+',10);g.tick(100000);assert.equal(g.elapsed,100000);assert.equal(g.ended,false);g.board=board(4,6);g.attempt(0,1,123456789);assert.equal(g.ended,true);assert.equal(g.completedAt,123456789);g.tick(1000);assert.equal(g.elapsed,100000);assert.equal(g.attempt(0,1).valid,false);assert.equal(g.completedAt,123456789);});
test('애니메이션 중에는 플레이 시간과 콤보 시간이 흐르지 않음',()=>{const g=new Game('+',10);g.board=Array(100).fill(5);g.board[0]=4;g.board[1]=6;g.attempt(0,1);g.tick(230,false);g.tick(290,false);assert.equal(g.elapsed,0);g.tick(4900,true);g.board[0]=4;g.board[1]=6;assert.equal(g.attempt(0,1).points,250);assert.equal(g.elapsed,4900);});
test('남은 블록 재배치는 개수와 시간 유지, 끝난 게임은 재배치 안 함',()=>{const g=new Game('-',-5);g.board=Array(100).fill(null);for(let i=80;i<100;i++)g.board[i]=9;g.tick(1234);const before=[g.op,g.target,g.score,g.elapsed];assert.equal(g.refreshIfNeeded(),true);assert.equal(g.board.filter(n=>n!=null).length,20);assert.ok(findPair(g.board,g.op,g.target));assert.deepEqual([g.op,g.target,g.score,g.elapsed],before);assert.equal(g.refreshIfNeeded(),false);g.ended=true;assert.equal(g.refreshIfNeeded(),false);});
test('모든 목표와 남은 블록 수에서 정답 쌍을 보장',()=>{for(const op of ['+','-'])for(let t=op==='+'?0:-10;t<=(op==='+'?20:10);t++)for(const count of [2,12,100]){const old=Array(100).fill(null);for(let i=0;i<count;i++)old[i]=9;const settled=gravity(old).board;const b=rearrangeRemaining(settled,op,t,()=>0);assert.equal(b.filter(n=>n!=null).length,count);assert.ok(findPair(b,op,t));assert.deepEqual(b.map(n=>n!=null),settled.map(n=>n!=null));}});
test('재정렬은 다양한 무작위 숫자를 채우고 중력이 적용된 모양을 유지',()=>{const old=Array(100).fill(null);for(let i=0;i<12;i++)old[i]=9;const values=Array.from({length:10},(_,i)=>i/10);let n=0;const settled=gravity(old).board;const next=rearrangeRemaining(settled,'+',20,()=>values[n++%10]);assert.equal(next.filter(x=>x!=null).length,12);assert.ok(new Set(next.filter(x=>x!=null)).size>=8);assert.ok(findPair(next,'+',20));assert.deepEqual(next.map(n=>n!=null),settled.map(n=>n!=null));});
test('불규칙한 블록과 빈칸의 위치를 유지하며 정답을 보장',()=>{const old=Array(100).fill(null);for(const i of [80,90,91,94,95,99])old[i]=3;const next=rearrangeRemaining(old,'+',20,()=>0);assert.deepEqual(next.map(n=>n!=null),old.map(n=>n!=null));assert.ok(findPair(next,'+',20));});
test('서로 떨어진 블록도 위치를 유지하며 숫자만 섞음',()=>{const old=Array(100).fill(null);for(const i of [90,92,95,98])old[i]=3;const next=rearrangeRemaining(old,'+',20,()=>0);assert.deepEqual(next.map(n=>n!=null),old.map(n=>n!=null));assert.equal(next.filter(n=>n!=null).length,4);assert.ok(findPair(next,'+',20));assert.deepEqual(gravity(next).board,next);});
test('모든 목표의 숫자판은 재배치를 거쳐 블록 100개를 전부 지울 수 있음',()=>{for(const op of ['+','-'])for(let target=op==='+'?0:-10;target<=(op==='+'?20:10);target++){const g=new Game(op,target);for(let turn=0;turn<50;turn++){const pair=findPair(g.board,op,target);assert.ok(pair);assert.equal(g.attempt(...pair).correct,true);g.settle();if(!g.ended)g.refreshIfNeeded();}assert.equal(g.ended,true);assert.equal(g.board.filter(n=>n!=null).length,0);}});
test('새 게임의 상태 초기화',()=>{const g=new Game('+',10);assert.deepEqual([g.elapsed,g.score,g.combo,g.correct,g.maxCombo,g.hintsUsed,g.ended],[0,0,0,0,0,0,false]);});

test('멀리 떨어진 정답도 선택하고 힌트와 정답 탐색에 포함',()=>{
  const g=new Game('+',10);g.board=Array(100).fill(null);
  g.board[0]=4;g.board[99]=6;
  assert.deepEqual(findPair(g.board,'+',10),[0,99]);
  assert.deepEqual(g.useHint(),[0,99]);
  const before=[...g.board];assert.equal(g.refreshIfNeeded(),false);assert.deepEqual(g.board,before);
  assert.equal(g.attempt(0,99).points,100);assert.equal(g.ended,true);
});
test('인접 보너스는 같은 콤보의 떨어진 쌍보다 100점 높음',()=>{
  for(const [a,b,bonus] of [[0,1,100],[0,10,100],[0,11,0],[9,10,0],[0,99,0]]){
    const g=new Game('+',10);
    for(let n=1;n<=12;n++){
      g.board=Array(100).fill(5);g.board[a]=4;g.board[b]=6;
      const result=g.attempt(a,b);
      assert.equal(result.adjacencyBonus,bonus);
      assert.equal(result.points,Math.min(500,100+(n-1)*50)+bonus);
      g.tick(100);
    }
  }
});
test('떨어진 빼기도 선택 순서를 지키고 같은 블록·빈칸·잘못된 인덱스는 거부',()=>{
  const g=new Game('-',-5);g.board=Array(100).fill(null);g.board[9]=2;g.board[90]=7;
  for(const [a,b] of [[9,9],[9,0],[-1,9],[9,100],[9,9.5],[9,'90']]){
    assert.equal(g.attempt(a,b).valid,false);
  }
  assert.equal(g.attempt(90,9).correct,false);assert.equal(g.score,0);
  assert.deepEqual(findPair(g.board,'-',-5),[9,90]);
  assert.deepEqual(g.useHint(),[9,90]);
  assert.equal(g.attempt(9,90).correct,true);
});

test('여러 정답이 있어도 힌트는 한 쌍만 표시하고 사용 횟수는 한 번 증가',()=>{
  for(const [op,target] of [['+',10],['-',-5]]){
    const g=new Game(op,target);g.board=Array(100).fill(null);
    [g.board[0],g.board[12],g.board[40],g.board[99]]=op==='+'?[4,6,3,7]:[7,2,2,7];
    const before=[...g.board],pair=g.useHint();
    assert.equal(pair.length,2);assert.equal(matches(g.board,...pair,op,target),true);
    assert.equal(g.hintsUsed,1);assert.deepEqual(g.board,before);
  }
});

test('총점은 분당 점수로 반올림하며 높은 점수와 빠른 완료에 유리',()=>{
  assert.equal(totalScore(10000,120000),5000);
  assert.equal(totalScore(10000,60000),10000);
  assert.equal(totalScore(12000,120000),6000);
  assert.equal(totalScore(10000,180000),3333);
  assert.equal(totalScore(0,120000),0);
  for(const [score,time] of [[undefined,1000],[100,0],[100,-1],[-1,1000],[Infinity,1000],[100,NaN]]){
    assert.equal(totalScore(score,time),null);
  }
});
test('기존 기록도 총점을 계산해 정렬하고 동점은 빠른 시간·먼저 달성한 순',()=>{
  const records=[
    {name:'missing',elapsed:30000,date:1},
    {name:'slow',score:10000,elapsed:120000,date:2},
    {name:'fast-later',score:5000,elapsed:60000,date:3},
    {name:'fast',score:5000,elapsed:60000,date:1},
    {name:'best',score:12000,elapsed:120000,date:4}
  ];
  assert.deepEqual([...records].sort(compareRecords).map(r=>r.name),['best','fast','fast-later','slow','missing']);
  assert.equal([...records].sort((a,b)=>compareRecords(a,b,'time'))[0].name,'missing');
  assert.equal([...records].sort((a,b)=>compareRecords(a,b,'score'))[0].name,'best');
});
