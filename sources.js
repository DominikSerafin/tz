/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const async = require('async');
const WTA_ORIGIN = `http://worldtimeapi.org`;
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_WTA_PATH = path.join(SOURCES_PATH, './wta/worldtimeapi.json');



/*------------------------------------*\
  axios interceptors
\*------------------------------------*/

//
axios.interceptors.request.use(function(config) {
  // before request is sent
  console.log(`${config.method.toUpperCase()} ${config.url}: REQUESTING`);
  return config;
}, function(error) {
  // request error
  return Promise.reject(error);
});

//
axios.interceptors.response.use(function(response) {
  console.log(`${response.config.method.toUpperCase()} ${response.config.url}: OK`);
  return response;
}, function(error) {
  console.log(`\n\n ${error.config.method.toUpperCase()} ${error.config.url}: ERROR \n\n`);
  // any other status code
  return Promise.reject(error);
});





/*------------------------------------*\
  getWtaSource
\*------------------------------------*/
async function getWtaSource() {
  const output = [];
  //
  const resultZones = await axios({
    method: 'GET',
    url: `${WTA_ORIGIN}/api/timezone`,
  });
  //
  for (const zoneName of resultZones.data) {
    const resultZone = await axios({
      method: 'GET',
      url: `${WTA_ORIGIN}/api/timezone/${zoneName}`,
    });
    const tz = resultZone.data;
    output.push({
      abbreviation: tz.abbreviation,
      //client_ip: tz.client_ip,
      datetime: tz.datetime,
      //day_of_week: tz.day_of_week,
      //day_of_year: tz.day_of_year,
      dst: tz.dst,
      dst_from: tz.dst_from,
      dst_offset: tz.dst_offset,
      dst_until: tz.dst_until,
      raw_offset: tz.raw_offset,
      timezone: tz.timezone,
      unixtime: tz.unixtime,
      utc_datetime: tz.utc_datetime,
      utc_offset: tz.utc_offset,
      //week_number: tz.week_number,
    });
    //break;
  }

  const timezonesFile = await fs.writeJson(SOURCES_WTA_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return timezonesFile;

}



/*------------------------------------*\
  ...
\*------------------------------------*/
getWtaSource();
