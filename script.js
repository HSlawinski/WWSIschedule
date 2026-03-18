// ==========================================
// 1. KONFIGURACJA I ZMIENNE GLOBALNE
// ==========================================
const urlGoogleSheets = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Egljaq9wqp3oBnK50-ynJ4mygw-Rf0z19qQB05lmVljVljsjLs-4p4L8sNZh0FZUxHr8WTYKKqOi/pub?output=csv';
const proxyUrl = 'https://rss-z201-proxy-gpckayd0ckgqheb6.polandcentral-01.azurewebsites.net/api/HttpTrigger1';

 const keywords = [
            'z201', 
            'z-201', 
            'egzamin',
            'egzaminacyjna',
            'sesja',
            'cieślak',
            'z201-205',
        ];

// ==========================================
// 2. OBSŁUGA MOTYWU (DARK/LIGHT)
// ==========================================
const themeToggle = document.getElementById('theme-toggle');

// Sprawdzamy czy użytkownik ma zapisany motyw, jeśli nie - domyślnie DARK
let isDark = localStorage.getItem('theme') !== 'light';

// Funkcja aplikująca motyw
function updateTheme() {
    if (isDark) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = isDark ? '☀️' : '🌙';
    }
}

// Wywoływana od razu przy starcie
updateTheme();

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateTheme();
});

// ==========================================
// 3. FUNKCJE POMOCNICZE (UI I LOGIKA)
// ==========================================

function liczPrzerwe(koniecPoprzednich, startKolejnych) {
    if (!koniecPoprzednich || !startKolejnych) return 0;
    try {
        const [h1, m1] = koniecPoprzednich.split(':').map(Number);
        const [h2, m2] = startKolejnych.split(':').map(Number);
        return (h2 * 60 + m2) - (h1 * 60 + m1);
    } catch (e) { return 0; }
}

function getTypZajecHTML(nazwa) {
    const lower = nazwa.toLowerCase();
    if (lower.includes('wykł')) return `<span class="badge badge-wykl">WYKŁAD</span>`;
    if (lower.includes('ćw')) return `<span class="badge badge-cw">ĆWICZENIA</span>`;
    if (lower.includes('lab')) return `<span class="badge badge-lab">LABORATORIUM</span>`;
    return '';
}

function cleanNazwa(nazwa) {
    return nazwa.replace(/wykł\.|ćw\.|lab\./gi, '').trim();
}

window.toggleZjazd = function(nrZjazdu) {
    const content = document.getElementById(`zjazd-content-${nrZjazdu}`);
    const icon = document.getElementById(`icon-${nrZjazdu}`);
    const isHidden = content.style.display === 'none';
    
    content.style.display = isHidden ? 'block' : 'none';
    icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
};

window.toggleRSS = function() {
    const content = document.getElementById('rss-content');
    const icon = document.getElementById('rss-toggle-icon');
    const isHidden = content.style.display === 'none' || content.style.display === '';
    
    content.style.display = isHidden ? 'block' : 'none';
    icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
};

// ==========================================
// 4. ŁADOWANIE DANYCH (PLAN I RSS)
// ==========================================

async function ladujWszystko() {
    await ladujKomunikaty();
    await ladujPlan();
}

async function ladujKomunikaty() {
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Błąd serwera RSS');
        
        const xmlText = await response.text();
        const xmlDoc = new DOMParser().parseFromString(xmlText, "text/xml");
        const items = Array.from(xmlDoc.querySelectorAll("item"));
        
        const contentDiv = document.getElementById('rss-content');
        const countSpan = document.getElementById('rss-count');

        const dopasowane = items.filter(item => {
            const tytul = (item.querySelector("title")?.textContent || "").toLowerCase();
            const tresc = (item.querySelector("description")?.textContent || "").toLowerCase();
            return keywords.some(slowo => tytul.includes(slowo) || tresc.includes(slowo));
        });

        countSpan.innerText = dopasowane.length;
        
        if (dopasowane.length > 0) {
            let html = '';
            dopasowane.slice(0, 5).forEach(item => {
                const title = item.querySelector("title")?.textContent;
                const link = item.querySelector("link")?.textContent;
                const pubDate = new Date(item.querySelector("pubDate")?.textContent);
                const formatData = pubDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });

                let description = item.querySelector("description")?.textContent || "";
                description = description.replace(/<p>\s*Artykuł[\s\S]*?Panel Studenta WWSI.*?<\/p>/gi, '').trim();

                html += `
                    <div class="zajecia-card rss-card">
                        <div class="czas-col">
                            <div class="czas-start">${formatData}</div>
                        </div>
                        <div class="info-col">
                            <h3 class="przedmiot-tytul">
                                <a href="${link}" target="_blank">${title}</a>
                            </h3>
                            <div class="komunikat-tresc" style="margin-top: 8px; font-size: 0.85em; opacity: 0.8;">
                                ${description}
                            </div>
                        </div>
                    </div>`;
            });
            contentDiv.innerHTML = html;
        } else {
            contentDiv.innerHTML = '<div style="padding: 15px; text-align: center; opacity: 0.6;">Brak nowych komunikatów. 😎</div>';
        }
    } catch (error) {
        document.getElementById('rss-content').innerHTML = '<div style="padding: 15px; text-align: center; color: #e74c3c;">Nie udało się pobrać komunikatów.</div>';
    }
}

async function ladujPlan() {
    const app = document.getElementById('plan-zajec');
    try {
        const zjazdyResponse = await fetch('zjazdy.json');
        const zjazdyDaty = await zjazdyResponse.json();

        Papa.parse(urlGoogleSheets, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const suroweZajecia = [];
                results.data.forEach(row => {
                    const wiersz = {};
                    for (let key in row) wiersz[key.trim().toLowerCase()] = row[key];
                    
                    if(!wiersz.zjazdy || !wiersz.dzien) return;

                    const zjazdyLista = String(wiersz.zjazdy).split(',').map(z => z.trim());
                    zjazdyLista.forEach(nr => {
                        if(zjazdyDaty[nr] && zjazdyDaty[nr][wiersz.dzien]) {
                            suroweZajecia.push({
                                zjazd: parseInt(nr),
                                dzien: wiersz.dzien,
                                data: zjazdyDaty[nr][wiersz.dzien],
                                od: String(wiersz.od || '').trim().replace('.', ':').padStart(5, '0'),
                                do: String(wiersz.do || '').trim().replace('.', ':').padStart(5, '0'),
                                przedmiot: wiersz.przedmiot,
                                sala: wiersz.sala
                            });
                        }
                    });
                });

                suroweZajecia.sort((a, b) => a.zjazd - b.zjazd || a.data.localeCompare(b.data) || a.od.localeCompare(b.od));

                app.innerHTML = '';
                const zjazdyPogrupowane = {};
                suroweZajecia.forEach(z => {
                    if (!zjazdyPogrupowane[z.zjazd]) zjazdyPogrupowane[z.zjazd] = [];
                    zjazdyPogrupowane[z.zjazd].push(z);
                });

                for (const [nr, lista] of Object.entries(zjazdyPogrupowane)) {
                    const daty = Object.values(zjazdyDaty[nr]).sort();
                    const zakres = `(${daty[0].split('-').reverse().join('.').slice(0,5)} - ${daty[daty.length-1].split('-').reverse().join('.')})`;

                    app.innerHTML += `
                        <div class="zjazd-header" onclick="toggleZjazd(${nr})">
                            <div class="zjazd-title-container">
                                <span>Zjazd ${nr}</span>
                                <span class="zjazd-dates">${zakres}</span>
                            </div>
                            <span class="toggle-icon" id="icon-${nr}" style="transform: rotate(-90deg);">▼</span>
                        </div>`;

                    let html = `<div class="zjazd-content" id="zjazd-content-${nr}" style="display: none;">`;
                    let obecnaData = '';
                    let ostatniaDo = '';

                    lista.forEach(z => {
                        if (z.data !== obecnaData) {
                            html += `<div class="dzien-header">${z.dzien} <span style="font-weight:400; font-size:0.8rem;">(${z.data.split('-').reverse().join('.')})</span></div>`;
                            obecnaData = z.data;
                            ostatniaDo = '';
                        }

                        if (ostatniaDo && liczPrzerwe(ostatniaDo, z.od) > 20) {
                            const p = liczPrzerwe(ostatniaDo, z.od);
                            const tekst = p >= 60 ? `${Math.floor(p/60)}h ${p%60}m` : `${p} min`;
                            html += `<div class="okienko-alert"><i class="fa-solid fa-mug-hot"></i> <span class="okienko-label">Przerwa</span> <span class="okienko-czas">${tekst}</span></div>`;
                        }

                        html += `
                            <div class="zajecia-card">
                                <div class="czas-col">
                                    <div class="czas-start">${z.od}</div>
                                    <div class="czas-koniec">${z.do}</div>
                                </div>
                                <div class="info-col">
                                    <h3 class="przedmiot-tytul">${cleanNazwa(z.przedmiot)}</h3>
                                    <div class="tags-container">
                                        <span class="badge badge-sala">📍 Sala ${z.sala}</span>
                                        ${getTypZajecHTML(z.przedmiot)}
                                    </div>
                                </div>
                            </div>`;
                        ostatniaDo = z.do;
                    });
                    html += `</div>`;
                    app.innerHTML += html;
                }
                highlightUpcomingZjazd();
            }
        });
    } catch (e) { app.innerHTML = '<div class="loader">Błąd ładowania planu.</div>'; }
}

function highlightUpcomingZjazd() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const headers = document.querySelectorAll('.zjazd-header');
    let found = false;

    headers.forEach(h => {
        if (h.innerText.includes("Komunikacja")) return;
        const match = h.innerText.match(/(\d{2})\.(\d{2})\.(\d{4})\)/);
        if (match && !found) {
            const end = new Date(`${match[3]}-${match[2]}-${match[1]}`);
            if (end >= today) {
                h.classList.add('upcoming');
                found = true;
            }
        }
    });
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', ladujWszystko);

// Rejestracja Service Workera dla PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => console.log("PWA SW skip"));
}