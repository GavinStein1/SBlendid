import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";

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

    // Get user data from spotify
    var baseUrl = "";
    if (req.url?.includes("localhost")) {
        baseUrl = "http://localhost:3000";
    } else {
        baseUrl = "https://s-blendid.vercel.app"
    }
    const payload = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            accessToken: accessToken
        })
    }
    const userResponse = await fetch(`${baseUrl}/api/data/user`, payload);
    if (userResponse.status != 200) {
        console.log("error getting user data");
        const errJson = await userResponse.json();
        console.log(errJson);
        res.status(500).json({status: "error getting user data"});
        return;
    }

    const body = await userResponse.json();
    const userData = body.userData;

    // Neo4j params
    const neo4jPassword = process.env.NEO4J_PASSWORD;
    const DBURI = "neo4j+s://5a2557f6.databases.neo4j.io";
    const user = "neo4j";

    let driver;
    let session: neo4j.Session;
    try {
      if (typeof neo4jPassword === "undefined" || neo4jPassword === "") {
        res.status(500).json({status: "Failed", message: "Failed to connect to database"});
        return;
      }
      driver = neo4j.driver(DBURI, neo4j.auth.basic(user, neo4jPassword));
      session = driver.session();
    } catch (error) {
      console.error(error);
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }

    // get users of group from DB
    const query = `
        MATCH (user:User) -- (group:Group {id: $groupID})
        RETURN DISTINCT user;
    `
    const parameters = {
        groupID
    }

    session.run(query, parameters).then(results => {
        const records = results.records;
        var users = [];
        var hasUserURI = false;
        for (var i = 0; i < records.length; i ++) {
            users.push(records[i].get("user").properties);
            if (records[i].get("user").properties.uri === userData.uri) {
                hasUserURI = true;
            }
        }
        if (hasUserURI) {
            res.status(200).json({ users });
        } else {
            res.status(420).json({status: "Invalid", message: "You are not a member of this group"});
        }
    }).catch(error => {
        console.log("Failed parsing DB data");
        res.status(500).json({status: "Error", message: "Failed parsing DB data", error});
    }).finally(async () => {
        await session.close();
    })    
}