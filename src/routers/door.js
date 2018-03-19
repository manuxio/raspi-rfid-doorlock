import express from 'express';

const router = express.Router();

router.get('/status', (req, res, next) => {
  if (req.doorLock) {
    res.json(req.doorLock.status() === true ? 1 : 0);
  } else {
    next();
  }
});

router.get('/open', (req, res, next) => {
  if (req.doorLock) {
    res.json(req.doorLock.unlock());
  } else {
    next();
  }
});

router.get('/close', (req, res, next) => {
  if (req.doorLock) {
    res.json(req.doorLock.lock());
  } else {
    next();
  }
});

export default router;
