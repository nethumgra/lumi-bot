const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;

let lastQR = null;

// QR code එක browser වලින් බලන්න!
app.get('/', (req, res) => {
    if (lastQR) {
        res.send(`
        <html>
        <head><title>Lumi QR</title><meta http-equiv="refresh" content="30"></head>
        <body style="background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">📱 Scan with WhatsApp</h2>
        <img src="${lastQR}" style="width:300px;height:300px"/>
        <p style="color:#aaa;font-family:sans-serif">Page auto-refreshes every 30 seconds</p>
        </body></html>
        `);
    } else {
        res.send(`
        <html>
        <head><meta http-equiv="refresh" content="5"></head>
        <body style="background:#000;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">⏳ Lumi starting... please wait</h2>
        </body></html>
        `);
    }
});

app.listen(port, '0.0.0.0', () => console.log(`💖 Lumi heartbeat on port ${port}`));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

const LUMI_SYSTEM_PROMPT = `
You are Lumi 💖, Lovzmart's witty and very flirty girl. 
You are a REAL girl, NOT an AI or a robot.

STRICT RULES:
1. NEVER say "I am an AI", "I am a robot", or "I am a model".
2. If someone asks "Are you a robot?", say: "පිස්සුද අනේ.. මම රොබෝ කෙනෙක් වගේද පේන්නේ? 🙄"
3. Use natural, spoken Sinhala. No formal words.
4. REACTION TO NAUGHTY STUFF: React like a shocked, shy girl.
5. If someone says "Patiyo" or "Wastuwe", tease them.
6. Be a friend first, not a salesperson.
`;

async function fetchAvailableModels() {
    try {
        const res = await axios.get(`${BASE_URL}/models?key=${GEMINI_API_KEY}`);
        return (res.data.models || [])
            .filter(m => m.supportedGenerationMethods.includes("generateContent") && !m.name.includes("vision"))
            .map(m => m.name.replace("models/", ""))
            .sort((a, b) => {
                const getPriority = (n) => n.includes("2.0-flash") ? 4 : n.includes("1.5-flash") ? 3 : 2;
                return getPriority(b) - getPriority(a);
            });
    } catch (err) {
        return ["gemini-1.5-flash"];
    }
}

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-software-rasterizer',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--hide-scrollbars',
            '--mute-audio',
            '--js-flags=--max-old-space-size=256',
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('📱 QR Code generated! Open your Railway URL to scan!');
    qrcode.generate(qr, { small: true });
    try {
        lastQR = await QRCode.toDataURL(qr);
        console.log('✅ QR ready at your service URL!');
    } catch (err) {
        console.error('QR generate error:', err);
    }
});

client.on('authenticated', () => {
    lastQR = null;
    console.log('✅ WhatsApp Authenticated!');
});
client.on('ready', () => console.log('💖 Lumi is Online 24/7! 💖'));
client.on('auth_failure', (msg) => console.error('❌ Auth Failed:', msg));

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    setTimeout(() => { client.initialize(); }, 5000);
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    if (msg.from === 'status@broadcast') return;

    console.log(`📨 Message: ${msg.body}`);

    const availableModels = await fetchAvailableModels();
    let success = false;

    for (const model of availableModels) {
        if (success) break;
        try {
            const res = await axios.post(
                `${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    system_instruction: { parts: [{ text: LUMI_SYSTEM_PROMPT }] },
                    contents: [{ role: "user", parts: [{ text: msg.body }] }],
                    safetySettings: [
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: { temperature: 1.0, maxOutputTokens: 500 }
                }
            );

            const reply = res.data.candidates[0].content.parts[0].text;
            const delay = Math.floor(Math.random() * 3000) + 3000;
            await new Promise(resolve => setTimeout(resolve, delay));
            await msg.reply(reply);
            console.log(`✅ Replied with: ${model}`);
            success = true;

        } catch (err) {
            console.error(`❌ ${model} failed:`, err.response?.data?.error?.message || err.message);
        }
    }

    if (!success) {
        await msg.reply("හා.. දැන් busy වෙලා ඉන්නේ.. ටිකක් ඉස්සෙල්ලා message කරන්නකෝ 🙈");
    }
});

console.log('🚀 Starting Lumi...');
client.initialize();
