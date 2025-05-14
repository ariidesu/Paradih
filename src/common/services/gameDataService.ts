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

export interface GameData {
    titles: string[];
    backgrounds: string[];
    purchases: Record<string, PurchaseItem>;
    gears: GearData[];
    songs: SongData[];
}

export function buildGameDataService(app: FastifyInstance) {
    const titlesPath = path.join(__dirname, "../../data/titles.json");
    const backgroundsPath = path.join(__dirname, "../../data/backgrounds.json");
    const purchasesPath = path.join(__dirname, "../../data/purchases.json");
    const gearsPath = path.join(__dirname, "../../data/gears.json");
    const songsPath = path.join(__dirname, "../../data/songs.json");

    let gameData: GameData = {
        titles: [],
        backgrounds: [],
        purchases: {},
        gears: [],
        songs: []
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
        }
    };
}
