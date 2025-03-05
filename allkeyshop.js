import { firefox } from 'playwright-firefox'; // stealth plugin needs no outdated playwright-extra
import { datetime, filenamify, prompt, handleSIGINT, stealth } from './src/util.js';
import { cfg } from './src/config.js';

var context = null;
var page = null;

function r(min, max) {  
  var precision = 100; 
  return Math.floor(Math.random() * (max * precision - min * precision) + min * precision) / precision;
}

const run = async () => {
  
  context = await firefox.launchPersistentContext(cfg.dir.browser, {
    headless: true,
    viewport: { width: cfg.width, height: cfg.height },
    locale: 'fr-FR', // ignore OS locale to be sure to have english text for locators -> done via /en in URL
    recordVideo: cfg.record ? { dir: 'data/record/', size: { width: cfg.width, height: cfg.height } } : undefined, // will record a .webm video for each page navigated; without size, video would be scaled down to fit 800x800
    recordHar: cfg.record ? { path: `data/record/gog-${filenamify(datetime())}.har` } : undefined, // will record a HAR file with network requests and responses; can be imported in Chrome devtools
    handleSIGINT: false, // have to handle ourselves and call context.close(), otherwise recordings from above won't be saved
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });


  handleSIGINT(context);
  await stealth(context);

  context.setDefaultTimeout(cfg.debug ? 0 : cfg.timeout);

  page = context.pages().length ? context.pages()[0] : await context.newPage(); // should always exist
}

await run();

const authSelector = async(url) => {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await Promise.any([page.waitForURL(/.*allkeyshop.com.*/).then(async () => {
    //if not logged
    await page.waitForTimeout(r(2, 5)*1000);
    if (!await page.locator('li').getByText("Logout", {exact: false}).count()) {
      
      console.log("google auth selected");
      switch("google"){
        case "google":
          await page.locator('.theChampGoogleLogin').nth(2).click()
          await page.waitForTimeout(3*1000);
          await googleAuth();
          await page.waitForTimeout(10*1000);
          break;
      }
      
      await page.reload();
      //if log not work
      if (!await page.locator('li').getByText("Logout", {exact: false}).count()) {
        await context.close();
        page = null;
        
        await run();
        return await authSelector(url);
      }
    }
    console.log("login success")
    await page.waitForTimeout(r(3, 6)*1000);
  }), page.locator('li').getByText("Logout", {exact: false}).waitFor()]).catch(_ => {});
}

const googleAuth = async () => {
  if (await page.locator('li').filter({ hasText: 'Utiliser un autre compte' }).count()) {
    await page.locator('li').filter({ hasText: 'Utiliser un autre compte' }).click()
    await page.waitForTimeout(1*1000);
  }

  const email = cfg.aks_gg_email || await prompt({ message: 'Enter email' });
  const pwd = cfg.aks_gg_password || await prompt({ type: 'password', message: 'Enter password' });

  await page.locator("id=identifierId").fill(email);
  await page.waitForTimeout(1*1000);
  await page.locator('button', {hasText: 'Suivant'}).click()
  await page.locator('input[type="password"]').fill(pwd)
  await page.waitForTimeout(1*1000);
  await page.locator('button', {hasText: 'Suivant'}).click()

}


const test = async (url) => {
  /*var child = await page.locator("div[text=Utiliser un autre compte]");

   if (child){
     var parent = await page.locator("div", { has: child});
     var linkk = await page.getByRole("link", {has: parent});
     var r = await page.locator('li', {has:linkk}).click();*/

    // console.log(r.click());
     //var link = await page.get_by_role("div").filter(has=parent);

     //console.log(parent);

     //link.click();
   //}
};

const urls = {
  wheel: 'https://www.allkeyshop.com/blog/reward-program/'
};

const wheel = async () => {
  await page.evaluate(() => window.confirmExtensionEnabled()); //fake allkeyshop addon for unlock free spin

  var curPoints = parseInt((await page.locator('.buw__list__item.p-3').innerText()).replace(/ /g, ''))
  console.log("");
  console.log("Current points: ", curPoints);
  
  if(await page.locator('button', {hasText: 'Get another Spin'}).count() && cfg.aks_another){
    if(curPoints < 50000) {
      console.log("Not enough points for get another spin !")
      console.log("Next free spin : ", await page.locator('div[data-countdown-format="__DAYS__d __HOURS__h __MINUTES__m __SECONDS__s"]').innerText());
      return;
    }
    
    console.log("Get another spin !")
    await page.locator('button', {hasText: 'Get another Spin'}).click();
    await page.waitForTimeout(r(4, 6)*1000);
   
    if(await page.locator('div', {hasText: 'you need a minimum of'}).count()) {
      console.log("Not enough points for get another spin !")
      console.log("Next free spin : ", await page.locator('div[data-countdown-format="__DAYS__d __HOURS__h __MINUTES__m __SECONDS__s"]').innerText());
      return;
    } else return await wheel();

  } else if(await page.locator('div[data-countdown-format="__DAYS__d __HOURS__h __MINUTES__m __SECONDS__s"]').count()) {
    console.log("All spins done today !");
    console.log("Next spin : ", await page.locator('div[data-countdown-format="__DAYS__d __HOURS__h __MINUTES__m __SECONDS__s"]').innerText());
    return;
  } else {  
    console.log("Spin the wheel ! Wait 30sec")

    await page.locator('canvas[id=wheel]').click({ button: 'left', position: { x:r(180, 310), y: r(180, 310)}});
    await page.waitForTimeout(r(4, 5)*1000);
    await page.locator('canvas[id=wheel]').click({ button: 'left', position: { x: r(180, 310), y: r(180, 310)}});
    await page.waitForTimeout(18*1000);
    console.log("Spin done !")

    console.log(await page.locator("h3").getByText('You won', {exact: false}).innerText());
    await page.waitForTimeout(r(2, 3)*1000);
    await page.locator('a[data-bs-dismiss="modal"]').nth(1).click();
    await page.waitForTimeout(r(4, 5)*1000);

    return await wheel()
  }
};

try {
  await [
    wheel,
  ].reduce((a, f) => a.then(async _ => { await authSelector(urls[f.name]); await f(); console.log() }), Promise.resolve());

} catch (error) {
  process.exitCode ||= 1;
  console.error('--- Exception:');
  console.error(error); // .toString()?
}
if (page.video()) console.log('Recorded video:', await page.video().path());
await context.close();




