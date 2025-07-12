class EnvironmentDetector {
    constructor() {
        this.video = document.getElementById('cameraFeed');
        this.canvas = document.getElementById('detectionCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.stream = null;
        this.isActive = false;
        this.currentFacingMode = 'environment';
        this.previousFrame = null;
        this.animationId = null;
        
        this.elements = {
            statusDot: document.querySelector('.status-dot'),
            statusText: document.querySelector('.status-text'),
            brightness: document.getElementById('brightness'),
            motion: document.getElementById('motion'),
            objects: document.getElementById('objects'),
            errorMessage: document.getElementById('errorMessage'),
            toggleBtn: document.getElementById('toggleCamera'),
            switchBtn: document.getElementById('switchCamera'),
            captureBtn: document.getElementById('captureFrame'),
            retryBtn: document.getElementById('retryBtn')
        };
        
        this.bindEvents();
        this.init();
    }
    
    bindEvents() {
        this.elements.toggleBtn.addEventListener('click', () => this.toggleCamera());
        this.elements.switchBtn.addEventListener('click', () => this.switchCamera());
        this.elements.captureBtn.addEventListener('click', () => this.captureFrame());
        this.elements.retryBtn.addEventListener('click', () => this.init());
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    async init() {
        try {
            this.updateStatus('Requesting camera access...', false);
            await this.startCamera();
            this.updateStatus('Environment detection active', true);
            this.hideError();
        } catch (error) {
            console.error('Failed to initialize camera:', error);
            this.updateStatus('Camera access denied', false);
            this.showError();
        }
    }
    
    async startCamera() {
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
            }
            
            const constraints = {
                video: {
                    facingMode: this.currentFacingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };
            
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            this.video.onloadedmetadata = () => {
                this.resizeCanvas();
                this.isActive = true;
                this.startDetection();
            };
            
        } catch (error) {
            throw new Error(`Camera access failed: ${error.message}`);
        }
    }
    
    resizeCanvas() {
        const rect = this.video.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    startDetection() {
        if (!this.isActive) return;
        
        this.processFrame();
        this.animationId = requestAnimationFrame(() => this.startDetection());
    }
    
    processFrame() {
        if (!this.video.videoWidth || !this.video.videoHeight) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCanvas.width = this.video.videoWidth;
        tempCanvas.height = this.video.videoHeight;
        
        tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Calculate brightness
        const brightness = this.calculateBrightness(imageData);
        this.elements.brightness.textContent = `${brightness}%`;
        
        // Detect motion
        const motionLevel = this.detectMotion(imageData);
        this.elements.motion.textContent = motionLevel;
        
        // Simple object detection (edge detection)
        const objectCount = this.detectObjects(imageData);
        this.elements.objects.textContent = objectCount;
        
        // Draw detection overlay
        this.drawDetectionOverlay(imageData);
        
        this.previousFrame = imageData;
    }
    
    calculateBrightness(imageData) {
        const data = imageData.data;
        let total = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            total += (r + g + b) / 3;
        }
        
        return Math.round((total / (data.length / 4)) / 255 * 100);
    }
    
    detectMotion(imageData) {
        if (!this.previousFrame) return 'None';
        
        const data = imageData.data;
        const prevData = this.previousFrame.data;
        let differences = 0;
        const threshold = 30;
        
        for (let i = 0; i < data.length; i += 4) {
            const rDiff = Math.abs(data[i] - prevData[i]);
            const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
            const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
            
            if (rDiff > threshold || gDiff > threshold || bDiff > threshold) {
                differences++;
            }
        }
        
        const motionPercent = (differences / (data.length / 4)) * 100;
        
        if (motionPercent > 5) return 'High';
        if (motionPercent > 2) return 'Medium';
        if (motionPercent > 0.5) return 'Low';
        return 'None';
    }
    
    detectObjects(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        let edges = 0;
        
        // Simple edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
                const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
                
                if (Math.abs(current - right) > 50 || Math.abs(current - bottom) > 50) {
                    edges++;
                }
            }
        }
        
        return Math.round(edges / 1000);
    }
    
    drawDetectionOverlay(imageData) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw detection points
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const scaleX = this.canvas.width / width;
        const scaleY = this.canvas.height / height;
        
        this.ctx.fillStyle = 'rgba(0, 245, 255, 0.8)';
        
        for (let y = 0; y < height; y += 20) {
            for (let x = 0; x < width; x += 20) {
                const idx = (y * width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness > 150) {
                    this.ctx.beginPath();
                    this.ctx.arc(x * scaleX, y * scaleY, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }
    
    async toggleCamera() {
        if (this.isActive) {
            this.stopCamera();
        } else {
            await this.startCamera();
        }
    }
    
    stopCamera() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.video.srcObject = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.updateStatus('Camera stopped', false);
    }
    
    async switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        if (this.isActive) {
            await this.startCamera();
        }
    }
    
    captureFrame() {
        if (!this.isActive) return;
        
        const captureCanvas = document.createElement('canvas');
        const captureCtx = captureCanvas.getContext('2d');
        
        captureCanvas.width = this.video.videoWidth;
        captureCanvas.height = this.video.videoHeight;
        
        captureCtx.drawImage(this.video, 0, 0);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `environment-capture-${Date.now()}.png`;
        link.href = captureCanvas.toDataURL();
        link.click();
        
        // Visual feedback
        this.canvas.style.filter = 'brightness(2)';
        setTimeout(() => {
            this.canvas.style.filter = 'none';
        }, 100);
    }
    
    updateStatus(text, isActive) {
        this.elements.statusText.textContent = text;
        this.elements.statusDot.classList.toggle('active', isActive);
    }
    
    showError() {
        this.elements.errorMessage.classList.add('show');
    }
    
    hideError() {
        this.elements.errorMessage.classList.remove('show');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new EnvironmentDetector();
});

