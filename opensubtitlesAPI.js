const axios = require('axios');
const { parse } = require('node-html-parser');
const config = require('./config');

const BaseURL = config.BaseURL;

async function request(url, header) {
    console.log('[request] START - URL:', url);
    return await axios
        .get(url, header, { timeout: 5000 })
        .then(res => {
            console.log('[request] SUCCESS');
            return res;
        })
        .catch(error => {
            if (error.response) {
                console.error('[request] ERROR:', error.response.status, error.response.statusText, error.config.url);
            } else {
                console.error('[request] ERROR:', error);
            }
        });
}

async function getOpenSubData(imdb_id) {
    console.log('[getOpenSubData] START - IMDB:', imdb_id);
    try {
        let url = `${BaseURL}/libs/suggest.php?format=json3&MovieName=${imdb_id}`
        res = await request(url)
        if(!res?.data) throw "getOpenSubData error getting data"
        console.log('[getOpenSubData] SUCCESS - Found data:', res.data[0]);
        return res.data[0];
    } catch(e){ 
        console.error('[getOpenSubData] ERROR:', e)
    }
}

async function getshow(imdb_id, id) {
    console.log('[getshow] START - IMDB:', imdb_id, 'ID:', id);
    try{
        let url = `${BaseURL}/en/ssearch/sublanguageid-all/imdbid-${imdb_id.replace('tt', '')}/idmovie-${id}`;
        res = await request(url)
        if(!res?.data) throw "getshow error getting data"

        let html = parse(res.data)
        let rows = html.querySelectorAll('#search_results tr:not(.head)')
        console.log('[getshow] Found rows:', rows.length);
        
        var season = 0;
        episodes = {}
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i]
            if (row.childNodes.length == 1) {
                season++;
                episodes[season] = { season: season }
                console.log('[getshow] Processing season:', season);
            } else {
                if (season != 0) {
                    let ep = row.childNodes[0].querySelector("span").rawText;
                    if(row.childNodes[0].querySelector("a")){
                        let title = row.childNodes[0].querySelector("a").rawText;
                        let url = row.childNodes[0].querySelector("a").rawAttributes['href'];
                        episodes[season][ep] = { ep: ep, title: title, url: url, season: season }
                        console.log('[getshow] Found episode:', season, ep, url);
                    }
                    else{
                        episodes[season][ep] = { ep: ep, season: season }
                        console.log('[getshow] Found episode without URL:', season, ep);
                    }
                }
            }
        }
        console.log('[getshow] SUCCESS - Found episodes:', Object.keys(episodes));
        return episodes
    } catch(e){ 
        console.error('[getshow] ERROR:', e)
    }
}

async function getsubs(imdb_id, id, type, season, episode) {
    console.log('[getsubs] START - IMDB:', imdb_id, 'ID:', id, 'Type:', type, 'Season:', season, 'Episode:', episode);
    try{
        if (type == "movie") {
            let path = `/en/search/sublanguageid-all/imdbid-${imdb_id.replace('tt', '')}/idmovie-${id}`
        return getsub(path).catch(error => console.error(error))
    } else {
        console.log(id)
        let episodes = await getshow(imdb_id, id).catch(error => console.error(error));
        if (episodes?.[season]?.[episode]?.url) {
            return getsub(episodes[season][episode].url).catch(error => console.error(error))
        } else {
            return
        }
        }
    } catch(e){ 
        console.error('[getsubs] ERROR:', e);
        return null;
    }
}

async function getsub(path) {
    console.log('[getsub] START - Path:', path);
    try{
        let url = BaseURL + path
        res = await request(url)
        if(!res?.data) throw "getsub error getting data"
        html = parse(res.data)
        let rows = html.querySelectorAll('#search_results > tbody > tr:not(.head)')
        console.log('[getsub] Found subtitle rows:', rows.length);
        
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
        console.log('[getsub] SUCCESS - Found subtitles:', subs.length);
        let result = sortByLang(subs);
        console.log('[getsub] After sorting:', result ? Object.keys(result).length : 0, 'languages');
        return result;
    } catch(e){ 
        console.error('[getsub] ERROR:', e);
        throw e;  // 抛出错误以便上层处理
    }
}

function sortByLang(subs = Array) {
    try {
    let sorted = {}
    subs.map((e, i) => {
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

module.exports = { getOpenSubData, getsubs }
