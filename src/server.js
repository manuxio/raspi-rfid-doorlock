import express from 'express';
import mydebugger from 'debug';
import morgan from 'morgan';
import mysql from 'promise-mysql';
import config from '../config.json';
import Locker from './locker/';
import doorApiRouter from './routers/door.js'
import lastCardApiRouter from './routers/lastcard.js'
import CardReader from './cardreader/';
import CardTracker from './cardtracker/';
import DoorOpener from './dooropener/';
import moment from 'moment';

const doorLock = new Locker(config);
const cardReader = new CardReader(config);
const cardTracker = new CardTracker(config);
const doorOpener = new DoorOpener(config);

cardReader.startListening();
cardTracker.listen(cardReader);
if (typeof config.gpioPin === 'number' && config.gpioPin > -1) {
  doorOpener.listen(cardReader);
  doorOpener.setLocker(doorLock);
}

const debug = mydebugger('nfc-webserver');
const webPort = 900;

const server = express();

server.use(express.static('public'));
server.use((req, res, next) => {
  req.doorLock = doorLock;
  req.cardReader = cardReader;
  req.cardTracker = cardTracker;
  req.debug = debug;
  next();
});
server.use('/api/door/', doorApiRouter);
server.use('/api/card/', lastCardApiRouter);
server.use(morgan('combined'));

server.listen(config.webPort, () => {
  debug('Server is listening on port %i', config.webPort);
});
