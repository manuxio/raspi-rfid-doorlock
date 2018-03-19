import wiringPi from 'wiring-pi';
import mydebugger from 'debug';
const debug = mydebugger('nfc-locker');

export default class Locker {
  constructor(options) {
    this.gpioPin = options.gpioPin;
    if (this.hasGpio()) {
      this.openTime = options.openTime;
      this.prolongTimeOnReopen = options.prolongTimeOnReopen;

      wiringPi.setup('wpi');
      wiringPi.pinMode(this.gpioPin, wiringPi.OUTPUT);
      wiringPi.digitalWrite(this.gpioPin, 0);
      this.open = false;
      debug('Locker initialized on wiPi pin %i', this.gpioPin);
    }
  }

  hasGpio() {
    return (typeof this.gpioPin === 'number' && this.gpioPin > -1);
  }

  unlock() {
    if (!this.hasGpio()) {
      debug('No gpioPin configured!');
      return -1;
    }
    if (this.open) {
      if (this.openTime > 0 && this.prolongTimeOnReopen) {
        if (this.closeTimer) {
          clearTimeout(this.closeTimer);
        }
        this.closeTimer = setTimeout(() => {
          this.lock();
        }, this.openTime);
        debug('Lock will stay open for %i ms more', this.openTime);
      } else {
        debug('Lock already open!');
        return;
      }
    } else {
      wiringPi.digitalWrite(this.gpioPin, 1);
      this.open = true;
      if (this.openTime > 0) {
        this.closeTimer = setTimeout(() => {
          this.lock();
        }, this.openTime);
        debug('Lock is now open for %i ms', this.openTime);
      } else {
        debug('Lock is now open');
      }
    }
    return 1;
  }

  lock() {
    if (!this.hasGpio()) {
      debug('No gpioPin configured!');
      return -1;
    }
    if (!this.open) {
      debug('Lock already closed!');
    } else {
      if (this.closeTimer) {
        clearTimeout(this.closeTimer);
      }
      wiringPi.digitalWrite(this.gpioPin, 0);
      this.open = false;
      debug('Lock is now closed');
    }
    return 1;
  }

  status() {
    if (!this.hasGpio()) {
      debug('No gpioPin configured!');
      return;
    }
    return this.open;
  }

}
