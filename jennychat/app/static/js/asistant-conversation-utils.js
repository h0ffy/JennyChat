// Utility functions for conversation management

// Get conversational response (for questions that don't require search)
export function getConversationalResponse(text, config, language = 'es') {
    const lowerText = text.toLowerCase();
    
    // Responses for common questions - Spanish
    const spanishResponses = {
        greeting: [
            `¡Hola! Soy ${config.assistantName}, tu asistente virtual. ¿En qué puedo ayudarte hoy?`,
            `¡Saludos! ¿Cómo puedo asistirte en este momento?`,
            `Hola, encantada de hablar contigo. ¿Hay algo en lo que te pueda ayudar?`
        ],
        howAreYou: [
            "Estoy funcionando perfectamente, gracias por preguntar. ¿Y tú cómo estás?",
            "Todo bien por aquí, lista para ayudarte. ¿Cómo te encuentras tú?",
            "Muy bien, gracias. Siempre disponible para asistirte. ¿Qué tal estás tú?"
        ],
        thanks: [
            "¡De nada! Estoy aquí para ayudarte cuando lo necesites.",
            "Es un placer poder ayudarte.",
            "No hay de qué. Si necesitas algo más, no dudes en preguntar."
        ],
        joke: [
            "¿Por qué los programadores prefieren el frío? Porque odian los bugs. ¡Ja ja!",
            "¿Sabes qué le dice un bit al otro? Nos vemos en el bus.",
            "¿Qué hace un pez programador? Nada en código."
        ],
        whoAreYou: [
            `Soy ${config.assistantName}, una asistente de inteligencia artificial diseñada para ayudarte con información y responder preguntas. Puedo buscar datos y mantener conversaciones sobre diversos temas.`,
            `Me llamo ${config.assistantName}, tu asistente virtual. Estoy aquí para responder preguntas, buscar información y conversar contigo sobre cualquier tema.`
        ],
        goodbye: [
            "¡Hasta pronto! Ha sido un placer ayudarte. Regresa cuando quieras hablar de nuevo.",
            "¡Adiós! Espero haberte sido de ayuda. ¡Que tengas un excelente día!",
            "Hasta la próxima. Estaré aquí cuando me necesites."
        ],
        default: [
            "Entiendo tu comentario. ¿Hay algo específico sobre lo que quieras hablar o alguna información que necesites?",
            "Interesante. ¿Te gustaría profundizar en este tema o hay algo más en lo que pueda ayudarte?",
            "Comprendo. ¿Hay algún aspecto particular sobre esto que te gustaría explorar?"
        ]
    };
    
    // Responses for common questions - English
    const englishResponses = {
        greeting: [
            `Hello! I'm ${config.assistantName}, your virtual assistant. How can I help you today?`,
            `Greetings! How may I assist you at this moment?`,
            `Hi there, pleased to talk to you. Is there something I can help you with?`
        ],
        howAreYou: [
            "I'm functioning perfectly, thanks for asking. How are you doing?",
            "All good here, ready to help you. How are you feeling today?",
            "Very well, thank you. Always available to assist you. How are you?"
        ],
        thanks: [
            "You're welcome! I'm here to help whenever you need.",
            "It's my pleasure to assist you.",
            "No problem at all. If you need anything else, just ask."
        ],
        joke: [
            "Why do programmers prefer cold weather? Because they hate bugs!",
            "What's a computer's favorite snack? Microchips!",
            "Why don't programmers like nature? It has too many bugs and no debugger."
        ],
        whoAreYou: [
            `I'm ${config.assistantName}, an artificial intelligence assistant designed to help you with information and answer questions. I can search for data and maintain conversations on various topics.`,
            `My name is ${config.assistantName}, your virtual assistant. I'm here to answer questions, search for information, and chat with you about any topic.`
        ],
        goodbye: [
            "See you soon! It's been a pleasure helping you. Come back whenever you want to talk again.",
            "Goodbye! I hope I've been helpful. Have a great day!",
            "Until next time. I'll be here when you need me."
        ],
        default: [
            "I understand your comment. Is there something specific you'd like to talk about or any information you need?",
            "Interesting. Would you like to delve deeper into this topic, or is there something else I can help you with?",
            "I see. Is there any particular aspect of this you'd like to explore?"
        ]
    };
    
    // Select response language
    const responses = language.startsWith('es') ? spanishResponses : englishResponses;
    
    // Match query to response category
    if (matchesAny(lowerText, ['hola', 'saludos', 'buenos días', 'hello', 'hi', 'hey', 'good morning'])) {
        return getRandomResponse(responses.greeting);
    } 
    else if (matchesAny(lowerText, ['cómo estás', 'qué tal', 'cómo te va', 'how are you', 'how you doing'])) {
        return getRandomResponse(responses.howAreYou);
    } 
    else if (matchesAny(lowerText, ['gracias', 'te lo agradezco', 'thank you', 'thanks'])) {
        return getRandomResponse(responses.thanks);
    } 
    else if (matchesAny(lowerText, ['chiste', 'broma', 'cuéntame un chiste', 'joke', 'tell me a joke'])) {
        return getRandomResponse(responses.joke);
    } 
    else if (matchesAny(lowerText, ['quién eres', 'qué eres', 'who are you', 'what are you'])) {
        return getRandomResponse(responses.whoAreYou);
    } 
    else if (matchesAny(lowerText, ['adiós', 'hasta luego', 'nos vemos', 'goodbye', 'bye', 'see you'])) {
        return getRandomResponse(responses.goodbye);
    } 
    else {
        return getRandomResponse(responses.default);
    }
}

// Helper function to check if text matches any of the patterns
function matchesAny(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
}

// Helper function to get a random response from an array
function getRandomResponse(responses) {
    return responses[Math.floor(Math.random() * responses.length)];
}

// Function to manage conversation context
export function updateConversationHistory(history, role, content, maxLength = 10) {
    // Add new message to history
    history.push({ role, content });
    
    // Trim history if it gets too long
    if (history.length > maxLength) {
        history = history.slice(history.length - maxLength);
    }
    
    return history;
}

// Function to analyze conversation context for better responses
export function analyzeConversationContext(history) {
    // This would be more sophisticated in a real implementation
    // For now, just return basic context info
    
    const lastUserMessage = history
        .filter(msg => msg.role === 'user')
        .pop();
        
    const lastAssistantMessage = history
        .filter(msg => msg.role === 'assistant')
        .pop();
    
    return {
        lastUserQuery: lastUserMessage ? lastUserMessage.content : null,
        lastAssistantResponse: lastAssistantMessage ? lastAssistantMessage.content : null,
        messageCount: history.length,
        isOngoing: history.length > 2
    };
}
