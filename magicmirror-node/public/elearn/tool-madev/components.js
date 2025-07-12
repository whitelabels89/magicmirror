// Component definitions and utilities
const ComponentTypes = {
    TEXT: 'text',
    BUTTON: 'button',
    ICON: 'icon',
    IMAGE: 'image',
    SHAPE: 'shape',
    GROUP: 'group',
    LIST: 'list'
};

const ComponentTemplates = {
    [ComponentTypes.TEXT]: {
        type: ComponentTypes.TEXT,
        props: {
            text: 'Sample Text',
            fontSize: '16px',
            color: '#333333',
            fontWeight: 'normal',
            textAlign: 'left',
            backgroundColor: 'transparent',
            padding: '8px',
            borderRadius: '4px'
        },
        style: {
            width: '120px',
            height: 'auto',
            minHeight: '30px'
        }
    },
    [ComponentTypes.BUTTON]: {
        type: ComponentTypes.BUTTON,
        props: {
            text: 'Click Me',
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#007bff',
            borderRadius: '6px',
            padding: '10px 20px',
            fontWeight: '500',
            border: 'none'
        },
        style: {
            width: '100px',
            height: '40px'
        }
    },
    [ComponentTypes.ICON]: {
        type: ComponentTypes.ICON,
        props: {
            icon: 'fas fa-star',
            fontSize: '24px',
            color: '#007bff',
            backgroundColor: 'transparent',
            padding: '8px',
            borderRadius: '4px'
        },
        style: {
            width: '40px',
            height: '40px'
        }
    },
    [ComponentTypes.IMAGE]: {
        type: ComponentTypes.IMAGE,
        props: {
            src: '',
            alt: 'Image placeholder',
            borderRadius: '6px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6'
        },
        style: {
            width: '100px',
            height: '100px'
        }
    },
    [ComponentTypes.SHAPE]: {
        type: ComponentTypes.SHAPE,
        props: {
            shape: 'circle',
            backgroundColor: '#007bff',
            borderRadius: '50%',
            border: 'none'
        },
        style: {
            width: '60px',
            height: '60px'
        }
    },
    [ComponentTypes.GROUP]: {
        type: ComponentTypes.GROUP,
        props: {
            backgroundColor: 'rgba(0, 123, 255, 0.05)',
            border: '1px dashed #007bff',
            borderRadius: '6px',
            padding: '15px'
        },
        style: {
            width: '150px',
            height: '100px'
        }
    },
    [ComponentTypes.LIST]: {
        type: ComponentTypes.LIST,
        props: {
            items: ['Item 1', 'Item 2', 'Item 3'],
            backgroundColor: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '10px'
        },
        style: {
            width: '150px',
            height: '120px'
        }
    }
};

// Component renderer functions
const ComponentRenderers = {
    [ComponentTypes.TEXT]: (component) => {
        const element = document.createElement('div');
        element.className = 'component-text';
        element.textContent = component.props.text;
        element.style.fontSize = component.props.fontSize;
        element.style.color = component.props.color;
        element.style.fontWeight = component.props.fontWeight;
        element.style.textAlign = component.props.textAlign;
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.padding = component.props.padding;
        element.style.borderRadius = component.props.borderRadius;
        return element;
    },
    
    [ComponentTypes.BUTTON]: (component) => {
        const element = document.createElement('button');
        element.className = 'component-button';
        element.textContent = component.props.text;
        element.style.fontSize = component.props.fontSize;
        element.style.color = component.props.color;
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.borderRadius = component.props.borderRadius;
        element.style.padding = component.props.padding;
        element.style.fontWeight = component.props.fontWeight;
        element.style.border = component.props.border;
        return element;
    },
    
    [ComponentTypes.ICON]: (component) => {
        const element = document.createElement('i');
        element.className = `component-icon ${component.props.icon}`;
        element.style.fontSize = component.props.fontSize;
        element.style.color = component.props.color;
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.padding = component.props.padding;
        element.style.borderRadius = component.props.borderRadius;
        return element;
    },
    
    [ComponentTypes.IMAGE]: (component) => {
        const element = document.createElement('div');
        element.className = 'component-image';
        
        if (component.props.src) {
            const img = document.createElement('img');
            img.src = component.props.src;
            img.alt = component.props.alt;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = component.props.borderRadius;
            element.appendChild(img);
        } else {
            element.innerHTML = '<i class="fas fa-image"></i><br>No Image';
        }
        
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.border = component.props.border;
        element.style.borderRadius = component.props.borderRadius;
        return element;
    },
    
    [ComponentTypes.SHAPE]: (component) => {
        const element = document.createElement('div');
        element.className = 'component-shape';
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.borderRadius = component.props.borderRadius;
        element.style.border = component.props.border;
        
        if (component.props.shape === 'square') {
            element.style.borderRadius = '6px';
        } else if (component.props.shape === 'rectangle') {
            element.style.borderRadius = '6px';
        }
        
        return element;
    },
    
    [ComponentTypes.GROUP]: (component) => {
        const element = document.createElement('div');
        element.className = 'component-group';
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.border = component.props.border;
        element.style.borderRadius = component.props.borderRadius;
        element.style.padding = component.props.padding;
        
        // Add placeholder text
        const placeholder = document.createElement('div');
        placeholder.style.color = '#6c757d';
        placeholder.style.fontSize = '12px';
        placeholder.style.textAlign = 'center';
        placeholder.style.opacity = '0.7';
        placeholder.textContent = 'Group Container';
        element.appendChild(placeholder);
        
        return element;
    },
    
    [ComponentTypes.LIST]: (component) => {
        const element = document.createElement('div');
        element.className = 'component-list';
        element.style.backgroundColor = component.props.backgroundColor;
        element.style.border = component.props.border;
        element.style.borderRadius = component.props.borderRadius;
        element.style.padding = component.props.padding;
        
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        list.style.margin = '0';
        list.style.padding = '0';
        
        component.props.items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.style.padding = '5px 0';
            listItem.style.borderBottom = '1px solid #f1f1f1';
            listItem.style.fontSize = '14px';
            listItem.textContent = item;
            list.appendChild(listItem);
        });
        
        element.appendChild(list);
        return element;
    }
};

// Property panel generators
const PropertyPanels = {
    [ComponentTypes.TEXT]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Text Content</label>
                <textarea id="prop-text" rows="2">${component.props.text}</textarea>
            </div>
            <div class="property-group">
                <label>Font Size</label>
                <input type="text" id="prop-fontSize" value="${component.props.fontSize}">
            </div>
            <div class="property-group">
                <label>Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-color" value="${component.props.color}">
                    <input type="text" id="prop-color-text" value="${component.props.color}">
                </div>
            </div>
            <div class="property-group">
                <label>Font Weight</label>
                <select id="prop-fontWeight">
                    <option value="normal" ${component.props.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
                    <option value="bold" ${component.props.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
                    <option value="500" ${component.props.fontWeight === '500' ? 'selected' : ''}>Medium</option>
                    <option value="300" ${component.props.fontWeight === '300' ? 'selected' : ''}>Light</option>
                </select>
            </div>
            <div class="property-group">
                <label>Text Align</label>
                <select id="prop-textAlign">
                    <option value="left" ${component.props.textAlign === 'left' ? 'selected' : ''}>Left</option>
                    <option value="center" ${component.props.textAlign === 'center' ? 'selected' : ''}>Center</option>
                    <option value="right" ${component.props.textAlign === 'right' ? 'selected' : ''}>Right</option>
                </select>
            </div>
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor === 'transparent' ? '#ffffff' : component.props.backgroundColor}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
        `;
    },
    
    [ComponentTypes.BUTTON]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Button Text</label>
                <input type="text" id="prop-text" value="${component.props.text}">
            </div>
            <div class="property-group">
                <label>Font Size</label>
                <input type="text" id="prop-fontSize" value="${component.props.fontSize}">
            </div>
            <div class="property-group">
                <label>Text Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-color" value="${component.props.color}">
                    <input type="text" id="prop-color-text" value="${component.props.color}">
                </div>
            </div>
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Border Radius</label>
                <input type="text" id="prop-borderRadius" value="${component.props.borderRadius}">
            </div>
        `;
    },
    
    [ComponentTypes.ICON]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Icon Class</label>
                <input type="text" id="prop-icon" value="${component.props.icon}" placeholder="e.g., fas fa-star">
            </div>
            <div class="property-group">
                <label>Font Size</label>
                <input type="text" id="prop-fontSize" value="${component.props.fontSize}">
            </div>
            <div class="property-group">
                <label>Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-color" value="${component.props.color}">
                    <input type="text" id="prop-color-text" value="${component.props.color}">
                </div>
            </div>
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor === 'transparent' ? '#ffffff' : component.props.backgroundColor}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
        `;
    },
    
    [ComponentTypes.IMAGE]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Image URL</label>
                <input type="text" id="prop-src" value="${component.props.src}" placeholder="https://example.com/image.jpg">
            </div>
            <div class="property-group">
                <label>Alt Text</label>
                <input type="text" id="prop-alt" value="${component.props.alt}">
            </div>
            <div class="property-group">
                <label>Border Radius</label>
                <input type="text" id="prop-borderRadius" value="${component.props.borderRadius}">
            </div>
        `;
    },
    
    [ComponentTypes.SHAPE]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Shape Type</label>
                <select id="prop-shape">
                    <option value="circle" ${component.props.shape === 'circle' ? 'selected' : ''}>Circle</option>
                    <option value="square" ${component.props.shape === 'square' ? 'selected' : ''}>Square</option>
                    <option value="rectangle" ${component.props.shape === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                </select>
            </div>
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Border</label>
                <input type="text" id="prop-border" value="${component.props.border}" placeholder="1px solid #ccc">
            </div>
        `;
    },
    
    [ComponentTypes.GROUP]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor.replace('rgba(0, 123, 255, 0.05)', '#f8f9ff')}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Border</label>
                <input type="text" id="prop-border" value="${component.props.border}">
            </div>
            <div class="property-group">
                <label>Border Radius</label>
                <input type="text" id="prop-borderRadius" value="${component.props.borderRadius}">
            </div>
            <div class="property-group">
                <label>Padding</label>
                <input type="text" id="prop-padding" value="${component.props.padding}">
            </div>
        `;
    },
    
    [ComponentTypes.LIST]: (component, updateCallback) => {
        return `
            <div class="property-group">
                <label>List Items (one per line)</label>
                <textarea id="prop-items" rows="4">${component.props.items.join('\n')}</textarea>
            </div>
            <div class="property-group">
                <label>Background Color</label>
                <div class="color-picker">
                    <input type="color" id="prop-backgroundColor" value="${component.props.backgroundColor}">
                    <input type="text" id="prop-backgroundColor-text" value="${component.props.backgroundColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Border</label>
                <input type="text" id="prop-border" value="${component.props.border}">
            </div>
        `;
    }
};

// Utility functions
function createComponent(type, position = { x: 50, y: 50 }) {
    const template = ComponentTemplates[type];
    if (!template) return null;
    
    const component = {
        id: generateId(),
        type: type,
        props: { ...template.props },
        style: { ...template.style },
        position: { ...position }
    };
    
    return component;
}

function generateId() {
    return 'comp_' + Math.random().toString(36).substr(2, 9);
}

function cloneComponent(component) {
    return {
        ...component,
        id: generateId(),
        props: { ...component.props },
        style: { ...component.style },
        position: { ...component.position }
    };
}

// Export for global use
window.ComponentTypes = ComponentTypes;
window.ComponentTemplates = ComponentTemplates;
window.ComponentRenderers = ComponentRenderers;
window.PropertyPanels = PropertyPanels;
window.createComponent = createComponent;
window.generateId = generateId;
window.cloneComponent = cloneComponent;
