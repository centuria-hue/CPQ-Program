class CPQApp {
  constructor() {
    this.products = [];
    this.selectedModel = null;
    this.selectedOptions = {};
    this.customColorValue = '';
    this.customFirmwareValue = '';
    
    this.salesName = '';
    this.customerName = '';
    this.projectName = '';
    
    this.init();
  }

  init() {
    this.products = window.PRODUCTS_DATA || window.__EMBEDDED_PRODUCTS_DATA__ || [];
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
            <span>Base MOQ: ${p.baseMOQ} pcs</span>
          </div>
        </div>
      `;
    }).join('');
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
          const activeOpt = customConfig.options.find(o => o.id === activeOptId);
          const needsInput = activeOpt && activeOpt.requiresCustomInput;

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
            }
          }

          html += `
            <tr class="customizable-row">
              <td class="spec-key">
                ${item.key}
                <span class="badge-customizable">
                  <i class="fas fa-sliders-h"></i> Custom
                </span>
              </td>
              <td class="spec-val">
                <select class="custom-select" data-custom-key="${item.customKey}">
                  ${customConfig.options.map(opt => `
                    <option value="${opt.id}" ${opt.id === activeOptId ? 'selected' : ''}>
                      ${opt.name}
                    </option>
                  `).join('')}
                </select>
                
                ${customInputFieldHtml}

                ${this.renderOptionTags(customConfig, activeOptId)}
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
        
        // Re-render spec table if text input field state changes
        const customConfig = this.selectedModel.customizableSpecs[customKey];
        const selectedOpt = customConfig.options.find(o => o.id === newValue);
        
        if (selectedOpt && (selectedOpt.requiresCustomInput || customKey === 'casingColor' || customKey === 'firmwareOption')) {
          this.renderSpecTable();
        } else {
          const parentTd = select.parentElement;
          const tagsContainer = parentTd.querySelector('.option-meta-tag');
          if (tagsContainer) {
            tagsContainer.outerHTML = this.renderOptionTags(customConfig, newValue);
          }
        }

        this.updateCalculations();
      });
    });

    // Attach custom text input listeners (supports both input & textarea)
    specContainer.querySelectorAll('.custom-text-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const customKey = input.getAttribute('data-custom-key');
        if (customKey === 'casingColor') {
          this.customColorValue = e.target.value;
        } else if (customKey === 'firmwareOption') {
          this.customFirmwareValue = e.target.value;
        }
      });
    });
  }

  renderOptionTags(customConfig, activeOptId) {
    const activeOpt = customConfig.options.find(o => o.id === activeOptId);
    if (!activeOpt) return '';

    const tags = [];
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

    if (this.selectedModel.customizableSpecs) {
      Object.keys(this.selectedModel.customizableSpecs).forEach(key => {
        const customConfig = this.selectedModel.customizableSpecs[key];
        const activeOptId = this.selectedOptions[key];
        const activeOpt = customConfig.options.find(o => o.id === activeOptId);

        if (activeOpt) {
          totalAddon += activeOpt.addonPrice || 0;
          totalNRE += activeOpt.nreFee || 0;
          if (activeOpt.moqImpact && activeOpt.moqImpact > maxMOQ) {
            maxMOQ = activeOpt.moqImpact;
          }
        }
      });
    }

    return {
      totalAddon,
      totalNRE,
      moq: maxMOQ
    };
  }

  updateCalculations() {
    const calc = this.calculateState();
    if (!calc) return;

    // Update UI readout elements
    const addonPriceEl = document.getElementById('readoutAddonPrice');
    const nreFeeEl = document.getElementById('readoutNreFee');
    const moqEl = document.getElementById('readoutMoq');

    if (addonPriceEl) addonPriceEl.textContent = `${calc.totalAddon >= 0 ? '+' : ''}$${calc.totalAddon.toLocaleString()} USD`;
    if (nreFeeEl) nreFeeEl.textContent = `$${calc.totalNRE.toLocaleString()} USD`;
    if (moqEl) moqEl.textContent = `${calc.moq.toLocaleString()} Units`;
  }

  handleExportPDF() {
    if (!this.selectedModel) return;

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
        calculations
      });
    }

    this.showToast('Generating official PDF Specification Sheet...');
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

function startApp() {
  window.app = new CPQApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
