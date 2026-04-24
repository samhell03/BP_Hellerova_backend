const CONTACTS_BY_COUNTRY = {
    CZ: [
        { label: "Tísňová linka", value: "112" },
        { label: "Policie", value: "158" },
        { label: "Záchranná služba", value: "155" },
        { label: "Hasiči", value: "150" }
    ],
    IT: [
        { label: "Tísňová linka", value: "112" },
        { label: "Policie", value: "113" },
        { label: "Záchranná služba", value: "118" },
        { label: "Hasiči", value: "115" }
    ],
    ES: [
        { label: "Tísňová linka", value: "112" },
        { label: "Policie", value: "091 / 062" },
        { label: "Záchranná služba", value: "061" },
        { label: "Hasiči", value: "080 / 085" }
    ],
    FR: [
        { label: "Tísňová linka", value: "112" },
        { label: "Policie", value: "17" },
        { label: "Záchranná služba", value: "15" },
        { label: "Hasiči", value: "18" }
    ],
    DE: [
        { label: "Tísňová linka", value: "112" },
        { label: "Policie", value: "110" },
        { label: "Záchranná služba", value: "112" },
        { label: "Hasiči", value: "112" }
    ]
};

function getEmergencyContacts(countryCode) {
    const code = String(countryCode || "").toUpperCase();
    return CONTACTS_BY_COUNTRY[code] || [{ label: "Tísňová linka", value: "112" }];
}

module.exports = { getEmergencyContacts };