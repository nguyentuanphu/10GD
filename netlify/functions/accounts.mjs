import {getStore} from '@netlify/blobs';
import {createAccountsHandler} from '../lib/accounts.mjs';
export default createAccountsHandler({getStoreFn:getStore});
