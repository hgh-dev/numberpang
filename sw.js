// 빌드할 때 파일 내용의 해시로 교체됩니다.
const CACHE='numberpang-v2';
const ASSETS=['./','./index.html','./style.css','./app.js','./engine.js','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  // 브라우저 HTTP 캐시에 남은 옛 파일을 새 캐시에 다시 담지 않습니다.
  await cache.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'})));
  await self.skipWaiting();
})()));

self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('numberpang-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
  const pages=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.all(pages.map(async page=>{
    const channel=new MessageChannel();
    const acknowledged=await new Promise(resolve=>{
      const timeout=setTimeout(()=>resolve(false),800);
      channel.port1.onmessage=()=>{clearTimeout(timeout);resolve(true);};
      try{page.postMessage({type:'numberpang-update'},[channel.port2]);}catch{clearTimeout(timeout);resolve(false);}
    });
    channel.port1.close();
    // 이전 버전 앱에는 메시지 처리기가 없으므로 새 페이지를 직접 엽니다.
    if(!acknowledged)await page.navigate(page.url).catch(()=>{});
  }));
})()));

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
