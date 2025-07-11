import 'htmx.org';
import { ChatManager } from './js/chat-manager.js';
import { EditorManager } from './js/editor-manager.js';
import { UIManager } from './js/ui-manager.js';
import { setupGlobalFunctions } from './js/global-functions.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    const chatManager = new ChatManager();
    const editorManager = new EditorManager();
    
    // Setup global functions
    setupGlobalFunctions(editorManager);
    
    // Store references globally for debugging
    window.chatManager = chatManager;
    window.editorManager = editorManager;
    window.uiManager = uiManager;
});
