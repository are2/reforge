const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const assert = require('assert');

describe('Settings View Test', function () {
  this.timeout(60000);
  let driver;

  before(async function () {
    const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
    const appPath = path.join(__dirname, '..');

    const chromedriverPath = path.join(__dirname, '..', 'node_modules', 'chromedriver', 'lib', 'chromedriver', 'chromedriver.exe');
    const service = new chrome.ServiceBuilder(chromedriverPath);

    const options = new chrome.Options();
    options.setBinaryPath(electronPath);
    options.addArguments(`app=${appPath}`);
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

  /**
   * Opens the settings window via the preload API and switches the driver
   * to the newly opened settings window.
   */
  async function openSettingsWindow() {
    // Wait for the main window to be ready
    await driver.wait(until.elementLocated(By.css('body')), 15000, 'Main window did not load');

    const mainHandle = await driver.getWindowHandle();

    // Open settings via preload API (same as clicking Settings in the menu)
    await driver.executeScript('window.system.openSettings()');

    // Wait for the new window to appear
    await driver.wait(async () => {
      const handles = await driver.getAllWindowHandles();
      return handles.length > 1;
    }, 15000, 'Settings window did not open');

    const handles = await driver.getAllWindowHandles();
    const settingsHandle = handles.find(h => h !== mainHandle);
    await driver.switchTo().window(settingsHandle);

    // Wait for the settings content to be rendered
    await driver.wait(until.elementLocated(By.css('.pb-6')), 15000, 'Settings content did not load');
  }

  it('should open the settings window', async function () {
    await openSettingsWindow();
    const title = await driver.getTitle();
    assert.strictEqual(title, 'Settings', 'Window title should be "Settings"');
  });

  it('should display the Appearance section with theme options', async function () {
    // Look for "Appearance" section heading
    const headings = await driver.findElements(By.css('h2'));
    const appearanceHeading = await findElementWithText(headings, 'APPEARANCE');
    assert.ok(appearanceHeading, 'Appearance section heading should be present');

    // Verify Dark Mode and Light Mode cards are present
    const darkModeLabel = await driver.findElement(By.xpath("//*[contains(text(), 'Dark Mode')]"));
    assert.ok(await darkModeLabel.isDisplayed(), 'Dark Mode option should be visible');

    const lightModeLabel = await driver.findElement(By.xpath("//*[contains(text(), 'Light Mode')]"));
    assert.ok(await lightModeLabel.isDisplayed(), 'Light Mode option should be visible');
  });

  it('should display the Features checkboxes', async function () {
    // Show stashes checkbox
    const stashesLabel = await driver.findElement(By.xpath("//label[contains(., 'Show stashes in history graph')]"));
    assert.ok(await stashesLabel.isDisplayed(), 'Show stashes checkbox should be visible');
    const stashesCheckbox = await stashesLabel.findElement(By.css('input[type="checkbox"]'));
    assert.ok(stashesCheckbox, 'Show stashes checkbox input should exist');

    // Merge conflict highlighting checkbox
    const mergeLabel = await driver.findElement(By.xpath("//label[contains(., 'Syntax highlighting in merge tool')]"));
    assert.ok(await mergeLabel.isDisplayed(), 'Merge conflict highlighting checkbox should be visible');
    const mergeCheckbox = await mergeLabel.findElement(By.css('input[type="checkbox"]'));
    assert.ok(mergeCheckbox, 'Merge conflict highlighting checkbox input should exist');
  });

  it('should display the History section with sort order radio buttons', async function () {
    const headings = await driver.findElements(By.css('h2'));
    const historyHeading = await findElementWithText(headings, 'HISTORY');
    assert.ok(historyHeading, 'History section heading should be present');

    // Topologically radio
    const topoLabel = await driver.findElement(By.xpath("//label[contains(., 'Topologically')]"));
    assert.ok(await topoLabel.isDisplayed(), 'Topologically radio option should be visible');
    const topoRadio = await topoLabel.findElement(By.css('input[type="radio"][value="topo"]'));
    assert.ok(topoRadio, 'Topologically radio input should exist');

    // By date radio
    const dateLabel = await driver.findElement(By.xpath("//label[contains(., 'By date')]"));
    assert.ok(await dateLabel.isDisplayed(), 'By date radio option should be visible');
    const dateRadio = await dateLabel.findElement(By.css('input[type="radio"][value="date"]'));
    assert.ok(dateRadio, 'By date radio input should exist');
  });

  it('should display the Git section with version selector', async function () {
    const headings = await driver.findElements(By.css('h2'));
    const gitHeading = await findElementWithText(headings, 'GIT');
    assert.ok(gitHeading, 'Git section heading should be present');

    // Git version dropdown
    const gitSelect = await driver.findElement(By.css('select'));
    assert.ok(await gitSelect.isDisplayed(), 'Git version selector should be visible');

    // The System Default option should always be present
    const systemOption = await gitSelect.findElement(By.css('option[value="system"]'));
    const systemText = await systemOption.getText();
    assert.ok(systemText.includes('System Default'), 'System Default option should be present');
  });

  it('should display Git global configuration inputs', async function () {
    // Name input
    const nameInput = await driver.findElement(By.css('input[placeholder="e.g. John Doe"]'));
    assert.ok(await nameInput.isDisplayed(), 'Git name input should be visible');

    // Email input
    const emailInput = await driver.findElement(By.css('input[placeholder="e.g. john@example.com"]'));
    assert.ok(await emailInput.isDisplayed(), 'Git email input should be visible');

    // Save Configuration button
    const saveButton = await driver.findElement(By.xpath("//button[contains(., 'Save Configuration')]"));
    assert.ok(await saveButton.isDisplayed(), 'Save Configuration button should be visible');
  });

  it('should display the Debugging section with verbose logging', async function () {
    const verboseLabel = await driver.findElement(By.xpath("//label[contains(., 'Verbose git logging')]"));
    assert.ok(await verboseLabel.isDisplayed(), 'Verbose git logging checkbox should be visible');
    const verboseCheckbox = await verboseLabel.findElement(By.css('input[type="checkbox"]'));
    assert.ok(verboseCheckbox, 'Verbose git logging checkbox input should exist');

    // Open git.log link
    const openLogButton = await driver.findElement(By.xpath("//button[contains(., 'Open git.log')]"));
    assert.ok(await openLogButton.isDisplayed(), 'Open git.log button should be visible');
  });

  it('should display the Close button in the footer', async function () {
    const closeButton = await driver.findElement(By.xpath("//button[contains(., 'Close')]"));
    assert.ok(await closeButton.isDisplayed(), 'Close button should be visible');
  });

  it('should allow toggling the sort order radio buttons', async function () {
    const topoRadio = await driver.findElement(By.css('input[type="radio"][value="topo"]'));
    const dateRadio = await driver.findElement(By.css('input[type="radio"][value="date"]'));

    // Click "By date"
    await dateRadio.click();
    assert.strictEqual(await dateRadio.isSelected(), true, 'By date radio should be selected after clicking');

    // Click "Topologically" back
    await topoRadio.click();
    assert.strictEqual(await topoRadio.isSelected(), true, 'Topologically radio should be selected after clicking');
  });

  it('should allow typing into the Git name and email fields', async function () {
    const nameInput = await driver.findElement(By.css('input[placeholder="e.g. John Doe"]'));
    const emailInput = await driver.findElement(By.css('input[placeholder="e.g. john@example.com"]'));

    // Clear and type into name field
    await nameInput.click();
    await nameInput.sendKeys(Key.CONTROL, 'a');
    await nameInput.sendKeys('Test User');
    const nameValue = await nameInput.getAttribute('value');
    assert.ok(nameValue.includes('Test User'), 'Name input should contain typed text');

    // Clear and type into email field
    await emailInput.click();
    await emailInput.sendKeys(Key.CONTROL, 'a');
    await emailInput.sendKeys('test@example.com');
    const emailValue = await emailInput.getAttribute('value');
    assert.ok(emailValue.includes('test@example.com'), 'Email input should contain typed text');
  });
});

/**
 * Finds an element in a list whose text content matches (case-insensitive).
 */
async function findElementWithText(elements, text) {
  for (const el of elements) {
    const elText = await el.getText();
    if (elText.toUpperCase().includes(text.toUpperCase())) {
      return el;
    }
  }
  return null;
}
