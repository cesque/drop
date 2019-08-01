const { menubar } = require('menubar')
const http = require('http')
const micro = require('micro')
const { createError } = require('micro')
const path = require('path')
const fs = require('fs')
const internalip = require('internal-ip')
const { clipboard, nativeImage } = require('electron')

const PORT = 4500

let mb = menubar()

let files = []

let ip = internalip.v4.sync()

let staticFiles = [
    '/static/script.js',
    '/static/style.css',
]

function page(contents) {
    return `<html> 
        <head>
            <title>drop - local file sharing</title>
            <link rel="stylesheet" href="static/style.css">
        </head>
        <body>
            ${contents}
            <div class=footer>
                <a href="http://${ip}:${PORT}" class=ip>${ip}:${PORT}</a>
            </div>
            <div class="credit">by cesque :)</div>
        </body>
        <script src="static/script.js"></script>
    </html>`
}

mb.on('ready', async () => {
    console.log('ready')

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
                return page(`<p class=no-files>no files uploaded yet :)</p>`)
            }
        } else if (staticFiles.includes(req.url)) {
            let parts = req.url.split('/')
            let last = parts[parts.length - 1]
            return fs.readFileSync('./' + last)
        } else {
            let file = files.find(x => ('/' + x.filename) == req.url)

            if(!file) throw micro.createError(404, 'File not found :(')
            
            return fs.readFileSync(file.path)
        }
    }))
    
    server.listen(PORT)

    mb.tray.setTitle('drop')
    mb.tray.setImage('./icon.png')
    
    mb.tray.removeAllListeners('click')

    mb.tray.on('click', event => {
        clipboard.writeText('http://' + ip + ':' + PORT)
    })

    mb.tray.on('drop-files', (event, dropped) => {

        for(let file of dropped) {
            files.push({
                path: file,
                timeout: 180,
                filename: path.basename(file),
            })
        }

        mb.tray.setImage('./icon-full.png')

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
            mb.tray.setImage('./icon.png')
        }
    }, 1000)

})