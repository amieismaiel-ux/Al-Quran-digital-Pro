"use strict";

/* =========================================================
   AL-QURAN DIGITAL V4
   FULL APP.JS
   ========================================================= */

const API = "https://api.alquran.cloud/v1";

const ARABIC_EDITION = "quran-uthmani";
const TRANSLATION_EDITION = "ms.basmeih";

const AUDIO_EDITION = "ar.alafasy";
const AUDIO_BITRATE = 128;
// ==========================================
// OFFLINE QURAN CACHE
// ==========================================

const QURAN_CACHE_NAME = "alquran-quran-data-v1";

async function saveQuranOffline(key, data) {
    try {
        const cache = await caches.open(QURAN_CACHE_NAME);

        const response = new Response(
            JSON.stringify(data),
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        await cache.put(
            new Request(`./offline-quran/${key}`),
            response
        );

        console.log("Quran disimpan offline:", key);

    } catch (error) {
        console.error(
            "Gagal simpan Quran offline:",
            error
        );
    }
}

async function getQuranOffline(key) {
    try {
        const cache = await caches.open(QURAN_CACHE_NAME);

        const response = await cache.match(
            new Request(`./offline-quran/${key}`)
        );

        if (!response) {
            return null;
        }

        return await response.json();

    } catch (error) {
        console.error(
            "Gagal baca Quran offline:",
            error
        );

        return null;
    }
}

/* =========================================================
   STATE
   ========================================================= */

const state = {

    surahs: [],

    currentSurah: null,

    currentAyahs: [],

    currentAyahIndex: 0,

    isPlaying: false,

    autoPlay: true,

    sortAZ: false,

    arabicSize:
        Number(
            localStorage.getItem("arabicSize")
        ) || 30,

    bookmarks:
        JSON.parse(
            localStorage.getItem("bookmarks") || "[]"
        ),

    lastRead:
        JSON.parse(
            localStorage.getItem("lastRead") || "null"
        )

};


/* =========================================================
   AUDIO
   ========================================================= */

const audio = new Audio();

audio.preload = "auto";

let currentPlayButton = null;


/* =========================================================
   DOM
   ========================================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    applySavedTheme();

    applyArabicSize();

    setupEvents();

    await loadSurahList();

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    $("themeBtn")?.addEventListener(
        "click",
        toggleTheme
    );

    $("modalThemeBtn")?.addEventListener(
        "click",
        toggleTheme
    );

    $("settingsNav")?.addEventListener(
        "click",
        openSettings
    );

    $("closeSettings")?.addEventListener(
        "click",
        closeSettings
    );

    $("backBtn")?.addEventListener(
        "click",
        showHome
    );

    $("fontPlus")?.addEventListener(
        "click",
        increaseFont
    );

    $("fontMinus")?.addEventListener(
        "click",
        decreaseFont
    );

    $("settingsFontPlus")?.addEventListener(
        "click",
        increaseFont
    );

    $("settingsFontMinus")?.addEventListener(
        "click",
        decreaseFont
    );

    $("continueBtn")?.addEventListener(
        "click",
        continueLastRead
    );

    $("sortBtn")?.addEventListener(
        "click",
        toggleSort
    );

    $("searchInput")?.addEventListener(
        "input",
        handleSearch
    );

    $("clearSearch")?.addEventListener(
        "click",
        clearSearch
    );

    $("bookmarkNav")?.addEventListener(
        "click",
        showBookmarks
    );


    /* AUDIO EVENTS */

    audio.addEventListener(
        "ended",
        handleAudioEnded
    );

    audio.addEventListener(
        "timeupdate",
        updateAudioProgress
    );

    audio.addEventListener(
        "play",
        () => {

            state.isPlaying = true;

            updateCurrentButton("⏸");

        }
    );

    audio.addEventListener(
        "pause",
        () => {

            state.isPlaying = false;

            updateCurrentButton("▶");

        }
    );

}


/* =========================================================
   LOAD 114 SURAH
   ========================================================= */

async function loadSurahList() {

    const grid =
        $("surahGrid");


    try {

        grid.innerHTML = `
            <div class="loading">

                <div class="spinner"></div>

                <p>
                    Memuatkan 114 Surah...
                </p>

            </div>
        `;


        const response =
            await fetch(
                `${API}/surah`
            );


        if (!response.ok) {

            throw new Error(
                "Gagal mendapatkan senarai Surah."
            );

        }


        const result =
            await response.json();


        if (
            !result.data ||
            result.data.length !== 114
        ) {

            throw new Error(
                "Senarai Surah tidak lengkap."
            );

        }


        state.surahs =
            result.data;


        $("surahCount").textContent =
            "114 Surah";


        renderSurahs(
            state.surahs
        );


        renderLastRead();


    } catch (error) {

        console.error(error);


        grid.innerHTML = `

            <div class="loading">

                <div style="font-size:42px">
                    ⚠️
                </div>

                <p>
                    Gagal memuatkan 114 Surah.
                </p>

                <button
                    onclick="loadSurahList()"
                    style="
                        margin-top:12px;
                        padding:10px 16px;
                        border:0;
                        border-radius:10px;
                        background:#0f766e;
                        color:white;
                    "
                >
                    Cuba Lagi
                </button>

            </div>

        `;

    }

}


/* =========================================================
   RENDER SURAH
   ========================================================= */

function renderSurahs(list) {

    const grid =
        $("surahGrid");


    if (!list.length) {

        grid.innerHTML = `
            <div class="loading">
                <p>Surah tidak ditemui.</p>
            </div>
        `;

        return;

    }


    grid.innerHTML =
        list.map(
            surah => `

            <article
                class="surah-card"
                onclick="
                    openSurah(
                        ${surah.number}
                    )
                "
            >

                <div class="surah-num">
                    ${surah.number}
                </div>


                <div class="surah-info">

                    <div class="surah-name-latin">

                        ${escapeHTML(
                            surah.englishName
                        )}

                    </div>


                    <div class="surah-meta">

                        ${
                            surah.revelationType ===
                            "Meccan"
                                ? "Makkiyah"
                                : "Madaniyah"
                        }

                        •

                        ${surah.numberOfAyahs}
                        Ayat

                    </div>

                </div>


                <div class="surah-name-arabic">

                    ${escapeHTML(
                        surah.name
                    )}

                </div>

            </article>

        `
        ).join("");

}


/* =========================================================
   OPEN SURAH
   ========================================================= */

async function openSurah(
    surahNumber,
    targetAyah = 1
) {

    stopAudio();


    const surah =
        state.surahs.find(
            item =>
                item.number ===
                surahNumber
        );


    if (!surah) {

        alert(
            "Maklumat Surah tidak ditemui."
        );

        return;

    }


    state.currentSurah =
        surah;


    showPage(
        "surahPage"
    );


    renderSurahHeader(
        surah
    );


    const container =
        $("ayahContainer");


    container.innerHTML = `

        <div class="loading">

            <div class="spinner"></div>

            <p>
                Memuatkan
                ${escapeHTML(
                    surah.englishName
                )}...
            </p>

        </div>

    `;


    saveLastRead(
        surah.number,
        targetAyah
    );


    try {
// ==========================================
// BACA DARIPADA CACHE JIKA OFFLINE
// ==========================================

if (!navigator.onLine) {

    const offlineData = await getQuranOffline(
        `surah-${surahNumber}`
    );

    if (
        offlineData &&
        offlineData.ayahs &&
        offlineData.ayahs.length
    ) {

        state.currentAyahs = offlineData.ayahs;

        renderAyahs();

        return;
    }

    alert(
        "Surah ini belum disimpan untuk bacaan offline. Sila buka Surah ini ketika internet tersedia terlebih dahulu."
    );

    return;
}
        /*
         * REQUEST 1
         * ARABIC
         */

        const arabicResponse =
            await fetch(
                `${API}/surah/${surahNumber}/${ARABIC_EDITION}`
            );


        if (!arabicResponse.ok) {

            throw new Error(
                "Data Arab gagal dimuatkan."
            );

        }


        const arabicResult =
            await arabicResponse.json();


        const arabicData =
            arabicResult.data;


        if (
            !arabicData ||
            !arabicData.ayahs
        ) {

            throw new Error(
                "Data Arab tidak sah."
            );

        }


        /*
         * REQUEST 2
         * BASMEIH
         */

        const malayResponse =
            await fetch(
                `${API}/surah/${surahNumber}/${TRANSLATION_EDITION}`
            );


        if (!malayResponse.ok) {

            throw new Error(
                "Data terjemahan Bahasa Melayu gagal dimuatkan."
            );

        }


        const malayResult =
            await malayResponse.json();


        const malayData =
            malayResult.data;


        if (
            !malayData ||
            !malayData.ayahs
        ) {

            throw new Error(
                "Data terjemahan Bahasa Melayu tidak sah."
            );

        }


        /*
         * PASTIKAN BILANGAN AYAT SAMA
         */

        if (
            arabicData.ayahs.length !==
            malayData.ayahs.length
        ) {

            throw new Error(
                "Bilangan ayat Arab dan terjemahan tidak sepadan."
            );

        }


        /*
         * GABUNG ARAB + MELAYU
         */

        state.currentAyahs =
            arabicData.ayahs.map(
                (ayah, index) => {

                    const malayAyah =
                        malayData.ayahs[index];


                    return {

                        arabic:
                            ayah.text,

                        number:
                            ayah.numberInSurah,

                        globalNumber:
                            ayah.number,

                        translation:
                            malayAyah
                                ? malayAyah.text
                                : "Terjemahan tidak tersedia."

                    };

                }
            );
// ==========================================
// SIMPAN SURAH UNTUK OFFLINE
// ==========================================

await saveQuranOffline(
    `surah-${surahNumber}`,
    {
        surahNumber: surahNumber,
        surah: surah,
        ayahs: state.currentAyahs
    }
);

        renderAyahs();


        /*
         * SCROLL KE AYAT TERAKHIR
         */

        if (
            targetAyah > 1
        ) {

            setTimeout(
                () => {

                    const element =
                        document.getElementById(
                            `ayah-${targetAyah}`
                        );


                    if (element) {

                        element.scrollIntoView({
                            behavior:
                                "smooth",
                            block:
                                "center"
                        });

                    }

                },
                300
            );

        }


    } catch (error) {

        console.error(
            "Quran error:",
            error
        );


        container.innerHTML = `

            <div class="loading">

                <div style="font-size:42px">
                    ⚠️
                </div>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

                <button
                    onclick="
                        openSurah(
                            ${surahNumber},
                            ${targetAyah}
                        )
                    "
                    style="
                        margin-top:12px;
                        padding:10px 16px;
                        border:0;
                        border-radius:10px;
                        background:#0f766e;
                        color:white;
                    "
                >
                    Cuba Lagi
                </button>

            </div>

        `;

    }

}


/* =========================================================
   SURAH HEADER
   ========================================================= */

function renderSurahHeader(
    surah
) {

    $("surahHeader").innerHTML = `

        <div class="arabic-name">

            ${escapeHTML(
                surah.name
            )}

        </div>


        <h2>

            ${escapeHTML(
                surah.englishName
            )}

        </h2>


        <p>

            ${escapeHTML(
                surah.englishNameTranslation
            )}

            •

            ${surah.numberOfAyahs}
            Ayat

            •

            ${
                surah.revelationType ===
                "Meccan"
                    ? "Makkiyah"
                    : "Madaniyah"
            }

        </p>

    `;

}


/* =========================================================
   RENDER AYAT
   ========================================================= */

function renderAyahs() {

    const container =
        $("ayahContainer");


    container.innerHTML =
        state.currentAyahs
            .map(
                (ayah, index) => `

                <article
                    class="ayah-card"
                    id="ayah-${ayah.number}"
                    data-index="${index}"
                >

                    <div class="ayah-top">

                        <div class="ayah-number">

                            ${ayah.number}

                        </div>


                        <div class="ayah-actions">

                            <button
                                title="Bookmark"
                                onclick="
                                    toggleBookmark(
                                        ${state.currentSurah.number},
                                        ${ayah.number}
                                    )
                                "
                            >

                                ${
                                    isBookmarked(
                                        state.currentSurah.number,
                                        ayah.number
                                    )
                                        ? "♥"
                                        : "♡"
                                }

                            </button>


                            <button
                                title="Salin"
                                onclick="
                                    copyAyah(
                                        ${ayah.number}
                                    )
                                "
                            >
                                ⧉
                            </button>


                            <button
                                title="Kongsi"
                                onclick="
                                    shareAyah(
                                        ${ayah.number}
                                    )
                                "
                            >
                                ↗
                            </button>

                        </div>

                    </div>


                    <div class="arabic">

                        ${escapeHTML(
                            ayah.arabic
                        )}

                    </div>


                    <div class="translation">

                        ${escapeHTML(
                            ayah.translation
                        )}

                    </div>


                    <div class="audio-wrap">

                        <button
                            class="play-btn"
                            data-audio-index="${index}"
                            onclick="
                                playAyah(
                                    ${index},
                                    this
                                )
                            "
                        >
                            ▶
                        </button>


                        <input
                            class="progress"
                            type="range"
                            min="0"
                            max="100"
                            value="0"
                            disabled
                        >

                    </div>

                </article>

            `
            )
            .join("");

}


/* =========================================================
   PLAY AYAH
   ========================================================= */

function playAyah(
    index,
    button
) {

    if (
        index < 0 ||
        index >=
        state.currentAyahs.length
    ) {

        return;

    }


    /*
     * Jika ayat yang sama sedang bermain:
     * PAUSE
     */

    if (
        state.currentAyahIndex === index &&
        !audio.paused
    ) {

        audio.pause();

        return;

    }


    state.currentAyahIndex =
        index;


    playCurrentAyah();

}


/* =========================================================
   PLAY CURRENT AYAH
   ========================================================= */

function playCurrentAyah() {

    const ayah =
        state.currentAyahs[
            state.currentAyahIndex
        ];


    if (!ayah) {

        stopAudio();

        return;

    }


    /*
     * URL AUDIO AYAT
     *
     * Contoh:
     * Ayat global 1
     *
     * https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3
     */

    const url =
        `https://cdn.islamic.network/quran/audio/${AUDIO_BITRATE}/${AUDIO_EDITION}/${ayah.globalNumber}.mp3`;


    /*
     * RESET BUTTON LAMA
     */

    updateCurrentButton(
        "▶"
    );


    currentPlayButton =
        null;


    /*
     * CARI CARD AYAT
     */

    const card =
        document.getElementById(
            `ayah-${ayah.number}`
        );


    /*
     * RESET PROGRESS
     */

    if (card) {

        const progress =
            card.querySelector(
                ".progress"
            );


        if (progress) {

            progress.value =
                0;

        }

    }


    /*
     * BUTTON AYAT SEMASA
     */

    if (card) {

        currentPlayButton =
            card.querySelector(
                ".play-btn"
            );

    }


    /*
     * SET AUDIO
     */

    audio.src =
        url;


    audio.load();


    /*
     * SIMPAN LAST READ
     */

    saveLastRead(
        state.currentSurah.number,
        ayah.number
    );


    /*
     * SCROLL KE AYAT
     */

    if (card) {

        card.scrollIntoView({
            behavior:
                "smooth",
            block:
                "center"
        });

    }


    /*
     * PLAY
     */

    audio.play()
        .then(
            () => {

                state.isPlaying =
                    true;

                updateCurrentButton(
                    "⏸"
                );

            }
        )
        .catch(
            error => {

                console.error(
                    "Audio gagal:",
                    error
                );


                state.isPlaying =
                    false;


                updateCurrentButton(
                    "▶"
                );

            }
        );

}


/* =========================================================
   AUTO NEXT
   ========================================================= */

function handleAudioEnded() {

    /*
     * AUDIO AYAT SEMASA SUDAH HABIS
     */

    state.isPlaying =
        false;


    updateCurrentButton(
        "▶"
    );


    currentPlayButton =
        null;


    /*
     * NEXT AYAT
     */

    const nextIndex =
        state.currentAyahIndex + 1;


    /*
     * JIKA SUDAH AYAT TERAKHIR
     */

    if (
        nextIndex >=
        state.currentAyahs.length
    ) {

        state.currentAyahIndex =
            state.currentAyahs.length - 1;


        return;

    }


    /*
     * AUTO PLAY AKTIF
     */

    if (
        state.autoPlay
    ) {

        state.currentAyahIndex =
            nextIndex;


        /*
         * Tunggu sedikit
         * sebelum main ayat seterusnya
         */

        setTimeout(
            () => {

                playCurrentAyah();

            },
            150
        );

    }

}


/* =========================================================
   AUDIO PROGRESS
   ========================================================= */

function updateAudioProgress() {

    if (
        !audio.duration ||
        !state.currentAyahs.length
    ) {

        return;

    }


    const ayah =
        state.currentAyahs[
            state.currentAyahIndex
        ];


    if (!ayah) return;


    const card =
        document.getElementById(
            `ayah-${ayah.number}`
        );


    if (!card) return;


    const progress =
        card.querySelector(
            ".progress"
        );


    if (!progress) return;


    progress.value =
        (
            audio.currentTime /
            audio.duration
        ) * 100;

}


/* =========================================================
   BUTTON UPDATE
   ========================================================= */

function updateCurrentButton(
    symbol
) {

    if (
        currentPlayButton
    ) {

        currentPlayButton.textContent =
            symbol;

    }

}


/* =========================================================
   STOP AUDIO
   ========================================================= */

function stopAudio() {

    audio.pause();

    audio.currentTime =
        0;

    state.isPlaying =
        false;

    updateCurrentButton(
        "▶"
    );

    currentPlayButton =
        null;

}


/* =========================================================
   BOOKMARK
   ========================================================= */

function toggleBookmark(
    surah,
    ayah
) {

    const key =
        `${surah}:${ayah}`;


    const index =
        state.bookmarks.indexOf(
            key
        );


    if (index >= 0) {

        state.bookmarks.splice(
            index,
            1
        );

    } else {

        state.bookmarks.push(
            key
        );

    }


    localStorage.setItem(
        "bookmarks",
        JSON.stringify(
            state.bookmarks
        )
    );


    renderAyahs();

}


/* =========================================================
   IS BOOKMARKED
   ========================================================= */

function isBookmarked(
    surah,
    ayah
) {

    return state.bookmarks.includes(
        `${surah}:${ayah}`
    );

}


/* =========================================================
   COPY AYAH
   ========================================================= */

async function copyAyah(
    ayahNumber
) {

    const ayah =
        state.currentAyahs.find(
            item =>
                item.number ===
                ayahNumber
        );


    if (!ayah) return;


    const text =
`${state.currentSurah.englishName}
Ayat ${ayah.number}

${ayah.arabic}

${ayah.translation}`;


    try {

        await navigator.clipboard.writeText(
            text
        );


        alert(
            "Ayat telah disalin."
        );


    } catch {

        alert(
            "Tidak dapat menyalin ayat."
        );

    }

}


/* =========================================================
   SHARE
   ========================================================= */

async function shareAyah(
    ayahNumber
) {

    const ayah =
        state.currentAyahs.find(
            item =>
                item.number ===
                ayahNumber
        );


    if (!ayah) return;


    const text =
`${state.currentSurah.englishName}
Ayat ${ayah.number}

${ayah.arabic}

${ayah.translation}`;


    try {

        if (
            navigator.share
        ) {

            await navigator.share({

                title:
                    "Al-Quran Digital",

                text

            });

        } else {

            await navigator.clipboard.writeText(
                text
            );


            alert(
                "Teks telah disalin."
            );

        }

    } catch {

        /* User cancel share */

    }

}


/* =========================================================
   LAST READ
   ========================================================= */

function saveLastRead(
    surah,
    ayah
) {

    state.lastRead = {

        surah,
        ayah

    };


    localStorage.setItem(
        "lastRead",
        JSON.stringify(
            state.lastRead
        )
    );


    renderLastRead();

}


/* =========================================================
   RENDER LAST READ
   ========================================================= */

function renderLastRead() {

    const card =
        $("lastReadCard");


    if (!card) return;


    if (
        !state.lastRead ||
        !state.surahs.length
    ) {

        card.classList.add(
            "hidden"
        );

        return;

    }


    const surah =
        state.surahs.find(
            item =>
                item.number ===
                state.lastRead.surah
        );


    if (!surah) {

        card.classList.add(
            "hidden"
        );

        return;

    }


    card.classList.remove(
        "hidden"
    );


    $("lastReadName")
        .textContent =
        surah.englishName;


    $("lastReadAyah")
        .textContent =
        `Ayat ${state.lastRead.ayah}`;

}


/* =========================================================
   CONTINUE LAST READ
   ========================================================= */

function continueLastRead() {

    if (
        !state.lastRead
    ) return;


    openSurah(
        state.lastRead.surah,
        state.lastRead.ayah
    );

}


/* =========================================================
   SEARCH
   ========================================================= */

function handleSearch(
    event
) {

    const query =
        event.target.value
            .trim()
            .toLowerCase();


    if (!query) {

        renderSurahs(
            state.surahs
        );

        return;

    }


    const filtered =
        state.surahs.filter(
            surah =>

                surah.englishName
                    .toLowerCase()
                    .includes(query)

                ||

                surah.name
                    .toLowerCase()
                    .includes(query)

                ||

                String(
                    surah.number
                ) === query
        );


    renderSurahs(
        filtered
    );

}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function clearSearch() {

    $("searchInput").value =
        "";


    renderSurahs(
        state.surahs
    );

}


/* =========================================================
   SORT
   ========================================================= */

function toggleSort() {

    state.sortAZ =
        !state.sortAZ;


    $("sortBtn").textContent =
        state.sortAZ
            ? "1-114"
            : "A-Z";


    if (
        state.sortAZ
    ) {

        const sorted =
            [...state.surahs]
                .sort(
                    (a, b) =>
                        a.englishName
                            .localeCompare(
                                b.englishName
                            )
                );


        renderSurahs(
            sorted
        );

    } else {

        renderSurahs(
            state.surahs
        );

    }

}


/* =========================================================
   PAGE
   ========================================================= */

function showPage(
    pageId
) {

    document
        .querySelectorAll(
            ".page"
        )
        .forEach(
            page =>
                page.classList.remove(
                    "active"
                )
        );


    const page =
        $(pageId);


    if (page) {

        page.classList.add(
            "active"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   HOME
   ========================================================= */

function showHome() {

    stopAudio();

    showPage(
        "homePage"
    );

}


/* =========================================================
   THEME
   ========================================================= */

function toggleTheme() {

    document.body.classList.toggle(
        "dark"
    );


    const dark =
        document.body.classList.contains(
            "dark"
        );


    localStorage.setItem(
        "theme",
        dark
            ? "dark"
            : "light"
    );


    updateThemeSwitch();

}


function applySavedTheme() {

    if (
        localStorage.getItem(
            "theme"
        ) === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeSwitch();

}


function updateThemeSwitch() {

    const button =
        $("modalThemeBtn");


    if (!button) return;


    const dark =
        document.body.classList.contains(
            "dark"
        );


    button.classList.toggle(
        "on",
        dark
    );

}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

    $("settingsModal")
        ?.classList.remove(
            "hidden"
        );

}


function closeSettings() {

    $("settingsModal")
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   FONT
   ========================================================= */

function applyArabicSize() {

    document.documentElement
        .style.setProperty(
            "--arabic-size",
            `${state.arabicSize}px`
        );

}


function increaseFont() {

    if (
        state.arabicSize >= 50
    ) return;


    state.arabicSize += 2;


    localStorage.setItem(
        "arabicSize",
        state.arabicSize
    );


    applyArabicSize();

}


function decreaseFont() {

    if (
        state.arabicSize <= 20
    ) return;


    state.arabicSize -= 2;


    localStorage.setItem(
        "arabicSize",
        state.arabicSize
    );


    applyArabicSize();

}


/* =========================================================
   BOOKMARK PAGE
   ========================================================= */

function showBookmarks() {

    if (
        !state.bookmarks.length
    ) {

        alert(
            "Belum ada ayat yang disimpan."
        );

        return;

    }


    alert(
        `Anda mempunyai ${state.bookmarks.length} bookmark.`
    );

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   GLOBAL
   ========================================================= */

window.openSurah =
    openSurah;

window.loadSurahList =
    loadSurahList;

window.toggleBookmark =
    toggleBookmark;

window.copyAyah =
    copyAyah;

window.shareAyah =
    shareAyah;

window.playAyah =
    playAyah;

window.showHome =
    showHome;
