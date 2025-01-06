const baseLink = "https://www.speedrun.com/api/v2/GetGameLeaderboard2?_r="

function urlSafeBase64Encode(str) {
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

function setsHaveSameValues(set1, set2) {

    if (set1.size !== set2.size) {
        return false
    }

    for (const value of set1) {
        if (!set2.has(value)) {
            return false
        }
    }

    return true

}

async function getTeamData() {
    
    const requestParams = {
        "params":{
            "categoryId":"jdry50l2",
            "emulator":1,
            "gameId":"3dxkxk41",
            "obsolete":0,
            "platformIds":[],
            "regionIds":[],
            "timer":0,
            "verified":1,
            "values":[],
            "video":0
        },
        "page":1
    }

    const teams = {}

    while (true) {

        const request = await fetch(baseLink + urlSafeBase64Encode(JSON.stringify(requestParams)), {
            method: "GET",
            headers: {
                "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
                "Accept": "application/json",
                "User-Agent": window.navigator.userAgent
            }
        })

        if (!request.ok) return -1

        const response = await request.json()

        const runs = response.runList

        for (const run of runs) {
            teams[run.id] = run.playerIds
        }

        if (response.pagination.page == response.pagination.pages) break;

        requestParams.page += 1

    }

    return teams

}

window.addEventListener("load", async () => {

    // Elements //////
    const refreshButton = document.getElementById("refresh-button")
    const searchButton = document.getElementById("search-button")
    const nameInput = document.getElementById("name-input")
    const resultText = document.getElementById("result")

    // Caching ///////
    let teamCache = JSON.parse(sessionStorage.getItem("teamCache"))

    if (!teamCache) {
        teamCache = { teams: await getTeamData() }
        sessionStorage.setItem("teamCache", JSON.stringify(teamCache))
    }

    let userIdCache = sessionStorage.getItem("userIdCache") || {}

    // Func /////////
    refreshButton.onclick = async () => {
        refreshButton.innerHTML = "Refreshing..."
        searchButton.disabled = true;
        teamCache = await getTeamData()
        sessionStorage.setItem("teamCache", JSON.stringify(teamCache))
        refreshButton.innerHTML = "Refresh"
        searchButton.disabled = false;
    }

    searchButton.onclick = async () => {
        
        resultText.innerHTML = ""

        const input = nameInput.value

        const finalNames = []
        const namesList = input.split(",")

        if (namesList.length > 8) return "Too many users"

        // interpret names from user input
        for (let i = 0; i < namesList.length; i++) {
            let name = namesList[i]
            name = name.trim().toLowerCase()
            if (name.includes(" ")) {
                return `Invalid name: ${name}`
            }
            finalNames.push(name)
        }

        // convert to user ids
        const userIds = []
        for (let i = 0; i < finalNames.length; i++) {
            
            if (finalNames[i] in userIdCache) {
                userIds.push(userIdCache[finalNames[i]])
                continue
            }

            const request = await fetch(`https://www.speedrun.com/api/v1/users/${finalNames[i]}`)
                .catch((err) => {
                    return "Error fetching user IDs"
                })
            
            if (!request.ok) return "Error fetching user IDs"

            const response = await request.json()

            if (response.status == 404) return "Error fetching user IDs" 

            const id = response.data.id

            userIds.push(id)

            userIdCache[finalNames[i]] = id

        }

        // find the run maybe?
        let foundRun = false
        const checkingTeam = new Set(userIds)
        for (const [runId, team] of Object.entries(teamCache)) {
            if (team.length != userIds.length) continue
            const otherTeamSet = new Set(team)
            if (setsHaveSameValues(otherTeamSet, checkingTeam)) {
                foundRun = runId
                break
            }
        }

        if (foundRun) {
            resultText.innerHTML = `<span><a href="https://www.speedrun.com/quiplash/runs/${foundRun}" target=_blank>Already Done</a></span>`
        } else {
            resultText.innerHTML = "You're good! Good luck!"
        }

    }

})