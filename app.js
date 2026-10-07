/* =========================================================
   AL-QURAN DIGITAL V4
   Vanilla JavaScript
   114 Surah
   Al Quran Cloud API
   ========================================================= */

"use strict";


const API = "https://api.alquran.cloud/v1";

const ARABIC_EDITION = "quran-uthmani";

/*
   Nota:
   Edition terjemahan boleh ditukar kemudian apabila
   kita tetapkan sumber Bahasa Melayu yang telah disahkan.
*/
const TRANSLATION_EDITION = "ms.basheer";


const state = {

    surahs: [],

    currentSurah: null,

    currentAyahs: [],

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

    renderLastRead();

    await loadSurahList();

}


/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {

    $("themeBtn")
        .addEventListener(
            "click",
            toggleTheme
        );


    $("modalThemeBtn")
        .addEventListener(
            "click",
            toggleTheme
        );


    $("settingsNav")
        .addEventListener(
            "click",
            openSettings
        );


    $("closeSettings")
        .addEventListener(
            "click",
            closeSettings
        );


    $("backBtn")
        .addEventListener(
            "click",
            showHome
        );


    $("fontPlus")
        .addEventListener(
            "click",
            increaseFont
        );


    $("fontMinus")
        .addEventListener(
            "click",
            decreaseFont
        );


    $("settingsFontPlus")
        .addEventListener(
            "click",
            increaseFont
        );


    $("settingsFontMinus")
        .addEventListener(
            "click",
            decreaseFont
        );


    $("continueBtn")
        .addEventListener(
            "click",
            continueLastRead
        );


    $("sortBtn")
        .addEventListener(
            "click",
            toggleSort
        );


    $("searchInput")
        .addEventListener(
            "input",
            handleSearch
        );


    $("clearSearch")
        .addEventListener(
            "click",
            clearSearch
        );


    $("bookmarkNav")
        .addEventListener(
            "click",
            showBookmarks
        );

}


/* =========================================================
   LOAD ALL 114 SURAH
   ========================================================= */

async function loadSurahList() {

    const grid = $("surahGrid");

    try {

        grid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Memuatkan 114 Surah...</p>
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
                "Data Surah tidak lengkap."
            );

        }


        /*
           PENTING:
           Kita tidak hard-code senarai Surah.
           API mengembalikan semua 114 Surah.
        */

        state.surahs =
            result.data;


        $("surahCount").textContent =
            `${state.surahs.length} Surah`;


        renderSurahs(
            state.surahs
        );


    } catch (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="loading">

                <div style="font-size:42px">
                    ⚠️
                </div>

                <p>
                    Tidak dapat memuatkan senarai Surah.
                </p>

                <button
                    onclick="loadSurahList()"
                    style="
                        margin-top:12px;
                        padding:10px 16px;
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
                data-number="${surah.number}"
                onclick="openSurah(${surah.number})"
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
                            surah.revelationType === "Meccan"
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
    surahNumber
) {

    const surah =
        state.surahs.find(
            item =>
                item.number === surahNumber
        );


    if (!surah) {

        alert(
            "Maklumat Surah tidak ditemui."
        );

        return;

    }


    state.currentSurah =
        surah;


    showPage("surahPage");


    renderSurahHeader(
        surah
    );


    const container =
        $("ayahContainer");


    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>
                Memuatkan ${escapeHTML(
                    surah.englishName
                )}...
            </p>
        </div>
    `;


    saveLastRead(
        surah.number,
        1
    );


    try {

        /*
           Satu request mendapatkan
           Arabic + translation serentak.
        */

        const response =
            await fetch(
                `${API}/surah/${surahNumber}/editions/${ARABIC_EDITION},${TRANSLATION_EDITION}`
            );


        if (!response.ok) {

            throw new Error(
                "Gagal mendapatkan ayat."
            );

        }


        const result =
            await response.json();


        if (
            !result.data ||
            !Array.isArray(result.data)
        ) {

            throw new Error(
                "Format data tidak sah."
            );

        }


        const arabic =
            result.data.find(
                edition =>
                    edition.edition &&
                    edition.edition.identifier ===
                    ARABIC_EDITION
            );


        const translation =
            result.data.find(
                edition =>
                    edition.edition &&
                    edition.edition.identifier ===
                    TRANSLATION_EDITION
            );


        if (!arabic) {

            throw new Error(
                "Data Arab tidak tersedia."
            );

        }


        state.currentAyahs =
            arabic.ayahs.map(
                (ayah, index) => ({

                    arabic: ayah.text,

                    number:
                        ayah.numberInSurah,

                    globalNumber:
                        ayah.number,

                    translation:
                        translation &&
                        translation.ayahs[index]
                            ? translation.ayahs[index].text
                            : "Terjemahan belum tersedia."

                })
            );


        renderAyahs();


    } catch (error) {

        console.error(error);

        container.innerHTML = `
            <div class="loading">

                <div style="font-size:42px">
                    ⚠️
                </div>

                <p>
                    Gagal memuatkan ayat Surah ini.
                </p>

                <button
                    onclick="openSurah(${surahNumber})"
                    style="
                        margin-top:12px;
                        padding:10px 16px;
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
                surah.revelationType === "Meccan"
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
                ayah => `

                <article
                    class="ayah-card"
                    id="ayah-${ayah.number}"
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
                            onclick="
                                playAyah(
                                    ${ayah.globalNumber},
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
   AUDIO
   ========================================================= */

let audio =
    new Audio();

let currentPlayButton =
    null;


function playAyah(
    globalNumber,
    button
) {

    /*
       Audio endpoint Al Quran Cloud.
       Bacaan Mishary Alafasy.
    */

    const url =
        `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`;


    if (
        !audio.paused &&
        audio.src === url
    ) {

        audio.pause();

        button.textContent = "▶";

        return;

    }


    if (currentPlayButton) {

        currentPlayButton.textContent =
            "▶";

    }


    audio.src = url;

    currentPlayButton =
        button;


    button.textContent =
        "⏸";


    audio.play()
        .catch(
            error =>
                console.error(
                    "Audio error:",
                    error
                )
        );


    audio.onended = () => {

        button.textContent =
            "▶";

        currentPlayButton =
            null;

    };

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
                item.number === ayahNumber
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
                item.number === ayahNumber
        );


    if (!ayah) return;


    const text =
`${state.currentSurah.englishName}
Ayat ${ayah.number}

${ayah.arabic}

${ayah.translation}`;


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
            "Teks telah disalin untuk dikongsi."
        );

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


function renderLastRead() {

    const card =
        $("lastReadCard");


    if (
        !state.lastRead
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


    if (!surah) return;


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


function continueLastRead() {

    if (
        !state.lastRead
    ) return;


    openSurah(
        state.lastRead.surah
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


    $("sortBtn")
        .textContent =
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


    $(pageId)
        .classList.add(
            "active"
        );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


function showHome() {

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

    const theme =
        localStorage.getItem(
            "theme"
        );


    if (
        theme === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );

    }


    updateThemeSwitch();

}


function updateThemeSwitch() {

    const dark =
        document.body.classList.contains(
            "dark"
        );


    $("modalThemeBtn")
        .classList.toggle(
            "on",
            dark
        );

}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

    $("settingsModal")
        .classList.remove(
            "hidden"
        );

}


function closeSettings() {

    $("settingsModal")
        .classList.add(
            "hidden"
        );

}


/* =========================================================
   FONT SIZE
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

    const results =
        state.bookmarks;


    if (!results.length) {

        alert(
            "Belum ada ayat yang disimpan."
        );

        return;

    }


    alert(
        `Anda mempunyai ${results.length} bookmark.`
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
