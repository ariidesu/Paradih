const fs = require("fs");
const zlib = require("zlib");
const { pipeline } = require("stream");
const { promisify } = require("util");
const multiprogress = require("./utils/multi-progress");
const { request } = require("./utils/paradigm");

const PLATFORMS = {
    ios: "iOS",
    android: "Android",
};

const streamPipeline = promisify(pipeline);

async function download(url, outPath) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Download failed: " + response.statusText);
    }
    const dir = outPath.split("/").slice(0, -1).join("/");
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    await streamPipeline(response.body, fs.createWriteStream(outPath));
}

async function requestCatalog() {
    for (const platformKey in PLATFORMS) {
        const platform = PLATFORMS[platformKey];

        const response = await request("/server/hotassets/catalog", {
            headers: { "X-Platform": platform },
        });
        fs.writeFileSync("../src/data/catalog/metadata.json", JSON.stringify({
            version: response.version
        }, null, 4));

        console.log(`Downloading catalog.json (Platform: ${platform})...`);
        await download(
            response.url.catalog,
            `../src/data/catalog/${platformKey}/catalog.json`
        );
        console.log(
            `Downloading catalog_checksum.json (Platform: ${platform})...`
        );
        await download(
            response.url.checksum,
            `../src/data/catalog/${platformKey}/catalog_checksum.json`
        );
    }
}

async function requestAssets() {
    const platformFiles = {};

    for (const platformKey in PLATFORMS) {
        const platform = PLATFORMS[platformKey];

        const catalog = JSON.parse(
            fs.readFileSync(
                `../src/data/catalog/${platformKey}/catalog.json`,
                "utf-8"
            )
        );
        const catalogChecksum = JSON.parse(
            fs.readFileSync(
                `../src/data/catalog/${platformKey}/catalog_checksum.json`,
                "utf-8"
            )
        );
        const assetPaths = [];
        catalog.m_InternalIds.forEach((id) => {
            if (id.includes("{PostDownloadSecureAddressables.RuntimePath}")) {
                assetPaths.push(
                    id.replace(
                        "{PostDownloadSecureAddressables.RuntimePath}",
                        ""
                    )
                );
            }
        });

        const requestPaths = [];
        for (const path of assetPaths) {
            // check if the asset exists and has the exact checksum
            const localPath = `../assets/${platformKey}${path}`;
            if (fs.existsSync(localPath)) {
                const filename = path.split("/").pop();
                const data = fs.readFileSync(localPath);
                const calculatedChecksum =
                    (zlib.crc32(data) & 0xffffffff) >>> 0;

                if (catalogChecksum[filename] == calculatedChecksum) {
                    continue;
                }
            }

            requestPaths.push(path);
        }

        if (requestPaths.length == 0) {
            console.log(`No assets to download for platform: ${platform}`);
            continue;
        }
        console.log(
            `Requesting for ${requestPaths.length} assets (Platform: ${platform})...`
        );
        const response = await request("/server/hotassets/sign", {
            method: "POST",
            body: { url_list: requestPaths },
            headers: { "X-Platform": platform },
        });

        platformFiles[platformKey] = response.data;
    }

    const bars = new multiprogress();

    await Promise.all(
        Object.keys(platformFiles).map(async (platformKey) => {
            const files = platformFiles[platformKey];
            const length = Object.keys(files).length;
            if (length == 0) return;

            const bar = bars.newBar("  :platform [:percent] ETA: :etas [:bar] :filename", {
                complete: "#",
                incomplete: " ",
                width: 30,
                total: length,
            });
            bar.update(0, { platform: PLATFORMS[platformKey], filename: "" });

            let cnt = 0;
            for (const fileKey in files) {
                const filename = fileKey.split("/").pop();

                bar.update(cnt / length, {
                    platform: PLATFORMS[platformKey],
                    filename,
                });
                const outPath = `../assets/${platformKey}${fileKey}`;
                const dir = outPath.split("/").slice(0, -1).join("/");
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                await download(files[fileKey], outPath);
                cnt++;
                bar.update(cnt / length, {
                    platform: PLATFORMS[platformKey],
                    filename,
                });
            }
        })
    );
}

(async () => {
    await requestCatalog();
    await requestAssets();

    process.exit(0);
})();
