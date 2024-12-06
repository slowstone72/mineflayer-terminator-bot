/* callum fisher - cf.fisher.bham@gmail.com
"Mineflayer Terminator Bot" - app.js
last updated: 4/11/21 */

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

const log = require("./log.js");
const mineflayer = require("mineflayer");
const mfBloodhound = require("mineflayer-bloodhound")(mineflayer);
const mfPathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow } = require('mineflayer-pathfinder').goals
const vec3 = require("vec3");
const config = require("./config.json");

const modulePrefix = "[APP]";

log.add(`${modulePrefix} Running.`);

var terminator = {
    bots: {},
    newBot: function(username, password, host, port, version) {
        var id = Object.keys(terminator.bots).length;
        terminator.bots[id] = {
            mf: mineflayer.createBot({
                host: host || config.serverHost,
                port: port || config.serverPort || undefined,
                username: username || config.username || raName().toString(),
                password: password || undefined,
                version: version || config.version,
                verbose: !config.quietLogging,
                checkTimeoutInterval: 0
            })
        }
        terminator.bots[id].temp = {
            id: id,
            isReady: false,
            eatFood: true,
            lookAround: true,
            onMission: false,
            target: undefined,
            knownItems: config.knownItems,
            inventoryBusy: false,
            equipped: {
                weapon: "n/a",
                helmet: "n/a",
                chestplate: "n/a",
                leggings: "n/a",
                boots: "n/a"
            }
        }
        mfBloodhound(terminator.bots[id].mf);
        terminator.bots[id].mf.loadPlugin(mfPathfinder);
        terminator.bots[id].temp.mcData = require('minecraft-data')(terminator.bots[id].mf.version);
        terminator.bots[id].mf.on('spawn', function() {
            log.add(`${modulePrefix} Bot #${id} (${terminator.bots[id].mf.username}) spawned.`);
            if (!terminator.bots[id].temp.isReady) {
                log.add(`${modulePrefix} Connected bot #${id} (${terminator.bots[id].mf.username}) to ${terminator.bots[id].mf.host}${terminator.bots[id].mf.port ? ":" + terminator.bots[id].mf.port : ""}`);
                terminator.bots[id].temp.isReady = true;
                terminator.bots[id].mf.chat(`/register ${config.inGamePassword} ${config.inGamePassword}`);
                terminator.bots[id].mf.chat(`/login ${config.inGamePassword}`);
            }
        });
        terminator.bots[id].mf.on('chat', function(username, message) {
            processChat(username, message, terminator.bots[id]);
        });
        terminator.bots[id].mf.on('death', () => {
            if (terminator.bots[id].temp.onMission) terminator.bots[id].temp.endAttack();
            terminator.bots[id].mf.chat("I died!");
        });
		terminator.bots[id].mf.bloodhound.yaw_correlation_enabled = false;
		terminator.bots[id].mf.on('onCorrelateAttack', function (attacker, victim, weapon) {
			processAttack(attacker, victim, weapon, terminator.bots[id]);
		});
        terminator.bots[id].switchLookingAtInt = setInterval(function() {
            if (terminator.bots[id].temp.lookAround) {
               terminator.bots[id].temp.lookingAt = getRandomNearbyEntity(null, terminator.bots[id]);
            } else {
                terminator.bots[id].temp.lookingAt = undefined;
            }
        }, 6000);
        terminator.bots[id].moveHead = setInterval(function() {
            if (terminator.bots[id].temp.lookingAt) {
                terminator.bots[id].mf.lookAt(terminator.bots[id].temp.lookingAt.position.offset(0, terminator.bots[id].temp.lookingAt.height, 0));
            }
        }, 500);
    }
}

function processAttack(attacker, victim, weapon, bot) {
    if (victim == bot.mf.entity) { // if bot was attacked:
        equipArmor(bot);
        terminateTarget(attacker, bot);
    }
}

function terminateTarget (target, bot) {
    return new Promise(function(resolve, reject) {
        bot.temp.attackWaitInterval = setInterval(function() {
            if (!bot.temp.onMission) {
                clearInterval(bot.temp.attackWaitInterval);
        if (target == bot.mf.entity) {
            resolve(1); // cannot attack self
        } else {
            if (target.username) {
                if (!bot.mf.entities[target] && !bot.mf.players[target.username]) {
                    resolve(2); // out of range / can't see target
                }
            }
            bot.temp.endAttack = function () {
                bot.mf.chat("ending attack");
                console.log(bot.temp.useWeaponInt);
                clearInterval(bot.temp.useWeaponInt);
                clearInterval(bot.temp.checkAttackCompletionInt);
                bot.mf.pathfinder.stop();
                bot.temp.lookAround = true
                bot.temp.onMission = false;
            }
            bot.temp.lookAround = false;
            bot.temp.onMission = true;
            bot.temp.target = target;
            bot.temp.useWeaponInt = setInterval(function() {
                if (target.position.distanceTo(bot.mf.entity.position) < 6) {
                    equipItem("weapon", bot);
                    equipArmor(bot);
                    bot.mf.attack(target);
                }
            }, 1000);
            var defaultMove = new Movements(bot.mf, bot.temp.mcData);
            bot.mf.pathfinder.setMovements(defaultMove);
            bot.mf.pathfinder.setGoal(new GoalFollow(target, target.type == "player" ? 1 : 3), true);
            bot.temp.checkAttackCompletionInt = setInterval(function() {
                if (0 >= target.metadata[8]) {
                    bot.temp.endAttack();
                    resolve(3); // target dead
                }
            }, 0);
        }
    }
    }, 2000);
    });
}

function processChat(username, message, bot) {
    if (username === bot.mf.username) return;
    if (message == "come") {
        if (!target) {
            bot.mf.chat("I don't see you!");
            return;
        }
        var defaultMove = new Movements(bot.mf, bot.temp.mcData);
        var target = bot.mf.players[username] ? bot.mf.players[username].entity : null;
        var pos = target.position;
        bot.temp.lookAround = false;
        bot.mf.pathfinder.setMovements(defaultMove);
        bot.mf.pathfinder.setGoal(new GoalNear(pos.x, pos.y, pos.z, 1));
    }
    if (message.toLowerCase().startsWith("kill ")) {
        var target = bot.mf.players[message.split("kill ")[1]].entity;
        if (!target) {
            bot.mf.chat("Who's that?");
            return;
        } else {
            terminateTarget(target, bot).then(function(res) {
                if (res == 1) bot.mf.chat("Termination Result: Failed. I can't attack myself!");
                if (res == 2) bot.mf.chat("Termination Result: Failed. Target location is unknown.");
                if (res == 3) bot.mf.chat("Termination Result: Succeeded. Target is dead.");
            });
        }
    }
}

function getRandomNearbyEntity (type, bot) {
    let id
    let entity
    var candidates = [];
    for (id in bot.mf.entities) {
        entity = bot.mf.entities[id]
        // if (type && entity.type !== type) continue
        if (entity === bot.mf.entity) continue
        if (entity.position.y < bot.mf.entity.position.y) continue // if entity is lower than bot Y + 1, ignore
        if (bot.mf.entity.position.distanceTo(entity.position) < 10) {
            candidates.push(entity);
        }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function getNearestEntityOnSameY (type, bot) {
    let id
    let entity
    let dist
    let best = null
    let bestDistance = null
    for (id in bot.mf.entities) {
        entity = bot.mf.entities[id]
        if (type && entity.type !== type) continue
        if (entity === bot.mf.entity) continue
        if (entity.position.y < bot.mf.entity.position.y) continue // if entity is lower than bot Y + 1, ignore
        dist = bot.mf.entity.position.distanceTo(entity.position);
        if (!best || dist < bestDistance) {
            best = entity
            bestDistance = dist
        }
    }
    return best;
}

function equipItem (type, bot) {
    return new Promise(function(resolve, reject) { // 1 - equipped successfully, 0 - error occurred / doesn't have item
        var interval = setInterval(function() {
            if (!bot.temp.inventoryBusy) {
                clearInterval(interval);
                bot.temp.inventoryBusy = true;
                var best = "";
                for (var i = 0; i < Object.keys(bot.mf.inventory.slots).length; i++) {
                    if (bot.mf.inventory.slots[i] !== null) {
                        if (bot.temp.knownItems[type].includes(bot.mf.inventory.slots[i].name)) { // if this item is indexed:
                            if (best !== "") { // if another best item was previously found:
                                if (bot.temp.knownItems[type].indexOf(bot.mf.inventory.slots[i].name) > bot.temp.knownItems[type].indexOf(best)) { // if it's of higher priority than the last item checked:
                                    best = bot.mf.inventory.slots[i].name; // set new best item
                                }
                            } else { // otherwise if no best item has been set:
                                best = bot.mf.inventory.slots[i].name; // set this item as the current best item
                            }
                        }
                    }
                }
                if (best) {
                    if (bot.temp.equipped[type] !== best) {
                        bot.temp.equipped[type] = best;
                        // log.add(`${modulePrefix} User #${bot.temp.id} (${terminator.bots[id].mf.username}) is equipping ${type} ${best}`);
                        bot.mf.equip(bot.temp.mcData.itemsByName[best].id, type == "helmet" ? "head" : type == "chestplate" ? "torso" : type == "leggings" ? "legs" : type == "boots" ? "feet" : "hand", (err) => { // correlate the item's type to a body part and equip the chosen best item
                            if (err) {
                                resolve(0);
                                bot.temp.inventoryBusy = false;
                                return console.log(err.message);
                            } else {
                                resolve(1);
                                bot.temp.inventoryBusy = false;
                            }
                        });
                    } else {
                        resolve(1);
                        bot.temp.inventoryBusy = false;
                    }
                } else {
                    resolve(0);
                    bot.temp.inventoryBusy = false;
                }
            }
        }, 800);
    });
}

function equipArmor(bot) {
    equipItem("helmet", bot);
    equipItem("chestplate", bot);
    equipItem("leggings", bot);
    equipItem("boots", bot);
}

const adjectives = [
    'unique',    'unkempt',      'unknown',    'unnatural', 'unruly',
    'unsightly', 'unsuitable',   'untidy',     'unused',    'unusual',
    'unwieldy',  'unwritten',    'upbeat',     'uppity',    'upset',
    'uptight',   'used',         'useful',     'useless',   'utopian',
    'utter',     'uttermost',    'vacuous',    'vagabond',  'vague',
    'valuable',  'various',      'vast',       'vengeful',  'venomous',
    'verdant',   'versed',       'victorious', 'vigorous',  'violent',
    'violet',    'vivacious',    'voiceless',  'volatile',  'voracious',
    'vulgar',    'wacky',        'waggish',    'waiting',   'heavy',
    'wakeful',   'wandering',    'wanting',    'warlike',   'warm',
    'wary',      'wasteful',     'watery',     'weak',      'wealthy',
    'weary',     'groomed',      'broken',     'ludicrous', 'poor',
    'wet',       'whimsical',    'whispering', 'white',     'whole',
    'wholesale', 'wicked',       'wide',       'wide',      'wiggly',
    'wild',      'willing',      'windy',      'wiry',      'wise',
    'wistful',   'witty',        'woebegone',  'womanly',   'wonderful',
    'wooden',    'woozy',        'workable',   'worried',   'worthless',
    'wrathful',  'wretched',     'wrong',      'wry',       'xenophobic',
    'yellow',    'yielding',     'young',      'youthful',  'yummy',
    'zany',      'zealous',      'zesty',      'zippy',     'zonked'
];

const nouns = [
    'half-sister', 'halibut',      'hall',         'hallway',   'hamburger',
    'hammer',      'hamster',      'hand',         'handball',  'handicap',
    'handle',      'handsaw',      'harbor',       'hardboard', 'hardcover',
    'hardhat',     'hardware',     'harmonica',    'harmony',   'harp',
    'hat',         'hate',         'hawk',         'head',      'headlight',
    'headline',    'health',       'hearing',      'heart',     'heat',
    'heaven',      'hedge',        'height',       'helen',     'helicopter',
    'helium',      'hell',         'helmet',       'help',      'hemp',
    'hen',         'heron',        'herring',      'hexagon',   'hill',
    'himalayan',   'hip',          'hippopotamus', 'history',   'hobbies',
    'hockey',      'hoe',          'hole',         'holiday',   'home',
    'honey',       'hood',         'hook',         'hope',      'horn',
    'horse',       'hose',         'hospital',     'hot',       'hour',
    'hourglass',   'house',        'hovercraft',   'hub',       'hubcap',
    'humidity',    'humor',        'hurricane',    'hyacinth',  'hydrant',
    'hydrofoil',   'hydrogen',     'hyena',        'hygienic',  'ice',
    'icebreaker',  'icicle',       'icon',         'idea',      'ikebana',
    'illegal',     'imprisonment', 'improvement',  'impulse',   'inch',
    'income',      'increase',     'index',        'india',     'indonesia',
    'industry',    'ink',          'innocent',     'input',     'insect'
];

function raName() {
    return adjectives[Math.random() * adjectives.length | 0] + nouns[Math.random() * nouns.length | 0] + Math.floor(Math.random() * 99)
}

function sleep(ms) { // https://stackoverflow.com/questions/14249506/
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
} 

async function init() {
    for (var i = 0; i < config.total; i++) {
        terminator.newBot(config.username, config.password, config.serverHost, config.serverPort, config.version);
        await sleep(6000); // delay between connections prevents some servers from kicking the client
    }
}

init();