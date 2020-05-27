const inquirer = require('inquirer');
const net = require('net')
const fs = require('fs');
var servers = require('./servers.json');

serverPrompt()

function serverPrompt() {
    inquirer.prompt([{
        type: 'list',
        name: 'serverIp',
        message: 'Select a server',
        choices: servers.map(server => server.ip + ':' + server.port),
    }, ]).then(selected => {
        console.info('Connecting to Server:', selected.serverIp);
        (async() => {

            if (servers.filter(serv => serv.ip === selected.serverIp.split(':')[0] && serv.port === selected.serverIp.split(':')[1])[0]) {

                activeServer = servers.filter(serv => serv.ip === selected.serverIp.split(':')[0] && serv.port === selected.serverIp.split(':')[1])[0];
                activeSocket = await spinServer(activeServer)
                if (!activeSocket) {
                    console.log('Couldn\'t connect')
                }
                if (activeSocket) commandPrompt(activeSocket);
            }


        })();

    });



}

function commandHandler(socket, command, params) {
    return new Promise(resolve => {
        findCommand = commands.filter(cmd => cmd.name === command.split(' ')[0])[0]
        if (findCommand) {

            socket.write(command)
            socket.once('data', function(data) {
                return resolve(data.toString())

            });
        }
    });
}

function commandPrompt(socket) {

    inquirer.prompt([{
        type: 'list',
        name: 'command',
        message: 'Commands:',
        choices: commands.map(cmd => cmd.name),
    }, ]).then(selected => {
        (async() => {
            //this is pretty bad, will change to command file for custom commands
            options = {}
            if (selected.command === 'RotateMap') {
                await commandHandler(socket, 'RotateMap')
                commandPrompt(socket)
            }
            if (selected.command === 'ResetSND') {
                await commandHandler(socket, 'ResetSND')
                commandPrompt(socket)
            }
            if (selected.command === 'SwitchMap') {
                map = await anyPrompt('map', true)
                mod = await anyPrompt('mod', true)
                cmd = 'SwitchMap ' + map + ' ' + mod
                console.log(cmd)
                commandHandler(socket, cmd)
                commandPrompt(socket)
            }
            if (selected.command === 'Kick') {
                playerPrompt(socket, selected.command)
            }
            if (selected.command === 'InspectPlayer') {
                playerPrompt(socket, selected.command)
            }
            if (selected.command === 'SwitchTeam') {
                team = await teamPrompt()
                playerPrompt(socket, selected.command, team)
            }
            if (selected.command === 'Ban') {
                steam64Id = await textPrompt('steamId64', true)
                if (steam64Id) {
                    commandHandler(socket, 'Ban ' + steam64Id.toString())
                    commandPrompt(socket)
                } else {
                    console.log('Not a Int / Steam 64 ID!')
                    commandPrompt(socket)
                }
            }
            if (selected.command === 'Unban') {
                steam64Id = await textPrompt('steamId64', true)
                if (steam64Id) {
                    commandHandler(socket, 'UnBan ' + steam64Id.toString())
                    console.log('UnBan ' + steam64Id.toString())
                    commandPrompt(socket)
                } else {
                    console.log('Not a Int / Steam 64 ID!')
                    commandPrompt(socket)
                }
            }


            if (selected.command === 'GiveTeamCash') {
                team = await teamPrompt()
                cashAmt = await textPrompt('int', true)
                if (cashAmt) {
                    commandHandler(socket, `GiveTeamCash ${team} ${cashAmt}`)
                    commandPrompt(socket)
                } else {
                    console.log('Not a Int / Steam 64 ID!')
                    commandPrompt(socket)
                }

            }
            if (selected.command === 'GiveItem') {
                itemName = await textPrompt('string', true)
                playerPrompt(socket, selected.command, itemName)
            }
            if (selected.command === 'GiveCash') {
                itemName = await textPrompt('int', true)
                playerPrompt(socket, selected.command, itemName)
            }
            if (selected.command === 'ServerInfo') {
                console.log(await commandHandler(socket, 'ServerInfo'))
                commandPrompt(socket)
            }

            if (selected.command === 'RefreshList') {
                await commandHandler(socket, 'RefreshList')
                commandPrompt(socket)
            }

            if (selected.command === 'Disconnect') {
                console.log('Disconnecting..')
                socket.destroy();
                serverPrompt()
            }
        })();
    });


}

function playerPrompt(socket, command, option, option2) {

    // find a good delimiter
    if (!socket.playerList.PlayerList) {
        console.log('No players online :(')
        return commandPrompt(socket);
    }
    inquirer.prompt([{
        type: 'list',
        name: 'player',
        message: 'Select a server',
        choices: socket.playerList.PlayerList.map(player => player.Username + ' | ' + player.UniqueId),
    }, ]).then(selected => {
        (async() => {
            console.log('\033[2J');
            steam64Id = selected.player.split(' | ')[1]
            if (command.startsWith('Kick')) {
                await commandHandler(socket, 'Kick ' + steam64Id)
                console.log(selected.player.Username + " Was Kicked.")
            }
            if (command === 'InspectPlayer') {

                console.log(await commandHandler(socket, 'InspectPlayer ' + steam64Id))
            }
            if (command === 'SwitchTeam') {
                await commandHandler(socket, `SwitchTeam ${steam64Id} ${option}`)
            }
            if (command === 'GiveItem') {
                await commandHandler(socket, `GiveItem ${steam64Id} ${option}`)
            }
            if (command === 'GiveCash') {
                await commandHandler(socket, `GiveCash ${steam64Id} ${option}`)
            }





            //select server
            //deal with player
            //send back to commandPrompt()

            commandPrompt(socket)
        })();
    });

}

function teamPrompt() {
    return new Promise(resolve => {
        // find a good delimiter
        inquirer.prompt([{
            type: 'list',
            name: 'team',
            message: 'Select a Team',
            choices: ["Blue Team (Defenders)", "Red Team (Attackers)"],
        }, ]).then(selected => {
            (async() => {
                resolve(selected.team)
            })();
        });
    });
}


function textPrompt(type, goBack) {
    return new Promise(resolve => {
        inquirer.prompt([{
            message: "",
            type: "input",
            name: "input " + type,
        }, ]).then(selected => {
            (async() => {
                if (type === 'int' && selected.input.match(/^\d+$/)) {
                    resolve(selected.input)
                } else if (type === 'steamId64' && selected.input.length === 17 && selected.input.match(/^\d+$/)) {
                    resolve(selected.input)
                } else if (type === 'string') {
                    resolve(selected.input)
                } else {
                    resolve(false)
                }
            })();
        });
    });


}

function anyPrompt(type, goBack) {
    return new Promise(resolve => {
        inquirer.prompt([{
            message: "enter " + type,
            type: "input",
            name: "input",
        }, ]).then(selected => {
            (async() => {
                resolve(selected.input)
            })();
        });
    });
}

function reconnect(socket) {
    //reconnect on loss (max retries)
}

function spinServer(server) {
    return new Promise(resolve => {
        socket = net.Socket();
        socket.connect(server.port, server.ip, () => {});
        socket.on('error', function(err) {
            console.log(err)
            resolve(false)
        });
        socket.write(server.password + '\r\n')
        socket.once('data', function(data) {
            if (data.toString().startsWith('Authenticated=1')) {
                console.log('Login Successful!');
                (async() => {
                    resolve(socket)
                        //socket.playerList = testJson
                    socket.playerList = await commandHandler(socket, 'RefreshList')
                })();
                setInterval(function() {
                    (async() => {
                        socket.playerList = await commandHandler(socket, 'RefreshList')
                    })();
                }, 60000);


            }
        });
    });
}


commands = [{
    "name": "SwitchMap",
    "params": ["map", "mod"]
}, {
    "name": "ResetSND",
    "params": []
}, {
    "name": "RotateMap",
    "params": []
}, {
    "name": "Kick",
    "params": ["steamid"]
}, {
    "name": "Ban",
    "params": ["steamid"]
}, {
    "name": "Unban",
    "params": ["steamid"]
}, {
    "name": "SwitchTeam",
    "params": ["steamid", "teamid"]
}, {
    "name": "GiveItem",
    "params": ["steamid", "itemid"]
}, {
    "name": "GiveCash",
    "params": ["steamid", "CashAmt"]
}, {
    "name": "GiveTeamCash",
    "params": ["steamid", "CashAmt"]
}, {
    "name": "InspectPlayer",
    "params": ["steamid"]
}, {
    "name": "ServerInfo",
    "params": []
}, {
    "name": "Disconnect",
    "params": []
}, {
    "name": "RefreshList",
    "params": []
}];
