require('dotenv').config()
const { decryptMedia, Client } = require('@open-wa/wa-automate')
const moment = require('moment-timezone')
moment.tz.setDefault('Asia/Jakarta').locale('id')
const { downloader, cekResi, removebg, urlShortener, meme, translate, getLocationData } = require('../../lib')
const { msgFilter, color, processTime, is } = require('../../utils')
const mentionList = require('../../utils/mention')
const { uploadImages } = require('../../utils/fetcher')

const { menuId, menuEn } = require('./text') // Indonesian & English menu

module.exports = msgHandler = async (client, message) => {
    try {
        const { type, id, from, t, sender, isGroupMsg, chat, caption, isMedia, isGif, mimetype, quotedMsg, quotedMsgObj, mentionedJidList } = message
        let { body } = message
        const { name, formattedTitle } = chat
        let { pushname, verifiedName, formattedName } = sender
        pushname = pushname || verifiedName || formattedName // verifiedName is the name of someone who uses a business account
        const botNumber = await client.getHostNumber() + '@c.us'
        const groupId = isGroupMsg ? chat.groupMetadata.id : ''
        const groupAdmins = isGroupMsg ? await client.getGroupAdmins(groupId) : ''
        const groupMembers = isGroupMsg ? await client.getGroupMembersId(groupId) : ''
        const isGroupAdmins = groupAdmins.includes(sender.id) || false
        const isBotGroupAdmins = groupAdmins.includes(botNumber) || false

        // Bot Prefix
        const prefix = '.'
        body = (type === 'chat' && body.startsWith(prefix)) ? body : (((type === 'image' || type === 'video') && caption) && caption.startsWith(prefix)) ? caption : ''
        const command = body.slice(1).trim().split(/ +/).shift().toLowerCase()
        const arg = body.substring(body.indexOf(' ') + 1)
        const args = body.trim().split(/ +/).slice(1)
        const isCmd = body.startsWith(prefix)
        const isQuotedImage = quotedMsg && quotedMsg.type === 'image'
        const url = args.length !== 0 ? args[0] : ''
        const uaOverride = process.env.UserAgent

        // [BETA] Avoid Spam Message
        if (isCmd && msgFilter.isFiltered(from) && !isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && msgFilter.isFiltered(from) && isGroupMsg) { return console.log(color('[SPAM]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        //
        if (!isCmd && !isGroupMsg) { return console.log('[RECV]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Message from', color(pushname)) }
        if (!isCmd && isGroupMsg) { return console.log('[RECV]', color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Message from', color(pushname), 'in', color(name || formattedTitle)) }
        if (isCmd && !isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname)) }
        if (isCmd && isGroupMsg) { console.log(color('[EXEC]'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), color(`${command} [${args.length}]`), 'from', color(pushname), 'in', color(name || formattedTitle)) }
        // [BETA] Avoid Spam Message
        msgFilter.addFilter(from)

        switch (command) {
        case 'sticker2': {
            if ((isMedia || isQuotedImage) && args.length === 0) {
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const _mimetype = isQuotedImage ? quotedMsg.mimetype : mimetype
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const imageBase64 = `data:${_mimetype};base64,${mediaData.toString('base64')}`
                client.sendImageAsSticker(from, imageBase64).then(() => {
                    client.reply(from, '')
                    console.log(`Sticker Processed for ${processTime(t, moment())} Second`)
                })
            }
            break
        }
        // Video Downloader
        
        case 'ig':
            if (args.length !== 1) return client.reply(from, 'C fez alguma coisa de errado macaco', id)
            if (!is.Url(url) && !url.includes('instagram.com')) return client.reply(from, 'manda o link direito man', id)
            await client.reply(from, `_Scraping Metadata..._ \n\n${menuId.textDonasi()}`, id)
            downloader.insta(url).then(async (data) => {
                if (data.type == 'GraphSidecar') {
                    if (data.image.length != 0) {
                        data.image.map((x) => client.sendFileFromUrl(from, x, 'photo.jpg', '', null, null, true))
                            .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                            .catch((err) => console.error(err))
                    }
                    if (data.video.length != 0) {
                        data.video.map((x) => client.sendFileFromUrl(from, x.videoUrl, 'video.jpg', '', null, null, true))
                            .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                            .catch((err) => console.error(err))
                    }
                } else if (data.type == 'GraphImage') {
                    client.sendFileFromUrl(from, data.image, 'photo.jpg', '', null, null, true)
                        .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                        .catch((err) => console.error(err))
                } else if (data.type == 'GraphVideo') {
                    client.sendFileFromUrl(from, data.video.videoUrl, 'video.mp4', '', null, null, true)
                        .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                        .catch((err) => console.error(err))
                }
            })
                .catch((err) => {
                    console.log(err)
                    if (err === 'Not a video') { return client.reply(from, 'Ta me achando com cara de retardado man? não tem video nenhum nesse link', id) }
                    client.reply(from, 'Link de insta privado man', id)
                })
            break
        case 'tt':
            if (args.length !== 1) return client.reply(from, 'C fez alguma coisa de errado macaco', id)
            if (!is.Url(url) & !url.includes('twitter.com') || url.includes('t.co')) return client.reply(from, 'manda o link direito man', id)
            await client.reply(from, `_Scraping Metadata..._ \n\n${menuId.textDonasi()}`, id)
            downloader.tweet(url).then(async (data) => {
                if (data.type === 'video') {
                    const content = data.variants.filter(x => x.content_type !== 'application/x-mpegURL').sort((a, b) => b.bitrate - a.bitrate)
                    const result = await urlShortener(content[0].url)
                    console.log('Shortlink: ' + result)
                    await client.sendFileFromUrl(from, content[0].url, 'video.mp4', `Link Download: ${result} \n\nProcessed for ${processTime(t, moment())} _Second_`, null, null, true)
                        .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                        .catch((err) => console.error(err))
                } else if (data.type === 'photo') {
                    for (let i = 0; i < data.variants.length; i++) {
                        await client.sendFileFromUrl(from, data.variants[i], data.variants[i].split('/media/')[1], '', null, null, true)
                            .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                            .catch((err) => console.error(err))
                    }
                }
            })
                .catch(() => client.sendText(from, 'manda o link direito man'))
            break

        // Other Command
        case 'mkmeme':
            if ((isMedia || isQuotedImage) && args.length >= 2) {
                const top = arg.split('|')[0]
                const bottom = arg.split('|')[1]
                const encryptMedia = isQuotedImage ? quotedMsg : message
                const mediaData = await decryptMedia(encryptMedia, uaOverride)
                const getUrl = await uploadImages(mediaData, false)
                const ImageBase64 = await meme.custom(getUrl, top, bottom)
                client.sendFile(from, ImageBase64, 'image.png', '', null, true)
                    .then((serialized) => console.log(`Sukses Mengirim File dengan id: ${serialized} diproses selama ${processTime(t, moment())}`))
                    .catch((err) => console.error(err))
            } else {
                await client.reply(from, 'pra fazer a desgraça do meme vc tem que marcar uma imagem com o comando acima e escrever o texto que vc quer, é muito simples e aparentemente msm assim vc conseguiu fazer errado', id)
            }
            break
        // Group Commands (group admin only)
        case 'promote':
            if (!isGroupMsg) return await client.reply(from, 'Essa porra de comando so pode ser usado em grupos', id)
            if (!isGroupAdmins) return await client.reply(from, 'Este comando só pode ser usado por administradores do grupo  ', id)
            if (!isBotGroupAdmins) return await client.reply(from, 'Este comando só pode ser usado quando o bot for adm  ', id)
            if (mentionedJidList.length != 1) return client.reply(from, 'calmai caralho vou promover so um cara de cada vez', id)
            if (groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'esse cara ja é adm porra'', id)
            if (mentionedJidList[0] === botNumber) return await client.reply(from, 'tu fez alguma merda ai parcero', id)
            await client.promoteParticipant(groupId, mentionedJidList[0])
            await client.sendTextWithMentions(from, `Request diterima, menambahkan @${mentionedJidList[0].replace('@c.us', '')} sebagai admin.`)
            break
        case 'demote':
            if (!isGroupMsg) return client.reply(from, 'Essa porra de comando so pode ser usado em grupos', id)
            if (!isGroupAdmins) return client.reply(from, 'Este comando só pode ser usado por administradores do grupo  ', id)
            if (!isBotGroupAdmins) return client.reply(from, '  Este comando só pode ser usado quando o bot for adm  ', id)
            if (mentionedJidList.length !== 1) return client.reply(from, 'calmai caralho vou rebaixar so um cara de cada vez', id)
            if (!groupAdmins.includes(mentionedJidList[0])) return await client.reply(from, 'ta me tirando porra esse viado nem é adm', id)
            if (mentionedJidList[0] === botNumber) return await client.reply(from, 'tu fez alguma merda ai parcero', id)
            await client.demoteParticipant(groupId, mentionedJidList[0])
            await client.sendTextWithMentions(from, `Request diterima, menghapus jabatan @${mentionedJidList[0].replace('@c.us', '')}.`)
            break
        case 'del':
            if (!isGroupAdmins) return client.reply(from, 'Este comando só pode ser usado por administradores do grupo  ', id)
            if (!quotedMsg) return client.reply(from, 'tu fez alguma merda ai parcero]', id)
            if (!quotedMsgObj.fromMe) return client.reply(from, 'tu fez alguma merda ai parcero', id)
            client.deleteMessage(quotedMsgObj.chatId, quotedMsgObj.id, false)
            break
        }
        default:
            console.log(color('[ERROR]', 'red'), color(moment(t * 1000).format('DD/MM/YY HH:mm:ss'), 'yellow'), 'Unregistered Command from', color(pushname))
            break
        }
    } catch (err) {
        console.error(color(err, 'red'))
    }
}