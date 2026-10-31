import {getStore} from '@netlify/blobs';
import {createWeatherHandler} from '../lib/weather.mjs';
export default createWeatherHandler({getStoreFn:getStore});
