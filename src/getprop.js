import all from 'lodash/collection/all';

export default function (schema, path) {
  const schemaHandle = schema.handle;
  const parts = path.split('.');
  let parent = schema;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) {
      throw new Error(`Path '${path}' is invalid, schema: '${schemaHandle}'.`);
    }

    if (!parent.props) {
      if (parent.type === 'array') {
        parent = parent.item;
      }

      if (parent.type !== 'object' && parent.type !== 'array') {
        throw new Error(`Path '${parts.slice(0, i + 1).join('.')}' in '${path}' is not object or array type. schema: '${schemaHandle}'.`);
      }
    }

    const prop = parent.props.find(p => p.key === part);
    if (!prop) {
      throw new Error(`Can not resolve path '${parts.slice(0, i + 1).join('.')}' in '${path}', schema: '${schemaHandle}'.`);
    }

    parent = prop;
  }

  return parent;
}