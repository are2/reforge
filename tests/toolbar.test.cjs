const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const assert = require('assert');

describe('Toolbar Visibility Test', function () {
  this.timeout(60000); // Increased timeout for slow launches
  let driver;

  before(async function () {
    // Path to Electron binary (Windows)
    const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
    const appPath = path.join(__dirname, '..');

    const chromedriverPath = path.join(__dirname, '..', 'node_modules', 'chromedriver', 'lib', 'chromedriver', 'chromedriver.exe');
    const service = new chrome.ServiceBuilder(chromedriverPath);

    const options = new chrome.Options();
    options.setBinaryPath(electronPath);
    // Tell Electron to load the current directory as an app
    options.addArguments(`app=${appPath}`);
    // Disable some features that might interfere with tests
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .setChromeService(service)
      .build();

  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should display all toolbar buttons accurately', async function () {
    // Wait for the action toolbar to be present in the DOM
    const toolbar = await driver.wait(until.elementLocated(By.css('[data-testid="action-toolbar"]')), 20000);
    assert.ok(toolbar, 'Action toolbar should be present');

    const expectedLabels = [
      'Open',
      'Clone',
      'Fetch',
      'Pull',
      'Push',
      'Branch',
      'Pull Request'
    ];

    for (const label of expectedLabels) {
      const testId = `toolbar-btn-${label}`;
      const button = await driver.wait(until.elementLocated(By.css(`[data-testid="${testId}"]`)), 5000);
      const isVisible = await button.isDisplayed();
      assert.strictEqual(isVisible, true, `Button with label "${label}" (test-id: ${testId}) should be visible`);
      
      const labelElement = await button.findElement(By.css(`[data-testid="toolbar-btn-label-${label}"]`));
      const labelText = await labelElement.getText();
      assert.strictEqual(labelText, label, `Button label should match "${label}"`);
    }
  });
});
