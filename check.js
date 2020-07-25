/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
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
  checkUntils
\*------------------------------------*/
async function checkUntils() {
  //
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  const untilCounts = {}
  for (const zone of zones) {
  //if (zone.until) continue;
  if (typeof untilCounts[zone.name] === 'undefined') {
    untilCounts[zone.name] = 0;
  }
  if (!zone.until) {
    untilCounts[zone.name] = untilCounts[zone.name] + 1;
  }
  //console.dir(zone.rules.padEnd(10, ' ') + zone.name);
  }
  for (const k of Object.keys(untilCounts)) {
    console.dir(String(untilCounts[k]).padEnd(10, ' ') + k);
  }

}





/*------------------------------------*\
  checkRuleWeekDays
\*------------------------------------*/
async function checkRuleWeekDays() {
  //
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  //
  const values = [];

  for (const rule of rules) {
    if (Number.isNaN(Number(rule.on))) {
      values.push(
        rule.on.replace('last', '').replace(/(last|[<|>]=\d+)/, '')
      )
    }
  }

  console.dir(_.uniq(values));

}




/*------------------------------------*\
  checkRuleMonthsAbbr
\*------------------------------------*/
async function checkRuleMonthsAbbr() {
  //
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  //
  const values = [];

  for (const rule of rules) {
    values.push(rule.in)
  }

  console.dir(_.uniq(values));

}




/*------------------------------------*\
  checkCurrent
\*------------------------------------*/
async function checkCurrent() {
  //
  const currentZones = await fs.readJson(SOURCES_NORMALIZED_CURRENT_PATH, 'utf8');

  for (const zone of currentZones) {
    var m = zone.rules.map(r => `name: ${r.name}, save: ${r.save}, to_combined: ${r.to_combined}`);
    console.log(`${zone.name}\n  ${m.length ? (m.join('\n  ') + '\n') : ''}`);
  }
}



/*------------------------------------*\
  check
\*------------------------------------*/
async function check() {
  //checkUntils();
  //checkRuleWeekDays();
  //checkRuleMonthsAbbr();
  checkCurrent();
}



/*------------------------------------*\
  ...
\*------------------------------------*/
check();
