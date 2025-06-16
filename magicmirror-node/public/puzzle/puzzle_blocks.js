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
