import os
import logging
from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
import json
import re
from examples import get_examples

logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "turtle-playground-secret-key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

@app.route('/')
def index():
    """Main playground page"""
    examples = get_examples()
    return render_template('index.html', examples=examples)

@app.route('/api/parse-code', methods=['POST'])
def parse_code():
    """Parse Python turtle code and convert to JavaScript commands"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'})
        code = data.get('code', '')
        if not code.strip():
            return jsonify({'success': False, 'error': 'No code provided'})
        
        # Parse the turtle commands
        commands = parse_turtle_code(code)
        return jsonify({'success': True, 'commands': commands})
    
    except Exception as e:
        logging.error(f"Error parsing code: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

def parse_turtle_code(code):
    """Parse Python turtle code and extract drawing commands"""
    commands = []
    
    # Clean up the code
    lines = code.split('\n')
    
    # Track turtle variable names and loop variables
    turtle_vars = set()
    loop_stack = []
    
    for line in lines:
        original_line = line
        line = line.strip()
        if not line or line.startswith('#'):
            continue
            
        # Import statements
        if 'import turtle' in line:
            continue
            
        # Turtle creation
        if '= turtle.Turtle()' in line:
            var_name = line.split('=')[0].strip()
            turtle_vars.add(var_name)
            commands.append({'type': 'create_turtle'})
            continue
            
        # Handle for loops
        if line.startswith('for '):
            loop_match = re.match(r'for\s+(\w+)\s+in\s+range\((\d+)\):', line)
            if loop_match:
                loop_var = loop_match.group(1)
                iterations = int(loop_match.group(2))
                loop_stack.append({'var': loop_var, 'iterations': iterations, 'commands': []})
                commands.append({'type': 'start_loop', 'iterations': iterations})
            continue
            
        # Check if we're inside a loop
        current_loop = loop_stack[-1] if loop_stack else None
        
        # Direct turtle commands
        if line.startswith('turtle.'):
            command = line.replace('turtle.', '')
            parsed_commands = parse_turtle_command(command)
            commands.extend(parsed_commands)
            continue
            
        # Variable-based turtle commands
        for var in turtle_vars:
            if line.startswith(f'{var}.'):
                command = line.replace(f'{var}.', '')
                parsed_commands = parse_turtle_command(command)
                commands.extend(parsed_commands)
                break
        
        # Handle turtle.done()
        if 'turtle.done()' in line:
            commands.append({'type': 'done'})
    
    return commands

def parse_turtle_command(command_line):
    """Parse individual turtle command"""
    commands = []
    
    # Extract command name and arguments
    if '(' in command_line:
        cmd_name = command_line.split('(')[0]
        args_str = command_line.split('(')[1].rstrip(')')
        
        # Parse arguments
        args = []
        if args_str:
            # Handle string arguments with quotes
            if '"' in args_str or "'" in args_str:
                args = [args_str.strip('"\'')]
            else:
                args = [arg.strip() for arg in args_str.split(',') if arg.strip()]
    else:
        cmd_name = command_line
        args = []
    
    # Map turtle commands to our format
    if cmd_name == 'forward' or cmd_name == 'fd':
        try:
            distance = int(args[0]) if args else 100
        except ValueError:
            # Handle variable expressions like 'i * 2'
            distance = 100  # Default fallback
        commands.append({'type': 'forward', 'distance': distance})
    elif cmd_name == 'backward' or cmd_name == 'bk':
        try:
            distance = int(args[0]) if args else 100
        except ValueError:
            distance = 100  # Default fallback
        commands.append({'type': 'backward', 'distance': distance})
    elif cmd_name == 'left' or cmd_name == 'lt':
        try:
            angle = int(args[0]) if args else 90
        except ValueError:
            angle = 90  # Default fallback
        commands.append({'type': 'left', 'angle': angle})
    elif cmd_name == 'right' or cmd_name == 'rt':
        try:
            angle = int(args[0]) if args else 90
        except ValueError:
            angle = 90  # Default fallback
        commands.append({'type': 'right', 'angle': angle})
    elif cmd_name == 'color':
        color = args[0] if args else 'black'
        commands.append({'type': 'color', 'color': color})
    elif cmd_name == 'penup' or cmd_name == 'pu':
        commands.append({'type': 'penup'})
    elif cmd_name == 'pendown' or cmd_name == 'pd':
        commands.append({'type': 'pendown'})
    elif cmd_name == 'goto':
        x = float(args[0]) if len(args) > 0 else 0
        y = float(args[1]) if len(args) > 1 else 0
        commands.append({'type': 'goto', 'x': x, 'y': y})
    elif cmd_name == 'circle':
        radius = int(args[0]) if args else 50
        commands.append({'type': 'circle', 'radius': radius})
    elif cmd_name == 'speed':
        speed = args[0] if args else 'normal'
        commands.append({'type': 'speed', 'speed': speed})
    elif cmd_name == 'begin_fill':
        commands.append({'type': 'begin_fill'})
    elif cmd_name == 'end_fill':
        commands.append({'type': 'end_fill'})
    elif cmd_name == 'fillcolor':
        color = args[0] if args else 'black'
        commands.append({'type': 'fillcolor', 'color': color})
    elif cmd_name == 'pensize' or cmd_name == 'width':
        size = int(args[0]) if args else 1
        commands.append({'type': 'pensize', 'size': size})
    
    return commands

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
