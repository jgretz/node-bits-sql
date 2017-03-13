export default class OdataFilter {
  constructor(query, sequelize) {
    this.query = query;
    this.sequelize = sequelize;
  }

  filterConditionalType = {
    property: entry => entry.name,
    literal: entry => entry.value,
  };

  buildFilterFunctionCall(currentEntry) {
    switch (currentEntry.func) {
      case 'substringof':
        return {[this.buildFilterPart(currentEntry.args[1])]: {$iLike: `%${this.buildFilterPart(currentEntry.args[0])}%`}};
      default:
        throw new Error('unsupported function call');
    }
  }

  buildFilterPart(currentEntry) {
    switch (currentEntry.type) {
      case 'eq':
        return {[this.buildFilterPart(currentEntry.left)]: this.buildFilterPart(currentEntry.right)};
      case 'ne':
        return {[this.buildFilterPart(currentEntry.left)]: {$ne: this.buildFilterPart(currentEntry.right)}};
      case 'and':
        return {$and: [this.buildFilterPart(currentEntry.left), this.buildFilterPart(currentEntry.right)]};
      case 'or':
        return {$or: [this.buildFilterPart(currentEntry.left), this.buildFilterPart(currentEntry.right)]};
      case 'functioncall':
        return this.buildFilterFunctionCall(currentEntry);
      default:
        return this.filterConditionalType[currentEntry.type](currentEntry);
    }
  }

  buildFilter({includePagination} = {includePagination: true}) {
    const record = {};
    const pageSize = this.query.$top ? this.query.$top : 0;
    const skip = this.query.$skip ? this.query.$skip : 0;

    if (includePagination === false) {
      record.attributes = [[this.sequelize.fn('COUNT', this.sequelize.col('id')), 'userCount']];
    } else if (pageSize > 0) {
      record.limit = pageSize;
      record.offset = skip;
    }

    if (includePagination && this.query.$orderby) {
      // add in ordering
      record.order = this.query.$orderby.map(orderArrayEntry => Object.entries(orderArrayEntry).map(([key, direction]) => ([key, direction])));
    }

    if (this.query.$filter) {
      record.where = this.buildFilterPart(this.query.$filter);
    }

    return record;
  }
}
