const canvas = document.getElementById('neuralCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particlesArray = [];
const particleColor = 'rgba(172, 139, 255, 0.7)'; // Light purple with transparency

// Particle Class
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1.5;
        this.speedY = Math.random() * 2 - 1.5;
    }
    draw() {
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }
    update() {
        if (this.x > canvas.width || this.x < 0) {
            this.speedX = -this.speedX;
        }
        if (this.y > canvas.height || this.y < 0) {
            this.speedY = -this.speedY;
        }
        this.x += this.speedX;
        this.y += this.speedY;

        this.draw();
    }
}

// Create particle array
function init() {
    particlesArray = [];
    // Adjust particle density for performance, especially with more content on screen
    const currentNumberOfParticles = (canvas.width * canvas.height) / 9000; 
    for (let i = 0; i < currentNumberOfParticles; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        particlesArray.push(new Particle(x, y));
    }
}

// Connect particles
function connect() {
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distanceSquared = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x))
                + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            
            // Max distance particles will connect from, squared for performance
            const maxDistanceSquared = (canvas.width / 15) * (canvas.height / 15) > 20000 ? (canvas.width / 15) * (canvas.height / 15) : 20000;


            if (distanceSquared < maxDistanceSquared) {
                opacityValue = 1 - (distanceSquared / maxDistanceSquared);
                ctx.strokeStyle = `rgba(172, 139, 255, ${opacityValue * 0.5})`; // Reduced opacity for lines
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                ctx.stroke();
            }
        }
    }
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
    }
    connect();
}

// Resize listener
window.addEventListener('resize', function () {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init(); // Re-initialize particles on resize
});

// Initial setup
init();
animate();
// No changes were made to this file as per user request for styles.
// Any new JS logic is minimal and added directly to index.html for simplicity with HTMX.