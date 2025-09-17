const fs = require("fs");
const crypto = require("crypto");

let RAW_ENV;
if (fs.existsSync(".env")) {
    RAW_ENV = fs.readFileSync(".env", "utf8");
} else if (fs.existsSync("../.env")) {
    RAW_ENV = fs.readFileSync("../.env", "utf8");
}
const ENV = {};
RAW_ENV.split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
        const eq = line.indexOf("=");
        if (eq == -1) {
            ENV[line] = "";
        } else {
            ENV[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        }
    });

const settings = {
    token: "TxqRGhR/0tu0iyM5KeIBrGNtFhud+imrxK/u8tjYRkgqiV3+2k14y0q9UATCT6aEQCZkHfjWsM8D8MyJU1CoOVtoE4vmNrj5AJBSeYw4WNCAT8lDL0rL5zeUuguQ3dyfxWp0GXJRpP154oidDkECBWhYXgeEA5ziLGXKZmQ5coTh8eOJSsrwFaHrHMz43WA9WyxSWhNYndymDZSlR08xmA03kE7OO603F2flty8GZrbY2Wtj8vzCRPQty5o1jRPEpKLlgfCXa/cJfcE0WwGiwTs1RYiPxl7UOrgJsGR6xEz1Qu902CQYwaIq8p2JI812LsJdb0i6thAIYU2XZ2vJTg==",
    printNewToken: false,
    deviceId: "96f7aea7-d2cd-442e-9662-18509c861d3d",
};

const KEY = ENV["AES_KEY"];
const HEADERS = {
    "User-Agent":
        "UnityPlayer/2021.3.40f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    "X-Language": "en",
    "X-game-version": "3.13",
    "X-game-build": "b5546a309dd637543a4a8f5535c78583",
    "X-api-version": "73",
    "X-Device-Id": settings.deviceId,
    "X-Session": settings.token,
    "X-Unity-Version": "2021.3.40f1c1",
};

function encrypt(payload) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-128-cbc", KEY, iv);

    return Buffer.concat([iv, cipher.update(payload, "utf-8"), cipher.final()]);
}

function decrypt(payload) {
    try {
        const iv = payload.subarray(0, 16);
        const encrypted = payload.subarray(16);
        const decipher = crypto.createDecipheriv("aes-128-cbc", KEY, iv);

        let decrypted = decipher.update(encrypted, undefined, "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
    } catch (e) {
        return payload.toString("utf-8");
    }
}

function canJsonify(object) {
    return (
        object !== undefined &&
        object !== null &&
        (object.constructor == Array || object.constructor == Object)
    );
}

function request(path, options, forceNoEncrypt = false, retried = false) {
    const headers =
        options && options.headers
            ? { ...options.headers, ...HEADERS }
            : { ...HEADERS };
    headers["content-type"] = "application/json";
    if (options && options.body) {
        options.body = canJsonify(options.body)
            ? JSON.stringify(options.body)
            : options.body;
    }

    if (
        options &&
        options.method == "POST" &&
        options.body &&
        !forceNoEncrypt
    ) {
        options.body = encrypt(options.body);
        headers["content-type"] = "application/octet-stream";
    }
    return new Promise(async (resolve, reject) => {
        const response = await fetch(
            `https://api.paradigm.tunergames.com${path}`,
            {
                ...options,
                headers,
            }
        );

        if (response.status == 401) {
            await refreshToken();
            if (!retried) {
                if (options && options.headers) {
                    options.headers["X-Session"] = HEADERS["X-Session"];
                }
                return resolve(request(path, options, true, true));
            } else {
                console.warn("Failed response: " + response.status);
            }
        }

        let data = Buffer.from(await response.arrayBuffer());
        if (
            response.headers.get("content-type") == "application/octet-stream"
        ) {
            data = decrypt(data);
        }
        try {
            const parsedData = JSON.parse(data.toString("utf-8"));
            resolve(parsedData);
        } catch (e) {
            console.warn("Failed to parse JSON:", e);
            resolve(data);
        }
    });
}

async function refreshToken() {
    const response = await request(
        "/user/refresh_token",
        {
            method: "POST",
            body: {},
        },
        true
    );

    if (settings.printNewToken) {
        console.log("!! New token: " + response.data.authToken);
    }
    HEADERS["X-Session"] = response.data.authToken;
}

module.exports = { request, refreshToken };
