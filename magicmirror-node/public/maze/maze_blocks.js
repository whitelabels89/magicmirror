Blockly.defineBlocksWithJsonArray([
  {
    "type": "move_forward",
    "message0": "maju",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160
  },
  {
    "type": "turn_left",
    "message0": "belok kiri",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 195
  },
  {
    "type": "turn_right",
    "message0": "belok kanan",
    "previousStatement": null,
    "nextStatement": null,
    "colour": 195
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
