const MOVIES = [
    {id:1, title:'Bayang Senja', genre:'Drama', rating:'13+', dur:112, emoji:'🌇'},
    {id:2, title:'Operasi Kuda Hitam', genre:'Aksi', rating:'17+', dur:128, emoji:'🐎'},
    {id:3, title:'Petualangan Mimo', genre:'Animasi', rating:'SU', dur:95, emoji:'🐙'},
    {id:4, title:'Rumah di Ujung Gang', genre:'Horor', rating:'17+', dur:101, emoji:'👻'},
    {id:5, title:'Cinta Dua Koma', genre:'Komedi', rating:'13+', dur:106, emoji:'😂'},
    {id:6, title:'Galaksi Terakhir', genre:'Fiksi Ilmiah', rating:'13+', dur:135, emoji:'🚀'}
  ];
  const TIMES = ['12:00', '15:00', '18:30', '21:00'];
  const ROWS = 'ABCDEFGH'.split(''), COLS = 8, MAX = 6, HOLD = 600;
  const PRICE = {wd:40000, we:50000, prem:15000};
  const PROMO = {HEMAT10:{p:10, min:1}, NONTON20:{p:20, min:3}};
  const KEY = 'tiketku_orders';
  
  const $ = s => document.querySelector(s);
  const rp = n => 'Rp' + n.toLocaleString('id-ID');
  const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
  const save = o => localStorage.setItem(KEY, JSON.stringify(o));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const isWE = ds => [0, 6].includes(new Date(ds + 'T00:00').getDay());
  const showDT = (d, t) => new Date(d + 'T' + t);
  const fmtD = ds => new Date(ds + 'T00:00').toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  const seatPrice = id => (isWE(st.date) ? PRICE.we : PRICE.wd) + ('GH'.includes(id[0]) ? PRICE.prem : 0);
  
  let st = {movie:null, date:'', time:'', seats:[], promo:null, timer:null, left:0};
  
  /* ---------- UI helpers ---------- */
  let tt;
  function toast(m) {
    const t = $('#toast');
    t.textContent = m; t.className = 'show';
    clearTimeout(tt); tt = setTimeout(() => t.className = '', 3200);
  }
  function ask(title, text, fn) {
    $('#mT').textContent = title; $('#mX').textContent = text;
    $('#modal').hidden = false;
    $('#mOk').onclick = () => { $('#modal').hidden = true; fn(); };
    $('#mNo').onclick = () => $('#modal').hidden = true;
  }
  function show(v) {
    if (v !== 'booking') { clearSeats(); }
    ['movies', 'booking', 'ticket', 'orders'].forEach(x => $('#v-' + x).hidden = x !== v);
    document.querySelectorAll('.nav').forEach(b => b.classList.toggle('on', (b.dataset.v === 'orders') === (v === 'orders')));
    if (v === 'orders') renderOrders();
    window.scrollTo(0, 0);
  }
  
  /* ---------- Daftar film ---------- */
  function renderMovies() {
    const q = $('#q').value.toLowerCase(), g = $('#g').value;
    const l = MOVIES.filter(m => m.title.toLowerCase().includes(q) && (!g || m.genre === g));
    $('#movies').innerHTML = l.length ? l.map(m => `
      <div class="card mv">
        <div class="poster">${m.emoji}</div>
        <h3>${m.title}</h3>
        <p class="mut">${m.genre}, ${m.dur} menit</p>
        <span class="badge">${m.rating}</span>
        <button class="btn" data-id="${m.id}">Pesan tiket</button>
      </div>`).join('') : '<p class="mut">Film tidak ditemukan. Coba kata kunci atau genre lain.</p>';
  }
  function pickMovie(m) {
    if (m.rating === '17+') ask('Film 17+', 'Film ini hanya untuk penonton berusia 17 tahun ke atas. Lanjutkan pemesanan?', () => openBooking(m));
    else openBooking(m);
  }
  function openBooking(m) {
    clearSeats();
    st.movie = m; st.date = iso(new Date()); st.time = '';
    ['name', 'email', 'phone'].forEach(i => $('#' + i).value = '');
    ['eName', 'eEmail', 'ePhone', 'eSeat'].forEach(i => $('#' + i).textContent = '');
    $('#bTitle').textContent = m.title;
    $('#bMeta').textContent = m.genre + ', ' + m.dur + ' menit, rating ' + m.rating;
    renderBooking();
    show('booking');
  }
  
  /* ---------- Booking ---------- */
  function renderBooking() { renderDates(); renderTimes(); renderSeats(); renderSummary(); }
  function renderDates() {
    $('#dates').innerHTML = [...Array(5)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() + i);
      const s = iso(d);
      const lb = d.toLocaleDateString('id-ID', {weekday:'short', day:'numeric', month:'short'}) + (isWE(s) ? ' *' : '');
      return `<button class="chip ${s === st.date ? 'on' : ''}" data-d="${s}">${lb}</button>`;
    }).join('');
  }
  function renderTimes() {
    $('#times').innerHTML = TIMES.map(t => {
      const past = showDT(st.date, t) <= new Date();
      return `<button class="chip ${t === st.time ? 'on' : ''}" data-t="${t}" ${past ? 'disabled title="Sudah lewat"' : ''}>${t}</button>`;
    }).join('');
  }
  function taken() {
    const key = st.movie.id + st.date + st.time;
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const s = new Set();
    let i = 0;
    ROWS.forEach(r => { for (let c = 1; c <= COLS; c++, i++) if (((h ^ (i * 2654435761)) >>> 0) % 7 === 0) s.add(r + c); });
    load().forEach(o => {
      if (o.status === 'Aktif' && o.mid === st.movie.id && o.date === st.date && o.time === st.time) o.seats.forEach(x => s.add(x));
    });
    return s;
  }
  function renderSeats() {
    const el = $('#seats');
    if (!st.time) { el.innerHTML = '<p class="mut">Pilih jam tayang dulu untuk melihat kursi.</p>'; return; }
    const t = taken();
    el.innerHTML = ROWS.map(r => `<div class="srow"><b>${r}</b>${[...Array(COLS)].map((_, k) => {
      const id = r + (k + 1);
      const c = t.has(id) ? 'booked' : st.seats.includes(id) ? 'sel' : '';
      return `<button class="s ${'GH'.includes(r) ? 'prem' : ''} ${c}" data-id="${id}" ${c === 'booked' ? 'disabled' : ''} aria-label="Kursi ${id}">${k + 1}</button>`;
    }).join('')}</div>`).join('');
  }
  function toggleSeat(id) {
    const i = st.seats.indexOf(id);
    if (i > -1) st.seats.splice(i, 1);
    else {
      if (st.seats.length >= MAX) return toast('Maksimal ' + MAX + ' kursi per transaksi.');
      st.seats.push(id);
    }
    st.seats.length ? startTimer() : stopTimer();
    renderSeats(); renderSummary();
  }
  
  /* ---------- Timer tahan kursi ---------- */
  function tick() {
    const t = $('#timer');
    t.hidden = false;
    t.textContent = 'Kursi ditahan: ' + pad(Math.floor(st.left / 60)) + ':' + pad(st.left % 60);
  }
  function startTimer() {
    if (st.timer) return;
    st.left = HOLD; tick();
    st.timer = setInterval(() => {
      st.left--;
      if (st.left <= 0) {
        clearSeats();
        toast('Waktu habis, kursi dilepas. Silakan pilih ulang.');
        renderSeats(); renderSummary();
      } else tick();
    }, 1000);
  }
  function stopTimer() { clearInterval(st.timer); st.timer = null; $('#timer').hidden = true; }
  function clearSeats() {
    st.seats = []; st.promo = null; stopTimer();
    $('#promo').value = ''; $('#pMsg').textContent = '';
  }
  
  /* ---------- Ringkasan & promo ---------- */
  function calc() {
    const sub = st.seats.reduce((a, s) => a + seatPrice(s), 0);
    let d = 0;
    const p = PROMO[st.promo];
    if (p) {
      if (st.seats.length >= p.min) d = Math.round(sub * p.p / 100);
      else { st.promo = null; $('#pMsg').textContent = 'Promo dilepas: minimal ' + p.min + ' tiket.'; }
    }
    return {sub, d, tot: sub - d};
  }
  function renderSummary() {
    const c = calc();
    $('#sSeats').textContent = st.seats.length ? 'Kursi ' + st.seats.slice().sort().join(', ') + ' (' + st.seats.length + ' tiket)' : 'Belum ada kursi dipilih';
    $('#sSub').textContent = rp(c.sub);
    $('#sDisc').textContent = '-' + rp(c.d);
    $('#sTot').textContent = rp(c.tot);
  }
  function applyPromo() {
    const c = $('#promo').value.trim().toUpperCase(), m = $('#pMsg');
    if (!c) { m.textContent = 'Masukkan kode promo.'; return; }
    const p = PROMO[c];
    if (!p) { m.textContent = 'Kode promo tidak valid.'; return; }
    if (st.seats.length < p.min) { m.textContent = 'Kode ' + c + ' butuh minimal ' + p.min + ' tiket.'; return; }
    st.promo = c;
    m.textContent = 'Promo ' + c + ' dipakai: diskon ' + p.p + '%.';
    renderSummary();
  }
  
  /* ---------- Pembayaran ---------- */
  function pay() {
    const n = $('#name').value.trim(), e = $('#email').value.trim(), h = $('#phone').value.trim();
    const er = {
      eName: /^[A-Za-z .']{3,}$/.test(n) ? '' : 'Nama minimal 3 huruf, tanpa angka.',
      eEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? '' : 'Format email tidak valid.',
      ePhone: /^08\d{8,11}$/.test(h) ? '' : 'Nomor HP diawali 08 dan 10-13 digit.',
      eSeat: !st.time ? 'Pilih jam tayang dulu.' : !st.seats.length ? 'Pilih minimal 1 kursi.' : ''
    };
    Object.keys(er).forEach(k => $('#' + k).textContent = er[k]);
    if (Object.values(er).some(Boolean)) return;
    const c = calc();
    ask('Konfirmasi pembayaran',
      st.movie.title + ', ' + fmtD(st.date) + ' ' + st.time + ', kursi ' + st.seats.slice().sort().join(', ') + '. Total ' + rp(c.tot) + '. Lanjutkan?',
      () => checkout(n, e, h, c));
  }
  function checkout(n, e, h, c) {
    const t = taken();
    if (st.seats.some(s => t.has(s))) {
      st.seats = st.seats.filter(s => !t.has(s));
      renderSeats(); renderSummary();
      return toast('Ada kursi yang sudah dipesan orang lain. Pilih ulang.');
    }
    const o = load();
    let code;
    do { code = 'TKT' + Math.random().toString(36).slice(2, 8).toUpperCase(); } while (o.some(x => x.code === code));
    const ord = {code, mid:st.movie.id, title:st.movie.title, date:st.date, time:st.time,
      seats:st.seats.slice().sort(), name:n, email:e, phone:h, total:c.tot, promo:st.promo, status:'Aktif'};
    o.push(ord); save(o);
    clearSeats();
    showTicket(ord);
  }
  function showTicket(o) {
    $('#ticket').innerHTML = `
      <p class="mut">Pembayaran berhasil. Kode booking:</p>
      <div class="code">${o.code}</div>
      <h3>${o.title}</h3>
      <p>${fmtD(o.date)}, pukul ${o.time}</p>
      <p>Kursi: <b>${o.seats.join(', ')}</b></p>
      <p>Atas nama ${o.name}</p>
      <p>Total dibayar: <b>${rp(o.total)}</b>${o.promo ? ' (promo ' + o.promo + ')' : ''}</p>
      <p class="mut">Simpan kode ini. Cek atau batalkan di menu Pesanan Saya.</p>`;
    show('ticket');
  }
  
  /* ---------- Pesanan saya ---------- */
  const canCancel = o => o.status === 'Aktif' && showDT(o.date, o.time) - new Date() > 3600000;
  function renderOrders() {
    const q = $('#oq').value.trim().toUpperCase();
    const l = load().filter(o => o.code.includes(q)).reverse();
    $('#olist').innerHTML = l.length ? l.map(o => `
      <div class="card">
        <div class="row"><b>${o.code}</b><span class="badge ${o.status === 'Aktif' ? 'ok' : 'no'}">${o.status}</span></div>
        <p>${o.title}, ${fmtD(o.date)} ${o.time}</p>
        <p class="mut">Kursi ${o.seats.join(', ')}, ${rp(o.total)}</p>
        ${o.status === 'Aktif' ? (canCancel(o)
          ? `<button class="btn out" data-c="${o.code}">Batalkan pesanan</button>`
          : '<small class="mut">Tidak bisa dibatalkan: kurang dari 1 jam sebelum tayang atau sudah lewat.</small>') : ''}
      </div>`).join('') : '<p class="mut">Belum ada pesanan yang cocok. Pesan tiket dari menu Film.</p>';
  }
  function cancelOrder(code) {
    ask('Batalkan pesanan', 'Pesanan ' + code + ' akan dibatalkan dan kursi dilepas. Lanjutkan?', () => {
      const o = load(), x = o.find(i => i.code === code);
      if (x) { x.status = 'Dibatalkan'; save(o); }
      renderOrders(); toast('Pesanan ' + code + ' dibatalkan.');
    });
  }
  
  /* ---------- Event ---------- */
  [...new Set(MOVIES.map(m => m.genre))].forEach(g => $('#g').insertAdjacentHTML('beforeend', `<option>${g}</option>`));
  renderMovies();
  $('#q').oninput = $('#g').onchange = renderMovies;
  document.querySelectorAll('.nav').forEach(b => b.onclick = () => show(b.dataset.v));
  $('#movies').onclick = e => { const b = e.target.closest('[data-id]'); if (b) pickMovie(MOVIES.find(m => m.id == b.dataset.id)); };
  $('#back').onclick = $('#toMovies').onclick = () => show('movies');
  $('#dates').onclick = e => { const b = e.target.closest('[data-d]'); if (b) { clearSeats(); st.date = b.dataset.d; st.time = ''; renderBooking(); } };
  $('#times').onclick = e => { const b = e.target.closest('[data-t]'); if (b && !b.disabled) { clearSeats(); st.time = b.dataset.t; renderBooking(); } };
  $('#seats').onclick = e => { const b = e.target.closest('[data-id]'); if (b && !b.disabled) toggleSeat(b.dataset.id); };
  $('#applyPromo').onclick = applyPromo;
  $('#pay').onclick = pay;
  $('#oq').oninput = renderOrders;
  $('#olist').onclick = e => { const b = e.target.closest('[data-c]'); if (b) cancelOrder(b.dataset.c); };
  $('#resetData').onclick = () => ask('Reset data demo', 'Semua pesanan tersimpan akan dihapus. Lanjutkan?', () => { localStorage.removeItem(KEY); renderOrders(); toast('Data demo direset.'); });