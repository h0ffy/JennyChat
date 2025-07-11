import { marked } from 'marked';

export class ChatManager {
    constructor() {
        this.apiBase = '/api';
        this.currentChatId = null;
        this.isStreaming = false;
        this.initializeElements();
        this.setupEventListeners();
        this.loadModels();
    }

    initializeElements() {
        this.elements = {
            chatList: document.getElementById('chatListContainer'),
            chatTitle: document.getElementById('chatInterfaceTitle'),
            chatMessages: document.getElementById('chatMessages'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            voiceButton: document.getElementById('voiceButton'),
            modelSelect: document.getElementById('modelSelect'),
            streamToggle: document.getElementById('streamToggle'),
            clearButton: document.getElementById('clearChatButton'),
            saveButton: document.getElementById('saveChatButton'),
            newChatButton: document.getElementById('newChatButton'),
            newChatActionBtn: document.getElementById('newChatActionBtn'),
            exportBtn: document.getElementById('exportChatActionBtn'),
            importBtn: document.getElementById('importChatActionBtn'),
            searchBtn: document.getElementById('searchChatActionBtn'),
            deleteBtn: document.getElementById('deleteChatActionBtn')
        };
    }

    setupEventListeners() {
        // Chat controls
        this.elements.sendButton?.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Chat management
        this.elements.newChatButton?.addEventListener('click', () => this.createNewChat());
        this.elements.newChatActionBtn?.addEventListener('click', () => this.createNewChat());
        this.elements.clearButton?.addEventListener('click', () => this.clearChat());
        this.elements.saveButton?.addEventListener('click', () => this.saveChat());
        this.elements.deleteBtn?.addEventListener('click', () => this.deleteChat());

        // Global chat selection handler
        window.selectChat = (element) => this.selectChat(element);

        // Load chats on page load
        this.loadChats();
    }

    async loadChats() {
        try {
            const response = await fetch(`${this.apiBase}/chats`);
            const data = await response.json();
            
            this.renderChatList(data.chats);
        } catch (error) {
            console.error('Error loading chats:', error);
            this.showNotification('Failed to load chats', 'error');
        }
    }

    renderChatList(chats) {
        const chatList = document.getElementById('chatList');
        if (!chatList) return;

        chatList.innerHTML = '';
        
        if (chats.length === 0) {
            chatList.innerHTML = '<li style="text-align: center; color: #c5aeff; font-style: italic;">No chats yet. Create your first chat!</li>';
            return;
        }

        chats.forEach(chat => {
            const li = document.createElement('li');
            li.dataset.chatId = chat.chat_id;
            li.onclick = () => this.selectChat(li);
            
            const date = new Date(chat.updated_at).toLocaleDateString();
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${chat.title}</span>
                    <small style="color: #8a63d2;">${date}</small>
                </div>
                <small style="color: #c5aeff; opacity: 0.7;">${chat.message_count} messages</small>
            `;
            
            chatList.appendChild(li);
        });
    }

    async selectChat(element) {
        // Remove previous selection
        document.querySelectorAll('.selected-chat').forEach(el => 
            el.classList.remove('selected-chat')
        );
        
        element.classList.add('selected-chat');
        
        const chatId = element.dataset.chatId;
        this.currentChatId = chatId;
        
        try {
            const response = await fetch(`${this.apiBase}/chats/${chatId}`);
            const chatData = await response.json();
            
            this.elements.chatTitle.textContent = chatData.title;
            this.renderMessages(chatData.messages);
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showNotification('Failed to load chat', 'error');
        }
    }

    renderMessages(messages) {
        this.elements.chatMessages.innerHTML = '';
        
        if (messages.length === 0) {
            this.elements.chatMessages.innerHTML = '<div class="welcome-message"><p>Start a conversation!</p></div>';
            return;
        }

        messages.forEach(message => {
            this.addMessageToChat(message, false);
        });
        
        this.scrollToBottom();
    }

    addMessageToChat(message, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = message.role === 'user' ? 'You' : 'Assistant';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (message.role === 'assistant') {
            contentDiv.innerHTML = marked(message.content);
        } else {
            contentDiv.textContent = message.content;
        }
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        this.elements.chatMessages.appendChild(messageDiv);
        
        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        this.scrollToBottom();
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isStreaming) return;

        const isStreaming = this.elements.streamToggle.checked;
        const model = this.elements.modelSelect.value;

        // Add user message to chat
        this.addMessageToChat({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Clear input
        this.elements.messageInput.value = '';
        this.elements.sendButton.disabled = true;
        this.isStreaming = true;

        try {
            const requestBody = {
                message: message,
                chat_id: this.currentChatId,
                model: model,
                stream: isStreaming
            };

            if (isStreaming) {
                await this.handleStreamingResponse(requestBody);
            } else {
                await this.handleNormalResponse(requestBody);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showNotification('Failed to send message', 'error');
        } finally {
            this.elements.sendButton.disabled = false;
            this.isStreaming = false;
        }
    }

    async handleStreamingResponse(requestBody) {
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        // Create assistant message container
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = 'Assistant';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        assistantMessageDiv.appendChild(headerDiv);
        assistantMessageDiv.appendChild(contentDiv);
        this.elements.chatMessages.appendChild(assistantMessageDiv);

        // Add typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator active';
        typingDiv.textContent = 'AI is typing...';
        this.elements.chatMessages.appendChild(typingDiv);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                assistantContent += parsed.content;
                                contentDiv.innerHTML = marked(assistantContent);
                                this.scrollToBottom();
                            }
                            if (parsed.done) {
                                this.currentChatId = parsed.chat_id;
                                break;
                            }
                        } catch (e) {
                            console.error('Error parsing stream data:', e);
                        }
                    }
                }
            }
        } finally {
            typingDiv.remove();
            this.scrollToBottom();
        }
    }

    async handleNormalResponse(requestBody) {
        const response = await fetch(`${this.apiBase}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        const data = await response.json();
        this.currentChatId = data.chat_id;
        
        this.addMessageToChat(data.message);
    }

    async createNewChat() {
        try {
            const response = await fetch(`${this.apiBase}/chats`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Failed to create chat');
            }

            const data = await response.json();
            this.currentChatId = data.chat_id;
            this.elements.chatTitle.textContent = data.title;
            this.elements.chatMessages.innerHTML = '<div class="welcome-message"><p>Start a conversation!</p></div>';
            
            this.loadChats();
            this.showNotification('New chat created', 'success');
        } catch (error) {
            console.error('Error creating chat:', error);
            this.showNotification('Failed to create chat', 'error');
        }
    }

    async deleteChat() {
        if (!this.currentChatId) {
            this.showNotification('No chat selected', 'error');
            return;
        }

        if (!confirm('Delete this chat? This action cannot be undone.')) return;

        try {
            const response = await fetch(`${this.apiBase}/chats/${this.currentChatId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete chat');
            }

            this.currentChatId = null;
            this.elements.chatTitle.textContent = 'AI Assistant';
            this.elements.chatMessages.innerHTML = '<div class="welcome-message"><p>Welcome to Purple Network AI Chat! Start a conversation with the AI assistant.</p></div>';
            
            this.loadChats();
            this.showNotification('Chat deleted', 'success');
        } catch (error) {
            console.error('Error deleting chat:', error);
            this.showNotification('Failed to delete chat', 'error');
        }
    }

    clearChat() {
        if (!this.currentChatId) {
            this.showNotification('No chat selected', 'error');
            return;
        }

        if (!confirm('Clear this chat? This will remove all messages.')) return;

        this.elements.chatMessages.innerHTML = '<div class="welcome-message"><p>Start a conversation!</p></div>';
        this.showNotification('Chat cleared', 'success');
    }

    saveChat() {
        if (!this.currentChatId) {
            this.showNotification('No chat selected', 'error');
            return;
        }

        // This would typically save to a file or export functionality
        this.showNotification('Chat saved', 'success');
    }

    async loadModels() {
        try {
            const response = await fetch(`${this.apiBase}/models`);
            const data = await response.json();
            
            this.elements.modelSelect.innerHTML = '';
            
            if (data.data && data.data.length > 0) {
                data.data.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    this.elements.modelSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = 'default';
                option.textContent = 'Default Model';
                this.elements.modelSelect.appendChild(option);
            }
        } catch (error) {
            console.error('Error loading models:', error);
            // Fallback to default model
            this.elements.modelSelect.innerHTML = '<option value="default">Default Model</option>';
        }
    }

    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add notification styles if not already present
        if (!document.querySelector('.notification')) {
            const style = document.createElement('style');
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-family: 'Courier New', Courier, monospace;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                }
                .notification.success {
                    background-color: rgba(81, 207, 102, 0.9);
                    border: 1px solid #51cf66;
                }
                .notification.error {
                    background-color: rgba(255, 107, 107, 0.9);
                    border: 1px solid #ff6b6b;
                }
                .notification.info {
                    background-color: rgba(172, 139, 255, 0.9);
                    border: 1px solid #c5aeff;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}
