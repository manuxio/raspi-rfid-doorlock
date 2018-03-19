import mfrc522 from 'mfrc522-rpi';
import mydebugger from 'debug';
import EventEmitter from 'eventemitter2';
import async from 'async';

const debug = mydebugger('nfc-cardreader');

export default class CardReader extends EventEmitter {
  constructor(options) {
    super();
    this.listening = false;
    this.inCycle = false;
    this.interval = options.readerInterval || 250;
    mfrc522.initWiringPi(0);
  }

  startListening() {
    if (this.working) {
      return true;
    }
    this.listening = true;
    this.doCycle();
  }

  stopListening() {
    this.listening = false;
  }

  cycleEnd() {
    this.working = false;
    if (this.listening) {
      setTimeout(() => {
        this.doCycle();
      }, this.interval);
    }
  }

  manageUidListeners(uidresponse) {
    return new Promise((resolve, reject) => {
      const listeners = this.listeners('uid');
      debug('I have %i listeners', listeners.length);
      async.mapSeries(
        listeners,
        (fn, cb) => {
          fn(uidresponse, cb);
        },
        (err) => {
          debug('All listeners completed!');
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  doCycle() {
    this.working = true;
    mfrc522.reset();
    const search = mfrc522.findCard();
    // debug('Response %O', search);
    if (!search.status) {
      this.working = false;
      this.cycleEnd();
      return;
    }
    if (search.status) {
      const uidresponse = mfrc522.getUid();
      if (!uidresponse.status) {
          // console.log("UID Scan Error");
          debug('UID Scan Error');
          this.cycleEnd();
          return;
      } else {
        // this.emit('uid', uidresponse);
        debug('UID response %s', uidresponse.data.join(','));
        this.manageUidListeners(uidresponse)
          .then(
            () => {
              this.cycleEnd();
            },
            (e) => {
              this.cycleEnd();
            }
          );
      }
    }
  }

  selectCard(uid) {
    return mfrc522.selectCard(uid);
  }

  authenticate(...rest) {
    return mfrc522.authenticate(...rest);
  }

  readBlock(block) {
    const result = mfrc522.getDataForBlock(block);
    return result;
  }

  writeBlock(block, data) {
    if (block % 4 === 3) {
      throw new Error('Cannot write to trailer block!');
    }
    if (data.length !== 16) {
      throw new Error('Must write 16 bytes!');
    }

    if (data.filter((el) => typeof el !== 'number' || el > 255).length > 0) {
      throw new Error('Each byte must be less than 255!');
    }
    const result = mfrc522.writeDataToBlock(block, data);
    return result;
  }

  stopCrypto(...rest) {
    return mfrc522.stopCrypto(...rest);
  }
}
