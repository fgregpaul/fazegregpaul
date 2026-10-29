// Local stand-in for the PeerJS cloud signaling server, for testing GregNet lobbies offline.
// Run: node dev/sigserver.js, then open index.html?peerhost=ws://localhost:9123 in two browser contexts
// (launch Chromium with --disable-features=WebRtcHideLocalIpsWithMdns). Not used by the live site.
const http=require('http'),crypto=require('crypto');
const clients=new Map(),tokens=new Map(),queue=new Map();const ban=new Map();global.kill=id=>{ban.set(id,Date.now()+28000);const c=clients.get(id);if(c){c.destroy();}};
function frame(str){const p=Buffer.from(str);let h;if(p.length<126){h=Buffer.from([0x81,p.length]);}else if(p.length<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(p.length,2);}else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2);}return Buffer.concat([h,p]);}
const send=(s,o)=>{try{s.write(frame(JSON.stringify(o)))}catch(e){}};
const srv=http.createServer((q,r)=>{r.end('ok')});
srv.on('upgrade',(req,sock)=>{const u=new URL(req.url,'http://x');const id=u.searchParams.get('id');const acc=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
 const tk=u.searchParams.get('token');
 if((ban.get(id)||0)>Date.now()){sock.destroy();return;}
 if(clients.has(id)){ if(tokens.get(id)!==tk){send(sock,{type:'ID-TAKEN',payload:{msg:'taken'}});sock.end();return;} clients.set(id,sock); }
 else { clients.set(id,sock);tokens.set(id,tk);send(sock,{type:'OPEN'}); const q=queue.get(id)||[]; queue.delete(id); for(const m of q) send(sock,m.m); }
 let buf=Buffer.alloc(0);
 sock.on('data',d=>{buf=Buffer.concat([buf,d]);while(buf.length>=2){const op=buf[0]&15;let len=buf[1]&127,off=2;if(len===126){if(buf.length<4)return;len=buf.readUInt16BE(2);off=4;}else if(len===127){if(buf.length<10)return;len=Number(buf.readBigUInt64BE(2));off=10;}const masked=buf[1]&128;const mk=masked?buf.slice(off,off+4):null;if(masked)off+=4;if(buf.length<off+len)return;let pl=buf.slice(off,off+len);if(mk)pl=Buffer.from(pl.map((b,i)=>b^mk[i%4]));buf=buf.slice(off+len);
  if(op===8){sock.end();return;} if(op!==1)continue;
  let m;try{m=JSON.parse(pl.toString())}catch(e){continue}
  if(m.type==='HEARTBEAT')continue;
  m.src=id;const dst=clients.get(m.dst);
  if(dst)send(dst,m);else if(m.type!=='LEAVE'&&m.type!=='EXPIRE'){const q=queue.get(m.dst)||[];q.push({m,t:Date.now(),src:id});queue.set(m.dst,q);}
 }});
 sock.on('close',()=>{if(clients.get(id)===sock){clients.delete(id);tokens.delete(id);}});sock.on('error',()=>{});
});
setInterval(()=>{const now=Date.now();for(const [d,q] of queue){const keep=[];for(const x of q){if(now-x.t>5000){const s2=clients.get(x.src);if(s2&&x.m.type!=='CANDIDATE')send(s2,{type:'EXPIRE',src:d});}else keep.push(x);}if(keep.length)queue.set(d,keep);else queue.delete(d);}},1000);
// test helper: GET http://localhost:9124/<peer id> drops that peer and refuses it for 28s (simulates a phone pausing the page)
require("http").createServer((q,r)=>{const id=decodeURIComponent(q.url.slice(1));kill(id);r.end('killed '+id)}).listen(9124);
srv.listen(9123,()=>console.log('sig on 9123'));
