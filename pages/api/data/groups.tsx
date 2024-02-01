import type { NextApiRequest, NextApiResponse } from "next";
import * as neo4j from "neo4j-driver";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
  ) {
    const accessToken = req.body.accessToken;
    if (!accessToken) {
        res.status(500).json({status: "Failed", message: "Missing access token param"});    
        return;
    }
    const baseUrl = process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000';
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
        res.status(500).json({status: "error getting user data"});
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
      await driver.getServerInfo();
      session = driver.session();
    } catch (error) {
      console.error(error);
      res.status(500).json({status: "Failed", message: "Failed to connect to database"});
      return;
    }

    // get Groups from DB
    const query = `
        MATCH (user:User {uri: $userURI}) -- (group:Group)
        RETURN group;
    `
    const parameters = {
        userURI: userData.uri
    }

    session.run(query, parameters).then(results => {
        const records = results.records;
        var groups = [];
        for (var i = 0; i < records.length; i ++) {
            groups.push(records[i].get("group"));
        }
        res.status(200).json({groups});
    }).catch(error => {
        res.status(500).json({status: "Error", message: "Failed parsing DB data", error});
    }).finally(async () => {
        await session.close();
    })    
    
}