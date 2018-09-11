import {initialize} from 'node-bits-internal-database';
import sql from './database';

export default initialize(sql);
export {createDatabaseConnectionFromSequelize} from './database';
