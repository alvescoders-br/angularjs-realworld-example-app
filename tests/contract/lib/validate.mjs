// Fase 2 (Refs #2) - validador minimo de contrato (subset JSON Schema / OpenAPI 3).
// Cobre exatamente o subset usado por contract.schemas.json: type (object/array/
// string/integer/number/boolean), required, properties, items, $ref (por nome),
// nullable e format (email/date-time). Sem dependencias de terceiros: roda offline
// com `node --test`. Propriedades extras sao toleradas (forward-compat do contrato
// RealWorld); o gate falha em divergencia estrutural, nao em campos a mais.

function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Valida `value` contra `schema`, resolvendo $ref contra `root`.
 * Retorna um array de mensagens de erro (vazio = valido).
 */
export function validate(schema, value, root, path = '$') {
  const errors = [];

  if (schema.$ref) {
    const target = root[schema.$ref];
    if (!target) {
      errors.push(`${path}: unknown $ref '${schema.$ref}'`);
      return errors;
    }
    return validate(target, value, root, path);
  }

  if (value === null) {
    if (!schema.nullable) errors.push(`${path}: null not allowed`);
    return errors;
  }
  if (value === undefined) {
    errors.push(`${path}: missing value`);
    return errors;
  }

  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path}: expected object, got ${typeName(value)}`);
        return errors;
      }
      for (const req of schema.required || []) {
        if (!(req in value) || value[req] === undefined) {
          errors.push(`${path}.${req}: required property missing`);
        }
      }
      for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        if (key in value && value[key] !== undefined) {
          errors.push(...validate(propSchema, value[key], root, `${path}.${key}`));
        }
      }
      break;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeName(value)}`);
        return errors;
      }
      if (schema.items) {
        value.forEach((item, i) => {
          errors.push(...validate(schema.items, item, root, `${path}[${i}]`));
        });
      }
      break;
    }
    case 'string': {
      if (typeof value !== 'string') {
        errors.push(`${path}: expected string, got ${typeName(value)}`);
        break;
      }
      if (schema.format === 'email' && !EMAIL_RE.test(value)) {
        errors.push(`${path}: invalid email '${value}'`);
      }
      if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) {
        errors.push(`${path}: invalid date-time '${value}'`);
      }
      break;
    }
    case 'integer': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(`${path}: expected integer, got ${typeName(value)}`);
      }
      break;
    }
    case 'number': {
      if (typeof value !== 'number') {
        errors.push(`${path}: expected number, got ${typeName(value)}`);
      }
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push(`${path}: expected boolean, got ${typeName(value)}`);
      }
      break;
    }
    default:
      errors.push(`${path}: unsupported schema type '${schema.type}'`);
  }

  return errors;
}

/** Valida `value` contra o schema nomeado `schemaName` no mapa `root`. */
export function validateAgainst(root, schemaName, value) {
  const schema = root[schemaName];
  if (!schema) return [`$: unknown schema '${schemaName}'`];
  return validate(schema, value, root, '$');
}
