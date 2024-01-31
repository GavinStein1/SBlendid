import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";
import NoAuth from "@/errors/noAuth";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    const groupID = req.body.groupID;
    if (!accessToken || !groupID) {
      res.status(500).json({status: "Failed", message: "Missing param"});
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
    const fetchData = {
      method: 'GET',
      headers: headers
    }
    const userDataResponse = await fetch(serverURL + "/me", fetchData);
    if (userDataResponse.status == 401) {
      throw new NoAuth("Invalid token");
    }else if (userDataResponse.status != 200) {
      res.status(500);
      return;
    }

    const json = await userDataResponse.json();
    const userURI = json.uri;
    const displayName = json.display_name;
    const userPage = json.href;
    const userID = json.id;

    // get group artists
    var query = `
    MATCH (group:Group {id: $id})<-[:member_of]-(user:User {uri: $uri})-[listener:listens_to]->(artist:Artist)
    WITH artist,count(user) as rels, collect(user) as users, sum(listener.weight) as weight
    WITH size(users) as userCount, artist, rels, COUNT {(group)<-[:member_of]-()} as groupSize, weight
    ORDER BY userCount desc, weight asc
    LIMIT 40
    return artist, userCount, weight
    `;

    const parameters = {
      uri: userURI,
      displayName,
      userID,
      href: userPage
    }

    await session.run(query, parameters);

    // Get top artists
    const endpoint = serverURL + "/me/top/artists?time_range=long_term&limit=50";
    const topArtistsResponse = await fetch(endpoint, fetchData);
    if (topArtistsResponse.status == 401) {
      throw new NoAuth("Invalid token");
    }else if (topArtistsResponse.status != 200) {
      console.log(topArtistsResponse.statusText);
      console.error("Failed retrieving artist data.");
      return;
    }

    // Save artist data to DB
    const jsonData = await topArtistsResponse.json();
    var artistURI;
    var genres;
    var artistHref;
    var id;
    var name;
    var popularity;

    const items = jsonData.items;
    for (var i = 0; i < items.length; i ++) {
      artistURI = items[i].uri;
      genres = items[i].genres;
      artistHref = items[i].href;
      id = items[i].id;
      name = items[i].name;
      popularity = items[i].popularity;

      query = `
        MERGE (artist:Artist {id: $id})
        ON CREATE SET artist.genres = $genres, artist.href = $artistHref, artist.uri = $artistURI, artist.name = $name, artist.popularity = $popularity
        MERGE (user:User {uri: $userURI})
        MERGE (user)-[:listens_to {weight: $i}]->(artist)
        RETURN artist, user;
      `;

      var queryParams = {
        id,
        genres,
        artistHref,
        artistURI,
        name,
        popularity,
        userURI,
        i: i + 1
      }
      console.log(name = items[i].name);
      await session.run(query, queryParams);
    }

    session.close();
    res.status(200).json({"status": "Complete"});
  }
  