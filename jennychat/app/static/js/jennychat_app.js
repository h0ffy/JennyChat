import 'htmx.org';
import { ChatManager } from './js/jennychat_manager.js';
import { EditorManager } from './js/jennychat_editor.js';
import { UIManager } from './js/jennychat_ui.js';
import { setupGlobalFunctions } from './js/jennychat_global.js';

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
