/* ==========================================================================
   4 Savings Solutions — shared site script
   - Cookie consent (LGPD / privacy) with Google Consent Mode v2
   - Accessibility panel
   - Floating WhatsApp chat that captures the lead, then opens WhatsApp
   - Quote forms -> same lead flow
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — fill these in before going live
     ------------------------------------------------------------------ */
  var CONFIG = {
    // Agency WhatsApp number: digits only, with country code (US = 1). Example: '15551234567'
    whatsapp: '',
    // Optional: URL that receives each lead as JSON (Make, Zapier, Google Apps Script, CRM...)
    leadWebhook: '',
    privacyUrl: { en: 'privacy.html', pt: 'privacidade.html' },
    accessibilityUrl: { en: 'privacy.html#accessibility', pt: 'privacidade.html#acessibilidade' }
  };

  var lang = (document.documentElement.lang || 'en').toLowerCase().indexOf('pt') === 0 ? 'pt' : 'en';

  var T = {
    en: {
      waFab: 'Chat with us on WhatsApp',
      waTitle: '4 Savings Solutions',
      waSub: 'Licensed advisors · English & Português',
      close: 'Close',
      send: 'Send',
      hello: 'Hi! I can help you get a free insurance quote.\nWhat is your name?',
      namePh: 'Your name',
      nameErr: 'Please type your name.',
      phoneAsk: function (n) { return 'Nice to meet you, ' + n + '! What is your phone or WhatsApp number?'; },
      phonePh: 'Phone / WhatsApp',
      phoneErr: 'Please type a valid phone number.',
      coverageAsk: 'What type of insurance are you looking for?',
      coverages: ['Life insurance', 'Auto', 'Home', 'Business', 'Special event', 'Not sure yet'],
      consentAsk: 'Almost done! An advisor will continue the conversation on WhatsApp.',
      consent: 'I agree to be contacted by phone, text or WhatsApp about insurance and I accept the',
      privacy: 'Privacy Policy',
      consentErr: 'Please check the box to continue.',
      goWa: 'Continue on WhatsApp',
      done: 'Thank you! We opened WhatsApp in a new tab. If it did not open, tap the button below.',
      openWa: 'Open WhatsApp',
      waMsg: function (l) {
        return 'Hi! My name is ' + l.name + '.\nI would like a quote for: ' + l.coverage + '.\nMy phone: ' + l.phone;
      },
      formMsgHead: 'Hi! I would like a free insurance quote.',
      formConsent: 'I agree to be contacted by phone, text or WhatsApp about insurance and I accept the',
      formErr: 'Please fill in your name and phone and check the consent box.',
      formOk: 'Thank you! We are opening WhatsApp so you can talk to an advisor.',
      cookieTitle: 'Your privacy',
      cookieText: 'We use necessary cookies to run this site. With your permission, we also use analytics and advertising cookies to measure visits and improve our ads. You can change your choice at any time.',
      cookieMore: 'Privacy Policy',
      cookieAccept: 'Accept all',
      cookieReject: 'Only necessary',
      cookieCustomize: 'Customize',
      cookieSave: 'Save my choices',
      cookieNecessary: 'Necessary',
      cookieNecessaryDesc: 'Always on. Needed for the site to work.',
      cookieAnalytics: 'Analytics',
      cookieAnalyticsDesc: 'Helps us understand how visitors use the site.',
      cookieMarketing: 'Advertising',
      cookieMarketingDesc: 'Measures our ads on Google and Meta.',
      a11yFab: 'Accessibility options',
      a11yTitle: 'Accessibility',
      a11yText: 'Text size',
      a11ySmaller: 'Decrease text size',
      a11yLarger: 'Increase text size',
      a11yContrast: 'High contrast',
      a11yLinks: 'Underline links',
      a11yReadable: 'Readable font',
      a11yNoanim: 'Stop animations',
      a11yReset: 'Reset',
      a11yNote: 'Read our',
      a11yStatement: 'accessibility statement'
    },
    pt: {
      waFab: 'Fale conosco pelo WhatsApp',
      waTitle: '4 Savings Solutions',
      waSub: 'Agentes licenciados · Português & English',
      close: 'Fechar',
      send: 'Enviar',
      hello: 'Olá! Posso te ajudar a fazer uma cotação de seguro grátis.\nQual é o seu nome?',
      namePh: 'Seu nome',
      nameErr: 'Digite seu nome, por favor.',
      phoneAsk: function (n) { return 'Prazer, ' + n + '! Qual é o seu telefone ou WhatsApp?'; },
      phonePh: 'Telefone / WhatsApp',
      phoneErr: 'Digite um telefone válido, por favor.',
      coverageAsk: 'Qual seguro você está procurando?',
      coverages: ['Seguro de vida', 'Carro', 'Casa', 'Empresa', 'Evento', 'Ainda não sei'],
      consentAsk: 'Quase lá! Um agente vai continuar a conversa com você no WhatsApp.',
      consent: 'Concordo em ser contatado por telefone, mensagem ou WhatsApp sobre seguros e aceito a',
      privacy: 'Política de Privacidade',
      consentErr: 'Marque a caixa para continuar, por favor.',
      goWa: 'Continuar no WhatsApp',
      done: 'Obrigado! Abrimos o WhatsApp em uma nova aba. Se não abriu, toque no botão abaixo.',
      openWa: 'Abrir WhatsApp',
      waMsg: function (l) {
        return 'Olá! Meu nome é ' + l.name + '.\nQuero uma cotação de: ' + l.coverage + '.\nMeu telefone: ' + l.phone;
      },
      formMsgHead: 'Olá! Quero uma cotação de seguro grátis.',
      formConsent: 'Concordo em ser contatado por telefone, mensagem ou WhatsApp sobre seguros e aceito a',
      formErr: 'Preencha nome e telefone e marque a caixa de consentimento, por favor.',
      formOk: 'Obrigado! Estamos abrindo o WhatsApp para você falar com um agente.',
      cookieTitle: 'Sua privacidade',
      cookieText: 'Usamos cookies necessários para o site funcionar. Com a sua permissão, também usamos cookies de análise e de publicidade para medir visitas e melhorar nossos anúncios, conforme a LGPD. Você pode mudar sua escolha a qualquer momento.',
      cookieMore: 'Política de Privacidade',
      cookieAccept: 'Aceitar todos',
      cookieReject: 'Apenas necessários',
      cookieCustomize: 'Personalizar',
      cookieSave: 'Salvar escolhas',
      cookieNecessary: 'Necessários',
      cookieNecessaryDesc: 'Sempre ativos. São essenciais para o site funcionar.',
      cookieAnalytics: 'Análise',
      cookieAnalyticsDesc: 'Nos ajudam a entender como o site é usado.',
      cookieMarketing: 'Publicidade',
      cookieMarketingDesc: 'Medem nossos anúncios no Google e na Meta.',
      a11yFab: 'Opções de acessibilidade',
      a11yTitle: 'Acessibilidade',
      a11yText: 'Tamanho do texto',
      a11ySmaller: 'Diminuir texto',
      a11yLarger: 'Aumentar texto',
      a11yContrast: 'Alto contraste',
      a11yLinks: 'Sublinhar links',
      a11yReadable: 'Fonte legível',
      a11yNoanim: 'Parar animações',
      a11yReset: 'Restaurar padrão',
      a11yNote: 'Leia nossa',
      a11yStatement: 'declaração de acessibilidade'
    }
  }[lang];

  /* ------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------ */
  function store(key, value) {
    try {
      if (value === undefined) { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
    return null;
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  var ICON = {
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15.9 12 3.39 13.87z"/></svg>',
    a11y: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.8" fill="currentColor"/><path d="M4.5 8.5c2.6.9 5 1.3 7.5 1.3s4.9-.4 7.5-1.3"/><path d="M12 9.8v4.4m0 0-3.2 6.3M12 14.2l3.2 6.3"/></svg>'
  };

  // Keep UTM / click ids from the landing URL so every lead carries its campaign source.
  var TRACK_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  (function captureAttribution() {
    try {
      var params = new URLSearchParams(location.search);
      var found = {};
      TRACK_KEYS.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
      if (Object.keys(found).length) sessionStorage.setItem('ss-attr', JSON.stringify(found));
    } catch (e) { /* storage unavailable */ }
  })();
  function attribution() {
    try { return JSON.parse(sessionStorage.getItem('ss-attr') || '{}'); } catch (e) { return {}; }
  }

  function waUrl(text) {
    return 'https://wa.me/' + (CONFIG.whatsapp || '') + '?text=' + encodeURIComponent(text);
  }

  function submitLead(lead) {
    lead.language = lang;
    lead.page = location.pathname;
    lead.submitted_at = new Date().toISOString();
    lead.attribution = attribution();
    // Conversion event for Google Ads / GA4 / Meta (via Google Tag Manager)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'generate_lead', lead_source: lead.source, coverage: lead.coverage || '' });
    if (CONFIG.leadWebhook) {
      try {
        fetch(CONFIG.leadWebhook, {
          method: 'POST', mode: 'no-cors', keepalive: true,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify(lead)
        });
      } catch (e) { /* the WhatsApp message still carries the lead */ }
    }
  }

  /* ------------------------------------------------------------------
     1. Cookie consent (LGPD / privacy) + Google Consent Mode v2
     ------------------------------------------------------------------ */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
    wait_for_update: 500
  });

  function applyConsent(c) {
    gtag('consent', 'update', {
      analytics_storage: c.analytics ? 'granted' : 'denied',
      ad_storage: c.marketing ? 'granted' : 'denied',
      ad_user_data: c.marketing ? 'granted' : 'denied',
      ad_personalization: c.marketing ? 'granted' : 'denied'
    });
    window.dataLayer.push({ event: 'ss_consent_update', consent_analytics: !!c.analytics, consent_marketing: !!c.marketing });
    document.dispatchEvent(new CustomEvent('ss:consent', { detail: c }));
  }
  window.ssConsent = { get: function () { return store('ss-consent'); } };

  var cookie;
  function buildCookieBanner() {
    var analytics = el('input', { type: 'checkbox', id: 'ss-c-analytics' });
    var marketing = el('input', { type: 'checkbox', id: 'ss-c-marketing' });
    var necessary = el('input', { type: 'checkbox', id: 'ss-c-necessary', checked: 'checked', disabled: 'disabled' });
    function opt(input, title, desc) {
      return el('label', { class: 'ss-cookie__opt', for: input.id }, [input, el('span', { html: '<strong></strong> — ' }, [])]);
    }
    var opts = el('div', { class: 'ss-cookie__opts', hidden: 'hidden' });
    [[necessary, T.cookieNecessary, T.cookieNecessaryDesc], [analytics, T.cookieAnalytics, T.cookieAnalyticsDesc], [marketing, T.cookieMarketing, T.cookieMarketingDesc]].forEach(function (o) {
      var label = opt(o[0]);
      var span = label.querySelector('span');
      span.querySelector('strong').textContent = o[1];
      span.appendChild(document.createTextNode(o[2]));
      opts.appendChild(label);
    });

    var saveBtn = el('button', { type: 'button', class: 'ss-cookie__primary', hidden: 'hidden', text: T.cookieSave });
    var acceptBtn = el('button', { type: 'button', class: 'ss-cookie__primary', text: T.cookieAccept });
    var rejectBtn = el('button', { type: 'button', class: 'ss-cookie__secondary', text: T.cookieReject });
    var customBtn = el('button', { type: 'button', class: 'ss-cookie__secondary', 'aria-expanded': 'false', text: T.cookieCustomize });

    var title = el('h2', { id: 'ss-cookie-title', text: T.cookieTitle });
    var text = el('p', { text: T.cookieText + ' ' });
    text.appendChild(el('a', { href: CONFIG.privacyUrl[lang], text: T.cookieMore }));

    cookie = el('section', { class: 'ss-cookie', 'aria-labelledby': 'ss-cookie-title', hidden: 'hidden' }, [
      title, text, opts, el('div', { class: 'ss-cookie__actions' }, [acceptBtn, rejectBtn, customBtn, saveBtn])
    ]);

    function decide(c) {
      c.necessary = true;
      c.date = new Date().toISOString();
      c.version = 1;
      store('ss-consent', c);
      applyConsent(c);
      cookie.hidden = true;
    }
    acceptBtn.addEventListener('click', function () { decide({ analytics: true, marketing: true }); });
    rejectBtn.addEventListener('click', function () { decide({ analytics: false, marketing: false }); });
    customBtn.addEventListener('click', function () {
      var open = opts.hidden;
      opts.hidden = !open;
      saveBtn.hidden = !open;
      customBtn.setAttribute('aria-expanded', String(open));
      if (open) analytics.focus();
    });
    saveBtn.addEventListener('click', function () { decide({ analytics: analytics.checked, marketing: marketing.checked }); });

    cookie.openSettings = function () {
      var c = store('ss-consent') || {};
      analytics.checked = !!c.analytics;
      marketing.checked = !!c.marketing;
      opts.hidden = false; saveBtn.hidden = false; customBtn.setAttribute('aria-expanded', 'true');
      cookie.hidden = false;
      title.setAttribute('tabindex', '-1');
      title.focus();
    };
    document.body.appendChild(cookie);

    var saved = store('ss-consent');
    if (saved) applyConsent(saved); else cookie.hidden = false;

    document.querySelectorAll('[data-ss-cookie-settings]').forEach(function (b) {
      b.addEventListener('click', function () { cookie.openSettings(); });
    });
  }

  /* ------------------------------------------------------------------
     2. Accessibility panel
     ------------------------------------------------------------------ */
  var A11Y_KEY = 'ss-a11y';
  var SIZES = [1, 1.15, 1.3, 1.5];
  function applyA11y(p) {
    var root = document.documentElement;
    ['contrast', 'links', 'readable', 'noanim'].forEach(function (k) { root.classList.toggle('ss-' + k, !!p[k]); });
    document.body.style.zoom = SIZES[p.size || 0] === 1 ? '' : String(SIZES[p.size || 0]);
  }
  function buildA11y() {
    var prefs = store(A11Y_KEY) || { size: 0 };
    applyA11y(prefs);

    var fab = el('button', { type: 'button', class: 'ss-fab ss-fab--a11y', 'aria-label': T.a11yFab, 'aria-expanded': 'false', 'aria-controls': 'ss-a11y-panel', html: ICON.a11y });
    var output = el('output', { 'aria-live': 'polite' });
    function setSize(i) { prefs.size = Math.max(0, Math.min(SIZES.length - 1, i)); output.textContent = Math.round(SIZES[prefs.size] * 100) + '%'; save(); }
    function save() { store(A11Y_KEY, prefs); applyA11y(prefs); }

    var toggles = [['contrast', T.a11yContrast], ['links', T.a11yLinks], ['readable', T.a11yReadable], ['noanim', T.a11yNoanim]].map(function (t) {
      var b = el('button', { type: 'button', class: 'ss-a11y__btn', 'aria-pressed': String(!!prefs[t[0]]), text: t[1] });
      b.addEventListener('click', function () { prefs[t[0]] = !prefs[t[0]]; b.setAttribute('aria-pressed', String(prefs[t[0]])); save(); });
      b.dataset.key = t[0];
      return b;
    });
    var reset = el('button', { type: 'button', class: 'ss-a11y__btn ss-a11y__reset', text: T.a11yReset });
    reset.addEventListener('click', function () {
      prefs = { size: 0 }; setSize(0);
      toggles.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    });

    var closeBtn = el('button', { type: 'button', class: 'ss-close', 'aria-label': T.close, html: ICON.close });
    var note = el('p', { class: 'ss-a11y__note', text: T.a11yNote + ' ' });
    note.appendChild(el('a', { href: CONFIG.accessibilityUrl[lang], text: T.a11yStatement }));
    note.appendChild(document.createTextNode('.'));

    var panel = el('div', { class: 'ss-panel ss-panel--a11y', id: 'ss-a11y-panel', role: 'dialog', 'aria-labelledby': 'ss-a11y-title', hidden: 'hidden' }, [
      el('div', { class: 'ss-panel__head' }, [el('h2', { class: 'ss-panel__title', id: 'ss-a11y-title', text: T.a11yTitle }), closeBtn]),
      el('div', { class: 'ss-a11y__grid' }, [
        el('div', { class: 'ss-a11y__size', role: 'group', 'aria-label': T.a11yText }, [
          el('button', { type: 'button', class: 'ss-a11y__btn', 'aria-label': T.a11ySmaller, text: 'A−', onclick: function () { setSize(prefs.size - 1); } }),
          output,
          el('button', { type: 'button', class: 'ss-a11y__btn', 'aria-label': T.a11yLarger, text: 'A+', onclick: function () { setSize(prefs.size + 1); } })
        ])
      ].concat(toggles, [reset])),
      note
    ]);
    output.textContent = Math.round(SIZES[prefs.size || 0] * 100) + '%';

    function toggle(open) {
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('button').focus(); else fab.focus();
    }
    fab.addEventListener('click', function () { toggle(panel.hidden); });
    closeBtn.addEventListener('click', function () { toggle(false); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

    document.body.appendChild(fab);
    document.body.appendChild(panel);
  }

  /* ------------------------------------------------------------------
     3. WhatsApp chat: capture name, phone, coverage, consent -> WhatsApp
     ------------------------------------------------------------------ */
  var chat;
  function buildChat() {
    var fab = el('button', { type: 'button', class: 'ss-fab ss-fab--wa', 'aria-label': T.waFab, 'aria-expanded': 'false', 'aria-controls': 'ss-wa-panel', html: ICON.wa });
    fab.appendChild(el('span', { class: 'ss-fab__badge', 'aria-hidden': 'true' }));
    var log = el('div', { class: 'ss-chat__log', role: 'log', 'aria-live': 'polite' });
    var foot = el('div', { class: 'ss-chat__foot' });
    var closeBtn = el('button', { type: 'button', class: 'ss-close', 'aria-label': T.close, html: ICON.close });
    var panel = el('div', { class: 'ss-panel ss-panel--wa', id: 'ss-wa-panel', role: 'dialog', 'aria-labelledby': 'ss-wa-title', hidden: 'hidden' }, [
      el('div', { class: 'ss-panel__head' }, [
        el('div', { class: 'ss-avatar', 'aria-hidden': 'true', text: '4S' }),
        el('div', {}, [el('h2', { class: 'ss-panel__title', id: 'ss-wa-title', text: T.waTitle }), el('p', { class: 'ss-panel__sub', text: T.waSub })]),
        closeBtn
      ]),
      log, foot
    ]);

    var lead = { source: 'whatsapp_chat' };
    var started = false;

    function say(text, who) {
      log.appendChild(el('div', { class: 'ss-msg ss-msg--' + (who || 'bot'), text: text }));
      log.scrollTop = log.scrollHeight;
    }
    function askText(placeholder, type, validate, errText, next) {
      foot.innerHTML = '';
      var err = el('p', { class: 'ss-chat__error', 'aria-live': 'assertive' });
      var input = el('input', { class: 'ss-chat__input', type: type, placeholder: placeholder, 'aria-label': placeholder, autocomplete: type === 'tel' ? 'tel' : 'name' });
      var form = el('form', { class: 'ss-chat__row' }, [input, el('button', { type: 'submit', class: 'ss-chat__send', 'aria-label': T.send, html: ICON.send })]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = input.value.trim();
        if (!validate(v)) { err.textContent = errText; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
        say(v, 'user');
        next(v);
      });
      foot.appendChild(form); foot.appendChild(err);
      input.focus();
    }
    function askCoverage() {
      say(T.coverageAsk);
      foot.innerHTML = '';
      var chips = el('div', { class: 'ss-chips', role: 'group', 'aria-label': T.coverageAsk });
      T.coverages.forEach(function (c) {
        chips.appendChild(el('button', { type: 'button', class: 'ss-chip', text: c, onclick: function () { lead.coverage = c; say(c, 'user'); askConsent(); } }));
      });
      foot.appendChild(chips);
      chips.querySelector('button').focus();
    }
    function askConsent() {
      say(T.consentAsk);
      foot.innerHTML = '';
      var box = el('input', { type: 'checkbox', id: 'ss-wa-consent' });
      var label = el('label', { class: 'ss-consent', for: 'ss-wa-consent' }, [box, el('span', { text: T.consent + ' ' })]);
      label.querySelector('span').appendChild(el('a', { href: CONFIG.privacyUrl[lang], target: '_blank', rel: 'noopener', text: T.privacy }));
      label.querySelector('span').appendChild(document.createTextNode('.'));
      var err = el('p', { class: 'ss-chat__error', 'aria-live': 'assertive' });
      box.addEventListener('change', function () { if (box.checked) err.textContent = ''; });
      var go = el('button', { type: 'button', class: 'ss-btn-wa', html: ICON.wa + '<span></span>' });
      go.querySelector('span').textContent = T.goWa;
      go.addEventListener('click', function () {
        if (!box.checked) { err.textContent = T.consentErr; box.focus(); return; }
        lead.consent = true;
        submitLead(lead);
        var url = waUrl(T.waMsg(lead));
        window.open(url, '_blank', 'noopener');
        say(T.done);
        foot.innerHTML = '';
        var link = el('a', { class: 'ss-btn-wa', href: url, target: '_blank', rel: 'noopener', html: ICON.wa + '<span></span>' });
        link.querySelector('span').textContent = T.openWa;
        foot.appendChild(link);
      });
      foot.appendChild(label); foot.appendChild(err); foot.appendChild(go);
      box.focus();
    }
    function start() {
      started = true;
      say(T.hello);
      askText(T.namePh, 'text', function (v) { return v.length >= 2; }, T.nameErr, function (name) {
        lead.name = name;
        say(T.phoneAsk(name.split(' ')[0]));
        askText(T.phonePh, 'tel', function (v) { return v.replace(/\D/g, '').length >= 8; }, T.phoneErr, function (phone) {
          lead.phone = phone;
          askCoverage();
        });
      });
    }

    function toggle(open, preset) {
      panel.hidden = !open;
      fab.setAttribute('aria-expanded', String(open));
      var badge = fab.querySelector('.ss-fab__badge');
      if (badge) badge.remove();
      if (open) {
        if (!started) start(); else { var f = foot.querySelector('input, button, a'); if (f) f.focus(); }
      } else fab.focus();
    }
    fab.addEventListener('click', function () { toggle(panel.hidden); });
    closeBtn.addEventListener('click', function () { toggle(false); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    chat = { open: function () { toggle(true); } };

    // Every "WhatsApp" link on the page opens the chat first, so the contact is captured.
    document.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); chat.open(); });
    });
  }

  /* ------------------------------------------------------------------
     4. Quote forms -> validate, consent, lead, WhatsApp
     ------------------------------------------------------------------ */
  function wireForms() {
    document.querySelectorAll('form[data-ss-lead]').forEach(function (form) {
      var status = el('p', { class: 'ss-form-status', role: 'status' });
      form.appendChild(status);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = form.querySelector('[name="name"]');
        var phone = form.querySelector('[name="phone"]');
        var consent = form.querySelector('[name="consent"]');
        var ok = name && name.value.trim().length >= 2 && phone && phone.value.replace(/\D/g, '').length >= 8 && consent && consent.checked;
        [name, phone].forEach(function (f) { if (f) f.setAttribute('aria-invalid', String(!f.value.trim())); });
        if (!ok) {
          status.className = 'ss-form-status ss-form-status--error';
          status.textContent = T.formErr;
          (!name.value.trim() ? name : !phone.value.trim() ? phone : consent).focus();
          return;
        }
        var lead = { source: 'quote_form', consent: true, fields: {} };
        var lines = [T.formMsgHead];
        Array.prototype.forEach.call(form.elements, function (f) {
          if (!f.name || f.name === 'consent' || !f.value.trim()) return;
          var label = f.closest('label');
          var title = label ? label.childNodes[0].textContent.trim() : f.name;
          lead.fields[f.name] = f.value.trim();
          lines.push(title + ': ' + f.value.trim());
        });
        lead.name = lead.fields.name; lead.phone = lead.fields.phone; lead.coverage = lead.fields.coverage || '';
        submitLead(lead);
        status.className = 'ss-form-status ss-form-status--ok';
        status.textContent = T.formOk;
        window.open(waUrl(lines.join('\n')), '_blank', 'noopener');
      });
    });
  }

  function init() {
    buildCookieBanner();
    buildA11y();
    buildChat();
    wireForms();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
