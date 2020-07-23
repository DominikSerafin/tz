/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const async = require('async');
//
const WTA_ORIGIN = `http://worldtimeapi.org`;
//
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_IANA_BACKWARD_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/backward');
const SOURCES_IANA_ZONE1970_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/zone1970.tab');
const SOURCES_WTA_PATH = path.join(SOURCES_PATH, './wta/worldtimeapi.json');
//
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
  getWtaZones
\*------------------------------------*/
async function getWtaZones() {
  const content = await fs.readFile(SOURCES_WTA_PATH, 'utf8');
  const wtaZones = JSON.parse(content);
  return wtaZones;
}



/*------------------------------------*\
  getAliases
\*------------------------------------*/
async function getAliases() {
  const content = await fs.readFile(SOURCES_IANA_BACKWARD_PATH, 'utf8');
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
  getCountryCodes
\*------------------------------------*/
async function getCountryCodes() {
  const content = await fs.readFile(SOURCES_IANA_ZONE1970_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    output.push({
      tz: components[2],
      codes: components[0].split(','),
      coordinates: components[1],
      comments: components[3],
    });
  }
  //
  return output;
}



/*------------------------------------*\
  generateTimezones
\*------------------------------------*/
async function generateTimezones() {
  //
  const wtaZones = await getWtaZones();
  const aliases = await getAliases();
  const countryCodes = await getCountryCodes();
  //
  const output = [];
  for (const zone of wtaZones) {
    output.push(await generateTimezone(
      zone, aliases, countryCodes,
    ));
  }
  //
  return output;
}




/*------------------------------------*\
  generateTimezone
\*------------------------------------*/
async function generateTimezone(zone, aliases, countryCodes) {

  //
  const zoneAliases = aliases.map(alias => {
    if (alias.target === zone.timezone) return alias.source;
  }).filter(Boolean).sort();

  //
  const zoneCountryCodes = countryCodes.map(code => {
    if (code.tz === zone.timezone) return code.codes;
  }).filter(Boolean);


  //
  return {
    id: zone.timezone,
    offset_st: zone.raw_offset,
    aliases: zoneAliases,
    country_codes: zoneCountryCodes,
  };

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
