function khoBridge_(nonce) {
  if (!/^[a-f0-9-]{36}$/.test(String(nonce || ''))) throw new Error('Phiên kết nối không hợp lệ.');
  const html = '<!doctype html><html><body><script>' +
    'const nonce=' + JSON.stringify(nonce) + ';' +
    'const target="https://hoidapngoaitinh.pages.dev";' +
    'function send(data){window.top.postMessage(Object.assign({nonce:nonce},data),target);}' +
    'window.addEventListener("message",function(e){' +
      'if(e.origin!==target||e.source!==window.top)return;' +
      'const m=e.data;if(!m||m.type!=="kb:request"||m.nonce!==nonce||typeof m.id!=="string"||!Array.isArray(m.args))return;' +
      'const run=google.script.run.withSuccessHandler(function(data){send({type:"kb:result",id:m.id,ok:true,data:data});}).withFailureHandler(function(err){send({type:"kb:result",id:m.id,ok:false,error:err.message||"Không thực hiện được yêu cầu."});});' +
      'if(m.action==="timKiem")run.timKiem(String(m.args[0]||""));' +
      'else if(m.action==="xuLyTaiLen"&&m.args.length===3)run.xuLyTaiLen(m.args[0],m.args[1],m.args[2]);' +
      'else send({type:"kb:result",id:m.id,ok:false,error:"Thao tác không được hỗ trợ."});' +
    '});send({type:"kb:ready"});' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
