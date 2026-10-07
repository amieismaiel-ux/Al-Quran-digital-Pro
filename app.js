"use strict";

/* =========================================================
   AL-QURAN DIGITAL V4
   APP.JS
   ========================================================= */

const API = "https://api.alquran.cloud/v1";

/*
   Quran Uthmani
*/
const ARABIC_EDITION = "quran-uthmani";

/*
   Terjemahan Bahasa Melayu:
   Basmeih
*/
const TRANSLATION_EDITION = "ms.basmeih";

/*
   Audio Mishary Alafasy
*/
const AUDIO_EDITION = "ar.alafasy";
const AUDIO_BITRATE = 128;


/* =========================================================
   APP STATE
   ========================================================= */

const state = {

    surahs: [],

    currentSurah: null,

    currentAyahs: [],

    currentAyahIndex: 0,

    sortAZ: false,

    isPlaying: false,

    autoPlay: true,

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
   DOM HELPER
   ========================================================= */

const $ = id =>
    document.getElementById(id);


/* =========================================================
   START APP
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

    $("themeBtn")
        ?.addEventListener(
            "click",
            toggleTheme
        );


    $("modalThemeBtn")
        ?.addEventListener(
            "click",
            toggleTheme
        );


    $("settingsNav")
        ?.addEventListener(
            "click",
            openSettings
        );


    $("closeSettings")
        ?.addEventListener(
            "click",
            closeSettings
        );


    $("backBtn")
        ?.addEventListener(
            "click",
            showHome
        );


    $("fontPlus")
        ?.addEventListener(
            "click",
            increaseFont
        );


    $("fontMinus")
        ?.addEventListener(
            "click",
            decreaseFont
        );


    $("settingsFontPlus")
        ?.addEventListener(
            "click",
            increaseFont
        );


    $("settingsFontMinus")
        ?.addEventListener(
            "click",
            decreaseFont
        );


    $("continueBtn")
        ?.addEventListener(
            "click",
            continueLastRead
        );


    $("sortBtn")
        ?.addEventListener(
            "click",
            toggleSort
        );


    $("searchInput")
        ?.addEventListener(
            "input",
            handleSearch
        );


    $("clearSearch")
        ?.addEventListener(
            "click",
            clearSearch
        );


    $("bookmarkNav")
        ?.addEventListener(
            "click",
            showBookmarks
        );


    /*
       Bila audio habis,
       terus pergi ke ayat berikutnya.
    */
    audio.addEventListener(
        "ended",
        handleAudioEnded
    );


    /*
       Update progress bar.
    */
    audio.addEventListener(
        "timeupdate",
        updateAudioProgress
    );


    /*
       Bila audio sedang bermain.
    */
    audio.addEventListener(
        "play",
        () => {

            state.isPlaying = true;

            updateCurrentButton("⏸");

        }
    );


    /*
       Bila audio pause.
    */
    audio.addEventListener(
        "pause",
        () => {

            state.isPlaying = false;

            updateCurrentButton("▶");

        }
    );

}


/* =========================================================
   LOAD ALL 114 SURAH
   ========================================================= */

async function loadSurahList() {

    const grid =
        $("surahGrid");


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


        state.surahs =
            result.data;


        $("surahCount")
            .textContent =
            `${state.surahs.length} Surah`;


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
                    Tidak dapat memuatkan 114 Surah.
                </p>

                <button
                    onclick="loadSurahList()"
                    style="
                        margin-top:12px;
                        padding:10px 16px;
                        border-radius:10px;
                        background:#0f766e;
                        color:white;
                        border:0;
                    "
                >
                    Cuba Lagi
                </button>

            </div>
        `;

    }

}


/* =========================================================
   RENDER SURAH LIST
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

        /*
           Arabic + Bahasa Melayu
           dalam satu request.
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


        /*
           Jika terjemahan gagal,
           kita TIDAK akan reka terjemahan.
        */

        state.currentAyahs =
            arabic.ayahs.map(
                (ayah, index) => {

                    const translatedAyah =
                        translation &&
                        translation.ayahs &&
                        translation.ayahs[index]
                            ? translation.ayahs[index]
                            : null;


                    return {

                        arabic:
                            ayah.text,

                        number:
                            ayah.numberInSurah,

                        globalNumber:
                            ayah.number,

                        translation:
                            translatedAyah
                                ? translatedAyah.text
                                : "Terjemahan Bahasa Melayu tidak tersedia."

                    };

                }
            );


        renderAyahs();


        /*
           Selepas render,
           scroll ke ayat terakhir dibaca.
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
                            behavior: "smooth",
                            block: "center"
                        });

                    }

                },
                300
            );

        }


    } catch (error) {

        console.error(error);


        container.innerHTML = `
            <div class="loading">

                <div style="font-size:42px">
                    ⚠️
                </div>

                <p>
                    Gagal memuatkan ayat.
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
                        border-radius:10px;
                        background:#0f766e;
                        color:white;
                        border:0;
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


    if (
        !state.currentAyahs.length
    ) {

        container.innerHTML = `
            <div class="loading">
                <p>Tiada ayat tersedia.</p>
            </div>
        `;

        return;

    }


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
   PLAY AYAT
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
       Jika tekan ayat yang sama
       ketika sedang bermain,
       pause.
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


    const url =
        `https://cdn.islamic.network/quran/audio/${AUDIO_BITRATE}/${AUDIO_EDITION}/${ayah.globalNumber}.mp3`;


    /*
       Reset progress
    */

    const card =
        document.getElementById(
            `ayah-${ayah.number}`
        );


    if (card) {

        const progress =
            card.querySelector(
                ".progress"
            );


        if (progress) {

            progress.value = 0;

        }

    }


    /*
       Reset button lama.
    */

    updateCurrentButton("▶");


    currentPlayButton = null;


    /*
       Set audio.
    */

    audio.src =
        url;


    /*
       Simpan button baru.
    */

    if (card) {

        currentPlayButton =
            card.querySelector(
                ".play-btn"
            );

    }


    updateCurrentButton("⏸");


    /*
       Simpan last read.
    */

    saveLastRead(
        state.currentSurah.number,
        ayah.number
    );


    /*
       Scroll ayat sedang dimainkan
       ke tengah skrin.
    */

    card?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    /*
       Mainkan audio.
    */

    audio.play()
        .then(
            () => {

                state.isPlaying =
                    true;

            }
        )
        .catch(
            error => {

                console.error(
                    "Audio gagal dimainkan:",
                    error
                );

                updateCurrentButton(
                    "▶"
                );

            }
        );

}


/* =========================================================
   AUDIO ENDED
   ========================================================= */

function handleAudioEnded() {

    /*
       Ayat terakhir?
    */

    const nextIndex =
        state.currentAyahIndex + 1;


    if (
        nextIndex >=
        state.currentAyahs.length
    ) {

        /*
           Tamat Surah.
        */

        state.isPlaying =
            false;

        updateCurrentButton(
            "▶"
        );

        currentPlayButton =
            null;

        return;

    }


    /*
       Auto-next.
    */

    if (
        state.autoPlay
    ) {

        state.currentAyahIndex =
            nextIndex;


        /*
           Sedikit delay supaya
           pertukaran audio lancar.
        */

        setTimeout(
            () => {

                playCurrentAyah();

            },
            250
        );

    }

}


/* =========================================================
   UPDATE AUDIO PROGRESS
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
   UPDATE CURRENT PLAY BUTTON
   ========================================================= */

function updateCurrentButton(
    symbol
) {

    if (
        currentPlayButton
    ) {

        currentPlayButton
            .textContent =
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


    if (
        index >= 0
    ) {

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
   CHECK BOOKMARK
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


    } catch (error) {

        console.error(error);


        alert(
            "Tidak dapat menyalin ayat."
        );

    }

}


/* =========================================================
   SHARE AYAH
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
                "Teks telah disalin untuk dikongsi."
            );

        }

    } catch (error) {

        /*
           User mungkin tekan Cancel.
           Jangan tunjuk error.
        */

        console.log(
            "Share dibatalkan."
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


/* =========================================================
   RENDER LAST READ
   ========================================================= */

function renderLastRead() {

    const card =
        $("lastReadCard");


    if (
        !card
    ) return;


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
   SEARCH SURAH
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


    const page =
        $(pageId);


    if (
        page
    ) {

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


/* =========================================================
   APPLY THEME
   ========================================================= */

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


/* =========================================================
   UPDATE THEME SWITCH
   ========================================================= */

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
   GLOBAL FUNCTIONS
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
