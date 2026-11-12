/**
 * controls.js - Manajemen Input Pemain (Keyboard, Arrow Keys, & Virtual Touch Controls)
 */

export class Controls {
  constructor() {
    this.input = {
      throttle: 0,   // -1 s/d 1
      steer: 0,      // -1 s/d 1
      pitch: 0,      // -1 s/d 1
      handbrake: false,
    };
    this.gearRange = 'HIGH';
    this.recoveryRequested = false;

    this._keysDown = new Set();
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    this._initKeyboard();
    this._initTouchJoystick();
    this._initButtons();
  }

  _initKeyboard() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    const k = e.key.toLowerCase();
    this._keysDown.add(k);

    // Throttle & Brake (W/S or ArrowUp/ArrowDown)
    if (k === 'w' || e.key === 'ArrowUp') this.input.throttle = 1;
    else if (k === 's' || e.key === 'ArrowDown') this.input.throttle = -1;

    // Steer (A/D or ArrowLeft/ArrowRight)
    if (k === 'a' || e.key === 'ArrowLeft') this.input.steer = -1;
    else if (k === 'd' || e.key === 'ArrowRight') this.input.steer = 1;

    // Pitch control in air
    if (k === 'shift') this.input.pitch = 1;
    else if (k === 'control') this.input.pitch = -1;

    // Handbrake / Drift
    if (k === ' ') {
      this.input.handbrake = true;
      e.preventDefault();
    }

    // Gear range toggle
    if (k === 'r') this._toggleGearRange();

    // Quick Recovery
    if (k === 'f') this.recoveryRequested = true;
  }

  _onKeyUp(e) {
    const k = e.key.toLowerCase();
    this._keysDown.delete(k);

    // Recompute throttle from currently held keys
    if (this._keysDown.has('w') || this._keysDown.has('arrowup')) {
      this.input.throttle = 1;
    } else if (this._keysDown.has('s') || this._keysDown.has('arrowdown')) {
      this.input.throttle = -1;
    } else {
      this.input.throttle = 0;
    }

    // Recompute steer from currently held keys
    if (this._keysDown.has('a') || this._keysDown.has('arrowleft')) {
      this.input.steer = -1;
    } else if (this._keysDown.has('d') || this._keysDown.has('arrowright')) {
      this.input.steer = 1;
    } else {
      this.input.steer = 0;
    }

    // Recompute pitch
    if (this._keysDown.has('shift')) {
      this.input.pitch = 1;
    } else if (this._keysDown.has('control')) {
      this.input.pitch = -1;
    } else {
      this.input.pitch = 0;
    }

    if (k === ' ') {
      this.input.handbrake = false;
    }
  }

  _toggleGearRange() {
    this.gearRange = this.gearRange === 'HIGH' ? 'LOW' : 'HIGH';
  }

  _initTouchJoystick() {
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    if (!base || !stick) return;

    let active = false;
    let sx = 0, sy = 0;
    const maxMove = 50;

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      active = true;
      const t = e.touches[0];
      const r = base.getBoundingClientRect();
      sx = r.left + r.width / 2;
      sy = r.top + r.height / 2;
      this._moveStick(t.clientX, t.clientY, sx, sy, maxMove, stick);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!active) return;
      e.preventDefault();
      const t = e.touches[0];
      this._moveStick(t.clientX, t.clientY, sx, sy, maxMove, stick);
    }, { passive: false });

    const end = () => {
      active = false;
      stick.style.transform = 'translate(-50%, -50%)';
      this.input.steer = 0;
      this.input.throttle = 0;
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  }

  _moveStick(cx, cy, sx, sy, maxMove, stick) {
    let dx = cx - sx;
    let dy = cy - sy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxMove) {
      const a = Math.atan2(dy, dx);
      dx = Math.cos(a) * maxMove;
      dy = Math.sin(a) * maxMove;
    }
    stick.style.transform = `translate(${sx + dx - cx}px, ${sy + dy - cy}px)`;
    this.input.steer = dx / maxMove;
    this.input.throttle = -dy / maxMove;
  }

  _initButtons() {
    document.querySelectorAll('.btn').forEach(btn => {
      const activate = () => {
        if (btn.id === 'btn-throttle') this.input.throttle = 1;
        if (btn.id === 'btn-brake') this.input.throttle = -1;
        if (btn.id === 'btn-handbrake') this.input.handbrake = true;
        if (btn.id === 'btn-recovery') this.recoveryRequested = true;
        if (btn.id === 'btn-gear') this._toggleGearRange();
        btn.classList.add('active');
      };
      const deactivate = () => {
        if (btn.id === 'btn-throttle' && this.input.throttle > 0) this.input.throttle = 0;
        if (btn.id === 'btn-brake' && this.input.throttle < 0) this.input.throttle = 0;
        if (btn.id === 'btn-handbrake') this.input.handbrake = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); activate(); });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); deactivate(); });
      btn.addEventListener('mousedown', activate);
      btn.addEventListener('mouseup', deactivate);
      btn.addEventListener('mouseleave', deactivate);
    });
  }

  getInput() {
    return {
      throttle: this.input.throttle,
      steer: this.input.steer,
      pitch: this.input.pitch,
      handbrake: this.input.handbrake,
      gearRange: this.gearRange,
      recoveryRequested: this.recoveryRequested,
    };
  }

  resetRecovery() {
    this.recoveryRequested = false;
  }
}
