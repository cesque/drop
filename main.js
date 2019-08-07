const { menubar } = require('menubar')
const http = require('http')
const micro = require('micro')
const { createError } = require('micro')
const path = require('path')
const fs = require('fs')
const internalip = require('internal-ip')
const AutoLaunch = require('auto-launch')
const { clipboard, Menu } = require('electron')

const PORT = 4500

let mb = menubar()

let files = []

let ip = internalip.v4.sync()

let staticFiles = [
    '/build/script.js',
    '/build/style.css',
]

function page(contents) {
    return `<html> 
        <head>
            <title>drop - local file sharing</title>
            <link rel="stylesheet" href="./build/style.css">
        </head>
        <body>
            ${contents}
            <div class=footer>
                <a href="http://${ip}:${PORT}" class=ip>${ip}:${PORT}</a>
            </div>
            <div class="credit">by cesque :)</div>
        </body>
        <script src="./build/script.js"></script>
    </html>`
}

mb.on('ready', async () => {
    console.log('ready')

    var autoLauncher = new AutoLaunch({
        name: 'Drop',
    })

    const server = new http.Server(micro(async (req, res) => {
        if(req.url == '/') {
            if(files.length > 0) {

                let urls = files.map(file => {
                    let filename = path.basename(file.path)
                    return `<a class="file" href="/${filename}" data-time-left="${Math.floor(file.timeout)}">
                            ${filename} <span class="info">- <span class="time">${Math.floor(file.timeout)}</span></span>
                        </a><br>`
                })

                return page(urls.join(''))
            } else {
                return page(`<p>${Menu}</p>`)
                return page(`<p class=no-files>no files uploaded yet :)</p>`)
            }
        } else if (staticFiles.includes(req.url)) {
            let parts = req.url.split('/')
            let last = parts[parts.length - 1]
            return fs.readFileSync(__dirname + '/build/' + last)
        } else {
            let file = files.find(x => ('/' + x.filename) == req.url)

            if(!file) throw micro.createError(404, 'File not found :(')
            
            return fs.readFileSync(file.path)
        }
    }))
    
    server.listen(PORT)

    mb.tray.removeAllListeners('click')
    mb.tray.setTitle('drop')
    mb.tray.setImage(__dirname + '/build/icon.png')

    let isAutoLaunch = await autoLauncher.isEnabled()

    let contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Copy URL',
            click: () => {
                clipboard.writeText('http://' + ip + ':' + PORT)
            },
        },
        { 
            label: 'Launch at login',
            type: 'checkbox',
            checked: isAutoLaunch,
            click: (menuItem, browserWindow, event) => {
                if(menuItem.checked) {
                    autoLauncher.enable()
                } else {
                    autoLauncher.disable()
                }
            }
        },
        { 
            type: 'separator'
        },
        { 
            label: 'Quit',
            role: 'quit',
        }
    ])

    mb.tray.setContextMenu(contextMenu)
    
    mb.tray.on('drop-files', (event, dropped) => {

        for(let file of dropped) {
            files.push({
                path: file,
                timeout: 180,
                filename: path.basename(file),
            })
        }

        mb.tray.setImage(__dirname + '/build/icon-full.png')

        clipboard.writeText('http://' + ip + ':' + PORT)
    })

    mb.app.on('before-quit', () => {
        server.close()
    })

    setInterval(() => {
        for(let file of files) {
            file.timeout -= 1
        }

        files = files.filter(x => x.timeout > 0)

        if(files.length == 0) {
            mb.tray.setImage(__dirname + '/build/icon.png')
        }
    }, 1000)

})