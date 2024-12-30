import { webkit, devices, ElementHandle} from 'npm:playwright'

const sleep = (ms:number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const iPhone = devices['iPhone 14 Pro Max'];

(async () => {
  const browser = await webkit.launch({headless: false});
  const context = await browser.newContext({
    ...iPhone
  });
  const page = await context.newPage();
  await page.goto('https://xyk.cmbchina.com/portal-express/login');
  await page.getByPlaceholder('请输入身份证号 / 信用卡号').fill('your card number');

  await page.getByText('请输入查询密码').tap();

  const elements = await page.locator('div[data-type="num"]').elementHandles();
  const keyboardArr: { [key: string]: ElementHandle | null } = {
    "0": null,
    "1": null,
    "2": null,
    "3": null,
    "4": null,
    "5": null,
    "6": null,
    "7": null,
    "8": null,
    "9": null,
  }

  for (const element of elements) {
    const text = await element.textContent();
    if (text !== null) {
      keyboardArr[text] = element;
    }
  }

  ["your", "Withdrawal", "password"].forEach(charactor => {
    const element = keyboardArr[charactor];
    if (element !== null) {
      element.tap();
    }
  });

  await page.getByText('同意并登录').tap()

  const verifyCode = prompt("请输入验证码");
  await page.getByPlaceholder("请输入验证码").fill(`${verifyCode}`);

  await page.getByText('提交').tap()

  await sleep(1000000);
  // other actions...
  await browser.close();
})();