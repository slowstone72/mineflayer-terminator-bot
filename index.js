/* callum fisher - cf.fisher.bham@gmail.com
"Mineflayer Terminator Bot" - index.js
last updated: 18/8/21 */

/* This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org/> */

const editJsonFile = require("edit-json-file");
const fs = require("fs");

const module_prefix = "[LAUNCHER]";

console.log(`${module_prefix} Running.`);

const conKeys = {
	"configReady": false,
	"firstTimeRun": true,
	"quietLogging": true,
	"serverHost": "",
	"serverPort": "",
	"username": "",
	"password": "",
	"inGamePassword": "",
	"total": 1,
	"version": "1.16.3",
	"language": "english",
	"knownItems": {
		helmet: [ // low priority to high priority
			"leather_helmet",
			"iron_helmet",
			"golden_helmet",
			"diamond_helmet"
		],
		chestplate: [ // low priority to high priority
			"leather_chestplate",
			"iron_chestplate",
			"golden_chestplate",
			"diamond_chestplate"
		],
		leggings: [ // low priority to high priority
			"leather_leggings",
			"iron_leggings",
			"golden_leggings",
			"diamond_leggings"
		],
		boots: [ // low priority to high priority
			"leather_boots",
			"iron_boots",
			"golden_boots",
			"diamond_boots"
		],
		food: [ // low priority to high priority
			"sweet_berries",
			"bread",
			"baked_potato",
			"cooked_chicken",
			"golden_apple"
		],
		weapon: [ // low priority to high priority
			"wooden_axe",
			"wooden_sword",
			"stone_axe",
			"stone_sword",
			"iron_axe",
			"iron_sword",
			"golden_axe",
			"golden_sword",
			"diamond_sword",
			"diamond_axe"
		]
	}
}

const dirs = [
	"language",
	"log"
];

dirs.forEach(dir => { // Create missing directories:
    if (!fs.existsSync("./"+dir)) {
		fs.mkdirSync("./"+dir);
		console.log(`${module_prefix} Made missing directory: "${dir}"`);
	}
});

const config = editJsonFile("./config.json");

if (config.data.firstTimeRun == undefined) {
    config.set("firstTimeRun", true);
} else if (config.data.firstTimeRun) {
    config.set("firstTimeRun", false);
}

Object.keys(conKeys).forEach(key => { // Check the keys currently in the configuration file for missing keys and add those missing keys:
	if (!Object.keys(config.data).includes(key)) {
		if (!config.data.quietLogging) console.log(`${module_prefix} [configuration] > Adding missing key "${key}" with value: ${JSON.stringify(conKeys[key])}`);
		config.set(key, conKeys[key]);
	}
});

Object.keys(config.data).forEach(key => { // Check the keys currently in the configuration file for unknown keys and remove those unknown keys:
	if (!Object.keys(conKeys).includes(key)) {
		if (!config.data.quietLogging) console.log(`${module_prefix} [configuration] > Removing unknown key "${key}"`);
		delete config.data[key];
	}
});

if (!config.data.quietLogging) console.log(`${module_prefix} [configuration] >> Using the following options:`);

Object.keys(config.data).forEach(key => { // Print out the key values being used:
	if (!config.data.quietLogging) console.log(`${module_prefix} [configuration] - ${key}: ${JSON.stringify(config.data[key])}`);
});

config.save();

if (!config.data.configReady) {
	console.log(`${module_prefix} Please fill in your configuration file (config.json) and change "configReady" to "true".`);
	process.exit();
}

const log = require("./log.js");

if (!fs.existsSync("./language/"+config.data.language+".json")) {
	log.add(`${module_prefix} [localization] >> Language file "${config.data.language}.json" not found`);
	lang = {};
} else {
	log.add(`${module_prefix} [localization] >> Found localization file "${config.data.language}.json"`);
	lang = require("./language/"+config.data.language+".json");
}

log.add(`${module_prefix} ${config.data.firstTimeRun ? lang.newuser || "Welcome!" : lang.olduser || "Welcome back." }`);
log.add(`${module_prefix} ${lang.startapp || "Starting application.."}`);

require("./app.js");