/*------------------------------------*\
  Imports
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment-timezone');

/*------------------------------------*\
  Sources
\*------------------------------------*/
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_NORMALIZED_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a-normalized');
const SOURCES_NORMALIZED_RULES_PATH = path.join(SOURCES_NORMALIZED_PATH, './rules.json');
const SOURCES_NORMALIZED_LINKS_PATH = path.join(SOURCES_NORMALIZED_PATH, './links.json');
const SOURCES_NORMALIZED_ZONES_PATH = path.join(SOURCES_NORMALIZED_PATH, './zones.json');
const SOURCES_NORMALIZED_ONGOING_PATH = path.join(SOURCES_NORMALIZED_PATH, './ongoing.json');

/*------------------------------------*\
  Configuration
\*------------------------------------*/
const WTA_ORIGIN = `http://worldtimeapi.org`;

/*------------------------------------*\
  Axios Interceptors
\*------------------------------------*/
axios.interceptors.request.use(function(config) {
  // before request is sent
  console.log(`${config.method.toUpperCase()} ${config.url}: REQUESTING`);
  return config;
}, function(error) {
  // request error
  return Promise.reject(error);
});

axios.interceptors.response.use(function(response) {
  console.log(`${response.config.method.toUpperCase()} ${response.config.url}: OK`);
  return response;
}, function(error) {
  console.log(`\n\n ${error.config.method.toUpperCase()} ${error.config.url}: ERROR \n\n`);
  // any other status code
  return Promise.reject(error);
});

/*------------------------------------*\
  Check "Untils"
\*------------------------------------*/
async function checkUntils() {
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  const untilCounts = {};

  for (const zone of zones) {
    //if (zone.until) continue;
    if (typeof untilCounts[zone.name] === 'undefined') {
      untilCounts[zone.name] = 0;
    }
    if (!zone.until) {
      untilCounts[zone.name] = untilCounts[zone.name] + 1;
    }
  }

  for (const k of Object.keys(untilCounts)) {
    console.dir(String(untilCounts[k]).padEnd(10, ' ') + k);
  }
}

/*------------------------------------*\
  Check Week Days Rule
\*------------------------------------*/
async function checkRuleWeekDays() {
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

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
  Check Months Abbr Rule
\*------------------------------------*/
async function checkRuleMonthsAbbr() {
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  const values = [];

  for (const rule of rules) {
    values.push(rule.in)
  }

  console.dir(_.uniq(values));
}

/*------------------------------------*\
  Check Ongoing
\*------------------------------------*/
async function checkOngoing() {
  const ongoingZones = await fs.readJson(SOURCES_NORMALIZED_ONGOING_PATH, 'utf8');

  for (const zone of ongoingZones) {
    const m = zone.rules.map(
      r => `name=${r.name} save=${r.save} from=${r.from} to_combined=${r.to_combined} letters=${r.letters}`
    );
    console.log(`${zone.name} (${zone.format})\n  ${m.length ? (m.join('\n  ') + '\n') : ''}`);
  }
}

/*------------------------------------*\
  (Sanity) Check Against World Time API
\*------------------------------------*/
async function checkAgainstWta() {
  const output = [];

  const resultZones = await axios({
    method: 'GET',
    url: `${WTA_ORIGIN}/api/timezone`,
  });

  for (const zoneName of resultZones.data) {
    const resultZone = await axios({
      method: 'GET',
      url: `${WTA_ORIGIN}/api/timezone/${zoneName}`,
    });
    const tz = resultZone.data;
  }
}

/*------------------------------------*\
  (Sanity) Check Against Moment.js
\*------------------------------------*/
async function checkAgainstMoment() {
  console.dir(moment.tz.names());
  console.dir(moment.tz.zone('America/Los_Angeles'));
}

/*------------------------------------*\
  check
\*------------------------------------*/
async function check() {
  //await checkUntils();
  //await checkRuleWeekDays();
  //await checkRuleMonthsAbbr();
  //await checkOngoing();
  //await checkAgainstWta();
  //await checkAgainstMoment();
}
check();
