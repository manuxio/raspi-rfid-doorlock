import express from 'express';

const router = express.Router();

router.get('/last', (req, res, next) => {
  const lastCard = req.cardTracker.getLastCard();
  if (lastCard) {
    const t = req.cardTracker.getLastCardTime();
    t.locale('it');
    const o = {
      card: lastCard,
      time: t.toDate(),
      unixtime: t.format('X'),
      human: t.fromNow(),
      text: t.format('LLLL')
    };
    res.json(o);
  } else {
    res.json(false);
  }
});

export default router;
