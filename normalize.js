/*------------------------------------*\
  Imports
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');

/*------------------------------------*\
  Sources
\*------------------------------------*/
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_ISO3166_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/iso3166.tab');
const SOURCES_ZONE1970_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/zone1970.tab');
const SOURCES_TO2050_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/to2050.tzs');
const SOURCES_TZDATA_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a/tzdata.zi');
const SOURCES_NORMALIZED_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a-normalized');
const SOURCES_NORMALIZED_RULES_PATH = path.join(SOURCES_NORMALIZED_PATH, './rules.json');
const SOURCES_NORMALIZED_LINKS_PATH = path.join(SOURCES_NORMALIZED_PATH, './links.json');
const SOURCES_NORMALIZED_ZONES_PATH = path.join(SOURCES_NORMALIZED_PATH, './zones.json');
const SOURCES_NORMALIZED_COUNTRIES_PATH = path.join(SOURCES_NORMALIZED_PATH, './countries.json');
const SOURCES_NORMALIZED_ONGOING_PATH = path.join(SOURCES_NORMALIZED_PATH, './ongoing.json');

/*------------------------------------*\
  Normalize Links
\*------------------------------------*/
async function normalizeLinks() {
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];

  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim().startsWith('L')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\s/);
    output.push({
      target: components[1] || null,
      source: components[2] || null,
    });
  }

  const outputSorted = output.slice().sort((a, b) => (a.target > b.target) ? 1 : -1);

  await fs.writeJson(SOURCES_NORMALIZED_LINKS_PATH, outputSorted, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Normalize Rules
\*------------------------------------*/
async function normalizeRules() {
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];

  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim().startsWith('R')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\s/);
    const normalizedRule = {
      name: components[1] || null,
      from: components[2] || null,
      to: components[3] || null,
      type: components[4] || null,
      in: components[5] || null,
      on: components[6] || null,
      at: components[7] || null,
      save: components[8] || null,
      letters: components[9] || null,
    };
    output.push(normalizedRule);
  }

  await fs.writeJson(SOURCES_NORMALIZED_RULES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Normalize Zones
\*------------------------------------*/
async function normalizeZones() {
  const content = await fs.readFile(SOURCES_TZDATA_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const output = [];

  let currentZone;
  for (const line of lines) {
    if (line.trim().startsWith('#')) continue;
    if (line.trim().startsWith('R')) continue;
    if (line.trim().startsWith('L')) continue;
    if (!line.trim()) continue;

    const components = line.split(/\s/);
    if (components[0] === 'Z') (currentZone = components[1]);
    if (components[0] !== 'Z') {
      components.unshift(currentZone);
      components.unshift('Z');
    };

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

  await fs.writeJson(SOURCES_NORMALIZED_ZONES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Normalize Countries
\*------------------------------------*/
async function normalizeCountries() {
  const contentZone = await fs.readFile(SOURCES_ZONE1970_PATH, 'utf8');
  const contentIso = await fs.readFile(SOURCES_ISO3166_PATH, 'utf8');
  const linesZone = contentZone.split(/\r?\n/).filter(Boolean);
  const linesIso = contentIso.split(/\r?\n/).filter(Boolean);

  const names = [];

  for (const line of linesIso) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    names.push({
      code: components[0],
      name: components[1],
    });
  }

  const output = [];

  for (const line of linesZone) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    const countries = components[0].split(',').map(code => {
      const name = names.find(o => o.code === code).name;
      return {code, name};
    });
    output.push({
      tz: components[2],
      countries: countries,
      coordinates: components[1] || null,
      comments: components[3] || null,
    });
  }

  await fs.writeJson(SOURCES_NORMALIZED_COUNTRIES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Normalize Ongoing
\*------------------------------------*/
/*
  cliff notes taken from tz-how-to.html, theory.html and zic.8.txt
  this is also useful https://www.ibm.com/support/knowledgecenter/ssw_aix_72/z_commands/zic.html
  (although it seems to be from older version of IANA distribution)

  zone format can have three forms
  - applicable to unnamed zone rule ("-"):
    - single string of three or more alphanumeric characters, beginning with either "+" or "-"
  - applicable to named zone rules:
    - pair of strings separated by "/", first string is for ST, second string is for DST
    - single string containing "%s" which is replaced by LETTER/S value from appropriate rule

  rules tells us whether DST is observed
  - if rule is "-", then ST always applies
  - if rule is amount of time, only the sum of ST and that amount matters
  - if rule is named rule:
    - if at least one transition happened, use the most recent
    - if before any transition, assume ST, use earliest with SAVE=0 (applicable only to historical zones?)

  rules have "to" (year), "in" (month), "on" (day), "at" (hour)
  - note that values of those are even more abbreviated in tzdata.zi
  - note that "on" can result in a day in neighboring month, possibly different from "in"

  rule "to" possible values:
    number (year)
    "only"         same year as "from"
    "max"          ongoing rule

  rule "in" possible value:
    string (month name)

  rule "on" possible values:
    "5"            the fifth of the month
    "lastSun"      the last Sunday in the month
    "lastMon"      the last Monday in the month
    "Sun>=8"       first Sunday on or after the eighth
    "Sun<=25"      last Sunday on or before the 25th

  rule "at" possible values:
    "2"            time in hours
    "2:00"         time in hours and minutes
    "01:28:14"     time in hours, minutes, and seconds
    "00:19:32.13"  time with fractional seconds
    "12:00"        midday, 12 hours after 00:00
    "15:00"        3 PM, 15 hours after 00:00
    "24:00"        end of day, 24 hours after 00:00
    "260:00"       260 hours after 00:00
    "-2:30"        2.5 hours before 00:00
    "-"            equivalent to 0
*/
async function normalizeOngoing() {
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  // check if zone RULES is numerical value
  // (check only in current zones without UNTIL)
  // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
  // throw error because this edge case might not be accounted for
  for (const zone of zones.filter(z => !z.until)) {
    if (/\d/gi.test(zone.rules)) throw new Error(
      `TODO: account for zone rules that contain numerical or time value (${zone.name})`
    );
  }

  // check if zone RULES is unnamed and zone FORMAT is variable (with "/" or "%s")
  // (check only in current zones without UNTIL)
  // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
  // throw error because this edge case might not be accounted for
  for (const zone of zones.filter(z => !z.until)) {
    if (zone.rules === '-' && (zone.format.includes('%s') || zone.format.includes('/'))) throw new Error(
      `TODO: account for zone unnamed rules where zone also has variable format (${zone.name})`
    );
  }

  // check if there's any rule with "from" field being not a time value or a "minimum" or a "maximum" value
  // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
  // throw error because this edge case might not be accounted for
  for (const rule of rules) {
    if (!/^\d{4}$/.test(rule.from)) throw new Error(
      `TODO: account for zone rule "from" value other than 4 digit year value`
    );
  }

  // check if there's any rule with "to" field being "minimum" value
  // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
  // throw error because this edge case might not be accounted for
  for (const rule of rules) {
    if (!/^ma$|^o$|^\d{4}$/.test(rule.to)) throw new Error(
      `TODO: account for zone rule "to" value other than "ma", "o" or 4 digit year value`
    );
  }

  const output = [];
  for (const zone of zones) {
    // skip if zone is historical
    if (zone.until) continue;

    // get expanded zone rules
    const zoneRules = rules.filter(rule => rule.name === zone.rules);

    // augment rules with some values that will make some of next steps easier
    const rulesAugmented = zoneRules.map(rule => augmentRule(rule));

    // get zone rules sorted by "to" value
    const rulesSortedByTo = rulesAugmented.slice().sort((a, b) => (a.to_combined > b.to_combined) ? 1 : -1);

    // because "to_combined" doesn't account for days and hours,
    // there's a chance for duplicates of that value if transition happened in the same year and month,
    // which would make it later impossible to check which rule is the most recent
    // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
    // throw error because this edge case might not be accounted for

    // get all rules to_combined to a single sorted array
    // and compare the last two rules and see if they are equal
    // if they are equal it means we don't know which one is actually most recent
    const rulesCombineds = rulesSortedByTo.filter(r => r.to !== 'ma').map(r => r.to_combined).sort();
    const rulesCombinedsLastTwo = rulesCombineds.slice(-2);
    if (rulesCombinedsLastTwo.length && (rulesCombinedsLastTwo[0] === rulesCombinedsLastTwo[1])) {
      throw new Error(
        `TODO: normalize rule "to_combined" to a full date, also accounting for day ("on") and hour ("at") data` +
        ` (${zone.name}) (rule.to_combined=${rulesCombinedsLastTwo[0]})`
      )
    }

    // get zone rules with TO=max
    const rulesToMax = rulesAugmented.filter(rule => rule.to === 'ma');

    // - if there is zero rules with TO=max, it means we later just need to find most recent transition
    // - if there is one rule with TO=max, it means one other rule will be most recent transition (I think?)
    // - if there is more than two rules with TO=max, I don't know what that means, is it even possible?
    // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
    // throw error because this edge case might not be accounted for
    if (rulesToMax.length === 1 || rulesToMax.length > 2) throw new Error(
      `TODO: account for amount of TO=max rules other than zero or two (${zone.name})`
    );

    // extract zone that has unnamed rules, zone observes only ST
    if (zone.rules === '-') {
      zone.rules = [];
      output.push(zone);
      continue;
    }

    // extract zone with future transitions, zone observes both ST and DST (similar to TO=max)

    // get current year
    // specific date is used instead Date.now(), so the same output from this repository is reproducible
    // (if you're using this in future, you will probably need to update this repository anyway)
    const now = new Date('2020-07-25T00:00:00Z');
    const nowTo = now.getFullYear();
    const nowIn = String(now.getMonth()+1).padStart(2, '0');
    const nowCombined = `${nowTo}-${nowIn}`;

    // find index of the last transition that happened (so, current transition)
    // so find the next future transition and subtract 1
    const ruleLastTransitionIndex = rulesSortedByTo.filter(r => r.to !== 'ma').findIndex(rule => {
      return rule.to_combined > nowCombined;
    }) - 1;

    // not sure if possible, but throw error if the index here returns 0
    // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
    // throw error because this edge case might not be accounted for
    if (ruleLastTransitionIndex === 0) throw new Error(
      `TODO: account for ruleLastTransitionIndex being 0 (${zone.name})`
    );

    // finally, extract
    if (ruleLastTransitionIndex > -1) {
      const rulePrevTransition = rulesSortedByTo[ruleLastTransitionIndex-1];
      const ruleLastTransition = rulesSortedByTo[ruleLastTransitionIndex];
      const ruleNextTransition = rulesSortedByTo[ruleLastTransitionIndex+1];

      // not very DRY, but,
      // like before, check if we can actually see what transition
      // was most recent with current implementation of "to_combined"
      if (
        (rulePrevTransition.to_combined === ruleLastTransition.to_combined) ||
        (ruleLastTransition.to_combined === ruleNextTransition.to_combined)
      ) {
        throw new Error(
          `TODO: normalize rule "to_combined" to a full date, also accounting for day ("on") and hour ("at") data` +
          ` (${zone.name})`
        )
      }

      zone.rules = [
        ruleLastTransition,
        ruleNextTransition,
      ];
      output.push(zone);
      continue;
    }

    // extract zone with TO=max, zone observes both ST and DST
    // this must go after checking for future transitions, because e.g. in a 2020a distribution
    // "Asia/Tehran" with "Iran" rule includes both future transitions and TO=max transitions
    if (rulesToMax.length) {
      zone.rules = rulesToMax;
      output.push(zone);
      continue;
    }

    // extract zone that uses a single (most recent) transition
    zone.rules = rulesSortedByTo.slice(-1);
    output.push(zone);
  }

  await fs.writeJson(SOURCES_NORMALIZED_ONGOING_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Augment Rule
\*------------------------------------*/
function augmentRule(rule) {
  // abbreviations used by tzdata.zi
  const months = ['Jan', 'F', 'Mar', 'Ap', 'May', 'Jun', 'Jul', 'Au', 'S', 'O', 'N', 'D'];
  const days = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
  // year
  let ruleTo = rule.to;
  if (rule.to === 'o') (ruleTo = rule.from);
  // month
  let ruleIn = rule.in;
  ruleIn = months.findIndex(m => m === rule.in) + 1;
  ruleIn = String(ruleIn).padStart(2, '0');
  // day
  // ...
  // hour
  // ...
  // combined
  // even if ruleTo=ma
  const ruleToCombined = `${ruleTo}-${ruleIn}`;
  return {
    ...rule,
    //to_combined: '2000',
    to_combined: ruleToCombined,
    to_distinct: ruleTo, // same year as "from" if "to" was "o"
  }
}

/*------------------------------------*\
  Init
\*------------------------------------*/
async function normalize() {
  await normalizeLinks();
  await normalizeRules();
  await normalizeZones();
  await normalizeCountries();
  await normalizeOngoing();
}
normalize();
