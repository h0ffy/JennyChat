let offscreenCanvas;
let ctx;
let animationFrameId;

let particlesArray = [];
const particleColor = 'rgba(172, 139, 255, 0.7)';
const lineColor = 'rgba(172, 139, 255, 0.3)';

// Particle Class (adaptada para el worker)
class Particle {
    constructor(x, y, canvasWidth, canvasHeight) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1.5;
        this.speedY = Math.random() * 2 - 1.5;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }
    draw() {
        if (!ctx) return;
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > this.canvasWidth || this.x < 0) {
            this.speedX = -this.speedX;
        }
        if (this.y > this.canvasHeight || this.y < 0) {
            this.speedY = -this.speedY;
        }
        this.draw();
    }
}

function initParticles() {
    if (!offscreenCanvas) return;
    particlesArray = [];
    const currentNumberOfParticles = Math.floor((offscreenCanvas.width * offscreenCanvas.height) / 4000);
    for (let i = 0; i < currentNumberOfParticles; i++) {
        const x = Math.random() * offscreenCanvas.width;
        const y = Math.random() * offscreenCanvas.height;
        particlesArray.push(new Particle(x, y, offscreenCanvas.width, offscreenCanvas.height));
    }
}

function connectParticles() {
    if (!ctx || !particlesArray) return;
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            const maxDistanceSquared = 20000;

            if (distance < maxDistanceSquared) {
                opacityValue = 1 - (distance / maxDistanceSquared);
                ctx.strokeStyle = `rgba(172, 139, 255, ${opacityValue})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
    }
}

function animateParticles() {
    if (!ctx || !offscreenCanvas) return;
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    if (particlesArray) {
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connectParticles();
    }
    animationFrameId = requestAnimationFrame(animateParticles);
}

self.onmessage = function(event) {
    if (event.data.canvas && event.data.canvas instanceof OffscreenCanvas) {
        offscreenCanvas = event.data.canvas;
        ctx = offscreenCanvas.getContext('2d');

        // Set initial dimensions from the message
        offscreenCanvas.width = event.data.width || 300;
        offscreenCanvas.height = event.data.height || 150;
        
        console.log(`Worker: OffscreenCanvas received. Dimensions: ${offscreenCanvas.width}x${offscreenCanvas.height}`);

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        initParticles();
        animateParticles();

    } else if (event.data.type === 'stop') {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    } else if (event.data.type === 'start') {
        if (!animationFrameId && ctx && offscreenCanvas) {
            initParticles(); 
            animateParticles();
        }
    } else if (event.data.type === 'resize') {
        if (offscreenCanvas && ctx) {
            offscreenCanvas.width = event.data.width;
            offscreenCanvas.height = event.data.height;
            console.log(`Worker: OffscreenCanvas resized. Dimensions: ${offscreenCanvas.width}x${offscreenCanvas.height}`);
            initParticles(); 
        }
    }
};
