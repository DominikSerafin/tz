# tz

Time zone information for use cases like server-side validations, user input choices, etc.

This package doesn't contain any historical data and should not be used for parsing any specific dates. For that take a look at packages such as [pytz](https://pythonhosted.org/pytz/), [moment-timezone](https://momentjs.com/timezone/), etc.

The data here is taken directly from [IANA time zone database](https://www.iana.org/time-zones) (version 2020a).

- `/dist/tz.json` contains time zones sorted by canonical name.
- `/dist/tz-country.json` contains time zones sorted by country. With extra "Other" country for time zones that aren't assigned to any country ("Etc/GMT", "CST6CDT", etc.).

Please open an issue or a pull request if you spot any inaccuracy.

# format

```
  {
    "canonical": "Pacific/Auckland",  // primary time zone name currently in use
    "dst": true,                      // tells whether time zone observes daylight saving time at all (either now or in future)
    "abbr_st": "NZST",                // abbreviation whenever time zone is in standard time
    "abbr_dst": "NZDT",               // abbreviation whenever time zone is in daylight saving time
    "offset_st": 43200,               // offset from UTC in seconds whenever time zone is in standard time
    "offset_dst": 3600,               // offset from offset_st in seconds whenever time zone is in daylight saving time
    "aliases": [                      // backward-compatible time zone names
      "Antarctica/McMurdo",
      "Antarctica/South_Pole",
      "NZ"
    ],
    "countries": [                    // tells in which countries this time zone is observed
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

# todo

- [ ] map zone abbreviations to full names, e.g.
  - CET → Central European Time
  - CEST → Central European Summer Time
  - IST → India Standard Time
  - IST → Irish Standard Time
  - IST → Israel Standard Time
  - ...
- [ ] parse and nicely present countries coordinates
- [ ] take population counts from moment-timezone