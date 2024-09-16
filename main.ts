import { App, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	linkFormat: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	linkFormat: "${filePath}/${fileBasename}#${headingText}|${headingText}"
};


export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	copyLink(view: MarkdownView) {
		const editor = view.editor
		const cursor = editor.getCursor();
		const lines = editor.getValue().split('\n');

		// Find the nearest heading above the current cursor position
		let headingText = null;
		for (let i = cursor.line; i >= 0; i--) {
			const line = lines[i].trim();
			if (line.startsWith('#')) {
				headingText = line.replace(/^#+\s*/, ''); // Remove '#' and spaces
				break;
			}
		}

		if (!headingText) {
			new Notice('No heading found above the current cursor position.');
			return;
		}

		// Get the current file path
		// Check if the file exists
		const file = view.file;
		if (!file) {
			new Notice('No file is associated with the current view.');
			return;
		}

		// Get the current file's directory path and basename (without extension)
		const filePath = file.path.substring(0, file.path.lastIndexOf('/'));
		const fileBasename = file.basename
		// Construct the Wiki Link (excluding .md extension)
		const targetLink = `[[${this.settings.linkFormat
			.replaceAll('${filePath}', filePath)
			.replaceAll('${fileBasename}', fileBasename)
			.replaceAll('${headingText}', headingText)}]]`;

		// Copy to clipboard
		navigator.clipboard.writeText(targetLink).then(() => {
			new Notice('Wiki link copied to clipboard!');
		}).catch(err => {
			console.error('Failed to copy text: ', err);
		});
	}
	async onload() {
		await this.loadSettings();

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'copy-link',
			name: 'copy link',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						this.copyLink(activeView)
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item
							.setTitle("Copy link")
							.setIcon("external-link")
							.onClick(async () => {
								this.copyLink(view)
							});
					});
				}
				else {
					new Notice('The current view is not a Markdown view.');
				}

			})
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new MySettingTab(this.app, this));

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

class MySettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('link format')
			.setDesc('${filePath},${fileBasename},${headingText} are available')
			.addText(text => {
				text.setPlaceholder('Enter your format')
					.setValue(this.plugin.settings.linkFormat || "${filePath}/${fileBasename}#${headingText}|${headingText}")
					.onChange(async (value) => {
						this.plugin.settings.linkFormat = value;
						await this.plugin.saveSettings();

					});
				text.inputEl.style.width = '400px';
			});
	}
}
