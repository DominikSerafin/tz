/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const async = require('async');
const {uniq} = require('lodash');
//
const WTA_ORIGIN = `http://worldtimeapi.org`;
//
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_IANA_BACKWARD_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/backward');
const SOURCES_IANA_ISO3166_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/iso3166.tab');
const SOURCES_IANA_ZONE1970_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/zone1970.tab');
const SOURCES_IANA_TO2050_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/to2050.tzs');
const SOURCES_WTA_PATH = path.join(SOURCES_PATH, './wta/worldtimeapi.json');
//
const DIST_PATH = path.join(__dirname, './dist');
const DIST_TZ_PATH = path.join(DIST_PATH, './tz.json');



/*------------------------------------*\
  getWtaZones
\*------------------------------------*/
async function getWtaZones() {
  const content = await fs.readFile(SOURCES_WTA_PATH, 'utf8');
  const wtaZones = JSON.parse(content);
  return wtaZones;
}



/*------------------------------------*\
  getAliasesFromBackward
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
  getAliasesFromTo2050
\*------------------------------------*/
async function getAliasesFromTo2050() {
  const content = await fs.readFile(SOURCES_IANA_TO2050_PATH, 'utf8');
  const sections = content.split(/\r?\nTZ=/).filter(Boolean);
  const output = [];
  //
  const sectionAliases = sections[0];
  //
  const lines = sectionAliases.split(/\r?\n/).filter(Boolean);
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
  getCountryNames
\*------------------------------------*/
async function getCountryNames() {
  const content = await fs.readFile(SOURCES_IANA_ISO3166_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    output.push({
      code: components[0],
      name: components[1],
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
  const aliases = await getAliasesFromTo2050();
  const countryNames = await getCountryNames();
  const countryCodes = await getCountryCodes();

  //
  const output = [];
  for (const zone of wtaZones) {
    output.push(await generateTimezone(
      zone, aliases, countryNames, countryCodes,
    ));
  }
  //
  return output;
}



/*------------------------------------*\
  generateTimezone
\*------------------------------------*/
async function generateTimezone(zone, aliases, countryNames, countryCodes) {

  //
  const zoneAliases = aliases.map(alias => {
    if (alias.target === zone.timezone) return alias.source;
  }).filter(Boolean).sort();

  //
  const zoneCountryCodes = countryCodes.find(code => {
    if (code.tz === zone.timezone) return true;
  });

  //
  const zoneCountries = zoneCountryCodes ? zoneCountryCodes.codes.map(code => {
    const name = countryNames.find(c => c.code === code);
    return name;
  }) : [];

  //
  return {
    canonical: zone.timezone,
    offset_st: zone.raw_offset,
    aliases: zoneAliases,
    countries: zoneCountries,
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