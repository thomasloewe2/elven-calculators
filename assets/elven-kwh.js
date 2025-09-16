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

  // --- Component ---
  class ElvenKwhCalc {
    constructor(root){
      this.root = root;
      this.build();
      this.bind();
      this.update();
    }

    build(){
      // Use shared 'elven-calc-wrap' class
      const wrapper = el('div', 'elven-calc-wrap');

      wrapper.innerHTML = `
        <div class="elven-calc-card" role="group" aria-label="Elven kWh calculator">
          <div class="elven-calc-grid">
            
            <div class="elven-calc-field elven-calc-col-full">
              <span>Beregn forbrug pr. gang eller pr. time?</span>
              <div class="elven-calc-mode-switch" role="radiogroup" aria-label="Beregningstype">
                <label>
                  <input type="radio" name="mode-${this.root.id}" value="per_use" checked>
                  <span>Pr. gang</span>
                </label>
                <label>
                  <input type="radio" name="mode-${this.root.id}" value="per_hour">
                  <span>Pr. time</span>
                </label>
              </div>
            </div>

            <label class="elven-calc-field elven-field-per-use elven-field-duration">
              <span>Varighed pr. gang (minutter)</span>
              <input type="text" inputmode="decimal" class="elven-duration-min" placeholder="fx 90" aria-label="Varighed pr. gang (minutter)">
            </label>

            <label class="elven-calc-field elven-field-per-use">
              <span>Antal anvendelser pr. uge</span>
              <input type="text" inputmode="decimal" class="elven-uses-per-week" placeholder="fx 5" aria-label="Anvendelser pr. uge">
            </label>

            <label class="elven-calc-field elven-field-per-hour">
              <span>Antal timer pr. dag</span>
              <input type="text" inputmode="decimal" class="elven-hours-per-day" placeholder="fx 2" aria-label="Timer pr. dag">
            </label>

            <label class="elven-calc-field elven-watt-label">
              <span>Apparatets forbrug (kWh pr. gang)</span>
              <input type="text" inputmode="decimal" class="elven-watt" placeholder="fx 0,75" aria-label="Forbrug i kWh pr. gang">
            </label>
            
            <label class="elven-calc-field">
              <span>Antal apparater</span>
              <input type="text" inputmode="numeric" class="elven-devices" value="1" aria-label="Antal apparater">
            </label>

            <label class="elven-calc-field">
              <span>Elpris (kr./kWh)</span>
              <input type="text" inputmode="decimal" class="elven-price" placeholder="fx 2,50" aria-label="Elpris i kr./kWh">
            </label>
          </div>

          <div class="elven-calc-results">
            <p>Resultat</p>
            <div class="elven-calc-table" role="table" aria-label="Resultater">
              <div class="elven-calc-row" role="row">
                <div role="cell">Pr. enhed (gang/time)</div>
                <div role="cell"><span class="r-unit-kwh">-</span> kWh ⇔ <span class="r-unit-kr">-</span> kr.</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Pr. dag</div>
                <div role="cell"><span class="r-day-kwh">-</span> kWh ⇔ <span class="r-day-kr">-</span> kr.</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Pr. uge</div>
                <div role="cell"><span class="r-week-kwh">-</span> kWh ⇔ <span class="r-week-kr">-</span> kr.</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Pr. måned</div>
                <div role="cell"><span class="r-month-kwh">-</span> kWh ⇔ <span class="r-month-kr">-</span> kr.</div>
              </div>
              <div class="elven-calc-row" role="row">
                <div role="cell">Pr. år</div>
                <div role="cell"><span class="r-year-kwh">-</span> kWh ⇔ <span class="r-year-kr">-</span> kr.</div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.root.appendChild(wrapper);

      // Refs
      this.modeRadios  = wrapper.querySelectorAll('.elven-calc-mode-switch input[type="radio"]');
      this.fPerUse   = wrapper.querySelectorAll('.elven-field-per-use');
      this.fPerHour  = wrapper.querySelector('.elven-field-per-hour');
      this.fieldDuration = wrapper.querySelector('.elven-field-duration');
      this.labelWatt = wrapper.querySelector('.elven-watt-label span');

      this.inDurationMin   = wrapper.querySelector('.elven-duration-min');
      this.inUsesPerWeek   = wrapper.querySelector('.elven-uses-per-week');
      this.inHoursPerDay  = wrapper.querySelector('.elven-hours-per-day');
      this.inWatt          = wrapper.querySelector('.elven-watt');
      this.inDevices       = wrapper.querySelector('.elven-devices');
      this.inPrice         = wrapper.querySelector('.elven-price');

      this.rUnitKwh  = wrapper.querySelector('.r-unit-kwh');
      this.rUnitKr   = wrapper.querySelector('.r-unit-kr');
      this.rDayKwh   = wrapper.querySelector('.r-day-kwh');
      this.rDayKr    = wrapper.querySelector('.r-day-kr');
      this.rWeekKwh  = wrapper.querySelector('.r-week-kwh');
      this.rWeekKr   = wrapper.querySelector('.r-week-kr');
      this.rMonthKwh = wrapper.querySelector('.r-month-kwh');
      this.rMonthKr  = wrapper.querySelector('.r-month-kr');
      this.rYearKwh  = wrapper.querySelector('.r-year-kwh');
      this.rYearKr   = wrapper.querySelector('.r-year-kr');

      // Defaults from data-attributes (if provided)
      const defPrice = this.root.getAttribute('data-default-price') || '';
      const defWatt  = this.root.getAttribute('data-default-watt') || '';
      if (defPrice) this.inPrice.value = defPrice;
      if (defWatt)  this.inWatt.value  = defWatt;

      // Helpful initial values if nothing set
      if (!this.inPrice.value) this.inPrice.value = '2,50';
      if (!this.inWatt.value)  this.inWatt.value  = '0,75';
      this.inDurationMin.value = '90';
      this.inUsesPerWeek.value = '5';
      this.inHoursPerDay.value = '2';
    }

    bind(){
      const onInput = () => this.update();
      this.modeRadios.forEach(radio => radio.addEventListener('change', onInput));
      
      [this.inDurationMin, this.inUsesPerWeek, this.inHoursPerDay, this.inWatt, this.inDevices, this.inPrice]
        .forEach(el => el.addEventListener('input', onInput));
    }

    update(){
      const mode = this.root.querySelector('.elven-calc-mode-switch input:checked').value;
      const isPerUseMode = mode === 'per_use';

      // Toggle visibility
      this.fPerUse.forEach(el => el.classList.toggle('elven-hidden', !isPerUseMode));
      this.fPerHour.classList.toggle('elven-hidden', isPerUseMode);
      
      // Handle special visibility and labels
      if (isPerUseMode) {
        this.fieldDuration.classList.add('elven-hidden'); // This was in your original file
        this.labelWatt.textContent = 'Apparatets forbrug (kWh pr. gang)';
        this.inWatt.setAttribute('aria-label', 'Forbrug i kWh pr. gang');
        this.inWatt.placeholder = 'fx 0,75';
      } else {
        this.labelWatt.textContent = 'Apparatets effekt (Watt)';
        this.inWatt.setAttribute('aria-label', 'Effekt i Watt');
        this.inWatt.placeholder = 'fx 1000';
      }

      // Read inputs
      const W       = parseLocaleNumber(this.inWatt.value); // Can be Watt or kWh
      const devices = parseLocaleNumber(this.inDevices.value) || 1;
      const price   = parseLocaleNumber(this.inPrice.value);

      let unitKwh, totalWeekKwh;

      if (isPerUseMode){
        const usesW   = parseLocaleNumber(this.inUsesPerWeek.value);
        unitKwh = W; // kWh for a single use of a single device
        totalWeekKwh = unitKwh * usesW * devices;
      } else { // mode === 'per_hour'
        const hoursD = parseLocaleNumber(this.inHoursPerDay.value);
        const watt = W;
        unitKwh = watt / 1000; // kWh for one hour for a single device
        totalWeekKwh = (watt * hoursD * 7 * devices) / 1000;
      }

      // --- Calculations based on total weekly consumption ---
      const unitKr   = unitKwh * price;
      const totalDayKwh   = totalWeekKwh / 7;
      const totalDayKr    = totalDayKwh * price;
      const totalWeekKr   = totalWeekKwh * price;
      const totalMonthKwh = totalDayKwh * (365 / 12);
      const totalMonthKr  = totalDayKr * (365 / 12);
      const totalYearKwh  = totalDayKwh * 365;
      const totalYearKr   = totalDayKr * 365;
      
      // Display results
      this.rUnitKwh.textContent  = isFinite(unitKwh)  ? formatDK(unitKwh, 2) : '-';
      this.rUnitKr.textContent   = isFinite(unitKr)   ? formatDK(unitKr, 2)  : '-';
      this.rDayKwh.textContent   = isFinite(totalDayKwh)   ? formatDK(totalDayKwh, 2)  : '-';
      this.rDayKr.textContent    = isFinite(totalDayKr)    ? formatDK(totalDayKr, 2)   : '-';
      this.rWeekKwh.textContent  = isFinite(totalWeekKwh)  ? formatDK(totalWeekKwh, 2) : '-';
      this.rWeekKr.textContent   = isFinite(totalWeekKr)   ? formatDK(totalWeekKr, 2)  : '-';
      this.rMonthKwh.textContent = isFinite(totalMonthKwh) ? formatDK(totalMonthKwh, 2): '-';
      this.rMonthKr.textContent  = isFinite(totalMonthKr)  ? formatDK(totalMonthKr, 2) : '-';
      this.rYearKwh.textContent  = isFinite(totalYearKwh)  ? formatDK(totalYearKwh, 2) : '-';
      this.rYearKr.textContent   = isFinite(totalYearKr)   ? formatDK(totalYearKr, 2)  : '-';
    }
  }

  // Hydrate all instances
  document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.elven-kwh-calculator').forEach(node => new ElvenKwhCalc(node));
  });
})();