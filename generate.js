/*------------------------------------*\
  imports & configuration
\*------------------------------------*/
const path = require('path');
const fs = require('fs-extra');
//
const DIST_PATH = path.join(__dirname, './dist');
const DIST_TZ_PATH = path.join(DIST_PATH, './tz.json');
const DIST_TZ_BY_COUNTRY_PATH = path.join(DIST_PATH, './tz-country.json');








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