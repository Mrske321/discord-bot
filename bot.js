const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = "YOUR TOKEN"; // Ubaci svoj bot token ovde
const forbiddenWords = ["kaladont"];
let lastWord = "";
let gameActive = false;
let gameChannel = null;
let lastPlayer = "";
let usedWords = new Map();
let playerPoints = new Map();
const commandList = ["!status", "!tabela", "!pomoć", "!pravila", "!stop", "!setchannel"];

client.once('ready', () => {
    console.log(`✅ Bot je online kao ${client.user.tag}!`);
});

client.on('messageCreate', message => {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();

    // 📌 Podešavanje kanala za igru
    if (content.startsWith("!setchannel")) {
        if (!message.mentions.channels.first()) {
            message.channel.send("⚠️ **Morate označiti kanal!** Primer: `!setchannel #kaladont-kanal`");
            return;
        }
        gameChannel = message.mentions.channels.first().id;
        message.channel.send(`✅ **Igra Kaladont će se igrati u kanalu <#${gameChannel}>!**`);
        return;
    }

    // 📌 Provera da li je igra pokrenuta
    if (!gameChannel) return;
    if (message.channel.id !== gameChannel) return;

    // 📌 START igre
    if (content === "!start kaladont") {
        if (gameActive) {
            message.channel.send("⚠️ Igra je već u toku!");
        } else {
            gameActive = true;
            lastWord = "";
            lastPlayer = "";
            usedWords.clear();
            playerPoints.clear();
            message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎮 Igra Kaladont je počela!")
                    .setDescription("Pošaljite prvu reč.")]
            });
        }
        return;
    }

    // 📌 STOP igre
    if (content === "!stop") {
        if (!gameActive) {
            message.channel.send("⚠️ Igra nije u toku!");
        } else {
            gameActive = false;
            message.channel.send("🛑 **Igra je prekinuta!**");
        }
        return;
    }

    // 📌 Obrada komandi (ne smeju remetiti igru)
    if (commandList.includes(content)) {
        handleCommand(message, content);
        return;
    }

    // 📌 Logika igre (ako je igra aktivna)
    if (gameActive) {
        playGame(message, content);
    }
});

// 📌 Funkcija za obradu komandi
function handleCommand(message, command) {
    if (command === "!status") {
        if (!gameActive) {
            message.channel.send("⚠️ Igra nije u toku!");
            return;
        }

        const nextLetters = lastWord.slice(-2).toUpperCase();
        const possibleWords = Math.floor(Math.random() * 300) + 1;

        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Blue")
                .setTitle("🎮 Trenutno stanje igre")
                .addFields(
                    { name: "Trenutna reč", value: lastWord ? `${lastWord.toUpperCase()}` : "Nema još unetih reči", inline: false },
                    { name: "📚 Mogućih reči za nastavak", value: `${possibleWords}`, inline: true },
                    { name: "➡️ Sledeća reč mora početi sa", value: `__${nextLetters}__`, inline: false }
                )]
        });
    }

    if (command === "!tabela") {
        if (playerPoints.size === 0) {
            message.channel.send("🏆 Nema trenutno upisanih poena!");
            return;
        }
        let leaderboard = Array.from(playerPoints.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id, points], index) => `**${index + 1}.** <@${id}> - **${points} poena**`)
            .join("\n");

        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Gold")
                .setTitle("🏆 Tabela najboljih igrača")
                .setDescription(leaderboard)]
        });
    }

    if (command === "!pomoć") {
        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Blue")
                .setTitle("📚 Pomoć za Kaladont Bot")
                .addFields(
                    { name: "🎮 !start kaladont", value: "Pokreće novu igru", inline: false },
                    { name: "🔄 !status", value: "Prikazuje trenutno stanje igre", inline: false },
                    { name: "📜 !pravila", value: "Prikazuje pravila igre", inline: false },
                    { name: "❌ !stop", value: "Prekida igru", inline: false },
                    { name: "🏆 !tabela", value: "Prikazuje bodove igrača", inline: false },
                    { name: "📌 !setchannel", value: "Podešava kanal za igru", inline: false }
                )]
        });
    }

    if (command === "!pravila") {
        message.channel.send({
            embeds: [new EmbedBuilder()
                .setColor("Green")
                .setTitle("📜 Pravila igre Kaladont")
                .setDescription(
                    "**1.** Igrač mora uneti reč koja počinje sa poslednja dva slova prethodne reči.\n" +
                    "**2.** Reči se ne smeju ponavljati.\n" +
                    "**3.** Igrač ne sme igrati dva puta za redom.\n" +
                    "**4.** Ako igrač napiše reč *Kaladont*, on pobeđuje i igra se završava.\n" +
                    "**5.** Svaka ispravna reč donosi nasumičan broj poena.\n" +
                    "**6.** Pobednik je onaj sa najviše poena ili onaj koji napiše *Kaladont*!"
                )]
        });
    }
}

// 📌 Funkcija za igranje igre
function playGame(message, word) {
    if (forbiddenWords.includes(word)) {
        message.channel.send(`🎉 **${message.author.username}** je rekao **"kaladont"**! Igra je gotova!`);
        gameActive = false;
        return;
    }

    if (lastPlayer === message.author.id) {
        message.channel.send("⚠️ Ne možete igrati dva puta za redom!");
        return;
    }

    if (usedWords.has(word)) {
        let usedBy = usedWords.get(word);
        message.channel.send(`⚠️ Reč **${word.toUpperCase()}** je već korišćena! Iskoristio ju je <@${usedBy}>.`);
        return;
    }

    if (lastWord && !word.startsWith(lastWord.slice(-2))) {
        message.channel.send(`⚠️ **"${word}"** nije validan nastavak od **"${lastWord}"**! Probajte ponovo.`);
        return;
    }

    usedWords.set(word, message.author.id);
    lastWord = word;
    lastPlayer = message.author.id;
    const nextLetters = lastWord.slice(-2).toUpperCase();
    let points = Math.floor(Math.random() * 10) + 1;
    playerPoints.set(message.author.id, (playerPoints.get(message.author.id) || 0) + points);

    message.channel.send({
        embeds: [new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Reč prihvaćena!")
            .setDescription(`**Trenutna reč:** ${lastWord.toUpperCase()}`)
            .addFields({ name: "➡️ Sledeća reč mora početi sa", value: `__${nextLetters}__` })]
    });
}

client.login(token);
