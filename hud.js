/**
 * hud.js - Sistem UI & HUD Dash Cluster (KickMX Motocross Theme)
 * Displays: Speedometer, Gear, Range, Tachometer with animated bar, Inclinometer, and Airtime/Boost Banner.
 */

export class HUD {
  constructor() {
    this.elements = {
      speed: document.getElementById('speed-display'),
      gear: document.getElementById('gear-display'),
      range: document.getElementById('range-display'),
      incline: document.getElementById('incline-display'),
      inclineFill: document.getElementById('incline-fill'),
      rpm: document.getElementById('rpm-display'),
      rpmFill: document.getElementById('rpm-fill'),
    };

    this.displaySpeed = 0;
    this.displayRpm = 0;
    this.bannerEl = null;
    this.bannerTimeout = null;

    this._createAirtimeBanner();
  }

  _createAirtimeBanner() {
    if (typeof document === 'undefined') return;

    let banner = document.getElementById('airtime-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'airtime-banner';
      banner.style.cssText = `
        position: fixed;
        top: 18%;
        left: 50%;
        transform: translateX(-50%) scale(0.85);
        background: linear-gradient(135deg, rgba(255, 81, 47, 0.95), rgba(240, 152, 25, 0.95));
        color: #ffffff;
        font-family: 'Teko', 'Impact', sans-serif;
        font-size: 2.2rem;
        letter-spacing: 2px;
        font-weight: 700;
        padding: 6px 28px;
        border-radius: 8px;
        box-shadow: 0 0 30px rgba(255, 102, 0, 0.7), 0 4px 15px rgba(0,0,0,0.5);
        text-transform: uppercase;
        pointer-events: none;
        z-index: 200;
        opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        border: 2px solid rgba(255, 255, 255, 0.8);
        text-shadow: 0 2px 8px rgba(0,0,0,0.4);
      `;
      document.body.appendChild(banner);
    }
    this.bannerEl = banner;
  }

  showAirtime(seconds) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = `⚡ AIRTIME: ${seconds.toFixed(1)}s`;
    this.bannerEl.style.background = 'linear-gradient(135deg, rgba(255, 81, 47, 0.95), rgba(240, 152, 25, 0.95))';
    this.bannerEl.style.boxShadow = '0 0 30px rgba(255, 102, 0, 0.7)';
    this.bannerEl.style.opacity = '1';
    this.bannerEl.style.transform = 'translateX(-50%) scale(1)';
  }

  showBoost(bonusSpeed) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = `🔥 CLEAN LANDING! +BOOST`;
    this.bannerEl.style.background = 'linear-gradient(135deg, #00e5ff, #00a8ff)';
    this.bannerEl.style.boxShadow = '0 0 35px rgba(0, 229, 255, 0.9)';
    this.bannerEl.style.opacity = '1';
    this.bannerEl.style.transform = 'translateX(-50%) scale(1.15)';

    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.hideAirtime();
    }, 1400);
  }

  hideAirtime() {
    if (!this.bannerEl) return;
    this.bannerEl.style.opacity = '0';
    this.bannerEl.style.transform = 'translateX(-50%) scale(0.85)';
  }

  update(bike, airtime = 0, isBoostActive = false) {
    if (!bike) return;

    // Smooth lerp for speedometer numbers
    const targetSpeed = Math.abs(bike.speed || 0);
    this.displaySpeed += (targetSpeed - this.displaySpeed) * 0.25;
    const speedVal = Math.round(this.displaySpeed);
    this._setText(this.elements.speed, speedVal);

    // Gear indicator
    const gear = bike.gear === 0 ? 'N' : bike.gear;
    this._setText(this.elements.gear, gear);

    // Gear range (HIGH / LOW)
    this._setText(this.elements.range, bike.gearRange || 'HIGH');

    // RPM & Tachometer Bar
    const targetRpm = Math.max(800, bike.rpm || 800);
    this.displayRpm += (targetRpm - this.displayRpm) * 0.3;
    const rpmVal = Math.round(this.displayRpm);
    this._setText(this.elements.rpm, rpmVal);

    if (this.elements.rpmFill) {
      const pct = Math.min(100, Math.max(0, (rpmVal / 9500) * 100));
      this.elements.rpmFill.style.width = `${pct}%`;
      // Redline flash
      if (pct > 85) {
        this.elements.rpmFill.style.background = 'linear-gradient(90deg, #ff512f, #ff0055)';
      } else {
        this.elements.rpmFill.style.background = 'linear-gradient(90deg, #00e5ff, #f09819, #ff512f)';
      }
    }

    // Inclinometer / Tilt gauge
    const leanDeg = (bike.leanAngle || 0) * (180 / Math.PI);
    const leanClamped = Math.max(-45, Math.min(45, leanDeg));
    this._setText(this.elements.incline, `${Math.abs(Math.round(leanClamped))}°`);

    if (this.elements.inclineFill) {
      // Offset from center 50%
      const offset = (leanClamped / 45) * 45;
      this.elements.inclineFill.style.transform = `translateX(${offset}px)`;
    }

    // Airtime logic
    if (airtime > 0.35) {
      this.showAirtime(airtime);
    } else if (airtime <= 0 && !isBoostActive) {
      this.hideAirtime();
    }
  }

  _setText(el, val) {
    if (el && el.textContent !== String(val)) {
      el.textContent = val;
    }
  }
}
