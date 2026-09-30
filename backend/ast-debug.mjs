import { parseSource } from './src/parsing/treeSitter.js';
import { buildAst } from './src/parsing/ast.js';

const source = `
const express = require('express');
const app = express();

app.get('/user', (req, res) => {
  const name = req.query.name;
  const query = "SELECT * FROM users WHERE name = '" + name;
  console.log(query);
  res.send(query);
});

app.listen(3000);
`;

const tree = parseSource({
  language: 'javascript',
  source
});

const ast = buildAst(tree, source);

console.log(JSON.stringify(ast, null, 2));
