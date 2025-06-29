class TurtleCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.turtle = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            angle: 0, // 0 degrees = facing right
            penDown: true,
            color: 'black',
            fillColor: 'black',
            penSize: 1,
            filling: false
        };
        this.speed = 5;
        this.animationQueue = [];
        this.isAnimating = false;
        this.fillPath = [];
        
        this.reset();
    }
    
    reset() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset turtle position and state
        this.turtle.x = this.canvas.width / 2;
        this.turtle.y = this.canvas.height / 2;
        this.turtle.angle = 0;
        this.turtle.penDown = true;
        this.turtle.color = 'black';
        this.turtle.fillColor = 'black';
        this.turtle.penSize = 1;
        this.turtle.filling = false;
        
        // Clear animation queue
        this.animationQueue = [];
        this.isAnimating = false;
        this.fillPath = [];
        
        // Draw initial turtle
        this.drawTurtle();
    }
    
    drawTurtle() {
        const ctx = this.ctx;
        const size = 10;
        
        ctx.save();
        ctx.translate(this.turtle.x, this.turtle.y);
        ctx.rotate((this.turtle.angle - 90) * Math.PI / 180); // Adjust for turtle facing up by default
        
        // Draw turtle body
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.ellipse(0, 0, size, size * 0.8, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw turtle head
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.6, size * 0.4, size * 0.6, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw direction indicator
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(0, -size * 1.5);
        ctx.stroke();
        
        ctx.restore();
    }
    
    async executeCommands(commands) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.animationQueue = [...commands];
        
        while (this.animationQueue.length > 0 && this.isAnimating) {
            const command = this.animationQueue.shift();
            await this.executeCommand(command);
        }
        
        this.isAnimating = false;
    }
    
    async executeCommand(command) {
        return new Promise(resolve => {
            const delay = Math.max(50, 500 - (this.speed * 50));
            
            switch (command.type) {
                case 'forward':
                    this.animateMovement(command.distance, resolve);
                    break;
                case 'backward':
                    this.animateMovement(-command.distance, resolve);
                    break;
                case 'left':
                    this.animateRotation(-command.angle, resolve);
                    break;
                case 'right':
                    this.animateRotation(command.angle, resolve);
                    break;
                case 'color':
                    this.turtle.color = command.color;
                    setTimeout(resolve, delay / 4);
                    break;
                case 'fillcolor':
                    this.turtle.fillColor = command.color;
                    setTimeout(resolve, delay / 4);
                    break;
                case 'penup':
                    this.turtle.penDown = false;
                    setTimeout(resolve, delay / 4);
                    break;
                case 'pendown':
                    this.turtle.penDown = true;
                    setTimeout(resolve, delay / 4);
                    break;
                case 'pensize':
                    this.turtle.penSize = command.size;
                    setTimeout(resolve, delay / 4);
                    break;
                case 'goto':
                    this.animateGoto(command.x + this.canvas.width / 2, 
                                   this.canvas.height / 2 - command.y, resolve);
                    break;
                case 'circle':
                    this.animateCircle(command.radius, resolve);
                    break;
                case 'begin_fill':
                    this.turtle.filling = true;
                    this.fillPath = [{x: this.turtle.x, y: this.turtle.y}];
                    setTimeout(resolve, delay / 4);
                    break;
                case 'end_fill':
                    if (this.turtle.filling && this.fillPath.length > 2) {
                        this.drawFill();
                    }
                    this.turtle.filling = false;
                    this.fillPath = [];
                    setTimeout(resolve, delay / 4);
                    break;
                case 'start_loop':
                    // Handle loop start - this is managed by the parser
                    setTimeout(resolve, delay / 4);
                    break;
                default:
                    setTimeout(resolve, delay / 4);
            }
        });
    }
    
    animateMovement(distance, callback) {
        const steps = Math.max(10, Math.abs(distance) / 5);
        const stepDistance = distance / steps;
        const delay = Math.max(20, 300 - (this.speed * 30));
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep >= steps) {
                this.redraw();
                callback();
                return;
            }
            
            const oldX = this.turtle.x;
            const oldY = this.turtle.y;
            
            this.turtle.x += Math.cos(this.turtle.angle * Math.PI / 180) * stepDistance;
            this.turtle.y += Math.sin(this.turtle.angle * Math.PI / 180) * stepDistance;
            
            if (this.turtle.penDown) {
                this.ctx.strokeStyle = this.turtle.color;
                this.ctx.lineWidth = this.turtle.penSize;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(oldX, oldY);
                this.ctx.lineTo(this.turtle.x, this.turtle.y);
                this.ctx.stroke();
                
                if (this.turtle.filling) {
                    this.fillPath.push({x: this.turtle.x, y: this.turtle.y});
                }
            }
            
            this.redraw();
            currentStep++;
            setTimeout(animate, delay);
        };
        
        animate();
    }
    
    animateRotation(angle, callback) {
        const steps = Math.max(5, Math.abs(angle) / 10);
        const stepAngle = angle / steps;
        const delay = Math.max(20, 200 - (this.speed * 20));
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep >= steps) {
                callback();
                return;
            }
            
            this.turtle.angle += stepAngle;
            this.redraw();
            currentStep++;
            setTimeout(animate, delay);
        };
        
        animate();
    }
    
    animateGoto(x, y, callback) {
        const distance = Math.sqrt((x - this.turtle.x) ** 2 + (y - this.turtle.y) ** 2);
        const steps = Math.max(10, distance / 10);
        const stepX = (x - this.turtle.x) / steps;
        const stepY = (y - this.turtle.y) / steps;
        const delay = Math.max(20, 300 - (this.speed * 30));
        let currentStep = 0;
        
        const animate = () => {
            if (currentStep >= steps) {
                this.turtle.x = x;
                this.turtle.y = y;
                this.redraw();
                callback();
                return;
            }
            
            const oldX = this.turtle.x;
            const oldY = this.turtle.y;
            
            this.turtle.x += stepX;
            this.turtle.y += stepY;
            
            if (this.turtle.penDown) {
                this.ctx.strokeStyle = this.turtle.color;
                this.ctx.lineWidth = this.turtle.penSize;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(oldX, oldY);
                this.ctx.lineTo(this.turtle.x, this.turtle.y);
                this.ctx.stroke();
                
                if (this.turtle.filling) {
                    this.fillPath.push({x: this.turtle.x, y: this.turtle.y});
                }
            }
            
            this.redraw();
            currentStep++;
            setTimeout(animate, delay);
        };
        
        animate();
    }
    
    animateCircle(radius, callback) {
        const circumference = 2 * Math.PI * Math.abs(radius);
        const steps = Math.max(20, circumference / 5);
        const angleStep = 360 / steps;
        const delay = Math.max(10, 200 - (this.speed * 20));
        let currentStep = 0;
        
        const centerX = this.turtle.x + (radius > 0 ? -radius * Math.sin(this.turtle.angle * Math.PI / 180) : 
                                                       radius * Math.sin(this.turtle.angle * Math.PI / 180));
        const centerY = this.turtle.y + (radius > 0 ? radius * Math.cos(this.turtle.angle * Math.PI / 180) : 
                                                      -radius * Math.cos(this.turtle.angle * Math.PI / 180));
        
        const animate = () => {
            if (currentStep >= steps) {
                callback();
                return;
            }
            
            const oldX = this.turtle.x;
            const oldY = this.turtle.y;
            
            const angle = (currentStep * angleStep) * Math.PI / 180;
            this.turtle.x = centerX + Math.abs(radius) * Math.cos(angle + this.turtle.angle * Math.PI / 180 - Math.PI / 2);
            this.turtle.y = centerY + Math.abs(radius) * Math.sin(angle + this.turtle.angle * Math.PI / 180 - Math.PI / 2);
            
            if (this.turtle.penDown) {
                this.ctx.strokeStyle = this.turtle.color;
                this.ctx.lineWidth = this.turtle.penSize;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(oldX, oldY);
                this.ctx.lineTo(this.turtle.x, this.turtle.y);
                this.ctx.stroke();
                
                if (this.turtle.filling) {
                    this.fillPath.push({x: this.turtle.x, y: this.turtle.y});
                }
            }
            
            this.redraw();
            currentStep++;
            setTimeout(animate, delay);
        };
        
        animate();
    }
    
    drawFill() {
        if (this.fillPath.length < 3) return;
        
        this.ctx.fillStyle = this.turtle.fillColor;
        this.ctx.beginPath();
        this.ctx.moveTo(this.fillPath[0].x, this.fillPath[0].y);
        
        for (let i = 1; i < this.fillPath.length; i++) {
            this.ctx.lineTo(this.fillPath[i].x, this.fillPath[i].y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    redraw() {
        // Redraw only the turtle (the drawing remains on canvas)
        this.clearTurtle();
        this.drawTurtle();
    }
    
    clearTurtle() {
        // This is a simple implementation - in a more complex version,
        // we'd save the canvas state and restore it
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    setSpeed(speed) {
        this.speed = Math.max(1, Math.min(10, speed));
    }
    
    stopAnimation() {
        this.isAnimating = false;
        this.animationQueue = [];
    }
}

// Initialize the turtle canvas when the page loads
let turtleCanvas;
document.addEventListener('DOMContentLoaded', function() {
    turtleCanvas = new TurtleCanvas('turtleCanvas');
});
