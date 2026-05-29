// ============================================================
// MÓDULO C — buildIntelSection con visión histórica completa
// Reemplaza la función buildIntelSection() existente en app.js
// También agrega fetchTodosCierres() como función de soporte
// ============================================================

// PASO 1: Nueva función de soporte — lee TODOS los cierres de un cliente desde Firebase
async function fetchTodosCierres(slug) {
  try {
    const ref = firebase.database().ref(`clientes/${slug}/cierres`);
    const snapshot = await ref.once('value');
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    // Convertir objeto de Firebase a array ordenado cronológicamente
    const mesesOrden = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const cierres = Object.entries(data).map(([key, val]) => {
      const partes = key.split('-'); // formato: mayo-2026
      const mesNombre = partes[0];
      const anio = parseInt(partes[1]) || 2026;
      const mesIdx = mesesOrden.indexOf(mesNombre);
      return { key, mes: mesNombre, anio, mesIdx, ...val };
    });
    cierres.sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mesIdx - b.mesIdx);
    return cierres;
  } catch (e) {
    console.warn('fetchTodosCierres error:', e);
    return [];
  }
}

// PASO 2: Reemplaza buildIntelSection() completa en app.js
// Busca la función buildIntelSection y reemplázala por esta:
function buildIntelSection(cierreMes, todosCierres) {
  // todosCierres: array de todos los cierres históricos (puede estar vacío)
  // cierreMes: el cierre del mes inmediato anterior (puede ser null)

  let seccion = `## INTELIGENCIA ESTRATÉGICA DEL CLIENTE\n`;
  seccion += `> Esta sección tiene MÁXIMA PRECEDENCIA. Todas las decisiones de formato, canal y tipo de contenido deben basarse en estos datos reales antes que en cualquier suposición genérica.\n\n`;

  // ── BLOQUE 1: Análisis histórico acumulado (si hay 2+ cierres) ──
  if (todosCierres && todosCierres.length >= 2) {
    seccion += `### Patrones históricos (${todosCierres.length} meses de datos)\n\n`;

    // Calcular promedios y tendencias por red
    const redes = ['ig', 'fb', 'tk'];
    const nombresRedes = { ig: 'Instagram', fb: 'Facebook', tk: 'TikTok' };
    const stats = {};

    redes.forEach(red => {
      const valores = todosCierres
        .map(c => {
          const alcance = parseInt(c[`${red}_alcance`]) || 0;
          const ini = parseInt(c[`${red}_seg_inicio`]) || 0;
          const fin = parseInt(c[`${red}_seg_fin`]) || 0;
          const interacciones = parseInt(c[`${red}_interacciones`]) || 0;
          const engagement = ini > 0 ? ((interacciones / ini) * 100) : 0;
          return { alcance, seguidores: fin - ini, engagement, interacciones };
        })
        .filter(v => v.alcance > 0);

      if (valores.length === 0) { stats[red] = null; return; }

      const promedioAlcance = Math.round(valores.reduce((s, v) => s + v.alcance, 0) / valores.length);
      const promedioEngagement = (valores.reduce((s, v) => s + v.engagement, 0) / valores.length).toFixed(1);
      const totalSeguidores = valores.reduce((s, v) => s + v.seguidores, 0);

      // Tendencia: comparar primer mitad vs segunda mitad
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

    // Tabla resumen histórico
    seccion += `| Red | Alcance promedio | Engagement promedio | Seguidores ganados (total) | Tendencia |\n`;
    seccion += `|-----|-----------------|--------------------|--------------------------|-----------|\n`;
    redes.forEach(red => {
      if (stats[red]) {
        const s = stats[red];
        seccion += `| ${nombresRedes[red]} | ${s.promedioAlcance.toLocaleString()} | ${s.promedioEngagement}% | +${s.totalSeguidores} | ${s.tendencia} |\n`;
      }
    });
    seccion += `\n`;

    // Canal históricamente dominante
    const canalDominante = redes
      .filter(r => stats[r])
      .sort((a, b) => stats[b].promedioAlcance - stats[a].promedioAlcance)[0];
    if (canalDominante) {
      seccion += `**Canal históricamente dominante:** ${nombresRedes[canalDominante]} (consistente en ${stats[canalDominante].meses} meses)\n\n`;
    }

    // Canal con mejor engagement histórico
    const canalEngagement = redes
      .filter(r => stats[r])
      .sort((a, b) => parseFloat(stats[b].promedioEngagement) - parseFloat(stats[a].promedioEngagement))[0];
    if (canalEngagement && canalEngagement !== canalDominante) {
      seccion += `**Canal con mejor engagement histórico:** ${nombresRedes[canalEngagement]} (${stats[canalEngagement].promedioEngagement}% promedio) — replicar formatos que generan interacción aquí.\n\n`;
    }

    // Mejores posts recurrentes por red
    const mejoresPostsHistoricos = {};
    redes.forEach(red => {
      const posts = todosCierres
        .map(c => c[`${red}_mejor_post`])
        .filter(p => p && p.trim().length > 0);
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

    // Instrucciones estratégicas derivadas del histórico
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

    const metricas = {};
    redes.forEach(red => {
      const alcance = parseInt(cierreMes[`${red}_alcance`]) || 0;
      const ini = parseInt(cierreMes[`${red}_seg_inicio`]) || 1;
      const fin = parseInt(cierreMes[`${red}_seg_fin`]) || 0;
      const interacciones = parseInt(cierreMes[`${red}_interacciones`]) || 0;
      const engagement = parseFloat(((interacciones / ini) * 100).toFixed(1));
      metricas[red] = { alcance, seguidores: fin - ini, engagement, interacciones };
      if (alcance > maxAlcance) { maxAlcance = alcance; canalLider = nombresRedes[red]; }
      if (engagement > maxEngagement) { maxEngagement = engagement; canalEngagementLider = nombresRedes[red]; }
    });

    seccion += `| Red | Alcance | Engagement | Seguidores ganados | Mejor post | Peor post |\n`;
    seccion += `|-----|---------|------------|-------------------|------------|----------|\n`;
    redes.forEach(red => {
      const m = metricas[red];
      const mejor = cierreMes[`${red}_mejor_post`] || '—';
      const peor = cierreMes[`${red}_peor_post`] || '—';
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
      const mejor = cierreMes[`${red}_mejor_post`];
      if (mejor && mejor.trim()) {
        seccion += `${n++}. ${nombresRedes[red]} — replicar estructura del mejor post: "${mejor}".\n`;
      }
    });
    redes.forEach(red => {
      const peor = cierreMes[`${red}_peor_post`];
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

// ============================================================
// MÓDULO A — Generador de reporte de cualquier mes
// Agregar como función nueva en app.js (no reemplaza nada)
// También agregar el botón y modal en index.html
// ============================================================

async function generarReporteHistorico(slug, mes, anio) {
  const ref = firebase.database().ref(`clientes/${slug}/cierres/${mes}-${anio}`);
  const snapshot = await ref.once('value');
  if (!snapshot.exists()) {
    alert(`No hay cierre guardado para ${mes} ${anio} de este cliente.`);
    return;
  }
  const cierre = snapshot.val();
  // Obtener nombre del cliente desde brief
  let nombreCliente = slug;
  try {
    const briefSnap = await firebase.database().ref(`clientes/${slug}/brief`).once('value');
    if (briefSnap.exists()) {
      const brief = briefSnap.val();
      nombreCliente = brief.identidad?.nombre_comercial || slug;
    }
  } catch(e) {}
  // Reutilizar generarReporteHTML existente pasando los datos del cierre histórico
  generarReporteHTML({ ...cierre, _clientSlug: slug, _nombreCliente: nombreCliente, _mes: mes, _anio: anio });
}

// ============================================================
// MÓDULO B — Reporte acumulado por periodo
// Función nueva en app.js
// ============================================================

async function generarReporteAcumulado(slug, mesInicio, anioInicio, mesFin, anioFin) {
  const todosCierres = await fetchTodosCierres(slug);
  const mesesOrden = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const idxInicio = anioInicio * 12 + mesesOrden.indexOf(mesInicio);
  const idxFin = anioFin * 12 + mesesOrden.indexOf(mesFin);

  const cierresFiltrados = todosCierres.filter(c => {
    const idx = c.anio * 12 + c.mesIdx;
    return idx >= idxInicio && idx <= idxFin;
  });

  if (cierresFiltrados.length === 0) {
    alert('No hay datos guardados en ese periodo.');
    return;
  }

  // Obtener nombre del cliente
  let nombreCliente = slug;
  try {
    const briefSnap = await firebase.database().ref(`clientes/${slug}/brief`).once('value');
    if (briefSnap.exists()) nombreCliente = briefSnap.val().identidad?.nombre_comercial || slug;
  } catch(e) {}

  const redes = ['ig', 'fb', 'tk'];
  const nombresRedes = { ig: 'Instagram', fb: 'Facebook', tk: 'TikTok' };
  const colores = { ig: '#E1306C', fb: 'var(--teal)', tk: '#000000' };

  // Agregar totales por red
  const totales = {};
  redes.forEach(red => {
    totales[red] = {
      alcanceTotal: 0, interaccionesTotal: 0, seguidoresGanados: 0,
      mesesConDatos: 0, alcancePorMes: [], engagementPorMes: []
    };
  });

  cierresFiltrados.forEach(c => {
    redes.forEach(red => {
      const alcance = parseInt(c[`${red}_alcance`]) || 0;
      const ini = parseInt(c[`${red}_seg_inicio`]) || 1;
      const fin = parseInt(c[`${red}_seg_fin`]) || 0;
      const interacciones = parseInt(c[`${red}_interacciones`]) || 0;
      if (alcance > 0) {
        totales[red].alcanceTotal += alcance;
        totales[red].interaccionesTotal += interacciones;
        totales[red].seguidoresGanados += (fin - ini);
        totales[red].mesesConDatos++;
        totales[red].alcancePorMes.push({ mes: c.mes, valor: alcance });
        totales[red].engagementPorMes.push({ mes: c.mes, valor: parseFloat(((interacciones / ini) * 100).toFixed(1)) });
      }
    });
  });

  const periodoLabel = `${mesInicio} ${anioInicio} — ${mesFin} ${anioFin}`;
  const alcanceGlobalTotal = redes.reduce((s, r) => s + totales[r].alcanceTotal, 0);
  const interaccionesGlobal = redes.reduce((s, r) => s + totales[r].interaccionesTotal, 0);
  const seguidoresGlobal = redes.reduce((s, r) => s + totales[r].seguidoresGanados, 0);
  const canalLider = redes.sort((a, b) => totales[b].alcanceTotal - totales[a].alcanceTotal)[0];

  // Datos para gráfica de evolución mensual (líneas por red)
  const labelsEvolucion = cierresFiltrados.map(c => c.mes.charAt(0).toUpperCase() + c.mes.slice(1, 3));
  const datasetsEvolucion = redes.map(red => ({
    label: nombresRedes[red],
    data: cierresFiltrados.map(c => parseInt(c[`${red}_alcance`]) || 0),
    borderColor: colores[red],
    backgroundColor: colores[red] + '22',
    tension: 0.3, fill: false, pointRadius: 4
  }));

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reporte Acumulado — ${nombreCliente}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  :root { --navy:#0f2847; --teal:#0d6e63; --gold:#b8860b; --light:#f8f9fa; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'DM Sans',sans-serif; background:#f4f6f9; color:#1a1a2e; }
  .header { background:var(--navy); color:white; padding:40px; text-align:center; }
  .header h1 { font-family:'Playfair Display',serif; font-size:2rem; color:#f0c040; }
  .header p { opacity:.8; margin-top:8px; font-size:1rem; }
  .badge-periodo { display:inline-block; background:var(--teal); color:white; padding:6px 18px; border-radius:20px; font-size:.85rem; font-weight:700; margin-top:12px; }
  .container { max-width:900px; margin:0 auto; padding:32px 20px; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:32px; }
  .kpi { background:white; border-radius:12px; padding:20px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.08); border-top:4px solid var(--teal); }
  .kpi .valor { font-size:1.8rem; font-weight:700; color:var(--navy); }
  .kpi .label { font-size:.78rem; color:#666; margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }
  .card { background:white; border-radius:12px; padding:28px; margin-bottom:24px; box-shadow:0 2px 8px rgba(0,0,0,.08); }
  .card h2 { font-family:'Playfair Display',serif; color:var(--navy); margin-bottom:20px; font-size:1.2rem; }
  .chart-wrap { position:relative; height:260px; }
  table { width:100%; border-collapse:collapse; font-size:.88rem; }
  th { background:var(--navy); color:white; padding:10px 12px; text-align:left; }
  td { padding:10px 12px; border-bottom:1px solid #eee; }
  tr:last-child td { border:none; }
  .tag-lider { background:var(--gold); color:white; padding:2px 10px; border-radius:10px; font-size:.75rem; font-weight:700; margin-left:8px; }
  .btn-print { display:block; margin:32px auto 0; padding:14px 36px; background:var(--navy); color:white; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:700; cursor:pointer; }
  @media print { .btn-print { display:none; } }
  @media(max-width:600px) { .kpis { grid-template-columns:repeat(2,1fr); } }
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
      ${redes.map(red => `<tr>
        <td><strong>${nombresRedes[red]}</strong>${red === canalLider ? '<span class="tag-lider">LÍDER</span>' : ''}</td>
        <td>${totales[red].alcanceTotal.toLocaleString()}</td>
        <td>${totales[red].mesesConDatos > 0 ? Math.round(totales[red].alcanceTotal / totales[red].mesesConDatos).toLocaleString() : '—'}</td>
        <td>${totales[red].interaccionesTotal.toLocaleString()}</td>
        <td>+${totales[red].seguidoresGanados}</td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="card">
    <h2>📅 Historial Mensual</h2>
    <table>
      <tr><th>Mes</th><th>IG Alcance</th><th>FB Alcance</th><th>TK Alcance</th><th>Total</th></tr>
      ${cierresFiltrados.map(c => {
        const igA = parseInt(c['ig_alcance']) || 0;
        const fbA = parseInt(c['fb_alcance']) || 0;
        const tkA = parseInt(c['tk_alcance']) || 0;
        const total = igA + fbA + tkA;
        return `<tr>
          <td>${c.mes.charAt(0).toUpperCase() + c.mes.slice(1)} ${c.anio}</td>
          <td>${igA.toLocaleString()}</td><td>${fbA.toLocaleString()}</td><td>${tkA.toLocaleString()}</td>
          <td><strong>${total.toLocaleString()}</strong></td>
        </tr>`;
      }).join('')}
    </table>
  </div>

  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</div>
<script>
new Chart(document.getElementById('chartEvolucion'), {
  type: 'line',
  data: {
    labels: ${JSON.stringify(labelsEvolucion)},
    datasets: ${JSON.stringify(datasetsEvolucion)}
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(1)+'K' : v } } }
  }
});
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-acumulado-${slug}-${mesInicio}${anioInicio}-${mesFin}${anioFin}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
