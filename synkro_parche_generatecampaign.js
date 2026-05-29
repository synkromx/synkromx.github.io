// ============================================================
// PARCHE: generateCampaign() — reemplazar el bloque que
// obtiene cierreMesAnterior y llama a buildMaestroPrompt
//
// BUSCA en app.js esta sección (aprox. línea donde se calcula
// el mes anterior para el cierre):
//
//   const mesAnteriorNum = mesNum === 1 ? 12 : mesNum - 1;
//   ... fetchCierreMes(slug, mesAnteriorNombre, anioAnterior)
//   ... buildMaestroPrompt(brief, historial, continuity, cierreMesAnterior)
//
// REEMPLAZA ese bloque con este:
// ============================================================

// --- BLOQUE NUEVO para generateCampaign() ---
// Obtener mes anterior para cierre inmediato
const mesesNombres = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const mesNum = parseInt(fMes.value); // ya existe en tu código
const anioActual = parseInt(fAnio?.value || new Date().getFullYear());
const mesAnteriorNum = mesNum === 1 ? 12 : mesNum - 1;
const anioAnterior = mesNum === 1 ? anioActual - 1 : anioActual;
const mesAnteriorNombre = mesesNombres[mesAnteriorNum - 1];

// Obtener TODOS los cierres históricos + el del mes anterior
let cierreMesAnterior = null;
let todosCierresHistoricos = [];
try {
  [cierreMesAnterior, todosCierresHistoricos] = await Promise.all([
    fetchCierreMes(slug, mesAnteriorNombre, anioAnterior),
    fetchTodosCierres(slug)
  ]);
  // Excluir el mes que se va a generar y el mes anterior ya incluido en cierreMesAnterior
  // (fetchTodosCierres incluye todos los meses guardados — úsalos todos para patrones)
} catch(e) {
  console.warn('Error cargando historial de cierres:', e);
}

// Pasar ambos a buildIntelSection
const intelSection = buildIntelSection(cierreMesAnterior, todosCierresHistoricos);

// buildMaestroPrompt ahora recibe intelSection pre-construido
// Si tu buildMaestroPrompt actual recibe cierreMesAnterior directamente y llama buildIntelSection internamente,
// tienes dos opciones:
// OPCIÓN A (más limpia): pasar intelSection como string al prompt maestro directamente
// OPCIÓN B: pasar todosCierresHistoricos como nuevo parámetro a buildMaestroPrompt

// OPCIÓN A — recomendada:
// En buildMaestroPrompt, donde inyectas la sección de métricas, reemplaza la llamada
// a buildIntelSection(cierreMes) por simplemente usar el parámetro intelSection que recibes.

// Llamada actualizada:
const maestroPrompt = buildMaestroPrompt(brief, historial, continuity, intelSection);
// (intelSection ya es string Markdown listo para inyectar)

// ============================================================
// TAMBIÉN: En buildMaestroPrompt, cambiar la firma y la inyección:
//
// ANTES:
// function buildMaestroPrompt(brief, historial, continuity, cierreMes) {
//   ...
//   const intelStr = buildIntelSection(cierreMes);  // ← esta línea
//
// DESPUÉS:
// function buildMaestroPrompt(brief, historial, continuity, intelSection) {
//   ...
//   const intelStr = intelSection;  // ← ya viene construida
// ============================================================


// ============================================================
// TAMBIÉN: mostrar botón de Reportes cuando hay cliente seleccionado
// En la función donde cargas el cliente (setupClientSelector o loadBriefFromFirebase),
// agregar al final:
//
//   document.getElementById('btnReportesHistoricos').style.display = 'inline-flex';
//
// Y al limpiar/desseleccionar cliente:
//   document.getElementById('btnReportesHistoricos').style.display = 'none';
// ============================================================
