import fs from "fs";

export function readData(path) {
  try {
    if (!fs.existsSync(path)) fs.writeFileSync(path, "[]", "utf8");
    const data = fs.readFileSync(path, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error leyendo", path, error);
    return [];
  }
}

export function writeData(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error escribiendo", path, error);
  }
}
