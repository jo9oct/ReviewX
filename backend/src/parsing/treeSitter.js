import Parser from 'tree-sitter';

import {
  getLanguageDefinition
} from './languageRegistry.js';

import parserConfig from '../config/parser.config.js';

import { AppError } from '../utils/errors.js';

const createParser = (language) => {
  const definition = getLanguageDefinition(language);

  if (!definition) {
    throw new AppError({
      code: 'UNSUPPORTED_LANGUAGE',
      message: `No Tree-sitter parser is registered for language: ${language}.`,
      statusCode: 400
    });
  }

  const parser = new Parser();

  parser.setLanguage(definition.parserLanguage);

  return parser;
};

const parseSource = ({
  language,
  source
}) => {
  if (typeof source !== 'string') {
    throw new AppError({
      code: 'INVALID_SOURCE_TEXT',
      message: 'Source content must be text before parsing.',
      statusCode: 400
    });
  }

  const parser = createParser(language);

  const tree = parser.parse(source);

  if (!tree?.rootNode) {
    throw new AppError({
      code: 'PARSER_RESULT_INVALID',
      message: 'The parser did not produce a valid syntax tree.',
      statusCode: 422
    });
  }

  const rootNode = tree.rootNode;

  if (
    rootNode.descendantCount >
    parserConfig.maxAstNodes
  ) {
    throw new AppError({
      code: 'AST_NODE_LIMIT_EXCEEDED',
      message: 'The source produces too many syntax-tree nodes.',
      statusCode: 413
    });
  }

  return tree;
};

export {
  createParser,
  parseSource
};