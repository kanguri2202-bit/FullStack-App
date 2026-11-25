/* =====================================================================
   VELOZ — site de locação de veículos integrado ao Supabase
   Use SOMENTE a chave publicável (anon). Nunca coloque a service_role aqui.
   ===================================================================== */
const SUPABASE_URL = "https://ccenuxeyldccxvvgmepc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1_rY3QdKG6S32ffZEgIJdw_bmDC4nIw";
// Se a biblioteca do Supabase não carregar, o site continua abrindo (só sem login/reservas).
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ---------- utilidades ---------- */
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => Number(n).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
const digits = s => String(s ?? "").replace(/\D/g, "");
const localISO = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const maskCPF = v => { v = digits(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"); };
const maskPhone = v => { v = digits(v).slice(0, 11); if (v.length > 10) return v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3"); if (v.length > 6) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3"); if (v.length > 2) return v.replace(/(\d{2})(\d+)/, "($1) $2"); return v; };
function validCPF(c) {
  c = digits(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  for (let t = 9; t < 11; t++) { let s = 0; for (let i = 0; i < t; i++) s += Number(c[i]) * (t + 1 - i); if ((s * 10) % 11 % 10 !== Number(c[t])) return false; }
  return true;
}
const cleanRG = v => String(v).toUpperCase().replace(/[^0-9A-Z]/g, "");
const validRG = v => /^[0-9A-Z]{5,14}$/.test(cleanRG(v)) && /\d/.test(cleanRG(v));
const fmtDoc = (type, num) => type === "CPF" ? maskCPF(num) : num;
const STATUS = {pending:"Aguardando confirmação", confirmed:"Confirmada", cancelled:"Cancelada"};

// Traduz erros do Supabase para mensagens claras
function errMsg(e) {
  const m = String(e?.message || "").toLowerCase();
  if (/failed to fetch|networkerror|load failed|network request failed/.test(m)) return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("already registered")) return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.includes("rate limit") || e?.status === 429) return "Muitas tentativas ou e-mails enviados. Aguarde alguns minutos e tente de novo.";
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short"))) return "Senha muito fraca ou curta. Use pelo menos 8 caracteres.";
  if (e?.code === "23505") return "Este registro já existe.";
  if (e?.code === "42501" || m.includes("row-level security") || m.includes("permission denied")) return "Sem permissão para esta ação.";
  return e?.message || "Erro inesperado. Tente novamente.";
}

/* ---------- frota (fotos reais; se a 1ª falhar, tenta a próxima) ---------- */
const commons = f => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=960";
const fleet = [
 {id:1,name:"Volvo XC40",category:"SUV",price:389,gear:"Automático",seats:5,bags:3,images:[commons("2018 Volvo XC40 First Edition T5 AWD Automatic 2.0 Front.jpg"),"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Volvo_XC40_B4_CMA_Crystal_White_Pearl_%281%29.jpg/1280px-Volvo_XC40_B4_CMA_Crystal_White_Pearl_%281%29.jpg"],desc:"Design escandinavo, conforto e tecnologia para viagens com personalidade."},
 {id:2,name:"BMW Série 3",category:"Sedã",price:459,gear:"Automático",seats:5,bags:3,images:[commons("2019 BMW 318d SE Automatic 2.0 Front.jpg"),"https://upload.wikimedia.org/wikipedia/commons/e/ee/2016_BMW_318i_%28F30_LCI%29_Sports_Line_sedan_%282018-11-02%29_01.jpg"],desc:"Uma experiência de condução refinada, com conforto e desempenho."},
 {id:3,name:"Jeep Compass",category:"SUV",price:329,gear:"Automático",seats:5,bags:3,images:[commons("2019 Jeep Compass Limited 2.4L, front 7.6.19.jpg"),"https://upload.wikimedia.org/wikipedia/commons/9/96/2018_Jeep_Compass_Latitude_2.4L_front_4.20.19.jpg"],desc:"Espaço e versatilidade para explorar novos destinos com tranquilidade."},
 {id:4,name:"Honda Civic",category:"Sedã",price:279,gear:"Automático",seats:5,bags:3,images:[commons("2017 Honda Civic VTi sedan (2018-08-06) 01.jpg"),"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/2015_Honda_Civic_LX_Sedan_in_Alabaster_Silver_Metallic%2C_front_left%2C_2024-06-28.jpg/1280px-2015_Honda_Civic_LX_Sedan_in_Alabaster_Silver_Metallic%2C_front_left%2C_2024-06-28.jpg"],desc:"Elegância e eficiência para quem valoriza cada detalhe da viagem."},
 {id:5,name:"Hyundai HB20",category:"Econômico",price:159,gear:"Manual",seats:5,bags:2,images:[commons("Hyundai HB20 06 2016 BSB 2593.jpg"),"https://s3.agsistema.net/6441/vehicles/2548647/photos/Iel0WZcFqZUlKIbIw0YbVbwb5NZKrjv0.jpg?partner=dealersites"],desc:"Praticidade e economia para os deslocamentos do dia a dia."},
 {id:6,name:"Chevrolet Onix",category:"Compacto",price:169,gear:"Automático",seats:5,bags:2,images:[commons("Chevrolet Onix 20150814-DSC05650.JPG"),"https://upload.wikimedia.org/wikipedia/commons/e/e7/2022_Chevrolet_Onix_Turbo_LTZ_%28Chile%29_front_view_%28cropped%29.jpg"],desc:"Compacto, confortável e pronto para acompanhar sua rotina."}
];
function photoNext(img) {
  const v = fleet.find(x => x.id === Number(img.dataset.vid)), i = Number(img.dataset.i) + 1;
  if (v && i < v.images.length) { img.dataset.i = i; img.src = v.images[i]; return; }
  img.onerror = null; img.style.display = "none"; img.parentElement.classList.add("no-photo");
}
const imgTag = (v, extra = "") => `<img src="${v.images[0]}" data-vid="${v.id}" data-i="0" alt="${esc(v.name)}" referrerpolicy="no-referrer" onerror="photoNext(this)" ${extra}>`;

const grid = document.getElementById("vehicleGrid"), dialog = document.getElementById("reservationDialog"), body = document.getElementById("dialogBody");
let showAll = false, chosen = null, searchDates = {start:"", end:""};
const openDialog = () => { if (!dialog.open) dialog.showModal(); };

function render() {
  let items = [...fleet], q = document.getElementById("searchModel").value.toLowerCase(), cat = document.getElementById("category").value, sort = document.getElementById("sort").value;
  items = items.filter(v => (v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)) && (cat === "Todos" || v.category === cat));
  if (sort === "low") items.sort((a, b) => a.price - b.price);
  if (sort === "high") items.sort((a, b) => b.price - a.price);
  const visible = showAll ? items : items.slice(0, 6);
  grid.innerHTML = visible.length ? visible.map(v => `<article class="vehicle-card"><div class="vehicle-image" data-name="${esc(v.name)}">${imgTag(v, 'loading="lazy"')}<span class="vehicle-category">${v.category.toUpperCase()}</span></div><div class="vehicle-details"><div class="vehicle-title-row"><div><h3>${v.name}</h3><p>ou similar · categoria ${v.category}</p></div><div class="vehicle-price">${money(v.price)}<small>por diária</small></div></div><div class="vehicle-specs"><span>⚙ ${v.gear}</span><span>♙ ${v.seats} lugares</span><span>▱ ${v.bags} malas</span></div><div class="vehicle-actions"><button onclick="showDetails(${v.id})">Conhecer o carro ↗</button><button onclick="reserve(${v.id})">Reservar →</button></div></div></article>`).join("") : '<div class="empty-state">Não encontramos veículos com esses filtros. Tente outra busca.</div>';
  document.getElementById("vehicleCount").textContent = `${items.length} veículos disponíveis para conhecer`;
}
function showDetails(id) {
  const v = fleet.find(x => x.id === id);
  body.innerHTML = `<div class="detail-photo" data-name="${esc(v.name)}">${imgTag(v)}</div><p class="kicker muted">DETALHES DO VEÍCULO</p><h2 style="font:700 26px Manrope;margin:8px 0">${v.name}</h2><p class="dialog-sub">${v.desc}</p><div class="estimate" style="margin:17px 0">Categoria: ${v.category}<br>Transmissão: ${v.gear} · ${v.seats} lugares · ${v.bags} malas<br><strong>${money(v.price)} por diária</strong></div><button class="dialog-submit" style="width:100%" onclick="reserve(${v.id})">Solicitar reserva →</button>`;
  openDialog();
}

/* ---------- reserva (salva na tabela reservations) ---------- */
async function reserve(id) {
  chosen = fleet.find(x => x.id === id);
  const today = localISO(new Date());
  let user = null;
  if (supabaseClient) { try { user = (await supabaseClient.auth.getSession()).data?.session?.user || null; } catch {} }
  body.innerHTML = `<p class="kicker muted">SUA PRÓXIMA VIAGEM</p><h2>Solicitar reserva</h2><p class="dialog-sub">${chosen.name} · ${money(chosen.price)} por diária. ${user ? "Você está conectado, então esta reserva ficará na sua conta." : "Envie seus dados para a nossa equipe confirmar a reserva."}</p>
 <form id="reserveForm" novalidate>
 <label class="full">Nome completo<input name="name" required placeholder="Como podemos chamar você?" value="${esc(user?.user_metadata?.full_name || "")}"></label>
 <label>Telefone<input name="phone" required inputmode="tel" placeholder="(85) 99999-9999"></label>
 <label>E-mail<input name="email" type="email" required placeholder="seu@email.com" value="${esc(user?.email || "")}"></label>
 <label>CPF<input name="cpf" required inputmode="numeric" maxlength="14" placeholder="000.000.000-00"></label>
 <label>Local de retirada<input name="place" required value="Fortaleza, CE"></label>
 <label>Data de retirada<input name="start" type="date" required min="${today}" value="${searchDates.start || ""}"></label>
 <label>Data de devolução<input name="end" type="date" required min="${searchDates.start || today}" value="${searchDates.end || ""}"></label>
 <label class="full">Adicionais<select name="extra"><option value="0">Sem adicionais</option><option value="25">Condutor adicional — R$ 25/dia</option><option value="20">Cadeirinha infantil — R$ 20/dia</option><option value="40">Ambos — R$ 40/dia</option></select></label>
 <div class="estimate full" id="estimate">Escolha as datas para calcular o valor estimado.</div>
 <p class="form-error full" id="reserveError" role="alert"></p>
 <button class="dialog-submit" type="submit">Enviar solicitação ↗</button></form>`;
  const form = document.getElementById("reserveForm"), f = form.elements, estimate = document.getElementById("estimate"), err = document.getElementById("reserveError");
  const days = () => Math.ceil((new Date(f.end.value + "T12:00:00") - new Date(f.start.value + "T12:00:00")) / 86400000);
  function calc() {
    const d = days();
    if (f.start.value && f.end.value && d > 0) { const extra = Number(f.extra.value); estimate.innerHTML = `${d} diária(s) × ${money(chosen.price)}<br>Adicionais: ${money(extra * d)}<br><strong>Estimativa total: ${money((chosen.price + extra) * d)}</strong>`; }
    else estimate.textContent = "A devolução precisa ser posterior à retirada.";
  }
  f.start.addEventListener("change", () => { f.end.min = f.start.value; calc(); });
  f.end.addEventListener("change", calc); f.extra.addEventListener("change", calc);
  f.cpf.addEventListener("input", () => { f.cpf.value = maskCPF(f.cpf.value); });
  f.phone.addEventListener("input", () => { f.phone.value = maskPhone(f.phone.value); });
  calc();
  form.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = "";
    const d = days();
    if (!f.name.value.trim() || f.name.value.trim().split(/\s+/).length < 2) { err.textContent = "Informe seu nome completo."; return; }
    if (digits(f.phone.value).length < 10) { err.textContent = "Informe um telefone válido com DDD."; return; }
    if (!validEmail(f.email.value.trim())) { err.textContent = "Informe um e-mail válido."; return; }
    if (!validCPF(f.cpf.value)) { err.textContent = "CPF inválido. Confira os 11 dígitos."; return; }
    if (!f.start.value || !f.end.value || d < 1) { err.textContent = "A devolução precisa ser posterior à retirada."; return; }
    if (!supabaseClient) { err.textContent = "Não foi possível conectar ao sistema. Atualize a página e tente novamente."; return; }
    const extra = Number(f.extra.value), total = (chosen.price + extra) * d;
    const pickupLocation = f.place.value.trim();
    const pickupDate = f.start.value;
    const returnDate = f.end.value;
    if (!pickupLocation || !pickupDate || !returnDate) {
      err.textContent = "Informe o local de retirada e as duas datas.";
      return;
    }
    // Envia os nomes exatos das colunas obrigatórias do Supabase e mantém
    // os campos antigos usados pela interface do site.
    const base = {
      vehicle_id: Number(chosen.id),
      vehicle_name: chosen.name,
      vehicle_category: chosen.category,
      customer_name: f.name.value.trim().replace(/\\s+/g, " "),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      cpf: digits(f.cpf.value),
      pickup_location: pickupLocation,
      pickup_place: pickupLocation,
      pickup_date: pickupDate,
      start_date: pickupDate,
      end_date: returnDate,
      extra_per_day: extra,
      daily_price: chosen.price,
      total_price: total,
      status: "pending",
      user_id: user?.id || null
    };
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; submit.textContent = "Enviando...";
    try {
      let code = "";
      for (let i = 0; i < 3; i++) {
        code = "VZ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        const {error} = await supabaseClient.from("reservations").insert({code, ...base});
        if (!error) break;
        if (error.code !== "23505" || i === 2) throw error;   // código repetido: tenta outro
      }
      body.innerHTML = `<p class="kicker muted">SOLICITAÇÃO RECEBIDA</p><h2>Obrigado, ${esc(base.customer_name.split(" ")[0])}.</h2><p class="dialog-sub">Sua solicitação foi registrada e nossa equipe vai entrar em contato para confirmar os detalhes.</p><div class="estimate" style="margin:20px 0"><strong>Código ${code}</strong><br>${chosen.name}<br>${base.start_date.split("-").reverse().join("/")} até ${base.end_date.split("-").reverse().join("/")}<br>Retirada: ${esc(base.pickup_place)}<br><strong>Valor estimado: ${money(total)}</strong></div><button class="dialog-submit" style="width:100%" onclick="dialog.close()">Concluir</button>`;
    } catch (error) {
      console.error("Falha ao registrar reserva:", error);
      err.textContent = "Não foi possível enviar: " + errMsg(error);
      submit.disabled = false; submit.textContent = "Enviar solicitação ↗";
    }
  });
  openDialog();
}

function notify(msg) { const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 3200); }

/* ---------- eventos da página ---------- */
document.getElementById("searchModel").addEventListener("input", render);
document.getElementById("category").addEventListener("change", render);
document.getElementById("sort").addEventListener("change", render);
document.getElementById("toggleAll").addEventListener("click", () => { showAll = !showAll; document.getElementById("toggleAll").innerHTML = showAll ? 'Mostrar menos ↑' : 'Ver todos os veículos <span>→</span>'; render(); });
document.getElementById("searchForm").addEventListener("submit", e => { e.preventDefault(); const s = document.getElementById("pickupDate").value, r = document.getElementById("returnDate").value; if (!s || !r || r <= s) { notify("Escolha uma devolução posterior à retirada."); return; } searchDates = {start:s, end:r}; document.getElementById("frota").scrollIntoView({behavior:"smooth"}); notify("Período selecionado. Escolha um veículo."); });
document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
document.getElementById("mobileMenu").addEventListener("click", () => document.getElementById("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => document.getElementById("mainNav").classList.remove("open")));
{
  const s = new Date(); s.setDate(s.getDate() + 1); const e = new Date(s); e.setDate(e.getDate() + 3);
  const p = document.getElementById("pickupDate"), r = document.getElementById("returnDate");
  p.min = localISO(new Date()); p.value = localISO(s); r.min = localISO(s); r.value = localISO(e);
  searchDates = {start:localISO(s), end:localISO(e)};   // a reserva já abre com as datas padrão da busca
}

/* =====================================================================
   CONTA (login / cadastro / logout) — compartilhada por clientes e vendedores
   ===================================================================== */
function updateAccountButton(session) {
  const b = document.getElementById("accountAccess");
  if (b) b.textContent = session?.user ? "Minha conta" : "Entrar / cadastrar";
}
function needBackend() {
  if (supabaseClient) return true;
  notify("Não foi possível carregar o sistema. Verifique sua conexão e atualize a página.");
  return false;
}
async function getRole(user) {
  const {data, error} = await supabaseClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return error ? null : (data?.role || null);
}
async function currentUser() {
  const {data} = await supabaseClient.auth.getSession();
  return data?.session?.user || null;
}

// "next" diz para onde ir depois de entrar: "account" (cliente) ou "seller" (painel)
function renderLogin(next) {
  const seller = next === "seller";
  body.innerHTML = `<p class="kicker muted">${seller ? "ACESSO RESTRITO" : "BEM-VINDO À VELOZ"}</p><h2>${seller ? "Área do vendedor" : "Entre na sua conta"}</h2><p class="dialog-sub">${seller ? "Entre com o e-mail e a senha da sua conta de vendedor." : "Acesse ou crie seu cadastro sem sair deste site."}</p>
 <form id="loginForm" novalidate>
  <label class="full">E-mail<input name="email" type="email" autocomplete="email" required placeholder="seu@email.com"></label>
  <label class="full">Senha<input name="password" type="password" autocomplete="current-password" required placeholder="Sua senha"></label>
  <p class="form-error full" id="authError" role="alert"></p>
  <button class="dialog-submit" type="submit">Entrar</button>
 </form>
 <p class="seller-switch">Ainda não tem cadastro? <button type="button" id="goSignup">Criar conta</button></p>`;
  document.getElementById("goSignup").onclick = () => renderSignup(next);
  document.getElementById("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget, err = document.getElementById("authError"), btn = f.querySelector('button[type="submit"]');
    err.textContent = "";
    if (!validEmail(f.email.value.trim()) || !f.password.value) { err.textContent = "Informe e-mail e senha."; return; }
    if (!needBackend()) return;
    btn.disabled = true; btn.textContent = "Entrando...";
    try {
      const {data, error} = await supabaseClient.auth.signInWithPassword({email:f.email.value.trim(), password:f.password.value});
      if (error) throw error;
      updateAccountButton(data.session); notify("Login realizado com sucesso.");
      await (seller ? renderSellerProfile() : renderAccountArea());
    } catch (error) { err.textContent = errMsg(error); btn.disabled = false; btn.textContent = "Entrar"; }
  });
}
function renderSignup(next) {
  const seller = next === "seller";
  body.innerHTML = `<p class="kicker muted">${seller ? "NOVO ACESSO" : "NOVO CLIENTE"}</p><h2>Crie sua conta</h2><p class="dialog-sub">${seller ? "Depois de confirmar o e-mail, o administrador precisa liberar o perfil de vendedor." : "Preencha seus dados para ter seu cadastro na Veloz."}</p>
 <form id="signupForm" novalidate>
  <label class="full">Nome completo<input name="name" required autocomplete="name" placeholder="Seu nome completo"></label>
  <label class="full">E-mail<input name="email" type="email" required autocomplete="email" placeholder="seu@email.com"></label>
  <label>Senha<input name="password" type="password" required autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label>
  <label>Confirmar senha<input name="confirm" type="password" required autocomplete="new-password" placeholder="Repita a senha"></label>
  <p class="form-error full" id="authError" role="alert"></p>
  <button class="dialog-submit" type="submit">Criar minha conta</button>
 </form>
 <p class="seller-switch">Já tem cadastro? <button type="button" id="goLogin">Voltar para entrar</button></p>`;
  document.getElementById("goLogin").onclick = () => renderLogin(next);
  document.getElementById("signupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget, err = document.getElementById("authError"), btn = f.querySelector('button[type="submit"]');
    err.textContent = "";
    const name = f.name.value.trim().replace(/\s+/g, " "), email = f.email.value.trim();
    if (name.split(" ").length < 2) { err.textContent = "Informe nome e sobrenome."; return; }
    if (!validEmail(email)) { err.textContent = "Informe um e-mail válido."; return; }
    if (f.password.value.length < 8) { err.textContent = "A senha precisa ter pelo menos 8 caracteres."; return; }
    if (f.password.value !== f.confirm.value) { err.textContent = "As senhas não coincidem."; return; }
    if (!needBackend()) return;
    btn.disabled = true; btn.textContent = "Criando conta...";
    try {
      const {data, error} = await supabaseClient.auth.signUp({email, password:f.password.value, options:{data:{full_name:name}, emailRedirectTo:window.location.origin + "/"}});
      if (error) throw error;
      // E-mail já cadastrado: o Supabase não devolve erro, devolve usuário sem "identities"
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) { err.textContent = "Este e-mail já está cadastrado. Tente entrar."; btn.disabled = false; btn.textContent = "Criar minha conta"; return; }
      if (data.session) { updateAccountButton(data.session); notify("Conta criada. Bem-vindo(a)!"); await (seller ? renderSellerProfile() : renderAccountArea()); return; }
      body.innerHTML = `<p class="kicker muted">QUASE LÁ</p><h2>Confira seu e-mail</h2><p class="dialog-sub">Enviamos uma mensagem para <strong>${esc(email)}</strong>. Clique no link de confirmação (veja também a caixa de spam) e depois volte ao site para entrar com seu e-mail e senha.</p><button class="dialog-submit" style="width:100%" id="afterSignup">Voltar para entrar</button>`;
      document.getElementById("afterSignup").onclick = () => renderLogin(next);
    } catch (error) { err.textContent = errMsg(error); btn.disabled = false; btn.textContent = "Criar minha conta"; }
  });
}
async function signOutAll() {
  const {error} = await supabaseClient.auth.signOut();
  if (error) { notify("Não foi possível sair: " + errMsg(error)); return false; }
  updateAccountButton(null); return true;
}

async function openAccountArea() { if (!needBackend()) return; openDialog(); await renderAccountArea(); }
async function renderAccountArea() {
  const user = await currentUser();
  if (!user) { renderLogin("account"); return; }
  const role = await getRole(user);
  const {data: mine, error: rErr} = await supabaseClient.from("reservations").select("code,vehicle_name,start_date,end_date,total_price,status").eq("user_id", user.id).order("created_at", {ascending:false}).limit(20);
  const list = rErr ? '<p class="seller-empty">Não foi possível carregar suas reservas.</p>' : (mine || []).map(r => `<article class="seller-customer"><div><strong>${esc(r.vehicle_name)} · ${esc(r.code)}</strong><small>${esc(r.start_date.split("-").reverse().join("/"))} até ${esc(r.end_date.split("-").reverse().join("/"))} · ${money(r.total_price)}</small><small>${esc(STATUS[r.status] || r.status)}</small></div></article>`).join("") || '<p class="seller-empty">Você ainda não fez nenhuma reserva logado nesta conta.</p>';
  body.innerHTML = `<p class="kicker muted">SUA CONTA VELOZ</p><h2>Olá, ${esc(user.user_metadata?.full_name || user.email?.split("@")[0] || "cliente")}.</h2><p class="dialog-sub">Você está conectado com <strong>${esc(user.email)}</strong>.</p>
  ${role === "seller" ? '<button class="dialog-submit" style="width:100%;margin-top:14px" id="openPanel">Abrir painel do vendedor →</button>' : ""}
  <h3 class="seller-section-title">Minhas reservas</h3><div class="seller-customer-list">${list}</div>
  <button class="seller-logout" style="margin-top:20px" id="accountLogout">Sair da conta</button>`;
  document.getElementById("accountLogout").onclick = async () => { if (await signOutAll()) { renderLogin("account"); notify("Você saiu da sua conta."); } };
  const p = document.getElementById("openPanel"); if (p) p.onclick = renderSellerProfile;
}

/* =====================================================================
   PAINEL DO VENDEDOR (só abre se profiles.role = 'seller')
   ===================================================================== */
async function openSellerArea() { if (!needBackend()) return; openDialog(); await renderSellerProfile(); }
async function renderSellerProfile() {
  const user = await currentUser();
  if (!user) { renderLogin("seller"); return; }
  const role = await getRole(user);
  if (role !== "seller") {
    body.innerHTML = `<p class="kicker muted">ACESSO RESTRITO</p><h2>Aguardando liberação</h2><p class="dialog-sub">A conta <strong>${esc(user.email)}</strong> está conectada, mas ainda não tem permissão de vendedor. Peça ao administrador para liberar o perfil.</p><button class="dialog-submit" style="width:100%" id="sellerOut">Sair</button>`;
    document.getElementById("sellerOut").onclick = async () => { if (await signOutAll()) { renderLogin("seller"); } };
    return;
  }
  const [c, r] = await Promise.all([
    supabaseClient.from("seller_customers").select("*").order("created_at", {ascending:false}),
    supabaseClient.from("reservations").select("*").order("created_at", {ascending:false}).limit(100)
  ]);
  const customers = c.data || [], reservations = r.data || [];
  const customerHTML = c.error ? '<p class="seller-empty">Erro ao carregar clientes.</p>' : customers.map(x => `<article class="seller-customer"><div><strong>${esc(x.full_name)}</strong><small>${esc(x.document_type)}: ${esc(fmtDoc(x.document_type, x.document_number))}</small><small>${esc([x.phone, x.email].filter(Boolean).join(" · ") || "Sem contato informado")}</small></div><button data-del="${esc(x.id)}">Excluir</button></article>`).join("") || '<p class="seller-empty">Nenhum cliente cadastrado.</p>';
  const resHTML = r.error ? '<p class="seller-empty">Erro ao carregar reservas.</p>' : reservations.map(x => `<article class="seller-customer"><div><strong>${esc(x.customer_name)} · ${esc(x.vehicle_name)}</strong><small>${esc(x.code)} · ${esc(x.start_date.split("-").reverse().join("/"))} até ${esc(x.end_date.split("-").reverse().join("/"))} · ${money(x.total_price)}</small><small>${esc(x.phone)} · ${esc(x.email)}</small></div><select class="status-select" data-res="${esc(x.id)}" aria-label="Status da reserva">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></article>`).join("") || '<p class="seller-empty">Nenhuma reserva.</p>';
  body.innerHTML = `<div class="seller-profile-head"><div><p class="kicker muted">PAINEL DO VENDEDOR</p><h2>Olá, ${esc(user.user_metadata?.full_name || user.email)}.</h2><p class="dialog-sub">${esc(user.email)}</p></div><button class="seller-logout" id="sellerLogoutBtn">Sair</button></div>
  <h3 class="seller-section-title">Cadastrar cliente</h3>
  <form id="customerForm" novalidate>
   <label class="full">Nome completo<input name="name" required placeholder="Nome do cliente"></label>
   <label>Documento<select name="docType"><option value="CPF">CPF</option><option value="RG">RG</option></select></label>
   <label><span id="docLabel">Número do CPF</span><input name="docNumber" required maxlength="14" inputmode="numeric" placeholder="000.000.000-00" autocomplete="off"></label>
   <label>Telefone<input name="phone" inputmode="tel" placeholder="(85) 99999-9999"></label>
   <label>E-mail (opcional)<input name="email" type="email" placeholder="cliente@email.com"></label>
   <p class="form-error full" id="customerError" role="alert"></p>
   <button class="dialog-submit" type="submit">Cadastrar cliente</button>
  </form>
  <h3 class="seller-section-title">Meus clientes (${customers.length})</h3><div class="seller-customer-list">${customerHTML}</div>
  <h3 class="seller-section-title">Solicitações de reserva (${reservations.length})</h3><div class="seller-customer-list">${resHTML}</div>`;

  document.getElementById("sellerLogoutBtn").onclick = async () => { if (await signOutAll()) { renderLogin("seller"); notify("Você saiu da área do vendedor."); } };
  const form = document.getElementById("customerForm"), f = form.elements;
  const setType = () => { const rg = f.docType.value === "RG"; document.getElementById("docLabel").textContent = rg ? "Número do RG" : "Número do CPF"; f.docNumber.value = ""; f.docNumber.placeholder = rg ? "00.000.000-0" : "000.000.000-00"; f.docNumber.inputMode = rg ? "text" : "numeric"; };
  f.docType.addEventListener("change", setType);
  f.docNumber.addEventListener("input", () => { f.docNumber.value = f.docType.value === "CPF" ? maskCPF(f.docNumber.value) : f.docNumber.value.toUpperCase().replace(/[^0-9A-Z.\-]/g, ""); });
  f.phone.addEventListener("input", () => { f.phone.value = maskPhone(f.phone.value); });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = document.getElementById("customerError"), btn = form.querySelector('button[type="submit"]'); err.textContent = "";
    const type = f.docType.value, raw = f.docNumber.value.trim(), name = f.name.value.trim().replace(/\s+/g, " "), email = f.email.value.trim();
    if (name.split(" ").length < 2) { err.textContent = "Informe o nome completo do cliente."; return; }
    if (type === "CPF" && !validCPF(raw)) { err.textContent = "CPF inválido. Confira os 11 dígitos."; return; }
    if (type === "RG" && !validRG(raw)) { err.textContent = "RG inválido. Use de 5 a 14 caracteres (números e, se houver, letras)."; return; }
    if (email && !validEmail(email)) { err.textContent = "E-mail do cliente inválido."; return; }
    btn.disabled = true; btn.textContent = "Salvando...";
    const {error} = await supabaseClient.from("seller_customers").insert({seller_id:user.id, full_name:name, document_type:type, document_number:type === "CPF" ? digits(raw) : cleanRG(raw), phone:f.phone.value.trim() || null, email:email || null});
    if (error) { err.textContent = error.code === "23505" ? `Você já cadastrou um cliente com este ${type}.` : "Não foi possível cadastrar: " + errMsg(error); btn.disabled = false; btn.textContent = "Cadastrar cliente"; return; }
    notify("Cliente salvo na nuvem."); await renderSellerProfile();
  });
  body.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    if (!confirm("Excluir este cliente?")) return;
    const {error} = await supabaseClient.from("seller_customers").delete().eq("id", b.dataset.del);
    if (error) { notify("Não foi possível excluir: " + errMsg(error)); return; }
    notify("Cliente excluído."); await renderSellerProfile();
  }));
  body.querySelectorAll("[data-res]").forEach(s => s.addEventListener("change", async () => {
    const {error} = await supabaseClient.from("reservations").update({status:s.value}).eq("id", s.dataset.res);
    notify(error ? "Não foi possível atualizar: " + errMsg(error) : "Status atualizado.");
  }));
}

if (supabaseClient) supabaseClient.auth.onAuthStateChange((_e, session) => updateAccountButton(session));
render();
updateAccountButton(null);
