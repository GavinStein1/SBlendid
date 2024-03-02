import { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";
import NoAuth from "@/errors/noAuth";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    if (!accessToken) {
        res.status(501).json({status: "Failed", message: "Missing access token param"});
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
      headers
    }
    const userDataResponse = await fetch(serverURL + "/me", fetchData);
    if (userDataResponse.status == 401) {
      throw new NoAuth("Invalid token");
    }
    if (userDataResponse.status != 200) {
      console.log("Spotify user data response failed");
      // console.log("url: ",userDataResponse.url);
      // console.log("header auth", headers.get("Authorization"));
      // console.log("statusText: ",userDataResponse.statusText);
      // console.log(userDataResponse.status);
      res.status(502).json({status: "Failed", message: "Could not get data from Spotify"});
      return;
    }
    const json = await userDataResponse.json();
    const userURI = json.uri;

    // Get user info from DB with matching URI
    let driver;
    let session: neo4j.Session;
    try {
      if (typeof neo4jPassword === "undefined" || neo4jPassword === "") {
        console.log("Failed to connect to database");
        res.status(503).json({status: "Failed", message: "Failed to connect to database"});
        return;
      }
      driver = neo4j.driver(DBURI, neo4j.auth.basic(user, neo4jPassword));
      session = driver.session();
    } catch (error) {
      console.error("error!: ", error);
      console.log("Failed to connect to database");
      res.status(504).json({status: "Failed", message: "Failed to connect to database"});
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
    
    session.run(query, parameters).then((result) => {
      const records = result.records;
      if (records.length == 0) {
        res.status(210).json({status: "Success", message: "User does not exist"});
      } else if (records.length > 1) {
        res.status(505).json({status: "Failed", message: "Error getting user info"});
        console.log("Error getting user info");
      } else {
        const user = records[0].get("user");
        userData = user.properties;
        res.status(200).json({status: "Success", userData});
      }
    }).catch(error => {
      console.log(neo4jPassword);
      // console.log(error);
      res.status(506).json({status: "Failed", message: "error during result processing form DB", error});
      console.log("error during result processing form DB");
    }).finally(async () => {
      await session.close();
    });
    return;
  }