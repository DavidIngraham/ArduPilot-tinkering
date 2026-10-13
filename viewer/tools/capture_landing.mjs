// Deterministic frame capture of the same orbitable applet used in the article.
// Set PLAYWRIGHT_MODULE to an installed Playwright module when not locally available.
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const [url, output, seconds="24"] = process.argv.slice(2);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1280,height:1280}});
const errors=[];page.on("pageerror",e=>errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(()=>typeof window.landingDraw==="function",{timeout:30000});
for(let i=0;i<=Number(seconds)*30;i++){
  const png=await page.evaluate(t=>{window.landingDraw(t);return document.querySelector("canvas").toDataURL("image/png").split(",")[1];},i/30);
  await writeFile(output+"/"+String(i).padStart(5,"0")+".png",Buffer.from(png,"base64"));
}
if(errors.length)throw Error(errors.join("\n"));
await browser.close();
