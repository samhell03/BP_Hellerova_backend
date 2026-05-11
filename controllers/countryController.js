const axios = require("axios");

let countriesCache = null;
let countriesCacheTime = 0;
const COUNTRIES_TTL_MS = 24 * 60 * 60 * 1000; 

const COUNTRIES_URLS = [
    "https://restcountries.com/v3.1/all?fields=name,cca2,flags,latlng,translations",
    "https://restcountries.com/v3.1/all"
];

function formatCountries(data) {
    return data
        .map((c) => {
            const englishName = c?.name?.common ?? "";
            const czechName = c?.translations?.ces?.common ?? englishName;

            return {
                name: englishName,
                nameCs: czechName,
                code: (c?.cca2 ?? "").toUpperCase(),
                flag: c?.flags?.png ?? c?.flags?.svg ?? "",
                lat: Array.isArray(c?.latlng) ? c.latlng[0] : null,
                lng: Array.isArray(c?.latlng) ? c.latlng[1] : null
            };
        })
        .filter((c) => c.name && c.code)
        .sort((a, b) =>
            (a.nameCs || a.name).localeCompare((b.nameCs || b.name), "cs")
        );
}

async function fetchCountriesFromApi() {
    let lastError = null;

    for (const url of COUNTRIES_URLS) {
        try {
            const response = await axios.get(url, {
                timeout: 8000
            });

            const data = Array.isArray(response.data) ? response.data : [];
            const formatted = formatCountries(data);

            if (formatted.length > 0) {
                return formatted;
            }
        } catch (error) {
            lastError = error;
            console.error(`Chyba při načítání zemí z ${url}:`, error.message);
        }
    }

    throw lastError || new Error("Nepodařilo se načíst země z externího API.");
}

exports.getCountries = async (req, res) => {
    try {
        const now = Date.now();

        if (countriesCache && now - countriesCacheTime < COUNTRIES_TTL_MS) {
            return res.json(countriesCache);
        }

        const formatted = await fetchCountriesFromApi();

        countriesCache = formatted;
        countriesCacheTime = now;

        return res.json(formatted);
    } catch (err) {
        console.error("Chyba /api/countries:", err.message);

        if (countriesCache && countriesCache.length > 0) {
            console.warn("Vrací se starší countries cache kvůli chybě externího API.");
            return res.json(countriesCache);
        }

        return res.status(503).json({
            message: "Nepodařilo se načíst země."
        });
    }
};

exports.searchCity = async (req, res) => {
    try {
        const city = String(req.query.city || "").trim();
        const countryCode = String(req.query.countryCode || "").trim().toUpperCase();

        if (!city) {
            return res.status(400).json({ message: "Město je povinné." });
        }

        if (!countryCode || countryCode.length !== 2) {
            return res.status(400).json({ message: "Kód země je povinný." });
        }

        const response = await axios.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            {
                timeout: 8000,
                params: {
                    name: city,
                    count: 10,
                    language: "cs",
                    format: "json",
                    countryCode
                }
            }
        );

        const results = Array.isArray(response.data?.results)
            ? response.data.results
            : [];

        const formatted = results
            .map((item) => ({
                id: item.id,
                name: item.name || "",
                admin1: item.admin1 || "",
                country: item.country || "",
                countryCode: (item.country_code || countryCode || "").toUpperCase(),
                latitude: item.latitude ?? null,
                longitude: item.longitude ?? null
            }))
            .filter(
                (item) =>
                    item.name &&
                    item.countryCode &&
                    item.latitude != null &&
                    item.longitude != null
            );

        return res.json(formatted);
    } catch (err) {
        console.error("Chyba při hledání města:", err.message);
        return res.status(500).json({
            message: "Nepodařilo se vyhledat město."
        });
    }
};