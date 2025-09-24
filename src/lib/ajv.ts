import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';

export const createAjvInstance = () => {
  const ajv = new Ajv({
    allErrors: true,
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: false,
    strict: false,
    messages: true,
  });
  addFormats(ajv);
  ajvErrors(ajv);
  return ajv;
};

export const formatAjvErrors = (errors: ErrorObject[] = []) =>
  errors.map((error) => `${error.instancePath || error.schemaPath}: ${error.message}`).filter(Boolean);
