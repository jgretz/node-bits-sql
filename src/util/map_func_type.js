import { STRING, DECIMAL, DATE, BOOLEAN } from 'node-bits';

export const mapFuncType = (type) => {
  switch (type) {
    case Number:
      return DECIMAL;

    case String:
      return STRING;

    case Date:
      return DATE;

    case Boolean:
      return BOOLEAN;

    default:
      return undefined;
  }
};
