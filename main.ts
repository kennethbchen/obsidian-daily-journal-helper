import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile } from 'obsidian';
import {normalizePath } from 'obsidian';
import { moment } from 'obsidian';
import * as internal from 'stream';

interface DailyJournalHelperSettings {
	numberRolloverOffset: number;
	fileDestination: String;
	templatePath: string;
	filenamePrefix: string;
}

const DEFAULT_SETTINGS: DailyJournalHelperSettings = {
	numberRolloverOffset: 5,
	fileDestination: "Daily Journal",
	templatePath: "",
	filenamePrefix: "Daily Journal "
}

function getJournalDate(numberRolloverOffset: number): Date {

	var date: Date = new Date();

	// Offset the hour of day when the number changes
	if (date.getHours() <= numberRolloverOffset) {
		date.setDate(date.getDate() - 1);
	}
	
	return date;
}

function getDays(numberRolloverOffset: number): number {
	var startDate: Date = new Date("2019-07-07T00:00:00");

	var endDate: Date = getJournalDate(numberRolloverOffset);

	return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));	
}

async function openOrCreateEntry(destinationFolder: string, title: string, template: string = ""): Promise<void> {
	var filePath: string = normalizePath(destinationFolder + title) + ".md";
	
	// Create folder if not exists
	if (! await this.app.vault.adapter.exists(destinationFolder)) {
		this.app.vault.createFolder(destinationFolder);
	}
	
	// Create file if not exists
	if (! await this.app.vault.adapter.exists(filePath)) {
		
		if (template !== "") {
			await this.app.vault.create(filePath, template);
		} else {
			await this.app.vault.create(filePath, "");
		}

		new Notice("Created " + filePath);
		
	}

	// Open in active leaf
	
	const file = await this.app.vault.getFileByPath(filePath);
	
	var leaf = this.app.workspace.getLeaf(false);
	
	await leaf.openFile(file);

	new Notice("Opened " + filePath);

}

async function readTemplateData(templatePath: string): Promise<string> {

	var validTemplateExists = templatePath !== "" && await this.app.vault.adapter.exists(templatePath);
	
	var templateData = "";

	// Check if there is a template to apply
	if (validTemplateExists) {
		// Read template
		
		templateData = await this.app.vault.adapter.read(templatePath);

	}
	return templateData
}

export default class DailyJournalHelper extends Plugin {
	settings: DailyJournalHelperSettings;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('calendar', "Open today's journal note", (evt: MouseEvent) => {
			// Called when the user clicks the icon.


			readTemplateData(this.settings.templatePath).then((data) => {
				var templateData: string = data;

				var date = getJournalDate(this.settings.numberRolloverOffset);
				var number = getDays(this.settings.numberRolloverOffset).toString();

				// Fill in template data if needed
				templateData = templateData.replace("{{ date }}", moment().format());
				templateData = templateData.replace("{{ journal_date }}", moment(date).format("YYYY-MM-DD"));
				templateData = templateData.replace("{{ journal_number }}", number);
				
				var fileName = `${this.settings.filenamePrefix}${number}`;
				openOrCreateEntry(this.settings.fileDestination.toString(), fileName, templateData);
			});


			
			
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
		this.addSettingTab(new DailyJournalSettingTab(this.app, this));

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

/*
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
*/

class DailyJournalSettingTab extends PluginSettingTab {
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

		new Setting(containerEl)
		.setName('Journal Template Location')
		.setDesc('Location to file containing daily journal template')
		.addText(text => text
			.setPlaceholder("E.g 'Template.md'")
			.setValue(this.plugin.settings.templatePath.toString())
			.onChange(async (value) => {
				this.plugin.settings.templatePath = value;
				await this.plugin.saveSettings();
			})
			);
		
		new Setting(containerEl)
		.setName('Journal filename prefix')
		.setDesc('Prefix of filename for journal. Make sure to include trailing spaces if needed. "Daily Journal " becomes "Daily Journal xxxx".')
		.addText(text => text
			.setPlaceholder("E.g 'Daily Journal '")
			.setValue(this.plugin.settings.filenamePrefix.toString())
			.onChange(async (value) => {
				this.plugin.settings.filenamePrefix = value;
				await this.plugin.saveSettings();
			})
			);
			
			
	}
}
