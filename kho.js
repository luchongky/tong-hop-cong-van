/* Native question-bank UI; the hidden bridge retains Google's user authorization. */
(function(){
  const root = document.getElementById('panel-kho-cau-hoi');
  const app = 'https://script.google.com/macros/s/AKfycbwLX_omKLtpLruP-77M6SqvWV6wP9JXHr2SImWgbDYWsIrQxqWjGVXjLCEOSPdIYIz90g/exec';
  const el = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  let data=[],filtered=[],page=1,ready=false,peer=null,peerOrigin='',started=false,seq=0,loading=false;
  const nonce=crypto.randomUUID(),pending=new Map();
  root.className='portal-panel';
  root.innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">Tra cứu kiến nghị và nội dung trả lời</div><h1>Kho câu hỏi</h1><p>Tìm trong nội dung hỏi–đáp, lọc theo tài liệu và mở từng mục để đọc đầy đủ.</p></div><button class="btn primary" id="kbUploadToggle" aria-expanded="false">Tải tài liệu</button></section>
  <div class="kb-summary"><span><b id="kbTotal">—</b> cặp hỏi–đáp</span><span><b id="kbSources">—</b> nguồn tài liệu</span><span id="kbSync" role="status">Đang kết nối…</span></div>
  <section class="card kb-upload" id="kbUpload" hidden><div class="card-h"><h2>Thêm tài liệu vào kho</h2></div><div class="kb-upload-body"><p>Word, PDF, Excel, CSV hoặc TXT · tối đa 20 MB/file. Chỉ tài khoản quản trị được tải lên và nhận diện AI.</p><label class="btn" for="kbFiles">Chọn tài liệu</label><input type="file" id="kbFiles" multiple accept=".doc,.docx,.pdf,.xls,.xlsx,.csv,.txt"><div id="kbQueue" role="status" aria-live="polite"></div></div></section>
  <section class="card"><div class="kb-filters"><label class="kb-search">Từ khóa<input id="kbQuery" type="search" placeholder="Tìm câu hỏi, câu trả lời, tên xã hoặc văn bản…"></label><label>Nguồn tài liệu<select id="kbSource"><option value="">Tất cả nguồn</option></select></label><label>Sắp xếp<select id="kbSort"><option value="new">Mới nhất</option><option value="old">Cũ nhất</option><option value="az">Câu hỏi A–Z</option></select></label></div>
  <div class="kb-actions"><span id="kbCount" aria-live="polite">Đang tải kho câu hỏi…</span><div class="spacer"></div><button class="btn" id="kbReset">Xóa bộ lọc</button><button class="btn" id="kbCsv" disabled>Xuất CSV</button><button class="btn" id="kbRefresh">Làm mới</button></div>
  <div id="kbError" class="kb-error" role="alert" hidden></div><div id="kbList" class="kb-list" aria-busy="true"><div class="empty">Đang kết nối kho dữ liệu…</div></div>
  <div class="pager"><label>Số dòng <select class="inp" id="kbSize"><option>10</option><option selected>20</option><option>50</option><option>100</option></select></label><span id="kbPageInfo"></span><div><button class="btn" id="kbPrev" disabled>Trước</button> <button class="btn" id="kbNext" disabled>Sau</button></div></div></section>
  <dialog id="kbDetail" class="kb-dialog" aria-labelledby="kbDetailTitle"><div class="card-h"><h2 id="kbDetailTitle">Chi tiết hỏi–đáp</h2><div class="spacer"></div><button class="btn" id="kbClose">Đóng</button></div><div class="kb-detail-body"><p id="kbDetailSource" class="kb-source"></p><h3>Câu hỏi / kiến nghị</h3><div id="kbDetailQuestion" class="kb-full"></div><h3>Nội dung trả lời</h3><div id="kbDetailAnswer" class="kb-full"></div></div><div class="card-h"><button class="btn" id="kbCopy">Sao chép nội dung</button></div></dialog>`;
  function error(message){el('kbError').hidden=false;el('kbError').textContent=message;}
  function render(){
    const q=normalize(el('kbQuery').value.trim()),source=el('kbSource').value;
    filtered=data.filter(r=>(!q||r.search.includes(q))&&(!source||r.nguon===source));
    filtered.sort((a,b)=>el('kbSort').value==='az'?a.hoi.localeCompare(b.hoi,'vi'):(el('kbSort').value==='old'?1:-1)*(a.thoiGian-b.thoiGian));
    const size=Number(el('kbSize').value),pages=Math.max(1,Math.ceil(filtered.length/size));page=Math.min(page,pages);
    const start=(page-1)*size;
    el('kbCount').textContent=filtered.length+' kết quả'+(filtered.length!==data.length?' / '+data.length+' cặp hỏi–đáp':'');
    el('kbList').innerHTML=filtered.length?filtered.slice(start,start+size).map((r,i)=>`<article class="kb-item"><div class="kb-item-head"><span class="kb-number">${start+i+1}</span><span class="kb-source">${escape(r.nguon)}</span><time>${r.thoiGian?new Date(r.thoiGian).toLocaleDateString('vi-VN'):''}</time></div><div class="kb-columns"><div><div class="kb-label">Câu hỏi / kiến nghị</div><p class="kb-excerpt kb-question">${escape(r.hoi)}</p></div><div><div class="kb-label kb-answer-label">Nội dung trả lời</div><p class="kb-excerpt">${escape(r.dap)}</p></div></div><button class="btn" data-detail="${start+i}">Đọc đầy đủ</button></article>`).join(''):'<div class="empty">'+(data.length?'Không có kết quả phù hợp. Thử từ khóa khác hoặc xóa bộ lọc.':'Kho chưa có cặp hỏi–đáp đã trả lời.')+'</div>';
    el('kbPageInfo').textContent=filtered.length?`${start+1}–${Math.min(start+size,filtered.length)} / ${filtered.length} · Trang ${page}/${pages}`:'0 kết quả';
    el('kbPrev').disabled=page<=1;el('kbNext').disabled=page>=pages;el('kbCsv').disabled=!filtered.length;
  }
  function call(action,args=[]){
    if(!ready)return Promise.reject(new Error('Kết nối Google chưa sẵn sàng.'));
    const id=String(++seq);return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Chờ xử lý quá lâu. Hãy làm mới để kiểm tra kết quả trước khi tải lại tài liệu.'));},action==='xuLyTaiLen'?360000:45000);
      pending.set(id,{resolve,reject,timer});peer.postMessage({type:'kb:request',nonce,id,action,args},peerOrigin);
    });
  }
  async function refresh(){
    if(loading)return;loading=true;el('kbRefresh').disabled=true;el('kbList').setAttribute('aria-busy','true');el('kbError').hidden=true;el('kbSync').textContent='Đang đồng bộ…';
    try{const rows=await call('timKiem',['']);if(!Array.isArray(rows))throw new Error('Kho dữ liệu trả về định dạng không hợp lệ.');data=rows.map(r=>({hoi:String(r.hoi||''),dap:String(r.dap||''),nguon:String(r.nguon||''),thoiGian:Number(r.thoiGian)||0,search:normalize([r.hoi,r.dap,r.nguon].join(' '))}));
      const selected=el('kbSource').value,sources=[...new Set(data.map(r=>r.nguon).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
      el('kbSource').innerHTML='<option value="">Tất cả nguồn</option>'+sources.map(s=>`<option value="${escape(s)}">${escape(s)}</option>`).join('');if(sources.includes(selected))el('kbSource').value=selected;
      el('kbTotal').textContent=data.length;el('kbSources').textContent=sources.length;el('kbSync').textContent='Cập nhật '+new Date().toLocaleTimeString('vi-VN');render();
    }catch(e){error(e.message);el('kbSync').textContent='Chưa đồng bộ được';if(!data.length){el('kbList').innerHTML='<div class="empty">Không tải được dữ liệu. Bấm Làm mới để thử lại.</div>';el('kbCount').textContent='Chưa tải được dữ liệu';}}
    finally{loading=false;el('kbRefresh').disabled=false;el('kbList').setAttribute('aria-busy','false');}
  }
  window.addEventListener('message',e=>{
    const m=e.data;if(!m||m.nonce!==nonce||!/^https:\/\/[a-z0-9-]+\.googleusercontent\.com$/.test(e.origin))return;
    if(m.type==='kb:ready'&&!ready){peer=e.source;peerOrigin=e.origin;ready=true;refresh();return;}
    if(e.source!==peer||e.origin!==peerOrigin||m.type!=='kb:result')return;
    const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.ok?p.resolve(m.data):p.reject(new Error(m.error||'Không thực hiện được yêu cầu.'));
  });
  function start(){if(started)return;started=true;const bridge=document.createElement('iframe');bridge.hidden=true;bridge.title='Kết nối kho dữ liệu';bridge.src=app+'?bridge=1&nonce='+encodeURIComponent(nonce);root.appendChild(bridge);
    setTimeout(()=>{if(!ready){el('kbSync').textContent='Cần kết nối Google';el('kbList').setAttribute('aria-busy','false');el('kbCount').textContent='Chưa kết nối';el('kbList').innerHTML='<div class="empty">Chưa kết nối được kho dữ liệu.</div>';error('Nếu phiên Google đã hết hạn, đăng nhập bằng tài khoản được cấp quyền rồi tải lại trang.');const login=document.createElement('a');login.className='btn';login.textContent='Kết nối tài khoản Google';login.href=app;login.target='_blank';login.rel='noopener';el('kbError').append(' ',login);}},25000);
  }
  new MutationObserver(()=>{if(!root.hidden)start();}).observe(root,{attributes:true,attributeFilter:['hidden']});if(!root.hidden)start();
  ['kbQuery','kbSource','kbSort','kbSize'].forEach(id=>el(id).addEventListener(id==='kbQuery'?'input':'change',()=>{page=1;render();}));
  el('kbReset').onclick=()=>{el('kbQuery').value='';el('kbSource').value='';page=1;render();};
  el('kbPrev').onclick=()=>{page--;render();};el('kbNext').onclick=()=>{page++;render();};
  el('kbRefresh').onclick=()=>{if(!ready){location.reload();return;}refresh();};
  el('kbList').onclick=e=>{const b=e.target.closest('[data-detail]');if(!b)return;const r=filtered[Number(b.dataset.detail)];el('kbDetailSource').textContent=r.nguon;el('kbDetailQuestion').textContent=r.hoi;el('kbDetailAnswer').textContent=r.dap;el('kbCopy').onclick=()=>navigator.clipboard.writeText(`Câu hỏi: ${r.hoi}\n\nTrả lời: ${r.dap}\n\nNguồn: ${r.nguon}`).then(()=>toast('Đã sao chép nội dung.'),()=>toast('Không sao chép được.',true));el('kbDetail').showModal();};
  el('kbClose').onclick=()=>el('kbDetail').close();
  el('kbUploadToggle').onclick=()=>{el('kbUpload').hidden=!el('kbUpload').hidden;el('kbUploadToggle').setAttribute('aria-expanded',String(!el('kbUpload').hidden));};
  el('kbFiles').onchange=async e=>{
    const files=Array.from(e.target.files);e.target.value='';if(!ready){error('Chưa kết nối được Google. Chưa tải tài liệu lên.');return;}
    el('kbFiles').disabled=true;
    try{for(const file of files){const line=document.createElement('p');el('kbQueue').appendChild(line);line.textContent=file.name+' — Đang kiểm tra…';
      if(!/\.(docx?|pdf|xlsx?|csv|txt)$/i.test(file.name)||file.size>20*1024*1024){line.textContent=file.name+' — Định dạng chưa hỗ trợ hoặc quá 20 MB.';continue;}
      try{line.textContent=file.name+' — Đang nhận diện, vui lòng giữ trang mở…';const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Không đọc được file.'));r.readAsDataURL(file);});const result=await call('xuLyTaiLen',[file.name,file.type,base64]);line.textContent=file.name+' — Đã xử lý '+result.soCap+' cặp hỏi–đáp.';await refresh();}catch(err){line.textContent=file.name+' — '+err.message;}
    }}finally{el('kbFiles').disabled=false;}
  };
  el('kbCsv').onclick=()=>{const cell=v=>'"'+(/^[=+@\-\t\r]/.test(v)?"'":'')+String(v).replace(/"/g,'""')+'"';const csv='\ufeff'+[['Câu hỏi','Câu trả lời','Nguồn','Thời gian'],...filtered.map(r=>[r.hoi,r.dap,r.nguon,r.thoiGian?new Date(r.thoiGian).toISOString():''])].map(row=>row.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='Kho_cau_hoi.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
