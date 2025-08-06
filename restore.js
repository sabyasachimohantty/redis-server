import fs from 'fs/promises'

export default async function loadRDB(filename = 'dump.rdb') {
    try {
        const data = await fs.readFile(filename, 'utf-8')
        return JSON.parse(data)
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`No RDB snapshot found. Starting with an empty database`)
            return {}
        } 
        console.error(`Error loading RDB snapshot: ${error}`)
        return {}
    }
}
