import { App, MarkdownView, Notice, Modal, Plugin, Editor, PluginSettingTab, Setting, TextComponent} from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	linkFormat: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	linkFormat: "${fileDir}/${fileBasename}#${headingText}|${headingText}"
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
		const fileDir = file.path.substring(0, file.path.lastIndexOf('/'));
		const fileBasename = file.basename
		// Construct the Wiki Link (excluding .md extension)
		const targetLink = `[[${this.settings.linkFormat
			.replaceAll('${fileDir}', fileDir)
			.replaceAll('${fileBasename}', fileBasename)
			.replaceAll('${headingText}', headingText)}]]`;

		// Copy to clipboard
		navigator.clipboard.writeText(targetLink).then(() => {
			new Notice('Wiki link copied to clipboard!');
		}).catch(err => {
			console.error('Failed to copy text: ', err);
		});
	}
	matchLink(editor: Editor, view: MarkdownView) {
		const selectedText = editor.getSelection().toLowerCase();
		if (!selectedText) {
			new Notice('No text selected!');
			return;
		}
		new SearchModal(this.app, selectedText, this.settings.linkFormat, editor).open()
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
		this.addCommand({
			id: "match-link",
			name: "Match Link",
			editorCallback: this.matchLink
		})

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (view instanceof MarkdownView) {
					menu.addItem((item) => {
						item
							.setTitle("Match link")
							.setIcon("chevrons-right")
							.onClick(async () => {
								this.matchLink(editor,view)
							});
					})
				}
			})
		)
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

class SearchModal extends Modal {
	query: string;
	format: string;
	editor: Editor;
	constructor(app: App, query: string, format: string, editor: Editor) {
		super(app);
		this.query = query;
		this.format = format;
		this.editor = editor;
	}
	async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 创建搜索框
        const searchInput = new TextComponent(contentEl);
        searchInput.setValue(this.query);

        // 创建结果容器
        const resultsContainer = contentEl.createDiv({ cls: 'search-results' });

        // 搜索输入变化时更新搜索结果
        searchInput.onChange(value => {
            this.query = value;
            this.searchHeadings(resultsContainer);
        });

        // 初次显示搜索结果
        this.searchHeadings(resultsContainer);
    }
	async searchHeadings(container?: HTMLElement) {
		if (!container)
			return;
		container.empty();
		const markdownFiles = this.app.vault.getMarkdownFiles();
		for (const file of markdownFiles) {
			const content = await this.app.vault.read(file);
			const headings = content.match(/^#+\s.*$/gm) || [];
			for (const heading of headings) {
				if (heading.toLowerCase().includes(this.query)) {
					const headingText = heading.replace(/^#+\s*/, '');
                    const resultEl = container.createDiv({ text: `${file.path} - ${headingText}`, cls: 'result-item' });
                    resultEl.setAttribute('data-path', file.path);
                    resultEl.setAttribute('data-heading', headingText);
					
					// CSS
					resultEl.style.padding = '8px';
					resultEl.style.borderRadius = '4px';
					resultEl.style.margin = '4px 0';
					resultEl.style.transition = 'background-color 0.2s ease';
	
					resultEl.onmouseover = () => {
						resultEl.style.backgroundColor = '#e3e3e3';
						resultEl.style.cursor = 'pointer';
					};
					resultEl.onmouseout = () => {
						resultEl.style.backgroundColor = '';
					};
                    resultEl.onClickEvent(() => {
                        let filePath = resultEl.getAttribute('data-path');
                        const selectedHeading = resultEl.getAttribute('data-heading');
						if (!filePath || !selectedHeading) {
							new Notice('Failed to retrieve file path or heading.');
							return;
						}
						filePath=filePath.replace(/\.md$/, '');
                        const fileBasename = filePath.substring(filePath.lastIndexOf('/') + 1);
						const fileDir=filePath.substring(0, file.path.lastIndexOf('/'));
						// new Notice(filePath)
                        // new Notice(fileBasename)
                        const link = `[[${this.format
                            .replaceAll('${fileDir}', fileDir)
                            .replaceAll('${fileBasename}', fileBasename)
                            .replaceAll('${headingText}', selectedHeading)}]]`;

                        // 用链接替换选中文本
                        this.editor.replaceSelection(link);
                        new Notice('Text replaced with link.');
                        this.close();
                    });
				}
			}
		}
	}
	
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
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
			.setDesc('${fileDir},${fileBasename},${headingText} are available')
			.addText(text => {
				text.setPlaceholder('Enter your format')
					.setValue(this.plugin.settings.linkFormat || "${fileDir}/${fileBasename}#${headingText}|${headingText}")
					.onChange(async (value) => {
						this.plugin.settings.linkFormat = value;
						await this.plugin.saveSettings();

					});
				text.inputEl.style.width = '400px';
			});
	}
}
