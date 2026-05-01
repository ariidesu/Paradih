// Parse metadata extracted from SongMeta and wiki and output to songs.json

const fs = require("fs");

const rawDataPath = process.argv[2];

// .json file that contains data extracted from SongMeta
const data = JSON.parse(fs.readFileSync(rawDataPath, "utf8"));

(async () => {
    const proberData = await (await fetch("https://api.prp.icel.site/api/v2/songs")).json();
    // we modify the prober data to only include what we need
    let filteredData = {};
    for (const songData of proberData) {
        if (!filteredData[songData.wiki_id]) {
            filteredData[songData.wiki_id] = { title: songData.title.replace(/[\s-]/g, "").toLowerCase(), wikiId: songData.wiki_id, charts: {} };
        }

        filteredData[songData.wiki_id].charts[songData.difficulty] = { const: songData.level };
    }
    // We turn it to array because... I don't need dict?
    filteredData = Object.values(filteredData);

    const difficultyMapping = {
        0: "detected",
        1: "invaded",
        2: "massive",
        3: "reboot"
    };
    const songs = data.map((song) => {
        const [_, dataSongId] = song.address.split("/");
        const sanitizedTitle = song.title
            .replace(/[\s-]/g, "")
            .toLowerCase();
        const foundSongData = filteredData.find((entry) => entry.title == sanitizedTitle || entry.wikiId == sanitizedTitle || entry.wikiId == dataSongId);
        const charts = { detected: 0, invaded: 0, massive: 0 };
        if (foundSongData) {
            song.charts.forEach((chart) => {
                if (foundSongData.charts[difficultyMapping[chart.difficulty]]) {
                    charts[difficultyMapping[chart.difficulty]] = foundSongData.charts[difficultyMapping[chart.difficulty]].const;
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

    fs.writeFileSync("../data/songs.json", JSON.stringify(songs, null, 4), "utf8");
})();
