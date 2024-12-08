import * as path from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import {
	app,
	shell,
	Menu,
	MenuItemConstructorOptions,
	dialog,
} from 'electron';
import {
	is,
	appMenu,
	openUrlMenuItem,
	aboutMenuItem,
	openNewGitHubIssue,
	debugInfo,
} from 'electron-util';
import config from './config';
import getSpellCheckerLanguages from './spell-checker';
import {
	sendAction,
	showRestartDialog,
	getWindow,
	toggleTrayIcon,
	toggleLaunchMinimized,
} from './util';
import { generateSubmenu as generateEmojiSubmenu } from './emoji';
import { toggleMenuBarMode } from './menu-bar-mode';
import { caprineIconPath } from './constants';

export default async function updateMenu(): Promise<Menu> {
	const newConversationItem: MenuItemConstructorOptions = {
		label: '開啟新對話',
		accelerator: 'CommandOrControl+N',
		click() {
			sendAction('new-conversation');
		},
	};

	const newRoomItem: MenuItemConstructorOptions = {
		label: '開啟新房間',
		accelerator: 'CommandOrControl+O',
		click() {
			sendAction('new-room');
		},
	};

	const switchItems: MenuItemConstructorOptions[] = [
		{
			label: '切換到工作聊天',
			accelerator: 'CommandOrControl+Shift+2',
			visible: !config.get('useWorkChat'),
			click() {
				config.set('useWorkChat', true);
				app.relaunch();
				app.quit();
			},
		},
		{
			label: '切換到 Messenger…',
			accelerator: 'CommandOrControl+Shift+1',
			visible: config.get('useWorkChat'),
			click() {
				config.set('useWorkChat', false);
				app.relaunch();
				app.quit();
			},
		},
		{
			label: '登出',
			click() {
				sendAction('log-out');
			},
		},
	];

	const vibrancySubmenu: MenuItemConstructorOptions[] = [
		{
			label: '無背景模糊效果',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'none',
			async click() {
				config.set('vibrancy', 'none');
				sendAction('update-vibrancy');
				await updateMenu();
			},
		},
		{
			label: '僅側邊欄模糊',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'sidebar',
			async click() {
				config.set('vibrancy', 'sidebar');
				sendAction('update-vibrancy');
				await updateMenu();
			},
		},
		{
			label: '整個視窗模糊',
			type: 'checkbox',
			checked: config.get('vibrancy') === 'full',
			async click() {
				config.set('vibrancy', 'full');
				sendAction('update-vibrancy');
				await updateMenu();
			},
		},
	];

	const themeSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '跟隨系統外觀',
			type: 'checkbox',
			checked: config.get('theme') === 'system',
			async click() {
				config.set('theme', 'system');
				sendAction('set-theme');
				await updateMenu();
			},
		},
		{
			label: '淺色模式',
			type: 'checkbox',
			checked: config.get('theme') === 'light',
			async click() {
				config.set('theme', 'light');
				sendAction('set-theme');
				await updateMenu();
			},
		},
		{
			label: '深色模式',
			type: 'checkbox',
			checked: config.get('theme') === 'dark',
			async click() {
				config.set('theme', 'dark');
				sendAction('set-theme');
				await updateMenu();
			},
		},
	];

	const sidebarSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '自適應側邊欄',
			type: 'checkbox',
			checked: config.get('sidebar') === 'default',
			async click() {
				config.set('sidebar', 'default');
				sendAction('update-sidebar');
				await updateMenu();
			},
		},
		{
			label: '隱藏側邊欄',
			type: 'checkbox',
			checked: config.get('sidebar') === 'hidden',
			accelerator: 'CommandOrControl+Shift+S',
			async click() {
				// Toggle between default and hidden
				config.set('sidebar', config.get('sidebar') === 'hidden' ? 'default' : 'hidden');
				sendAction('update-sidebar');
				await updateMenu();
			},
		},
		{
			label: '窄側邊欄',
			type: 'checkbox',
			checked: config.get('sidebar') === 'narrow',
			async click() {
				config.set('sidebar', 'narrow');
				sendAction('update-sidebar');
				await updateMenu();
			},
		},
		{
			label: '寬側邊欄',
			type: 'checkbox',
			checked: config.get('sidebar') === 'wide',
			async click() {
				config.set('sidebar', 'wide');
				sendAction('update-sidebar');
				await updateMenu();
			},
		},
	];

	const privacySubmenu: MenuItemConstructorOptions[] = [
		{
			label: '阻止已讀通知',
			type: 'checkbox',
			checked: config.get('block.chatSeen' as any),
			click(menuItem) {
				config.set('block.chatSeen' as any, menuItem.checked);
			},
		},
		{
			label: '阻止輸入中指示',
			type: 'checkbox',
			checked: config.get('block.typingIndicator' as any),
			click(menuItem) {
				config.set('block.typingIndicator' as any, menuItem.checked);
			},
		},
		{
			label: '阻止送達回條',
			type: 'checkbox',
			checked: config.get('block.deliveryReceipt' as any),
			click(menuItem) {
				config.set('block.deliveryReceipt' as any, menuItem.checked);
			},
		},
	];

	const advancedSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '自訂樣式',
			click() {
				const filePath = path.join(app.getPath('userData'), 'custom.css');
				const defaultCustomStyle = `/*
This is the custom styles file where you can add anything you want.
The styles here will be injected into Caprine and will override default styles.
If you want to disable styles but keep the config, just comment the lines that you don't want to be used.

Press Command/Ctrl+R in Caprine to see your changes.
*/
`;

				if (!existsSync(filePath)) {
					writeFileSync(filePath, defaultCustomStyle, 'utf8');
				}

				shell.openPath(filePath);
			},
		},
	];

	const preferencesSubmenu: MenuItemConstructorOptions[] = [
		{
			/* TODO: Fix privacy features */
			/* If you want to help, see #1688 */
			label: '隱私',
			visible: is.development,
			submenu: privacySubmenu,
		},
		{
			label: '表情符號樣式',
			submenu: await generateEmojiSubmenu(updateMenu),
		},
		{
			label: '收到訊息時彈跳 Dock',
			type: 'checkbox',
			visible: is.macos,
			checked: config.get('bounceDockOnMessage'),
			click() {
				config.set('bounceDockOnMessage', !config.get('bounceDockOnMessage'));
			},
		},
		{
			/* TODO: Fix ability to disable autoplay */
			/* GitHub issue: #1845 */
			label: '自動播放影片',
			id: 'video-autoplay',
			type: 'checkbox',
			visible: is.development,
			checked: config.get('autoplayVideos'),
			click() {
				config.set('autoplayVideos', !config.get('autoplayVideos'));
				sendAction('toggle-video-autoplay');
			},
		},
		{
			/* TODO: Fix notifications */
			label: '在通知中顯示訊息預覽',
			type: 'checkbox',
			visible: is.development,
			checked: config.get('notificationMessagePreview'),
			click(menuItem) {
				config.set('notificationMessagePreview', menuItem.checked);
			},
		},
		{
			/* TODO: Fix notifications */
			label: '靜音通知',
			id: 'mute-notifications',
			type: 'checkbox',
			visible: is.development,
			checked: config.get('notificationsMuted'),
			click() {
				sendAction('toggle-mute-notifications');
			},
		},
		{
			label: '靜音來電鈴聲',
			type: 'checkbox',
			checked: config.get('callRingtoneMuted'),
			click() {
				config.set('callRingtoneMuted', !config.get('callRingtoneMuted'));
			},
		},
		{
			/* TODO: Fix notification badge */
			label: '顯示未讀標記',
			type: 'checkbox',
			visible: is.development,
			checked: config.get('showUnreadBadge'),
			click() {
				config.set('showUnreadBadge', !config.get('showUnreadBadge'));
				sendAction('reload');
			},
		},
		{
			label: '拼字檢查',
			type: 'checkbox',
			checked: config.get('isSpellCheckerEnabled'),
			click() {
				config.set('isSpellCheckerEnabled', !config.get('isSpellCheckerEnabled'));
				showRestartDialog('需要重新啟動以啟用或停用拼字檢查。');
			},
		},
		{
			label: '硬體加速',
			type: 'checkbox',
			checked: config.get('hardwareAcceleration'),
			click() {
				config.set('hardwareAcceleration', !config.get('hardwareAcceleration'));
				showRestartDialog('需要重新啟動以更改硬體加速設定。');
			},
		},
		{
			label: '顯示選單欄圖示',
			id: 'menuBarMode',
			type: 'checkbox',
			visible: is.macos,
			checked: config.get('menuBarMode'),
			click() {
				config.set('menuBarMode', !config.get('menuBarMode'));
				toggleMenuBarMode(getWindow());
			},
		},
		{
			label: '總是置頂',
			id: 'always-on-top',
			type: 'checkbox',
			accelerator: 'CommandOrControl+Shift+T',
			checked: config.get('alwaysOnTop'),
			async click(menuItem, focusedWindow, event) {
				if (!config.get('alwaysOnTop') && config.get('showAlwaysOnTopPrompt') && event.shiftKey) {
					const result = await dialog.showMessageBox(focusedWindow!, {
						message: '確定要讓視窗保持在其他視窗之上嗎？',
						detail: '這是由 Command/Control+Shift+T 觸發的。',
						buttons: [
							'顯示在最上層',
							'不要顯示在最上層',
						],
						defaultId: 0,
						cancelId: 1,
						checkboxLabel: '不要再顯示此提示',
					});

					config.set('showAlwaysOnTopPrompt', !result.checkboxChecked);

					if (result.response === 0) {
						config.set('alwaysOnTop', !config.get('alwaysOnTop'));
						focusedWindow?.setAlwaysOnTop(menuItem.checked);
					} else if (result.response === 1) {
						menuItem.checked = false;
					}
				} else {
					config.set('alwaysOnTop', !config.get('alwaysOnTop'));
					focusedWindow?.setAlwaysOnTop(menuItem.checked);
				}
			},
		},
		{
			/* TODO: Add support for Linux */
			label: '開機啟動',
			visible: !is.linux,
			type: 'checkbox',
			checked: app.getLoginItemSettings().openAtLogin,
			click(menuItem) {
				app.setLoginItemSettings({
					openAtLogin: menuItem.checked,
					openAsHidden: menuItem.checked,
				});
			},
		},
		{
			label: '自動隱藏選單欄',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('autoHideMenuBar'),
			click(menuItem, focusedWindow) {
				config.set('autoHideMenuBar', menuItem.checked);
				focusedWindow?.setAutoHideMenuBar(menuItem.checked);
				focusedWindow?.setMenuBarVisibility(!menuItem.checked);

				if (menuItem.checked) {
					dialog.showMessageBox({
						type: 'info',
						message: '按 Alt 鍵切換選單欄。',
						buttons: ['確定'],
					});
				}
			},
		},
		{
			label: '自動更新',
			type: 'checkbox',
			checked: config.get('autoUpdate'),
			click() {
				config.set('autoUpdate', !config.get('autoUpdate'));
			},
		},
		{
			/* TODO: Fix notifications */
			label: '收到訊息時閃爍視窗',
			type: 'checkbox',
			visible: is.development,
			checked: config.get('flashWindowOnMessage'),
			click(menuItem) {
				config.set('flashWindowOnMessage', menuItem.checked);
			},
		},
		{
			id: 'showTrayIcon',
			label: '顯示系統列圖示',
			type: 'checkbox',
			enabled: !is.macos && !config.get('launchMinimized'),
			checked: config.get('showTrayIcon'),
			click() {
				toggleTrayIcon();
			},
		},
		{
			label: '最小化啟動',
			type: 'checkbox',
			visible: !is.macos,
			checked: config.get('launchMinimized'),
			click() {
				toggleLaunchMinimized(menu);
			},
		},
		{
			label: '關閉視窗時退出',
			type: 'checkbox',
			checked: config.get('quitOnWindowClose'),
			click() {
				config.set('quitOnWindowClose', !config.get('quitOnWindowClose'));
			},
		},
		{
			type: 'separator',
		},
		{
			label: '進階',
			submenu: advancedSubmenu,
		},
	];

	const viewSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '重設文字大小',
			accelerator: 'CommandOrControl+0',
			click() {
				sendAction('zoom-reset');
			},
		},
		{
			label: '放大文字大小',
			accelerator: 'CommandOrControl+Plus',
			click() {
				sendAction('zoom-in');
			},
		},
		{
			label: '縮小文字大小',
			accelerator: 'CommandOrControl+-',
			click() {
				sendAction('zoom-out');
			},
		},
		{
			type: 'separator',
		},
		{
			label: '主題',
			submenu: themeSubmenu,
		},
		{
			label: '背景模糊效果',
			visible: is.macos,
			submenu: vibrancySubmenu,
		},
		{
			type: 'separator',
		},
		{
			label: '隱藏名稱與頭像',
			id: 'privateMode',
			type: 'checkbox',
			checked: config.get('privateMode'),
			accelerator: 'CommandOrControl+Shift+N',
			async click(menuItem, _browserWindow, event) {
				if (!config.get('privateMode') && config.get('showPrivateModePrompt') && event.shiftKey) {
					const result = await dialog.showMessageBox(_browserWindow!, {
						message: '確定要隱藏名稱與頭像嗎？',
						detail: '這是由 Command/Control+Shift+N 觸發的。',
						buttons: [
							'隱藏',
							'不要隱藏',
						],
						defaultId: 0,
						cancelId: 1,
						checkboxLabel: '不要再顯示此提示',
					});

					config.set('showPrivateModePrompt', !result.checkboxChecked);

					if (result.response === 0) {
						config.set('privateMode', !config.get('privateMode'));
						sendAction('set-private-mode');
					} else if (result.response === 1) {
						menuItem.checked = false;
					}
				} else {
					config.set('privateMode', !config.get('privateMode'));
					sendAction('set-private-mode');
				}
			},
		},
		{
			type: 'separator',
		},
		{
			label: '側邊欄',
			submenu: sidebarSubmenu,
		},
		{
			label: '顯示訊息按鈕',
			type: 'checkbox',
			checked: config.get('showMessageButtons'),
			click() {
				config.set('showMessageButtons', !config.get('showMessageButtons'));
				sendAction('toggle-message-buttons');
			},
		},
		{
			type: 'separator',
		},
		{
			label: '顯示主要聊天',
			click() {
				sendAction('show-chats-view');
			},
		},
		{
			label: '顯示市場聊天',
			click() {
				sendAction('show-marketplace-view');
			},
		},
		{
			label: '顯示訊息請求',
			click() {
				sendAction('show-requests-view');
			},
		},
		{
			label: '顯示已封存聊天',
			click() {
				sendAction('show-archive-view');
			},
		},
	];

	const spellCheckerSubmenu: MenuItemConstructorOptions[] = getSpellCheckerLanguages();

	const conversationSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '靜音對話',
			accelerator: 'CommandOrControl+Shift+M',
			click() {
				sendAction('mute-conversation');
			},
		},
		{
			label: '封存對話',
			accelerator: 'CommandOrControl+Shift+H',
			click() {
				sendAction('archive-conversation');
			},
		},
		{
			label: '刪除對話',
			accelerator: 'CommandOrControl+Shift+D',
			click() {
				sendAction('delete-conversation');
			},
		},
		{
			label: '選擇下一個對話',
			accelerator: 'Control+Tab',
			click() {
				sendAction('next-conversation');
			},
		},
		{
			label: '選擇上一個對話',
			accelerator: 'Control+Shift+Tab',
			click() {
				sendAction('previous-conversation');
			},
		},
		{
			label: '尋找對話',
			accelerator: 'CommandOrControl+K',
			click() {
				sendAction('find');
			},
		},
		{
			label: '在對話中搜尋',
			accelerator: 'CommandOrControl+F',
			click() {
				sendAction('search');
			},
		},
		{
			label: '插入 GIF',
			accelerator: 'CommandOrControl+G',
			click() {
				sendAction('insert-gif');
			},
		},
		{
			label: '插入貼圖',
			accelerator: 'CommandOrControl+S',
			click() {
				sendAction('insert-sticker');
			},
		},
		{
			label: '插入表情符號',
			accelerator: 'CommandOrControl+E',
			click() {
				sendAction('insert-emoji');
			},
		},
		{
			label: '附加檔案',
			accelerator: 'CommandOrControl+T',
			click() {
				sendAction('attach-files');
			},
		},
		{
			label: '聚焦文字輸入',
			accelerator: 'CommandOrControl+I',
			click() {
				sendAction('focus-text-input');
			},
		},
		{
			type: 'separator',
		},
		{
			label: '拼字檢查語言',
			visible: !is.macos && config.get('isSpellCheckerEnabled'),
			submenu: spellCheckerSubmenu,
		},
	];

	const helpSubmenu: MenuItemConstructorOptions[] = [
		openUrlMenuItem({
			label: '網站',
			url: 'https://github.com/sindresorhus/caprine',
		}),
		openUrlMenuItem({
			label: '原始碼',
			url: 'https://github.com/sindresorhus/caprine',
		}),
		openUrlMenuItem({
			label: '捐助…',
			url: 'https://github.com/sindresorhus/caprine?sponsor=1',
		}),
		{
			label: '回報問題…',
			click() {
				const body = `
<!-- 請簡要描述您的問題和重現步驟。 -->


---

${debugInfo()}`;

				openNewGitHubIssue({
					user: 'sindresorhus',
					repo: 'caprine',
					body,
				});
			},
		},
	];

	if (!is.macos) {
		helpSubmenu.push(
			{
				type: 'separator',
			},
			aboutMenuItem({
				icon: caprineIconPath,
				copyright: '由 Sindre Sorhus 創建',
				text: '維護者：\nDušan Simić\nLefteris Garyfalakis\nMichael Quevillon\nNikolas Spiridakis',
				website: 'https://github.com/sindresorhus/caprine',
			}),
		);
	}

	const debugSubmenu: MenuItemConstructorOptions[] = [
		{
			label: '顯示設定',
			click() {
				config.openInEditor();
			},
		},
		{
			label: '顯示應用資料',
			click() {
				shell.openPath(app.getPath('userData'));
			},
		},
		{
			type: 'separator',
		},
		{
			label: '刪除設定',
			click() {
				config.clear();
				app.relaunch();
				app.quit();
			},
		},
		{
			label: '刪除應用資料',
			click() {
				shell.trashItem(app.getPath('userData'));
				app.relaunch();
				app.quit();
			},
		},
	];

	const macosTemplate: MenuItemConstructorOptions[] = [
		appMenu([
			{
				label: 'Caprine 偏好設定',
				submenu: preferencesSubmenu,
			},
			{
				label: 'Messenger 偏好設定…',
				accelerator: 'Command+,',
				click() {
					sendAction('show-preferences');
				},
			},
			{
				type: 'separator',
			},
			...switchItems,
			{
				type: 'separator',
			},
			{
				label: '重新啟動 Caprine',
				click() {
					app.relaunch();
					app.quit();
				},
			},
		]),
		{
			role: 'fileMenu',
			submenu: [
				newConversationItem,
				newRoomItem,
				{
					type: 'separator',
				},
				{
					role: 'close',
				},
			],
		},
		{
			role: 'editMenu',
		},
		{
			role: 'viewMenu',
			submenu: viewSubmenu,
		},
		{
			label: '對話',
			submenu: conversationSubmenu,
		},
		{
			role: 'windowMenu',
		},
		{
			role: 'help',
			submenu: helpSubmenu,
		},
	];

	const linuxWindowsTemplate: MenuItemConstructorOptions[] = [
		{
			role: 'fileMenu',
			submenu: [
				newConversationItem,
				newRoomItem,
				{
					type: 'separator',
				},
				{
					label: 'Caprine 設定',
					submenu: preferencesSubmenu,
				},
				{
					label: 'Messenger 設定',
					accelerator: 'Control+,',
					click() {
						sendAction('show-preferences');
					},
				},
				{
					type: 'separator',
				},
				...switchItems,
				{
					type: 'separator',
				},
				{
					label: '重新啟動 Caprine',
					click() {
						app.relaunch();
						app.quit();
					},
				},
				{
					role: 'quit',
				},
			],
		},
		{
			role: 'editMenu',
		},
		{
			role: 'viewMenu',
			submenu: viewSubmenu,
		},
		{
			label: '對話',
			submenu: conversationSubmenu,
		},
		{
			role: 'help',
			submenu: helpSubmenu,
		},
	];

	const template = is.macos ? macosTemplate : linuxWindowsTemplate;

	if (is.development) {
		template.push({
			label: '除錯',
			submenu: debugSubmenu,
		});
	}

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	return menu;
}
