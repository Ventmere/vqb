import cloneDeep from 'lodash/lang/cloneDeep';
import isPlainObject from 'lodash/lang/isPlainObject';
import isFunction from 'lodash/lang/isFunction';
import isArray from 'lodash/lang/isArray';
import isEmpty from 'lodash/lang/isEmpty';
import isObject from 'lodash/lang/isObject';
import isString from 'lodash/lang/isString';
import isNumber from 'lodash/lang/isNumber';
import isBoolean from 'lodash/lang/isBoolean';
import isDate from 'lodash/lang/isDate';
import all from 'lodash/collection/all';
import indexBy from 'lodash/collection/indexBy';
import omit from 'lodash/object/omit';
import values from 'lodash/object/values';


import getProp from './getprop'; 

const WhereOperators = ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in'];
const WhereOperaterAliases = {
  '==': 'eq',
  '=': 'eq',
  '!=': 'ne',
  '<>': 'ne',
  '>': 'gt',
  '>=': 'ge',
  '<': 'lt',
  '<=': 'le'
};

export class PredicateBuilder {
  constructor(schema) {
    this._schema = schema;
    this._getProp = getProp.bind(null, schema);
    this._notFlag = false;
    this._boolFlag = 'and';
    this._parts = [];
  }

  clone() {
    const cloned = new PredicateBuilder(schema);
    cloned._notFlag = this._notFlag;
    cloned._boolFlag = this._boolFlag;
    cloned._parts = this._parts.slice(0);
    return cloned;
  }

  where(path, operator, value) {
    if (arguments.length < 1) {
      this._throw('No where arguments');
    }

    //where({ id: 1, name: 2 })
    if (isPlainObject(path)) {
      const hash = path;
      const pb = new PredicateBuilder(this._schema);
      for (let path in hash) {
        if (hash.hasOwnProperty(path)) {
          pb.where(path, 'eq', hash[path])
        }
      }
      this._parts.push({
        type: 'group',
        parts: pb.compile(),
        bool: this._bool()
      });
      return this;
    }

    //callback
    if (isFunction(path)) {
      const pb = new PredicateBuilder(this._schema);
      path(pb);
      this._parts.push({
        type: 'group',
        parts: pb.compile(),
        bool: this._bool(),
        not: this._not()
      });
      return this;
    }

    if (arguments.length < 1) {
      this._throw('Invalid where arguments, expect (path, [operator], value)');
    }

    if (arguments.length === 2) {
      value = operator;
      operator = 'eq';
    } else {
      if (/^not /.test(operator)) {
        this._not(true);
        operator = operator.slice(4);
      }
    }

    if (WhereOperaterAliases.hasOwnProperty(operator)) {
      operator = WhereOperaterAliases[operator];
    }

    if (WhereOperators.indexOf(operator) === -1) {
      this._throw('Invalid where operator, expect one of ' + WhereOperators.concat(Object.keys(WhereOperaterAliases)).join(', '))
    }

    const prop = this._getProp(path);
    if (operator === 'in') {
      if (!isArray(value)) {
        this._throw(`Value must be an array for operator 'in'`);
      }

      if (!all(value, v => v && (isString(v) || isNumber(v) || isBoolean(v) || isDate(v)))) {
        this._throw(`Invalid value for operator 'in'`);
      }
    } else {
      if (prop.type === 'array') {
        if (operator !== 'eq') {
          this._throw(`Can not compare values in array '${path}' using operator '${operator}'`);
        }

        if (!isPrimitiveType(prop.item.type)) {
          this._throw(`Can not compare equality for '${path}', type 'array of ${prop.item.type}'`);
        }
      } else {
        if (!isPrimitiveType(prop.type)) {
          this._throw(`Can not compare equality for '${path}' type '${prop.type}'`);
        }
      }

      if (!canCompare(value)) {
        this._throw(`Can not compare path '${path}' to '${value}'`);
      }
    }

    this._parts.push({
      type: 'part',
      path,
      prop,
      operator: operator,
      value,
      bool: this._bool(),
      not: this._not()
    });
    return this;
  }

  orWhere() {
    this._bool('or');
    return this.where.apply(this, arguments);
  }

  whereNot() {
    this._not(true);
    return this.where.apply(this, arguments);
  }

  compile() {
    //TODO merge?
    return this._parts;
  }

  _not(v) {
    if (arguments.length > 0) {
      this._notFlag = !!v;
    } else {
      const value = this._notFlag;
      this._notFlag = false;
      return value;
    }
  }

  _bool(v) {
    if (arguments.length > 0) {
      this._boolFlag = v;
    } else {
      const value = this._boolFlag;
      this._boolFlag = 'and';
      return value;
    }
  }

  _throw(message, ErrorType = TypeError) {
    throw new ErrorType('where: ' + message + `, schema: '${this._schema.handle}'.`);
  }
}

export default class QueryBuilder {
  constructor(schema) {
    this._schema = schema;
    this._getProp = getProp.bind(null, schema);
    this._statements = [];
    this._limit = 0;
    this._skip = 0;
    this._pluck = null;
    this._pb = new PredicateBuilder(schema);
  }

  clone() {
    const cloned = new QueryBuilder(this._schema);
    cloned._statements = cloneDeep(this._statements);
    cloned._pluck = this._pluck ? this._pluck.slice(0) : null;
    cloned._pb = this._pb.clone();
    ['limit', 'skip', 'notFlag', 'boolFlag', 'resultType'].forEach(f => {
      cloned['_' + f] = this['_' + f];
    });
    return cloned;
  }

  where() {
    this._pb.where.apply(this._pb, arguments);
    return this;
  }

  orWhere() {
    this._pb.orWhere.apply(this._pb, arguments);
    return this;
  }

  whereNot() {
    this._pb.whereNot.apply(this._pb, arguments);
    return this;
  }

  populate(path, schema) {
    if (!schema || !isString(schema)) {
      this._throw(`populate: Must specify schema handle at path '${path}'`);
    }

    const prop = this._getProp(path);
    if (prop.type !== 'string' && !(prop.type === 'array' && prop.item.type === 'string')) {
      this._throw(`populate: Can not populate '${path}' because property is not string or array of string`);
    }

    this._statements.push({
      group: 'populate',
      path,
      prop,
      schema
    });

    return this;
  }

  orderBy(path, direction = 'asc') {
    if (direction !== 'asc' && direction !== 'desc') {
      this._throw(`orderBy: Invalid orderBy direction '${direction}', expect one of 'asc', 'desc'`);
    }

    const prop = this._getProp(path);

    if (!isPrimitiveType(prop.type)) {
      this._throw(`orderBy: Can not order by '${path}' because it is not primitive type`);
    }

    this._statements.push({
      group: 'orderBy',
      path,
      prop,
      direction
    });

    return this;
  }

  limit(n) {
    if (typeof n !== 'number') {
      this._throw('limit: Limit is not a number')
    }

    this._limit = n;
    return this;
  }

  skip(n) {
    if (typeof n !== 'number') {
      this._throw('skip: Skip is not a number')
    }

    this._skip = n;
    return this;
  }

  pluck() {
    if (arguments.length == 0) {
      this._throw('pluck: No pluck argument.')
    }

    const fields = Array.prototype.slice.call(arguments, 0)
      .map((path, idx) => {
        if (typeof path !== 'string') {
          this._throw('pluck: Invalid argument at index ' + idx);
        }
        const prop = this._getProp(path);
        return {
          path,
          prop
        };
      });

    this._pluck = fields;
    return this;
  }

  compile() {
    const q = {};

    if (this._limit) {
      q.limit = this._limit;
    }

    if (this._skip) {
      q.skip = this._skip;
    }

    q.where = this._pb.compile();

    const orderBy = this._statements
      .filter(s => s.group === 'orderBy')
      .map(s => omit(s, 'group'));

    q.orderBy = values(indexBy(orderBy, 'path'))

    if (this._pluck) {
      q.pluck = this._pluck.slice(0);
    }

    q.populate = values(indexBy(
        this._statements
          .filter(s => s.group === 'populate')
          .map(s => omit(s, 'group')),
        'path'
      ));

    return q;
  }

  _throw(message, ErrorType = TypeError) {
    throw new ErrorType(message + `, schema: '${this._schema.handle}'.`);
  }
}

function isPrimitiveType(type) {
  return type === 'string' || type === 'number' || type === 'integer' || type === 'boolean';  
}

function canCompare(value) {
  return value && (isString(value) || isNumber(value) || isBoolean(value) || isDate(value));
}