import fs from 'fs/promises'

export default async function saveRDB(data, filename = 'dump.rdb') {
    try {
        const serializedData = JSON.stringify(data)
        await fs.writeFile(filename, serializedData)
        console.log(`RDB snapshot saved to ${filename}`)
    } catch (error) {
        console.log(`Error saving RDB snapshot: ${error}`)
    }
}