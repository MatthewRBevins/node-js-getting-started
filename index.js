const newRegions = require(__dirname + '/jsons/newRegions.json')
const newRoutes = require(__dirname + '/jsons/newRoutes.json')
const newTrips = require(__dirname + '/jsons/newTrips.json')
const regions = require(__dirname + '/jsons/fullRegions.json').regions
const fs = require('fs')
const regionSide = 67
//git commit -am "hi"
//heroku logs --tail

function getClosestRegions(region, immediateReturn) {
    //bottom, top, left, right
    let boundary = [region % 67 == 0, (region+1) % 67 == 0, region < 68, region > (regions.length-67)]
    let closest = [[region-1, [0]],[region+1,[1]],[region-67,[2]],[region+67,[3]],[ (region-1)+67,[0,3]],[ (region+1)+67,[1,3]],[ (region-1)-67,[0,2]],[ (region+1)-67,[1,2]]]
    let arr = closest.filter(val => {
        for (let i of val[1]) {
            if (boundary[i]) return false
        }
        return true
    }).map(val => val[0].toString())
    if (immediateReturn) return arr.filter(val => newRegions[val] != null)
    let hasClosest = arr.filter(val => newRegions[val] != null).length != 0
    while (! hasClosest) {
        for (let i of arr) {
            arr = arr.concat(getClosestRegions(i, true));
        }
        hasClosest = arr.filter(val => newRegions[val] != null).length != 0
    }
    //////console.log(arr);
    return arr.filter(val => newRegions[val] != null)
}

function getFormattedTime() {
    let d = new Date()
    return d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()
}

class LatLng {
    constructor(arr) {
        this.lat = parseFloat(arr[0])
        this.lng = parseFloat(arr[1])
        this.checkRegion = () => {
            let j = 0
            for (let i of regions) {
                if (this.lat >= i[0].lat && this.lat <= i[2].lat && this.lng >= i[0].lng && this.lng <= i[2].lng) return j
                j++
            }
            return -1
        }
    }
}

function calcDistance(x1,y1,x2,y2) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2)
}

function checkRegionDistance(region1, region2) {
    return calcDistance(Math.ceil(region1/regionSide), region1 - (regionSide*Math.floor(region1/regionSide)), Math.ceil(region2/regionSide), region2 - (regionSide*Math.floor(region2/regionSide)))
}

function checkRegion(lat, lng) {
    let j = 0
    for (let i of regions) {
      if (lat >= i[0].lat && lat <= i[2].lat && lng >= i[0].lng && lng <= i[2].lng) return j
      j++
    }
    return -1
}
let tester = 0;
function isInTimeFrame(time, start, end) {
    time = time.split(":").map(val => parseInt(val))
    start = start.split(":").map(val => parseInt(val))
    end = end.split(":").map(val => parseInt(val))
    if (start[0] > 24) {
        time[0] += 24;
    }
    if ((start[0] == time[0] && start[1] > time[1]) || (start[0] == time[0]+1)) {
        if ((end[0] == time[0] && end[1] > time[1]) || (end[0]>time[0])) {
            return true;
        }
    }
    tester++;
    return false;
}

//EASTGATE = (47.580883, -122.152551)
//LAKESIDE = (47.732595, -122.327477)
var timees = 0;

function getPossibleRegions(time, startingRegion, closestRegions) {
    timees++;
    //console.log("FJJWOIJPOIJOIPJ")
    let arr = []
    let regionsToCheck = [startingRegion.toString()]
    if (closestRegions) {
        regionsToCheck = regionsToCheck.concat(getClosestRegions(parseInt(startingRegion), false))
    }
    //console.log(regionsToCheck);
    for (let startingRegion of regionsToCheck) {
        //Loop through all of the routes that go through starting regions
        if (newRegions[startingRegion] != null) {
            //console.log(newRegions[startingRegion].routes);
            for (let i of newRegions[startingRegion].routes) {
                //console.log("JIO")
                //Loop through every trip of current route
                for (let j of newRoutes[i].trips) {
                    //If the current trip takes place at the current time
                    if (isInTimeFrame(time, j.times.from, j.times.to)) {
                        if (newTrips[j.id].regions.includes(parseInt(startingRegion))) {
                            //let startTime = newTrips[j.id][startingRegion][0].time
                            //Loop through all xregions that the trip goes to starting from the current region
                            let hasReached = false
                            let startingTime = null
                            let startingStop = null
                            for (let k of newTrips[j.id].stops) {
                                if (k.r == parseInt(startingRegion)) {
                                    startingTime = k.t
                                    startingStop = k.s
                                    hasReached = true
                                }
                                if (hasReached) {
                                    arr.push({
                                        //TIME BUS REACHES REGION
                                        startTime: startingTime,//startTime,
                                        startStop: startingStop,
                                        route: i,
                                        trip: j.id,
                                        time: k.t,
                                        stop: k.s,
                                        region: k.r
                                    })
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return arr
}

const express = require('express')
const patth = require('path')
const PORT = process.env.PORT || 5000

function doTheThing(time, pos1, pos2) {
    //let pos1 = new LatLng([47.545130, -122.137246])//new LatLng(prompt('Enter position: ').replaceAll("(","").replaceAll(")","").split(","))
    //let pos2 = new LatLng([47.609165, -122.339078])//new LatLng(prompt('Enter to go: ').replaceAll("(","").replaceAll(")","").split(","))
    //console.log(pos1);
    let region1 = pos1.checkRegion() //1125
    ////console.log(region1);
    let region2 = pos2.checkRegion()
    console.log(region1);
    console.log(region2);
    let low = Infinity
    //////console.log(region1 + " TO " + region2)
    let times = 0
    let path = []
    let bestPath = []
    while (low > 5 && times < 3) {
        path = bestPath.slice()
        times++
        //////console.log('a')
        let r = getPossibleRegions(time, region1, true)
        console.log(r.length);
        ////console.log("***" + tester)
        ////console.log(r.map(x=>x.region).length);
        low = Infinity
        for (let i of r) {
            //console.log("ii")
            path.push(i)
            if (checkRegionDistance(i.region,region2) <= low) {
                low = checkRegionDistance(i.region,region2)
                bestPath = path.slice()
                region1 = i.region
            }
            for (let j of getPossibleRegions(i.time, i.region, false)) {
                path.push(j)
                if (checkRegionDistance(j.region,region2) < low) {
                    bestPath = path.slice()
                    region1 = j.region
                    low = checkRegionDistance(j.region,region2)
                }
                path.pop()
            }
            path.pop()
        }
        time = bestPath[bestPath.length-1].time;
    }
    //console.log(bestPath)
    return {
        path: bestPath
    }
}
//////console.log(low)
express()
  .use(express.static(patth.join(__dirname, 'public')))
  .set('views', patth.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
    let tt = doTheThing(req.query.time, new LatLng(req.query.pos1.split(",").map(val=>parseFloat(val))), new LatLng(req.query.pos2.split(",").map(val=>parseFloat(val))));
    res.send(JSON.stringify(tt));
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))