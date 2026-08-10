/**
 * PDF Exporter module for CPQ Program
 * Generates an official Specification Sheet & Customization Report for clients & internal operations in English.
 * Configured with strict page-break rules to prevent text slicing across PDF pages.
 */

window.generateQuotePDF = function generateQuotePDF(configState) {
  const { salesName, customerName, projectName, model, selectedOptions, customColorValue, customFirmwareValue, calculations } = configState;
  
  // Format dates
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const quoteId = `SPEC-TR-${Math.floor(100000 + Math.random() * 900000)}`;

  // Find all non-default custom selections for the Customization Summary
  const customizedItems = [];
  
  if (model.customizableSpecs) {
    Object.keys(model.customizableSpecs).forEach(key => {
      const specConfig = model.customizableSpecs[key];
      const selectedId = selectedOptions[key];
      const opt = specConfig.options.find(o => o.id === selectedId);
      
      if (opt) {
        const isModified = selectedId !== specConfig.defaultOption;
        let finalSpecValue = opt.specValue;
        let nreDisplay = opt.nreFee > 0 ? `$${opt.nreFee.toLocaleString()} USD` : '$0';
        
        if (key === 'casingColor' && selectedId === 'custom_color') {
          finalSpecValue = `Custom RAL Color: ${customColorValue ? customColorValue : 'Client Specified'}`;
        } else if (key === 'firmwareOption' && selectedId === 'customized') {
          const fwText = customFirmwareValue ? customFirmwareValue.trim().replace(/\n/g, '<br/>') : 'Client Specified Requirements';
          finalSpecValue = `Customized FW Build:<br/><div style="margin-top:4px; font-family:monospace; background:#f1f5f9; padding:6px; border-radius:4px; border:1px solid #cbd5e1; font-size:11px; white-space:pre-wrap; page-break-inside:avoid; break-inside:avoid;">${fwText}</div>`;
          nreDisplay = '<span style="color:#d97706; font-size:11px;">TBD (Quoted after R&D evaluation)</span>';
        }

        customizedItems.push({
          key,
          label: specConfig.label,
          targetCategory: specConfig.targetCategory,
          targetKey: specConfig.targetKey,
          optionName: opt.name,
          specValue: finalSpecValue,
          addonPrice: opt.addonPrice || 0,
          nreFee: opt.nreFee || 0,
          nreDisplay,
          moqImpact: opt.moqImpact || model.baseMOQ,
          isModified
        });
      }
    });
  }

  // Build PDF HTML container with strict page-break protection
  const element = document.createElement('div');
  element.id = 'pdfRenderContainer';
  element.style.padding = '24px 28px';
  element.style.fontFamily = 'Helvetica, Arial, sans-serif';
  element.style.color = '#1e293b';
  element.style.background = '#ffffff';
  element.style.boxSizing = 'border-box';

  // Build Customization Summary Table for Internal Operations
  let customSummaryHtml = '';
  const modifiedOnly = customizedItems.filter(i => i.isModified);

  if (modifiedOnly.length > 0) {
    customSummaryHtml = `
      <div style="margin-bottom: 20px; border: 2px dashed #0284c7; background: #f0f9ff; border-radius: 6px; padding: 14px; page-break-inside: avoid; break-inside: avoid;">
        <h4 style="margin: 0 0 10px 0; color: #0369a1; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
          <span>🛠️ Customization Summary (Internal Operations & Engineering Notes)</span>
          <span style="font-size: 11px; background: #0284c7; color: #fff; padding: 2px 8px; border-radius: 10px;">${modifiedOnly.length} Customized Field(s)</span>
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff; border: 1px solid #bae6fd;">
          <thead>
            <tr style="background: #e0f2fe; color: #0369a1; text-align: left; page-break-inside: avoid; break-inside: avoid;">
              <th style="padding: 8px; border-bottom: 1px solid #bae6fd; width: 25%;">Spec Item</th>
              <th style="padding: 8px; border-bottom: 1px solid #bae6fd; width: 45%;">Selected Configuration</th>
              <th style="padding: 8px; border-bottom: 1px solid #bae6fd; width: 15%;">Addon Delta</th>
              <th style="padding: 8px; border-bottom: 1px solid #bae6fd; width: 15%;">NRE Fee</th>
            </tr>
          </thead>
          <tbody>
            ${modifiedOnly.map(item => `
              <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
                <td style="padding: 8px; font-weight: bold; color: #0f172a; vertical-align: top;">${item.targetKey}</td>
                <td style="padding: 8px; color: #0284c7; font-weight: bold; vertical-align: top;">
                  ${item.specValue}
                </td>
                <td style="padding: 8px; color: #059669; font-weight: bold; vertical-align: top;">
                  ${item.addonPrice > 0 ? `+$${item.addonPrice} USD` : '$0'}
                </td>
                <td style="padding: 8px; color: #d97706; font-weight: bold; vertical-align: top;">
                  ${item.nreDisplay}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Build Full Technical Specifications HTML with Category Block protection
  let specsHtml = '';
  
  model.specifications.forEach(cat => {
    specsHtml += `
      <div class="pdf-spec-block" style="margin-top: 16px; page-break-inside: avoid; break-inside: avoid;">
        <h4 style="background: #0284c7; color: #ffffff; padding: 6px 12px; margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 3px; page-break-after: avoid; break-after: avoid;">
          ${cat.category}
        </h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px;">
    `;
    
    cat.items.forEach(item => {
      let displayValue = item.value;
      let isCustomized = false;
      
      if (item.customizable && item.customKey && selectedOptions[item.customKey]) {
        const optionId = selectedOptions[item.customKey];
        const specConfig = model.customizableSpecs[item.customKey];
        const matchedOpt = specConfig.options.find(o => o.id === optionId);
        if (matchedOpt) {
          displayValue = matchedOpt.specValue;
          if (item.customKey === 'casingColor' && optionId === 'custom_color') {
            displayValue = `Custom RAL Color: ${customColorValue ? customColorValue : 'Client Specified'}`;
          } else if (item.customKey === 'firmwareOption' && optionId === 'customized') {
            const fwText = customFirmwareValue ? customFirmwareValue.trim().replace(/\n/g, '<br/>') : 'Client Specified Requirements';
            displayValue = `Customized FW Build:<br/><div style="margin-top:4px; font-family:monospace; background:#f8fafc; padding:6px; border-radius:4px; border:1px solid #e2e8f0; font-size:11px; white-space:pre-wrap; page-break-inside:avoid; break-inside:avoid;">${fwText}</div><div style="font-size:10px; color:#d97706; margin-top:2px;">*NRE fee will be quoted separately after R&D engineering workload evaluation.</div>`;
          }
          if (optionId !== specConfig.defaultOption) {
            isCustomized = true;
          }
        }
      }
      
      specsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0; ${isCustomized ? 'background: #f0f9ff;' : ''} page-break-inside: avoid; break-inside: avoid;">
          <td style="padding: 7px 10px; font-weight: bold; width: 35%; color: #475569; vertical-align: top;">
            ${item.key} ${isCustomized ? '<span style="color:#0284c7; font-size:10px; font-weight:bold;">[CUSTOMIZED]</span>' : ''}
          </td>
          <td style="padding: 7px 10px; width: 65%; color: ${isCustomized ? '#0369a1' : '#0f172a'}; ${isCustomized ? 'font-weight:bold;' : ''} vertical-align: top;">
            ${displayValue}
          </td>
        </tr>
      `;
    });

    specsHtml += `</table></div>`;
  });

  element.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 3px solid #0284c7; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; break-inside: avoid;">
      <div>
        <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 800;">VIVOTEK <span style="font-size:13px; color:#64748b; font-weight: normal;">A Delta Group Company</span></h1>
        <h2 style="margin: 3px 0 0 0; font-size: 15px; color: #0284c7; font-weight: 700;">Transportation Vertical Solution - Specification & Customization Sheet</h2>
      </div>
      <div style="text-align: right; font-size: 11px; color: #64748b;">
        <div><strong>Doc ID:</strong> ${quoteId}</div>
        <div><strong>Date:</strong> ${dateStr}</div>
      </div>
    </div>

    <!-- Info Grid -->
    <table style="width: 100%; border: 1px solid #cbd5e1; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; background: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
      <tr>
        <td style="padding: 8px 12px; border-right: 1px solid #cbd5e1; width: 50%;">
          <div style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold;">Sales Representative</div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${salesName || 'Delta Sales Representative'}</div>
        </td>
        <td style="padding: 8px 12px; width: 50%;">
          <div style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold;">Customer / Project Name</div>
          <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px;">${customerName || 'Valued Customer'} ${projectName ? `(${projectName})` : ''}</div>
        </td>
      </tr>
    </table>

    <!-- Commercial Metrics Box -->
    <div style="border: 2px solid #0284c7; border-radius: 6px; padding: 14px; margin-bottom: 18px; background: #ffffff; page-break-inside: avoid; break-inside: avoid;">
      <h3 style="margin: 0 0 6px 0; color: #0369a1; font-size: 17px;">${model.displayName}</h3>
      <p style="margin: 0 0 12px 0; font-size: 12px; color: #334155;">${model.description}</p>
      
      <table style="width: 100%; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
        <tr>
          <td style="padding: 4px 0; width: 33%;"><strong>Custom Addon Delta:</strong> <span style="color:#059669; font-weight:bold;">${calculations.totalAddon >= 0 ? '+' : ''}$${calculations.totalAddon.toLocaleString()} USD</span></td>
          <td style="padding: 4px 0; width: 33%;"><strong>NRE Setup Fee:</strong> <span style="color:#d97706; font-weight:bold;">$${calculations.totalNRE.toLocaleString()} USD</span></td>
          <td style="padding: 4px 0; width: 34%;"><strong>Minimum Order Qty (MOQ):</strong> <span style="color:#0284c7; font-weight:bold;">${calculations.moq.toLocaleString()} Units</span></td>
        </tr>
      </table>
    </div>

    <!-- Customization Summary for Internal Operations -->
    ${customSummaryHtml}

    <!-- Technical Specifications -->
    <h3 style="margin: 16px 0 8px 0; font-size: 15px; color: #0f172a; border-left: 4px solid #0284c7; padding-left: 10px; page-break-after: avoid; break-after: avoid;">
      Configured Technical Specifications
    </h3>
    ${specsHtml}

    <!-- Terms -->
    <div style="margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 10.5px; color: #64748b; line-height: 1.4; page-break-inside: avoid; break-inside: avoid;">
      <strong>Terms & Conditions:</strong><br/>
      1. Unit pricing will be quoted separately according to regional sales agreement.<br/>
      2. NRE (Non-Recurring Engineering) fees apply to non-standard tooling, lens alignment, powder coating setup, sample plate verifications. Customized Firmware NRE fee will be quoted separately after R&D engineering workload evaluation.<br/>
      3. Minimum Order Quantity (MOQ) enforcement applies to custom paint, hardware, & firmware batches.<br/>
      4. All products comply with Delta Electronics & VIVOTEK standard transit quality assurance guidelines.
    </div>
  `;

  document.body.appendChild(element);

  // Check if html2pdf is available
  if (window.html2pdf) {
    const opt = {
      margin:       [10, 10, 10, 10], // top, left, bottom, right margins in mm
      filename:     `Spec_Sheet_MD9584_${customerName.replace(/[^a-zA-Z0-9]/g, '_') || 'Customer'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  } else {
    // Fallback: Open print dialog
    window.print();
    document.body.removeChild(element);
  }
};
