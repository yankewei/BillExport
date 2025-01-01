import { chromium, devices, Locator } from "npm:playwright";
import { parseArgs } from "jsr:@std/cli/parse-args";

const flags = parseArgs(Deno.args, {
  boolean: ["debug"],
});

type keyboard = {
  [key: string]: Locator;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const iPhone = devices["iPhone 15 Pro"];
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  ...iPhone,
});
const page = await context.newPage();

let locator: Locator | null = null;

if (flags.debug) {
  // Load the HTML file from local, then we will do not need to actually login every time
  const filePath = `${Deno.cwd()}/after_bill_list.html`;
  const text = await Deno.readTextFile(filePath);
  await page.setContent(text);
  locator = page.locator(
    ".my-bill-wrapper-view.flex-column",
  ).nth(1);
} else {
  locator = await getCurrentPeriodBillLocator();
}

// Get All bill locator
const billsLocator = await locator.locator(
  ".common-bills-view .bills-box-view .more-bill-list-box > *",
).all();

interface BillDetail {
  billName: string;
  billType: string;
  billAmount: string;
}

const billListByDate: Record<string, BillDetail[]> = {};

let currentDate = "";

for (const billLocator of billsLocator) {
  try {
    const transDate = await billLocator.locator(".tran-date-header");

    if (await transDate.count() > 0) {
      currentDate = (await transDate.textContent()) || "";
    }

    const billDetail = await billLocator.locator(
      ".bill-detail-entry-view .detail-entry-box",
    ).first();

    const [billName, billType, billAmount] = await Promise.all([
      billDetail.locator(".tran-summary").textContent(),
      billDetail.locator(".tran-type").textContent(),
      billDetail.locator(".bill-amount").textContent(),
    ]);

    if (!billListByDate[currentDate]) {
      billListByDate[currentDate] = [];
    }

    billListByDate[currentDate].push({
      billName: billName || "",
      billType: billType || "",
      billAmount: billAmount || "",
    });
  } catch (error) {
    console.error(`Error processing bill: ${error}`);
    continue;
  }
}

console.log(JSON.stringify(billListByDate));

// Just wait for a while, then we can see the page
await sleep(1000000);
Deno.exit(0);

async function getCurrentPeriodBillLocator(): Promise<Locator> {
  await page.goto("https://xyk.cmbchina.com/portal-express/login");

  const idOrCreditCardLocator = await page.getByPlaceholder(
    "请输入身份证号 / 信用卡号",
  );

  const idOrCreditCardNumber = prompt("请输入身份证号 / 信用卡号:");

  if (idOrCreditCardNumber === null) {
    throw new Error("Cannot get your ID or CreditCard number");
  }

  await idOrCreditCardLocator.fill(idOrCreditCardNumber);

  // Pop the keyboard
  await page.getByText("请输入查询密码").tap();

  // Wait for the keyboard to show, otherwise we cannot get the keyboard element
  await sleep(2000);

  // Get the element by the keyboard num
  const keyboardElements = await page.locator('div[data-type="num"]').all();
  const keyboardArr: keyboard = {};

  for (const keyboardElement of keyboardElements) {
    const text = await keyboardElement.textContent();
    console.log(text, keyboardElement);
    if (text !== null) {
      keyboardArr[text] = keyboardElement;
    }
  }

  const password = prompt("请输入查询密码:");

  if (password === null) {
    throw new Error("Cannot get your password");
  }

  for (const char of password) {
    if (keyboardArr[char] !== null) {
      console.log(keyboardArr[char]);

      await keyboardArr[char].tap();
    }
  }

  await page.getByText("同意并登录").tap();

  const verifyCode = prompt("请输入验证码:");

  if (verifyCode === null) {
    throw new Error("Cannot get your verify code");
  }

  await page.getByPlaceholder("请输入验证码").fill(`${verifyCode}`);

  await page.getByText("提交").tap();

  await page.goto(
    "https://xyk.cmbchina.com/BillServiceWeb/index.shtml#/billHomePage",
  );

  // Wait the page loaded
  await sleep(5000);

  const billListElements = await page.locator(
    ".my-bill-wrapper-view.flex-column",
  ).all();
  const pageContent = await page.content();
  await Deno.writeTextFile("bill_list.html", pageContent);

  // List the bill for '本期账单'
  await billListElements[1].tap();

  // Wait for the bill listed
  await sleep(1000);

  await Deno.writeTextFile("after_bill_list.html", await page.content());

  return page.locator(".my-bill-wrapper-view.flex-column").nth(1);
}
