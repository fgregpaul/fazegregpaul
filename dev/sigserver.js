// Local stand-in for the PeerJS cloud signaling server, for testing GregNet lobbies offline.
// Run: node dev/sigserver.js, then open index.html?peerhost=ws://localhost:9123 in two browser contexts
// (launch Chromium with --disable-features=WebRtcHideLocalIpsWithMdns). Not used by the live site.
const http=require('http'),crypto=require('crypto');
const clients=new Map();
function frame(str){const p=Buffer.from(str);let h;if(p.length<126){h=Buffer.from([0x81,p.length]);}else if(p.length<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(p.length,2);}else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(p.length),2);}return Buffer.concat([h,p]);}
const send=(s,o)=>{try{s.write(frame(JSON.stringify(o)))}catch(e){}};
const srv=http.createServer((q,r)=>{r.end('ok')});
srv.on('upgrade',(req,sock)=>{const u=new URL(req.url,'http://x');const id=u.searchParams.get('id');const acc=crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
 sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
 if(clients.has(id)){send(sock,{type:'ID-TAKEN',payload:{msg:'taken'}});sock.end();return;}
 clients.set(id,sock);send(sock,{type:'OPEN'});
 let buf=Buffer.alloc(0);
 sock.on('data',d=>{buf=Buffer.concat([buf,d]);while(buf.length>=2){const op=buf[0]&15;let len=buf[1]&127,off=2;if(len===126){if(buf.length<4)return;len=buf.readUInt16BE(2);off=4;}else if(len===127){if(buf.length<10)return;len=Number(buf.readBigUInt64BE(2));off=10;}const masked=buf[1]&128;const mk=masked?buf.slice(off,off+4):null;if(masked)off+=4;if(buf.length<off+len)return;let pl=buf.slice(off,off+len);if(mk)pl=Buffer.from(pl.map((b,i)=>b^mk[i%4]));buf=buf.slice(off+len);
  if(op===8){sock.end();return;} if(op!==1)continue;
  let m;try{m=JSON.parse(pl.toString())}catch(e){continue}
  if(m.type==='HEARTBEAT')continue;
  m.src=id;const dst=clients.get(m.dst);
  if(dst)send(dst,m);else if(m.type==='OFFER')setTimeout(()=>{const d2=clients.get(m.dst);if(d2)send(d2,m);else send(sock,{type:'EXPIRE',src:m.dst});},2500);
 }});
 sock.on('close',()=>{if(clients.get(id)===sock)clients.delete(id)});sock.on('error',()=>{});
});
srv.listen(9123,()=>console.log('sig on 9123'));
