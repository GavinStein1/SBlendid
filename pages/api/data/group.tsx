import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    const groupID = req.body.id;
    if (!accessToken || !groupID) {
        console.log("missing params");
        res.status(500).json({status: "Failed", message: "Missing params"});    
        return;
    }

    // Get user data from spotify
    var baseUrl = "";
    if (req.url?.includes("localhost")) {
        baseUrl = "http://localhost:3000";
    } else {
        baseUrl = "https://www.splendit.au"
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
      console.log("ERROR");
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }

    // get users of group from DB
    const query = `
        MATCH (user:User {uri: $userURI}) -- (group:Group {id: $groupID})
        RETURN group;
    `
    const parameters = {
        groupID,
        userURI: userData.uri
    }

    session.run(query, parameters).then(results => {
        const records = results.records;

        if (records.length != 1) {
            res.status(511).json({status: "Failed", message: "You are not a member of this group"});
        } else {
            const groupData = records[0].get("group").properties;
            res.status(200).json({ groupData });
        }
    }).catch(error => {
        res.status(500).json({status: "Error", message: "Failed parsing DB data", error});
    }).finally(async () => {
        await session.close();
    })
    return;
}