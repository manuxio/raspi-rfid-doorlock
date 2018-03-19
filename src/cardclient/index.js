import {
  TextEncoder,
  TextDecoder
} from 'text-encoding';

export default class CardClient {
  constructor() {
    this.listener = this.__listener.bind(this);
    /*
    case 0x04:	return PICC_TYPE_NOT_COMPLETE;	// UID not complete
		case 0x09:	return PICC_TYPE_MIFARE_MINI;
		case 0x08:	return PICC_TYPE_MIFARE_1K;
		case 0x18:	return PICC_TYPE_MIFARE_4K;
		case 0x00:	return PICC_TYPE_MIFARE_UL;
		case 0x10:
		case 0x11:	return PICC_TYPE_MIFARE_PLUS;
		case 0x01:	return PICC_TYPE_TNP3XXX;
		case 0x20:	return PICC_TYPE_ISO_14443_4;
		case 0x40:	return PICC_TYPE_ISO_18092;
		default:	return PICC_TYPE_UNKNOWN;
    */
    this.cardTypes = {
      PICC_TYPE_MIFARE_1K: {
        name: 'PICC_TYPE_MIFARE_1K',
        sectors: 16
      },
      PICC_TYPE_MIFARE_MINI: {
        name: 'PICC_TYPE_MIFARE_MINI',
        sectors: 5
      },
      PICC_TYPE_MIFARE_4K: {
        name: 'PICC_TYPE_MIFARE_4K',
        sectors: 40
      }
    };

    this.cardTypesByResponse = {
      9: 'PICC_TYPE_MIFARE_MINI',
      8: 'PICC_TYPE_MIFARE_1K',
      24: 'PICC_TYPE_MIFARE_4K'
    };
  }

  getCardTypeFromSelectResponse(response) {
    const cardTypeName = this.cardTypesByResponse[response];
    if (!cardTypeName) {
      return undefined;
    }
    return this.cardTypes[cardTypeName];
  }

  listen(cardReader) {
    this.cardReader = cardReader;
    this.cardReader.on('uid', this.listener);
  }

  __listener(cardresponse, callback) {
    if (this.onUid) {
      this.onUid(cardresponse)
      .then(
        (result) => {
          callback(null, result);
        },
        (e) => {
          callback(e);
        }
      )
    } else {
      throw new Error('Missing onUid() method!');
    }
  }

  unlisten() {
    if (this.cardReader) {
      this.cardReader.off('uid', this.listener);
    }
  }

  intToHexString(arrayOfInt, space = false) {
    const uid = arrayOfInt.reduce((prev, curr, pos) => {
      let hex = curr.toString(16).toUpperCase();
      if (hex.length < 2) {
        hex = '0' + hex;
      }
      prev += hex;
      if (space && pos < arrayOfInt.length - 1) {
        prev += ' ';
      }
      return prev;
    }, '');
    return uid;
  }

  hexStringToIntArray(hexString) {
    const arrayOfHex = hexString.match(/.{1,2}/g);
    return arrayOfHex.map((hex) => parseInt(`0x${hex}`));
  }

  selectCard(uid) {
    const resp = this.cardReader.selectCard(uid);
    return resp;
  }

  authenticate(block, key, uid, isBKey) {
    const resp = this.cardReader.authenticate(block, key, uid);
    return resp;
  }

  readBlock(...rest) {
    const result = this.cardReader.readBlock(...rest);
    return result;
  }

  stopCrypto(...rest) {
    return this.cardReader.stopCrypto(...rest);
  }

  writeBlock(...rest) {
    return this.cardReader.writeBlock(...rest);
  }

  getIntegerFromBytesArray(bytesArray) {
    // console.log('INT', bytesArray);
    let typedArray = Uint8Array.from(bytesArray);
    let dataView = new DataView(typedArray.buffer);
    return dataView.getUint32(0);
  }

  getFloatFromBytesArray(bytesArray) {
    let typedArray = Uint8Array.from(bytesArray);
    let dataView = new DataView(typedArray.buffer);
    return dataView.getFloat64(0, false);
  }

  getStringFromBytesArray(bytes) {
    const uint8array = Uint8Array.from(bytes);
    const string = new TextDecoder('iso-8859-1').decode(uint8array);
    return string.split('\0').shift();
  }

  getUtf8FromBytesArray(bytes) {
    const uint8array = Uint8Array.from(bytes);
    const string = new TextDecoder('utf-8').decode(uint8array);
    return string.split('\0').shift();
  }

  getBytesFromInteger(integer) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, integer);
    const x = new Uint8Array(buffer, 0, 4);
    return x;
  }

  getBytesFromFloat(float) {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setFloat64(0, float);
    const x = new Uint8Array(buffer, 0, 16);
    return x;
  }

  getBytesFromString(string) {
    const uint8array = new TextEncoder('iso-8859-1').encode(string);
    return uint8array;
  }

  getBytesFromUtf8(string) {
    const uint8array = new TextEncoder('utf-8').encode(string);
    return uint8array;
  }

  getBytesFromValue(value, definition) {
    let result;
    switch(definition.type) {
      case "integer": {
        result = this.getBytesFromInteger(value);
        break;
      }
      case "float": {
        result = this.getBytesFromFloat(value);
        break;
      }
      case "string": {
        result = this.getBytesFromString(value);
        break;
      }
      case "utf-8": {
        result = this.getBytesFromUtf8(value);
        break;
      }
      default: {
        result = undefined;
        break;
      }
    }
    return result;
  }

  getDataFromBytesArray(bytesArray, definition) {
    let result;
    switch(definition.type) {
      case "integer": {
        result = this.getIntegerFromBytesArray(bytesArray.reduce((prev, curr) => {
          prev.push(...curr);
          return prev;
        }, []));
        break;
      }
      case "float": {
        result = this.getFloatFromBytesArray(bytesArray.reduce((prev, curr) => {
          prev.push(...curr);
          return prev;
        }, []));
        break;
      }
      case "string": {
        result = this.getStringFromBytesArray(bytesArray.reduce((prev, curr) => {
          prev.push(...curr);
          return prev;
        }, []));
        break;
      }
      case "utf-8": {
        result = this.getUtf8FromBytesArray(bytesArray.reduce((prev, curr) => {
          prev.push(...curr);
          return prev;
        }, []));
        break;
      }
      default: {
        result = undefined;
        break;
      }
    }
    return result;
  }
}
