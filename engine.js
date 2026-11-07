export const SIZE = 10;
export function chooseGameSettings(opChoice,targetChoice,random=Math.random) {
  if(!['+','-','random'].includes(opChoice))throw new RangeError('연산을 확인해 주세요.');
  if(targetChoice!=='random'&&(!Number.isInteger(targetChoice)||targetChoice<(opChoice==='-'?-10:0)||targetChoice>(opChoice==='+'?20:10)))throw new RangeError('목표 숫자 범위를 확인해 주세요.');
  const op=opChoice==='random'?(random()<.5?'+':'-'):opChoice;
  const [min,max]=op==='+'?[0,20]:[-10,10];
  const target=targetChoice==='random'?min+Math.floor(random()*(max-min+1)):targetChoice;
  return {op,target};
}
export function adjacent(a,b) { return Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<100&&b<100&&Math.abs(a%10-b%10)+Math.abs(Math.floor(a/10)-Math.floor(b/10))===1; }
export function matches(board,a,b,op,target) { return adjacent(a,b)&&board[a]!=null&&board[b]!=null&&(op==='+'?board[a]+board[b]:board[a]-board[b])===target; }
export function findPair(board,op,target) {
  for(let a=0;a<100;a++) for(const b of [a-10,a+10,a-1,a+1]) if(matches(board,a,b,op,target)) return [a,b];
  return null;
}
export function findMatchingTiles(board,op,target) {
  const tiles=new Set();
  for(let a=0;a<100;a++) for(const b of [a+1,a+10]) {
    if(matches(board,a,b,op,target)||matches(board,b,a,op,target)){tiles.add(a);tiles.add(b);}
  }
  return [...tiles];
}
export function createBoard(op,target,random=Math.random) {
  const board=Array.from({length:100},()=>Math.floor(random()*11));
  if(!findPair(board,op,target)) {
    const pairs=[];
    for(let a=0;a<=10;a++) for(let b=0;b<=10;b++) if((op==='+'?a+b:a-b)===target) pairs.push([a,b]);
    if(!pairs.length) throw new RangeError('목표 숫자 범위를 확인해 주세요.');
    // 재시도 반복 대신 유효한 인접 쌍을 직접 심어 정답을 보장합니다.
    const pair=pairs[Math.floor(random()*pairs.length)];
    const row=Math.floor(random()*10),col=Math.floor(random()*9);
    board[row*10+col]=pair[0]; board[row*10+col+1]=pair[1];
  }
  return board;
}
export function rearrangeRemaining(board,op,target,random=Math.random) {
  const count=board.filter(n=>n!=null).length;
  if(count===0||count%2) throw new RangeError('남은 블록은 짝수여야 합니다.');
  const next=Array(100).fill(null);
  const slots=[];
  for(let row=9;row>=0&&slots.length<count;row--) for(let col=0;col<10&&slots.length<count;col++) {
    const index=row*10+col;slots.push(index);next[index]=Math.floor(random()*11);
  }
  if(!findPair(next,op,target)) {
    const pairs=[];
    for(let a=0;a<=10;a++) for(let b=0;b<=10;b++) if((op==='+'?a+b:a-b)===target) pairs.push([a,b]);
    if(!pairs.length) throw new RangeError('목표 숫자 범위를 확인해 주세요.');
    const [a,b]=pairs[Math.floor(random()*pairs.length)];
    next[slots[0]]=a;next[slots[1]]=b;
  }
  return next;
}
export function gravity(board) {
  const next=Array(100).fill(null),moves=[];
  for(let col=0;col<10;col++) {
    let dest=90+col;
    for(let src=90+col;src>=0;src-=10) if(board[src]!=null) {next[dest]=board[src]; if(src!==dest)moves.push({from:src,to:dest});dest-=10;}
  }
  return {board:next,moves};
}
export class Game {
  constructor(op,target,mode='manual') {this.op=op;this.target=target;this.mode=mode;this.board=createBoard(op,target);this.elapsed=0;this.score=0;this.combo=0;this.maxCombo=0;this.correct=0;this.hintsUsed=0;this.lastCorrect=-Infinity;this.ended=false;this.completedAt=null;}
  tick(ms,active=true) {if(this.ended||!active)return;this.elapsed+=Math.max(0,ms);if(this.elapsed-this.lastCorrect>5000)this.combo=0;}
  useHint() {if(this.ended||this.hintsUsed>=3)return [];const tiles=findMatchingTiles(this.board,this.op,this.target);if(tiles.length)this.hintsUsed++;return tiles;}
  attempt(a,b,completedAt=Date.now()) {
    if(this.ended||!adjacent(a,b)||this.board[a]==null||this.board[b]==null)return {valid:false};
    if(!matches(this.board,a,b,this.op,this.target)){this.combo=0;return {valid:true,correct:false};}
    this.combo=this.elapsed-this.lastCorrect<=5000?this.combo+1:1;
    this.lastCorrect=this.elapsed;this.maxCombo=Math.max(this.maxCombo,this.combo);this.correct++;
    const points=Math.min(500,100+(this.combo-1)*50);this.score+=points;
    this.board[a]=null;this.board[b]=null;
    if(this.board.every(n=>n==null)){this.ended=true;this.completedAt=completedAt;}
    return {valid:true,correct:true,points};
  }
  settle() {const result=gravity(this.board);this.board=result.board;return result.moves;}
  refreshIfNeeded() {if(this.ended||findPair(this.board,this.op,this.target))return false;this.board=rearrangeRemaining(this.board,this.op,this.target);return true;}
}
