const { Client, GatewayIntentBits, ActivityType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');

// Inicjalizacja bazy danych – plik warns.db jest trwały, więc dane pozostaną po restarcie bota
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

    // Komenda ?help – wyświetla listę dostępnych komend w embedzie
    if (message.content.startsWith('?help')) {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Lista komend')
            .setDescription('Poniżej znajduje się spis dostępnych komend oraz ich opis:')
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        helpEmbed.addFields(
            { name: '?warn @użytkownik [powód]', value: 'Nadaje warn użytkownikowi. Jeśli powód nie zostanie podany, używany jest "Brak powodu". W zależności od liczby warnów mogą być nakładane kary.', inline: false },
            { name: '?warn list @użytkownik', value: 'Wyświetla listę warnów, powodów oraz timeoutów dla wskazanego użytkownika.', inline: false },
            { name: '?remove warn @użytkownik [liczba]', value: 'Odbiera warny użytkownikowi. Jeśli liczba nie zostanie podana, domyślnie odbiera 1 warn.', inline: false },
            { name: '?timeout @użytkownik <czas>', value: 'Nadaje timeout użytkownikowi. Przykład: ?timeout @nazwa 10s (10 sekund), 5m (5 minut), 2h (2 godziny).', inline: false },
            { name: '?kick @użytkownik [powód]', value: 'Wyrzuca użytkownika z serwera z opcjonalnym podaniem powodu.', inline: false },
            { name: '?ban @użytkownik [powód]', value: 'Banuje użytkownika z serwera z opcjonalnym podaniem powodu.', inline: false },
            { name: '?taryfikator', value: 'Wyświetla taryfikator kar, czyli jaka kara przypada na daną liczbę warnów.', inline: false },
            { name: '?help', value: 'Wyświetla tę pomoc.', inline: false }
        );

        return message.channel.send({ embeds: [helpEmbed] });
    }

    // Komenda ?warn @nazwa [powód]
    if (message.content.startsWith('?warn') && !message.content.includes('list')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }

        const args = message.content.split(' ');
        const user = message.mentions.members.first();

        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        const reason = args.slice(2).join(' ') || "Brak powodu";  // Domyślny powód

        // Pobranie aktualnej liczby warnów
        let data = db.prepare("SELECT count FROM warnings WHERE userId = ?").get(user.id);
        let warns = data ? data.count : 0;

        warns++; // Dodajemy warn

        // Zapis do bazy danych – aktualizacja liczby warnów
        db.prepare("INSERT INTO warnings (userId, count) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET count = ?")
            .run(user.id, warns, warns);

        // Zapis powodu do bazy danych – każdy warn jest dodawany jako osobny rekord
        db.prepare("INSERT INTO reasons (userId, reason, date) VALUES (?, ?, ?)").run(user.id, reason, Date.now());

        // Tworzenie embed z informacją o warnie
        const warnEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`Ostrzeżenie dla ${user.user.tag}`)
            .setDescription(`${user} otrzymał warna! Ma teraz ${warns} ${getWarnDeclension(warns)}.\nPowód: ${reason}`)
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        message.channel.send({ embeds: [warnEmbed] });

        // Nakładanie kar w zależności od liczby warnów
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

    // Komenda ?remove warn – usuwa warny użytkownikowi
    if (message.content.startsWith('?remove warn')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }

        const args = message.content.split(' ');
        const user = message.mentions.members.first();
        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Opcjonalnie: liczba warnów do usunięcia, domyślnie 1
        let removeCount = parseInt(args[2]);
        if (isNaN(removeCount) || removeCount < 1) {
            removeCount = 1;
        }

        // Pobranie aktualnej liczby warnów
        let data = db.prepare("SELECT count FROM warnings WHERE userId = ?").get(user.id);
        let currentWarns = data ? data.count : 0;

        if (currentWarns === 0) {
            return message.reply(`${user} nie ma żadnych warnów.`);
        }

        // Obliczamy nową liczbę warnów
        let newWarns = currentWarns - removeCount;
        if (newWarns < 0) newWarns = 0;

        // Aktualizacja liczby warnów w bazie danych
        db.prepare("INSERT INTO warnings (userId, count) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET count = ?")
            .run(user.id, newWarns, newWarns);

        // Usuwamy ostatnie rekordy z tabeli reasons, odpowiadające usuwanym warnom
        const reasons = db.prepare("SELECT rowid, date FROM reasons WHERE userId = ? ORDER BY date DESC").all(user.id);
        let removed = 0;
        for (let reason of reasons) {
            if (removed >= removeCount) break;
            db.prepare("DELETE FROM reasons WHERE rowid = ?").run(reason.rowid);
            removed++;
        }

        const removeEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`Usunięto warny dla ${user.user.tag}`)
            .setDescription(`Usunięto ${removed} ${getWarnDeclension(removed)}.\nAktualna liczba warnów: ${newWarns}`)
            .setFooter({ text: "© tajgerek" })
            .setTimestamp();

        message.channel.send({ embeds: [removeEmbed] });
    }

    // Komenda ?timeout – nadaje timeout użytkownikowi na określony czas
    if (message.content.startsWith('?timeout')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }

        const args = message.content.split(' ');
        const user = message.mentions.members.first();
        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Spodziewamy się, że trzeci argument to czas w formacie liczba+jednostka (s, m, h)
        const timeArg = args[2];
        if (!timeArg) return message.reply("Podaj czas timeoutu (np. 10s, 5m, 2h)!");

        // Wydzielamy liczbę i jednostkę
        const unit = timeArg.slice(-1);
        const amountStr = timeArg.slice(0, -1);
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount < 1) {
            return message.reply("Podaj poprawną liczbę dla timeoutu.");
        }

        let multiplier;
        if (unit === 's') {
            multiplier = 1000;
        } else if (unit === 'm') {
            multiplier = 60000;
        } else if (unit === 'h') {
            multiplier = 3600000;
        } else {
            return message.reply("Podaj poprawną jednostkę czasu: s (sekundy), m (minuty), h (godziny).");
        }

        const duration = amount * multiplier;

        try {
            await user.timeout(duration, `Timeout na ${timeArg}`);
            const timeoutStart = Date.now();
            const timeoutEnd = timeoutStart + duration;
            db.prepare("INSERT INTO timeouts (userId, startDate, endDate) VALUES (?, ?, ?)").run(user.id, timeoutStart, timeoutEnd);
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Timeout dla ${user.user.tag}`)
                .setDescription(`${user} otrzymał timeout na ${timeArg}!`)
                .setFooter({ text: "© tajgerek" })
                .setTimestamp();
            message.channel.send({ embeds: [timeoutEmbed] });
        } catch (err) {
            console.error(err);
            message.channel.send("Nie udało się nadać timeouta.");
        }
    }

    // Komenda ?kick – wyrzuca użytkownika z serwera z opcjonalnym powodem
    if (message.content.startsWith('?kick')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }
        
        const args = message.content.split(' ');
        const user = message.mentions.members.first();
        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Pobieramy powód, jeśli został podany, lub ustawiamy domyślnie "Brak powodu"
        const reason = args.slice(2).join(' ') || "Brak powodu";

        try {
            await user.kick(reason);
            const kickEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle(`Wyrzucenie użytkownika`)
                .setDescription(`${user} został wyrzucony z serwera.\nPowód: ${reason}`)
                .setFooter({ text: "© tajgerek" })
                .setTimestamp();
            message.channel.send({ embeds: [kickEmbed] });
        } catch (err) {
            console.error(err);
            message.channel.send("Nie udało się wyrzucić użytkownika.");
        }
    }

    // Komenda ?ban – banuje użytkownika z serwera z opcjonalnym powodem
    if (message.content.startsWith('?ban')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply("Nie masz uprawnień do używania tej komendy.");
        }
        
        const args = message.content.split(' ');
        const user = message.mentions.members.first();
        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Pobieramy powód, jeśli został podany, lub ustawiamy domyślnie "Brak powodu"
        const reason = args.slice(2).join(' ') || "Brak powodu";

        try {
            await user.ban({ reason: reason });
            const banEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`Ban użytkownika`)
                .setDescription(`${user} został zbanowany z serwera.\nPowód: ${reason}`)
                .setFooter({ text: "© tajgerek" })
                .setTimestamp();
            message.channel.send({ embeds: [banEmbed] });
        } catch (err) {
            console.error(err);
            message.channel.send("Nie udało się zbanować użytkownika.");
        }
    }

    // Komenda ?warn list – pobiera dane z bazy, dzięki czemu dane pozostają po restarcie bota
    if (message.content.startsWith('?warn list')) {
        const args = message.content.split(' ');
        const user = message.mentions.members.first();

        if (!user) return message.reply("Musisz oznaczyć użytkownika!");

        // Pobranie liczby warnów
        let data = db.prepare("SELECT count FROM warnings WHERE userId = ?").get(user.id);
        let warns = data ? data.count : 0;

        // Pobranie wszystkich powodów z bazy
        const reasons = db.prepare("SELECT reason, date FROM reasons WHERE userId = ?").all(user.id);

        // Pobranie informacji o timeoutach
        const timeoutData = db.prepare("SELECT startDate, endDate FROM timeouts WHERE userId = ?").all(user.id);

        // Tworzymy embed z informacjami
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

    // Komenda ?taryfikator – wyświetla taryfikator kar pobrany z bazy danych
    if (message.content.startsWith('?taryfikator')) {
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
