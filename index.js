const { Client, GatewayIntentBits, ActivityType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');

// Inicjalizacja bazy danych
const db = new Database('warns.db');
db.prepare("CREATE TABLE IF NOT EXISTS warnings (userId TEXT PRIMARY KEY, count INTEGER)").run();
db.prepare("CREATE TABLE IF NOT EXISTS reasons (userId TEXT, reason TEXT, date INTEGER)").run();
db.prepare("CREATE TABLE IF NOT EXISTS timeouts (userId TEXT, startDate INTEGER, endDate INTEGER)").run();  // Nowa tabela na timeouty

// Funkcja do odmiany słowa "warn"
function getWarnDeclension(count) {
    if (count === 1) {
        return "warn";
    } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) {
        return "warny";
    } else {
        return "warnów";
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);

    // Status bota
    client.user.setActivity("cinamoinka", {
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/cinamoinka"
    });
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Komenda ?warn @nazwa powód
    if (message.content.startsWith('?warn') && !message.content.includes('list')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }

        const args = message.content.split(' ');
        const user = message.mentions.members.first();

        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        const reason = args.slice(2).join(' ') || "Brak powodu";  // Jeżeli brak powodu, domyślnie "Brak powodu"

        // Pobranie liczby warnów
        let data = db.prepare("SELECT count FROM warnings WHERE userId = ?").get(user.id);
        let warns = data ? data.count : 0;

        warns++; // Dodajemy warn

        // Zapis do bazy danych dla liczby warnów
        db.prepare("INSERT INTO warnings (userId, count) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET count = ?")
            .run(user.id, warns, warns);

        // Zapis powodu do bazy danych
        db.prepare("INSERT INTO reasons (userId, reason, date) VALUES (?, ?, ?)").run(user.id, reason, Date.now());

        // Tworzenie embed dla ostrzeżenia
        const warnEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // Kolor czerwony
            .setTitle(`Ostrzeżenie dla ${user.user.tag}`)
            .setDescription(`${user} otrzymał warna! Ma teraz ${warns} ${getWarnDeclension(warns)}.\nPowód: ${reason}`)
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        message.channel.send({ embeds: [warnEmbed] });

        // W zależności od liczby warnów, nakładamy odpowiednią karę
        if (warns === 2) {
            // Timeout na 1 godzinę
            try {
                await user.timeout(3600000, "Osiągnięto 2 warny"); // 1 godzina = 3600000 ms
                const timeoutStart = Date.now();
                const timeoutEnd = timeoutStart + 3600000;
                db.prepare("INSERT INTO timeouts (userId, startDate, endDate) VALUES (?, ?, ?)").run(user.id, timeoutStart, timeoutEnd);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`Timeout dla ${user.user.tag}`)
                    .setDescription(`${user} otrzymał timeout na 1 godzinę za 2 warny!`)
                    .setFooter({ text: "© tajgerek" })
                    .setTimestamp();
                message.channel.send({ embeds: [timeoutEmbed] });
            } catch (err) {
                console.error(err);
                message.channel.send("Nie udało się nadać timeouta.");
            }
        } else if (warns === 3) {
            // Timeout na 12 godzin
            try {
                await user.timeout(43200000, "Osiągnięto 3 warny"); // 12 godzin = 43200000 ms
                const timeoutStart = Date.now();
                const timeoutEnd = timeoutStart + 43200000;
                db.prepare("INSERT INTO timeouts (userId, startDate, endDate) VALUES (?, ?, ?)").run(user.id, timeoutStart, timeoutEnd);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`Timeout dla ${user.user.tag}`)
                    .setDescription(`${user} otrzymał timeout na 12 godzin za 3 warny!`)
                    .setFooter({ text: "© tajgerek" })
                    .setTimestamp();
                message.channel.send({ embeds: [timeoutEmbed] });
            } catch (err) {
                console.error(err);
                message.channel.send("Nie udało się nadać timeouta.");
            }
        } else if (warns === 4) {
            // Timeout na 24 godziny
            try {
                await user.timeout(86400000, "Osiągnięto 4 warny"); // 24 godziny = 86400000 ms
                const timeoutStart = Date.now();
                const timeoutEnd = timeoutStart + 86400000;
                db.prepare("INSERT INTO timeouts (userId, startDate, endDate) VALUES (?, ?, ?)").run(user.id, timeoutStart, timeoutEnd);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`Timeout dla ${user.user.tag}`)
                    .setDescription(`${user} otrzymał timeout na 24 godziny za 4 warny!`)
                    .setFooter({ text: "© tajgerek" })
                    .setTimestamp();
                message.channel.send({ embeds: [timeoutEmbed] });
            } catch (err) {
                console.error(err);
                message.channel.send("Nie udało się nadać timeouta.");
            }
        } else if (warns === 5) {
            // Timeout na 1 tydzień
            try {
                await user.timeout(604800000, "Osiągnięto 5 warnów"); // 1 tydzień = 604800000 ms
                const timeoutStart = Date.now();
                const timeoutEnd = timeoutStart + 604800000;
                db.prepare("INSERT INTO timeouts (userId, startDate, endDate) VALUES (?, ?, ?)").run(user.id, timeoutStart, timeoutEnd);
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`Timeout dla ${user.user.tag}`)
                    .setDescription(`${user} otrzymał timeout na 1 tydzień za 5 warnów!`)
                    .setFooter({ text: "© tajgerek" })
                    .setTimestamp();
                message.channel.send({ embeds: [timeoutEmbed] });
            } catch (err) {
                console.error(err);
                message.channel.send("Nie udało się nadać timeouta.");
            }
        } else if (warns === 6) {
            // Ban użytkownika
            try {
                await user.ban({ reason: "Osiągnięto 6 warnów" });
                const banEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`Ban dla ${user.user.tag}`)
                    .setDescription(`${user} został zbanowany za 6 warnów!`)
                    .setFooter({ text: "© tajgerek" })
                    .setTimestamp();
                message.channel.send({ embeds: [banEmbed] });
            } catch (err) {
                console.error(err);
                message.channel.send("Nie udało się zbanować użytkownika.");
            }
        }
    }

    // Komenda ?warn list
    if (message.content.startsWith('?warn list')) {
        const args = message.content.split(' ');
        const user = message.mentions.members.first();

        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Pobranie liczby warnów
        let data = db.prepare("SELECT count FROM warnings WHERE userId = ?").get(user.id);
        let warns = data ? data.count : 0;

        // Pobranie wszystkich powodów dla tego użytkownika
        const reasons = db.prepare("SELECT reason, date FROM reasons WHERE userId = ?").all(user.id);

        // Pobranie informacji o timeoutach
        const timeoutData = db.prepare("SELECT startDate, endDate FROM timeouts WHERE userId = ?").all(user.id);

        // Tworzymy embed z informacjami o warnach
        const listEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`Lista warnów dla ${user.user.tag}`)
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        if (reasons.length > 0) {
            reasons.forEach((row, index) => {
                let reasonText = row.reason || "Brak";
                listEmbed.addFields({
                    name: `${index + 1} ${getWarnDeclension(index + 1)}`,
                    value: `Data: <t:${Math.floor(row.date / 1000)}:D>\nPowód: ${reasonText}`,
                    inline: false
                });
            });
        } else {
            listEmbed.addFields({
                name: "Brak warnów",
                value: "Ten użytkownik nie ma żadnych warnów.",
                inline: false
            });
        }

        // Jeśli użytkownik miał kiedykolwiek timeout
        if (timeoutData.length > 0) {
            timeoutData.forEach((timeout, index) => {
                let startDate = new Date(timeout.startDate);
                let endDate = new Date(timeout.endDate);
                listEmbed.addFields({
                    name: `Timeout #${index + 1}`,
                    value: `Od: <t:${Math.floor(startDate.getTime() / 1000)}:D>\nDo: <t:${Math.floor(endDate.getTime() / 1000)}:D>`,
                    inline: false
                });
            });
        } else {
            listEmbed.addFields({
                name: "Brak timeoutów",
                value: "Ten użytkownik nigdy nie miał timeoutu.",
                inline: false
            });
        }

        message.channel.send({ embeds: [listEmbed] });
    }

    // Komenda ?taryfikator
    if (message.content.startsWith('?taryfikator')) {
        // Definicja taryfikatora kar: ile warnów = jaka kara
        const tariffMapping = [
            { warns: 1, punishment: 'Brak kary (tylko ostrzeżenie)' },
            { warns: 2, punishment: 'Timeout na 1 godzinę' },
            { warns: 3, punishment: 'Timeout na 12 godzin' },
            { warns: 4, punishment: 'Timeout na 24 godziny' },
            { warns: 5, punishment: 'Timeout na 1 tydzień' },
            { warns: 6, punishment: 'Ban (do odwołania)' }
        ];

        const tariffEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('Taryfikator kar')
            .setDescription('Ile warnów = jaka kara')
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        tariffMapping.forEach(mapping => {
            tariffEmbed.addFields({
                name: `${mapping.warns} ${getWarnDeclension(mapping.warns)}`,
                value: `${mapping.punishment}`,
                inline: false
            });
        });

        message.channel.send({ embeds: [tariffEmbed] });
    }
});

client.login(process.env.TOKEN);
