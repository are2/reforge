const { app, Menu } = require('electron'); app.whenReady().then(() => { console.log(Menu.getApplicationMenu() ? 'menu exists' : 'menu null'); app.quit(); });
