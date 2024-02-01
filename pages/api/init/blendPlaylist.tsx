import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";
import NoAuth from "@/errors/noAuth";

export const maxDuration = 24;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    const groupID = req.body.groupID;
    if (!accessToken || !groupID) {
      res.status(500).json({status: "Failed", message: "Missing params"});
      return;
    }

    // Neo4j params
    const neo4jPassword = process.env.NEO4J_PASSWORD;
    const DBURI = "neo4j+s://5a2557f6.databases.neo4j.io";
    const user = "neo4j";

    // connect to DB
    let driver;
    let session: neo4j.Session;
    try {
      if (typeof neo4jPassword === "undefined" || neo4jPassword === "") {
        throw new Error("Failed to connect to database");
      }
      driver = neo4j.driver(DBURI, neo4j.auth.basic(user, neo4jPassword));
      await driver.getServerInfo();
      session = driver.session();
    } catch (error) {
      console.error(error);
      throw new Error("Failed to connect to database");
    }
    
    // Get user info
    const serverURL = "https://api.spotify.com/v1";
    const headers = new Headers({
      'Authorization': `Bearer ${accessToken}`
    })
    var fetchData = {
      method: 'GET',
      headers: headers
    }
    const userDataResponse = await fetch(serverURL + "/me", fetchData);
    if (userDataResponse.status == 401) {
      throw new NoAuth("Invalid token");
    }else if (userDataResponse.status != 200) {
      res.status(500).json({status: "Failed", message: "failed fetching spotify data"})
      return;
    }

    const json = await userDataResponse.json();
    const username = json.id;

    // Get Artists from DB
    const query = `
    MATCH (group:Group {id: $groupID})<-[:member_of]-(user:User)-[listener:listens_to]->(artist:Artist)
    WITH artist,count(user) as rels, collect(user) as users, sum(listener.weight) as weight, group
    WITH size(users) as userCount, artist, rels, COUNT {(group)<-[:member_of]-()} as groupSize, weight, group
    ORDER BY userCount desc, weight asc
    LIMIT 40
    return artist, userCount, weight, group.name as name
    `

    const parameters = {
        groupID
    }
    var groupName = ""
    var records: neo4j.Record<neo4j.RecordShape, PropertyKey, neo4j.RecordShape<PropertyKey, number>>[] = [];
    session.run(query, parameters).then(results => {
        records = results.records;
        if (records.length < 1) {
            res.status(500).json({status: "Failed", message: "Failed getting artists from DB"});
            
        } else {
            groupName = records[0].get("name");
        }
    }).catch(error => {
        res.status(500).json({status: "Failed", message: "error during result processing form DB", error});
    }).finally(async () => {
        await session.close();
    })

    if (!groupName) {
        return;
    }

    // 1. Create playlist
    var bodyData = {
        name: groupName,
        description: "Created with SBlendid."
    }
    var postFetchData = {
        method: 'POST',
        headers: new Headers({
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify(bodyData)
    }
    
    const createPlaylistResponse = await fetch(`${serverURL}/users/${username}/playlists`, postFetchData);
    if (createPlaylistResponse.status != 201) {
        const json = await createPlaylistResponse.json();
        console.log(json);
        res.status(500).json({status: "Failed", message: "Failed to post playlist"});
        return;
    }
    const playlistJson = await createPlaylistResponse.json();
    const playlistID = playlistJson.id;
    const playListURL = playlistJson.external_urls.spotify;

    // 3. For each artist add top 5 songs TODO: weight number of songs based on listeners
    let artistID;
    let artistTracksResponse;
    let tracksJson;
    let tracks;
    let trackURIs: string[] = [];
    for (var i = 0; i < records.length; i ++) {
        tracks = [];
        artistID = records[i].get("artist").properties.id;
        artistTracksResponse = await fetch(`${serverURL}/artists/${artistID}/top-tracks?country=AU`, fetchData);
        tracksJson = await artistTracksResponse.json();

        var j = 0;
        tracks = tracksJson.tracks;
        while (j < tracks.length) {
            if (j == 5) {
                break;
            }
            trackURIs.push(tracks[j].uri);
            j ++;
        }

        if (trackURIs.length > 90) {
            var body = {
                uris: trackURIs
            }
            var requestData = {
                method: 'POST',
                headers: new Headers({
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(body)
            }
            var trackResponse = await fetch(`${serverURL}/playlists/${playlistID}/tracks`, requestData);
            if (trackResponse.status != 201) {
                res.status(500).json({status: "Failed", message: "failed adding trackes"});
                return;
            }
            trackURIs = [];
        }
        
    }
    if (trackURIs.length > 0) {
        body = {
            uris: trackURIs
        }
        requestData = {
            method: 'POST',
            headers: new Headers({
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(body)
        }
        trackResponse = await fetch(`${serverURL}/playlists/${playlistID}/tracks`, requestData);
        if (trackResponse.status != 201) {
            res.status(500).json({status: "Failed", message: "failed adding trackes"});
            return;
        }
    }

    res.status(200).json({status: "Complete", playListURL});
  }
  