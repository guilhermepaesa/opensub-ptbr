var axios = require("axios").default
var { parse } = require("node-html-parser")
const config = require('./config.js');

const BaseURL = config.BaseURL;

async function request(url) {
    return axios.get(url).catch(error => { console.log(error) })
}

async function getOpenSubData(imdb_id) {
    let url = `${BaseURL}/libs/suggest.php?format=json3&MovieName=${imdb_id}`
    res = await request(url)
    return res.data[0];
}

async function getshow(imdb_id, id) {
    let url = `${BaseURL}/en/ssearch/sublanguageid-all/imdbid-${imdb_id.replace('tt', '')}/idmovie-${id}`;
    console.log(url)
    res = await request(url)

    let html = parse(res.data)
    let rows = html.querySelectorAll('#search_results tr:not(.head)')
    var season = 0;
    episodes = {}
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i]
        if (row.childNodes.length == 1) {
            season++;
            episodes[season] = { season: season }
        } else {
            if (season != 0) {
                let ep = row.childNodes[0].querySelector("span").rawText;
                let title = row.childNodes[0].querySelector("a").rawText;
                let url = row.childNodes[0].querySelector("a").rawAttributes['href'];
                episodes[season][ep] = { ep: ep, title: title, url: url, season: season }
            }
        }
    }
    return episodes
}

async function getsubs(imdb_id, id, type, season, episode) {
    if (type == "movie") {
        let path = `/en/search/sublanguageid-all/imdbid-${imdb_id.replace('tt', '')}/idmovie-${id}`
        return getsub(path).catch(error => console.error(error))
    } else {
        console.log(id)
        let episodes = await getshow(imdb_id, id).catch(error => console.error(error));
        if (episode && episodes[season] && episodes[season][episode] && episodes[season][episode].url) {
            return getsub(episodes[season][episode].url).catch(error => console.error(error))
        } else {
            return
        }
    }
}

async function getsub(path) {
    let url = BaseURL + path
    console.log(url)
    res = await request(url)
    html = parse(res.data)
    let rows = html.querySelectorAll('#search_results > tbody > tr:not(.head)')
    var subs = [];
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i].rawAttributes["style"]) {
            let elements = rows[i].querySelectorAll("td");
            let fps = elements[3].querySelector('span.p')
            subs.push(
                {
                    name: elements[0].removeWhitespace().textContent.replace(' onlineDownload Subtitles Searcher', ""),
                    lang: elements[1].childNodes[0].rawAttributes['title'],
                    uploaded: elements[3].querySelector('time').rawAttributes['datetime'],
                    fps: fps ? fps.rawText : null,
                    downloaded: elements[4].querySelector('a').rawText.replace('x\n', ''),
                    url: BaseURL + elements[4].querySelector('a').rawAttributes["href"]
                }
            )
        }
    }
    subs = sortByLang(subs)
    return (subs)
}

function sortByLang(subs = Array) {
    try {
        let sorted = {}
        subs.map((e,
            i) => {
            if (sorted[e.lang.toLowerCase()]) {
                sorted[e.lang.toLowerCase()].push(e)
            } else {
                sorted[e.lang.toLowerCase()] = [e]
            }
        })
        return sorted
    } catch (err) {
        return null
    }
}

module.exports = { getOpenSubData, getsubs };