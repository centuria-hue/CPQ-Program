class CPQApp {
  constructor() {
    this.products = [];
    this.selectedModel = null;
    this.selectedOptions = {};
    this.customColorValue = '';
    this.customFirmwareValue = '';
    this.customOtherValue = '';
    
    this.salesName = '';
    this.customerName = '';
    this.projectName = '';
    this.quoteDocId = 'TR-' + Math.floor(100000 + Math.random() * 900000);
    
    this.init();
  }

  init() {
    // Check if user previously imported a custom products DB stored in localStorage
    const savedDbStr = localStorage.getItem('CPQ_IMPORTED_PRODUCTS_DATA');
    let loadedFromStorage = false;
    if (savedDbStr) {
      try {
        const savedDb = JSON.parse(savedDbStr);
        if (Array.isArray(savedDb) && savedDb.length === 5 && savedDb[0].customizableSpecs?.focalLength) {
          this.products = savedDb;
          window.PRODUCTS_DATA = savedDb;
          loadedFromStorage = true;
          console.log("Loaded custom product database from localStorage");
        } else {
          localStorage.removeItem('CPQ_IMPORTED_PRODUCTS_DATA');
        }
      } catch (e) {
        console.warn("Failed to parse saved product database from localStorage", e);
        localStorage.removeItem('CPQ_IMPORTED_PRODUCTS_DATA');
      }
    }
    
    if (!loadedFromStorage) {
      this.products = window.PRODUCTS_DATA || window.__EMBEDDED_PRODUCTS_DATA__ || [];
    }

    this.bindEvents();
    
    if (this.products && this.products.length > 0) {
      this.selectModel(this.products[0].id);
    } else {
      console.error("No camera products loaded into CPQ app!");
    }
  }

  bindEvents() {
    // Sales info inputs
    const salesInput = document.getElementById('salesNameInput');
    const customerInput = document.getElementById('customerNameInput');
    const projectInput = document.getElementById('projectNameInput');

    if (salesInput) salesInput.addEventListener('input', (e) => this.salesName = e.target.value);
    if (customerInput) customerInput.addEventListener('input', (e) => this.customerName = e.target.value);
    if (projectInput) projectInput.addEventListener('input', (e) => this.projectName = e.target.value);

    // Event delegation for model card selection
    const catalogContainer = document.getElementById('modelCatalogContainer');
    if (catalogContainer) {
      catalogContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.model-card');
        if (card) {
          const modelId = card.getAttribute('data-model-id');
          this.selectModel(modelId);
        }
      });
    }

    // Export PDF button
    const exportBtn = document.getElementById('exportPdfBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExportPDF());
    }

    // Save & Load Quote Config buttons
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => this.saveQuoteConfig());
    }

    const loadConfigBtn = document.getElementById('loadConfigBtn');
    const loadConfigInput = document.getElementById('loadConfigInput');
    if (loadConfigBtn && loadConfigInput) {
      loadConfigBtn.addEventListener('click', () => loadConfigInput.click());
      loadConfigInput.addEventListener('change', (e) => this.handleLoadConfig(e));
    }

    // Export & Import DB buttons
    const exportDbBtn = document.getElementById('exportDbBtn');
    if (exportDbBtn) {
      exportDbBtn.addEventListener('click', () => this.exportDatabase());
    }

    const importDbBtn = document.getElementById('importDbBtn');
    const importDbInput = document.getElementById('importDbInput');
    if (importDbBtn && importDbInput) {
      importDbBtn.addEventListener('click', () => importDbInput.click());
      importDbInput.addEventListener('change', (e) => this.handleImportDatabase(e));
    }

    const resetDbBtn = document.getElementById('resetDbBtn');
    if (resetDbBtn) {
      resetDbBtn.addEventListener('click', () => this.resetDatabase());
    }

    // About Me Modal Listeners
    const aboutBtn = document.getElementById('aboutBtn');
    const aboutModal = document.getElementById('aboutModal');
    const closeAboutModalBtn = document.getElementById('closeAboutModalBtn');

    if (aboutBtn && aboutModal) {
      aboutBtn.addEventListener('click', () => {
        aboutModal.style.display = 'flex';
      });
    }

    if (closeAboutModalBtn && aboutModal) {
      closeAboutModalBtn.addEventListener('click', () => {
        aboutModal.style.display = 'none';
      });
    }

    if (aboutModal) {
      aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
          aboutModal.style.display = 'none';
        }
      });
    }

    this.updateDbResetButtonVisibility();
  }

  selectModel(modelId) {
    const found = this.products.find(p => p.id === modelId);
    if (!found) return;

    this.selectedModel = found;
    this.selectedOptions = {};
    this.customColorValue = '';
    this.customFirmwareValue = '';

    // Initialize default options
    if (found.customizableSpecs) {
      Object.keys(found.customizableSpecs).forEach(key => {
        const specConfig = found.customizableSpecs[key];
        this.selectedOptions[key] = specConfig.defaultOption;
      });
    }

    this.renderCatalog();
    this.renderSpecTable();
    this.updateCalculations();
  }

  renderCatalog() {
    const catalogContainer = document.getElementById('modelCatalogContainer');
    if (!catalogContainer) return;

    catalogContainer.innerHTML = this.products.map(p => {
      const isActive = this.selectedModel && this.selectedModel.id === p.id;
      return `
        <div class="model-card ${isActive ? 'active' : ''}" data-model-id="${p.id}">
          <div class="model-name">${p.displayName}</div>
          <div class="model-series">${p.series}</div>
          <div class="model-desc">${p.description}</div>
          <div class="model-meta">
            <span class="model-price">MOQ: ${p.baseMOQ} pcs</span>
          </div>
        </div>
      `;
    }).join('');
  }

  getActiveOption(customConfig, customKey, activeOptId) {
    if (customKey === 'cableRating' && this.selectedModel?.id === 'MD9560-V2-Series') {
      const currentPower = this.selectedOptions['powerVariant'] || 'poe';
      const dynamicOpts = currentPower === 'poe' ? [
        { id: "std_cable", name: "Standard Fire-Resistant Cable (EN 45545 PoE Cable)", pnCode: "3082644400", specValue: "Standard EN 45545 Certified Fire-Resistant Railway Cable (PoE)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
        { id: "hl3_cable", name: "HL3 High Fire Safety Cable (EN 45545-2 HL3 PoE Cable)", pnCode: "TBD", specValue: "HL3 High Fire Safety Railway Cable (PoE)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
        { id: "nfpa140_cable", name: "NFPA-140 Certified Fireproof M12 Cable (Addon: +$18 / MOQ: 200 pcs)", pnCode: "TBD", specValue: "NFPA-140 Certified Fireproof Railway M12 Cable", addonPrice: 18, nreFee: 0, moqImpact: 200 }
      ] : [
        { id: "std_cable", name: "Standard Fire-Resistant Cable (EN 45545 DC Cable)", pnCode: "3080857800", specValue: "Standard EN 45545 Certified Fire-Resistant Railway Cable (DC Power)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
        { id: "hl3_cable", name: "HL3 High Fire Safety Cable (EN 45545-2 HL3 DC Cable)", pnCode: "TBD", specValue: "HL3 High Fire Safety Railway Cable (DC Power)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
        { id: "nfpa140_cable", name: "NFPA-140 Certified Fireproof M12 Cable (Addon: +$18 / MOQ: 200 pcs)", pnCode: "TBD", specValue: "NFPA-140 Certified Fireproof Railway M12 Cable", addonPrice: 18, nreFee: 0, moqImpact: 200 }
      ];
      return dynamicOpts.find(o => o.id === activeOptId);
    }
    return customConfig?.options?.find(o => o.id === activeOptId);
  }

  renderSpecTable() {
    const specContainer = document.getElementById('specTableContainer');
    if (!specContainer || !this.selectedModel) return;

    let html = '';

    this.selectedModel.specifications.forEach(categoryObj => {
      html += `
        <div class="spec-panel" style="margin-bottom: 20px;">
          <div class="spec-category-header">${categoryObj.category}</div>
          <table class="spec-table">
            <tbody>
      `;

      categoryObj.items.forEach(item => {
        const isCustom = item.customizable && item.customKey && this.selectedModel.customizableSpecs[item.customKey];
        
        if (isCustom) {
          const customConfig = this.selectedModel.customizableSpecs[item.customKey];
          const activeOptId = this.selectedOptions[item.customKey];
          const activeOpt = this.getActiveOption(customConfig, item.customKey, activeOptId);
          const needsInput = activeOpt && activeOpt.requiresCustomInput;
          const isModified = activeOptId !== customConfig.defaultOption;

          let customInputFieldHtml = '';

          if (needsInput) {
            if (item.customKey === 'firmwareOption') {
              customInputFieldHtml = `
                <div style="margin-top: 8px;">
                  <textarea class="form-control form-control-textarea custom-text-input" 
                            data-custom-key="${item.customKey}"
                            rows="10"
                            placeholder="Enter Custom Firmware Specs / Build Requirements (Up to 10 lines)..."
                            style="border-color: var(--accent-cyan); background: #0f172a; width: 100%; font-family: monospace; font-size: 12px;">${this.customFirmwareValue}</textarea>
                </div>
              `;
            } else if (item.customKey === 'casingColor') {
              customInputFieldHtml = `
                <div style="margin-top: 8px;">
                  <input type="text" 
                         class="form-control custom-text-input" 
                         data-custom-key="${item.customKey}"
                         placeholder="Enter Custom RAL Code / Name (e.g. RAL 7016 Anthracite Grey)" 
                         value="${this.customColorValue}"
                         style="border-color: var(--accent-cyan); background: #0f172a;">
                </div>
              `;
            } else if (item.customKey === 'otherCustomization') {
              customInputFieldHtml = `
                <div style="margin-top: 8px;">
                  <textarea class="form-control form-control-textarea custom-text-input" 
                            data-custom-key="${item.customKey}"
                            rows="5"
                            placeholder="Enter Other Non-Standard Customization Details / Special Build Requirements..."
                            style="border-color: var(--accent-cyan); background: #0f172a; width: 100%; font-family: monospace; font-size: 12px; line-height: 1.5; color: #f8fafc;">${this.customOtherValue}</textarea>
                  <div style="font-size: 11px; color: var(--accent-amber); margin-top: 4px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-info-circle"></i> NRE fee & MOQ will be quoted separately after R&D engineering workload evaluation.
                  </div>
                </div>
              `;
            }
          }

          let selectDisabledHtml = '';
          let availableOptions = customConfig.options;

          if (item.customKey === 'irIlluminator') {
            const is24mmSelected = this.selectedOptions['focalLength'] === '2.4mm';
            if (is24mmSelected) {
              selectDisabledHtml = 'disabled style="opacity: 0.75; cursor: not-allowed; background: rgba(30, 41, 59, 0.8);"';
              availableOptions = customConfig.options.filter(o => o.id === 'no_ir');
            } else {
              availableOptions = customConfig.options.filter(o => o.id !== 'no_ir');
            }
          }

          if (item.customKey === 'cableRating' && this.selectedModel.id === 'MD9560-V2-Series') {
            const currentPower = this.selectedOptions['powerVariant'] || 'poe';
            if (currentPower === 'poe') {
              availableOptions = [
                { id: "std_cable", name: "Standard Fire-Resistant Cable (EN 45545 PoE Cable)", pnCode: "3082644400", specValue: "Standard EN 45545 Certified Fire-Resistant Railway Cable (PoE)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
                { id: "hl3_cable", name: "HL3 High Fire Safety Cable (EN 45545-2 HL3 PoE Cable)", pnCode: "TBD", specValue: "HL3 High Fire Safety Railway Cable (PoE)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
                { id: "nfpa140_cable", name: "NFPA-140 Certified Fireproof M12 Cable (Addon: +$18 / MOQ: 200 pcs)", pnCode: "TBD", specValue: "NFPA-140 Certified Fireproof Railway M12 Cable", addonPrice: 18, nreFee: 0, moqImpact: 200 }
              ];
            } else {
              availableOptions = [
                { id: "std_cable", name: "Standard Fire-Resistant Cable (EN 45545 DC Cable)", pnCode: "3080857800", specValue: "Standard EN 45545 Certified Fire-Resistant Railway Cable (DC Power)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
                { id: "hl3_cable", name: "HL3 High Fire Safety Cable (EN 45545-2 HL3 DC Cable)", pnCode: "TBD", specValue: "HL3 High Fire Safety Railway Cable (DC Power)", addonPrice: 0, nreFee: 0, moqImpact: 10 },
                { id: "nfpa140_cable", name: "NFPA-140 Certified Fireproof M12 Cable (Addon: +$18 / MOQ: 200 pcs)", pnCode: "TBD", specValue: "NFPA-140 Certified Fireproof Railway M12 Cable", addonPrice: 18, nreFee: 0, moqImpact: 200 }
              ];
            }
          }

          html += `
            <tr style="${isModified ? 'background: rgba(0, 240, 255, 0.04);' : ''}">
              <td class="spec-key" style="vertical-align: top; padding-top: 12px;">
                ${item.key}
                ${isModified ? '<span class="customized-badge"><i class="fas fa-sliders"></i> CUSTOMIZED</span>' : ''}
              </td>
              <td class="spec-val">
                <select class="form-select custom-select" data-custom-key="${item.customKey}" ${selectDisabledHtml}>
                  ${availableOptions.map(opt => `
                    <option value="${opt.id}" ${opt.id === activeOptId ? 'selected' : ''}>
                      ${opt.name}
                    </option>
                  `).join('')}
                </select>
                
                ${customInputFieldHtml}

                ${this.renderOptionTags(customConfig, activeOptId, item.customKey)}
              </td>
            </tr>
          `;
        } else {
          html += `
            <tr>
              <td class="spec-key">${item.key}</td>
              <td class="spec-val">${item.value}</td>
            </tr>
          `;
        }
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    specContainer.innerHTML = html;

    // Attach select change listeners
    specContainer.querySelectorAll('.custom-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const customKey = select.getAttribute('data-custom-key');
        const newValue = e.target.value;
        this.selectedOptions[customKey] = newValue;
        
        if (customKey === 'powerVariant' && this.selectedModel.id === 'MD9560-V2-Series') {
          const power = newValue;
          const focal = this.selectedOptions['focalLength'] || '2.8mm';

          if (power === 'dc_power') {
            if (focal === '2.4mm') this.selectedOptions['focalLength'] = '2.8mm';
            this.selectedOptions['cableRating'] = 'std_cable';
            this.selectedOptions['casingColor'] = 'ral9003';
          }
          this.renderSpecTable();
          this.updateCalculations();
          return;
        }

        // Constraint coupling logic for MD9560-H-V2 (2.4mm lens requires No IR Illuminator)
        if (customKey === 'focalLength') {
          if (newValue === '2.4mm') {
            this.selectedOptions['irIlluminator'] = 'no_ir';
          } else if (this.selectedOptions['irIlluminator'] === 'no_ir') {
            this.selectedOptions['irIlluminator'] = 'smart_ir';
          }
          this.renderSpecTable();
          this.updateCalculations();
          return;
        }

        if (customKey === 'irIlluminator' && this.selectedOptions['focalLength'] === '2.4mm') {
          this.selectedOptions['irIlluminator'] = 'no_ir';
          this.renderSpecTable();
          this.updateCalculations();
          return;
        }

        // Re-render spec table if text input field state changes
        const customConfig = this.selectedModel.customizableSpecs[customKey];
        const selectedOpt = this.getActiveOption(customConfig, customKey, newValue);
        
        if (selectedOpt && (selectedOpt.requiresCustomInput || customKey === 'casingColor' || customKey === 'firmwareOption' || customKey === 'otherCustomization')) {
          this.renderSpecTable();
        } else {
          const parentTd = select.parentElement;
          const tagsContainer = parentTd.querySelector('.option-meta-tag');
          if (tagsContainer) {
            tagsContainer.outerHTML = this.renderOptionTags(customConfig, newValue, customKey);
          }
        }

        this.updateCalculations();
      });
    });

    // Attach custom text input listeners
    specContainer.querySelectorAll('.custom-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const customKey = input.getAttribute('data-custom-key');
        if (customKey === 'casingColor') {
          this.customColorValue = e.target.value;
        } else if (customKey === 'firmwareOption') {
          this.customFirmwareValue = e.target.value;
        } else if (customKey === 'otherCustomization') {
          this.customOtherValue = e.target.value;
        }
      });
    });
  }

  renderOptionTags(customConfig, activeOptId, customKey) {
    const activeOpt = this.getActiveOption(customConfig, customKey, activeOptId);
    if (!activeOpt) return '';

    const tags = [];
    if (activeOpt.pnCode) {
      tags.push(`<span class="tag-moq" style="color:var(--accent-cyan);"><i class="fas fa-barcode"></i> P/N Code: ${activeOpt.pnCode}</span>`);
    }
    if (activeOpt.addonPrice !== 0) {
      tags.push(`<span class="tag-addon"><i class="fas fa-tag"></i> Addon: ${activeOpt.addonPrice > 0 ? '+' : ''}$${activeOpt.addonPrice} USD</span>`);
    }
    if (activeOpt.nreFee > 0) {
      tags.push(`<span class="tag-nre"><i class="fas fa-tools"></i> NRE: $${activeOpt.nreFee.toLocaleString()} USD</span>`);
    }
    if (activeOpt.moqImpact > this.selectedModel.baseMOQ) {
      tags.push(`<span class="tag-moq"><i class="fas fa-boxes"></i> MOQ: ${activeOpt.moqImpact.toLocaleString()} pcs</span>`);
    }

    if (tags.length === 0 && !activeOpt.description) return '';

    return `
      <div class="option-meta-tag">
        ${tags.join('')}
        ${activeOpt.description ? `<span style="color:var(--text-muted); font-style:italic;">— ${activeOpt.description}</span>` : ''}
      </div>
    `;
  }

  calculateState() {
    if (!this.selectedModel) return null;

    let totalAddon = 0;
    let totalNRE = 0;
    let maxMOQ = this.selectedModel.baseMOQ;
    let isCustomizedAny = false;
    const subPns = [];
    const pnCodes = [];
    const customizableLabels = [];

    if (this.selectedModel.customizableSpecs) {
      Object.keys(this.selectedModel.customizableSpecs).forEach(key => {
        const customConfig = this.selectedModel.customizableSpecs[key];
        const activeOptId = this.selectedOptions[key];
        const activeOpt = this.getActiveOption(customConfig, key, activeOptId);

        if (activeOpt) {
          totalAddon += activeOpt.addonPrice || 0;
          totalNRE += activeOpt.nreFee || 0;
          if (activeOpt.moqImpact && activeOpt.moqImpact > maxMOQ) {
            maxMOQ = activeOpt.moqImpact;
          }

          if (activeOptId !== customConfig.defaultOption) {
            isCustomizedAny = true;
          }

          if (activeOpt.pnCode) {
            pnCodes.push(activeOpt.pnCode);
            subPns.push(`${customConfig.label}: ${activeOpt.pnCode}`);
          }
        }

        customizableLabels.push(customConfig.label);
      });
    }

    let basePN = this.selectedModel.basePN || `1002-${this.selectedModel.id}-000`;

    // Official VIVOTEK Standard SKU Mapping for MD9560-V2-Series
    if (this.selectedModel.id === 'MD9560-V2-Series') {
      const power = this.selectedOptions['powerVariant'];
      const focal = this.selectedOptions['focalLength'];
      const cable = this.selectedOptions['cableRating'];
      const color = this.selectedOptions['casingColor'];
      
      const vioMap9560 = {
        'dc_power_2.8mm_std_cable_ral9003': 'VIO100000496 (IP-CAMERA MD9560-DH-V2 2.8)',
        'dc_power_3.6mm_std_cable_ral9003': 'VIO100000528 (IP-CAMERA MD9560-DH-V2 3.6)',
        'poe_2.4mm_std_cable_ral9003': 'VIO100000499 (IP-CAMERA MD9560-H-V2 2.4)',
        'poe_2.4mm_hl3_cable_ral9003': 'VIO100000640 (IP-CAMERA MD9560-H-V2 2.4 HL3)',
        'poe_2.8mm_std_cable_ral9003': 'VIO100000498 (IP-CAMERA MD9560-H-V2 2.8)',
        'poe_2.8mm_hl3_cable_ral9003': 'VIO100000497 (IP-CAMERA MD9560-H-V2 2.8 HL3)',
        'poe_2.8mm_hl3_cable_ral9011': 'VIO100000792 (IP-CAMERA MD9560-H-V2 2.8 HL3 BLK)',
        'poe_3.6mm_std_cable_ral9003': 'VIO100000495 (IP-CAMERA MD9560-H-V2 3.6)',
        'poe_3.6mm_hl3_cable_ral9003': 'VIO100000494 (IP-CAMERA MD9560-H-V2 3.6 HL3)',
        'poe_3.6mm_hl3_cable_ral9011': 'VIO100000793 (IP-CAMERA MD9560-H-V2 3.6 HL3 BLK)',
        'poe_6.0mm_std_cable_ral9003': 'VIO100000527 (IP-CAMERA MD9560-H-V2 6)',
        'poe_6.0mm_hl3_cable_ral9003': 'VIO100000493 (IP-CAMERA MD9560-H-V2 6 HL3)',
        'poe_6.0mm_hl3_cable_ral9011': 'VIO100000794 (IP-CAMERA MD9560-H-V2 6 HL3 BLK)'
      };

      const key = `${power}_${focal}_${cable}_${color}`;
      if (vioMap9560[key]) {
        basePN = vioMap9560[key];
      }
    }

    // Official VIVOTEK Standard SKU Mapping for MD9582-H
    if (this.selectedModel.id === 'MD9582-H') {
      const focal = this.selectedOptions['focalLength'];
      const cable = this.selectedOptions['cableRating'];
      const vioMap = {
        '2.8mm_hl1_std': 'VIO100244200 (IP-CAMERA MD9582-H 2.8 HL1)',
        '2.8mm_hl3_poe': 'VIO100257300 (IP-CAMERA MD9582-H 2.8 HL3 POE)',
        '3.6mm_hl1_std': 'VIO100244300 (IP-CAMERA MD9582-H 3.6 HL1)',
        '3.6mm_hl3_poe': 'VIO100260000 (IP-CAMERA MD9582-H 3.6 HL3 POE)',
        '6.0mm_hl1_std': 'VIO100B11400 (IP-CAMERA MD9582-H 6 HL1)',
        '6.0mm_hl3_poe': 'VIO100266100 (IP-CAMERA MD9582-H 6 HL3 POE)'
      };
      const key = `${focal}_${cable}`;
      if (vioMap[key]) {
        basePN = vioMap[key];
      }
    }

    // Official VIVOTEK Standard SKU Mapping for MD9584
    if (this.selectedModel.id === 'MD9584') {
      const focal = this.selectedOptions['focalLength'];
      const cable = this.selectedOptions['cableRating'];
      const vioMap9584 = {
        '2.8mm_hl3_poe': 'VIO100000514 (IP-CAMERA MD9584-H 2.8 HL3)',
        '3.6mm_hl1_std': 'VIO100B02400 (IP-CAMERA MD9584-H 3.6 HL1)',
        '3.6mm_hl3_poe': 'VIO100256800 (IP-CAMERA MD9584-H 3.6 HL3)',
        '6.0mm_hl1_std': 'VIO100B02500 (IP-CAMERA MD9584-H 6 HL1)',
        '6.0mm_hl3_poe': 'VIO100256900 (IP-CAMERA MD9584-H 6 HL3)'
      };
      const key = `${focal}_${cable}`;
      if (vioMap9584[key]) {
        basePN = vioMap9584[key];
      }
    }

    // Official VIVOTEK Standard SKU Mapping for MD8564-V2
    if (this.selectedModel.id === 'MD8564-V2') {
      const power = this.selectedOptions['powerVariant'] || 'eh';
      const focal = this.selectedOptions['focalLength'] || '3.6mm';
      const key = `${power}_${focal}`;
      const vioMap8564 = {
        'eh_3.6mm': 'VIO100000221 (IP-CAMERA MD8564-EH-V2 3.6MM HL3)',
        'eh_6.0mm': 'VIO100000122 (IP-CAMERA MD8564-EH-V2 6MM HL3)',
        'deh_6.0mm': 'VIO100000123 (IP-CAMERA MD8564-DEH-V2 6MM HL3)'
      };
      if (vioMap8564[key]) {
        basePN = vioMap8564[key];
      }
    }

    // Official VIVOTEK Standard SKU Mapping for FE9391-EV-V2-M12
    if (this.selectedModel.id === 'FE9391-EV-V2-M12') {
      basePN = 'VIO100000174 (IP-CAMERA FE9391-EV-V2-M12(M))';
    }

    // MOQ Rule:
    // If configuration has an official VIO Part Number (Standard Model), MOQ stays 10 pcs (unless specific option requires higher MOQ like 20, 200, 500, etc.)
    // If configuration does not have a VIO Part Number (Custom P/N 1002-), MOQ floor for custom build is 20 pcs.
    const isStandardVIO = basePN.startsWith('VIO');
    if (!isStandardVIO && maxMOQ < 20) {
      maxMOQ = 20;
    }

    let primaryPn = basePN;
    if (this.selectedOptions['dedicatedPN'] === 'dedicated_pn') {
      const docId = this.quoteDocId || ('TR-' + Math.floor(100000 + Math.random() * 900000));
      primaryPn = `${this.selectedModel.id}-${docId}`;
    }

    return {
      primaryPn,
      subPns,
      customizableLabels,
      totalAddon,
      totalNRE,
      moq: maxMOQ
    };
  }

  updateCalculations() {
    const calc = this.calculateState();
    if (!calc) return;

    // Update UI readout elements
    const primaryPnEl = document.getElementById('readoutPrimaryPn');
    const subPnsEl = document.getElementById('readoutSubAssemblyPns');
    const addonPriceEl = document.getElementById('readoutAddonPrice');
    const nreFeeEl = document.getElementById('readoutNreFee');
    const moqEl = document.getElementById('readoutMoq');

    if (primaryPnEl) primaryPnEl.textContent = calc.primaryPn;
    if (subPnsEl) subPnsEl.textContent = `Customizable Options: [ ${calc.customizableLabels.join(' • ')} ]`;
    if (addonPriceEl) addonPriceEl.textContent = `${calc.totalAddon >= 0 ? '+' : ''}$${calc.totalAddon.toLocaleString()} USD`;
    if (nreFeeEl) nreFeeEl.textContent = `$${calc.totalNRE.toLocaleString()} USD`;
    if (moqEl) moqEl.textContent = `${calc.moq.toLocaleString()} Units`;
  }

  // --- Quote Config Save & Load ---
  saveQuoteConfig() {
    if (!this.selectedModel) return;

    const configData = {
      version: "2.3",
      createdAt: new Date().toISOString(),
      quoteDocId: this.quoteDocId,
      salesName: this.salesName,
      customerName: this.customerName,
      projectName: this.projectName,
      selectedModelId: this.selectedModel.id,
      selectedOptions: this.selectedOptions,
      customColorValue: this.customColorValue,
      customFirmwareValue: this.customFirmwareValue,
      customOtherValue: this.customOtherValue,
      calculations: this.calculateState()
    };

    const jsonStr = JSON.stringify(configData, null, 2);
    const fileName = `CPQ_Quote_${this.selectedModel.id}_${this.quoteDocId}_${(this.customerName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_')}.json`;

    this.downloadFile(fileName, jsonStr, 'application/json');
    this.showToast('Quotation configuration saved to JSON file!');
  }

  handleLoadConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configData = JSON.parse(e.target.result);
        
        if (!configData.selectedModelId || !configData.selectedOptions) {
          throw new Error("Invalid quote configuration file format!");
        }

        // Restore Sales Info & Doc ID
        if (configData.quoteDocId) this.quoteDocId = configData.quoteDocId;
        this.salesName = configData.salesName || '';
        this.customerName = configData.customerName || '';
        this.projectName = configData.projectName || '';

        document.getElementById('salesNameInput').value = this.salesName;
        document.getElementById('customerNameInput').value = this.customerName;
        document.getElementById('projectNameInput').value = this.projectName;

        // Restore Model & Options
        this.selectModel(configData.selectedModelId);

        this.customColorValue = configData.customColorValue || '';
        this.customFirmwareValue = configData.customFirmwareValue || '';
        this.customOtherValue = configData.customOtherValue || '';

        if (configData.selectedOptions) {
          this.selectedOptions = { ...configData.selectedOptions };
        }

        this.renderSpecTable();
        this.updateCalculations();

        this.showToast(`Quotation restored for ${this.selectedModel.displayName}!`);
      } catch (err) {
        alert("Failed to load quote config file: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }

  // --- Product Database Export & Import ---
  exportDatabase() {
    const jsonStr = JSON.stringify(this.products, null, 2);
    this.downloadFile('productsData.json', jsonStr, 'application/json');
    this.showToast('Product Database exported to productsData.json!');
  }

  handleImportDatabase(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dbData = JSON.parse(e.target.result);
        
        if (!Array.isArray(dbData) || dbData.length === 0 || !dbData[0].id) {
          throw new Error("Invalid product database JSON array!");
        }

        const currentModelId = this.selectedModel ? this.selectedModel.id : null;

        this.products = dbData;
        window.PRODUCTS_DATA = dbData;

        // Persist to localStorage so refreshing the browser retains the newly imported DB
        try {
          localStorage.setItem('CPQ_IMPORTED_PRODUCTS_DATA', JSON.stringify(dbData));
        } catch (err) {
          console.warn("Could not save imported products DB to localStorage", err);
        }

        // Preserve current model selection if it exists in the imported DB
        const targetModelId = (currentModelId && dbData.some(p => p.id === currentModelId)) ? currentModelId : dbData[0].id;
        this.selectModel(targetModelId);

        this.updateDbResetButtonVisibility();
        this.showToast(`Product Database updated & saved with ${dbData.length} camera models!`);
      } catch (err) {
        alert("Failed to import product database: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }

  resetDatabase() {
    if (confirm("Reset Product Database to original factory default?")) {
      localStorage.removeItem('CPQ_IMPORTED_PRODUCTS_DATA');
      window.location.reload();
    }
  }

  updateDbResetButtonVisibility() {
    const resetBtn = document.getElementById('resetDbBtn');
    if (resetBtn) {
      const hasCustom = !!localStorage.getItem('CPQ_IMPORTED_PRODUCTS_DATA');
      resetBtn.style.display = hasCustom ? 'inline-flex' : 'none';
    }
  }

  downloadFile(filename, content, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  handleExportPDF() {
    if (!this.selectedModel) return;

    // Validation: Require salesName, customerName, and projectName before generating PDF
    const sales = (this.salesName || '').trim();
    const customer = (this.customerName || '').trim();
    const project = (this.projectName || '').trim();

    if (!sales || !customer || !project) {
      const missingFields = [];
      if (!sales) missingFields.push('Sales Representative');
      if (!customer) missingFields.push('Customer Name');
      if (!project) missingFields.push('Project Name');

      alert(`Cannot export Spec PDF!\n\nPlease fill in all required quotation information fields before generating PDF:\n- ${missingFields.join('\n- ')}`);

      if (!sales) document.getElementById('salesNameInput')?.focus();
      else if (!customer) document.getElementById('customerNameInput')?.focus();
      else if (!project) document.getElementById('projectNameInput')?.focus();

      return;
    }

    const calculations = this.calculateState();
    
    if (window.generateQuotePDF) {
      window.generateQuotePDF({
        salesName: this.salesName,
        customerName: this.customerName,
        projectName: this.projectName,
        model: this.selectedModel,
        selectedOptions: this.selectedOptions,
        customColorValue: this.customColorValue,
        customFirmwareValue: this.customFirmwareValue,
        customOtherValue: this.customOtherValue,
        quoteDocId: this.quoteDocId,
        calculations
      });
    }

    this.showToast('Generating official Specification & Customization PDF Report...');
  }

  showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'toast-notification';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fas fa-check-circle" style="color:var(--accent-teal)"></i> ${message}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

function tryDecryptData(passcode) {
  if (!window.ENCRYPTED_PRODUCTS_DATA || !window.CryptoJS) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(window.ENCRYPTED_PRODUCTS_DATA, passcode);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) return null;
    const parsedData = JSON.parse(decryptedText);
    if (Array.isArray(parsedData) && parsedData.length > 0) {
      return parsedData;
    }
  } catch (e) {
    return null;
  }
  return null;
}

function startApp() {
  try {
    localStorage.removeItem('CPQ_IMPORTED_PRODUCTS_DATA');
  } catch (e) {}

  const overlay = document.getElementById('securityModalOverlay');
  const passcodeInput = document.getElementById('passcodeInput');
  const passcodeForm = document.getElementById('passcodeForm');
  const errorAlert = document.getElementById('passcodeErrorAlert');
  const togglePasscodeBtn = document.getElementById('togglePasscodeBtn');

  // Check if session contains valid passcode already
  const savedPasscode = sessionStorage.getItem('CPQ_UNLOCKED_PASSCODE');
  if (savedPasscode) {
    const decrypted = tryDecryptData(savedPasscode);
    if (decrypted) {
      window.PRODUCTS_DATA = decrypted;
      if (overlay) overlay.style.display = 'none';
      window.app = new CPQApp();
      return;
    }
  }

  // Show modal overlay
  if (overlay) overlay.style.display = 'flex';

  // Focus passcode input
  if (passcodeInput) {
    setTimeout(() => passcodeInput.focus(), 100);
  }

  // Toggle password visibility
  if (togglePasscodeBtn && passcodeInput) {
    togglePasscodeBtn.addEventListener('click', () => {
      const isPwd = passcodeInput.type === 'password';
      passcodeInput.type = isPwd ? 'text' : 'password';
      togglePasscodeBtn.innerHTML = isPwd ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
  }

  const handleUnlock = () => {
    const passcode = passcodeInput ? passcodeInput.value.trim() : '';
    if (!passcode) return;

    const decrypted = tryDecryptData(passcode);
    if (decrypted) {
      window.PRODUCTS_DATA = decrypted;
      sessionStorage.setItem('CPQ_UNLOCKED_PASSCODE', passcode);
      if (errorAlert) errorAlert.style.display = 'none';
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.style.display = 'none';
          overlay.style.opacity = '1';
        }, 300);
      }
      window.app = new CPQApp();
    } else {
      if (errorAlert) {
        errorAlert.style.display = 'block';
      }
      if (passcodeInput) {
        passcodeInput.value = '';
        passcodeInput.focus();
      }
    }
  };

  if (passcodeForm) {
    passcodeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUnlock();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
