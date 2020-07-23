/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const async = require('async');
const WTA_ORIGIN = `http://worldtimeapi.org`;
const IANA_BACKWARD_PATH = path.join(__dirname, './iana/tzdb-2020a/backward');
const DIST_PATH = path.join(__dirname, './dist');
const DIST_TZ_PATH = path.join(DIST_PATH, './tz.json');



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
  getAliases
\*------------------------------------*/
async function getAliases() {
  const content = await fs.readFile(IANA_BACKWARD_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    output.push({
      source: components[2],
      target: components[1],
    });
  }
  //
  return output;
}



/*------------------------------------*\
  getZones
\*------------------------------------*/
async function getZones() {
  const output = [];
  //
  const resultZones = await axios({
    method: 'GET',
    url: `${WTA_ORIGIN}/api/timezone`,
  });
  //
  const sortedZones = resultZones.data.sort();
  //
  for (const zoneName of sortedZones) {
    const resultZone = await axios({
      method: 'GET',
      url: `${WTA_ORIGIN}/api/timezone/${zoneName}`,
    });
    output.push(resultZone.data);
    //break;
  }
  //
  return output;
}



/*------------------------------------*\
  generateTimezones
\*------------------------------------*/
async function generateTimezones() {
  //
  const aliases = await getAliases();
  const zones = await getZones();
  //
  const output = [];
  for (const zone of zones) {
    const zoneAliases = aliases.map(alias => {
      if (alias.target === zone.timezone) return alias.source;
    }).filter(Boolean).sort();
    output.push({
      id: zone.timezone,
      offset: zone.raw_offset,
      offset_dst: zone.dst_offset,
      aliases: zoneAliases,
    });
  }
  //
  return output;
}



/*------------------------------------*\
  writeTimezoneJson
\*------------------------------------*/
async function writeTimezoneJson() {
  const timezonesObject = await generateTimezones();
  const timezonesFile = await fs.writeJson(DIST_TZ_PATH, timezonesObject, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return timezonesFile;
}



/*------------------------------------*\
  ...
\*------------------------------------*/
writeTimezoneJson();
