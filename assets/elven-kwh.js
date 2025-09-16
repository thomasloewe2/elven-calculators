(function(){
  // --- Utils ---
  function parseLocaleNumber(str){
    if (typeof str !== 'string') str = String(str ?? '');
    str = str.trim().replace(/\s/g, '');
    if (!str) return NaN;

    const lastComma = str.lastIndexOf(',');
    const lastDot   = str.lastIndexOf('.');

    if (lastComma === -1 && lastDot === -1){
      return Number(str.replace(/[^\d-]/g, ''));
    }

    let decimalSep = -1;
    if (lastComma === -1) decimalSep = lastDot;
    else if (lastDot === -1) decimalSep = lastComma;
    else decimalSep = Math.max(lastComma, lastDot);

    let intPart, fracPart;
    if (decimalSep === -1){
      intPart = str.replace(/[^\d-]/g, '');
      return Number(intPart);
    } else {
      intPart  = str.slice(0, decimalSep).replace(/[^\d-]/g, '');
      fracPart = str.slice(decimalSep+1).replace(/[^\d]/g, '');
      return Number(intPart + '.' + fracPart);
    }
  }

  function formatDK(n, digits){
    if (!isFinite(n)) return '-';
    return n.toLocaleString('da-DK', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function el(tag, cls, html){
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // --- KWH Component ---
  class ElvenKwhCalc {
    constructor(root){
      this.root = root;
      this.build();
      this.bind();
      this.update();
    }

    build(){
      const wrapper = el('div', 'elven-calc-wrap');
      wrapper.innerHTML = `
        <div class="elven-calc-card" role="group" aria-label="KWH Calculator">
          <div class="elven-calc-grid">
            <div class="elven-calc-field elven-calc-col-full">
              <span>Calculation Mode:</span>
              <div class="elven-calc-mode-switch" role="radiogroup" aria-label="Calculation Mode">
                <label>
                  <input type="radio" name="mode-${this.root.id}" value="hour" checked>
                  <span>Per Hour</span>
                </label>
                <label>
                  <input type="radio" name="mode-${this.root.id}" value="use">
                  <span>Per Use</span>
                </label>
              </div>
            </div>

            <label class="elven-calc-field">
              <span>Watt (W)</span>
              <input type="text" inputmode="decimal" class="elven-watt" placeholder="e.g. 100" aria-label="Watt (W)">
            </label>
            <label class="elven-calc-field">
              <span>Price (kr./kWh)</span>
              <input type="text" inputmode="decimal" class="elven-price" placeholder="e.g. 2,50" aria-label="Price (kr./kWh)">
            </label>

            <label class="elven-calc-field elven-field-use elven-hidden">
              <span>Minutes per use</span>
              <input type="text" inputmode="decimal" class="elven-minutes" placeholder="e.g. 30" aria-label="Minutes per use">
            </label>
            <label class="elven-calc-field elven-field-use elven-hidden">
              <span>Times per week</span>
              <input type="text" inputmode="decimal" class="elven-times" placeholder="e.g. 3" aria-label="Times per week">
            </label>
          </div>
          
          <div class="elven-calc-results">
            <p>Results</p>
            <div class="elven-kwh-results-grid" role="table" aria-label="Results">
              <div class="elven-calc-row elven-row-per-unit" role="row">
                <div role="cell">Price per use</div>
                <div role="cell"><strong><span class="r-per-unit">-</span> kr.</strong></div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Price per day</div>
                <div role="cell"><strong><span class="r-per-day">-</span> kr.</strong></div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Price per week</div>
                <div role="cell"><strong><span class="r-per-week">-</span> kr.</strong></div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Price per month</div>
                <div role="cell"><strong><span class="r-per-month">-</span> kr.</strong></div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Price per year</div>
                <div role="cell"><strong><span class="r-per-year">-</span> kr.</strong></div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      this.root.appendChild(wrapper);

      // Element refs
      this.modeRadios  = wrapper.querySelectorAll('.elven-calc-mode-switch input[type="radio"]');
      this.fUse        = wrapper.querySelectorAll('.elven-field-use');
      this.rPerUnit    = wrapper.querySelector('.elven-row-per-unit');

      this.inWatt      = wrapper.querySelector('.elven-watt');
      this.inPrice     = wrapper.querySelector('.elven-price');
      this.inMinutes   = wrapper.querySelector('.elven-minutes');
      this.inTimes     = wrapper.querySelector('.elven-times');
      
      this.rUnit       = wrapper.querySelector('.r-per-unit');
      this.rDay        = wrapper.querySelector('.r-per-day');
      this.rWeek       = wrapper.querySelector('.r-per-week');
      this.rMonth      = wrapper.querySelector('.r-per-month');
      this.rYear       = wrapper.querySelector('.r-per-year');
      
      // Set defaults from data attributes
      const defPrice = this.root.getAttribute('data-default-price') || '';
      const defWatt = this.root.getAttribute('data-default-watt') || '';
      if (defPrice) this.inPrice.value = defPrice;
      if (defWatt) this.inWatt.value = defWatt;
      
      // Set fallback defaults
      if (!this.inPrice.value) this.inPrice.value = '2,50';
      if (!this.inWatt.value) this.inWatt.value = '100';
      this.inMinutes.value = '30';
      this.inTimes.value = '3';
    }

    bind(){
      const onInput = () => this.update();
      this.modeRadios.forEach(radio => radio.addEventListener('change', onInput));
      
      [this.inWatt, this.inPrice, this.inMinutes, this.inTimes]
        .forEach(el => el.addEventListener('input', onInput));
    }

    update(){
      const mode = this.root.querySelector('.elven-calc-mode-switch input:checked').value;
      const isPerUseMode = mode === 'use';

      // Toggle field visibility
      this.fUse.forEach(el => el.classList.toggle('elven-hidden', !isPerUseMode));
      this.rPerUnit.classList.toggle('elven-hidden', !isPerUseMode);
      
      // Read values
      const watt   = parseLocaleNumber(this.inWatt.value);
      const price  = parseLocaleNumber(this.inPrice.value);
      
      const kwh = watt / 1000;
      const costPerHour = kwh * price;

      let costPerDay, costPerWeek, costPerMonth, costPerYear, costPerUnit;

      if (isPerUseMode) {
        // "Per Use" calculation
        const minutes = parseLocaleNumber(this.inMinutes.value);
        const times   = parseLocaleNumber(this.inTimes.value);
        
        costPerUnit = (minutes / 60) * costPerHour;
        costPerWeek = costPerUnit * times;
        costPerDay  = costPerWeek / 7;
      } else {
        // "Per Hour" calculation (as in, 24/7)
        costPerDay  = costPerHour * 24;
        costPerWeek = costPerDay * 7;
        costPerUnit = NaN; // Not applicable
      }
      
      costPerMonth = costPerDay * (365.25 / 12);
      costPerYear  = costPerDay * 365.25;

      // Display results
      this.rUnit.textContent  = formatDK(costPerUnit, 2);
      this.rDay.textContent   = formatDK(costPerDay, 2);
      this.rWeek.textContent  = formatDK(costPerWeek, 2);
      this.rMonth.textContent = formatDK(costPerMonth, 2);
      this.rYear.textContent  = formatDK(costPerYear, 2);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.elven-kwh-calculator').forEach(node => new ElvenKwhCalc(node));
  });
})();