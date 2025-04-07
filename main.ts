import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter, TFile } from 'obsidian';
import { normalizePath } from 'obsidian';
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

	// Use the current timezone to eliminate variation in measurement based on timezone
	var startDate: Date = new Date(`2019-07-07T00:00:00${moment().format("Z")}`);

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
				templateData = templateData.replace("{{ journal_date }}", moment(date).hour(0).minute(0).second(0).format());
				templateData = templateData.replace("{{ journal_number }}", number);
				var fileName = `${this.settings.filenamePrefix}${moment(date).hour(0).minute(0).second(0).format("YYYY-MM-DD")}`;

				openOrCreateEntry(this.settings.fileDestination.toString(), fileName, templateData);
			});




		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DailyJournalSettingTab(this.app, this));

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

class DailyJournalSettingTab extends PluginSettingTab {
	plugin: DailyJournalHelper;

	constructor(app: App, plugin: DailyJournalHelper) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

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
