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

  // --- EV Component ---
  class ElvenEvCalc {
    constructor(root){
      this.root = root;
      this.build();
      this.bind();
      this.update();
    }

    build(){
      const wrapper = el('div', 'elven-calc-wrap');
      wrapper.innerHTML = `
        <div class="elven-calc-card" role="group" aria-label="EV Calculator">
          <div class="elven-calc-grid">
            
            <label class="elven-calc-field">
              <span>Rækkevidde (km)</span>
              <input type="text" inputmode="decimal" class="elven-range" placeholder="fx 450" aria-label="EV Range (km)">
            </label>

            <label class="elven-calc-field">
              <span>Batterikapacitet (kWh)</span>
              <input type="text" inputmode="decimal" class="elven-battery" placeholder="fx 77" aria-label="Battery Capacity (kWh)">
            </label>

            <label class="elven-calc-field">
              <span>Årligt kørselsbehov (km)</span>
              <input type="text" inputmode="decimal" class="elven-driving" placeholder="fx 20000" aria-label="Årligt kørselsbehov (km)">
            </label>

            <label class="elven-calc-field">
              <span>Elpris (kr./kWh)</span>
              <input type="text" inputmode="decimal" class="elven-price" placeholder="fx 2,50" aria-label="Elpris (kr./kWh)">
            </label>
          </div>

          <div class="elven-calc-results">
            <p>Resultat</p>
            <div class="elven-calc-table" role="table" aria-label="Resultat">
              <div class="elven-calc-row" role="row">
                <div role="cell">Forbrug</div>
                <div role="cell"><span class="r-kwh-km">-</span> kWh/km</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Årligt forbrug</div>
                <div role="cell"><span class="r-annual-kwh">-</span> kWh</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell"><strong>Årlige omkostninger</strong></div>
                <div role="cell"><strong><span class="r-annual-cost-ev">-</span> kr.</strong></div>
              </div>
            </div>
          </div>

          <div class="elven-calc-comparison">
            <p>Sammenlign med brændstofbil</p>
            <div class="elven-calc-grid">
              <label class="elven-calc-field">
                <span>Brændstofbil (km/l)</span>
                <input type="text" inputmode="decimal" class="elven-fuel-kmpl" placeholder="fx 15" aria-label="Brændstofbil (km/l)">
              </label>
              <label class="elven-calc-field">
                <span>Brændstofpris (kr./liter)</span>
                <input type="text" inputmode="decimal" class="elven-fuel-price" placeholder="fx 13,00" aria-label="Brændstofpris (kr./liter)">
              </label>
            </div>
            <div class="elven-calc-results" style="margin-top:12px;">
              <div class="elven-calc-table" role="table" aria-label="Sammenligning">
                <div class="elven-calc-row" role="row">
                  <div role="cell"><strong>Årlige omkostninger</strong></div>
                  <div role="cell"><strong><span class="r-annual-cost-fuel">-</span> kr.</strong></div>
                </div>
                <div class="elven-calc-row" role="row">
                  <div role="cell"><strong>Årlig forskel</strong></div>
                  <div role="cell"><strong><span class="r-annual-saving">-</span> kr.</strong></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;

      this.root.appendChild(wrapper);

      // Element refs
      this.inRange       = wrapper.querySelector('.elven-range');
      this.inBattery     = wrapper.querySelector('.elven-battery');
      this.inDriving     = wrapper.querySelector('.elven-driving');
      this.inPrice       = wrapper.querySelector('.elven-price');
      this.inFuelKmpl    = wrapper.querySelector('.elven-fuel-kmpl');
      this.inFuelPrice   = wrapper.querySelector('.elven-fuel-price');
      
      this.rKwhKm        = wrapper.querySelector('.r-kwh-km');
      this.rAnnualKwh    = wrapper.querySelector('.r-annual-kwh');
      this.rAnnualCostEv = wrapper.querySelector('.r-annual-cost-ev');
      
      this.rAnnualCostFuel = wrapper.querySelector('.r-annual-cost-fuel');
      this.rAnnualSaving   = wrapper.querySelector('.r-annual-saving');

      // Set defaults from data attributes
      const defPrice = this.root.getAttribute('data-default-price') || '';
      const defFuelPrice = this.root.getAttribute('data-default-fuel-price') || '';
      if (defPrice) this.inPrice.value = defPrice;
      if (defFuelPrice) this.inFuelPrice.value = defFuelPrice;

      // Set fallback defaults
    //   if (!this.inPrice.value) this.inPrice.value = '2,50';
      if (!this.inFuelPrice.value) this.inFuelPrice.value = '13,00';
      
      // Set EV defaults
    //   this.inRange.value = '450';
    //   this.inBattery.value = '77';
    //   this.inDriving.value = '20000';
      
      // Set Fuel defaults
      if (!this.inFuelKmpl.value) this.inFuelKmpl.value = '15';
    }

    bind(){
      const onInput = () => this.update();
      
      [this.inRange, this.inBattery, this.inDriving, this.inPrice, this.inFuelKmpl, this.inFuelPrice]
        .forEach(el => el.addEventListener('input', onInput));
    }

    update(){
      // --- Read input values ---
      const range   = parseLocaleNumber(this.inRange.value);
      const battery = parseLocaleNumber(this.inBattery.value);
      const driving = parseLocaleNumber(this.inDriving.value);
      const price   = parseLocaleNumber(this.inPrice.value);
      
      const fuelKmpl  = parseLocaleNumber(this.inFuelKmpl.value);
      const fuelPrice = parseLocaleNumber(this.inFuelPrice.value);

      // --- Calculate EV ---
      const kwhPerKm = battery / range; // kWh per km
      const annualKwh = kwhPerKm * driving;
      const annualEvCost = annualKwh * price;

      // --- Calculate Fuel ---
      const annualLiters = driving / fuelKmpl;
      const annualFuelCost = annualLiters * fuelPrice;
      
      // --- Calculate Savings ---
      const annualSaving = annualFuelCost - annualEvCost;
      
      // --- Display Results (EV) ---
      this.rKwhKm.textContent        = formatDK(kwhPerKm, 3);
      this.rAnnualKwh.textContent    = formatDK(annualKwh, 0);
      this.rAnnualCostEv.textContent = formatDK(annualEvCost, 0);
      
      // --- Display Results (Comparison) ---
      this.rAnnualCostFuel.textContent = formatDK(annualFuelCost, 0);
      this.rAnnualSaving.textContent   = formatDK(annualSaving, 0);
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.elven-ev-calculator').forEach(node => new ElvenEvCalc(node));
  });
})();