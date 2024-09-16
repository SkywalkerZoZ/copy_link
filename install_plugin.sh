plugin_path="C:/Users/herob/Desktop/md/.obsidian/plugins"
plugin_folder="${plugin_path}/obsidian-link-tools"
npm.cmd run build
rm -rf ${plugin_folder} && mkdir ${plugin_folder} && cp main.js manifest.json styles.css ${plugin_folder}