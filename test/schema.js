export default {
  handle: 'schema',
  props: [
    {
      key: 'handle', type: 'string'
    },
    {
      key: 'name', type: 'string'
    },
    {
      key: 'age', type: 'integer'
    },
    {
      key: 'related', type: 'array', item: { type: 'string' }
    },
    {
      key: 'complex', type: 'object', props: [
        { key: 'key', type: 'string' },
        { key: 'nested', type: 'object', props: [
          { key: 'value', type: 'integer' }
        ] },
      ]
    }
  ]
};