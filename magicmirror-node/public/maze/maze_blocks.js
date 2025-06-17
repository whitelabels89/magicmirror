Blockly.defineBlocksWithJsonArray([
  {
    "type": "move_forward",
    "message0": "maju",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Bergerak maju satu langkah ke depan",
    "helpUrl": ""
  },
  {
    "type": "turn_left",
    "message0": "belok kiri",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 195,
    "tooltip": "Belok ke kiri",
    "helpUrl": ""
  },
  {
    "type": "turn_right",
    "message0": "belok kanan",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 195,
    "tooltip": "Belok ke kanan",
    "helpUrl": ""
  }
]);

Blockly.JavaScript['move_forward'] = function(){
  return 'moveForward();\n';
};
Blockly.JavaScript['turn_left'] = function(){
  return 'turnLeft();\n';
};
Blockly.JavaScript['turn_right'] = function(){
  return 'turnRight();\n';
};
