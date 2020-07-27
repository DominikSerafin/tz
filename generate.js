/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
//
const SOURCES_PATH = path.join(__dirname, './sources');
const SOURCES_NORMALIZED_PATH = path.join(SOURCES_PATH, './iana/tzdb-2020a-normalized');
const SOURCES_NORMALIZED_LINKS_PATH = path.join(SOURCES_NORMALIZED_PATH, './links.json');
const SOURCES_NORMALIZED_COUNTRIES_PATH = path.join(SOURCES_NORMALIZED_PATH, './countries.json');
const SOURCES_NORMALIZED_ONGOING_PATH = path.join(SOURCES_NORMALIZED_PATH, './ongoing.json');
//
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
  timeStringToSeconds
\*------------------------------------*/
function timeStringToSeconds(rawTime) {

  //  2            time in hours
  //  2:00         time in hours and minutes
  //  01:28:14     time in hours, minutes, and seconds
  //  00:19:32.13  time with fractional seconds
  //  12:00        midday, 12 hours after 00:00
  //  15:00        3 PM, 15 hours after 00:00
  //  24:00        end of day, 24 hours after 00:00
  //  260:00       260 hours after 00:00
  //  -2:30        2.5 hours before 00:00
  //  -            equivalent to 0

  //
  var time = rawTime ? rawTime.trim() : rawTime;

  //
  if (!time) throw new Error('time not a valid value');

  //
  if (time === '-') return 0;

  //
  var mod = '+';
  if (time.startsWith('-')) {
    mod = '-'
    time = time.substr(1);
  };

  //
  var [h, m, s] = time.split(':');
  h = parseInt(h);
  m = m ? parseInt(m) : 0;
  s = s ? parseFloat(s) : 0;

  //
  //console.dir(`${rawTime.padEnd(10, ' ')} ${mod.padEnd(1, ' ')} ${h}h ${m}m ${s}s `)

  //
  const hSeconds = h * 3600;
  const mSeconds = m * 60;
  const sSeconds = s;

  //
  return parseFloat(mod + (hSeconds + mSeconds + sSeconds));
}







/*------------------------------------*\
  generateTz
\*------------------------------------*/
async function generateTz() {
  return;

  // TODO: remove Factory time zone?

  // TODO: generate zones in format:
  //{
  //  canonical: ...
  //  aliases: [
  //    alias,
  //    alias,
  //    ...
  //  ]
  //  offset_st: ...    // in seconds?
  //  offset_dst: ...   // in seconds?
  //  abbr_st: ...
  //  abbr_dst: ...     //
  //  dst_use: ...
  //  countries: [
  //    {
  //      code: ...
  //      name: ...
  //    }
  //  ]
  //  coordinates: ...
  //}

  //
  await fs.writeJson(DIST_TZ_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}







/*------------------------------------*\
  generateTzByCountry
\*------------------------------------*/
async function generateTzByCountry() {
  return;

  const zones = await fs.readJson(DIST_TZ_PATH, 'utf8');
  //
  const countries = [];
  for (const zone of zones) {
    for (const country of zone.countries) {
      var foundCountry = countries.find(c => c.code === country.code);
      if (foundCountry) continue;
      countries.push(country);
    }
  }
  //
  const countriesSorted = countries.sort((a, b) => (a.code > b.code) ? 1 : -1);
  countriesSorted.push({
    code: 'ZZ',
    name: 'Other',
  });
  //
  const output = [];
  for (const country of countriesSorted) {
    //
    const countryZones = []
    for (const zone of zones) {
      const zoneObj = {
        canonical: zone.canonical,
        offset_st: zone.offset_st,
        aliases: zone.aliases,
      };
      //
      const foundCountry = zone.countries.find(c => c.code === country.code);
      if (foundCountry) countryZones.push(zoneObj);
      //
      else if (country.code === 'ZZ' && !zone.countries.length) countryZones.push(zoneObj);
    }
    //
    output.push({
      country_name: country.name,
      country_code: country.code,
      zones: countryZones,
    });
  }
  //
  await fs.writeJson(DIST_TZ_BY_COUNTRY_PATH, output, {
    spaces: 2,
    EOL: '\n',
    encoding: 'utf8',
  });
  return true;
}



/*------------------------------------*\
  ...
\*------------------------------------*/
async function generate() {
  await generateTz();
  await generateTzByCountry();
}
generate();