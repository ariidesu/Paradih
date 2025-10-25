// Parse metadata extracted from SongMeta and wiki and output to songs.json

const fs = require("fs");

const rawDataPath = process.argv[2];

// .json file that contains data extracted from SongMeta
const data = JSON.parse(fs.readFileSync(rawDataPath, "utf8"));

(async () => {
    const proberData = await (await fetch("https://api.prp.icel.site/songs")).json();
    // we modify the prober data to only include what we need
    let filteredData = {};
    for (const songData of proberData) {
        if (!filteredData[songData.title]) {
            filteredData[songData.title] = { title: songData.title.replace(/[\s-]/g, "").toLowerCase(), charts: {} };
        }

        filteredData[songData.title].charts[songData.difficulty_id] = { const: songData.level };
    }
    // We turn it to array because... I don't need dict?
    filteredData = Object.values(filteredData);

    const difficultyMapping = {
        0: "detected",
        1: "invaded",
        2: "massive",
    };
    const songs = data.map((song) => {
        const sanitizedTitle = song.title
            .replace(/[\s-]/g, "")
            .toLowerCase();
        const foundSongData = filteredData.find((entry) => entry.title == sanitizedTitle);
        const charts = { detected: 0, invaded: 0, massive: 0 };
        if (foundSongData) {
            song.charts.forEach((chart) => {
                const difficulty = (chart.difficulty + 1).toString();
                if (foundSongData.charts[difficulty]) {
                    charts[difficultyMapping[chart.difficulty]] = foundSongData.charts[difficulty].const;
                }
            });
        }

        return {
            songId: song.address,
            title: song.title,
            bpm: song.bpm,
            genre: song.genre,
            composer: song.musician,
            illustrator: song.illustrator,
            version: {
                x: song.updateVersion.m_X,
                y: song.updateVersion.m_Y,
                z: song.updateVersion.m_Z,
            },
            charts: charts,
        };
    });

    fs.writeFileSync("../src/data/songs.json", JSON.stringify(songs, null, 4), "utf8");
})();
