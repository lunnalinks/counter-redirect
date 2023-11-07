const express = require('express')
const app = express()

const dotenv = require('dotenv');
dotenv.config();

const { Client } = require('pg')
const {
    DB_USER,
    HOST,
    DATABASE,
    PASSWORD,
    PORT,
    DB_PORT,
    DEFAULT_URL,
    MAX_CLICKS_PER_LINK
} = process.env;

const client = new Client({
    user: DB_USER,
    host: HOST,
    database: DATABASE,
    password: PASSWORD,
    port: DB_PORT,
    ssl: true
})

const qtd = MAX_CLICKS_PER_LINK;
const default_url = DEFAULT_URL;

client.connect(async function (err) {
    if (err) throw err;
    console.log("Connected!");

    // REDIRECT
    app.get('/visit', async (req, res) => {
        const { rows } = await client.query('SELECT id, link, clicks FROM links WHERE clicks < $1 GROUP BY id, link, clicks LIMIT 1;', [qtd])
        console.log(rows);
        if (!rows.length) return res.redirect(default_url);
        await client.query('UPDATE links SET clicks=$2 WHERE link=$1', [rows[0].link, rows[0].clicks + 1])
        return res.redirect(rows[0].link)
    });

    app.get('/', async (req, res) => {
        const { rows } = await client.query('SELECT id, link, clicks FROM links WHERE clicks < $1  GROUP BY id, clicks, link;', [qtd])
        return res.json({
            count: rows.length,
            available_links: rows.map(r => (r.link))
        })
    })


    // Show All Links and counted clicks
    app.get('/links', async (req, res) => {
        const { rows } = await client.query('SELECT * FROM links;')
        return res.json(rows)
    })

    // ADD MORE LINKS
    app.get('/add', async (req, res) => {
        const { link } = req.query;
        try {
            if(!link) res.redirect(`/links`)
            await client.query('INSERT INTO links(link, clicks) values ($1, 0);', [link])
        } catch (error) {}
        return res.redirect(`/links`)
    });

    // Remove link
    app.get('/remove', async (req, res) => {
        const { link } = req.query;
        try {
            await client.query('DELETE FROM links WHERE link = $1', [link])
        } catch (error) {}
        return res.redirect(301, `/links`)
    });

    // 
    app.get('/reset', async (req, res) => {
        const { link } = req.query;
        try {
            await client.query('UPDATE links SET clicks = 0 WHERE TRUE;')
        } catch (error) {}
        return res.redirect(301, `/links`)
    })

    app.listen(PORT, () => {
        console.log(`Example app listening on port ${PORT}`)
    })
});