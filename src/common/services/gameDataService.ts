import { FastifyInstance } from "fastify";
import { readFileSync } from "fs";
import path from "path";

interface PurchaseItem {
    cost: number;
    moneyType: "ac" | "dp" | "navi";
    productType: "main" | "side" | "single" | "skin";
    discount: {
        afterDiscount: number;
        beforeDiscount: number;
        discountTime: number;
        enable: boolean;
    };
    limitedTime: number;
    startTime: number;
}

interface GearData {
    gear: number;
    cost: number;
    dp: number;
}

interface SongData {
    songId: string;
    title: string;
    bpm: string;
    composer: string;
    illustrator: string;
    version: {
        x: number;
        y: number;
        z: number;
    };
    genre: string;
    charts: {
        detected: number;
        invaded: number;
        massive: number;
    };
}

interface RankReward {
    id: string;
    // The server actually send conditions like this
    // ["1", "star_value"]
    // Since only "1" is used, we only store the star value
    star: number;
    reward: {
        // Internally, "dp" corresponds to "0", "title" to "1" and "background" to "2"
        type: "dp" | "title" | "background";
        value: string | number;
    };
}

interface RankData {
    id: string;
    level: number;
    type: number;
    borders: [number, number];
    starBorders: [number, number];
    untilTime: number;
    cost: number;
    playCostType: "dp";
    charts: string[];
    rewards: RankReward[];
    gauge: {
        type: number;
        values: {
            decrypted: number;
            received: number;
            lost: number;
        };
    };
    unlockTag: string[];
}

export interface GameData {
    titles: string[];
    backgrounds: string[];
    purchases: Record<string, PurchaseItem>;
    gears: GearData[];
    songs: SongData[];
    ranks: RankData[];
}

export function buildGameDataService(app: FastifyInstance) {
    const titlesPath = path.join(__dirname, "../../data/titles.json");
    const backgroundsPath = path.join(__dirname, "../../data/backgrounds.json");
    const purchasesPath = path.join(__dirname, "../../data/purchases.json");
    const gearsPath = path.join(__dirname, "../../data/gears.json");
    const songsPath = path.join(__dirname, "../../data/songs.json");
    const ranksPath = path.join(__dirname, "../../data/ranks.json");

    let gameData: GameData = {
        titles: [],
        backgrounds: [],
        purchases: {},
        gears: [],
        songs: [],
        ranks: [],
    };

    const titlesData = JSON.parse(readFileSync(titlesPath, "utf8"));
    gameData.titles = titlesData;

    const backgroundsData = JSON.parse(readFileSync(backgroundsPath, "utf8"));
    gameData.backgrounds = backgroundsData;

    const purchasesData = JSON.parse(readFileSync(purchasesPath, "utf8"));
    gameData.purchases = purchasesData;

    const gearsData = JSON.parse(readFileSync(gearsPath, "utf8"));
    gameData.gears = gearsData;

    const songsData = JSON.parse(readFileSync(songsPath, "utf8"));
    gameData.songs = songsData;

    const ranksData = JSON.parse(readFileSync(ranksPath, "utf8"));
    gameData.ranks = ranksData;

    return {
        getPurchases(): Record<string, PurchaseItem> {
            return gameData.purchases;
        },

        getPurchaseById(id: string): PurchaseItem | undefined {
            return gameData.purchases[id];
        },

        getGearData(gearId: number): GearData | undefined {
            return gameData.gears.find((gear) => gear.gear == gearId);
        },

        getSongs(): SongData[] {
            return gameData.songs;
        },

        getSongData(songId: string): SongData | undefined {
            return gameData.songs.find((song) => song.songId == songId);
        },

        getRanks(): RankData[] {
            return gameData.ranks;
        },

        getRankData(id: string): RankData | undefined {
            return gameData.ranks.find((rank) => rank.id == id);
        },
    };
}
