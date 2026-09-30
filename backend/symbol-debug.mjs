import { parseSource } from './src/parsing/treeSitter.js';
import { buildAst } from './src/parsing/ast.js';
import { SymbolTable } from './src/symbols/symbolTable.js';

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
  source,
});

const ast = buildAst(tree, source);

const file = {
  path: 'example.js',
  content: source,
};

const symbolTable = SymbolTable();

console.log('SymbolTable type:', typeof symbolTable);

console.log('Before build:', symbolTable);

const result = symbolTable.build({
  file,
  ast,
});

console.log('Build result:', result);

console.log('After build:', symbolTable);

console.log(
  'Symbols:',
  JSON.stringify(
    symbolTable.getSymbols(),
    null,
    2,
  ),
);

console.log(
  'Scopes:',
  JSON.stringify(
    symbolTable.getScopes(),
    null,
    2,
  ),
);