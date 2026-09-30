const express = require('express');

const app = express();

const pattern = /^(a+)+$/;

app.get('/test', (req, res) => {
  const input = req.query.input;

  if (pattern.test(input)) {
    return res.json({ valid: true });
  }

  return res.json({ valid: false });
});

app.listen(3000);
