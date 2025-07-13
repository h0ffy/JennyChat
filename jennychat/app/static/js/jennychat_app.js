import 'htmx.org';
import { ChatManager } from './chat-manager.js';
import { EditorManager } from './editor-manager.js';
import { UIManager } from './ui-manager.js';
import { CollaborativeManager } from './collaborative-manager.js';
import { setupGlobalFunctions } from './global-functions.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    const chatManager = new ChatManager();
    const editorManager = new EditorManager();
    const collaborativeManager = new CollaborativeManager();
    
    // Setup global functions
    setupGlobalFunctions(editorManager);
    
    // Store references globally for debugging
    window.chatManager = chatManager;
    window.editorManager = editorManager;
    window.uiManager = uiManager;
    window.collaborativeManager = collaborativeManager;
});