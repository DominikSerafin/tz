/*------------------------------------*\
  Imports
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');

/*------------------------------------*\
  Sources
\*------------------------------------*/
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_NORMALIZED_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a-normalized');
const SOURCES_NORMALIZED_LINKS_PATH = path.join(SOURCES_NORMALIZED_PATH, './links.json');
const SOURCES_NORMALIZED_COUNTRIES_PATH = path.join(SOURCES_NORMALIZED_PATH, './countries.json');
const SOURCES_NORMALIZED_ONGOING_PATH = path.join(SOURCES_NORMALIZED_PATH, './ongoing.json');

/*------------------------------------*\
  Output
\*------------------------------------*/
const DIST_PATH = path.join(__dirname, './dist');
const DIST_TZ_PATH = path.join(DIST_PATH, './tz.json');
const DIST_TZ_BY_COUNTRY_PATH = path.join(DIST_PATH, './tz-country.json');

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
  const sortedZones = zones.slice().sort((a, b) => {
    if (otherZoneNames.includes(a.name)) return 2;
    if (otherZoneNames.includes(b.name)) return -2;
    if (a.name > b.name) return 1;
    return -1;
  });

  for (const z of sortedZones) console.dir(z.name);

  return sortedZones;
}
*/

/*------------------------------------*\
  Time String to Seconds
\*------------------------------------*/
/*
  Should accept following strings:
    2            time in hours
    2:00         time in hours and minutes
    01:28:14     time in hours, minutes, and seconds
    00:19:32.13  time with fractional seconds
    12:00        midday, 12 hours after 00:00
    15:00        3 PM, 15 hours after 00:00
    24:00        end of day, 24 hours after 00:00
    260:00       260 hours after 00:00
    -2:30        2.5 hours before 00:00
    -            equivalent to 0
*/
function timeStringToSeconds(rawTime) {
  let time = rawTime ? rawTime.trim() : rawTime;
  if (!time) throw new Error('time not a valid value');
  if (time === '-') return 0;

  let mod = '+';
  if (time.startsWith('-')) {
    mod = '-'
    time = time.substr(1);
  };

  let [h, m, s] = time.split(':');
  h = parseInt(h);
  m = m ? parseInt(m) : 0;
  s = s ? parseFloat(s) : 0;

  const hSeconds = h * 3600;
  const mSeconds = m * 60;
  const sSeconds = s;

  return parseFloat(mod + (hSeconds + mSeconds + sSeconds));
}

/*------------------------------------*\
  Generate Tz
\*------------------------------------*/
async function generateTz() {
  const ongoing = await fs.readJson(SOURCES_NORMALIZED_ONGOING_PATH, 'utf8');
  const links = await fs.readJson(SOURCES_NORMALIZED_LINKS_PATH, 'utf8');
  const countries = await fs.readJson(SOURCES_NORMALIZED_COUNTRIES_PATH, 'utf8');

  const zonesUnsorted = [];

  const ongoingWithoutFactory = ongoing.filter(zone => zone.name !== 'Factory');

  // check if there's any rule with "save" field having suffix "s" or "d"
  // this doesn't happen in IANA 2020a distribution, but if any other distributions is used then
  // throw error because this edge case might not be accounted for
  for (const zone of ongoingWithoutFactory) {
    for (const rule of zone.rules) {
      if (!/.*\d$/.test(rule.save)) throw new Error(
        `TODO: account for zone rule "save" field having suffix letter ${zone.name}`
      );
    }
  }

  for (const zone of ongoingWithoutFactory) {
    const zoneAliases = links.filter(l => l.target === zone.name).map(l => l.source);
    const zoneAliasesSorted = zoneAliases.slice().sort();

    const zoneFoundCountries = countries.find(c => c.tz === zone.name);
    const zoneCountries = zoneFoundCountries ? zoneFoundCountries.countries : [];
    const zoneCountriesSorted = zoneCountries.slice().sort((a, b) => (a.code > b.code) ? 1 : -1);

    const dstIsObserved = !!zone.rules.find(rule => rule.save !== '0');

    const offsetSt = zone.stdoff;

    let abbrSt = null;
    if (zone.format === '-') {
      abbrSt = null;
    } else if (zone.format.includes('/')) {
      abbrSt = zone.format.split('/')[0];
    } else if (zone.format.includes('%s')) {
      const letters = zone.rules.find(rule => rule.save === '0').letters;
      abbrSt = zone.format.replace('%s', letters === '-' ? '' : letters);
    } else {
      abbrSt = zone.format;
    }

    let abbrDst = null;
    if (dstIsObserved) {
      if (zone.format === '-') {
        abbrDst = null;
      } else if (zone.format.includes('/')) {
        abbrDst = zone.format.split('/')[1];
      } else if (zone.format.includes('%s')) {
        const letters = zone.rules.find(rule => rule.save !== '0').letters;
        abbrDst = zone.format.replace('%s', letters === '-' ? '' : letters);
      } else {
        abbrDst = zone.format;
      }
    }

    let offsetDst = null;
    if (dstIsObserved) {
      offsetDst = zone.rules.find(rule => rule.save !== '0').save;
    }

    const zoneObj = {
      canonical: zone.name,
      dst: dstIsObserved,
      abbr_st: abbrSt,
      abbr_dst: abbrDst,
      offset_st: timeStringToSeconds(offsetSt),
      offset_dst: offsetDst ? timeStringToSeconds(offsetDst) : null,
      aliases: zoneAliasesSorted,
      countries: zoneCountriesSorted,
      //coordinates: ...,
    };

    zonesUnsorted.push(zoneObj);
  }

  const output = zonesUnsorted.slice().sort((a, b) => (a.canonical > b.canonical) ? 1 : -1);

  await fs.writeJson(DIST_TZ_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Generate Tz by Country
\*------------------------------------*/
async function generateTzByCountry() {
  const zones = await fs.readJson(DIST_TZ_PATH, 'utf8');

  const countries = [];
  for (const zone of zones) {
    for (const country of zone.countries) {
      const foundCountry = countries.find(c => c.code === country.code);
      if (foundCountry) continue;
      countries.push(country);
    }
  }

  const countriesSorted = countries.slice().sort((a, b) => (a.code > b.code) ? 1 : -1);
  countriesSorted.push({
    code: 'ZZ',
    name: 'Other',
  });

  const output = [];
  for (const country of countriesSorted) {
    const countryZones = []
    for (const zone of zones) {
      const zoneObj = {
        canonical: zone.canonical,
        dst: zone.dst,
        abbr_st: zone.abbr_st,
        abbr_dst: zone.abbr_dst,
        offset_st: zone.offset_st,
        offset_dst: zone.offset_dst,
        aliases: zone.aliases,
        //coordinates: ...,
      };

      const foundCountry = zone.countries.find(c => c.code === country.code);
      if (foundCountry) countryZones.push(zoneObj);

      else if (country.code === 'ZZ' && !zone.countries.length) countryZones.push(zoneObj);
    }

    output.push({
      country_name: country.name,
      country_code: country.code,
      zones: countryZones,
    });
  }

  await fs.writeJson(DIST_TZ_BY_COUNTRY_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}

/*------------------------------------*\
  Init
\*------------------------------------*/
async function generate() {
  await generateTz();
  await generateTzByCountry();
}
generate();