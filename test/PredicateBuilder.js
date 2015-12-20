import { expect } from 'chai';
import { PredicateBuilder } from '../src';
import s from './schema';
import { omit, pick } from 'lodash';

describe('PredicateBuilder', function() {

  it('where hash', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where({
        name: 1,
        age: 2
      })
      .compile()[0].parts
      .map(p => omit(p, 'prop', 'type', 'not'));

    expect(parts).to.deep.equal([
      { path: 'name', operator: 'eq', value: 1, bool: 'and' },
      { path: 'age', operator: 'eq', value: 2, bool: 'and' }
    ]);
  });

  it('or where', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where('name', 1)
      .orWhere('handle', 2)
      .compile()
      .map(p => omit(p, 'prop', 'type', 'not'));

    expect(parts).to.deep.equal([
      { path: 'name', operator: 'eq', value: 1, bool: 'and' },
      { path: 'handle', operator: 'eq', value: 2, bool: 'or' }
    ]);
  });

  it('not where', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where('name', 'not eq', 1)
      .whereNot('handle', 2)
      .compile()
      .map(p => omit(p, 'prop', 'type', 'bool'));

    expect(parts).to.deep.equal([
      { path: 'name', operator: 'eq', value: 1, not: true },
      { path: 'handle', operator: 'eq', value: 2, not: true }
    ]);
  });

  it('where group', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where(p => 
        p.where('age', 'gt', 1).where('age', 'lt', 18)
      )
      .compile();

    const g = parts[0];
    expect(g.type).equals('group');
    expect(g.parts.map(p => omit(p, 'prop', 'type'))).to.deep.equal([
      {
        bool: 'and',
        not: false,
        operator: 'gt',
        path: 'age',
        value: 1
      },
      {
        bool: 'and',
        not: false,
        operator: 'lt',
        path: 'age',
        value: 18
      }
    ]);
  });

  it('where chain', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where('handle', 'vhandle')
      .orWhere('handle', 'altHandle')
      .whereNot('handle', 'notHandle')
      .where('age', 'lt', 18)
      .where('age', 'not lt', 28)
      .where('related', 'contains', 'vname')
      .compile()
      .map(p => omit(p, 'prop', 'type'));

      expect(parts)
        .to.deep.equal([
          { path: 'handle', operator: 'eq', value: 'vhandle', bool: 'and', not: false },
          { path: 'handle', operator: 'eq', value: 'altHandle', bool: 'or', not: false },
          { path: 'handle', operator: 'eq', value: 'notHandle', bool: 'and', not: true },
          { path: 'age', operator: 'lt', value: 18, bool: 'and', not: false },
          { path: 'age', operator: 'lt', value: 28, bool: 'and', not: true },
          { path: 'related', operator: 'contains', value: 'vname', bool: 'and', not: false }
        ]);
  });

  it('where in', function() {
    const pb = new PredicateBuilder(s);
    const parts = pb
      .where('name', 'in', ['w', 't', 'f'])
      .compile();

    expect(pick(parts[0], 'path', 'operator', 'value'))
      .to.deep.equal({
        path: 'name',
        operator: 'in',
        value: ['w', 't', 'f']
      });
  });

  it('check type', function() {
    const pb = new PredicateBuilder(s);
    expect(function() {
      pb.where('complex', '1');
    }).throws(/Can not compare path/);

    expect(function() {
      pb.where('name', {});
    }).throws(/Can not compare path/);

    expect(function() {
      pb.where('name', []);
    }).throws(/Can not compare path/);

    expect(function() {
      pb.where('name', undefined);
    }).throws(/Can not compare path/);

    expect(function() {
      pb.where('name', null);
    }).throws(/Can not compare path/);
  });

  it(`operator 'in' check`, function() {
    const pb = new PredicateBuilder(s);

    expect(function() {
      pb.where('complex', 'in', [1])
    }).throws(/Can not use 'in' for/);

    expect(function() {
      pb.where('name', 'in', 88)
    }).throws(/Value must be an array/);

    expect(function() {
      pb.where('name', 'in', [7, {}])
    }).throws(/Invalid value for operator 'in'/);
  });

  it(`operator 'contains' check`, function() {
    const pb = new PredicateBuilder(s);

    expect(function() {
      pb.where('complex', 'contains', [1])
    }).throws(/Can not use 'contains' for/);

    expect(function() {
      pb.where('age', 'contains', 1)
    }).throws(/Can not use 'contains' for/);
  });
});