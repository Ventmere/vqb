import { expect } from 'chai';
import QueryBuilder from '../src';
import s from './schema';
import { pick } from 'lodash';

describe('QueryBuilder', function() {
  it('limit', function() {
    const n = (new QueryBuilder(s))
      .limit(10)
      .compile()
      .limit;
    expect(n).equals(10);
  });

  it('skip', function() {
    const n = (new QueryBuilder(s))
      .skip(10)
      .compile()
      .skip;
    expect(n).equals(10);
  });

  it('populate', function() {
    const t = (new QueryBuilder(s))
      .populate('related', 'schema')
      .populate('related', 'relatedSchema') //override
      .compile()
      .populate

    expect(t).to.deep.equal([
      {
        path: 'related',
        prop: s.props.find(p => p.key === 'related'),
        schema: 'relatedSchema'
      }
    ]);
  });

  it('populate prop check', function() {
    expect(function() {
      (new QueryBuilder(s)).populate('age', 'user')
    }).throws(/not string or array of string/);
  })

  it('orderBy', function() {
    const t = (new QueryBuilder(s))
      .orderBy('handle', 'asc')
      .orderBy('handle', 'desc')
      .orderBy('name', 'desc')
      .compile()
      .orderBy;

    expect(t).to.deep.equal(
      [ { path: 'handle',
          prop: { key: 'handle', type: 'string' },
          direction: 'desc' },
        { path: 'name',
          prop: { key: 'name', type: 'string' },
          direction: 'desc' } ]
    );
  });

  it('orderBy prop check', function() {
    expect(function() {
      (new QueryBuilder(s)).orderBy('related')
    }).throws(/not primitive/);
  })

  it('where', function() {
    const qb = new QueryBuilder(s);
    const p = qb
      .where('handle', 1)
      .orWhere('name', 2)
      .whereNot('age', 3)
      .compile()
      .where
      .map(p => pick(p, 'path', 'value'));

    expect(p).to.deep.equal([
      { path: 'handle', value: 1 },
      { path: 'name', value: 2 },
      { path: 'age', value: 3 }
    ]);
  });

  it('pluck', function() {
    const qb = new QueryBuilder(s);
    const q = qb
      .pluck(
        'handle',
        'name',
        'complex',
        'complex.nested.value'
      )
      .compile();

    expect(q.pluck.map(p => p.path)).to.deep.equal([
      'handle',
      'name',
      'complex',
      'complex.nested.value'
    ]);
  })
});