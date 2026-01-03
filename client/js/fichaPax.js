(function(){
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const fileInfo = document.getElementById('fileInfo');
  const controlsArea = document.getElementById('controlsArea');
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  const status = document.getElementById('status');
  const previewArea = document.getElementById('previewArea');
  const previewFrame = document.getElementById('previewFrame');

  let parsedRows = [];
  let grouped = []; // groups by voucher (computed after parsing)

  function preventDefaults(e){e.preventDefault();e.stopPropagation();}
  ['dragenter','dragover','dragleave','drop'].forEach(evt => dropArea.addEventListener(evt, preventDefaults));

  dropArea.addEventListener('drop', e => {
    const dt = e.dataTransfer; const files = dt.files; handleFiles(files);
  });

  fileInput.addEventListener('change', e => handleFiles(e.target.files));

  function handleFiles(files){
    if(!files || files.length===0) return;
    const file = files[0];
    fileInfo.textContent = `Archivo: ${file.name} — ${Math.round(file.size/1024)} KB`;
    parseCSVFile(file);
  }

  function parseCSVFile(file){
    status.textContent = 'Parseando...';
    Papa.parse(file, {
      header:true,
      skipEmptyLines:true,
      complete: function(results){
        parsedRows = results.data;
        grouped = groupByVoucher(parsedRows);
        status.textContent = `✅ ${grouped.length} vouchers cargados`;
        // Show search UI
        controlsArea.style.display = 'block';
        searchInput.focus();
      },
      error: function(err){ status.textContent = 'Error parseando CSV: '+err.message }
    });
  }


  function escapeHtml(s){ return s.replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"})[c]) }

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if(query.length === 0){
      searchResults.innerHTML = '<p style="color:#666">Ingrese voucher, DNI o apellido para buscar</p>';
      previewArea.style.display = 'none';
      return;
    }
    const matches = grouped.filter(g => {
      const voucherMatch = g.voucher.toLowerCase().includes(query);
      const dniMatch = (g.titular['Nro. doc.'] || g.titular['Nro doc'] || '').toString().includes(query);
      const apellidoMatch = (g.titular['Apellido y nombre'] || g.titular['Nombre'] || '').toLowerCase().includes(query);
      return voucherMatch || dniMatch || apellidoMatch;
    });
    renderSearchResults(matches, query);
  });

  function renderSearchResults(matches, query){
    if(matches.length === 0){
      searchResults.innerHTML = `<p style="color:#999">No se encontraron resultados para "${escapeHtml(query)}"</p>`;
      previewArea.style.display = 'none';
      return;
    }
    let html = `<p style="margin-bottom:12px;color:#333">Se encontraron <strong>${matches.length}</strong> resultado(s):</p>`;
    html += '<div style="display:grid;gap:12px">';
    matches.forEach((g, idx) => {
      const nombre = (g.titular['Apellido y nombre'] || g.titular['Nombre'] || 'Sin nombre').toUpperCase();
      const dni = g.titular['Nro. doc.'] || g.titular['Nro doc'] || 'Sin DNI';
      const voucher = g.voucher || 'Sin voucher';
      const habitaciones = (g.todas_habitaciones && g.todas_habitaciones.length > 0) ? g.todas_habitaciones.join(', ') : 'Sin asignar';
      const numPax = g.num_pasajeros || 1;
      html += `
        <div style="border:1px solid #ddd;padding:12px;border-radius:6px;background:#f9f9f9">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <div style="font-weight:bold;font-size:15px;margin-bottom:4px">${escapeHtml(nombre)}</div>
              <div style="font-size:13px;color:#555">Voucher: ${escapeHtml(voucher)} | DNI: ${escapeHtml(dni)}</div>
              <div style="font-size:13px;color:#555">Habitación: ${escapeHtml(habitaciones)} | Pasajeros: ${numPax}</div>
            </div>
            <div>
              <button class="generateSingleBtn" data-index="${idx}" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px">Generar ficha</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    searchResults.innerHTML = html;
    
    // Attach event listeners to buttons
    document.querySelectorAll('.generateSingleBtn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.index);
        const group = matches[idx];
        await generateSingleVoucher(group);
      });
    });
  }

  // Group rows by Voucher and pick titular (oldest by Edad) + accompanantes
  function groupByVoucher(rows){
    const m = {};
    rows.forEach(r=>{
      const v = (r['Voucher']||r['voucher']||'').toString().trim();
      if(!v) return;
      if(!m[v]) m[v]=[];
      m[v].push(r);
    });
    const groups = Object.keys(m).map(v=>{
      const pax = m[v];
      // choose titular by max Edad when present
      let titular = pax[0];
      try{
        const hasEdad = pax.some(p=>p['Edad'] && !isNaN(parseInt(p['Edad'])));
        if(hasEdad){
          titular = pax.reduce((a,b)=> ((parseInt(a['Edad']||0) >= parseInt(b['Edad']||0))? a : b));
        }
      }catch(e){ /* ignore and fallback */ }
      const acompanantes = pax.filter(p=>p!==titular);
      const todas_habitaciones = Array.from(new Set(pax.map(p=>p['Nro. habitación']||p['Nro habitacion']||p['Habitacion']||'').filter(Boolean)));
      return { voucher: v, titular, acompanantes, todas_habitaciones, num_pasajeros: pax.length, rows: pax };
    });
    return groups;
  }

  // Generate single voucher PDF
  async function generateSingleVoucher(group){
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generando...';
    
    try {
      status.textContent = '⏳ Generando PDF...';
      const templateUrl = '/python/fichaPax/fichaPax.pdf';
      const templateBytes = await fetch(templateUrl).then(r=>r.arrayBuffer());
      
      const pdfBytes = await fillTemplate(templateBytes, group, 0);
      
      // Show preview
      const blob = new Blob([pdfBytes], {type:'application/pdf'});
      const url = URL.createObjectURL(blob);
      previewFrame.src = url;
      previewArea.style.display = 'block';
      
      // Download PDF
      const nameBase = sanitizeFilename((group.voucher || group.titular['Apellido y nombre'] || group.titular['Nombre'] || 'ficha').toString());
      const name = `ficha_${nameBase}.pdf`;
      triggerDownload(blob, name);
      
      status.textContent = '✅ Ficha generada y descargada';
      setTimeout(() => {
        status.textContent = `✅ ${grouped.length} vouchers cargados`;
      }, 3000);
    } catch(err) {
      status.textContent = '❌ Error generando PDF: ' + err.message;
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  async function fillTemplate(templateBytes, group, idx){
    // Use the positions map extracted from generar_con_overlay.py (python/fichaPax/positions.json)
    const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const first = pages[0];

    // Embed fonts
    const helv = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    // Load positions map (cache on window)
    if(!window.__ficha_positions_map){
      const map = await fetch('/python/fichaPax/positions.json').then(r=>r.json());
      window.__ficha_positions_map = map.fields || {};
    }
    const pos = window.__ficha_positions_map;

    const mmToPt = 72/25.4; // points per mm
    const pageHeight = first.getHeight();

    const titular = group.titular || {};

    // Helper to get field from titular
    const tVal = (keys)=>{
      for(const k of keys){ if(titular[k] && String(titular[k]).trim() !== '') return String(titular[k]).trim(); }
      return '';
    };

    // Draw main fields using the map
    const name = tVal(['Apellido y nombre','Nombre','Nombre completo','NombrePax','Nombre y Apellido']).toUpperCase();
    if(name && pos['Apellido y nombre']){
      const p = pos['Apellido y nombre'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(name, { x, y, size: p.size || 10, font: helv });
    }

    // Documento tipo + número
    const tipo = tVal(['Tipo documento','Tipo','Tipo Doc']);
    const nro = tVal(['Nro. doc.','Nro doc','Nro Documento']);
    const docText = (tipo? tipo + ': ' : '') + (nro? nro : '');
    if(docText && pos['TipoDocumento_Nro']){
      const p = pos['TipoDocumento_Nro'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(docText, { x, y, size: p.size || 10, font: helv });
    }

    // Telefono / Email
    const telefono = tVal(['Celular','Teléfono','Telefono']);
    if(telefono && pos['Telefono']){
      const p = pos['Telefono'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(telefono, { x, y, size: p.size || 10, font: helv });
    }
    const email = tVal(['Email','E-mail','Correo']);
    if(email && pos['Email']){
      const p = pos['Email'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(email, { x, y, size: p.size || 10, font: helv });
    }

    // Sede
    const sede = tVal(['Sede','Seccional']);
    if(sede && pos['Sede']){
      const p = pos['Sede'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      // Apply the same cleaning as in python script (remove leading NN - )
      const clean = sede.replace(/^\s*\d+\s*[-–—]\s*/, '');
      first.drawText(clean, { x, y, size: p.size || 10, font: helv });
    }

    // Fecha de nacimiento
    const fnac = tVal(['Fecha de nacimiento','Fecha nacimiento','Fecha Nacimiento']);
    if(fnac && pos['Fecha de nacimiento']){
      const p = pos['Fecha de nacimiento'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(fnac, { x, y, size: p.size || 10, font: helv });
    }

    // Acompanantes (based on group.acompanantes)
    if(pos['Acomp']){
      const p = pos['Acomp'];
      const acomp = group.acompanantes || [];
      for(let i=0;i<Math.min(acomp.length, p.max); i++){
        const an = (acomp[i]['Apellido y nombre'] || acomp[i]['Nombre'] || '').toUpperCase();
        const ad = (acomp[i]['Tipo documento']? (acomp[i]['Tipo documento'] + ': ') : '') + (acomp[i]['Nro. doc.'] || acomp[i]['Nro doc'] || '');
        const y = pageHeight - ((p.y_first_top_mm + (i) * p.spacing_mm) * mmToPt);
        const xName = p.x_mm_name * mmToPt;
        const xDoc = p.x_mm_doc * mmToPt;
        if(an) first.drawText(an, { x: xName, y, size: p.size || 9, font: helv });
        if(ad && ad.trim() !== ': ') first.drawText(`${ad}`, { x: xDoc, y, size: p.size || 9, font: helv });
      }
    }

    // Habitacion(s)
    const habitacionesRaw = (group.todas_habitaciones && group.todas_habitaciones.length>0) ? group.todas_habitaciones.join(', ') : '';
    if(pos['NroHabitacion']){
      const p = pos['NroHabitacion'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(habitacionesRaw || '', { x, y, size: p.size || 10, font: helv });
    }

    // Fecha ingreso/egreso (from titular)
    const fIngreso = tVal(['Fecha de ingreso','Fecha ingreso','Checkin']);
    const fEgreso = tVal(['Fecha de egreso','Fecha egreso','Checkout']);
    if(fIngreso && pos['FechaIngreso']){
      const p = pos['FechaIngreso'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(fIngreso, { x, y, size: p.size || 10, font: helv });
    }
    if(fEgreso && pos['FechaEgreso']){
      const p = pos['FechaEgreso'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(fEgreso, { x, y, size: p.size || 10, font: helv });
    }

    // Servicios -> mark X at positions
    if(pos['Servicios']){
      const p = pos['Servicios'];
      const servicios = (tVal(['Servicios','Servicio']) || '').toUpperCase();
      if(servicios.includes('DESAYUNO') && !servicios.includes('MEDIA')){
        const x = p.x_mm_desayuno * mmToPt; const y = pageHeight - (p.y_top_mm * mmToPt);
        first.drawText('X', { x, y, size: p.size || 10, font: helv });
      } else if(servicios.includes('MEDIA')){
        const x = p.x_mm_media * mmToPt; const y = pageHeight - (p.y_top_mm * mmToPt);
        first.drawText('X', { x, y, size: p.size || 10, font: helv });
      } else if(servicios.includes('COMPLETA') || servicios.includes('PENSION')){
        const x = p.x_mm_completa * mmToPt; const y = pageHeight - (p.y_top_mm * mmToPt);
        first.drawText('X', { x, y, size: p.size || 10, font: helv });
      }
    }

    // Voucher
    const voucher = (group.voucher || titular['Voucher'] || titular['voucher'] || '');
    if(voucher && pos['Voucher']){
      const p = pos['Voucher'];
      const x = p.x_mm * mmToPt;
      const y = pageHeight - (p.y_top_mm * mmToPt);
      first.drawText(voucher, { x, y, size: p.size || 11, font: helvBold });
    }

    // Add index for traceability (small grey)
    first.drawText(`#${idx+1}`, { x: 500, y: 40, size: 10, color: PDFLib.rgb(0.5,0.5,0.5), font: helv });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  }

  function sanitizeFilename(s){ return s.replace(/[^a-z0-9\-_\.]/ig,'_').slice(0,120); }
  function triggerDownload(blob, name){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  }

})();