import getProp from '../src/getprop'
import { expect } from 'chai';
import { pick } from 'lodash';

describe('getProp', function() {
  
  it('empty path', function() {
    const s = {
      handle: 'schema',
      props: []
    };

    expect(function() {
      getProp(s, '');
    }).to.throw(/invalid/);
  });

  it('object path', function() {
    const s = {
      handle: 'schema',
      props: [
        { key: 'a', type: 'object', props: [
          { key: 'b', type: 'object', props: [
            { key: 'c', type: 'object', props: [
              { key: 'p', type: 'string' }
            ]}
          ]}
        ]}
      ]
    };

    const p = 'a.b.c'.split('.');
    p.forEach((_, i) => {
      const path = p.slice(0, i + 1).join('.');
      expect(pick(getProp(s, path), 'key', 'type'))
        .to.deep.equal({
          key: p[i],
          type: 'object'
        });
    });
    
    expect(getProp(s, 'a.b.c.p'))
      .to.deep.equal({
        key: 'p', type: 'string'
      });
  });

  it('array path', function() {
    const s = {
      handle: 'schema',
      props: [
        { key: 'a', type: 'object', props: [
          { key: 'b', type: 'array', item: {
            type: 'object',
            props: [
              { key: 'p', type: 'string' }
            ]
          }}
        ]}
      ]
    };

    expect(getProp(s, 'a.b.p'))
      .to.deep.equal({
        key: 'p', type: 'string'
      });
  });

  it('mixed', function() {
    const s = {
      handle: 'schema',
      props: [
        { key: 'a', type: 'object', props: [
          { key: 'b', type: 'array', item: {
            type: 'object',
            props: [
              { key: 'c', type: 'object', props: [
                { key: 'p', type: 'array', item: {
                  type: 'string'
                }}
              ]}
            ]
          }}
        ]}
      ]
    };

    expect(getProp(s, 'a.b.c.p'))
      .to.deep.equal({
        key: 'p', type: 'array', item: { type: 'string' }
      });

    expect(function() {
      getProp(s, 'a.b.c.p.a')
    }).to.throw(/not object or array/);
  })

});