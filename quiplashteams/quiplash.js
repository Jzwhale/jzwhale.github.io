const apiLink = "https://www.speedrun.com/api/v1/leaderboards/3dxkxk41/category/jdry50l2"

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
    
    const request = await fetch(apiLink)

    if (!request.ok) return -1

    // jsoon
    const response = await request.json()

    const teams = []
    const runs = response.data.runs

    for (let i = 0; i < runs.length; i++) {
        const run = runs[i].run
        const players = run.players
        const newTeam = []
        for (let player in players) {
            let playerObj = players[player]
            newTeam.push(playerObj.id)
        }
        teams.push(newTeam)
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
        teamCache = await getTeamData()
        sessionStorage.setItem("teamCache", JSON.stringify(teamCache))
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
        let found = false
        const checkingTeam = new Set(userIds)
        for (let team in teamCache) {
            if (teamCache[team].length != userIds.length) continue
            const otherTeamSet = new Set(teamCache[team])
            console.log(checkingTeam, otherTeamSet)
            if (setsHaveSameValues(otherTeamSet, checkingTeam)) {
                found = true
                break
            }
        }

        if (found) {
            resultText.innerHTML = "yeah u did that already.."
        } else {
            resultText.innerHTML = "ur good! Good luck"
        }

    }

})