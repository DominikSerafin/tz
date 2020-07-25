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
  check
\*------------------------------------*/
async function check() {
  checkUntils();
}



/*------------------------------------*\
  ...
\*------------------------------------*/
check();
