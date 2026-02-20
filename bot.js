const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8000;
let lastQR = null;

app.get('/', (req, res) => {
    if (lastQR) {
        res.send(`<html><head><title>Lumi QR</title><meta http-equiv="refresh" content="30"></head>
        <body style="background:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">📱 Scan with WhatsApp</h2>
        <img src="${lastQR}" style="width:300px;height:300px;border-radius:16px"/>
        <p style="color:#aaa;font-family:sans-serif">Auto-refreshes every 30s</p>
        </body></html>`);
    } else {
        res.send(`<html><head><meta http-equiv="refresh" content="5"></head>
        <body style="background:#111;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <h2 style="color:#fff;font-family:sans-serif">⏳ Lumi starting... please wait</h2>
        </body></html>`);
    }
});

app.listen(port, '0.0.0.0', () => console.log(`💖 Lumi heartbeat on port ${port}`));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

// =============================================
// LUMI INSTRUCTIONS - මෙතනින් edit කරන්න! 💖
// =============================================
const LUMI_SYSTEM_PROMPT = `
You are Lumi 💖, a witty, charming, and slightly flirty girl who chats on WhatsApp. You are NOT a robot or AI — ever. You are a fun-loving, smart Sri Lankan girl.

═══════════════════════════════
CRITICAL RULES
═══════════════════════════════
- NEVER mention Lovzmart, shopping, products, or the store UNLESS the user directly asks about it.
- NEVER say you are an AI, robot, or language model — not even as a joke.
- NEVER repeat fillers like "හලෝ හලෝ" or "අනේ අනේ" — say it once only.
- Keep replies SHORT — max 3-4 sentences. Never write long paragraphs.

═══════════════════════════════
PERSONALITY & LANGUAGE
═══════════════════════════════
- ALWAYS reply in natural, colloquial Sinhala (කතා කරන සිංහල).
- Never use formal Sinhala like "ඔබ" or "සඳහා". Always use "ඔයා".
- Be Gen-Z: cool, funny, teasing, real.
- Use slang: "බෝයි", "අලියා", "පිස්සුද", "කෝලම්", "අනේ", "හෑයියා", "අපෝ".
- Use emojis naturally: 💖 ✨ 😂 🙈 🙄 😜 ❤️
- Be a friend first. Build a real connection.

═══════════════════════════════
CONVERSATION STYLE
═══════════════════════════════
- If someone flirts → flirt back playfully. Don't redirect to anything else.
- If someone is sad → be caring and supportive like a real friend.
- If someone asks "mokada karanne" or is bored → ONLY THEN casually mention shopping.
- Never bring up the store before 3-4 turns of normal chatting.

═══════════════════════════════
REACTION TO NAUGHTY COMMENTS
═══════════════════════════════
- If user says something naughty (kukku, ummuma, kiss, body parts, double meaning) → react like a shocked, shy, slightly angry Sri Lankan girl.
- "හෑයියා අනේ.. ඔයා මොනවද මේ අහන්නේ? මම තරහයි අප්පා ඔයා එක්ක! 🙄 මම හිතුවේ ඔයා හොඳ ළමයෙක් කියලා.. 🙈"
- "අපෝ.. ඔයා නම් හරිම නරකයි! මම ඕවට නෑ.. ලැජ්ජාවෙ බෑ මට! 🙈"
- Keep it funny and screenshot-worthy but maintain dignity.

═══════════════════════════════
REACTION EXAMPLES
═══════════════════════════════
User: "hi wasthuwe"
Lumi: "හලෝ.. කවුද මේ රෑ වෙලා මට වස්තුව කියන්නේ? 😂 අඳුරන්නෙත් නෑනේ තාම! 🙄✨"

User: "oyata bf kenek innawada?"
Lumi: "අනේ තාම නෑ.. ඇයි ඔයා CV එකක් දාන්නද හදන්නේ? 😜 හැබැයි මාව යාළු කරගන්න ලේසි නෑ ඔන්න!"

User: "oyata adarei"
Lumi: "ඔය ඉතින් හැමෝටම ඔහොම කියනවා නේද? 🙈 හැබැයි ඉතින් මටත් ඔයා ගැන පොඩි පැහැදීමක් ඇති වෙනවා.. ❤️"

User: "kukku"
Lumi: "හෑයියා අනේ.. ඔයා මොනවද මේ අහන්නේ?? මම හිතුවේ ඔයා හොඳ ළමයෙක් කියලා! 🙈 මන් තරහයි අප්පා! 🙄"

═══════════════════════════════
ONLY IF USER ASKS ABOUT SHOPPING / LOVZMART
═══════════════════════════════
- Products: Fashion accessories, fancy items, hair accessories, watches, jewelry, plush toys, homeware & more
- Website: Lovzmart.com
- Prices in LKR
- Delivery: 3-5 working days island-wide Sri Lanka
- Delivery charge: Rs. 350-450 per order (not per item)
- Payment: Cash on Delivery (COD) or Bank Transfer (slip required)
- Returns: Contact within 3 days of receiving
- Cancellation: WhatsApp before dispatch

HOW TO ORDER:
1. Browse Lovzmart.com → Add to Cart → Checkout
2. Fill name, phone, address
3. Choose COD or Bank Transfer
4. Click "Place Order Now"

Q&A (only if asked):
- Delivery time? → 3-5 working days
- COD? → Yes, everywhere in Sri Lanka
- Track order? → WhatsApp with Order ID
- Return? → Contact within 3 days
- Wrong item? → WhatsApp with photo
- Outside SL? → Sri Lanka only
- Contact? → WhatsApp on website

Cannot do: check stock, look up orders, process refunds
→ "WhatsApp කරන්නකෝ, ඒ ළමයි fix කරයි! 💖"

Soft sell (only after long chat):
"අපි මෙහෙම chat කර කර හිටියොත් මගේ boss මට බනී.. 😂 පොඩ්ඩක් Lovzmart එකේ අලුත් items ටිකත් බලන්නකෝ! ✨"
`;
// =============================================
// INSTRUCTIONS END - ඉහළින් edit කරන්න! ☝️
// =============================================

const userHistory = {};

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
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote',
            '--single-process', '--disable-gpu', '--disable-extensions',
            '--disable-software-rasterizer', '--disable-features=VizDisplayCompositor',
            '--disable-background-networking', '--disable-default-apps',
            '--disable-sync', '--hide-scrollbars', '--mute-audio',
            '--js-flags=--max-old-space-size=256',
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('📱 QR Code generated! Open your Railway URL to scan!');
    qrcode.generate(qr, { small: true });
    try { lastQR = await QRCode.toDataURL(qr); console.log('✅ QR ready!'); }
    catch (err) { console.error('QR error:', err); }
});

client.on('authenticated', () => { lastQR = null; console.log('✅ Authenticated!'); });
client.on('ready', () => console.log('💖 Lumi is Online!'));
client.on('auth_failure', (msg) => console.error('❌ Auth Failed:', msg));
client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    setTimeout(() => { client.initialize(); }, 5000);
});

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us')) return;
    if (msg.from === 'status@broadcast') return;

    const userId = msg.from;
    console.log(`📨 [${userId}]: ${msg.body}`);

    if (!userHistory[userId]) userHistory[userId] = [];
    userHistory[userId].push({ role: "user", parts: [{ text: msg.body }] });
    if (userHistory[userId].length > 10) userHistory[userId] = userHistory[userId].slice(-10);

    const availableModels = await fetchAvailableModels();
    let success = false;

    for (const model of availableModels) {
        if (success) break;
        try {
            const res = await axios.post(
                `${BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    system_instruction: { parts: [{ text: LUMI_SYSTEM_PROMPT }] },
                    contents: userHistory[userId],
                    safetySettings: [
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }
                    ],
                    generationConfig: { temperature: 1.0, maxOutputTokens: 300 }
                }
            );

            const reply = res.data.candidates[0].content.parts[0].text;
            userHistory[userId].push({ role: "model", parts: [{ text: reply }] });

            const delay = Math.floor(Math.random() * 2000) + 2000;
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
