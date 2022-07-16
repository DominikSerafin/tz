# tz

Time zone information in friendly JSON for use cases like server-side validation, user input options, etc.

This package doesn't contain any historical data and should not be used for working with specific dates. Take a look at other packages for that, such as [pytz](https://pythonhosted.org/pytz/), [moment-timezone](https://momentjs.com/timezone/), etc.

The data is taken directly from [IANA time zone database](https://www.iana.org/time-zones) (version 2020a).

- `/dist/tz.json` contains time zones sorted by canonical name.
- `/dist/tz-country.json` contains time zones sorted by country. With extra "Other" country for time zones that aren't assigned to any country ("Etc/GMT", "CST6CDT", etc.).

Please open an issue or a pull request if you spot any inaccuracy.

## format

```
{
  "canonical": "Pacific/Auckland",  // primary time zone name currently in use
  "dst": true,                      // tells whether time zone observes daylight saving time at all (either now or in future)
  "abbr_st": "NZST",                // abbreviation for standard time
  "abbr_dst": "NZDT",               // abbreviation for daylight saving time
  "offset_st": 43200,               // offset from UTC (in seconds) for standard time
  "offset_dst": 3600,               // offset from offset_st (in seconds) for daylight saving time
  "aliases": [                      // collection of backward-compatible time zone names
    "Antarctica/McMurdo",
    "Antarctica/South_Pole",
    "NZ"
  ],
  "countries": [                    // collection of ISO 3166 countries where this time zone is observed
    {
      "code": "AQ",
      "name": "Antarctica"
    },
    {
      "code": "NZ",
      "name": "New Zealand"
    }
  ]
}
```

## running

To run this code and generate output files, do it in sequence as below.

1. `npm run normalize`
2. `npm run generate`


## todo

- [ ] add full name for each zone abbreviation
  - CET → Central European Time
  - CEST → Central European Summer Time
  - IST → India Standard Time
  - IST → Irish Standard Time
  - IST → Israel Standard Time
  - etc.
- [ ] parse and nicely present coordinates from zone1970.tab
- [ ] take population counts from moment-timezone
