export class CollaborativeManager {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.username = localStorage.getItem('collaborative_username') || '';
        this.userId = this.generateUserId();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.initializeElements();
        this.setupEventListeners();
        this.loadUsername();
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    initializeElements() {
        this.elements = {
            usernameInput: document.getElementById('usernameInput'),
            connectionStatus: document.getElementById('connectionStatus'),
            roomList: document.getElementById('roomList'),
            newRoomButton: document.getElementById('newRoomButton'),
            createRoomBtn: document.getElementById('createRoomBtn'),
            joinRoomBtn: document.getElementById('joinRoomBtn'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            roomSettingsBtn: document.getElementById('roomSettingsBtn'),
            collaborativeChatTitle: document.getElementById('collaborativeChatTitle'),
            userCount: document.getElementById('userCount'),
            roomInfoButton: document.getElementById('roomInfoButton'),
            collaborativeMessages: document.getElementById('collaborativeMessages'),
            collaborativeMessageInput: document.getElementById('collaborativeMessageInput'),
            collaborativeSendButton: document.getElementById('collaborativeSendButton'),
            collaborativeEmojiButton: document.getElementById('collaborativeEmojiButton'),
            collaborativeFileButton: document.getElementById('collaborativeFileButton'),
            roomModal: document.getElementById('roomModal'),
            roomNameInput: document.getElementById('roomNameInput'),
            roomDescInput: document.getElementById('roomDescInput'),
            roomPrivateCheck: document.getElementById('roomPrivateCheck'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            cancelRoomBtn: document.getElementById('cancelRoomBtn'),
            createRoomConfirmBtn: document.getElementById('createRoomConfirmBtn')
        };
    }

    setupEventListeners() {
        this.elements.usernameInput?.addEventListener('blur', () => this.saveUsername());
        this.elements.usernameInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveUsername();
                this.connectWebSocket();
            }
        });

        this.elements.newRoomButton?.addEventListener('click', () => this.showCreateRoomModal());
        this.elements.createRoomBtn?.addEventListener('click', () => this.showCreateRoomModal());
        this.elements.joinRoomBtn?.addEventListener('click', () => this.joinSelectedRoom());
        this.elements.leaveRoomBtn?.addEventListener('click', () => this.leaveCurrentRoom());
        this.elements.roomInfoButton?.addEventListener('click', () => this.showRoomInfo());

        this.elements.collaborativeSendButton?.addEventListener('click', () => this.sendCollaborativeMessage());
        this.elements.collaborativeMessageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendCollaborativeMessage();
            }
        });

        this.elements.closeModalBtn?.addEventListener('click', () => this.hideCreateRoomModal());
        this.elements.cancelRoomBtn?.addEventListener('click', () => this.hideCreateRoomModal());
        this.elements.createRoomConfirmBtn?.addEventListener('click', () => this.createRoom());

        window.selectRoom = (element) => this.selectRoom(element);

        if (this.username) {
            this.connectWebSocket();
        }
    }

    loadUsername() {
        if (this.elements.usernameInput && this.username) {
            this.elements.usernameInput.value = this.username;
        }
    }

    saveUsername() {
        const username = this.elements.usernameInput?.value.trim();
        if (username && username !== this.username) {
            this.username = username;
            localStorage.setItem('collaborative_username', username);
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'update_username',
                    username: username
                }));
            }
        }
    }

    connectWebSocket() {
        if (!this.username.trim()) {
            this.showNotification('Please enter a username first', 'error');
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            return; 
        }

        this.updateConnectionStatus('Connecting...');

        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            this.socket = new WebSocket(wsUrl);
            this.socket.onopen = () => {
                this.updateConnectionStatus('Connected');
                this.reconnectAttempts = 0;
                this.socket.send(JSON.stringify({
                    type: 'user_connect',
                    username: this.username,
                    userId: this.userId
                }));
                this.loadRooms();
                this.enableChatControls();
            };

            this.socket.onmessage = (event) => {
                this.handleWebSocketMessage(JSON.parse(event.data));
            };

            this.socket.onclose = () => {
                this.updateConnectionStatus('Disconnected');
                this.disableChatControls();
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Connection Error');
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus('Connection Failed');
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateConnectionStatus(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.connectWebSocket();
            }, 2000 * this.reconnectAttempts);
        } else {
            this.updateConnectionStatus('Disconnected');
            this.showNotification('Connection lost. Please refresh the page.', 'error');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'rooms_list':
                this.renderRoomList(data.rooms);
                break;
            case 'room_joined':
                this.handleRoomJoined(data);
                break;
            case 'room_left':
                this.handleRoomLeft();
                break;
            case 'new_message':
                this.addCollaborativeMessage(data.message);
                break;
            case 'user_joined':
                this.handleUserJoined(data);
                break;
            case 'user_left':
                this.handleUserLeft(data);
                break;
            case 'room_users':
                this.updateUserCount(data.users);
                break;
            case 'room_created':
                this.handleRoomCreated(data);
                break;
            case 'error':
                this.showNotification(data.message, 'error');
                break;
        }
    }

    loadRooms() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'get_rooms'
            }));
        }
    }

    renderRoomList(rooms) {
        const roomList = this.elements.roomList;
        if (!roomList) return;

        roomList.innerHTML = '';
        
        if (rooms.length === 0) {
            roomList.innerHTML = '<li style="text-align: center; color: #c5aeff; font-style: italic;">No rooms available. Create the first one!</li>';
            return;
        }

        rooms.forEach(room => {
            const li = document.createElement('li');
            li.dataset.roomId = room.id;
            li.onclick = () => this.selectRoom(li);
            
            const isPrivate = room.private ? '🔒' : '🌐';
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${isPrivate} ${room.name}</span>
                    <small style="color: #8a63d2;">${room.userCount || 0} users</small>
                </div>
                ${room.description ? `<small style="color: #c5aeff; opacity: 0.7;">${room.description}</small>` : ''}
            `;
            
            roomList.appendChild(li);
        });
    }

    selectRoom(element) {
        document.querySelectorAll('.selected-room').forEach(el => 
            el.classList.remove('selected-room')
        );
        
        element.classList.add('selected-room');
        this.selectedRoomId = element.dataset.roomId;
    }

    joinSelectedRoom() {
        if (!this.selectedRoomId) {
            this.showNotification('Please select a room first', 'error');
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'join_room',
                roomId: this.selectedRoomId
            }));
        }
    }

    handleRoomJoined(data) {
        this.currentRoom = data.room;
        this.elements.collaborativeChatTitle.textContent = `${data.room.private ? '🔒' : '🌐'} ${data.room.name}`;
        
        this.elements.collaborativeMessages.innerHTML = '';
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(message => {
                this.addCollaborativeMessage(message, false);
            });
        } else {
            this.elements.collaborativeMessages.innerHTML = `
                <div class="welcome-message">
                    <p>Welcome to ${data.room.name}! Start chatting with other users.</p>
                </div>
            `;
        }
        
        this.updateUserCount(data.users || []);
        this.enableChatControls();
        this.showNotification(`Joined room: ${data.room.name}`, 'success');
    }

    leaveCurrentRoom() {
        if (!this.currentRoom) {
            this.showNotification('You are not in a room', 'error');
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'leave_room'
            }));
        }
    }

    handleRoomLeft() {
        this.currentRoom = null;
        this.elements.collaborativeChatTitle.textContent = 'Select a Room';
        this.elements.userCount.textContent = '0 users';
        this.elements.collaborativeMessages.innerHTML = `
            <div class="welcome-message">
                <p>Welcome to Collaborative Chat! Join or create a room to start chatting with other users.</p>
            </div>
        `;
        this.disableChatControls();
        this.showNotification('Left the room', 'info');
    }

    sendCollaborativeMessage() {
        const message = this.elements.collaborativeMessageInput?.value.trim();
        if (!message || !this.currentRoom) return;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'send_message',
                message: message
            }));
            this.elements.collaborativeMessageInput.value = '';
        }
    }

    addCollaborativeMessage(message, animate = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `collaborative-message ${message.userId === this.userId ? 'own' : 'other'}`;
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="username">${message.username}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
        `;
        
        this.elements.collaborativeMessages.appendChild(messageDiv);
        
        if (animate) {
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        this.scrollCollaborativeToBottom();
    }

    handleUserJoined(data) {
        const systemMessage = {
            username: 'System',
            content: `${data.username} joined the room`,
            timestamp: new Date().toISOString(),
            userId: 'system'
        };
        this.addCollaborativeMessage(systemMessage);
        this.updateUserCount(data.users);
    }

    handleUserLeft(data) {
        const systemMessage = {
            username: 'System',
            content: `${data.username} left the room`,
            timestamp: new Date().toISOString(),
            userId: 'system'
        };
        this.addCollaborativeMessage(systemMessage);
        this.updateUserCount(data.users);
    }

    updateUserCount(users) {
        this.elements.userCount.textContent = `${users.length} user${users.length !== 1 ? 's' : ''}`;
    }

    showCreateRoomModal() {
        this.elements.roomModal.style.display = 'flex';
        this.elements.roomNameInput.focus();
    }

    hideCreateRoomModal() {
        this.elements.roomModal.style.display = 'none';
        this.elements.roomNameInput.value = '';
        this.elements.roomDescInput.value = '';
        this.elements.roomPrivateCheck.checked = false;
    }

    createRoom() {
        const name = this.elements.roomNameInput?.value.trim();
        if (!name) {
            this.showNotification('Please enter a room name', 'error');
            return;
        }

        const roomData = {
            type: 'create_room',
            name: name,
            description: this.elements.roomDescInput?.value.trim() || '',
            private: this.elements.roomPrivateCheck?.checked || false
        };

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(roomData));
            this.hideCreateRoomModal();
        }
    }

    handleRoomCreated(data) {
        this.showNotification(`Room "${data.room.name}" created successfully!`, 'success');
        this.loadRooms();
    }

    showRoomInfo() {
        if (!this.currentRoom) {
            this.showNotification('No room selected', 'error');
            return;
        }

        const info = `
Room: ${this.currentRoom.name}
${this.currentRoom.description ? `Description: ${this.currentRoom.description}` : ''}
Type: ${this.currentRoom.private ? 'Private' : 'Public'}
Created: ${new Date(this.currentRoom.created_at).toLocaleString()}
        `.trim();

        alert(info);
    }

    enableChatControls() {
        this.elements.collaborativeMessageInput.disabled = false;
        this.elements.collaborativeSendButton.disabled = false;
        this.elements.collaborativeEmojiButton.disabled = false;
        this.elements.collaborativeFileButton.disabled = false;
    }

    disableChatControls() {
        this.elements.collaborativeMessageInput.disabled = true;
        this.elements.collaborativeSendButton.disabled = true;
        this.elements.collaborativeEmojiButton.disabled = true;
        this.elements.collaborativeFileButton.disabled = true;
    }

    updateConnectionStatus(status) {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = status;
            const colors = {
                'Connected': '#51cf66',
                'Connecting...': '#ffd43b',
                'Disconnected': '#ff6b6b',
                'Connection Error': '#ff6b6b',
                'Connection Failed': '#ff6b6b'
            };
            this.elements.connectionStatus.style.color = colors[status] || '#8a63d2';
        }
    }

    scrollCollaborativeToBottom() {
        this.elements.collaborativeMessages.scrollTop = this.elements.collaborativeMessages.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        if (!document.querySelector('.notification-styles')) {
            const style = document.createElement('style');
            style.className = 'notification-styles';
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