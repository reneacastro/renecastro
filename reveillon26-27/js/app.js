/* =====================================================================
   Réveillon 2026 › 2027 — one page de decisão
   Tudo é renderizado a partir de js/dados.js.
   Para adicionar uma casa: acrescente um objeto em DADOS.casas.
   ===================================================================== */
(function () {
'use strict';

var D = window.DADOS, CFG = window.CONFIG || {};
var GRUPO = D.pessoas.length;
var listeners = [];   // cleanup — nada de handler órfão em window/document

function on(el, ev, fn, opts) { el.addEventListener(ev, fn, opts); listeners.push([el, ev, fn, opts]); }
function offAll() { listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = []; }

/* ---------------------- utilidades ---------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function nota(n) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }); }
function brl(n, casas) {
  return 'R$ ' + Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: casas == null ? 0 : casas,
    maximumFractionDigits: casas == null ? 0 : casas
  });
}
// datas ISO nunca passam por new Date() — UTC midnight volta 1 dia em pt-BR
function dataCurta(iso) {
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] : iso;
}
function dataLonga(iso) {
  var MES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? Number(m[3]) + ' de ' + MES[Number(m[2]) - 1] + ' de ' + m[1] : iso;
}
function mesAno(ym) {
  var MES = { '01':'jan','02':'fev','03':'mar','04':'abr','05':'mai','06':'jun','07':'jul','08':'ago','09':'set','10':'out','11':'nov','12':'dez' };
  var m = String(ym).match(/^(\d{4})-(\d{2})/);
  return m ? MES[m[2]] + '. de ' + m[1] : ym;
}
function tempo(min) {
  var h = Math.floor(min / 60), r = min % 60;
  return h ? h + 'h' + (r ? String(r).padStart(2, '0') : '') : r + 'min';
}
// as fotos vêm etiquetadas pelo Airbnb em inglês; "Other"/"Unassigned" não dizem nada
var AMBIENTES = {
  Living_room: 'Sala de estar', Bedroom: 'Quarto', Kitchen: 'Cozinha', Dining_room: 'Sala de jantar',
  Pool: 'Piscina', Backyard: 'Quintal', Patio: 'Pátio', Full_bathroom: 'Banheiro', Half_bathroom: 'Lavabo',
  Exterior: 'Fachada', 'Balcony/Deck/Porch': 'Varanda', Gym: 'Academia', Garage: 'Garagem'
};
// uma foto pode ter mais de uma etiqueta (ex.: quintal + piscina)
function ambientesDe(f) {
  var tags = Array.isArray(f.t) ? f.t : (f.t ? [f.t] : []);
  return tags.map(function (t) { return AMBIENTES[t] || null; })
             .filter(function (a, i, s) { return a && s.indexOf(a) === i; });
}
function ambientePrincipal(f) { var a = ambientesDe(f); return a.length ? a[0] : null; }
function contaAmbientes(casa) {
  var c = {};
  casa.fotos.forEach(function (f) { ambientesDe(f).forEach(function (a) { c[a] = (c[a] || 0) + 1; }); });
  return c;
}
function temAmbiente(f, nome) { return ambientesDe(f).indexOf(nome) > -1; }

// a CDN do Airbnb só serve estas larguras — qualquer outra devolve 404
var LARGURAS = [240, 320, 480, 720, 960, 1200, 1440, 1920];
function img(url, w) {
  if (!url) return '';
  var alvo = LARGURAS.filter(function (x) { return x >= w; })[0] || LARGURAS[LARGURAS.length - 1];
  return url + (url.indexOf('?') > -1 ? '&' : '?') + 'im_w=' + alvo;
}
function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* avatar: usa /fotos/<slug>.jpg se existir, senão inicial com cor estável */
function corDe(txt) {
  var h = 0;
  for (var i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) % 360;
  // amarelos parecem mais claros que azuis na mesma luminosidade; sem compensar,
  // a inicial branca fica com contraste abaixo de 4,5:1 nesses matizes
  var claro = Math.max(0, Math.cos((h - 60) * Math.PI / 180));
  return 'hsl(' + h + ' 52% ' + (32 - claro * 5).toFixed(1) + '%)';
}
// fotos/manifest.json diz quem já tem foto. Sem ele a página pediria
// fotos/<slug>.jpg de todo mundo e encheria o console de 404.
var COM_FOTO = {};
function carregaManifesto() {
  return fetch('fotos/manifest.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : { temFoto: [] }; })
    .then(function (m) { (m.temFoto || []).forEach(function (slug) { COM_FOTO[slug] = true; }); })
    .catch(function () { /* sem manifesto, todo mundo fica na inicial */ });
}

// a inicial fica sempre embaixo; a foto entra por cima de quem tiver
function avatarHTML(p, cls) {
  return '<span class="av ' + (cls || '') + '" style="background:' + corDe(p.nome) + '" aria-hidden="true">' +
           '<b>' + esc(p.nome.trim().charAt(0)) + '</b>' +
           (COM_FOTO[p.slug] ? '<img src="fotos/' + esc(p.slug) + '.jpg" alt="" onerror="this.remove()">' : '') +
         '</span>';
}
function fotoOuInicial(url, nome, cls, tam) {
  if (url) return '<img class="' + cls + '" src="' + esc(img(url, tam || 120)) + '" alt="" loading="lazy">';
  return '<div class="ph ' + cls + '" style="background:' + corDe(nome || '?') + ';color:#fff;display:grid;place-items:center;font-weight:700">' +
         esc((nome || '?').trim().charAt(0)) + '</div>';
}

/* ---------------------- toast ---------------------- */
var elToasts = document.getElementById('toasts');
function toast(msg, tipo) {
  var ico = tipo === 'err' ? '⚠️' : tipo === 'ok' ? '✅' : 'ℹ️';
  var t = el('<div class="toast ' + (tipo || '') + '"><span class="ico">' + ico + '</span><span>' + esc(msg) + '</span></div>');
  elToasts.appendChild(t);
  setTimeout(function () {
    t.style.transition = 'opacity .25s'; t.style.opacity = '0';
    setTimeout(function () { t.remove(); }, 260);
  }, tipo === 'err' ? 6000 : 3800);
}

/* ---------------------- derivados por casa ---------------------- */
function porPessoa(casa) { return casa.preco.total / GRUPO; }

function regrasFlat(casa) {
  return (casa.regras || []).reduce(function (a, g) { return a.concat(g.i || []); }, []);
}
function achaRegra(casa, re) {
  var r = regrasFlat(casa).filter(function (x) { return re.test(x); });
  return r.length ? r[0] : null;
}

// o total de "camas" do anúncio junta cama de quarto com sofá de sala.
// para 13 pessoas essa diferença é o que decide quem dorme bem.
function analiseCamas(casa) {
  var emQuarto = 0, foraDoQuarto = 0, comodos = 0;
  (casa.quartos || []).forEach(function (q) {
    var ehQuarto = /^quarto/i.test(q.n || '');
    if (ehQuarto) comodos++;
    (q.d || '').split('·').forEach(function (parte) {
      var m = parte.match(/(\d+)\s*(camas?|sof[áa]s?|colch[õo]es?|colch[ãa]o)/i);
      if (!m) return;
      var n = Number(m[1]);
      if (ehQuarto && /cama/i.test(m[2])) emQuarto += n;
      else foraDoQuarto += n;
    });
  });
  return { emQuarto: emQuarto, foraDoQuarto: foraDoQuarto, comodos: comodos };
}

/* pontos de atenção — derivados por regra, valem para qualquer casa nova */
function atencoes(casa) {
  var out = [], rs = regrasFlat(casa);

  if (casa.capacidade.maxHospedes < GRUPO) {
    out.push({ i: '🚫', t: 'Não cabe o grupo inteiro',
      d: 'O anúncio limita a <b>' + casa.capacidade.maxHospedes + ' hóspedes</b> e somos ' + GRUPO +
         '. Faltam ' + (GRUPO - casa.capacidade.maxHospedes) + ' vagas — teria que negociar com o anfitrião ou alguém ficar fora.' });
  }
  var ac = analiseCamas(casa);
  if (casa.capacidade.camas != null && casa.capacidade.camas < GRUPO) {
    var lugares = casa.capacidade.camas + ac.foraDoQuarto;
    var d = '<b>' + casa.capacidade.camas + ' camas</b>' +
            (ac.comodos ? ' em ' + ac.comodos + (ac.comodos === 1 ? ' quarto' : ' quartos') : '') +
            ' para ' + GRUPO + ' pessoas.';
    if (ac.foraDoQuarto) {
      d += ' As salas somam mais ' + ac.foraDoQuarto + ' lugares de dormir — mesmo contando tudo, são ' +
           lugares + ' para ' + GRUPO + '.';
    }
    d += lugares < GRUPO
      ? ' Faltam ' + (GRUPO - lugares) + ': alguém dorme em colchão.'
      : ' Parte do grupo dorme em sofá de sala.';
    out.push({ i: '🛏️', t: 'Menos camas que gente', d: d });
  }
  if (ac.comodos && casa.capacidade.quartos > ac.comodos) {
    out.push({ i: '🚪', t: 'O anúncio conta mais quartos do que mostra',
      d: 'Diz <b>' + casa.capacidade.quartos + ' quartos</b>, mas em “Onde você vai dormir” só ' +
         (ac.comodos === 1 ? 'aparece 1' : 'aparecem ' + ac.comodos) +
         ' — o lugar que sobra é sala de estar com sofá, não quarto. Vale confirmar com a anfitriã.' });
  }
  if (casa.capacidade.banheiros == null) {
    var amb = contaAmbientes(casa);
    var provas = [];
    if (amb['Banheiro']) provas.push(amb['Banheiro'] + (amb['Banheiro'] === 1 ? ' foto de banheiro' : ' fotos de banheiro'));
    if (amb['Lavabo']) provas.push(amb['Lavabo'] + ' de lavabo');
    out.push({ i: '🚽', t: 'Banheiros não informados no anúncio',
      d: (casa.capacidade.banheirosNota || 'O anúncio não informa quantos banheiros a casa tem.') +
         (provas.length ? ' Nas fotos dá para contar <b>' + provas.join(' e ') + '</b> — o campo está em branco, não é que falte banheiro. Ainda assim, confirme o número com a anfitriã.' : '') });
  }
  if (rs.some(function (r) { return /não são permitidas festas|proibido festas/i.test(r); })) {
    out.push({ i: '🎉', t: 'Regra: festas não são permitidas',
      d: 'A casa proíbe festas e eventos no regulamento. Para uma virada de ano com ' + GRUPO +
         ' pessoas, alinhe com o anfitrião antes de reservar o que conta como "festa".' });
  }
  if (rs.some(function (r) { return /horário de silêncio/i.test(r); })) {
    out.push({ i: '🔇', t: 'Tem horário de silêncio',
      d: 'O anúncio registra horário de silêncio. Confirme como fica na noite de 31/12.' });
  }
  var faltas = (casa.naoTem || []).filter(function (x) { return /detector de fumaça|monóxido/i.test(x); });
  if (faltas.length) {
    out.push({ i: '🧯', t: 'Sem ' + faltas.join(' e ').toLowerCase(),
      d: 'O anfitrião marcou como indisponível no anúncio. Não é impeditivo, mas é bom saber.' });
  }
  var citadas = (casa.avaliacoes || []).filter(function (r) { return r.flag === 'atencao'; });
  if (citadas.length) {
    out.push({ i: '💬', t: citadas.length + ' hóspede' + (citadas.length > 1 ? 's citaram' : ' citou') + ' ressalvas',
      d: 'Mesmo com nota 5, aparecem menções a acabamentos inacabados e falta de blackout/cortina de box. Estão marcadas em amarelo nas avaliações abaixo.' });
  }
  return out;
}

/* selo curto que resume a casa no contexto do grupo */
function selo(casa, todas) {
  var maisBarata = todas.slice().sort(function (a, b) { return a.preco.total - b.preco.total; })[0];
  var cabe = casa.capacidade.maxHospedes >= GRUPO;
  if (cabe && casa.capacidade.camas >= GRUPO) return { t: 'Cabem os ' + GRUPO + ', com cama para cada um', k: 'ok' };
  if (cabe) return { t: 'Cabem os ' + GRUPO, k: 'ok' };
  if (casa.id === maisBarata.id) return { t: 'A mais barata — mas não cabe todo mundo', k: 'warn' };
  return { t: 'Não cabem os ' + GRUPO, k: 'danger' };
}

/* ---------------------- HERO ---------------------- */
function renderHero() {
  var e = D.evento;
  var faixa = dataCurta(e.checkin) + ' a ' + dataCurta(e.checkout);
  var precos = D.casas.map(porPessoa);
  var menor = Math.min.apply(null, precos), maior = Math.max.apply(null, precos);

  document.getElementById('hero').innerHTML =
    '<p class="eyebrow">' + esc(e.subtitulo) + '</p>' +
    '<h1>Réveillon <em>2026 › 2027</em></h1>' +
    '<p class="hero-lead">Somos ' + GRUPO + ' e temos ' + D.casas.length + ' casa' + (D.casas.length > 1 ? 's' : '') +
      ' na mesa para virar o ano juntos. Aqui está tudo que importa para decidir — preço por cabeça, quanto tempo de estrada, ' +
      'quantos banheiros, e o que quem já ficou lá falou. No fim da página, cada um vota.</p>' +
    '<div class="hero-facts">' +
      fact(faixa, e.noites + ' noites') +
      fact(GRUPO + ' pessoas', 'confirmadas') +
      fact(D.casas.length + '', 'casa' + (D.casas.length > 1 ? 's' : '') + ' na disputa') +
      fact(brl(menor, 2) + (menor !== maior ? ' a ' + brl(maior, 2) : ''), 'por pessoa') +
      fact('São Caetano', 'ponto de partida') +
    '</div>' +
    calloutDecisao();
}
function fact(b, s) { return '<div class="fact"><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>'; }

function calloutDecisao() {
  var naoCabem = D.casas.filter(function (c) { return c.capacidade.maxHospedes < GRUPO; });
  var cabem = D.casas.filter(function (c) { return c.capacidade.maxHospedes >= GRUPO; });
  if (!naoCabem.length) return '';
  var nomes = naoCabem.map(function (c) { return '<b>' + esc(c.apelido) + '</b>'; }).join(' e ');
  var txt = '<div class="callout"><span class="ico">⚠️</span><div>' +
    '<h3>Antes de olhar preço, olhe a lotação</h3>' +
    '<p>' + nomes + ' ' + (naoCabem.length > 1 ? 'têm' : 'tem') + ' limite de ' +
      naoCabem.map(function (c) { return c.capacidade.maxHospedes; }).join(' e ') +
      ' hóspedes no anúncio. Somos <strong>' + GRUPO + '</strong>. O preço por pessoa fica bonito no papel, mas ' +
      (naoCabem.length > 1 ? 'essas casas' : 'essa casa') + ' não comporta' + (naoCabem.length > 1 ? 'm' : '') +
      ' o grupo sem negociar com o anfitrião.</p>';
  if (cabem.length) {
    txt += '<p>' + (cabem.length > 1 ? 'Cabem' : 'Cabe') + ' o grupo inteiro: ' +
      cabem.map(function (c) { return '<strong>' + esc(c.apelido) + '</strong>'; }).join(', ') + '.</p>';
  }
  return txt + '</div></div>';
}

/* ---------------------- CASAS ---------------------- */
function renderCasas() {
  var wrap = document.getElementById('lista-casas');
  wrap.innerHTML = '';
  D.casas.forEach(function (casa) { wrap.appendChild(cardCasa(casa)); });
}

function cardCasa(casa) {
  var pp = porPessoa(casa);
  var sel = selo(casa, D.casas);
  var ats = atencoes(casa);
  var capa = casa.fotos.slice(0, 5);
  var cap = casa.capacidade;

  var flags = [];
  if (casa.rating.favorito) flags.push('<span class="badge badge-gold">🏅 Preferida dos hóspedes</span>');
  if (casa.anfitriao.superhost) flags.push('<span class="badge">⭐ Superhost</span>');
  flags.push('<span class="badge badge-' + sel.k + '">' + esc(sel.t) + '</span>');

  var html =
  '<article class="card casa" id="casa-' + esc(casa.id) + '">' +
    '<div class="gal" data-gal="' + esc(casa.id) + '">' +
      '<div class="casa-flags">' + flags.join('') + '</div>' +
      capa.map(function (f, i) {
        return '<figure class="gal-i" data-idx="' + i + '"><img src="' + esc(img(f.u, i === 0 ? 1000 : 480)) +
               '" alt="Foto ' + (i + 1) + ' — ' + esc(casa.apelido) + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '"></figure>';
      }).join('') +
      '<button type="button" class="btn btn-sm gal-more" data-gal-open="' + esc(casa.id) + '">Ver as ' + casa.fotos.length + ' fotos</button>' +
    '</div>' +

    '<div class="casa-body">' +
      '<div class="casa-head">' +
        '<div class="casa-head-l">' +
          '<div class="casa-kicker">' + esc(casa.apelido) + '</div>' +
          '<h3>' + esc(casa.titulo) + '</h3>' +
          '<p class="casa-loc">' + esc(casa.local.detalhe) + ' · ' + esc(casa.local.cidade) + '/' + esc(casa.local.uf) + '</p>' +
          '<div class="casa-stars">' +
            '<span class="num">★ ' + nota(casa.rating.media) + '</span>' +
            '<span>·</span><a href="#revs-' + esc(casa.id) + '">' + casa.rating.qtd + ' avaliações</a>' +
            '<span>·</span><span>' + esc(casa.anfitriao.nome) + ' é anfitriã' + (casa.anfitriao.superhost ? ' Superhost' : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="preco-box">' +
          '<div class="preco-pp">' + brl(pp, 2) + ' <small>/ pessoa</small></div>' +
          '<div class="preco-tot"><b>' + brl(casa.preco.total) + '</b> no total · ' + casa.datas.noites + ' noites</div>' +
          '<div class="preco-obs">' + esc(casa.preco.taxas) + '.<br>' + esc(casa.preco.cancelamento) + '.</div>' +
        '</div>' +
      '</div>' +

      '<div class="stats">' +
        stat(cap.maxHospedes + ' hóspedes', 'limite do anúncio', cap.maxHospedes < GRUPO ? 'is-alert' : 'is-good') +
        stat(cap.quartos + ' quartos', 'dormitórios') +
        stat(cap.camas + ' camas', camasSub(casa), cap.camas < GRUPO ? 'is-alert' : 'is-good') +
        stat(cap.banheiros == null ? 'não informado' : String(cap.banheiros).replace('.', ',') + ' banheiros', 'sanitários', cap.banheiros == null ? 'is-alert' : 'is-good') +
        stat(String(casa.distancia.km).replace('.', ',') + ' km', 'de São Caetano') +
        stat(tempo(casa.distancia.min), 'de carro, sem trânsito') +
      '</div>' +

      (casa.preco.nota ? '<div class="callout" style="margin-top:0"><span class="ico">💰</span><div><h3>Sobre o preço</h3><p>' + casa.preco.nota + '</p></div></div>' : '') +

      bloco('O que o Airbnb destaca', '<div class="destaques">' + casa.destaquesAirbnb.map(function (h) {
        return '<div class="destaque"><span class="ico">✦</span><div><b>' + esc(h.headline) + '</b><span>' + esc(h.body || '') + '</span></div></div>';
      }).join('') + '</div>') +

      (ats.length ? bloco('Pontos de atenção <span class="cnt">— o que eu olharia antes de fechar</span>',
        '<ul class="atencao-list">' + ats.map(function (a) {
          return '<li><span class="ico">' + a.i + '</span><span><b>' + esc(a.t) + '.</b> ' + a.d + '</span></li>';
        }).join('') + '</ul>') : '') +

      bloco('Estrutura e comodidades', comodidadesHTML(casa)) +

      bloco('Fotos por ambiente <span class="cnt">— clique para ver só aquele cômodo</span>', ambientesHTML(casa)) +

      (casa.quartos.length ? bloco('Onde você vai dormir', '<div class="quartos">' + casa.quartos.map(function (q, i) {
        return '<div class="quarto">' + (q.f ? '<img src="' + esc(img(q.f, 420)) + '" alt="' + esc(q.n) + '" loading="lazy" data-quarto="' + esc(casa.id) + '" data-quarto-url="' + esc(q.f) + '">' : '') +
               '<div class="q-t"><b>' + esc(q.n) + '</b><span>' + esc(q.d || '—') + '</span></div></div>';
      }).join('') + '</div>') : '') +

      bloco('Notas por categoria', '<div class="notas">' + casa.rating.categorias.map(function (c) {
        return '<div class="nota"><span>' + esc(c.label) + '</span><b>' + esc(c.rating) + '</b>' +
               '<div class="bar"><i style="width:' + Math.round((c.pct || 0) * 100) + '%"></i></div></div>';
      }).join('') + '</div>') +

      bloco('Anfitriã', '<div class="host">' +
        fotoOuInicial(casa.anfitriao.foto, casa.anfitriao.nome, '', 160) +
        '<div class="host-i"><b>' + esc(casa.anfitriao.nome) + (casa.anfitriao.superhost ? ' · Superhost' : '') + '</b>' +
        '<span>★ ' + nota(casa.anfitriao.media) + ' em ' + casa.anfitriao.qtd + ' avaliações · ' +
        esc(casa.anfitriao.resposta) + ' · ' + esc(casa.anfitriao.tempo) + '</span></div></div>') +

      bloco('Regras que pesam', regrasHTML(casa)) +

      '<div class="bloco" id="revs-' + esc(casa.id) + '">' +
        '<h4>O que os hóspedes falaram <span class="cnt">— ' + casa.avaliacoes.length + ' de ' + casa.rating.qtd + '</span></h4>' +
        (casa.rating.tags && casa.rating.tags.length ?
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' + casa.rating.tags.map(function (t) {
            return '<span class="badge">' + esc(t.name) + ' <b style="opacity:.6">' + t.count + '</b></span>';
          }).join('') + '</div>' : '') +
        '<div class="revs" data-revs="' + esc(casa.id) + '"></div>' +
        (casa.avaliacoes.length > 4 ? '<div style="margin-top:14px"><button type="button" class="btn btn-sm" data-revs-more="' + esc(casa.id) + '">Ver todas as ' + casa.avaliacoes.length + ' avaliações</button></div>' : '') +
      '</div>' +

      '<div class="casa-cta">' +
        '<a class="btn" href="' + esc(casa.url) + '?check_in=' + casa.datas.checkin + '&check_out=' + casa.datas.checkout + '&adults=' + Math.min(GRUPO, casa.capacidade.maxHospedes) + '" target="_blank" rel="noopener">Abrir no Airbnb ↗</a>' +
        '<a class="btn" href="https://www.google.com/maps/dir/São+Caetano+do+Sul,+SP/' + casa.local.lat + ',' + casa.local.lng + '" target="_blank" rel="noopener">Ver a rota ↗</a>' +
        '<button type="button" class="btn btn-primary" data-votar="' + esc(casa.id) + '">Votar nesta casa</button>' +
      '</div>' +
    '</div>' +
  '</article>';

  var node = el(html);
  renderRevs(node.querySelector('[data-revs="' + casa.id + '"]'), casa, 4);
  return node;
}

function camasSub(casa) {
  var ac = analiseCamas(casa);
  if (ac.foraDoQuarto) return '+' + ac.foraDoQuarto + ' sofás = ' + (casa.capacidade.camas + ac.foraDoQuarto) + ' lugares';
  return 'para ' + GRUPO + ' pessoas';
}

function stat(b, s, cls) {
  return '<div class="stat ' + (cls || '') + '"><b>' + esc(b) + '</b><span>' + esc(s) + '</span></div>';
}
function bloco(titulo, corpo) {
  return '<div class="bloco"><h4>' + titulo + '</h4>' + corpo + '</div>';
}

function ambientesHTML(casa) {
  var c = contaAmbientes(casa);
  var ordem = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
  var semTag = casa.fotos.filter(function (f) { return !ambientesDe(f).length; }).length;
  return '<div class="ambientes">' +
    ordem.map(function (a) {
      return '<button type="button" data-amb="' + esc(casa.id) + '" data-amb-nome="' + esc(a) + '">' +
             esc(a) + ' <i>' + c[a] + '</i></button>';
    }).join('') +
    '<button type="button" data-amb="' + esc(casa.id) + '" data-amb-nome="">Todas <i>' + casa.fotos.length + '</i></button>' +
    '</div>' +
    (semTag > 0 ? '<p class="cmp-note">' + semTag + (semTag === 1 ? ' foto não vem etiquetada' : ' fotos não vêm etiquetadas') +
      ' pelo Airbnb, e uma mesma foto pode contar em dois ambientes. Em “Todas” aparecem as ' + casa.fotos.length + '.</p>' : '');
}

function comodidadesHTML(casa) {
  var chaves = /piscina|churrasqueira|hidromassagem|jacuzzi|academia|lareira|ar.condicionado|wi-fi|cozinha|estacionamento|lago|beira|forno|máquina de lavar|self check-in|fechadura|animais|espreguiçadeira|rampa|cadeira alta|ethernet|tv/i;
  var itens = [];
  casa.comodidades.forEach(function (g) {
    g.i.forEach(function (a) { if (chaves.test(a.n)) itens.push(a.n); });
  });
  itens = itens.filter(function (v, i, s) { return s.indexOf(v) === i; });
  var total = casa.comodidades.reduce(function (n, g) { return n + g.i.length; }, 0);
  return '<ul class="amen">' +
    itens.map(function (n) { return '<li><span class="ico">✓</span>' + esc(n) + '</li>'; }).join('') +
    (casa.naoTem || []).map(function (n) { return '<li class="off"><span class="ico">✕</span>' + esc(n) + '</li>'; }).join('') +
    '</ul>' +
    '<div style="margin-top:14px"><button type="button" class="btn btn-sm" data-amen="' + esc(casa.id) + '">Ver as ' + total + ' comodidades</button></div>';
}

function regrasHTML(casa) {
  return '<div class="destaques">' + casa.regras.map(function (g) {
    return '<div class="destaque"><span class="ico">·</span><div><b>' + esc(g.g) + '</b><span>' + esc(g.i.join(' · ')) + '</span></div></div>';
  }).join('') + '</div>';
}

function renderRevs(box, casa, limite) {
  var lista = casa.avaliacoes.slice(0, limite == null ? casa.avaliacoes.length : limite);
  if (!lista.length) { box.innerHTML = '<p class="placar-vazio">Esta casa ainda não tem avaliações.</p>'; return; }
  box.innerHTML = lista.map(function (r) {
    return '<div class="rev' + (r.flag === 'atencao' ? ' flag' : '') + '">' +
      '<div class="rev-h">' + fotoOuInicial(r.p, r.a, '', 96) +
        '<div><b>' + esc(r.a) + '</b><span>' + esc(mesAno(r.d)) + (r.tenure ? ' · ' + esc(r.tenure) : '') + '</span></div></div>' +
      '<p class="rev-t clamp">' + esc(r.t) + '</p>' +
      (r.flag === 'atencao' ? '<div class="rev-flag-tag"><span class="badge badge-warn">Ressalva citada</span></div>' : '') +
      (r.r ? '<p class="rev-resp"><b>Resposta de ' + esc(casa.anfitriao.nome) + ':</b> ' + esc(r.r) + '</p>' : '') +
    '</div>';
  }).join('');
}

/* ---------------------- COMPARATIVO ---------------------- */
function proibeFesta(c) {
  return regrasFlat(c).some(function (r) { return /não são permitidas festas|proibido festas/i.test(r); });
}
function extras(c) {
  var x = [];
  if (temAmen(c, /hidromassagem|jacuzzi/i)) x.push('hidromassagem');
  if (temAmen(c, /academia/i)) x.push('academia');
  if (temAmen(c, /lareira/i)) x.push('lareira');
  if (temAmen(c, /acesso ao lago|na beira da água|rampa para barcos/i)) x.push('acesso à represa');
  if (temAmen(c, /forno de pizza/i, true)) x.push('forno de pizza');
  if (temAmen(c, /fogão a lenha/i, true)) x.push('fogão a lenha');
  if (temAmen(c, /campo de futebol/i, true)) x.push('campo de futebol');
  return x;
}


function renderCmp() {
  var cs = D.casas;
  var linhas = [
    { k: 'Valor por pessoa', v: function (c) { return brl(porPessoa(c), 2); },
      sub: function () { return 'dividido por ' + GRUPO; }, melhor: 'min', num: porPessoa },
    { k: 'Preço total', v: function (c) { return brl(c.preco.total); },
      sub: function (c) { return c.datas.noites + ' noites · ' + brl(c.preco.total / c.datas.noites, 2) + ' por noite'; },
      melhor: 'min', num: function (c) { return c.preco.total; } },
    { k: 'Cabem os ' + GRUPO + '?', v: function (c) { return c.capacidade.maxHospedes >= GRUPO ? 'Sim' : 'Não'; },
      sub: function (c) { return 'limite de ' + c.capacidade.maxHospedes + ' hóspedes'; },
      melhor: 'max', num: function (c) { return Math.min(c.capacidade.maxHospedes, GRUPO); } },
    { k: 'Camas', v: function (c) { return c.capacidade.camas + ' camas'; },
      sub: function (c) {
        var ac = analiseCamas(c), lug = c.capacidade.camas + ac.foraDoQuarto;
        if (c.capacidade.camas >= GRUPO) return 'cama de verdade para cada um';
        return (ac.foraDoQuarto ? '+' + ac.foraDoQuarto + ' sofás = ' + lug + ' lugares; ' : '') +
               (lug >= GRUPO ? 'dá para todos, contando sofá' : (GRUPO - lug) + ' pessoas em colchão');
      },
      melhor: 'max', num: function (c) { return c.capacidade.camas; } },
    { k: 'Banheiros', v: function (c) { return c.capacidade.banheiros == null ? 'não informado' : String(c.capacidade.banheiros).replace('.', ','); },
      sub: function (c) { return c.capacidade.banheiros == null ? 'anúncio em branco' : (Math.round(GRUPO / c.capacidade.banheiros * 10) / 10).toString().replace('.', ',') + ' pessoas por banheiro'; },
      melhor: 'max', num: function (c) { return c.capacidade.banheiros == null ? -1 : c.capacidade.banheiros; } },
    { k: 'Quartos', v: function (c) { return c.capacidade.quartos + ' quartos'; }, melhor: 'max', num: function (c) { return c.capacidade.quartos; } },
    { k: 'Tempo de estrada', v: function (c) { return tempo(c.distancia.min); },
      sub: function () { return 'de carro, sem trânsito'; },
      melhor: 'min', num: function (c) { return c.distancia.min; } },
    { k: 'Distância', v: function (c) { return String(c.distancia.km).replace('.', ',') + ' km'; },
      sub: function (c) { return 'de São Caetano do Sul'; },
      melhor: 'min', num: function (c) { return c.distancia.km; } },
    { k: 'Nota no Airbnb', v: function (c) { return '★ ' + nota(c.rating.media); },
      sub: function (c) { return c.rating.qtd + ' avaliações' + (c.rating.favorito ? ' · preferida dos hóspedes' : ''); },
      melhor: 'max', num: function (c) { return c.rating.media * 1000 + c.rating.qtd; } },
    { k: 'Anfitriã', v: function (c) { return c.anfitriao.nome; },
      sub: function (c) { return '★ ' + nota(c.anfitriao.media) + ' · ' + c.anfitriao.qtd + ' avaliações · ' + c.anfitriao.tempo.toLowerCase(); } },
    { k: 'Piscina', v: function (c) { return temAmen(c, /piscina/i) ? 'Sim' : 'Não'; }, melhor: 'max', num: function (c) { return temAmen(c, /piscina/i) ? 1 : 0; } },
    { k: 'Churrasqueira', v: function (c) { return temAmen(c, /churrasqueira/i) ? 'Sim' : 'Não'; }, melhor: 'max', num: function (c) { return temAmen(c, /churrasqueira/i) ? 1 : 0; } },
    { k: 'Extra de lazer', v: function (c) { return extras(c).length ? extras(c).join(', ') : '—'; },
      melhor: 'max', num: function (c) { return extras(c).length; } },
    { k: 'Festa é permitida?', v: function (c) { return proibeFesta(c) ? 'Não' : 'Sem restrição'; },
      sub: function (c) { return proibeFesta(c) ? 'o anúncio proíbe festas e eventos' : 'o anúncio não proíbe'; },
      melhor: 'max', num: function (c) { return proibeFesta(c) ? 0 : 1; } },
    { k: 'Check-in / checkout', v: function (c) {
        var i = achaRegra(c, /check-?in/i) || '—', o = achaRegra(c, /checkout/i) || '';
        return i.replace(/^Check-?in:?\s*/i, '') + (o ? ' → ' + o.replace(/^Checkout\s*/i, '') : '');
      } },
    { k: 'Cancelamento', v: function (c) { return c.preco.cancelamento.replace('Cancelamento gratuito até ', 'grátis até '); } }
  ];

  var t = document.getElementById('tabela-cmp');
  var head = '<thead><tr><th>Critério</th>' + cs.map(function (c) {
    return '<th>' + esc(c.apelido) + '</th>';
  }).join('') + '</tr></thead>';

  var body = '<tbody>' + linhas.map(function (l) {
    var vals = cs.map(function (c) { return l.num ? l.num(c) : null; });
    var best = null, worst = null;
    if (l.melhor && cs.length > 1) {
      var validos = vals.filter(function (v) { return typeof v === 'number' && v >= 0; });
      if (validos.length > 1 && Math.min.apply(null, validos) !== Math.max.apply(null, validos)) {
        best = l.melhor === 'min' ? Math.min.apply(null, validos) : Math.max.apply(null, validos);
        worst = l.melhor === 'min' ? Math.max.apply(null, validos) : Math.min.apply(null, validos);
      }
    }
    return '<tr><th scope="row">' + esc(l.k) + '</th>' + cs.map(function (c, i) {
      var cls = best !== null && vals[i] === best ? 'win' : (worst !== null && vals[i] === worst ? 'lose' : '');
      return '<td><b class="' + cls + '">' + esc(l.v(c)) + '</b>' +
             (l.sub ? '<span class="sub">' + esc(l.sub(c)) + '</span>' : '') + '</td>';
    }).join('') + '</tr>';
  }).join('') + '</tbody>';

  t.innerHTML = head + body;

  atualizaDicaTabela();

  var maisBarata = cs.slice().sort(function (a, b) { return porPessoa(a) - porPessoa(b); })[0];
  var dif = Math.abs(porPessoa(cs[cs.length - 1]) - porPessoa(cs[0]));
  document.getElementById('cmp-note').innerHTML =
    cs.length > 1
      ? 'Diferença entre a mais barata e a mais cara: <b>' + brl(dif, 2) + ' por pessoa</b> — ' +
        brl(Math.abs(cs[cs.length - 1].preco.total - cs[0].preco.total)) + ' no total do grupo. ' +
        'Mais barata por cabeça: <b>' + esc(maisBarata.apelido) + '</b>.'
      : '';
}

// olha só as comodidades estruturadas; a descrição é texto livre e dá falso
// positivo (a de Campinas cita "Lagoa do Taquaral" e casava com /lago/)
function atualizaDicaTabela() {
  var box = document.querySelector('.cmp-scroll');
  var dica = document.getElementById('cmp-dica');
  if (!box || !dica) return;
  var rola = box.scrollWidth > box.clientWidth + 2;
  dica.classList.toggle('on', rola && box.scrollLeft < 4);
}

function temAmen(casa, re, olharDescricao) {
  var nasComodidades = casa.comodidades.some(function (g) {
    return g.i.some(function (a) { return re.test(a.n); });
  });
  return nasComodidades || (olharDescricao === true && re.test(casa.descricao || ''));
}

/* ---------------------- PESSOAS ---------------------- */
function renderGente(votos) {
  votos = votos || {};
  var lista = D.pessoas.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  document.getElementById('gente-sub').textContent =
    GRUPO + ' confirmados, em ordem alfabética. O total de cada casa é dividido por ' + GRUPO + '.';
  document.getElementById('lista-gente').innerHTML = lista.map(function (p) {
    var v = votos[p.slug];
    var casa = v && D.casas.filter(function (c) { return c.id === v.casa; })[0];
    return '<a class="pessoa" href="https://www.instagram.com/' + esc(p.ig) + '/" target="_blank" rel="noopener" title="Abrir o Instagram de ' + esc(p.nome) + '">' +
      avatarHTML(p) +
      '<b>' + esc(p.nome) + '</b>' +
      '<span class="ig">@' + esc(p.ig) + '</span>' +
      (casa ? '<span class="badge badge-accent voto-tag">votou ' + esc(casa.apelido) + '</span>' : '') +
    '</a>';
  }).join('');
}

/* ---------------------- LIGHTBOX ---------------------- */
var LB = null;
function abrirGaleria(todas, titulo, idx) {
  fecharGaleria();
  var fotos = todas.slice(), i = idx || 0, filtro = null;

  // ambientes presentes, do mais fotografado ao menos
  var cont = {};
  todas.forEach(function (f) { ambientesDe(f).forEach(function (a) { cont[a] = (cont[a] || 0) + 1; }); });
  var chips = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; });

  var node = el(
    '<div class="lb" role="dialog" aria-modal="true" aria-label="Galeria de fotos">' +
      '<div class="lb-bar"><span class="t"></span>' +
        '<button type="button" class="lb-x" aria-label="Fechar galeria">✕</button></div>' +
      (chips.length > 1 ? '<div class="lb-chips">' +
        '<button type="button" class="lb-chip on" data-f="">Todas <i>' + todas.length + '</i></button>' +
        chips.map(function (a) {
          return '<button type="button" class="lb-chip" data-f="' + esc(a) + '">' + esc(a) + ' <i>' + cont[a] + '</i></button>';
        }).join('') + '</div>' : '') +
      '<div class="lb-stage">' +
        '<button type="button" class="lb-nav prev" aria-label="Foto anterior">‹</button>' +
        '<img alt="">' +
        '<button type="button" class="lb-nav next" aria-label="Próxima foto">›</button>' +
      '</div>' +
      '<div class="lb-thumbs"></div>' +
    '</div>');

  var elImg = node.querySelector('.lb-stage img');
  var elT = node.querySelector('.t');
  var elTh = node.querySelector('.lb-thumbs');

  function pintaThumbs() {
    elTh.innerHTML = fotos.map(function (f, k) {
      return '<img src="' + esc(img(f.u, 240)) + '" alt="" data-k="' + k + '" loading="lazy">';
    }).join('');
  }

  function mostra(k) {
    if (!fotos.length) return;
    i = (k + fotos.length) % fotos.length;
    elImg.src = img(fotos[i].u, 1440);
    elImg.alt = titulo + ' — foto ' + (i + 1) + ' de ' + fotos.length;
    var amb = ambientePrincipal(fotos[i]);
    elT.textContent = titulo + ' · ' + (i + 1) + '/' + fotos.length +
                      (filtro ? ' · ' + filtro : (amb ? ' · ' + amb : ''));
    var ths = elTh.querySelectorAll('img');
    ths.forEach(function (t, k2) { t.classList.toggle('on', k2 === i); });
    if (ths[i]) ths[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    [i + 1, i - 1].forEach(function (n) {
      var f = fotos[(n + fotos.length) % fotos.length];
      if (f) { var pre = new Image(); pre.src = img(f.u, 1440); }
    });
  }

  function aplicaFiltro(a) {
    filtro = a || null;
    fotos = filtro ? todas.filter(function (f) { return temAmbiente(f, filtro); }) : todas.slice();
    node.querySelectorAll('.lb-chip').forEach(function (c) {
      c.classList.toggle('on', (c.getAttribute('data-f') || '') === (filtro || ''));
    });
    pintaThumbs();
    mostra(0);
  }

  function key(e) {
    if (e.key === 'Escape') fecharGaleria();
    else if (e.key === 'ArrowRight') mostra(i + 1);
    else if (e.key === 'ArrowLeft') mostra(i - 1);
  }

  node.querySelector('.lb-x').addEventListener('click', fecharGaleria);
  node.querySelector('.prev').addEventListener('click', function () { mostra(i - 1); });
  node.querySelector('.next').addEventListener('click', function () { mostra(i + 1); });
  node.addEventListener('click', function (e) {
    if (e.target === node || e.target.classList.contains('lb-stage')) return fecharGaleria();
    var chip = e.target.closest && e.target.closest('.lb-chip');
    if (chip) aplicaFiltro(chip.getAttribute('data-f'));
  });
  elTh.addEventListener('click', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-k');
    if (k != null) mostra(Number(k));
  });
  document.addEventListener('keydown', key);

  // no celular a seta é pequena e fica no canto: arrastar é o gesto natural
  var toqueX = 0, toqueY = 0, arrastando = false;
  var stage = node.querySelector('.lb-stage');
  stage.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    toqueX = e.touches[0].clientX; toqueY = e.touches[0].clientY; arrastando = true;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!arrastando) return;
    arrastando = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - toqueX, dy = t.clientY - toqueY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) mostra(i + (dx < 0 ? 1 : -1));
  }, { passive: true });

  document.body.appendChild(node);
  document.body.classList.add('no-scroll');
  LB = { node: node, key: key };
  pintaThumbs();
  mostra(i);
  node.querySelector('.lb-x').focus();
}
function fecharGaleria() {
  if (!LB) return;
  document.removeEventListener('keydown', LB.key);
  LB.node.remove();
  document.body.classList.remove('no-scroll');
  LB = null;
}

/* ---------------------- MODAL simples ---------------------- */
var MODAL = null;
function abrirModal(titulo, corpoHTML) {
  fecharModal();
  var node = el(
    '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-in">' +
        '<div class="modal-h"><h3>' + esc(titulo) + '</h3><button type="button" class="lb-x" style="background:var(--bg-surface);color:var(--fg)" aria-label="Fechar">✕</button></div>' +
        '<div class="modal-b">' + corpoHTML + '</div>' +
        '<div class="modal-f"><button type="button" class="btn" data-fechar>Fechar</button></div>' +
      '</div>' +
    '</div>');
  function key(e) { if (e.key === 'Escape') fecharModal(); }
  node.addEventListener('click', function (e) {
    if (e.target === node || e.target.hasAttribute('data-fechar') || e.target.classList.contains('lb-x')) fecharModal();
  });
  document.addEventListener('keydown', key);
  document.body.appendChild(node);
  document.body.classList.add('no-scroll');
  MODAL = { node: node, key: key };
  node.querySelector('.lb-x').focus();
}
function fecharModal() {
  if (!MODAL) return;
  document.removeEventListener('keydown', MODAL.key);
  MODAL.node.remove();
  if (!LB) document.body.classList.remove('no-scroll');
  MODAL = null;
}

/* ====================================================================
   VOTAÇÃO
   Dois modos: Firebase (compartilhado) ou rascunho local.
   O modo é escolhido pelo que existe em js/config.js — o resto do
   código não sabe a diferença.
   ==================================================================== */
var LS_VOTOS = 'reveillon2627:votos';
var LS_EU = 'reveillon2627:eu';

function lsGet(k, padrao) {
  try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; }
  catch (e) { return padrao; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ }
}

function carregaScript(src) {
  return new Promise(function (ok, falha) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = ok;
    s.onerror = function () { falha(new Error('não carregou ' + src)); };
    document.head.appendChild(s);
  });
}

function criarStore() {
  var cfg = CFG.firebase;
  if (!cfg || !cfg.databaseURL) return storeLocal();
  return storeFirebase(cfg).catch(function (e) {
    console.warn('[votação] Firebase indisponível, caindo para rascunho local:', e);
    toast('Não consegui falar com o servidor dos votos. Seu voto vai ficar só neste navegador.', 'err');
    return storeLocal();
  });
}

function storeLocal() {
  var subs = [];
  function emite() { var v = lsGet(LS_VOTOS, {}); subs.forEach(function (f) { f(v); }); }
  return Promise.resolve({
    modo: 'local',
    escuta: function (fn) { subs.push(fn); fn(lsGet(LS_VOTOS, {})); },
    grava: function (slug, casaId, nome) {
      var v = lsGet(LS_VOTOS, {});
      v[slug] = { casa: casaId, nome: nome, em: Date.now() };
      lsSet(LS_VOTOS, v); emite();
      return Promise.resolve();
    },
    apaga: function (slug) {
      var v = lsGet(LS_VOTOS, {}); delete v[slug]; lsSet(LS_VOTOS, v); emite();
      return Promise.resolve();
    }
  });
}

function storeFirebase(cfg) {
  var BASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var passo = Promise.resolve();
  if (!window.firebase || !window.firebase.initializeApp) passo = passo.then(function () { return carregaScript(BASE + 'firebase-app-compat.js'); });
  passo = passo.then(function () {
    // guard olha o estado final, não uma flag genérica
    if (!window.firebase || typeof window.firebase.database !== 'function') return carregaScript(BASE + 'firebase-database-compat.js');
  });
  return passo.then(function () {
    return new Promise(function (ok, falha) {
      var t = 0;
      (function espera() {
        if (window.firebase && typeof window.firebase.database === 'function') return ok();
        if (++t > 40) return falha(new Error('SDK do Firebase não terminou de anexar'));
        setTimeout(espera, 50);
      })();
    });
  }).then(function () {
    var app = window.firebase.apps && window.firebase.apps.length
      ? window.firebase.app() : window.firebase.initializeApp(cfg);
    var ref = window.firebase.database(app).ref((CFG.sala || 'reveillon') + '/votos');
    return {
      modo: 'firebase',
      escuta: function (fn) { ref.on('value', function (snap) { fn(snap.val() || {}); }); },
      grava: function (slug, casaId, nome) {
        return ref.child(slug).set({ casa: casaId, nome: nome, em: Date.now() });
      },
      apaga: function (slug) { return ref.child(slug).remove(); }
    };
  });
}

/* ---------------------- UI da votação ---------------------- */
var STORE = null, VOTOS = {};

function renderFormVoto() {
  var f = document.getElementById('form-voto');
  var pessoas = D.pessoas.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  var eu = lsGet(LS_EU, '');

  f.innerHTML =
    '<h3>Seu voto</h3>' +
    '<p>Vale o último voto de cada pessoa.</p>' +
    '<div class="campo">' +
      '<label for="quem">Quem é você?</label>' +
      '<select id="quem" name="quem" required>' +
        '<option value="">Escolha seu nome…</option>' +
        pessoas.map(function (p) {
          return '<option value="' + esc(p.slug) + '"' + (p.slug === eu ? ' selected' : '') + '>' + esc(p.nome) + '</option>';
        }).join('') +
      '</select>' +
    '</div>' +
    '<div class="campo">' +
      '<label id="lbl-casa">Qual casa você quer?</label>' +
      '<div class="opcoes" role="radiogroup" aria-labelledby="lbl-casa">' +
        D.casas.map(function (c) {
          return '<label class="opcao" data-op="' + esc(c.id) + '">' +
            '<input type="radio" name="casa" value="' + esc(c.id) + '">' +
            '<span class="opcao-t"><b>' + esc(c.apelido) + '</b>' +
            '<span>' + brl(porPessoa(c), 2) + ' por pessoa · ' + tempo(c.distancia.min) + ' de estrada</span></span>' +
          '</label>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<button type="submit" class="btn btn-primary btn-block" id="btn-voto">Registrar meu voto</button>' +
    '<p class="voto-status" id="voto-status"></p>';

  atualizaFormVoto();
}

function atualizaFormVoto() {
  var f = document.getElementById('form-voto');
  if (!f) return;
  var slug = f.quem.value;
  var meu = slug && VOTOS[slug];
  var btn = document.getElementById('btn-voto');
  var st = document.getElementById('voto-status');

  f.querySelectorAll('input[name="casa"]').forEach(function (r) {
    r.checked = !!(meu && meu.casa === r.value);
    r.closest('.opcao').classList.toggle('sel', r.checked);
  });

  btn.textContent = meu ? 'Trocar meu voto' : 'Registrar meu voto';
  st.className = 'voto-status';
  if (!slug) {
    st.textContent = STORE && STORE.modo === 'local'
      ? 'Modo rascunho: a votação compartilhada ainda não foi ligada, seu voto fica só neste navegador.'
      : '';
  } else if (meu) {
    var casa = D.casas.filter(function (c) { return c.id === meu.casa; })[0];
    st.className = 'voto-status ok';
    st.textContent = 'Você já votou em ' + (casa ? casa.apelido : meu.casa) + '. Pode trocar quando quiser.';
  } else {
    st.textContent = 'Escolha uma casa e confirme.';
  }
}

function renderPlacar() {
  var box = document.getElementById('placar');
  var votos = Object.keys(VOTOS).map(function (k) { return { slug: k, v: VOTOS[k] }; });
  var total = votos.length;
  var porSlug = {};
  D.pessoas.forEach(function (p) { porSlug[p.slug] = p; });

  var contagem = D.casas.map(function (c) {
    var quem = votos.filter(function (x) { return x.v && x.v.casa === c.id; })
                    .map(function (x) { return porSlug[x.slug] || { nome: (x.v && x.v.nome) || x.slug, slug: x.slug }; })
                    .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
    return { casa: c, n: quem.length, quem: quem };
  }).sort(function (a, b) { return b.n - a.n; });

  var maxN = contagem.length ? contagem[0].n : 0;
  var lideres = contagem.filter(function (x) { return x.n === maxN && maxN > 0; });

  var head = '<div class="placar-h"><h3>Placar</h3><span>' +
    (total === 0 ? 'ninguém votou ainda' : total + ' de ' + GRUPO + ' votaram') +
    (lideres.length > 1 ? ' · empate' : '') +
    (STORE && STORE.modo === 'local' ? ' · rascunho local' : '') + '</span></div>';

  if (total === 0) {
    box.innerHTML = head +
      '<div class="placar-vazio"><span class="big">🗳️</span>' +
      'Ninguém votou ainda.<br>Seja o primeiro — o placar aparece aqui na hora.</div>' +
      faltamHTML(votos, porSlug);
    marcaLider(null);
    return;
  }

  box.innerHTML = head + '<div class="barras">' + contagem.map(function (x) {
    var pct = Math.round(x.n / total * 100);
    var lider = maxN > 0 && x.n === maxN;
    return '<div>' +
      '<div class="barra-t"><b>' + esc(x.casa.apelido) + '</b>' +
        '<i>' + x.n + ' voto' + (x.n === 1 ? '' : 's') + ' · ' + pct + '%</i></div>' +
      '<div class="barra-bg"><div class="barra-fill' + (lider ? ' lider' : '') + '" style="width:' + pct + '%"></div></div>' +
      (x.quem.length ? '<div class="votantes">' + x.quem.map(function (p) {
        return '<span class="votante">' + avatarHTML(p) + esc(p.nome) + '</span>';
      }).join('') + '</div>' : '') +
    '</div>';
  }).join('') + '</div>' + faltamHTML(votos, porSlug);

  marcaLider(lideres.length === 1 ? lideres[0].casa.id : null);
}

function faltamHTML(votos, porSlug) {
  var votaram = {};
  votos.forEach(function (x) { votaram[x.slug] = true; });
  var faltam = D.pessoas.filter(function (p) { return !votaram[p.slug]; })
                        .sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  if (!faltam.length) {
    return '<div class="faltam">✅ <b>Todo mundo votou.</b> Placar fechado — é só combinar quem reserva.</div>';
  }
  return '<div class="faltam">' + (faltam.length === 1 ? 'Falta' : 'Faltam') + ' <b>' + faltam.length + '</b>: ' +
    faltam.map(function (p) { return esc(p.nome); }).join(', ') + '.</div>';
}

function marcaLider(casaId) {
  D.casas.forEach(function (c) {
    var n = document.getElementById('casa-' + c.id);
    if (n) n.classList.toggle('is-lider', c.id === casaId);
  });
}

function submeterVoto(e) {
  e.preventDefault();
  var f = e.currentTarget;
  var st = document.getElementById('voto-status');
  var slug = f.quem.value;
  var escolha = f.querySelector('input[name="casa"]:checked');

  if (!slug) {
    st.className = 'voto-status err'; st.textContent = 'Escolha seu nome primeiro.';
    f.quem.focus(); return;
  }
  if (!escolha) {
    st.className = 'voto-status err'; st.textContent = 'Escolha uma das casas.';
    return;
  }
  var pessoa = D.pessoas.filter(function (p) { return p.slug === slug; })[0];
  var casa = D.casas.filter(function (c) { return c.id === escolha.value; })[0];
  var btn = document.getElementById('btn-voto');
  var jaTinha = !!VOTOS[slug];

  btn.disabled = true;
  st.className = 'voto-status'; st.textContent = 'Salvando…';
  lsSet(LS_EU, slug);

  STORE.grava(slug, casa.id, pessoa.nome).then(function () {
    btn.disabled = false;
    toast((jaTinha ? 'Voto trocado' : 'Voto registrado') + ': ' + pessoa.nome + ' → ' + casa.apelido, 'ok');
    if (STORE.modo === 'local') VOTOS[slug] = { casa: casa.id, nome: pessoa.nome, em: Date.now() };
    atualizaFormVoto(); renderPlacar(); renderGente(VOTOS);
  }).catch(function (err) {
    btn.disabled = false;
    console.error(err);
    st.className = 'voto-status err';
    st.textContent = 'Não deu para salvar. Tente de novo em alguns segundos.';
    toast('O voto não foi salvo — erro de conexão.', 'err');
  });
}

/* ---------------------- eventos (delegados) ---------------------- */
function achaCasa(id) { return D.casas.filter(function (c) { return c.id === id; })[0]; }

function ligarEventos() {
  on(document, 'click', function (e) {
    var t = e.target;

    var abrir = t.closest && t.closest('[data-gal-open]');
    if (abrir) {
      var c1 = achaCasa(abrir.getAttribute('data-gal-open'));
      if (c1) abrirGaleria(c1.fotos, c1.apelido, 0);
      return;
    }

    var fig = t.closest && t.closest('.gal-i');
    if (fig) {
      var c2 = achaCasa(fig.parentNode.getAttribute('data-gal'));
      if (c2) abrirGaleria(c2.fotos, c2.apelido, Number(fig.getAttribute('data-idx')) || 0);
      return;
    }

    var qImg = t.closest && t.closest('[data-quarto-url]');
    if (qImg) {
      var c3 = achaCasa(qImg.getAttribute('data-quarto'));
      var url = qImg.getAttribute('data-quarto-url');
      if (c3) {
        var k = 0;
        c3.fotos.forEach(function (f, n) { if (f.u === url) k = n; });
        abrirGaleria(c3.fotos, c3.apelido, k);
      }
      return;
    }

    var amen = t.closest && t.closest('[data-amen]');
    if (amen) {
      var c4 = achaCasa(amen.getAttribute('data-amen'));
      if (!c4) return;
      abrirModal('Comodidades — ' + c4.apelido,
        c4.comodidades.map(function (g) {
          return '<h4 style="margin:18px 0 8px;font-size:14px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">' + esc(g.g) + '</h4>' +
            '<ul class="amen">' + g.i.map(function (a) {
              return '<li><span class="ico">✓</span><span>' + esc(a.n) +
                (a.s ? '<br><span style="color:var(--muted);font-size:13px">' + esc(a.s) + '</span>' : '') + '</span></li>';
            }).join('') + '</ul>';
        }).join('') +
        (c4.naoTem && c4.naoTem.length
          ? '<h4 style="margin:18px 0 8px;font-size:14px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)">Não incluso</h4>' +
            '<ul class="amen">' + c4.naoTem.map(function (n) { return '<li class="off"><span class="ico">✕</span>' + esc(n) + '</li>'; }).join('') + '</ul>'
          : ''));
      return;
    }

    var amb = t.closest && t.closest('[data-amb]');
    if (amb) {
      var c6 = achaCasa(amb.getAttribute('data-amb'));
      var nome = amb.getAttribute('data-amb-nome');
      if (c6) {
        abrirGaleria(c6.fotos, c6.apelido, 0);
        if (nome) {
          var chip = document.querySelector('.lb-chip[data-f="' + nome + '"]');
          if (chip) chip.click();
        }
      }
      return;
    }

    var more = t.closest && t.closest('[data-revs-more]');
    if (more) {
      var id = more.getAttribute('data-revs-more');
      var c5 = achaCasa(id);
      var box = document.querySelector('[data-revs="' + id + '"]');
      if (c5 && box) { renderRevs(box, c5, null); more.parentNode.remove(); }
      return;
    }

    var vt = t.closest && t.closest('[data-votar]');
    if (vt) {
      var casaId = vt.getAttribute('data-votar');
      var radio = document.querySelector('#form-voto input[name="casa"][value="' + casaId + '"]');
      if (radio) {
        radio.checked = true;
        document.querySelectorAll('#form-voto .opcao').forEach(function (o) {
          o.classList.toggle('sel', o.getAttribute('data-op') === casaId);
        });
      }
      document.getElementById('votacao').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var q = document.getElementById('quem');
      if (q && !q.value) setTimeout(function () { q.focus(); }, 550);
      return;
    }

    // texto de avaliação: clique expande
    var rev = t.closest && t.closest('.rev-t');
    if (rev) rev.classList.toggle('clamp');
  });

  var cmpBox = document.querySelector('.cmp-scroll');
  if (cmpBox) on(cmpBox, 'scroll', atualizaDicaTabela, { passive: true });
  on(window, 'resize', atualizaDicaTabela);
  on(window, 'orientationchange', function () { setTimeout(atualizaDicaTabela, 250); });

  var f = document.getElementById('form-voto');
  on(f, 'submit', submeterVoto);
  on(f, 'change', function (e) {
    if (e.target.name === 'casa') {
      f.querySelectorAll('.opcao').forEach(function (o) {
        o.classList.toggle('sel', o.getAttribute('data-op') === e.target.value);
      });
      var st = document.getElementById('voto-status');
      if (st.classList.contains('err')) { st.className = 'voto-status'; st.textContent = ''; }
    }
    if (e.target.id === 'quem') atualizaFormVoto();
  });

  // scroll spy
  var secoes = ['casas', 'comparativo', 'gente', 'votacao'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var links = {};
  document.querySelectorAll('#topnav a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.toggle('on', k === en.target.id); });
        }
      });
    }, { rootMargin: '-64px 0px -70% 0px' });
    secoes.forEach(function (s) { io.observe(s); });
    listeners.push([{ removeEventListener: function () { io.disconnect(); } }, '', function () {}]);
  }
}

/* ---------------------- start ---------------------- */
function init() {
  renderHero();
  renderCasas();
  renderCmp();
  renderGente({});
  renderFormVoto();
  renderPlacar();
  ligarEventos();

  document.getElementById('foot-info').innerHTML =
    'Página feita para o grupo — ' + GRUPO + ' pessoas, ' + D.casas.length + ' casa' + (D.casas.length > 1 ? 's' : '') +
    ', ' + dataLonga(D.evento.checkin) + ' a ' + dataLonga(D.evento.checkout) + '. ' +
    'Distâncias calculadas por rota de carro a partir de São Caetano do Sul.';

  carregaManifesto().then(function () { renderGente(VOTOS); });

  criarStore().then(function (s) {
    STORE = s;
    s.escuta(function (votos) {
      VOTOS = votos || {};
      renderPlacar();
      renderGente(VOTOS);
      atualizaFormVoto();
    });
    if (s.modo === 'local') {
      console.info('[votação] modo rascunho local — preencha window.CONFIG.firebase em js/config.js para compartilhar.');
    }
  });

  on(window, 'pagehide', function () { fecharGaleria(); fecharModal(); offAll(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
