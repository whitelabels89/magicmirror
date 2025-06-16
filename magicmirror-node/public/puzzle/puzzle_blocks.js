Blockly.defineBlocksWithJsonArray([
  {
    "type": "ciri",
    "message0": "%1",
    "args0": [
      {"type": "field_input", "name": "TEXT", "text": "ciri"}
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 290
  },
  {
    "type": "kaki",
    "message0": "kaki %1",
    "args0": [
      {"type": "field_dropdown", "name": "NUM", "options": [["0","0"],["2","2"],["4","4"],["6","6"]]}
    ],
    "output": "Number",
    "colour": 120
  },
  {
    "type": "gambar",
    "message0": "gambar %1",
    "args0": [
      {"type": "field_input", "name": "SRC", "text": "url"}
    ],
    "output": "GAMBAR",
    "colour": 20
  },
  {
    "type": "gambar_kucing",
    "message0": "gambar %1",
    "args0": [
      {
        "type": "field_image",
        "name": "SRC",
        "src": "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2072%2072'%3E%0A%20%3Ccircle%20cx%3D'36'%20cy%3D'36'%20r%3D'20'%20fill%3D'%23FFCC00'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Cpolygon%20points%3D'20%2C20%2026%2C8%2032%2C20'%20fill%3D'%23FFCC00'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Cpolygon%20points%3D'52%2C20%2046%2C8%2040%2C20'%20fill%3D'%23FFCC00'%20stroke%3D'%23000'%20stroke-width%3D'2'%2F%3E%0A%20%3Ccircle%20cx%3D'28'%20cy%3D'36'%20r%3D'4'%20fill%3D'%23000'%2F%3E%0A%20%3Ccircle%20cx%3D'44'%20cy%3D'36'%20r%3D'4'%20fill%3D'%23000'%2F%3E%0A%20%3Cpath%20d%3D'M30%2044%20Q36%2050%2042%2044'%20stroke%3D'%23000'%20stroke-width%3D'2'%20fill%3D'none'%2F%3E%0A%3C%2Fsvg%3E",
        "width": 40,
        "height": 40,
        "alt": "kucing"
      }
    ],
    "output": "GAMBAR",
    "colour": 20
  },
  {
    "type": "hewan_kucing",
    "message0": "kucing",
    "message1": "gambar %1",
    "args1": [
      {"type": "input_value", "name": "GAMBAR", "check": "GAMBAR"}
    ],
    "message2": "kaki %1",
    "args2": [
      {"type": "input_value", "name": "KAKI", "check": "Number"}
    ],
    "message3": "ciri-ciri %1",
    "args3": [
      {"type": "input_statement", "name": "CIRI"}
    ],
    "colour": 100
  },
  {
    "type": "hewan_lebah",
    "message0": "lebah",
    "message1": "gambar %1",
    "args1": [
      {"type": "input_value", "name": "GAMBAR", "check": "GAMBAR"}
    ],
    "message2": "kaki %1",
    "args2": [
      {"type": "input_value", "name": "KAKI", "check": "Number"}
    ],
    "message3": "ciri-ciri %1",
    "args3": [
      {"type": "input_statement", "name": "CIRI"}
    ],
    "colour": 100
  },
  {
    "type": "hewan_bebek",
    "message0": "bebek",
    "message1": "gambar %1",
    "args1": [
      {"type": "input_value", "name": "GAMBAR", "check": "GAMBAR"}
    ],
    "message2": "kaki %1",
    "args2": [
      {"type": "input_value", "name": "KAKI", "check": "Number"}
    ],
    "message3": "ciri-ciri %1",
    "args3": [
      {"type": "input_statement", "name": "CIRI"}
    ],
    "colour": 100
  },
  {
    "type": "hewan_siput",
    "message0": "siput",
    "message1": "gambar %1",
    "args1": [
      {"type": "input_value", "name": "GAMBAR", "check": "GAMBAR"}
    ],
    "message2": "kaki %1",
    "args2": [
      {"type": "input_value", "name": "KAKI", "check": "Number"}
    ],
    "message3": "ciri-ciri %1",
    "args3": [
      {"type": "input_statement", "name": "CIRI"}
    ],
    "colour": 100
  }
]);
