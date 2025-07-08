import { config } from './asistant-config.js';
import { 
    getAllVoices, 
    filterVoicesByLanguage, 
    filterVoicesByGender, 
    populateVoiceSelect, 
    createUtterance, 
    findVoice,
    testVoice 
} from './voice-utils.js';
import {
    createSpeechUtterance,
    speakWithVoice,
    cleanTextForSpeech
} from './speech-utils.js';
import {
    searchWikipedia,
    checkCurrentEvents,
    determineBusquedaRequerida,
    extractSearchTerms,
    formulateResponse
} from './search-utils.js';
import {
    getConversationalResponse,
    updateConversationHistory,
    analyzeConversationContext
} from './conversation-utils.js';
import {
    animateAvatar,
    triggerRandomEyeMovements
} from './avatar-animations.js';

// Optimized DOM ready handler
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM elements for better performance
    const elements = {
        chatMessages: document.getElementById('chat-messages'),
        textInput: document.getElementById('text-input'),
        sendButton: document.getElementById('send-button'),
        micButton: document.getElementById('mic-button'),
        statusElement: document.getElementById('status'),
        toggleSettings: document.getElementById('toggle-settings'),
        voiceSettingsPanel: document.getElementById('voice-settings'),
        voiceLanguageSelect: document.getElementById('voice-language'),
        voiceSelect: document.getElementById('voice-select'),
        voiceGenderSelect: document.getElementById('voice-gender'),
        voicePitch: document.getElementById('voice-pitch'),
        voiceRate: document.getElementById('voice-rate'),
        voiceVolume: document.getElementById('voice-volume'),
        pitchValue: document.getElementById('pitch-value'),
        rateValue: document.getElementById('rate-value'),
        volumeValue: document.getElementById('volume-value'),
        saveVoiceSettings: document.getElementById('save-voice-settings'),
        testVoiceButton: document.getElementById('test-voice')
    };
    
    // Voice recognition and synthesis variables
    let recognition;
    let synth = window.speechSynthesis;
    let isListening = false;
    let isSpeaking = false;
    let conversationHistory = [];
    let isAiEnabled = config.ai?.enabled || true;
    let voices = [];
    
    // Optimized voice settings
    let currentVoiceSettings = {
        language: config.voice.language,
        name: config.voice.name,
        gender: "female",
        pitch: config.voice.pitch,
        rate: config.voice.rate,
        volume: config.voice.volume || 1.0
    };
    
    // Optimized speech recognition initialization
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        
        // Optimized recognition settings
        Object.assign(recognition, {
            lang: config.voice.language,
            continuous: false,
            interimResults: false,
            maxAlternatives: 1
        });
        
        recognition.onstart = () => {
            isListening = true;
            document.body.classList.add('listening');
            elements.statusElement.textContent = "Escuchando...";
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.textInput.value = transcript;
            handleUserInput(transcript);
        };
        
        recognition.onend = () => {
            isListening = false;
            document.body.classList.remove('listening');
            elements.statusElement.textContent = "Presiona el micrófono para hablar";
        };
        
        recognition.onerror = (event) => {
            console.error("Error en reconocimiento de voz:", event.error);
            elements.statusElement.textContent = `Error: ${event.error}`;
            isListening = false;
            document.body.classList.remove('listening');
        };
    } else {
        elements.micButton.disabled = true;
        elements.micButton.title = "Reconocimiento de voz no soportado en este navegador";
    }
    
    // Optimized voice loading function with debouncing
    let voiceLoadTimeout;
    function loadVoices() {
        clearTimeout(voiceLoadTimeout);
        voiceLoadTimeout = setTimeout(() => {
            voices = getAllVoices();
            console.log("Voces disponibles:", voices.length);
            
            const filteredVoices = filterVoicesByLanguage(voices, currentVoiceSettings.language);
            const filteredByGender = filterVoicesByGender(filteredVoices, currentVoiceSettings.gender);
            
            populateVoiceSelect(elements.voiceSelect, 
                              filteredByGender.length > 0 ? filteredByGender : filteredVoices, 
                              currentVoiceSettings.name);
        }, 100);
    }
    
    // Optimized voice controls initialization
    function initializeVoiceControls() {
        const controls = [
            { element: elements.voicePitch, value: currentVoiceSettings.pitch, display: elements.pitchValue },
            { element: elements.voiceRate, value: currentVoiceSettings.rate, display: elements.rateValue },
            { element: elements.voiceVolume, value: currentVoiceSettings.volume, display: elements.volumeValue }
        ];
        
        controls.forEach(({ element, value, display }) => {
            element.value = value;
            display.textContent = value;
        });
        
        elements.voiceGenderSelect.value = currentVoiceSettings.gender;
    }
    
    // Initialize voices with optimized loading
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = loadVoices;
    } else {
        setTimeout(loadVoices, 1000);
    }
    
    // Optimized event listeners with delegation
    const voiceControls = [
        {
            element: elements.voiceLanguageSelect,
            event: 'change',
            handler: function() {
                currentVoiceSettings.language = this.value;
                
                if (recognition) {
                    recognition.lang = this.value;
                }
                
                const filteredVoices = filterVoicesByLanguage(voices, this.value);
                const filteredByGender = filterVoicesByGender(filteredVoices, currentVoiceSettings.gender);
                
                populateVoiceSelect(elements.voiceSelect, 
                                  filteredByGender.length > 0 ? filteredByGender : filteredVoices, 
                                  null);
                                  
                if (elements.voiceSelect.options.length > 0) {
                    currentVoiceSettings.name = elements.voiceSelect.options[0].value;
                }
            }
        },
        {
            element: elements.voiceGenderSelect,
            event: 'change',
            handler: function() {
                currentVoiceSettings.gender = this.value;
                
                const filteredVoices = filterVoicesByLanguage(voices, currentVoiceSettings.language);
                const filteredByGender = filterVoicesByGender(filteredVoices, this.value);
                
                populateVoiceSelect(elements.voiceSelect, 
                                  filteredByGender.length > 0 ? filteredByGender : filteredVoices, 
                                  null);
                                  
                if (elements.voiceSelect.options.length > 0) {
                    currentVoiceSettings.name = elements.voiceSelect.options[0].value;
                }
            }
        },
        {
            element: elements.voiceSelect,
            event: 'change',
            handler: function() {
                currentVoiceSettings.name = this.value;
            }
        },
        {
            element: elements.voicePitch,
            event: 'input',
            handler: function() {
                currentVoiceSettings.pitch = parseFloat(this.value);
                elements.pitchValue.textContent = this.value;
            }
        },
        {
            element: elements.voiceRate,
            event: 'input',
            handler: function() {
                currentVoiceSettings.rate = parseFloat(this.value);
                elements.rateValue.textContent = this.value;
            }
        },
        {
            element: elements.voiceVolume,
            event: 'input',
            handler: function() {
                currentVoiceSettings.volume = parseFloat(this.value);
                elements.volumeValue.textContent = this.value;
            }
        }
    ];
    
    // Attach optimized event listeners
    voiceControls.forEach(({ element, event, handler }) => {
        element?.addEventListener(event, handler);
    });
    
    // Optimized HTMX event handlers
    const htmxEvents = [
        {
            event: 'htmx:afterSwap',
            handler: function(event) {
                if (event.detail.target.id === 'chat-messages') {
                    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
                }
            }
        },
        {
            event: 'htmx:beforeRequest',
            handler: function(event) {
                if (event.detail.target.id === 'chat-messages') {
                    elements.statusElement.textContent = "ANALIZANDO CONSULTA...";
                    document.body.classList.add('searching');
                }
            }
        },
        {
            event: 'htmx:responseError',
            handler: function(event) {
                console.error("HTMX Error:", event);
                elements.statusElement.textContent = "Error en la consulta";
                document.body.classList.remove('searching');
            }
        },
        {
            event: 'htmx:beforeSend',
            handler: function(event) {
                const xhr = event.detail.xhr;
                const target = event.detail.target;
                
                const voiceRelatedTargets = ['voice-select', 'save-voice-settings', 'test-voice'];
                if (voiceRelatedTargets.includes(target.id)) {
                    xhr.setRequestHeader('X-Voice-Settings', JSON.stringify(currentVoiceSettings));
                }
                
                if (event.detail.trigger?.id === 'send-button') {
                    setTimeout(() => { elements.textInput.value = ''; }, 10);
                }
            }
        }
    ];
    
    htmxEvents.forEach(({ event, handler }) => {
        document.body.addEventListener(event, handler);
    });
    
    // Custom handler for speech response from server
    htmx.on('speak', function(event) {
        const text = event.detail.message;
        speakResponse(text);
    });
    
    // Toggle voice settings panel
    elements.toggleSettings?.addEventListener('click', function() {
        elements.voiceSettingsPanel.classList.toggle('open');
    });
    
    // Optimized speech synthesis function
    function speakResponse(text) {
        if (synth && text) {
            speakWithVoice(text, currentVoiceSettings, voices, {
                onStart: () => {
                    isSpeaking = true;
                    document.body.classList.add('speaking');
                    elements.statusElement.textContent = currentVoiceSettings.language.startsWith('es') 
                        ? "Hablando..." 
                        : "Speaking...";
                    
                    animateAvatar(true, 0.8);
                },
                
                onBoundary: (event) => {
                    if (event.name === 'word') {
                        const intensity = Math.min(0.5 + (event.charLength * 0.02), 1);
                        animateAvatar(true, intensity);
                    }
                },
                
                onMark: (event) => {
                    if (event.name === 'emphasis') {
                        animateAvatar(true, 1.0);
                    }
                },
                
                onEnd: () => {
                    isSpeaking = false;
                    document.body.classList.remove('speaking');
                    elements.statusElement.textContent = currentVoiceSettings.language.startsWith('es') 
                        ? "Presiona el micrófono para hablar" 
                        : "Press the microphone to speak";
                    
                    animateAvatar(false);
                }
            });
        }
    }
    
    // Initialize avatar animations
    initializeVoiceControls();
    triggerRandomEyeMovements();
    
    // Optimized interface effects with performance monitoring
    const addInterfaceEffects = () => {
        let effectsEnabled = true;
        
        // Monitor performance and disable effects if needed
        const checkPerformance = () => {
            if (performance.memory && performance.memory.usedJSHeapSize > 50000000) {
                effectsEnabled = false;
                console.log('High memory usage detected, disabling visual effects');
            }
        };
        
        setInterval(checkPerformance, 30000); // Check every 30 seconds
        
        // Optimized chat container effect
        setInterval(() => {
            if (!effectsEnabled) return;
            
            const chatContainer = document.querySelector('.chat-container');
            if (Math.random() > 0.8) {
                const intensity = Math.random() * 0.5 + 0.1;
                chatContainer.style.boxShadow = `0 0 15px rgba(189, 147, 249, ${intensity})`;
                
                setTimeout(() => {
                    chatContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.2)';
                }, 150);
            }
        }, 3000);
        
        // Optimized status text effect
        setInterval(() => {
            if (!effectsEnabled || isSpeaking || isListening) return;
            
            if (Math.random() > 0.95) {
                const status = elements.statusElement;
                const originalStyles = {
                    letterSpacing: status.style.letterSpacing,
                    textShadow: status.style.textShadow
                };
                
                status.style.letterSpacing = '3px';
                status.style.textShadow = '2px 0 0 rgba(189, 147, 249, 0.7), -2px 0 0 rgba(255, 79, 79, 0.7)';
                
                setTimeout(() => {
                    status.style.letterSpacing = originalStyles.letterSpacing;
                    status.style.textShadow = originalStyles.textShadow;
                }, 200);
            }
        }, 8000);
    };
    
    addInterfaceEffects();
});
