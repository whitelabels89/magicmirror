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
    "message0": " %1",
    "args0": [
      {
        "type": "field_image",
        "name": "SRC",
        "src": "/img/kucing.png",
        "width": 200,
        "height": 200,
        "alt": "kucing"
      }
    ],
    "output": "GAMBAR",
    "colour": 175
  },
  {
    "type": "gambar_lebah",
    "message0": " %1",
    "args0": [
      {
        "type": "field_image",
        "name": "SRC",
        "src": "/img/lebah.png",
        "width": 200,
        "height": 200,
        "alt": "lebah"
      }
    ],
    "output": "GAMBAR",
    "colour": 175
  },
  {
    "type": "gambar_bebek",
    "message0": " %1",
    "args0": [
      {
        "type": "field_image",
        "name": "SRC",
        "src": "/img/bebek.png",
        "width": 200,
        "height": 200,
        "alt": "bebek"
      }
    ],
    "output": "GAMBAR",
    "colour": 175
  },
  {
    "type": "gambar_kura",
    "message0": " %1",
    "args0": [
      {
        "type": "field_image",
        "name": "SRC",
        "src": "/img/kura.png",
        "width": 200,
        "height": 200,
        "alt": "kura"
      }
    ],
    "output": "GAMBAR",
    "colour": 175
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
    "type": "hewan_kura",
    "message0": "kura-kura",
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
