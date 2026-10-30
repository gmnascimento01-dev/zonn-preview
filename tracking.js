/* ZONN · monitoramento (GA4 + Google Ads + Clarity + Consent Mode v2)
   Troque os IDs abaixo. O site funciona normalmente se este arquivo for bloqueado. */
var CONFIG = window.ZONN_CONFIG = window.ZONN_CONFIG || {
  GA4_ID: 'G-XXXXXXXXXX',           // Google Analytics 4
  ADS_ID: 'AW-XXXXXXXXXX',          // Google Ads (tag de conversão)
  ADS_LABEL_WHATS: 'XXXXXXXXXXX',   // rótulo da conversão "clique WhatsApp"
  ADS_LABEL_FORM: 'XXXXXXXXXXX',    // rótulo da conversão "envio formulário"
  CLARITY_ID: 'xxxxxxxxxx',         // Microsoft Clarity
  WHATS_NUMBER: '5511958732945',    // número do WhatsApp da ZONN
};

(function () {
  'use strict';
  if (window.__zonnTracking) return; window.__zonnTracking = 1;
  var KEY = 'zonn_consent', ATTR = 'zonn_attr';
  var isSet = function (v) { return v && !/x{4,}/i.test(v); };
  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) {} }
  };

  /* Consent Mode v2: padrão negado ANTES de qualquer tag */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  gtag('js', new Date());

  var consent = store.get('localStorage', KEY); // 'granted' | 'denied' | null
  if (consent === 'granted') grantGoogle();

  var gid = isSet(CONFIG.GA4_ID) ? CONFIG.GA4_ID : (isSet(CONFIG.ADS_ID) ? CONFIG.ADS_ID : null);
  if (gid) {
    var s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + gid;
    document.head.appendChild(s);
  }
  if (isSet(CONFIG.GA4_ID)) gtag('config', CONFIG.GA4_ID);
  if (isSet(CONFIG.ADS_ID)) gtag('config', CONFIG.ADS_ID);

  function grantGoogle() {
    gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
  }
  function loadClarity() {
    if (!isSet(CONFIG.CLARITY_ID) || window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CONFIG.CLARITY_ID);
  }
  if (consent === 'granted') loadClarity();

  /* UTM + gclid -> sessionStorage (só parâmetros de campanha, nada pessoal) */
  try {
    var q = new URLSearchParams(location.search), a = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'].forEach(function (k) { if (q.get(k)) a[k] = q.get(k); });
    if (Object.keys(a).length) store.set('sessionStorage', ATTR, JSON.stringify(a));
  } catch (e) {}
  function attribution() {
    var a = {}; try { a = JSON.parse(store.get('sessionStorage', ATTR) || '{}'); } catch (e) {}
    if (a.gclid) return 'google-ads';
    if (a.utm_source || a.utm_campaign) return [a.utm_source, a.utm_campaign].filter(Boolean).join(' / ');
    return 'direto';
  }

  /* Protocolo ZN-0000A */
  function protocolo() {
    var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', r = new Uint32Array(2);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : (r[0] = Math.random() * 1e9, r[1] = Math.random() * 1e9);
    return 'ZN-' + String(1000 + (r[0] % 9000)) + L[r[1] % L.length];
  }
  function number(fallbackHref) {
    if (isSet(CONFIG.WHATS_NUMBER) && /^\d{12,13}$/.test(CONFIG.WHATS_NUMBER)) return CONFIG.WHATS_NUMBER;
    var m = /wa\.me\/(\d+)/.exec(fallbackHref || ''); return m ? m[1] : null;
  }

  /* Disparo de eventos */
  function track(name, params) {
    params = params || {};
    try { gtag('event', name, params); } catch (e) {}
    if (store.get('localStorage', KEY) === 'granted' && window.clarity) { try { clarity('event', name); } catch (e) {} }
  }
  // IMPORTANTE: marque "clique_whatsapp" e "envio_formulario" como EVENTOS PRINCIPAIS no GA4 (Admin → Eventos).
  function conversion(label) {
    if (isSet(CONFIG.ADS_ID) && isSet(label)) gtag('event', 'conversion', { send_to: CONFIG.ADS_ID + '/' + label });
  }

  /* Listener único (fase de captura: roda antes do React e antes da navegação) */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a,button');
    if (!el) return;
    if (el.hasAttribute('data-cookie-prefs')) { e.preventDefault(); showBanner(); return; }
    var ev = el.getAttribute('data-evento'), origem = el.getAttribute('data-origem') || secaoDe(el);
    var href = el.getAttribute('href') || '';
    if (ev === 'clique_whatsapp' || /wa\.me\//.test(href)) {
      var p = protocolo(), n = number(href);
      if (n && el.tagName === 'A') {
        var prod = el.getAttribute('data-produto');
        var msg = prod
          ? 'Olá! Vim pelo site da ZONN e quero um orçamento de Piso Elevado ' + prod + '. Protocolo: ' + p + ' [origem: produtos]'
          : 'Olá! Vim pelo site da ZONN e gostaria de um orçamento. Protocolo: ' + p + ' [origem: ' + origem + ']';
        el.setAttribute('href', 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg));
      }
      track('clique_whatsapp', { origem: origem, protocolo: p });
      conversion(CONFIG.ADS_LABEL_WHATS);
    } else if (/^tel:/.test(href)) track('clique_telefone', { origem: origem });
    else if (/^mailto:/.test(href)) track('clique_email', { origem: origem });
    else if (ev === 'faq_aberta' && el.getAttribute('aria-expanded') !== 'true') {
      track('faq_aberta', { pergunta: (el.getAttribute('data-pergunta') || el.textContent || '').trim().slice(0, 90) });
    }
  }, true);
  function secaoDe(el) { var s = el.closest('section[id],header,footer'); return s ? (s.id || s.tagName.toLowerCase()) : 'pagina'; }

  /* Início do formulário */
  var started = false;
  document.addEventListener('input', function (e) {
    if (started || !e.target.closest || !e.target.closest('[data-form="orcamento"]')) return;
    started = true; track('inicio_formulario');
  }, true);

  /* scroll_secao: 50% visível pela primeira vez */
  var seen = {}, io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (x) {
      if (!x.isIntersecting) return;
      var id = x.target.id || x.target.getAttribute('data-screen-label');
      io.unobserve(x.target);
      if (!seen[id]) { seen[id] = 1; track('scroll_secao', { secao: id }); }
    });
  }, { threshold: 0.5 }) : null;
  function scan() {
    if (!io) return;
    document.querySelectorAll('main section[id], section[data-screen-label]').forEach(function (s) {
      if (!s.__zonnObs) { s.__zonnObs = 1; io.observe(s); }
    });
  }

  /* API usada pelo formulário da página */
  window.ZONN = {
    number: function () { return number(''); },
    track: track,
    formSubmit: function (d) {
      var p = protocolo(), origem = attribution();
      track('envio_formulario', { servico: d.servico || '', ambiente: d.ambiente || '', metragem: d.metragem || '', protocolo: p });
      conversion(CONFIG.ADS_LABEL_FORM);
      return { protocolo: p, origem: origem };
    },
    showBanner: showBanner
  };

  /* Banner LGPD */
  var banner;
  function choose(v) {
    store.set('localStorage', KEY, v); consent = v;
    if (v === 'granted') { grantGoogle(); loadClarity(); }
    else gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    if (banner) { banner.remove(); banner = null; }
  }
  function btn(label, primary) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.style.cssText = 'min-height:44px;padding:10px 20px;border-radius:4px;font:600 15px Barlow,system-ui,sans-serif;cursor:pointer;' +
      (primary ? 'background:#F2B01E;color:#1B1C1E;border:0;' : 'background:transparent;color:#F3F2EE;border:2px solid #F3F2EE;');
    return b;
  }
  function showBanner() {
    if (banner) { banner.querySelector('button').focus(); return; }
    banner = document.createElement('div');
    banner.setAttribute('role', 'dialog'); banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Preferências de cookies');
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:90;background:#1B1C1E;border-top:1px solid #3A3C40;color:#F3F2EE;font:400 15px/1.5 Barlow,system-ui,sans-serif;padding:16px clamp(16px,4vw,80px);box-shadow:0 -12px 28px rgba(0,0,0,.2)';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'max-width:1240px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px';
    var p = document.createElement('p'); p.style.cssText = 'margin:0;flex:1 1 320px;color:#F3F2EE';
    p.appendChild(document.createTextNode('Usamos cookies para medir o desempenho do site e melhorar seu atendimento. '));
    var a = document.createElement('a'); a.href = 'privacidade.dc.html'; a.textContent = 'Política de privacidade';
    a.style.cssText = 'color:#F2B01E;text-underline-offset:3px'; p.appendChild(a);
    var acts = document.createElement('div'); acts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    var no = btn('Recusar', false), yes = btn('Aceitar', true);
    no.onclick = function () { choose('denied'); }; yes.onclick = function () { choose('granted'); };
    acts.appendChild(no); acts.appendChild(yes);
    wrap.appendChild(p); wrap.appendChild(acts); banner.appendChild(wrap);
    document.body.appendChild(banner);
    setTimeout(function () { yes.focus({ preventScroll: true }); }, 50);
  }

  function boot() {
    if (!consent) showBanner();
    scan(); setTimeout(scan, 1500); setTimeout(scan, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
