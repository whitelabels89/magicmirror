// Main Application Class
class MobileAppBuilder {
    constructor() {
        this.components = [];
        this.selectedComponent = null;
        this.draggedComponent = null;
        this.isBuilderVisible = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadAutoSave();
    }
    
    bindEvents() {
        // Toggle builder visibility
        document.getElementById('toggle-builder').addEventListener('click', () => {
            this.toggleBuilder();
        });
        
        document.getElementById('close-builder').addEventListener('click', () => {
            this.hideBuilder();
        });
        
        // Component drag events
        document.querySelectorAll('.component-item').forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // Drop zone events
        const dropZone = document.getElementById('mobile-canvas');
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        dropZone.addEventListener('dragenter', this.handleDragEnter.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        
        // Canvas click events
        dropZone.addEventListener('click', this.handleCanvasClick.bind(this));
        
        // Project management
        document.getElementById('save-project').addEventListener('click', () => {
            this.showSaveModal();
        });
        
        document.getElementById('load-project').addEventListener('click', () => {
            this.showLoadModal();
        });
        
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.clearCanvas();
        });
        
        // Modal events
        document.getElementById('save-confirm').addEventListener('click', () => {
            this.saveProject();
        });
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Sidebar toggle
        document.getElementById('toggle-sidebar').addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Auto-save
        setInterval(() => {
            this.autoSave();
        }, 30000); // Auto-save every 30 seconds
    }
    
    toggleBuilder() {
        this.isBuilderVisible = !this.isBuilderVisible;
        const builderInterface = document.getElementById('builder-interface');
        const toggleButton = document.getElementById('toggle-builder');
        
        if (this.isBuilderVisible) {
            builderInterface.classList.remove('hidden');
            toggleButton.style.display = 'none';
        } else {
            builderInterface.classList.add('hidden');
            toggleButton.style.display = 'flex';
        }
    }
    
    hideBuilder() {
        this.isBuilderVisible = false;
        document.getElementById('builder-interface').classList.add('hidden');
        document.getElementById('toggle-builder').style.display = 'flex';
    }
    
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const icon = document.querySelector('.toggle-sidebar i');
        
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-right');
        } else {
            icon.classList.remove('fa-chevron-right');
            icon.classList.add('fa-chevron-left');
        }
    }
    
    handleDragStart(e) {
        const componentType = e.target.dataset.component;
        this.draggedComponent = componentType;
        e.dataTransfer.setData('text/plain', componentType);
        e.dataTransfer.effectAllowed = 'copy';
    }
    
    handleDragEnd(e) {
        this.draggedComponent = null;
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    handleDragEnter(e) {
        e.preventDefault();
        const dropZone = document.querySelector('.drop-zone');
        dropZone.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            const dropZone = document.querySelector('.drop-zone');
            dropZone.classList.remove('drag-over');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        const dropZone = document.querySelector('.drop-zone');
        dropZone.classList.remove('drag-over');
        
        const componentType = e.dataTransfer.getData('text/plain');
        if (!componentType) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const position = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.addComponent(componentType, position);
    }
    
    handleCanvasClick(e) {
        if (e.target.classList.contains('dropped-component') || 
            e.target.closest('.dropped-component')) {
            const componentElement = e.target.closest('.dropped-component') || e.target;
            const componentId = componentElement.dataset.componentId;
            this.selectComponent(componentId);
        } else {
            this.deselectComponent();
        }
    }
    
    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedComponent) {
            this.deleteComponent(this.selectedComponent.id);
        }
        
        if (e.key === 'Escape') {
            this.deselectComponent();
        }
        
        // Copy/Paste (Ctrl+C, Ctrl+V)
        if (e.ctrlKey && e.key === 'c' && this.selectedComponent) {
            this.copyComponent();
        }
        
        if (e.ctrlKey && e.key === 'v' && this.copiedComponent) {
            this.pasteComponent();
        }
    }
    
    addComponent(type, position) {
        const component = createComponent(type, position);
        if (!component) return;
        
        this.components.push(component);
        this.renderComponent(component);
        this.selectComponent(component.id);
        this.hideDropMessage();
    }
    
    renderComponent(component) {
        const canvas = document.getElementById('mobile-canvas');
        const dropZone = canvas.querySelector('.drop-zone');
        
        // Create wrapper element
        const wrapper = document.createElement('div');
        wrapper.className = 'dropped-component';
        wrapper.dataset.componentId = component.id;
        wrapper.style.left = component.position.x + 'px';
        wrapper.style.top = component.position.y + 'px';
        wrapper.style.width = component.style.width;
        wrapper.style.height = component.style.height;
        
        // Render component content
        const renderer = ComponentRenderers[component.type];
        if (renderer) {
            const content = renderer(component);
            wrapper.appendChild(content);
        }
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        wrapper.appendChild(resizeHandle);
        
        // Add drag functionality
        this.makeDraggable(wrapper);
        this.makeResizable(wrapper);
        
        dropZone.appendChild(wrapper);
    }
    
    makeDraggable(element) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            const rect = element.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const canvas = document.getElementById('mobile-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            const x = e.clientX - canvasRect.left - dragOffset.x;
            const y = e.clientY - canvasRect.top - dragOffset.y;
            
            element.style.left = Math.max(0, Math.min(x, canvasRect.width - element.offsetWidth)) + 'px';
            element.style.top = Math.max(0, Math.min(y, canvasRect.height - element.offsetHeight)) + 'px';
            
            // Update component position
            const componentId = element.dataset.componentId;
            const component = this.components.find(c => c.id === componentId);
            if (component) {
                component.position.x = parseInt(element.style.left);
                component.position.y = parseInt(element.style.top);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'move';
        });
    }
    
    makeResizable(element) {
        const resizeHandle = element.querySelector('.resize-handle');
        let isResizing = false;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            e.stopPropagation();
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const rect = element.getBoundingClientRect();
            const width = e.clientX - rect.left;
            const height = e.clientY - rect.top;
            
            if (width > 20 && height > 20) {
                element.style.width = width + 'px';
                element.style.height = height + 'px';
                
                // Update component dimensions
                const componentId = element.dataset.componentId;
                const component = this.components.find(c => c.id === componentId);
                if (component) {
                    component.style.width = width + 'px';
                    component.style.height = height + 'px';
                }
            }
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }
    
    selectComponent(componentId) {
        // Remove previous selection
        document.querySelectorAll('.dropped-component.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Select new component
        const element = document.querySelector(`[data-component-id="${componentId}"]`);
        if (element) {
            element.classList.add('selected');
            this.selectedComponent = this.components.find(c => c.id === componentId);
            this.showPropertiesPanel();
        }
    }
    
    deselectComponent() {
        document.querySelectorAll('.dropped-component.selected').forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedComponent = null;
        this.hidePropertiesPanel();
    }
    
    deleteComponent(componentId) {
        // Remove from components array
        this.components = this.components.filter(c => c.id !== componentId);
        
        // Remove from DOM
        const element = document.querySelector(`[data-component-id="${componentId}"]`);
        if (element) {
            element.remove();
        }
        
        this.deselectComponent();
        this.showDropMessageIfEmpty();
    }
    
    showPropertiesPanel() {
        if (!this.selectedComponent) return;
        
        const propertiesContent = document.getElementById('properties-content');
        const panelGenerator = PropertyPanels[this.selectedComponent.type];
        
        if (panelGenerator) {
            propertiesContent.innerHTML = panelGenerator(this.selectedComponent, this.updateComponentProperty.bind(this));
            this.bindPropertyEvents();
        }
    }
    
    hidePropertiesPanel() {
        const propertiesContent = document.getElementById('properties-content');
        propertiesContent.innerHTML = `
            <div class="no-selection">
                <i class="fas fa-mouse-pointer"></i>
                <p>Select a component to edit its properties</p>
            </div>
        `;
    }
    
    bindPropertyEvents() {
        const propertiesContent = document.getElementById('properties-content');
        
        propertiesContent.addEventListener('input', (e) => {
            this.updateComponentProperty(e.target.id, e.target.value);
        });
        
        propertiesContent.addEventListener('change', (e) => {
            this.updateComponentProperty(e.target.id, e.target.value);
        });
        
        // Color picker synchronization
        const colorInputs = propertiesContent.querySelectorAll('input[type="color"]');
        colorInputs.forEach(input => {
            const textInput = propertiesContent.querySelector(`#${input.id}-text`);
            if (textInput) {
                input.addEventListener('input', () => {
                    textInput.value = input.value;
                    this.updateComponentProperty(input.id, input.value);
                });
                
                textInput.addEventListener('input', () => {
                    input.value = textInput.value;
                    this.updateComponentProperty(input.id, textInput.value);
                });
            }
        });
    }
    
    updateComponentProperty(propertyId, value) {
        if (!this.selectedComponent) return;
        
        const property = propertyId.replace('prop-', '');
        
        // Special handling for list items
        if (property === 'items' && this.selectedComponent.type === ComponentTypes.LIST) {
            this.selectedComponent.props[property] = value.split('\n').filter(item => item.trim());
        } else {
            this.selectedComponent.props[property] = value;
        }
        
        // Re-render the component
        this.rerenderComponent(this.selectedComponent);
    }
    
    rerenderComponent(component) {
        const element = document.querySelector(`[data-component-id="${component.id}"]`);
        if (!element) return;
        
        // Remove old content (keep wrapper and resize handle)
        const existingContent = element.querySelector(':not(.resize-handle)');
        if (existingContent) {
            existingContent.remove();
        }
        
        // Render new content
        const renderer = ComponentRenderers[component.type];
        if (renderer) {
            const content = renderer(component);
            element.insertBefore(content, element.querySelector('.resize-handle'));
        }
    }
    
    copyComponent() {
        if (this.selectedComponent) {
            this.copiedComponent = cloneComponent(this.selectedComponent);
        }
    }
    
    pasteComponent() {
        if (this.copiedComponent) {
            const newComponent = cloneComponent(this.copiedComponent);
            newComponent.position.x += 20;
            newComponent.position.y += 20;
            
            this.components.push(newComponent);
            this.renderComponent(newComponent);
            this.selectComponent(newComponent.id);
        }
    }
    
    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            this.components = [];
            const canvas = document.getElementById('mobile-canvas');
            const dropZone = canvas.querySelector('.drop-zone');
            
            // Remove all components
            dropZone.querySelectorAll('.dropped-component').forEach(el => el.remove());
            
            this.deselectComponent();
            this.showDropMessage();
        }
    }
    
    showDropMessage() {
        const dropZone = document.querySelector('.drop-zone');
        const dropMessage = dropZone.querySelector('.drop-message');
        if (dropMessage) {
            dropMessage.style.display = 'block';
        }
    }
    
    hideDropMessage() {
        const dropZone = document.querySelector('.drop-zone');
        const dropMessage = dropZone.querySelector('.drop-message');
        if (dropMessage) {
            dropMessage.style.display = 'none';
        }
    }
    
    showDropMessageIfEmpty() {
        if (this.components.length === 0) {
            this.showDropMessage();
        }
    }
    
    // Project Management
    showSaveModal() {
        const modal = document.getElementById('project-modal');
        const modalTitle = document.getElementById('modal-title');
        const saveForm = document.getElementById('save-form');
        const loadForm = document.getElementById('load-form');
        
        modalTitle.textContent = 'Save Project';
        saveForm.style.display = 'block';
        loadForm.style.display = 'none';
        
        document.getElementById('project-name').value = '';
        modal.classList.add('active');
    }
    
    showLoadModal() {
        const modal = document.getElementById('project-modal');
        const modalTitle = document.getElementById('modal-title');
        const saveForm = document.getElementById('save-form');
        const loadForm = document.getElementById('load-form');
        
        modalTitle.textContent = 'Load Project';
        saveForm.style.display = 'none';
        loadForm.style.display = 'block';
        
        this.populateProjectList();
        modal.classList.add('active');
    }
    
    hideModal() {
        const modal = document.getElementById('project-modal');
        modal.classList.remove('active');
    }
    
    saveProject() {
        const projectName = document.getElementById('project-name').value.trim();
        if (!projectName) {
            alert('Please enter a project name');
            return;
        }
        
        const projectData = {
            name: projectName,
            components: this.components,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage
        const savedProjects = JSON.parse(localStorage.getItem('appBuilderProjects') || '[]');
        const existingIndex = savedProjects.findIndex(p => p.name === projectName);
        
        if (existingIndex >= 0) {
            if (confirm('A project with this name already exists. Do you want to overwrite it?')) {
                savedProjects[existingIndex] = projectData;
            } else {
                return;
            }
        } else {
            savedProjects.push(projectData);
        }
        
        localStorage.setItem('appBuilderProjects', JSON.stringify(savedProjects));
        
        this.hideModal();
        alert('Project saved successfully!');
    }
    
    loadProject(projectName) {
        const savedProjects = JSON.parse(localStorage.getItem('appBuilderProjects') || '[]');
        const project = savedProjects.find(p => p.name === projectName);
        
        if (!project) {
            alert('Project not found');
            return;
        }
        
        // Clear current canvas
        this.clearCanvas();
        
        // Load components
        this.components = project.components || [];
        
        // Render all components
        this.components.forEach(component => {
            this.renderComponent(component);
        });
        
        this.hideDropMessageIfEmpty();
        this.hideModal();
        alert('Project loaded successfully!');
    }
    
    populateProjectList() {
        const projectList = document.getElementById('project-list');
        const savedProjects = JSON.parse(localStorage.getItem('appBuilderProjects') || '[]');
        
        if (savedProjects.length === 0) {
            projectList.innerHTML = '<p>No saved projects found.</p>';
            return;
        }
        
        projectList.innerHTML = savedProjects.map(project => `
            <div class="project-item" onclick="appBuilder.loadProject('${project.name}')">
                <h4>${project.name}</h4>
                <p>Saved: ${new Date(project.timestamp).toLocaleString()}</p>
                <p>Components: ${project.components.length}</p>
            </div>
        `).join('');
    }
    
    hideDropMessageIfEmpty() {
        if (this.components.length > 0) {
            this.hideDropMessage();
        }
    }
    
    // Auto-save functionality
    autoSave() {
        if (this.components.length > 0) {
            const autoSaveData = {
                components: this.components,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('appBuilderAutoSave', JSON.stringify(autoSaveData));
        }
    }
    
    loadAutoSave() {
        const autoSaveData = JSON.parse(localStorage.getItem('appBuilderAutoSave') || 'null');
        if (autoSaveData && autoSaveData.components.length > 0) {
            // Ask user if they want to restore auto-saved data
            if (confirm('Auto-saved data found. Do you want to restore it?')) {
                this.components = autoSaveData.components;
                this.components.forEach(component => {
                    this.renderComponent(component);
                });
                this.hideDropMessageIfEmpty();
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all scripts are loaded
    setTimeout(() => {
        // Ensure all dependencies are available
        if (typeof ComponentTypes === 'undefined' || typeof createComponent === 'undefined') {
            console.error('Component dependencies not loaded');
            return;
        }
        
        window.appBuilder = new MobileAppBuilder();
        console.log('Mobile App Builder initialized');
    }, 100);
});
