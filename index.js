import axios from 'axios';
import readlineSync from 'readline-sync';
import momentTimezone from 'moment-timezone';
import fs from 'fs';
import chalk from 'chalk';

const saiki = momentTimezone().tz('Asia/Jakarta').format('HH:mm:ss');
const header = chalk.bgMagenta.white(`[ ${saiki} ]`);
const inicranjg = chalk.whiteBright('Ardiyan Mahessa - SurrealFlux');
const asciiArt = chalk.magenta(`  █████▒██▓ ██▀███  ▓█████ ▄████▄  ▒█████   ██▓ ███▄    █ 
▓██   ▒▓██▒▓██ ▒ ██▒▓█   ▀▒██▀ ▀█ ▒██▒  ██▒▓██▒ ██ ▀█   █ 
▒████ ░▒██▒▓██ ░▄█ ▒▒███  ▒▓█    ▄▒██░  ██▒▒██▒▓██  ▀█ ██▒
░▓█▒  ░░██░▒██▀▀█▄  ▒▓█  ▄▒▓▓▄ ▄██▒██   ██░░██░▓██▒  ▐▌██▒
░▒█░   ░██░░██▓ ▒██▒░▒████▒ ▓███▀ ░ ████▓▒░░██░▒██░   ▓██░
 ▒ ░   ░▓  ░ ▒▓ ░▒▓░░░ ▒░ ░ ░▒ ▒  ░ ▒░▒░▒░ ░▓  ░ ▒░   ▒ ▒ 
 ░      ▒ ░  ░▒ ░ ▒░ ░ ░  ░ ░  ▒    ░ ▒ ▒░  ▒ ░░ ░░   ░ ▒░
 ░ ░    ▒ ░  ░░   ░    ░  ░       ░ ░ ░ ▒   ▒ ░   ░   ░ ░ 
        ░     ░        ░  ░ ░         ░ ░   ░           ░ 
                          ░                               `);

// Kamu bisa menambahkan lebih banyak baris ASCII art sesuai kebutuhan


console.log(asciiArt);
console.log(inicranjg);

function loadSession() {
    try {
        const sessionFile = fs.readFileSync('session.json');
        return JSON.parse(sessionFile);
    } catch (err) {
        saveSession({'sessions': {}});
        return {'sessions': {}};
    }
}

function saveSession(sessionData) {
    try {
        fs.writeFileSync('session.json', JSON.stringify(sessionData, null, 2));
    } catch (err) {}
}

function getNewSessionInput() {
    const name = readlineSync.question(`[ ${header} ] Nama Session: `);
    const token = readlineSync.question(`[ ${header} ] Token: `);
    const tapLevel = readlineSync.questionInt(`[ ${header} ] Tap Level: `);
    // Menghapus input untuk baggage dan sentry trace, memberikan nilai default ""
    const baggage = "";
    const sentryTrace = "";
    const sleepTime = readlineSync.questionInt(`[ ${header} ] Sleep Time (ms): `);
    return {
        name, token, tapLevel, baggage, sentryTrace, sleepTime
    };
}


async function loadState(token, tapLevel, baggage, sentryTrace) {
    let retryCount = 0;
    while (retryCount < 5) {
        try {
            const response = await axios.post('https://app2.firecoin.app/api/loadState', {}, {
                headers: {
                    'Accept': 'application/json',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Authorization': token,
                    'Baggage': baggage,
                    'Content-Type': 'application/json',
                    'Origin': 'https://app2.firecoin.app',
                    'Priority': 'high',
                    'Referer': 'https://app2.firecoin.app',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
                }
            });
            const data = response.data;
            return {
                clicks: data.clicks + tapLevel,
                max_value: data.max_value,
                user_id: data.user_id
            };
        } catch (err) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return null;
}

async function sendClick(clicks, token, tapLevel, baggage, sentryTrace) {
    let retryCount = 0;
    while (retryCount < 5) {
        try {
            const response = await axios.post('https://app2.firecoin.app/api/click', { clicks: clicks + tapLevel }, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token,
                    'Baggage': baggage,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36',
                }
            });
            if (response.data.error === 'Too fast') {
                await new Promise(resolve => setTimeout(resolve, 10000));
                retryCount++;
                continue;
            }
            return response.data;
        } catch (err) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return null;
}

async function runSession(sessionData) {
    const { token, tapLevel, baggage, sentryTrace, sleepTime } = sessionData;
    const state = await loadState(token, tapLevel, baggage, sentryTrace);
    if (!state) return;

    let { clicks, max_value, user_id } = state;
    while (true) {
        const result = await sendClick(clicks, token, tapLevel, baggage, sentryTrace);
        if (!result) return;
        const { nextUser } = result;
        console.log(`[ ${chalk.magenta('INFO')} ${sessionData.name} ] ID: ${nextUser.id} | Nama: ${nextUser.name} | Clicks: ${nextUser.clicks}`);
        clicks += tapLevel;
        await new Promise(resolve => setTimeout(resolve, sleepTime));
        const newState = await loadState(token, tapLevel, baggage, sentryTrace);
        if (newState) {
            clicks = newState.clicks;
            max_value = newState.max_value;
            user_id = newState.user_id;
        }
    }
}

(async () => {
    let sessionData = loadSession();
    let continueRunning = true;

    while (continueRunning) {
        
        const choice = readlineSync.keyInSelect(
            ['Tambah session baru', 'Tambah beberapa session', 'Gunakan session yang ada', 'Hapus session', 'Keluar'], 
            chalk.magenta('Pilih opsi:')
        );

        // Menghapus log angka yang muncul setelah pilihan
        if (choice !== -1) {
            console.log(""); // Ini akan mencegah angka lain yang tampil secara default
            switch (choice) {
                case 0:
                    const newSession = getNewSessionInput();
                    sessionData.sessions[newSession.name] = newSession;
                    saveSession(sessionData);
                    console.log(chalk.magenta('[ SUKSES ] Session baru berhasil ditambahkan.'));
                    break;

                case 1:
                    const numSessions = readlineSync.questionInt('[ ' + header + ' ] Masukkan jumlah session yang ingin ditambah: ');
                    for (let i = 0; i < numSessions; i++) {
                        const newSession = getNewSessionInput();
                        sessionData.sessions[newSession.name] = newSession;
                        console.log(chalk.magenta(`[ SUKSES ] Session ${newSession.name} berhasil ditambahkan.`));
                    }
                    saveSession(sessionData);
                    break;

                case 2: // Gunakan session yang ada
                    if (Object.keys(sessionData.sessions).length === 0) {
                        console.log(chalk.red('[ ERROR ] Tidak ada session yang tersimpan.'));
                        break;
                    }

                    const sessionNames = Object.keys(sessionData.sessions);
                    const selectedSessionIndex = readlineSync.keyInSelect(sessionNames, `[ ${header} ] Pilih session yang ingin digunakan:`);
                    
                    if (selectedSessionIndex === -1) {
                        console.log(chalk.red('[ INFO ] Pembatalan pemilihan session.'));
                        break;
                    }

                    const sessionNameToUse = sessionNames[selectedSessionIndex];
                    const sessionToRun = sessionData.sessions[sessionNameToUse];
                    console.log(chalk.bgWhite.magenta(`[ SUKSES ] Menggunakan Session: ${sessionNameToUse}`));
                    await runSession(sessionToRun);
                    break;

                case 3: // Hapus session
                    if (Object.keys(sessionData.sessions).length === 0) {
                        console.log(chalk.red('[ ERROR ] Tidak Ada Session Yang Tersimpan.'));
                        break;
                    }

                    const sessionNamesToDelete = Object.keys(sessionData.sessions);
                    const selectedSessionToDeleteIndex = readlineSync.keyInSelect(sessionNamesToDelete, `[ ${header} ] Pilih session yang ingin dihapus:`);
                    
                    if (selectedSessionToDeleteIndex === -1) {
                        console.log(chalk.yellow('[ INFO ] Pembatalan penghapusan session.'));
                        break;
                    }

                    const sessionToDelete = sessionNamesToDelete[selectedSessionToDeleteIndex];
                    delete sessionData.sessions[sessionToDelete];
                    saveSession(sessionData);
                    console.log(chalk.magenta('[ SUKSES ] Session telah dihapus.'));
                    break;

                case 4: // Keluar
                    console.log(chalk.red('[ INFO ] Keluar dari program.'));
                    continueRunning = false;
                    break;

                default:
                    break;
            }
        }
    }
})();
