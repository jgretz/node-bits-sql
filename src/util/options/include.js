/* eslint-disable no-undefined */
/* eslint-disable no-use-before-define */
import _ from 'lodash';
import {MANY_TO_ONE, MANY_TO_MANY} from 'node-bits';
import pluralize from 'pluralize';
import {foreignKeyRelationshipName} from '../foreign_key_name';
import {READ} from '../../constants';

// boolean functions to define if the relationship makes it in
const searchTermForRelationship = (model, relationship) => {
  if (relationship.as) {
    return foreignKeyRelationshipName(relationship);
  }

  if (relationship.references === model.name) {
    return relationship.model;
  }

  return relationship.references;
};

const notNull = array => _.filter(array, c => !_.isNil(c));

const relationshipNameMatches = (name, relationshipName)  => {
  return name && relationshipName && (name === relationshipName || name === pluralize(relationshipName) || name === pluralize.singular(relationshipName));
}

const keysFromNode = node => {
  if (_.isArray(node)) {
    return _.flatMap(notNull(node.map(c => keysFromNode(c))));
  }

  if (_.isString(node)) {
    return null;
  }

  if (_.isObject(node)) {
    const own = _.keys(node);
    const child = notNull(own.map(c => keysFromNode(node[c])));

    return _.flatMap([...own, ...child]);
  }

  return null;
};


const relationshipApplies = (model, relationship, piece, path) => {
  const searchTerm = searchTermForRelationship(model, relationship);
  return _.some(piece, item => {
    const itemComponents = _.take(item.split('.'), path.length+1);
    const relationshipName = _.last(itemComponents);

    const pathMatches = path.length === 0 || _.every(_.zipWith(path, _.dropRight(itemComponents, 1), relationshipNameMatches));
    return pathMatches && relationshipNameMatches(relationshipName, searchTerm);
  });
};

const compileCheckList = params => {
  const checklist = [];
  if (params.args.select) {
    checklist.push(buildShouldInclude(params.args.select, {overrideDefault: true}));
  }

  if (params.args.expand) {
    checklist.push(buildShouldInclude(params.args.expand, {overrideDefault: true}));
  }

  if (params.args.orderby) {
    checklist.push(buildShouldInclude(params.args.orderby.map(o => o.field)));
  }

  if (params.args.where) {
    checklist.push(buildShouldInclude(keysFromNode(params.args.where)));
  }

  return checklist;
};

const shouldIncludeBySchemaDefinition = (model, relationship, params) => {
  let config = params.mode === READ ? relationship.includeInSelect : relationship.includeInWrite;
  if (config === undefined) {
    return false;
  }

  // include both by default
  if (config === true) {
    config = {model: true, reverse: true};
  }

  // include per config
  if (relationship.model === model.name) {
    return config.model;
  }

  if (relationship.references === model.name) {
    return config.reverse;
  }

  return false;
};

const buildShouldInclude = (models, overrideDefault) => {
  return (model, relationship, path) => {
    // nothing specified, so don't imply either way
    if (models === undefined) {
      return undefined;
    }

    const includesRelationship = relationshipApplies(model, relationship, models, path);
    return overrideDefault ? includesRelationship : (includesRelationship || undefined);
  }
}

const shouldIncludeRelationship = (model, relationship, params, path) => {
  // see if this applies at all to the passed in model (if not it could be brought in elsewhere)
  if (relationship.model !== model.name && relationship.references !== model.name) {
    return false;
  }

  // If some part of our query requires the relationship, it trumps the schema definition
  const checks = compileCheckList(params);

  const results = checks.map(check => check(model, relationship, path));
  const includeByQuery = _.some(results, result => result === true);
  const excludeByQuery = _.some(results, result => result === false);

  if (includeByQuery) {
    return true;
  }

  if (excludeByQuery) {
    return false;
  }

  // follow constraints
  if (params.constraints && !params.constraints.schema) {
    return false;
  }

  // not defined by the query, follow the schema definition
  return shouldIncludeBySchemaDefinition(model, relationship, params);
};

// functions to create the include object per sequelizejs syntax
const findRelatedModel = (model, relationship, params) => {
  if (relationship.model === model.name) {
    return params.models[relationship.references];
  }

  return params.models[relationship.model];
};

const defineSeparate = (relationship, params) => {
  const config = params.mode === READ ? relationship.includeInSelect : relationship.includeInWrite;
  if (!config) {
    return false;
  }

  if (!_.isObject(config)) {
    return false;
  }

  return config.separate && (relationship.type === MANY_TO_MANY || relationship.type === MANY_TO_ONE);
};

const defineAttributes = (related, relationship, params) => {
  if (!params.args.select) {
    return undefined;
  }

  const attributes = [];
  _.forEach(params.args.select, item => {
    const pieces = item.split('.');

    if (pieces.length < 2) {
      return;
    }

    const term = relationship.as ? relationship.as.replace('Id', '') : related.name;

    if (relationshipNameMatches(pieces[pieces.length - 2], term)) {
      attributes.push(pieces[pieces.length - 1]);
    }
  });

  return attributes.length === 0 || attributes.includes('*') ? undefined : attributes;
};

const defineInclude = (model, relationship, params, path) => {
  // find the model
  const related = findRelatedModel(model, relationship, params);
  const relatedName = relationship.as || related.name;

  if (path.includes(relatedName)) {
    return null;
  }

  // build include object
  return {
    as: foreignKeyRelationshipName(relationship),
    model: related,
    include: build(related, params, [...path, relatedName]), // eslint-disable-line
    separate: defineSeparate(relationship, params),
    attributes: defineAttributes(related, relationship, params),
  };
};

// entry point for recursion so we can go down the rabbit hole
const build = (model, params, path) => {

  const appliedRelationships = _.filter(params.relationships,
    relationship => shouldIncludeRelationship(model, relationship, params, _.slice(path, 1)));

  const includes = appliedRelationships.map(
    relationship => defineInclude(model, relationship, params, path)
  );

  return _.filter(includes, x => !_.isNil(x));
};

// public interface
export const buildInclude = (args, mode, model, models, relationships, constraints) =>
  build(model, {mode, models, relationships, args, constraints}, [model.name]);
