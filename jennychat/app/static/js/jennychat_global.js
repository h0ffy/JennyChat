// Global functions for file selection
export function setupGlobalFunctions(editorManager) {
    window.selectMarkdownFile = function(element) {
        if (editorManager) {
            editorManager.selectMarkdownFile(element);
        }
    };

    window.selectCodeFile = function(element) {
        if (editorManager) {
            editorManager.selectCodeFile(element);
        }
    };

    window.toggleChatFolder = function(element) {
        const subList = element.nextElementSibling;
        if (subList && subList.tagName === 'UL') {
            subList.style.display = subList.style.display === 'none' ? 'block' : 'none';
            element.textContent = (subList.style.display === 'none' ? '📂 ' : '📁 ') + element.textContent.substring(2);
        }
    };
}

