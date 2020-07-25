/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
//
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_TZDATA_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/tzdata.zi');
const SOURCES_NORMALIZED_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a-normalized');
const SOURCES_NORMALIZED_RULES_PATH = path.join(SOURCES_NORMALIZED_PATH, './rules.json');
const SOURCES_NORMALIZED_LINKS_PATH = path.join(SOURCES_NORMALIZED_PATH, './links.json');
const SOURCES_NORMALIZED_ZONES_PATH = path.join(SOURCES_NORMALIZED_PATH, './zones.json');
const SOURCES_NORMALIZED_CURRENT_PATH = path.join(SOURCES_NORMALIZED_PATH, './current.json');
//
const DIST_PATH = path.join(__dirname, './dist');



/*------------------------------------*\
  jsonStringifyOneLineItems
\*------------------------------------*/
//async function jsonStringifyOneLineItems(arr) {
//  const stringified = arr.map(e => JSON.stringify(e)).join(',\n');
//  return stringified;
//}



/*------------------------------------*\
  otherZonesSort
\*------------------------------------*/
/*
async function otherZonesSort(zones) {
  // other zone names that should be sorted last (that do not belong to any particular "major region")
  const otherZoneNames = [];
  for (const zone of zones) {
    const r = /^Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific/i;
    if (r.test(zone.name)) continue;
    otherZoneNames.push(zone.name);
  }
  // sort
  const sortedZones = zones.sort((a, b) => {
    if (otherZoneNames.includes(a.name)) return 2;
    if (otherZoneNames.includes(b.name)) return -2;
    if (a.name > b.name) return 1;
    return -1;
  });
  //
  for (const z of sortedZones) console.dir(z.name);
  //
  return sortedZones;
}
*/



/*------------------------------------*\
  normalizeLinks
\*------------------------------------*/
async function normalizeLinks() {
  //
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim().startsWith('L')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\s/);
    output.push({
      target: components[1] || null,
      source: components[2] || null,
    });
  }
  //
  const outputSorted = output.sort((a, b) => (a.target > b.target) ? 1 : -1);
  //
  await fs.writeJson(SOURCES_NORMALIZED_LINKS_PATH, outputSorted, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}



/*------------------------------------*\
  normalizeRules
\*------------------------------------*/
async function normalizeRules() {
  //
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim().startsWith('R')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\s/);
    const normalizedRule = {
      name: components[1] || null,
      from: components[2] || null,
      to: components[3] === 'o' ? components[2] : components[3] || null,
      type: components[4] || null,
      in: components[5] || null,
      on: components[6] || null,
      at: components[7] || null,
      save: components[8] || null,
      letters: components[9] || null,
    };
    output.push(normalizedRule);
  }
  //
  //const outputSorted = output.sort((a, b) => (a.name > b.name) ? 1 : -1);
  //
  await fs.writeJson(SOURCES_NORMALIZED_RULES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}



/*------------------------------------*\
  normalizeZones
\*------------------------------------*/
async function normalizeZones() {
  //
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];
  //
  var currentZone;
  for (var line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (line.trim().startsWith('R')) continue;
    if (line.trim().startsWith('L')) continue;
    if (!line.trim()) continue;
    //
    const components = line.split(/\s/);
    if (components[0] === 'Z') (currentZone = components[1]);
    if (components[0] !== 'Z') {
      components.unshift(currentZone);
      components.unshift('Z');
    };
    //
    output.push({
      name: components[1] || null,
      stdoff: components[2] || null,
      rules: components[3] || null,
      format: components[4] || null,
      until: components[5] || null,
      until_in: components[6] || null,
      until_on: components[7] || null,
      until_at: components[8] || null,
    });
  }
  //
  //const outputSorted = output.sort((a, b) => (a.name > b.name) ? 1 : -1);
  //
  await fs.writeJson(SOURCES_NORMALIZED_ZONES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}








/*------------------------------------*\
  normalizeCurrent
\*------------------------------------*/
async function normalizeCurrent() {
  //
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  // zone.rules tells us whether DST is observed
  // - if zone.rules is "-", then ST always applies
  // - if zone.rules is amount of time, only the sum of ST and that amount matters
  // - if zone.rules is named rule:
  //   - if at least one transition happened, use the most recent
  //   - if no transition happened, assume ST, use earliest transition with SAVE=0

  // zone.format can have three forms
  // - applicable to unnamed zone rule ("-"):
  //   - single string of three or more alphanumeric characters, beginning with either "+" or "-"
  // - applicable to named zone rules:
  //   - pair of strings separated by "/", first string is for ST, second string is for DST
  //   - single string containing "%s" which is replaced by LETTER/S value from appropriate rule

  //
  //const rulesFriendler = [];
  //for (const rule of rules) {
  //  rulesFriendler.push({
  //    ...rule,
  //    until_combined: `${rule.to}-${rule.in}`
  //  });
  //}
  //


  const output = [];
  // get present zones (without "until")
  const presentZones = zones.filter(zone => !zone.until);
  // replace rules with array of expanded rules
  for (const zone of presentZones) {
    const zoneRules = rules.filter(rule => rule.name === zone.rules);
    zone.rules = zoneRules;
  }

  //
  await fs.writeJson(SOURCES_NORMALIZED_CURRENT_PATH, output.concat(presentZones), {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}














/*------------------------------------*\
  normalize
\*------------------------------------*/
async function normalize() {
  normalizeLinks();
  normalizeRules();
  normalizeZones();
  normalizeCurrent();
}



/*------------------------------------*\
  ...
\*------------------------------------*/
normalize();
