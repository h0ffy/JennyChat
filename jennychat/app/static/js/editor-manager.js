import { marked } from 'marked';

export class EditorManager {
    constructor() {
        this.currentMarkdownFile = null;
        this.currentCodeFile = null;
        this.codeEditor = null;
        this.markdownFiles = {
            'README.md': '# README\n\nThis is a sample markdown file.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3',
            'notes.md': '# Notes\n\nThis is where you can write your notes.\n\n## Today\n\n- Task 1\n- Task 2',
            'todo.md': '# TODO\n\n- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task'
        };
        this.codeFiles = {
            'app.js': 'console.log("Hello, World!");\n\nfunction greet(name) {\n    return `Hello, ${name}!`;\n}\n\n// Add your JavaScript code here\nconst data = {\n    name: "JennyLab",\n    version: "1.0.0"\n};\n\ngreet(data.name);',
            'api.py': 'from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get("/")\ndef read_root():\n    return {"Hello": "World"}\n\n@app.get("/items/{item_id}")\ndef read_item(item_id: int, q: str = None):\n    return {"item_id": item_id, "q": q}',
            'styles.css': 'body {\n    margin: 0;\n    padding: 0;\n    font-family: Arial, sans-serif;\n    background-color: #1a1a2e;\n}\n\n.container {\n    max-width: 1200px;\n    margin: 0 auto;\n    padding: 20px;\n}\n\n.card {\n    background-color: rgba(51, 51, 77, 0.85);\n    border-radius: 10px;\n    padding: 20px;\n}',
            'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>JennyLab</title>\n    <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n    <div class="container">\n        <h1>Hello, World!</h1>\n        <p>Welcome to JennyLab AI Chat</p>\n    </div>\n    <script src="app.js"></script>\n</body>\n</html>'
        };
        this.setupEditors();
    }

    async setupEditors() {
        await this.setupMarkdownEditor();
        await this.setupCodeEditor();
    }

    async setupMarkdownEditor() {
        const markdownEditor = document.getElementById('markdownEditorArea');
        const markdownPreview = document.getElementById('markdownPreviewArea');
        const livePreviewToggle = document.getElementById('livePreviewToggle');

        if (markdownEditor && markdownPreview) {
            markdownEditor.addEventListener('input', () => {
                if (livePreviewToggle.checked) {
                    this.updateMarkdownPreview();
                }
            });

            livePreviewToggle.addEventListener('change', () => {
                if (livePreviewToggle.checked) {
                    this.updateMarkdownPreview();
                }
            });

            // Setup subtab switching
            const subtabButtons = document.querySelectorAll('[data-subtab]');
            subtabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    if (button.dataset.subtab === 'markdown-preview') {
                        this.updateMarkdownPreview();
                    }
                });
            });
        }

        // Load default file
        this.selectMarkdownFile(document.querySelector('#markdownFileList li'));
    }

    updateMarkdownPreview() {
        const markdownEditor = document.getElementById('markdownEditorArea');
        const markdownPreview = document.getElementById('markdownPreviewArea');
        
        if (markdownEditor && markdownPreview) {
            const content = markdownEditor.value;
            markdownPreview.innerHTML = marked(content);
        }
    }

    selectMarkdownFile(element) {
        if (!element) return;
        
        document.querySelectorAll('#markdownFileList .selected-file').forEach(el => 
            el.classList.remove('selected-file')
        );
        
        element.classList.add('selected-file');
        
        const filename = element.dataset.file;
        this.currentMarkdownFile = filename;
        
        const editor = document.getElementById('markdownEditorArea');
        const title = document.getElementById('markdownEditorTitle');
        
        if (editor && this.markdownFiles[filename]) {
            editor.value = this.markdownFiles[filename];
            title.textContent = `Markdown Editor - ${filename}`;
            this.updateMarkdownPreview();
        }
    }

    async setupCodeEditor() {
        try {
            // Import CodeMirror modules
            const { EditorView, keymap, highlightSpecialChars, drawSelection, highlightSelectionMatches } = await import('codemirror/view');
            const { EditorState } = await import('codemirror/state');
            const { javascript } = await import('codemirror/lang-javascript');
            const { python } = await import('codemirror/lang-python');
            const { css } = await import('codemirror/lang-css');
            const { html } = await import('codemirror/lang-html');
            const { oneDark } = await import('codemirror/theme-one-dark');
            const { defaultKeymap, history, historyKeymap } = await import('codemirror/commands');
            const { searchKeymap } = await import('codemirror/search');

            const codeEditorContainer = document.getElementById('codeEditorContainer');
            if (!codeEditorContainer) {
                console.error('Code editor container not found');
                return;
            }

            // Clear any existing editor
            codeEditorContainer.innerHTML = '';

            // Create the editor state
            const startState = EditorState.create({
                doc: this.codeFiles['app.js'],
                extensions: [
                    highlightSpecialChars(),
                    history(),
                    drawSelection(),
                    javascript(),
                    oneDark,
                    keymap.of([
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                    ]),
                    EditorView.theme({
                        '&': {
                            height: '100%',
                            fontSize: '14px',
                            backgroundColor: '#282c34',
                        },
                        '.cm-content': {
                            fontFamily: 'Courier New, Courier, monospace',
                            padding: '10px',
                            minHeight: '400px',
                        },
                        '.cm-focused': {
                            outline: 'none',
                        },
                        '.cm-editor': {
                            height: '100%',
                        },
                        '.cm-scroller': {
                            height: '100%',
                        }
                    }),
                    EditorView.lineWrapping
                ]
            });

            // Create the editor view
            this.codeEditor = new EditorView({
                state: startState,
                parent: codeEditorContainer
            });

            // Set current file and update title
            this.currentCodeFile = 'app.js';
            const title = document.getElementById('codeEditorTitle');
            if (title) {
                title.textContent = `Code Editor - app.js`;
            }

            // Setup event listeners for editor controls
            this.setupCodeEditorControls();

            // Load default file selection
            const defaultFile = document.querySelector('#codeFileList li[data-file="app.js"]');
            if (defaultFile) {
                this.selectCodeFile(defaultFile);
            }

            console.log('Code editor setup complete');
        } catch (error) {
            console.error('Error setting up code editor:', error);
            this.fallbackCodeEditor();
        }
    }

    setupCodeEditorControls() {
        const wordWrapToggle = document.getElementById('wordWrapToggle');
        const formatCodeButton = document.getElementById('formatCodeButton');
        const saveCodeButton = document.getElementById('saveCodeButton');

        if (wordWrapToggle) {
            wordWrapToggle.addEventListener('change', () => {
                // Word wrap is handled by EditorView.lineWrapping extension
                console.log('Word wrap toggled:', wordWrapToggle.checked);
            });
        }

        if (formatCodeButton) {
            formatCodeButton.addEventListener('click', () => {
                this.formatCode();
            });
        }

        if (saveCodeButton) {
            saveCodeButton.addEventListener('click', () => {
                this.saveCurrentCodeFile();
            });
        }
    }

    formatCode() {
        if (!this.codeEditor) return;
        
        const content = this.codeEditor.state.doc.toString();
        // Basic formatting for demonstration
        const formatted = this.basicFormatCode(content);
        
        this.codeEditor.dispatch({
            changes: {
                from: 0,
                to: this.codeEditor.state.doc.length,
                insert: formatted
            }
        });
    }

    basicFormatCode(code) {
        // Simple code formatting - in production, use a proper formatter
        return code
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    }

    saveCurrentCodeFile() {
        if (!this.codeEditor || !this.currentCodeFile) return;
        
        const content = this.codeEditor.state.doc.toString();
        this.codeFiles[this.currentCodeFile] = content;
        
        // Show save notification
        this.showNotification('Code saved successfully!', 'success');
    }

    fallbackCodeEditor() {
        console.log('Setting up fallback code editor');
        const codeEditorContainer = document.getElementById('codeEditorContainer');
        if (!codeEditorContainer) return;

        codeEditorContainer.innerHTML = `
            <textarea id="fallbackCodeEditor" style="
                width: 100%;
                height: 100%;
                background-color: #282c34;
                color: #abb2bf;
                font-family: 'Courier New', Courier, monospace;
                font-size: 14px;
                border: none;
                outline: none;
                padding: 10px;
                resize: none;
                line-height: 1.5;
            ">${this.codeFiles['app.js']}</textarea>
        `;

        const fallbackEditor = document.getElementById('fallbackCodeEditor');
        if (fallbackEditor) {
            fallbackEditor.addEventListener('input', () => {
                if (this.currentCodeFile) {
                    this.codeFiles[this.currentCodeFile] = fallbackEditor.value;
                }
            });
        }
    }

    async selectCodeFile(element) {
        if (!element) return;
        
        document.querySelectorAll('#codeFileList .selected-file').forEach(el => 
            el.classList.remove('selected-file')
        );
        
        element.classList.add('selected-file');
        
        const filename = element.dataset.file;
        const filetype = element.dataset.type;
        this.currentCodeFile = filename;
        
        const title = document.getElementById('codeEditorTitle');
        if (title) {
            title.textContent = `Code Editor - ${filename}`;
        }
        
        if (this.codeEditor && this.codeFiles[filename]) {
            // Update editor content
            this.codeEditor.dispatch({
                changes: {
                    from: 0,
                    to: this.codeEditor.state.doc.length,
                    insert: this.codeFiles[filename]
                }
            });
            
            // Update language support
            await this.updateCodeLanguage(filetype);
        } else {
            // Handle fallback editor
            const fallbackEditor = document.getElementById('fallbackCodeEditor');
            if (fallbackEditor && this.codeFiles[filename]) {
                fallbackEditor.value = this.codeFiles[filename];
            }
        }
    }

    async updateCodeLanguage(filetype) {
        if (!this.codeEditor) return;
        
        try {
            const { EditorState } = await import('codemirror/state');
            const { EditorView, keymap, highlightSpecialChars, drawSelection, highlightSelectionMatches } = await import('codemirror/view');
            const { javascript } = await import('codemirror/lang-javascript');
            const { python } = await import('codemirror/lang-python');
            const { css } = await import('codemirror/lang-css');
            const { html } = await import('codemirror/lang-html');
            const { oneDark } = await import('codemirror/theme-one-dark');
            const { defaultKeymap, history, historyKeymap } = await import('codemirror/commands');
            const { searchKeymap } = await import('codemirror/search');

            let language;
            switch (filetype) {
                case 'javascript':
                    language = javascript();
                    break;
                case 'python':
                    language = python();
                    break;
                case 'css':
                    language = css();
                    break;
                case 'html':
                    language = html();
                    break;
                default:
                    language = javascript();
            }

            const currentContent = this.codeEditor.state.doc.toString();
            
            const newState = EditorState.create({
                doc: currentContent,
                extensions: [
                    highlightSpecialChars(),
                    history(),
                    drawSelection(),
                    highlightSelectionMatches(),
                    language,
                    oneDark,
                    keymap.of([
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                    ]),
                    EditorView.theme({
                        '&': {
                            height: '100%',
                            fontSize: '14px',
                            backgroundColor: '#282c34',
                        },
                        '.cm-content': {
                            fontFamily: 'Courier New, Courier, monospace',
                            padding: '10px',
                            minHeight: '400px',
                        },
                        '.cm-focused': {
                            outline: 'none',
                        },
                        '.cm-editor': {
                            height: '100%',
                        },
                        '.cm-scroller': {
                            height: '100%',
                        }
                    }),
                    EditorView.lineWrapping
                ]
            });

            this.codeEditor.setState(newState);
        } catch (error) {
            console.error('Error updating code language:', error);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-family: 'Courier New', Courier, monospace;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background-color: rgba(81, 207, 102, 0.9);' : ''}
            ${type === 'error' ? 'background-color: rgba(255, 107, 107, 0.9);' : ''}
            ${type === 'info' ? 'background-color: rgba(172, 139, 255, 0.9);' : ''}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}