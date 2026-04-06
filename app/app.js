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
  starter:     ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo'],
  profesional: ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo', 'reelEmpatia', 'botWhatsapp', 'pautaMeta'],
  premium:     ['maestro', 'posts', 'estrategiaCampana', 'calendarioPublicacion', 'reelEducativo', 'reelEmpatia', 'reelTestimonialProceso', 'botWhatsapp', 'pautaMeta', 'googleBusiness'],
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
const db = firebase.database();

// ── State ──────────────────────────────────────────────────────────────────
let clientData     = null;
let campaignData   = null;
let cachedSessions = [];

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
document.addEventListener('DOMContentLoaded', () => {
  setupDragDrop();
  setupApiKeyModal();
  setupGenerateBtn();
  initStatusSection();
  $('demoBtn').addEventListener('click', loadDemoData);

  const key = localStorage.getItem('synkro_api_key');
  if (key) {
    apiKeyBtn.style.borderColor = 'var(--teal)';
    apiKeyBtn.style.color       = 'var(--teal-xl)';
  }
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
      dropZone.classList.add('has-file');
      noClientWarn.classList.add('hidden');
      showToast('✓ Cliente cargado correctamente', 'success');
    } catch {
      showToast('Error al parsear el JSON — verifica el formato', 'error');
    }
  };
  reader.readAsText(file);
}

function renderClientPreview(data) {
  // Support both flat and nested structures (identidad/negocio/marca/paquete)
  const id   = data.identidad  || {};
  const neg  = data.negocio    || {};
  const marc = data.marca      || {};

  const name = id.nombre || neg.nombre || data.nombre || data.name
             || data.empresa || id.name || 'Cliente sin nombre';
  clientName.textContent = name;

  const tags = [];
  const addTag = v => { if (v) tags.push(String(v)); };

  const pkg = data.paquete || neg.paquete || id.paquete;
  if (pkg) addTag('Paquete: ' + pkg);

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
    const month   = getMonthData();

    setLoading(true, `Motor Synkro · Paquete ${pkg} · 0/${total}`);
    campaignData = { _package: pkg };

    // ── Prompt 1: Maestro ──────────────────────────────────────────────────
    setLoading(true, `1/${total} — ${PROMPT_LABELS.maestro}`);
    const maestroRaw  = await callClaude(apiKey, buildMaestroPrompt(clientData, month), 2048);
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
        pName === 'calendarioPublicacion' ? 8192 : pName === 'reelTestimonialProceso' ? 4096 : 3000
      );
      campaignData[pName] = extractJson(raw.content[0].text);
    }

    renderCampaign(campaignData);
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

// ── PROMPT 1: Maestro ──────────────────────────────────────────────────────
function buildMaestroPrompt(client, month) {
  return `Eres el estratega principal del Motor Synkro. Analiza en profundidad el perfil del cliente y los datos del mes para crear el BRIEF MAESTRO que guiará todos los prompts de contenido posteriores.

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

  outputSection.classList.add('visible');
  setTimeout(() => outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
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
    clientData.nombre
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
    const elapsed    = Date.now() - sess.createdAt;
    const remaining  = Math.max(0, 48 * 3600000 - elapsed);
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
            </div>`;
          }).join('')}
        </div>
      ` : ''}
      <div class="status-card-footer">
        <a href="${escHtml(getApprovalUrl(sess.code))}" target="_blank" class="btn-open-approval">Ver página del cliente ↗</a>
        <button class="btn-delete-approval" data-code="${escHtml(sess.code)}">Eliminar</button>
      </div>
    `;

    card.querySelector('.btn-delete-approval').addEventListener('click', function () {
      if (confirm(`¿Eliminar sesión de aprobación ${this.dataset.code}?`)) {
        db.ref('campaigns/' + this.dataset.code).remove()
          .catch(err => showToast('Error eliminando: ' + err.message, 'error'));
      }
    });

    container.appendChild(card);
  });
}
