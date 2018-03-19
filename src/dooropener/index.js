import mydebugger from 'debug';
import moment from 'moment';
import CardClient from '../cardclient/';
import async from 'async';

let done = false;

const debug = mydebugger('nfc-dooropener');

export default class DoorOpener extends CardClient {
  constructor(options) {
    super(options);
    this.config = options;
    this.lockerName = options.lockerName;
  }

  setLocker(locker) {
    this.locker = locker;
  }

  onUid(uidresponse) {
    if (this.locker.status()) {
      debug('Door is already open!');
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => { // Init card
      const uid = uidresponse.data.reduce((prev, curr) => {
        let hex = curr.toString(16).toUpperCase();
        if (hex.length < 2) {
          hex = '0' + hex;
        }
        prev += hex;
        return prev;
      }, '');
      debug('Validating card uid %s on locker "%s"', uid, this.lockerName);
      // if (uid === 'AAC99C29D6') {
      //   debug('Uid %s is valid on locker "%s"', uid, this.lockerName);
      //   this.locker.unlock();
      // }
      debug('Selecting card');
      const cardTypeInt = this.selectCard(this.hexStringToIntArray(uid));
      const cardType = this.getCardTypeFromSelectResponse(cardTypeInt);
      if (!cardType) {
        reject();
      } else {
        resolve({ uid, cardType });
      }
    })
    .then( // Debug
      (data) => {
        debug('Card ready');
        return Promise.resolve(data);
      },
      (e) => Promise.reject(e)
    )
    .then( // Load A Keys
      ({ uid, cardType }) => {
        const AKeys = [];
        for (let i = 0; i < cardType.sectors; i++) {
          AKeys.push(this.config.AKeys[i]);
        }
        return Promise.resolve({ uid, cardType, AKeys });
      },
      (e) => Promise.reject(e)
    )
    .then( // Load B Keys
      ({ cardType, ...rest }) => {
        const BKeys = [];
        for (let i = 0; i < cardType.sectors; i++) {
          BKeys.push(this.config.BKeys[i]);
        }
        return Promise.resolve({ cardType, BKeys, ...rest });
      },
      (e) => Promise.reject(e)
    )
    .then( // Read all blocks
      ({ cardType, AKeys, BKeys, uid }) => {
        const readOperations = [];
        const blocksToRead = [];
        Object.keys(this.config.dataPositions).forEach((k) => {
          blocksToRead.push(...this.config.dataPositions[k].blocks);
        });
        let cnt = 0;
        for (let sector = 0; sector < cardType.sectors; sector++) {
          for (let block = 4 * sector; block < ((4 * sector) + 4); block++) {
            if (blocksToRead.indexOf(block) > -1) {
              cnt++;
              readOperations.push((cb) => {
                // debug('Authenticating on block %i with key %s', block, AKeys[sector].join());
                const authed = this.authenticate(block, AKeys[sector], this.hexStringToIntArray(uid));
                if (!authed) {
                  debug(`Invalid key for block ${block}`);
                  cb(`Invalid key for block ${block}`);
                } else {
                  const data = this.readBlock(block);
                  // debug('%s block n. %s, data %s', uid, block < 10 ? ` ${block}` : block, this.intToHexString(data, true));
                  cb(null, data);
                }
              });
            } else {
              readOperations.push((cb) => { return cb(null, []); });
            }
          }
        }
        // console.log('Total operations ', readOperations.length);
        return new Promise((resolve, reject) => {
          async.series(readOperations, (err, results) => {
            // console.log('Completed');
            if (err) {
              reject(err);
            } else {
              resolve({ cardType, AKeys, BKeys, uid, data: results });
            }
          });
        });
      },
      (e) => Promise.reject(e)
    )
    .then( // Get converted data
      ({ data, ...rest }) => {
        const { dataPositions } = this.config;
        const dataNames = Object.keys(dataPositions);
        const convertedData = {};
        dataNames.forEach((name) => {
          // console.log('Name', name);
          const definition = dataPositions[name];
          // console.log('Blocks to read');
          // console.log(definition.blocks.map((block) => data[block]));
          const val = this.getDataFromBytesArray(definition.blocks.map((block) => data[block]), definition);
          convertedData[name] = val;
        });

        return Promise.resolve({ data, convertedData, ...rest});
      },
      (e) => Promise.reject(e)
    )
    .then( // Show converted data
      ({ convertedData, ...rest }) => {
        debug('Converted data %O', convertedData);
        return Promise.resolve({ convertedData, ...rest })
      },
      (e) => Promise.reject(e)
    )
    .then( // Test write data
      ({ data, uid, AKeys, ...rest }) => {
        const { dataPositions } = this.config;
        const surname = dataPositions.fullname;
        if (surname && !done) {
          const mySurname = 'Simpson, Homer Jay';
          const bytes = this.getBytesFromString(mySurname);
          // console.log('Bytes', bytes.length, surname);
          if (bytes.length > (16 * surname.blocks.length)) {
            throw new Error('Not enough space!');
          }
          // console.log('Here', surname);
          const arraysToWrite = [];
          // console.log('surname.blocks.length', surname.blocks.length);
          for (let i = 0; i < surname.blocks.length; i++) {
            // console.log('bytes', bytes);
            // console.log(bytes.subarray(i * 16, (i * 16) + 15));
            const nArray = new Uint8Array(16);
            nArray.fill(0);
            nArray.set(bytes.subarray(i * 16, (i * 16) + 16));
            arraysToWrite.push(nArray);
          }
          // console.log(this.getDataFromBytesArray(arraysToWrite, surname));
          for (let i = 0; i < surname.blocks.length; i++) {
            const bytesArray = arraysToWrite[i];
            const block = surname.blocks[i];
            const sector = Math.floor(block / 4);
            const authed = this.authenticate(block, AKeys[sector], this.hexStringToIntArray(uid));
            if (authed) {
              this.writeBlock(block, bytesArray);
            } else {
              console.log('Not authed!');
            }
          }
        }
        const code = dataPositions.code;
        if (code && !done) {
          const myCode = 0;
          const bytes = this.getBytesFromValue(myCode, code);
          if (bytes.length > (16 * code.blocks.length)) {
            debug('Not enough space!');
            throw new Error('Not enough space!');
          }
          // console.log('Here', surname);
          const arraysToWrite = [];
          // console.log('surname.blocks.length', surname.blocks.length);
          for (let i = 0; i < code.blocks.length; i++) {
            // console.log(bytes.subarray(i * 16, (i * 16) + 15));
            const nArray = new Uint8Array(16);
            nArray.fill(0);
            nArray.set(bytes.subarray(i * 16, (i * 16) + 16));
            arraysToWrite.push(nArray);
          }
          // console.log(this.getDataFromBytesArray(arraysToWrite, surname));
          for (let i = 0; i < code.blocks.length; i++) {
            const bytesArray = arraysToWrite[i];
            const block = code.blocks[i];
            const sector = Math.floor(block / 4);
            let authed = false;
            authed = this.authenticate(block, AKeys[sector], this.hexStringToIntArray(uid));
            if (authed) {
              const result = this.writeBlock(block, bytesArray);
            } else {
              console.log('Not authed!');
            }
          }
        }
        const myfloat = dataPositions.dob;
        if (myfloat && !done) {
          const myValue = 547776000;
          const bytes = this.getBytesFromValue(myValue, myfloat);
          if (bytes.length > (16 * myfloat.blocks.length)) {
            debug('Not enough space!');
            throw new Error('Not enough space!');
          }
          const arraysToWrite = [];
          for (let i = 0; i < myfloat.blocks.length; i++) {
            const nArray = new Uint8Array(16);
            nArray.fill(0);
            nArray.set(bytes.subarray(i * 16, (i * 16) + 16));
            arraysToWrite.push(nArray);
          }
          for (let i = 0; i < myfloat.blocks.length; i++) {
            const bytesArray = arraysToWrite[i];
            const block = myfloat.blocks[i];
            const sector = Math.floor(block / 4);
            const authed = this.authenticate(block, AKeys[sector], this.hexStringToIntArray(uid));
            if (authed) {
              this.writeBlock(block, bytesArray);
            } else {
              console.log('Not authed!');
            }
          }
        }
        done = true;
        return Promise.resolve({ data, uid, AKeys, ...rest});
      },
      (e) => Promise.reject(e)
    )
    .then( // Unlock door
      (allData) => {
        const {
          convertedData
        } = allData;
        if (convertedData.fullname === 'Simpson, Homer Jay') {
          this.locker.unlock();
        }
        return Promise.resolve(allData);
      },
      (e) => Promise.reject(e)
    )
    .then(
      () => Promise.resolve(),
      (e) => Promise.reject(e)
    );
  }
}
