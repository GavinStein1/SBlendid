import { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";
import NoAuth from "@/errors/noAuth";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    if (!accessToken) {
        res.status(500).json({status: "Failed", message: "Missing access token param"});    
        return;
    }

    // Neo4j params
    const neo4jPassword = process.env.NEO4J_PASSWORD;
    const DBURI = "neo4j+s://5a2557f6.databases.neo4j.io";
    const user = "neo4j";

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
    }
    if (userDataResponse.status != 200) {
      res.status(500).json({status: "Failed", message: "Could not get data from Spotify"});
      return;
    }

    const json = await userDataResponse.json();
    const userURI = json.uri;
    console.log(userURI);

    // Get user info from DB with matching URI
    let driver;
    let session: neo4j.Session;
    try {
      if (typeof neo4jPassword === "undefined" || neo4jPassword === "") {
        res.status(500).json({status: "Failed", message: "Failed to connect to database"});
        return;
      }
      driver = neo4j.driver(DBURI, neo4j.auth.basic(user, neo4jPassword));
      await driver.getServerInfo();
      session = driver.session();
    } catch (error) {
      console.error(error);
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }
    const query = `
        MATCH (user:User {uri: $userURI})
        RETURN user;
    `

    const parameters = {
        userURI
    }
    var userData = {};
    const result = await session.run(query, parameters);
    const records = result.records;
    if (records.length == 0) {
        res.status(210).json({status: "Success", message: "User does not exist"});
        return;
    } else if (records.length > 1) {
        res.status(500).json({status: "Failed", message: "Error getting user info"});
        return;
    } else {
        const user = records[0].get("user");
        userData = user.properties;
    }
    session.close();
    res.status(200).json({status: "Success", userData});
  }