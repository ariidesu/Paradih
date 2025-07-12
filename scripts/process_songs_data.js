// Parse metadata extracted from SongMeta and wiki and output to songs.json

const fs = require("fs");

const rawDataPath = process.argv[2];
const wikiDataPath = process.argv[3];

// .json file that contains data extracted from SongMeta
const data = JSON.parse(fs.readFileSync(rawDataPath, "utf8"));
// .json file that contains data extracted from the wiki (https://paradigmrebootzh.miraheze.org/wiki/Data:SongDetails.json?action=raw)
const wikiData = JSON.parse(fs.readFileSync(wikiDataPath, "utf8"));

const difficultyMapping = {
    0: "detected",
    1: "invaded",
    2: "massive",
};
const songs = data.map((song) => {
    const songIdFromAddress = song.address.split("/")[1];
    const wikiSongData =
        wikiData[songIdFromAddress] ??
        Object.values(wikiData).find((entry) => {
            const sanitizedTitle = song.title
                .replace(/[\s-]/g, "")
                .toLowerCase();
            const sanitizedEntryTitle = entry.title
                .replace(/[\s-]/g, "")
                .toLowerCase();
            return sanitizedTitle == sanitizedEntryTitle;
        });

    const charts = { detected: 0, invaded: 0, massive: 0 };
    if (wikiSongData) {
        song.charts.forEach((chart) => {
            const difficulty = difficultyMapping[chart.difficulty];
            if (wikiSongData.charts[difficulty]) {
                charts[difficulty] = wikiSongData.charts[difficulty].const;
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
