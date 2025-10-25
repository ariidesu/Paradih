import { FastifyInstance, FastifyReply } from "fastify";
import { readFileSync, createReadStream, existsSync, statSync } from "fs";
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

interface BattleData {
    enabled: boolean;
    endTime: number;

    seasonId: string;
    seasonStartTime: number;
    seasonEndTime: number;
    timeSlots: {
        start: string;
        end: string;
    }[];
}

interface SongMetaData  {

}

interface TranslationData {
    "jp": Record<string, string>;
}

export interface GameData {
    titles: string[];
    backgrounds: string[];
    purchases: Record<string, PurchaseItem>;
    gears: GearData[];
    songs: SongData[];
    ranks: RankData[];
    battleData: BattleData;
    songMeta: SongMetaData;
    translation: TranslationData;
    catalog: {
        metadata: {
            version: string;
        };
        ios: {
            data: any;
            checksum: any;
        };
        android: {
            data: any;
            checksum: any;
        };
    }
}

export function buildGameDataService(app: FastifyInstance) {
    const titlesPath = path.join(__dirname, "../../../data/titles.json");
    const backgroundsPath = path.join(__dirname, "../../../data/backgrounds.json");
    const purchasesPath = path.join(__dirname, "../../../data/purchases.json");
    const gearsPath = path.join(__dirname, "../../../data/gears.json");
    const songsPath = path.join(__dirname, "../../../data/songs.json");
    const ranksPath = path.join(__dirname, "../../../data/ranks.json");
    const battlePath = path.join(__dirname, "../../../data/battle.json");
    const songMetaPath = path.join(__dirname, "../../../data/songmeta.json");
    const translationPath = path.join(__dirname, "../../../data/translation.json");

    const iosCatalogPath = path.join(__dirname, "../../../data/catalog/ios/catalog.json");
    const iosCatalogChecksumPath = path.join(__dirname, "../../../data/catalog/ios/catalog_checksum.json");
    const androidCatalogPath = path.join(__dirname, "../../../data/catalog/android/catalog.json");
    const androidCatalogChecksumPath = path.join(__dirname, "../../../data/catalog/android/catalog_checksum.json");

    let gameData: GameData = {
        titles: JSON.parse(readFileSync(titlesPath, "utf8")),
        backgrounds: JSON.parse(readFileSync(backgroundsPath, "utf8")),
        purchases: JSON.parse(readFileSync(purchasesPath, "utf8")),
        gears: JSON.parse(readFileSync(gearsPath, "utf8")),
        songs: JSON.parse(readFileSync(songsPath, "utf8")),
        ranks: JSON.parse(readFileSync(ranksPath, "utf8")),
        battleData: JSON.parse(readFileSync(battlePath, "utf8")),
        songMeta: JSON.parse(readFileSync(songMetaPath, "utf8")),
        translation: JSON.parse(readFileSync(translationPath, "utf8")),
        catalog: {
            metadata: JSON.parse(readFileSync(path.join(__dirname, "../../../data/catalog/metadata.json"), "utf8")),
            ios: {
                data: readFileSync(iosCatalogPath, "utf8"),
                checksum: readFileSync(iosCatalogChecksumPath, "utf8")
            },
            android: {
                data: readFileSync(androidCatalogPath, "utf8"),
                checksum: readFileSync(androidCatalogChecksumPath, "utf8")
            }
        }
    };

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

        getBattleData(): BattleData {
            return gameData.battleData;
        },

        getTranslations(): TranslationData {
            return gameData.translation;
        },

        getSongMeta(): SongMetaData {
            return gameData.songMeta;
        },

        getCatalogMetadata(): { version: string } {
            return gameData.catalog.metadata;
        },

        getCatalog(platform: "ios" | "android"): { data: any; checksum: any } {
            return gameData.catalog[platform];
        },

        assetExists(platform: "ios" | "android", assetPath: string): boolean {
            const basePath = path.join(__dirname, `../../../assets/${platform}/`);
            const fullPath = path.join(basePath, assetPath);
            if (!fullPath.startsWith(basePath)) {
                return false;
            }

            return existsSync(fullPath);
        },

        createAssetBinaryStreaming(reply: FastifyReply, platform: "ios" | "android", assetPath: string) {
            const basePath = path.join(__dirname, `../../../assets/${platform}/`);
            const fullPath = path.join(basePath, assetPath);

            if (!fullPath.startsWith(basePath)) {
                throw new Error("Invalid asset path");
            }

            const stat = statSync(fullPath);
            reply.header("Content-Length", stat.size.toString());

            return createReadStream(fullPath);
        }
    };
}
