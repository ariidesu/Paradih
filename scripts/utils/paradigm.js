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
    token: "L3zjy80kYqcmPuH6LMtfYQBNaTtNYTkhgpci+Ymq9ZBQusFE1XSvmT38xfzgkMQ1IZD26BPRyeri5gbGzAuCbv7WQHcT1YXJg3Q2nrfmrnipIUsv18w+MEx89Uy2XnMMoVfeNMQeWnGmohYtuD6ilc9fNZj4SvDTiGO1JxoGTUAtrJwRWlzLmBCdpo9isI/KObpQW1Tc8GcHEpZBSWeAEX2TalLDFoBQuPKPb+IBuJFo1OnvcZwTvr1jWeinoq0E5C1ub0g+oeARFhBzO8wPC8JQUsr+FDURwWrk5drV6e3i1kcPcfx6zzIkFq//WAWbUXmTDQx38Gf5X7PmSMH5oQ==",
    printNewToken: false,
    deviceId: "c15c3f28-be62-4ede-a2ca-5937ea54f8bc",
};

const KEY = ENV["AES_KEY"];
const HEADERS = {
    "User-Agent":
        "UnityPlayer/2021.3.40f1c1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)",
    "X-Language": "en",
    "X-game-version": "4.6",
    "X-game-build": "b5546a309dd637543a4a8f5535c78583",
    "X-api-version": "89",
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
