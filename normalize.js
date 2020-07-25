/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
//
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
  normalizeCountries
\*------------------------------------*/
async function normalizeCountries() {
  //
  const contentZone = await fs.readFile(SOURCES_ZONE1970_PATH, 'utf8');
  const contentIso = await fs.readFile(SOURCES_ISO3166_PATH, 'utf8');
  const linesZone = contentZone.split(/\r?\n/).filter(Boolean);
  const linesIso = contentIso.split(/\r?\n/).filter(Boolean);

  //
  const names = [];

  //
  for (const line of linesIso) {
    if (line.trim().startsWith('#')) continue;
    if (!line.trim()) continue;
    const components = line.split(/\t+/);
    names.push({
      code: components[0],
      name: components[1],
    });
  }

  //
  const output = [];

  //
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
      coordinates: components[1],
      comments: components[3],
    });
  }

  //
  await fs.writeJson(SOURCES_NORMALIZED_COUNTRIES_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}







/*------------------------------------*\
  normalizeOngoing
\*------------------------------------*/
async function normalizeOngoing() {

  // cliff notes taken from tz-how-to.html, theory.html and zic.8.txt
  //
  // zone format can have three forms
  // - applicable to unnamed zone rule ("-"):
  //   - single string of three or more alphanumeric characters, beginning with either "+" or "-"
  // - applicable to named zone rules:
  //   - pair of strings separated by "/", first string is for ST, second string is for DST
  //   - single string containing "%s" which is replaced by LETTER/S value from appropriate rule
  //
  // rules tells us whether DST is observed
  // - if rule is "-", then ST always applies
  // - if rule is amount of time, only the sum of ST and that amount matters
  // - if rule is named rule:
  //   - if at least one transition happened, use the most recent
  //   - if before any transition, assume ST, use earliest with SAVE=0 (applicable only to historical zones?)
  //
  // rules have "to" (year), "in" (month), "on" (day), "at" (hour)
  // - note that values of those are even more abbreviated in tzdata.zi
  // - note that "on" can result in a day in neighboring month, possibly different from "in"
  //
  // rule "to" possible values:
  //   number (year)
  //   "only"         same year as "from"
  //   "max"          ongoing rule
  //
  // rule "in" possible value:
  //   string (month name)
  //
  // rule "on" possible values:
  //   "5"            the fifth of the month
  //   "lastSun"      the last Sunday in the month
  //   "lastMon"      the last Monday in the month
  //   "Sun>=8"       first Sunday on or after the eighth
  //   "Sun<=25"      last Sunday on or before the 25th
  //
  // rule "at" possible values:
  //   "2"            time in hours
  //   "2:00"         time in hours and minutes
  //   "01:28:14"     time in hours, minutes, and seconds
  //   "00:19:32.13"  time with fractional seconds
  //   "12:00"        midday, 12 hours after 00:00
  //   "15:00"        3 PM, 15 hours after 00:00
  //   "24:00"        end of day, 24 hours after 00:00
  //   "260:00"       260 hours after 00:00
  //   "-2:30"        2.5 hours before 00:00
  //   "-"            equivalent to 0


  //
  const zones = await fs.readJson(SOURCES_NORMALIZED_ZONES_PATH, 'utf8');
  const rules = await fs.readJson(SOURCES_NORMALIZED_RULES_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');

  //
  const output = [];

  //
  for (const zone of zones) {

    // skip if zone is historical
    if (zone.until) continue;

    // if zone RULES is numerical value
    // in IANA 2020a distribution it doesn't happen
    // so just throw error if this code runs on any other distribution
    // so it's known that any such edge case is not accounted for
    if (/\d/gi.test(zone.rules)) throw new Error(
      `TODO: account for zone RULES when it contains numerical or time value (${zone.name})`
    );

    // if zone RULES is unnamed and zone FORMAT is variable (with "/" or "%s")
    // in IANA 2020a distribution it doesn't happen
    // so just throw error if this code runs on any other distribution
    // so it's known that any such edge case is not accounted for
    if (zone.rules === '-' && (zone.format.includes('%s') || zone.format.includes('/'))) throw new Error(
      `TODO: account for zone unnamed RULES and variable format (${zone.name})`
    );



    // expand zone rules
    const zoneRules = rules.filter(rule => rule.name === zone.rules);

    // augment rules with some values that will make some of next steps easier
    // month abbreviations
    const months = ['Jan', 'F', 'Mar', 'Ap', 'May', 'Jun', 'Jul', 'Au', 'S', 'O', 'N', 'D'];
    // week day abbreviations
    //const days = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
    const rulesAugmented = zoneRules.map(rule => {
      // year
      var ruleTo = rule.to;
      if (rule.to === 'o') (ruleTo = rule.from);
      // month
      var ruleIn = rule.in;
      ruleIn = months.findIndex(m => m === rule.in) + 1;
      ruleIn = String(ruleIn).padStart(2, '0');
      // day
      // ...
      // hour
      // ...
      // combined
      // even if ruleTo=ma
      var ruleToCombined = `${ruleTo}-${ruleIn}`;
      return {
        ...rule,
        //to_combined: '2000',
        to_combined: ruleToCombined,
        to_distinct: ruleTo, // same year as "from" if "to" was "o"
      }
    });

    // get zone rules sorted by "to" value
    const rulesSortedByTo = rulesAugmented.sort((a, b) => (a.to_combined > b.to_combined) ? 1 : -1).sort();

    // because "to_combined" doesn't account for days and hours,
    // there's a chance for duplicates of that value if transition happened in the same year and month,
    // which would make it later impossible to check which rule is the most recent
    // in IANA 2020a distribution it doesn't happen
    // so just throw error if this code runs on any other distribution
    // so it's known that any such edge case is not accounted for

    // get all rules to_combined to a single sorted array
    // and compare the last two rules and see if they are equal
    // if they are equal it means we don't know which one is actually most recent
    const rulesCombineds = (
      rulesSortedByTo.map(rule => rule.to !== 'ma' ? rule.to_combined : null).sort().filter(Boolean)
    );
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
    // in IANA 2020a distribution it's always either zero or two rules with TO=max
    // so just throw error if this code runs on any other distribution
    // so it's known that any such edge case is not accounted for
    if (rulesToMax.length === 1 || rulesToMax.length > 2) throw new Error(
      `TODO: account for amount of TO=max rules other than zero or two (${zone.name})`
    );

    //
    // extract zone that has unnamed rules, zone observes only ST
    if (zone.rules === '-') {
      zone.rules = [];
      output.push(zone);
      continue;
    }



    //
    // extract zone with future transitions, zone observes both ST and DST (similar to TO=max)

    // get current year
    // specific date is used instead Date.now(), so the same output from this repository is reproducible
    // (if you're using this in future, you will probably need to update this repository anyway)
    const nowYear = (new Date('2020-07-25T00:00:00Z')).getFullYear();

    // find index of the next transition that will happen in future
    const rulePostFutureTransitionIndex = rulesSortedByTo.findIndex(
      rule => Number(rule.to_distinct) > Number(nowYear)
    );

    // if the index here returns 0 it means that future transition is actually first
    // in IANA 2020a distribution it doesn't happen
    // so just throw error if this code runs on any other distribution
    // so it's known that any such edge case is not accounted for
    if (rulePostFutureTransitionIndex === 0) throw new Error(
      `TODO: account for zone with only future transition(s) (${zone.name})`
    );

    // finally, extract
    if (rulePostFutureTransitionIndex > -1) {

      //
      const rulePrePreFutureTransition = rulesSortedByTo[rulePostFutureTransitionIndex-2];
      const rulePreFutureTransition = rulesSortedByTo[rulePostFutureTransitionIndex-1];
      const rulePostFutureTransition = rulesSortedByTo[rulePostFutureTransitionIndex];

      // not very DRY, but,
      // like before, check if we can actually see what transition
      // was most recent with current implementation of "to_combined"
      if (
        (rulePrePreFutureTransition.to_combined === rulePreFutureTransition.to_combined) ||
        (rulePreFutureTransition.to_combined === rulePostFutureTransition.to_combined)
      ) {
        throw new Error(
          `TODO: normalize rule "to_combined" to a full date, also accounting for day ("on") and hour ("at") data` +
          ` (${zone.name})`
        )
      }

      //
      zone.rules = [
        rulePreFutureTransition,
        rulePostFutureTransition,
      ];
      output.push(zone);
      continue;
    }



    //
    // extract zone with TO=max, zone observes both ST and DST
    // this must go after checking for future transitions, because e.g. in a 2020a distribution
    // "Asia/Tehran" with "Iran" rule includes both future transitions and TO=max transitions
    if (rulesToMax.length) {
      zone.rules = rulesToMax;
      output.push(zone);
      continue;
    }



    //
    // extract zone that uses a single (most recent) transition
    zone.rules = rulesSortedByTo.slice(-1);
    output.push(zone);

  }

  //
  await fs.writeJson(SOURCES_NORMALIZED_ONGOING_PATH, output, {
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
  normalizeCountries();
  normalizeOngoing();
}
normalize();
