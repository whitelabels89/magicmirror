def get_examples():
    """Return a list of example turtle programs for kids"""
    return [
        {
            'name': 'Purple Star',
            'description': 'Draw a beautiful purple star',
            'code': '''import turtle

kura = turtle.Turtle()
kura.color("purple")
for i in range(36):
    kura.forward(100)
    kura.left(170)

turtle.done()'''
        },
        {
            'name': 'Rainbow Square',
            'description': 'Draw a colorful square',
            'code': '''import turtle

artist = turtle.Turtle()
colors = ["red", "orange", "yellow", "green"]

for i in range(4):
    artist.color(colors[i % len(colors)])
    artist.forward(100)
    artist.left(90)

turtle.done()'''
        },
        {
            'name': 'Flower Pattern',
            'description': 'Create a simple flower',
            'code': '''import turtle

flower = turtle.Turtle()
flower.color("pink")

for i in range(8):
    flower.circle(50)
    flower.left(45)

turtle.done()'''
        },
        {
            'name': 'Spiral',
            'description': 'Draw a growing spiral',
            'code': '''import turtle

spiral = turtle.Turtle()
spiral.color("blue")

for i in range(50):
    spiral.forward(i * 2)
    spiral.left(90)

turtle.done()'''
        },
        {
            'name': 'House',
            'description': 'Draw a simple house',
            'code': '''import turtle

house = turtle.Turtle()
house.color("brown")

# Draw the base
for i in range(4):
    house.forward(100)
    house.left(90)

# Draw the roof
house.color("red")
house.left(45)
house.forward(70)
house.left(90)
house.forward(70)

turtle.done()'''
        },
        {
            'name': 'Colorful Circle',
            'description': 'Draw circles with different colors',
            'code': '''import turtle

painter = turtle.Turtle()
colors = ["red", "blue", "green", "yellow", "purple", "orange"]

for i in range(6):
    painter.color(colors[i])
    painter.circle(30)
    painter.penup()
    painter.forward(60)
    painter.pendown()

turtle.done()'''
        }
    ]
