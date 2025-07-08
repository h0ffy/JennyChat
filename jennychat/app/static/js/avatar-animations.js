// Avatar animations for Sophia virtual assistant

// Function to animate the avatar based on speech amplitude
export function animateAvatar(isSpeaking, amplitude = 0.5) {
    const mouth = document.getElementById('mouth');
    const mouthFill = document.getElementById('mouth-fill');
    const leftEye = document.getElementById('left-eye');
    const rightEye = document.getElementById('right-eye');
    const leftPupil = document.getElementById('left-pupil');
    const rightPupil = document.getElementById('right-pupil');
    const leftEyelid = document.getElementById('left-eyelid');
    const rightEyelid = document.getElementById('right-eyelid');
    const leftEyebrow = document.getElementById('left-eyebrow');
    const rightEyebrow = document.getElementById('right-eyebrow');
    const leftCheek = document.getElementById('left-cheek');
    const rightCheek = document.getElementById('right-cheek');
    
    if (isSpeaking) {
        // Animate mouth with tech-themed effects
        mouth.style.animation = `mouth-speak ${0.3/amplitude}s infinite ease-in-out`;
        mouthFill.style.opacity = "0.3";
        mouthFill.style.animation = `mouth-speak ${0.3/amplitude}s infinite ease-in-out`;
        
        // Add digital glow effect
        mouth.style.filter = "drop-shadow(0 0 2px #bd93f9)";
        leftEye.style.filter = "drop-shadow(0 0 3px #bd93f9)";
        rightEye.style.filter = "drop-shadow(0 0 3px #bd93f9)";
        
        // Tech-themed eye animations
        if (Math.random() > 0.9) {
            // Digital scan effect
            const scanEffect = document.createElement('div');
            scanEffect.className = 'scan-effect';
            document.querySelector('.assistant-avatar').appendChild(scanEffect);
            
            setTimeout(() => {
                if (scanEffect.parentNode) {
                    scanEffect.parentNode.removeChild(scanEffect);
                }
            }, 1000);
            
            blinkEyes(leftEyelid, rightEyelid);
        }
        
        // Adjust mouth animation based on amplitude
        const animationIntensity = 0.3 + (amplitude * 0.7);
        mouth.style.animationDuration = `${animationIntensity}s`;
        mouthFill.style.animationDuration = `${animationIntensity}s`;
        
        // Animate eyebrows
        if (Math.random() > 0.7) {
            leftEyebrow.style.animation = "eyebrow-raise 1s ease-in-out";
            rightEyebrow.style.animation = "eyebrow-raise 1s ease-in-out";
            
            setTimeout(() => {
                leftEyebrow.style.animation = "";
                rightEyebrow.style.animation = "";
            }, 1000);
        }
        
        // Enhanced digital cheek effect for enthusiasm
        if (amplitude > 0.7) {
            leftCheek.setAttribute('opacity', '0.8');
            rightCheek.setAttribute('opacity', '0.8');
            leftCheek.setAttribute('fill', '#bd93f9');
            rightCheek.setAttribute('fill', '#bd93f9');
        } else {
            leftCheek.setAttribute('opacity', '0.5');
            rightCheek.setAttribute('opacity', '0.5');
            leftCheek.setAttribute('fill', '#aac2d9');
            rightCheek.setAttribute('fill', '#aac2d9');
        }
        
        // Random pupil movements
        if (Math.random() > 0.8) {
            const lookX = (Math.random() - 0.5) * 1.5;
            const lookY = (Math.random() - 0.5) * 1.5;
            
            leftPupil.setAttribute('cx', 80 + lookX);
            leftPupil.setAttribute('cy', 85 + lookY);
            rightPupil.setAttribute('cx', 120 + lookX);
            rightPupil.setAttribute('cy', 85 + lookY);
        }
    } else {
        // Reset animations when not speaking
        mouth.style.animation = "";
        mouthFill.style.opacity = "0";
        leftEyebrow.style.animation = "";
        rightEyebrow.style.animation = "";
        mouth.style.filter = "none";
        leftEye.style.filter = "none";
        rightEye.style.filter = "none";
    }
    
    // Create scan effect style if it doesn't exist
    if (!document.getElementById('scan-effect-style')) {
        const style = document.createElement('style');
        style.id = 'scan-effect-style';
        style.textContent = `
            .scan-effect {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 5px;
                background: linear-gradient(to right, transparent, rgba(189, 147, 249, 0.7), transparent);
                z-index: 5;
                pointer-events: none;
                animation: scan-avatar 1s linear;
            }
            
            @keyframes scan-avatar {
                0% { top: 0; opacity: 0.7; }
                100% { top: 100%; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Function to blink eyes
function blinkEyes(leftEyelid, rightEyelid) {
    leftEyelid.setAttribute('opacity', '1');
    rightEyelid.setAttribute('opacity', '1');
    
    setTimeout(() => {
        leftEyelid.setAttribute('opacity', '0');
        rightEyelid.setAttribute('opacity', '0');
    }, 200);
}

// Function to trigger random eye movements with tech effects
export function triggerRandomEyeMovements() {
    const leftEye = document.getElementById('left-eye');
    const rightEye = document.getElementById('right-eye');
    const leftPupil = document.getElementById('left-pupil');
    const rightPupil = document.getElementById('right-pupil');
    const leftEyelid = document.getElementById('left-eyelid');
    const rightEyelid = document.getElementById('right-eyelid');
    
    // Random blinks every 3-7 seconds
    setInterval(() => {
        if (!document.body.classList.contains('speaking')) {
            blinkEyes(leftEyelid, rightEyelid);
        }
    }, 3000 + Math.random() * 4000);
    
    // Random eye movements every 2-5 seconds
    setInterval(() => {
        // Only move eyes when not speaking
        if (!document.body.classList.contains('speaking')) {
            // Random eye look direction
            const lookX = (Math.random() - 0.5) * 3;
            const lookY = (Math.random() - 0.5) * 2;
            
            leftPupil.setAttribute('cx', 80 + lookX);
            leftPupil.setAttribute('cy', 85 + lookY);
            rightPupil.setAttribute('cx', 120 + lookX);
            rightPupil.setAttribute('cy', 85 + lookY);
            
            // Reset after a short time
            setTimeout(() => {
                leftPupil.setAttribute('cx', 80);
                leftPupil.setAttribute('cy', 85);
                rightPupil.setAttribute('cx', 120);
                rightPupil.setAttribute('cy', 85);
            }, 800);
        }
    }, 2000 + Math.random() * 3000);
    
    // Add digital data effect
    setInterval(() => {
        // Only show effect when not speaking
        if (!document.body.classList.contains('speaking') && Math.random() > 0.7) {
            const dataEffect = document.createElement('div');
            dataEffect.className = 'data-effect';
            document.querySelector('.assistant-avatar').appendChild(dataEffect);
            
            // Random data display
            const dataText = Math.random().toString(36).substring(2, 8) + 
                             Math.random().toString(36).substring(2, 8);
            
            dataEffect.textContent = dataText;
            
            // Position randomly
            dataEffect.style.left = `${Math.random() * 70 + 15}%`;
            dataEffect.style.top = `${Math.random() * 70 + 15}%`;
            
            setTimeout(() => {
                if (dataEffect.parentNode) {
                    dataEffect.parentNode.removeChild(dataEffect);
                }
            }, 700);
        }
    }, 3000);
    
    // Create data effect style if it doesn't exist
    if (!document.getElementById('data-effect-style')) {
        const style = document.createElement('style');
        style.id = 'data-effect-style';
        style.textContent = `
            .data-effect {
                position: absolute;
                color: rgba(79, 209, 255, 0.7);
                font-family: 'Orbitron', monospace;
                font-size: 0.6rem;
                opacity: 0;
                z-index: 5;
                pointer-events: none;
                animation: data-flash 0.7s ease-out;
            }
            
            @keyframes data-flash {
                0% { opacity: 0; }
                50% { opacity: 0.8; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}
