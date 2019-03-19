const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const args = process.argv;
const url = args[2];
const client = args[3];
const userId = args[4];
const date = args[5];
const random = Math.random().toFixed(7).toString().slice(2);

const baseSavePath = path.resolve(`../app/public/pdfs/`);
const fileSavePath = path.resolve(baseSavePath, `${client}/${userId}/${date}-${random}`);

console.log(fileSavePath);

if(!fs.existsSync(path.resolve(baseSavePath, `${client}`))) {
    fs.mkdirSync(path.resolve(baseSavePath, `${client}`));
}

if(!fs.existsSync(path.resolve(baseSavePath, `${client}/${userId}`))) {
    fs.mkdirSync(path.resolve(baseSavePath, `${client}/${userId}`));
}

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.pdf({ path: `${fileSavePath}.pdf`, format: 'A4' });

    await browser.close();
})();