import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile } from 'obsidian';
import {normalizePath } from 'obsidian';
import * as internal from 'stream';

interface DailyJournalHelperSettings {
	numberRolloverOffset: number;
	fileDestination: String;
}

const DEFAULT_SETTINGS: DailyJournalHelperSettings = {
	numberRolloverOffset: 5,
	fileDestination: "Daily Journal"
}

function getDays(numberRolloverOffset: number) {
	var startDate: Date = new Date("2019-07-07T00:00:00");

	var endDate: Date = new Date();

	// Offset the hour of day when the number changes
	if (endDate.getHours() <= numberRolloverOffset) {
		endDate.setDate(endDate.getDate() - 1);
	}

	return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));	
}

async function openOrCreateEntry(destinationFolder: string, title: string): Promise<void> {
	var filePath: string = normalizePath(destinationFolder + title) + ".md";
	
	// Create folder if not exists
	if (! await this.app.vault.adapter.exists(destinationFolder)) {
		this.app.vault.createFolder(destinationFolder);
	}

	// Create file if not exists
	if (! await this.app.vault.adapter.exists(filePath)) {
		
		await this.app.vault.create(filePath, "");
		new Notice("Created " + filePath);
	}

	// Open in active leaf
	
	const file = await this.app.vault.getFileByPath(filePath);
	
	var leaf = this.app.workspace.getLeaf(false);
	
	await leaf.openFile(file);

	new Notice("Opened " + filePath);

	

}

export default class DailyJournalHelper extends Plugin {
	settings: DailyJournalHelperSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('calendar', "Open today's journal note", (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			//new Notice(getDays(this.settings.numberRolloverOffset).toString());
			
			openOrCreateEntry(this.settings.fileDestination.toString(), getDays(this.settings.numberRolloverOffset).toString());
			
		});

		// Perform additional things with the ribbon
		//ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//const statusBarItemEl = this.addStatusBarItem();
		//statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		/*
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
		*/

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: DailyJournalHelper;

	constructor(app: App, plugin: DailyJournalHelper) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Number Rollover Offset')
			.setDesc('Offset the hour of day when the number changes')
			.addText(text => text
				.setPlaceholder('Enter whole number')
				.setValue(this.plugin.settings.numberRolloverOffset.toString())
				.onChange(async (value) => {
					this.plugin.settings.numberRolloverOffset = parseInt(value);
					await this.plugin.saveSettings();
				}))

		new Setting(containerEl)
			.setName('Journal Entry Location')
			.setDesc('Location to store journal entries')
			.addText(text => text
				.setPlaceholder("E.g 'Daily Journal/'")
				.setValue(this.plugin.settings.fileDestination.toString())
				.onChange(async (value) => {
					this.plugin.settings.fileDestination = value;
					await this.plugin.saveSettings();
				})
				);
			
	}
}
