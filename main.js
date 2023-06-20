const telegram = require('telegraf');
const cron = require("node-cron");
const fetch = require('sync-fetch')
const config = require('./Config.json');
const diaboloBossData = {'name': '', 'time': '', 'currentTime': '','spawnTime': ''};

function fetchData() {
    try {
        const response = fetch(config.api_url).json();
        return response;
    } catch (error) {
        console.log(error);
    }
}

function getSpawnTime(minutes) {
    const currentTime = new Date();
    // Calc Time with extra Minutes
    const futureTime = new Date(currentTime.getTime() + minutes * 60000);
    const spawnTime = futureTime.toLocaleTimeString();

    return {'current': currentTime.toLocaleTimeString(), 'spawn': spawnTime};
}

function processBossData(data) {
    let spawnData = getSpawnTime(data.time);
    diaboloBossData.name = data.name;
    diaboloBossData.time = data.time;
    diaboloBossData.currentTime = spawnData.current;
    diaboloBossData.spawnTime = spawnData.spawn
}

function checkBossSpawn() {
    const fetchedData = fetchData();
    processBossData(fetchedData);
}

if (config.bot.token === undefined) {
    throw new Error("Bot Token must be provided");
}
const bot = new telegram.Telegraf(config.bot.token);

// refresh every 2 hours
cron.schedule(
    `0 1 * * *`,
    function () {
        checkBossSpawn();
        if(diaboloBossData.spawnTime <= 60) {
            sendInfoAuto(bot);
        }
    },
    {
        timezone: "Europe/Berlin",
    }
);

function sendInfoAuto(bot) {
    bot.telegram.sendMessage(config.bot.chat_id, `Boss Name: ${diaboloBossData.name}\nCurrent Time: ${diaboloBossData.currentTime}\nEstimated Time of Arrival: ${diaboloBossData.spawnTime}`);
}

function sendInfo(ctx) {
    checkBossSpawn();
    let chat_id = ctx.chat.id;
    ctx.telegram.sendMessage(chat_id,`Boss Name: ${diaboloBossData.name}\nCurrent Time: ${diaboloBossData.currentTime}\nEstimated Time of Arrival: ${diaboloBossData.spawnTime}`);
}

bot.launch().then(checkBossSpawn());
console.log("Bot started");

bot.command("boss", (ctx) => sendInfo(ctx));
bot.command("info", (ctx) => ctx.reply(`Our ChatId: ${ctx.chat.id}`));
bot.command("source", (ctx) => ctx.reply(`Current Source Code: https://github.com/0xMDIV/diabolo_world_boss_tg_bot/tree/main`));


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));