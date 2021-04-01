import puppeteer from 'puppeteer';

const main = async () => {
  const browser = await puppeteer.launch({
    headless: false, 
  });
  
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  
  await page.goto('https://www.google.com');
}

main();
