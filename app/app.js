/**
 * Synkro App — Motor Synkro Engine
 * Vanilla JS · Claude API (claude-sonnet-4-6)
 *
 * Paquetes:  Starter (3 prompts) | Profesional (6) | Premium (8)
 * Redes:     Instagram · Facebook · TikTok
 * Posts/red: Starter 8 · Profesional 16 · Premium 20
 */

// ── Package Config ─────────────────────────────────────────────────────────
const PACKAGE_PROMPTS = {
  starter:     ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo', 'fichaProduccion'],
  profesional: ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo', 'reelEmpatia', 'botWhatsapp', 'pautaMeta', 'fichaProduccion'],
  premium:     ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo', 'reelEmpatia', 'reelTestimonialProceso', 'botWhatsapp', 'pautaMeta', 'googleBusiness', 'fichaProduccion'],
};

const POSTS_COUNT = { starter: 8, profesional: 16, premium: 20 };

const PROMPT_LABELS = {
  maestro:                'Brief Maestro',
  posts:                  'Posts Multicanal',
  estrategiaCampana:      'Estrategia de Campaña',
  calendarioPublicacion:  'Calendario de Publicación',
  reelEducativo:          'Reel Educativo',
  reelEmpatia:            'Reel Empatía',
  reelTestimonialProceso: 'Reels Testimonial + Proceso',
  botWhatsapp:            'Bot WhatsApp',
  pautaMeta:              'Pauta Meta Ads',
  googleBusiness:         'Google Business Profile',
  fichaProduccion:        'Ficha de Producción Visual',
};

// ── Firebase ───────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyBc50nnVPUFuiNxyyvaPur39BCiCRn1j1o',
  authDomain:        'synkro-app-9daf6.firebaseapp.com',
  databaseURL:       'https://synkro-app-9daf6-default-rtdb.firebaseio.com',
  projectId:         'synkro-app-9daf6',
  storageBucket:     'synkro-app-9daf6.firebasestorage.app',
  messagingSenderId: '625963873871',
  appId:             '1:625963873871:web:7612e0dbcb0e9c07861c3a',
};
firebase.initializeApp(firebaseConfig);
const db   = firebase.database();
const auth = firebase.auth();

// ── State ──────────────────────────────────────────────────────────────────
let clientData          = null;
let campaignData        = null;
let cachedSessions      = [];
let currentClientSlug   = null;
let currentCampaignCode = null;

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const dropZone       = $('dropZone');
const fileInput      = $('fileInput');
const clientPreview  = $('clientPreview');
const clientName     = $('clientName');
const clientTags     = $('clientTags');
const clientRaw      = $('clientRaw');
const clearClientBtn = $('clearClientBtn');
const noClientWarn   = $('noClientWarn');

const generateBtn    = $('generateBtn');
const btnText        = $('btnText');
const spinner        = $('spinner');
const outputSection  = $('outputSection');

const apiKeyBtn      = $('apiKeyBtn');
const modalBackdrop  = $('modalBackdrop');
const modalClose     = $('modalClose');
const apiKeyInput    = $('apiKeyInput');
const saveApiKey     = $('saveApiKey');

const toast          = $('toast');

// ── Init ───────────────────────────────────────────────────────────────────
// ── Auth ───────────────────────────────────────────────────────────────────
function initApp() {
  setupDragDrop();
  setupApiKeyModal();
  setupGenerateBtn();
  initStatusSection();
  setupCierreModal();
  setupClientSelector();
  $('demoBtn').addEventListener('click', loadDemoData);

  const key = localStorage.getItem('synkro_api_key');
  if (key) {
    apiKeyBtn.style.borderColor = 'var(--teal)';
    apiKeyBtn.style.color       = 'var(--teal-xl)';
  }

  // Logout
  const logoutBtn = $('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      auth.signOut().then(() => {
        $('loginScreen').classList.remove('hidden');
        $('loginError').textContent = '';
        $('loginEmail').value = '';
        $('loginPassword').value = '';
      });
    });
  }
}

function setupLogin() {
  const loginBtn      = $('loginBtn');
  const loginEmail    = $('loginEmail');
  const loginPassword = $('loginPassword');
  const loginError    = $('loginError');
  const loginScreen   = $('loginScreen');

  // Enter key en password = submit
  loginPassword.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn.click();
  });
  loginEmail.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginPassword.focus();
  });

  loginBtn.addEventListener('click', () => {
    const email = loginEmail.value.trim();
    const pass  = loginPassword.value;
    if (!email || !pass) { loginError.textContent = 'Ingresa tu correo y contraseña.'; return; }

    loginBtn.disabled    = true;
    loginBtn.textContent = 'Verificando...';
    loginError.textContent = '';

    auth.signInWithEmailAndPassword(email, pass)
      .then(() => {
        loginScreen.classList.add('hidden');
        loginBtn.disabled    = false;
        loginBtn.textContent = 'Entrar';
      })
      .catch(err => {
        loginBtn.disabled    = false;
        loginBtn.textContent = 'Entrar';
        switch (err.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            loginError.textContent = 'Correo o contraseña incorrectos.'; break;
          case 'auth/too-many-requests':
            loginError.textContent = 'Demasiados intentos. Espera unos minutos.'; break;
          default:
            loginError.textContent = 'Error al iniciar sesión. Intenta de nuevo.';
        }
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLogin();

  // Firebase Auth observer — controla acceso a la app
  auth.onAuthStateChanged(user => {
    const loginScreen = $('loginScreen');
    if (user) {
      // Usuario autenticado — mostrar app
      loginScreen.classList.add('hidden');
      initApp();
    } else {
      // No autenticado — mostrar login
      loginScreen.classList.remove('hidden');
    }
  });
});

// ── Drag & Drop ────────────────────────────────────────────────────────────
function setupDragDrop() {
  ['dragenter','dragover','dragleave','drop'].forEach(ev => {
    document.addEventListener(ev, e => e.preventDefault());
  });

  dropZone.addEventListener('dragover',  () => dropZone.classList.add('drag-over'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });
  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) processFile(e.target.files[0]);
    fileInput.value = '';
  });
  clearClientBtn.addEventListener('click', e => {
    e.stopPropagation();
    clearClient();
  });
}

function processFile(file) {
  const validExt  = file.name.toLowerCase().endsWith('.json');
  const validMime = ['application/json', 'text/json'].includes(file.type);
  if (!validExt && !validMime) {
    showToast('Por favor carga un archivo .json válido', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      clientData = data;
      renderClientPreview(data);
      saveBriefFirebase(data);
      dropZone.classList.add('has-file');
      noClientWarn.classList.add('hidden');
      showToast('✓ Cliente cargado correctamente', 'success');
    } catch {
      showToast('Error al parsear el JSON — verifica el formato', 'error');
    }
  };
  reader.readAsText(file);
}

async function saveBriefFirebase(data) {
  try {
    const slug = slugify(
      data.identidad?.nombre_comercial || data.identidad?.nombre ||
      data.negocio?.nombre || data.nombre || 'cliente'
    );
    if (!slug) return;
    await db.ref(`clientes/${slug}/brief`).set(data);
  } catch (e) {
    console.warn('[Synkro] saveBriefFirebase error:', e.message);
  }
}

function renderClientPreview(data) {
  // Support both flat and nested structures (identidad/negocio/marca/paquete)
  const id   = data.identidad  || {};
  const neg  = data.negocio    || {};
  const marc = data.marca      || {};

  const name = id.nombre_comercial || id.nombre || neg.nombre || data.nombre || 'Cliente sin nombre';
  clientName.textContent = name;

  const tags = [];
  const addTag = v => { if (v) tags.push(String(v)); };

  const pkgRaw = data.paquete || neg.paquete || id.paquete;
  const pkgLabel = (pkgRaw && (pkgRaw.nombre || pkgRaw)) || '';
  if (pkgLabel) addTag('Paquete: ' + pkgLabel);

  addTag(id.ciudad || data.ciudad);
  addTag(id.industria || neg.industria || data.industria || data.sector);
  addTag(neg.tipo);
  addTag(neg.audiencia || data.audiencia);
  addTag(marc.tono || data.tono);

  const redes = data.redes || data.redesSociales || id.redes || [];
  if (Array.isArray(redes)) redes.slice(0, 3).forEach(r => addTag(String(r)));

  clientTags.innerHTML = tags
    .filter(Boolean).slice(0, 8)
    .map(t => `<span class="client-tag">${escHtml(t)}</span>`)
    .join('');

  clientRaw.textContent = JSON.stringify(data, null, 2);
  clientPreview.classList.remove('hidden');

  const pkgOverride = document.getElementById('packageOverride');
  const pkgDetected = document.getElementById('packageDetected');
  const pkgSelect   = document.getElementById('packageSelect');
  if (pkgOverride) pkgOverride.classList.remove('hidden');
  if (pkgDetected) {
    const detected = data.paquete?.nombre || data.paquete || data.negocio?.paquete || data.identidad?.paquete || 'No detectado';
    pkgDetected.textContent = 'Detectado: ' + detected;
  }
  if (pkgSelect) pkgSelect.value = '';
}

function clearClient() {
  clientData = null;
  clientPreview.classList.add('hidden');
  dropZone.classList.remove('has-file');
  noClientWarn.classList.remove('hidden');
}

// ── API Key Modal ──────────────────────────────────────────────────────────
function setupApiKeyModal() {
  apiKeyBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  saveApiKey.addEventListener('click', () => {
    const val = apiKeyInput.value.trim();
    if (!val) { showToast('Por favor ingresa una API key válida', 'error'); return; }
    if (!val.startsWith('sk-ant-')) { showToast('La key debe empezar con sk-ant-', 'error'); return; }
    localStorage.setItem('synkro_api_key', val);
    apiKeyBtn.style.borderColor = 'var(--teal)';
    apiKeyBtn.style.color       = 'var(--teal-xl)';
    closeModal();
    showToast('✓ API Key guardada', 'success');
  });
}

function openModal() {
  const saved = localStorage.getItem('synkro_api_key');
  if (saved) apiKeyInput.value = saved;
  modalBackdrop.classList.add('open');
  apiKeyInput.focus();
}
function closeModal() {
  modalBackdrop.classList.remove('open');
  apiKeyInput.value = '';
}

// ── Generate ───────────────────────────────────────────────────────────────
function setupGenerateBtn() {
  generateBtn.addEventListener('click', generateCampaign);
}

async function generateCampaign() {
  const apiKey = localStorage.getItem('synkro_api_key');
  if (!apiKey) { openModal(); showToast('⚠ Configura tu API Key primero', 'error'); return; }

  const mes      = $('fMes').value.trim();
  const servicio = $('fServicio').value.trim();
  if (!mes || !servicio) {
    showToast('⚠ Completa los campos obligatorios (mes y servicio)', 'error');
    $('fMes').focus();
    return;
  }

  if (!clientData) noClientWarn.classList.remove('hidden');

  setLoading(true, 'Motor Synkro — preparando...');
  campaignData = null;

  try {
    const pkg     = detectPackage(clientData);
    const prompts = PACKAGE_PROMPTS[pkg];
    const total   = prompts.length;
    const month      = getMonthData();
    const continuity = getContinuityData();

    // ── TOP-UP: detectar si ya existe campaña y ofrecer upgrade ──────────────
    const currentSlug = slugify(clientData?.identidad?.nombre_comercial || clientData?.identidad?.nombre || clientData?.negocio?.nombre || clientData?.nombre || '');
    const existingCampaign = await checkExistingCampaign(currentSlug, month.mes, new Date().getFullYear());
    const existingPkg = existingCampaign?._package || null;
    const pkgOrder = ['starter', 'profesional', 'premium'];
    const isUpgrade = existingPkg && pkgOrder.indexOf(pkg) > pkgOrder.indexOf(existingPkg);
    if (isUpgrade) {
      setLoading(false);
      const confirmed = await showUpgradeModal(existingPkg, pkg);
      if (confirmed === 'topup') {
        return generateTopUp(clientData, existingCampaign, existingPkg, pkg);
      }
      setLoading(true, 'Motor Synkro — preparando...');
    }

    setLoading(true, `Motor Synkro · Paquete ${pkg} · 0/${total}`);
    campaignData = { _package: pkg };

    // ── Prompt 1: Maestro (+ historial Firebase) ──────────────────────────
    setLoading(true, `1/${total} — ${PROMPT_LABELS.maestro} · leyendo historial…`);
    const historial  = await fetchHistorial(clientData);

    const clientSlug      = slugify(clientData?.identidad?.nombre_comercial || clientData?.identidad?.nombre || clientData?.negocio?.nombre || clientData?.nombre || clientData?.name || '');
    const MESES           = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const mesAnteriorIdx  = MESES.indexOf(month.mes.toLowerCase());
    const mesAnterior     = mesAnteriorIdx > 0 ? MESES[mesAnteriorIdx - 1] : 'diciembre';
    const añoCierre       = mesAnteriorIdx > 0 ? new Date().getFullYear() : new Date().getFullYear() - 1;

    let cierreMesAnterior = null;
    let todosCierresHistoricos = [];
    try {
      [cierreMesAnterior, todosCierresHistoricos] = await Promise.all([
        fetchCierreMes(clientSlug, mesAnterior, añoCierre),
        fetchTodosCierres(clientSlug)
      ]);
    } catch(e) {
      console.warn('[Synkro] Error cargando historial de cierres:', e);
    }

    const intelSection = buildIntelSection(cierreMesAnterior, todosCierresHistoricos);

    const maestroRaw = await callClaude(apiKey, buildMaestroPrompt(clientData, month, historial, continuity, intelSection), 2048);
    const maestroText = maestroRaw.content[0].text;
    campaignData.maestro = extractJson(maestroText) || { resumen: maestroText };

    // ── Prompt 2: Posts ────────────────────────────────────────────────────
    setLoading(true, `2/${total} — ${PROMPT_LABELS.posts}`);
    const postsRaw = await callClaude(apiKey, buildPostsPrompt(clientData, month, campaignData.maestro, pkg), 16000);
    const postsText = postsRaw.content[0].text;
    console.log('[Synkro] Posts raw response:', postsText);
    campaignData.posts = parsePostsFromDelimiters(postsText);
    console.log('[Synkro] Posts parsed:', campaignData.posts);
    if (
      !campaignData.posts ||
      !Array.isArray(campaignData.posts.instagram) ||
      !Array.isArray(campaignData.posts.facebook)  ||
      !Array.isArray(campaignData.posts.tiktok)
    ) {
      throw new Error('No se pudo parsear los posts — la respuesta de Claude no tiene la estructura esperada. Revisa la consola para ver la respuesta completa.');
    }

    // ── Prompts 3–N ────────────────────────────────────────────────────────
    for (let i = 2; i < prompts.length; i++) {
      const pName = prompts[i];
      setLoading(true, `${i + 1}/${total} — ${PROMPT_LABELS[pName]}`);
      const raw = await callClaude(
        apiKey,
        buildPromptFor(pName, clientData, month, campaignData),
        pName === 'calendarioPublicacion' ? 8192 : pName === 'reelTestimonialProceso' || pName === 'fichaProduccion' ? 4096 : 3000
      );
      campaignData[pName] = extractJson(raw.content[0].text);
    }

    campaignData._clientSlug = slugify(clientData?.identidad?.nombre_comercial || clientData?.identidad?.nombre || clientData?.negocio?.nombre || clientData?.nombre || 'cliente');
    campaignData._mes = (getMonthData().mes || 'mes').toLowerCase();

    renderCampaign(campaignData);
    generateCampaignExports(campaignData);
    if (campaignData.posts) setupApprovalButton();
    showToast(`✦ Motor Synkro completado — ${total} prompts generados`, 'success');

  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

function detectPackage(data) {
  const overrideSelect = document.getElementById('packageSelect');
  if (overrideSelect && overrideSelect.value) {
    return overrideSelect.value.toLowerCase();
  }
  if (!data) return 'starter';
  const raw = String(
    data.paquete || data.negocio?.paquete || data.identidad?.paquete || ''
  ).toLowerCase();
  if (raw.includes('premium'))                         return 'premium';
  if (raw.includes('profesional') || raw.includes('pro')) return 'profesional';
  return 'starter';
}

function getMonthData() {
  return {
    mes:       $('fMes').value.trim(),
    servicio:  $('fServicio').value.trim(),
    promocion: $('fPromocion').value.trim(),
    fecha:     $('fFecha').value.trim(),
    objecion:  $('fObjecion').value.trim(),
    pregunta:  $('fPregunta').value.trim(),
    nota:      $('fNota').value.trim(),
  };
}

function getContinuityData() {
  return {
    objetivoMes:  ($('fObjetivoMes')  && $('fObjetivoMes').value)  || '',
    promocionMes: ($('fPromocionMes') && $('fPromocionMes').value) || '',
    temporada:    ($('fTemporada')    && $('fTemporada').value)    || '',
    queRepetir:   ($('fQueRepetir')   && $('fQueRepetir').value)   || '',
    instruccion:  ($('fInstruccion')  && $('fInstruccion').value)  || '',
  };
}

// ── Prompt Builders ────────────────────────────────────────────────────────

function clientJson(data) {
  return data
    ? `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
    : 'Sin ficha de cliente. Genera contenido genérico de alto impacto.';
}

function monthSection(m) {
  return `## DATOS DEL MES: ${m.mes.toUpperCase()}
- Servicio estrella: ${m.servicio}
- Promoción: ${m.promocion || 'N/A'}
- Fecha especial: ${m.fecha || 'N/A'}
- Objeción frecuente: ${m.objecion || 'N/A'}
- Pregunta frecuente: ${m.pregunta || 'N/A'}
- Nota especial: ${m.nota || 'Ninguna'}`;
}

// ── Historial Firebase ─────────────────────────────────────────────────────

async function fetchHistorial(data) {
  if (!data) return [];
  const clientName = (
    data.nombre || data.identidad?.nombre || data.negocio?.nombre || data.name || ''
  );
  const slug = slugify(clientName);
  if (!slug || slug === 'cliente') return [];

  try {
    const snap = await db.ref(`clientes/${slug}/historial`).once('value');
    if (!snap.exists()) {
      hideContinuityCard();
      return [];
    }
    const entries = Object.entries(snap.val())
      .map(([key, v]) => ({ _mesKey: key, ...v }))
      .sort((a, b) => (b.guardadoEn || 0) - (a.guardadoEn || 0));
    if (entries.length) showContinuityCard(); else hideContinuityCard();
    return entries;
  } catch (e) {
    console.warn('[Synkro] fetchHistorial error:', e.message);
    return [];
  }
}

function showContinuityCard() {
  const card = document.getElementById('continuityCard');
  if (card) card.classList.remove('hidden');
}

function hideContinuityCard() {
  const card = document.getElementById('continuityCard');
  if (card) card.classList.add('hidden');
}

function buildHistorialSection(historial, currentMonth) {
  const entries = historial
    .filter(h => slugify(h.mes || h._mesKey || '') !== slugify(currentMonth.mes))
    .slice(0, 6);

  if (!entries.length) return '';

  const bloques = entries.map(h => {
    const allHashtags = h.hashtags
      ? [
          ...(h.hashtags.marca    || []),
          ...(h.hashtags.nicho    || []),
          ...(h.hashtags.trending || []),
        ].join(' ')
      : '—';
    const temas   = Array.isArray(h.temasUsados)      ? h.temasUsados.join(', ')      : '—';
    const pilares = Array.isArray(h.pilaresContenido)  ? h.pilaresContenido.join(', ') : '—';
    const label   = `${h.mes || h._mesKey}${h.año ? ' ' + h.año : ''}`;

    return `### ${label}
- Ángulo narrativo: "${h.anguloNarrativo || '—'}"
- Mensaje clave: "${h.mensajeClave || '—'}"
- Emoción principal: ${h.emocionPrincipal || '—'}
- Tono: ${h.tono || '—'}
- Temas usados: ${temas}
- Pilares de contenido: ${pilares}
- Hashtags de nicho y trending usados: ${allHashtags}`;
  }).join('\n\n');

  return `## HISTORIAL DE CAMPAÑAS ANTERIORES

⚠️ REGLAS CRÍTICAS DE PROGRESIÓN NARRATIVA — LEE ANTES DE GENERAR:
1. NO repitas ninguno de los ángulos narrativos listados abajo, ni siquiera en variación superficial.
2. NO uses los mismos temas ni palabras clave que ya aparecen en meses anteriores.
3. NO repitas los pilares de contenido del mes inmediatamente anterior — rota a otros pilares.
4. CONSTRUYE sobre lo anterior: cada campaña es el siguiente capítulo de la historia del negocio. Si el mes pasado fue educativo, este puede ser de prueba social o transformación; si fue emocional, este puede ser práctico o inspiracional.
5. Los hashtags de #marca pueden repetirse. Los de nicho y trending deben ser frescos o rotados.
6. El ángulo del mes actual debe sentirse como evolución, no como repetición.

${bloques}`;
}

// ── PROMPT 1: Maestro ──────────────────────────────────────────────────────
function buildMaestroPrompt(client, month, historial = [], continuity = {}, intelSection = '') {
  const historialSection = buildHistorialSection(historial, month);

  const hasContinuity = continuity.objetivoMes || continuity.instruccion || continuity.queRepetir;
  const continuitySection = hasContinuity ? `
## CONTEXTO ESPECÍFICO DE ESTE MES
- Objetivo principal: ${continuity.objetivoMes || 'N/A'}
- Promoción o evento: ${continuity.promocionMes || 'N/A'}
- Contexto externo: ${continuity.temporada || 'N/A'}
- Qué funcionó el mes anterior (aprovechar): ${continuity.queRepetir || 'N/A'}
- Instrucción especial: ${continuity.instruccion || 'N/A'}

REGLAS para este mes:
- El objetivo declarado arriba es la prioridad estratégica número uno
- Si hay algo que funcionó el mes anterior, construir sobre eso, no ignorarlo
- La instrucción especial tiene precedencia sobre cualquier decisión de tono o enfoque
` : '';

  const cierreSection = intelSection;

  return `Eres el estratega principal del Motor Synkro. Analiza en profundidad el perfil del cliente y los datos del mes para crear el BRIEF MAESTRO que guiará todos los prompts de contenido posteriores.
${historialSection ? '\n' + historialSection + '\n' : ''}${continuitySection}${cierreSection}
## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después.

{
  "negocio": "Nombre y tipo de negocio en 1 línea",
  "propuestaValor": "Propuesta de valor única del negocio en 2-3 líneas",
  "audienciaObjetivo": "Descripción detallada del cliente ideal: edad, intereses, dolores, aspiraciones",
  "tonoVoz": "Tono y voz de marca (ej: cercano y profesional, juvenil y auténtico, experto y empático)",
  "palabrasClave": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "emocionPrincipal": "La emoción que debe evocar el contenido de este mes",
  "anguloCampana": "El ángulo narrativo central de la campaña de ${month.mes}",
  "ctaPrincipal": "Call to action principal del mes",
  "linkNegocio": "URL o WhatsApp del negocio si está en el JSON, si no: '[AGREGAR LINK]'",
  "hashtags": {
    "marca": ["#hashtag_marca_1", "#hashtag_marca_2"],
    "nicho": ["#hashtag_nicho_1", "#hashtag_nicho_2", "#hashtag_nicho_3"],
    "trending": ["#hashtag_trending_1", "#hashtag_trending_2", "#hashtag_trending_3"]
  },
  "objecionRespuesta": "Cómo refutar la objeción '${month.objecion || 'precio'}' de forma natural y empática",
  "preguntaRespuesta": "Respuesta clara y persuasiva a la pregunta frecuente"
}`;
}

// ── PROMPT 2: Posts ────────────────────────────────────────────────────────
function buildPostsPrompt(client, month, maestro, pkg) {
  const n = POSTS_COUNT[pkg];

  return `Eres el redactor creativo del Motor Synkro. Basándote en el brief maestro, genera ${n} posts completos y DISTINTOS entre sí para CADA una de las 3 redes: Instagram, Facebook y TikTok.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

## ESTRATEGIA POR RED

### TIKTOK — Lenguaje joven + gancho en primeras 2 palabras + hashtags trending
- Las PRIMERAS 2 PALABRAS deben ser el gancho que para el scroll (ej: "NADIE SABE", "ESTO CAMBIA", "¿POR QUÉ TU", "SECRETO DE")
- Lenguaje joven, directo, auténtico — NADA corporativo ni formal
- Estructura: gancho (2 palabras) + hook visual (1 línea) + desarrollo en 3 puntos + CTA viral
- Máx 180 caracteres de copy + 5-8 hashtags trending del nicho
- Tono: como un amigo que descubrió algo y lo comparte emocionado

### INSTAGRAM — Copy corto + emojis + hashtags
- Copy visible antes del "ver más": máx 125 caracteres, impactante desde la primera palabra
- Usa 3-6 emojis estratégicos (no spam, cada uno agrega significado)
- 15-20 hashtags por post: mezcla de #marca, #nicho y #trending del sector
- Alterna formatos: pregunta de apertura / dato impactante / micro-historia / CTA directo
- Al menos 1 post refuta la objeción, 1 responde la pregunta frecuente

### FACEBOOK — Copy largo + contexto + CTA con link
- 200-350 palabras por post, estructura: GANCHO → HISTORIA/CONTEXTO → VALOR → CTA
- Tono conversacional y cercano, como hablarle a un amigo que necesita el servicio
- Incluye siempre el link del negocio (${maestro.linkNegocio || '[LINK_NEGOCIO]'}) en el CTA
- Puede mencionar la promoción o fecha especial cuando aplique
- Párrafos cortos (2-3 líneas máx), usa saltos de línea para ritmo

## FORMATO DE RESPUESTA

Usa exactamente estos delimitadores. No agregues texto, introducción ni explicación — solo los bloques en orden.
Genera ${n} bloques por red (TK, IG, FB), numerados del 1 al ${n}.

POST_TK_1:
[caption TikTok — máx 180 caracteres, gancho en primeras 2 palabras]
HASHTAGS_TK_1:
[5-8 hashtags trending]

POST_TK_2:
[caption]
HASHTAGS_TK_2:
[hashtags]

(continúa hasta POST_TK_${n} / HASHTAGS_TK_${n})

POST_IG_1:
[caption Instagram — máx 125 caracteres + emojis]
HASHTAGS_IG_1:
[15-20 hashtags separados por espacios]

POST_IG_2:
[caption]
HASHTAGS_IG_2:
[hashtags]

(continúa hasta POST_IG_${n} / HASHTAGS_IG_${n})

POST_FB_1:
[post Facebook completo — 200-350 palabras, párrafos cortos, CTA con link]

POST_FB_2:
[post]

(continúa hasta POST_FB_${n})`;
}

// ── PROMPT 3: Reel Educativo ────────────────────────────────────────────────
function buildReelEducativoPrompt(client, month, maestro) {
  return `Eres el guionista de reels educativos del Motor Synkro. Tu misión: educar + entretener + posicionar al negocio como referente del sector.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Crea el guion completo de UN reel educativo de 60-90 segundos sobre "${month.servicio}". El espectador debe aprender algo valioso Y querer contratar el servicio.

Responde ÚNICAMENTE con JSON válido:

{
  "titulo": "Título del reel (aparece en pantalla como texto overlay)",
  "hook": "Primeras palabras en voz — primeros 3 segundos, deben detener el scroll",
  "estructura": [
    { "segundo": "0-3",   "visual": "Qué se ve en cámara", "audio": "Qué se dice o escucha" },
    { "segundo": "3-15",  "visual": "...", "audio": "..." },
    { "segundo": "15-35", "visual": "...", "audio": "..." },
    { "segundo": "35-55", "visual": "...", "audio": "..." },
    { "segundo": "55-75", "visual": "...", "audio": "..." }
  ],
  "cta": "CTA final del reel (últimos 5 segundos)",
  "caption": "Caption para publicar el reel con emojis y tono de la marca",
  "hashtags": "#hash1 #hash2 ... (15 hashtags para el reel)",
  "musicaSugerida": "Tipo de música o canción trending sugerida y por qué",
  "textoEnPantalla": ["Overlay 1 — aparece en seg 3", "Overlay 2 — aparece en seg 15", "Overlay 3 — aparece en seg 55"]
}`;
}

// ── PROMPT 4: Reel Empatía ─────────────────────────────────────────────────
function buildReelEmpatiaPrompt(client, month, maestro) {
  return `Eres el guionista de reels de conexión emocional del Motor Synkro. Este reel NO vende directamente — genera confianza, pertenencia y conexión.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Crea el guion de UN reel de EMPATÍA (45-60 segundos). Aborda el dolor real o la aspiración principal de la audiencia objetivo. Formatos posibles: "¿te ha pasado que...?", "para los que sienten que...", "esto es para ti si...", "before & after emocional".

Responde ÚNICAMENTE con JSON válido:

{
  "titulo": "Título del reel",
  "emocionObjetivo": "La emoción que debe sentir el espectador al terminar",
  "hook": "Primeras palabras — los primeros 3 segundos deben hacer que el espectador se sienta identificado",
  "estructura": [
    { "segundo": "0-3",  "visual": "...", "audio": "..." },
    { "segundo": "3-20", "visual": "...", "audio": "..." },
    { "segundo": "20-40","visual": "...", "audio": "..." },
    { "segundo": "40-55","visual": "...", "audio": "..." }
  ],
  "cta": "CTA suave — invita a conectar, no a comprar directamente",
  "caption": "Caption con tono humano y vulnerable",
  "hashtags": "#hash1 #hash2 ... (12 hashtags de empatía + nicho)",
  "musicaSugerida": "Música emocional/inspiracional sugerida",
  "mensajeClave": "La frase central del reel — la que la gente va a guardar o compartir"
}`;
}

// ── PROMPT 5: Reels Testimonial + Proceso ──────────────────────────────────
function buildReelTestimonialProcesoPrompt(client, month, maestro) {
  return `Eres el director creativo de prueba social del Motor Synkro. Crea dos guiones de reels de alta conversión.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Crea DOS guiones completos:
1. REEL TESTIMONIAL: Un cliente real comparte su resultado. Formato UGC auténtico. El gancho debe ser el RESULTADO, no el proceso.
2. REEL PROCESO: Behind the scenes del servicio "${month.servicio}". Genera curiosidad, confianza y deseo.

Responde ÚNICAMENTE con JSON válido:

{
  "testimonial": {
    "titulo": "Título del reel testimonial",
    "hook": "Primeras palabras del cliente — deben ser el resultado obtenido (ej: 'En 3 sesiones...')",
    "estructura": [
      { "segundo": "0-5",  "visual": "...", "audio": "..." },
      { "segundo": "5-25", "visual": "...", "audio": "..." },
      { "segundo": "25-45","visual": "...", "audio": "..." },
      { "segundo": "45-60","visual": "...", "audio": "..." }
    ],
    "preguntasGuia": [
      "Pregunta 1 para hacerle al cliente antes de grabar",
      "Pregunta 2 — enfocada en el problema que tenía antes",
      "Pregunta 3 — enfocada en el resultado obtenido"
    ],
    "caption": "Caption del reel testimonial",
    "hashtags": "#hash1 #hash2 ... (10 hashtags)"
  },
  "proceso": {
    "titulo": "Título del reel proceso",
    "hook": "Frase de apertura que genera curiosidad sobre el proceso",
    "estructura": [
      { "segundo": "0-3",  "visual": "...", "audio": "..." },
      { "segundo": "3-20", "visual": "...", "audio": "..." },
      { "segundo": "20-45","visual": "...", "audio": "..." },
      { "segundo": "45-60","visual": "...", "audio": "..." }
    ],
    "pasos": [
      "Paso 1 del servicio — nombre + breve descripción visual",
      "Paso 2",
      "Paso 3",
      "Paso 4"
    ],
    "caption": "Caption del reel de proceso con curiosidad y CTA",
    "hashtags": "#hash1 #hash2 ... (10 hashtags)"
  }
}`;
}

// ── PROMPT 6: Bot WhatsApp ─────────────────────────────────────────────────
function buildBotWhatsappPrompt(client, month, maestro) {
  return `Eres el arquitecto de automatización de WhatsApp del Motor Synkro. Diseña el flujo completo del bot para ${month.mes}.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Responde ÚNICAMENTE con JSON válido:

{
  "bienvenida": "Mensaje automático al primer contacto — incluye nombre del negocio, propuesta de valor en 1 línea y CTA al menú. Máx 300 caracteres.",
  "menu": {
    "texto": "Mensaje del menú principal con las opciones numeradas",
    "opciones": [
      { "numero": "1", "opcion": "Nombre de la opción", "respuesta": "Respuesta automática completa y persuasiva" },
      { "numero": "2", "opcion": "...", "respuesta": "..." },
      { "numero": "3", "opcion": "...", "respuesta": "..." },
      { "numero": "4", "opcion": "Hablar con un asesor", "respuesta": "Mensaje de transición a humano + tiempo de espera" }
    ]
  },
  "respuestasRapidas": [
    { "trigger": "precio",    "respuesta": "Respuesta que entrega VALOR antes de mencionar precio — combate la objeción '${month.objecion || 'es caro'}'" },
    { "trigger": "horarios",  "respuesta": "Respuesta clara con horarios de atención" },
    { "trigger": "ubicacion", "respuesta": "Dirección + link de Google Maps si aplica" },
    { "trigger": "reserva",   "respuesta": "Pasos concretos para agendar una cita o reservar" }
  ],
  "followUp": [
    { "tiempo": "1 hora sin respuesta",  "mensaje": "Seguimiento cálido, no invasivo — máx 150 caracteres" },
    { "tiempo": "24 horas",              "mensaje": "Segundo seguimiento con propuesta de valor adicional" },
    { "tiempo": "3 días",                "mensaje": "Seguimiento final con urgencia suave o promoción" }
  ],
  "broadcast": {
    "asunto": "Tema del broadcast de ${month.mes}",
    "mensaje": "Mensaje completo para lista de difusión — personal, directo, usa el nombre del cliente si es posible. Máx 400 caracteres. Incluye CTA claro.",
    "frecuencia": "Recomendación de frecuencia de envío en ${month.mes}"
  }
}`;
}

// ── PROMPT 7: Pauta Meta ───────────────────────────────────────────────────
function buildPautaMetaPrompt(client, month, maestro) {
  return `Eres el Media Buyer estratega del Motor Synkro. Crea el plan de Meta Ads para ${month.mes} optimizado para PYME con presupuesto eficiente.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Responde ÚNICAMENTE con JSON válido:

{
  "objetivo": "Objetivo de campaña recomendado y justificación (alcance/tráfico/conversiones/mensajes)",
  "presupuestoSugerido": {
    "minimo":      "Presupuesto mínimo diario en USD",
    "recomendado": "Presupuesto óptimo diario en USD",
    "distribucion": "Cómo distribuir entre campañas (ej: 60% conversiones, 40% awareness)"
  },
  "audiencias": [
    {
      "nombre": "Nombre descriptivo de la audiencia",
      "tipo": "Intereses / Lookalike / Retargeting / Comportamientos",
      "configuracion": "Cómo configurarla paso a paso en Meta Ads Manager",
      "objetivo": "Para qué sirve esta audiencia en la estrategia del mes"
    },
    {
      "nombre": "...",
      "tipo": "...",
      "configuracion": "...",
      "objetivo": "..."
    },
    {
      "nombre": "...",
      "tipo": "...",
      "configuracion": "...",
      "objetivo": "..."
    }
  ],
  "creativos": [
    {
      "formato":         "Imagen estática / Video / Carrusel / Reel",
      "titulo":          "Título del anuncio (máx 40 caracteres)",
      "descripcion":     "Texto principal del anuncio (máx 125 caracteres)",
      "cta":             "Botón: Más información / Enviar mensaje / Comprar ahora / Reservar",
      "audienciaTarget": "A cuál de las audiencias va dirigido este creativo"
    },
    {
      "formato": "...", "titulo": "...", "descripcion": "...", "cta": "...", "audienciaTarget": "..."
    }
  ],
  "calendario": [
    { "semana": "Semana 1", "enfoque": "Qué tipo de contenido pautar y con qué objetivo" },
    { "semana": "Semana 2", "enfoque": "..." },
    { "semana": "Semana 3", "enfoque": "..." },
    { "semana": "Semana 4", "enfoque": "..." }
  ],
  "metricas": {
    "kpiPrincipal": "La métrica más importante a monitorear en este mes",
    "benchmarks":   "Rangos esperados de CPM, CTR y CPC para este nicho y objetivo",
    "escalar":      "Cuándo y cómo escalar presupuesto si el anuncio funciona",
    "pausar":       "Señales que indican que hay que pausar o cambiar el creativo"
  }
}`;
}

// ── PROMPT 8: Google Business ──────────────────────────────────────────────
function buildGoogleBusinessPrompt(client, month, maestro) {
  return `Eres el especialista en Google Business Profile del Motor Synkro. Crea la estrategia completa del perfil para ${month.mes}.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Responde ÚNICAMENTE con JSON válido:

{
  "publicaciones": [
    {
      "tipo":           "Novedad / Oferta / Evento / Producto",
      "titulo":         "Título de la publicación (máx 58 caracteres)",
      "texto":          "Cuerpo de la publicación (máx 1500 caracteres, orientado a SEO local)",
      "cta":            "Más información / Reservar / Pedir / Comprar / Llamar",
      "fechaSugerida":  "Primera semana / Segunda semana / etc."
    },
    { "tipo": "...", "titulo": "...", "texto": "...", "cta": "...", "fechaSugerida": "..." },
    { "tipo": "...", "titulo": "...", "texto": "...", "cta": "...", "fechaSugerida": "..." },
    { "tipo": "...", "titulo": "...", "texto": "...", "cta": "...", "fechaSugerida": "..." }
  ],
  "respuestasResenas": {
    "positiva5": "Plantilla de respuesta a reseña 5 estrellas — cálida, personalizada, menciona el servicio y refuerza la marca",
    "positiva4": "Plantilla para 4 estrellas — agradecida, reconoce que siempre hay mejora, invita a volver",
    "negativa":  "Plantilla para reseña negativa — empática, profesional, ofrece solución offline, nunca se pone a la defensiva"
  },
  "preguntasRespuestas": [
    { "pregunta": "Pregunta típica que hacen en Google Q&A 1", "respuesta": "Respuesta optimizada con keywords locales" },
    { "pregunta": "...", "respuesta": "..." },
    { "pregunta": "...", "respuesta": "..." }
  ],
  "descripcionSeo": "Descripción optimizada del negocio para el perfil — 750 caracteres, incluye keywords locales, servicios principales y propuesta de valor única",
  "categorias":         ["Categoría principal GBP", "Categoría secundaria 1", "Categoría secundaria 2"],
  "atributosSugeridos": ["Atributo a activar 1", "Atributo 2", "Atributo 3"],
  "fotosSugeridas":     ["Tipo de foto 1 a subir esta semana", "Tipo de foto 2", "Tipo de foto 3", "Tipo de foto 4"]
}`;
}

// ── PROMPT: Estrategia de Campaña ─────────────────────────────────────────
function buildEstrategiaPrompt(client, month, maestro) {
  return `Eres el estratega de contenido del Motor Synkro. Con base en el brief maestro y los datos del mes, crea la ESTRATEGIA DE CAMPAÑA completa que guiará cada decisión de contenido.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

Responde ÚNICAMENTE con JSON válido:

{
  "anguloNarrativo": "El ángulo central de toda la campaña — la historia que conecta todos los contenidos del mes en 2-3 líneas",
  "mensajeClave": "La frase o idea que debe quedar grabada en la mente del cliente ideal después de ver el contenido del mes",
  "emocionPrincipal": "La emoción dominante que debe sentir la audiencia al consumir el contenido",
  "propuestaValor": "Por qué elegir este negocio sobre la competencia — beneficio emocional + racional en 2-3 líneas",
  "tono": "3-5 adjetivos que definen cómo comunicar: ej. 'cercano, experto, optimista, directo, con humor sutil'",
  "pilaresDeContenido": [
    { "pilar": "Nombre del pilar", "descripcion": "Qué tipo de contenido abarca y por qué es estratégico", "porcentaje": "35%" },
    { "pilar": "...", "descripcion": "...", "porcentaje": "..." },
    { "pilar": "...", "descripcion": "...", "porcentaje": "..." }
  ],
  "enfoquesSemana": [
    { "semana": "Semana 1", "enfoque": "Qué tema o emoción domina esta semana y por qué" },
    { "semana": "Semana 2", "enfoque": "..." },
    { "semana": "Semana 3", "enfoque": "..." },
    { "semana": "Semana 4", "enfoque": "..." }
  ],
  "doYDont": {
    "do":   ["Sí hacer 1", "Sí hacer 2", "Sí hacer 3"],
    "dont": ["No hacer 1", "No hacer 2", "No hacer 3"]
  }
}`;
}

// ── PROMPT: Calendario de Publicación ─────────────────────────────────────
function buildCalendarioPrompt(client, month, maestro, posts, pkg) {
  const igCount = (posts?.instagram || []).length;
  const fbCount = (posts?.facebook  || []).length;
  const tkCount = (posts?.tiktok    || []).length;

  return `Eres el planificador de contenido del Motor Synkro. Crea el CALENDARIO DE PUBLICACIÓN mensual óptimo para máximo alcance e interacción.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

## POSTS A PROGRAMAR
- Instagram: ${igCount} posts
- Facebook:  ${fbCount} posts
- TikTok:    ${tkCount} posts

## REGLAS DE PROGRAMACIÓN
- Instagram: mejores horarios 7-9am, 11am-1pm, 7-9pm — L-V más efectivo para negocios
- Facebook: mejores horarios 9-10am, 12-2pm, 6-8pm — Miércoles y Jueves mayor engagement
- TikTok: mejores horarios 7-9am, 12-3pm, 7-11pm — Martes, Jueves y Viernes para negocios
- Distribuir posts de forma equilibrada a lo largo del mes
- Nunca publicar en las 3 redes el mismo día a la misma hora
- Dejar al menos 1 día entre posts de la misma red

Responde ÚNICAMENTE con JSON válido. Genera exactamente 4 objetos en "semanas":

{
  "semanas": [
    {
      "semana": "Semana 1",
      "rango": "Días 1-7",
      "publicaciones": [
        { "dia": "Lunes", "fecha": "1", "hora": "19:00", "red": "instagram", "numero": 1, "descripcion": "Tema o gancho breve del post" },
        { "dia": "Miércoles", "fecha": "3", "hora": "20:00", "red": "facebook", "numero": 1, "descripcion": "Tema o gancho breve del post" },
        { "dia": "Viernes", "fecha": "5", "hora": "18:00", "red": "tiktok", "numero": 1, "descripcion": "Tema o gancho breve del post" }
      ]
    },
    { "semana": "Semana 2", "rango": "Días 8-14", "publicaciones": [ ] },
    { "semana": "Semana 3", "rango": "Días 15-21", "publicaciones": [ ] },
    { "semana": "Semana 4", "rango": "Días 22-30", "publicaciones": [ ] }
  ],
  "mejoresHorarios": {
    "instagram": "Horario óptimo personalizado para este nicho + justificación breve",
    "facebook":  "Horario óptimo + justificación",
    "tiktok":    "Horario óptimo + justificación"
  },
  "notas": "Observación estratégica — festividades del mes, semana de mayor conversión, etc."
}`;
}

// ── PROMPT: Ficha de Producción Visual ─────────────────────────────────────
function buildFichaProduccionPrompt(client, month, campaign) {
  const maestro = campaign.maestro || {};
  const posts   = campaign.posts   || {};

  const piezas = [
    posts.instagram?.length ? `- ${posts.instagram.length} Posts Instagram` : '',
    posts.facebook?.length  ? `- ${posts.facebook.length} Posts Facebook`   : '',
    posts.tiktok?.length    ? `- ${posts.tiktok.length} Posts TikTok`       : '',
    campaign.reelEducativo                       ? '- 1 Reel Educativo'                    : '',
    campaign.reelEmpatia                         ? '- 1 Reel Empatía'                      : '',
    campaign.reelTestimonialProceso?.testimonial ? '- 1 Reel Testimonial'                  : '',
    campaign.reelTestimonialProceso?.proceso     ? '- 1 Reel Proceso / Behind the Scenes'  : '',
    campaign.pautaMeta                           ? '- 1 Pieza Ad Meta Ads'                 : '',
  ].filter(Boolean).join('\n');

  return `Eres el director de producción visual del Motor Synkro. Tu tarea es generar la FICHA DE PRODUCCIÓN VISUAL que sirve como guía de ejecución para el diseñador en Canva.

## BRIEF MAESTRO
\`\`\`json
${JSON.stringify(maestro, null, 2)}
\`\`\`

## PERFIL DEL CLIENTE
${clientJson(client)}

${monthSection(month)}

## PIEZAS DE CONTENIDO GENERADAS ESTE MES
${piezas}

Para cada tipo de pieza listado arriba genera su ficha de producción. Usa la paleta de colores, tipografía y estilo del cliente cuando estén disponibles. Sé específico y accionable.

Responde ÚNICAMENTE con JSON válido usando el modelo claude-sonnet-4-6:

{
  "piezas": [
    {
      "tipoPieza": "Post Instagram / Reel Educativo / etc.",
      "formato": "Imagen cuadrada / Carrusel / Video vertical / etc.",
      "tamano": "1080×1080 px / 1080×1920 px / etc.",
      "elementosVisuales": "Descripción detallada: colores de marca, tipografía principal, composición, jerarquía visual, íconos o ilustraciones sugeridas, overlay de texto",
      "templateRecomendado": "Nombre del template o estilo en Canva + categoría (Negocio / Lifestyle / Editorial / Minimalista / etc.)",
      "musicaRitmo": "N/A para imágenes estáticas — para reels: género musical, BPM aproximado, mood, ejemplo de canción o tendencia de audio",
      "accionCanva": "Instrucción paso a paso: qué template duplicar, qué texto cambiar, qué imagen reemplazar, qué color ajustar, cómo exportar"
    }
  ],
  "notasGenerales": "Observaciones de coherencia visual para toda la campaña: paleta unificada, fuentes, filtros de foto, estilo de composición"
}`;
}

// ── Prompt dispatcher ──────────────────────────────────────────────────────
function buildPromptFor(name, client, month, campaign) {
  const m = campaign.maestro;
  switch (name) {
    case 'estrategiaCampana':        return buildEstrategiaPrompt(client, month, m);
    case 'calendarioPublicacion':    return buildCalendarioPrompt(client, month, m, campaign.posts, campaign._package);
    case 'reelEducativo':            return buildReelEducativoPrompt(client, month, m);
    case 'reelEmpatia':              return buildReelEmpatiaPrompt(client, month, m);
    case 'reelTestimonialProceso':   return buildReelTestimonialProcesoPrompt(client, month, m);
    case 'botWhatsapp':              return buildBotWhatsappPrompt(client, month, m);
    case 'pautaMeta':                return buildPautaMetaPrompt(client, month, m);
    case 'googleBusiness':           return buildGoogleBusinessPrompt(client, month, m);
    case 'fichaProduccion':          return buildFichaProduccionPrompt(client, month, campaign);
    default: return '';
  }
}

// ── Claude API ─────────────────────────────────────────────────────────────
async function callClaude(apiKey, prompt, maxTokens = 4096) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':                              apiKey,
      'anthropic-version':                      '2023-06-01',
      'content-type':                           'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`;
    try { const err = await resp.json(); msg = err.error?.message || msg; } catch { /* */ }
    throw new Error(msg);
  }
  return resp.json();
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const raw = match[0];

  // Try 1: valid JSON as-is
  try { return JSON.parse(raw); } catch { /* */ }

  // Try 2: fix unescaped control characters (newlines, tabs, carriage returns)
  // that Claude may emit literally inside long string values (e.g. Facebook posts)
  try { return JSON.parse(repairJsonStrings(raw)); } catch { /* */ }

  return null;
}

// Walk the JSON character-by-character and escape any bare control characters
// that appear inside string values — leaves structural whitespace untouched.
function repairJsonStrings(text) {
  let out = '';
  let inString = false;
  let escaped  = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped)              { out += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { out += ch; escaped = true;  continue; }
    if (ch === '"')            { inString = !inString; out += ch; continue; }

    if (inString) {
      if (ch === '\n') { out += '\\n'; continue; }
      if (ch === '\r') { out += '\\r'; continue; }
      if (ch === '\t') { out += '\\t'; continue; }
    }

    out += ch;
  }
  return out;
}

// ── Delimiter-based posts parser ───────────────────────────────────────────
// Splits Claude's response on POST_IG_N:, POST_FB_N:, POST_TK_N:,
// HASHTAGS_IG_N:, HASHTAGS_TK_N: markers and builds the posts object.
function parsePostsFromDelimiters(text) {
  // Split on any known delimiter token, keeping the token as a capture group
  const parts = text.split(/\b(POST_(?:IG|FB|TK)_\d+|HASHTAGS_(?:IG|TK)_\d+):/);
  // parts: [preamble, label, content, label, content, ...]

  const sections = {};
  for (let i = 1; i < parts.length; i += 2) {
    const label   = parts[i].trim();
    const content = (parts[i + 1] || '').trim();
    sections[label] = content;
  }

  const instagram = [];
  const facebook  = [];
  const tiktok    = [];

  // Collect keys sorted so posts come out in order (1, 2, 3 …)
  const igKeys = Object.keys(sections).filter(k => k.startsWith('POST_IG_')).sort();
  const fbKeys = Object.keys(sections).filter(k => k.startsWith('POST_FB_')).sort();
  const tkKeys = Object.keys(sections).filter(k => k.startsWith('POST_TK_')).sort();

  igKeys.forEach(key => {
    const n = key.replace('POST_IG_', '');
    instagram.push({
      caption:  sections[key]                    || '',
      hashtags: sections[`HASHTAGS_IG_${n}`]    || '',
    });
  });

  fbKeys.forEach(key => {
    facebook.push({ post: sections[key] || '' });
  });

  tkKeys.forEach(key => {
    const n = key.replace('POST_TK_', '');
    tiktok.push({
      caption:  sections[key]                    || '',
      hashtags: sections[`HASHTAGS_TK_${n}`]    || '',
    });
  });

  return { instagram, facebook, tiktok };
}

// ── Render Campaign ────────────────────────────────────────────────────────
function renderCampaign(data) {
  const grid = $('outputGrid');
  grid.innerHTML = '';

  const pkg       = data._package;
  const pkgLabel  = { starter: 'Starter', profesional: 'Profesional', premium: 'Premium' };
  const titleEl   = outputSection.querySelector('.section-title');
  if (titleEl) titleEl.textContent = `Motor Synkro — Paquete ${pkgLabel[pkg] || pkg}`;

  if (data.maestro)              grid.appendChild(buildMaestroCard(data.maestro));
  if (data.estrategiaCampana)    grid.appendChild(buildEstrategiaCard(data.estrategiaCampana));
  if (data.posts)                grid.appendChild(buildPostsSection(data.posts, pkg));
  if (data.calendarioPublicacion) grid.appendChild(buildCalendarioCard(data.calendarioPublicacion));
  if (data.reelEducativo)        grid.appendChild(buildReelCard('Reel Educativo', 'Posicionamiento como experto', data.reelEducativo, 'ig'));
  if (data.reelEmpatia)          grid.appendChild(buildReelCard('Reel Empatía', 'Conexión emocional con la audiencia', data.reelEmpatia, 'em'));

  if (data.reelTestimonialProceso) {
    const d = data.reelTestimonialProceso;
    if (d.testimonial) grid.appendChild(buildReelCard('Reel Testimonial', 'Prueba social auténtica', d.testimonial, 'wa'));
    if (d.proceso)     grid.appendChild(buildReelCard('Reel Proceso', 'Behind the scenes', d.proceso, 'li'));
  }

  if (data.botWhatsapp)  grid.appendChild(buildBotCard(data.botWhatsapp));
  if (data.pautaMeta)    grid.appendChild(buildPautaCard(data.pautaMeta));
  if (data.googleBusiness) grid.appendChild(buildGoogleCard(data.googleBusiness));
  if (data.fichaProduccion) grid.appendChild(buildFichaProduccionCard(data.fichaProduccion));

  const guiaCard = buildGuiaProduccionCard(data);
  grid.appendChild(guiaCard);

  outputSection.classList.add('visible');
  setTimeout(() => outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

// ── Campaign Exports & Historial ──────────────────────────────────────────

function generateCampaignExports(data) {
  saveHistorialFirebase(data);

  const grid     = $('outputGrid');
  const existing = $('exportsCard');
  if (existing) existing.remove();

  const wrapper = document.createElement('div');
  wrapper.id    = 'exportsCard';
  wrapper.style.cssText = 'grid-column: 1/-1;';

  const hasBotBtn = !!data.botWhatsapp;
  const hasCalBtn = !!data.calendarioPublicacion;

  wrapper.innerHTML = `
<div class="platform-card exports-card">
  <div class="platform-bar" style="background:linear-gradient(90deg,#b8860b,#e8b923,#f59e0b)"></div>
  <div class="platform-header exports-header">
    <div class="platform-icon" style="background:linear-gradient(135deg,#b8860b,#e8b923);color:#fff;font-size:1.1rem">📥</div>
    <span class="platform-name" style="color:var(--gold-xl)">Archivos del Mes</span>
    <span class="exports-saved-badge">✓ Historial guardado en Firebase</span>
  </div>
  <div class="platform-body exports-body">
    <p class="exports-desc">Descarga los entregables de esta campaña para producción y entrega al cliente.</p>
    <p style="font-size:.75rem;color:var(--gold-xl);margin:0 0 8px;font-weight:700;">📦 Datos crudos</p>
    <div class="exports-btns" style="margin-bottom:16px;">
      <button class="btn-export btn-export-json" id="btnDlFull">
        <span class="btn-export-icon">📦</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Campaña Completa</span>
          <span class="btn-export-sub">JSON · todos los prompts</span>
        </span>
      </button>
      ${hasBotBtn ? `<button class="btn-export btn-export-wa" id="btnDlBot"><span class="btn-export-icon">💬</span><span class="btn-export-text"><span class="btn-export-label">Bot WhatsApp</span><span class="btn-export-sub">JSON · flujos y mensajes</span></span></button>` : ''}
      ${hasCalBtn ? `<button class="btn-export btn-export-cal" id="btnDlCal"><span class="btn-export-icon">📅</span><span class="btn-export-text"><span class="btn-export-label">Calendario JSON</span><span class="btn-export-sub">JSON · programa de publicación</span></span></button>` : ''}
    </div>
    <p style="font-size:.75rem;color:var(--gold-xl);margin:0 0 8px;font-weight:700;">🤖 Entregables con IA</p>
    <div class="exports-btns" style="margin-bottom:16px;">
      <button class="btn-export btn-export-adn" id="btnDlADN">
        <span class="btn-export-icon">🎨</span>
        <span class="btn-export-text">
          <span class="btn-export-label">ADN Visual</span>
          <span class="btn-export-sub">HTML · sistema de marca</span>
        </span>
      </button>
      <button class="btn-export btn-export-mat" id="btnDlBriefMat">
        <span class="btn-export-icon">📸</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Brief Material</span>
          <span class="btn-export-sub">HTML · auditoría y sesión de fotos</span>
        </span>
      </button>
      <button class="btn-export btn-export-prompts" id="btnDlPrompts">
        <span class="btn-export-icon">✨</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Prompts IA</span>
          <span class="btn-export-sub">HTML · Imagen 3 por post</span>
        </span>
      </button>
      <button class="btn-export btn-export-cal2" id="btnDlCalVisual">
        <span class="btn-export-icon">📅</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Calendario Visual</span>
          <span class="btn-export-sub">HTML · semana por semana</span>
        </span>
      </button>
    </div>
    <p id="labelGrupo2" style="font-size:.75rem;color:var(--teal-xl);margin:0 0 8px;font-weight:700;display:none;">✅ Post-aprobación</p>
    <div class="exports-btns" id="btnGrupo2" style="display:none;">
      <button class="btn-export btn-export-prod" id="btnDlProduccion">
        <span class="btn-export-icon">🗂️</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Documento de Producción</span>
          <span class="btn-export-sub">HTML · copy final aprobado</span>
        </span>
      </button>
      <button class="btn-export btn-export-resumen" id="btnDlResumen">
        <span class="btn-export-icon">📄</span>
        <span class="btn-export-text">
          <span class="btn-export-label">Resumen Ejecutivo</span>
          <span class="btn-export-sub">HTML · estrategia del mes</span>
        </span>
      </button>
    </div>
  </div>
</div>`;

  grid.appendChild(wrapper);

  wrapper.querySelector('#btnDlFull').addEventListener('click', () => downloadJson(data, 'campaña-completa'));
  const btnBot = wrapper.querySelector('#btnDlBot');
  if (btnBot) btnBot.addEventListener('click', () => downloadJson(data.botWhatsapp, 'bot-whatsapp'));
  const btnCal = wrapper.querySelector('#btnDlCal');
  if (btnCal) btnCal.addEventListener('click', () => downloadJson(data.calendarioPublicacion, 'calendario'));
  wrapper.querySelector('#btnDlADN').addEventListener('click', () => generarADNVisual(data));
  wrapper.querySelector('#btnDlBriefMat').addEventListener('click', () => generarBriefMaterial(data));
  wrapper.querySelector('#btnDlPrompts').addEventListener('click', () => generarPromptsIA(data));
  wrapper.querySelector('#btnDlCalVisual').addEventListener('click', () => generarCalendarioVisualHTML(data));
  if (currentCampaignCode) {
    db.ref('campaigns/' + currentCampaignCode + '/approvals').once('value').then(snap => {
      const approvals = snap.val() || {};
      const status = computeOverallStatus(approvals);
      if (status === 'complete') {
        wrapper.querySelector('#labelGrupo2').style.display = 'block';
        wrapper.querySelector('#btnGrupo2').style.display = 'flex';
        wrapper.querySelector('#btnDlProduccion').addEventListener('click', () => generarProduccionHTML(currentCampaignCode));
        wrapper.querySelector('#btnDlResumen').addEventListener('click', () => generarResumenEjecutivoHTML(data));
      }
    });
  }
}

// ── Resumen ejecutivo HTML ─────────────────────────────────────────────────

function downloadResumenHtml(data) {
  const m      = data.maestro            || {};
  const e      = data.estrategiaCampana  || {};
  const month  = getMonthData();
  const pkg    = data._package           || 'starter';

  const clientName = (clientData && (
    clientData.nombre
    || clientData.identidad?.nombre
    || clientData.negocio?.nombre
    || clientData.name
  )) || 'Cliente';

  const hashtags = m.hashtags
    ? [...(m.hashtags.marca || []), ...(m.hashtags.nicho || []), ...(m.hashtags.trending || [])].join('  ')
    : '';

  const pilaresHtml = Array.isArray(e.pilaresDeContenido)
    ? e.pilaresDeContenido.map(p =>
        `<li><strong>${escP(p.pilar)}</strong> <span class="pct">${escP(p.porcentaje || '')}</span> — ${escP(p.descripcion || '')}</li>`
      ).join('')
    : '';

  const doHtml   = Array.isArray(e.doYDont?.do)   ? e.doYDont.do.map(x => `<li>${escP(x)}</li>`).join('')   : '';
  const dontHtml = Array.isArray(e.doYDont?.dont)  ? e.doYDont.dont.map(x => `<li>${escP(x)}</li>`).join('') : '';

  const semanasHtml = Array.isArray(e.enfoquesSemana)
    ? `<table class="sem-table"><thead><tr><th>Semana</th><th>Enfoque</th></tr></thead><tbody>` +
      e.enfoquesSemana.map(s => `<tr><td>${escP(s.semana)}</td><td>${escP(s.enfoque)}</td></tr>`).join('') +
      `</tbody></table>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Resumen Ejecutivo — ${escP(clientName)} · ${escP(month.mes)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;max-width:860px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.65;font-size:14px}
  h1{color:#b8860b;border-bottom:3px solid #b8860b;padding-bottom:10px;margin-bottom:20px;font-size:1.6rem}
  h2{color:#0f2847;margin:32px 0 12px;border-left:4px solid #b8860b;padding-left:12px;font-size:1.05rem}
  .meta{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .meta-item{background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 16px;min-width:120px}
  .meta-label{font-size:.65rem;font-weight:700;text-transform:uppercase;color:#92400e;display:block;letter-spacing:.06em}
  .meta-value{font-weight:700;color:#0f2847;font-size:.92rem}
  .angulo{background:#fffbeb;border:2px solid #b8860b;border-radius:10px;padding:20px;margin:12px 0;font-size:1.02rem;font-style:italic;color:#1c1917}
  .mensaje{background:#f0f9ff;border-left:4px solid #0ea5e9;padding:14px 18px;border-radius:0 8px 8px 0;margin:12px 0;font-size:.95rem}
  ul{padding-left:20px;margin:8px 0}
  li{margin:5px 0;color:#374151}
  .pct{background:#fde68a;border-radius:20px;padding:1px 8px;font-size:.72rem;color:#92400e;font-weight:700;margin-left:4px}
  .do-dont{display:flex;gap:32px;flex-wrap:wrap;margin:8px 0}
  .do-dont>div{flex:1;min-width:200px}
  .do-label{font-weight:700;margin-bottom:6px}
  .hashtags{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;font-size:.82rem;color:#15803d;word-break:break-word;line-height:2}
  .sem-table{width:100%;border-collapse:collapse;font-size:.84rem;margin:8px 0}
  .sem-table th{background:#fef3c7;color:#92400e;padding:7px 12px;text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.06em}
  .sem-table td{padding:7px 12px;border-bottom:1px solid #fde68a;vertical-align:top}
  .footer{margin-top:48px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:.75rem;color:#9ca3af;text-align:center}
  @media print{body{margin:16px;max-width:100%}h2{break-after:avoid}}
</style>
</head>
<body>
  <h1>Resumen Ejecutivo de Campaña</h1>

  <div class="meta">
    <div class="meta-item"><span class="meta-label">Cliente</span><span class="meta-value">${escP(clientName)}</span></div>
    <div class="meta-item"><span class="meta-label">Mes</span><span class="meta-value">${escP(month.mes)}</span></div>
    <div class="meta-item"><span class="meta-label">Servicio estrella</span><span class="meta-value">${escP(month.servicio)}</span></div>
    <div class="meta-item"><span class="meta-label">Paquete</span><span class="meta-value">${escP(pkg.charAt(0).toUpperCase() + pkg.slice(1))}</span></div>
    ${month.promocion ? `<div class="meta-item"><span class="meta-label">Promoción</span><span class="meta-value">${escP(month.promocion)}</span></div>` : ''}
  </div>

  <h2>Ángulo Narrativo de la Campaña</h2>
  <div class="angulo">"${escP(e.anguloNarrativo || m.anguloCampana || '—')}"</div>

  ${e.mensajeClave ? `<h2>Mensaje Clave</h2><div class="mensaje">${escP(e.mensajeClave)}</div>` : ''}
  ${m.propuestaValor ? `<h2>Propuesta de Valor</h2><p>${escP(m.propuestaValor)}</p>` : ''}
  ${e.emocionPrincipal || m.emocionPrincipal ? `<h2>Emoción Principal</h2><p>${escP(e.emocionPrincipal || m.emocionPrincipal)}</p>` : ''}
  ${e.tono ? `<h2>Tono de Comunicación</h2><p>${escP(e.tono)}</p>` : ''}

  ${pilaresHtml ? `<h2>Pilares de Contenido</h2><ul>${pilaresHtml}</ul>` : ''}
  ${semanasHtml ? `<h2>Enfoque por Semana</h2>${semanasHtml}` : ''}

  ${m.palabrasClave?.length ? `<h2>Temas Usados</h2><p>${escP(m.palabrasClave.join(' · '))}</p>` : ''}

  ${doHtml || dontHtml ? `
  <h2>Do &amp; Don't de Comunicación</h2>
  <div class="do-dont">
    ${doHtml   ? `<div><div class="do-label" style="color:#16a34a">✓ Hacer</div><ul>${doHtml}</ul></div>`   : ''}
    ${dontHtml ? `<div><div class="do-label" style="color:#dc2626">✗ Evitar</div><ul>${dontHtml}</ul></div>` : ''}
  </div>` : ''}

  ${hashtags ? `<h2>Hashtags de la Campaña</h2><div class="hashtags">${escP(hashtags)}</div>` : ''}

  <div class="footer">Generado por Motor Synkro &nbsp;·&nbsp; ${escP(new Date().toLocaleDateString('es-ES', { dateStyle: 'long' }))}</div>
</body>
</html>`;

  triggerDownload(
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    `resumen-${slugify(clientName)}-${slugify(month.mes)}.html`
  );
}

// ── Entregables con IA ────────────────────────────────────────────────────

async function callClaudeForHTML(prompt) {
  const key = localStorage.getItem('synkro_api_key') || '';
  if (!key) { showToast('Agrega tu API Key primero', 'error'); return null; }
  showToast('Generando con IA… puede tardar unos segundos', 'info');
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const d = await res.json();
    if (d.error) { showToast('Error API: ' + d.error.message, 'error'); return null; }
    let rawText = d.content?.[0]?.text || '';
    rawText = rawText.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    return rawText || null;
  } catch(e) { showToast('Error de red: ' + e.message, 'error'); return null; }
}

function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getClientNameSlug() {
  const name = (clientData && (
    clientData.identidad?.nombre_comercial ||
    clientData.identidad?.nombre ||
    clientData.nombre
  )) || 'cliente';
  return slugify(name);
}

async function generarADNVisual(data) {
  const client  = clientData || {};
  const id      = client.identidad || {};
  const clientNameDisplay = id.nombre_comercial || id.nombre || data.clientName || 'Cliente';
  const marca   = client.marca     || {};
  const negocio = client.negocio   || {};
  const posts   = data.posts       || {};
  const igSample = (posts.instagram || []).slice(0, 6).map((p,i) =>
    `Post ${i+1}: ${p.caption || p.post || ''}`).join('\n');

  const prompt = `Eres el director creativo de SYNKRO agencia digital. Genera un documento HTML completo y autocontenido (sin dependencias externas, sin CDN) que sea la Guía ADN Visual para el cliente "${clientNameDisplay}".

DATOS DEL CLIENTE:
- Giro: ${id.giro || ''} — ${id.descripcion || ''}
- Tono de marca: ${marca.tono || ''}
- Color principal: ${marca.color_principal || ''}
- Color secundario: ${marca.color_secundario || ''}
- Referencias de marca: ${marca.referencias || ''}
- Servicio estrella: ${negocio.servicio_estrella || ''}
- Cliente ideal: ${negocio.cliente_ideal || ''}
- Diferenciador: ${negocio.diferenciador || ''}

EJEMPLOS DE COPY APROBADO:
${igSample}

ESTRUCTURA DEL DOCUMENTO HTML:
El documento debe tener 5 tabs navegables con CSS puro (input radio):
1. DIAGNÓSTICO — análisis de presencia digital actual, oportunidades, posicionamiento sugerido
2. IDENTIDAD VISUAL — paleta de colores con hex codes derivados del brief, tipografías sugeridas, 4 estéticas visuales con descripción
3. ESTRUCTURA DE COPY — fórmula de copy por red (IG, FB, TK) con ejemplos reales del cliente
4. REGLAS OPERATIVAS — 8 reglas no negociables numeradas, Do's and Don'ts específicos del cliente
5. SISTEMA DE PLANTILLAS — tamaños (1080x1080, 1080x1920), estructura visual, jerarquía tipográfica

DISEÑO: fondo #0f2847, acento #0d6e63, dorado #b8860b, fuente system-ui, tabs CSS puro (input radio), responsivo, botón imprimir al final, header con texto SYNKRO.
RESTRICCIÓN CRÍTICA DE COMPATIBILIDAD:
- Los tabs/pestañas DEBEN funcionar con CSS puro usando input[type=radio] ocultos y labels — SIN JavaScript para navegación entre tabs
- Todo el JavaScript debe ser inline en atributos onclick cuando sea necesario (botones copiar)
- El HTML debe funcionar correctamente al abrirse desde disco local (file://) sin servidor
- No uses addEventListener ni DOMContentLoaded — usa onclick="..." directamente en los elementos

Genera SOLO el HTML completo sin explicaciones. Empieza con <!DOCTYPE html>`;

  const html = await callClaudeForHTML(prompt);
  if (html) downloadHTML(html, `ADN-Visual-${getClientNameSlug()}-${getMonthData().mes}.html`);
}

async function generarBriefMaterial(data) {
  const client  = clientData || {};
  const id      = client.identidad || {};
  const clientNameDisplay = id.nombre_comercial || id.nombre || data.clientName || 'Cliente';
  const negocio = client.negocio   || {};
  const posts   = data.posts       || {};
  const igPosts = (posts.instagram || []).map((p,i) =>
    `Post ${i+1}: ${p.caption || p.post || ''}`).join('\n');

  const prompt = `Eres el director de producción de SYNKRO agencia digital. Genera un documento HTML completo y autocontenido (sin dependencias externas) que sea el Brief de Material para el cliente "${clientNameDisplay}".

DATOS DEL CLIENTE:
- Giro: ${id.giro || ''} — ${id.descripcion || ''}
- Servicio estrella: ${negocio.servicio_estrella || ''}
- Precio promedio: ${negocio.precio_promedio || ''}
- Ciudad: ${id.ciudad || ''}

POSTS DE INSTAGRAM A PRODUCIR (${(posts.instagram||[]).length} posts):
${igPosts}

ESTRUCTURA DEL DOCUMENTO HTML — 3 tabs navegables:
1. DIAGNÓSTICO DE POSTS — tabla por post: número, copy resumido, estado (✓ Listo / ⚙ Editar / ◑ Canva / ✗ Nuevo), tratamiento recomendado, nota de producción
2. SESIÓN FOTOGRÁFICA — tomas necesarias agrupadas por categoría, especificaciones técnicas (iPhone 4K, fondos, iluminación, ángulos)
3. CHECKLIST DE PRODUCCIÓN — checklist marcable interactivo en 3 fases: Antes de producir (10 items), Producción en Canva (8 items), Entrega al cliente (5 items)

DISEÑO: fondo #0f2847, teal #0d6e63, dorado #b8860b, fuente system-ui, tabs CSS puro (input radio), checkboxes funcionales, contador de progreso, botón imprimir.
RESTRICCIÓN CRÍTICA DE COMPATIBILIDAD:
- Los tabs/pestañas DEBEN funcionar con CSS puro usando input[type=radio] ocultos y labels — SIN JavaScript para navegación entre tabs
- Todo el JavaScript debe ser inline en atributos onclick cuando sea necesario (botones copiar)
- El HTML debe funcionar correctamente al abrirse desde disco local (file://) sin servidor
- No uses addEventListener ni DOMContentLoaded — usa onclick="..." directamente en los elementos

Genera SOLO el HTML completo. Empieza con <!DOCTYPE html>`;

  const html = await callClaudeForHTML(prompt);
  if (html) downloadHTML(html, `Brief-Material-${getClientNameSlug()}-${getMonthData().mes}.html`);
}

async function generarPromptsIA(data) {
  const client  = clientData || {};
  const id      = client.identidad || {};
  const marca   = client.marca     || {};
  const posts   = data.posts       || {};
  const igPosts = (posts.instagram || []).map((p,i) =>
    `Post ${i+1}: ${p.caption || p.post || ''}`).join('\n');
  const tkPosts = (posts.tiktok || []).map((p,i) =>
    `TK ${i+1}: ${p.caption || p.post || ''}`).join('\n');

  const prompt = `Eres el director creativo de SYNKRO. Genera un documento HTML completo y autocontenido (sin dependencias externas) con los Prompts de IA para el cliente "${id.nombre_comercial || 'Cliente'}".

DATOS DEL CLIENTE:
- Giro: ${id.giro || ''} — ${id.descripcion || ''}
- Tono: ${marca.tono || ''}
- Color principal: ${marca.color_principal || ''}
- Ciudad: ${id.ciudad || ''}

POSTS DE INSTAGRAM (${(posts.instagram||[]).length}):
${igPosts}

POSTS DE TIKTOK (${(posts.tiktok||[]).length}):
${tkPosts}

ESTRUCTURA: layout dos columnas, sidebar izquierdo con lista de posts, contenido derecho con fichas.
Por cada post de Instagram: número y copy (header), instrucción de producción, prompt Imagen 3 en inglés (80-120 palabras, sin texto en imagen, colores de marca, botón Copiar funcional), instrucción animación Canva, copy aprobado de referencia.
Al final: sección TikTok con todos los captions en cards con botón copiar.
Perfil de personaje: queretano/a 35-50 años, NSE medio-alto, casual-premium, expresión natural.

DISEÑO: fondo #0f2847, teal #0d6e63, dorado #b8860b, sidebar sticky, fuente system-ui, botones copiar con feedback visual, botón imprimir.
RESTRICCIÓN CRÍTICA DE COMPATIBILIDAD:
- Los tabs/pestañas DEBEN funcionar con CSS puro usando input[type=radio] ocultos y labels — SIN JavaScript para navegación entre tabs
- Todo el JavaScript debe ser inline en atributos onclick cuando sea necesario (botones copiar)
- El HTML debe funcionar correctamente al abrirse desde disco local (file://) sin servidor
- No uses addEventListener ni DOMContentLoaded — usa onclick="..." directamente en los elementos

Genera SOLO el HTML completo. Empieza con <!DOCTYPE html>`;

  const html = await callClaudeForHTML(prompt);
  if (html) downloadHTML(html, `Prompts-IA-${getClientNameSlug()}-${getMonthData().mes}.html`);
}

async function generarCalendarioVisualHTML(data) {
  const client = clientData || {};
  const id     = client.identidad || {};
  const cal    = data.calendarioPublicacion;
  if (!cal) { showToast('No hay datos de calendario en esta campaña', 'error'); return; }

  const prompt = `Eres el director de operaciones de SYNKRO. Genera un documento HTML completo y autocontenido (sin dependencias externas) con el Calendario Visual para el cliente "${id.nombre_comercial || 'Cliente'}".

DATOS DEL CALENDARIO (JSON):
${JSON.stringify(cal, null, 2).substring(0, 3000)}

ESTRUCTURA: header con cliente/mes/total posts, posts por semana como tarjetas (día, fecha, horario, badge de red con colores: IG morado, FB azul, TK rojo/negro, descripción, badge de promo si aplica), semana con más posts marcada como Semana Clave, leyenda de promos, notas estratégicas al final, botón imprimir.

DISEÑO: fondo #0f2847, teal #0d6e63, dorado #b8860b, fuente system-ui, hover en tarjetas, responsivo.
RESTRICCIÓN CRÍTICA DE COMPATIBILIDAD:
- Los tabs/pestañas DEBEN funcionar con CSS puro usando input[type=radio] ocultos y labels — SIN JavaScript para navegación entre tabs
- Todo el JavaScript debe ser inline en atributos onclick cuando sea necesario (botones copiar)
- El HTML debe funcionar correctamente al abrirse desde disco local (file://) sin servidor
- No uses addEventListener ni DOMContentLoaded — usa onclick="..." directamente en los elementos

Genera SOLO el HTML completo. Empieza con <!DOCTYPE html>`;

  const html = await callClaudeForHTML(prompt);
  if (html) downloadHTML(html, `Calendario-Visual-${getClientNameSlug()}-${getMonthData().mes}.html`);
}

async function generarProduccionHTML(codeOverride) {
  const code = codeOverride || currentCampaignCode;
  if (!code) { showToast('No hay campaña activa', 'error'); return; }
  showToast('Leyendo posts aprobados de Firebase…', 'info');
  try {
    const snap = await db.ref('campaigns/' + code).once('value');
    const d    = snap.val();
    if (!d || !d.posts) { showToast('No se encontró la campaña', 'error'); return; }
    const clientName = (clientData?.identidad?.nombre_comercial) || d.clientName || 'Cliente';
    const mes        = d.mes || '';
    const igPosts    = d.posts.instagram || [];
    const fbPosts    = d.posts.facebook  || [];
    const tkPosts    = d.posts.tiktok    || [];

    const igRows = igPosts.map((p,i) => `<tr><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);color:#aaa;font-size:.8rem">${i+1}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08)">${escHtml(p.post||p.caption||'')}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);font-size:.75rem;color:#aaa">${escHtml((p.hashtags||'').split(' ').slice(0,5).join(' '))}</td></tr>`).join('');
    const fbRows = fbPosts.map((p,i) => `<tr><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);color:#aaa;font-size:.8rem">${i+1}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08)">${escHtml(p.post||p.caption||'')}</td></tr>`).join('');
    const tkRows = tkPosts.map((p,i) => `<tr><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);color:#aaa;font-size:.8rem">${i+1}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08)">${escHtml(p.post||p.caption||'')}</td><td style="padding:8px;border-bottom:1px solid rgba(255,255,255,.08);font-size:.75rem;color:#aaa">${escHtml((p.hashtags||'').split(' ').slice(0,4).join(' '))}</td></tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Producción — ${escHtml(clientName)} · ${escHtml(mes)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;background:#0f2847;color:#e8eaf6;min-height:100vh}.hdr{background:linear-gradient(135deg,#0d6e63,#0f2847);padding:32px 40px;border-bottom:2px solid #b8860b}.hdr h1{font-size:1.6rem;color:#f0c040;font-weight:700}.hdr p{font-size:.9rem;color:rgba(255,255,255,.6);margin-top:4px}.tabs{display:flex;gap:4px;padding:16px 40px 0;background:#0a1f38;border-bottom:1px solid rgba(255,255,255,.1)}.tab{padding:10px 18px;border:none;background:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:.85rem;border-bottom:2px solid transparent;transition:all .2s}.tab.active{color:#f0c040;border-bottom-color:#b8860b}.content{padding:32px 40px;display:none}.content.active{display:block}table{width:100%;border-collapse:collapse;font-size:.85rem}th{text-align:left;padding:10px 8px;color:#f0c040;border-bottom:1px solid #b8860b;font-size:.75rem;text-transform:uppercase}.print-btn{position:fixed;bottom:24px;right:24px;background:#b8860b;color:#fff;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:700;font-size:.85rem}@media print{.print-btn,.tabs{display:none}.content{display:block!important;page-break-after:always}}</style>
</head><body>
<div class="hdr"><h1>📋 Documento de Producción</h1><p>${escHtml(clientName)} · ${escHtml(mes)} · Código: ${escHtml(code)}</p></div>
<div class="tabs">
  <button class="tab active" onclick="showTab('ig',this)">📷 Instagram (${igPosts.length})</button>
  <button class="tab" onclick="showTab('fb',this)">📘 Facebook (${fbPosts.length})</button>
  <button class="tab" onclick="showTab('tk',this)">🎵 TikTok (${tkPosts.length})</button>
</div>
<div class="content active" id="tab-ig"><table><thead><tr><th>#</th><th>Copy aprobado</th><th>Hashtags</th></tr></thead><tbody>${igRows}</tbody></table></div>
<div class="content" id="tab-fb"><table><thead><tr><th>#</th><th>Copy aprobado</th></tr></thead><tbody>${fbRows}</tbody></table></div>
<div class="content" id="tab-tk"><table><thead><tr><th>#</th><th>Caption TikTok</th><th>Hashtags</th></tr></thead><tbody>${tkRows}</tbody></table></div>
<button class="print-btn" onclick="window.print()">🖨 Imprimir / PDF</button>
<script>function showTab(id,btn){document.querySelectorAll('.content').forEach(c=>c.classList.remove('active'));document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById('tab-'+id).classList.add('active');btn.classList.add('active');}</script>
</body></html>`;

    downloadHTML(html, `Produccion-${getClientNameSlug()}-${mes}.html`);
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

function generarResumenEjecutivoHTML(data) {
  downloadResumenHtml(data);
}


// ── JSON download helper ───────────────────────────────────────────────────

function downloadJson(obj, label) {
  const month      = getMonthData();
  const clientName = (clientData && (
    clientData.nombre || clientData.identidad?.nombre || clientData.negocio?.nombre || clientData.name
  )) || 'cliente';
  triggerDownload(
    new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' }),
    `${label}-${slugify(clientName)}-${slugify(month.mes)}.json`
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── Firebase historial del cliente ────────────────────────────────────────

function saveHistorialFirebase(data) {
  const month = getMonthData();
  const m     = data.maestro           || {};
  const e     = data.estrategiaCampana || {};

  const clientName = (clientData && (
    clientData.identidad?.nombre_comercial || clientData.identidad?.nombre ||
    clientData.negocio?.nombre || clientData.nombre || clientData.name
  )) || 'cliente';

  const clienteSlug = slugify(clientName);
  const mesSlug     = slugify(month.mes) + '-' + new Date().getFullYear();

  const entrada = {
    mes:              month.mes,
    año:              new Date().getFullYear(),
    servicio:         month.servicio  || '',
    promocion:        month.promocion || '',
    fecha:            month.fecha     || '',
    objecion:         month.objecion  || '',
    pregunta:         month.pregunta  || '',
    nota:             month.nota      || '',
    anguloNarrativo:  e.anguloNarrativo  || m.anguloCampana   || '',
    mensajeClave:     e.mensajeClave     || '',
    emocionPrincipal: e.emocionPrincipal || m.emocionPrincipal || '',
    tono:             e.tono             || m.tonoVoz          || '',
    temasUsados:      m.palabrasClave    || [],
    pilaresContenido: (e.pilaresDeContenido || []).map(p => p.pilar).filter(Boolean),
    hashtags:         m.hashtags         || {},
    paquete:          data._package      || 'starter',
    guardadoEn:       Date.now(),
  };

  db.ref(`clientes/${clienteSlug}/historial/${mesSlug}`)
    .set(entrada)
    .then(() => console.log(`[Synkro] Historial → clientes/${clienteSlug}/historial/${mesSlug}`))
    .catch(err => console.warn('[Synkro] Historial Firebase error:', err.message));
}

// ── String helpers ────────────────────────────────────────────────────────

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escP(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Card Builders ──────────────────────────────────────────────────────────

function makeCard(barColor, iconBg, iconText, title, bodyHtml, getCopyText) {
  const div = document.createElement('div');
  div.className = 'platform-card';
  div.innerHTML = `
    <div class="platform-bar" style="background:${barColor}"></div>
    <div class="platform-header">
      <div class="platform-icon" style="background:${iconBg};color:#fff">${escHtml(iconText)}</div>
      <span class="platform-name">${escHtml(title)}</span>
      ${getCopyText ? '<button class="btn-copy-hdr synkro-copy">Copiar</button>' : ''}
    </div>
    <div class="platform-body">${bodyHtml}</div>
  `;
  if (getCopyText) {
    div.querySelector('.synkro-copy').addEventListener('click', function () {
      const text = typeof getCopyText === 'function' ? getCopyText() : getCopyText;
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
      this.textContent = '✓ Copiado';
      this.classList.add('copied');
      setTimeout(() => { this.textContent = 'Copiar'; this.classList.remove('copied'); }, 2000);
    });
  }
  return div;
}

function block(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<div class="content-block">
    <span class="content-label">${escHtml(label)}</span>
    <div class="content-text">${escHtml(String(value))}</div>
  </div>`;
}

function blockHashtags(label, value) {
  if (!value) return '';
  return `<div class="content-block">
    <span class="content-label">${escHtml(label)}</span>
    <div class="content-text hashtag-text">${escHtml(String(value))}</div>
  </div>`;
}

// Brief Maestro
function buildMaestroCard(m) {
  const hashStr = m.hashtags
    ? [...(m.hashtags.marca || []), ...(m.hashtags.nicho || []), ...(m.hashtags.trending || [])].join(' ')
    : '';

  const body = `
    ${block('Negocio', m.negocio)}
    ${block('Propuesta de Valor', m.propuestaValor)}
    ${block('Audiencia Objetivo', m.audienciaObjetivo)}
    ${block('Tono de Voz', m.tonoVoz)}
    ${block('Ángulo de Campaña', m.anguloCampana)}
    ${block('CTA Principal', m.ctaPrincipal)}
    ${block('Emoción Principal', m.emocionPrincipal)}
    ${m.palabrasClave ? block('Palabras Clave', m.palabrasClave.join(' · ')) : ''}
    ${m.objecionRespuesta ? block('Respuesta a Objeción', m.objecionRespuesta) : ''}
    ${m.preguntaRespuesta ? block('Respuesta a Pregunta FAQ', m.preguntaRespuesta) : ''}
    ${blockHashtags('Hashtags de Marca + Nicho', hashStr)}
  `;

  return makeCard(
    'linear-gradient(90deg, var(--gold), var(--teal))',
    'linear-gradient(135deg, var(--gold), var(--gold-l))',
    '★',
    'Brief Maestro',
    body,
    () => Object.entries(m)
           .filter(([,v]) => typeof v === 'string')
           .map(([k,v]) => `${k}:\n${v}`)
           .join('\n\n')
  );
}

// Posts (full-width tabbed section)
function buildPostsSection(posts, pkg) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column: 1/-1;';

  const tabs = ['instagram', 'facebook', 'tiktok'];
  const tabMeta = {
    instagram: { label: 'Instagram', icon: 'IG', bar: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)' },
    facebook:  { label: 'Facebook',  icon: 'FB', bar: '#1877f2' },
    tiktok:    { label: 'TikTok',    icon: 'TK', bar: 'linear-gradient(135deg,#010101,#ff0050)' },
  };

  const count = (posts[tabs[0]] || []).length;

  wrapper.innerHTML = `
    <div class="section-title" style="margin-bottom:16px">
      Posts Generados — ${count} por red · 3 versiones por formato
    </div>
    <div id="postTabs" style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap"></div>
    <div id="postPanels" style="display:flex;flex-direction:column;gap:12px"></div>
  `;

  const tabsEl   = wrapper.querySelector('#postTabs');
  const panelsEl = wrapper.querySelector('#postPanels');
  let activeTab  = tabs[0];

  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${tabMeta[tab].icon} ${tabMeta[tab].label}`;
    btn.style.cssText = `
      padding:8px 20px;border-radius:20px;cursor:pointer;
      font-size:.82rem;font-weight:700;transition:all .2s;
      background:${i === 0 ? tabMeta[tab].bar : 'var(--surface)'};
      color:${i === 0 ? '#fff' : 'var(--text-s)'};
      border:1px solid ${i === 0 ? 'transparent' : 'var(--border-t)'};
    `;
    btn.addEventListener('click', () => {
      activeTab = tab;
      tabsEl.querySelectorAll('button').forEach((b, j) => {
        const t = tabs[j];
        const on = t === tab;
        b.style.background = on ? tabMeta[t].bar : 'var(--surface)';
        b.style.color      = on ? '#fff' : 'var(--text-s)';
        b.style.border     = on ? '1px solid transparent' : '1px solid var(--border-t)';
      });
      renderTab(tab);
    });
    tabsEl.appendChild(btn);
  });

  function renderTab(tab) {
    panelsEl.innerHTML = '';
    const items = posts[tab] || [];
    const meta  = tabMeta[tab];

    items.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'platform-card';

      let bodyHtml = `<div class="content-block">
        <span class="content-label">${meta.label} · Post ${i + 1} de ${items.length}</span>
      </div>`;

      let copyText = '';
      if (tab === 'instagram') {
        bodyHtml += block('Caption', item.caption);
        bodyHtml += blockHashtags('Hashtags (15-20)', item.hashtags);
        copyText = [item.caption, item.hashtags].filter(Boolean).join('\n\n');
      } else if (tab === 'facebook') {
        bodyHtml += block('Post', item.post);
        copyText = item.post || '';
      } else if (tab === 'tiktok') {
        bodyHtml += block('Caption', item.caption);
        bodyHtml += blockHashtags('Hashtags Trending', item.hashtags);
        copyText = [item.caption, item.hashtags].filter(Boolean).join('\n\n');
      }

      card.innerHTML = `
        <div class="platform-bar" style="background:${meta.bar}"></div>
        <div class="platform-header">
          <span class="platform-name" style="font-size:.82rem;color:var(--text-s)">
            ${escHtml(meta.label)} · Post ${i + 1}/${items.length}
          </span>
          <button class="btn-copy-hdr synkro-copy">Copiar</button>
        </div>
        <div class="platform-body">${bodyHtml}</div>
      `;

      const finalCopy = copyText;
      card.querySelector('.synkro-copy').addEventListener('click', function () {
        navigator.clipboard.writeText(finalCopy).catch(() => fallbackCopy(finalCopy));
        this.textContent = '✓ Copiado';
        this.classList.add('copied');
        setTimeout(() => { this.textContent = 'Copiar'; this.classList.remove('copied'); }, 2000);
      });

      panelsEl.appendChild(card);
    });
  }

  renderTab(activeTab);
  return wrapper;
}

// Reel generic card
function buildReelCard(title, subtitle, reel, colorKey) {
  const palette = {
    ig: { bar: 'linear-gradient(90deg,#833ab4,#fd1d1d)',                   bg: 'linear-gradient(135deg,#833ab4,#fd1d1d)' },
    em: { bar: 'linear-gradient(90deg,var(--teal),var(--teal-l))',         bg: 'linear-gradient(135deg,var(--teal),var(--teal-l))' },
    wa: { bar: '#25d366',                                                   bg: '#25d366' },
    li: { bar: '#0077b5',                                                   bg: '#0077b5' },
  };
  const c = palette[colorKey] || palette.ig;

  let bodyHtml = '';
  bodyHtml += block('Título', reel.titulo);
  bodyHtml += block('Hook (0-3s)', reel.hook);
  if (reel.emocionObjetivo) bodyHtml += block('Emoción Objetivo', reel.emocionObjetivo);
  if (reel.mensajeClave)    bodyHtml += block('Mensaje Clave', reel.mensajeClave);

  if (Array.isArray(reel.estructura)) {
    const guion = reel.estructura
      .map(e => `[${e.segundo}s]\nVisual: ${e.visual}\nAudio: ${e.audio}`)
      .join('\n\n');
    bodyHtml += block('Guión Completo', guion);
  }

  bodyHtml += block('CTA Final', reel.cta);
  bodyHtml += block('Caption', reel.caption);
  bodyHtml += blockHashtags('Hashtags', reel.hashtags);
  bodyHtml += block('Música Sugerida', reel.musicaSugerida);

  if (Array.isArray(reel.textoEnPantalla)) bodyHtml += block('Textos en Pantalla', reel.textoEnPantalla.join('\n'));
  if (Array.isArray(reel.preguntasGuia))   bodyHtml += block('Preguntas Guía para el Cliente', reel.preguntasGuia.join('\n'));
  if (Array.isArray(reel.pasos))           bodyHtml += block('Pasos del Proceso', reel.pasos.join('\n'));

  return makeCard(
    c.bar, c.bg, '▶',
    `${title} — ${subtitle}`,
    bodyHtml,
    () => [reel.titulo, reel.hook, reel.cta, reel.caption, reel.hashtags].filter(Boolean).join('\n\n')
  );
}

// Bot WhatsApp card
function buildBotCard(bot) {
  let bodyHtml = '';
  bodyHtml += block('Bienvenida Automática', bot.bienvenida);

  if (bot.menu) {
    bodyHtml += block('Menú Principal', bot.menu.texto);
    if (Array.isArray(bot.menu.opciones)) {
      const menuText = bot.menu.opciones
        .map(o => `${o.numero}. ${o.opcion}\n→ ${o.respuesta}`)
        .join('\n\n');
      bodyHtml += block('Opciones', menuText);
    }
  }

  if (Array.isArray(bot.respuestasRapidas)) {
    const rr = bot.respuestasRapidas
      .map(r => `Trigger: "${r.trigger}"\n${r.respuesta}`)
      .join('\n\n');
    bodyHtml += block('Respuestas Rápidas', rr);
  }

  if (Array.isArray(bot.followUp)) {
    const fu = bot.followUp
      .map(f => `${f.tiempo}:\n${f.mensaje}`)
      .join('\n\n');
    bodyHtml += block('Secuencia Follow-Up', fu);
  }

  if (bot.broadcast) {
    bodyHtml += block('Broadcast del Mes', bot.broadcast.mensaje);
    bodyHtml += block('Frecuencia Sugerida', bot.broadcast.frecuencia);
  }

  return makeCard(
    '#25d366', '#25d366', 'WA',
    'Bot WhatsApp — Automatización',
    bodyHtml,
    () => [bot.bienvenida, bot.menu?.texto, bot.broadcast?.mensaje].filter(Boolean).join('\n\n')
  );
}

// Pauta Meta card
function buildPautaCard(pauta) {
  let bodyHtml = '';
  bodyHtml += block('Objetivo de Campaña', pauta.objetivo);

  if (pauta.presupuestoSugerido) {
    const p = pauta.presupuestoSugerido;
    bodyHtml += block('Presupuesto', `Mínimo: $${p.minimo}/día · Recomendado: $${p.recomendado}/día\n${p.distribucion}`);
  }

  if (Array.isArray(pauta.audiencias)) {
    const audText = pauta.audiencias
      .map(a => `${a.nombre} [${a.tipo}]\n${a.configuracion}`)
      .join('\n\n');
    bodyHtml += block('Audiencias', audText);
  }

  if (Array.isArray(pauta.creativos)) {
    const creText = pauta.creativos
      .map(c => `[${c.formato}] ${c.titulo}\n${c.descripcion}\nCTA: ${c.cta} → ${c.audienciaTarget}`)
      .join('\n\n');
    bodyHtml += block('Creativos', creText);
  }

  if (Array.isArray(pauta.calendario)) {
    const cal = pauta.calendario.map(s => `${s.semana}: ${s.enfoque}`).join('\n');
    bodyHtml += block('Calendario Semanal', cal);
  }

  if (pauta.metricas) {
    bodyHtml += block('KPI Principal', pauta.metricas.kpiPrincipal);
    bodyHtml += block('Benchmarks', pauta.metricas.benchmarks);
    bodyHtml += block('Cuándo Escalar', pauta.metricas.escalar);
    bodyHtml += block('Cuándo Pausar', pauta.metricas.pausar);
  }

  return makeCard(
    'linear-gradient(90deg,#1877f2,#833ab4)',
    'linear-gradient(135deg,#1877f2,#833ab4)',
    'M',
    'Pauta Meta Ads — Estrategia',
    bodyHtml,
    () => JSON.stringify(pauta, null, 2)
  );
}

// Google Business card
function buildGoogleCard(gb) {
  let bodyHtml = '';
  bodyHtml += block('Descripción SEO del Perfil', gb.descripcionSeo);
  if (Array.isArray(gb.categorias))         bodyHtml += block('Categorías GBP', gb.categorias.join(' · '));
  if (Array.isArray(gb.atributosSugeridos)) bodyHtml += block('Atributos a Activar', gb.atributosSugeridos.join('\n'));

  if (Array.isArray(gb.publicaciones)) {
    const pubText = gb.publicaciones
      .map((p, i) => `Post ${i + 1} [${p.tipo}] — ${p.fechaSugerida}\n${p.titulo}\n${p.texto}\nCTA: ${p.cta}`)
      .join('\n\n---\n\n');
    bodyHtml += block('Publicaciones del Mes', pubText);
  }

  if (gb.respuestasResenas) {
    bodyHtml += block('Respuesta a Reseña 5★', gb.respuestasResenas.positiva5);
    bodyHtml += block('Respuesta a Reseña Negativa', gb.respuestasResenas.negativa);
  }

  if (Array.isArray(gb.preguntasRespuestas)) {
    const qa = gb.preguntasRespuestas
      .map(q => `Q: ${q.pregunta}\nA: ${q.respuesta}`)
      .join('\n\n');
    bodyHtml += block('Q&A del Perfil', qa);
  }

  if (Array.isArray(gb.fotosSugeridas)) bodyHtml += block('Fotos a Subir', gb.fotosSugeridas.join('\n'));

  return makeCard(
    'linear-gradient(90deg,#4285f4,#34a853,#fbbc05,#ea4335)',
    'linear-gradient(135deg,#4285f4,#34a853)',
    'G',
    'Google Business Profile',
    bodyHtml,
    () => JSON.stringify(gb, null, 2)
  );
}

// Estrategia de Campaña card
function buildEstrategiaCard(e) {
  let bodyHtml = '';
  bodyHtml += block('Ángulo Narrativo', e.anguloNarrativo);
  bodyHtml += block('Mensaje Clave', e.mensajeClave);
  bodyHtml += block('Emoción Principal', e.emocionPrincipal);
  bodyHtml += block('Propuesta de Valor', e.propuestaValor);
  bodyHtml += block('Tono de Comunicación', e.tono);

  if (Array.isArray(e.pilaresDeContenido)) {
    const pilares = e.pilaresDeContenido
      .map(p => `${p.pilar} (${p.porcentaje})\n${p.descripcion}`)
      .join('\n\n');
    bodyHtml += block('Pilares de Contenido', pilares);
  }

  if (Array.isArray(e.enfoquesSemana)) {
    const semanas = e.enfoquesSemana
      .map(s => `${s.semana}: ${s.enfoque}`)
      .join('\n');
    bodyHtml += block('Enfoque por Semana', semanas);
  }

  if (e.doYDont) {
    if (Array.isArray(e.doYDont.do))   bodyHtml += block('✓ Sí Hacer', e.doYDont.do.map(d => `• ${d}`).join('\n'));
    if (Array.isArray(e.doYDont.dont)) bodyHtml += block('✗ No Hacer', e.doYDont.dont.map(d => `• ${d}`).join('\n'));
  }

  return makeCard(
    'linear-gradient(90deg, #7c3aed, var(--gold))',
    'linear-gradient(135deg, #7c3aed, #5b21b6)',
    '◈',
    'Estrategia de Campaña',
    bodyHtml,
    () => [e.anguloNarrativo, e.mensajeClave, e.propuestaValor, e.tono].filter(Boolean).join('\n\n')
  );
}

// Calendario de Publicación card (full-width)
function buildCalendarioCard(cal) {
  const netIcons  = { instagram: '📷 IG', facebook: '👥 FB', tiktok: '🎵 TK' };
  const netColors = { instagram: '#833ab4', facebook: '#1877f2', tiktok: '#e4001b' };

  let calHtml = '';
  if (Array.isArray(cal.semanas)) {
    cal.semanas.forEach(sem => {
      if (!Array.isArray(sem.publicaciones) || !sem.publicaciones.length) return;
      calHtml += `
        <div class="cal-week">
          <div class="cal-week-label">${escHtml(sem.semana)}<span class="cal-week-range"> · ${escHtml(sem.rango || '')}</span></div>
          <div class="cal-table-wrap">
            <table class="cal-table">
              <thead><tr><th>Día</th><th>Hora</th><th>Red</th><th>#</th><th>Contenido</th></tr></thead>
              <tbody>
                ${sem.publicaciones.map(p => `
                  <tr>
                    <td class="cal-day">${escHtml(p.dia || '')} ${escHtml(String(p.fecha || ''))}</td>
                    <td class="cal-time">${escHtml(p.hora || '')}</td>
                    <td><span class="cal-net-badge" style="background:${netColors[p.red] || '#555'}">${escHtml(netIcons[p.red] || p.red)}</span></td>
                    <td class="cal-num">${escHtml(String(p.numero || ''))}</td>
                    <td class="cal-desc">${escHtml(p.descripcion || '')}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
    });
  }

  let footerHtml = '';
  if (cal.mejoresHorarios) {
    const h = cal.mejoresHorarios;
    footerHtml += block('Mejores Horarios Personalizados', [
      h.instagram ? `📷 Instagram: ${h.instagram}` : '',
      h.facebook  ? `👥 Facebook: ${h.facebook}`   : '',
      h.tiktok    ? `🎵 TikTok: ${h.tiktok}`       : '',
    ].filter(Boolean).join('\n'));
  }
  if (cal.notas) footerHtml += block('Notas Estratégicas', cal.notas);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column: 1/-1;';
  wrapper.innerHTML = `
    <div class="platform-card" style="overflow:visible">
      <div class="platform-bar" style="background:linear-gradient(90deg,#7c3aed,#1877f2,#e4001b)"></div>
      <div class="platform-header">
        <div class="platform-icon" style="background:linear-gradient(135deg,#7c3aed,#1877f2);color:#fff;font-size:1rem">📅</div>
        <span class="platform-name">Calendario de Publicación</span>
        <button type="button" class="btn-copy-hdr synkro-cal-copy">Copiar JSON</button>
      </div>
      <div class="platform-body" style="gap:20px">
        ${calHtml}
        ${footerHtml}
      </div>
    </div>`;

  wrapper.querySelector('.synkro-cal-copy').addEventListener('click', function () {
    const text = JSON.stringify(cal, null, 2);
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    this.textContent = '✓ Copiado';
    this.classList.add('copied');
    setTimeout(() => { this.textContent = 'Copiar JSON'; this.classList.remove('copied'); }, 2000);
  });

  return wrapper;
}

// Ficha de Producción Visual card (full-width)
function buildFichaProduccionCard(ficha) {
  if (!ficha || !Array.isArray(ficha.piezas)) return document.createTextNode('');

  const rows = ficha.piezas.map(p => `
    <tr>
      <td class="fp-tipo">${escHtml(p.tipoPieza || '')}</td>
      <td>${escHtml(p.formato || '')}<br><span class="fp-size">${escHtml(p.tamano || '')}</span></td>
      <td>${escHtml(p.elementosVisuales || '')}</td>
      <td>${escHtml(p.templateRecomendado || '')}</td>
      <td>${escHtml(p.musicaRitmo || '')}</td>
      <td>${escHtml(p.accionCanva || '')}</td>
    </tr>`).join('');

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column: 1/-1;';
  wrapper.innerHTML = `
    <div class="platform-card" style="overflow:visible">
      <div class="platform-bar" style="background:linear-gradient(90deg,#7c3aed,#0ea5e9,#10b981)"></div>
      <div class="platform-header">
        <div class="platform-icon" style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);color:#fff;font-size:1rem">🎨</div>
        <span class="platform-name">Ficha de Producción Visual</span>
        <button type="button" class="btn-copy-hdr synkro-fp-copy">Copiar JSON</button>
      </div>
      <div class="platform-body" style="gap:0;padding:0 0 16px">
        <div class="fp-table-wrap">
          <table class="fp-table">
            <thead>
              <tr>
                <th>Tipo de Pieza</th>
                <th>Formato / Tamaño</th>
                <th>Elementos Visuales</th>
                <th>Template Canva</th>
                <th>Música / Ritmo</th>
                <th>Acción en Canva</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        ${ficha.notasGenerales ? `<div class="fp-notas">${escHtml(ficha.notasGenerales)}</div>` : ''}
      </div>
    </div>`;

  wrapper.querySelector('.synkro-fp-copy').addEventListener('click', function () {
    const text = JSON.stringify(ficha, null, 2);
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    this.textContent = '✓ Copiado';
    this.classList.add('copied');
    setTimeout(() => { this.textContent = 'Copiar JSON'; this.classList.remove('copied'); }, 2000);
  });

  return wrapper;
}

// ── Guía de Producción ─────────────────────────────────────────────────────
function buildGuiaProduccionCard(data) {
  const posts  = data.posts || {};
  const ig     = posts.instagram || [];
  const fb     = posts.facebook  || [];
  const tk     = posts.tiktok    || [];
  const cliente    = data._clientSlug || 'cliente';
  const mes        = data._mes        || 'mes';
  const storageKey = 'guia_' + cliente + '_' + mes;

  let saved = {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  const reel = data.reelEducativo;
  const bot  = data.botWhatsapp;

  let rows = '';
  let idx  = 0;

  function addRows(redNombre, redColor, items, tipo) {
    items.forEach(function (item, i) {
      const id      = 'chk_' + redNombre + '_' + i;
      const checked = saved[id] ? 'checked' : '';
      const copy    = item.caption || item.post || '';
      const copyShort = copy.length > 80 ? copy.substring(0, 80) + '...' : copy;
      rows +=
        '<tr class="guia-row' + (saved[id] ? ' guia-done' : '') + '" data-id="' + id + '">' +
          '<td style="text-align:center"><input type="checkbox" class="guia-chk" data-id="' + id + '" data-key="' + storageKey + '" ' + checked + '></td>' +
          '<td><span class="guia-badge" style="background:' + redColor + '">' + redNombre.toUpperCase() + '</span></td>' +
          '<td>' + tipo + '</td>' +
          '<td>1080x1080' + (redNombre === 'tiktok' ? ' / 1080x1920' : '') + '</td>' +
          '<td class="guia-copy-cell">' + escHtml(copyShort) + '</td>' +
          '<td><span class="guia-prompt-hint">Usar colores de marca + logo + copy del post</span></td>' +
        '</tr>';
      idx++;
    });
  }

  addRows('instagram', 'linear-gradient(135deg,#833ab4,#fd1d1d)', ig, 'Post estático');
  addRows('facebook',  '#1877f2',                                  fb, 'Post estático');
  addRows('tiktok',    '#010101',                                  tk, 'Video / Reel');

  if (reel) {
    const id      = 'chk_reel_educativo';
    const checked = saved[id] ? 'checked' : '';
    rows +=
      '<tr class="guia-row' + (saved[id] ? ' guia-done' : '') + '" data-id="' + id + '">' +
        '<td style="text-align:center"><input type="checkbox" class="guia-chk" data-id="' + id + '" data-key="' + storageKey + '" ' + checked + '></td>' +
        '<td><span class="guia-badge" style="background:#0d6e63">REEL</span></td>' +
        '<td>Reel Educativo</td>' +
        '<td>1080x1920</td>' +
        '<td class="guia-copy-cell">' + escHtml((reel.titulo || '').substring(0, 80)) + '</td>' +
        '<td><span class="guia-prompt-hint">Guion completo disponible en tarjeta Reels</span></td>' +
      '</tr>';
  }

  if (bot) {
    const id      = 'chk_bot_whatsapp';
    const checked = saved[id] ? 'checked' : '';
    rows +=
      '<tr class="guia-row' + (saved[id] ? ' guia-done' : '') + '" data-id="' + id + '">' +
        '<td style="text-align:center"><input type="checkbox" class="guia-chk" data-id="' + id + '" data-key="' + storageKey + '" ' + checked + '></td>' +
        '<td><span class="guia-badge" style="background:#25d366;color:#000">WA</span></td>' +
        '<td>Bot WhatsApp</td>' +
        '<td>Configuración</td>' +
        '<td class="guia-copy-cell">Flujo de respuestas automáticas</td>' +
        '<td><span class="guia-prompt-hint">Config completa en tarjeta WhatsApp</span></td>' +
      '</tr>';
  }

  const total = idx + (reel ? 1 : 0) + (bot ? 1 : 0);
  const done  = Object.values(saved).filter(Boolean).length;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'grid-column: 1/-1;';
  wrapper.innerHTML =
    '<div class="platform-card" style="overflow:visible">' +
      '<div class="platform-bar" style="background:linear-gradient(90deg,#0d6e63,#b8860b)"></div>' +
      '<div class="platform-header">' +
        '<div class="platform-icon" style="background:#0d6e63;color:#fff;font-size:1rem">✓</div>' +
        '<span class="platform-name">Guía de Producción</span>' +
        '<span id="guiaProgress" class="exports-saved-badge">' + done + ' / ' + total + ' piezas producidas</span>' +
      '</div>' +
      '<div class="platform-body" style="gap:0;padding:12px 20px 20px">' +
        '<p style="font-size:.78rem;color:var(--text-m);margin:0 0 14px">Marca cada pieza conforme la produces. El progreso se guarda automáticamente en este navegador.</p>' +
        '<div class="fp-table-wrap">' +
          '<table class="fp-table guia-table">' +
            '<thead><tr>' +
              '<th style="width:40px;text-align:center">✓</th>' +
              '<th>Red</th>' +
              '<th>Tipo</th>' +
              '<th>Tamaño</th>' +
              '<th>Copy (resumen)</th>' +
              '<th>Nota Visual</th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';

  wrapper.querySelectorAll('.guia-chk').forEach(function (chk) {
    chk.addEventListener('change', function () {
      const id  = this.dataset.id;
      const key = this.dataset.key;
      try {
        const current = JSON.parse(localStorage.getItem(key) || '{}');
        current[id] = this.checked;
        localStorage.setItem(key, JSON.stringify(current));
      } catch (e) {}

      const row = wrapper.querySelector('tr[data-id="' + id + '"]');
      if (row) row.classList.toggle('guia-done', this.checked);

      const allChks  = wrapper.querySelectorAll('.guia-chk');
      const doneCount = Array.from(allChks).filter(function (c) { return c.checked; }).length;
      const prog = wrapper.querySelector('#guiaProgress');
      if (prog) prog.textContent = doneCount + ' / ' + total + ' piezas producidas';
    });
  });

  return wrapper;
}

// ── Loading State ──────────────────────────────────────────────────────────
function setLoading(on, msg) {
  generateBtn.disabled = on;
  generateBtn.classList.toggle('loading', on);
  spinner.style.display = on ? 'block' : 'none';
  btnText.textContent   = on ? (msg || 'Generando…') : '✦ Generar Campaña';
}

// ── Demo Data ──────────────────────────────────────────────────────────────
function loadDemoData() {
  const demo = {
    paquete: 'Profesional',
    identidad: {
      nombre:    'Sonrisas del Centro',
      ciudad:    'Querétaro',
      industria: 'Salud dental',
    },
    negocio: {
      tipo:      'Consultorio dental',
      paquete:   'Profesional',
      audiencia: 'Adultos 25-55 años, familias en Querétaro Centro',
    },
    marca: {
      tono:      'Profesional, cercano y confiable',
      valores:   ['Salud', 'Confianza', 'Bienestar', 'Accesibilidad'],
    },
    servicios: [
      'Limpieza dental profesional',
      'Blanqueamiento dental',
      'Ortodoncia',
      'Implantes dentales',
      'Consulta de emergencia',
    ],
    redes: ['Instagram', 'Facebook', 'WhatsApp'],
    contacto: {
      whatsapp:  '+52 442 000 0000',
      direccion: 'Centro Histórico, Querétaro, Qro.',
    },
  };

  clientData = demo;
  renderClientPreview(demo);
  dropZone.classList.add('has-file');
  noClientWarn.classList.add('hidden');

  $('fMes').value      = 'Abril';
  $('fServicio').value = 'Limpieza dental y blanqueamiento';
  $('fPromocion').value = '15% de descuento en primera consulta';
  $('fFecha').value    = '';
  $('fObjecion').value = 'Es muy caro';
  $('fPregunta').value = '¿Cuánto tiempo dura el tratamiento?';
  $('fNota').value     = '';

  showToast('✦ Datos de demo cargados', 'success');
}

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Utils ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fallbackCopy(text) {
  const el = document.createElement('textarea');
  el.value = text; el.style.position = 'fixed'; el.style.opacity = '0';
  document.body.appendChild(el); el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO DE APROBACIÓN ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

// ── Generar código único ───────────────────────────────────────────────────
function generateApprovalCode() {
  // excluye I, O, 1, 0 para evitar confusiones
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── URL relativa a approval.html ───────────────────────────────────────────
function getApprovalUrl(code) {
  const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.origin}/app/`
    : 'https://synkromx.github.io/app/';
  return `${base}approval.html?code=${code}`;
}

// ── Construir objeto de sesión ─────────────────────────────────────────────
function buildApprovalData(code) {
  const posts  = (campaignData && campaignData.posts) || {};
  const month  = getMonthData();
  const nets   = ['instagram', 'facebook', 'tiktok'];

  // Una entrada de aprobación por cada post de cada red
  const approvals = {};
  nets.forEach(net => {
    (posts[net] || []).forEach((_, idx) => {
      approvals[`${net}_${idx}`] = { status: 'pending', comment: '' };
    });
  });

  const clientName = (clientData && (
    clientData.identidad?.nombre_comercial
    || clientData.nombre
    || clientData.identidad?.nombre
    || clientData.negocio?.nombre
    || clientData.name
  )) || 'Cliente';

  return {
    code,
    createdAt:   Date.now(),
    clientName,
    mes:         month.mes,
    servicio:    month.servicio,
    packageType: (campaignData && campaignData._package) || 'starter',
    posts: {
      instagram: posts.instagram || [],
      facebook:  posts.facebook  || [],
      tiktok:    posts.tiktok    || [],
    },
    fichaProduccion: (campaignData && campaignData.fichaProduccion) || null,
    maestro:               (campaignData && campaignData.maestro)              || null,
    estrategiaCampana:     (campaignData && campaignData.estrategiaCampana)    || null,
    calendarioPublicacion: (campaignData && campaignData.calendarioPublicacion) || null,
    _clientSlug:           currentClientSlug || null,
    approvals,
    lastUpdated: Date.now(),
  };
}

// ── Botón "Enviar a cliente" ───────────────────────────────────────────────
function setupApprovalButton() {
  const existing = $('approvalPanel');
  if (existing) existing.remove();

  const grid  = $('outputGrid');
  const panel = document.createElement('div');
  panel.id = 'approvalPanel';
  panel.style.cssText = 'grid-column:1/-1; margin-top:8px;';
  panel.innerHTML = `
    <div class="approval-send-card">
      <span class="approval-send-icon">📤</span>
      <div class="approval-send-content">
        <div class="approval-send-title">¿Listo para enviar al cliente?</div>
        <div class="approval-send-desc">Genera un link único para que el cliente revise y apruebe cada post directamente desde su celular.</div>
      </div>
      <button class="btn-send-approval" id="btnSendApproval">Enviar a Cliente para Aprobación</button>
      <button class="btn-send-approval" style="background:transparent;border:1px solid #b8860b;color:#b8860b;margin-top:8px" onclick="reimportarCampana()">🔗 Reimportar campaña desde JSON</button>
    </div>
  `;
  grid.appendChild(panel);
  $('btnSendApproval').addEventListener('click', handleSendForApproval);
}

function handleSendForApproval() {
  if (!campaignData || !campaignData.posts) {
    showToast('No hay posts — genera la campaña primero', 'error');
    return;
  }
  const code = generateApprovalCode();
  currentCampaignCode = code;
  const data = buildApprovalData(code);
  db.ref('campaigns/' + code).set(data)
    .then(() => {
      showApprovalLinkPanel(code);
      showToast(`✓ Link generado — código: ${code}`, 'success');
    })
    .catch(err => showToast('Error guardando campaña: ' + err.message, 'error'));
}

function showApprovalLinkPanel(code) {
  const url    = getApprovalUrl(code);
  const month  = getMonthData();
  const waText = encodeURIComponent(
    `¡Hola! 👋 Tu campaña de ${month.mes} está lista para revisar.\n\n`
    + `Haz clic aquí para ver y aprobar cada post:\n${url}\n\n`
    + `Tienes 48 horas para revisar. ¡Cualquier duda me avisas! 🙌`
  );

  const panel = $('approvalPanel');
  panel.innerHTML = `
    <div class="approval-sent-card">
      <div class="approval-sent-header">
        <span class="approval-sent-icon">✅</span>
        <span class="approval-sent-title">Link de aprobación generado</span>
      </div>
      <div class="approval-code-display">
        <span class="approval-code-label">Código de acceso</span>
        <span class="approval-code-value">${escHtml(code)}</span>
      </div>
      <div class="approval-link-row">
        <input class="approval-link-input" id="approvalLinkInput" value="${escHtml(url)}" readonly>
        <button class="btn-copy-link" id="btnCopyLink">Copiar link</button>
      </div>
      <div class="approval-actions-row">
        <a href="https://wa.me/?text=${waText}" target="_blank" rel="noopener" class="btn-wa-share">💬 Enviar por WhatsApp</a>
        <a href="${escHtml(url)}" target="_blank" rel="noopener" class="btn-preview-approval">👁 Vista previa del cliente</a>
      </div>
      <div class="approval-hint">El cliente verá cada post como mockup visual y podrá aprobar o solicitar cambios. Verás el estado actualizado abajo en tiempo real.</div>
    </div>
  `;

  $('btnCopyLink').addEventListener('click', function () {
    const v = $('approvalLinkInput').value;
    navigator.clipboard.writeText(v).catch(() => fallbackCopy(v));
    this.textContent = '✓ Copiado';
    this.classList.add('copied');
    setTimeout(() => { this.textContent = 'Copiar link'; this.classList.remove('copied'); }, 2000);
  });
}

// ── Sección de status ──────────────────────────────────────────────────────

function initStatusSection() {
  const main    = document.querySelector('main');
  const section = document.createElement('div');
  section.id    = 'statusSection';
  main.appendChild(section);
  renderStatusSection();

  // Refresco en tiempo real vía Firebase Realtime Database
  db.ref('campaigns').on('value', snap => {
    const val = snap.val() || {};
    cachedSessions = Object.values(val).sort((a, b) => b.createdAt - a.createdAt);
    renderStatusSection();
  });
}

function getApprovalSessions() {
  return cachedSessions;
}

function computeOverallStatus(approvals) {
  const vals = Object.values(approvals);
  if (!vals.length)                                    return 'pending';
  if (vals.every(v => v.status === 'approved'))        return 'complete';
  if (vals.some(v  => v.status === 'changes'))         return 'changes';
  if (vals.some(v  => v.status === 'approved'))        return 'partial';
  return 'pending';
}

const STATUS_META = {
  pending:  { label: 'Pendiente',           color: 'var(--gold-l)',  dot: 'var(--gold)' },
  partial:  { label: 'Aprobación Parcial',  color: 'var(--teal-xl)', dot: 'var(--teal)' },
  changes:  { label: 'Cambios Solicitados', color: '#fb923c',        dot: '#ea580c' },
  complete: { label: 'Aprobado Completo',   color: '#4ade80',        dot: '#22c55e' },
};

function renderStatusSection() {
  const section = $('statusSection');
  if (!section) return;

  const sessions = getApprovalSessions();
  if (!sessions.length) { section.innerHTML = ''; return; }

  section.innerHTML = `
    <div class="section-title" style="margin-top:8px">Campañas Enviadas a Aprobación</div>
    <div class="status-cards" id="statusCards"></div>
  `;

  const container = $('statusCards');
  sessions.forEach(sess => {
    const status     = computeOverallStatus(sess.approvals);
    const meta       = STATUS_META[status];
    const total      = Object.keys(sess.approvals).length;
    const approved   = Object.values(sess.approvals).filter(v => v.status === 'approved').length;
    const withChange = Object.entries(sess.approvals).filter(([, v]) => v.status === 'changes' && v.comment);
    const baseTime   = sess.extendedAt || sess.createdAt;
    const deadline   = sess.extendedAt
      ? sess.extendedAt + 24 * 3600000
      : sess.createdAt + 48 * 3600000;
    const remaining  = Math.max(0, deadline - Date.now());
    const hrs        = Math.floor(remaining / 3600000);
    const mins       = Math.floor((remaining % 3600000) / 60000);
    const expired    = remaining === 0;
    const pct        = total ? Math.round(approved / total * 100) : 0;
    const netLabels  = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };

    const card = document.createElement('div');
    card.className = 'status-card';
    card.innerHTML = `
      <div class="status-card-header">
        <div class="status-card-left">
          <div class="status-code-badge">${escHtml(sess.code)}</div>
          <div class="status-card-meta">
            <span class="status-client">${escHtml(sess.clientName)}</span>
            <span class="status-detail">${escHtml(sess.mes)} · ${escHtml(sess.servicio)} · Paquete ${escHtml(sess.packageType)}</span>
          </div>
        </div>
        <div class="status-right">
          <div class="status-badge" style="color:${meta.color};border-color:${meta.dot}">
            <span style="width:6px;height:6px;border-radius:50%;background:${meta.dot};display:inline-block;flex-shrink:0"></span>
            ${meta.label}
          </div>
          <div class="status-timer ${expired ? 'expired' : ''}">
            ${expired ? '⏰ Expirado' : `⏱ ${hrs}h ${mins}m restantes`}
            ${sess.extendedAt ? '<span class="status-extended-badge">+24h extendido</span>' : ''}
          </div>
        </div>
      </div>
      <div class="status-progress-wrap">
        <div class="status-progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="status-progress-label">${approved}/${total} posts aprobados · ${pct}%</div>
      ${withChange.length ? `
        <div class="status-changes-box">
          <div class="status-changes-title">Comentarios del cliente (${withChange.length})</div>
          ${withChange.map(([key, v]) => {
            const [net, idx] = key.split('_');
            return `<div class="status-change-item">
              <span class="status-change-net">${escHtml(netLabels[net] || net)} · Post ${Number(idx) + 1}</span>
              <span class="status-change-comment">"${escHtml(v.comment)}"</span>
              <button class="btn-edit-post" data-code="${escHtml(sess.code)}" data-net="${escHtml(net)}" data-idx="${escHtml(idx)}" style="margin-left:8px;padding:2px 10px;font-size:.72rem;border-radius:6px;border:1px solid rgba(184,134,11,.5);background:rgba(184,134,11,.12);color:#f0c040;cursor:pointer;">Editar</button>
            </div>`;
          }).join('')}
        </div>
      ` : ''}
      <div class="status-card-footer">
        <a href="${escHtml(getApprovalUrl(sess.code))}" target="_blank" class="btn-open-approval">Ver página del cliente ↗</a>
        ${expired ? `<button class="btn-extend-approval" data-code="${escHtml(sess.code)}">⏳ Extender 24h</button>` : ''}
        <button class="btn-delete-approval" data-code="${escHtml(sess.code)}">Eliminar</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button class="btn-card-action btn-card-adn" data-code="${escHtml(sess.code)}" style="color:var(--gold-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--border-g);background:none;cursor:pointer;">🎨 ADN Visual</button>
          <button class="btn-card-action btn-card-briefmat" data-code="${escHtml(sess.code)}" style="color:var(--gold-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--border-g);background:none;cursor:pointer;">📸 Brief Material</button>
          <button class="btn-card-action btn-card-promptsia" data-code="${escHtml(sess.code)}" style="color:var(--gold-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--border-g);background:none;cursor:pointer;">✨ Prompts IA</button>
          <button class="btn-card-action btn-card-calvisual" data-code="${escHtml(sess.code)}" style="color:var(--gold-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--border-g);background:none;cursor:pointer;">📅 Calendario Visual</button>
        </div>
        ${status === 'complete' ? `
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <button class="btn-card-action btn-card-produccion" data-code="${escHtml(sess.code)}" style="color:var(--teal-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--teal);background:rgba(13,110,99,.1);cursor:pointer;">🗂️ Producción</button>
          <button class="btn-card-action btn-card-resumen" data-code="${escHtml(sess.code)}" style="color:var(--teal-xl);font-size:.78rem;font-weight:700;padding:6px 12px;border-radius:var(--rs);border:1px solid var(--teal);background:rgba(13,110,99,.1);cursor:pointer;">📄 Resumen Ejecutivo</button>
        </div>` : ''}
      </div>
    `;

    // Botón extender
    const extendBtn = card.querySelector('.btn-extend-approval');
    if (extendBtn) {
      extendBtn.addEventListener('click', function () {
        const code = this.dataset.code;
        const now  = Date.now();
        db.ref('campaigns/' + code).update({
          extendedAt:  now,
          lastUpdated: now,
        })
        .then(() => showToast('✓ Campaña extendida 24h — el cliente fue notificado en su portal', 'success'))
        .catch(err => showToast('Error extendiendo: ' + err.message, 'error'));
      });
    }

    card.querySelector('.btn-delete-approval').addEventListener('click', function () {
      const code = this.dataset.code;
      const primera = confirm('⚠️ ¿Eliminar el link de aprobación ' + code + '?\nEsto borra la campaña de Firebase.');
      if (!primera) return;
      const segunda = confirm('❌ Confirmación final: esta acción NO se puede deshacer.\n¿Seguro que deseas eliminar ' + code + '?');
      if (!segunda) return;
      db.ref('campaigns/' + code).remove()
        .catch(err => showToast('Error eliminando: ' + err.message, 'error'));
    });

    // Botones de acción de tarjeta (Entregables con IA)
    card.querySelector('.btn-card-adn')?.addEventListener('click', async function() {
      const snap = await db.ref('campaigns/' + this.dataset.code).once('value');
      const d = snap.val(); if (!d) return;
      generarADNVisual(d);
    });
    card.querySelector('.btn-card-briefmat')?.addEventListener('click', async function() {
      const snap = await db.ref('campaigns/' + this.dataset.code).once('value');
      const d = snap.val(); if (!d) return;
      generarBriefMaterial(d);
    });
    card.querySelector('.btn-card-promptsia')?.addEventListener('click', async function() {
      const snap = await db.ref('campaigns/' + this.dataset.code).once('value');
      const d = snap.val(); if (!d) return;
      generarPromptsIA(d);
    });
    card.querySelector('.btn-card-calvisual')?.addEventListener('click', async function() {
      const snap = await db.ref('campaigns/' + this.dataset.code).once('value');
      const d = snap.val(); if (!d) return;
      generarCalendarioVisualHTML(d);
    });
    card.querySelector('.btn-card-produccion')?.addEventListener('click', function() {
      generarProduccionHTML(this.dataset.code);
    });
    card.querySelector('.btn-card-resumen')?.addEventListener('click', async function() {
      const snap = await db.ref('campaigns/' + this.dataset.code).once('value');
      const d = snap.val(); if (!d) return;
      generarResumenEjecutivoHTML(d);
    });

    // Botones de editar post
    card.querySelectorAll('.btn-edit-post').forEach(btn => {
      btn.addEventListener('click', function () {
        const code = this.dataset.code;
        const net  = this.dataset.net;
        const idx  = this.dataset.idx;
        // Obtener el texto actual del post Y el comentario del cliente desde Firebase
        Promise.all([
          db.ref(`campaigns/${code}/posts/${net}/${idx}/post`).once('value'),
          db.ref(`campaigns/${code}/approvals/${net}_${idx}/comment`).once('value')
        ])
          .then(([postSnap, commentSnap]) => {
            const currentText   = postSnap.val() || '';
            const clientComment = commentSnap.val() || '';
            openEditModal(code, net, idx, currentText, clientComment);
          })
          .catch(err => showToast('Error cargando post: ' + err.message, 'error'));
      });
    });

    container.appendChild(card);
  });
}

// ── Módulo de Edición de Posts ─────────────────────────────────────────────

function openEditModal(code, net, idx, currentText, clientComment = '') {
  // Remover modal existente si hay
  const existing = document.getElementById('editModal');
  if (existing) existing.remove();

  const netLabels = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };
  const modal = document.createElement('div');
  modal.id = 'editModal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;
    background:rgba(4,10,20,.88);
    backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    padding:20px;
  `;

  modal.innerHTML = `
    <div style="
      background:#0f3460;
      border:1px solid rgba(184,134,11,.25);
      border-radius:14px;
      padding:32px;
      width:100%;max-width:580px;
      box-shadow:0 8px 40px rgba(0,0,0,.6);
      display:flex;flex-direction:column;gap:16px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#b8860b;margin-bottom:4px;">
            Editando post
          </div>
          <div style="font-size:1rem;font-weight:700;color:#fff;">
            ${netLabels[net] || net} · Post ${Number(idx) + 1}
          </div>
        </div>
        <button id="editModalClose" style="
          background:transparent;border:none;color:#5a7898;
          font-size:1.4rem;cursor:pointer;padding:4px 8px;
          transition:color .2s;
        " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#5a7898'">✕</button>
      </div>

      ${clientComment ? `
      <div style="
        background:rgba(234,88,12,.08);
        border:1px solid rgba(234,88,12,.25);
        border-radius:8px;
        padding:12px 16px;
        display:flex;flex-direction:column;gap:4px;
      ">
        <div style="font-size:.65rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#fb923c;">
          💬 Sugerencia del cliente
        </div>
        <div style="font-size:.85rem;color:#fff;font-style:italic;line-height:1.5;">
          "${escHtml(clientComment)}"
        </div>
      </div>
      ` : ''}

      <div style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5a7898;">
        Copy actual — edita aquí
      </div>

      <textarea id="editPostText" style="
        background:#0a1e3a;
        border:1px solid rgba(184,134,11,.2);
        border-radius:8px;
        color:#fff;
        padding:16px;
        font-size:.88rem;
        line-height:1.6;
        resize:vertical;
        min-height:200px;
        outline:none;
        font-family:inherit;
        width:100%;
        transition:border-color .2s;
      " onfocus="this.style.borderColor='#b8860b'" onblur="this.style.borderColor='rgba(184,134,11,.2)'">${escHtml(currentText)}</textarea>

      <div style="font-size:.72rem;color:#5a7898;">
        El cliente verá el copy actualizado en su portal y deberá aprobarlo nuevamente.
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="editModalCancel" style="
          background:transparent;
          border:1px solid rgba(184,134,11,.2);
          color:#5a7898;border-radius:8px;
          padding:10px 20px;font-size:.85rem;
          cursor:pointer;transition:all .2s;
        " onmouseover="this.style.borderColor='#b8860b';this.style.color='#d4a017'"
           onmouseout="this.style.borderColor='rgba(184,134,11,.2)';this.style.color='#5a7898'">
          Cancelar
        </button>
        <button id="editModalSave" style="
          background:#b8860b;color:#0f2847;
          border:none;border-radius:8px;
          padding:10px 24px;font-size:.85rem;
          font-weight:700;cursor:pointer;
          transition:background .2s;
        " onmouseover="this.style.background='#d4a017'"
           onmouseout="this.style.background='#b8860b'">
          ✓ Guardar cambio
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Cerrar con X o Cancelar
  document.getElementById('editModalClose').addEventListener('click', () => modal.remove());
  document.getElementById('editModalCancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Guardar
  document.getElementById('editModalSave').addEventListener('click', () => {
    const newText = document.getElementById('editPostText').value.trim();
    if (!newText) { showToast('El texto no puede estar vacío', 'error'); return; }

    const saveBtn = document.getElementById('editModalSave');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    // Actualizar el post en Firebase
    const postNodeRef = db.ref(`campaigns/${code}/posts/${net}/${idx}`);
    postNodeRef.once('value')
      .then(snap => {
        const node = snap.val() || {};
        // Preservar el copy original la primera vez que se edita
        if (!node.copy_original) {
          return postNodeRef.update({ copy_original: node.post || '' });
        }
      })
      .then(() => db.ref(`campaigns/${code}/posts/${net}/${idx}/post`).set(newText))
      .then(() => {
        // Resetear el estado de aprobación de ese post a pending
        return db.ref(`campaigns/${code}/approvals/${net}_${idx}`).set({
          status: 'pending',
          comment: ''
        });
      })
      .then(() => {
        modal.remove();
        showToast('✓ Post actualizado — el cliente puede revisarlo', 'success');
      })
      .catch(err => {
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Guardar cambio';
        showToast('Error guardando: ' + err.message, 'error');
      });
  });

  // Focus al textarea
  setTimeout(() => document.getElementById('editPostText')?.focus(), 100);
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO DE CIERRE DE MES ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function setupCierreModal() {
  const btn      = document.getElementById('cierreBtn');
  const backdrop = document.getElementById('cierreModalBackdrop');
  const closeBtn = document.getElementById('cierreModalClose');
  const saveBtn  = document.getElementById('saveCierreBtn');
  if (!btn || !backdrop) return;

  btn.addEventListener('click', function () {
    backdrop.classList.add('open');
    if (clientData) {
      const slugField = document.getElementById('cCliente');
      if (slugField) slugField.value = slugify(
        clientData.identidad?.nombre_comercial ||
        clientData.identidad?.nombre ||
        clientData.negocio?.nombre ||
        clientData.nombre ||
        clientData.name || ''
      );
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', function () {
    backdrop.classList.remove('open');
  });

  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });

  if (saveBtn) saveBtn.addEventListener('click', saveCierreMes);
}

async function saveCierreMes() {
  const slug = document.getElementById('cCliente')?.value?.trim();
  const mes  = document.getElementById('cMes')?.value;
  if (!slug || !mes) { showToast('Completa el cliente y el mes', 'error'); return; }

  const año  = new Date().getFullYear();
  const key  = mes.toLowerCase() + '-' + año;

  const cierre = {
    mes,
    año,
    fechaCierre: new Date().toISOString(),
    instagram: {
      seguidoresInicio: parseInt(document.getElementById('cIgSegInicio')?.value)    || 0,
      seguidoresFin:    parseInt(document.getElementById('cIgSegFin')?.value)        || 0,
      alcance:          parseInt(document.getElementById('cIgAlcance')?.value)       || 0,
      interacciones:    parseInt(document.getElementById('cIgInteracciones')?.value) || 0,
      mejorPost:        document.getElementById('cIgMejorPost')?.value               || '',
      peorPost:         document.getElementById('cIgPeorPost')?.value                || '',
    },
    facebook: {
      seguidoresInicio: parseInt(document.getElementById('cFbSegInicio')?.value)    || 0,
      seguidoresFin:    parseInt(document.getElementById('cFbSegFin')?.value)        || 0,
      alcance:          parseInt(document.getElementById('cFbAlcance')?.value)       || 0,
      interacciones:    parseInt(document.getElementById('cFbInteracciones')?.value) || 0,
      mejorPost:        document.getElementById('cFbMejorPost')?.value               || '',
      peorPost:         document.getElementById('cFbPeorPost')?.value                || '',
    },
    tiktok: {
      seguidoresInicio: parseInt(document.getElementById('cTkSegInicio')?.value)    || 0,
      seguidoresFin:    parseInt(document.getElementById('cTkSegFin')?.value)        || 0,
      alcance:          parseInt(document.getElementById('cTkAlcance')?.value)       || 0,
      interacciones:    parseInt(document.getElementById('cTkInteracciones')?.value) || 0,
      mejorPost:        document.getElementById('cTkMejorPost')?.value               || '',
      peorPost:         document.getElementById('cTkPeorPost')?.value                || '',
    },
    whatsappMensajes: parseInt(document.getElementById('cWhatsappMensajes')?.value) || 0,
    observacion:      document.getElementById('cObservacion')?.value                 || '',
  };

  const saveBtn      = document.getElementById('saveCierreBtn');
  const reporteBtn   = document.getElementById('generarReporteBtn');
  const reporteHint  = document.getElementById('reporteHint');

  try {
    if (saveBtn) { saveBtn.textContent = 'Guardando...'; saveBtn.disabled = true; }
    await db.ref(`clientes/${slug}/cierres/${key}`).set(cierre);
    showToast('✓ Cierre de mes guardado correctamente', 'success');

    // Mostrar botón de reporte después de guardar
    if (reporteBtn) {
      reporteBtn.style.display = 'block';
      reporteBtn.onclick = () => generarReporteHTML(cierre, slug);
    }
    if (reporteHint) reporteHint.style.display = 'block';

  } catch (e) {
    showToast('Error al guardar: ' + e.message, 'error');
  } finally {
    if (saveBtn) { saveBtn.textContent = '💾 Guardar Cierre de Mes'; saveBtn.disabled = false; }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO INTELIGENCIA DE CIERRE — buildIntelSection ────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

/**
 * buildIntelSection — visión histórica completa
 * @param {Object|null} cierreMes    — cierre del mes inmediato anterior
 * @param {Array}       todosCierres — array de todos los cierres históricos
 * @returns {string} Sección Markdown lista para inyectar en buildMaestroPrompt
 */
function buildIntelSection(cierreMes, todosCierres) {
  let seccion = `## INTELIGENCIA ESTRATÉGICA DEL CLIENTE\n`;
  seccion += `> Esta sección tiene MÁXIMA PRECEDENCIA. Todas las decisiones de formato, canal y tipo de contenido deben basarse en estos datos reales antes que en cualquier suposición genérica.\n\n`;

  // ── BLOQUE 1: Análisis histórico acumulado (si hay 2+ cierres) ──
  if (todosCierres && todosCierres.length >= 2) {
    seccion += `### Patrones históricos (${todosCierres.length} meses de datos)\n\n`;

    const redes = ['ig', 'fb', 'tk'];
    const nombresRedes = { ig: 'Instagram', fb: 'Facebook', tk: 'TikTok' };
    const stats = {};

    const redKeyMap = { ig: 'instagram', fb: 'facebook', tk: 'tiktok' };
    redes.forEach(red => {
      const valores = todosCierres
        .map(c => {
          const rd = c[redKeyMap[red]] || {};
          const alcance = parseInt(rd.alcance) || 0;
          const ini = parseInt(rd.seguidoresInicio) || 0;
          const fin = parseInt(rd.seguidoresFin) || 0;
          const interacciones = parseInt(rd.interacciones) || 0;
          const engagement = ini > 0 ? ((interacciones / ini) * 100) : 0;
          return { alcance, seguidores: fin - ini, engagement, interacciones };
        })
        .filter(v => v.alcance > 0);

      if (valores.length === 0) { stats[red] = null; return; }

      const promedioAlcance = Math.round(valores.reduce((s, v) => s + v.alcance, 0) / valores.length);
      const promedioEngagement = (valores.reduce((s, v) => s + v.engagement, 0) / valores.length).toFixed(1);
      const totalSeguidores = valores.reduce((s, v) => s + v.seguidores, 0);

      let tendencia = 'estable';
      if (valores.length >= 3) {
        const mitad = Math.floor(valores.length / 2);
        const promedioAntes = valores.slice(0, mitad).reduce((s, v) => s + v.alcance, 0) / mitad;
        const promedioDespues = valores.slice(mitad).reduce((s, v) => s + v.alcance, 0) / (valores.length - mitad);
        const delta = ((promedioDespues - promedioAntes) / promedioAntes) * 100;
        if (delta > 15) tendencia = '📈 creciendo';
        else if (delta < -15) tendencia = '📉 bajando';
        else tendencia = '➡️ estable';
      }

      stats[red] = { promedioAlcance, promedioEngagement, totalSeguidores, tendencia, meses: valores.length };
    });

    seccion += `| Red | Alcance promedio | Engagement promedio | Seguidores ganados (total) | Tendencia |\n`;
    seccion += `|-----|-----------------|--------------------|--------------------------|-----------|\n`;
    redes.forEach(red => {
      if (stats[red]) {
        const s = stats[red];
        seccion += `| ${nombresRedes[red]} | ${s.promedioAlcance.toLocaleString()} | ${s.promedioEngagement}% | +${s.totalSeguidores} | ${s.tendencia} |\n`;
      }
    });
    seccion += `\n`;

    const canalDominante = redes.filter(r => stats[r]).sort((a, b) => stats[b].promedioAlcance - stats[a].promedioAlcance)[0];
    if (canalDominante) {
      seccion += `**Canal históricamente dominante:** ${nombresRedes[canalDominante]} (consistente en ${stats[canalDominante].meses} meses)\n\n`;
    }

    const canalEngagement = redes.filter(r => stats[r]).sort((a, b) => parseFloat(stats[b].promedioEngagement) - parseFloat(stats[a].promedioEngagement))[0];
    if (canalEngagement && canalEngagement !== canalDominante) {
      seccion += `**Canal con mejor engagement histórico:** ${nombresRedes[canalEngagement]} (${stats[canalEngagement].promedioEngagement}% promedio) — replicar formatos que generan interacción aquí.\n\n`;
    }

    const mejoresPostsHistoricos = {};
    redes.forEach(red => {
      const posts = todosCierres.map(c => (c[redKeyMap[red]] || {}).mejorPost).filter(p => p && p.trim().length > 0);
      if (posts.length > 0) mejoresPostsHistoricos[red] = posts;
    });

    if (Object.keys(mejoresPostsHistoricos).length > 0) {
      seccion += `**Patrones de contenido ganador (histórico):**\n`;
      redes.forEach(red => {
        if (mejoresPostsHistoricos[red]) {
          seccion += `- ${nombresRedes[red]}: "${mejoresPostsHistoricos[red][mejoresPostsHistoricos[red].length - 1]}" (y ${mejoresPostsHistoricos[red].length} meses de referencia)\n`;
        }
      });
      seccion += `\n`;
    }

    seccion += `**Instrucciones estratégicas basadas en histórico:**\n`;
    let instruccion = 1;
    redes.forEach(red => {
      if (!stats[red]) return;
      const s = stats[red];
      if (s.tendencia.includes('creciendo')) {
        seccion += `${instruccion++}. ${nombresRedes[red]} está en tendencia de crecimiento sostenido — escalar volumen y frecuencia en esta red.\n`;
      } else if (s.tendencia.includes('bajando')) {
        seccion += `${instruccion++}. ${nombresRedes[red]} muestra caída sostenida — cambiar formato radicalmente, priorizar video corto y contenido interactivo.\n`;
      }
      if (parseFloat(s.promedioEngagement) < 1.5) {
        seccion += `${instruccion++}. ${nombresRedes[red]} tiene engagement histórico bajo (${s.promedioEngagement}%) — evitar posts estáticos, priorizar Reels y preguntas directas.\n`;
      }
    });
    seccion += `\n`;
  }

  // ── BLOQUE 2: Inteligencia del mes inmediato anterior ──
  if (cierreMes) {
    seccion += `### Datos del mes anterior (accionables para este mes)\n\n`;

    const redes = ['ig', 'fb', 'tk'];
    const nombresRedes = { ig: 'Instagram', fb: 'Facebook', tk: 'TikTok' };
    let maxAlcance = 0, canalLider = 'Instagram';
    let maxEngagement = 0, canalEngagementLider = 'Instagram';

    const redKM = { ig: 'instagram', fb: 'facebook', tk: 'tiktok' };
    const metricas = {};
    redes.forEach(red => {
      const rd = cierreMes[redKM[red]] || {};
      const alcance = parseInt(rd.alcance) || 0;
      const ini = parseInt(rd.seguidoresInicio) || 1;
      const fin = parseInt(rd.seguidoresFin) || 0;
      const interacciones = parseInt(rd.interacciones) || 0;
      const engagement = parseFloat(((interacciones / ini) * 100).toFixed(1));
      metricas[red] = { alcance, seguidores: fin - ini, engagement, interacciones };
      if (alcance > maxAlcance) { maxAlcance = alcance; canalLider = nombresRedes[red]; }
      if (engagement > maxEngagement) { maxEngagement = engagement; canalEngagementLider = nombresRedes[red]; }
    });

    seccion += `| Red | Alcance | Engagement | Seguidores ganados | Mejor post | Peor post |\n`;
    seccion += `|-----|---------|------------|-------------------|------------|----------|\n`;
    redes.forEach(red => {
      const m = metricas[red];
      const rd = cierreMes[redKM[red]] || {};
      const mejor = rd.mejorPost || '—';
      const peor  = rd.peorPost  || '—';
      seccion += `| ${nombresRedes[red]} | ${m.alcance.toLocaleString()} | ${m.engagement}% | +${m.seguidores} | ${mejor} | ${peor} |\n`;
    });
    seccion += `\n`;

    seccion += `**Instrucciones para el mes que vas a generar:**\n`;
    let n = 1;
    seccion += `${n++}. Canal líder en alcance el mes pasado: **${canalLider}** — priorizar en distribución y frecuencia.\n`;
    if (canalEngagementLider !== canalLider) {
      seccion += `${n++}. Canal líder en engagement: **${canalEngagementLider}** (${maxEngagement}%) — replicar el formato de contenido que generó interacción aquí.\n`;
    }
    redes.forEach(red => {
      const m = metricas[red];
      if (m.engagement < 1.5 && m.alcance > 0) {
        seccion += `${n++}. ${nombresRedes[red]} tuvo engagement bajo (${m.engagement}%) — cambiar a video y contenido de pregunta directa este mes.\n`;
      }
    });
    redes.forEach(red => {
      const mejor = (cierreMes[redKM[red]] || {}).mejorPost;
      if (mejor && mejor.trim()) {
        seccion += `${n++}. ${nombresRedes[red]} — replicar estructura del mejor post: "${mejor}".\n`;
      }
    });
    redes.forEach(red => {
      const peor = (cierreMes[redKM[red]] || {}).peorPost;
      if (peor && peor.trim()) {
        seccion += `${n++}. ${nombresRedes[red]} — evitar el formato/contexto del peor post: "${peor}".\n`;
      }
    });
    if (cierreMes.observacion && cierreMes.observacion.trim()) {
      seccion += `${n++}. Observación del operador: "${cierreMes.observacion}" — incorporar como contexto estratégico.\n`;
    }
    seccion += `\n`;
  }

  if (!cierreMes && (!todosCierres || todosCierres.length === 0)) {
    seccion += `*Sin datos de meses anteriores — campaña basada en brief y objetivos del cliente.*\n\n`;
  }

  return seccion;
}

// ══════════════════════════════════════════════════════════════════════════════
// ── GENERADOR DE REPORTE HTML ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

function generarReporteHTML(cierre, slug) {
  const ig = cierre.instagram || {};
  const fb = cierre.facebook  || {};
  const tk = cierre.tiktok    || {};
  const mes = cierre.mes || 'Mes';
  const año = cierre.año || new Date().getFullYear();

  const igAlcance = ig.alcance || 0;
  const fbAlcance = fb.alcance || 0;
  const tkAlcance = tk.alcance || 0;
  const totalAlcance = igAlcance + fbAlcance + tkAlcance;
  const totalInter   = (ig.interacciones||0) + (fb.interacciones||0) + (tk.interacciones||0);
  const totalSeg     = ((ig.seguidoresFin||0)-(ig.seguidoresInicio||0)) +
                       ((fb.seguidoresFin||0)-(fb.seguidoresInicio||0)) +
                       ((tk.seguidoresFin||0)-(tk.seguidoresInicio||0));

  const igEng = igAlcance > 0 ? ((ig.interacciones||0) / igAlcance * 100).toFixed(1) : '0';
  const fbEng = fbAlcance > 0 ? ((fb.interacciones||0) / fbAlcance * 100).toFixed(1) : '0';
  const tkEng = tkAlcance > 0 ? ((tk.interacciones||0) / tkAlcance * 100).toFixed(1) : '0';

  const igGanados = (ig.seguidoresFin||0) - (ig.seguidoresInicio||0);
  const fbGanados = (fb.seguidoresFin||0) - (fb.seguidoresInicio||0);
  const tkGanados = (tk.seguidoresFin||0) - (tk.seguidoresInicio||0);

  const igPct = totalAlcance > 0 ? Math.round(igAlcance / totalAlcance * 100) : 0;
  const fbPct = totalAlcance > 0 ? Math.round(fbAlcance / totalAlcance * 100) : 0;
  const tkPct = totalAlcance > 0 ? Math.round(tkAlcance / totalAlcance * 100) : 0;

  // Canal líder
  const canalLider = igAlcance >= fbAlcance && igAlcance >= tkAlcance ? 'Instagram'
                   : tkAlcance >= fbAlcance ? 'TikTok' : 'Facebook';
  const canalLiderAlcance = Math.max(igAlcance, fbAlcance, tkAlcance).toLocaleString();

  // Engagement mayor
  const engArr = [
    { red: 'Instagram', eng: parseFloat(igEng) },
    { red: 'Facebook',  eng: parseFloat(fbEng) },
    { red: 'TikTok',    eng: parseFloat(tkEng) },
  ].sort((a,b) => b.eng - a.eng);

  // Nombre cliente
  const clientName = clientData?.identidad?.nombre_comercial
                  || clientData?.identidad?.nombre
                  || clientData?.negocio?.nombre
                  || slug || 'Cliente';

  const fechaGen = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });

  // Status por red
  function statusRed(eng, ganados) {
    if (parseFloat(eng) >= 3 && ganados >= 10) return ['Excelente', '#1D9E75', '#e1f5ee'];
    if (parseFloat(eng) >= 1.5)                return ['Moderado',  '#BA7517', '#faeeda'];
    return ['Atención',  '#D85A30', '#fcebeb'];
  }
  const [igStatus, igColor, igBg] = statusRed(igEng, igGanados);
  const [fbStatus, fbColor, fbBg] = statusRed(fbEng, fbGanados);
  const [tkStatus, tkColor, tkBg] = statusRed(tkEng, tkGanados);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reporte ${mes} ${año} — ${clientName} × SYNKRO</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0f2847;--teal:#0d6e63;--teal-dark:#085041;--teal-light:#e1f5ee;--gold:#b8860b;--gold-mid:#d4a017;--gold-light:#fef3d0;--ink:#1a1a2e;--smoke:#f7f8fa;--mist:#eef0f4;--border:rgba(15,40,71,.10);--green:#1D9E75;--green-bg:#e1f5ee;--amber:#BA7517;--amber-bg:#faeeda;--red:#D85A30;--red-bg:#fcebeb;--blue:#2563EB;--blue-bg:#eff6ff;--purple:#6D28D9;--purple-bg:#ede9fe}
html{font-size:16px}
body{font-family:'DM Sans',sans-serif;background:var(--smoke);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
.page{max-width:880px;margin:0 auto;padding:2.5rem 2rem 4rem}
.report-header{background:var(--navy);border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;display:grid;grid-template-columns:1fr auto;align-items:start;gap:1rem;position:relative;overflow:hidden}
.report-header::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;border:40px solid rgba(13,110,99,.18)}
.report-header::after{content:'';position:absolute;bottom:-20px;left:200px;width:100px;height:100px;border-radius:50%;border:20px solid rgba(184,134,11,.12)}
.header-brand{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem}
.brand-mark{width:32px;height:32px;background:var(--gold);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:18px;color:#fff;font-weight:700}
.brand-name{color:rgba(255,255,255,.55);font-size:11px;letter-spacing:.15em;text-transform:uppercase;font-weight:500}
.header-client{font-family:'Playfair Display',serif;font-size:2rem;color:#fff;line-height:1.15;margin-bottom:6px}
.header-meta{color:rgba(255,255,255,.55);font-size:13px;display:flex;gap:1.5rem;flex-wrap:wrap}
.header-right{text-align:right;position:relative;z-index:1}
.mes-badge{display:inline-block;background:var(--gold);color:#fff;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:8px}
.header-date{color:rgba(255,255,255,.4);font-size:11px}
.section-label{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal);margin-bottom:.75rem;margin-top:2rem;display:flex;align-items:center;gap:8px}
.section-label::after{content:'';flex:1;height:1px;background:var(--border)}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.kpi-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.2rem;position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s}
.kpi-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(15,40,71,.08)}
.kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0}
.kpi-card.green::before{background:var(--green)}.kpi-card.blue::before{background:var(--blue)}.kpi-card.amber::before{background:var(--amber)}.kpi-card.purple::before{background:var(--purple)}
.kpi-label{font-size:11px;color:#6b7a90;margin-bottom:6px;font-weight:500}
.kpi-value{font-size:26px;font-weight:600;color:var(--ink);line-height:1;margin-bottom:5px}
.kpi-delta{font-size:11px;font-weight:500;display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px}
.kpi-delta.up{background:var(--green-bg);color:var(--teal-dark)}.kpi-delta.flat{background:var(--mist);color:#6b7a90}.kpi-delta.purple{background:var(--purple-bg);color:#4c1d95}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.chart-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:1.2rem 1.4rem 1rem}
.chart-card.full{grid-column:1 / -1}
.chart-title{font-size:13px;font-weight:600;color:var(--ink);margin-bottom:4px}
.chart-subtitle{font-size:11px;color:#6b7a90;margin-bottom:12px}
.legend-row{display:flex;gap:14px;margin-bottom:10px;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#6b7a90}
.legend-dot{width:9px;height:9px;border-radius:2px;flex-shrink:0}
.insights-stack{display:flex;flex-direction:column;gap:10px}
.insight-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:1.1rem 1.4rem;display:grid;grid-template-columns:auto 1fr;gap:1rem;align-items:start}
.insight-icon-wrap{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;margin-top:2px}
.insight-head-row{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap}
.insight-red-name{font-size:13px;font-weight:600;color:var(--ink)}
.insight-status{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em}
.insight-highlights{display:flex;gap:16px;margin-bottom:8px;flex-wrap:wrap}
.insight-stat{text-align:center}
.insight-stat-val{font-size:15px;font-weight:600;color:var(--ink)}
.insight-stat-lbl{font-size:10px;color:#6b7a90}
.insight-divider{width:1px;background:var(--border);align-self:stretch;flex-shrink:0}
.insight-text{font-size:13px;color:#4a5568;line-height:1.65}
.best-post{margin-top:8px;background:var(--smoke);border-radius:8px;padding:8px 12px;font-size:12px;color:#4a5568;border-left:3px solid var(--teal)}
.best-post strong{color:var(--teal-dark);font-size:10px;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:2px}
.warn-post{margin-top:6px;background:#fff8f5;border-radius:8px;padding:8px 12px;font-size:12px;color:#7a3a20;border-left:3px solid var(--red)}
.warn-post strong{color:#922;font-size:10px;letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:2px}
.conclusion-card{background:var(--navy);border-radius:16px;padding:2rem 2.5rem;position:relative;overflow:hidden;margin-top:2rem}
.conclusion-card::before{content:'';position:absolute;bottom:-30px;right:-30px;width:150px;height:150px;border-radius:50%;border:30px solid rgba(13,110,99,.15)}
.conclusion-eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold-mid);font-weight:600;margin-bottom:10px}
.conclusion-title{font-family:'Playfair Display',serif;font-size:1.35rem;color:#fff;margin-bottom:12px;line-height:1.3}
.conclusion-body{font-size:14px;color:rgba(255,255,255,.75);line-height:1.75}
.conclusion-recos{margin-top:1.5rem;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.reco-item{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:.9rem 1rem}
.reco-red{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-mid);margin-bottom:5px}
.reco-text{font-size:12px;color:rgba(255,255,255,.7);line-height:1.55}
.report-footer{margin-top:2.5rem;text-align:center;font-size:11px;color:#9aa3b0;display:flex;align-items:center;justify-content:center;gap:8px}
.footer-sep{width:3px;height:3px;border-radius:50%;background:#9aa3b0}
.print-btn{position:fixed;bottom:1.5rem;right:1.5rem;background:var(--navy);color:#fff;border:none;border-radius:50px;padding:12px 22px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(15,40,71,.25);transition:transform .2s;z-index:100}
.print-btn:hover{transform:translateY(-2px)}
@media print{body{background:#fff}.page{padding:1.5rem 1.5rem 2rem;max-width:100%}.print-btn{display:none}.report-header,.conclusion-card{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@media(max-width:620px){.kpi-grid{grid-template-columns:repeat(2,1fr)}.charts-grid{grid-template-columns:1fr}.conclusion-recos{grid-template-columns:1fr}.report-header{grid-template-columns:1fr}.header-client{font-size:1.5rem}.insight-card{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="page">

<header class="report-header">
  <div>
    <div class="header-brand">
      <div class="brand-mark">S</div>
      <span class="brand-name">SYNKRO · Reporte Mensual</span>
    </div>
    <div class="header-client">${escHtml(clientName)}</div>
    <div class="header-meta">
      <span>📅 ${mes} ${año}</span>
      <span>📍 Querétaro</span>
      <span>📦 Generado por SYNKRO</span>
    </div>
  </div>
  <div class="header-right">
    <div class="mes-badge">Reporte mensual</div>
    <div class="header-date">Generado el ${fechaGen}</div>
  </div>
</header>

<p class="section-label">Indicadores clave del mes</p>
<div class="kpi-grid">
  <div class="kpi-card green">
    <div class="kpi-label">Alcance total</div>
    <div class="kpi-value">${totalAlcance.toLocaleString()}</div>
    <span class="kpi-delta up">IG + FB + TikTok</span>
  </div>
  <div class="kpi-card purple">
    <div class="kpi-label">Interacciones</div>
    <div class="kpi-value">${totalInter.toLocaleString()}</div>
    <span class="kpi-delta purple">${totalAlcance > 0 ? ((totalInter/totalAlcance)*100).toFixed(1) : 0}% engagement</span>
  </div>
  <div class="kpi-card amber">
    <div class="kpi-label">Seguidores ganados</div>
    <div class="kpi-value">+${totalSeg}</div>
    <span class="kpi-delta flat">en ${mes}</span>
  </div>
  <div class="kpi-card blue">
    <div class="kpi-label">Canal líder</div>
    <div class="kpi-value">${canalLider}</div>
    <span class="kpi-delta up">${canalLider === 'Instagram' ? igPct : canalLider === 'TikTok' ? tkPct : fbPct}% del alcance</span>
  </div>
</div>

<p class="section-label">Resultados por red social</p>
<div class="charts-grid">
  <div class="chart-card">
    <div class="chart-title">Alcance por red</div>
    <div class="chart-subtitle">Personas impactadas en ${mes}</div>
    <div class="legend-row">
      <div class="legend-item"><div class="legend-dot" style="background:#0d6e63"></div>Instagram</div>
      <div class="legend-item"><div class="legend-dot" style="background:#6D28D9"></div>TikTok</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Facebook</div>
    </div>
    <div style="position:relative;width:100%;height:180px">
      <canvas id="cAlcance" role="img" aria-label="Alcance por red">IG ${igAlcance} · TK ${tkAlcance} · FB ${fbAlcance}</canvas>
    </div>
  </div>
  <div class="chart-card">
    <div class="chart-title">Interacciones por red</div>
    <div class="chart-subtitle">Likes, comentarios y compartidos</div>
    <div class="legend-row">
      <div class="legend-item"><div class="legend-dot" style="background:#0d6e63"></div>Instagram</div>
      <div class="legend-item"><div class="legend-dot" style="background:#6D28D9"></div>TikTok</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Facebook</div>
    </div>
    <div style="position:relative;width:100%;height:180px">
      <canvas id="cInter" role="img" aria-label="Interacciones por red">IG ${ig.interacciones||0} · TK ${tk.interacciones||0} · FB ${fb.interacciones||0}</canvas>
    </div>
  </div>
  <div class="chart-card full">
    <div class="chart-title">Distribución del alcance total — ${totalAlcance.toLocaleString()} personas alcanzadas</div>
    <div class="chart-subtitle">Participación de cada red en el alcance mensual</div>
    <div style="display:grid;grid-template-columns:180px 1fr;gap:1.5rem;align-items:center">
      <div style="position:relative;width:180px;height:180px">
        <canvas id="cDonut" role="img" aria-label="Distribución alcance">IG ${igPct}% · TK ${tkPct}% · FB ${fbPct}%</canvas>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:500">📸 Instagram</span>
            <span style="font-size:13px;font-weight:600;color:#0d6e63">${igPct}% · ${igAlcance.toLocaleString()}</span>
          </div>
          <div style="background:var(--mist);border-radius:99px;height:7px;overflow:hidden"><div style="background:#0d6e63;height:100%;width:${igPct}%;border-radius:99px"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:500">🎵 TikTok</span>
            <span style="font-size:13px;font-weight:600;color:#6D28D9">${tkPct}% · ${tkAlcance.toLocaleString()}</span>
          </div>
          <div style="background:var(--mist);border-radius:99px;height:7px;overflow:hidden"><div style="background:#6D28D9;height:100%;width:${tkPct}%;border-radius:99px"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:13px;font-weight:500">📘 Facebook</span>
            <span style="font-size:13px;font-weight:600;color:#2563EB">${fbPct}% · ${fbAlcance.toLocaleString()}</span>
          </div>
          <div style="background:var(--mist);border-radius:99px;height:7px;overflow:hidden"><div style="background:#2563EB;height:100%;width:${fbPct}%;border-radius:99px"></div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<p class="section-label">Análisis por red social</p>
<div class="insights-stack">
  <div class="insight-card">
    <div class="insight-icon-wrap" style="background:${igBg}">📸</div>
    <div>
      <div class="insight-head-row">
        <span class="insight-red-name">Instagram</span>
        <span class="insight-status" style="background:${igBg};color:${igColor}">${igStatus}</span>
      </div>
      <div class="insight-highlights">
        <div class="insight-stat"><div class="insight-stat-val">${igAlcance.toLocaleString()}</div><div class="insight-stat-lbl">alcance</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${ig.interacciones||0}</div><div class="insight-stat-lbl">interacciones</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">+${igGanados}</div><div class="insight-stat-lbl">seguidores</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${igEng}%</div><div class="insight-stat-lbl">engagement</div></div>
      </div>
      ${ig.mejorPost ? `<div class="best-post"><strong>Mejor contenido del mes</strong>${escHtml(ig.mejorPost)}</div>` : ''}
      ${ig.peorPost  ? `<div class="warn-post"><strong>Área de mejora</strong>${escHtml(ig.peorPost)}</div>`  : ''}
    </div>
  </div>
  <div class="insight-card">
    <div class="insight-icon-wrap" style="background:${tkBg}">🎵</div>
    <div>
      <div class="insight-head-row">
        <span class="insight-red-name">TikTok</span>
        <span class="insight-status" style="background:${tkBg};color:${tkColor}">${tkStatus}</span>
      </div>
      <div class="insight-highlights">
        <div class="insight-stat"><div class="insight-stat-val">${tkAlcance.toLocaleString()}</div><div class="insight-stat-lbl">alcance</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${tk.interacciones||0}</div><div class="insight-stat-lbl">interacciones</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">+${tkGanados}</div><div class="insight-stat-lbl">seguidores</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${tkEng}%</div><div class="insight-stat-lbl">engagement</div></div>
      </div>
      ${tk.mejorPost ? `<div class="best-post"><strong>Mejor contenido del mes</strong>${escHtml(tk.mejorPost)}</div>` : ''}
      ${tk.peorPost  ? `<div class="warn-post"><strong>Área de mejora</strong>${escHtml(tk.peorPost)}</div>`  : ''}
    </div>
  </div>
  <div class="insight-card">
    <div class="insight-icon-wrap" style="background:${fbBg}">📘</div>
    <div>
      <div class="insight-head-row">
        <span class="insight-red-name">Facebook</span>
        <span class="insight-status" style="background:${fbBg};color:${fbColor}">${fbStatus}</span>
      </div>
      <div class="insight-highlights">
        <div class="insight-stat"><div class="insight-stat-val">${fbAlcance.toLocaleString()}</div><div class="insight-stat-lbl">alcance</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${fb.interacciones||0}</div><div class="insight-stat-lbl">interacciones</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">+${fbGanados}</div><div class="insight-stat-lbl">seguidores</div></div>
        <div class="insight-divider"></div>
        <div class="insight-stat"><div class="insight-stat-val">${fbEng}%</div><div class="insight-stat-lbl">engagement</div></div>
      </div>
      ${fb.mejorPost ? `<div class="best-post"><strong>Mejor contenido del mes</strong>${escHtml(fb.mejorPost)}</div>` : ''}
      ${fb.peorPost  ? `<div class="warn-post"><strong>Área de mejora</strong>${escHtml(fb.peorPost)}</div>`  : ''}
    </div>
  </div>
</div>

${cierre.observacion ? `
<p class="section-label">Contexto del mes</p>
<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:1rem 1.4rem;font-size:13px;color:#4a5568;line-height:1.7;border-left:4px solid var(--gold)">
  ${escHtml(cierre.observacion)}
</div>` : ''}

<div class="conclusion-card">
  <div class="conclusion-eyebrow">Conclusión ejecutiva · ${mes} ${año}</div>
  <div class="conclusion-title">${canalLider} lideró con ${canalLiderAlcance} personas alcanzadas</div>
  <div class="conclusion-body">
    El mes de ${mes} generó un alcance total de ${totalAlcance.toLocaleString()} personas en tres canales simultáneos con ${totalInter.toLocaleString()} interacciones.
    ${canalLider} fue el canal de mayor rendimiento con ${canalLider === 'Instagram' ? igPct : canalLider === 'TikTok' ? tkPct : fbPct}% del alcance total.
    El engagement promedio fue de ${totalAlcance > 0 ? ((totalInter/totalAlcance)*100).toFixed(1) : 0}%, con ${engArr[0].red} liderando en tasa de interacción (${engArr[0].eng}%).
    ${cierre.observacion ? 'Nota de contexto: ' + cierre.observacion : ''}
  </div>
  <div class="conclusion-recos">
    <div class="reco-item">
      <div class="reco-red">📸 Instagram</div>
      <div class="reco-text">Engagement ${igEng}%. ${parseFloat(igEng) >= 3 ? 'Mantener formato y frecuencia — está funcionando.' : 'Reforzar hooks en primeras 2 líneas. Priorizar contenido de producto con CTA claro.'}</div>
    </div>
    <div class="reco-item">
      <div class="reco-red">🎵 TikTok</div>
      <div class="reco-text">Engagement ${tkEng}%. ${parseFloat(tkEng) >= 2.5 ? 'Canal en ascenso — mantener formato de descubrimiento local y aumentar frecuencia.' : 'Probar distintos ganchos. El formato de presentación de tienda demostró funcionar.'}</div>
    </div>
    <div class="reco-item">
      <div class="reco-red">📘 Facebook</div>
      <div class="reco-text">Engagement ${fbEng}%. ${parseFloat(fbEng) >= 2 ? 'Mantener contenido conversacional con preguntas directas.' : 'Reducir contenido estático. Priorizar video y contenido cultural sobre informativo.'}</div>
    </div>
  </div>
</div>

<div class="report-footer">
  <span>SYNKRO Agencia Digital</span>
  <div class="footer-sep"></div>
  <span>Querétaro, México</span>
  <div class="footer-sep"></div>
  <span>Reporte generado el ${fechaGen}</span>
  <div class="footer-sep"></div>
  <span>Datos verificados: Firebase</span>
</div>

</div>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
<script>
const t='#0d6e63',p='#6D28D9',b='#2563EB';
new Chart(document.getElementById('cAlcance'),{type:'bar',data:{labels:['Instagram','TikTok','Facebook'],datasets:[{data:[${igAlcance},${tkAlcance},${fbAlcance}],backgroundColor:[t,p,b],borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:11}},beginAtZero:true}}}});
new Chart(document.getElementById('cInter'),{type:'bar',data:{labels:['Instagram','TikTok','Facebook'],datasets:[{data:[${ig.interacciones||0},${tk.interacciones||0},${fb.interacciones||0}],backgroundColor:[t,p,b],borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:11}},beginAtZero:true}}}});
new Chart(document.getElementById('cDonut'),{type:'doughnut',data:{labels:['Instagram','TikTok','Facebook'],datasets:[{data:[${igAlcance},${tkAlcance},${fbAlcance}],backgroundColor:[t,p,b],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{display:false}}}});
</script>
</body>
</html>`;

  // Descargar el reporte como archivo HTML
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte-${slug}-${mes.toLowerCase()}-${año}.html`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Reporte descargado — ábrelo en Chrome para ver y compartir', 'success');
}

async function fetchTodosCierres(slug) {
  try {
    const ref = firebase.database().ref(`clientes/${slug}/cierres`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    const mesesOrden = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const cierres = Object.entries(data).map(([key, val]) => {
      const partes = key.split('-');
      const mesNombre = partes[0];
      const anio = parseInt(partes[1]) || new Date().getFullYear();
      const mesIdx = mesesOrden.indexOf(mesNombre);
      return { key, mes: mesNombre, anio, mesIdx, ...val };
    });
    cierres.sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mesIdx - b.mesIdx);
    return cierres;
  } catch (e) {
    console.warn('[Synkro] fetchTodosCierres error:', e);
    return [];
  }
}

async function fetchCierreMes(slug, mes, año) {
  try {
    const key  = mes.toLowerCase() + '-' + año;
    const snap = await db.ref(`clientes/${slug}/cierres/${key}`).once('value');
    return snap.val();
  } catch (e) {
    return null;
  }
}

async function checkExistingCampaign(slug, mes, año) {
  try {
    const key  = mes.toLowerCase() + '-' + año;
    const snap = await db.ref(`clientes/${slug}/historial/${key}`).once('value');
    return snap.val() || null;
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ── MÓDULO SELECTOR DE CLIENTE ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

async function loadClientList() {
  try {
    const snap = await db.ref('clientes').once('value');
    const data = snap.val();
    if (!data) return [];
    return Object.keys(data).map(slug => ({
      slug,
      nombre: data[slug].brief?.identidad?.nombre_comercial
            || data[slug].brief?.identidad?.nombre
            || slug,
    }));
  } catch (e) {
    return [];
  }
}

async function loadBriefFromFirebase(slug) {
  try {
    const snap = await db.ref(`clientes/${slug}/brief`).once('value');
    return snap.val();
  } catch (e) {
    return null;
  }
}

async function setupClientSelector() {
  const select = document.getElementById('clientSelector');
  if (!select) return;

  const clients = await loadClientList();
  select.innerHTML = '<option value="">— Seleccionar cliente existente —</option>';
  clients.forEach(c => {
    const opt = document.createElement('option');
    opt.value       = c.slug;
    opt.textContent = c.nombre;
    select.appendChild(opt);
  });

  select.addEventListener('change', async function () {
    if (!this.value) return;

    const brief = await loadBriefFromFirebase(this.value);
    if (!brief) { showToast('No se encontró el brief de este cliente', 'error'); return; }

    clientData = brief;
    renderClientPreview(brief);
    dropZone.classList.add('has-file');
    noClientWarn.classList.add('hidden');

    const historial = await fetchHistorial(brief);
    const slug = slugify(brief.identidad?.nombre_comercial || brief.identidad?.nombre || brief.negocio?.nombre || brief.nombre || '');

    if (historial && historial.length > 0) {
      showContinuityCard();
      const MESES     = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const mesActual = document.getElementById('fMes')?.value || '';
      const idx       = MESES.indexOf(mesActual.toLowerCase());
      const mesAnterior = idx > 0 ? MESES[idx - 1] : MESES[11];
      const añoCierre   = idx > 0 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      const cierre    = await fetchCierreMes(slug, mesAnterior, añoCierre);
      updateCierreIndicator(cierre, mesAnterior);
    }

    // Pre-llenar campos del mes seleccionado si hay datos guardados
    const mesActualInicial = document.getElementById('fMes')?.value || '';
    if (mesActualInicial) prefillMonthData(slug, mesActualInicial);

    // Listener: cuando cambia el mes, volver a buscar datos
    const fMesEl = document.getElementById('fMes');
    if (fMesEl && !fMesEl.dataset.prefillBound) {
      fMesEl.dataset.prefillBound = '1';
      fMesEl.addEventListener('change', function () {
        const currentSlug = slugify(
          clientData?.identidad?.nombre_comercial ||
          clientData?.identidad?.nombre ||
          clientData?.negocio?.nombre ||
          clientData?.nombre || ''
        );
        if (currentSlug && this.value) prefillMonthData(currentSlug, this.value);
      });
    }

    currentClientSlug = slug;
    const btnReportes = document.getElementById('btnReportesHistoricos');
    if (btnReportes) btnReportes.style.display = 'inline-flex';

    showToast('Cliente cargado: ' + (brief.identidad?.nombre_comercial || brief.identidad?.nombre || this.value), 'success');
  });
}

async function prefillMonthData(slug, mes) {
  if (!slug || !mes) return;
  try {
    const key  = mes.toLowerCase() + '-' + new Date().getFullYear();
    const snap = await db.ref(`clientes/${slug}/historial/${key}`).once('value');
    const h    = snap.val();
    if (!h) return;

    const fServicio  = document.getElementById('fServicio');
    const fPromocion = document.getElementById('fPromocion');
    const fFecha     = document.getElementById('fFecha');
    const fObjecion  = document.getElementById('fObjecion');
    const fPregunta  = document.getElementById('fPregunta');
    const fNota      = document.getElementById('fNota');

    if (fServicio  && h.servicio)  fServicio.value  = h.servicio;
    if (fPromocion && h.promocion) fPromocion.value = h.promocion;
    if (fFecha     && h.fecha)     fFecha.value     = h.fecha;
    if (fObjecion  && h.objecion)  fObjecion.value  = h.objecion;
    if (fPregunta  && h.pregunta)  fPregunta.value  = h.pregunta;
    if (fNota      && h.nota)      fNota.value      = h.nota;

    showToast('Datos de mes anterior cargados', 'info');
  } catch (e) {
    console.warn('[Synkro] prefillMonthData error:', e.message);
  }
}

function updateCierreIndicator(cierre, mesAnterior) {
  const indicator = document.getElementById('cierreIndicator');
  if (!indicator) return;
  const mes = mesAnterior.charAt(0).toUpperCase() + mesAnterior.slice(1);
  if (cierre) {
    indicator.innerHTML = `✅ Cierre de ${mes} cargado — métricas incluidas en el prompt`;
    indicator.className = 'cierre-indicator cierre-ok';
  } else {
    indicator.innerHTML = `⚠️ Sin cierre de ${mes} — puedes guardarlo en 📊 Cierre de Mes o continuar sin métricas`;
    indicator.className = 'cierre-indicator cierre-warn';
  }
  indicator.classList.remove('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO TOP-UP — Upgrade inteligente de paquete
// ─────────────────────────────────────────────────────────────────────────────

function showUpgradeModal(fromPkg, toPkg) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById('upgradeModalBackdrop');
    if (!backdrop) { resolve(null); return; }

    const fromEl = document.getElementById('upgradePkgFrom');
    const toEl   = document.getElementById('upgradePkgTo');
    if (fromEl) fromEl.textContent = fromPkg.charAt(0).toUpperCase() + fromPkg.slice(1);
    if (toEl)   toEl.textContent   = toPkg.charAt(0).toUpperCase() + toPkg.slice(1);

    backdrop.classList.add('open');

    const fullBtn      = document.getElementById('upgradeFullBtn');
    const topupBtn     = document.getElementById('upgradeTopupBtn');
    const cancelBtn    = document.getElementById('upgradeCancelBtn');
    const cancelBtnAlt = document.getElementById('upgradeCancelBtnAlt');

    function onFull()   { cleanup(); resolve('full'); }
    function onTopup()  { cleanup(); resolve('topup'); }
    function onCancel() { cleanup(); resolve(null); }

    function cleanup() {
      backdrop.classList.remove('open');
      if (fullBtn)      fullBtn.removeEventListener('click', onFull);
      if (topupBtn)     topupBtn.removeEventListener('click', onTopup);
      if (cancelBtn)    cancelBtn.removeEventListener('click', onCancel);
      if (cancelBtnAlt) cancelBtnAlt.removeEventListener('click', onCancel);
    }

    if (fullBtn)      fullBtn.addEventListener('click', onFull);
    if (topupBtn)     topupBtn.addEventListener('click', onTopup);
    if (cancelBtn)    cancelBtn.addEventListener('click', onCancel);
    if (cancelBtnAlt) cancelBtnAlt.addEventListener('click', onCancel);
  });
}

async function generateTopUp(clientData, existingCampaign, fromPkg, toPkg) {
  const apiKey = document.getElementById('apiKeyInput')?.value?.trim();
  if (!apiKey) { showToast('Falta API Key', 'error'); return; }

  setLoading(true, 'TOP-UP — calculando diferencia de piezas…');

  try {
    const pkg      = toPkg;
    const prompts  = PACKAGE_PROMPTS[pkg];
    const month    = getMonthData();
    const continuity = getContinuityData();

    const PKG_POSTS = { starter: 8, profesional: 16, premium: 20 };
    const extraPosts = (PKG_POSTS[toPkg] || 0) - (PKG_POSTS[fromPkg] || 0);

    if (extraPosts <= 0) {
      showToast('No hay piezas adicionales que generar', 'info');
      setLoading(false);
      return;
    }

    // Reutilizar maestro del historial o regenerarlo
    setLoading(true, 'TOP-UP 1/4 — Contexto maestro…');
    const historial  = await fetchHistorial(clientData);
    const clientSlug = slugify(clientData?.identidad?.nombre_comercial || clientData?.identidad?.nombre || clientData?.negocio?.nombre || clientData?.nombre || '');
    const MESES          = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const mesAnteriorIdx = MESES.indexOf(month.mes.toLowerCase());
    const mesAnterior    = mesAnteriorIdx > 0 ? MESES[mesAnteriorIdx - 1] : 'diciembre';
    const añoCierre      = mesAnteriorIdx > 0 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const cierreMesAnterior = await fetchCierreMes(clientSlug, mesAnterior, añoCierre);

    const maestroRaw  = await callClaude(apiKey, buildMaestroPrompt(clientData, month, historial, continuity, cierreMesAnterior), 2048);
    const maestroText = maestroRaw.content[0].text;
    const maestro     = extractJson(maestroText) || { resumen: maestroText };

    // Posts existentes del historial
    const existingPosts = existingCampaign?.posts || null;

    // Generar posts adicionales
    setLoading(true, `TOP-UP 2/4 — Generando ${extraPosts} posts adicionales…`);
    const topUpPostsRaw  = await callClaude(apiKey, buildTopUpPostsPrompt(clientData, month, maestro, extraPosts, existingPosts, toPkg), 16000);
    const topUpPostsText = topUpPostsRaw.content[0].text;
    const newPosts       = parsePostsFromDelimiters(topUpPostsText);

    // Merge con posts existentes
    const mergedPosts = {
      instagram: [...(existingPosts?.instagram || []), ...(newPosts?.instagram || [])],
      facebook:  [...(existingPosts?.facebook  || []), ...(newPosts?.facebook  || [])],
      tiktok:    [...(existingPosts?.tiktok    || []), ...(newPosts?.tiktok    || [])],
    };

    const campaignData = {
      ...existingCampaign,
      _package: toPkg,
      maestro,
      posts: mergedPosts,
    };

    // Prompts extra del paquete superior (estrategia, reel, etc.)
    const fromPrompts = PACKAGE_PROMPTS[fromPkg] || [];
    const toPrompts   = PACKAGE_PROMPTS[toPkg]   || [];
    const extraPrompts = toPrompts.filter(p => !fromPrompts.includes(p) && p !== 'maestro' && p !== 'posts');

    const extraTotal = extraPrompts.length;
    for (let i = 0; i < extraPrompts.length; i++) {
      const pName = extraPrompts[i];
      setLoading(true, `TOP-UP ${i + 3}/${extraTotal + 2} — ${PROMPT_LABELS[pName] || pName}…`);
      const raw = await callClaude(
        apiKey,
        buildPromptFor(pName, clientData, month, campaignData),
        pName === 'calendarioPublicacion' ? 8192 : 4096
      );
      campaignData[pName] = extractJson(raw.content[0].text);
    }

    campaignData._clientSlug = clientSlug;
    campaignData._mes = (month.mes || 'mes').toLowerCase();

    renderCampaign(campaignData);
    generateCampaignExports(campaignData);
    if (campaignData.posts) setupApprovalButton();
    showToast(`✦ TOP-UP completado — ${fromPkg} → ${toPkg} con ${extraPosts} posts nuevos`, 'success');

  } catch (err) {
    console.error(err);
    showToast(`Error TOP-UP: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

function buildTopUpPostsPrompt(client, month, maestro, extraPosts, existingPosts, pkg) {
  const id  = client?.identidad  || {};
  const neg = client?.negocio    || {};
  const aud = client?.audiencia  || {};
  const voz = client?.voz_tono   || {};

  const nombre   = id.nombre_comercial || id.nombre || neg.nombre || 'la marca';
  const sector   = neg.sector || neg.industria || '';
  const tono     = voz.tono || voz.personalidad || '';
  const publico  = aud.descripcion || aud.perfil || '';

  const maestroStr = typeof maestro === 'string' ? maestro : JSON.stringify(maestro, null, 2);

  let existingStr = '';
  if (existingPosts) {
    const sample = [
      ...(existingPosts.instagram || []).slice(0, 3).map((p, i) => `IG${i+1}: ${p.texto?.substring(0, 80)}…`),
      ...(existingPosts.facebook  || []).slice(0, 2).map((p, i) => `FB${i+1}: ${p.texto?.substring(0, 80)}…`),
      ...(existingPosts.tiktok    || []).slice(0, 2).map((p, i) => `TK${i+1}: ${p.texto?.substring(0, 80)}…`),
    ].join('\n');
    existingStr = `\n## POSTS YA EXISTENTES (no repetir temas)\n${sample}\n`;
  }

  return `Eres el estratega de contenido de ${nombre}.
${sector ? `Sector: ${sector}` : ''}
${tono ? `Tono: ${tono}` : ''}
${publico ? `Público: ${publico}` : ''}

## CONTEXTO ESTRATÉGICO DEL MES
${maestroStr}
${existingStr}
## TAREA
Genera EXACTAMENTE ${extraPosts} posts ADICIONALES para completar el paquete ${pkg.toUpperCase()}.
Estos posts deben complementar los existentes sin repetir temas, ángulos ni formatos ya usados.
Distribuye los ${extraPosts} posts así según el paquete:
- Si hay posts de IG, FB y TK, genera proporciones similares a las existentes
- Prioriza variedad: educativo, entretenimiento, testimonio, oferta, behind the scenes

Usa los siguientes delimitadores EXACTOS — sin texto adicional fuera de ellos:

POST_IG_N: [texto del post para Instagram]
HASHTAGS_IG_N: [hashtags IG separados por espacio]
POST_FB_N: [texto del post para Facebook]
POST_TK_N: [texto/guión del post para TikTok]
HASHTAGS_TK_N: [hashtags TK separados por espacio]

Donde N es el número del post CONTINUANDO desde donde quedaron los existentes.
Genera los ${extraPosts} posts completos ahora.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO REPORTES HISTÓRICOS
// ─────────────────────────────────────────────────────────────────────────────

async function generarReporteHistorico(slug, mes, anio) {
  const ref = firebase.database().ref(`clientes/${slug}/cierres/${mes}-${anio}`);
  const snapshot = await ref.once('value');
  if (!snapshot.exists()) {
    alert(`No hay cierre guardado para ${mes} ${anio} de este cliente.`);
    return;
  }
  const cierre = snapshot.val();
  let nombreCliente = slug;
  try {
    const briefSnap = await firebase.database().ref(`clientes/${slug}/brief`).once('value');
    if (briefSnap.exists()) {
      nombreCliente = briefSnap.val().identidad?.nombre_comercial || slug;
    }
  } catch(e) {}
  generarReporteHTML({ ...cierre, _clientSlug: slug, _nombreCliente: nombreCliente, _mes: mes, _anio: anio });
}

async function generarReporteAcumulado(slug, mesInicio, anioInicio, mesFin, anioFin) {
  const todosCierres = await fetchTodosCierres(slug);
  const mesesOrden = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const idxInicio = anioInicio * 12 + mesesOrden.indexOf(mesInicio);
  const idxFin    = anioFin   * 12 + mesesOrden.indexOf(mesFin);

  const cierresFiltrados = todosCierres.filter(c => {
    const idx = c.anio * 12 + c.mesIdx;
    return idx >= idxInicio && idx <= idxFin;
  });

  if (cierresFiltrados.length === 0) {
    alert('No hay datos guardados en ese periodo.');
    return;
  }

  let nombreCliente = slug;
  try {
    const briefSnap = await firebase.database().ref(`clientes/${slug}/brief`).once('value');
    if (briefSnap.exists()) nombreCliente = briefSnap.val().identidad?.nombre_comercial || slug;
  } catch(e) {}

  const redes = ['ig', 'fb', 'tk'];
  const nombresRedes = { ig: 'Instagram', fb: 'Facebook', tk: 'TikTok' };

  const totales = {};
  redes.forEach(red => {
    totales[red] = { alcanceTotal: 0, interaccionesTotal: 0, seguidoresGanados: 0, mesesConDatos: 0 };
  });

  const redKM2 = { ig: 'instagram', fb: 'facebook', tk: 'tiktok' };
  cierresFiltrados.forEach(c => {
    redes.forEach(red => {
      const rd = c[redKM2[red]] || {};
      const alcance = parseInt(rd.alcance) || 0;
      const ini = parseInt(rd.seguidoresInicio) || 1;
      const fin = parseInt(rd.seguidoresFin) || 0;
      const interacciones = parseInt(rd.interacciones) || 0;
      if (alcance > 0) {
        totales[red].alcanceTotal += alcance;
        totales[red].interaccionesTotal += interacciones;
        totales[red].seguidoresGanados += (fin - ini);
        totales[red].mesesConDatos++;
      }
    });
  });

  const periodoLabel = `${mesInicio} ${anioInicio} — ${mesFin} ${anioFin}`;
  const alcanceGlobalTotal  = redes.reduce((s, r) => s + totales[r].alcanceTotal, 0);
  const interaccionesGlobal = redes.reduce((s, r) => s + totales[r].interaccionesTotal, 0);
  const seguidoresGlobal    = redes.reduce((s, r) => s + totales[r].seguidoresGanados, 0);
  const canalLider = [...redes].sort((a, b) => totales[b].alcanceTotal - totales[a].alcanceTotal)[0];

  const labelsEvolucion = cierresFiltrados.map(c => c.mes.charAt(0).toUpperCase() + c.mes.slice(1, 3));
  const datasetsEvolucion = JSON.stringify(redes.map(red => ({
    label: nombresRedes[red],
    data: cierresFiltrados.map(c => parseInt((c[redKM2[red]] || {}).alcance) || 0),
    borderColor: red === 'ig' ? '#E1306C' : red === 'fb' ? '#0d6e63' : '#010101',
    backgroundColor: (red === 'ig' ? '#E1306C22' : red === 'fb' ? '#0d6e6322' : '#01010122'),
    tension: 0.3, fill: false, pointRadius: 4
  })));

  const tablaRedes = redes.map(red => `<tr>
    <td><strong>${nombresRedes[red]}</strong>${red === canalLider ? '<span class="tag-lider">LÍDER</span>' : ''}</td>
    <td>${totales[red].alcanceTotal.toLocaleString()}</td>
    <td>${totales[red].mesesConDatos > 0 ? Math.round(totales[red].alcanceTotal / totales[red].mesesConDatos).toLocaleString() : '—'}</td>
    <td>${totales[red].interaccionesTotal.toLocaleString()}</td>
    <td>+${totales[red].seguidoresGanados}</td>
  </tr>`).join('');

  const tablaHistorial = cierresFiltrados.map(c => {
    const igA = parseInt((c.instagram || {}).alcance) || 0;
    const fbA = parseInt((c.facebook  || {}).alcance) || 0;
    const tkA = parseInt((c.tiktok    || {}).alcance) || 0;
    return `<tr>
      <td>${c.mes.charAt(0).toUpperCase() + c.mes.slice(1)} ${c.anio}</td>
      <td>${igA.toLocaleString()}</td><td>${fbA.toLocaleString()}</td><td>${tkA.toLocaleString()}</td>
      <td><strong>${(igA+fbA+tkA).toLocaleString()}</strong></td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Acumulado — ${nombreCliente}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>
:root{--navy:#0f2847;--teal:#0d6e63;--gold:#b8860b}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#f4f6f9;color:#1a1a2e}
.header{background:var(--navy);color:white;padding:40px;text-align:center}
.header h1{font-family:'Playfair Display',serif;font-size:2rem;color:#f0c040}
.header p{opacity:.8;margin-top:8px}
.badge-periodo{display:inline-block;background:var(--teal);color:white;padding:6px 18px;border-radius:20px;font-size:.85rem;font-weight:700;margin-top:12px}
.container{max-width:900px;margin:0 auto;padding:32px 20px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
.kpi{background:white;border-radius:12px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.08);border-top:4px solid var(--teal)}
.kpi .valor{font-size:1.8rem;font-weight:700;color:var(--navy)}
.kpi .label{font-size:.78rem;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}
.card{background:white;border-radius:12px;padding:28px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.card h2{font-family:'Playfair Display',serif;color:var(--navy);margin-bottom:20px;font-size:1.2rem}
.chart-wrap{position:relative;height:260px}
table{width:100%;border-collapse:collapse;font-size:.88rem}
th{background:var(--navy);color:white;padding:10px 12px;text-align:left}
td{padding:10px 12px;border-bottom:1px solid #eee}
.tag-lider{background:var(--gold);color:white;padding:2px 10px;border-radius:10px;font-size:.75rem;font-weight:700;margin-left:8px}
.btn-print{display:block;margin:32px auto 0;padding:14px 36px;background:var(--navy);color:white;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer}
@media print{.btn-print{display:none}}
@media(max-width:600px){.kpis{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="header">
  <h1>${nombreCliente}</h1>
  <p>Reporte de Desempeño Acumulado</p>
  <span class="badge-periodo">${periodoLabel} · ${cierresFiltrados.length} meses</span>
</div>
<div class="container">
  <div class="kpis">
    <div class="kpi"><div class="valor">${(alcanceGlobalTotal/1000).toFixed(1)}K</div><div class="label">Alcance Total</div></div>
    <div class="kpi"><div class="valor">${interaccionesGlobal.toLocaleString()}</div><div class="label">Interacciones</div></div>
    <div class="kpi"><div class="valor">+${seguidoresGlobal}</div><div class="label">Seguidores Ganados</div></div>
    <div class="kpi"><div class="valor">${nombresRedes[canalLider]}</div><div class="label">Canal Líder</div></div>
  </div>
  <div class="card">
    <h2>📈 Evolución de Alcance por Red</h2>
    <div class="chart-wrap"><canvas id="chartEvolucion"></canvas></div>
  </div>
  <div class="card">
    <h2>📊 Resumen por Red Social</h2>
    <table>
      <tr><th>Red</th><th>Alcance total</th><th>Promedio mensual</th><th>Interacciones</th><th>Seguidores ganados</th></tr>
      ${tablaRedes}
    </table>
  </div>
  <div class="card">
    <h2>📅 Historial Mensual</h2>
    <table>
      <tr><th>Mes</th><th>IG Alcance</th><th>FB Alcance</th><th>TK Alcance</th><th>Total</th></tr>
      ${tablaHistorial}
    </table>
  </div>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</div>
<script>
new Chart(document.getElementById('chartEvolucion'),{
  type:'line',
  data:{labels:${JSON.stringify(labelsEvolucion)},datasets:${datasetsEvolucion}},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},
    scales:{y:{beginAtZero:true,ticks:{callback:v=>v>=1000?(v/1000).toFixed(1)+'K':v}}}}
});
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte-acumulado-${slug}-${mesInicio}${anioInicio}-${mesFin}${anioFin}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Funciones del modal de Reportes Históricos ─────────────────────────────

async function abrirModalReportes() {
  const slug = currentClientSlug;
  if (!slug) { alert('Selecciona un cliente primero.'); return; }

  document.getElementById('reportesModalBackdrop').style.display = 'block';
  document.getElementById('reportesClienteNombre').textContent = slug;

  try {
    const cierres = await fetchTodosCierres(slug);
    const wrap = document.getElementById('mesesDisponiblesWrap');
    const list = document.getElementById('mesesDisponiblesList');
    if (cierres.length > 0) {
      wrap.style.display = 'block';
      list.innerHTML = cierres.map(c =>
        `✅ ${c.mes.charAt(0).toUpperCase() + c.mes.slice(1)} ${c.anio}`
      ).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
    } else {
      wrap.style.display = 'none';
    }
  } catch(e) {}
}

function cerrarModalReportes() {
  document.getElementById('reportesModalBackdrop').style.display = 'none';
}

async function ejecutarReporteMes() {
  const slug = currentClientSlug;
  const mes  = document.getElementById('reporteMesSelect').value;
  const anio = document.getElementById('reporteAnioSelect').value;
  if (!slug) { alert('Selecciona un cliente primero.'); return; }
  await generarReporteHistorico(slug, mes, anio);
}

async function ejecutarReporteAcumulado() {
  const slug   = currentClientSlug;
  const desdeM = document.getElementById('acumDesde').value;
  const desdeA = parseInt(document.getElementById('acumDesdeAnio').value);
  const hastaM = document.getElementById('acumHasta').value;
  const hastaA = parseInt(document.getElementById('acumHastaAnio').value);
  if (!slug) { alert('Selecciona un cliente primero.'); return; }
  await generarReporteAcumulado(slug, desdeM, desdeA, hastaM, hastaA);
}

// ── Reimportar campaña desde JSON ─────────────────────────────────────────
function reimportarCampana() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.posts || (!data.posts.instagram && !data.posts.facebook && !data.posts.tiktok)) {
          showToast('JSON inválido — no contiene posts', 'error'); return;
        }
        const code = generateApprovalCode();
        currentCampaignCode = code;
        const clientName = (data.maestro && data._clientSlug) ? data._clientSlug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Cliente';
        const mes = data._mes || 'Sin mes';
        const approvals = {};
        ['instagram','facebook','tiktok'].forEach(net => {
          (data.posts[net] || []).forEach((_,idx) => {
            approvals[`${net}_${idx}`] = { status:'pending', comment:'' };
          });
        });
        const payload = {
          code, createdAt: Date.now(), clientName, mes,
          servicio: '', packageType: data._package || 'starter',
          posts: { instagram: data.posts.instagram||[], facebook: data.posts.facebook||[], tiktok: data.posts.tiktok||[] },
          fichaProduccion: data.fichaProduccion || null,
          approvals, lastUpdated: Date.now()
        };
        db.ref('campaigns/' + code).set(payload)
          .then(() => {
            if (!document.getElementById('approvalPanel')) {
              const grid = document.getElementById('outputGrid') || document.body;
              const panel = document.createElement('div');
              panel.id = 'approvalPanel';
              panel.style.cssText = 'grid-column:1/-1;margin-top:8px;';
              grid.appendChild(panel);
            }
            showApprovalLinkPanel(code);
            showToast('✓ Campaña reimportada — código: ' + code, 'success');
          })
          .catch(err => showToast('Error: ' + err.message, 'error'));
      } catch(err) {
        showToast('Error al leer el JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
