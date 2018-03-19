import moment from 'moment';
import mydebugger from 'debug';
import CardClient from '../cardclient/';

const debug = mydebugger('nfc-cardtracker');

export default class CardTracker extends CardClient {
  constructor() {
    super();
    this.lastCard = null;
    this.lastCardTime = null;
  }

  getLastCard() {
    return this.lastCard;
  }

  getLastCardTime() {
    return this.lastCardTime;
  }

  onUid(uidresponse) {
    return new Promise((resolve) => {

      const uid = uidresponse.data.reduce((prev, curr) => {
        let hex = curr.toString(16).toUpperCase();
        if (hex.length < 2) {
          hex = '0' + hex;
        }
        prev += hex;
        return prev;
      }, '');

      this.lastCard = uid;
      this.lastCardTime = moment();
      debug('New card %s', this.lastCard);
      resolve();

    });
  }
}
